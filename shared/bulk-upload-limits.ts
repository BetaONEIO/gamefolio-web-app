import type { UploadLimits } from "./schema";

// Responses our upload routes return on purpose. A gateway or proxy failure
// has no JSON body, so it must still be reported.
const EXPECTED_UPLOAD_ERRORS = new Set([
  "Upload limit reached",
  "File size exceeds limit",
  "Video duration exceeds limit",
  "Scheduled post limit reached",
  "Select one of your own games before uploading.",
  "Game Developers can only upload content for games they manage.",
]);

export type UploadErrorBody = {
  error?: unknown;
  message?: unknown;
  limits?: unknown;
  scheduleLimits?: unknown;
};

export function isExpectedUploadRejection(status: number, body: UploadErrorBody | null | undefined): boolean {
  if (status !== 403 && status !== 400) return false;
  if (!body || typeof body !== "object") return false;
  if (body.limits || body.scheduleLimits) return true;
  return typeof body.error === "string" && EXPECTED_UPLOAD_ERRORS.has(body.error);
}

export function uploadErrorMessage(body: UploadErrorBody | null | undefined, fallback: string): string {
  if (body && typeof body.message === "string" && body.message.trim()) return body.message;
  if (body && typeof body.error === "string" && body.error.trim()) return body.error;
  return fallback;
}

type WindowCounts = {
  reelCount: number;
  clipCount: number;
  screenshotCount: number;
};

function windowMessage(kind: string, requested: number, remaining: number, max: number, isPro: boolean): string | null {
  if (requested <= remaining) return null;
  const upgrade = isPro ? "" : " Upgrade to Pro for a higher limit.";
  if (remaining <= 0) {
    return `You've reached your ${max} ${kind} upload limit for now.${upgrade}`;
  }
  const noun = remaining === 1 ? kind : `${kind}s`;
  return `You can upload ${remaining} more ${noun} right now, but this batch has ${requested}.`;
}

export function bulkWindowLimitMessage(counts: WindowCounts, limits: UploadLimits): string | null {
  return (
    windowMessage("reel", counts.reelCount, limits.maxReelsPerWindow - limits.reelsUsedInWindow, limits.maxReelsPerWindow, limits.isPro) ||
    windowMessage("clip", counts.clipCount, limits.maxClipsPerWindow - limits.clipsUsedInWindow, limits.maxClipsPerWindow, limits.isPro) ||
    windowMessage(
      "screenshot",
      counts.screenshotCount,
      limits.maxScreenshotsPerWindow - limits.screenshotsUsedInWindow,
      limits.maxScreenshotsPerWindow,
      limits.isPro,
    )
  );
}

export function videoFileLimitMessage(input: {
  videoType: "clip" | "reel";
  fileSizeBytes: number;
  durationSeconds: number | null;
  limits: UploadLimits;
}): string | null {
  const isReel = input.videoType === "reel";
  const label = isReel ? "reel" : "clip";
  const maxMB = isReel ? input.limits.maxReelSizeMB : input.limits.maxClipSizeMB;
  const maxDuration = isReel ? input.limits.maxReelDurationSeconds : input.limits.maxClipDurationSeconds;
  if (input.fileSizeBytes > maxMB * 1024 * 1024) {
    const actual = (input.fileSizeBytes / (1024 * 1024)).toFixed(1);
    const upgrade = input.limits.isPro ? "" : " Upgrade to Pro for larger uploads.";
    return `Maximum ${label} size is ${maxMB}MB (your file is ${actual}MB).${upgrade}`;
  }
  if (input.durationSeconds != null && input.durationSeconds > maxDuration) {
    const upgrade = input.limits.isPro ? "" : " Upgrade to Pro for longer videos.";
    return `Maximum ${label} duration is ${maxDuration} seconds (your video is ${input.durationSeconds}s).${upgrade}`;
  }
  return null;
}
