import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateCustomCampaign } from '../shared/bounty-rewards';
import { decryptCampaignKey, encryptCampaignKey } from '../server/campaign-key-security';
import {
  canClaimCompletionKey,
  normalizeCampaignInput,
  normalizeCampaignReminderThresholds,
} from '../shared/campaign-contract';

test('custom campaign calculations use bounded central objective values', () => {
  const result = calculateCustomCampaign({ clip: 2, screenshot: 3, stream: 1 });
  assert.equal(result.deliverables, 6);
  assert.ok(result.totalXp > result.completionBonus);
  assert.ok(result.deadlineDays >= 1 && result.deadlineDays <= 90);
  assert.deepEqual(result.warnings, []);
});

test('custom campaign rejects unsupported or unreasonable quantities', () => {
  const result = calculateCustomCampaign({ clip: 6, unknown: 1 } as any);
  assert.ok(result.warnings.some((warning) => warning.includes('at most')));
  assert.ok(result.warnings.some((warning) => warning.includes('Unsupported')));
});

test('campaign keys encrypt at rest and decrypt only for reveal handlers', () => {
  process.env.CAMPAIGN_KEY_ENCRYPTION_KEY = 'campaign-test-secret';
  const encrypted = encryptCampaignKey('EXAMPLE-KEY-123');
  assert.equal((encrypted as any).ciphertext.includes('EXAMPLE-KEY-123'), false);
  assert.equal(encrypted.keyVersion, 'campaign-v1');
  assert.equal(encrypted.keyringId, 'campaign');
  assert.equal(decryptCampaignKey({
    key_ciphertext: encrypted.ciphertext,
    key_iv: encrypted.iv,
    key_auth_tag: encrypted.authTag,
  }), 'EXAMPLE-KEY-123');
});

test('campaign contract accepts legacy wizard aliases and persists canonical meanings', () => {
  const normalized = normalizeCampaignInput({
    accessMethod: 'full_upfront',
    completionFullGameKey: true,
    completionDeadlineDays: 21,
    customObjectives: { clip: 2 },
    customAccessInstructions: 'Use this test build',
  });
  assert.equal(normalized.accessMethod, 'full_game_upfront');
  assert.equal(normalized.completionRewardKeyRequired, true);
  assert.equal(normalized.creatorDeadlineDays, 21);
  assert.deepEqual(normalized.objectiveSnapshot, { clip: 2 });
  assert.equal(normalized.accessInstructions, 'Use this test build');
});

test('custom access key need is normalized to the canonical contract field', () => {
  assert.equal(normalizeCampaignInput({
    accessMethod: 'custom',
    customAccessNeedsKey: false,
  }).requiresAccessKey, false);
});

test('completion keys require completed state and every mandatory approval', () => {
  assert.equal(canClaimCompletionKey('completed_and_verified', 2, 1), false);
  assert.equal(canClaimCompletionKey('submitted_for_review', 2, 2), false);
  assert.equal(canClaimCompletionKey('completed_and_verified', 2, 2), true);
});

test('campaign reminder thresholds are bounded, unique, and defaulted', () => {
  assert.deepEqual(normalizeCampaignReminderThresholds(undefined), [72, 48, 24, 6]);
  assert.deepEqual(normalizeCampaignReminderThresholds([24, 6, 24, -1, 90000]), [24, 6]);
});

test('campaign key encryption never falls back to the session secret', () => {
  const previousCampaign = process.env.CAMPAIGN_KEY_ENCRYPTION_KEY;
  const previousWallet = process.env.WALLET_ENCRYPTION_KEY;
  const previousSession = process.env.SESSION_SECRET;
  delete process.env.CAMPAIGN_KEY_ENCRYPTION_KEY;
  delete process.env.WALLET_ENCRYPTION_KEY;
  process.env.SESSION_SECRET = 'session-only-secret';
  assert.throws(() => encryptCampaignKey('must-fail-closed'), /CAMPAIGN_KEY_ENCRYPTION_KEY/);
  if (previousCampaign === undefined) delete process.env.CAMPAIGN_KEY_ENCRYPTION_KEY;
  else process.env.CAMPAIGN_KEY_ENCRYPTION_KEY = previousCampaign;
  if (previousWallet === undefined) delete process.env.WALLET_ENCRYPTION_KEY;
  else process.env.WALLET_ENCRYPTION_KEY = previousWallet;
  if (previousSession === undefined) delete process.env.SESSION_SECRET;
  else process.env.SESSION_SECRET = previousSession;
});

test('campaign key versions resolve to their version-specific keyring secret', () => {
  const previousVersion = process.env.CAMPAIGN_KEY_ENCRYPTION_KEY_VERSION;
  const previousV2 = process.env.CAMPAIGN_KEY_ENCRYPTION_KEY_V2;
  process.env.CAMPAIGN_KEY_ENCRYPTION_KEY_VERSION = 'campaign-v2';
  process.env.CAMPAIGN_KEY_ENCRYPTION_KEY_V2 = 'campaign-v2-test-secret';
  const encrypted = encryptCampaignKey('VERSIONED-KEY');
  assert.equal(encrypted.keyVersion, 'campaign-v2');
  assert.equal(decryptCampaignKey({
    key_ciphertext: encrypted.ciphertext,
    key_iv: encrypted.iv,
    key_auth_tag: encrypted.authTag,
    key_version: encrypted.keyVersion,
  }), 'VERSIONED-KEY');
  if (previousVersion === undefined) delete process.env.CAMPAIGN_KEY_ENCRYPTION_KEY_VERSION;
  else process.env.CAMPAIGN_KEY_ENCRYPTION_KEY_VERSION = previousVersion;
  if (previousV2 === undefined) delete process.env.CAMPAIGN_KEY_ENCRYPTION_KEY_V2;
  else process.env.CAMPAIGN_KEY_ENCRYPTION_KEY_V2 = previousV2;
});

test('wallet compatibility encryption is explicitly tagged and decryptable', () => {
  const previousCampaign = process.env.CAMPAIGN_KEY_ENCRYPTION_KEY;
  const previousWallet = process.env.WALLET_ENCRYPTION_KEY;
  delete process.env.CAMPAIGN_KEY_ENCRYPTION_KEY;
  process.env.WALLET_ENCRYPTION_KEY = 'stable-wallet-test-secret';
  const encrypted = encryptCampaignKey('LEGACY-BACKFILL-KEY');
  assert.equal(encrypted.keyVersion, 'wallet-v1');
  assert.equal(encrypted.keyringId, 'wallet');
  assert.equal(decryptCampaignKey({
    key_ciphertext: encrypted.ciphertext,
    key_iv: encrypted.iv,
    key_auth_tag: encrypted.authTag,
    key_version: encrypted.keyVersion,
  }), 'LEGACY-BACKFILL-KEY');
  if (previousCampaign === undefined) delete process.env.CAMPAIGN_KEY_ENCRYPTION_KEY;
  else process.env.CAMPAIGN_KEY_ENCRYPTION_KEY = previousCampaign;
  if (previousWallet === undefined) delete process.env.WALLET_ENCRYPTION_KEY;
  else process.env.WALLET_ENCRYPTION_KEY = previousWallet;
});