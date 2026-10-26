import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  activePollFailureResponse,
  isMissingPollRelationError,
  observePollFailure,
  pollDependencyFailureResponse,
  resetPollFailureReports,
  sendActivePollFailure,
} from "../server/poll-query-failure.ts";

function missingPollsTable(): Error {
  const err = new Error('Failed query: select "id" from "polls" where ("polls"."starts_at" <= $1) limit $2');
  err.cause = Object.assign(new Error('relation "polls" does not exist'), { code: "42P01" });
  return err;
}

function response() {
  return {
    statusCode: 0,
    body: undefined as unknown,
    ended: false,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
    end() {
      this.ended = true;
      return this;
    },
  };
}

test("active poll treats a missing polls table as an empty response", () => {
  const err = missingPollsTable();
  assert.equal(isMissingPollRelationError(err), true);
  assert.deepEqual(activePollFailureResponse(err), { status: 204 });

  const res = response();
  sendActivePollFailure(res, err);
  assert.equal(res.statusCode, 204);
  assert.equal(res.ended, true);
  assert.equal(res.body, undefined);
});

test("active poll still returns an error for failures that are not a missing polls table", () => {
  const otherTable = new Error('Failed query: select "id" from "polls"');
  otherTable.cause = Object.assign(new Error('relation "users" does not exist'), { code: "42P01" });
  assert.equal(isMissingPollRelationError(otherTable), false);
  assert.deepEqual(activePollFailureResponse(otherTable), {
    status: 500,
    body: { message: "Unable to load the active poll" },
  });

  const connection = Object.assign(new Error("Failed query: select from polls"), { code: "08006" });
  const res = response();
  sendActivePollFailure(res, connection);
  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, { message: "Unable to load the active poll" });
});

test("missing poll option and vote tables are the same schema gap", () => {
  for (const relation of ["poll_options", "poll_votes"]) {
    const err = new Error("Failed query");
    err.cause = new Error(`relation "${relation}" does not exist`);
    assert.equal(isMissingPollRelationError(err), true);
    assert.equal(pollDependencyFailureResponse(err, "Unable to record your vote").status, 503);
  }
});

test("repeated poll failures report to Sentry once per route inside the cooldown", () => {
  resetPollFailureReports();
  const warnings: string[] = [];
  const errors: unknown[] = [];
  const reporters = {
    warning: (message: string) => warnings.push(message),
    error: (err: unknown) => errors.push(err),
  };
  const missing = missingPollsTable();
  const started = 1_700_000_000_000;
  observePollFailure(missing, "GET /api/polls/active", reporters, started);
  observePollFailure(missing, "GET /api/polls/active", reporters, started + 60_000);
  observePollFailure(missing, "GET /api/polls/active", reporters, started + 24 * 60 * 60 * 1000);
  assert.deepEqual(warnings, ["Polls schema is not applied"]);
  assert.equal(errors.length, 0);
  observePollFailure(missing, "GET /api/admin/polls", reporters, started);
  assert.equal(warnings.length, 2);

  const queryError = new Error("connection terminated");
  observePollFailure(queryError, "GET /api/polls/active", reporters, started);
  observePollFailure(queryError, "GET /api/polls/active", reporters, started + 1_000);
  assert.equal(errors.length, 1);
  observePollFailure(queryError, "POST /api/polls/:pollId/vote", reporters, started);
  assert.equal(errors.length, 2);
});

test("polls schema and migration define the table the active query reads", () => {
  const migration = readFileSync("migrations/0030_add_polls.sql", "utf8");
  assert.match(migration, /CREATE TABLE IF NOT EXISTS polls \(/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS poll_options \(/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS poll_votes \(/);
  for (const column of [
    "title",
    "description",
    "starts_at",
    "ends_at",
    "created_by",
    "created_at",
    "updated_at",
  ]) {
    assert.match(migration, new RegExp(`\\b${column}\\b`));
  }

  const schema = readFileSync("shared/schema.ts", "utf8");
  assert.match(schema, /export const polls = pgTable\("polls"/);
  assert.match(schema, /startsAt: timestamp\("starts_at", \{ withTimezone: true \}\)/);
  assert.match(schema, /endsAt: timestamp\("ends_at", \{ withTimezone: true \}\)/);
  assert.match(schema, /export const pollOptions = pgTable\("poll_options"/);
  assert.match(schema, /export const pollVotes = pgTable\("poll_votes"/);
});

test("GET /api/polls/active reports through the rate-limited poll helper", () => {
  const source = readFileSync("server/routes.ts", "utf8");
  const start = source.indexOf("app.get('/api/polls/active'");
  const end = source.indexOf("app.post('/api/polls/:pollId/vote'");
  assert.ok(start >= 0 && end > start);
  const handler = source.slice(start, end);
  assert.match(handler, /reportPollFailure\(err, "GET \/api\/polls\/active"\)/);
  assert.match(handler, /sendActivePollFailure\(res, err\)/);
  assert.doesNotMatch(handler, /captureRouteError/);
});
