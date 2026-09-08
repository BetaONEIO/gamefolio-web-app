export const CAMPAIGN_HERO_FALLBACK =
  "linear-gradient(135deg, rgba(184,255,27,0.12) 0%, rgba(7,11,16,1) 100%)";

const CAMPAIGN_HERO_SOURCE_FIELDS = [
  "hero_artwork_url",
  "game_profile_header_artwork_url",
  "catalog_game_artwork_url",
  "game_profile_capsule_artwork_url",
  "game_profile_screenshot_artwork_url",
  "game_artwork_url",
  "artwork_url",
  "campaign_artwork_url",
] as const;

export function campaignHeroSources(campaign: Record<string, unknown>): string[] {
  return Array.from(new Set(
    CAMPAIGN_HERO_SOURCE_FIELDS
      .map((field) => campaign[field])
      .filter((source): source is string => typeof source === "string" && source.trim().length > 0),
  ));
}

export function nextCampaignHeroSource(sources: string[], failedSource: string): string | null {
  const failedIndex = sources.indexOf(failedSource);
  return sources.slice(failedIndex + 1).find(Boolean) ?? null;
}