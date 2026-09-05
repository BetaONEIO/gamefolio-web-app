---
name: RevenueCat Web Billing catalog limits
description: RevenueCat Developer API limitations encountered when managing Web Billing products.
---

RevenueCat's Developer API can rename Web Billing products, offerings, packages, and entitlements, but rejects Web Billing product creation. Existing GBP Web Billing prices are also immutable through the available product-price endpoint.

**Why:** Attempting to create a replacement Web Billing subscription returned RevenueCat's explicit “Web Billing product creation is still not supported” authorization error. Price changes require replacement products, so they cannot be completed through this API.

**How to apply:** Make Web Billing product and price changes in the RevenueCat dashboard. Continue using the API for safe catalog inspection and metadata updates. Configure native prices separately in App Store Connect and Google Play.