import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const routes = readFileSync('server/routes/campaign-programme.ts', 'utf8');
const migration = readFileSync('migrations/0031_game_owned_campaign_key_inventory.sql', 'utf8');

test('game key inventory endpoints are owner-scoped and return aggregates only', () => {
  const inventoryStart = routes.indexOf("router.get('/games/:gameId/key-inventory'");
  const uploadStart = routes.indexOf("router.post('/games/:gameId/keys'", inventoryStart);
  const instanceUploadStart = routes.indexOf("router.post('/instances/:id/keys'", uploadStart);
  assert.ok(inventoryStart >= 0 && uploadStart > inventoryStart && instanceUploadStart > uploadStart);
  const inventoryRoute = routes.slice(inventoryStart, uploadStart);
  const uploadRoute = routes.slice(uploadStart, instanceUploadStart);

  assert.match(inventoryRoute, /indie_game_profiles[\s\S]*user_id = \$\{userId\}[\s\S]*catalog_game_id = \$\{gameId\}/);
  assert.match(inventoryRoute, /WHERE game_id = \$\{gameId\} AND key_pool = 'access'/);
  assert.match(inventoryRoute, /AS available/);
  assert.match(inventoryRoute, /AS reserved/);
  assert.match(inventoryRoute, /AS assigned/);
  assert.match(inventoryRoute, /res\.json\(\{ gameId, total, byType \}\)/);
  assert.doesNotMatch(inventoryRoute, /key_value|key_ciphertext|decryptCampaignKey/);

  assert.match(uploadRoute, /encryptCampaignKey\(value\)/);
  assert.match(uploadRoute, /key_hash = \$\{hash\}/);
  assert.match(uploadRoute, /pg_advisory_xact_lock/);
  assert.match(uploadRoute, /VALUES \(\$\{batch\.id\}, NULL, \$\{gameId\}, \$\{userId\}, \$\{keyType\}, 'access'/);
  assert.match(uploadRoute, /status\(201\)\.json\(\{[\s\S]*added:[\s\S]*duplicates:[\s\S]*invalid:/);
  assert.doesNotMatch(uploadRoute, /res\.json\([\s\S]*key_value/);
});

test('historical unbound keys require explicit owner-verified game association', () => {
  const getStart = routes.indexOf("router.get('/games/:gameId/unassigned-keys'");
  const postStart = routes.indexOf("router.post('/games/:gameId/assign-unassigned-keys'", getStart);
  const inventoryStart = routes.indexOf("router.get('/games/:gameId/key-inventory'", postStart);
  assert.ok(getStart >= 0 && postStart > getStart && inventoryStart > postStart);
  const getRoute = routes.slice(getStart, postStart);
  const postRoute = routes.slice(postStart, inventoryStart);

  assert.match(getRoute, /indie_game_profiles[\s\S]*user_id = \$\{userId\} AND catalog_game_id = \$\{gameId\}/);
  assert.match(getRoute, /gk\.game_id IS NULL AND gk\.instance_id IS NULL/);
  assert.match(getRoute, /gk\.status = 'available'/);
  assert.match(getRoute, /gk\.developer_user_id = \$\{userId\}[\s\S]*gkb\.developer_user_id = \$\{userId\}/);
  assert.match(getRoute, /maskedId:[\s\S]*keyType:/);
  assert.doesNotMatch(getRoute, /key_value|key_ciphertext|decryptCampaignKey/);

  assert.match(postRoute, /keyIds must be a non-empty array/);
  assert.match(postRoute, /db\.transaction/);
  assert.match(postRoute, /FOR UPDATE OF gk/);
  assert.match(postRoute, /game_id IS NULL AND gk\.instance_id IS NULL/);
  assert.match(postRoute, /gk\.status = 'available'/);
  assert.match(postRoute, /indie_game_profiles[\s\S]*user_id = \$\{userId\} AND catalog_game_id = \$\{gameId\}/);
  assert.match(postRoute, /SET game_id = \$\{gameId\}, developer_user_id = \$\{userId\}/);
  assert.doesNotMatch(postRoute, /key_value|key_ciphertext|decryptCampaignKey/);
});

test('game ownership migration backfills only campaign-proven rows', () => {
  assert.match(migration, /ADD COLUMN IF NOT EXISTS game_id integer/);
  assert.match(migration, /UPDATE game_keys gk[\s\S]*FROM campaign_instances ci[\s\S]*gk\.instance_id = ci\.id[\s\S]*gk\.game_id IS NULL[\s\S]*ci\.game_id IS NOT NULL/);
  assert.match(migration, /gk\.developer_user_id = ci\.developer_user_id/);
  assert.match(migration, /gkb\.developer_user_id = ci\.developer_user_id/);
  assert.match(migration, /encrypted[\s\S]*legacy keys have a NULL key_value/);
  assert.doesNotMatch(migration, /DELETE FROM game_keys/);
  assert.match(migration, /CREATE INDEX IF NOT EXISTS game_keys_game_inventory_idx/);
});

test('preset submit reserves exact game keys atomically while keyless campaigns skip reservation', () => {
  const submitStart = routes.indexOf("router.post('/instances/:id/submit'");
  const adminStart = routes.indexOf('// ADMIN ROUTES', submitStart);
  const submitRoute = routes.slice(submitStart, adminStart);
  assert.match(submitRoute, /if \(isBountyXpCompletionPreset\(instance\.template_slug\)\)[\s\S]*db\.transaction/);
  assert.match(submitRoute, /FROM campaign_instances ci WHERE ci\.id = \$\{instanceId\}[\s\S]*FOR UPDATE/);
  assert.match(submitRoute, /game_id = \$\{gameId\} AND key_pool = 'access'[\s\S]*key_type = \$\{accessType\}/);
  assert.match(submitRoute, /AND developer_user_id = \$\{userId\}/);
  assert.doesNotMatch(submitRoute, /developer_user_id = \$\{userId\} OR instance_id = \$\{instanceId\}/);
  assert.match(submitRoute, /LIMIT \$\{keysNeeded\}[\s\S]*FOR UPDATE SKIP LOCKED/);
  assert.match(submitRoute, /compatibleKeys\.length < keysNeeded/);
  assert.match(submitRoute, /SET instance_id = \$\{instanceId\}, status = 'reserved'/);
  assert.match(submitRoute, /if \(requiresAccessKey\) \{[\s\S]*\}[\s\S]*UPDATE campaign_instances/);
  assert.match(submitRoute, /else \{[\s\S]*SET instance_id = NULL, status = 'available'[\s\S]*status = 'reserved'[\s\S]*assigned_participant_id IS NULL/);
  assert.match(submitRoute, /igp\.user_id = ci\.developer_user_id AND igp\.catalog_game_id = ci\.game_id/);
  assert.match(submitRoute, /CAMPAIGN_COMMERCIAL_MODEL\.presets\.find/);
  assert.match(migration, /NEW\.status IN \('rejected', 'cancelled', 'completed'\)/);
  assert.match(migration, /status = 'reserved'[\s\S]*revealed_at IS NULL[\s\S]*assigned_participant_id IS NULL/);
  assert.match(migration, /game_id IS NOT NULL/);
});

test('PATCH cannot submit directly and approval is locked, state-guarded, and inventory-gated', () => {
  const patchStart = routes.indexOf("router.patch('/instances/:id'");
  const submitStart = routes.indexOf("// POST /api/campaigns/instances/:id/submit", patchStart);
  const patchRoute = routes.slice(patchStart, submitStart);
  assert.match(patchRoute, /status === 'awaiting_review'[\s\S]*Use the submit endpoint/);
  assert.doesNotMatch(patchRoute, /status = COALESCE\(/);
  assert.doesNotMatch(patchRoute, /submitted_at = COALESCE\(/);

  const approveStart = routes.indexOf("router.patch('/admin/instances/:id/approve'");
  const rejectStart = routes.indexOf("router.patch('/admin/instances/:id/reject'", approveStart);
  const approveRoute = routes.slice(approveStart, rejectStart);
  assert.match(approveRoute, /db\.transaction/);
  assert.match(approveRoute, /ci\.status[\s\S]*FOR UPDATE OF ci/);
  assert.match(approveRoute, /requirements\.status !== 'awaiting_review'/);
  assert.match(approveRoute, /gk\.status = 'reserved'[\s\S]*gk\.assigned_user_id IS NULL[\s\S]*gk\.assigned_participant_id IS NULL/);
  assert.match(approveRoute, /gk\.status = 'available'[\s\S]*gk\.game_id = ci\.game_id OR gk\.game_id IS NULL/);
  assert.match(approveRoute, /gk\.key_ciphertext IS NOT NULL/);
  assert.match(approveRoute, /compatible_access_keys[\s\S]*places/);
  assert.match(approveRoute, /WHERE id = \$\{instanceId\} AND status = 'awaiting_review'[\s\S]*RETURNING id/);
});