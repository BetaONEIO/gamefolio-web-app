import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  PROFILE_VISITS_DDL,
  SYNTHETIC_PROFILE_VISITOR_ID,
  isMissingProfileVisitsError,
  postgresErrorCode,
  profileVisitDay,
  resetProfileVisitTrackingForTests,
  shouldRecordProfileVisit,
  trackProfileVisit,
  type ProfileVisit,
  type ProfileVisitFailure,
} from "../server/profile-visit-tracking.ts";

function missingProfileVisitsTable(): Error {
  const err = new Error('Failed query: insert into "profile_visits"');
  err.cause = Object.assign(new Error('relation "profile_visits" does not exist'), { code: "42P01" });
  return err;
}

function pgError(code: string, message: string): Error {
  return Object.assign(new Error(message), { code });
}

test("UK visit day follows the Europe/London calendar", () => {
  assert.equal(profileVisitDay(new Date("2026-01-15T23:30:00.000Z")), "2026-01-15");
  assert.equal(profileVisitDay(new Date("2026-07-15T23:30:00.000Z")), "2026-07-16");
});

test("skips self views and the synthetic demo visitor", () => {
  assert.equal(shouldRecordProfileVisit(12, 12), false);
  assert.equal(shouldRecordProfileVisit("12", 12), false);
  assert.equal(shouldRecordProfileVisit(12, SYNTHETIC_PROFILE_VISITOR_ID), false);
  assert.equal(shouldRecordProfileVisit(12, String(SYNTHETIC_PROFILE_VISITOR_ID)), false);
  assert.equal(shouldRecordProfileVisit(12, undefined), false);
  assert.equal(shouldRecordProfileVisit(12, 0), false);
  assert.equal(shouldRecordProfileVisit(12, 34), true);
  assert.equal(shouldRecordProfileVisit("12", "34"), true);

  const demoUser = readFileSync("server/demo-user.ts", "utf8");
  assert.match(demoUser, new RegExp(`id:\\s*${SYNTHETIC_PROFILE_VISITOR_ID}\\b`));
});

test("schema statements are the profile_visits migration", () => {
  const migration = readFileSync("migrations/0032_add_profile_visits.sql", "utf8").replace(/\s+/g, " ");
  for (const statement of PROFILE_VISITS_DDL) {
    assert.ok(migration.includes(statement.replace(/\s+/g, " ")), statement);
  }
  assert.match(migration, /profile_id/);
  assert.match(migration, /visitor_id/);
  assert.match(migration, /visit_day/);
});

test("records a visit after ensuring the table once", async () => {
  resetProfileVisitTrackingForTests();
  const statements: string[] = [];
  const visits: ProfileVisit[] = [];
  const failures: ProfileVisitFailure[] = [];
  const deps = {
    clock: new Date("2026-10-28T20:25:00.000Z"),
    ddl: async (statement: string) => {
      statements.push(statement);
    },
    insert: async (visit: ProfileVisit) => {
      visits.push(visit);
    },
    onFailure: (failure: ProfileVisitFailure) => failures.push(failure),
  };

  assert.equal(await trackProfileVisit("12", 34, deps), "recorded");
  assert.equal(await trackProfileVisit(12, 34, deps), "recorded");
  assert.deepEqual(statements, [...PROFILE_VISITS_DDL]);
  assert.deepEqual(visits, [
    { profileId: 12, visitorId: 34, visitDay: "2026-10-28" },
    { profileId: 12, visitorId: 34, visitDay: "2026-10-28" },
  ]);
  assert.deepEqual(failures, []);
});

test("shares one schema setup across concurrent visits", async () => {
  resetProfileVisitTrackingForTests();
  let started = 0;
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const deps = {
    ddl: async (statement: string) => {
      if (statement === PROFILE_VISITS_DDL[0]) {
        started += 1;
        await gate;
      }
    },
    insert: async () => {},
    onFailure: () => {
      throw new Error("unexpected failure");
    },
  };

  const first = trackProfileVisit(1, 2, deps);
  const second = trackProfileVisit(3, 4, deps);
  await Promise.resolve();
  assert.equal(started, 1);
  release();
  assert.deepEqual(await Promise.all([first, second]), ["recorded", "recorded"]);
});

test("does not call the database for a demo visitor", async () => {
  resetProfileVisitTrackingForTests();
  let calls = 0;
  const result = await trackProfileVisit(20, SYNTHETIC_PROFILE_VISITOR_ID, {
    ddl: async () => {
      calls += 1;
    },
    insert: async () => {
      calls += 1;
    },
    onFailure: () => {
      calls += 1;
    },
  });
  assert.equal(result, "skipped");
  assert.equal(calls, 0);
});

test("a same-day unique violation is a recorded visit", async () => {
  resetProfileVisitTrackingForTests();
  const failures: ProfileVisitFailure[] = [];
  const result = await trackProfileVisit(8, 9, {
    ddl: async () => {},
    insert: async () => {
      throw pgError("23505", 'duplicate key value violates unique constraint "profile_visits_profile_visitor_day_unique"');
    },
    onFailure: (failure) => failures.push(failure),
  });
  assert.equal(result, "recorded");
  assert.deepEqual(failures, []);
});

test("a visitor who is not a user does not raise a tracking warning", async () => {
  resetProfileVisitTrackingForTests();
  const failures: ProfileVisitFailure[] = [];
  const wrapped = new Error('Failed query: insert into "profile_visits"');
  wrapped.cause = pgError("23503", 'insert or update on table "profile_visits" violates foreign key constraint');
  const result = await trackProfileVisit(8, 9, {
    ddl: async () => {},
    insert: async () => {
      throw wrapped;
    },
    onFailure: (failure) => failures.push(failure),
  });
  assert.equal(result, "failed");
  assert.equal(postgresErrorCode(wrapped), "23503");
  assert.deepEqual(failures, []);
});

test("a missing profile_visits table is reported once and the setup is retried", async () => {
  resetProfileVisitTrackingForTests();
  const failures: ProfileVisitFailure[] = [];
  let setups = 0;
  const deps = {
    ddl: async () => {
      setups += 1;
    },
    insert: async () => {
      throw missingProfileVisitsTable();
    },
    onFailure: (failure: ProfileVisitFailure) => failures.push(failure),
  };

  assert.equal(isMissingProfileVisitsError(missingProfileVisitsTable()), true);
  assert.equal(await trackProfileVisit(8, 9, deps), "failed");
  assert.equal(await trackProfileVisit(8, 10, deps), "failed");
  assert.equal(failures.length, 1);
  assert.equal(failures[0]?.kind, "missing-schema");
  assert.ok(setups > PROFILE_VISITS_DDL.length);
});

test("schema setup failures back off and unexpected errors stay rate limited", async () => {
  resetProfileVisitTrackingForTests();
  const failures: ProfileVisitFailure[] = [];
  let ddlCalls = 0;
  const started = new Date("2026-10-28T12:00:00.000Z");
  const permission = pgError("42501", "permission denied for schema public");
  const deps = {
    clock: started,
    ddl: async () => {
      ddlCalls += 1;
      throw permission;
    },
    insert: async () => {
      throw new Error("insert should not run");
    },
    onFailure: (failure: ProfileVisitFailure) => failures.push(failure),
  };

  assert.equal(await trackProfileVisit(8, 9, deps), "failed");
  assert.equal(await trackProfileVisit(8, 9, { ...deps, clock: new Date(started.getTime() + 60_000) }), "failed");
  assert.equal(ddlCalls, 1);
  assert.equal(failures.length, 1);
  assert.equal(failures[0]?.kind, "unexpected");
  assert.equal(failures[0] && failures[0].kind === "unexpected" ? failures[0].code : null, "42501");

  resetProfileVisitTrackingForTests();
  const unexpected: ProfileVisitFailure[] = [];
  let inserts = 0;
  const queryError = new Error("connection terminated");
  const insertDeps = {
    ddl: async () => {},
    insert: async () => {
      inserts += 1;
      throw queryError;
    },
    onFailure: (failure: ProfileVisitFailure) => unexpected.push(failure),
  };
  const first = new Date("2026-10-28T12:00:00.000Z");
  assert.equal(await trackProfileVisit(8, 9, { ...insertDeps, clock: first }), "failed");
  assert.equal(await trackProfileVisit(8, 9, { ...insertDeps, clock: new Date(first.getTime() + 1_000) }), "failed");
  assert.equal(unexpected.length, 1);
  assert.equal(
    await trackProfileVisit(8, 9, { ...insertDeps, clock: new Date(first.getTime() + 5 * 60 * 1000) }),
    "failed",
  );
  assert.equal(unexpected.length, 2);
  assert.equal(inserts, 3);
});

test("a missing users table is not treated as a profile_visits schema gap", () => {
  const err = new Error("Failed query");
  err.cause = Object.assign(new Error('relation "users" does not exist'), { code: "42P01" });
  assert.equal(isMissingProfileVisitsError(err), false);
  assert.equal(postgresErrorCode(err), "42P01");
});

test("GET /api/users/:username records visits without discarding the database error", () => {
  const source = readFileSync("server/routes.ts", "utf8");
  assert.match(source, /import \{ recordProfileVisit \} from "\.\/record-profile-visit"/);
  const start = source.indexOf('app.get("/api/users/:username"');
  const end = source.indexOf("function escapeSvgText");
  assert.ok(start >= 0 && end > start);
  const handler = source.slice(start, end);
  assert.match(handler, /void recordProfileVisit\(user\.id, requesterId\)/);
  assert.doesNotMatch(handler, /Profile visit tracking failed/);
  assert.doesNotMatch(handler, /profileVisits/);
  assert.doesNotMatch(handler, /captureRouteWarning/);
});
