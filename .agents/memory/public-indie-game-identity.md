---
name: Public indie game identity
description: How public Indie Game routes must resolve their developer-owned profile.
---

Public Indie Game URLs are keyed by a game slug, while the existing public profile endpoint is keyed by developer username. Never pass the game slug to a username lookup. Load the catalogue game first, then resolve its Indie profile through the catalogue game ID.

**Why:** Game titles and developer usernames are independent. Treating one as the other silently drops profile-specific metadata, including social links. Legacy profiles may lack the catalogue link, so reconciliation must only attach a single exact title match and leave ambiguous matches untouched.

**How to apply:** Any public game feature that needs Indie profile fields should resolve by catalogue game ID. Preserve the guarded legacy reconciliation when changing that data path.