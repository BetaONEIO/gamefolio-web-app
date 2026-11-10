const FIVE_MINUTES_MS = 5 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;
const SHORT_BURST_MAX = 20;
const HOURLY_MAX = 30;

export interface LikeRateLimitResult {
  allowed: boolean;
  message?: string;
}

/**
 * Per-account limiter for newly created likes. Unlike actions deliberately do
 * not consume quota, so a user can always remove engagement they previously gave.
 */
export function createLikeRateLimiter() {
  const actionsByUser = new Map<number, number[]>();

  return (userId: number, now = Date.now()): LikeRateLimitResult => {
    const hourCutoff = now - ONE_HOUR_MS;
    const recent = (actionsByUser.get(userId) || []).filter((timestamp) => timestamp > hourCutoff);
    const shortCutoff = now - FIVE_MINUTES_MS;
    const shortCount = recent.filter((timestamp) => timestamp > shortCutoff).length;

    if (shortCount >= SHORT_BURST_MAX) {
      actionsByUser.set(userId, recent);
      return {
        allowed: false,
        message: 'Too many likes in a short period. Please wait a few minutes and try again.',
      };
    }

    if (recent.length >= HOURLY_MAX) {
      actionsByUser.set(userId, recent);
      return {
        allowed: false,
        message: 'Hourly like limit reached. Please try again later.',
      };
    }

    recent.push(now);
    actionsByUser.set(userId, recent);
    return { allowed: true };
  };
}

export const recordLikeAction = createLikeRateLimiter();
