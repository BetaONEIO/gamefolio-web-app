export const FORCED_ONBOARDING_USERNAMES = ["streamerpartnerob"] as const;

export type OnboardingPath = "gamer" | "streamer" | "indie";

export const ONBOARDING_FAVORITE_GAMES_MIN = 1;
export const ONBOARDING_FAVORITE_GAMES_MAX = 5;

export function toggleOnboardingGameSelection<T extends { id: number }>(
  selectedGames: T[],
  game: T,
  maxGames = ONBOARDING_FAVORITE_GAMES_MAX,
): { selectedGames: T[]; limitReached: boolean } {
  if (selectedGames.some((selected) => selected.id === game.id)) {
    return {
      selectedGames: selectedGames.filter((selected) => selected.id !== game.id),
      limitReached: false,
    };
  }

  if (selectedGames.length >= maxGames) {
    return { selectedGames, limitReached: true };
  }

  return { selectedGames: [...selectedGames, game], limitReached: false };
}

export function isGamingOnboardingPath(path: OnboardingPath | null | undefined): boolean {
  return path === "gamer";
}

export function buildOnboardingUserType(
  path: OnboardingPath | null | undefined,
  gamerInterests: string[] = [],
): string {
  if (path === "gamer") return gamerInterests.length > 0 ? gamerInterests.join(",") : "gamer";
  if (path === "streamer") return "streamer";
  if (path === "indie") return "indie_developer";
  return "viewer";
}

export function alwaysRequiresOnboarding(username: string | null | undefined): boolean {
  return typeof username === "string"
    && FORCED_ONBOARDING_USERNAMES.includes(username.toLowerCase() as typeof FORCED_ONBOARDING_USERNAMES[number]);
}