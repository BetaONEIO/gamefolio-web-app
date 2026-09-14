export type CampaignPriority = "high" | "medium" | "off";
export type CampaignContentType = "clip" | "reel" | "screenshot" | "stream" | "review" | "feedback";

export type CampaignEstimate = {
  budgetPence: number;
  campaignScale: string;
  creators: { min: number; max: number };
  totalContent: { min: number; max: number };
  suggestedDurationDays: number;
  recommendedKeys: { min: number; max: number };
  content: Record<CampaignContentType, number>;
  estimatesGuaranteed: false;
  methodologyVersion: string;
};

export const CAMPAIGN_COMMERCIAL_MODEL = {
  version: "2026-09",
  currency: "GBP",
  paidMinimumPence: 1000,
  sliderMaximumPence: 10000,
  rewardPoolContributionRate: 0.1,
  starter: {
    templateSlug: "quick-creator",
    durationDays: 7,
    creatorPlaces: 5,
    estimatedContent: {
      clip: 2,
      reel: 1,
      screenshot: 2,
      stream: 0,
      review: 0,
      feedback: 1,
    } satisfies Record<CampaignContentType, number>,
  },
  paid: {
    poundsPerExpectedCreator: 5,
    contentPerCreatorMin: 1.2,
    contentPerCreatorMax: 2,
    keyBufferRate: 0.2,
  },
} as const;

export const DEFAULT_CAMPAIGN_PRIORITIES: Record<CampaignContentType, CampaignPriority> = {
  clip: "high",
  reel: "high",
  screenshot: "medium",
  stream: "off",
  review: "off",
  feedback: "medium",
};

const PRIORITY_WEIGHTS: Record<CampaignPriority, number> = {
  high: 3,
  medium: 1.5,
  off: 0,
};

export function calculateCampaignEstimate(
  budgetPence: number,
  priorities: Record<CampaignContentType, CampaignPriority> = DEFAULT_CAMPAIGN_PRIORITIES,
): CampaignEstimate {
  const safeBudget = Math.max(CAMPAIGN_COMMERCIAL_MODEL.paidMinimumPence, Math.round(budgetPence));
  const budgetPounds = safeBudget / 100;
  const expectedCreators = Math.max(2, Math.round(budgetPounds / CAMPAIGN_COMMERCIAL_MODEL.paid.poundsPerExpectedCreator));
  const creators = {
    min: Math.max(1, Math.floor(expectedCreators * 0.75)),
    max: Math.max(2, Math.ceil(expectedCreators * 1.25)),
  };
  const totalContent = {
    min: Math.max(2, Math.floor(expectedCreators * CAMPAIGN_COMMERCIAL_MODEL.paid.contentPerCreatorMin)),
    max: Math.max(3, Math.ceil(expectedCreators * CAMPAIGN_COMMERCIAL_MODEL.paid.contentPerCreatorMax)),
  };
  const entries = Object.entries(priorities) as [CampaignContentType, CampaignPriority][];
  const totalWeight = entries.reduce((sum, [, priority]) => sum + PRIORITY_WEIGHTS[priority], 0) || 1;
  const targetPieces = Math.round((totalContent.min + totalContent.max) / 2);
  const content = Object.fromEntries(entries.map(([type, priority]) => [
    type,
    priority === "off" ? 0 : Math.max(1, Math.round(targetPieces * PRIORITY_WEIGHTS[priority] / totalWeight)),
  ])) as Record<CampaignContentType, number>;
  const keyMin = creators.max;
  const keyMax = Math.ceil(keyMin * (1 + CAMPAIGN_COMMERCIAL_MODEL.paid.keyBufferRate));

  return {
    budgetPence: safeBudget,
    campaignScale: budgetPounds < 25 ? "Focused" : budgetPounds < 60 ? "Growth" : budgetPounds < 100 ? "Momentum" : "Custom",
    creators,
    totalContent,
    suggestedDurationDays: budgetPounds < 25 ? 7 : budgetPounds < 60 ? 14 : 21,
    recommendedKeys: { min: keyMin, max: keyMax },
    content,
    estimatesGuaranteed: false,
    methodologyVersion: CAMPAIGN_COMMERCIAL_MODEL.version,
  };
}