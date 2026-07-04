// Partner-tier access helpers, shared by client (UI gating) and server (route guards).
//
// Model:
//   isPartner   — boolean, has a paid partner entitlement (already includes Pro perks)
//   partnerType — which one: "streamer" | "indie" | null
//
// A partner-only dashboard gates on BOTH: the entitlement (isPartner) AND the
// specific type (partnerType). This is deliberately independent of `userType`
// (self-selected onboarding personas) — e.g. a "streamer" persona tag does NOT
// make someone a paid Streamer Partner.

export const PARTNER_TYPES = ["streamer", "indie"] as const;
export type PartnerType = (typeof PARTNER_TYPES)[number];

// Minimal shape we need — avoids importing the full User type into callers.
export interface PartnerAccessUser {
  isPartner?: boolean | null;
  partnerType?: string | null;
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
