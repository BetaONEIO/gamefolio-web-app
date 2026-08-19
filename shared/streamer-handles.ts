/**
 * Validation for the streamer channel-name fields.
 *
 * These are free-text boxes labelled "@yourname", so people reasonably paste a
 * whole channel URL, or type the leading @. Normalise both away before judging
 * the handle, then check it against the platform's own character rules — a
 * twitch.tv URL dropped into the Kick box should be caught the same way a
 * mismatched store link is on the indie side (see shared/store-urls.ts).
 *
 * Shared between client and server so the two cannot drift.
 */

export type StreamerPlatform = "twitch" | "kick" | "vpzone";

type Rule = {
  label: string;
  /** Hosts whose URLs we can pull a handle out of, and which identify the platform. */
  hosts: string[];
  pattern: RegExp;
  requirement: string;
};

const RULES: Record<StreamerPlatform, Rule> = {
  twitch: {
    label: "Twitch",
    hosts: ["twitch.tv"],
    // Twitch: 4–25 chars, letters, numbers and underscores only.
    pattern: /^[A-Za-z0-9_]{4,25}$/,
    requirement: "4–25 characters, using letters, numbers and underscores only",
  },
  kick: {
    label: "Kick",
    hosts: ["kick.com"],
    // Kick: 3–25 chars, letters, numbers and underscores.
    pattern: /^[A-Za-z0-9_]{3,25}$/,
    requirement: "3–25 characters, using letters, numbers and underscores only",
  },
  vpzone: {
    label: "VPZone",
    hosts: ["vpzone.tv", "vpzone.com", "vpzone.app"],
    // Third-party platform with no published rule — stay permissive, but still
    // reject spaces and punctuation that can never be part of a handle.
    pattern: /^[A-Za-z0-9_.-]{2,30}$/,
    requirement: "2–30 characters, using letters, numbers, and _ . - only",
  },
};

const hostMatches = (host: string, pattern: string): boolean =>
  host === pattern || host.endsWith(`.${pattern}`);

/**
 * Turns what someone pasted into a bare handle: strips a leading @, and pulls
 * the first path segment out of a channel URL. Returns the input trimmed if it
 * is not a URL. Never throws.
 */
export function normalizeStreamerHandle(value: string | null | undefined): string {
  const raw = String(value ?? "").trim();
  if (raw === "") return "";

  const withoutAt = raw.replace(/^@+/, "");

  // Only treat it as a URL if it actually looks like one, so a plain handle
  // containing dots (valid on VPZone) is not mangled.
  if (/^(https?:\/\/|www\.)/i.test(withoutAt) || /^[a-z0-9-]+\.[a-z]{2,}\//i.test(withoutAt)) {
    try {
      const url = new URL(/^https?:\/\//i.test(withoutAt) ? withoutAt : `https://${withoutAt}`);
      const segment = url.pathname.split("/").filter(Boolean)[0];
      if (segment) return decodeURIComponent(segment).replace(/^@+/, "");
    } catch {
      // fall through and treat it as a plain handle
    }
  }
  return withoutAt;
}

/** Identifies which platform a pasted URL belongs to, or null. */
function platformOfUrl(value: string): StreamerPlatform | null {
  const raw = value.trim().replace(/^@+/, "");
  if (!/^(https?:\/\/|www\.)/i.test(raw) && !/^[a-z0-9-]+\.[a-z]{2,}\//i.test(raw)) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    for (const [platform, rule] of Object.entries(RULES) as [StreamerPlatform, Rule][]) {
      if (rule.hosts.some(h => hostMatches(host, h))) return platform;
    }
  } catch {}
  return null;
}

/**
 * Returns null when acceptable (including empty — these fields are optional),
 * otherwise a human-readable message.
 */
export function validateStreamerHandle(
  platform: StreamerPlatform,
  value: string | null | undefined,
): string | null {
  const raw = String(value ?? "").trim();
  if (raw === "") return null;

  const rule = RULES[platform];
  if (!rule) return null;

  // A URL from a different platform is the informative failure — say so.
  const urlPlatform = platformOfUrl(raw);
  if (urlPlatform && urlPlatform !== platform) {
    return `That is ${/^[aeiou]/i.test(RULES[urlPlatform].label) ? "an" : "a"} ${RULES[urlPlatform].label} link, not ${rule.label}. Put it in the ${RULES[urlPlatform].label} field instead.`;
  }

  const handle = normalizeStreamerHandle(raw);
  if (handle === "") {
    return `Enter your ${rule.label} channel name.`;
  }
  if (!rule.pattern.test(handle)) {
    return `"${handle}" is not a valid ${rule.label} channel name — it must be ${rule.requirement}.`;
  }
  return null;
}
