import { GAME_PLATFORM_LINKS } from "./indie-game-links";
import { Gamepad2, Handshake, UserRound, UsersRound } from 'lucide-react';

export function gameProfileBountyFactIcon(label: string) {
  if (label === 'Single-player' || label === '1 player') return UserRound;
  if (label === 'Co-op') return Handshake;
  if (label === 'Multiplayer' || /\bplayers$/.test(label)) return UsersRound;
  return Object.values(GAME_PLATFORM_LINKS).find(platform => platform.label === label)?.icon ?? Gamepad2;
}

type GameProfileDetails = {
  shortDescription?: unknown;
  fullDescription?: unknown;
  genres?: unknown;
  platforms?: unknown;
  tags?: unknown;
  keyFeatures?: unknown;
};

/** Build the marketplace chips from the same fields the developer edits in Game Profile. */
export function gameProfileBountyDetails(profile: GameProfileDetails) {
  const labels = (values: unknown): string[] => Array.isArray(values)
    ? values.filter((value): value is string => typeof value === 'string' && Boolean(value.trim())).map(value => value.trim())
    : [];
  const genres = labels(profile.genres);
  const platforms = labels(profile.platforms).map(platform => GAME_PLATFORM_LINKS[platform.toLowerCase()]?.label ?? platform);
  const description = [profile.shortDescription, profile.fullDescription]
    .find((value): value is string => typeof value === 'string' && Boolean(value.trim()))?.trim();
  const modeTags = [...labels(profile.tags), ...labels(profile.keyFeatures), ...genres];
  const modes = [
    ['Single-player', /^(single[- ]?player|solo)$/i],
    ['Multiplayer', /^(?:(?:online|local) )?(multi[- ]?player|pvp)$/i],
    ['Co-op', /^(?:(?:online|local|couch) )?(co[- ]?op|cooperative)(?: multiplayer)?$/i],
  ] as const;
  const playerModes = modes.filter(([, pattern]) => modeTags.some(tag => pattern.test(tag))).map(([label]) => label);
  // Recognize an explicit single-player description without inferring modes from mentions of other games.
  const profileCopy = [description, profile.fullDescription].filter(Boolean).join(' ');
  if (!playerModes.includes('Single-player') && /(?:^|[•.!?])\s*(?:a |an )?(?:[a-z-]+,\s*)?single[- ]player\b/i.test(profileCopy)) {
    playerModes.unshift('Single-player');
  }
  const playerCounts = modeTags.flatMap(tag => {
    const count = tag.match(/^(up to )?(\d+(?:\s*[-–]\s*\d+)?)[- ]+players?(?: (?:online|local|multiplayer|co[- ]?op))?$/i);
    if (!count) return [];
    const number = count[2].replace(/\s*[-–]\s*/g, '–');
    return [`${count[1] ? 'Up to ' : ''}${number} ${number === '1' ? 'player' : 'players'}`];
  });
  const otherGenres = genres.filter(genre => !modes.some(([, pattern]) => pattern.test(genre)));
  const facts = Array.from(new Set([...playerModes, ...playerCounts, ...otherGenres.slice(0, 2), ...platforms.slice(0, 2)]));

  return { description, facts };
}
