---
name: Developer renewal timestamps
description: Developer subscription renewals must tolerate invalid persisted timestamp values from the database driver.
---

Subscription lifecycle code must validate persisted Developer subscription dates before passing them back through Drizzle; a truthy invalid `Date` can make a renewal fail while leaving access stale.

**Why:** The development Supabase/Postgres stack surfaced non-null timestamp columns as invalid `Date` objects during a renewal fixture, and Drizzle rejected the write.

**How to apply:** Treat invalid start or end dates as recoverable data and use a fresh valid lifecycle date during Developer activation or renewal.