# Startup readiness

The 14 September rollout started a production process at 10:00:03 UTC that did not open port 5000 within Replit's one-minute deadline. Its automatic retry began at 10:01:09 and served successful requests by 10:01:51. Initial requests received 500/502 responses. This does not establish the cause of earlier incidents.

`server/bootstrap.ts` now opens the HTTP listener before importing application modules. The production build uses ESM splitting so external application dependencies cannot be hoisted into the bootstrap. All output JavaScript chunks in `dist` must be deployed together. `npm run dev` uses the same bootstrap.

During initialization `/api/health/live` returns 200 to indicate a running process. `/api/health/ready` and all ordinary routes return 503 with `Retry-After: 5` and `Cache-Control: no-store`. Readiness changes to 200 only after route registration, existing startup prerequisites and frontend setup complete. No partially configured Express routes handle ordinary requests. Initialization failures or a 120-second deadline terminate the process rather than leave a permanently starting instance.

Existing WebSocket services attach to the same server; production port/host and graceful shutdown remain unchanged. Startup logs record listener availability, application imports, route setup, XP settings, special-account checks and final readiness. Existing schema initialization and scheduled work are not removed by this change.

Use `/api/health/ready` for application readiness, and `/api/health/live` only for process liveness. Do not configure a traffic-promotion check to use liveness. The Replit deployment still probes `/`, which remains 503 until ready. Binding early does not guarantee uninterrupted deployment on a single reserved VM, or reduce database initialization time. Verify platform behavior and startup logs before any claim of zero downtime.

Validation: `npm run test:startup` uses real loopback HTTP requests to test delayed initialization, failure and late completion after a deadline. Run the production build plus development smoke checks before promotion. No database schema change is introduced. Revert this change and rebuild to restore the previous startup entry point.

Production imports must not load Vite or its plugins. `server/vite.ts` loads the development toolchain inside `setupVite`, leaving logging and static serving available without it. `test:startup` checks the compiled application import graph as well as HTTP readiness. Keep dynamic imports and ESM splitting when changing the build.
