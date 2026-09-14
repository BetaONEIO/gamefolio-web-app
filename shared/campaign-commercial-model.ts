export type CampaignPriority = "high" | "medium" | "off";
export type CampaignContentType = "clip" | "reel" | "screenshot" | "stream" | "review" | "feedback";

export type CommercialPreset = {
  slug: "quick-creator" | "content-boost" | "creator-showcase" | "custom-campaign";
  priceFromPence: number | null;
  label: string;
  creatorReach: string;
  estimatedContent: string;
  campaignLength: string;
  overview: string;
  content: string[];
  bestFor: string[];
  visibility: string;
};

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
  presets: [
    {
      slug: "quick-creator",
      priceFromPence: null,
      label: "INCLUDED WITH PRO",
      creatorReach: "3–5 creators",
      estimatedContent: "~5 pieces",
      campaignLength: "7 days",
      overview: "A small first campaign to get creators playing and making useful content around your game.",
      content: ["Gameplay clips", "Screenshots", "Creator feedback"],
      bestFor: ["First creator content", "Demos", "Early Access"],
      visibility: "Standard campaign visibility",
    },
    {
      slug: "content-boost",
      priceFromPence: 2500,
      label: "PAID CAMPAIGN",
      creatorReach: "5–10 creators",
      estimatedContent: "~8–15 pieces",
      campaignLength: "14 days",
      overview: "Build a larger, reusable content library with more reach and greater campaign visibility.",
      content: ["Gameplay clips", "Vertical reels", "Screenshots", "Creator feedback"],
      bestFor: ["Marketing libraries", "Updates", "Game discovery"],
      visibility: "Enhanced campaign visibility",
    },
    {
      slug: "creator-showcase",
      priceFromPence: 5000,
      label: "PREMIUM CAMPAIGN",
      creatorReach: "10–20 creators",
      estimatedContent: "~15–30 pieces",
      campaignLength: "21 days",
      overview: "Generate deeper creator engagement and premium coverage for your biggest moments.",
      content: ["Gameplay clips", "Vertical reels", "Screenshots", "Livestreams", "Creator reviews"],
      bestFor: ["Full launches", "Major updates", "DLC", "Seasonal events"],
      visibility: "Featured campaign visibility",
    },
    {
      slug: "custom-campaign",
      priceFromPence: 1000,
      label: "FROM £10",
      creatorReach: "Flexible",
      estimatedContent: "Dynamic",
      campaignLength: "Recommended",
      overview: "Choose your budget and let Gamefolio recommend a creator campaign around it.",
      content: ["Choose your content mix"],
      bestFor: ["Specific content goals", "Flexible launches"],
      visibility: "Campaign visibility scales with budget",
    },
  ] satisfies readonly CommercialPreset[],
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