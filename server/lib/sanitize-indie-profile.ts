export type PublicIndieProfile<T> = T extends object ? Omit<T, "itchApiKey"> : T;

/** Remove the encrypted itch.io credential before exposing a game profile. */
export function stripIndieProfileSecrets<T extends object | null | undefined>(
  profile: T,
): PublicIndieProfile<T> {
  if (!profile || typeof profile !== "object") return profile as PublicIndieProfile<T>;
  const { itchApiKey: _itchApiKey, ...publicProfile } = profile as T & {
    itchApiKey?: unknown;
  };
  return publicProfile as PublicIndieProfile<T>;
}
