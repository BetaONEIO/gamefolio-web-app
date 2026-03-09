import { Router, Request, Response } from 'express';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import { createPublicClient, http, decodeEventLog, parseUnits, type Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { GF_TOKEN_ADDRESS, GF_TOKEN_ABI, NFT_CONTRACT_ADDRESS, NFT_ABI, SKALE_NEBULA_TESTNET } from '../../shared/contracts';
import { transferGfTokens } from '../gf-token-service';

const GF_DECIMALS = 18;
const PLATFORM_FEE_PERCENT = 5;

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

router.get('/api/nft/quick-sell-intent', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });
    const treasuryAddress = getTreasuryAddress();
    return res.json({ treasuryAddress, sellPrice: QUICK_SELL_PRICE });
  } catch (error: any) {
    console.error('[Quick Sell Intent] Error:', error);
    return res.status(500).json({ error: 'Failed to create sell intent.' });
  }
});

router.post('/api/nft/quick-sell', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { tokenId, txHash } = req.body;
    if (tokenId == null || typeof tokenId !== 'number') {
      return res.status(400).json({ error: 'Token ID is required' });
    }
    if (!txHash) {
      return res.status(400).json({ error: 'Transaction hash is required' });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (!user.walletAddress) {
      return res.status(400).json({ error: 'Wallet address not found for user' });
    }

    if (user.activeProfilePicType === 'nft' && user.nftProfileTokenId === tokenId) {
      return res.status(400).json({ error: 'This NFT is currently set as your profile picture. Please remove it before selling.' });
    }

    const treasuryAddress = getTreasuryAddress().toLowerCase();

    const receipt = await marketplacePublicClient.getTransactionReceipt({ hash: txHash as `0x${string}` });
    if (receipt.status !== 'success') {
      return res.status(400).json({ error: 'Transaction failed on-chain' });
    }

    let validTransfer = false;
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== NFT_CONTRACT_ADDRESS.toLowerCase()) continue;
      try {
        const decoded = decodeEventLog({ abi: NFT_ABI, data: log.data, topics: log.topics });
        if (decoded.eventName === 'Transfer') {
          const { from, to, tokenId: transferredTokenId } = decoded.args as { from: Address; to: Address; tokenId: bigint };
          if (
            from.toLowerCase() === user.walletAddress.toLowerCase() &&
            to.toLowerCase() === treasuryAddress &&
            Number(transferredTokenId) === tokenId
          ) {
            validTransfer = true;
            break;
          }
        }
      } catch { continue; }
    }

    if (!validTransfer) {
      return res.status(400).json({ error: 'On-chain NFT transfer not verified: wrong token, sender, or recipient.' });
    }

    await db.execute(
      sql`UPDATE user_nfts SET sold = true, sold_at = NOW(), listing_active = true, listed_price = ${QUICK_SELL_PRICE}, tx_hash = ${txHash} WHERE user_id = ${userId} AND token_id = ${tokenId}`
    );

    console.log(`[Quick Sell] User ${userId} transferred NFT #${tokenId} on-chain to treasury. Tx: ${txHash}`);

    return res.json({
      success: true,
      tokenId,
      sellPrice: QUICK_SELL_PRICE,
      receivedAmount: QUICK_SELL_PRICE,
      txHash,
      message: `NFT #${tokenId} listed for quick sale at ${QUICK_SELL_PRICE} GFT.`,
    });
  } catch (error: any) {
    console.error('[Quick Sell] Error:', error);
    return res.status(500).json({ error: 'Quick sell failed. Please try again.' });
  }
});

router.post('/api/nft/server-sell', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const { tokenId } = req.body;
    if (tokenId == null || typeof tokenId !== 'number') {
      return res.status(400).json({ error: 'Token ID is required' });
    }

    console.log(`[NFT Server Sell] User ${userId} listing NFT #${tokenId}`);

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.activeProfilePicType === 'nft' && user.nftProfileTokenId === tokenId) {
      return res.status(400).json({ error: 'This NFT is currently set as your profile picture. Please remove it before selling.' });
    }

    const nftRows = await db.execute(
      sql`SELECT * FROM user_nfts WHERE user_id = ${userId} AND token_id = ${tokenId} AND sold = false LIMIT 1`
    );
    const nft = ((nftRows as any).rows || nftRows)?.[0];
    if (!nft) {
      return res.status(404).json({ error: 'NFT not found or already sold' });
    }

    await db.execute(
      sql`UPDATE user_nfts SET sold = true, sold_at = NOW(), listing_active = true, listed_price = ${QUICK_SELL_PRICE} WHERE user_id = ${userId} AND token_id = ${tokenId} AND sold = false`
    );

    console.log(`[NFT Server Sell] NFT #${tokenId} listed for ${QUICK_SELL_PRICE} GFT by user ${userId}`);
    return res.json({
      success: true,
      tokenId,
      sellPrice: QUICK_SELL_PRICE,
      receivedAmount: QUICK_SELL_PRICE,
      message: `NFT #${tokenId} listed for quick sale at ${QUICK_SELL_PRICE} GFT.`,
    });
  } catch (error: any) {
    console.error('[NFT Server Sell] Error:', error);
    return res.status(500).json({ error: error.message || 'Server sell failed. Please try again.' });
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