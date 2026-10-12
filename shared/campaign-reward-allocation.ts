/** Allocate the campaign price excluding VAT. Processing fees are paid from Gamefolio's share. */
export function campaignRewardAllocation(pricePence: number) {
  if (!Number.isSafeInteger(pricePence) || pricePence < 0) throw new Error('Campaign price must be a non-negative integer in pence');
  const platformPence = Math.floor(pricePence / 5);
  return { campaignPricePence: pricePence, platformPence, creatorPoolPence: pricePence - platformPence };
}

/** Largest-remainder allocation conserves every penny and resolves ties by creator ID. */
export function allocateContributionPool(poolPence: number, contributors: { creatorId: number; approvedScore: number }[]) {
  if (!Number.isSafeInteger(poolPence) || poolPence < 0) throw new Error('Pool must be a non-negative integer in pence');
  const ids = new Set<number>();
  for (const c of contributors) {
    if (!Number.isSafeInteger(c.creatorId) || c.creatorId < 1 || ids.has(c.creatorId) || !Number.isSafeInteger(c.approvedScore) || c.approvedScore < 0) throw new Error('Invalid contributor');
    ids.add(c.creatorId);
  }
  const total = contributors.reduce((sum, c) => sum + BigInt(c.approvedScore), 0n);
  if (!total) return { payouts: contributors.map(c => ({ creatorId: c.creatorId, amountPence: 0 })), unallocatedPence: poolPence };
  const ranked = contributors.map(c => {
    const numerator = BigInt(poolPence) * BigInt(c.approvedScore);
    return { creatorId: c.creatorId, amountPence: Number(numerator / total), remainder: numerator % total };
  }).sort((a, b) => a.remainder === b.remainder ? a.creatorId - b.creatorId : a.remainder > b.remainder ? -1 : 1);
  let remaining = poolPence - ranked.reduce((sum, c) => sum + c.amountPence, 0);
  for (const c of ranked) if (remaining > 0) { c.amountPence++; remaining--; }
  return { payouts: ranked.map(({creatorId, amountPence}) => ({creatorId, amountPence})).sort((a,b)=>a.creatorId-b.creatorId), unallocatedPence: 0 };
}

import { calculateCampaignFunding } from './campaign-funding';
export const CAMPAIGN_REWARD_VERSION = 'campaign-equal-two-stage-v1';
/** Stable participation order receives remainder pennies; every funded penny is allocated. */
export function allocateCampaignCompletionRewards(totalPence: number, capacity: number, participantIds: number[]) {
  const funding = calculateCampaignFunding(totalPence, capacity);
  const ids = [...participantIds].sort((a,b)=>a-b);
  if (new Set(ids).size !== ids.length || ids.some(id=>!Number.isSafeInteger(id)||id<1) || ids.length > capacity) throw new Error('Invalid approved participants');
  if (!ids.length) return [];
  const each = Math.floor(funding.creatorPoolPence / ids.length);
  const remainder = funding.creatorPoolPence % ids.length;
  return ids.map((participantId,i)=>({participantId, guaranteedPence:funding.payoutPerCreatorPence, finalPence:each+(i<remainder?1:0), bonusPence:each+(i<remainder?1:0)-funding.payoutPerCreatorPence}));
}
export function campaignRewardExamples(totalPence:number, capacity:number) {
  const funding=calculateCampaignFunding(totalPence,capacity);
  return [...new Set([1,2,5,capacity].map(n=>Math.min(n,capacity)))].sort((a,b)=>a-b).map(count=>({count,guaranteedPence:funding.payoutPerCreatorPence,finalPence:Math.floor(funding.creatorPoolPence/count),bonusPence:Math.floor(funding.creatorPoolPence/count)-funding.payoutPerCreatorPence,hasRemainder:funding.creatorPoolPence%count!==0}));
}
