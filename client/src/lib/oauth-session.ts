import type { QueryClient } from "@tanstack/react-query";

type OAuthUser = { id?: number | string | null };

/**
 * Publish an OAuth login only after older auth reads are cancelled and the
 * server confirms that the new session is available to subsequent requests.
 */
export async function finalizeOAuthSession<TUser extends OAuthUser>(
  queryClient: Pick<QueryClient, "cancelQueries" | "setQueryData">,
  expectedUser: OAuthUser,
  verifySession: () => Promise<TUser>,
): Promise<TUser> {
  await queryClient.cancelQueries({ queryKey: ["/api/user"], exact: true });
  const authenticatedUser = await verifySession();

  if (!authenticatedUser?.id || authenticatedUser.id !== expectedUser.id) {
    throw new Error("OAuth sign-in completed, but the authenticated session could not be verified");
  }

  queryClient.setQueryData(["/api/user"], authenticatedUser);
  return authenticatedUser;
}
