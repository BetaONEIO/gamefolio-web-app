---
name: Indie analytics event privacy
description: Privacy and counting rules for first-party public Indie game analytics.
---

Public Indie game analytics must persist only a one-way hash derived server-side from an authenticated user ID or anonymous request fingerprint. Never persist raw IP addresses or user-agent strings.

**Why:** Unique-visitor reporting needs a stable identifier, but keeping raw network/device data is unnecessary and privacy-invasive. Developer self-views would also inflate the metrics they use to judge game performance.

**How to apply:** Exclude the owning developer on the server, deduplicate page views for the same visitor and game within one hour, and validate event/store values against fixed allowlists. Store clicks remain individual genuine click events.