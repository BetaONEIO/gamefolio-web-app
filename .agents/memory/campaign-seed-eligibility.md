---
name: Campaign seed eligibility
description: Constraints for realistic development campaign fixtures.
---

Development campaign fixtures must use an existing catalogue game linked to the campaign owner, with genuine playable access matching the selected access method. Quick Creator also requires the owner's real Pro eligibility. Do not fabricate game access keys, infer a demo from storefront links, or silently grant an account a subscription just to fill the Bounty Hub.

**Why:** A visually convincing fixture with unsupported access or an ineligible owner cannot prove the actual builder-to-creator journey and can mislead testers into believing campaigns are playable.

**How to apply:** Before seeding representative campaigns, verify game ownership, eligibility, and access in the development database; if these prerequisites are absent, leave the honest empty state and ask for appropriate development fixtures rather than bypassing the creation contract.