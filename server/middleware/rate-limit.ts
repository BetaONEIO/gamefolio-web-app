/**
 * Generic in-memory sliding-window rate limiter factory.
 *
 * Same shape as server/oauth-rate-limiter.ts (per-clientId) and
 * server/view-rate-limiter.ts (per-IP view cooldown), generalized so new
 * endpoints can rate limit by whatever key fits (IP, user id, etc.) without
 * duplicating the sliding-window bookkeeping.
 */
import { Request, Response, NextFunction } from 'express';

interface RateLimiterOptions {
  windowMs: number;
  max: number;
  keyFn: (req: Request) => string | null;
  message: string;
}

export function createRateLimiter({ windowMs, max, keyFn, message }: RateLimiterOptions) {
  const requestTimestamps = new Map<string, number[]>();

  setInterval(() => {
    const cutoff = Date.now() - windowMs;
    for (const [key, timestamps] of requestTimestamps) {
      const fresh = timestamps.filter(ts => ts > cutoff);
      if (fresh.length === 0) requestTimestamps.delete(key);
      else requestTimestamps.set(key, fresh);
    }
  }, 10 * 60 * 1000).unref();

  return function rateLimiter(req: Request, res: Response, next: NextFunction) {
    const key = keyFn(req);
    if (!key) return next();

    const now = Date.now();
    const cutoff = now - windowMs;
    const timestamps = (requestTimestamps.get(key) || []).filter(ts => ts > cutoff);

    if (timestamps.length >= max) {
      return res.status(429).json({ error: 'rate_limited', message });
    }

    timestamps.push(now);
    requestTimestamps.set(key, timestamps);
    next();
  };
}

/** Strips the IPv6-mapped IPv4 prefix (::ffff:1.2.3.4 → 1.2.3.4) for consistent keys. */
export function normalizedIp(req: Request): string {
  return (req.ip || 'unknown').replace(/^::ffff:/, '');
}
