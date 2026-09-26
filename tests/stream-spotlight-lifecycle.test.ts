import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const routes = readFileSync("server/routes/bounty-marketplace.ts", "utf8");
const streamValidation = readFileSync("server/stream-livestream-validation.ts", "utf8");

test("Stream Spotlight joins require a campaign-allowed connected channel", () => {
  assert.match(routes, /streamConfig\.allowedPlatforms\.includes\(channel\.platform\)/);
  assert.match(routes, /Connect a verified channel on a platform allowed by this campaign before joining/);
  assert.match(routes, /access_keys_usable/);
  assert.match(routes, /Configured campaign places exceed the available access-key capacity/);
});

test("stream staging validates provider URLs, sessions, and campaign limits", () => {
  assert.match(routes, /validateStreamSubmission\(contentData/);
  assert.match(routes, /streamSubmissionIdentities/);
  assert.match(routes, /This stream session or VOD has already been submitted for a campaign objective/);
  assert.match(routes, /STREAM_SESSION_LIMIT/);
  assert.match(routes, /Claimed livestream time is below the campaign requirement/);
});

test("stream verification is explicit developer review and remains approval-gated", () => {
  assert.match(routes, /streamReview/);
  assert.match(routes, /validateDeveloperStreamReview/);
  assert.match(routes, /reviewMap\[String\(submission\.id\)\]/);
  assert.match(streamValidation, /verificationStatus: "verified"/);
  assert.match(streamValidation, /evidence\.verifiedMinutes/);
  assert.match(streamValidation, /detectedGame: detectedGame \|\| null/);
  assert.match(routes, /verdict === 'approved' && streamConfig/);
  assert.match(routes, /status = 'under_review'/);
});

test("creator cancellation releases only unused reserved access keys", () => {
  assert.match(routes, /router\.post\('\/my\/:instanceId\/cancel'/);
  assert.match(routes, /!participation\.access_revealed_at/);
  assert.match(routes, /WHERE id = \$\{participation\.access_key_id\} AND status = 'reserved'/);
  assert.match(routes, /accessKeyReleased = Boolean\(releasedKey\)/);
  assert.match(routes, /participation\.template_slug !== 'stream-spotlight' &&\s+participation\.access_key_id/);
});

test("Stream Spotlight key reservations are bound to their participant and never recycled", () => {
  const joinStart = routes.indexOf("router.post('/:instanceId/join'");
  const cancelStart = routes.indexOf("router.post('/my/:instanceId/cancel'");
  const joinRoute = routes.slice(joinStart, cancelStart);
  assert.match(routes, /assigned_participant_id INTEGER/);
  assert.match(routes, /t\.slug AS template_slug/);
  assert.ok(joinRoute.indexOf('INSERT INTO campaign_participants') <
    joinRoute.indexOf('SET assigned_participant_id = ${participant.id}'));
  assert.match(joinRoute, /SET assigned_participant_id = \$\{participant\.id\}/);
  assert.match(routes, /assigned_user_id = \$\{userId\} AND assigned_participant_id IS NULL/);
  assert.match(routes, /row\.template_slug !== 'stream-spotlight' && row\.access_key_id/);
  assert.match(routes, /p\.template_slug !== 'stream-spotlight' && p\.access_key_id/);
  assert.match(routes, /status = 'reserved', assigned_user_id = \$\{userId\}, assigned_at = NOW\(\)/);
});

test("join and review notifications use the shared push notification service", () => {
  assert.match(routes, /type: 'campaign_join'/);
  assert.match(routes, /type: 'bounty_review'/);
  assert.match(routes, /Could not notify campaign owner of a new participant/);
});