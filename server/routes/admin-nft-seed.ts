import { Router, Request, Response } from 'express';
import { db } from '../db';
import { users } from '@shared/schema';
import { sql, eq } from 'drizzle-orm';
import { adminMiddleware } from '../middleware/admin';

const router = Router();

const PLATFORM_STORE_USERNAME = 'GamefolioStore';
const PLATFORM_STORE_EMAIL = 'store@gamefolio.internal';
const PLATFORM_STORE_WALLET = '0x74EfBEc0d43A54827208FD9159191Fd91bfF09d3';
const SEED_COUNT = 100;
const LISTED_PRICE = 500;

router.post('/api/admin/nft-seed', adminMiddleware, async (req: Request, res: Response) => {
  try {
    let [storeUser] = await db.select().from(users).where(eq(users.username, PLATFORM_STORE_USERNAME)).limit(1);

    if (!storeUser) {
      const [created] = await db.insert(users).values({
        username: PLATFORM_STORE_USERNAME,
        email: PLATFORM_STORE_EMAIL,
        password: 'not-a-real-password',
        displayName: 'Gamefolio Store',
        role: 'admin',
        walletAddress: PLATFORM_STORE_WALLET,
        walletChain: 'skale-base-mainnet',
        emailVerified: true,
      }).returning();
      storeUser = created;
      console.log(`[NFT Seed] Created platform store user: ID=${storeUser.id}`);
    } else {
      console.log(`[NFT Seed] Found existing platform store user: ID=${storeUser.id}`);
    }

    const platformUserId = storeUser.id;

    await db.execute(
      sql`DELETE FROM user_nfts WHERE tx_hash = 'backfill'`
    );
    console.log('[NFT Seed] Cleared old testnet backfill records');

    let seededCount = 0;
    for (let tokenId = 1; tokenId <= SEED_COUNT; tokenId++) {
      await db.execute(
        sql`INSERT INTO user_nfts (user_id, token_id, tx_hash, sold, listing_active, listed_price)
            VALUES (${platformUserId}, ${tokenId}, ${'platform-seed'}, true, true, ${LISTED_PRICE})
            ON CONFLICT (user_id, token_id) DO NOTHING`
      );
      seededCount++;
    }

    console.log(`[NFT Seed] Seeded ${seededCount} NFTs for platform store user ${platformUserId}`);

    const countResult = await db.execute(
      sql`SELECT COUNT(*) as cnt FROM user_nfts WHERE user_id = ${platformUserId} AND listing_active = true`
    );
    const rows = (countResult as any).rows || countResult;
    const activeListings = Number(rows[0]?.cnt || 0);

    return res.json({
      success: true,
      platformUserId,
      seededCount,
      activeListings,
      message: `Successfully seeded ${seededCount} NFTs (token IDs 1–${SEED_COUNT}) at ${LISTED_PRICE} GFT each.`,
    });
  } catch (error: any) {
    console.error('[NFT Seed] Error:', error);
    return res.status(500).json({ error: 'Seeding failed', details: error.message });
  }
});

router.get('/api/admin/nft-seed/status', adminMiddleware, async (_req: Request, res: Response) => {
  try {
    const [storeUser] = await db.select().from(users).where(eq(users.username, PLATFORM_STORE_USERNAME)).limit(1);
    if (!storeUser) {
      return res.json({ platformUser: null, activeListings: 0, totalSeeded: 0 });
    }

    const countResult = await db.execute(
      sql`SELECT COUNT(*) as cnt FROM user_nfts WHERE user_id = ${storeUser.id}`
    );
    const activeResult = await db.execute(
      sql`SELECT COUNT(*) as cnt FROM user_nfts WHERE user_id = ${storeUser.id} AND listing_active = true`
    );

    const rows = (countResult as any).rows || countResult;
    const activeRows = (activeResult as any).rows || activeResult;

    return res.json({
      platformUserId: storeUser.id,
      totalSeeded: Number(rows[0]?.cnt || 0),
      activeListings: Number(activeRows[0]?.cnt || 0),
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Status check failed', details: error.message });
  }
});

export default router;
