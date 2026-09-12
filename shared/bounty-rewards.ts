export type BountyRewardObjective = {
  contentType: string;
  unitReward: number;
};

export type BountyRewardConfig = {
  slug: "quick-creator" | "content-boost" | "creator-showcase";
  totalReward: number;
  completionBonus: number;
  objectives: Record<string, BountyRewardObjective>;
};

export const BOUNTY_REWARD_CONFIG: Record<BountyRewardConfig["slug"], BountyRewardConfig> = {
  "quick-creator": {
    slug: "quick-creator",
    totalReward: 3_000,
    completionBonus: 1_000,
    objectives: {
      clip: { contentType: "clip", unitReward: 500 },
      screenshot: { contentType: "screenshot", unitReward: 250 },
      feedback: { contentType: "feedback", unitReward: 500 },
    },
  },
  "content-boost": {
    slug: "content-boost",
    totalReward: 7_500,
    completionBonus: 1_500,
    objectives: {
      clip: { contentType: "clip", unitReward: 750 },
      reel: { contentType: "reel", unitReward: 1_000 },
      screenshot: { contentType: "screenshot", unitReward: 250 },
      feedback: { contentType: "feedback", unitReward: 1_000 },
    },
  },
  "creator-showcase": {
    slug: "creator-showcase",
    totalReward: 15_000,
    completionBonus: 3_500,
    objectives: {
      clip: { contentType: "clip", unitReward: 750 },
      reel: { contentType: "reel", unitReward: 1_250 },
      screenshot: { contentType: "screenshot", unitReward: 250 },
      stream: { contentType: "stream", unitReward: 3_500 },
      feedback: { contentType: "feedback", unitReward: 1_250 },
    },
  },
};

export function getBountyRewardConfig(slug: string | null | undefined): BountyRewardConfig | null {
  if (!slug) return null;
  return BOUNTY_REWARD_CONFIG[slug as BountyRewardConfig["slug"]] ?? null;
}

export function calculateBountyObjectiveTotal(
  config: BountyRewardConfig,
  quantities: Record<string, number>,
): number {
  return Object.entries(config.objectives).reduce(
    (total, [contentType, objective]) => total + objective.unitReward * Math.max(Number(quantities[contentType] ?? 0), 0),
    0,
  );
}