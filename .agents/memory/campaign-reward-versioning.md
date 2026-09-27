---
name: Campaign reward versioning
description: Preserve historical campaign rewards while updating reusable campaign templates.
---

Reusable campaign templates are shared rows, so changing their objective rows in place can rewrite the meaning of launched campaigns. Archive a template once it has launched and create a new canonical version; move only still-draft instances to the new version. Backfill immutable reward snapshots on existing instances.

Saved per-instance objective snapshots must retain stable template bounty IDs for submissions while holding that campaign's type and quantity overrides. Freeze them once a creator joins, even if the campaign later returns to an editable-looking status.

**Why:** Historical submissions and payouts must remain tied to the reward terms that were active when the campaign launched. Shared template edits or post-join overrides can make the advertised mission differ from what the creator accepted.

**How to apply:** Any future campaign reward change must version the template and keep server-side idempotency keys stable per campaign, participant, objective, and completion award. Coalesce optional reward fields to `0` or `null` before interpolating them into Drizzle/Postgres SQL; undefined values can produce invalid empty SQL expressions.