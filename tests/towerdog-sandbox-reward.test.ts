import assert from 'node:assert/strict';
import test from 'node:test';

process.env.DATABASE_URL ??= 'postgres://towerdog-test.invalid/towerdog';

const {
  canClaimFirstProTransition,
  getTowerdogRewardDecision,
  shouldCreateTowerdogProReward,
} = await import('../server/services/towerdog-milestone-rewards');

test('sandbox access does not create a Towerdog Pro reward decision', () => {
  assert.equal(shouldCreateTowerdogProReward('TOWER', true), false);
  assert.equal(shouldCreateTowerdogProReward('TOWER', false), true);
  assert.equal(shouldCreateTowerdogProReward('OTHER', false), false);
});

test('a live activation can claim after sandbox Pro access', () => {
  const sandboxState = {
    isPro: true,
    proSubscriptionStartDate: new Date('2026-09-18T00:00:00.000Z'),
    proSubscriptionSandbox: true,
  };

  assert.equal(canClaimFirstProTransition(sandboxState, true), false);
  assert.equal(canClaimFirstProTransition(sandboxState, false), true);
});

test('a live Pro account cannot claim a second first-Pro decision', () => {
  const liveState = {
    isPro: true,
    proSubscriptionStartDate: new Date('2026-09-18T00:00:00.000Z'),
    proSubscriptionSandbox: false,
  };

  assert.equal(canClaimFirstProTransition(liveState, false), false);
});

test('Towerdog reward decision snapshots wallet eligibility', () => {
  assert.deepEqual(getTowerdogRewardDecision(`  0x${'A'.repeat(40)}  `), {
    rewardMode: 'wallet',
    xpAmount: 500,
    gftAmount: 500,
    walletAddress: `0x${'a'.repeat(40)}`,
    status: 'pending',
  });
  assert.deepEqual(getTowerdogRewardDecision(null), {
    rewardMode: 'xp_only',
    xpAmount: 750,
    gftAmount: 0,
    walletAddress: null,
    status: 'xp_only',
  });
});