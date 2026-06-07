/**
 * Pre-flight email verification check for user actions.
 * Returns true if the user may proceed, false if not (and shows a toast).
 */
export function requireEmailVerified(
  user: { emailVerified?: boolean | null; username?: string | null } | null | undefined,
  toast: (opts: { title: string; description: string; variant: string }) => void
): boolean {
  if (!user) return false;
  if (user.username === "demo") return true;
  if (!user.emailVerified) {
    toast({
      title: "Email verification required",
      description:
        "Please verify your email address to do this. Check your inbox for a verification link.",
      variant: "gamefolioError",
    });
    return false;
  }
  return true;
}

/**
 * Checks whether an API error response indicates an unverified email.
 */
export function isEmailVerificationError(error: unknown): boolean {
  if (!error) return false;
  const msg = error instanceof Error ? error.message : String(error);
  return msg.includes("EMAIL_NOT_VERIFIED") || msg.includes("Email verification required");
}
