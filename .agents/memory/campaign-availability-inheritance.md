---
name: Campaign availability inheritance
description: Why new campaigns inherit live game availability but old campaigns keep saved restrictions
---

Only campaigns deliberately created without both campaign-level platform and region snapshots should inherit the current owner-scoped game profile availability. Campaigns with either saved field retain both historical values; do not mix one live field with one snapshot field. If inherited availability becomes incomplete, fail closed for joining or submitting rather than treating missing data as worldwide.

**Why:** A game owner can change platforms or available regions after launching a campaign. Applying those edits retroactively to older campaigns that promised specific eligibility can silently widen creator access or alter existing restrictions. New simplified campaigns intentionally opt into live inheritance so their availability stays aligned with the game profile.

**How to apply:** When changing campaign reads, eligibility, or draft submission, distinguish inherited records from legacy snapshots before resolving availability. Match the profile by the campaign owner's catalogue game relationship, not by a profile row ID or another owner's game.