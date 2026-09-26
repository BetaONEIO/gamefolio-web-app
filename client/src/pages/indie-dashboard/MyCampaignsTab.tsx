import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Clock, Users, KeyRound, Target, ChevronRight,
  ShieldCheck, AlertCircle, CheckCircle, Pause, XCircle,
  Calendar, BarChart3, Gamepad2, FileText, Play, Eye,
  Edit3, Film, Flag, Plus,
  UserCheck, UserX, RefreshCw,
  Check, Send, MessageSquare, X,
  ExternalLink, Radio, Image as ImageIcon,
} from "lucide-react";
import { NEON, CARD_BG, CARD_BORDER, DASHBOARD_THEME, rgbaAccent } from "./constants";

const STATUS_CONFIG: Record<string, {
  label: string; color: string; bg: string; icon: any; filter: FilterTab;
}> = {
  draft:             { label: "Draft",          color: "#94a3b8", bg: "rgba(148,163,184,0.12)", icon: FileText,    filter: "draft" },
  awaiting_review:   { label: "In Review",       color: DASHBOARD_THEME.warning, bg: `${DASHBOARD_THEME.warning}1f`, icon: Clock,       filter: "draft" },
  changes_requested: { label: "Changes Needed",  color: DASHBOARD_THEME.warning, bg: `${DASHBOARD_THEME.warning}1f`, icon: AlertCircle, filter: "draft" },
  approved:          { label: "Approved",        color: DASHBOARD_THEME.success, bg: rgbaAccent(0.12), icon: CheckCircle, filter: "scheduled" },
  scheduled:         { label: "Scheduled",       color: DASHBOARD_THEME.info, bg: `${DASHBOARD_THEME.info}1f`, icon: Calendar,    filter: "scheduled" },
  live:              { label: "Live",            color: NEON,      bg: "rgba(183,255,24,0.12)", icon: Target,      filter: "active" },
  paused:            { label: "Paused",          color: "#94a3b8", bg: "rgba(148,163,184,0.12)", icon: Pause,      filter: "active" },
  completed:         { label: "Completed",       color: DASHBOARD_THEME.success, bg: rgbaAccent(0.12), icon: CheckCircle, filter: "completed" },
  cancelled:         { label: "Cancelled",       color: DASHBOARD_THEME.danger, bg: `${DASHBOARD_THEME.danger}1f`, icon: XCircle,    filter: "completed" },
};

type FilterTab = "all" | "active" | "scheduled" | "draft" | "completed";

type ApplicationDecision = "approve" | "reject";

type CampaignObjectiveProgress = {
  id?: number | string;
  content_type: string;
  quantity: number;
  submitted_count: number;
  approved_count: number;
  expected_units?: number | null;
};

const OBJECTIVE_PRESENTATION: Record<string, { label: string; icon: any }> = {
  gameplay_clip: { label: "Gameplay clips", icon: Film },
  clip:          { label: "Gameplay clips", icon: Film },
  screenshot:    { label: "Screenshots", icon: Eye },
  vertical_reel: { label: "Vertical reels", icon: Play },
  reel:          { label: "Vertical reels", icon: Play },
  creator_review:{ label: "Creator reviews", icon: FileText },
  review:        { label: "Creator reviews", icon: FileText },
  livestream:    { label: "Livestreams", icon: BarChart3 },
  feedback:      { label: "Feedback", icon: Flag },
  bug_report:    { label: "Bug reports", icon: AlertCircle },
  bug:           { label: "Bug reports", icon: AlertCircle },
};

function numberOrZero(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

/**
 * The instances endpoint may expose the aggregate under either name while
 * the worker rolls out. This only accepts saved objective rows; campaign
 * marketing estimates are intentionally not used as a fallback.
 */
function objectiveProgressRows(campaign: any): CampaignObjectiveProgress[] {
  const source = campaign.objective_progress ?? campaign.objective_summary;
  const rows = Array.isArray(source)
    ? source
    : Array.isArray(source?.objectives)
    ? source.objectives
    : source && typeof source === "object"
    ? Object.entries(source).map(([contentType, value]: [string, any]) => ({
        ...(value && typeof value === "object" ? value : {}),
        content_type: value?.content_type ?? contentType,
      }))
    : [];

  return rows
    .map((row: any) => ({
      id: row.id,
      content_type: String(row.content_type ?? row.contentType ?? "").toLowerCase(),
      quantity: numberOrZero(row.quantity),
      submitted_count: numberOrZero(row.submitted_count ?? row.submittedCount),
      approved_count: numberOrZero(row.approved_count ?? row.approvedCount),
      expected_units: row.expected_units == null && row.expectedUnits == null
        ? null
        : numberOrZero(row.expected_units ?? row.expectedUnits),
    }))
    .filter((row: CampaignObjectiveProgress) => row.content_type && row.quantity > 0);
}

function applicationRows(payload: any): { applications: any[]; supported: boolean } {
  const rows = Array.isArray(payload) ? payload : Array.isArray(payload?.applications) ? payload.applications : null;
  if (!rows) return { applications: [], supported: false };
  // Never retain or render key material returned by an over-broad owner
  // endpoint. The application panel only needs identity and review state.
  return {
    supported: true,
    applications: rows.map((row: any) => ({
      id: row.id,
      userId: row.user_id ?? row.userId ?? row.creator_id ?? row.creatorId,
      displayName: row.display_name ?? row.displayName ?? row.username ?? "Creator",
      username: row.username,
      avatarUrl: row.avatar_url ?? row.avatarUrl,
      status: row.status ?? "pending",
      createdAt: row.created_at ?? row.createdAt,
      reviewedAt: row.reviewed_at ?? row.reviewedAt,
      notes: row.notes,
    })),
  };
}

async function fetchApplications(instanceId: number) {
  const paths = [
    `/api/bounties/${instanceId}/applications`,
    `/api/campaigns/instances/${instanceId}/applications`,
  ];
  for (const path of paths) {
    const response = await fetch(path, { credentials: "include" });
    if (response.status === 404 || response.status === 405) continue;
    if (!response.ok) throw new Error("Could not load campaign applications");
    return applicationRows(await response.json());
  }
  return { applications: [], supported: false };
}

async function decideApplication(instanceId: number, userId: number | string, decision: ApplicationDecision) {
  const paths = [
    `/api/bounties/${instanceId}/applications/${userId}/${decision}`,
    `/api/campaigns/instances/${instanceId}/applications/${userId}/${decision}`,
    `/api/bounties/${instanceId}/applications/${userId}`,
    `/api/campaigns/instances/${instanceId}/applications/${userId}`,
  ];
  let lastError = "Could not update application";
  for (const path of paths) {
    const response = await fetch(path, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: decision,
        status: decision === "approve" ? "approved" : "rejected",
      }),
    });
    if (response.ok) return response.json().catch(() => ({}));
    if (response.status !== 404 && response.status !== 405) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error ?? payload.message ?? lastError);
    }
    lastError = `Application ${decision} endpoint is unavailable`;
  }
  throw new Error(lastError);
}

type ReviewPackage = {
  participant_id: number | string;
  creator_id?: number | string;
  creator_username?: string;
  participant_status?: string;
  submitted_at?: string;
  required_units?: number;
  submitted_units?: number;
  approved_units?: number;
  stream_config?: unknown;
  game_name?: string;
};

async function fetchReviewPackages(instanceId: number): Promise<ReviewPackage[]> {
  const response = await fetch(`/api/bounties/admin/instances/${instanceId}/packages`, { credentials: "include" });
  if (!response.ok) throw new Error("Could not load campaign submissions");
  const payload = await response.json();
  const rows = Array.isArray(payload) ? payload : payload?.packages;
  if (!Array.isArray(rows)) return [];
  return rows.map((row: any) => ({
    ...row,
    creator_id: row.creator_id ?? row.user_id,
    creator_username: row.creator_username ?? row.username,
    submitted_units: row.submitted_units ?? row.submission_count,
    approved_units: row.approved_units ?? row.approved_count,
  }));
}

async function fetchReviewPackage(instanceId: number, participantId: number | string) {
  const response = await fetch(`/api/bounties/admin/instances/${instanceId}/packages/${participantId}`, { credentials: "include" });
  if (!response.ok) throw new Error("Could not load this submission");
  return response.json();
}

async function reviewPackage(instanceId: number, participantId: number | string, body: {
  verdict: "approved" | "changes_requested" | "rejected";
  notes?: string;
  submissionIds?: number[];
  streamReview?: Record<string, { verifiedMinutes: number; detectedGame?: string }>;
}) {
  const response = await fetch(`/api/bounties/admin/instances/${instanceId}/packages/${participantId}/review`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error ?? payload.message ?? "Could not review submission");
  return payload;
}

function parseSubmissionContent(value: unknown): { text: string; links: string[] } {
  let content: any = value;
  if (typeof content === "string") {
    try {
      content = JSON.parse(content);
    } catch {
      return { text: content, links: [] };
    }
  }
  if (content == null) return { text: "", links: [] };
  if (typeof content !== "object") return { text: String(content), links: [] };

  const textValue = content.text ?? content.review ?? content.content ?? content.body;
  const text = typeof textValue === "string"
    ? textValue
    : textValue == null
    ? ""
    : String(textValue);
  const linkValues = [
    content.url,
    content.link,
    content.content_url,
    ...(Array.isArray(content.links) ? content.links : content.links ? [content.links] : []),
  ];
  const links = Array.from(new Set(linkValues
    .map((link: any) => typeof link === "string" ? link : link?.url)
    .filter((link: any): link is string => typeof link === "string" && /^https?:\/\//i.test(link))));
  return { text, links };
}

function parseStreamSubmissionContent(value: unknown): Record<string, any> | null {
  let content = value;
  if (typeof content === "string") {
    try {
      content = JSON.parse(content);
    } catch {
      return null;
    }
  }
  return content && typeof content === "object" && !Array.isArray(content)
    ? content as Record<string, any>
    : null;
}

function safeStreamLink(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

function streamReviewStatus(value: unknown): string {
  const status = typeof value === "string" ? value.trim().toLowerCase() : "";
  const labels: Record<string, string> = {
    under_review: "Awaiting developer review",
    submitted_for_review: "Awaiting developer review",
    approved: "Approved",
    changes_requested: "Changes requested",
    rejected: "Rejected",
    staged: "Draft",
  };
  return labels[status] ?? (status ? status.replace(/[_-]/g, " ") : "Not submitted");
}

function streamDate(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number" && !(value instanceof Date)) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString();
}

function streamMinutes(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function isStreamObjective(objective: any): boolean {
  return ["stream", "livestream"].includes(String(objective?.content_type ?? "").toLowerCase());
}

function parseStreamReviewConfig(value: unknown): { requiredMinutes: number | null; requireGameMatch: boolean } | null {
  let config: any = value;
  if (typeof config === "string") {
    try {
      config = JSON.parse(config);
    } catch {
      return null;
    }
  }
  if (!config || typeof config !== "object" || Array.isArray(config)) return null;
  config = config.streamConfig ?? config.stream_config ?? config.stream ?? config.livestream ?? config;
  const requiredValue = config.requiredMinutes ?? config.required_minutes;
  const required = Number(requiredValue);
  return {
    requiredMinutes: Number.isInteger(required) && required > 0 ? required : null,
    requireGameMatch: config.requireGameMatch === true || config.require_game_match === true,
  };
}

type StreamReviewInput = { verifiedMinutes: string; detectedGame: string };

function StreamSubmissionReviewDetails({
  submission,
  creatorName,
  streamConfig,
  linkedGameName,
  reviewInput,
  onReviewInputChange,
  canReview,
}: {
  submission: any;
  creatorName: string;
  streamConfig: { requiredMinutes: number | null; requireGameMatch: boolean } | null;
  linkedGameName: string;
  reviewInput: StreamReviewInput;
  onReviewInputChange: (field: keyof StreamReviewInput, value: string) => void;
  canReview: boolean;
}) {
  const stream = parseStreamSubmissionContent(submission.content_data);
  if (!stream) return null;

  const sessions = Array.isArray(stream.sessions)
    ? stream.sessions.filter((session: any) => session && typeof session === "object")
    : [];
  const platform = typeof stream.platform === "string" ? stream.platform : "";
  const channelName = typeof stream.connectedChannelName === "string"
    ? stream.connectedChannelName
    : typeof stream.channelName === "string" ? stream.channelName : "";
  const channelId = stream.connectedChannelId == null ? "" : String(stream.connectedChannelId);
  const claimedMinutes = streamMinutes(stream.claimedMinutes);
  const verifiedMinutes = streamMinutes(stream.verifiedMinutes);
  const verificationStatus = typeof stream.verificationStatus === "string" ? stream.verificationStatus.trim() : "";
  const streamUrl = safeStreamLink(stream.streamUrl);
  const vodUrl = safeStreamLink(stream.vodUrl);
  const detectedGame = typeof stream.detectedGame === "string"
    ? stream.detectedGame
    : stream.detectedGame && typeof stream.detectedGame === "object"
    ? [stream.detectedGame.name, stream.detectedGame.title, stream.detectedGame.category]
        .filter((value: unknown): value is string => typeof value === "string" && value.trim().length > 0)
        .join(" · ")
    : "";
  const reviewStatus = streamReviewStatus(submission.status ?? submission.developer_review_status);

  return (
    <section className="space-y-3 rounded-lg border border-[#B9FF1A]/20 bg-[#B9FF1A]/[0.035] p-3" aria-label="Livestream submission details">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Radio size={15} className="shrink-0 text-[#B9FF1A]" />
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-wide text-white">Livestream submission</div>
            <div className="mt-0.5 truncate text-[10px] text-white/50">{creatorName}</div>
          </div>
        </div>
        <span className="rounded-full border border-white/10 bg-black/25 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-white/70">
          Developer review · {reviewStatus}
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <div className="min-w-0 rounded-md bg-black/20 px-2.5 py-2">
          <div className="text-[9px] font-black uppercase tracking-wide text-white/35">Platform</div>
          <div className="mt-1 truncate text-[11px] font-bold capitalize text-white/85">{platform || "Not recorded"}</div>
        </div>
        <div className="min-w-0 rounded-md bg-black/20 px-2.5 py-2">
          <div className="text-[9px] font-black uppercase tracking-wide text-white/35">Connected channel</div>
          <div className="mt-1 truncate text-[11px] font-bold text-white/85" title={channelId || channelName}>
            {channelName || channelId || "Not recorded"}
          </div>
        </div>
        <div className="min-w-0 rounded-md bg-black/20 px-2.5 py-2">
          <div className="text-[9px] font-black uppercase tracking-wide text-white/35">Claimed duration</div>
          <div className="mt-1 text-[11px] font-bold text-white/85">{claimedMinutes == null ? "Not provided" : `${claimedMinutes} min`}</div>
        </div>
        {verifiedMinutes != null && (
          <div className="min-w-0 rounded-md bg-black/20 px-2.5 py-2">
            <div className="text-[9px] font-black uppercase tracking-wide text-white/35">Verified duration</div>
            <div className="mt-1 text-[11px] font-bold text-white/85">{verifiedMinutes} min</div>
          </div>
        )}
        {stream.streamTitle && (
          <div className="min-w-0 rounded-md bg-black/20 px-2.5 py-2 sm:col-span-2">
            <div className="text-[9px] font-black uppercase tracking-wide text-white/35">Stream title</div>
            <div className="mt-1 break-words text-[11px] font-bold text-white/85">{String(stream.streamTitle)}</div>
          </div>
        )}
        {detectedGame && (
          <div className="min-w-0 rounded-md bg-black/20 px-2.5 py-2">
            <div className="text-[9px] font-black uppercase tracking-wide text-white/35">Detected game / category</div>
            <div className="mt-1 break-words text-[11px] font-bold text-white/85">{detectedGame}</div>
          </div>
        )}
        {verificationStatus && (
          <div className="min-w-0 rounded-md bg-black/20 px-2.5 py-2">
            <div className="text-[9px] font-black uppercase tracking-wide text-white/35">Verification status</div>
            <div className="mt-1 break-words text-[11px] font-bold capitalize text-white/85">{verificationStatus.replace(/[_-]/g, " ")}</div>
          </div>
        )}
        {typeof stream.verificationMethod === "string" && stream.verificationMethod.trim() && (
          <div className="min-w-0 rounded-md bg-black/20 px-2.5 py-2">
            <div className="text-[9px] font-black uppercase tracking-wide text-white/35">Verification method</div>
            <div className="mt-1 break-words text-[11px] font-bold capitalize text-white/85">{stream.verificationMethod.replace(/[_-]/g, " ")}</div>
          </div>
        )}
      </div>

      {verifiedMinutes == null && (
        <p className="text-[10px] leading-relaxed text-white/45">No verified duration has been recorded. Review the submitted evidence before approving the stream.</p>
      )}

      {(streamUrl || vodUrl) && (
        <div className="flex flex-wrap gap-2">
          {streamUrl && <a href={streamUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-black/20 px-2.5 py-1.5 text-[10px] font-bold text-[#B9FF1A] hover:bg-white/5">Open stream <ExternalLink size={10} /></a>}
          {vodUrl && <a href={vodUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-black/20 px-2.5 py-1.5 text-[10px] font-bold text-[#B9FF1A] hover:bg-white/5">Open VOD <ExternalLink size={10} /></a>}
        </div>
      )}

      {streamDate(submission.submitted_at) && (
        <div className="text-[10px] text-white/40">Submission received {streamDate(submission.submitted_at)}</div>
      )}

      {sessions.length > 0 && (
        <div className="space-y-2">
          <div className="text-[9px] font-black uppercase tracking-wide text-white/40">Submitted sessions · {sessions.length}</div>
          {sessions.map((session: any, index: number) => {
            const sessionStart = streamDate(session.startedAt ?? session.streamedAt);
            const sessionEnd = streamDate(session.endedAt);
            const sessionStreamUrl = safeStreamLink(session.streamUrl);
            const sessionVodUrl = safeStreamLink(session.vodUrl);
            const sessionEvidence = safeStreamLink(session.evidenceImage);
            const sessionMinutes = streamMinutes(session.claimedMinutes);
            return (
              <div key={`${submission.id}-stream-session-${index}`} className="space-y-2 rounded-md border border-white/[0.07] bg-black/20 p-2.5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-white/65">
                  <span className="font-bold">Session {index + 1}</span>
                  {sessionStart && <span>{sessionStart}</span>}
                  {sessionEnd && <span>Ended {sessionEnd}</span>}
                  {sessionMinutes != null && <span className="font-bold text-white/80">{sessionMinutes} min claimed</span>}
                </div>
                {session.streamedAt && !session.startedAt && <div className="text-[10px] text-white/45">Stream date: {streamDate(session.streamedAt) ?? String(session.streamedAt)}</div>}
                {(sessionStreamUrl || sessionVodUrl) && (
                  <div className="flex flex-wrap gap-3">
                    {sessionStreamUrl && <a href={sessionStreamUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-[#B9FF1A] hover:underline">Stream <ExternalLink size={9} /></a>}
                    {sessionVodUrl && <a href={sessionVodUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-[#B9FF1A] hover:underline">VOD <ExternalLink size={9} /></a>}
                    {sessionEvidence && <a href={sessionEvidence} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-[#B9FF1A] hover:underline"><ImageIcon size={10} /> Evidence image <ExternalLink size={9} /></a>}
                  </div>
                )}
                {session.notes && <div className="whitespace-pre-wrap break-words text-[10px] text-white/55">{String(session.notes)}</div>}
                {sessionEvidence && <img src={sessionEvidence} alt={`Stream session ${index + 1} evidence`} className="max-h-52 rounded-md border border-white/10 object-contain" loading="lazy" />}
              </div>
            );
          })}
        </div>
      )}

      {canReview && (
        <div className="space-y-3 rounded-md border border-[#B9FF1A]/15 bg-black/25 p-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-wide text-white/75">Developer verification</div>
            <p className="mt-1 text-[10px] leading-relaxed text-white/55">
              Inspect the stream or VOD and submitted evidence. Enter only whole live minutes you can confirm from that evidence; this is a manual developer review, not automatic platform verification.
              {claimedMinutes == null
                ? " The creator’s claimed duration is missing, so this submission cannot be verified yet."
                : ` Enter a value from 0 to ${claimedMinutes} minutes, no higher than the creator’s claim.`}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-[10px] font-bold text-white/65">
              Verified minutes <span className="text-red-300">*</span>
              <input
                type="number"
                min={0}
                max={claimedMinutes ?? undefined}
                step={1}
                required
                inputMode="numeric"
                value={reviewInput.verifiedMinutes}
                onChange={event => onReviewInputChange("verifiedMinutes", event.target.value)}
                disabled={claimedMinutes == null}
                placeholder={claimedMinutes == null ? "Claimed minutes unavailable" : "Enter verified minutes"}
                className="mt-1 w-full rounded-md border border-white/10 bg-black/35 px-2.5 py-2 text-[11px] text-white outline-none focus:border-[#B9FF1A]/50 disabled:opacity-50"
              />
              {streamConfig?.requiredMinutes != null && (
                <span className="mt-1 block text-[9px] font-normal text-white/40">
                  Campaign requirement: at least {streamConfig.requiredMinutes} verified minutes.
                </span>
              )}
              {streamConfig?.requiredMinutes == null && (
                <span className="mt-1 block text-[9px] font-normal text-amber-200/80">
                  Required stream duration is unavailable; approval will be blocked until it can be loaded.
                </span>
              )}
            </label>
            {streamConfig?.requireGameMatch && (
              <label className="block text-[10px] font-bold text-white/65">
                Detected game / category <span className="text-red-300">*</span>
                <input
                  type="text"
                  required
                  value={reviewInput.detectedGame}
                  onChange={event => onReviewInputChange("detectedGame", event.target.value)}
                  placeholder={linkedGameName ? `Confirm category for ${linkedGameName}` : "Enter the category shown in the evidence"}
                  className="mt-1 w-full rounded-md border border-white/10 bg-black/35 px-2.5 py-2 text-[11px] text-white outline-none focus:border-[#B9FF1A]/50"
                />
                <span className="mt-1 block text-[9px] font-normal text-white/40">
                  Record the game/category visible in the evidence; it must match the linked game{linkedGameName ? ` (${linkedGameName})` : ""}.
                </span>
              </label>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: "all",       label: "All" },
  { id: "active",    label: "Active" },
  { id: "scheduled", label: "Scheduled" },
  { id: "draft",     label: "Draft" },
  { id: "completed", label: "Completed" },
];

function daysRemaining(endDate: string | null): number | null {
  if (!endDate) return null;
  return Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000);
}

function Btn({
  label, icon: Icon, onClick, variant = "default",
}: {
  label: string; icon: any; onClick: () => void;
  variant?: "default" | "primary" | "danger";
}) {
  const s = {
    default: { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)", border: `1px solid ${CARD_BORDER}` },
    primary: { background: "rgba(183,255,24,0.1)",   color: NEON,                    border: "1px solid rgba(183,255,24,0.25)" },
    danger:  { background: "rgba(248,113,113,0.08)", color: "#fca5a5",               border: "1px solid rgba(248,113,113,0.2)" },
  };
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all hover:brightness-110"
      style={s[variant]}>
      <Icon size={10} /> {label}
    </button>
  );
}

function PackageReviewSection({ instanceId }: { instanceId: number }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [openParticipant, setOpenParticipant] = useState<number | string | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [streamReviewInputs, setStreamReviewInputs] = useState<Record<string, StreamReviewInput>>({});
  const [notes, setNotes] = useState("");
  const [verdict, setVerdict] = useState<"approved" | "changes_requested" | "rejected" | null>(null);
  const packagesQuery = useQuery<ReviewPackage[]>({
    queryKey: ["/api/bounties/admin/instances", instanceId, "packages"],
    queryFn: () => fetchReviewPackages(instanceId),
    enabled: Number.isFinite(instanceId) && instanceId > 0,
    staleTime: 15_000,
  });
  const detailQuery = useQuery<any>({
    queryKey: ["/api/bounties/admin/instances", instanceId, "packages", openParticipant],
    queryFn: () => fetchReviewPackage(instanceId, openParticipant as number | string),
    enabled: openParticipant !== null,
  });
  const reviewMutation = useMutation({
    mutationFn: ({ participantId, body }: { participantId: number | string; body: {
      verdict: "approved" | "changes_requested" | "rejected";
      notes?: string;
      submissionIds?: number[];
      streamReview?: Record<string, { verifiedMinutes: number; detectedGame?: string }>;
    } }) =>
      reviewPackage(instanceId, participantId, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/bounties/admin/instances", instanceId, "packages"] });
      if (openParticipant !== null) {
        await queryClient.invalidateQueries({ queryKey: ["/api/bounties/admin/instances", instanceId, "packages", openParticipant] });
      }
      setOpenParticipant(null);
      setSelectedIds([]);
      setStreamReviewInputs({});
      setNotes("");
      setVerdict(null);
      toast({ title: "Submission reviewed", description: "The creator has been notified of your decision." });
    },
    onError: (error: any) => toast({ title: "Review could not be submitted", description: error?.message ?? "Please try again.", variant: "destructive" }),
  });

  const packages = packagesQuery.data ?? [];
  if (packagesQuery.isLoading) {
    return <div className="flex items-center gap-2 text-[11px] text-white/35"><Loader2 size={12} className="animate-spin" /> Loading creator submissions…</div>;
  }
  if (packagesQuery.isError) {
    return <div className="text-[11px] text-red-300">Creator submissions could not be loaded.</div>;
  }
  if (!packages.length) return null;

  const detail = detailQuery.data;
  const participant = detail?.participant;
  const activePackageRow = packages.find(item => String(item.participant_id) === String(openParticipant));
  const packageSubmissions = Array.isArray(detail?.submissions) ? detail.submissions : [];
  const objectives = (Array.isArray(detail?.objectives) ? detail.objectives : []).map((objective: any) => ({
    ...objective,
    submissions: Array.isArray(objective.submissions)
      ? objective.submissions
      : packageSubmissions.filter((submission: any) =>
          submission.objective_id === objective.id ||
          submission.objectiveId === objective.id ||
          submission.objective_id == null && submission.objective_index === objective.index),
  }));
  const streamObjective = objectives.find((objective: any) => isStreamObjective(objective));
  const streamConfig = parseStreamReviewConfig(
    detail?.participant?.stream_config ??
    detail?.stream_config ??
    detail?.campaign?.stream_config ??
    activePackageRow?.stream_config ??
    streamObjective?.stream_config ??
    streamObjective?.config,
  );
  const linkedGameName = String(detail?.participant?.game_name ?? detail?.game_name ?? detail?.campaign?.game_name ?? activePackageRow?.game_name ?? "").trim();
  const remainingObjectives = objectives.filter((objective: any) => {
    const submissions = objective.submissions ?? [];
    const required = Number(objective.quantity ?? objective.required_quantity ?? objective.required_units);
    const approved = submissions.filter((submission: any) =>
      ["approved", "completed", "completed_and_verified"].includes(String(submission.status ?? "").toLowerCase()),
    ).length;
    if (Number.isFinite(required) && required > 0) return approved < required;
    return submissions.length === 0 || submissions.some((submission: any) =>
      !["approved", "completed", "completed_and_verified"].includes(String(submission.status ?? "").toLowerCase()),
    );
  }).map((objective: any, index: number) => String(objective.title ?? `Step ${index + 1}`));
  const terminalStatuses = ["approved", "completed", "completed_and_verified", "full_game_awarded"];
  const pendingReview = packages.filter(item => String(item.participant_status).toLowerCase() === "submitted_for_review").length;
  const toggleSubmission = (id: number) => setSelectedIds(ids => ids.includes(id) ? ids.filter(item => item !== id) : [...ids, id]);
  const updateStreamReviewInput = (submissionId: number | string, field: keyof StreamReviewInput, value: string) =>
    setStreamReviewInputs(inputs => ({
      ...inputs,
      [String(submissionId)]: {
        verifiedMinutes: inputs[String(submissionId)]?.verifiedMinutes ?? "",
        detectedGame: inputs[String(submissionId)]?.detectedGame ?? "",
        [field]: value,
      },
    }));
  const submitReview = (packageRow: ReviewPackage, requestedVerdict: "approved" | "changes_requested" | "rejected" = verdict ?? "approved") => {
    if (requestedVerdict === "changes_requested" && (!notes.trim() || selectedIds.length === 0)) {
      toast({ title: "Feedback required", description: "Select the submissions needing changes and explain what to fix.", variant: "destructive" });
      return;
    }
    if (requestedVerdict === "rejected" && !notes.trim()) {
      toast({ title: "Reason required", description: "Explain why the campaign package is being rejected.", variant: "destructive" });
      return;
    }
    const allStreamSubmissions = objectives.flatMap((objective: any) =>
      isStreamObjective(objective)
        ? (objective.submissions ?? []).filter((submission: any) => submission.status === "under_review")
        : [],
    );
    const streamsBeingApproved = requestedVerdict === "approved"
      ? allStreamSubmissions
      : requestedVerdict === "changes_requested"
      ? allStreamSubmissions.filter((submission: any) => !selectedIds.includes(Number(submission.id)))
      : [];
    const streamReview: Record<string, { verifiedMinutes: number; detectedGame?: string }> = {};
    if (streamsBeingApproved.length > 0) {
      if (!streamConfig?.requiredMinutes) {
        toast({
          title: "Stream requirements unavailable",
          description: "The required livestream duration could not be loaded. Refresh the package before approving stream submissions.",
          variant: "destructive",
        });
        return;
      }
      for (const submission of streamsBeingApproved) {
        const id = String(submission.id);
        const stream = parseStreamSubmissionContent(submission.content_data);
        const claimedMinutes = streamMinutes(stream?.claimedMinutes);
        const rawVerifiedMinutes = streamReviewInputs[id]?.verifiedMinutes?.trim() ?? "";
        const verifiedMinutes = rawVerifiedMinutes === "" ? Number.NaN : Number(rawVerifiedMinutes);
        if (!Number.isInteger(verifiedMinutes)) {
          toast({
            title: "Verified minutes required",
            description: `Enter a whole-number verified duration for stream submission ${id} after reviewing its evidence.`,
            variant: "destructive",
          });
          return;
        }
        if (claimedMinutes == null || verifiedMinutes < 0 || verifiedMinutes > claimedMinutes) {
          toast({
            title: "Verified minutes out of range",
            description: claimedMinutes == null
              ? `Stream submission ${id} has no usable claimed duration; it cannot be verified yet.`
              : `Stream submission ${id} must be verified from 0 to the claimed ${claimedMinutes} minutes.`,
            variant: "destructive",
          });
          return;
        }
        if (verifiedMinutes < streamConfig.requiredMinutes) {
          toast({
            title: "Required stream duration not verified",
            description: `Stream submission ${id} has ${verifiedMinutes} verified minutes; at least ${streamConfig.requiredMinutes} are required. Review the evidence or request changes instead of approving.`,
            variant: "destructive",
          });
          return;
        }
        const entry: { verifiedMinutes: number; detectedGame?: string } = { verifiedMinutes };
        if (streamConfig.requireGameMatch) {
          const detectedGame = streamReviewInputs[id]?.detectedGame?.trim() ?? "";
          if (!detectedGame) {
            toast({
              title: "Detected game/category required",
              description: `Record the game/category shown by the evidence for stream submission ${id}${linkedGameName ? `; it must match ${linkedGameName}` : ""}.`,
              variant: "destructive",
            });
            return;
          }
          if (!linkedGameName) {
            toast({
              title: "Linked game unavailable",
              description: "The campaign’s linked game could not be loaded, so the required category match cannot be verified. Refresh the package before approving.",
              variant: "destructive",
            });
            return;
          }
          const normalizeGame = (value: string) => value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
          if (normalizeGame(detectedGame) !== normalizeGame(linkedGameName)) {
            toast({
              title: "Game/category does not match",
              description: `The detected game/category must match the linked game “${linkedGameName}”.`,
              variant: "destructive",
            });
            return;
          }
          entry.detectedGame = detectedGame;
        }
        streamReview[id] = entry;
      }
    }
    reviewMutation.mutate({
      participantId: packageRow.participant_id,
      body: {
        verdict: requestedVerdict,
        notes: notes.trim() || undefined,
        submissionIds: requestedVerdict === "changes_requested" ? selectedIds : undefined,
        streamReview: Object.keys(streamReview).length ? streamReview : undefined,
      },
    });
  };

  return (
    <section className="rounded-xl p-3.5 space-y-3" style={{ background: "rgba(183,255,24,0.035)", border: `1px solid rgba(183,255,24,0.14)` }}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-wider text-white/55">Campaign Submissions</div>
          <div className="text-[11px] text-white/38 mt-1">{pendingReview > 0 ? `${pendingReview} package${pendingReview === 1 ? "" : "s"} awaiting review` : "All creator packages reviewed"}</div>
        </div>
        <button type="button" onClick={() => packagesQuery.refetch()} className="p-1.5 rounded-lg text-white/35 hover:text-white hover:bg-white/10" aria-label="Refresh campaign submissions">
          <RefreshCw size={13} className={packagesQuery.isFetching ? "animate-spin" : ""} />
        </button>
      </div>
      <div className="space-y-2">
        {packages.map(packageRow => {
          const status = String(packageRow.participant_status ?? "submitted").toLowerCase();
          const reviewed = status !== "submitted_for_review";
          const statusLabel = status === "changes_requested"
            ? "Changes requested"
            : status.replace(/_/g, " ");
          const statusColor = terminalStatuses.includes(status)
            ? DASHBOARD_THEME.success
            : DASHBOARD_THEME.warning;
          const active = openParticipant === packageRow.participant_id;
          return (
            <div key={String(packageRow.participant_id)} className="rounded-lg overflow-hidden" style={{ background: "rgba(0,0,0,0.18)", border: `1px solid ${active ? "rgba(183,255,24,0.22)" : "rgba(255,255,255,0.06)"}` }}>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-white truncate">{packageRow.creator_username || `Creator ${packageRow.creator_id ?? ""}`}</div>
                  <div className="text-[10px] text-white/35 mt-0.5">
                    {packageRow.submitted_at ? `Submitted ${new Date(packageRow.submitted_at).toLocaleDateString()}` : "Submitted package"}
                    {packageRow.required_units != null
                      ? <> · {packageRow.submitted_units ?? 0} / {packageRow.required_units} steps</>
                      : packageRow.submitted_units != null
                      ? <> · {packageRow.submitted_units} submitted{packageRow.approved_units != null ? ` · ${packageRow.approved_units} approved` : ""}</>
                      : null}
                  </div>
                </div>
                <span className="text-[9px] uppercase font-black tracking-wide" style={{ color: statusColor }}>
                   {status === "completed_and_verified" ? "Completed" : status === "full_game_awarded" ? "Completed · Rewarded" : terminalStatuses.includes(status) ? "Approved" : status === "changes_requested" ? "Awaiting creator changes" : statusLabel}
                </span>
                <button type="button" onClick={() => { setOpenParticipant(active ? null : packageRow.participant_id); setSelectedIds([]); setStreamReviewInputs({}); setNotes(""); setVerdict(null); }} className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-black" style={{ color: NEON, background: "rgba(183,255,24,0.09)", border: "1px solid rgba(183,255,24,0.2)" }}>
                   <Eye size={11} /> {active ? "Close" : reviewed ? "View" : "Review"}
                </button>
              </div>
              {active && (
                <div className="border-t border-white/[0.06] p-3.5 space-y-4">
                  {detailQuery.isLoading && <div className="flex items-center gap-2 text-[11px] text-white/35"><Loader2 size={12} className="animate-spin" /> Loading package…</div>}
                  {detailQuery.isError && <div className="text-[11px] text-red-300">This package could not be loaded.</div>}
                  {!detailQuery.isLoading && !detailQuery.isError && (
                    <>
                      <div className="flex items-center gap-2">
                        <div className="text-[10px] uppercase tracking-wider font-black text-white/35">Reviewing</div>
                        <div className="text-xs font-bold text-white">{participant?.creator_username ?? participant?.username ?? packageRow.creator_username ?? "Creator"}</div>
                        {(detail?.campaign?.name ?? participant?.campaign_title) && <div className="text-[10px] text-white/30">· {detail?.campaign?.name ?? participant?.campaign_title}</div>}
                      </div>
                      <div className="rounded-md border border-white/[0.07] bg-black/20 px-3 py-2">
                        <div className="text-[9px] font-black uppercase tracking-wide text-white/35">Remaining objectives</div>
                        <div className="mt-1 text-[11px] font-bold text-white/75">
                          {remainingObjectives.length
                            ? `${remainingObjectives.length} awaiting approval · ${remainingObjectives.join(", ")}`
                            : "All objectives approved"}
                        </div>
                      </div>
                      <div className="space-y-3">
                        {objectives.map((objective: any, objectiveIndex: number) => (
                          <div key={objective.id ?? objectiveIndex} className="rounded-lg p-3 space-y-2.5" style={{ background: "rgba(255,255,255,0.025)", border: `1px solid ${CARD_BORDER}` }}>
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="text-xs font-bold text-white">{String(objective.title ?? `Step ${objectiveIndex + 1}`)}</div>
                                {objective.content_type && <div className="text-[10px] uppercase tracking-wide text-white/30 mt-0.5">{String(objective.content_type).replace(/[_-]/g, " ")}</div>}
                              </div>
                              <span className="text-[10px] text-white/30">{objective.submissions?.length ?? 0} submitted</span>
                            </div>
                            {objective.content && <div className="text-[11px] text-white/42">{objective.content}</div>}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {(objective.submissions ?? []).map((submission: any) => {
                                const isSelected = selectedIds.includes(Number(submission.id));
                                const mediaUrl = submission.media_url ?? submission.content_url;
                                const isVideo = String(objective.content_type ?? "").includes("video") || String(objective.content_type ?? "").includes("clip") || String(objective.content_type ?? "").includes("reel");
                                const isStream = ["stream", "livestream"].includes(String(objective.content_type ?? "").toLowerCase());
                                const parsedContent = parseSubmissionContent(submission.content_data);
                                return (
                                  <div key={submission.id} className={`relative rounded-md overflow-hidden min-h-[74px] ${isStream ? "col-span-2 sm:col-span-3" : ""}`} style={{ background: "rgba(0,0,0,0.28)", border: `1px solid ${isSelected ? DASHBOARD_THEME.warning : "rgba(255,255,255,0.07)"}` }}>
                                    {isStream ? (
                                      <>
                                        <div className="mb-2 flex items-center justify-between gap-2">
                                          {submission.status && <span className="rounded bg-black/50 px-1.5 py-0.5 text-[8px] font-black uppercase text-white/65">{streamReviewStatus(submission.status)}</span>}
                                          {!reviewed && submission.status === "under_review" && (
                                            <button
                                              type="button"
                                              onClick={() => toggleSubmission(Number(submission.id))}
                                              className="flex h-6 items-center gap-1 rounded px-2 text-[9px] font-black"
                                              aria-label="Mark livestream submission for changes"
                                              style={{ background: isSelected ? DASHBOARD_THEME.warning : "rgba(255,255,255,0.08)", color: isSelected ? "#111" : "rgba(255,255,255,0.72)" }}
                                            >
                                              {isSelected ? <Check size={10} /> : <X size={10} />}
                                              {isSelected ? "Selected for changes" : "Request changes"}
                                            </button>
                                          )}
                                        </div>
                                        <StreamSubmissionReviewDetails
                                          submission={submission}
                                          creatorName={participant?.creator_username ?? participant?.username ?? packageRow.creator_username ?? "Creator"}
                                          streamConfig={streamConfig}
                                          linkedGameName={linkedGameName}
                                          reviewInput={streamReviewInputs[String(submission.id)] ?? { verifiedMinutes: "", detectedGame: "" }}
                                          onReviewInputChange={(field, value) => updateStreamReviewInput(submission.id, field, value)}
                                          canReview={!reviewed && submission.status === "under_review"}
                                        />
                                      </>
                                    ) : (
                                      <>
                                     {mediaUrl && isVideo ? <video src={mediaUrl} controls className="w-full h-20 object-cover" poster={submission.thumbnail_url || undefined} /> :
                                       objective.content_type === "stream" ? <div className="h-20 flex items-center justify-center"><MessageSquare size={17} className="text-white/25" /></div> :
                                       mediaUrl || submission.thumbnail_url ? <img src={submission.thumbnail_url ?? mediaUrl} alt={submission.media_title ?? "Submission"} className="w-full h-20 object-cover" /> :
                                      <div className="h-20 flex items-center justify-center"><MessageSquare size={17} className="text-white/25" /></div>}
                                     {objective.content_type === "stream" && mediaUrl && <a href={mediaUrl} target="_blank" rel="noopener noreferrer" className="block truncate px-2 py-1 text-[10px] text-[#B9FF1A]">Open livestream ↗</a>}
                                    {submission.media_title && <div className="px-2 py-1 text-[10px] text-white/48 truncate">{submission.media_title}</div>}
                                    {(parsedContent.text || parsedContent.links.length > 0) && (
                                      <div className="p-2 space-y-1.5">
                                        {parsedContent.text && <div className="text-[10px] text-white/55 line-clamp-4 whitespace-pre-wrap break-words">{parsedContent.text}</div>}
                                        {parsedContent.links.map((link, linkIndex) => (
                                          <a key={`${submission.id}-link-${linkIndex}`} href={link} target="_blank" rel="noreferrer" className="block text-[10px] truncate underline" style={{ color: NEON }}>
                                            {link}
                                          </a>
                                        ))}
                                      </div>
                                    )}
                                    {submission.status && <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[8px] uppercase font-black" style={{ background: "rgba(0,0,0,0.72)", color: submission.status === "approved" ? DASHBOARD_THEME.success : "rgba(255,255,255,0.55)" }}>{submission.status}</div>}
                                    {!reviewed && submission.status === "under_review" && <button type="button" onClick={() => toggleSubmission(Number(submission.id))} className="absolute top-1 right-1 w-5 h-5 rounded flex items-center justify-center" aria-label="Mark submission for changes" style={{ background: isSelected ? DASHBOARD_THEME.warning : "rgba(0,0,0,0.72)", color: isSelected ? "#111" : "rgba(255,255,255,0.6)" }}>{isSelected ? <Check size={12} /> : <X size={11} />}</button>}
                                      </>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                      {!reviewed && (
                        <div className="space-y-2.5 pt-1">
                          <textarea value={notes} onChange={event => setNotes(event.target.value)} rows={2} placeholder="Feedback for the creator (required when requesting changes)" className="w-full resize-none rounded-lg px-3 py-2 text-[11px] text-white placeholder:text-white/25 outline-none" style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.09)" }} />
                          <div className="flex flex-wrap items-center gap-2">
                            <button type="button" onClick={() => { setVerdict("approved"); submitReview(packageRow, "approved"); }} disabled={reviewMutation.isPending} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-[10px] font-black disabled:opacity-50" style={{ color: "#071008", background: NEON }}><Check size={11} /> Approve Campaign</button>
                            <button type="button" onClick={() => { setVerdict("changes_requested"); submitReview(packageRow, "changes_requested"); }} disabled={reviewMutation.isPending} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-[10px] font-black disabled:opacity-50" style={{ color: DASHBOARD_THEME.warning, background: `${DASHBOARD_THEME.warning}12`, border: `1px solid ${DASHBOARD_THEME.warning}35` }}><Send size={11} /> Request Changes</button>
                            <button type="button" onClick={() => { setVerdict("rejected"); submitReview(packageRow, "rejected"); }} disabled={reviewMutation.isPending} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-[10px] font-black text-red-300 disabled:opacity-50" style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)" }}><X size={11} /> Reject Campaign</button>
                            {selectedIds.length > 0 && <span className="text-[10px] text-white/35">{selectedIds.length} selected for changes</span>}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CampaignCard({ campaign }: { campaign: any }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const cfg = STATUS_CONFIG[campaign.status] ?? STATUS_CONFIG.draft;
  const StatusIcon = cfg.icon;
  const remaining = daysRemaining(campaign.end_date);
  const instanceId = Number(campaign.id ?? campaign.instance_id);
  const manualApproval = Boolean(campaign.manual_approval_required ?? campaign.manualApprovalRequired);
  const applicationsQuery = useQuery<{ applications: any[]; supported: boolean }>({
    queryKey: ["/api/bounties/applications", instanceId],
    queryFn: () => fetchApplications(instanceId),
    enabled: manualApproval && Number.isFinite(instanceId) && instanceId > 0,
    staleTime: 15_000,
  });
  const applicationMutation = useMutation({
    mutationFn: ({ userId, decision }: { userId: number | string; decision: ApplicationDecision }) =>
      decideApplication(instanceId, userId, decision),
    onSuccess: async () => {
      await applicationsQuery.refetch();
      await queryClient.invalidateQueries({ queryKey: ["/api/campaigns/instances"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/bounties"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/bounties/my/campaigns"] });
      toast({ title: "Application updated", description: "The creator application status is now updated." });
    },
    onError: (error: any) => {
      toast({ title: "Could not update application", description: error?.message ?? "Please try again.", variant: "destructive" });
    },
  });

  const name = campaign.name || campaign.template_name || "Unnamed Campaign";
  const completionRate = Number(campaign.participant_count ?? 0) > 0
    ? Math.round((Number(campaign.completed_count ?? 0) / Number(campaign.participant_count)) * 100)
    : 0;
  const bountyCount = campaign.bounty_count ?? (campaign.bounties?.length ?? 0);
  const contentCount = campaign.content_count ?? 0;
  const objectiveRows = objectiveProgressRows(campaign);
  const applications = applicationsQuery.data?.applications ?? [];
  const pendingApplications = applications.filter(application => ["pending", "awaiting_review", "submitted"].includes(String(application.status).toLowerCase()));

  const actions = (() => {
    switch (campaign.status) {
      case "draft":
        return [<Btn key="e" label="Edit Draft" icon={Edit3} onClick={() => {}} />];
      case "awaiting_review":
      case "approved":
        return [<Btn key="v" label="View Campaign" icon={Eye} onClick={() => {}} />];
      case "changes_requested":
        return [
          <Btn key="e" label="Edit Draft" icon={Edit3} onClick={() => {}} variant="primary" />,
        ];
      case "scheduled":
        return [<Btn key="v" label="View Campaign" icon={Eye} onClick={() => {}} />];
      case "live":
        return [
          <Btn key="v" label="View Campaign"  icon={Eye}    onClick={() => {}} variant="primary" />,
          <Btn key="s" label="Submissions"    icon={Film}   onClick={() => {}} />,
          <Btn key="p" label="Pause"          icon={Pause}  onClick={() => {}} />,
        ];
      case "paused":
        return [
          <Btn key="r" label="Resume"         icon={Play}       onClick={() => {}} variant="primary" />,
          <Btn key="v" label="View Campaign"  icon={Eye}        onClick={() => {}} />,
        ];
      case "completed":
        return [
          <Btn key="r" label="View Results"  icon={BarChart3} onClick={() => {}} variant="primary" />,
          <Btn key="s" label="Submissions"   icon={Film}      onClick={() => {}} />,
        ];
      default:
        return [<Btn key="v" label="View Campaign" icon={Eye} onClick={() => {}} />];
    }
  })();

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
      <div className="h-0.5 w-full" style={{ background: cfg.color, opacity: 0.65 }} />

      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          {campaign.game_artwork_url
            ? <img src={campaign.game_artwork_url} alt="" className="w-11 h-11 rounded-xl object-cover shrink-0" />
            : <div className="w-11 h-11 rounded-xl shrink-0 flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.05)" }}>
                <Gamepad2 size={18} className="text-white/20" />
              </div>
          }
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-black text-white truncate mb-1.5">{name}</h3>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
                style={{ color: cfg.color, background: cfg.bg }}>
                <StatusIcon size={9} />
                {cfg.label}
              </span>
              {campaign.template_name && (
                <span className="text-[10px] text-white/25 flex items-center gap-1">
                  <ShieldCheck size={9} /> {campaign.template_name}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Objective */}
        {campaign.goal_label && (
          <p className="text-[11px] text-white/38 flex items-center gap-1.5">
            <Flag size={9} className="text-white/20 shrink-0" />
            {campaign.goal_label}
          </p>
        )}

        {/* Metrics grid */}
        <div className="grid grid-cols-3 gap-2">
          {[
            {
              label: "Creators",
              value: <>{campaign.participant_count ?? 0}<span className="text-white/25">/{campaign.participant_capacity ?? "—"}</span></>,
            },
            {
              label: "Complete",
              value: <>{completionRate}%</>,
            },
            {
              label: "Content",
              value: <>{contentCount}</>,
            },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg p-2.5 text-center"
              style={{ background: "rgba(255,255,255,0.03)" }}>
              <div className="text-sm font-black text-white">{value}</div>
              <div className="text-[9px] text-white/28 uppercase tracking-wide mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Secondary row */}
        <div className="flex items-center gap-3 text-[11px] text-white/32 flex-wrap">
          {bountyCount > 0 && (
            <span className="flex items-center gap-1">
              <Target size={9} />
              {bountyCount} bounti{bountyCount === 1 ? "y" : "es"}
            </span>
          )}
          {campaign.demo_keys_required > 0 && (
            <span className="flex items-center gap-1">
              <KeyRound size={9} />
              {campaign.demo_keys_remaining ?? 0} demo keys left
            </span>
          )}
          {campaign.full_keys_required > 0 && (
            <span className="flex items-center gap-1">
              <KeyRound size={9} />
              {campaign.full_keys_remaining ?? 0} full keys left
            </span>
          )}
        </div>

        {/* Configured objectives and aggregate creator progress */}
        {objectiveRows.length > 0 && (
          <section className="space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[10px] font-black uppercase tracking-wider text-white/40">Objectives</div>
              <div className="text-[10px] text-white/25">Per creator · campaign progress</div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {objectiveRows.map((objective, index) => {
                const presentation = OBJECTIVE_PRESENTATION[objective.content_type] ?? {
                  label: objective.content_type.replace(/[_-]+/g, " ").replace(/\b\w/g, char => char.toUpperCase()),
                  icon: Target,
                };
                const ObjectiveIcon = presentation.icon;
                const hasExpectedUnits = objective.expected_units != null && objective.expected_units > 0;
                return (
                  <div key={objective.id ?? `${objective.content_type}-${index}`} className="rounded-lg p-3"
                    style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${CARD_BORDER}` }}>
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                        style={{ background: "rgba(183,255,24,0.08)", color: NEON }}>
                        <ObjectiveIcon size={13} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-white truncate">{presentation.label}</div>
                        <div className="text-[10px] text-white/35 mt-0.5">
                          {objective.quantity} per creator
                        </div>
                      </div>
                    </div>
                    <div className="mt-2.5 flex items-baseline gap-2 flex-wrap">
                      {hasExpectedUnits && (
                        <span className="text-sm font-black text-white">
                          {objective.submitted_count} <span className="text-white/30 font-bold">/ {objective.expected_units}</span>
                        </span>
                      )}
                      {!hasExpectedUnits && (
                        <span className="text-sm font-black text-white">{objective.submitted_count}</span>
                      )}
                      <span className="text-[10px] text-white/35">submitted</span>
                      <span className="text-[10px] text-white/30">
                        · {objective.approved_count} approved
                      </span>
                    </div>
                    {hasExpectedUnits && (
                      <div className="text-[9px] text-white/25 mt-0.5">units across joined creators</div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Dates */}
        <div className="flex items-center justify-between text-[11px] text-white/28">
          <span>
            {campaign.actual_start
              ? `Started ${new Date(campaign.actual_start).toLocaleDateString()}`
              : campaign.scheduled_start
              ? `Scheduled ${new Date(campaign.scheduled_start).toLocaleDateString()}`
              : campaign.submitted_at
              ? `Submitted ${new Date(campaign.submitted_at).toLocaleDateString()}`
              : `Created ${new Date(campaign.created_at).toLocaleDateString()}`}
          </span>
          <div className="flex items-center gap-3">
            {campaign.duration_days && (
              <span className="flex items-center gap-1">
                <Clock size={9} /> {campaign.duration_days}d campaign
              </span>
            )}
            {remaining !== null && ["live", "scheduled"].includes(campaign.status) && (
              <span className={remaining <= 2 ? "text-red-400" : "text-white/38"}>
                {remaining > 0 ? `${remaining}d remaining` : "Ending today"}
              </span>
            )}
          </div>
        </div>

        {/* Changes requested banner */}
        {campaign.status === "changes_requested" && campaign.rejection_reason && (
          <div className="rounded-lg px-3 py-2.5 text-[11px]"
             style={{ background: `${DASHBOARD_THEME.warning}14`, border: `1px solid ${DASHBOARD_THEME.warning}40` }}>
            <div className="font-bold mb-0.5 flex items-center gap-1.5" style={{ color: DASHBOARD_THEME.warning }}>
              <AlertCircle size={10} /> Changes Requested
            </div>
            <div className="text-white/48">{campaign.rejection_reason}</div>
          </div>
        )}

        {manualApproval && applicationsQuery.data?.supported && (
          <section className="rounded-xl p-3.5 space-y-3" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.18)" }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-amber-300">Creator Applications</div>
                <div className="text-[11px] text-white/45 mt-1">
                  {pendingApplications.length > 0
                    ? `${pendingApplications.length} application${pendingApplications.length === 1 ? "" : "s"} awaiting your review`
                    : "No applications awaiting review"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => applicationsQuery.refetch()}
                disabled={applicationsQuery.isFetching}
                className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 disabled:opacity-50"
                aria-label="Refresh creator applications"
              >
                <RefreshCw size={13} className={applicationsQuery.isFetching ? "animate-spin" : ""} />
              </button>
            </div>
            {pendingApplications.length > 0 && (
              <div className="space-y-2">
                {pendingApplications.map((application: any) => {
                  const busy = applicationMutation.isPending && applicationMutation.variables?.userId === application.userId;
                  return (
                    <div key={application.id ?? application.userId} className="flex flex-col sm:flex-row sm:items-center gap-2.5 rounded-lg px-3 py-2.5" style={{ background: "rgba(0,0,0,0.18)" }}>
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {application.avatarUrl
                          ? <img src={application.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                          : <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.08)" }}><Users size={13} className="text-white/40" /></div>}
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate">{application.displayName}</div>
                          {application.username && <div className="text-[10px] text-white/35 truncate">@{application.username}</div>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 sm:shrink-0">
                        <button
                          type="button"
                          onClick={() => applicationMutation.mutate({ userId: application.userId, decision: "approve" })}
                          disabled={busy || !application.userId}
                          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-black disabled:opacity-50"
                          style={{ color: "#86efac", background: "rgba(74,222,128,0.10)", border: "1px solid rgba(74,222,128,0.22)" }}
                        >
                          <UserCheck size={11} /> {busy ? "Saving…" : "Approve"}
                        </button>
                        <button
                          type="button"
                          onClick={() => applicationMutation.mutate({ userId: application.userId, decision: "reject" })}
                          disabled={busy || !application.userId}
                          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-black disabled:opacity-50"
                          style={{ color: "#fca5a5", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.20)" }}
                        >
                          <UserX size={11} /> Reject
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {applicationsQuery.isError && <div className="text-[10px] text-red-300">Applications could not be loaded. Refresh to try again.</div>}
          </section>
        )}

        <PackageReviewSection instanceId={instanceId} />

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-white/[0.05]">
          {actions}
        </div>
      </div>
    </div>
  );
}

export default function MyCampaignsTab({ onCreateCampaign }: { onCreateCampaign: () => void }) {
  const [filter, setFilter] = useState<FilterTab>("all");

  const { data: campaigns = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/campaigns/instances"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: NEON }} />
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="text-center py-20 space-y-5">
        <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center"
          style={{ background: "rgba(183,255,24,0.08)", border: "1px solid rgba(183,255,24,0.18)" }}>
          <Target size={28} style={{ color: NEON }} />
        </div>
        <div className="space-y-2">
          <div className="text-base font-black text-white">No campaigns yet</div>
          <div className="text-sm text-white/38 max-w-xs mx-auto leading-relaxed">
            Choose what you want to achieve and Gamefolio will automatically create the right creator bounties for your game.
          </div>
        </div>
        <div className="flex flex-col items-center gap-3">
          <button onClick={onCreateCampaign}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black"
            style={{ background: NEON, color: "#070b10" }}>
            Create Your First Campaign
          </button>
          <button className="text-xs text-white/28 hover:text-white/50 transition-colors">
            Learn How Campaigns Work
          </button>
        </div>
      </div>
    );
  }

  const countByFilter = (f: FilterTab) => {
    if (f === "all") return campaigns.length;
    return campaigns.filter(c => (STATUS_CONFIG[c.status]?.filter ?? "draft") === f).length;
  };

  const filtered = filter === "all"
    ? campaigns
    : campaigns.filter(c => (STATUS_CONFIG[c.status]?.filter ?? "draft") === filter);

  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {FILTER_TABS.map(tab => {
          const count = countByFilter(tab.id);
          if (tab.id !== "all" && count === 0) return null;
          const active = filter === tab.id;
          return (
            <button key={tab.id} onClick={() => setFilter(tab.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={{
                background: active ? "rgba(183,255,24,0.1)" : "rgba(255,255,255,0.04)",
                color: active ? NEON : "rgba(255,255,255,0.4)",
                border: `1px solid ${active ? "rgba(183,255,24,0.25)" : "rgba(255,255,255,0.07)"}`,
              }}>
              {tab.label}
              <span className="px-1.5 py-0.5 rounded text-[9px] font-black"
                style={{
                  background: active ? "rgba(183,255,24,0.15)" : "rgba(255,255,255,0.06)",
                  color: active ? NEON : "rgba(255,255,255,0.35)",
                }}>
                {count}
              </span>
            </button>
          );
        })}

        <button onClick={onCreateCampaign}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
          style={{ background: "rgba(183,255,24,0.1)", color: NEON, border: "1px solid rgba(183,255,24,0.25)" }}>
          <Plus size={11} /> New Campaign
        </button>
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-sm text-white/28">
          No {filter !== "all" ? filter : ""} campaigns found.
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          {filtered.map(c => <CampaignCard key={c.id} campaign={c} />)}
        </div>
      )}
    </div>
  );
}
