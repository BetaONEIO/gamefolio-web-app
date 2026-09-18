---
name: Pro entitlement expiry compare-and-set
description: Concurrency rule for expiring orphaned Pro access without racing provider activation.
---

Expire stale providerless Pro access with a database compare-and-set that repeats every eligibility condition from the initial read, then re-read the current entitlement.

**Why:** A Stripe or RevenueCat activation can arrive between the status read and expiry write. An ID-only update can overwrite legitimate newly activated access.

**How to apply:** Any request-time or scheduled Pro expiry reconciliation must guard the write on Pro status, non-partner status, elapsed end date, and absent provider identifiers.