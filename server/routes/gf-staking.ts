import { Router, Request, Response } from 'express';
import { db } from '../db';
import { users, userStaking, userStakingHistory } from '@shared/schema';
import { eq, sql, desc } from 'drizzle-orm';
import { getStakingStats } from '../gf-staking-service';

const router = Router();

const ANNUAL_RATE = 0.125;
const DAILY_RATE = ANNUAL_RATE / 365;

function calcPendingRewards(stakedAmount: number, lastClaimAt: Date): number {
  const now = Date.now();
  const msElapsed = now - lastClaimAt.getTime();
  const daysElapsed = msElapsed / (1000 * 60 * 60 * 24);
  return stakedAmount * DAILY_RATE * daysElapsed;
}

router.get('/api/staking/position/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;

    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const [user] = await db.select().from(users).where(eq(users.walletAddress, address)).limit(1);
    if (!user) {
      return res.json({ staked: '0', earned: '0' });
    }

    const [position] = await db.select().from(userStaking).where(eq(userStaking.userId, user.id)).limit(1);
    if (!position || position.stakedAmount <= 0) {
      return res.json({ staked: '0', earned: '0' });
    }

    const pending = calcPendingRewards(position.stakedAmount, position.lastClaimAt);

    return res.json({
      staked: position.stakedAmount.toString(),
      earned: pending.toFixed(6),
      stakedAt: position.stakedAt.toISOString(),
      totalEarned: position.totalEarned.toString(),
    });
  } catch (error: any) {
    console.error('[Staking] Get position error:', error);
    return res.status(500).json({ error: 'Failed to get stake position' });
  }
});

router.get('/api/staking/history', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const history = await db
      .select()
      .from(userStakingHistory)
      .where(eq(userStakingHistory.userId, userId))
      .orderBy(desc(userStakingHistory.createdAt))
      .limit(50);

    return res.json(history);
  } catch (error: any) {
    console.error('[Staking] Get history error:', error);
    return res.status(500).json({ error: 'Failed to get staking history' });
  }
});

router.get('/api/staking/stats', async (req: Request, res: Response) => {
  try {
    const stats = await getStakingStats();
    return res.json(stats);
  } catch (error: any) {
    const aggregate = await db
      .select({ total: sql<number>`coalesce(sum(${userStaking.stakedAmount}), 0)` })
      .from(userStaking);
    return res.json({ totalStaked: aggregate[0]?.total?.toString() || '0', rewardRate: DAILY_RATE.toString() });
  }
});

router.post('/api/staking/stake', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const { amount } = req.body;
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const amountFloat = parseFloat(amount);

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const inAppBalance = user.gfTokenBalance || 0;
    if (inAppBalance < amountFloat) {
      return res.status(400).json({
        error: `Insufficient GFT balance. Have: ${inAppBalance.toFixed(2)} GFT, Need: ${amountFloat} GFT`,
        code: 'INSUFFICIENT_BALANCE',
      });
    }

    const [existing] = await db.select().from(userStaking).where(eq(userStaking.userId, userId)).limit(1);

    const now = new Date();

    if (existing) {
      const pendingRewards = calcPendingRewards(existing.stakedAmount, existing.lastClaimAt);
      const newStaked = existing.stakedAmount + amountFloat;
      const newTotalEarned = existing.totalEarned + pendingRewards;

      await db.update(userStaking)
        .set({
          stakedAmount: newStaked,
          stakedAt: now,
          lastClaimAt: now,
          totalEarned: newTotalEarned,
        })
        .where(eq(userStaking.userId, userId));

      if (pendingRewards > 0) {
        await db.update(users)
          .set({ gfTokenBalance: sql`${users.gfTokenBalance} + ${pendingRewards}` })
          .where(eq(users.id, userId));
      }
    } else {
      await db.insert(userStaking).values({
        userId,
        stakedAmount: amountFloat,
        stakedAt: now,
        lastClaimAt: now,
        totalEarned: 0,
      });
    }

    await db.update(users)
      .set({ gfTokenBalance: sql`${users.gfTokenBalance} - ${amountFloat}` })
      .where(eq(users.id, userId));

    const [updated] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    await db.insert(userStakingHistory).values({
      userId,
      type: 'stake',
      amount: amountFloat,
      balanceAfter: updated.gfTokenBalance || 0,
      createdAt: now,
    });

    console.log(`[Staking] User ${userId} staked ${amountFloat} GFT. New balance: ${updated.gfTokenBalance}`);

    return res.json({
      success: true,
      stakedAmount: (existing ? existing.stakedAmount + amountFloat : amountFloat),
      balance: updated.gfTokenBalance,
    });
  } catch (error: any) {
    console.error('[Staking] Stake error:', error);
    return res.status(500).json({ error: error.message || 'Stake failed' });
  }
});

router.post('/api/staking/unstake', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const { amount } = req.body;
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const amountFloat = parseFloat(amount);

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const [position] = await db.select().from(userStaking).where(eq(userStaking.userId, userId)).limit(1);
    if (!position || position.stakedAmount < amountFloat) {
      return res.status(400).json({
        error: `Insufficient staked amount. Staked: ${position?.stakedAmount || 0} GFT, Requested: ${amountFloat} GFT`,
        code: 'INSUFFICIENT_STAKED',
      });
    }

    const pendingRewards = calcPendingRewards(position.stakedAmount, position.lastClaimAt);
    const newStaked = position.stakedAmount - amountFloat;
    const now = new Date();

    await db.update(userStaking)
      .set({
        stakedAmount: newStaked,
        lastClaimAt: now,
        totalEarned: position.totalEarned + pendingRewards,
      })
      .where(eq(userStaking.userId, userId));

    const returnAmount = amountFloat + pendingRewards;
    await db.update(users)
      .set({ gfTokenBalance: sql`${users.gfTokenBalance} + ${returnAmount}` })
      .where(eq(users.id, userId));

    const [updated] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    await db.insert(userStakingHistory).values({
      userId,
      type: 'unstake',
      amount: amountFloat,
      balanceAfter: updated.gfTokenBalance || 0,
      createdAt: now,
    });

    if (pendingRewards > 0) {
      await db.insert(userStakingHistory).values({
        userId,
        type: 'claim',
        amount: pendingRewards,
        balanceAfter: updated.gfTokenBalance || 0,
        createdAt: now,
      });
    }

    console.log(`[Staking] User ${userId} unstaked ${amountFloat} GFT + ${pendingRewards.toFixed(6)} rewards. New balance: ${updated.gfTokenBalance}`);

    return res.json({
      success: true,
      unstaked: amountFloat,
      rewardsClaimed: pendingRewards,
      balance: updated.gfTokenBalance,
    });
  } catch (error: any) {
    console.error('[Staking] Unstake error:', error);
    return res.status(500).json({ error: error.message || 'Unstake failed' });
  }
});

router.post('/api/staking/claim', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const [position] = await db.select().from(userStaking).where(eq(userStaking.userId, userId)).limit(1);
    if (!position || position.stakedAmount <= 0) {
      return res.status(400).json({ error: 'No active staking position', code: 'NO_POSITION' });
    }

    const rewards = calcPendingRewards(position.stakedAmount, position.lastClaimAt);
    if (rewards < 0.000001) {
      return res.status(400).json({ error: 'No rewards available to claim', code: 'NO_REWARDS' });
    }

    const now = new Date();

    await db.update(userStaking)
      .set({
        lastClaimAt: now,
        totalEarned: position.totalEarned + rewards,
      })
      .where(eq(userStaking.userId, userId));

    await db.update(users)
      .set({ gfTokenBalance: sql`${users.gfTokenBalance} + ${rewards}` })
      .where(eq(users.id, userId));

    const [updated] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    await db.insert(userStakingHistory).values({
      userId,
      type: 'claim',
      amount: rewards,
      balanceAfter: updated.gfTokenBalance || 0,
      createdAt: now,
    });

    console.log(`[Staking] User ${userId} claimed ${rewards.toFixed(6)} GFT rewards. New balance: ${updated.gfTokenBalance}`);

    return res.json({
      success: true,
      rewards,
      balance: updated.gfTokenBalance,
    });
  } catch (error: any) {
    console.error('[Staking] Claim error:', error);
    return res.status(500).json({ error: error.message || 'Claim failed' });
  }
});

export default router;
