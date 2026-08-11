---
name: Points/XP drift & stale banner overwrites
description: Root causes behind users.total_xp diverging from user_points_history and banners reverting to old images
---
The rule: `users.total_xp` must equal `SUM(user_points_history.points)`; `users.banner_url` must match the active `uploaded_banners` row. When users report wrong levels or reverted banners, check these two invariants first (prod, read-only).

**Why:** Two production incidents (July 2026): (1) the `user_points_history` id sequence fell behind `MAX(id)`, so award inserts failed with duplicate-key errors and totals drifted for 150+ users; (2) client pages PATCH full profile objects including a cached stale `bannerUrl`, silently clobbering a freshly activated uploaded banner.

**How to apply:** `POST /api/admin/repair-user-data` (admin-only) fixes the sequence, re-syncs banners, and recomputes totals+levels — run it in prod after a republish rather than hand-writing SQL. The profile PATCH drops a `bannerUrl` matching an *inactive* uploaded banner; keep that guard if the route is refactored.
