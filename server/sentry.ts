// Server-side Sentry error reporting for the Express API.
//
// Until now the server had no Sentry integration at all — every route
// catches its own errors and responds with a bare `res.status(500)`, so a
// production 500 left zero trace anywhere except Replit's console logs
// (which aren't queryable after the fact). This mirrors client/src/lib/
// sentry.ts's no-op-when-unset pattern and reuses the same DSN (it's a
// public identifier, safe to share — see client/src/lib/sentry.ts) so
// server events land in the same Sentry project, distinguished by the
// `runtime: server` tag below and Sentry's own platform detection.
import * as Sentry from "@sentry/node";

let initialized = false;

export function initServerSentry(): void {
  const dsn = (process.env.SENTRY_DSN || process.env.VITE_SENTRY_DSN)?.trim();
  if (!dsn) return;

  const environment =
    process.env.SENTRY_ENVIRONMENT?.trim() ||
    (process.env.NODE_ENV === "production" ? "production" : "development");

  // Only production reports. Dev workspaces and the beta Replit project share
  // this DSN (see .env.beta), and they share the org's single monthly error
  // quota with it — on 2026-08-22 a dev workspace running post-migration code
  // against a DB missing migration 0020 threw `column clips.status does not
  // exist` on five feed endpoints, burned ~2,100 events in 16 hours, exhausted
  // the quota, and left production with no error reporting at all for the next
  // ten days. A broken dev box must not be able to blind production. Set
  // SENTRY_ALLOW_NON_PRODUCTION=true to opt a non-prod environment back in
  // deliberately (and give it its own DSN/project if you do).
  if (
    environment !== "production" &&
    process.env.SENTRY_ALLOW_NON_PRODUCTION?.trim() !== "true"
  ) {
    return;
  }

  Sentry.init({
    dsn,
    environment,
    // Error-capture focus, not perf monitoring — same tradeoff as the client.
    tracesSampleRate: 0,
    initialScope: { tags: { runtime: "server" } },
  });
  initialized = true;

  // Safety net for anything that isn't caught by a route's own try/catch —
  // most route handlers already catch locally (see captureRouteError below
  // for those), so this mainly covers background jobs, timers, and truly
  // unhandled cases.
  process.on("unhandledRejection", (reason) => {
    Sentry.captureException(reason);
  });
  process.on("uncaughtException", (err) => {
    Sentry.captureException(err);
  });
}

// Call from a route's catch block to report an error Sentry would otherwise
// never see (the block already responds with its own res.status(500), so it
// never reaches Express's error-handling middleware). Safe to call even when
// Sentry is disabled — it's a no-op.
export function captureRouteError(
  err: unknown,
  context?: Record<string, string>,
): void {
  if (!initialized) return;
  Sentry.captureException(err, context ? { tags: context } : undefined);
}

export function captureRouteMessage(
  message: string,
  context?: Record<string, string>,
): void {
  if (!initialized) return;
  Sentry.addBreadcrumb({
    category: "upload",
    message,
    level: "info",
    ...(context ? { data: context } : {}),
  });
}

// Rate-limit warning events to protect the shared error quota during an incident.
const slowAlerts = new Map<string, number>();
let slowHour = { expires: 0, count: 0 };
let slowDay = { expires: 0, count: 0 };
export function reportSlowRequest(event: import('./performance').PerformanceEvent): void {
  if (!initialized) return;
  // Long uploads/streams are expected; reserve warning quota for interactive paths.
  const interactiveRoutes = ['/api/user', '/api/auth/google', '/api/user/:userId/daily-activity',
    '/api/users/:username/clips', '/api/social-preview/:username'];
  if (!interactiveRoutes.includes(event.route)) return;
  const key = `${event.method} ${event.route}`;
  const now = Date.now();
  for (const [route, expires] of Array.from(slowAlerts)) if (expires <= now) slowAlerts.delete(route);
  if (slowHour.expires <= now) slowHour = { expires: now + 3600000, count: 0 };
  if (slowDay.expires <= now) slowDay = { expires: now + 86400000, count: 0 };
  if (slowAlerts.has(key) || slowHour.count >= 4 || slowDay.count >= 20) return;
  slowHour.count++;
  slowDay.count++;
  slowAlerts.set(key, now + 15 * 60 * 1000);
  Sentry.captureMessage('Slow API request', {
    level: 'warning', fingerprint: ['slow-api-request', key],
    tags: { runtime: 'server', performance_issue: 'slow_api', route: event.route, method: event.method, request_id: event.requestId },
    extra: { requestId: event.requestId, runtimeId: event.runtimeId, observedAt: event.observedAt, durationMs: event.durationMs,
      status: event.status, stages: event.stages, processWindow: event.processWindow },
  });
}
