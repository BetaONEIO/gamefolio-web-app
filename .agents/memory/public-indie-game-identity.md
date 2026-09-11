---
name: Public indie game identity
description: How public Indie Game routes must resolve their developer-owned profile.
---

Public Indie Game URLs are keyed by a game slug under `/games/<game-slug>`, while user profiles—including Indie Developer users—use the same username routes and profile presentation as every other user. Never switch a user profile to a game layout based on persona, and never pass a game slug to a username lookup. Load the catalogue game first, then resolve its Indie profile through the catalogue game ID. After resolution, public profile layout selection must use the Indie profile row ID, not the catalogue game ID; the loaded profile supplies its catalogue ID for clips, screenshots, and counts.

**Why:** Game titles and developer usernames are independent. Combining them made a developer username URL display a game instead of the person, and treating one identifier as the other silently drops game-specific metadata. Passing a catalogue game ID to an endpoint that selects by Indie profile ID returns no profile and makes the page fall back to the developer display name and empty media. Legacy profiles may lack the catalogue link, so reconciliation must only attach a single exact title match and leave ambiguous matches untouched.

**How to apply:** Keep `/<username>` and `/@<username>` user-focused regardless of persona. Any public game feature that needs Indie profile fields should live under `/games/<game-slug>` and resolve by catalogue game ID. Once resolved, pass the resulting Indie profile's own ID into profile-layout selectors, and use its linked catalogue ID for game-content APIs. Preserve guarded legacy aliases and reconciliation when changing that data path.