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

  Sentry.init({
    dsn,
    environment:
      process.env.SENTRY_ENVIRONMENT?.trim() ||
      (process.env.NODE_ENV === "production" ? "production" : "development"),
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
