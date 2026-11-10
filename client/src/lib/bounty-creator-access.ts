import { isCampaignCreatorParticipationRestricted, isLoopbackBountyHost } from "@shared/campaign-access";

export function isBountyCreatorParticipationRestricted(user: unknown): boolean {
  const localPreview = import.meta.env.DEV && isLoopbackBountyHost(window.location.hostname);
  return isCampaignCreatorParticipationRestricted(user, localPreview);
}
