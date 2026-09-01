export const LEADERBOARD_REWARDS = {
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

const configuredPayoutTotal = LEADERBOARD_REWARDS.payouts.reduce(
  (total, payout) => total + payout.amount,
  0,
);

if (
  LEADERBOARD_REWARDS.payouts.length !== 10 ||
  configuredPayoutTotal !== LEADERBOARD_REWARDS.prizePool
) {
  throw new Error(
    `Invalid leaderboard reward configuration: expected 10 payouts totaling ${LEADERBOARD_REWARDS.prizePool} ${LEADERBOARD_REWARDS.currency}, got ${LEADERBOARD_REWARDS.payouts.length} totaling ${configuredPayoutTotal}`,
  );
}

export function getProjectedGftReward(rank: number): number | null {
  return LEADERBOARD_REWARDS.payouts.find((payout) => payout.rank === rank)?.amount ?? null;
}

export function formatGftReward(amount: number): string {
  return `${amount.toLocaleString("en-US")} ${LEADERBOARD_REWARDS.currency}`;
}