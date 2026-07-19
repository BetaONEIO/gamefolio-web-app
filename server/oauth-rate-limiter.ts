/**
 * In-memory per-client sliding-window rate limiter for the public OAuth API
 * (server/routes/public-api-v1.ts).
 *
 * Keyed by clientId (not IP) — fairness is per registered app, since a client's
 * calls may come from many end-user IPs or a single backend IP.
 *
 * The Map is pruned every PRUNE_INTERVAL_MS to avoid unbounded growth.
 */
import { Request, Response, NextFunction } from 'express';

const WINDOW_MS = 60 * 1000; // 1 minute sliding window
const MAX_REQUESTS_PER_WINDOW = 100; // per client, per window
const PRUNE_INTERVAL_MS = 10 * 60 * 1000; // prune every 10 min

const requestTimestamps = new Map<number, number[]>(); // clientId -> timestamps within the window

function pruneExpired() {
  const cutoff = Date.now() - WINDOW_MS;
  for (const [clientId, timestamps] of requestTimestamps) {
    const fresh = timestamps.filter(ts => ts > cutoff);
    if (fresh.length === 0) requestTimestamps.delete(clientId);
    else requestTimestamps.set(clientId, fresh);
  }
}

setInterval(pruneExpired, PRUNE_INTERVAL_MS).unref();

/**
 * Must run after requireOAuthScope populates req.oauthContext.clientId.
 */
export function oauthRateLimiter(req: Request, res: Response, next: NextFunction) {
  const clientId = req.oauthContext?.clientId;
  if (!clientId) {
    // Shouldn't happen if mounted after requireOAuthScope, but fail safe rather
    // than let an unauthenticated call skip rate limiting entirely.
    return res.status(401).json({ error: 'invalid_token' });
  }

  const now = Date.now();
  const cutoff = now - WINDOW_MS;
  const timestamps = (requestTimestamps.get(clientId) || []).filter(ts => ts > cutoff);

  if (timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return res.status(429).json({ error: 'rate_limited', message: `Rate limit exceeded: ${MAX_REQUESTS_PER_WINDOW} requests per minute per client.` });
  }

  timestamps.push(now);
  requestTimestamps.set(clientId, timestamps);
  next();
}
