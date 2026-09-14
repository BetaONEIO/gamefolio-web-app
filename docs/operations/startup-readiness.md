# Startup readiness

The 14 September rollout started a production process at 10:00:03 UTC that did not open port 5000 within Replit's one-minute deadline. Its automatic retry began at 10:01:09 and served successful requests by 10:01:51. Initial requests received 500/502 responses. This does not establish the cause of earlier incidents.

`server/bootstrap.ts` now opens the HTTP listener before importing application modules. The production build uses ESM splitting so external application dependencies cannot be hoisted into the bootstrap. All output JavaScript chunks in `dist` must be deployed together. `npm run dev` uses the same bootstrap.

During initialization `/api/health/live` returns 200 to indicate a running process. `/api/health/ready` and all ordinary routes return 503 with `Retry-After: 5` and `Cache-Control: no-store`. Readiness changes to 200 only after route registration, existing startup prerequisites and frontend setup complete. No partially configured Express routes handle ordinary requests. Initialization failures or a 120-second deadline terminate the process rather than leave a permanently starting instance.

Existing WebSocket services attach to the same server; production port/host and graceful shutdown remain unchanged. Startup logs record listener availability, application imports, route setup, XP settings, special-account checks and final readiness. Existing schema initialization and scheduled work are not removed by this change.

Use `/api/health/ready` for application readiness, and `/api/health/live` only for process liveness. Do not configure a traffic-promotion check to use liveness. The Replit deployment still probes `/`, which remains 503 until ready. Binding early does not guarantee uninterrupted deployment on a single reserved VM, or reduce database initialization time. Verify platform behavior and startup logs before any claim of zero downtime.

Validation: `npm run test:startup` uses real loopback HTTP requests to test delayed initialization, failure and late completion after a deadline. Run the production build plus development smoke checks before promotion. No database schema change is introduced. Revert this change and rebuild to restore the previous startup entry point.

Production imports must not load Vite or its plugins. `server/vite.ts` loads the development toolchain inside `setupVite`, leaving logging and static serving available without it. `test:startup` checks the compiled application import graph as well as HTTP readiness. Keep dynamic imports and ESM splitting when changing the build.

## Production startup diagnostics

Production startup records `startup_diagnostics_begin` and `startup_diagnostics` around the application import. Set `STARTUP_DIAGNOSTICS=false` to disable this diagnostic. Collection starts after the HTTP listener is open, uses an in-process inspector session at a 10ms sampling interval (no debugger port), and stops at import completion/failure or a 90-second diagnostic deadline. The existing 120-second application-startup deadline is unchanged. The diagnostic deadline stops sampling, not application initialization. Diagnostic/logging failures fall back to ordinary startup.

The report contains Node version, wall and process CPU time, event-loop active/idle time, memory, page faults, context switches, Linux process read counters and cgroup-v2 CPU counters when available. Missing counters are null. CPU samples are summarized into at most 12 dependency/runtime categories; no raw stack frames, function names, source paths, environment values or request data are emitted. No profile file or public diagnostic endpoint is created. The collector has bounded startup overhead and no ongoing request-time sampling.

Interpretation: process CPU includes worker threads, whereas the inspector profile and event-loop timings cover the main thread. Sample durations are sampled wall-time attribution, not exact function CPU or dependency import durations. Filesystem counters indicate activity/bytes, not disk latency; `rchar` includes cached reads and `read_bytes` reflects storage reads where the OS accounts them. Cgroup CPU counters may cover other processes in the same group and are not proof that this process alone was throttled. Asynchronous work overlaps. Compare all signals before attributing the cold-start delay, and do not add overlapping metrics together.
