---
name: Supabase session-pool budget
description: Why independent database clients must share a small combined connection budget
---

Supabase's session-mode pooler reported a 15-client cap. General queries, the HTTP session store, Stripe synchronization, and startup migrations each create independent pools, so adjusting only one pool is insufficient. Budget their combined maximum for both preview and published instances, leaving at least one slot for maintenance access. Let requests queue inside the pools rather than opening connections beyond the cap.

**Why:** Bursty page loads exhausted the session pool and even session loading failed, causing many unrelated endpoints to return 500.

**How to apply:** Account for every newly introduced database client or worker in the shared budget. `pg_stat_activity` rows named Supavisor reflect backend activity and are not an accurate count of the app's session-mode client slots.