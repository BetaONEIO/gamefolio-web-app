import { Router, Request, Response } from 'express';
import { db } from '../db';
import { storage } from '../storage';
import { epicVerificationCodes } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';
import { hybridAuth } from '../middleware/hybrid-auth';
import { generateVerificationCode } from '../services/token-service';

const router = Router();

const VERIFICATION_TTL_MS = 15 * 60 * 1000; // 15 minutes, matches Steam/email verification
const EPIC_FETCH_TIMEOUT_MS = 10_000;

function extractEpicSlug(epicUrl: string | null | undefined): string | null {
  if (!epicUrl) return null;
  const match = epicUrl.match(/store\.epicgames\.com\/[a-z-]+\/p\/([a-zA-Z0-9-]+)/i);
  return match ? match[1] : null;
}

// Epic doesn't publish a documented public JSON API the way Steam does with
// appdetails. This uses the same content endpoint the epicgames.com storefront
// itself calls client-side — it's unofficial and may need updating if Epic
// changes their frontend. Returns null on any failure so callers can treat
// "couldn't verify right now" uniformly, same as Steam's fetchSteamAppDetails.
async function fetchEpicProductDetails(slug: string): Promise<any | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), EPIC_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`https://store-content.ak.epicgames.com/api/en-US/content/products/${slug}`, {
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error('[Epic Verification] Failed to fetch product details:', error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function extractEpicDescriptionText(data: any): string {
  // Shape of this payload is unofficial/undocumented; be defensive and just
  // stringify the parts most likely to hold free text so the code substring
  // check below still works if the exact field names drift.
  const pages = data?.pages;
  if (!Array.isArray(pages)) return JSON.stringify(data ?? '');
  return pages
    .map((p: any) => `${p?.data?.about?.description || ''} ${p?.data?.about?.shortDescription || ''}`)
    .join(' ');
}

/**
 * POST /api/indie/epic/start-verification
 * Parses the Epic slug out of the user's indie game profile epicUrl, generates
 * a one-time code, and stores it with a 15-minute expiry.
 */
router.post('/start-verification', hybridAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    const profile = await storage.getIndieGameProfile(userId);

    const epicSlug = extractEpicSlug(profile?.epicUrl);
    if (!epicSlug) {
      return res.status(400).json({
        error: 'invalid_request',
        message: 'Add a valid Epic Games Store URL (store.epicgames.com/en-US/p/<slug>) to your profile first.',
      });
    }

    await db.delete(epicVerificationCodes).where(eq(epicVerificationCodes.userId, userId));

    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + VERIFICATION_TTL_MS);
    await db.insert(epicVerificationCodes).values({ userId, epicSlug, code, expiresAt });

    return res.json({ code, epicSlug, expiresAt });
  } catch (error) {
    console.error('[Epic Verification] start-verification error:', error);
    return res.status(500).json({ error: 'server_error' });
  }
});

/**
 * POST /api/indie/epic/verify
 * Checks whether the pending code shows up in the store page's public
 * description text. On success, records verification on the indie game profile.
 */
router.post('/verify', hybridAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;

    const [pending] = await db.select().from(epicVerificationCodes)
      .where(eq(epicVerificationCodes.userId, userId))
      .orderBy(desc(epicVerificationCodes.id))
      .limit(1);

    if (!pending) {
      return res.status(400).json({ error: 'invalid_request', message: 'Start verification first.' });
    }
    if (pending.expiresAt < new Date()) {
      await db.delete(epicVerificationCodes).where(eq(epicVerificationCodes.id, pending.id));
      return res.status(400).json({ error: 'expired', message: 'Verification code expired. Please start again.' });
    }

    const data = await fetchEpicProductDetails(pending.epicSlug);
    if (!data) {
      return res.status(502).json({ error: 'epic_unreachable', message: "Couldn't reach Epic. Please try again shortly." });
    }

    const haystack = extractEpicDescriptionText(data);
    if (!haystack.includes(pending.code)) {
      return res.status(400).json({
        error: 'code_not_found',
        message: "Code not found on your store page yet. Make sure you saved the change on Epic and try again.",
      });
    }

    await db.delete(epicVerificationCodes).where(eq(epicVerificationCodes.id, pending.id));

    const epicVerifiedAt = new Date();
    await storage.upsertIndieGameProfile(userId, {
      epicVerifiedSlug: pending.epicSlug,
      epicVerifiedAt,
    });

    return res.json({ verified: true, epicVerifiedSlug: pending.epicSlug, epicVerifiedAt });
  } catch (error) {
    console.error('[Epic Verification] verify error:', error);
    return res.status(500).json({ error: 'server_error' });
  }
});

/**
 * GET /api/indie/epic/status
 * Current verification state — either an already-verified slug, or a pending
 * code waiting to be found on the store page.
 */
router.get('/status', hybridAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    const profile = await storage.getIndieGameProfile(userId);

    const [pending] = await db.select().from(epicVerificationCodes)
      .where(eq(epicVerificationCodes.userId, userId))
      .orderBy(desc(epicVerificationCodes.id))
      .limit(1);

    return res.json({
      verified: !!profile?.epicVerifiedAt,
      epicVerifiedSlug: profile?.epicVerifiedSlug || null,
      epicVerifiedAt: profile?.epicVerifiedAt || null,
      pending: pending && pending.expiresAt > new Date()
        ? { epicSlug: pending.epicSlug, code: pending.code, expiresAt: pending.expiresAt }
        : null,
    });
  } catch (error) {
    console.error('[Epic Verification] status error:', error);
    return res.status(500).json({ error: 'server_error' });
  }
});

export default router;
