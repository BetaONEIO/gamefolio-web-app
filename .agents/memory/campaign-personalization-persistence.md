---
name: Campaign personalization persistence
description: How creator campaign setup fields stay available through draft creation and the public Bounty Hub.
---

Campaign instance storage is provisioned and evolved at runtime, so creator-facing personalization fields must be added additively and selected explicitly by Bounty Hub queries. Do not assume the existing template fields can carry a campaign-specific title or brief.

**Why:** The campaign setup flow can collect values that the original campaign_instances table did not store, which makes the UI appear successful while creators still see only the generic template name.

**How to apply:** When adding a new campaign setup field, update the runtime table migration, draft create/update route, creator-facing campaign selects, and the Bounty Hub display/fallback in the same change. Preserve existing template values as fallbacks for older rows.