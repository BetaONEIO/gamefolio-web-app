---
name: HomeCarousel.tsx is dead code
description: HomeCarousel.tsx is never imported or used — LatestContentSlider.tsx is the real home slider component
---

## Rule
`client/src/components/home/HomeCarousel.tsx` defines a `HomeCarousel` component that is **never imported anywhere** in the codebase.

The actual home-page hero slider that the user sees is:
- **`client/src/components/home/LatestContentSlider.tsx`** — the "latestContent" slide rendered by `HomePageSimple.tsx`.

HomePageSimple.tsx is the real homepage (lazy-loaded as `HomePage` at the `/` route in App.tsx). It has its own built-in hero carousel (slide types: `latestContent`, `leaderboard`, DB slides).

**Why:** Edits to HomeCarousel.tsx have zero visible effect. Always grep for component usage before editing UI files to avoid working on dead code.

**How to apply:** When asked to edit the "homepage slider" or "hero carousel", open HomePageSimple.tsx and LatestContentSlider.tsx, not HomeCarousel.tsx.
