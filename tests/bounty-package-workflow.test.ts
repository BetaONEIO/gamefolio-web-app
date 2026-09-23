import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const routes = readFileSync("server/routes/bounty-marketplace.ts", "utf8");
const completionKey = "campaign:${sub.instance_id}:participation:${participantRow?.id ?? sub.participant_id}:creator:${sub.participant_id}:objective:completion:deliverable:all:reward:completion";

test("staging, removal and commit serialize on the participant row", () => {
  assert.match(routes, /Lock participation to serialize staging, removal, and package commits[\s\S]*FOR UPDATE OF cp/);
  assert.match(routes, /SELECT status, deadline FROM campaign_participants[\s\S]*FOR UPDATE/);
  assert.match(routes, /router\.post\('\/my\/:instanceId\/submit-package'/);
  assert.match(routes, /SELECT cp\.id, cp\.user_id, cp\.status, cp\.deadline[\s\S]*FOR UPDATE/);
});

test("only staged plus approved units satisfy package requirements", () => {
  assert.match(routes, /\['staged', 'approved'\]\.includes\(String\(s\.status\)\)/);
  assert.match(routes, /status = 'staged'[\s\S]*RETURNING \*/);
  assert.match(routes, /status = 'submitted_for_review'/);
  assert.match(routes, /\['completed', 'completed_and_verified', 'full_game_awarded', 'expired', 'cancelled', 'submitted_for_review'\]\.includes/);
});

test("package review requests selected changes and approves untouched work atomically", () => {
  assert.match(routes, /AND s\.status = 'under_review' \$\{target\}[\s\S]*RETURNING s\.\*/);
  assert.match(routes, /const changedIds = changed\.map[\s\S]*id NOT IN/);
  assert.match(routes, /SET status = 'approved', objective_state = 'complete'/);
});

test("package and legacy completion use the same durable reward dedupe key", () => {
  assert.ok(routes.includes(completionKey), "legacy completion reward key must remain present");
  assert.match(routes, /rewardKey: `campaign:\$\{instanceId\}:participation:\$\{reward\.participant_id\}:creator:\$\{p\.user_id\}:objective:completion:deliverable:all:reward:completion`/);
  assert.match(routes, /retryCompletion: true/);
});