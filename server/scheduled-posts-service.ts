import { storage } from './storage';
import { LeaderboardService } from './leaderboard-service';
import { BonusEventsService } from './bonus-events-service';
import { CreatorMilestoneService } from './creator-milestone-service';
import type { ScheduledPost, InsertClip, InsertScreenshot } from '@shared/schema';

// After this many failed publish attempts we stop retrying and mark the row
// 'failed' so it stops being picked up by the worker every minute.
const MAX_PUBLISH_ATTEMPTS = 5;

/**
 * Publish a single scheduled post: insert the real clip/screenshot record and
 * run the same XP / bonus side-effects the live upload endpoints run. The post
 * is already fully processed (thumbnails/transcode/Supabase upload happened at
 * schedule time), so `payload` is ready-to-insert clip/screenshot data.
 *
 * Returns the id of the created clip/screenshot.
 */
export async function publishScheduledPost(post: ScheduledPost): Promise<number> {
  if (post.contentType === 'clip') {
    const clipData = post.payload as InsertClip;
    const clip = await storage.createClip(clipData);

    const videoType = clipData.videoType === 'reel' ? 'reel' : 'clip';
    await LeaderboardService.awardPoints(
      post.userId,
      'upload',
      `Upload: ${videoType === 'reel' ? 'Reel' : 'Clip'} - ${clipData.title}`
    );

    return clip.id;
  }

  if (post.contentType === 'screenshot') {
    const screenshotData = post.payload as InsertScreenshot;
    const screenshot = await storage.createScreenshot(screenshotData);

    // Mirror the live /screenshot endpoint's award flow.
    await LeaderboardService.awardPoints(
      post.userId,
      'screenshot_upload',
      `Upload: Screenshot - ${screenshot.title}`
    );
    await BonusEventsService.awardWeekendUploadBonus(post.userId, 100);
    await CreatorMilestoneService.checkFirstUploadOfDay(post.userId);
    await CreatorMilestoneService.checkWeeklyUploadMilestones(post.userId);
    await BonusEventsService.checkConsecutiveUploadBonus(post.userId);

    return screenshot.id;
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
