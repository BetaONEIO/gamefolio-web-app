---
name: Trending cache startup race
description: The in-memory trendingCache in server/routes.ts caches [] on the first request after server start because the DB connection pool isn't warm yet, causing carousel slides to stay blank.
---

## The rule
Never cache empty arrays in `getCachedTrending`. If the loader returns `[]`, skip caching so the next request retries the DB immediately.

**Why:** On startup, the first Drizzle query for trending clips returns `[]` (~100ms, no error) because the connection pool is still warming up. Previously this `[]` was cached for 30 seconds, meaning every page load within that window saw an empty carousel.

**How to apply:** The fix is in `getCachedTrending` in `server/routes.ts`:
```js
const isEmpty = Array.isArray(data) && data.length === 0;
if (!isEmpty) { trendingCache.set(key, ...) }
```

## Secondary fix
`getTrendingClips` in `server/database-storage.ts` also has a fallback: if the engagement-ordered query returns `[]`, it falls back to `ORDER BY created_at DESC` so the carousel always shows something even on first load.

## Related patterns
- `HomeCarousel.tsx` was calling `/api/featured-users` (404); correct endpoint is `/api/users/featured`.
- `scheduled_posts` table may not exist in dev — the error is suppressed in `server/index.ts` by checking the error message before logging.
- Video element in `TrendingSlider.tsx` starts `opacity:0` and transitions to `opacity:1` on `canPlay`/`loadedData` so the thumbnail `<img>` underneath is always visible while the video buffers.
