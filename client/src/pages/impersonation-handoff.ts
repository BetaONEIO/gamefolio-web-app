export function getImpersonationTokenFromLocation(search: string, hash: string): string | null {
  const fragmentToken = new URLSearchParams(hash.replace(/^#/, "")).get("token");
  if (fragmentToken) return fragmentToken;

  // Compatibility for a hand-off opened by an older admin bundle during a
  // rolling deployment. The page scrubs this form immediately after reading.
  return new URLSearchParams(search).get("token");
}

export function isConfirmedImpersonationUser(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const impersonatedBy = (value as { impersonatedBy?: unknown }).impersonatedBy;
  if (!impersonatedBy || typeof impersonatedBy !== "object") return false;
  const marker = impersonatedBy as { adminId?: unknown; adminUsername?: unknown };
  return Number.isInteger(marker.adminId) && typeof marker.adminUsername === "string";
}
