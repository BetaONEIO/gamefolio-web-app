import { sql } from "drizzle-orm";
import { profileVisits } from "@shared/schema";
import { db } from "./db";
import { captureRouteWarning } from "./sentry";
import { trackProfileVisit, type ProfileVisitFailure } from "./profile-visit-tracking";

function reportProfileVisitFailure(failure: ProfileVisitFailure): void {
  if (failure.kind === "missing-schema") {
    console.warn("Profile visits schema is unavailable");
    captureRouteWarning("Profile visits schema is not applied", {
      context: "profile-visit-tracking",
    });
    return;
  }
  console.error("Profile visit tracking failed:", failure.error);
  captureRouteWarning("Profile visit tracking failed", {
    context: "profile-visit-tracking",
    pg_code: failure.code ?? "unknown",
  });
}

// Fire-and-forget. Profile responses do not wait on analytics, and a tracking
// failure must not turn into a 500 for the profile page.
export function recordProfileVisit(profileId: unknown, visitorId: unknown): void {
  void trackProfileVisit(profileId, visitorId, {
    ddl: (statement) => db.execute(sql.raw(statement)),
    insert: (visit) => db.insert(profileVisits).values(visit).onConflictDoNothing(),
    onFailure: reportProfileVisitFailure,
  }).catch((error) => {
    console.error("Profile visit tracking failed:", error);
  });
}
