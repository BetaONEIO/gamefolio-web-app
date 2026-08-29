---
name: Publish schema diff safety
description: How to handle Replit publish warnings caused by development and production schema drift.
---

When Replit Publish proposes dropping production tables, first compare development and production table metadata. A table missing only from development can be interpreted as a production deletion even when the app still depends on it.

**Why:** The publish diff is computed from development schema state. Missing development-side compatibility tables produced destructive warnings for active and legacy production tables.

**How to apply:** Restore active tables from the schema source of truth in development, and preserve externally managed or legacy production tables as matching development compatibility tables when they should not be removed. Re-run the schema diff and publish only when there are no table drops, truncations, or data-loss warnings.