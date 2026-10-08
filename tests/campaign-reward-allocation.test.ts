import test from 'node:test';
import assert from 'node:assert/strict';
import { campaignRewardAllocation, allocateContributionPool } from '../shared/campaign-reward-allocation';
test('20 percent platform share and 80 percent creator pool preserve every penny', () => {
  assert.deepEqual(campaignRewardAllocation(3000), {campaignPricePence:3000,platformPence:600,creatorPoolPence:2400});
  const split=campaignRewardAllocation(1001); assert.equal(split.platformPence+split.creatorPoolPence,1001);
  assert.throws(()=>campaignRewardAllocation(-1));
});
test('approved contribution scores distribute the pool proportionately', () => {
  assert.deepEqual(allocateContributionPool(2400,[{creatorId:1,approvedScore:3},{creatorId:2,approvedScore:1}]).payouts,[{creatorId:1,amountPence:1800},{creatorId:2,amountPence:600}]);
});
test('rounding is deterministic and a pool without approved work stays unallocated', () => {
  const scores=[3,2,1].map(creatorId=>({creatorId,approvedScore:1}));
  assert.deepEqual(allocateContributionPool(2,scores).payouts,[{creatorId:1,amountPence:1},{creatorId:2,amountPence:1},{creatorId:3,amountPence:0}]);
  assert.equal(allocateContributionPool(500,[]).unallocatedPence,500);
  assert.throws(()=>allocateContributionPool(500,[scores[0],scores[0]]));
});
