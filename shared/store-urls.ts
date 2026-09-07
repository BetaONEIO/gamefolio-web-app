/**
 * Validation for the store links on an indie game profile.
 *
 * These fields are separate columns (steamUrl / itchUrl / epicUrl / websiteUrl)
 * and the import routines key off them — _mapSteamData reads a Steam app id out
 * of steamUrl, the Epic importer expects a store.epicgames.com slug — so a link
 * pasted into the wrong field is not merely untidy, it silently breaks import.
 * Nothing checked the host before, so an itch.io link sat happily in epicUrl.
 *
 * Shared between client and server deliberately: the client uses it for inline
 * feedback while typing, the server enforces it, and neither can drift.
 */

export type StoreField =
  | "steamUrl"
  | "itchUrl"
  | "epicUrl"
  | "websiteUrl"
  | "twitterUrl"
  | "discordUrl"
  | "youtubeUrl"
  | "twitchUrl"
  | "instagramUrl"
  | "facebookUrl"
  | "tiktokUrl";

type Rule = {
  label: string;
  /** Accepted hosts. A leading "." means "this domain or any subdomain". */
  hosts?: string[];
  example: string;
};

const RULES: Record<StoreField, Rule> = {
  steamUrl: {
    label: "Steam",
    hosts: ["store.steampowered.com", "steamcommunity.com"],
    example: "https://store.steampowered.com/app/367520/Hollow_Knight/",
  },
  itchUrl: {
    label: "itch.io",
    hosts: [".itch.io"],
    example: "https://yourstudio.itch.io/your-game",
  },
  epicUrl: {
    label: "Epic Games",
    hosts: ["store.epicgames.com", ".epicgames.com"],
    example: "https://store.epicgames.com/en-US/p/your-game",
  },
  websiteUrl: {
    // Any host — this is the developer's own site.
    label: "Website",
    example: "https://yourgame.com",
  },
  twitterUrl: {
    label: "X",
    example: "https://x.com/yourgame",
  },
  discordUrl: {
    label: "Discord",
    example: "https://discord.gg/yourgame",
  },
  youtubeUrl: {
    label: "YouTube",
    example: "https://youtube.com/@yourgame",
  },
  twitchUrl: {
    label: "Twitch",
    example: "https://twitch.tv/yourgame",
  },
  instagramUrl: {
    label: "Instagram",
    example: "https://instagram.com/yourgame",
  },
  facebookUrl: {
    label: "Facebook",
    example: "https://facebook.com/yourgame",
  },
  tiktokUrl: {
    label: "TikTok",
    example: "https://tiktok.com/@yourgame",
  },
};

const hostMatches = (host: string, pattern: string): boolean =>
  pattern.startsWith(".")
    ? host === pattern.slice(1) || host.endsWith(pattern)
    : host === pattern;

function normalizeUrlValue(value: unknown): string {
  const raw = String(value ?? "")
    .trim()
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/^<(.+)>$/, "$1")
    .trim();
  return raw && !/^https?:\/\//i.test(raw) ? `https://${raw}` : raw;
}

/** Normalizes every supported profile URL present on a patch before persistence. */
export function normalizeProfileUrls(patch: Record<string, any>): Record<string, any> {
  for (const field of Object.keys(RULES) as StoreField[]) {
    if (field in patch && patch[field] != null) {
      patch[field] = normalizeUrlValue(patch[field]);
    }
  }
  return patch;
}

/**
 * Returns null when the value is acceptable (including empty — these fields are
 * optional), or a human-readable message naming the field that is wrong.
 */
export function validateStoreUrl(field: StoreField, value: string | null | undefined): string | null {
  if (value == null) return null;
  // Links copied from chat clients and rich-text editors can carry invisible
  // zero-width characters or be wrapped as <https://...>. Normalize those
  // presentation-only characters before checking the real destination.
  const normalized = normalizeUrlValue(value);
  if (normalized === "") return null;

  const rule = RULES[field];
  if (!rule) return null;

  // Accept a bare "store.steampowered.com/..." by assuming https, matching what
  // people paste out of a browser's address bar.
  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    return `${rule.label} link is not a valid URL. Example: ${rule.example}`;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return `${rule.label} link must start with http:// or https://`;
  }

  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");

  if (rule.hosts && !rule.hosts.some(h => hostMatches(host, h))) {
    // Name what they actually pasted — the common mistake is a right URL in the
    // wrong box, and "that's an itch.io link" is more use than "invalid URL".
    const actual = (Object.entries(RULES) as [StoreField, Rule][])
      .find(([f, r]) => f !== field && r.hosts?.some(h => hostMatches(host, h)));
    if (actual) {
      const article = /^[aeiou]/i.test(actual[1].label) ? "an" : "a";
      return `That looks like ${article} ${actual[1].label} link, not ${rule.label}. Put it in the ${actual[1].label} field instead.`;
    }
    return `${rule.label} link must point at ${rule.hosts.map(h => h.replace(/^\./, "")).join(" or ")}. Example: ${rule.example}`;
  }

  return null;
}

/** Validates every store field present on a patch. Returns [] when all are fine. */
export function validateStoreUrls(patch: Record<string, any>): string[] {
  const errors: string[] = [];
  for (const field of Object.keys(RULES) as StoreField[]) {
    if (field in patch) {
      const err = validateStoreUrl(field, patch[field]);
      if (err) errors.push(err);
    }
  }
  return errors;
}

export type GameSocialField =
  | "twitterUrl"
  | "discordUrl"
  | "youtubeUrl"
  | "twitchUrl"
  | "instagramUrl"
  | "facebookUrl"
  | "tiktokUrl";

/**
 * Social links are intentionally host-agnostic: developers may link to a
 * channel, community, or campaign URL hosted by the relevant service. The
 * protocol is still restricted so saved links cannot become javascript URLs.
 */
export function validateGameSocialUrl(field: GameSocialField, value: string | null | undefined): string | null {
  if (value == null || String(value).trim() === "") return null;
  const label = GAME_SOCIAL_LABELS[field];
  const raw = String(value)
    .trim()
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/^<(.+)>$/, "$1")
    .trim();
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const parsed = new URL(withScheme);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return `${label} link must start with http:// or https://`;
    }
    if (!parsed.hostname) throw new Error("missing host");
  } catch {
    return `${label} link is not a valid URL. Example: https://example.com/your-game`;
  }
  return null;
}

export function normalizeGameSocialUrls(patch: Record<string, any>): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const field of Object.keys(GAME_SOCIAL_LABELS) as GameSocialField[]) {
    if (field in patch) normalized[field] = normalizeGameSocialUrl(patch[field]);
  }
  return normalized;
}

const GAME_SOCIAL_LABELS: Record<GameSocialField, string> = {
  twitterUrl: "X",
  discordUrl: "Discord",
  youtubeUrl: "YouTube",
  twitchUrl: "Twitch",
  instagramUrl: "Instagram",
  facebookUrl: "Facebook",
  tiktokUrl: "TikTok",
};

export function normalizeGameSocialUrl(value: string | null | undefined): string {
  const raw = String(value ?? "")
    .trim()
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/^<(.+)>$/, "$1")
    .trim();
  if (!raw) return "";
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

export function validateGameSocialUrls(patch: Record<string, any>): string[] {
  const errors: string[] = [];
  for (const field of Object.keys(GAME_SOCIAL_LABELS) as GameSocialField[]) {
    if (field in patch) {
      const error = validateGameSocialUrl(field, patch[field]);
      if (error) errors.push(error);
    }
  }
  return errors;
}
