import { Router, Request, Response } from 'express';
import { db } from '../db';
import { users, indieGameProfiles, spotlightClaims, spotlightCategories } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { hybridAuth } from '../middleware/hybrid-auth';
import { captureRouteError } from '../sentry';

const router = Router();

const LEADER_COLUMNS = {
  id: spotlightClaims.id,
  gameId: spotlightClaims.gameId,
  userId: spotlightClaims.userId,
  category: spotlightClaims.category,
  gftAmount: spotlightClaims.gftAmount,
  createdAt: spotlightClaims.createdAt,
  gameName: indieGameProfiles.gameName,
  studioName: indieGameProfiles.studioName,
  capsuleImageUrl: indieGameProfiles.capsuleImageUrl,
  headerImageUrl: indieGameProfiles.headerImageUrl,
  shortDescription: indieGameProfiles.shortDescription,
  steamUrl: indieGameProfiles.steamUrl,
  itchUrl: indieGameProfiles.itchUrl,
  username: users.username,
} as const;

// GET /api/spotlight-leaderboard — current #1 holder per category, plus a
// recent-activity feed of every claim (outbid or not) for the "live" feel.
router.get('/api/spotlight-leaderboard', async (_req: Request, res: Response) => {
  try {
    const activeRows = await db.select(LEADER_COLUMNS)
      .from(spotlightClaims)
      .innerJoin(indieGameProfiles, eq(spotlightClaims.gameId, indieGameProfiles.id))
      .innerJoin(users, eq(spotlightClaims.userId, users.id))
      .where(eq(spotlightClaims.isActive, true))
      .orderBy(desc(spotlightClaims.gftAmount));

    const leaders = [...activeRows].sort((a, b) => b.gftAmount - a.gftAmount);

    const recent = await db.select({
      id: spotlightClaims.id,
      category: spotlightClaims.category,
      gftAmount: spotlightClaims.gftAmount,
      createdAt: spotlightClaims.createdAt,
      isActive: spotlightClaims.isActive,
      gameName: indieGameProfiles.gameName,
      username: users.username,
    })
      .from(spotlightClaims)
      .innerJoin(indieGameProfiles, eq(spotlightClaims.gameId, indieGameProfiles.id))
      .innerJoin(users, eq(spotlightClaims.userId, users.id))
      .orderBy(desc(spotlightClaims.createdAt))
      .limit(20);

    res.json({ categories: spotlightCategories, leaders, recent });
  } catch (error: any) {
    captureRouteError(error);
    console.error('GET /api/spotlight-leaderboard error:', error);
    res.status(500).json({ error: 'Failed to load spotlight leaderboard' });
  }
});

// POST /api/spotlight-leaderboard/claim — spend GFT to take #1 in a category.
// Non-refundable: whoever previously held the spot does not get their GFT
// back when outbid — see the migration header for why.
router.post('/api/spotlight-leaderboard/claim', hybridAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const { gameId, category, gftAmount } = req.body || {};
    const cat = typeof category === 'string' && (spotlightCategories as readonly string[]).includes(category)
      ? category
      : 'overall';
    const amount = Math.floor(Number(gftAmount));

    if (!gameId || !Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'gameId and a positive gftAmount are required' });
    }

    const [game] = await db.select().from(indieGameProfiles)
      .where(and(eq(indieGameProfiles.id, Number(gameId)), eq(indieGameProfiles.userId, userId)));
    if (!game) {
      return res.status(404).json({ error: 'Game not found, or it is not one of your games' });
    }

    const [current] = await db.select().from(spotlightClaims)
      .where(and(eq(spotlightClaims.category, cat), eq(spotlightClaims.isActive, true)))
      .orderBy(desc(spotlightClaims.gftAmount))
      .limit(1);

    if (current && current.userId === userId) {
      return res.status(409).json({ error: `You already hold #1 in "${cat}".` });
    }

    const minRequired = current ? current.gftAmount + 1 : 1;
    if (amount < minRequired) {
      return res.status(409).json({
        error: `Bid too low — current #1 in "${cat}" holds ${current?.gftAmount ?? 0} GFT. You need at least ${minRequired} GFT.`,
        minRequired,
      });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    const balance = user?.gfTokenBalance ?? 0;
    if (!user || balance < amount) {
      return res.status(402).json({ error: 'Not enough GFT balance', balance, required: amount });
    }

    await db.transaction(async (tx) => {
      await tx.update(users).set({ gfTokenBalance: balance - amount }).where(eq(users.id, userId));
      if (current) {
        await tx.update(spotlightClaims).set({ isActive: false }).where(eq(spotlightClaims.id, current.id));
      }
      await tx.insert(spotlightClaims).values({ gameId: game.id, userId, category: cat, gftAmount: amount, isActive: true });
    });

    res.json({ success: true, category: cat, gftAmount: amount, newBalance: balance - amount });
  } catch (error: any) {
    captureRouteError(error);
    console.error('POST /api/spotlight-leaderboard/claim error:', error);
    res.status(500).json({ error: 'Failed to claim spotlight rank' });
  }
});

export default router;
