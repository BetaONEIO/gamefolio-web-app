import assert from "node:assert/strict";
import test from "node:test";
import type { UploadLimits } from "../shared/schema";
import {
  SCHEDULE_DATE_PAST,
  SCHEDULE_DATE_TOO_FAR,
  bulkWindowLimitMessage,
  classifyScheduleTime,
  expectedUploadRejectionCategory,
  isExpectedUploadRejection,
  schedulePastMessage,
  scheduledTimeError,
  videoFileLimitMessage,
} from "../shared/bulk-upload-limits";
import { shouldRetryTusStatus } from "../client/src/lib/tus-finish-payload";
import { insertClipSchema } from "../shared/schema";
import {
  ScheduledMediaPendingError,
  clipDataFromScheduledPayload,
  isScheduledMediaPending,
  nextPublishAttempt,
} from "../shared/scheduled-media";

const freeLimits = {
  isPro: false,
  maxClipSizeMB: 100,
  maxReelSizeMB: 50,
  maxScreenshotSizeMB: 10,
  maxClipDurationSeconds: 180,
  maxReelDurationSeconds: 60,
  maxClipsPerWindow: 3,
  clipsUsedInWindow: 0,
  maxReelsPerWindow: 3,
  reelsUsedInWindow: 3,
  maxScreenshotsPerWindow: 5,
  screenshotsUsedInWindow: 0,
  maxBulkUploads: 3,
} satisfies UploadLimits;

test("treats tier and permission responses as expected rejections", () => {
  assert.equal(isExpectedUploadRejection(403, { error: "Upload limit reached", limits: { isPro: false } }), true);
  assert.equal(isExpectedUploadRejection(403, { error: "Scheduled post limit reached", scheduleLimits: { remaining: 0 } }), true);
  assert.equal(isExpectedUploadRejection(403, { error: "File size exceeds limit" }), true);
  assert.equal(isExpectedUploadRejection(403, { error: "Game Developers can only upload content for games they manage." }), true);
  assert.equal(isExpectedUploadRejection(400, { error: SCHEDULE_DATE_PAST }), true);
  assert.equal(isExpectedUploadRejection(400, { error: SCHEDULE_DATE_TOO_FAR }), true);
  assert.equal(expectedUploadRejectionCategory(400, { error: SCHEDULE_DATE_PAST }), "schedule_validation");
  assert.equal(expectedUploadRejectionCategory(403, { error: "Upload limit reached", limits: { isPro: false } }), "upload_limit");
  assert.equal(isExpectedUploadRejection(502, {}), false);
  assert.equal(isExpectedUploadRejection(403, {}), false);
  assert.equal(isExpectedUploadRejection(400, {}), false);
  assert.equal(isExpectedUploadRejection(400, { error: "Invalid clip data" }), false);
  assert.equal(isExpectedUploadRejection(500, { error: "Video processing failed" }), false);
});

test("explains a schedule that expires while a bulk batch is still uploading", () => {
  const now = Date.parse("2026-11-03T14:49:38.000Z");
  const stillFuture = new Date(now + 60_000).toISOString();
  const justPassed = new Date(now - 1_000).toISOString();
  assert.equal(classifyScheduleTime(stillFuture, now), null);
  assert.equal(classifyScheduleTime(justPassed, now), "past");
  assert.equal(scheduledTimeError(stillFuture, now), null);
  const waiting = scheduledTimeError(justPassed, now, false);
  assert.equal(waiting?.category, "past_schedule");
  assert.match(waiting?.message || "", /Pick a later time/);
  const stored = scheduledTimeError(justPassed, now, true);
  assert.match(stored?.message || "", /already uploaded/);
  assert.match(schedulePastMessage(true), /already uploaded/);
  assert.equal(classifyScheduleTime("not-a-date", now), "invalid");
  assert.equal(
    classifyScheduleTime(new Date(now + 366 * 24 * 60 * 60 * 1000).toISOString(), now),
    "too_far",
  );
});

test("retries transient storage failures and stops on a deliberate tus rejection", () => {
  assert.equal(shouldRetryTusStatus(502, "<html>bad gateway</html>", true), true);
  assert.equal(shouldRetryTusStatus(0, null, true), true);
  assert.equal(shouldRetryTusStatus(503, "", true), true);
  assert.equal(shouldRetryTusStatus(409, "", true), true);
  assert.equal(shouldRetryTusStatus(502, "<html>bad gateway</html>", false), false);
  assert.equal(
    shouldRetryTusStatus(403, JSON.stringify({ error: "File size exceeds limit", message: "Maximum reel size is 250MB" }), true),
    false,
  );
  assert.equal(shouldRetryTusStatus(400, JSON.stringify({ message: "Invalid upload" }), true), false);
  assert.equal(shouldRetryTusStatus(404, "", true), false);
});

test("zod 4 clip schema still accepts a process-video placeholder", () => {
  const parsed = insertClipSchema.parse({
    userId: 1,
    title: "Scheduled reel",
    description: "",
    gameId: null,
    tags: ["ranked"],
    videoUrl: "https://cdn.example/videos/raw.mp4",
    videoType: "reel",
    thumbnailUrl: "",
    duration: 0,
    ageRestricted: false,
  });
  assert.equal(parsed.title, "Scheduled reel");
  assert.equal(parsed.gameId, null);
  assert.equal(parsed.videoType, "reel");
});

test("blocks a bulk batch that exceeds the rolling reel window", () => {
  const message = bulkWindowLimitMessage({ reelCount: 1, clipCount: 0, screenshotCount: 0 }, freeLimits);
  assert.match(message || "", /3 reel upload limit/);
});

test("rechecks reel size after a portrait file was accepted under the clip cap", () => {
  const message = videoFileLimitMessage({
    videoType: "reel",
    fileSizeBytes: 70 * 1024 * 1024,
    durationSeconds: 29,
    limits: freeLimits,
  });
  assert.match(message || "", /Maximum reel size is 50MB/);
  assert.equal(
    videoFileLimitMessage({
      videoType: "clip",
      fileSizeBytes: 70 * 1024 * 1024,
      durationSeconds: 29,
      limits: freeLimits,
    }),
    null,
  );
});

test("legacy scheduled posts without mediaReady are publishable", () => {
  assert.equal(isScheduledMediaPending({ title: "ready", videoUrl: "https://cdn.example/v.mp4" }), false);
  assert.equal(isScheduledMediaPending({ mediaReady: false, videoUrl: "https://cdn.example/raw.mp4" }), true);
  assert.equal(isScheduledMediaPending({ mediaReady: true }), false);
});

test("strips transcode bookkeeping before inserting a scheduled clip", () => {
  const clip = clipDataFromScheduledPayload({
    userId: 1,
    title: "clip",
    description: "",
    videoUrl: "https://cdn.example/final.mp4",
    thumbnailUrl: "",
    duration: 29,
    videoType: "reel",
    mediaReady: true,
    rawUploadPath: "published/users/1/videos/raw.mp4",
    mediaAttempts: 1,
  });
  assert.equal("mediaReady" in clip, false);
  assert.equal("rawUploadPath" in clip, false);
  assert.equal("mediaAttempts" in clip, false);
  assert.equal(clip.videoUrl, "https://cdn.example/final.mp4");
});

test("does not spend a publish attempt while scheduled media is still processing", () => {
  assert.equal(nextPublishAttempt(new ScheduledMediaPendingError(), 4, 5), null);
  const failed = nextPublishAttempt(new Error("database down"), 4, 5);
  assert.deepEqual(failed, { attempts: 5, errorMessage: "database down", status: "failed" });
});
