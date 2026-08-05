---
name: Leaderboard podium scaling
description: Vertical transforms on the scaled #1 card can amplify its perceived lift; tune position after applying scale.
---

When adjusting the leaderboard podium, treat the #1 card’s scale and vertical translation as a combined visual value. A modest translate can still make the card look substantially higher once the card is enlarged, so verify the rendered top and bottom edges together rather than relying on transform values alone.

**Why:** The podium uses nested group and per-card transforms, so changes to scale alter the apparent vertical elevation.

**How to apply:** Preview the desktop hero after every podium scale change and keep the #1 lift subtle relative to the side-card baselines.

The XP bar chart uses a fixed-height bar area with `items-end` inside each column, while the columns themselves use `items-start`. This keeps every bar on one baseline even when top-three columns include different medal/pedestal content below the bar.

**Why:** Aligning entire columns with `items-end` made the bronze, silver, and gold bars sit at a different baseline from the white/green bars because their content below the bar has different heights.

**How to apply:** Preserve the fixed bar-area wrapper when changing podium banners, avatars, labels, or bar decorations.