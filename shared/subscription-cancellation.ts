// Social sign-in accounts do not have a user-chosen Gamefolio password. The
// authenticated session and final confirmation authorise cancellation, just
// as they already do in Settings and the server cancellation endpoint.
export function requiresCancellationPassword(authProvider: string | null | undefined): boolean {
  return !authProvider || authProvider === "local";
}
