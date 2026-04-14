import { Router } from 'express';
import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '../db';
import {
  mediaModerationQueue,
  mediaModerationAppeals,
  mediaModerationThresholds,
  clips,
  screenshots,
  users,
} from '@shared/schema';
import { adminMiddleware } from '../middleware/admin';
import { supabaseStorage } from '../supabase-storage';
import { invalidateThresholdCache } from '../services/media-moderation';

const router = Router();
router.use(adminMiddleware);

// GET /queue — paginated list of open moderation items with joined content.
router.get('/queue', async (req, res) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : 'open';
    const type = typeof req.query.type === 'string' ? req.query.type : undefined; // clip|screenshot|avatar|reel
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt((req.query.pageSize as string) || '25', 10)));
    const offset = (page - 1) * pageSize;

    const conditions = [eq(mediaModerationQueue.status, status)];
    if (type) conditions.push(eq(mediaModerationQueue.contentType, type));

    const rows = await db
      .select()
      .from(mediaModerationQueue)
      .where(and(...conditions))
      .orderBy(desc(mediaModerationQueue.confidenceMax), desc(mediaModerationQueue.createdAt))
      .limit(pageSize)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(mediaModerationQueue)
      .where(and(...conditions));

    // Enrich each row with a light preview (thumbnail + title + username) so
    // the admin UI can render the queue in a single round trip.
    const items = await Promise.all(rows.map(async (row) => {
      const preview = await getContentPreview(row.contentType, row.contentId);
      return { ...row, preview };
    }));

    res.json({ items, page, pageSize, total: Number(count) });
  } catch (err) {
    console.error('[admin-moderation] queue fetch error', err);
    res.status(500).json({ error: 'Failed to fetch moderation queue' });
  }
});

// POST /queue/:id/approve — mark content approved and resolve the queue entry.
router.post('/queue/:id/approve', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [entry] = await db.select().from(mediaModerationQueue).where(eq(mediaModerationQueue.id, id));
    if (!entry) return res.status(404).json({ error: 'Queue entry not found' });

    await updateContentModerationStatus(entry.contentType, entry.contentId, 'approved');

    await db
      .update(mediaModerationQueue)
      .set({
        status: 'resolved',
        reviewDecision: 'approve',
        reviewedBy: req.user!.id,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(mediaModerationQueue.id, id));

    res.json({ success: true });
  } catch (err) {
    console.error('[admin-moderation] approve error', err);
    res.status(500).json({ error: 'Failed to approve content' });
  }
});

// POST /queue/:id/reject — mark content rejected, delete storage asset, notify user.
router.post('/queue/:id/reject', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const notes = typeof req.body?.notes === 'string' ? req.body.notes : null;

    const [entry] = await db.select().from(mediaModerationQueue).where(eq(mediaModerationQueue.id, id));
    if (!entry) return res.status(404).json({ error: 'Queue entry not found' });

    // Fetch the asset URL before we flip status, so we can delete it from storage.
    const assetUrl = await getContentAssetUrl(entry.contentType, entry.contentId);
    await updateContentModerationStatus(entry.contentType, entry.contentId, 'rejected');

    if (assetUrl) {
      try {
        await supabaseStorage.deleteFileByPublicUrl(assetUrl);
      } catch (deleteErr) {
        console.warn('[admin-moderation] storage delete failed', deleteErr);
      }
    }

    await db
      .update(mediaModerationQueue)
      .set({
        status: 'resolved',
        reviewDecision: 'reject',
        reviewedBy: req.user!.id,
        reviewedAt: new Date(),
        reviewerNotes: notes,
        updatedAt: new Date(),
      })
      .where(eq(mediaModerationQueue.id, id));

    res.json({ success: true });
  } catch (err) {
    console.error('[admin-moderation] reject error', err);
    res.status(500).json({ error: 'Failed to reject content' });
  }
});

// GET /appeals — open appeals
router.get('/appeals', async (req, res) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : 'open';
    const rows = await db
      .select()
      .from(mediaModerationAppeals)
      .where(eq(mediaModerationAppeals.status, status))
      .orderBy(desc(mediaModerationAppeals.createdAt));
    res.json({ items: rows });
  } catch (err) {
    console.error('[admin-moderation] appeals fetch error', err);
    res.status(500).json({ error: 'Failed to fetch appeals' });
  }
});

// POST /appeals/:id/resolve — accept or reject an appeal.
router.post('/appeals/:id/resolve', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const decision = req.body?.decision;
    if (decision !== 'approved' && decision !== 'rejected') {
      return res.status(400).json({ error: 'decision must be "approved" or "rejected"' });
    }

    const [appeal] = await db.select().from(mediaModerationAppeals).where(eq(mediaModerationAppeals.id, id));
    if (!appeal) return res.status(404).json({ error: 'Appeal not found' });

    const [queueEntry] = await db.select().from(mediaModerationQueue).where(eq(mediaModerationQueue.id, appeal.queueId));
    if (queueEntry) {
      await updateContentModerationStatus(queueEntry.contentType, queueEntry.contentId, decision);
      await db
        .update(mediaModerationQueue)
        .set({
          status: 'resolved',
          reviewDecision: decision === 'approved' ? 'approve' : 'reject',
          reviewedBy: req.user!.id,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(mediaModerationQueue.id, queueEntry.id));
    }

    await db
      .update(mediaModerationAppeals)
      .set({
        status: 'resolved',
        resolution: decision,
        resolvedBy: req.user!.id,
        resolvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(mediaModerationAppeals.id, id));

    res.json({ success: true });
  } catch (err) {
    console.error('[admin-moderation] appeal resolve error', err);
    res.status(500).json({ error: 'Failed to resolve appeal' });
  }
});

// GET /thresholds — list label thresholds.
router.get('/thresholds', async (_req, res) => {
  try {
    const rows = await db.select().from(mediaModerationThresholds).orderBy(mediaModerationThresholds.label);
    res.json({ items: rows });
  } catch (err) {
    console.error('[admin-moderation] thresholds fetch error', err);
    res.status(500).json({ error: 'Failed to fetch thresholds' });
  }
});

// PUT /thresholds/:label — upsert a threshold for a given label.
router.put('/thresholds/:label', async (req, res) => {
  try {
    const label = decodeURIComponent(req.params.label);
    const { rejectThreshold, flagThreshold, gamingSuppressed } = req.body ?? {};
    if (typeof rejectThreshold !== 'number' || typeof flagThreshold !== 'number') {
      return res.status(400).json({ error: 'rejectThreshold and flagThreshold must be numbers' });
    }
    if (flagThreshold > rejectThreshold) {
      return res.status(400).json({ error: 'flagThreshold must be <= rejectThreshold' });
    }

    await db
      .insert(mediaModerationThresholds)
      .values({
        label,
        rejectThreshold: rejectThreshold.toString(),
        flagThreshold: flagThreshold.toString(),
        gamingSuppressed: !!gamingSuppressed,
      })
      .onConflictDoUpdate({
        target: mediaModerationThresholds.label,
        set: {
          rejectThreshold: rejectThreshold.toString(),
          flagThreshold: flagThreshold.toString(),
          gamingSuppressed: !!gamingSuppressed,
          updatedAt: new Date(),
        },
      });

    invalidateThresholdCache();
    res.json({ success: true });
  } catch (err) {
    console.error('[admin-moderation] threshold upsert error', err);
    res.status(500).json({ error: 'Failed to update threshold' });
  }
});

// Helpers --------------------------------------------------------------

async function updateContentModerationStatus(
  contentType: string,
  contentId: number,
  status: 'approved' | 'flagged' | 'rejected',
): Promise<void> {
  if (contentType === 'clip' || contentType === 'reel') {
    await db
      .update(clips)
      .set({ moderationStatus: status, moderatedAt: new Date() })
      .where(eq(clips.id, contentId));
  } else if (contentType === 'screenshot') {
    await db
      .update(screenshots)
      .set({ moderationStatus: status, moderatedAt: new Date() })
      .where(eq(screenshots.id, contentId));
  } else if (contentType === 'avatar') {
    await db
      .update(users)
      .set({ avatarModerationStatus: status, avatarModeratedAt: new Date() })
      .where(eq(users.id, contentId));
  }
}

async function getContentPreview(contentType: string, contentId: number): Promise<{
  title: string | null;
  thumbnailUrl: string | null;
  mediaUrl: string | null;
  username: string | null;
  displayName: string | null;
} | null> {
  try {
    if (contentType === 'clip' || contentType === 'reel') {
      const [row] = await db
        .select({
          title: clips.title,
          thumbnailUrl: clips.thumbnailUrl,
          mediaUrl: clips.videoUrl,
          username: users.username,
          displayName: users.displayName,
        })
        .from(clips)
        .leftJoin(users, eq(clips.userId, users.id))
        .where(eq(clips.id, contentId));
      return row ?? null;
    }
    if (contentType === 'screenshot') {
      const [row] = await db
        .select({
          title: screenshots.title,
          thumbnailUrl: screenshots.thumbnailUrl,
          mediaUrl: screenshots.imageUrl,
          username: users.username,
          displayName: users.displayName,
        })
        .from(screenshots)
        .leftJoin(users, eq(screenshots.userId, users.id))
        .where(eq(screenshots.id, contentId));
      return row ?? null;
    }
    if (contentType === 'avatar') {
      const [row] = await db
        .select({
          username: users.username,
          displayName: users.displayName,
          mediaUrl: users.avatarUrl,
        })
        .from(users)
        .where(eq(users.id, contentId));
      return row ? { title: row.displayName, thumbnailUrl: row.mediaUrl, mediaUrl: row.mediaUrl, username: row.username, displayName: row.displayName } : null;
    }
  } catch (err) {
    console.warn('[admin-moderation] preview lookup failed', err);
  }
  return null;
}

async function getContentAssetUrl(contentType: string, contentId: number): Promise<string | null> {
  if (contentType === 'clip' || contentType === 'reel') {
    const [row] = await db.select({ url: clips.videoUrl }).from(clips).where(eq(clips.id, contentId));
    return row?.url ?? null;
  }
  if (contentType === 'screenshot') {
    const [row] = await db.select({ url: screenshots.imageUrl }).from(screenshots).where(eq(screenshots.id, contentId));
    return row?.url ?? null;
  }
  if (contentType === 'avatar') {
    const [row] = await db.select({ url: users.avatarUrl }).from(users).where(eq(users.id, contentId));
    return row?.url ?? null;
  }
  return null;
}

export default router;
