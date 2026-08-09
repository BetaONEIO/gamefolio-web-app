---
name: Ranked league threshold seeding
description: How configurable season league thresholds are initialized without overriding admin changes.
---

Ranked league thresholds must be seeded additively during startup: insert only missing XP-setting keys, then load all existing database values into the in-memory configuration.

**Why:** Existing environments may already contain administrator-customized XP values; replacing or reseeding all rows on startup would silently undo those decisions.

**How to apply:** When adding new configurable progression settings, keep code defaults as fallback values, upsert only absent keys, and expose the live configuration to every UI that displays league status.