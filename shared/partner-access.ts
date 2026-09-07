// Partner-tier access helpers, shared by client (UI gating) and server (route guards).
//
// Model:
//   isPartner   — boolean, has a paid partner entitlement (already includes Pro perks)
//   partnerType — which one: "streamer" | "indie" | null
//
// Paid partner features gate on BOTH: the entitlement (isPartner) AND the
// specific type (partnerType). This is deliberately independent of `userType`
// (self-selected onboarding personas). The Indie dashboard is the one exception:
// it is also available to users who chose the Indie Developer onboarding persona.

export const PARTNER_TYPES = ["streamer", "indie"] as const;
export type PartnerType = (typeof PARTNER_TYPES)[number];

// Minimal shape we need — avoids importing the full User type into callers.
export interface PartnerAccessUser {
  isPartner?: boolean | null;
  partnerType?: string | null;
  role?: string | null;
  userType?: string | null;
}

/** True if the user holds a paid partner subscription of the given type. */
export function isPartnerType(
  user: PartnerAccessUser | null | undefined,
  type: PartnerType,
): boolean {
  return !!user?.isPartner && user?.partnerType === type;
}

/** True if the user holds any paid partner subscription. */
export function isAnyPartner(user: PartnerAccessUser | null | undefined): boolean {
  return !!user?.isPartner && user?.partnerType != null;
}

/**
 * True if a user may manage an Indie game. Free Indie Developer persona users
 * can manage up to the free game quota; paid Indie partners receive their
 * subscriber quota. Admins retain access for moderation and support.
 */
export function hasIndieDeveloperAccess(user: PartnerAccessUser | null | undefined): boolean {
  if (!user) return false;
  if (user.role === "admin" || isPartnerType(user, "indie")) return true;
  return user.userType
    ?.split(",")
    .map((type) => type.trim())
    .includes("indie_developer") ?? false;
}
