---
name: Leaderboard cache rebuild
description: weekly/monthly leaderboard tables are incremental caches; bulk history imports require a rebuild
---
The main leaderboards aggregate from `monthly_leaderboard`/`weekly_leaderboard` cache tables, which are only updated incrementally by the live award path — NOT derived from the history ledgers at read time.

**Why:** The legacy data import inserted history rows and recomputed `users.total_xp` but left the caches untouched, so 154/212 users were missing legacy-era points on the leaderboard (~520k points).

**How to apply:** After any bulk insert into `user_points_history`/`user_xp_history`, run `POST /api/admin/rebuild-leaderboards` (server/leaderboard-rebuild.ts). It locks the four tables IN EXCLUSIVE MODE inside one transaction so concurrent awards can't be silently dropped, aggregates both ledgers with week keys matching `LeaderboardService.getCurrentWeek`, and recomputes ranks. `total_points` columns are float32 (`real`), so per-user sums drift a few points from float64 history sums — that residual is expected.
