---
name: Campaign catalogue identity
description: Why campaigns must save catalogue game IDs rather than Indie profile row IDs
---

Campaign game references must be validated as owned catalogue game IDs. Indie profile IDs are only for selecting and editing the developer's own profile; never accept them interchangeably as campaign game IDs, even when their numbers happen to coincide. The public game hero and About content should resolve through the same explicit catalogue relationship.

**Why:** A campaign creation path previously accepted either numeric ID and persisted the submitted value, while the public Bounties join only matched catalogue IDs. Such campaigns could display mismatched or absent game details, and numeric collisions are not evidence of identity.

**How to apply:** When adding campaign creation or editing flows, read the selected profile's explicit catalogue relationship and require it to exist before saving. Do not infer relationships from game names or repair historical rows on a numeric guess.