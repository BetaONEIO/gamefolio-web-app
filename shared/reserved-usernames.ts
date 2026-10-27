// Top-level application routes that must never be claimable as profile names.
// Keep comparisons case-insensitive because usernames are normalized on write.
export const RESERVED_USERNAMES = new Set([
  'lootbox',
]);

export function isReservedUsername(username: string): boolean {
  return RESERVED_USERNAMES.has(username.trim().toLowerCase());
}
