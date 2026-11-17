const FIVE_MINUTES_MS = 5 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;
const SHORT_BURST_MAX = 20;
const HOURLY_MAX = 30;

type Reservation = { at: number };

export interface LikeRateLimitResult {
  allowed: boolean;
  message?: string;
  /**
   * Drops this reservation. Call it when the like was not created, including
   * when the database insert fails. Unlike actions never reserve quota.
   */
  release?: () => void;
}

export interface LikeRateLimiter {
  (userId: number, now?: number): LikeRateLimitResult;
}

/**
 * Per-account limiter for newly created likes. Unlike actions deliberately do
 * not consume quota, so a user can always remove engagement they previously gave.
 *
 * A reservation is held only until the caller releases it or it ages out.
 * Failed inserts must release the reservation; otherwise retries of a database
 * error burn the short-period limit (20 likes / 5 minutes).
 */
export function createLikeRateLimiter(): LikeRateLimiter {
  const actionsByUser = new Map<number, Reservation[]>();

  return (userId: number, now = Date.now()): LikeRateLimitResult => {
    const hourCutoff = now - ONE_HOUR_MS;
    const recent = (actionsByUser.get(userId) || []).filter((reservation) => reservation.at > hourCutoff);
    const shortCutoff = now - FIVE_MINUTES_MS;
    const shortCount = recent.filter((reservation) => reservation.at > shortCutoff).length;

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

    const reservation: Reservation = { at: now };
    recent.push(reservation);
    actionsByUser.set(userId, recent);
    return {
      allowed: true,
      release() {
        const current = actionsByUser.get(userId);
        if (!current) return;
        const index = current.indexOf(reservation);
        if (index >= 0) current.splice(index, 1);
      },
    };
  };
}

export const recordLikeAction = createLikeRateLimiter();
