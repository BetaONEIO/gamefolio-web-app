---
name: Leaderboard podium scaling
description: Vertical transforms on the scaled #1 card can amplify its perceived lift; tune position after applying scale.
---

When adjusting the leaderboard podium, treat the #1 card’s scale and vertical translation as a combined visual value. A modest translate can still make the card look substantially higher once the card is enlarged, so verify the rendered top and bottom edges together rather than relying on transform values alone.

**Why:** The podium uses nested group and per-card transforms, so changes to scale alter the apparent vertical elevation.

**How to apply:** Preview the desktop hero after every podium scale change and keep the #1 lift subtle relative to the side-card baselines.