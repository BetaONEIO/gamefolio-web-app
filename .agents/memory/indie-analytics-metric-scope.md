---
name: Indie analytics metric scope
description: Which Indie analytics metrics can truthfully follow the selected date range.
---

Page views, unique visitors, and store clicks come from timestamped first-party events and may use 7/30/90-day or all-time ranges. Existing clip, reel, and screenshot view counters are cumulative and must be presented as all-time current totals.

**Why:** The content tables hold only a current view count, not a dated view-event history. Filtering content rows by creation date would not reveal when their views occurred and would mislabel lifetime views as period performance.

**How to apply:** Keep content counts, rankings, and view totals game-scoped through the exact catalogue game ID, label them as all-time, and omit period comparisons until dated content-view events exist.