import {
  stripUserCredentials,
  stripUsersCredentials,
  type CredentialSafeUser,
} from "./lib/sanitize-user";

/** Admin tools need account metadata, but never authentication credentials. */
export function sanitizeAdminUser<T extends object | null | undefined>(
  user: T,
): CredentialSafeUser<T> {
  return stripUserCredentials(user);
}

export function sanitizeAdminUsers<T extends object>(
  users: T[],
): Array<CredentialSafeUser<T>> {
  return stripUsersCredentials(users);
}
