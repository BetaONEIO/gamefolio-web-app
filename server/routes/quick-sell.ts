import { Router, Request, Response } from 'express';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import { createPublicClient, http, parseUnits, decodeEventLog, type Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { GF_TOKEN_ADDRESS, GF_TOKEN_ABI, SKALE_NEBULA_TESTNET } from '../../shared/contracts';
import { transferGfTokens } from '../gf-token-service';

const GF_DECIMALS = 18;

const marketplacePublicClient = createPublicClient({
  chain: SKALE_NEBULA_TESTNET,
  transport: http(SKALE_NEBULA_TESTNET.rpcUrls.default.http[0]),
});

function getTreasuryAddress(): string {
  const privateKey = process.env.TREASURY_PRIVATE_KEY;
  if (!privateKey) throw new Error('TREASURY_PRIVATE_KEY not configured');
  const formattedKey = privateKey.startsWith('0x') ? privateKey as `0x${string}` : `0x${privateKey}` as `0x${string}`;
  return privateKeyToAccount(formattedKey).address;
}

const router = Router();

const QUICK_SELL_PRICE = 250;
const PLATFORM_FEE_PERCENT = 1.5;
const QUICK_LIST_FEE = 1.25;

router.post('/api/nft/quick-sell', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { tokenId } = req.body;
    if (tokenId == null || typeof tokenId !== 'number') {
      return res.status(400).json({ error: 'Token ID is required' });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.activeProfilePicType === 'nft' && user.nftProfileTokenId === tokenId) {
      return res.status(400).json({ error: 'This NFT is currently set as your profile picture. Please remove it as your profile picture before selling.' });
    }

    const platformFee = QUICK_SELL_PRICE * (PLATFORM_FEE_PERCENT / 100);
    const totalDeductions = platformFee + QUICK_LIST_FEE;
    const receivedAmount = QUICK_SELL_PRICE - totalDeductions;

    console.log(`[Quick Sell] User ${userId} listed NFT #${tokenId} for quick sale, will receive ${receivedAmount} GFT`);

    await db.execute(
      sql`UPDATE user_nfts SET sold = true, sold_at = NOW(), listing_active = true, listed_price = ${QUICK_SELL_PRICE} WHERE user_id = ${userId} AND token_id = ${tokenId}`
    );

    console.log(`[Quick Sell] User ${userId} sold NFT #${tokenId} for ${receivedAmount} GFT (price: ${QUICK_SELL_PRICE}, fees: ${totalDeductions})`);

    return res.json({
      success: true,
      tokenId,
      sellPrice: QUICK_SELL_PRICE,
      platformFee,
      quickListFee: QUICK_LIST_FEE,
      receivedAmount,
      message: `NFT #${tokenId} listed for quick sale. ${receivedAmount} GFT credited to your balance.`,
    });
  } catch (error: any) {
    console.error('[Quick Sell] Error:', error);
    return res.status(500).json({ error: 'Quick sell failed. Please try again.' });
  }
});

router.get('/api/marketplace/listings', async (_req: Request, res: Response) => {
  try {
    const listings = await db.execute(
      sql`SELECT un.token_id, un.listed_price, un.sold_at, un.user_id,
                 u.username, u.display_name
          FROM user_nfts un
          JOIN users u ON u.id = un.user_id
          WHERE un.sold = true AND un.listing_active = true
          ORDER BY un.sold_at DESC`
    );

    const rows = (listings as any).rows || listings;
    return res.json({ listings: rows || [] });
  } catch (error: any) {
    console.error('[Marketplace] Listings error:', error);
    return res.status(500).json({ error: 'Failed to fetch listings' });
  }
});

router.post('/api/marketplace/buy-intent', async (req: Request, res: Response) => {
  try {
    const buyerId = (req as any).user?.id;
    if (!buyerId) return res.status(401).json({ error: 'Authentication required' });

    const { tokenId, sellerId } = req.body;
    if (tokenId == null || sellerId == null) {
      return res.status(400).json({ error: 'Token ID and seller ID are required' });
    }
    if (buyerId === sellerId) {
      return res.status(400).json({ error: 'You cannot buy your own listing' });
    }

    const listing = await db.execute(
      sql`SELECT * FROM user_nfts WHERE token_id = ${tokenId} AND user_id = ${sellerId} AND sold = true AND listing_active = true`
    );
    const listingRows = (listing as any).rows || listing;
    if (!listingRows || listingRows.length === 0) {
      return res.status(404).json({ error: 'Listing not found or already sold' });
    }

    const price = listingRows[0].listed_price || QUICK_SELL_PRICE;
    const treasuryAddress = getTreasuryAddress();

    return res.json({ price, treasuryAddress });
  } catch (error: any) {
    console.error('[Marketplace] Buy intent error:', error);
    return res.status(500).json({ error: 'Failed to create purchase intent' });
  }
});

router.post('/api/marketplace/verify-buy', async (req: Request, res: Response) => {
  try {
    const buyerId = (req as any).user?.id;
    if (!buyerId) return res.status(401).json({ error: 'Authentication required' });

    const { tokenId, sellerId, txHash } = req.body;
    if (tokenId == null || sellerId == null || !txHash) {
      return res.status(400).json({ error: 'tokenId, sellerId and txHash are required' });
    }
    if (buyerId === sellerId) {
      return res.status(400).json({ error: 'You cannot buy your own listing' });
    }

    const listing = await db.execute(
      sql`SELECT * FROM user_nfts WHERE token_id = ${tokenId} AND user_id = ${sellerId} AND sold = true AND listing_active = true`
    );
    const listingRows = (listing as any).rows || listing;
    if (!listingRows || listingRows.length === 0) {
      return res.status(404).json({ error: 'Listing not found or already sold' });
    }
    const price = listingRows[0].listed_price || QUICK_SELL_PRICE;

    const [buyer] = await db.select().from(users).where(eq(users.id, buyerId)).limit(1);
    if (!buyer?.walletAddress) {
      return res.status(400).json({ error: 'Buyer wallet address not found' });
    }

    const treasuryAddress = getTreasuryAddress().toLowerCase();
    const expectedAmount = parseUnits(String(price), GF_DECIMALS);
    const receipt = await marketplacePublicClient.getTransactionReceipt({ hash: txHash as `0x${string}` });

    if (receipt.status !== 'success') {
      return res.status(400).json({ error: 'Transaction failed on-chain' });
    }

    let validTransfer = false;
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== GF_TOKEN_ADDRESS.toLowerCase()) continue;
      try {
        const decoded = decodeEventLog({ abi: GF_TOKEN_ABI, data: log.data, topics: log.topics });
        if (decoded.eventName === 'Transfer') {
          const { from, to, value } = decoded.args as { from: Address; to: Address; value: bigint };
          if (
            from.toLowerCase() === buyer.walletAddress.toLowerCase() &&
            to.toLowerCase() === treasuryAddress &&
            value >= expectedAmount
          ) {
            validTransfer = true;
            break;
          }
        }
      } catch { continue; }
    }

    if (!validTransfer) {
      return res.status(400).json({ error: 'Invalid transfer: amount, sender, or recipient mismatch' });
    }

    await db.execute(
      sql`UPDATE user_nfts SET listing_active = false WHERE token_id = ${tokenId} AND user_id = ${sellerId}`
    );
    await db.execute(
      sql`INSERT INTO user_nfts (user_id, token_id, tx_hash, sold, listing_active)
          VALUES (${buyerId}, ${tokenId}, ${txHash}, false, false)
          ON CONFLICT (user_id, token_id) DO UPDATE SET sold = false, listing_active = false, tx_hash = ${txHash}, minted_at = NOW()`
    );

    const [seller] = await db.select().from(users).where(eq(users.id, sellerId)).limit(1);
    if (seller?.walletAddress) {
      const platformFee = price * (PLATFORM_FEE_PERCENT / 100);
      const sellerReceives = price - platformFee;
      console.log(`[Marketplace] Paying seller ${seller.walletAddress} ${sellerReceives} GFT for NFT #${tokenId}`);
      transferGfTokens(seller.walletAddress, sellerReceives).catch(err =>
        console.error(`[Marketplace] Failed to pay seller for NFT #${tokenId}:`, err)
      );
    }

    console.log(`[Marketplace] User ${buyerId} bought NFT #${tokenId} from user ${sellerId} for ${price} GFT (tx: ${txHash})`);
    return res.json({
      success: true,
      tokenId,
      price,
      message: `NFT #${tokenId} purchased successfully for ${price} GFT!`,
    });
  } catch (error: any) {
    console.error('[Marketplace] Verify buy error:', error);
    return res.status(500).json({ error: 'Purchase verification failed. Please try again.' });
  }
});

export default router;