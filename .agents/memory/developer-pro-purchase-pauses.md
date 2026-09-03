---
name: Developer Pro purchase pauses
description: How to pause new Developer Pro sales without corrupting existing subscriber state.
---

When Developer Pro sales are paused, block every new acquisition path: browser checkout creation and confirmation, Stripe checkout webhook provisioning, native purchase calls, RevenueCat activation, and entitlement-acquiring webhook events for non-subscribers. Continue processing renewals, cancellations, and expirations for existing subscribers.

**Why:** A client-only or Stripe-only flag still permits native/store acquisition, while disabling all webhook processing causes active subscriber state to become stale. RevenueCat cancellation intent also does not mean access has expired; paid access remains through the entitlement expiration event.

**How to apply:** Any future change to the Developer Pro availability flag must be checked across Stripe, RevenueCat, client purchase hooks, activation routes, and both providers' lifecycle webhooks. New grants follow the flag; existing entitlement synchronization does not.