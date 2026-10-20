---
name: Profile theme persistence
description: Keep saved studio theme identity and gradient state synchronized between authenticated settings data and public profile rendering.
---

The authenticated user payload must expose the same profile theme identity and gradient fields that the public studio profile consumes. The appearance editor must treat gradient CSS as part of its synchronized baseline, and selecting a catalog theme must re-enable the theme gradient.

**Why:** A profile can render correctly immediately after selecting a theme while losing its theme slug or retaining stale gradient state after the authenticated user query refreshes.

**How to apply:** When adding or changing studio theme fields, update the authenticated serializer, settings hydration/baseline comparison, save payload, and public profile resolver together.