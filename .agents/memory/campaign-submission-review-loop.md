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

Keep preparation progress and campaign completion separate: staged units can fill a clearly labelled “ready to submit” meter, but only approved units unlock campaign rewards. Commit a complete package deliberately, then lock its contents while the owner reviews it. If changes are requested for selected units, accept unaffected units and reopen only the affected slots; otherwise a partial change request can leave the package impossible to resubmit.

**Why:** A staged item is a persistent draft, not an approval. Carrying forward untouched approved units also prevents the creator from having to re-upload accepted work.

**How to apply:** Serialize stage, removal, commit, and review on the participant row; validate deadline and state at each transition. Completion XP must use the same durable dedupe key in package review, legacy review, and full-key claim paths.