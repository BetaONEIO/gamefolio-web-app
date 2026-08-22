---
name: Phone video alpha masking
description: Guidance for creating transparent video assets from flattened phone recordings with black backgrounds.
---

When a phone recording has a black background and a dark device frame, do not use a global luminance or chroma key to create transparency. Use a conservative, feathered silhouette mask based on the stable device boundary, then encode WebM/VP9 with an alpha channel and retain the original MP4 as a source fallback.

**Why:** Keying all dark pixels also removes the physical phone edge, shadows, and dark screen UI, producing a broken result on light or coloured backgrounds.

**How to apply:** Verify the alpha asset on contrasting light, navy, and green backdrops before replacing a hero video. For WebM/VP9, use an alpha-capable pixel format, disable alternate reference frames, and set the video alpha metadata flag for browser playback.