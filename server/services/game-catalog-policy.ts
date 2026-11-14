const BLOCKED_GAME_CATEGORIES = new Set([
  'always on',
  'animals, aquariums, and zoos',
  'art',
  'art world',
  'asmr',
  'beauty & body art',
  'demos',
  'djs',
  'fitness & health',
  'food & drink',
  'games + demos',
  'irl',
  'just catting',
  'just chatting',
  'makers & crafting',
  'memes',
  'music',
  'non-gaming',
  'other',
  'personal',
  'politics',
  'pools, hot tubs, and beaches',
  'science & technology',
  'slots',
  'social media',
  'special events',
  'sports',
  'stream for humanity',
  'talk shows & podcasts',
  'travel & outdoors',
]);

// Exact catalogue entries reviewed as provider noise. Keep these separate from
// keyword rules so short or unusual titles do not cause broad false positives.
const BLOCKED_GAME_TITLES = new Set([
  '# project myriam - life and explorations',
  'svg',
]);

// These markers are deliberately limited to unambiguous adult-storefront terms.
// Broader words such as "dating", "bikini", or "mature" would hide many
// legitimate games and should only be added as exact titles after review.
const EXPLICIT_TITLE_MARKERS = [
  /(?:^|\W)18\+(?:\W|$)/i,
  /(?:^|\W)adult only(?:\W|$)/i,
  /(?:^|\W)eroge(?:\W|$)/i,
  /(?:^|\W)erotic(?:\W|$)/i,
  /(?:^|\W)fetish(?:\W|$)/i,
  /(?:^|\W)hentai(?:\W|$)/i,
  /(?:^|\W)nsfw(?:\W|$)/i,
  /(?:^|\W)porn(?:ography)?(?:\W|$)/i,
  /(?:^|\W)sex(?:ual)? simulator(?:\W|$)/i,
  /(?:^|\W)xxx(?:\W|$)/i,
];

export function isBlockedGameTitle(name: string): boolean {
  const normalized = name.trim().toLocaleLowerCase('en');
  if (!normalized) return true;
  if (BLOCKED_GAME_CATEGORIES.has(normalized)) return true;
  if (BLOCKED_GAME_TITLES.has(normalized)) return true;
  return EXPLICIT_TITLE_MARKERS.some((marker) => marker.test(name));
}

export function filterAllowedGames<T extends { name: string }>(games: T[]): T[] {
  return games.filter((game) => !isBlockedGameTitle(game.name));
}
