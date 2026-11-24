import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CAMPAIGN_CREATOR_POOL_RATE,
  CAMPAIGN_PLATFORM_FEE_RATE,
  calculateCampaignFunding,
} from '../shared/campaign-funding';

test('campaign funding reserves 20% for Gamefolio and 80% for creators', () => {
  assert.equal(CAMPAIGN_PLATFORM_FEE_RATE, 0.2);
  assert.equal(CAMPAIGN_CREATOR_POOL_RATE, 0.8);
  assert.deepEqual(calculateCampaignFunding(10_000, 5), {
    grossAmountPence: 10_000,
    platformFeePence: 2_000,
    creatorPoolPence: 8_000,
    creatorCapacity: 5,
    payoutPerCreatorPence: 1_600,
    roundingRemainderPence: 0,
  });
});

test('campaign funding never allocates more than the creator pool', () => {
  const allocation = calculateCampaignFunding(1_001, 3);
  assert.equal(allocation.platformFeePence, 200);
  assert.equal(allocation.creatorPoolPence, 801);
  assert.equal(allocation.payoutPerCreatorPence, 267);
  assert.equal(allocation.roundingRemainderPence, 0);
  assert.equal(
    allocation.payoutPerCreatorPence * allocation.creatorCapacity + allocation.roundingRemainderPence,
    allocation.creatorPoolPence,
  );
});

test('campaign funding rejects invalid amounts and capacities', () => {
  assert.throws(() => calculateCampaignFunding(-1, 1), /Invalid campaign amount/);
  assert.throws(() => calculateCampaignFunding(1000, 0), /Invalid creator capacity/);
});
