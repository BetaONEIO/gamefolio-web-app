---
name: RevenueCat Play Store product state creation
description: Requirements for creating Google Play subscriptions through RevenueCat's product store-state API.
---

RevenueCat's Play Store create-if-missing flow requires both a localization and an explicit `auto_renewing_base_plan_type.billing_period_duration` in `store_state`; shared duration alone is insufficient.

**Why:** The API accepts the request asynchronously, then rejects missing localization or billing-plan metadata during the store operation.

**How to apply:** Include a short `en-GB` localization, the target currency/price, availability, and a base-plan billing period. Poll the returned operation before attaching the product to offerings.