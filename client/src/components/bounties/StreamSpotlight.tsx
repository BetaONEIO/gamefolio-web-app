import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle, Check, Clock3, ExternalLink, Film, ImagePlus, Loader2,
  Plus, Radio, ShieldCheck, Trash2, Tv2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export type StreamPlatform = "twitch" | "kick" | "youtube";

export type StreamCampaignConfig = {
  requiredMinutes: number;
  allowedPlatforms: StreamPlatform[];
  allowAccumulatedTime: boolean;
  maximumSessions: number;
  reconnectionGraceMinutes: number;
  requirePublicVod: boolean;
  vodRetentionDays: number;
  requireGameMatch: boolean;
  requireTitleMention: boolean;
  requireDeveloperApproval: boolean;
  requireClipFromStream: boolean;
  instructions: string;
};

export type StreamSessionDraft = {
  streamedAt: string;
  startedAt: string;
  endedAt: string;
  claimedMinutes: number;
  streamUrl: string;
  vodUrl: string;
  evidenceImage: string | null;
  notes: string;
};

export type StreamSubmissionDraft = {
  platform: StreamPlatform;
  connectedChannelId: string;
  connectedChannelName: string;
  streamTitle: string;
  streamUrl: string;
  vodUrl?: string;
  sessions: StreamSessionDraft[];
  claimedMinutes: number;
  verifiedMinutes: null;
  verificationMethod: "developer";
  verificationStatus: "needs_review";
};

const PLATFORM_INFO: Record<StreamPlatform, { label: string; color: string; icon: typeof Tv2; connectUrl: string }> = {
  twitch: { label: "Twitch", color: "#A970FF", icon: Tv2, connectUrl: "/api/auth/twitch-stream/connect" },
  kick: { label: "Kick", color: "#53FC18", icon: Radio, connectUrl: "/api/auth/kick/connect" },
  youtube: { label: "YouTube", color: "#FF5C5C", icon: Tv2, connectUrl: "/api/auth/youtube/connect" },
};

const PLATFORM_HOSTS: Record<StreamPlatform, string[]> = {
  twitch: ["twitch.tv", "www.twitch.tv"],
  kick: ["kick.com", "www.kick.com"],
  youtube: ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"],
};

function objectValue(value: unknown): Record<string, any> {
  if (typeof value === "string") {
    try { value = JSON.parse(value); } catch { return {}; }
  }
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : {};
}

export function streamCampaignConfig(campaign: any, objective?: any): StreamCampaignConfig {
  const config = objectValue(
    campaign?.stream_config
      ?? campaign?.streamConfig
      ?? objective?.stream_config
      ?? objective?.streamConfig
      ?? objective?.config,
  );
  const allowedPlatforms = Array.isArray(config.allowedPlatforms)
    ? config.allowedPlatforms.filter((platform: unknown): platform is StreamPlatform =>
      platform === "twitch" || platform === "kick" || platform === "youtube")
    : [];
  return {
    requiredMinutes: Math.max(1, Number(config.requiredMinutes) || 60),
    allowedPlatforms,
    allowAccumulatedTime: config.allowAccumulatedTime === true,
    maximumSessions: config.allowAccumulatedTime
      ? Math.min(10, Math.max(1, Number(config.maximumSessions) || 2))
      : 1,
    reconnectionGraceMinutes: Math.max(0, Number(config.reconnectionGraceMinutes) || 0),
    requirePublicVod: config.requirePublicVod === true,
    vodRetentionDays: Math.max(0, Number(config.vodRetentionDays) || 0),
    requireGameMatch: config.requireGameMatch === true,
    requireTitleMention: config.requireTitleMention === true,
    requireDeveloperApproval: config.requireDeveloperApproval !== false,
    requireClipFromStream: config.requireClipFromStream === true,
    instructions: typeof config.instructions === "string" ? config.instructions : "",
  };
}

function userConnection(user: any, platform: StreamPlatform) {
  if (platform === "twitch") {
    return user?.twitchVerified
      ? { channelId: user.twitchUserId, channelName: user.twitchChannelName || user.streamChannelName }
      : null;
  }
  if (platform === "kick") {
    return user?.kickVerified
      ? { channelId: user.kickUserId || user.kickId, channelName: user.kickChannelName || user.streamChannelName }
      : null;
  }
  return user?.youtubeVerified
    ? { channelId: user.youtubeChannelId, channelName: user.youtubeChannelName || user.youtubeChannelId }
    : null;
}

function connectedPlatforms(user: any, allowed: StreamPlatform[]) {
  return allowed.flatMap(platform => {
    const connection = userConnection(user, platform);
    return connection?.channelId
      ? [{ platform, channelId: String(connection.channelId), channelName: String(connection.channelName || connection.channelId) }]
      : [];
  });
}

export function streamSubmissionData(submission: any): Record<string, any> {
  return objectValue(submission?.content_data ?? submission?.contentData);
}

export function verifiedStreamMinutes(submissions: any[] = []) {
  return submissions.reduce((total, submission) => {
    if (submission?.status !== "approved") return total;
    return total + Math.max(0, Number(streamSubmissionData(submission).verifiedMinutes) || 0);
  }, 0);
}

function validPlatformUrl(value: string, platform: StreamPlatform) {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:"
      && url.pathname.length > 1
      && PLATFORM_HOSTS[platform].includes(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function localDateTime(isoValue: unknown) {
  if (typeof isoValue !== "string" || !isoValue) return "";
  const parsed = new Date(isoValue);
  if (Number.isNaN(parsed.getTime())) return "";
  const local = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function emptySession(): StreamSessionDraft {
  return {
    streamedAt: "",
    startedAt: "",
    endedAt: "",
    claimedMinutes: 0,
    streamUrl: "",
    vodUrl: "",
    evidenceImage: null,
    notes: "",
  };
}

function draftSessionsFromSubmission(data: Record<string, any>): StreamSessionDraft[] {
  if (!Array.isArray(data.sessions) || data.sessions.length === 0) return [emptySession()];
  return data.sessions.map((session: any) => ({
    streamedAt: localDateTime(session.streamedAt),
    startedAt: localDateTime(session.startedAt),
    endedAt: localDateTime(session.endedAt),
    claimedMinutes: Math.max(0, Number(session.claimedMinutes) || 0),
    streamUrl: String(session.streamUrl ?? data.streamUrl ?? ""),
    vodUrl: String(session.vodUrl ?? ""),
    evidenceImage: typeof session.evidenceImage === "string" ? session.evidenceImage : null,
    notes: String(session.notes ?? ""),
  }));
}

function streamStatus(submission: any) {
  const status = String(submission?.status ?? "").toLowerCase();
  if (status === "approved") return { label: "Approved", color: "#4ade80" };
  if (status === "changes_requested") return { label: "Changes requested", color: "#fbbf24" };
  if (status === "rejected") return { label: "Rejected", color: "#fca5a5" };
  if (["pending", "under_review", "submitted", "submitted_for_review"].includes(status)) {
    return { label: "Awaiting developer review", color: "#fbbf24" };
  }
  return { label: "Draft · not yet submitted for review", color: "#cbd5e1" };
}

function EligibleChannelPicker({
  platforms,
  user,
  oauthConfig,
  selectedPlatform,
  onChange,
}: {
  platforms: StreamPlatform[];
  user: any;
  oauthConfig: any;
  selectedPlatform: StreamPlatform;
  onChange: (platform: StreamPlatform) => void;
}) {
  const accounts = connectedPlatforms(user, platforms);
  const connected = new Set(accounts.map(account => account.platform));
  const missingConfiguration = platforms.filter(platform => oauthConfig?.[platform] === false);
  return (
    <div className="space-y-3">
      <label className="block text-xs font-bold text-white/75" htmlFor="stream-platform-select">Connected eligible channel</label>
      {accounts.length > 0 ? (
        <select
          id="stream-platform-select"
          value={accounts.some(account => account.platform === selectedPlatform) ? selectedPlatform : accounts[0].platform}
          onChange={event => onChange(event.target.value as StreamPlatform)}
          className="w-full rounded-lg border border-white/10 bg-[#0F101B] px-3 py-2.5 text-sm text-white outline-none focus:border-[#B9FF1A]/60"
        >
          {accounts.map(account => (
            <option key={account.platform} value={account.platform}>
              {PLATFORM_INFO[account.platform].label} · {account.channelName}
            </option>
          ))}
        </select>
      ) : (
        <div className="rounded-lg border border-amber-300/20 bg-amber-300/[0.06] p-3">
          <div className="flex items-start gap-2 text-xs leading-relaxed text-amber-100/85">
            <AlertCircle size={15} className="mt-0.5 shrink-0 text-amber-300" />
            <span>Connect an eligible streaming account to submit a stream for this campaign.</span>
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {platforms.map(platform => {
          const info = PLATFORM_INFO[platform];
          const Icon = info.icon;
          const identityMissing = platform === "youtube" && user?.youtubeVerified && !user?.youtubeChannelId;
          return connected.has(platform) ? (
            <span key={platform} className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold" style={{ color: info.color, borderColor: `${info.color}45`, background: `${info.color}10` }}>
              <Check size={11} /> {info.label} connected
            </span>
          ) : missingConfiguration.includes(platform) || identityMissing ? (
            <span key={platform} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-bold text-white/40" title={`${info.label} connection is not configured`}>
              <Icon size={12} /> {identityMissing ? `${info.label} channel ID unavailable` : `${info.label} unavailable`}
            </span>
          ) : (
            <a key={platform} href={info.connectUrl} className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black transition hover:brightness-125" style={{ color: info.color, borderColor: `${info.color}45`, background: `${info.color}10` }}>
              <Icon size={12} /> Connect {info.label}
            </a>
          );
        })}
      </div>
    </div>
  );
}

export function useStreamSpotlightEligibility(user: any, allowedPlatforms: StreamPlatform[]) {
  const { data: oauthConfig } = useQuery<any>({
    queryKey: ["/api/auth/social-oauth/config"],
    queryFn: async () => {
      const response = await fetch("/api/auth/social-oauth/config", { credentials: "include" });
      if (!response.ok) throw new Error("Could not load streaming provider availability");
      return response.json();
    },
    enabled: Boolean(user) && allowedPlatforms.length > 0,
    staleTime: 5 * 60_000,
  });
  const accounts = connectedPlatforms(user, allowedPlatforms);
  return {
    accounts,
    eligible: accounts.length > 0,
    oauthConfig,
    available: allowedPlatforms.length > 0,
  };
}

export function StreamSpotlightBrief({
  campaign,
  objective,
  user,
}: {
  campaign: any;
  objective: any;
  user: any;
}) {
  const config = streamCampaignConfig(campaign, objective);
  const eligibility = useStreamSpotlightEligibility(user, config.allowedPlatforms);
  const gameName = campaign.game_profile_name || campaign.catalog_game_name || campaign.game_name || "the game";
  const sessions = config.allowAccumulatedTime
    ? `Up to ${config.maximumSessions} sessions${config.reconnectionGraceMinutes ? ` · ${config.reconnectionGraceMinutes}-minute reconnection grace` : ""}`
    : "One continuous livestream";
  const endDate = campaign.end_date || campaign.deadline;
  return (
    <section className="mt-7 border-y border-white/[0.10] py-7" aria-label="Livestream objective">
      <div className="max-w-4xl">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#B9FF1A]">
          <Radio size={14} /> Livestream objective
        </div>
        <h2 className="mt-2 text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">Stream {gameName}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/60">
          Stream {gameName} for at least {config.requiredMinutes} minutes on an eligible platform. A developer will review the stream evidence; automatic verification is not active.
        </p>
        {config.allowedPlatforms.length === 0 ? (
          <p role="alert" className="mt-4 text-xs text-amber-200">Eligible streaming platforms are not configured for this campaign.</p>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            {config.allowedPlatforms.map(platform => {
              const info = PLATFORM_INFO[platform];
              const Icon = info.icon;
              return <span key={platform} className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold" style={{ color: info.color, borderColor: `${info.color}45`, background: `${info.color}10` }}><Icon size={13} />{info.label}</span>;
            })}
          </div>
        )}
        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div><dt className="text-[10px] font-black uppercase tracking-wider text-white/38">Required duration</dt><dd className="mt-1 font-bold text-white/80">{config.requiredMinutes} minutes</dd></div>
          <div><dt className="text-[10px] font-black uppercase tracking-wider text-white/38">Session rules</dt><dd className="mt-1 font-bold text-white/80">{sessions}</dd></div>
          <div><dt className="text-[10px] font-black uppercase tracking-wider text-white/38">Deadline</dt><dd className="mt-1 font-bold text-white/80">{endDate ? new Date(endDate).toLocaleDateString() : "See campaign deadline"}</dd></div>
          <div><dt className="text-[10px] font-black uppercase tracking-wider text-white/38">Public VOD</dt><dd className="mt-1 font-bold text-white/80">{config.requirePublicVod ? `Required${config.vodRetentionDays ? ` · available for ${config.vodRetentionDays} days` : ""}` : "Not required"}</dd></div>
          {(config.requireGameMatch || config.requireTitleMention) && (
            <div className="sm:col-span-2 lg:col-span-3">
              <dt className="text-[10px] font-black uppercase tracking-wider text-white/38">Stream requirements · developer manual review</dt>
              <dd className="mt-1 font-bold text-white/80">
                {[
                  config.requireGameMatch && "Use the correct game category (checked manually; not automatic)",
                  config.requireTitleMention && `Creator-reported title must mention ${gameName} (case-insensitive; checked manually)`,
                ].filter(Boolean).join(" · ")}
              </dd>
            </div>
          )}
          <div><dt className="text-[10px] font-black uppercase tracking-wider text-white/38">Access</dt><dd className="mt-1 font-bold text-white/80">{campaign.access_method ? String(campaign.access_method).replace(/_/g, " ") : "See campaign access"}</dd></div>
          <div><dt className="text-[10px] font-black uppercase tracking-wider text-white/38">Reward</dt><dd className="mt-1 font-bold text-white/80">{Number(campaign.total_campaign_xp ?? campaign.bounty_xp_reward ?? 0).toLocaleString()} XP</dd></div>
          {config.requireClipFromStream && <div className="flex items-center gap-2 text-white/75"><Film size={15} className="text-[#B9FF1A]" /> At least one clip from the stream is also required.</div>}
        </dl>
        {config.instructions && (
          <div className="mt-5 border-l-2 border-[#B9FF1A]/55 pl-3">
            <div className="text-[10px] font-black uppercase tracking-wider text-white/45">Developer instructions</div>
            <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-white/70">{config.instructions}</p>
            <p className="mt-2 text-[11px] text-white/40">Instructions guide your coverage; they do not require a scripted positive opinion.</p>
          </div>
        )}
        <div className="mt-5 rounded-lg border border-white/[0.08] bg-white/[0.025] p-3">
          {user ? (
            <>
              <div className="flex items-center gap-2 text-xs font-bold text-white/80">
                {eligibility.eligible ? <Check size={14} className="text-[#B9FF1A]" /> : <AlertCircle size={14} className="text-amber-300" />}
                {eligibility.eligible ? "Your connected account is eligible ✓" : "Connect an eligible streaming account to join this campaign."}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {eligibility.accounts.map(account => (
                  <span key={account.platform} className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold" style={{ color: PLATFORM_INFO[account.platform].color, borderColor: `${PLATFORM_INFO[account.platform].color}40` }}>
                    <Check size={11} /> {PLATFORM_INFO[account.platform].label} · {account.channelName}
                  </span>
                ))}
                {config.allowedPlatforms.filter(platform => !eligibility.accounts.some(account => account.platform === platform)).map(platform => {
                  const info = PLATFORM_INFO[platform];
                  const Icon = info.icon;
                  const configured = eligibility.oauthConfig?.[platform];
                  const identityMissing = platform === "youtube" && user?.youtubeVerified && !user?.youtubeChannelId;
                  return configured === false || identityMissing
                    ? <span key={platform} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-bold text-white/40"><Icon size={12} /> {identityMissing ? `${info.label} channel ID unavailable` : `${info.label} connection unavailable`}</span>
                    : <a key={platform} href={info.connectUrl} className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black transition hover:brightness-125" style={{ color: info.color, borderColor: `${info.color}45`, background: `${info.color}10` }}><Icon size={12} /> Connect {info.label}</a>;
                })}
              </div>
            </>
          ) : (
            <div className="text-xs font-bold text-white/60">Sign in and connect an eligible streaming account before starting this campaign.</div>
          )}
        </div>
      </div>
    </section>
  );
}

export function StreamSpotlightSubmissionForm({
  campaign,
  objective,
  user,
  previousSubmission,
  onSave,
  onCancel,
  busy = false,
}: {
  campaign: any;
  objective: any;
  user: any;
  previousSubmission?: any;
  onSave: (draft: StreamSubmissionDraft) => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  const { toast } = useToast();
  const config = streamCampaignConfig(campaign, objective);
  const previous = useMemo(() => streamSubmissionData(previousSubmission), [previousSubmission]);
  const gameName = String(campaign.game_profile_name || campaign.catalog_game_name || campaign.game_name || "").trim();
  const [platform, setPlatform] = useState<StreamPlatform>(
    (config.allowedPlatforms.includes(previous.platform) && previous.platform)
      || config.allowedPlatforms[0]
      || "twitch",
  );
  const [streamTitle, setStreamTitle] = useState(String(previous.streamTitle ?? ""));
  const [sessions, setSessions] = useState<StreamSessionDraft[]>(() => draftSessionsFromSubmission(previous));
  const [uploadingSession, setUploadingSession] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const eligibility = useStreamSpotlightEligibility(user, config.allowedPlatforms);
  const selectedAccount = eligibility.accounts.find(account => account.platform === platform) ?? eligibility.accounts[0];
  const effectivePlatform = selectedAccount?.platform ?? platform;
  const titleIncludesGame = Boolean(gameName && streamTitle.trim().toLowerCase().includes(gameName.toLowerCase()));
  const missingRequiredTitle = config.requireTitleMention && (!gameName || !titleIncludesGame);
  const claimedMinutes = sessions.reduce((total, session) => total + Math.max(0, Number(session.claimedMinutes) || 0), 0);
  const requiredVodMissing = config.requirePublicVod && sessions.some(session => !session.vodUrl.trim());
  const invalidUrl = sessions.some(session =>
    !validPlatformUrl(session.streamUrl, effectivePlatform)
      || (session.vodUrl.trim() && !validPlatformUrl(session.vodUrl, effectivePlatform)),
  );
  const invalidTimes = sessions.some(session => {
    const start = Date.parse(session.startedAt);
    const end = Date.parse(session.endedAt);
    return !session.startedAt || !session.endedAt || !Number.isFinite(start) || !Number.isFinite(end) || end <= start;
  });
  const canSubmit = Boolean(
    eligibility.eligible
      && config.allowedPlatforms.length > 0
      && claimedMinutes >= config.requiredMinutes
      && claimedMinutes > 0
      && sessions.length <= config.maximumSessions
      && sessions.length > 0
      && !invalidUrl
      && !invalidTimes
      && !missingRequiredTitle
      && !requiredVodMissing
      && (!config.requirePublicVod || sessions.every(session => session.vodUrl.trim())),
  );
  const updateSession = (index: number, patch: Partial<StreamSessionDraft>) => {
    setSessions(current => current.map((session, sessionIndex) =>
      sessionIndex === index ? { ...session, ...patch } : session,
    ));
  };

  const uploadEvidence = async (index: number, file: File) => {
    if (!["image/jpeg", "image/png", "image/jpg", "image/webp"].includes(file.type)) {
      setUploadError("Choose a JPG, PNG, or WebP screenshot.");
      return;
    }
    setUploadingSession(index);
    setUploadError(null);
    try {
      const body = new FormData();
      body.append("title", `${campaign.campaign_title || campaign.template_name || "Campaign"} stream evidence`);
      if (campaign.game_id) body.append("gameId", String(campaign.game_id));
      body.append("screenshot", file);
      const response = await fetch("/api/screenshots/upload", {
        method: "POST",
        credentials: "include",
        body,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.message ?? payload?.error ?? "Could not upload screenshot evidence");
      const imageUrl = payload?.screenshot?.imageUrl ?? payload?.screenshot?.thumbnailUrl;
      if (!imageUrl) throw new Error("Screenshot uploaded but no evidence image URL was returned.");
      updateSession(index, { evidenceImage: String(imageUrl) });
      toast({ title: "Screenshot added", description: "The evidence image is attached to this stream draft." });
    } catch (error: any) {
      setUploadError(error?.message ?? "Could not upload screenshot evidence.");
    } finally {
      setUploadingSession(null);
    }
  };

  const save = () => {
    if (!canSubmit || !selectedAccount) return;
    const normalizedSessions: StreamSessionDraft[] = sessions.map(session => ({
      ...session,
      streamedAt: new Date(session.startedAt).toISOString(),
      startedAt: new Date(session.startedAt).toISOString(),
      endedAt: new Date(session.endedAt).toISOString(),
      claimedMinutes: Math.floor(Number(session.claimedMinutes)),
      streamUrl: session.streamUrl.trim(),
      vodUrl: session.vodUrl.trim(),
      notes: session.notes.trim(),
    }));
    onSave({
      platform: effectivePlatform,
      connectedChannelId: selectedAccount.channelId,
      connectedChannelName: selectedAccount.channelName,
      streamTitle: streamTitle.trim(),
      streamUrl: normalizedSessions[0].streamUrl,
      ...(normalizedSessions[0].vodUrl ? { vodUrl: normalizedSessions[0].vodUrl } : {}),
      sessions: normalizedSessions,
      claimedMinutes,
      verifiedMinutes: null,
      verificationMethod: "developer",
      verificationStatus: "needs_review",
    });
  };

  return (
    <div className="mt-4 space-y-4 border-t border-white/[0.08] pt-4">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#B9FF1A]">
        <Radio size={13} /> Stream or VOD submission
      </div>
      <div className="rounded-lg border border-[#B9FF1A]/20 bg-[#B9FF1A]/[0.04] p-3">
        <div className="text-xs font-bold text-white/80">{config.requiredMinutes} minutes required · {config.allowAccumulatedTime ? `up to ${config.maximumSessions} sessions` : "one continuous stream"}</div>
        <p className="mt-1 text-[11px] leading-relaxed text-white/45">Add all stream sessions and evidence before saving. Your claimed time will be verified by the campaign developer; Gamefolio does not automatically verify streams.</p>
        {config.requireGameMatch && <p className="mt-2 text-[11px] leading-relaxed text-amber-100/75">Correct game category is required and will be checked manually by the developer; category matching is not automatic.</p>}
        {config.requireTitleMention && (
          <p className="mt-1 text-[11px] leading-relaxed text-amber-100/75">
            The stream title is entered by you and checked manually by the developer. Gamefolio does not fetch a title from Twitch, Kick, or YouTube.
          </p>
        )}
      </div>
      {config.allowedPlatforms.length > 0 && (
        <EligibleChannelPicker
          platforms={config.allowedPlatforms}
          user={user}
          oauthConfig={eligibility.oauthConfig}
          selectedPlatform={effectivePlatform}
          onChange={setPlatform}
        />
      )}
      <label className="block space-y-1 text-[10px] font-bold text-white/55">
        Stream title {config.requireTitleMention ? "· required" : "· optional"}
        <input
          type="text"
          value={streamTitle}
          onChange={event => setStreamTitle(event.target.value)}
          maxLength={300}
          placeholder={config.requireTitleMention && gameName ? `Include “${gameName}” in your stream title` : "Enter the title you used for this stream"}
          className="w-full rounded-lg border border-white/10 bg-[#0F101B] px-3 py-2 text-xs text-white outline-none placeholder:text-white/25 focus:border-[#B9FF1A]/50"
        />
        <span className="block text-[10px] font-normal leading-relaxed text-white/35">
          Creator-reported title; it is not retrieved from your streaming platform.
          {config.requireTitleMention && gameName ? ` Include “${gameName}” (case-insensitive).` : ""}
        </span>
      </label>
      {config.requireTitleMention && (
        <div role="status" className={`text-[10px] leading-relaxed ${titleIncludesGame ? "text-[#B9FF1A]" : "text-amber-200/80"}`}>
          {!gameName ? "The campaign game title is unavailable; contact the developer."
            : titleIncludesGame ? `The entered title includes “${gameName}”. A developer will still review it manually.`
            : `Enter a title that includes “${gameName}” (case-insensitive).`}
        </div>
      )}
      {config.requireGameMatch && (
        <div className="rounded-lg border border-amber-200/10 bg-amber-100/[0.03] px-3 py-2 text-[10px] leading-relaxed text-white/55">
          Select the campaign game category on your streaming platform. A developer will manually review the category; no automatic category verification is performed.
        </div>
      )}
      {sessions.map((session, index) => (
        <fieldset key={index} className="space-y-3 rounded-xl border border-white/[0.08] bg-black/20 p-3">
          <div className="flex items-center justify-between gap-3">
            <legend className="text-[10px] font-black uppercase tracking-wider text-white/65">Session {index + 1}</legend>
            {sessions.length > 1 && (
              <button type="button" onClick={() => setSessions(current => current.filter((_, i) => i !== index))} className="inline-flex items-center gap-1 text-[10px] font-bold text-white/45 hover:text-red-300">
                <Trash2 size={12} /> Remove
              </button>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-[10px] font-bold text-white/55">Stream start · date and time
              <input type="datetime-local" value={session.startedAt} onChange={event => updateSession(index, { startedAt: event.target.value, streamedAt: event.target.value })} className="w-full rounded-lg border border-white/10 bg-[#0F101B] px-3 py-2 text-xs text-white [color-scheme:dark]" />
            </label>
            <label className="space-y-1 text-[10px] font-bold text-white/55">Stream end · date and time
              <input type="datetime-local" value={session.endedAt} onChange={event => updateSession(index, { endedAt: event.target.value })} className="w-full rounded-lg border border-white/10 bg-[#0F101B] px-3 py-2 text-xs text-white [color-scheme:dark]" />
            </label>
          </div>
          <label className="block space-y-1 text-[10px] font-bold text-white/55">
            Stream URL · {PLATFORM_INFO[effectivePlatform].label}
            <input type="url" value={session.streamUrl} onChange={event => updateSession(index, { streamUrl: event.target.value })} placeholder={effectivePlatform === "twitch" ? "https://twitch.tv/your-channel" : effectivePlatform === "kick" ? "https://kick.com/your-channel" : "https://youtube.com/live/..."} className="w-full rounded-lg border border-white/10 bg-[#0F101B] px-3 py-2 text-xs text-white outline-none placeholder:text-white/25 focus:border-[#B9FF1A]/50" />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-[10px] font-bold text-white/55">{config.requirePublicVod ? "Public VOD URL · required" : "Public VOD URL · optional"}
              <input type="url" value={session.vodUrl} onChange={event => updateSession(index, { vodUrl: event.target.value })} placeholder="https://…" className="w-full rounded-lg border border-white/10 bg-[#0F101B] px-3 py-2 text-xs text-white outline-none placeholder:text-white/25 focus:border-[#B9FF1A]/50" />
            </label>
            <label className="space-y-1 text-[10px] font-bold text-white/55">Claimed minutes for this session
              <input type="number" min={1} step={1} value={session.claimedMinutes || ""} onChange={event => updateSession(index, { claimedMinutes: Number(event.target.value) })} placeholder="60" className="w-full rounded-lg border border-white/10 bg-[#0F101B] px-3 py-2 text-xs text-white outline-none placeholder:text-white/25 focus:border-[#B9FF1A]/50" />
            </label>
          </div>
          <label className="block space-y-1 text-[10px] font-bold text-white/55">Optional notes
            <textarea value={session.notes} onChange={event => updateSession(index, { notes: event.target.value })} maxLength={2000} placeholder="Anything the developer should know about this stream?" className="min-h-16 w-full rounded-lg border border-white/10 bg-[#0F101B] px-3 py-2 text-xs text-white outline-none placeholder:text-white/25 focus:border-[#B9FF1A]/50" />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-1.5 text-[10px] font-bold text-white/55 hover:text-white">
              {uploadingSession === index ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />}
              {session.evidenceImage ? "Replace supporting screenshot" : "Add supporting screenshot"}
              <input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploadingSession != null} className="sr-only" onChange={event => { const file = event.target.files?.[0]; if (file) void uploadEvidence(index, file); event.target.value = ""; }} />
            </label>
            {session.evidenceImage && (
              <a href={session.evidenceImage} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] font-bold text-[#B9FF1A]">
                <ExternalLink size={11} /> Preview evidence
              </a>
            )}
            <span className="text-[10px] text-white/30">Uploads are published to your Gamefolio profile.</span>
          </div>
          {session.evidenceImage && <img src={session.evidenceImage} alt={`Session ${index + 1} evidence screenshot`} className="max-h-36 rounded-lg border border-white/10 object-contain" />}
        </fieldset>
      ))}
      {config.allowAccumulatedTime && sessions.length < config.maximumSessions && (
        <button type="button" onClick={() => setSessions(current => [...current, emptySession()])} className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-white/15 px-3 py-2 text-xs font-bold text-white/55 hover:border-[#B9FF1A]/45 hover:text-white">
          <Plus size={13} /> Add session
        </button>
      )}
      <div className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.03] px-3 py-2.5">
        <span className="text-xs font-bold text-white/65">Claimed total</span>
        <span className="text-sm font-black tabular-nums" style={{ color: claimedMinutes >= config.requiredMinutes ? "#B9FF1A" : "#fbbf24" }}>{claimedMinutes} / {config.requiredMinutes} minutes</span>
      </div>
      {uploadError && <div role="alert" className="rounded-lg border border-red-400/20 bg-red-400/[0.06] px-3 py-2 text-xs text-red-200">{uploadError}</div>}
      {!canSubmit && (
        <div role="status" className="text-[10px] leading-relaxed text-amber-200/80">
          {!eligibility.eligible ? "Connect an eligible platform account to continue."
            : invalidTimes ? "Add a valid start and end date/time for every stream session."
            : invalidUrl ? `Enter valid HTTPS ${PLATFORM_INFO[effectivePlatform].label} links for every stream and VOD.`
            : config.requireTitleMention && !gameName ? "The campaign game title is unavailable. Contact the developer before submitting."
            : missingRequiredTitle ? `Enter a stream title that includes “${gameName}” (case-insensitive).`
            : requiredVodMissing ? "A public VOD URL is required for every session."
            : claimedMinutes < config.requiredMinutes ? `Add enough sessions to reach the required ${config.requiredMinutes} minutes before submitting.`
            : "Complete each required session field to submit."}
        </div>
      )}
      <div className="flex gap-2">
        <button type="button" onClick={save} disabled={!canSubmit || busy || uploadingSession != null} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#B9FF1A] px-4 py-2.5 text-xs font-black text-[#070b10] disabled:cursor-not-allowed disabled:opacity-40">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
          {previousSubmission ? "Save stream changes" : "Submit Stream or VOD"}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 text-xs font-bold text-white/50 hover:text-white">Cancel</button>
      </div>
    </div>
  );
}

export function StreamSpotlightSubmissionPreview({
  campaign,
  objective,
  submission,
  verifiedMinutes,
}: {
  campaign: any;
  objective: any;
  submission: any;
  verifiedMinutes: number;
}) {
  const config = streamCampaignConfig(campaign, objective);
  const stream = streamSubmissionData(submission);
  const platform = (Object.prototype.hasOwnProperty.call(PLATFORM_INFO, stream.platform) ? stream.platform : config.allowedPlatforms[0] ?? "twitch") as StreamPlatform;
  const info = PLATFORM_INFO[platform];
  const status = streamStatus(submission);
  const sessions = Array.isArray(stream.sessions) ? stream.sessions : [];
  const claimedMinutes = sessions.reduce((total: number, session: any) => total + Math.max(0, Number(session.claimedMinutes) || 0), 0)
    || Math.max(0, Number(stream.claimedMinutes) || 0);
  return (
    <div className="mt-3 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black" style={{ color: info.color, borderColor: `${info.color}45`, background: `${info.color}10` }}>
          <info.icon size={12} /> {info.label}
        </span>
        {stream.connectedChannelName && <span className="text-xs font-bold text-white/65">{stream.connectedChannelName}</span>}
        <span className="text-xs font-bold" style={{ color: status.color }}>{status.label}</span>
      </div>
      <div className="rounded-xl border border-white/[0.08] bg-black/20 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[9px] font-black uppercase tracking-wider text-white/40">Verified streaming time</div>
            <div className="mt-1 text-sm font-black text-white">{verifiedMinutes} of {config.requiredMinutes} minutes verified</div>
          </div>
          <Clock3 size={17} className="text-[#B9FF1A]" />
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
          <div className="h-full rounded-full bg-[#B9FF1A] transition-[width]" style={{ width: `${Math.min(100, verifiedMinutes / config.requiredMinutes * 100)}%` }} />
        </div>
        {claimedMinutes > verifiedMinutes && <p className="mt-2 text-[10px] text-white/40">{claimedMinutes} minutes claimed · pending developer review</p>}
      </div>
      {sessions.map((session: any, index: number) => {
        const url = String(session.vodUrl || session.streamUrl || stream.vodUrl || stream.streamUrl || "");
        return (
          <div key={`${submission.id ?? "stream"}-${index}`} className="rounded-lg border border-white/[0.08] bg-white/[0.025] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-[10px] font-black uppercase tracking-wider text-white/55">Session {index + 1} · {Number(session.claimedMinutes) || 0} claimed minutes</div>
              {session.startedAt && <div className="text-[10px] text-white/35">{new Date(session.startedAt).toLocaleString()}</div>}
            </div>
            {url && <a href={url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#B9FF1A] hover:text-white">Open stream or VOD <ExternalLink size={12} /></a>}
            {session.notes && <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-white/60">{session.notes}</p>}
            {session.evidenceImage && <a href={session.evidenceImage} target="_blank" rel="noopener noreferrer"><img src={session.evidenceImage} alt={`Stream evidence for session ${index + 1}`} className="mt-3 max-h-44 rounded-lg border border-white/10 object-contain" /></a>}
          </div>
        );
      })}
      {stream.streamTitle && (
        <div className="rounded-lg border border-white/[0.08] bg-white/[0.025] p-3">
          <div className="text-[9px] font-black uppercase tracking-wider text-white/40">Creator-reported stream title</div>
          <div className="mt-1 text-xs font-bold text-white/75">{stream.streamTitle}</div>
          {config.requireTitleMention && <div className="mt-1 text-[10px] text-white/40">Submitted by the creator for manual developer review; not retrieved from the platform.</div>}
        </div>
      )}
      {sessions.length === 0 && (stream.streamUrl || stream.vodUrl) && (
        <a href={String(stream.vodUrl || stream.streamUrl)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-[#B9FF1A]">Open stream or VOD <ExternalLink size={12} /></a>
      )}
      {submission.review_notes && <p className="border-l-2 border-amber-300/60 pl-3 text-xs text-amber-100/80">{submission.review_notes}</p>}
    </div>
  );
}