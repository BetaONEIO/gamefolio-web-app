import { captureRouteError, captureRouteWarning } from "./sentry";
import { observePollFailure } from "./poll-query-failure";

export function reportPollFailure(err: unknown, route: string): void {
  observePollFailure(err, route, {
    warning: captureRouteWarning,
    error: (error, context) => captureRouteError(error, context),
  });
}
