---
name: Public indie game identity
description: How public Indie Game routes must resolve their developer-owned profile.
---

Public Indie Game URLs are keyed by a game slug under `/games/<game-slug>`, while user profiles—including Indie Developer users—use the same username routes and profile presentation as every other user. Never switch a user profile to a game layout based on persona, and never pass a game slug to a username lookup. Load the catalogue game first, then resolve its Indie profile through the catalogue game ID.

**Why:** Game titles and developer usernames are independent. Combining them made a developer username URL display a game instead of the person, and treating one identifier as the other silently drops game-specific metadata. Legacy profiles may lack the catalogue link, so reconciliation must only attach a single exact title match and leave ambiguous matches untouched.

**How to apply:** Keep `/<username>` and `/@<username>` user-focused regardless of persona. Any public game feature that needs Indie profile fields should live under `/games/<game-slug>` and resolve by catalogue game ID. Preserve guarded legacy aliases and reconciliation when changing that data path.