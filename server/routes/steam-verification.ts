import { Router, Request, Response } from 'express';
import { db } from '../db';
import { storage } from '../storage';
import { steamVerificationCodes, type User } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';
import { hybridAuth } from '../middleware/hybrid-auth';
import { generateVerificationCode } from '../services/token-service';

const router = Router();

const VERIFICATION_TTL_MS = 15 * 60 * 1000; // 15 minutes, matches email verification
const STEAM_FETCH_TIMEOUT_MS = 10_000;

function extractSteamAppId(steamUrl: string | null | undefined): string | null {
  if (!steamUrl) return null;
  const match = steamUrl.match(/store\.steampowered\.com\/app\/(\d+)/);
  return match ? match[1] : null;
}

// Steam's public store API — no auth, no Steamworks partner key needed. Returns
// null on any failure (network, timeout, unknown app, malformed response) so
// callers can treat "couldn't verify right now" uniformly.
async function fetchSteamAppDetails(appId: string): Promise<any | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), STEAM_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}`, {
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const json = await res.json();
    const entry = json?.[appId];
    if (!entry?.success || !entry.data) return null;
    return entry.data;
  } catch (error) {
    console.error('[Steam Verification] Failed to fetch appdetails:', error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * POST /api/indie/steam/start-verification
 * Parses the Steam App ID out of the user's existing gameSteamUrl, generates a
 * one-time code, and stores it with a 15-minute expiry.
 */
router.post('/start-verification', hybridAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    const user = await storage.getUserById(userId);
    if (!user) return res.status(404).json({ error: 'not_found' });

    const steamAppId = extractSteamAppId((user as any).gameSteamUrl);
    if (!steamAppId) {
      return res.status(400).json({
        error: 'invalid_request',
        message: 'Add a valid Steam store URL (store.steampowered.com/app/<id>/...) to your profile first.',
      });
    }

    await db.delete(steamVerificationCodes).where(eq(steamVerificationCodes.userId, userId));

    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + VERIFICATION_TTL_MS);
    await db.insert(steamVerificationCodes).values({ userId, steamAppId, code, expiresAt });

    return res.json({ code, steamAppId, expiresAt });
  } catch (error) {
    console.error('[Steam Verification] start-verification error:', error);
    return res.status(500).json({ error: 'server_error' });
  }
});

/**
 * POST /api/indie/steam/verify
 * Checks whether the pending code shows up in the store page's public
 * description text. On success, records verification and backfills any empty
 * game-profile fields from Steam's public data — never overwrites fields the
 * developer already filled in manually.
 */
router.post('/verify', hybridAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;

    const [pending] = await db.select().from(steamVerificationCodes)
      .where(eq(steamVerificationCodes.userId, userId))
      .orderBy(desc(steamVerificationCodes.id))
      .limit(1);

    if (!pending) {
      return res.status(400).json({ error: 'invalid_request', message: 'Start verification first.' });
    }
    if (pending.expiresAt < new Date()) {
      await db.delete(steamVerificationCodes).where(eq(steamVerificationCodes.id, pending.id));
      return res.status(400).json({ error: 'expired', message: 'Verification code expired. Please start again.' });
    }

    const data = await fetchSteamAppDetails(pending.steamAppId);
    if (!data) {
      return res.status(502).json({ error: 'steam_unreachable', message: "Couldn't reach Steam. Please try again shortly." });
    }

    const haystack = `${data.short_description || ''} ${data.about_the_game || ''}`;
    if (!haystack.includes(pending.code)) {
      return res.status(400).json({
        error: 'code_not_found',
        message: "Code not found on your store page yet. Make sure you saved the change on Steam and try again.",
      });
    }

    await db.delete(steamVerificationCodes).where(eq(steamVerificationCodes.id, pending.id));

    const user = await storage.getUserById(userId);
    const updates: Partial<User> = {
      steamVerifiedAppId: pending.steamAppId,
      steamVerifiedAt: new Date(),
    };

    if (!user?.gameDescription && data.short_description) {
      updates.gameDescription = String(data.short_description).replace(/<[^>]*>/g, '').trim();
    }
    if ((!user?.gameScreenshotUrls || user.gameScreenshotUrls.length === 0) && Array.isArray(data.screenshots) && data.screenshots.length > 0) {
      updates.gameScreenshotUrls = data.screenshots.map((s: any) => s.path_full).filter(Boolean);
    }
    if (!user?.gameTrailerUrl && Array.isArray(data.movies) && data.movies.length > 0) {
      const movie = data.movies[0];
      updates.gameTrailerUrl = movie?.mp4?.max || movie?.mp4?.[480] || movie?.webm?.max || null;
    }
    if (!user?.gameReleaseDate && data.release_date?.date) {
      updates.gameReleaseDate = data.release_date.date;
    }

    await storage.updateUser(userId, updates);

    return res.json({ verified: true, steamVerifiedAppId: pending.steamAppId, steamVerifiedAt: updates.steamVerifiedAt, updatedFields: updates });
  } catch (error) {
    console.error('[Steam Verification] verify error:', error);
    return res.status(500).json({ error: 'server_error' });
  }
});

/**
 * GET /api/indie/steam/status
 * Current verification state — either an already-verified app, or a pending
 * code waiting to be found on the store page.
 */
router.get('/status', hybridAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    const user = await storage.getUserById(userId);
    if (!user) return res.status(404).json({ error: 'not_found' });

    const [pending] = await db.select().from(steamVerificationCodes)
      .where(eq(steamVerificationCodes.userId, userId))
      .orderBy(desc(steamVerificationCodes.id))
      .limit(1);

    return res.json({
      verified: !!(user as any).steamVerifiedAt,
      steamVerifiedAppId: (user as any).steamVerifiedAppId || null,
      steamVerifiedAt: (user as any).steamVerifiedAt || null,
      pending: pending && pending.expiresAt > new Date()
        ? { steamAppId: pending.steamAppId, code: pending.code, expiresAt: pending.expiresAt }
        : null,
    });
  } catch (error) {
    console.error('[Steam Verification] status error:', error);
    return res.status(500).json({ error: 'server_error' });
  }
});

export default router;
