---
name: Async signed-media selection
description: Stable selection rules for mixed private signed media and already-available public media.
---

Store the selected media item's stable identity rather than its current array index when a gallery mixes asynchronously signed private URLs with immediately available public URLs.

**Why:** Private items can be absent until signing finishes, then appear before an already-selected public item. An index-only lightbox silently switches to a different image when that insertion occurs.

**How to apply:** Derive the active item and ordinal from its stable ID on each render, and have previous/next navigation re-find that ID in the current ordered list.