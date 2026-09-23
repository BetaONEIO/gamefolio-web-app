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

test("joining serializes first-campaign detection and starts the submission clock", () => {
  assert.match(routes, /SELECT id FROM users WHERE id = \$\{userId\} FOR UPDATE/);
  assert.match(routes, /const \[alreadyJoined\][\s\S]*SELECT id FROM campaign_participants WHERE instance_id = \$\{instanceId\} AND user_id = \$\{userId\}[\s\S]*if \(alreadyJoined\)/);
  assert.match(routes, /SELECT COUNT\(\*\) AS count FROM campaign_participants WHERE user_id = \$\{userId\}/);
  assert.match(routes, /deadline, completion_deadline, access_accepted_at, access_revealed_at, first_campaign/);
  assert.match(routes, /completion_deadline = COALESCE\(completion_deadline,/);
});

test("draft feedback is creator-scoped and review decisions lock the whole package", () => {
  assert.match(routes, /PRIMARY KEY \(instance_id, user_id, bounty_id, slot_index\)/);
  assert.match(routes, /SELECT cp\.status, cp\.deadline, ci\.template_id, ci\.objective_snapshot[\s\S]*FOR UPDATE OF cp/);
  assert.match(routes, /if \(verdict === 'rejected' && submissionIds != null\)/);
  assert.match(routes, /if \(verdict === 'rejected'\) \{[\s\S]*UPDATE campaign_participants SET status = 'rejected'/);
  assert.match(routes, /status NOT IN \('completed', 'completed_and_verified', 'full_game_awarded', 'expired', 'cancelled', 'rejected', 'submitted_for_review'\)/);
});