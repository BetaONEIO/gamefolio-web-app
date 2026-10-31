/**
 * User rows include the credential hash used by authentication. Admin tools
 * need the rest of the account record, but the hash must never cross the API
 * boundary—even for an authenticated administrator.
 */
export function sanitizeAdminUser<T extends object | null | undefined>(user: T): T extends object ? Omit<T, "password"> : T {
  if (!user || typeof user !== "object") return user as any;
  const { password: _password, ...safeUser } = user as T & { password?: unknown };
  return safeUser as any;
}

export function sanitizeAdminUsers<T extends object>(users: T[]): Array<Omit<T, "password">> {
  return users.map(user => sanitizeAdminUser(user));
}
