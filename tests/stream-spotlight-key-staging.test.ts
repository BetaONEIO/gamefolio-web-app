import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { isValidCampaignKey, maskCampaignKey } from '../server/campaign-key-security';
import {
  isValidStreamSpotlightKeylessCapacity,
  validateStreamSpotlightStageAttachment,
} from '../server/stream-livestream-validation';

const routes = readFileSync('server/routes/campaign-programme.ts', 'utf8');
const attachRouteStart = routes.indexOf("router.post('/stream-spotlight/key-stages/:stageId/attach'");
const attachRouteEnd = routes.indexOf("router.post('/instances/:id/keys'", attachRouteStart);
const attachRoute = routes.slice(attachRouteStart, attachRouteEnd);

test('key staging validates bounded printable key strings', () => {
  assert.equal(isValidCampaignKey('ABCD-1234-EFGH'), true);
  assert.equal(isValidCampaignKey('   '), false);
  assert.equal(isValidCampaignKey('abc'), false);
  assert.equal(isValidCampaignKey(`ABCD\u0000EFGH`), false);
  assert.equal(isValidCampaignKey('A'.repeat(257)), false);
});

test('key masking never returns the complete credential', () => {
  const key = 'ABCDE-FGHIJ-KLMNO';
  const masked = maskCampaignKey(key);
  assert.notEqual(masked, key);
  assert.match(masked, /KLMNO$/);
  assert.equal(maskCampaignKey('ABCDE'), 'XXXXX');
});

test('Stream Spotlight staging returns only masked keys and transfers encrypted records', () => {
  assert.match(routes, /router\.post\('\/stream-spotlight\/key-stages'/);
  assert.match(routes, /router\.get\('\/stream-spotlight\/key-stages\/:stageId'/);
  assert.match(routes, /router\.delete\('\/stream-spotlight\/key-stages\/:stageId'/);
  assert.match(routes, /router\.delete\('\/stream-spotlight\/key-stages\/:stageId\/keys\/:keyId'/);
  assert.match(routes, /router\.post\('\/stream-spotlight\/key-stages\/:stageId\/attach'/);
  assert.match(routes, /encryptCampaignKey\(value\)/);
  assert.match(routes, /masked: maskCampaignKey\(decryptCampaignKey\(row\)\)/);
  assert.match(routes, /Attached key stages cannot be cleared/);
  assert.match(routes, /DELETE FROM game_key_batches/);
  assert.match(routes, /SET max_places = \$\{keys\.length\}/);
});

test('stage clear is owner-scoped, atomic, and cannot remove attached batches', () => {
  assert.match(routes, /DELETE FROM game_key_batches[\s\S]*?staging_id = \$\{stageId\}[\s\S]*?developer_user_id = \$\{userId\}/);
  assert.match(routes, /campaign-key-stage:' \+ stageId/);
  assert.match(routes, /Attached key stages cannot be cleared/);
  assert.match(routes, /status IN \('available', 'removed'\)/);
});

test('new staging-column migration failures are not silently swallowed', () => {
  const migration = routes.indexOf('ALTER TABLE game_key_batches ADD COLUMN IF NOT EXISTS staging_id TEXT');
  assert.notEqual(migration, -1);
  assert.doesNotMatch(routes.slice(migration, migration + 110), /\.catch\(\(\) => \{\}\)/);
});

test('owned draft stage takes the successful attach path and persists capacity', () => {
  const ownerDraft = {
    developer_user_id: 42,
    template_slug: 'stream-spotlight',
    status: 'draft',
  };
  assert.equal(validateStreamSpotlightStageAttachment(ownerDraft, 42), null);
  assert.match(attachRoute, /t\.slug AS template_slug/);
  assert.match(attachRoute, /validateStreamSpotlightStageAttachment\(instance, userId\)/);
  assert.match(attachRoute, /UPDATE game_keys SET instance_id = \$\{instanceId\}/);
  assert.match(attachRoute, /UPDATE game_key_batches SET instance_id = \$\{instanceId\}/);
  assert.match(attachRoute, /SET max_places = \$\{keys\.length\}/);
  assert.match(attachRoute, /res\.json\(\{ success: true, instanceId, capacity: attached\.capacity/);
});

test('single-key removal shares the stage lock with attach and clear', () => {
  const removeStart = routes.indexOf("router.delete('/stream-spotlight/key-stages/:stageId/keys/:keyId'");
  const removeEnd = routes.indexOf("router.post('/stream-spotlight/key-stages/:stageId/attach'", removeStart);
  const removeRoute = routes.slice(removeStart, removeEnd);
  assert.match(removeRoute, /db\.transaction/);
  assert.match(removeRoute, /campaign-key-stage:' \+ stageId/);
  assert.match(removeRoute, /UPDATE game_keys gk/);
});

test('staging rejects globally reused hashes and handles unique-index races as duplicates', () => {
  assert.match(routes, /pg_advisory_xact_lock\(hashtextextended\(\$\{hash\}, 0\)\)/);
  assert.match(routes, /gk\.key_hash = \$\{hash\}[\s\S]*?gk\.status <> 'removed'/);
  assert.match(routes, /ON CONFLICT DO NOTHING[\s\S]*?RETURNING id/);
  assert.match(routes, /insertConflicts\+\+/);
});

test('Stream Spotlight cannot be submitted with zero required access keys', () => {
  assert.match(routes, /Upload at least one valid access key before submitting this Stream Spotlight campaign/);
});

test('keyless Stream Spotlight has the server-side 1–25 participant limit', () => {
  assert.equal(isValidStreamSpotlightKeylessCapacity(1), true);
  assert.equal(isValidStreamSpotlightKeylessCapacity(25), true);
  assert.equal(isValidStreamSpotlightKeylessCapacity(0), false);
  assert.equal(isValidStreamSpotlightKeylessCapacity(26), false);
  assert.equal(isValidStreamSpotlightKeylessCapacity(1.5), false);
  assert.equal(isValidStreamSpotlightKeylessCapacity(''), false);
  assert.match(routes, /isStreamSpotlight && canonicalRequiresAccessKey === false/);
  assert.match(routes, /isStreamSpotlight && patchedRequiresAccessKey === false/);
  assert.equal((routes.match(/isValidStreamSpotlightKeylessCapacity\(/g) ?? []).length, 2);
});