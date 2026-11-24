export function availabilityValues(value: unknown): string[] {
  const values = Array.isArray(value) ? value : [value];
  return values.filter((item): item is string => typeof item === 'string')
    .map(item => item.trim()).filter(Boolean);
}

export function bountyGameAvailabilityIssue(platforms: unknown, regions: unknown): string | null {
  const missingPlatforms = !availabilityValues(platforms).length;
  const missingRegions = !availabilityValues(regions).length;
  if (!missingPlatforms && !missingRegions) return null;
  const missing = missingPlatforms && missingRegions ? 'supported platforms and available regions'
    : missingPlatforms ? 'supported platforms' : 'available regions';
  return `Add ${missing} in Game Profile before opening this bounty.`;
}
