import type { UploadLimits } from "./schema";

// Kept in sync with server/routes/upload.ts parseScheduledAt. A bulk batch
// uploads one file at a time, so a time that was in the future when the
// creator pressed upload can be in the past by the time a later file is
// finalized. Those responses are validation, not processing bugs.
export const SCHEDULE_DATE_INVALID = "Invalid schedule date/time.";
export const SCHEDULE_DATE_PAST = "Schedule time must be in the future.";
export const SCHEDULE_DATE_TOO_FAR = "Posts can be scheduled at most one year in advance.";
export const MAX_SCHEDULE_AHEAD_MS = 365 * 24 * 60 * 60 * 1000;

export type ScheduleTimeProblem = "invalid" | "past" | "too_far";

export function classifyScheduleTime(raw: string, now = Date.now()): ScheduleTimeProblem | null {
  const time = new Date(raw).getTime();
  if (Number.isNaN(time)) return "invalid";
  if (time <= now) return "past";
  if (time - now > MAX_SCHEDULE_AHEAD_MS) return "too_far";
  return null;
}

export function scheduleValidationMessage(problem: ScheduleTimeProblem): string {
  if (problem === "invalid") return SCHEDULE_DATE_INVALID;
  if (problem === "past") return SCHEDULE_DATE_PAST;
  return SCHEDULE_DATE_TOO_FAR;
}

export function schedulePastMessage(alreadyUploaded: boolean): string {
  return alreadyUploaded
    ? "This schedule time passed while the file was uploading. Pick a later time and retry this item. The video is already uploaded."
    : "This schedule time passed before the file could be scheduled. Pick a later time and retry this item.";
}

export function scheduledTimeError(
  iso: string,
  now = Date.now(),
  alreadyUploaded = false,
): { category: "past_schedule" | "invalid_schedule" | "schedule_too_far"; message: string } | null {
  const problem = classifyScheduleTime(iso, now);
  if (!problem) return null;
  const category = problem === "past"
    ? "past_schedule"
    : problem === "invalid"
      ? "invalid_schedule"
      : "schedule_too_far";
  return {
    category,
    message: problem === "past" ? schedulePastMessage(alreadyUploaded) : scheduleValidationMessage(problem),
  };
}

// Responses our upload routes return on purpose. A gateway or proxy failure
// has no JSON body, so it must still be reported.
const EXPECTED_UPLOAD_ERRORS = new Set([
  "Upload limit reached",
  "File size exceeds limit",
  "Video duration exceeds limit",
  "Scheduled post limit reached",
  SCHEDULE_DATE_INVALID,
  SCHEDULE_DATE_PAST,
  SCHEDULE_DATE_TOO_FAR,
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

const SCHEDULE_HTTP_ERRORS = new Set<string>([
  SCHEDULE_DATE_INVALID,
  SCHEDULE_DATE_PAST,
  SCHEDULE_DATE_TOO_FAR,
]);

export function expectedUploadRejectionCategory(
  status: number,
  body: UploadErrorBody | null | undefined,
): "upload_limit" | "schedule_validation" | null {
  if (!isExpectedUploadRejection(status, body)) return null;
  if (typeof body?.error === "string" && SCHEDULE_HTTP_ERRORS.has(body.error)) return "schedule_validation";
  return "upload_limit";
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
