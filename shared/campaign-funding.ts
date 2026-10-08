export const CAMPAIGN_PLATFORM_FEE_RATE = 0.2;
export const CAMPAIGN_CREATOR_POOL_RATE = 0.8;

export function calculateCampaignFunding(grossAmountPence: number, creatorCapacity: number) {
  if (!Number.isSafeInteger(grossAmountPence) || grossAmountPence < 0) throw new Error('Invalid campaign amount');
  if (!Number.isSafeInteger(creatorCapacity) || creatorCapacity < 1) throw new Error('Invalid creator capacity');
  const platformFeePence = Math.round(grossAmountPence * CAMPAIGN_PLATFORM_FEE_RATE);
  const creatorPoolPence = grossAmountPence - platformFeePence;
  const payoutPerCreatorPence = Math.floor(creatorPoolPence / creatorCapacity);
  return {
    grossAmountPence,
    platformFeePence,
    creatorPoolPence,
    creatorCapacity,
    payoutPerCreatorPence,
    roundingRemainderPence: creatorPoolPence - payoutPerCreatorPence * creatorCapacity,
  };
}
