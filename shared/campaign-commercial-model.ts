export type CampaignPriority = "high" | "medium" | "off";
export type CampaignContentType = "clip" | "reel" | "screenshot" | "stream" | "review" | "feedback";
export type CommercialObjective = {
  type: CampaignContentType;
  quantity: number;
  mandatory: boolean;
  title: string;
  description: string;
  validation: string;
  xpReward: number;
};

export type CommercialPreset = {
  slug: "quick-creator" | "content-boost" | "creator-showcase" | "custom-campaign";
  priceFromPence: number | null;
  label: string;
  estimatedCreatorMin: number | null;
  estimatedCreatorMax: number | null;
  expectedApprovedDeliverablesPerCreator: { min: number; max: number } | null;
  campaignDurationDays: number | null;
  applicationPeriodDays: number | null;
  overview: string;
  content: string[];
  bestFor: string[];
  visibility: string;
  objectives: readonly CommercialObjective[];
};

/**
 * The objective quantities a creator must complete are a saved campaign
 * configuration, not a campaign-level estimate. Keep zero-valued objectives
 * out of this snapshot so consumers cannot accidentally render them as
 * requirements.
 */
export function getPresetObjectiveSnapshot(
  preset: Pick<CommercialPreset, "objectives">,
): Record<string, number> {
  return Object.fromEntries(
    preset.objectives
      .filter(objective => Number.isFinite(objective.quantity) && objective.quantity > 0)
      .map(objective => [objective.type, Math.floor(objective.quantity)]),
  );
}

export function getPresetSubmissionEstimate(preset: CommercialPreset) {
  if (
    preset.estimatedCreatorMin == null ||
    preset.estimatedCreatorMax == null ||
    !preset.expectedApprovedDeliverablesPerCreator
  ) return null;
  const roundToFive = (value: number) => Math.ceil(value / 5) * 5;
  return {
    creatorMin: preset.estimatedCreatorMin,
    creatorMax: preset.estimatedCreatorMax,
    submissionMin: roundToFive(preset.estimatedCreatorMin * preset.expectedApprovedDeliverablesPerCreator.min),
    submissionMax: roundToFive(preset.estimatedCreatorMax * preset.expectedApprovedDeliverablesPerCreator.max),
    durationDays: preset.campaignDurationDays,
  };
}

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
      reel: 0,
      screenshot: 1,
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
      estimatedCreatorMin: 3,
      estimatedCreatorMax: 5,
      expectedApprovedDeliverablesPerCreator: { min: 3, max: 3 },
      campaignDurationDays: 7,
      applicationPeriodDays: 30,
      overview: "A small first campaign to get creators playing and creating around your game.",
      content: ["Gameplay clips", "Screenshots", "Creator feedback"],
      bestFor: ["First creator content", "Demos", "Early Access"],
      visibility: "Standard campaign visibility",
      objectives: [
        { type: "clip", quantity: 2, mandatory: true, title: "Upload 2 Gameplay Clips", description: "Upload 2 gameplay clips tagged with the game", validation: "manual_review", xpReward: 500 },
        { type: "screenshot", quantity: 1, mandatory: true, title: "Upload 1 Screenshot", description: "Upload 1 screenshot from the game", validation: "manual_review", xpReward: 250 },
        { type: "feedback", quantity: 1, mandatory: false, title: "Submit Creator Feedback", description: "Submit first impressions via the feedback form", validation: "form_submission", xpReward: 500 },
      ],
    },
    {
      slug: "content-boost",
      priceFromPence: 2500,
      label: "PAID CAMPAIGN",
      estimatedCreatorMin: 5,
      estimatedCreatorMax: 10,
      expectedApprovedDeliverablesPerCreator: { min: 4, max: 3.5 },
      campaignDurationDays: 14,
      applicationPeriodDays: 30,
      overview: "Build a reusable content library with greater creator reach.",
      content: ["Gameplay clips", "Vertical reels", "Screenshots", "Creator feedback"],
      bestFor: ["Marketing libraries", "Updates", "Game discovery"],
      visibility: "Enhanced campaign visibility",
      objectives: [
        { type: "clip", quantity: 2, mandatory: true, title: "Upload 2 Gameplay Clips", description: "Upload 2 gameplay clips tagged with the game", validation: "manual_review", xpReward: 750 },
        { type: "reel", quantity: 1, mandatory: true, title: "Upload 1 Vertical Reel", description: "Create and upload 1 vertical gameplay reel", validation: "manual_review", xpReward: 1000 },
        { type: "screenshot", quantity: 1, mandatory: true, title: "Upload 1 Screenshot", description: "Upload 1 screenshot from the game", validation: "manual_review", xpReward: 250 },
        { type: "feedback", quantity: 1, mandatory: false, title: "Submit Creator Feedback", description: "Submit impressions via the feedback form", validation: "form_submission", xpReward: 1000 },
      ],
    },
    {
      slug: "creator-showcase",
      priceFromPence: 5000,
      label: "PREMIUM CAMPAIGN",
      estimatedCreatorMin: 10,
      estimatedCreatorMax: 20,
      expectedApprovedDeliverablesPerCreator: { min: 4, max: 3.5 },
      campaignDurationDays: 21,
      applicationPeriodDays: 30,
      overview: "Generate deeper creator engagement for your biggest moments.",
      content: ["Gameplay clips", "Vertical reels", "Screenshots", "Livestreams", "Creator reviews"],
      bestFor: ["Full launches", "Major updates", "DLC", "Seasonal events"],
      visibility: "Featured campaign visibility",
      objectives: [
        { type: "clip", quantity: 1, mandatory: true, title: "Upload 1 Gameplay Clip", description: "Upload 1 gameplay clip tagged with the game", validation: "manual_review", xpReward: 750 },
        { type: "reel", quantity: 1, mandatory: true, title: "Upload 1 Vertical Reel", description: "Create and upload 1 vertical gameplay reel", validation: "manual_review", xpReward: 1250 },
        { type: "screenshot", quantity: 1, mandatory: true, title: "Upload 1 Screenshot", description: "Upload 1 screenshot from the game", validation: "manual_review", xpReward: 250 },
        { type: "stream", quantity: 1, mandatory: true, title: "Stream the Game", description: "Stream the game live for at least 30 minutes", validation: "stream_duration", xpReward: 3500 },
        { type: "review", quantity: 1, mandatory: true, title: "Submit Creator Review", description: "Submit a written or video review", validation: "form_submission", xpReward: 1250 },
      ],
    },
    {
      slug: "custom-campaign",
      priceFromPence: 1000,
      label: "FROM £10",
      estimatedCreatorMin: null,
      estimatedCreatorMax: null,
      expectedApprovedDeliverablesPerCreator: null,
      campaignDurationDays: null,
      applicationPeriodDays: null,
      overview: "Choose your budget and let Gamefolio build a recommended creator campaign around it.",
      content: ["Choose your content mix"],
      bestFor: ["Specific content goals", "Flexible launches"],
      visibility: "Campaign visibility scales with budget",
      objectives: [],
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