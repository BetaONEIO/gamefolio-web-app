---
name: Seasonal reward claims
description: Constraints around retroactive asset-reward grants and legacy claim data.
---

Retroactive seasonal rewards should select eligible users with a distinct-user query and insert with `WHERE NOT EXISTS`; do not assume the historical asset-reward claims table is globally unique.

**Why:** Existing lootbox history contains duplicate `(reward_id, user_id)` rows for unrelated rewards, so adding a database-wide unique index would fail or require deleting historical data.

**How to apply:** Keep seasonal grant scripts idempotent, preserve existing claims, and recalculate the reward counter from the actual claim rows after bulk inserts.