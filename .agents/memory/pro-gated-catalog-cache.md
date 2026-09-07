---
name: Pro-gated catalog cache
description: Client cache behavior for catalogs whose contents change with subscription entitlement.
---

When an endpoint returns different catalog contents based on a user's entitlement, include that entitlement state in the client query key or explicitly invalidate the query after the entitlement changes.

**Why:** Infinite-stale queries can preserve a non-entitled result after an upgrade, making a valid server-side entitlement look like a missing catalog.

**How to apply:** Use stable entitlement labels such as standard/pro in the key while retaining the same endpoint URL and server authorization checks.