import { Router, Request, Response } from 'express';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';

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

    const platformFee = QUICK_SELL_PRICE * (PLATFORM_FEE_PERCENT / 100);
    const totalDeductions = platformFee + QUICK_LIST_FEE;
    const receivedAmount = QUICK_SELL_PRICE - totalDeductions;

    await db.update(users)
      .set({
        gfTokenBalance: sql`${users.gfTokenBalance} + ${receivedAmount}`,
      })
      .where(eq(users.id, userId));

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

export default router;