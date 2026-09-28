export const FORCED_ONBOARDING_USERNAMES = ["streamerpartnerob"] as const;

export type OnboardingPath = "gamer" | "speedrunner" | "streamer" | "indie";

export function isGamingOnboardingPath(path: OnboardingPath | null | undefined): boolean {
  return path === "gamer" || path === "speedrunner";
}

export function buildOnboardingUserType(
  path: OnboardingPath | null | undefined,
  gamerInterests: string[] = [],
): string {
  if (path === "gamer") return gamerInterests.length > 0 ? gamerInterests.join(",") : "gamer";
  if (path === "speedrunner") {
    return gamerInterests.reduce(
      (tags, interest) => {
        if (!tags.includes(interest)) tags.push(interest);
        return tags;
      },
      ["speedrunner"],
    ).join(",");
  }
  if (path === "streamer") return "streamer";
  if (path === "indie") return "indie_developer";
  return "viewer";
}

export function alwaysRequiresOnboarding(username: string | null | undefined): boolean {
  return typeof username === "string"
    && FORCED_ONBOARDING_USERNAMES.includes(username.toLowerCase() as typeof FORCED_ONBOARDING_USERNAMES[number]);
}