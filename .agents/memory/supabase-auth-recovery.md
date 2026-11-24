---
name: Supabase auth recovery
description: Recovery constraints when the app's external Supabase PostgreSQL credentials are rejected
---

When PostgreSQL returns `28P01` for the external Supabase connection, refresh or reconnect the workspace-managed database credentials before troubleshooting ports or restarting repeatedly. Repeated bad logins can trigger Supabase's authentication circuit breaker.

**Why:** This app performs database setup before its HTTP listener starts, so invalid credentials prevent port 5000 from opening. Running Vite alone only renders a partial shell; API requests and database-backed features do not work.

**How to apply:** Confirm the failure with at most one fresh connection probe. Do not switch to another database, disable authentication, or ask for credentials in chat. Have the user update the managed Supabase connection securely, then restore the full-stack workflow and verify database-backed endpoints.