// One authenticated view per visitor, profile, and UK calendar day.
//
// GET /api/users/:username used to insert that row and, on any rejection,
// emit "Profile visit tracking failed" without the database error. Production
// hit that warning because:
// - migrations/0032_add_profile_visits.sql is applied out of band, and startup
//   does not create the table, so the insert fails until the relation exists.
// - The synthetic demo account (getDemoUser, id 999) is not a users row, so
//   the visitor foreign key rejects every profile that account opens.
//
// Same-day repeats are already unique. A unique violation means the visit was
// recorded. A foreign-key violation means the visitor or profile is gone.

export const SYNTHETIC_PROFILE_VISITOR_ID = 999;

export const PROFILE_VISITS_DDL = [
  `CREATE TABLE IF NOT EXISTS "profile_visits" (
  "id" serial PRIMARY KEY,
  "profile_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "visitor_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "visit_day" text NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "profile_visits_profile_visitor_day_unique"
  ON "profile_visits" ("profile_id", "visitor_id", "visit_day")`,
  `CREATE INDEX IF NOT EXISTS "profile_visits_profile_created_idx"
  ON "profile_visits" ("profile_id", "created_at")`,
] as const;

const UK_VISIT_DAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/London",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const MISSING_PROFILE_VISITS =
  /relation "(?:[\w]+\.)?profile_visits" does not exist/i;

const ALREADY_RECORDED = "23505";
const NOT_A_USER = "23503";
const ERROR_REPORT_INTERVAL_MS = 5 * 60 * 1000;

let schemaReady: Promise<void> | null = null;
let schemaBlockedUntil = 0;
let missingSchemaReported = false;
let nextUnexpectedReportAt = 0;

type ErrorLike = { message?: unknown; cause?: unknown; code?: unknown };

export type ProfileVisit = {
  profileId: number;
  visitorId: number;
  visitDay: string;
};

export type ProfileVisitFailure =
  | { kind: "missing-schema"; error: unknown }
  | { kind: "unexpected"; error: unknown; code: string | null };

export type ProfileVisitDeps = {
  clock?: Date;
  ddl: (statement: string) => Promise<unknown>;
  insert: (visit: ProfileVisit) => Promise<unknown>;
  onFailure: (failure: ProfileVisitFailure) => void;
};

export function resetProfileVisitTrackingForTests(): void {
  schemaReady = null;
  schemaBlockedUntil = 0;
  missingSchemaReported = false;
  nextUnexpectedReportAt = 0;
}

export function normalizeUserId(value: unknown): number | null {
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) return value;
  if (typeof value === "string" && /^[1-9]\d*$/.test(value)) {
    const parsed = Number(value);
    if (Number.isSafeInteger(parsed)) return parsed;
  }
  return null;
}

export function shouldRecordProfileVisit(profileId: unknown, visitorId: unknown): boolean {
  const profile = normalizeUserId(profileId);
  const visitor = normalizeUserId(visitorId);
  if (profile == null || visitor == null || profile === visitor) return false;
  return visitor !== SYNTHETIC_PROFILE_VISITOR_ID;
}

export function profileVisitDay(now = new Date()): string {
  const formatted = UK_VISIT_DAY.format(now);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(formatted)) {
    throw new Error("Could not format the UK profile visit day");
  }
  return formatted;
}

function walkErrors(err: unknown, visit: (value: ErrorLike) => boolean): boolean {
  const seen = new Set<unknown>();
  let current: unknown = err;
  while (current != null && !seen.has(current)) {
    if (typeof current === "string") return visit({ message: current });
    if (typeof current !== "object") return false;
    seen.add(current);
    const record = current as ErrorLike;
    if (visit(record)) return true;
    current = record.cause;
  }
  return false;
}

export function postgresErrorCode(err: unknown): string | null {
  let code: string | null = null;
  walkErrors(err, (value) => {
    if (typeof value.code === "string" && /^[0-9A-Z]{5}$/.test(value.code)) {
      code = value.code;
      return true;
    }
    return false;
  });
  return code;
}

export function isMissingProfileVisitsError(err: unknown): boolean {
  return walkErrors(
    err,
    (value) => typeof value.message === "string" && MISSING_PROFILE_VISITS.test(value.message),
  );
}

function ensureProfileVisits(
  ddl: (statement: string) => Promise<unknown>,
  now: number,
): Promise<void> | "unavailable" {
  if (schemaReady) return schemaReady;
  if (now < schemaBlockedUntil) return "unavailable";

  const pending = (async () => {
    for (const statement of PROFILE_VISITS_DDL) await ddl(statement);
  })().catch((error) => {
    if (schemaReady === pending) schemaReady = null;
    schemaBlockedUntil = now + ERROR_REPORT_INTERVAL_MS;
    throw error;
  });
  schemaReady = pending;
  return pending;
}

function classifyProfileVisitFailure(error: unknown, now: number): ProfileVisitFailure | null {
  const code = postgresErrorCode(error);
  if (code === ALREADY_RECORDED || code === NOT_A_USER) return null;
  if (isMissingProfileVisitsError(error)) {
    schemaReady = null;
    if (missingSchemaReported) return null;
    missingSchemaReported = true;
    return { kind: "missing-schema", error };
  }
  if (now < nextUnexpectedReportAt) return null;
  nextUnexpectedReportAt = now + ERROR_REPORT_INTERVAL_MS;
  return { kind: "unexpected", error, code };
}

export async function trackProfileVisit(
  profileId: unknown,
  visitorId: unknown,
  deps: ProfileVisitDeps,
): Promise<"recorded" | "skipped" | "failed"> {
  const profile = normalizeUserId(profileId);
  const visitor = normalizeUserId(visitorId);
  if (!shouldRecordProfileVisit(profile, visitor)) return "skipped";

  const now = deps.clock ?? new Date();
  try {
    const ready = ensureProfileVisits(deps.ddl, now.getTime());
    if (ready === "unavailable") return "failed";
    await ready;
    await deps.insert({
      profileId: profile as number,
      visitorId: visitor as number,
      visitDay: profileVisitDay(now),
    });
    return "recorded";
  } catch (error) {
    if (postgresErrorCode(error) === ALREADY_RECORDED) return "recorded";
    const failure = classifyProfileVisitFailure(error, now.getTime());
    if (failure) deps.onFailure(failure);
    return "failed";
  }
}
