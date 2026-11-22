export const DEFAULT_STUDIO_BANNER_URL = "/api/static/telegram-cloud-photo-size-4-5929334272504744521-y_1749637964973.jpg";

type StudioArtworkGame = {
  isPrimary?: boolean | null;
  isFeatured?: boolean | null;
  headerImageUrl?: string | null;
  capsuleImageUrl?: string | null;
  catalogImageUrl?: string | null;
};

/** Both the editor and public page resolve the same studio/banner source. */
export function studioBannerSources(bannerUrl: string | null | undefined, games: readonly StudioArtworkGame[]): string[] {
  const custom = bannerUrl?.trim();
  if (custom && custom !== DEFAULT_STUDIO_BANNER_URL) return [custom];
  const game = games.find(game => game.isPrimary || game.isFeatured) || games[0];
  return Array.from(new Set([game?.headerImageUrl, game?.capsuleImageUrl, game?.catalogImageUrl].filter((url): url is string => !!url?.trim())));
}
