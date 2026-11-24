export function hasAdminAccess(user: unknown): boolean {
  if (!user || typeof user !== "object") return false;

  const candidate = user as { role?: unknown; isAdmin?: unknown };
  return candidate.role === "admin" || candidate.isAdmin === true;
}
