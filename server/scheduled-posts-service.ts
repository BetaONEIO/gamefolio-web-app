import { storage } from './storage';
import { LeaderboardService } from './leaderboard-service';
import { BonusEventsService } from './bonus-events-service';
import { CreatorMilestoneService } from './creator-milestone-service';
import type { ScheduledPost, InsertClip, InsertScreenshot } from '@shared/schema';

// After this many failed publish attempts we stop retrying and mark the row
// 'failed' so it stops being picked up by the worker every minute.
const MAX_PUBLISH_ATTEMPTS = 5;

// Run the upload XP / bonus side-effects. These are best-effort: a failure here
// must NOT fail the publish, otherwise the post is already live (the row gets
// created) but the scheduled_posts row is marked failed and retried, which then
// collides on the unique share_code. Errors are logged and swallowed.
async function awardUploadRewards(
  userId: number,
  kind: 'clip' | 'reel' | 'screenshot',
  title: string,
): Promise<void> {
  try {
    if (kind === 'screenshot') {
      await LeaderboardService.awardPoints(userId, 'screenshot_upload', `Upload: Screenshot - ${title}`);
      await BonusEventsService.awardWeekendUploadBonus(userId, 100);
      await CreatorMilestoneService.checkFirstUploadOfDay(userId);
      await CreatorMilestoneService.checkWeeklyUploadMilestones(userId);
      await BonusEventsService.checkConsecutiveUploadBonus(userId);
    } else {
      await LeaderboardService.awardPoints(userId, 'upload', `Upload: ${kind === 'reel' ? 'Reel' : 'Clip'} - ${title}`);
    }
  } catch (err) {
    console.error(`⚠️ Scheduled post published but reward side-effects failed for user ${userId}:`, err);
  }
}

function isUniqueViolation(err: unknown): boolean {
  // Drizzle wraps the driver error, so the Postgres code ('23505' = unique
  // violation) can be on the error itself or on its `cause`.
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: string; cause?: { code?: string } };
  return e.code === '23505' || e.cause?.code === '23505';
}

/**
 * Publish a single scheduled post: insert the real clip/screenshot record and
 * run the same XP / bonus side-effects the live upload endpoints run. The post
 * is already fully processed (thumbnails/transcode/Supabase upload happened at
 * schedule time), so `payload` is ready-to-insert clip/screenshot data.
 *
 * Idempotent: if a prior attempt already created the row (recognised by the
 * unique share_code), we reuse it instead of creating a duplicate, so a retry
 * after a transient post-insert failure converges instead of colliding.
 *
 * Returns the id of the created clip/screenshot.
 */
export async function publishScheduledPost(post: ScheduledPost): Promise<number> {
  if (post.contentType === 'clip') {
    const clipData = post.payload as InsertClip;
    let clipId: number;
    try {
      const clip = await storage.createClip(clipData);
      clipId = clip.id;
    } catch (err) {
      if (isUniqueViolation(err) && clipData.shareCode) {
        const existing = await storage.getClipByShareCode(clipData.shareCode);
        if (existing) return existing.id; // already published by an earlier attempt
      }
      throw err;
    }

    const videoType = clipData.videoType === 'reel' ? 'reel' : 'clip';
    await awardUploadRewards(post.userId, videoType, clipData.title);
    return clipId;
  }

  if (post.contentType === 'screenshot') {
    const screenshotData = post.payload as InsertScreenshot;
    let screenshotId: number;
    try {
      const screenshot = await storage.createScreenshot(screenshotData);
      screenshotId = screenshot.id;
    } catch (err) {
      if (isUniqueViolation(err) && screenshotData.shareCode) {
        const existing = await storage.getScreenshotByShareCode(screenshotData.shareCode);
        if (existing) return existing.id;
      }
      throw err;
    }

    await awardUploadRewards(post.userId, 'screenshot', screenshotData.title);
    return screenshotId;
  }

  throw new Error(`Unknown scheduled post content type: ${post.contentType}`);
}

/**
 * Worker tick: find scheduled posts whose time has come and publish them.
 * Each post is handled independently so one failure doesn't block the rest.
 */
export async function publishDueScheduledPosts(): Promise<void> {
  const now = new Date();
  const due = await storage.getDueScheduledPosts(now);
  if (due.length === 0) return;

  console.log(`📅 Publishing ${due.length} scheduled post(s) due at/before ${now.toISOString()}`);

  for (const post of due) {
    try {
      const publishedContentId = await publishScheduledPost(post);
      await storage.updateScheduledPost(post.id, {
        status: 'published',
        publishedAt: new Date(),
        publishedContentId,
        errorMessage: null,
      });
      console.log(`✅ Published scheduled ${post.contentType} #${post.id} → content #${publishedContentId}`);
    } catch (error) {
      const attempts = (post.attempts ?? 0) + 1;
      const message = error instanceof Error ? error.message : String(error);
      const exhausted = attempts >= MAX_PUBLISH_ATTEMPTS;
      await storage.updateScheduledPost(post.id, {
        attempts,
        errorMessage: message,
        ...(exhausted ? { status: 'failed' } : {}),
      });
      console.error(
        `❌ Failed to publish scheduled ${post.contentType} #${post.id} (attempt ${attempts}/${MAX_PUBLISH_ATTEMPTS}${exhausted ? ', giving up' : ''}):`,
        message
      );
    }
  }
}
