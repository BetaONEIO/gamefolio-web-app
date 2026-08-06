---
name: Additive schema drift
description: Handling production runtime errors caused by additive columns missing from both development and production databases.
---

When a deployed query selects a column that is absent from production, first verify the column in both databases and the schema source. If the source already defines it, apply the existing additive migration or equivalent schema change to development, then use the Publish flow to apply it to production.

**Why:** The Publish diff compares database state, not just source code. If development is also stale, it reports no change and cannot repair production even though the deployed code expects the column.

**How to apply:** Keep the migration nullable/additive where possible, confirm the final diff has no drops or truncations, and do not run DDL directly against production.