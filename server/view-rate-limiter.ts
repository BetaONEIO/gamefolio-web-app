/**
 * In-memory IP-based view rate limiter.
 *
 * Prevents the same IPv4/IPv6 address from inflating view counts by
 * re-watching the same piece of content within the cooldown window.
 *
 * Key format: `{type}:{contentId}:{ip}`  e.g. "clip:42:203.0.113.7"
 * Cooldown   : VIEW_COOLDOWN_MS (default 1 hour)
 *
 * The Map is pruned every PRUNE_INTERVAL_MS to avoid unbounded growth.
 */

const VIEW_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
const PRUNE_INTERVAL_MS = 10 * 60 * 1000; // prune every 10 min

const seen = new Map<string, number>(); // key → timestamp of first view

function pruneExpired() {
  const cutoff = Date.now() - VIEW_COOLDOWN_MS;
  for (const [key, ts] of seen) {
    if (ts < cutoff) seen.delete(key);
  }
}

setInterval(pruneExpired, PRUNE_INTERVAL_MS).unref();

/**
 * Returns true if this is a new (countable) view, false if it's a repeat
 * within the cooldown window.
 *
 * @param type      Content type: "clip" | "screenshot"
 * @param contentId Numeric ID of the content
 * @param ip        Request IP (req.ip from Express)
 */
export function recordView(type: 'clip' | 'screenshot', contentId: number, ip: string): boolean {
  // Normalise: strip IPv6-mapped IPv4 prefix (::ffff:1.2.3.4 → 1.2.3.4)
  const normalizedIp = ip.replace(/^::ffff:/, '');
  const key = `${type}:${contentId}:${normalizedIp}`;
  const now = Date.now();
  const last = seen.get(key);

  if (last !== undefined && now - last < VIEW_COOLDOWN_MS) {
    return false; // duplicate within cooldown — do not count
  }

  seen.set(key, now);
  return true; // fresh view — count it
}
