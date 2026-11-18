export type IndieDevOnboardingPath = "indie";

export interface IndieDevOfferUser {
  userType?: string | null;
  role?: string | null;
  partnerType?: string | null;
  indieDevSubscriptionStartDate?: unknown;
}

export function parseIndieDevOnboardingPath(value: unknown): IndieDevOnboardingPath | undefined {
  return value === "indie" ? value : undefined;
}

export function hasDeveloperPersona(user: IndieDevOfferUser): boolean {
  const personas = typeof user.userType === "string"
    ? user.userType.split(",").map((value) => value.trim().toLowerCase())
    : [];

  return personas.some((persona) =>
    ["indie_developer", "game_developer", "developer", "indie"].includes(persona)
  ) || ["developer", "indie_developer"].includes(String(user.role || "").toLowerCase())
    || user.partnerType === "indie";
}

export function isIndieDevIntroOfferEligible(
  user: IndieDevOfferUser | null | undefined,
  onboardingPath?: IndieDevOnboardingPath,
): boolean {
  if (!user || user.indieDevSubscriptionStartDate) return false;
  if (hasDeveloperPersona(user)) return true;

  // userType is also the onboarding-completion sentinel, so do not persist it
  // before the optional upsell. A still-unfinished account may instead declare
  // the exact path it just selected. Existing onboarded non-developers cannot
  // use this context to claim the offer.
  return !user.userType?.trim() && onboardingPath === "indie";
}
