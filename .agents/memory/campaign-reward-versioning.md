---
name: Campaign reward versioning
description: Preserve historical campaign rewards while updating reusable campaign templates.
---

Reusable campaign templates are shared rows, so changing their objective rows in place can rewrite the meaning of launched campaigns. Archive a template once it has launched and create a new canonical version; move only still-draft instances to the new version. Backfill immutable reward snapshots on existing instances.

**Why:** Historical submissions and payouts must remain tied to the reward terms that were active when the campaign launched.

**How to apply:** Any future campaign reward change must version the template and keep server-side idempotency keys stable per campaign, participant, objective, and completion award. Coalesce optional reward fields to `0` or `null` before interpolating them into Drizzle/Postgres SQL; undefined values can produce invalid empty SQL expressions.