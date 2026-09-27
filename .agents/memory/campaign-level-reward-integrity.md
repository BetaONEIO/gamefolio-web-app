---
name: Campaign-level reward integrity
description: Rules for preserving completion-only campaign XP when legacy campaign rows have empty reward fields.
---

Campaign XP is a single completion reward configured on the campaign instance, template, or authoritative XP tier. Objective `xp_reward` values are legacy metadata and must not be summed for display or payout. Joining and revealing access must not grant additional campaign XP.

**Why:** Older campaign rows can have zeroed instance/template reward columns even though their objectives contain historical unit values. Summing those values, or awarding join/access XP, would violate the one completion-reward contract.

**How to apply:** Prefer the persisted instance reward, then the template reward, then the authoritative tier configuration for legacy zero-value rows. Keep objective and join/access XP out of creator-facing reward state and awards. When final approval is retried, recover the same idempotent campaign reward rather than rejecting an already-approved submission outright.