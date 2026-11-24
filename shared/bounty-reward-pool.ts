export const GFT_POOL_SCALE = 1_000_000;

export function monthlyRewardPeriod(now: Date) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { id: start.toISOString().slice(0, 7), start, end };
}

export function rewardScore(base: number, level: number, seasonRank?: number) {
  const seasonRate = seasonRank === 1 ? 5 : seasonRank && seasonRank <= 3 ? 3 : seasonRank && seasonRank <= 10 ? 1 : 0;
  const levelRate = Math.min(5, Math.max(0, Math.floor(level / 10)));
  const seasonBonus = Math.floor(base * seasonRate / 100);
  const levelBonus = Math.floor(base * levelRate / 100);
  return { base, seasonBonus, levelBonus, total: base + seasonBonus + levelBonus };
}

// Allocate integer units without dropping the remainder or relying on floating point.
export function allocateBountyPool(units: number, creators: { userId: number; score: number }[]) {
  const eligible = creators.filter(({ score }) => score > 0);
  const total = eligible.reduce((sum, { score }) => sum + BigInt(score), BigInt(0));
  const allocations = eligible.map(({ userId, score }) => {
    const numerator = BigInt(units) * BigInt(score);
    return { userId, units: Number(numerator / total), remainder: numerator % total };
  }).sort((left, right) => left.remainder === right.remainder
    ? left.userId - right.userId
    : left.remainder > right.remainder ? -1 : 1);
  let remaining = units - allocations.reduce((sum, item) => sum + item.units, 0);
  for (const allocation of allocations) {
    if (remaining <= 0) break;
    allocation.units += 1;
    remaining -= 1;
  }
  return new Map(allocations.map(item => [item.userId, item.units]));
}

export type BountyRewardStatus = "Not yet eligible" | "Eligible" | "Reward pending" | "Calculating final share" | "Distributed";
export type BountyRewardShare = ReturnType<typeof rewardScore> & {
  approved: number;
  awaiting: number;
  share: number;
  status: BountyRewardStatus;
};
export type BountyRewardResult = {
  id: string;
  start: string;
  xp: number;
  gft: number;
  eligibleCreators: number;
  totalScore: number;
  mystery: string | null;
  personal: (BountyRewardShare & { xp: number; gft: number; mystery: string | null }) | null;
};
export type BountyRewardPoolData = {
  current: { id: string; start: string; end: string; xp: number; gft: number; hasMysteryReward: boolean };
  personal: BountyRewardShare | null;
  closing: { id: string; start: string; status: BountyRewardStatus }[];
  previous: BountyRewardResult[];
};
