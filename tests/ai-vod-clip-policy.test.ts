import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canAccessPrivateAiVodClipper,
  getVodClipLimits,
  isVodDurationAllowed,
} from '../server/services/ai-vod-clip-policy';

test('private route access admits Admins and Ambassadors', () => {
  assert.equal(canAccessPrivateAiVodClipper({ role: 'admin' }), true);
  assert.equal(canAccessPrivateAiVodClipper({ role: 'user', isAmbassador: true }), true);
});

test('private route access rejects ordinary users, including Pro users', () => {
  assert.equal(canAccessPrivateAiVodClipper(undefined), false);
  assert.equal(canAccessPrivateAiVodClipper({ role: 'user' }), false);
  assert.equal(canAccessPrivateAiVodClipper({ role: 'user', isPro: true }), false);
});

test('eligible private testers and Pro users receive the six-hour allowance', () => {
  for (const user of [
    { role: 'admin' },
    { role: 'user', isAmbassador: true },
    { role: 'user', isPro: true },
  ]) {
    const limits = getVodClipLimits(user);
    assert.equal(limits.isPro, true);
    assert.equal(limits.maxVodDurationSeconds, 6 * 60 * 60);
  }
});

test('the dormant Free tier retains four-hour limits without route access', () => {
  const freeUser = { role: 'user', isPro: false, isAmbassador: false };
  const limits = getVodClipLimits(freeUser);

  assert.equal(canAccessPrivateAiVodClipper(freeUser), false);
  assert.equal(limits.isPro, false);
  assert.equal(limits.maxVodDurationSeconds, 4 * 60 * 60);
});

test('server-side duration validation rejects VODs above the applicable limit', () => {
  const freeLimits = getVodClipLimits({ role: 'user' });
  const proLimits = getVodClipLimits({ role: 'user', isPro: true });

  assert.equal(isVodDurationAllowed(4 * 60 * 60, freeLimits), true);
  assert.equal(isVodDurationAllowed(4 * 60 * 60 + 1, freeLimits), false);
  assert.equal(isVodDurationAllowed(6 * 60 * 60, proLimits), true);
  assert.equal(isVodDurationAllowed(6 * 60 * 60 + 1, proLimits), false);
});