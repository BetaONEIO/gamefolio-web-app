// Homepage polls are optional. Production once served the polls queries
// before migrations/0030_add_polls.sql had created the tables, and the
// homepage refetch turned every missing-relation error into a Sentry event.
// These helpers keep that failure (and later query failures) from repeating.

const MISSING_POLL_RELATION =
  /relation "(?:[\w]+\.)?(polls|poll_options|poll_votes)" does not exist/i;

const ERROR_REPORT_INTERVAL_MS = 5 * 60 * 1000;
const reportedMissingRoutes = new Set<string>();
const nextErrorReportAt = new Map<string, number>();

type ErrorLike = { message?: unknown; cause?: unknown };

function missingPollRelationMessage(value: unknown): boolean {
  return typeof value === "string" && MISSING_POLL_RELATION.test(value);
}

export function isMissingPollRelationError(err: unknown): boolean {
  const seen = new Set<unknown>();
  let current: unknown = err;
  while (current != null && !seen.has(current)) {
    if (typeof current === "string") return missingPollRelationMessage(current);
    if (typeof current !== "object") return false;
    seen.add(current);
    const record = current as ErrorLike;
    if (missingPollRelationMessage(record.message)) return true;
    current = record.cause;
  }
  return false;
}

export type PollFailureReport = "warning" | "error";

export type PollFailureReporters = {
  warning: (message: string, context: Record<string, string>) => void;
  error: (err: unknown, context: Record<string, string>) => void;
};

// A missing polls table is a deploy/migration gap, so each route reports it
// once per process. Other query failures stay visible, but a homepage refetch
// cannot open a new Sentry event more than once every five minutes.
export function pollFailureReport(
  err: unknown,
  route: string,
  now = Date.now(),
): PollFailureReport | null {
  if (isMissingPollRelationError(err)) {
    if (reportedMissingRoutes.has(route)) return null;
    reportedMissingRoutes.add(route);
    return "warning";
  }
  if (now < (nextErrorReportAt.get(route) ?? 0)) return null;
  nextErrorReportAt.set(route, now + ERROR_REPORT_INTERVAL_MS);
  return "error";
}

export function resetPollFailureReports(): void {
  reportedMissingRoutes.clear();
  nextErrorReportAt.clear();
}

export function observePollFailure(
  err: unknown,
  route: string,
  reporters: PollFailureReporters,
  now = Date.now(),
): void {
  const report = pollFailureReport(err, route, now);
  if (isMissingPollRelationError(err)) {
    if (report !== "warning") return;
    console.warn(`Polls schema is unavailable for ${route}`);
    reporters.warning("Polls schema is not applied", { route });
    return;
  }
  console.error(`Poll query failed for ${route}:`, err);
  if (report === "error") reporters.error(err, { route });
}

export type ActivePollFailure =
  | { status: 204 }
  | { status: 500; body: { message: string } };

export function activePollFailureResponse(err: unknown): ActivePollFailure {
  if (isMissingPollRelationError(err)) return { status: 204 };
  return { status: 500, body: { message: "Unable to load the active poll" } };
}

export type PollDependencyFailure = {
  status: 503 | 500;
  body: { message: string };
};

export function pollDependencyFailureResponse(err: unknown, fallbackMessage: string): PollDependencyFailure {
  if (isMissingPollRelationError(err)) {
    return { status: 503, body: { message: "Polls are temporarily unavailable" } };
  }
  return { status: 500, body: { message: fallbackMessage } };
}

type PollResponder = {
  status(code: number): { json(body: unknown): unknown; end(): unknown };
};

export function sendActivePollFailure(res: PollResponder, err: unknown): void {
  const failure = activePollFailureResponse(err);
  if (failure.status === 204) {
    res.status(204).end();
    return;
  }
  res.status(failure.status).json(failure.body);
}

export function sendPollDependencyFailure(res: PollResponder, err: unknown, fallbackMessage: string): void {
  const failure = pollDependencyFailureResponse(err, fallbackMessage);
  res.status(failure.status).json(failure.body);
}
