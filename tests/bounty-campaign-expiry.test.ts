import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const routes = readFileSync('server/routes/bounty-marketplace.ts', 'utf8');

test('public access availability counts unclaimed reservations and legacy available access only', () => {
  const publicReads = routes.slice(
    routes.indexOf("router.get('/',"),
    routes.indexOf('// JOIN FLOW — AUTHENTICATED'),
  );
  assert.equal((publicReads.match(/AS demo_keys_remaining/g) ?? []).length, 2);
  assert.equal((publicReads.match(/AS full_access_keys_remaining/g) ?? []).length, 2);
  assert.equal(
    (publicReads.match(/gk\.status = 'available' OR \(gk\.status = 'reserved'[\s\S]*?gk\.assigned_user_id IS NULL AND gk\.assigned_participant_id IS NULL\)/g) ?? []).length,
    4,
  );
  assert.match(publicReads, /gk\.key_pool = 'access'[\s\S]*AS demo_keys_remaining/);
  assert.match(publicReads, /gk\.key_pool = 'access'[\s\S]*AS full_access_keys_remaining/);
  assert.match(publicReads, /key_pool = 'reward' AND gk\.status = 'available'\) AS full_keys_remaining/);

  const keys = [
    ...Array.from({ length: 3 }, () => ({ status: 'reserved', assignedUserId: null, assignedParticipantId: null, pool: 'access' })),
    ...Array.from({ length: 7 }, (_, index) => ({
      status: index % 2 ? 'assigned' : 'revealed',
      assignedUserId: index + 1,
      assignedParticipantId: null,
      pool: 'access',
    })),
    { status: 'available', assignedUserId: null, assignedParticipantId: null, pool: 'reward' },
  ];
  const countableAccessKeys = keys.filter((key) =>
    key.pool === 'access' &&
    (key.status === 'available' || (
      key.status === 'reserved' &&
      key.assignedUserId === null &&
      key.assignedParticipantId === null
    )),
  );
  assert.equal(countableAccessKeys.length, 3, '10 reserved keys minus 7 claimed leave 3 unclaimed');
});

test('end-date expiry is idempotent, preserves participant work, and releases only unclaimed game access reservations', () => {
  const expiryStart = routes.indexOf('export async function expireEndedCampaigns');
  const expiryEnd = routes.indexOf('function objectiveProgress', expiryStart);
  const expiry = routes.slice(expiryStart, expiryEnd);

  assert.match(expiry, /status IN \('live', 'approved', 'in_progress'\)[\s\S]*end_date IS NOT NULL AND end_date <= NOW\(\)[\s\S]*FOR UPDATE SKIP LOCKED/);
  assert.match(expiry, /SET status = 'under_review', lifecycle_state = 'under_review'/);
  assert.match(expiry, /WHERE id = \$\{campaign\.id\}[\s\S]*status IN \('live', 'approved', 'in_progress'\)[\s\S]*RETURNING id/);
  assert.match(expiry, /WHERE instance_id = \$\{closed\.id\}[\s\S]*game_id IS NOT NULL[\s\S]*key_pool = 'access'[\s\S]*status = 'reserved'[\s\S]*assigned_user_id IS NULL[\s\S]*assigned_participant_id IS NULL/);
  assert.match(expiry, /SET instance_id = NULL, status = 'available'/);
  assert.doesNotMatch(expiry, /UPDATE campaign_participants/);
  assert.match(routes, /await expireEndedCampaigns\(\);[\s\S]*await expireOverdueCampaignParticipants\(\);/);
  assert.match(routes, /const campaignExpiryInterval = setInterval\([\s\S]*expireEndedCampaigns\(\)/);
  assert.match(routes, /campaignExpiryInterval\.unref\?\.\(\)/);
});