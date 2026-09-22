---
name: Towerdog milestone rewards
description: Sandbox Pro access must not consume the first live Pro reward eligibility.
---

Sandbox RevenueCat access is intentionally persisted for testing, but it must be marked separately from live Pro. A later live RevenueCat or Stripe activation may claim the first-Pro milestone exactly once; late sandbox events must not downgrade that live state.

**Why:** RevenueCat can deliver sandbox activation before a real purchase. Treating the sandbox transition as the permanent first Pro activation causes the later paid event to miss its Towerdog reward.

**How to apply:** Keep the sandbox marker in the same conditional update that changes Pro state. Allow the live compare-and-set to transition from sandbox Pro, create the durable reward decision in that transaction, and preserve a winning live marker when a sandbox event completes later.