---
name: Daily reward session hydration
description: Why daily streak claims must be triggered when an existing authenticated session is hydrated.
---

The daily login claim must run when an authenticated session is restored or refreshed, not only inside explicit password or OAuth login handlers. Keep the claim idempotent and exclude admin impersonation.

**Why:** Users commonly remain signed in across days, especially in the native app. Requiring an authentication event means they cannot receive the next eligible reward without logging out and back in. A lifetime client “already shown” flag can also suppress a later reward when the app remains open overnight.

**How to apply:** Use the streak service’s atomic rolling-window guard during current-user hydration, return new reward data only for the winning claim, re-arm the client overlay after a no-reward hydration, and refresh daily-activity state after a claim.