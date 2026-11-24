---
name: Authenticated campaign preview checks
description: Limits of static app screenshots when verifying signed-in campaign actions
---

Static app-preview screenshots run in a separate browser without the creator's login session. A screenshot showing the sign-in modal confirms that the app renders, but does not verify the campaign media picker, upload, review, or persistence flow.

**Why:** During the active-campaign upload fix, source analysis, focused tests, and a production build passed, while the screenshot could only reach the anonymous sign-in view. Treating it as proof of the authenticated flow would overstate verification.

**How to apply:** Use an authorized signed-in browser session or a controlled integration test with test data for creator upload checks. Do not create credentials or mutate an unconfirmed shared database just to make the screenshot authenticated.