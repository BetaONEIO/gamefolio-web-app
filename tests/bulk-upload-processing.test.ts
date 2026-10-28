import assert from "node:assert/strict";
import test from "node:test";
import type { UploadLimits } from "../shared/schema";
import {
  bulkWindowLimitMessage,
  isExpectedUploadRejection,
  videoFileLimitMessage,
} from "../shared/bulk-upload-limits";
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
  assert.equal(isExpectedUploadRejection(502, {}), false);
  assert.equal(isExpectedUploadRejection(403, {}), false);
  assert.equal(isExpectedUploadRejection(500, { error: "Video processing failed" }), false);
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
