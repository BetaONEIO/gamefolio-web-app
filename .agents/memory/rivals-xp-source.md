---
name: Rivals XP source
description: The dashboard Rivals card must match the active weekly leaderboard's authoritative XP calculation.
---

Rivals XP must mirror the active weekly leaderboard records used by the full-board UI, including the stored fractional totals when present.

**Why:** The Rivals card is a compact view of the weekly competition, and users expect it to match the full board exactly; the reference UI intentionally shows values such as 310, 0.24, and 0.2 XP.

**How to apply:** Use the same `LeaderboardService` weekly source for dashboard Rivals and the full leaderboard, preserve stored decimal values, and keep the same rank ordering and tie-breaker.