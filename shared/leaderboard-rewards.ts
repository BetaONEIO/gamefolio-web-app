export const LEADERBOARD_REWARDS = {
  currency: "GFT",
  prizePool: 40_000,
  payouts: [
    { rank: 1, amount: 10_000 },
    { rank: 2, amount: 7_000 },
    { rank: 3, amount: 5_000 },
    { rank: 4, amount: 4_000 },
    { rank: 5, amount: 3_200 },
    { rank: 6, amount: 2_800 },
    { rank: 7, amount: 2_400 },
    { rank: 8, amount: 2_200 },
    { rank: 9, amount: 1_800 },
    { rank: 10, amount: 1_600 },
  ],
} as const;

const SUMMER_SHOWDOWN_REWARDS = {
  currency: "GFT",
  prizePool: 20_000,
  payouts: [
    { rank: 1, amount: 5_000 },
    { rank: 2, amount: 3_500 },
    { rank: 3, amount: 2_500 },
    { rank: 4, amount: 2_000 },
    { rank: 5, amount: 1_600 },
    { rank: 6, amount: 1_400 },
    { rank: 7, amount: 1_200 },
    { rank: 8, amount: 1_100 },
    { rank: 9, amount: 900 },
    { rank: 10, amount: 800 },
  ],
} as const;

function validateRewardPlan(plan: { currency: string; prizePool: number; payouts: readonly { rank: number; amount: number }[] }) {
  const configuredPayoutTotal = plan.payouts.reduce((total, payout) => total + payout.amount, 0);
  if (plan.payouts.length !== 10 || configuredPayoutTotal !== plan.prizePool) {
    throw new Error(
      `Invalid leaderboard reward configuration: expected 10 payouts totaling ${plan.prizePool} ${plan.currency}, got ${plan.payouts.length} totaling ${configuredPayoutTotal}`,
    );
  }
}

validateRewardPlan(LEADERBOARD_REWARDS);
validateRewardPlan(SUMMER_SHOWDOWN_REWARDS);

export function getLeaderboardRewardsForSeason(internalSeasonNumber: number) {
  return internalSeasonNumber === 8 ? SUMMER_SHOWDOWN_REWARDS : LEADERBOARD_REWARDS;
}

export function getProjectedGftReward(rank: number, internalSeasonNumber?: number): number | null {
  const plan = internalSeasonNumber === undefined
    ? LEADERBOARD_REWARDS
    : getLeaderboardRewardsForSeason(internalSeasonNumber);
  return plan.payouts.find((payout) => payout.rank === rank)?.amount ?? null;
}

export function formatGftReward(amount: number): string {
  return `${amount.toLocaleString("en-US")} ${LEADERBOARD_REWARDS.currency}`;
}