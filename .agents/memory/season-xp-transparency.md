---
name: Season XP transparency
description: The rule for calculating and explaining current-season XP on the dashboard.
---

Season XP shown in player-facing dashboard and leaderboard views must be calculated from positive `user_xp_history` events within the active season date window. The dashboard should expose a source-level breakdown whose totals reconcile exactly to the displayed Season XP.

**Why:** The legacy monthly leaderboard can drift from the authoritative creator-XP ledger, making the league total difficult to explain and inconsistent across screens.

**How to apply:** When adding or changing Season XP UI, use the active season's start/end dates and the `user_xp_history` source, then keep the breakdown total equal to the headline value.