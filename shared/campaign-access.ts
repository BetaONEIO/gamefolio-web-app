/**
 * Campaign creator-access policy shared by the client and campaign API.
 */
export function isLoopbackBountyHost(hostname: string | undefined): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "[::1]";
}

export function isCampaignCreatorParticipationRestricted(user: any, localDeveloperTesting = false): boolean {
  const username = String(user?.username ?? "").trim().toLowerCase();
  if (localDeveloperTesting && username === "indiedev") return false;

  // Temporary design-preview exception. Remove once the campaign screens are ready.
  if (username === "indiedevgf") {
    return false;
  }

  const role = String(user?.role ?? "").toLowerCase();
  if (role === "admin" || role === "moderator") return false;
  return role === "indie_developer"
    || String(user?.partner_type ?? user?.partnerType ?? "").toLowerCase() === "indie"
    || Boolean(user?.is_indie_dev_subscriber ?? user?.isIndieDevSubscriber);
}
