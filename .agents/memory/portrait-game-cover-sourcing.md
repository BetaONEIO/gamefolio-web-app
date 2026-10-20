---
name: Portrait game cover sourcing
description: Separate official portrait artwork from catalogue backgrounds and keep cover lookups non-blocking.
---

Treat a catalogue provider's background image as backdrop content, not as a portrait game cover. Resolve official box art by exact game identity and display only verified portrait artwork in selection cards; when it is unavailable, use a neutral branded placeholder rather than stretching or blurring a landscape image.

**Why:** RAWG's background images are often gameplay screenshots, and older saved games retain them. Reusing those images in portrait cards produced awkward letterboxing and misleading thumbnails. Twitch cover outages must not prevent users from finding or selecting games.

**How to apply:** When building game-selection or catalogue thumbnail UI, keep the existing persisted game image separate from its portrait-cover presentation field. Bound and coalesce external cover lookups, preserve last-known-good covers on transient failures, and let the catalogue return without waiting indefinitely for artwork.