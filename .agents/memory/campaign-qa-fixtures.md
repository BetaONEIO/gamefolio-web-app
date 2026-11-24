---
name: Campaign QA fixtures
description: Ownership and access settings for temporary live campaigns used to test creator flows.
---

Temporary live QA campaigns should be clearly labeled, owned by an active platform admin, and configured without access-key or completion-key requirements.

**Why:** A live test campaign owned by an Indie partner can consume their active-campaign allowance and key inventory, potentially blocking a real launch.

**How to apply:** Confirm development/production separation without reading secret values; use an active admin owner, future expiry, finite capacity, and unchanged creator participation rules.