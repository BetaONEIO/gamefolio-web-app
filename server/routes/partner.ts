import { Router, Request, Response } from 'express';
import { db } from '../db';
import { users } from '@shared/schema';
import { and, eq, desc } from 'drizzle-orm';
import { hybridAuth } from '../middleware/hybrid-auth';
import { EmailService } from '../email-service';

const router = Router();

// How recently a user must NOT have applied before they can re-apply.
const REAPPLY_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;

function isValidStreamUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * POST /api/partner/apply
 * A Gamefolio Pro member applies to become an official Streamer Partner.
 * The application is emailed to hello@gamefolio.com; an admin grants
 * partner status manually via the Admin Panel.
 */
router.post('/api/partner/apply', hybridAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.isPro) {
      return res.status(403).json({ message: 'A Gamefolio Pro subscription is required to apply.' });
    }

    if (user.isPartner) {
      return res.status(409).json({ message: 'You are already a Streamer Partner.' });
    }

    if (
      user.partnerAppliedAt &&
      Date.now() - new Date(user.partnerAppliedAt).getTime() < REAPPLY_COOLDOWN_MS
    ) {
      return res.status(409).json({ message: 'Your application is already under review.' });
    }

    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    if (message.length < 10) {
      return res.status(400).json({ message: 'Please tell us a little about yourself (at least 10 characters).' });
    }
    if (message.length > 2000) {
      return res.status(400).json({ message: 'Your message is too long (2000 characters max).' });
    }

    await EmailService.sendStreamerPartnerApplication({
      username: user.username,
      displayName: user.displayName || user.username,
      email: user.email || 'no-email-on-file',
      message,
    });

    await db
      .update(users)
      .set({ partnerAppliedAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, userId));

    res.json({ success: true, message: 'Application submitted. Our team will be in touch.' });
  } catch (err) {
    console.error('[Partner] Error submitting application:', err);
    res.status(500).json({ message: 'Error submitting application' });
  }
});

/**
 * PATCH /api/partner/settings
 * An approved Streamer Partner manages their featured stream link and
 * their visibility on the public /streamer page.
 */
router.patch('/api/partner/settings', hybridAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.isPartner) {
      return res.status(403).json({ message: 'Only Streamer Partners can update these settings.' });
    }

    const updates: { partnerFeaturedStreamUrl?: string | null; partnerStreamerVisible?: boolean; updatedAt: Date } = {
      updatedAt: new Date(),
    };

    if ('featuredStreamUrl' in req.body) {
      const raw = req.body.featuredStreamUrl;
      if (raw === null || raw === '') {
        updates.partnerFeaturedStreamUrl = null;
      } else if (typeof raw === 'string' && isValidStreamUrl(raw.trim())) {
        updates.partnerFeaturedStreamUrl = raw.trim();
      } else {
        return res.status(400).json({ message: 'Featured stream link must be a valid URL.' });
      }
    }

    if ('streamerVisible' in req.body) {
      if (typeof req.body.streamerVisible !== 'boolean') {
        return res.status(400).json({ message: 'streamerVisible must be a boolean.' });
      }
      updates.partnerStreamerVisible = req.body.streamerVisible;
    }

    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning({
        partnerFeaturedStreamUrl: users.partnerFeaturedStreamUrl,
        partnerStreamerVisible: users.partnerStreamerVisible,
      });

    res.json({ success: true, ...updated });
  } catch (err) {
    console.error('[Partner] Error updating partner settings:', err);
    res.status(500).json({ message: 'Error updating partner settings' });
  }
});

/**
 * GET /api/streamers
 * Public list of approved, visible Streamer Partners.
 * Consumed by the gamefolio.com marketing site's /streamer page.
 */
router.get('/api/streamers', async (_req: Request, res: Response) => {
  try {
    const partners = await db
      .select({
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        featuredStreamUrl: users.partnerFeaturedStreamUrl,
      })
      .from(users)
      .where(and(eq(users.isPartner, true), eq(users.partnerStreamerVisible, true)))
      .orderBy(desc(users.createdAt));

    res.json({ streamers: partners });
  } catch (err) {
    console.error('[Partner] Error listing streamers:', err);
    res.status(500).json({ message: 'Error listing streamers' });
  }
});

export default router;
