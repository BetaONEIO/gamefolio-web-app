export const STREAMER_PLACE_PRESETS = [1, 3, 5, 10] as const;
export const SELF_SERVICE_STREAMER_LIMIT = 10;
export function streamerCapacityError(places: unknown, existingPlaces?: number): string | null {
  if (!Number.isSafeInteger(places) || Number(places) < 1) return 'Choose a whole number of streamer places.';
  if (existingPlaces != null && places === existingPlaces) return null;
  return Number(places) > SELF_SERVICE_STREAMER_LIMIT ? 'Self-service campaigns support up to 10 streamer places. Request a custom campaign for more.' : null;
}
export function streamPotentialOutput(places: number, minutes: number) {
  return { streams: places, coverageHours: places * minutes / 60 };
}
