import type { InsertClip } from "./schema";

// Bookkeeping stored on a scheduled clip payload while the transcode is still
// running. These keys are not clip columns and must be stripped before insert.
const MEDIA_BOOKKEEPING_KEYS = ["mediaReady", "rawUploadPath", "mediaAttempts"] as const;

export const MAX_SCHEDULED_MEDIA_ATTEMPTS = 3;

export type ScheduledMediaPayload = InsertClip & {
  mediaReady?: boolean;
  rawUploadPath?: string | null;
  mediaAttempts?: number;
};

// The publish worker must not treat "still transcoding" as a failed publish.
// Counting those ticks would mark a healthy queued post failed after a few minutes.
export class ScheduledMediaPendingError extends Error {
  constructor() {
    super("Scheduled media is still processing");
    this.name = "ScheduledMediaPendingError";
  }
}

export function isScheduledMediaPending(payload: unknown): boolean {
  return !!payload && typeof payload === "object" && (payload as { mediaReady?: unknown }).mediaReady === false;
}

export function clipDataFromScheduledPayload(payload: ScheduledMediaPayload): InsertClip {
  const clip: Record<string, unknown> = { ...payload };
  for (const key of MEDIA_BOOKKEEPING_KEYS) {
    delete clip[key];
  }
  return clip as InsertClip;
}

// null means the error is not a publish failure (media is still being prepared).
export function nextPublishAttempt(
  error: unknown,
  attemptsSoFar: number,
  maxAttempts: number,
): { attempts: number; errorMessage: string; status?: "failed" } | null {
  if (error instanceof ScheduledMediaPendingError) return null;
  const attempts = attemptsSoFar + 1;
  const errorMessage = error instanceof Error ? error.message : String(error);
  return {
    attempts,
    errorMessage,
    ...(attempts >= maxAttempts ? { status: "failed" as const } : {}),
  };
}
