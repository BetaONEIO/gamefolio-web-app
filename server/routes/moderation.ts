import { Router } from 'express';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '../db';
import { mediaModerationQueue, mediaModerationAppeals, clips, screenshots, users } from '@shared/schema';
import { fullAccessMiddleware } from '../middleware/full-access';

const router = Router();

// User-facing moderation endpoints. Requires auth; scoped to the caller's
// own content.

// POST /appeals — user submits an appeal for their own flagged/rejected item.
// Body: { contentType, contentId, message }
router.post('/appeals', fullAccessMiddleware, async (req, res) => {
  try {
    const { contentType, contentId, message } = req.body ?? {};
    if (!contentType || !Number.isFinite(Number(contentId)) || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'contentType, contentId and message are required' });
    }
    if (!['clip', 'reel', 'screenshot', 'avatar'].includes(contentType)) {
      return res.status(400).json({ error: 'Invalid contentType' });
    }

    const ownerId = await getContentOwner(contentType, Number(contentId));
    if (ownerId !== req.user!.id) {
      return res.status(403).json({ error: 'You can only appeal your own content' });
    }

    // Find the most recent open queue entry for this item; require one to exist.
    const [entry] = await db
      .select()
      .from(mediaModerationQueue)
      .where(and(
        eq(mediaModerationQueue.contentType, contentType),
        eq(mediaModerationQueue.contentId, Number(contentId)),
      ))
      .orderBy(desc(mediaModerationQueue.createdAt))
      .limit(1);
    if (!entry) {
      return res.status(404).json({ error: 'No moderation record found for this content' });
    }

    const [row] = await db
      .insert(mediaModerationAppeals)
      .values({
        queueId: entry.id,
        userId: req.user!.id,
        message: message.trim().slice(0, 2000),
      })
      .returning({ id: mediaModerationAppeals.id });

    res.status(201).json({ id: row.id, message: 'Appeal submitted. A moderator will review it shortly.' });
  } catch (err) {
    console.error('[moderation] appeal submit error', err);
    res.status(500).json({ error: 'Failed to submit appeal' });
  }
});

// GET /appeals/mine — list current user's appeals + their status.
router.get('/appeals/mine', fullAccessMiddleware, async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(mediaModerationAppeals)
      .where(eq(mediaModerationAppeals.userId, req.user!.id))
      .orderBy(desc(mediaModerationAppeals.createdAt));
    res.json({ items: rows });
  } catch (err) {
    console.error('[moderation] user appeals fetch error', err);
    res.status(500).json({ error: 'Failed to fetch appeals' });
  }
});

async function getContentOwner(contentType: string, contentId: number): Promise<number | null> {
  if (contentType === 'clip' || contentType === 'reel') {
    const [row] = await db.select({ userId: clips.userId }).from(clips).where(eq(clips.id, contentId));
    return row?.userId ?? null;
  }
  if (contentType === 'screenshot') {
    const [row] = await db.select({ userId: screenshots.userId }).from(screenshots).where(eq(screenshots.id, contentId));
    return row?.userId ?? null;
  }
  if (contentType === 'avatar') {
    const [row] = await db.select({ id: users.id }).from(users).where(eq(users.id, contentId));
    return row?.id ?? null;
  }
  return null;
}

export default router;
