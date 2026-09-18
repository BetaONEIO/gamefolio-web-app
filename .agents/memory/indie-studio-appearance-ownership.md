---
name: Indie studio appearance ownership
description: Route and editor ownership for public Indie Developer studio identities.
---

Indie Developer studio identity pages use the shared Profile & Appearance settings. Avatar, banner, bio, colors, backgrounds, fonts, and related appearance choices should affect `/profile/:username`.

`/developer/:handle` remains a separate legacy game-oriented route and must not be consolidated into the studio identity page.

**Why:** The product deliberately separates user/studio identity from legacy developer and individual game routes, while giving Indie Developers one familiar profile editor.

**How to apply:** Add studio identity customization to Profile & Appearance and render it on the Indie Developer branch of `/profile/:username`. Keep `/developer/:handle`, `/games/:gameSlug`, and management routes behaviorally distinct.