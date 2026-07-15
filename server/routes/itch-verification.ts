import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { hybridAuth } from '../middleware/hybrid-auth';
import { encryptItchApiKey } from '../services/itch-crypto';

const router = Router();

const ITCH_FETCH_TIMEOUT_MS = 10_000;

const connectSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
});

// itch.io API keys are per-account and read-only for "my games" — possessing
// a working key is itself the proof of ownership, unlike Steam/Epic there is
// no separate code-in-description step. https://itch.io/docs/api/serverside
async function fetchMyItchGames(apiKey: string): Promise<{ games: any[]; username: string } | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ITCH_FETCH_TIMEOUT_MS);
  try {
    const [gamesRes, meRes] = await Promise.all([
      fetch(`https://itch.io/api/1/${apiKey}/my-games`, { signal: controller.signal }),
      fetch(`https://itch.io/api/1/${apiKey}/me`, { signal: controller.signal }),
    ]);
    if (!gamesRes.ok || !meRes.ok) return null;

    const gamesJson = await gamesRes.json();
    const meJson = await meRes.json();
    if (!Array.isArray(gamesJson?.games) || !meJson?.user?.username) return null;

    return { games: gamesJson.games, username: meJson.user.username };
  } catch (error) {
    console.error('[Itch Verification] Failed to fetch my-games:', error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * POST /api/indie/itch/connect
 * Validates the pasted itch.io API key against the account's own game list,
 * then stores it (encrypted) along with the resolved username.
 */
router.post('/connect', hybridAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    const { apiKey } = connectSchema.parse(req.body);

    const result = await fetchMyItchGames(apiKey);
    if (!result) {
      return res.status(400).json({
        error: 'invalid_key',
        message: "Couldn't verify that API key with itch.io. Generate a new one from your itch.io account settings and try again.",
      });
    }

    const itchVerifiedAt = new Date();
    await storage.upsertIndieGameProfile(userId, {
      itchApiKey: encryptItchApiKey(apiKey),
      itchUsername: result.username,
      itchVerifiedAt,
    });

    return res.json({
      verified: true,
      itchUsername: result.username,
      itchVerifiedAt,
      games: result.games.map((g: any) => ({ id: g.id, title: g.title, url: g.url })),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'invalid_request', details: error.errors });
    }
    console.error('[Itch Verification] connect error:', error);
    return res.status(500).json({ error: 'server_error' });
  }
});

/**
 * DELETE /api/indie/itch/disconnect
 * Clears the stored key and verification state.
 */
router.delete('/disconnect', hybridAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    await storage.upsertIndieGameProfile(userId, {
      itchApiKey: null,
      itchUsername: null,
      itchVerifiedAt: null,
    });
    return res.json({ disconnected: true });
  } catch (error) {
    console.error('[Itch Verification] disconnect error:', error);
    return res.status(500).json({ error: 'server_error' });
  }
});

/**
 * GET /api/indie/itch/status
 */
router.get('/status', hybridAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    const profile = await storage.getIndieGameProfile(userId);

    return res.json({
      verified: !!profile?.itchVerifiedAt,
      itchUsername: profile?.itchUsername || null,
      itchVerifiedAt: profile?.itchVerifiedAt || null,
    });
  } catch (error) {
    console.error('[Itch Verification] status error:', error);
    return res.status(500).json({ error: 'server_error' });
  }
});

export default router;
