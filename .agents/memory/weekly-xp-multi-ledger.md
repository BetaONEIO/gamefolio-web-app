---
name: Weekly XP multi-ledger
description: How weekly leaderboard totals stay aligned with the application's two XP ledgers.
---

Weekly leaderboard totals must combine current-window values from both
`user_xp_history` and `user_points_history`, then include only users with a
positive combined score. Aggregate each ledger by user before joining it to
users.

**Why:** Total XP is fed by both the modern creator-XP ledger and the legacy
points service. Reading only the modern ledger makes valid weekly points appear
as zero; joining raw event rows from both ledgers multiplies totals for users
with multiple events.

**How to apply:** For any week-scoped leaderboard or summary intended to match
total XP, use separate per-user, period-bounded aggregates for each ledger and
sum those aggregate values. Keep the Monday-to-Monday boundary shared with the
weekly leaderboard service.