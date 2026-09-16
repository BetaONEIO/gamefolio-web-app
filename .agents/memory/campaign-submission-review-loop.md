---
name: Campaign submission review loop
description: Canonical creator campaign submissions, owner-scoped review, replacement history, and idempotent rewards.
---

Campaign creator submissions must stay in the canonical campaign submission table and be scoped server-side to the joined participant, campaign instance, objective, and owned media. Campaign owners may review only submissions for their own instances; platform admins retain global review access. Replacements should create a new submission linked to the prior changes-requested record, while approval and completion rewards remain guarded by durable dedupe keys.

**Why:** Creator uploads, developer review, notifications, progress, and rewards are one workflow. A second legacy submission path or client-controlled review fields can detach those states or award XP twice.

**How to apply:** Extend the canonical submission routes and owner queue. Validate campaign/objective/media ownership on the server, require reasons for changes requested and rejection, preserve review history, and keep reward issuance idempotent.

Campaign reward progress must use server-reported approved objective units and awarded XP from canonical submissions; local selected/uploaded items may show workflow state but must not fill the completion bar or unlock rewards.

**Why:** Submitted content can still be pending, changed, or rejected, so treating client selection as completion makes rewards appear earned before developer approval.

**How to apply:** Build campaign progress and reward states from the joined-campaign progress response, using approved counts for required completion and `xp_awarded` for earned XP. Keep bonus units outside required completion.