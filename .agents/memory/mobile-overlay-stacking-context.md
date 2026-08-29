---
name: Fullscreen mobile overlay stacking context
description: Why a high z-index fullscreen overlay can still render underneath the app's sticky Header, and how to fix it.
---

Fullscreen mobile overlays (e.g. media viewers) rendered inline inside a page component can end up visually underneath the app's sticky `Header`, even when the overlay uses a very high `z-index` like `z-[9999]`.

**Why:** many pages wrap their whole return in a container that sets `position: relative` together with an explicit `zIndex` (commonly done for themed backgrounds). That wrapper creates its own CSS stacking context, which traps every descendant's z-index inside it — no matter how high. The sticky `Header` lives outside that wrapper (in the app shell) with its own much lower z-index, but since it's compared at a higher/sibling stacking level, it still paints on top of everything nested inside the page's local stacking context.

**How to apply:** when a fullscreen/overlay component is mounted inline within page JSX and needs to guarantee it renders above the app shell (header, nav, etc.), render it via `createPortal(..., document.body)` instead of relying on z-index alone. This fully escapes any ancestor stacking context created by page-level wrapper styling. Apply this to any new fullscreen mobile viewer/overlay component, not just z-index tuning.
