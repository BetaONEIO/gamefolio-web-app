import { Router, Request, Response } from 'express';
import { db } from '../db';
import { storage } from '../storage';
import { users, storeItems, storePurchases, gamefolioPurchases } from '@shared/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { parseUnits, decodeEventLog, type Address } from 'viem';
import { GF_TOKEN_ADDRESS, GF_TOKEN_ABI } from '../../shared/contracts';
import { writeContractWithPoW, writeContractWithPoWFromRawKey, publicClient } from '../skale-pow';
import { transferGfTokens } from '../gf-token-service';
import { getTokenBalance } from '../blockchain';
import { privateKeyToAccount } from 'viem/accounts';

const GF_DECIMALS = 18;
const PLATFORM_FEE_PERCENT = 5;

function getTreasuryAddress(): string {
  const pk = process.env.TREASURY_PRIVATE_KEY;
  if (!pk) throw new Error('TREASURY_PRIVATE_KEY not configured');
  const formatted = pk.startsWith('0x') ? (pk as `0x${string}`) : (`0x${pk}` as `0x${string}`);
  return privateKeyToAccount(formatted).address;
}

function authRequired(req: Request, res: Response): number | null {
  const userId = (req as any).user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Authentication required' });
    return null;
  }
  return userId;
}

type PurchaseType = 'store_item' | 'name_tag' | 'border' | 'marketplace_nft';

interface Eligibility {
  ok: true;
  gfAmount: number;
  walletAddress: string;
  encryptedPrivateKey: string;
  description: string;
}
interface EligibilityFail { ok: false; status: number; error: string; }

async function checkEligibility(
  userId: number,
  type: PurchaseType,
  itemRefId: number,
  sellerId: number | null,
): Promise<Eligibility | EligibilityFail> {
  const user = await storage.getUserById(userId);
  if (!user) return { ok: false, status: 404, error: 'User not found' };
  if (!user.walletAddress || !user.encryptedPrivateKey) {
    return { ok: false, status: 400, error: 'No Gamefolio wallet available. Please create one first.' };
  }

  if (type === 'store_item') {
    const [item] = await db.select().from(storeItems).where(eq(storeItems.id, itemRefId)).limit(1);
    if (!item) return { ok: false, status: 404, error: 'Item not found' };
    if (!item.available) return { ok: false, status: 400, error: 'Item is not available' };
    const owned = await db.select().from(storePurchases).where(and(
      eq(storePurchases.userId, userId),
      eq(storePurchases.itemId, itemRefId),
      eq(storePurchases.status, 'completed'),
    )).limit(1);
    if (owned.length) return { ok: false, status: 400, error: 'You already own this item' };
    const baseCost = item.gfCost;
    const finalCost = user.isPro ? Math.floor(baseCost * 0.8) : baseCost;
    return { ok: true, gfAmount: finalCost, walletAddress: user.walletAddress, encryptedPrivateKey: user.encryptedPrivateKey, description: item.name };
  }

  if (type === 'name_tag') {
    const tag = await storage.getNameTag(itemRefId);
    if (!tag) return { ok: false, status: 404, error: 'Name tag not found' };
    if (!tag.availableInStore || !tag.isActive) return { ok: false, status: 400, error: 'Not available for purchase' };
    if (tag.isDefault) return { ok: false, status: 400, error: 'This name tag is free' };
    const baseCost = tag.gfCost || 0;
    if (baseCost <= 0) return { ok: false, status: 400, error: 'Name tag has no price set' };
    if (await storage.userHasUnlockedNameTag(userId, itemRefId)) {
      return { ok: false, status: 400, error: 'You already own this name tag' };
    }
    const finalCost = user.isPro ? Math.floor(baseCost * 0.8) : baseCost;
    return { ok: true, gfAmount: finalCost, walletAddress: user.walletAddress, encryptedPrivateKey: user.encryptedPrivateKey, description: tag.name };
  }

  if (type === 'border') {
    if (!user.isPro) return { ok: false, status: 403, error: 'Profile borders are Pro-only. Upgrade to Pro to use borders.' };
    const border = await storage.getProfileBorder(itemRefId);
    if (!border) return { ok: false, status: 404, error: 'Border not found' };
    if (!border.availableInStore || !border.isActive) return { ok: false, status: 400, error: 'Not available for purchase' };
    if (border.isDefault) return { ok: false, status: 400, error: 'This border is free' };
    const cost = border.gfCost || 0;
    if (cost <= 0) return { ok: false, status: 400, error: 'Border has no price set' };
    if (await storage.userHasUnlockedBorder(userId, itemRefId)) {
      return { ok: false, status: 400, error: 'You already own this border' };
    }
    return { ok: true, gfAmount: cost, walletAddress: user.walletAddress, encryptedPrivateKey: user.encryptedPrivateKey, description: border.name };
  }

  // marketplace_nft
  if (sellerId == null) return { ok: false, status: 400, error: 'sellerId is required' };
  if (sellerId === userId) return { ok: false, status: 400, error: 'You cannot buy your own listing' };
  const listing = await db.execute(
    sql`SELECT listed_price FROM user_nfts WHERE token_id = ${itemRefId} AND user_id = ${sellerId} AND sold = true AND listing_active = true LIMIT 1`
  );
  const rows = rowsOf(listing);
  if (rows.length === 0) {
    return { ok: false, status: 404, error: 'Listing not found or already sold' };
  }
  const price = Number(rows[0].listed_price) || 0;
  if (price <= 0) return { ok: false, status: 400, error: 'Invalid listing price' };
  return { ok: true, gfAmount: price, walletAddress: user.walletAddress, encryptedPrivateKey: user.encryptedPrivateKey, description: `Genesis #${itemRefId}` };
}

async function finalizePurchaseDb(opts: {
  userId: number;
  type: PurchaseType;
  itemRefId: number;
  sellerId: number | null;
  txHash: string;
  walletAddress: string;
  gfAmount: number;
  purchaseId: string;
}): Promise<{ ok: true; message: string; payoutTxHash?: string } | { ok: false; error: string }> {
  const { userId, type, itemRefId, sellerId, txHash, walletAddress, gfAmount, purchaseId } = opts;

  if (type === 'store_item') {
    // Mirror /api/store/verify-purchase: insert into store_purchases as completed.
    await db.insert(storePurchases).values({
      userId,
      itemId: itemRefId,
      walletAddress,
      gfAmount,
      status: 'completed',
      txHash,
      completedAt: new Date(),
    });
    return { ok: true, message: 'Item unlocked' };
  }

  if (type === 'name_tag') {
    await storage.unlockNameTagForUser(userId, itemRefId);
    return { ok: true, message: 'Name tag unlocked' };
  }

  if (type === 'border') {
    await storage.unlockBorderForUser(userId, itemRefId);
    return { ok: true, message: 'Border unlocked' };
  }

  // marketplace_nft
  if (sellerId == null) return { ok: false, error: 'Missing sellerId' };
  // Listing was already atomically claimed (listing_active flipped to false) before signing.
  // Just create/update the buyer's row.
  await db.execute(
    sql`INSERT INTO user_nfts (user_id, token_id, tx_hash, sold, listing_active)
        VALUES (${userId}, ${itemRefId}, ${txHash}, false, false)
        ON CONFLICT (user_id, token_id) DO UPDATE SET sold = false, listing_active = false, tx_hash = ${txHash}, minted_at = NOW()`
  );

  // Pay seller minus platform fee. Fire and forget; record hash when done.
  const [seller] = await db.select().from(users).where(eq(users.id, sellerId)).limit(1);
  if (seller?.walletAddress) {
    const platformFee = gfAmount * (PLATFORM_FEE_PERCENT / 100);
    const sellerReceives = gfAmount - platformFee;
    transferGfTokens(seller.walletAddress, sellerReceives)
      .then(async (r) => {
        if (r.success && r.txHash) {
          try {
            await db.update(gamefolioPurchases)
              .set({ payoutTxHash: r.txHash, updatedAt: new Date() })
              .where(eq(gamefolioPurchases.id, purchaseId));
          } catch (err) {
            console.error('[gamefolio-purchases] Failed to record payout tx hash:', err);
          }
        } else {
          console.error('[gamefolio-purchases] Seller payout failed:', r.error);
        }
      })
      .catch((err) => console.error('[gamefolio-purchases] Seller payout threw:', err));
  }
  return { ok: true, message: 'NFT purchased' };
}

async function attemptRefund(row: {
  id: string;
  userId: number;
  walletAddress: string;
  gfAmount: number;
  txHash: string | null;
  errorReason: string;
}): Promise<{ refundTxHash: string | null; refunded: boolean; error: string | null }> {
  const treasuryPk = process.env.TREASURY_PRIVATE_KEY;
  if (!treasuryPk) {
    return { refundTxHash: null, refunded: false, error: 'TREASURY_PRIVATE_KEY missing' };
  }
  try {
    const amountWei = parseUnits(String(row.gfAmount), GF_DECIMALS);
    const refundHash = await writeContractWithPoWFromRawKey({
      privateKeyRaw: treasuryPk,
      contractAddress: GF_TOKEN_ADDRESS as Address,
      abi: GF_TOKEN_ABI,
      functionName: 'transfer',
      args: [row.walletAddress as Address, amountWei],
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: refundHash, timeout: 60_000 });
    if (receipt.status === 'success') {
      console.log(`[gamefolio-purchases] Refunded ${row.gfAmount} GFT to ${row.walletAddress} (purchase ${row.id}). TX: ${refundHash}`);
      return { refundTxHash: refundHash, refunded: true, error: null };
    }
    return { refundTxHash: refundHash, refunded: false, error: 'Refund tx reverted' };
  } catch (err: any) {
    console.error(`[gamefolio-purchases] Refund failed for ${row.id}:`, err);
    return { refundTxHash: null, refunded: false, error: err?.shortMessage || err?.message || String(err) };
  }
}

// Drizzle's db.execute returns a node-postgres-like result with a typed `rows`
// array; this small helper avoids `as any` and keeps callers type-safe.
type SqlRow = Record<string, unknown>;
function rowsOf(result: unknown): SqlRow[] {
  if (Array.isArray(result)) return result as SqlRow[];
  if (result && typeof result === 'object' && Array.isArray((result as { rows?: SqlRow[] }).rows)) {
    return (result as { rows: SqlRow[] }).rows;
  }
  return [];
}

async function processServerPurchase(req: Request, res: Response, type: PurchaseType) {
  // Top-level guard so any throw becomes a deterministic HTTP response.
  try {
    return await processServerPurchaseInner(req, res, type);
  } catch (err: any) {
    console.error(`[gamefolio-purchases] Unhandled error in ${type} flow:`, err);
    if (!res.headersSent) {
      return res.status(500).json({ error: err?.message || 'Unexpected purchase error' });
    }
  }
}

async function processServerPurchaseInner(req: Request, res: Response, type: PurchaseType) {
  const userId = authRequired(req, res);
  if (!userId) return;

  let itemRefId: number;
  let sellerId: number | null = null;

  if (type === 'store_item') itemRefId = Number(req.body?.itemId);
  else if (type === 'name_tag') itemRefId = Number(req.body?.nameTagId);
  else if (type === 'border') itemRefId = Number(req.body?.borderId);
  else { itemRefId = Number(req.body?.tokenId); sellerId = Number(req.body?.sellerId); }

  if (!itemRefId || !Number.isFinite(itemRefId)) {
    return res.status(400).json({ error: 'Invalid item id' });
  }
  if (type === 'marketplace_nft' && (!sellerId || !Number.isFinite(sellerId))) {
    return res.status(400).json({ error: 'Invalid seller id' });
  }

  const eligibility = await checkEligibility(userId, type, itemRefId, sellerId);
  if (!eligibility.ok) {
    return res.status(eligibility.status).json({ error: eligibility.error });
  }

  // Sanity check on-chain GFT balance before signing.
  try {
    const onChain = await getTokenBalance(eligibility.walletAddress);
    if (parseFloat(onChain) < eligibility.gfAmount) {
      return res.status(400).json({
        error: `Insufficient GFT balance. Have: ${parseFloat(onChain).toFixed(2)} GFT, Need: ${eligibility.gfAmount} GFT`,
        code: 'INSUFFICIENT_BALANCE',
      });
    }
  } catch (err) {
    console.warn('[gamefolio-purchases] Balance check failed (continuing):', err);
  }

  const [pending] = await db.insert(gamefolioPurchases).values({
    userId,
    purchaseType: type,
    itemRefId,
    sellerId,
    walletAddress: eligibility.walletAddress,
    gfAmount: eligibility.gfAmount,
    status: 'pending',
  }).returning();

  // For marketplace_nft: atomically claim the listing BEFORE signing GFT transfer.
  // This guarantees only one buyer can win when two requests race the same listing.
  // We restore the listing on any failure path below.
  let listingClaimed = false;
  if (type === 'marketplace_nft' && sellerId != null) {
    const claimRes = await db.execute(sql`
      UPDATE user_nfts
      SET listing_active = false
      WHERE token_id = ${itemRefId}
        AND user_id = ${sellerId}
        AND sold = true
        AND listing_active = true
      RETURNING token_id
    `);
    const claimRows = rowsOf(claimRes);
    if (claimRows.length === 0) {
      await db.update(gamefolioPurchases).set({
        status: 'failed',
        errorMessage: 'Listing already sold or unavailable',
        updatedAt: new Date(),
      }).where(eq(gamefolioPurchases.id, pending.id));
      return res.status(409).json({ error: 'Listing already sold or unavailable' });
    }
    listingClaimed = true;
  }

  // Helper: restore the listing if we end up failing/refunding the marketplace flow.
  const restoreListing = async () => {
    if (!listingClaimed || sellerId == null) return;
    try {
      await db.execute(sql`
        UPDATE user_nfts SET listing_active = true
        WHERE token_id = ${itemRefId} AND user_id = ${sellerId} AND sold = true
      `);
    } catch (e) {
      console.error('[gamefolio-purchases] restoreListing failed:', e);
    }
  };

  let txHash: string | null = null;
  try {
    const treasuryAddress = getTreasuryAddress();
    const amountWei = parseUnits(String(eligibility.gfAmount), GF_DECIMALS);

    txHash = await writeContractWithPoW({
      encryptedPrivateKey: eligibility.encryptedPrivateKey,
      contractAddress: GF_TOKEN_ADDRESS as Address,
      abi: GF_TOKEN_ABI,
      functionName: 'transfer',
      args: [treasuryAddress as Address, amountWei],
    });
    await db.update(gamefolioPurchases)
      .set({ status: 'tx_sent', txHash, updatedAt: new Date() })
      .where(eq(gamefolioPurchases.id, pending.id));

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}`, timeout: 60_000 });
    if (receipt.status !== 'success') {
      await db.update(gamefolioPurchases)
        .set({ status: 'failed', errorMessage: 'Transfer reverted on-chain', updatedAt: new Date() })
        .where(eq(gamefolioPurchases.id, pending.id));
      return res.status(400).json({ error: 'Transfer transaction reverted on-chain', txHash });
    }

    // Validate that GFT actually moved from buyer to treasury.
    const treasuryLower = treasuryAddress.toLowerCase();
    const buyerLower = eligibility.walletAddress.toLowerCase();
    let valid = false;
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== GF_TOKEN_ADDRESS.toLowerCase()) continue;
      try {
        const decoded = decodeEventLog({ abi: GF_TOKEN_ABI, data: log.data, topics: log.topics });
        if (decoded.eventName === 'Transfer') {
          const { from, to, value } = decoded.args as { from: Address; to: Address; value: bigint };
          if (from.toLowerCase() === buyerLower && to.toLowerCase() === treasuryLower && value >= amountWei) {
            valid = true;
            break;
          }
        }
      } catch { continue; }
    }
    if (!valid) {
      // GFT didn't actually go through to treasury — refund.
      // Claim the refund slot atomically so the reconciler can't double-refund.
      const claim = await db.update(gamefolioPurchases)
        .set({ status: 'refunding', updatedAt: new Date() })
        .where(and(eq(gamefolioPurchases.id, pending.id), eq(gamefolioPurchases.status, 'tx_sent')))
        .returning({ id: gamefolioPurchases.id });
      if (claim.length === 0) {
        await restoreListing();
        return res.status(409).json({ error: 'Purchase already being processed', txHash });
      }
      const refund = await attemptRefund({ id: pending.id, userId, walletAddress: eligibility.walletAddress, gfAmount: eligibility.gfAmount, txHash, errorReason: 'Invalid transfer event' });
      await db.update(gamefolioPurchases).set({
        status: refund.refunded ? 'refunded' : 'refund_failed',
        refundTxHash: refund.refundTxHash,
        errorMessage: 'Invalid Transfer event in receipt',
        updatedAt: new Date(),
      }).where(eq(gamefolioPurchases.id, pending.id));
      await restoreListing();
      return res.status(400).json({ error: 'Invalid transfer event', txHash, refundTxHash: refund.refundTxHash });
    }

    // Atomic claim of the finalize slot — only one writer (this handler OR the
    // reconciler) may proceed past this point per row.
    const finalizeClaim = await db.update(gamefolioPurchases)
      .set({ status: 'finalizing', updatedAt: new Date() })
      .where(and(eq(gamefolioPurchases.id, pending.id), eq(gamefolioPurchases.status, 'tx_sent')))
      .returning({ id: gamefolioPurchases.id });
    if (finalizeClaim.length === 0) {
      // Reconciler beat us to it. Don't double-grant.
      return res.status(200).json({ success: true, txHash, message: 'Purchase already finalized', purchaseId: pending.id });
    }

    // Run the per-type DB writes.
    let finalize;
    try {
      finalize = await finalizePurchaseDb({ userId, type, itemRefId, sellerId, txHash, walletAddress: eligibility.walletAddress, gfAmount: eligibility.gfAmount, purchaseId: pending.id });
    } catch (err: any) {
      console.error('[gamefolio-purchases] Finalize threw:', err);
      finalize = { ok: false as const, error: err?.message || 'DB finalize failed' };
    }

    if (!finalize.ok) {
      const refund = await attemptRefund({ id: pending.id, userId, walletAddress: eligibility.walletAddress, gfAmount: eligibility.gfAmount, txHash, errorReason: finalize.error });
      await db.update(gamefolioPurchases).set({
        status: refund.refunded ? 'refunded' : 'refund_failed',
        refundTxHash: refund.refundTxHash,
        errorMessage: `Finalize failed: ${finalize.error}`,
        updatedAt: new Date(),
      }).where(eq(gamefolioPurchases.id, pending.id));
      await restoreListing();
      return res.status(500).json({ error: 'Purchase finalize failed; you have been refunded if possible.', refundTxHash: refund.refundTxHash });
    }

    await db.update(gamefolioPurchases).set({
      status: 'completed',
      completedAt: new Date(),
      updatedAt: new Date(),
    }).where(and(eq(gamefolioPurchases.id, pending.id), eq(gamefolioPurchases.status, 'finalizing')));

    return res.json({ success: true, txHash, message: finalize.message, purchaseId: pending.id });
  } catch (err: any) {
    console.error(`[gamefolio-purchases] ${type} purchase error:`, err);
    // If the tx hash was never set, the GFT never moved — just mark failed.
    if (!txHash) {
      await db.update(gamefolioPurchases).set({
        status: 'failed',
        errorMessage: err?.shortMessage || err?.message || 'Failed to send transfer',
        updatedAt: new Date(),
      }).where(eq(gamefolioPurchases.id, pending.id));
      return res.status(500).json({ error: err?.shortMessage || err?.message || 'Failed to process purchase' });
    }
    // Otherwise leave row as tx_sent so the reconciler can recover.
    return res.status(500).json({ error: err?.message || 'Purchase pending — will be reconciled', txHash });
  }
}

const router = Router();

router.post('/api/store/server-purchase', (req, res) => processServerPurchase(req, res, 'store_item'));
router.post('/api/store/server-name-tag-purchase', (req, res) => processServerPurchase(req, res, 'name_tag'));
router.post('/api/store/server-border-purchase', (req, res) => processServerPurchase(req, res, 'border'));
router.post('/api/marketplace/server-buy', (req, res) => processServerPurchase(req, res, 'marketplace_nft'));

// Recent activity for the wallet panel — last 20 server-signed purchases.
router.get('/api/store/gamefolio-activity', async (req: Request, res: Response) => {
  const userId = authRequired(req, res);
  if (!userId) return;
  try {
    const rows = await db.select().from(gamefolioPurchases)
      .where(eq(gamefolioPurchases.userId, userId))
      .orderBy(desc(gamefolioPurchases.createdAt))
      .limit(20);
    return res.json(rows);
  } catch (err: any) {
    console.error('[gamefolio-purchases] activity error:', err);
    return res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

export default router;

/**
 * Reconcile rows that were left in `pending` or `tx_sent` state — typically
 * because the server crashed mid-purchase. Logic:
 *   - pending (no tx hash): stuck on signing. Mark failed. No GFT moved.
 *   - tx_sent (with tx hash): re-fetch receipt. If success and Transfer
 *     event valid → finalize DB writes. If revert/invalid → refund.
 *
 * Only touches rows older than the grace window so we don't race the
 * synchronous request handler.
 */
export async function reconcileStuckGamefolioPurchases(): Promise<{
  scanned: number; consumed: number; refunded: number; refundFailed: number; skipped: number; errors: string[];
}> {
  const errors: string[] = [];
  let scanned = 0, consumed = 0, refunded = 0, refundFailed = 0, skipped = 0;
  const GRACE_MINUTES = 10;
  try {
    // Also pick up rows stuck in transient claim states ('finalizing', 'refunding')
    // — these mean the original handler crashed mid-step.
    const stuck = await db.execute(sql`
      SELECT * FROM gamefolio_purchases
      WHERE status IN ('pending', 'tx_sent', 'finalizing', 'refunding')
        AND updated_at < NOW() - INTERVAL '${sql.raw(String(GRACE_MINUTES))} minutes'
      ORDER BY created_at ASC
      LIMIT 50
    `);
    const rows = rowsOf(stuck);
    scanned = rows.length;

    // For marketplace rows that end up failed/refunded, the seller's listing
    // (which was atomically claimed during the buy attempt) needs to be
    // restored so it can be sold again.
    const restoreMarketplaceListing = async (r: SqlRow) => {
      if (r.purchase_type !== 'marketplace_nft' || r.seller_id == null) return;
      try {
        await db.execute(sql`
          UPDATE user_nfts SET listing_active = true
          WHERE token_id = ${r.item_ref_id} AND user_id = ${r.seller_id} AND sold = true
        `);
      } catch (e) {
        console.error('[gamefolio-purchases] reconciler restoreListing failed:', e);
      }
    };

    for (const row of rows) {
      try {
        if (row.status === 'pending' || !row.tx_hash) {
          // Conditional update — only fail if still pending (don't trample handler).
          await db.update(gamefolioPurchases).set({
            status: 'failed',
            errorMessage: 'Stuck before tx send; auto-failed by reconciler',
            updatedAt: new Date(),
          }).where(and(eq(gamefolioPurchases.id, row.id), eq(gamefolioPurchases.status, 'pending')));
          await restoreMarketplaceListing(row);
          skipped++;
          continue;
        }

        // Atomically claim this row so the request handler can't race us.
        // Accept rows in tx_sent (normal recovery) or stuck transient states.
        // If previously 'refunding', stay on the refund path; otherwise finalize.
        const wasRefunding = row.status === 'refunding';
        const acquired = await db.update(gamefolioPurchases)
          .set({ status: wasRefunding ? 'refunding' : 'finalizing', updatedAt: new Date() })
          .where(and(
            eq(gamefolioPurchases.id, row.id),
            sql`status IN ('tx_sent', 'finalizing', 'refunding')`,
          ))
          .returning({ id: gamefolioPurchases.id });
        if (acquired.length === 0) {
          skipped++;
          continue;
        }
        if (wasRefunding) {
          const r = await attemptRefund({ id: row.id, userId: row.user_id as number, walletAddress: row.wallet_address as string, gfAmount: Number(row.gf_amount), txHash: row.tx_hash as string | null, errorReason: 'Reconciler: resume interrupted refund' });
          await db.update(gamefolioPurchases).set({
            status: r.refunded ? 'refunded' : 'refund_failed',
            refundTxHash: r.refundTxHash,
            errorMessage: 'Reconciler: resumed refund',
            updatedAt: new Date(),
          }).where(eq(gamefolioPurchases.id, row.id as string));
          await restoreMarketplaceListing(row);
          if (r.refunded) refunded++; else refundFailed++;
          continue;
        }

        const treasuryAddress = getTreasuryAddress();
        let receipt;
        try {
          receipt = await publicClient.getTransactionReceipt({ hash: row.tx_hash as `0x${string}` });
        } catch {
          // Receipt not available yet — release back to tx_sent for next pass.
          await db.update(gamefolioPurchases).set({ status: 'tx_sent', updatedAt: new Date() })
            .where(eq(gamefolioPurchases.id, row.id));
          skipped++;
          continue;
        }

        if (receipt.status !== 'success') {
          await db.update(gamefolioPurchases).set({
            status: 'failed',
            errorMessage: 'Reconciler: tx reverted on-chain',
            updatedAt: new Date(),
          }).where(eq(gamefolioPurchases.id, row.id as string));
          await restoreMarketplaceListing(row);
          continue;
        }

        const treasuryLower = treasuryAddress.toLowerCase();
        const buyerLower = (row.wallet_address as string).toLowerCase();
        const expected = parseUnits(String(row.gf_amount), GF_DECIMALS);
        let valid = false;
        for (const log of receipt.logs) {
          if (log.address.toLowerCase() !== GF_TOKEN_ADDRESS.toLowerCase()) continue;
          try {
            const decoded = decodeEventLog({ abi: GF_TOKEN_ABI, data: log.data, topics: log.topics });
            if (decoded.eventName === 'Transfer') {
              const { from, to, value } = decoded.args as { from: Address; to: Address; value: bigint };
              if (from.toLowerCase() === buyerLower && to.toLowerCase() === treasuryLower && value >= expected) {
                valid = true; break;
              }
            }
          } catch { continue; }
        }

        if (!valid) {
          const r = await attemptRefund({ id: row.id as string, userId: row.user_id as number, walletAddress: row.wallet_address as string, gfAmount: Number(row.gf_amount), txHash: row.tx_hash as string | null, errorReason: 'Reconciler: invalid Transfer event' });
          await db.update(gamefolioPurchases).set({
            status: r.refunded ? 'refunded' : 'refund_failed',
            refundTxHash: r.refundTxHash,
            errorMessage: 'Reconciler: invalid Transfer event',
            updatedAt: new Date(),
          }).where(eq(gamefolioPurchases.id, row.id as string));
          await restoreMarketplaceListing(row);
          if (r.refunded) refunded++; else refundFailed++;
          continue;
        }

        // Tx is good — try to finalize DB writes.
        const fin = await finalizePurchaseDb({
          userId: row.user_id as number,
          type: row.purchase_type as PurchaseType,
          itemRefId: row.item_ref_id as number,
          sellerId: row.seller_id as number | null,
          txHash: row.tx_hash as string,
          walletAddress: row.wallet_address as string,
          gfAmount: Number(row.gf_amount),
          purchaseId: row.id as string,
        }).catch((err: any) => ({ ok: false as const, error: err?.message || 'finalize threw' }));

        if (fin.ok) {
          await db.update(gamefolioPurchases).set({
            status: 'completed',
            completedAt: new Date(),
            updatedAt: new Date(),
          }).where(eq(gamefolioPurchases.id, row.id as string));
          consumed++;
        } else {
          const r = await attemptRefund({ id: row.id as string, userId: row.user_id as number, walletAddress: row.wallet_address as string, gfAmount: Number(row.gf_amount), txHash: row.tx_hash as string | null, errorReason: fin.error });
          await db.update(gamefolioPurchases).set({
            status: r.refunded ? 'refunded' : 'refund_failed',
            refundTxHash: r.refundTxHash,
            errorMessage: `Reconciler finalize failed: ${fin.error}`,
            updatedAt: new Date(),
          }).where(eq(gamefolioPurchases.id, row.id as string));
          await restoreMarketplaceListing(row);
          if (r.refunded) refunded++; else refundFailed++;
        }
      } catch (err: any) {
        errors.push(`${String(row.id)}: ${err?.message || String(err)}`);
      }
    }
  } catch (err: any) {
    errors.push(err?.message || String(err));
  }
  return { scanned, consumed, refunded, refundFailed, skipped, errors };
}
