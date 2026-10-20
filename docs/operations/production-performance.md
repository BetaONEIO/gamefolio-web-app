# Production performance changes — September 2026

## What changes

- Profile clips use a joined query and three grouped count queries per 500 clips. A 192-clip profile needs four queries instead of 769. The legacy array response still contains all clips in newest-first order, preserving existing callers and privacy filters; paginated API callers retain limit/offset. This is a query-count improvement, not a measured production latency result.
- Social previews use one clip count query instead of loading/enriching every clip. Banner/avatar downloads have a five-second deadline covering headers and body. A failed image is omitted by the existing fallback. Signing itself and image processing are not covered by that download deadline.
- `/api/user` reads fresh state once when a streak was claimed less than 20 hours ago. Due claims still use the existing atomic reward flow and await completion before rereading updated XP. Background rewards require durable retries/idempotency and are deliberately not introduced here. Due claims can still be slow.
- API requests get a generated `X-Request-ID`. Structured logs capture all responses over two seconds, all server errors, aborted responses, and a 1% baseline sample. A ten-second watchdog records still-running requests and active stages. No raw URLs, user identifiers, credentials, SQL parameters or request/response bodies are added to these records.
- Stage timings cover session loading, Passport deserialization, bearer lookup, current-user reads, streak processing, activity histories/milestones, profile queries and media signing/downloads. Database operation time includes connection acquisition; it does not separately prove pool wait versus query execution. Grouped parallel operations can overlap in duration.
- Production emits event-loop utilization, p99/max delay and memory measurements every minute. `/api/health/live` is a lightweight process-liveness endpoint, independent of sessions/database; it must not be mistaken for full application readiness.
- Interactive requests completing in five seconds or more, or still running at ten seconds, report Sentry warnings tagged `performance_issue=slow_api`. Warnings cover account, Google auth, daily activity, profile clips and social preview paths, not expected long uploads. Per process, limits are one per route per 15 minutes, four per hour, and 20 per day; restart resets these counters. Structured logs remain available when the warning budget is exhausted.

## External monitoring configured

Verified the existing [Sentry uptime monitor](https://betaoneio.sentry.io/monitors/1445636/): homepage GET every minute, ten-second timeout, incident after three failed checks, recovery after one success. It does not execute browser JavaScript or test authenticated API calls.

Created [Gamefolio downtime and recovery](https://betaoneio.sentry.io/monitors/alerts/823242/), connected to that monitor, notifying the existing tomwattsuk member by email on new, regressed, escalated or resolved incidents.

Created [slow-request alert](https://betaoneio.sentry.io/monitors/alerts/823258/) (Sentry-generated name: Notify tomwattsuk), scoped to gamefolio-mobile, production, and `performance_issue` containing `slow_api`. Captured events trigger notifications with a 60-minute throttle per issue. This rule needs the new server instrumentation deployed before it can receive its matching events. No test email or artificial production error was sent.

## Validation and rollout

Base: `1eb4b7348f7e346bebb044b999088bf85b855046`, matched GitHub main and Replit workspace on inspection. Replit metadata did not expose the currently deployed commit; production source equivalence remains unverified.

Run `npm run test:production-performance` for query-generation/row-mapping, no-truncation, pagination, streak boundary/impersonation and concurrent request-timing regression tests. No production database is used by these tests.

Before production deployment, verify the deployed revision and test against a non-production database: a large public profile and owner/private-profile access; Google login and session restore; recent/due/first streak claims; daily activity; social preview with absent or slow media. Check logs show request IDs and named stages without sensitive values. Do not point a local development startup at production: application startup includes database writes.

After deployment, compare interactive response durations and database-stage times under normal traffic. Verify live endpoint, homepage and a database-backed API independently. Confirm real warnings reach the alert rule. Keep the deployment rollback available. No schema or data migration is required; reverting this code restores previous behavior. Reverting code stops slow-request telemetry; existing external uptime monitoring continues.

Known limit: the repository-wide TypeScript check already fails on the baseline. The baseline comparison for this change has the same 542 diagnostics, with no new diagnostic messages after normalizing paths and line numbers. The production build and focused regression tests pass. This is not a clean whole-repository typecheck or a production load test.


## Investigating intermittent stalls

Every emitted request record now includes `requestId`, a UTC `observedAt`, and a per-process `runtimeId`. Match `X-Request-ID` from the response to the log and Sentry `request_id` tag. The header is exposed through CORS. Match `runtimeId` and time to periodic `runtime_performance` events; then compare the interval with uptime incidents. IDs are generated on the server, not accepted from the client. Existing Sentry warning rate limits remain in place.

Additional stages distinguish JSON/form body parsing, session-store get/set/touch/destroy (including response-time persistence), Passport user lookup, impersonation, bearer authentication, and optional authentication on `/api/user`. Existing named database and media sign/download stages remain available. This is targeted instrumentation, not a trace of every database query or outbound request. No session IDs, tokens, SQL, URLs or payloads are recorded by these wrappers.

`durationMs` aggregates completed calls and can overlap other stages. `activeMs` is elapsed time since the stage's current continuously-active interval began; for overlapping calls it is not a sum or an individual-call duration. The ten-second watchdog can therefore show which operations are still pending. Timed middleware closes on early responses and forwards rejected promises to Express error handling.

`processWindow` measures CPU and event-loop activity across the request interval. These counters include concurrent requests and background work; they must not be attributed solely to that request. High active time with little CPU can indicate synchronous waiting; high CPU can indicate computation. Neither establishes the exact cause without stage timings and corroborating evidence. Database operation timings still include pool acquisition and execution together.

For a five-second stall, inspect the named stages first. A large `session.store.get` or `.set` points to session persistence; `db.auth.session_lookup` points to the application user lookup; `media.*` points to signing/download work. If named stages are short, use process-window activity and request timestamps to narrow the remaining gap before adding more instrumentation. Do not infer a hosting fault solely from one timeout or missing logs.
