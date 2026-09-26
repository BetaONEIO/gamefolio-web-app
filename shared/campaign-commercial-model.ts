export type CampaignPriority = "high" | "medium" | "off";
export type CampaignContentType = "clip" | "reel" | "screenshot" | "stream" | "review" | "feedback";
export type StreamPlatform = "twitch" | "kick" | "youtube";
export type StreamCampaignConfiguration = {
  requiredMinutes: number;
  allowedPlatforms: StreamPlatform[];
  allowAccumulatedTime: boolean;
  maximumSessions: number;
  reconnectionGraceMinutes: number;
  requirePublicVod: boolean;
  vodRetentionDays: number;
  requireGameMatch: boolean;
  requireTitleMention: boolean;
  requireDeveloperApproval: boolean;
  requireClipFromStream: boolean;
  instructions: string;
};

export type StreamRecommendedCompletionXpOptions = {
  baseCompletionXp?: number;
  streamObjectiveCount?: number;
  clipObjectiveCount?: number;
  additionalContentCount?: number;
};

export type StreamCampaignEstimate = {
  estimatedStreamers: { min: number; max: number };
  requiredKeys: { demoAccess: number; fullGameAccess: number; fullGameReward: number; total: number };
  minimumLiveCoverageMinutes: number;
  potentialMaximumLiveCoverageMinutes: number;
  estimatedClips: { min: number; max: number } | null;
  campaignDurationDays: number;
  completionXpPerCreator: number;
  totalXpRewardPool: { min: number; max: number };
  estimatesGuaranteed: false;
};

const STREAM_RECOMMENDED_XP = {
  xpPerHour: 3_500,
  xpPerAdditionalSession: 500,
  xpForPublicVod: 500,
  xpPerRequiredClip: 750,
  xpPerAdditionalContentObjective: 250,
  roundingIncrement: 250,
} as const;

export function calculateStreamRecommendedCompletionXp(
  configuration: StreamCampaignConfiguration,
  options: StreamRecommendedCompletionXpOptions = {},
): number {
  const streamObjectiveCount = Math.max(1, Math.floor(options.streamObjectiveCount ?? 1));
  const clipObjectiveCount = Math.max(
    configuration.requireClipFromStream ? streamObjectiveCount : 0,
    Math.floor(options.clipObjectiveCount ?? 0),
  );
  const additionalContentCount = Math.max(0, Math.floor(options.additionalContentCount ?? 0));
  const rawXp = Math.max(0, options.baseCompletionXp ?? 0)
    + STREAM_RECOMMENDED_XP.xpPerHour * configuration.requiredMinutes / 60 * streamObjectiveCount
    + STREAM_RECOMMENDED_XP.xpPerAdditionalSession * Math.max(0, configuration.maximumSessions - 1) * streamObjectiveCount
    + (configuration.requirePublicVod ? STREAM_RECOMMENDED_XP.xpForPublicVod : 0)
    + STREAM_RECOMMENDED_XP.xpPerRequiredClip * clipObjectiveCount
    + STREAM_RECOMMENDED_XP.xpPerAdditionalContentObjective * additionalContentCount;
  return Math.ceil(rawXp / STREAM_RECOMMENDED_XP.roundingIncrement) * STREAM_RECOMMENDED_XP.roundingIncrement;
}

export function calculateStreamCampaignEstimate(
  configuration: StreamCampaignConfiguration,
  input: {
    streamerCapacity: number;
    campaignDurationDays: number;
    completionXpPerCreator: number;
    streamObjectiveCount?: number;
    clipObjectiveCount?: number;
    requiresDemoAccessKey?: boolean;
    requiresFullGameAccessKey?: boolean;
    requiresFullGameRewardKey?: boolean;
  },
): StreamCampaignEstimate {
  const streamerCapacity = Math.max(1, Math.floor(input.streamerCapacity));
  const minStreamers = Math.max(1, Math.floor(streamerCapacity * 0.6));
  const maxStreamers = streamerCapacity;
  const streamObjectiveCount = Math.max(1, Math.floor(input.streamObjectiveCount ?? 1));
  const clipObjectiveCount = Math.max(
    configuration.requireClipFromStream ? streamObjectiveCount : 0,
    Math.floor(input.clipObjectiveCount ?? 0),
  );
  const clipsPerCreatorMaximum = configuration.requireClipFromStream
    ? Math.max(clipObjectiveCount, configuration.maximumSessions)
    : clipObjectiveCount;
  const requiredKeys = {
    demoAccess: input.requiresDemoAccessKey ? streamerCapacity : 0,
    fullGameAccess: input.requiresFullGameAccessKey ? streamerCapacity : 0,
    fullGameReward: input.requiresFullGameRewardKey ? streamerCapacity : 0,
    total: 0,
  };
  requiredKeys.total = requiredKeys.demoAccess + requiredKeys.fullGameAccess + requiredKeys.fullGameReward;
  const completionXpPerCreator = Math.max(0, Math.floor(input.completionXpPerCreator));
  return {
    estimatedStreamers: { min: minStreamers, max: maxStreamers },
    requiredKeys,
    minimumLiveCoverageMinutes: minStreamers * configuration.requiredMinutes * streamObjectiveCount,
    potentialMaximumLiveCoverageMinutes: maxStreamers * configuration.requiredMinutes
      * configuration.maximumSessions * streamObjectiveCount,
    estimatedClips: clipObjectiveCount > 0
      ? {
          min: minStreamers * clipObjectiveCount,
          max: maxStreamers * clipsPerCreatorMaximum,
        }
      : null,
    campaignDurationDays: Math.max(1, Math.floor(input.campaignDurationDays)),
    completionXpPerCreator,
    totalXpRewardPool: {
      min: minStreamers * completionXpPerCreator,
      max: maxStreamers * completionXpPerCreator,
    },
    estimatesGuaranteed: false,
  };
}

export const DEFAULT_STREAM_CAMPAIGN_CONFIGURATION: StreamCampaignConfiguration = {
  requiredMinutes: 60,
  allowedPlatforms: ["twitch", "kick", "youtube"],
  allowAccumulatedTime: true,
  maximumSessions: 2,
  reconnectionGraceMinutes: 5,
  requirePublicVod: false,
  vodRetentionDays: 30,
  requireGameMatch: false,
  requireTitleMention: false,
  requireDeveloperApproval: true,
  requireClipFromStream: false,
  instructions: "",
};

export function normalizeStreamCampaignConfiguration(
  value: unknown,
): { configuration: StreamCampaignConfiguration | null; error: string | null } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { configuration: null, error: "Livestream requirements must be an object" };
  }
  const input = value as Record<string, unknown>;
  const allowedKeys = [
    "requiredMinutes", "allowedPlatforms", "allowAccumulatedTime", "maximumSessions",
    "reconnectionGraceMinutes", "requirePublicVod", "vodRetentionDays", "requireGameMatch",
    "requireTitleMention", "requireDeveloperApproval", "requireClipFromStream", "instructions",
  ];
  if (Object.keys(input).some(key => !allowedKeys.includes(key))) {
    return { configuration: null, error: "Livestream requirements contain unsupported fields" };
  }
  const integer = (field: string, min: number, max: number) => {
    const candidate = input[field];
    return typeof candidate === "number" && Number.isInteger(candidate) && candidate >= min && candidate <= max;
  };
  if (!integer("requiredMinutes", 15, 480)) {
    return { configuration: null, error: "Required streaming time must be between 15 and 480 minutes" };
  }
  if (!Array.isArray(input.allowedPlatforms) ||
      input.allowedPlatforms.some(platform => !["twitch", "kick", "youtube"].includes(String(platform))) ||
      new Set(input.allowedPlatforms).size !== input.allowedPlatforms.length ||
      input.allowedPlatforms.length < 1) {
    return { configuration: null, error: "Select at least one supported streaming platform" };
  }
  for (const field of [
    "allowAccumulatedTime", "requirePublicVod", "requireGameMatch", "requireTitleMention",
    "requireDeveloperApproval", "requireClipFromStream",
  ]) {
    if (typeof input[field] !== "boolean") {
      return { configuration: null, error: `Livestream setting ${field} must be a boolean` };
    }
  }
  if (!integer("maximumSessions", 1, 5)) {
    return { configuration: null, error: "Maximum streaming sessions must be between 1 and 5" };
  }
  if (!input.allowAccumulatedTime && input.maximumSessions !== 1) {
    return { configuration: null, error: "Maximum sessions must be 1 when accumulated streaming time is disabled" };
  }
  if (!integer("reconnectionGraceMinutes", 0, 30)) {
    return { configuration: null, error: "Reconnection grace must be between 0 and 30 minutes" };
  }
  if (!integer("vodRetentionDays", 1, 365)) {
    return { configuration: null, error: "VOD retention must be between 1 and 365 days" };
  }
  if (typeof input.instructions !== "string" || input.instructions.length > 2000) {
    return { configuration: null, error: "Livestream instructions must be 2,000 characters or fewer" };
  }
  return {
    configuration: {
      requiredMinutes: input.requiredMinutes as number,
      allowedPlatforms: [...input.allowedPlatforms] as StreamPlatform[],
      allowAccumulatedTime: input.allowAccumulatedTime as boolean,
      maximumSessions: input.maximumSessions as number,
      reconnectionGraceMinutes: input.reconnectionGraceMinutes as number,
      requirePublicVod: input.requirePublicVod as boolean,
      vodRetentionDays: input.vodRetentionDays as number,
      requireGameMatch: input.requireGameMatch as boolean,
      requireTitleMention: input.requireTitleMention as boolean,
      requireDeveloperApproval: input.requireDeveloperApproval as boolean,
      requireClipFromStream: input.requireClipFromStream as boolean,
      instructions: input.instructions.trim(),
    },
    error: null,
  };
}
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
  slug: "quick-creator" | "content-boost" | "stream-spotlight" | "creator-showcase" | "custom-campaign";
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
  const estimateSubmissions = (value: number) => preset.slug === "stream-spotlight" ? value : roundToFive(value);
  return {
    creatorMin: preset.estimatedCreatorMin,
    creatorMax: preset.estimatedCreatorMax,
    submissionMin: estimateSubmissions(preset.estimatedCreatorMin * preset.expectedApprovedDeliverablesPerCreator.min),
    submissionMax: estimateSubmissions(preset.estimatedCreatorMax * preset.expectedApprovedDeliverablesPerCreator.max),
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
      slug: "stream-spotlight",
      priceFromPence: 1000,
      label: "STREAMING CAMPAIGN",
      estimatedCreatorMin: 3,
      estimatedCreatorMax: 5,
      expectedApprovedDeliverablesPerCreator: { min: 1, max: 1 },
      campaignDurationDays: 14,
      applicationPeriodDays: 30,
      overview: "Bring your game to life with focused creator livestreams and clear, developer-defined requirements.",
      content: ["Creator livestreams", "Platform-specific requirements", "Optional stream clips"],
      bestFor: ["Game launches", "Major updates", "Live events"],
      visibility: "Enhanced campaign visibility",
      objectives: [
        { type: "stream", quantity: 1, mandatory: true, title: "Stream the Game", description: "Livestream the game for the configured minimum duration", validation: "manual_review", xpReward: 3500 },
        { type: "clip", quantity: 0, mandatory: false, title: "Upload a Clip from the Stream", description: "Upload a gameplay clip captured during the livestream", validation: "manual_review", xpReward: 750 },
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