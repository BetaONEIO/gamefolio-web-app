export type StreamPlatform = "twitch" | "kick" | "youtube" | "rumble";

export type StreamCampaignConfig = {
  requiredMinutes: number;
  allowedPlatforms: StreamPlatform[];
  allowAccumulatedTime: boolean;
  maximumSessions: number;
  reconnectionGraceMinutes: number;
  requirePublicVod: boolean;
  vodRetentionDays: number | null;
  requireGameMatch: boolean;
  requireTitleMention: boolean;
  requireDeveloperApproval: boolean;
  requireClipFromStream: boolean;
  instructions: string | null;
};

export type StreamSessionInput = {
  streamedAt: string;
  startedAt: string;
  endedAt: string;
  claimedMinutes: number;
  streamUrl: string;
  vodUrl?: string | null;
  evidenceImage?: string | null;
  notes?: string | null;
};

export type StreamReviewEvidence = {
  verifiedMinutes: number;
  detectedGame?: string;
};

export type CanonicalStreamSubmission = {
  platform: StreamPlatform;
  connectedChannelId: string;
  platformStreamId?: string | null;
  streamUrl: string;
  vodUrl?: string | null;
  sessions: StreamSessionInput[];
  claimedMinutes: number;
  verifiedMinutes: number | null;
  verificationMethod: "developer";
  verificationStatus: "needs_review" | "verified";
  detectedGame: string | null;
  streamTitle: string | null;
  notes?: string | null;
  evidenceImage?: string | null;
};

type ConnectedChannel = {
  platform: StreamPlatform;
  channelId: string;
  channelName: string | null;
};

const PLATFORM_HOSTS: Record<StreamPlatform, Set<string>> = {
  twitch: new Set(["twitch.tv", "www.twitch.tv", "m.twitch.tv"]),
  kick: new Set(["kick.com", "www.kick.com"]),
  youtube: new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"]),
  rumble: new Set(["rumble.com", "www.rumble.com"]),
};

function isRecord(value: unknown): value is Record<string, any> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function parseValue(value: unknown): any {
  if (typeof value !== "string") return value;
  try { return JSON.parse(value); } catch { return value; }
}

function boundedInteger(value: unknown, fallback: number, minimum: number, maximum: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : fallback;
}

function bool(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function parseStreamCampaignConfig(value: unknown): StreamCampaignConfig | null {
  const config = parseValue(value);
  if (!isRecord(config) || Object.keys(config).length === 0) return null;
  const allowedPlatforms = Array.isArray(config.allowedPlatforms)
    ? Array.from(new Set(config.allowedPlatforms.map((platform: unknown) => String(platform).toLowerCase())
        .filter((platform: string): platform is StreamPlatform =>
          platform === "twitch" || platform === "kick" || platform === "youtube" || platform === "rumble")))
    : [];
  return {
    requiredMinutes: boundedInteger(config.requiredMinutes, 60, 1, 720),
    allowedPlatforms,
    allowAccumulatedTime: bool(config.allowAccumulatedTime, true),
    maximumSessions: boundedInteger(config.maximumSessions, 2, 1, 10),
    reconnectionGraceMinutes: boundedInteger(config.reconnectionGraceMinutes, 5, 0, 30),
    requirePublicVod: bool(config.requirePublicVod),
    vodRetentionDays: config.vodRetentionDays == null
      ? null : boundedInteger(config.vodRetentionDays, 1, 1, 3650),
    requireGameMatch: bool(config.requireGameMatch),
    requireTitleMention: bool(config.requireTitleMention),
    requireDeveloperApproval: bool(config.requireDeveloperApproval, true),
    requireClipFromStream: bool(config.requireClipFromStream),
    instructions: typeof config.instructions === "string" ? config.instructions.trim().slice(0, 4000) || null : null,
  };
}

export function getConnectedStreamChannels(profile: any): ConnectedChannel[] {
  if (!isRecord(profile)) return [];
  const candidates: Array<ConnectedChannel | null> = [
    profile.twitch_verified && (profile.twitch_user_id || profile.twitch_channel_id)
      ? { platform: "twitch", channelId: String(profile.twitch_user_id ?? profile.twitch_channel_id), channelName: profile.twitch_channel_name ?? profile.stream_channel_name ?? null }
      : null,
    profile.kick_verified && (profile.kick_id || profile.kick_channel_id)
      ? { platform: "kick", channelId: String(profile.kick_id ?? profile.kick_channel_id), channelName: profile.kick_channel_name ?? profile.stream_channel_name ?? null }
      : null,
    profile.youtube_verified && profile.youtube_channel_id
      ? { platform: "youtube", channelId: String(profile.youtube_channel_id), channelName: profile.youtube_channel_name ?? profile.youtube_channel_id }
      : null,
    profile.rumble_verified && profile.rumble_id
      ? { platform: "rumble", channelId: String(profile.rumble_id), channelName: profile.rumble_channel_name ?? null }
      : null,
  ];
  return candidates.filter((channel): channel is ConnectedChannel =>
    Boolean(channel && channel.channelId.trim()),
  );
}

export function normalizeStreamUrl(value: unknown, platform: StreamPlatform): string | null {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || !PLATFORM_HOSTS[platform].has(url.hostname.toLowerCase())) return null;
    if (!url.pathname || url.pathname === "/") return null;
    if (platform === "youtube" && url.hostname.toLowerCase() !== "youtu.be" &&
      !url.pathname.startsWith("/watch") && !url.pathname.startsWith("/live/") &&
      !url.pathname.startsWith("/shorts/") && !url.pathname.startsWith("/embed/") &&
      !url.pathname.startsWith("/channel/") && !url.pathname.startsWith("/@")) return null;
    if (platform === "youtube" && url.hostname.toLowerCase() === "youtu.be" && !url.pathname.slice(1)) return null;
    url.hash = "";
    return url.href;
  } catch {
    return null;
  }
}

export function streamUrlMatchesChannel(
  value: string,
  platform: StreamPlatform,
  channelName: string | null,
  channelId?: string,
): boolean {
  const normalized = normalizeStreamUrl(value, platform);
  if (!normalized || !channelName?.trim()) return false;
  const expected = channelName.trim().replace(/^@/, "").toLowerCase();
  const url = new URL(normalized);
  const segments = url.pathname.split("/").filter(Boolean);
  if (platform === "twitch") {
    if (segments[0]?.toLowerCase() === "videos" || segments[0]?.toLowerCase() === "clip") return true;
    return segments[0]?.replace(/^@/, "").toLowerCase() === expected;
  }
  if (platform === "kick") {
    return segments[0]?.replace(/^@/, "").toLowerCase() === expected;
  }
  if (platform === "rumble") {
    return segments[0]?.replace(/^@/, "").toLowerCase() === expected;
  }
  if (url.hostname.toLowerCase() === "youtu.be" || url.pathname.startsWith("/watch") ||
      url.pathname.startsWith("/live/") || url.pathname.startsWith("/shorts/") ||
      url.pathname.startsWith("/embed/")) {
    const urlChannel = url.searchParams.get("channel") || url.searchParams.get("ab_channel");
    // Common share URLs don't include the channel; their provider identity is
    // confirmed by the verified connected-channel ID and remains reviewable.
    return !urlChannel || urlChannel.replace(/^@/, "").toLowerCase() === expected ||
      Boolean(channelId && urlChannel === channelId);
  }
  if (url.pathname.startsWith("/channel/")) {
    return segments[1]?.toLowerCase() === expected || Boolean(channelId && segments[1] === channelId);
  }
  return segments[0]?.replace(/^@/, "").toLowerCase() === expected;
}

function validIsoDate(value: unknown): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(value) ||
      !/(Z|[+-]\d{2}:\d{2})$/i.test(value)) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function inferStreamPlatform(value: unknown): StreamPlatform | null {
  if (typeof value !== "string") return null;
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return (Object.keys(PLATFORM_HOSTS) as StreamPlatform[])
      .find((platform) => PLATFORM_HOSTS[platform].has(hostname)) ?? null;
  } catch {
    return null;
  }
}

function isBareChannelUrl(value: string, platform: StreamPlatform): boolean {
  try {
    const url = new URL(value);
    const segments = url.pathname.split("/").filter(Boolean);
    if (platform === "twitch") return segments.length === 1 && !["videos", "clip"].includes(segments[0].toLowerCase());
    if (platform === "kick") return segments.length === 1;
    return false;
  } catch {
    return false;
  }
}

function sessionIdentities(
  platform: StreamPlatform,
  connectedChannelId: string | null,
  platformStreamId: string | null,
  session: Record<string, any>,
): string[] {
  const identities: string[] = [];
  const streamUrl = typeof session.streamUrl === "string" ? session.streamUrl : null;
  const startedAt = validIsoDate(session.startedAt)?.toISOString() ?? null;
  if (platformStreamId) {
    identities.push(`broadcast:${platform}:id:${platformStreamId.trim().toLowerCase()}`);
  }
  if (streamUrl && isBareChannelUrl(streamUrl, platform)) {
    if (startedAt) {
      let channelPath = "";
      try { channelPath = new URL(streamUrl).pathname.replace(/\/+$/, "").toLowerCase(); } catch { /* Checked by validation. */ }
      identities.push(`broadcast:${platform}:channel:${connectedChannelId || channelPath}:${startedAt}`);
    }
  } else if (streamUrl) {
    const streamKey = streamUrlDuplicateKey(streamUrl);
    if (streamKey) identities.push(`media:${streamKey}`);
  }
  if (typeof session.vodUrl === "string" && session.vodUrl.trim()) {
    const vodKey = streamUrlDuplicateKey(session.vodUrl);
    if (vodKey) identities.push(`media:${vodKey}`);
  }
  return identities;
}

export function validateStreamSubmission(
  value: unknown,
  options: {
    config: StreamCampaignConfig;
    channels: ConnectedChannel[];
    joinedAt: Date | string | null;
    deadline: Date | string | null;
    gameName: string | null;
  },
): { ok: true; data: CanonicalStreamSubmission; urls: string[] } | { ok: false; error: string } {
  const input = parseValue(value);
  if (!isRecord(input)) return { ok: false, error: "Stream details are required" };
  const platform = String(input.platform ?? "").toLowerCase() as StreamPlatform;
  if (!["twitch", "kick", "youtube", "rumble"].includes(platform)) {
    return { ok: false, error: "Choose Twitch, Kick, YouTube, or Rumble for this stream" };
  }
  if (!options.config.allowedPlatforms.includes(platform)) {
    return { ok: false, error: "This platform is not allowed for this campaign" };
  }
  const channel = options.channels.find((item) => item.platform === platform);
  if (!channel) return { ok: false, error: `Connect a verified ${platform} channel before submitting` };
  if (String(input.connectedChannelId ?? "") !== channel.channelId) {
    return { ok: false, error: "The submission channel does not match your verified connected account" };
  }
  if (!Array.isArray(input.sessions) || input.sessions.length === 0) {
    return { ok: false, error: "Add at least one stream session" };
  }
  if (input.sessions.length > options.config.maximumSessions) {
    return { ok: false, error: `This campaign allows up to ${options.config.maximumSessions} stream sessions` };
  }
  if (!options.config.allowAccumulatedTime && input.sessions.length !== 1) {
    return { ok: false, error: "This campaign requires one continuous livestream" };
  }

  const joinedAt = options.joinedAt == null ? null : new Date(options.joinedAt);
  const deadline = options.deadline == null ? null : new Date(options.deadline);
  if (joinedAt && !Number.isFinite(joinedAt.getTime())) return { ok: false, error: "Campaign join date is invalid" };
  if (deadline && !Number.isFinite(deadline.getTime())) return { ok: false, error: "Campaign deadline is invalid" };
  const now = Date.now();
  const seenSessionIdentities = new Set<string>();
  const sessions: StreamSessionInput[] = [];
  const allUrls: string[] = [];
  let previousSessionEnd = Number.NEGATIVE_INFINITY;

  for (const rawSession of input.sessions) {
    if (!isRecord(rawSession)) return { ok: false, error: "A stream session has invalid details" };
    const streamUrl = normalizeStreamUrl(rawSession.streamUrl, platform);
    if (!streamUrl) return { ok: false, error: `Use a secure ${platform} link for each stream session` };
    if (!streamUrlMatchesChannel(streamUrl, platform, channel.channelName, channel.channelId)) {
      return { ok: false, error: "The stream link does not match your connected channel" };
    }
    const vodUrl = rawSession.vodUrl == null || String(rawSession.vodUrl).trim() === ""
      ? null : normalizeStreamUrl(rawSession.vodUrl, platform);
    if (rawSession.vodUrl && !vodUrl) return { ok: false, error: `Use a secure ${platform} VOD link` };
    if (options.config.requirePublicVod && !vodUrl) {
      return { ok: false, error: "A public VOD link is required for every stream session" };
    }
    const startedAt = validIsoDate(rawSession.startedAt);
    const endedAt = validIsoDate(rawSession.endedAt);
    const streamedAt = validIsoDate(rawSession.streamedAt);
    if (!startedAt || !endedAt || !streamedAt) {
      return { ok: false, error: "Enter the stream date, start time, and end time with a timezone" };
    }
    if (endedAt.getTime() <= startedAt.getTime()) {
      return { ok: false, error: "Stream end time must be after its start time" };
    }
    if (startedAt.getTime() < previousSessionEnd) {
      return { ok: false, error: "Stream sessions must be ordered and cannot overlap" };
    }
    previousSessionEnd = endedAt.getTime();
    if (startedAt.getTime() > now + 5 * 60_000 || endedAt.getTime() > now + 5 * 60_000) {
      return { ok: false, error: "Stream session times cannot be in the future" };
    }
    if (streamedAt.getTime() < startedAt.getTime() - 24 * 60 * 60_000 ||
        streamedAt.getTime() > endedAt.getTime() + 24 * 60 * 60_000) {
      return { ok: false, error: "Stream date must match the stream session date" };
    }
    const identities = sessionIdentities(platform, channel.channelId, null,
      { ...rawSession, streamUrl, vodUrl, startedAt: startedAt.toISOString() });
    for (const identity of identities) {
      if (seenSessionIdentities.has(identity)) {
        return { ok: false, error: "A stream or VOD cannot be reused for multiple sessions" };
      }
      seenSessionIdentities.add(identity);
    }
    if (joinedAt && startedAt.getTime() < joinedAt.getTime()) {
      return { ok: false, error: "Stream sessions must take place after joining this campaign" };
    }
    if (deadline && endedAt.getTime() > deadline.getTime()) {
      return { ok: false, error: "Stream sessions must finish before the campaign deadline" };
    }
    const claimedMinutes = Number(rawSession.claimedMinutes);
    const elapsedMinutes = Math.floor((endedAt.getTime() - startedAt.getTime()) / 60_000);
    if (!Number.isInteger(claimedMinutes) || claimedMinutes <= 0 || claimedMinutes > 24 * 60 ||
        claimedMinutes > elapsedMinutes + options.config.reconnectionGraceMinutes) {
      return { ok: false, error: "Claimed minutes must be positive and cannot exceed the session length plus the reconnection grace period" };
    }
    const notes = typeof rawSession.notes === "string" ? rawSession.notes.trim() : "";
    if (notes.length > 2000) return { ok: false, error: "Stream notes must be 2,000 characters or fewer" };
    const evidenceImage = typeof rawSession.evidenceImage === "string" && rawSession.evidenceImage.trim()
      ? rawSession.evidenceImage.trim() : null;
    if (evidenceImage && (evidenceImage.length > 2048 || !/^https:\/\//i.test(evidenceImage))) {
      return { ok: false, error: "Supporting screenshot must use a secure image URL" };
    }
    sessions.push({
      streamedAt: streamedAt.toISOString(),
      startedAt: startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      claimedMinutes,
      streamUrl,
      vodUrl,
      evidenceImage,
      notes: notes || null,
    });
    allUrls.push(streamUrl);
  }

  const claimedMinutes = sessions.reduce((sum, session) => sum + session.claimedMinutes, 0);
  if (!Number.isInteger(input.claimedMinutes) || Number(input.claimedMinutes) !== claimedMinutes) {
    return { ok: false, error: "Claimed total must equal the sum of the session durations" };
  }
  const streamTitle = typeof input.streamTitle === "string" ? input.streamTitle.trim().slice(0, 300) || null : null;
  if (options.config.requireTitleMention) {
    const gameName = options.gameName?.trim();
    if (!streamTitle || !gameName || !streamTitle.toLocaleLowerCase().includes(gameName.toLocaleLowerCase())) {
      return { ok: false, error: "The stream title must include the campaign game name" };
    }
  }
  const outerStreamUrl = normalizeStreamUrl(input.streamUrl ?? sessions[0].streamUrl, platform);
  if (!outerStreamUrl || !streamUrlMatchesChannel(outerStreamUrl, platform, channel.channelName, channel.channelId)) {
    return { ok: false, error: "The primary stream link does not match your connected channel" };
  }
  const outerVodUrl = input.vodUrl == null || String(input.vodUrl).trim() === ""
    ? null : normalizeStreamUrl(input.vodUrl, platform);
  if (input.vodUrl && !outerVodUrl) return { ok: false, error: `Use a secure ${platform} VOD link` };
  if (options.config.requirePublicVod && !outerVodUrl) {
    return { ok: false, error: "A public VOD link is required" };
  }
  const notes = typeof input.notes === "string" ? input.notes.trim() : "";
  if (notes.length > 2000) return { ok: false, error: "Stream notes must be 2,000 characters or fewer" };
  const evidenceImage = typeof input.evidenceImage === "string" && input.evidenceImage.trim()
    ? input.evidenceImage.trim() : null;
  if (evidenceImage && (evidenceImage.length > 2048 || !/^https:\/\//i.test(evidenceImage))) {
    return { ok: false, error: "Supporting screenshot must use a secure image URL" };
  }
  if (outerVodUrl) allUrls.push(outerVodUrl);
  return {
    ok: true,
    urls: Array.from(new Set(allUrls)),
    data: {
      platform,
      connectedChannelId: channel.channelId,
      platformStreamId: null,
      streamUrl: outerStreamUrl,
      vodUrl: outerVodUrl,
      sessions,
      claimedMinutes,
      verifiedMinutes: null,
      verificationMethod: "developer",
      verificationStatus: "needs_review",
      detectedGame: null,
      streamTitle,
      notes: notes || null,
      evidenceImage,
    },
  };
}

export function streamSubmissionMeetsDuration(value: unknown, requiredMinutes: number): boolean {
  const data = parseValue(value);
  return isRecord(data) && Number.isInteger(data.claimedMinutes) &&
    data.claimedMinutes >= Math.max(1, requiredMinutes);
}

export function streamSubmissionUrls(value: unknown): string[] {
  const data = parseValue(value);
  if (!isRecord(data)) return [];
  const urls = new Set<string>();
  if (typeof data.streamUrl === "string") urls.add(data.streamUrl);
  if (typeof data.vodUrl === "string") urls.add(data.vodUrl);
  if (Array.isArray(data.sessions)) {
    for (const session of data.sessions) {
      if (!isRecord(session)) continue;
      if (typeof session.streamUrl === "string") urls.add(session.streamUrl);
      if (typeof session.vodUrl === "string") urls.add(session.vodUrl);
    }
  }
  const result: string[] = [];
  urls.forEach((url) => result.push(url.trim()));
  return result.filter(Boolean);
}

export function streamSubmissionIdentities(value: unknown, fallbackUrl?: string | null): string[] {
  const data = parseValue(value);
  const record = isRecord(data) ? data : {};
  const platform = (["twitch", "kick", "youtube", "rumble"].includes(String(record.platform))
    ? String(record.platform) as StreamPlatform
    : inferStreamPlatform(fallbackUrl ?? record.streamUrl)) ?? null;
  if (!platform) return [];
  const channelId = typeof record.connectedChannelId === "string" ? record.connectedChannelId : null;
  const platformStreamId = typeof record.platformStreamId === "string" ? record.platformStreamId : null;
  const sessions = Array.isArray(record.sessions) ? record.sessions : [];
  const identities: string[] = [];
  if (sessions.length) {
    for (const session of sessions) {
      if (isRecord(session)) identities.push(...sessionIdentities(platform, channelId, platformStreamId, session));
    }
    if (typeof record.streamUrl === "string") {
      const firstSession = isRecord(sessions[0]) ? sessions[0] : {};
      identities.push(...sessionIdentities(platform, channelId, platformStreamId, {
        streamUrl: record.streamUrl,
        startedAt: firstSession.startedAt,
      }));
    }
  } else if (typeof (fallbackUrl ?? record.streamUrl) === "string") {
    identities.push(...sessionIdentities(platform, channelId, platformStreamId, {
      streamUrl: fallbackUrl ?? record.streamUrl,
      vodUrl: record.vodUrl,
      startedAt: record.startedAt,
    }));
  }
  if (typeof record.vodUrl === "string" && record.vodUrl.trim()) {
    const vodKey = streamUrlDuplicateKey(record.vodUrl);
    if (vodKey) identities.push(`media:${vodKey}`);
  }
  return Array.from(new Set(identities));
}

export function validateDeveloperStreamReview(
  contentData: unknown,
  evidence: unknown,
  options: { requiredMinutes: number; requireGameMatch: boolean; gameTargets: string[] },
): { ok: true; data: Record<string, any> } | { ok: false; error: string } {
  const data = parseValue(contentData);
  if (!isRecord(data) || !Array.isArray(data.sessions) || data.sessions.length === 0) {
    return { ok: false, error: "Stream submission has no valid session evidence" };
  }
  const claimedMinutes = Number(data.claimedMinutes);
  const sessionMinutes = data.sessions.reduce((sum: number, session: any) =>
    sum + Number(session?.claimedMinutes ?? 0), 0);
  if (!Number.isInteger(claimedMinutes) || claimedMinutes <= 0 || sessionMinutes !== claimedMinutes) {
    return { ok: false, error: "Stream claimed minutes do not match the submitted sessions" };
  }
  if (!isRecord(evidence) || typeof evidence.verifiedMinutes !== "number" ||
      !Number.isInteger(evidence.verifiedMinutes) ||
      evidence.verifiedMinutes < options.requiredMinutes ||
      evidence.verifiedMinutes > claimedMinutes) {
    return { ok: false, error: `Developer-verified minutes must be between ${options.requiredMinutes} and the claimed ${claimedMinutes} minutes` };
  }
  const detectedGame = typeof evidence.detectedGame === "string" ? evidence.detectedGame.trim() : "";
  const targets = options.gameTargets.map((target) => target.trim().toLocaleLowerCase()).filter(Boolean);
  if (options.requireGameMatch &&
      (!detectedGame || !targets.includes(detectedGame.toLocaleLowerCase()))) {
    return { ok: false, error: "Enter a verified game name or category matching this campaign" };
  }
  if (detectedGame.length > 200) return { ok: false, error: "Detected game must be 200 characters or fewer" };
  return {
    ok: true,
    data: {
      ...data,
      verifiedMinutes: evidence.verifiedMinutes,
      verificationMethod: "developer",
      verificationStatus: "verified",
      detectedGame: detectedGame || null,
    },
  };
}

export function streamUrlDuplicateKey(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:") return null;
    const host = url.hostname.toLowerCase();
    if (PLATFORM_HOSTS.youtube.has(host)) {
      const segments = url.pathname.split("/").filter(Boolean);
      const youtubeId = host === "youtu.be" ? segments[0]
        : url.pathname.startsWith("/watch") ? url.searchParams.get("v")
          : ["live", "shorts", "embed"].includes(segments[0]) ? segments[1]
            : null;
      if (youtubeId) return `youtube:${youtubeId.toLowerCase()}`;
    }
    const canonicalHost = host.replace(/^www\./, "").replace(/^m\./, "");
    const pathname = url.pathname.replace(/\/+$/, "").toLowerCase();
    return `${canonicalHost}${pathname}`;
  } catch {
    return null;
  }
}