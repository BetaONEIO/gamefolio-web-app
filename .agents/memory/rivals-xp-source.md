---
name: Rivals XP source
description: The dashboard Rivals card must match the active weekly leaderboard's authoritative XP calculation.
---

Rivals XP must come from positive `user_xp_history` events in the same rolling seven-day window as the weekly leaderboard, not from the legacy `weekly_leaderboard.total_points` cache.

**Why:** The legacy table can contain stale fractional point values, which makes a player-facing XP leaderboard show values such as 0.24 XP and disagree with the authoritative creator XP ledger.

**How to apply:** Keep the dashboard Rivals query and `/api/leaderboard/weekly/current` on the same ledger/window, return non-negative whole XP values, and preserve the same rank ordering and tie-breaker.