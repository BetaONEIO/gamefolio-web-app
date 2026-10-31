import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const routes = readFileSync("server/routes/bounty-marketplace.ts", "utf8");
const bountiesPage = readFileSync("client/src/pages/BountiesPage.tsx", "utf8");
const dashboardPage = readFileSync("client/src/pages/IndieDashboardPage.tsx", "utf8");
const completionKey = "campaign:${sub.instance_id}:participation:${participantRow?.id ?? sub.participant_id}:creator:${sub.participant_id}:objective:completion:deliverable:all:reward:completion";

test("staging, removal and commit serialize on the participant row", () => {
  assert.match(routes, /Lock participation to serialize staging, removal, and package commits[\s\S]*FOR UPDATE OF cp/);
  assert.match(routes, /SELECT status, deadline FROM campaign_participants[\s\S]*FOR UPDATE/);
  assert.match(routes, /router\.post\('\/my\/:instanceId\/submit-package'/);
  assert.match(routes, /SELECT cp\.id, cp\.user_id, cp\.status, cp\.deadline[\s\S]*FOR UPDATE/);
});

test("submitted units and legacy staged units satisfy package requirements", () => {
  assert.match(routes, /\['staged', 'awaiting_review', 'under_review', 'approved'\]\.includes\(String\(s\.status\)\)/);
  assert.match(routes, /status IN \('staged','awaiting_review'\)[\s\S]*RETURNING \*/);
  assert.match(routes, /status = 'submitted_for_review'/);
  assert.match(routes, /\['completed', 'completed_and_verified', 'full_game_awarded', 'expired', 'cancelled', 'submitted_for_review'\]\.includes/);
});

test("individual review changes only selected items and does not approve untouched work", () => {
  assert.match(routes, /AND s\.status IN \('pending','awaiting_review','under_review'\) \$\{target\}[\s\S]*RETURNING s\.\*/);
  assert.doesNotMatch(routes, /const untouchedApproved/);
  assert.match(routes, /complete \? 'completed_and_verified' : 'in_progress'/);
});

test("package and legacy completion use the same durable reward dedupe key", () => {
  assert.ok(routes.includes(completionKey), "legacy completion reward key must remain present");
  assert.match(routes, /rewardKey: `campaign:\$\{instanceId\}:participation:\$\{reward\.participant_id\}:creator:\$\{p\.user_id\}:objective:completion:deliverable:all:reward:completion`/);
  assert.match(routes, /retryCompletion: true/);
});

test("joining serializes first-campaign detection without starting the submission clock", () => {
  assert.match(routes, /SELECT id FROM users WHERE id = \$\{userId\} FOR UPDATE/);
  assert.match(routes, /const \[alreadyJoined\][\s\S]*SELECT id FROM campaign_participants WHERE instance_id = \$\{instanceId\} AND user_id = \$\{userId\}[\s\S]*if \(alreadyJoined\)/);
  assert.match(routes, /SELECT COUNT\(\*\) AS count FROM campaign_participants WHERE user_id = \$\{userId\}/);
  assert.match(routes, /deadline, completion_deadline, access_accepted_at, access_revealed_at, first_campaign/);
  assert.match(routes, /NOW\(\), NULL,\s*NULL, NULL, NULL, \$\{firstCampaign\}/);
  assert.match(routes, /completion_deadline = COALESCE\(completion_deadline,/);
});

test("campaign access copy explains that explicit access starts the submission clock", () => {
  assert.doesNotMatch(bountiesPage, /Your submission deadline started when you joined\./);
  assert.match(bountiesPage, /Reveal Key & Start/);
  assert.match(bountiesPage, /Your key is reserved\. Reveal it when ready to start your submission deadline\./);
  assert.match(bountiesPage, /Starts when access is confirmed/);
});

test("campaign dashboard preserves the developer's selected game context", () => {
  assert.match(dashboardPage, /const effectiveGameId = activeGameId \?\? defaultGameId/);
  assert.match(dashboardPage, /<CampaignWorkspace[\s\S]*gameId=\{effectiveGameId\}/);
  assert.match(dashboardPage, /<KeyManagementTab gameId=\{effectiveGameId\}/);
});

test("bounty staging QA regressions stay fixed", () => {
  assert.match(bountiesPage, /if \(submitUrl === feedbackInitialText\) \{[\s\S]*setDraftStatus\(null\)/);
  assert.match(bountiesPage, /data\.instance_id \?\? cp\.instance_id \?\? data\.id \?\? cp\.id/);
  assert.doesNotMatch(bountiesPage, /campaign=\$\{cp\.id\}/);
  assert.match(bountiesPage, /const genreKeys = campaignGenreKeys\(c\)/);
  assert.match(bountiesPage, /!genreKeys\.has\(f\)/);
  assert.match(bountiesPage, /setLocation\(`\/bounties\?tab=\$\{t\.key\}`\)/);
});

test("joining reserves one access key without revealing it or starting a deadline", () => {
  const join = routes.slice(
    routes.indexOf("router.post('/:instanceId/join'"),
    routes.indexOf("// Creator withdrawal is self-service"),
  );
  assert.match(join, /ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED[\s\S]*RETURNING id, status/);
  assert.doesNotMatch(join, /accessKey = decryptCampaignKey\(keyRow\)/);
  assert.doesNotMatch(join, /UPDATE game_keys SET status = 'revealed', revealed_at = NOW\(\)/);
  assert.match(join, /NOW\(\), NULL,\s*NULL, NULL, NULL, \$\{firstCampaign\}/);
  assert.match(join, /key: null,[\s\S]*access_revealed_at: participant\.access_revealed_at[\s\S]*deadline: null/);
  assert.match(join, /No compatible access keys available for this campaign/);
  assert.doesNotMatch(join, /console\.(?:log|info|debug)\([^)]*accessKey/);
});

test("joining claims campaign-reserved inventory before legacy available keys", () => {
  const join = routes.slice(
    routes.indexOf("router.post('/:instanceId/join'"),
    routes.indexOf("// Creator withdrawal is self-service"),
  );
  const reservationStart = join.indexOf("// Campaign-submit inventory is already reserved");
  const reservedClaim = join.indexOf("AND key_pool = 'access' AND status = 'reserved'", reservationStart);
  const legacyFallback = join.indexOf("AND key_pool = 'access' AND status = 'available'", reservedClaim);

  assert.ok(reservationStart >= 0, "new campaign inventory should be preferred");
  assert.ok(reservedClaim > reservationStart && legacyFallback > reservedClaim,
    "reserved-key selection must precede legacy available-key fallback");
  assert.match(join.slice(reservationStart, legacyFallback), /assigned_user_id IS NULL/);
  assert.match(join.slice(reservationStart, legacyFallback), /ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED/);
  assert.match(join.slice(reservationStart, legacyFallback), /if \(!key\) \{/);
  assert.match(join.slice(legacyFallback), /status = 'available'[\s\S]*ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED/);
  assert.doesNotMatch(join, /UPDATE game_keys SET status = 'revealed', revealed_at = NOW\(\)/);
});

test("cancel and expiry only release unrevealed reserved access keys", () => {
  const expiry = routes.slice(
    routes.indexOf("export async function expireOverdueCampaignParticipants"),
    routes.indexOf("function objectiveProgress"),
  );
  const cancel = routes.slice(
    routes.indexOf("router.post('/my/:instanceId/cancel'"),
    routes.indexOf("// Manual application review"),
  );

  assert.match(expiry, /row\.access_key_id &&\s*!row\.access_revealed_at[\s\S]*WHERE id = \$\{row\.access_key_id\} AND status = 'reserved'/);
  assert.match(cancel, /participation\.access_key_id && !participation\.access_revealed_at[\s\S]*WHERE id = \$\{participation\.access_key_id\} AND status = 'reserved'/);
});

test("full-game-upfront access availability stays separate from completion reward keys", () => {
  assert.equal((routes.match(/AS full_access_keys_remaining/g) ?? []).length, 2);
  assert.match(routes, /key_type = 'full'\s+AND gk\.key_pool = 'access'[\s\S]*gk\.status = 'available' OR \(gk\.status = 'reserved'/);
  assert.match(routes, /key_type = 'full'\s+AND gk\.key_pool = 'reward' AND gk\.status = 'available'\) AS full_keys_remaining/);
  assert.match(routes, /const accessKeyType = accessMethod === 'full_game_upfront' \? 'full' : 'demo'/);
  assert.match(routes, /key: null,[\s\S]*accessKeyAvailable: Boolean\(demoKeyId\)/);
  assert.match(bountiesPage, /function campaignAccessKeysRemaining[\s\S]*full_game_upfront[\s\S]*full_access_keys_remaining[\s\S]*demo_keys_remaining/);
  assert.match(bountiesPage, /const accessKeysLeft = campaignAccessKeysRemaining\(campaign\);[\s\S]*const canAccept =[\s\S]*accessKeysLeft > 0/);
  assert.match(bountiesPage, /No Full-Game Access Keys/);
  assert.match(bountiesPage, /setJoinedAccessKey\(joinResult\.key\)/);
  assert.match(bountiesPage, /Your game key/);
});

test("draft feedback stays creator-scoped and rejection releases participation", () => {
  assert.match(routes, /PRIMARY KEY \(instance_id, user_id, bounty_id, slot_index\)/);
  assert.match(routes, /SELECT cp\.status, cp\.deadline, ci\.template_id, ci\.objective_snapshot[\s\S]*FOR UPDATE OF cp/);
  assert.match(routes, /if \(verdict === 'rejected' && submissionIds != null\)/);
  assert.match(routes, /if \(verdict === 'rejected'\) \{[\s\S]*UPDATE campaign_participants SET status = 'rejected'/);
  assert.match(routes, /status NOT IN \('completed', 'completed_and_verified', 'full_game_awarded', 'expired', 'cancelled', 'rejected', 'withdrawn', 'removed', 'submitted_for_review'\)/);
});

test("staging rejects clips, reels and screenshots reused across active campaign slots", () => {
  assert.match(routes, /Lock participation to serialize staging, removal, and package commits[\s\S]*FOR UPDATE OF cp/);
  assert.match(routes, /expectedContentType === 'clip' \|\| expectedContentType === 'reel' \|\| expectedContentType === 'screenshot'/);
  assert.match(routes, /expectedContentType === 'screenshot'\s*\? sql`screenshot_id = \$\{mediaId\}`\s*:\s*sql`\(clip_id = \$\{mediaId\} OR reel_id = \$\{mediaId\}\)`/);
  const duplicateGuard = routes.slice(routes.indexOf("const [usedInActiveSlot]"), routes.indexOf("if (usedInActiveSlot)"));
  assert.match(duplicateGuard, /AND \$\{mediaIdPredicate\}[\s\S]*AND status IN \('staged', 'pending', 'awaiting_review', 'under_review', 'approved'\)[\s\S]*AND id <> \$\{stagedReplacementId \?\? -1\}/);
  assert.doesNotMatch(duplicateGuard, /bounty_id/);
  assert.match(routes, /if \(usedInActiveSlot\) \{\s*return res\.status\(409\)/);
});

test("participant campaign detail returns stored clip duration and the thumbnail URL field", () => {
  assert.match(routes, /COALESCE\(c\.thumbnail_url, ss\.thumbnail_url, ss\.image_url\) AS thumbnail_url/);
  assert.match(routes, /c\.duration AS media_duration_seconds/);
  assert.doesNotMatch(routes, /c\.(?:raw_upload_path|thumbnail_path|private_key)\s+AS\s+(?:thumbnail_url|media_url)/i);
});
