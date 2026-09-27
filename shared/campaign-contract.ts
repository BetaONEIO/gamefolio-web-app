export type CanonicalCampaignAccessMethod =
  | "demo_to_full"
  | "full_game_upfront"
  | "public_demo"
  | "free_to_play"
  | "private_playtest"
  | "custom_access";

export const DEFAULT_CAMPAIGN_REMINDER_THRESHOLDS_HOURS = [72, 48, 24, 6] as const;

export function normalizeCampaignReminderThresholds(value: unknown): number[] {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      value = trimmed.slice(1, -1).split(",").filter(Boolean);
    } else {
      try { value = JSON.parse(trimmed); } catch { value = undefined; }
    }
  }
  if (!Array.isArray(value)) return [...DEFAULT_CAMPAIGN_REMINDER_THRESHOLDS_HOURS];
  return Array.from(new Set(value.map(Number).filter((hours) => Number.isFinite(hours) && hours > 0 && hours <= 365 * 24)))
    .sort((a, b) => b - a);
}

const ACCESS_ALIASES: Record<string, CanonicalCampaignAccessMethod> = {
  demo_to_full: "demo_to_full",
  full_upfront: "full_game_upfront",
  full_game_upfront: "full_game_upfront",
  public_demo: "public_demo",
  free_to_play: "free_to_play",
  private_playtest: "private_playtest",
  custom: "custom_access",
  custom_access: "custom_access",
};

/**
 * The campaign wizard has used several names over time. Normalize at the
 * server boundary so old drafts and new clients share one persisted contract.
 */
export function normalizeCampaignInput(input: Record<string, any>): {
  accessMethod?: CanonicalCampaignAccessMethod;
  completionRewardKeyRequired?: boolean;
  creatorDeadlineDays?: number;
  objectiveSnapshot?: Record<string, number>;
  accessInstructions?: string;
  requiresAccessKey?: boolean;
} {
  const rawAccess = input.accessMethod ?? input.access_model;
  const accessMethod = rawAccess == null ? undefined : ACCESS_ALIASES[String(rawAccess)];
  const completionRewardKeyRequired = input.completionRewardKeyRequired ??
    input.completionFullGameKey;
  const creatorDeadlineRaw = input.creatorDeadlineDays ?? input.completionDeadlineDays;
  const creatorDeadlineDays = creatorDeadlineRaw == null ? undefined : Number(creatorDeadlineRaw);
  const objectiveSnapshot = input.objectiveSnapshot ?? input.customObjectives;
  const accessInstructions = input.accessInstructions ?? input.customAccessInstructions;
  const requiresAccessKeyRaw = input.requiresAccessKey ?? input.customAccessNeedsKey;
  return {
    accessMethod,
    completionRewardKeyRequired: completionRewardKeyRequired == null
      ? undefined
      : Boolean(completionRewardKeyRequired),
    creatorDeadlineDays: Number.isFinite(creatorDeadlineDays) ? creatorDeadlineDays : undefined,
    objectiveSnapshot,
    accessInstructions: accessInstructions == null ? undefined : String(accessInstructions),
    requiresAccessKey: requiresAccessKeyRaw == null ? undefined : Boolean(requiresAccessKeyRaw),
  };
}

export function isKeyRequiredAccessMethod(method: string | undefined): boolean {
  return ["demo_to_full", "full_game_upfront", "private_playtest", "custom_access"].includes(method ?? "");
}

export function canClaimCompletionKey(
  status: string | undefined,
  mandatoryTotal: number,
  mandatoryApproved: number,
): boolean {
  return ['completed', 'completed_and_verified', 'full_game_awarded'].includes(status ?? '') &&
    mandatoryApproved >= mandatoryTotal;
}