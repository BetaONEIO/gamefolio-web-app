import { Router, Request, Response } from 'express';
import { db } from '../db';
import {
  users, indieGameProfiles, spotlightClaims,
  spotlightBoards, SPOTLIGHT_CATEGORIES_BY_BOARD,
  isSpotlightBoard, isSpotlightCategoryForBoard,
  type SpotlightBoard,
} from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { hybridAuth } from '../middleware/hybrid-auth';
import { captureRouteError } from '../sentry';

const router = Router();

const DEFAULT_BOARD: SpotlightBoard = 'gamers';

// Every board selects the same shape so the client can render one row type.
// game_* columns stay null on the gamers/streamers boards, where the claiming
// user is the subject rather than a game; the join is a LEFT join for that
// reason. The user_* columns are always present.
const LEADER_COLUMNS = {
  id: spotlightClaims.id,
  board: spotlightClaims.board,
  gameId: spotlightClaims.gameId,
  userId: spotlightClaims.userId,
  category: spotlightClaims.category,
  gftAmount: spotlightClaims.gftAmount,
  createdAt: spotlightClaims.createdAt,
  // Games board subject
  gameName: indieGameProfiles.gameName,
  studioName: indieGameProfiles.studioName,
  capsuleImageUrl: indieGameProfiles.capsuleImageUrl,
  headerImageUrl: indieGameProfiles.headerImageUrl,
  shortDescription: indieGameProfiles.shortDescription,
  steamUrl: indieGameProfiles.steamUrl,
  itchUrl: indieGameProfiles.itchUrl,
  // Gamers / streamers board subject
  username: users.username,
  displayName: users.displayName,
  avatarUrl: users.avatarUrl,
  bio: users.bio,
  userType: users.userType,
  isStreamer: users.isStreamer,
  streamPlatform: users.streamPlatform,
  twitchChannelName: users.twitchChannelName,
  kickChannelName: users.kickChannelName,
  youtubeChannelName: users.youtubeChannelName,
  streamMainGame: users.streamMainGame,
} as const;

function resolveBoard(raw: unknown): SpotlightBoard {
  return isSpotlightBoard(raw) ? raw : DEFAULT_BOARD;
}

// Who is allowed to claim on each board. The games board is checked separately
// (it needs the specific game row), so this covers the two user-subject boards.
function eligibilityFor(board: SpotlightBoard, user: any): { ok: boolean; reason?: string } {
  if (board === 'gamers') {
    // Every signed-in member has a profile to spotlight.
    return { ok: true };
  }
  if (board === 'streamers') {
    const types = String(user?.userType ?? '').split(',').map((t: string) => t.trim());
    const isStreamer = Boolean(
      user?.isStreamer
      || user?.twitchVerified || user?.kickVerified
      || user?.youtubeVerified || user?.rumbleVerified || user?.vpzoneVerified
      || types.includes('streamer'),
    );
    return isStreamer
      ? { ok: true }
      : { ok: false, reason: 'Connect a streaming channel before claiming a spot on the Streamers board.' };
  }
  return { ok: true };
}

// GET /api/spotlight-leaderboard?board=gamers|streamers|games
// Current #1 holder per category on that board, plus a recent-activity feed of
// every claim on it (outbid or not) for the "live" feel.
router.get('/api/spotlight-leaderboard', async (req: Request, res: Response) => {
  try {
    const board = resolveBoard(req.query.board);

    const activeRows = await db.select(LEADER_COLUMNS)
      .from(spotlightClaims)
      .leftJoin(indieGameProfiles, eq(spotlightClaims.gameId, indieGameProfiles.id))
      .innerJoin(users, eq(spotlightClaims.userId, users.id))
      .where(and(eq(spotlightClaims.board, board), eq(spotlightClaims.isActive, true)))
      .orderBy(desc(spotlightClaims.gftAmount));

    const recent = await db.select({
      id: spotlightClaims.id,
      board: spotlightClaims.board,
      category: spotlightClaims.category,
      gftAmount: spotlightClaims.gftAmount,
      createdAt: spotlightClaims.createdAt,
      isActive: spotlightClaims.isActive,
      gameName: indieGameProfiles.gameName,
      username: users.username,
      avatarUrl: users.avatarUrl,
    })
      .from(spotlightClaims)
      .leftJoin(indieGameProfiles, eq(spotlightClaims.gameId, indieGameProfiles.id))
      .innerJoin(users, eq(spotlightClaims.userId, users.id))
      .where(eq(spotlightClaims.board, board))
      .orderBy(desc(spotlightClaims.createdAt))
      .limit(20);

    res.json({
      board,
      boards: spotlightBoards,
      categories: SPOTLIGHT_CATEGORIES_BY_BOARD[board],
      leaders: activeRows,
      recent,
    });
  } catch (error: any) {
    captureRouteError(error);
    console.error('GET /api/spotlight-leaderboard error:', error);
    res.status(500).json({ error: 'Failed to load spotlight leaderboard' });
  }
});

// POST /api/spotlight-leaderboard/claim — spend GFT to take #1 on a board.
// Non-refundable: whoever previously held the spot does not get their GFT
// back when outbid — see the migration header for why.
router.post('/api/spotlight-leaderboard/claim', hybridAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const { gameId, category, gftAmount } = req.body || {};
    const board = resolveBoard(req.body?.board);
    const cat = isSpotlightCategoryForBoard(board, category) ? String(category) : 'overall';
    const amount = Math.floor(Number(gftAmount));

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'A positive gftAmount is required' });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return res.status(401).json({ error: 'Authentication required' });

    const eligibility = eligibilityFor(board, user);
    if (!eligibility.ok) {
      return res.status(403).json({ error: eligibility.reason });
    }

    // Only the games board carries a subject row of its own; the other two
    // spotlight the claiming user, so they store a null game_id.
    let subjectGameId: number | null = null;
    if (board === 'games') {
      if (!gameId) {
        return res.status(400).json({ error: 'gameId is required on the Games board' });
      }
      const [game] = await db.select().from(indieGameProfiles)
        .where(and(eq(indieGameProfiles.id, Number(gameId)), eq(indieGameProfiles.userId, userId)));
      if (!game) {
        return res.status(404).json({ error: 'Game not found, or it is not one of your games' });
      }
      subjectGameId = game.id;
    }

    const [current] = await db.select().from(spotlightClaims)
      .where(and(
        eq(spotlightClaims.board, board),
        eq(spotlightClaims.category, cat),
        eq(spotlightClaims.isActive, true),
      ))
      .orderBy(desc(spotlightClaims.gftAmount))
      .limit(1);

    if (current && current.userId === userId && current.gameId === subjectGameId) {
      return res.status(409).json({ error: `You already hold #1 in "${cat}".` });
    }

    const minRequired = current ? current.gftAmount + 1 : 1;
    if (amount < minRequired) {
      return res.status(409).json({
        error: `Bid too low — current #1 in "${cat}" holds ${current?.gftAmount ?? 0} GFT. You need at least ${minRequired} GFT.`,
        minRequired,
      });
    }

    const balance = user.gfTokenBalance ?? 0;
    if (balance < amount) {
      return res.status(402).json({ error: 'Not enough GFT balance', balance, required: amount });
    }

    await db.transaction(async (tx) => {
      await tx.update(users).set({ gfTokenBalance: balance - amount }).where(eq(users.id, userId));
      if (current) {
        await tx.update(spotlightClaims).set({ isActive: false }).where(eq(spotlightClaims.id, current.id));
      }
      await tx.insert(spotlightClaims).values({
        board, gameId: subjectGameId, userId, category: cat, gftAmount: amount, isActive: true,
      });
    });

    res.json({ success: true, board, category: cat, gftAmount: amount, newBalance: balance - amount });
  } catch (error: any) {
    captureRouteError(error);
    console.error('POST /api/spotlight-leaderboard/claim error:', error);
    res.status(500).json({ error: 'Failed to claim spotlight rank' });
  }
});

export default router;
