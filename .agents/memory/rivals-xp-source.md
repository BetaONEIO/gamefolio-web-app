---
name: Rivals XP source
description: The dashboard Rivals card must use user_xp_history directly (rolling 7-day CTE), not the weekly_leaderboard cache table.
---

Rivals XP must come from a direct `user_xp_history` query with a rolling 7-day window — the same approach as `/api/leaderboard/weekly/current`. The `weekly_leaderboard` cache table is only updated by `LeaderboardService.awardPoints()` (the legacy points path) and is not written to by `XPService.awardXP()`, so it silently stays empty for users who earn XP through the modern XP system.

**Why:** `XPService.awardXP()` writes to `user_xp_history`. `LeaderboardService.awardPoints()` writes to `weekly_leaderboard`. These two paths diverged; only querying `user_xp_history` covers both.

**How to apply:** In `/api/dashboard` (server/routes.ts), the rivals block uses a CTE:
```sql
WITH week_board AS (
  SELECT u.id, COALESCE(SUM(xh.xp_amount),0) AS weekXP, ...
  FROM users u LEFT JOIN user_xp_history xh ON ...
    AND xh.created_at >= NOW()-INTERVAL '7 days'
    AND xh.xp_amount > 0
  GROUP BY u.id, ...
  HAVING COALESCE(SUM(xh.xp_amount),0) > 0
),
my_entry AS (SELECT rank FROM week_board WHERE userId = ?)
SELECT ... FROM week_board, my_entry WHERE rank BETWEEN my_rank-2 AND my_rank+2
```
Only users with `weekXP > 0` enter the board, so the "No rivals yet" empty state fires correctly for new users.
