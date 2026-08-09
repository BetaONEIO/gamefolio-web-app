import express from 'express';
import { storage } from '../storage';
import { supabaseStorage } from '../supabase-storage';
import { hybridFullAccess } from '../middleware/hybrid-auth';
import { parseScheduledAt } from './upload';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { captureRouteError } from '../sentry';

// Ensure the scheduled_posts table and its indexes exist. The table is defined
// in the Drizzle schema (shared/schema.ts) and owned by the migration file, but
// may not have been applied to older production databases. This IIFE makes the
// router self-healing: it creates the table idempotently on every cold start so
// that schedule-related endpoints and the background publish worker never fail
// with "relation does not exist".
(async () => {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "scheduled_posts" (
        "id" serial PRIMARY KEY NOT NULL,
        "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "content_type" text NOT NULL,
        "scheduled_at" timestamp NOT NULL,
        "status" text DEFAULT 'scheduled' NOT NULL,
        "payload" json NOT NULL,
        "title" text NOT NULL,
        "thumbnail_url" text,
        "video_type" text,
        "published_at" timestamp,
        "published_content_id" integer,
        "error_message" text,
        "attempts" integer DEFAULT 0 NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "scheduled_posts_due_idx"
        ON "scheduled_posts" ("status", "scheduled_at")
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "scheduled_posts_user_idx"
        ON "scheduled_posts" ("user_id", "status")
    `);
    console.log('✅ scheduled_posts table ready');
  } catch (err) {
    console.error('Failed to ensure scheduled_posts table:', err);
  }
})();

const router = express.Router();

// List the current user's scheduled posts (pending queue + recent history).
// Thumbnails live in a private Supabase bucket, so sign them for display the
// same way clip/screenshot responses do.
router.get('/', hybridFullAccess, async (req, res) => {
  try {
    const posts = await storage.getScheduledPostsByUser(req.user!.id);
    const withSignedThumbs = await Promise.all(
      posts.map(async (post) => ({
        ...post,
        thumbnailUrl: post.thumbnailUrl
          ? (await supabaseStorage.convertToSignedUrl(post.thumbnailUrl, 3600)) ?? post.thumbnailUrl
          : post.thumbnailUrl,
      }))
    );
    res.json({ posts: withSignedThumbs });
  } catch (error) {
    console.error('Error listing scheduled posts:', error);
    captureRouteError(error, { route: 'scheduled-posts', stage: 'list' });
    res.status(500).json({ error: 'Failed to load scheduled posts' });
  }
});

// Current user's scheduling quota (used / remaining / unlimited).
router.get('/limits', hybridFullAccess, async (req, res) => {
  try {
    const limits = await storage.getScheduledPostLimits(req.user!.id);
    res.json(limits);
  } catch (error) {
    console.error('Error fetching scheduled post limits:', error);
    captureRouteError(error, { route: 'scheduled-posts', stage: 'limits' });
    res.status(500).json({ error: 'Failed to fetch scheduling limits' });
  }
});

// Reschedule a pending post to a new future time.
router.patch('/:id', hybridFullAccess, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const post = await storage.getScheduledPost(id);
    if (!post || post.userId !== req.user!.id) {
      return res.status(404).json({ error: 'Scheduled post not found' });
    }
    if (post.status !== 'scheduled') {
      return res.status(400).json({ error: `Cannot reschedule a post that is already ${post.status}.` });
    }

    // Same validation as the schedule path: valid, in the future, and at most
    // one year out. parseScheduledAt returns {} for an empty value, which here
    // means a missing required field.
    if (!req.body.scheduledAt) {
      return res.status(400).json({ error: 'A new schedule date/time is required.' });
    }
    const { date, error } = parseScheduledAt(req.body.scheduledAt);
    if (error || !date) {
      return res.status(400).json({ error: error || 'Invalid schedule date/time.' });
    }

    const updated = await storage.updateScheduledPost(id, { scheduledAt: date });
    res.json({ success: true, post: updated });
  } catch (error) {
    console.error('Error rescheduling post:', error);
    captureRouteError(error, { route: 'scheduled-posts', stage: 'reschedule', postId: req.params.id });
    res.status(500).json({ error: 'Failed to reschedule post' });
  }
});

// Cancel (delete) a pending scheduled post. Published posts are left alone.
router.delete('/:id', hybridFullAccess, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const post = await storage.getScheduledPost(id);
    if (!post || post.userId !== req.user!.id) {
      return res.status(404).json({ error: 'Scheduled post not found' });
    }
    if (post.status !== 'scheduled') {
      return res.status(400).json({ error: `Cannot cancel a post that is already ${post.status}.` });
    }

    await storage.deleteScheduledPost(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error cancelling scheduled post:', error);
    captureRouteError(error, { route: 'scheduled-posts', stage: 'cancel', postId: req.params.id });
    res.status(500).json({ error: 'Failed to cancel scheduled post' });
  }
});

export default router;
