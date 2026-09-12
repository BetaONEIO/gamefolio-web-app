export type BountyRewardObjective = {
  contentType: string;
  unitReward: number;
};

export type BountyRewardConfig = {
  slug: "quick-creator" | "content-boost" | "creator-showcase" | "custom-campaign";
  totalReward: number;
  completionBonus: number;
  objectives: Record<string, BountyRewardObjective>;
};

export type CampaignAccessMethod =
  | "demo_to_full"
  | "full_game_upfront"
  | "public_demo"
  | "free_to_play"
  | "private_playtest"
  | "custom_access";

export type CampaignObjectiveQuantities = Partial<Record<
  "clip" | "reel" | "screenshot" | "stream" | "feedback" | "review" | "bug",
  number
>>;

// Central values are intentionally server/shared constants: developers can
// choose objectives, but cannot choose arbitrary XP.
export const CUSTOM_OBJECTIVE_VALUES: Record<string, { unitReward: number; days: number; max: number }> = {
  clip: { unitReward: 500, days: 1, max: 5 },
  reel: { unitReward: 750, days: 2, max: 5 },
  screenshot: { unitReward: 200, days: 1, max: 5 },
  stream: { unitReward: 2_000, days: 3, max: 2 },
  feedback: { unitReward: 500, days: 1, max: 1 },
  review: { unitReward: 750, days: 2, max: 1 },
  bug: { unitReward: 600, days: 2, max: 3 },
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
  "custom-campaign": {
    slug: "custom-campaign",
    totalReward: 0,
    completionBonus: 0,
    objectives: {},
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

export function calculateCustomCampaign(
  quantities: CampaignObjectiveQuantities,
  completionBonus = 1_000,
): { deliverables: number; deadlineDays: number; totalXp: number; completionBonus: number; warnings: string[] } {
  const warnings: string[] = [];
  let deliverables = 0;
  let deadlineDays = 0;
  let totalXp = 0;
  for (const [type, rawQuantity] of Object.entries(quantities)) {
    const quantity = Math.max(0, Math.floor(Number(rawQuantity ?? 0)));
    if (!quantity) continue;
    const rule = CUSTOM_OBJECTIVE_VALUES[type];
    if (!rule) {
      warnings.push(`Unsupported objective type: ${type}`);
      continue;
    }
    if (quantity > rule.max) {
      warnings.push(`${type} supports at most ${rule.max} units`);
      continue;
    }
    deliverables += quantity;
    deadlineDays += rule.days * quantity;
    totalXp += rule.unitReward * quantity;
  }
  if (!deliverables) warnings.push("Select at least one objective");
  // Objectives run in parallel in a realistic campaign; cap the estimate to
  // avoid promising an unreasonable deadline.
  return {
    deliverables,
    deadlineDays: Math.max(1, Math.min(90, Math.ceil(deadlineDays * 0.6))),
    totalXp: totalXp + (deliverables ? completionBonus : 0),
    completionBonus: deliverables ? completionBonus : 0,
    warnings,
  };
}