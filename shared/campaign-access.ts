/**
 * Campaign creator-access policy shared by the client and campaign API.
 */
export function isCampaignCreatorParticipationRestricted(user: any): boolean {
  // Temporary design-preview exception. Remove once the campaign screens are ready.
  if (String(user?.username ?? "").trim().toLowerCase() === "indiedevgf") {
    return false;
  }

  const role = String(user?.role ?? "").toLowerCase();
  if (role === "admin" || role === "moderator") return false;
  return role === "indie_developer"
    || String(user?.partner_type ?? user?.partnerType ?? "").toLowerCase() === "indie"
    || Boolean(user?.is_indie_dev_subscriber ?? user?.isIndieDevSubscriber);
}