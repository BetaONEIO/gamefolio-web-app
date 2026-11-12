import { VerifiedIcon } from "@/components/ui/verified-icon";
import { GameBountyAccess, GameBountyCommunity } from '@/components/bounties/GameBountySections';
import { GameBountyGate, bountyNeedsKey } from '@/components/bounties/GameBountyGate';
import { canStartBountyOnSubmission, isRegularBounty, nextBountySubmissionSlot } from '@shared/bounty-submission-policy';
import { bountyInstanceId, discoveryGameKey, discoveryGameOpportunities, groupDiscoveryGames, bountyXpLabel, otherActiveGameOpportunity } from '@shared/bounty-game-groups';
import { creatorJourneyGuidance } from '@shared/campaign-journey-guidance';
import { BountyRewardPool } from '@/components/bounties/BountyRewardPool';
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Redirect, useLocation, useSearch } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useAuthModal } from "@/hooks/use-auth-modal";
import { useToast } from "@/hooks/use-toast";
import { useSignedUrl, useSignedUrls } from "@/hooks/use-signed-url";
import { apiRequest, authedFetch, getQueryFn } from "@/lib/queryClient";
import { isNative } from "@/lib/platform";
import { gameProfileBountyDetails, gameProfileBountyFactIcon } from "@/lib/game-profile-bounty-details";
import { GAME_PLATFORM_LINKS } from "@/lib/indie-game-links";
import { publicGameBountyPath, publicGamePath } from "@/lib/game-routes";
import CampaignFileDropzone, { campaignFileError, campaignVideoFileError } from "@/components/bounties/CampaignFileDropzone";
import type { UploadLimits } from "@shared/schema";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { CampaignGameDetails } from "@/components/bounties/CampaignGameDetails";
import { CampaignMediaPreview } from "@/components/bounties/CampaignMediaPreview";
import { CampaignContentGallery } from "@/components/bounties/CampaignContentGallery";
import { CampaignStatusHud } from "@/components/bounties/CampaignStatusHud";
import { CampaignTimeline } from "@/components/campaign/CampaignTimeline";
import { formatCampaignMoment } from "@/lib/campaign-timeline";
import {
  StreamSpotlightBrief,
  StreamSpotlightSubmissionForm,
  StreamSpotlightSubmissionPreview,
  streamCampaignConfig,
  useStreamSpotlightEligibility,
  verifiedStreamMinutes,
} from "@/components/bounties/StreamSpotlight";
import { useDeveloperBountySummary } from "@/hooks/use-developer-bounty-summary";
import { isBountyCreatorParticipationRestricted } from "@/lib/bounty-creator-access";
import {
  Target, ShieldCheck, Clock, Users, Key, KeyRound, ChevronRight, ChevronLeft,
  Zap, Copy, Check, Loader2, Lock,
  Film, Camera, MessageSquare, Star, AlertCircle, Upload, Plus,
  Trophy, Gift, Search, SlidersHorizontal, X, ChevronDown, Store, Flame, Info, Send, Gamepad2,
} from "lucide-react";
import { SiSteam } from "react-icons/si";
import {
  CAMPAIGN_HERO_FALLBACK,
  campaignHeroSources,
  nextCampaignHeroSource,
} from "@/lib/campaign-hero";

import "./bounty-detail.css";
import { ReviewStarRating, SavedReviewStars, savedReviewRating } from "@/components/bounties/ReviewStarRating";

const NEON = "#B9FF1A";
const BOUNTY_XP_IMAGE = "/attached_assets/XP-text_1779960376768.png";

function BountyXpBadge({ xp }: { xp: number }) {
  return (
    <div className="mx-auto flex aspect-square w-36 max-w-full flex-col items-center justify-center gap-1.5 rounded-full bg-[#141824] p-4 text-center text-[#B9FF1A]">
      <img src={BOUNTY_XP_IMAGE} alt="" className="h-12 w-20 object-contain" />
      <p className="text-sm font-semibold leading-tight">
        <span className="block text-lg font-bold tabular-nums">{xp.toLocaleString()}</span>{" "}
        Bounty XP
      </p>
    </div>
  );
}

type PreparedBountyMedia = {
  file: File;
  title?: string;
  description?: string;
};

type BountyDraftProps = {
  preparedMedia?: PreparedBountyMedia;
  onPreparedMedia?: (media: PreparedBountyMedia | null) => void;
  preparedText?: string;
  onPreparedText?: (text: string) => void;
  preparedRating?: number;
  onPreparedRating?: (rating?: number) => void;
};

function BountySubmissionFields({ title, description, disabled, autoFocus, onTitle, onDescription }: {
  title: string;
  description: string;
  disabled?: boolean;
  autoFocus?: boolean;
  onTitle: (value: string) => void;
  onDescription: (value: string) => void;
}) {
  return <div className="space-y-4">
    <label className="block text-sm font-semibold">Title
      <input autoFocus={autoFocus} required maxLength={100} value={title} disabled={disabled} onChange={event => onTitle(event.target.value)}
        className="mt-2 w-full rounded-md border border-white/20 bg-[#171927] px-3 py-2 text-white"
        placeholder="Give your submission a title" />
    </label>
    <label className="block text-sm font-semibold">Description <span className="font-normal text-white/65">(optional)</span>
      <textarea rows={3} maxLength={500} value={description} disabled={disabled} onChange={event => onDescription(event.target.value)}
        className="mt-2 w-full rounded-md border border-white/20 bg-[#171927] px-3 py-2 text-white"
        placeholder="Tell the developer about your submission" />
    </label>
  </div>;
}

function PreparedClipDialog({ media, onChange, onClose, joinAction }: {
  media: PreparedBountyMedia;
  onChange: (media: PreparedBountyMedia) => void;
  onClose: () => void;
  joinAction: React.ReactNode;
}) {
  const [previewUrl, setPreviewUrl] = useState<string>();
  useEffect(() => {
    const url = URL.createObjectURL(media.file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [media.file]);

  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className="max-h-[92dvh] w-[calc(100%_-_2rem)] max-w-2xl overflow-y-auto bg-background">
      <DialogTitle>Gameplay clip</DialogTitle>
      <DialogDescription>Your clip stays on this device until you submit it.</DialogDescription>
      <video src={previewUrl} aria-label="Gameplay clip preview" controls playsInline
        className="aspect-video max-h-[38dvh] w-full rounded-md bg-black object-contain" />
      <BountySubmissionFields title={media.title ?? ""} description={media.description ?? ""}
        onTitle={title => onChange({ ...media, title })}
        onDescription={description => onChange({ ...media, description })} />
      <div className="flex flex-wrap items-center justify-end gap-3">
        <button type="button" className="px-3 py-2 text-sm text-white/75 hover:text-white" onClick={onClose}>Back</button>
        {joinAction}
      </div>
    </DialogContent>
  </Dialog>;
}

// First-party, deduplicated discovery counts; no keys or contact details are sent.
function trackDiscovery(campaign:any,type:string) {
  if(!campaign.included_discovery)return;
  try {let visit=sessionStorage.getItem('gamefolio:bounty-visit');if(!visit){visit=crypto.randomUUID();sessionStorage.setItem('gamefolio:bounty-visit',visit);}void apiRequest('POST',`/api/bounties/${campaign.id}/discovery-event`,{type,visit}).catch(()=>{});}catch{}
}
function useDiscoveryImpression(campaign:any) {
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{const target=ref.current;if(!target||!campaign.included_discovery)return;const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){trackDiscovery(campaign,'listing_impression');observer.disconnect();}},{threshold:.5});observer.observe(target);return ()=>observer.disconnect();},[campaign.id,campaign.included_discovery]);
  return ref;
}

function campaignVideoFrameStyle(type: string) {
  return type === "reel"
    ? { width: "min(100%, 42.1875vh)", aspectRatio: "9 / 16" }
    : { width: "min(100%, 133.333vh)", aspectRatio: "16 / 9" };
}
const CARD_BG = "rgba(255,255,255,0.035)";
const CARD_BORDER = "rgba(255,255,255,0.10)";

type View = "marketplace" | "detail" | "progress";
type MyTab = "active" | "submitted" | "completed" | "expired";
type MainTab = "marketplace" | "my" | "reward-pool";

const CONTENT_TYPE_ICON: Record<string, any> = {
  clip: Film, screenshot: Camera, feedback: MessageSquare,
  reel: Film, session: Zap, bug: AlertCircle, stream: Zap, review: Star,
};

const SUBMISSION_SECTION_LABELS: Record<string, string> = {
  clip: 'Gameplay clips', reel: 'Reels', screenshot: 'Screenshots',
  feedback: 'Feedback', review: 'Reviews', stream: 'Livestreams',
};
const CONTENT_TYPE_LABEL: Record<string, string> = {
  clip: "Gameplay Clip", screenshot: "Screenshot", feedback: "Feedback Form",
  reel: "Reel", session: "Play Session", bug: "Bug Report", stream: "Livestream", review: "Review",
};

function configuredObjectives(rows: unknown): any[] {
  return Array.isArray(rows)
    ? rows.filter(row => row && Number.isInteger(Number(row.quantity)) && Number(row.quantity) > 0)
    : [];
}

function objectiveCategory(contentType: string): string {
  if (["clip", "reel", "stream"].includes(contentType)) return "Create Content";
  if (contentType === "screenshot") return "Capture the Game";
  if (["feedback", "review"].includes(contentType)) return "Share Feedback";
  if (contentType === "bug") return "Improve the Game";
  if (contentType === "session") return "Play the Game";
  return "Other Requirements";
}

function groupedObjectives(objectives: any[]) {
  const groups = new Map<string, any[]>();
  for (const objective of objectives) {
    const category = objectiveCategory(String(objective.content_type ?? "").toLowerCase());
    groups.set(category, [...(groups.get(category) ?? []), objective]);
  }
  return Array.from(groups, ([category, rows]) => ({ category, rows }));
}

function livestreamPlatform(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.pathname.length <= 1) return null;
    const host = url.hostname.toLowerCase();
    if (["twitch.tv", "www.twitch.tv"].includes(host)) return "Twitch";
    if (["kick.com", "www.kick.com"].includes(host)) return "Kick";
    if (["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"].includes(host)) return "YouTube";
    if (["rumble.com", "www.rumble.com"].includes(host)) return "Rumble";
  } catch { /* Not a valid URL yet. */ }
  return null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  staged:                  { label: "Ready",                    color: NEON,      bg: "rgba(185,255,26,0.10)" },
  active:                  { label: "In Progress",             color: NEON,      bg: "transparent" },
  under_review:            { label: "Under Review",             color: NEON, bg: "rgba(185,255,26,0.08)" },
  pending:                 { label: "Submitted for Review",     color: NEON, bg: "rgba(185,255,26,0.08)" },
  enrolled:               { label: "Joined",                  color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
  pending_application:    { label: "Application Pending",     color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  application_pending:    { label: "Application Pending",     color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  application_approved:   { label: "Application Approved",    color: NEON, bg: "rgba(185,255,26,0.10)" },
  approved:               { label: "Application Approved",    color: NEON, bg: "rgba(185,255,26,0.10)" },
  demo_key_claimed:       { label: "Demo Key Claimed",        color: NEON,      bg: "rgba(183,255,24,0.12)" },
  in_progress:            { label: "In Progress",             color: NEON,      bg: "transparent" },
  submitted_for_review:   { label: "Submitted for Review",    color: NEON, bg: "rgba(185,255,26,0.08)" },
  changes_requested:      { label: "Changes Requested",       color: "#f97316", bg: "rgba(249,115,22,0.12)" },
  completed_and_verified: { label: "All Bounties Verified",   color: NEON,      bg: "rgba(185,255,26,0.12)" },
  completed:              { label: "Completed",               color: NEON, bg: "rgba(185,255,26,0.10)" },
  full_game_awarded:      { label: "Full Game Awarded",       color: NEON,      bg: "transparent" },
  rejected:               { label: "Rejected",                color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  expired:                { label: "Expired",                 color: "#6b7280", bg: "rgba(107,114,128,0.1)"  },
};

function isIndieDeveloperUser(user: any): boolean {
  return isBountyCreatorParticipationRestricted(user);
}

function timeRemaining(endDate: string | null) {
  if (!endDate) return "Ongoing";
  const diff = new Date(endDate).getTime() - Date.now();
  if (diff <= 0) return "Ended";
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h left`;
  return `${hours}h left`;
}

function accessMethodLabel(campaign: any) {
  const method = campaign.access_method ?? campaign.accessMethod;
  if (method === "demo_to_full") return "Demo access · full game after completion";
  if (method === "full_game_upfront" || method === "full_upfront") return "Full game access on joining";
  const hasFullReward = Boolean(campaign.completion_full_game_key ?? campaign.completion_reward_key_required);
  if (method === "public_demo") return hasFullReward ? "Public demo · full game after completion" : "Public demo access";
  if (method === "free_to_play") return "Free-to-play access";
  if (method === "private_playtest") return hasFullReward ? "Private playtest · full game after completion" : "Private playtest access";
  if (method === "custom_access" || method === "custom") return "Custom access instructions";
  if (campaign.demo_keys_remaining > 0) return "Demo access";
  return "Access details available in mission";
}

function campaignAccessKeysRemaining(campaign: any) {
  const method = campaign.access_method ?? campaign.accessMethod;
  if (method === "full_game_upfront" || method === "full_upfront") {
    return Number(campaign.full_access_keys_remaining ?? 0);
  }
  // The full_keys_remaining field is the completion reward pool, not access.
  return Number(campaign.demo_keys_remaining ?? 0);
}

// ── Build requirement checklist from bounties ────────────────────────────────────────────────────
function bountyRequirements(bounties: any[]): string[] {
  const quantities = new Map<string, number>();
  for (const b of bounties) {
    const ct = b.content_type as string;
    quantities.set(ct, (quantities.get(ct) ?? 0) + Number(b.quantity));
  }
  const reqs: string[] = [];
  for (const [ct, qty] of Array.from(quantities.entries())) {
    if (ct === "clip")       reqs.push(`Upload ${qty} Gameplay Clip${qty !== 1 ? "s" : ""}`);
    else if (ct === "screenshot") reqs.push(`Upload ${qty} Screenshot${qty !== 1 ? "s" : ""}`);
    else if (ct === "feedback")   reqs.push(`Add ${qty} Feedback Item${qty !== 1 ? "s" : ""}`);
    else if (ct === "review")     reqs.push(`Submit ${qty} Review${qty !== 1 ? "s" : ""}`);
    else if (ct === "reel")       reqs.push(`Upload ${qty} Reel${qty !== 1 ? "s" : ""}`);
    else if (ct === "stream")     reqs.push(`Go Live on Stream${qty !== 1 ? ` ${qty} times` : ""}`);
    else if (ct === "session")    reqs.push(`Complete ${qty} Play Session${qty !== 1 ? "s" : ""}`);
    else if (ct === "bug")        reqs.push(`File ${qty} Bug Report${qty !== 1 ? "s" : ""}`);
    else reqs.push(`${qty} ${ct.charAt(0).toUpperCase() + ct.slice(1)}`);
  }
  return reqs;
}

// ── Reward column ─────────────────────────────────────────────────────────
function RewardCol({ icon, label, sublabel, value, active }: { icon: any; label: string; sublabel: string; value: string; active: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all duration-200 hover:scale-[1.04]"
      style={{ background: active ? "rgba(184,255,27,0.07)" : "rgba(255,255,255,0.04)", border: `1px solid ${active ? "rgba(184,255,27,0.20)" : "rgba(255,255,255,0.07)"}`, boxShadow: active ? "0 0 0 0 rgba(184,255,27,0)" : undefined }}>
      <div className="w-[54px] h-[54px] flex items-center justify-center">{icon}</div>
      <span className="text-[11px] font-black leading-tight text-center px-1" style={{ color: active ? NEON : "rgba(255,255,255,0.85)" }}>{value}</span>
      <span className="text-[9px] font-bold leading-tight text-center px-1" style={{ color: "rgba(255,255,255,0.40)" }}>{label}</span>
      <span className="text-[8px] leading-tight text-center px-1 uppercase tracking-wider" style={{ color: active ? "rgba(184,255,27,0.55)" : "rgba(255,255,255,0.20)" }}>{sublabel}</span>
    </div>
  );
}

function CompactObjectiveRow({
  title,
  description,
  contentType,
  quantity,
  progress = 0,
  interactive = false,
  flat = false,
  done = false,
  status,
  onClick,
}: {
  title: string;
  description: string;
  contentType: string;
  quantity: number;
  progress?: number;
  interactive?: boolean;
  flat?: boolean;
  done?: boolean;
  status?: string;
  onClick?: () => void;
}) {
  const Icon = CONTENT_TYPE_ICON[contentType] ?? Target;
  const accent = NEON;
  const clampedProgress = Math.min(progress, quantity);
  const rowClass = `relative w-full ${flat ? "rounded-sm px-1 py-4 sm:px-2" : "rounded-xl p-4"} flex items-center gap-3 sm:gap-4 text-left transition-colors ${interactive ? "cursor-pointer hover:bg-white/[0.035]" : ""}`;

  return (
    <div
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? onClick : undefined}
      onKeyDown={interactive ? e => { if (e.key === "Enter" || e.key === " ") onClick?.(); } : undefined}
      className={rowClass}
      style={flat ? {
         opacity: 1,
      } : {
         background: done ? "rgba(185,255,26,0.045)" : CARD_BG,
        border: `1px solid ${done ? "rgba(185,255,26,0.22)" : "rgba(255,255,255,0.09)"}`,
         opacity: 1,
      }}
    >
      <div className={`${flat ? "w-7 h-7" : "w-9 h-9 rounded-lg"} flex items-center justify-center flex-shrink-0`}
        style={{ background: flat ? "transparent" : done ? "rgba(185,255,26,0.12)" : "rgba(185,255,26,0.08)", color: accent }}>
        {done ? <Check size={16} strokeWidth={3} /> : <Icon size={16} />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="text-sm font-black text-white leading-tight">{title}</div>
          {status && <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full" style={{ color: NEON, background: done ? "rgba(185,255,26,0.10)" : "rgba(185,255,26,0.08)" }}>{status}</span>}
        </div>
        <div className="text-[11px] text-white/40 truncate mt-1">{description}</div>
        {interactive && !flat && (
          <div className="h-1.5 rounded-full overflow-hidden mt-2 max-w-sm" style={{ background: "rgba(255,255,255,0.07)" }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${quantity > 0 ? (clampedProgress / quantity) * 100 : 0}%`, background: NEON }} />
          </div>
        )}
      </div>

      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <div className="text-[11px] font-black tabular-nums" style={{ color: done ? NEON : "rgba(255,255,255,0.52)" }}>
          {interactive ? `${clampedProgress} / ${quantity}` : `${quantity} required`}
        </div>
        {interactive && <ChevronRight size={14} className="text-white/25" />}
      </div>
    </div>
  );
}

function objectiveDescription(b: any) {
  const qty = Number(b.quantity ?? 1);
  const ct = b.content_type as string;
  return b.description ?? (ct === "clip" ? `Upload at least ${qty} gameplay clip${qty !== 1 ? "s" : ""}` :
    ct === "screenshot" ? `Capture ${qty} in-game screenshot${qty !== 1 ? "s" : ""}` :
    ct === "feedback" ? "Share your impressions of the game" :
    ct === "review" ? `Submit ${qty} Gamefolio review${qty !== 1 ? "s" : ""}` :
    ct === "reel" ? `Create ${qty} highlight reel${qty !== 1 ? "s" : ""}` :
    ct === "stream" ? "Go live and stream your gameplay" :
    ct === "bug" ? `Document ${qty} bug${qty !== 1 ? "s" : ""}` : "Complete this objective");
}

function objectiveLabel(b: any) {
  const qty = Number(b.quantity ?? 1);
  const ct = b.content_type as string;
  if (ct === "clip")       return `Upload ${qty} Gameplay Clip${qty !== 1 ? "s" : ""}`;
  if (ct === "screenshot") return `Upload ${qty} Screenshot${qty !== 1 ? "s" : ""}`;
  if (ct === "feedback")   return "Submit First Impressions";
  if (ct === "review")     return `Submit ${qty} Review${qty !== 1 ? "s" : ""}`;
  if (ct === "reel")       return `Upload ${qty} Reel${qty !== 1 ? "s" : ""}`;
  if (ct === "stream")     return "Go Live on Stream";
  if (ct === "session")    return "Complete a Play Session";
  if (ct === "bug")        return `File ${qty} Bug Report${qty !== 1 ? "s" : ""}`;
  return b.title ?? ct;
}

function objectiveWorkflowStatus(b: any, progress: number, quantity: number, joined: boolean) {
  if (!joined) return undefined;
  const state = String(b.validation_state ?? b.status ?? "").toLowerCase();
  if (["validating", "under_review"].includes(state)) return "Validating";
  if (["needs_attention", "changes_requested"].includes(state)) return "Needs Attention";
  if (["rejected"].includes(state)) return "Rejected";
  if (progress >= quantity) return "Complete";
  if (progress > 0 || ["submitted", "submitted_for_review"].includes(state)) return "Submitted";
  return "Not Started";
}

function campaignProgressUnits(campaign: any) {
  const required = configuredObjectives(campaign.objective_progress);
  const requiredUnits = required.reduce((sum: number, objective: any) => sum + Math.max(Number(objective.quantity ?? 1), 1), 0);
  const approvedUnits = required.reduce((sum: number, objective: any) => sum + Math.min(Number(objective.approved_count ?? 0), Math.max(Number(objective.quantity ?? 1), 1)), 0);
  const submittedUnits = required.reduce((sum: number, objective: any) => sum + Math.min(Number(objective.submitted_count ?? 0), Math.max(Number(objective.quantity ?? 1), 1)), 0);
  const preparedUnits = required.reduce((sum: number, objective: any) => sum +
    Math.min(Number(objective.staged_count ?? 0) + Number(objective.submitted_count ?? 0),
      Math.max(Number(objective.quantity ?? 1), 1)), 0);

  return {
    requiredUnits: Number(campaign.required_objective_units ?? requiredUnits),
    approvedUnits: Number(campaign.approved_objective_units ?? approvedUnits),
    submittedUnits: Number(campaign.submitted_objective_units ?? submittedUnits),
    preparedUnits,
  };
}

function campaignJourneyStatus(campaign: any) {
  return campaign.journey_status ?? campaign.participant_status;
}

function campaignTabStatus(campaign: any): MyTab {
  const status = campaignJourneyStatus(campaign);
  if (["under_review", "submitted_for_review"].includes(status)) return "submitted";
  if (["completed", "completed_and_verified", "full_game_awarded"].includes(status)) return "completed";
  if (["expired", "rejected", "cancelled"].includes(status)) return "expired";
  if (isRegularBounty(campaign) && campaign.previous_month && status !== "changes_requested") return "expired";
  const deadline = campaignDeadline(campaign);
  if (deadline && new Date(deadline).getTime() <= Date.now()) return "expired";
  return "active";
}

function campaignDeadline(campaign: any) {
  if (isRegularBounty(campaign)) return null;
  return campaign.completion_deadline
    ?? campaign.creator_deadline
    ?? campaign.deadline
    ?? campaign.end_date
    ?? null;
}

function campaignDeadlineLabel(campaign: any) {
  const deadline = campaignDeadline(campaign);
  if (!deadline) return "No deadline";
  const diff = new Date(deadline).getTime() - Date.now();
  if (!Number.isFinite(diff)) return "No deadline";
  if (diff <= 0) return "EXPIRED";
  if (diff < 86400000) {
    const hours = Math.max(1, Math.ceil(diff / 3600000));
    return `${hours}h left`;
  }
  const days = Math.ceil(diff / 86400000);
  return `${days}d left`;
}

function campaignDeadlineUrgency(campaign: any) {
  const deadline = campaignDeadline(campaign);
  if (!deadline) return "normal";
  const diff = new Date(deadline).getTime() - Date.now();
  if (!Number.isFinite(diff) || diff <= 0) return "expired";
  if (diff < 86400000) return "critical";
  if (diff <= 2 * 86400000) return "urgent";
  if (diff <= 6 * 86400000) return "soon";
  return "normal";
}

function campaignNextObjective(campaign: any, progress: { requiredUnits: number; approvedUnits: number; submittedUnits: number }) {
  const status = campaignJourneyStatus(campaign);
  const next = campaign.next_objective;
  if (status === "changes_requested") {
    return { title: "Resubmit requested content", detail: next?.title ?? "Review the requested changes", progress: null };
  }
  if (status === "under_review" || status === "submitted_for_review") {
    return { title: "Awaiting developer verification", detail: next?.title ?? null, progress: null };
  }
  if (next) {
    const quantity = Math.max(Number(next.quantity ?? 1), 1);
    const submitted = Math.min(Number(next.submitted_units ?? 0), quantity);
    const approved = Math.min(Number(next.approved_units ?? 0), quantity);
    return {
      title: next.title ?? objectiveDescription(next),
      detail: next.description ?? objectiveDescription(next),
      progress: `${Math.max(submitted, approved)}/${quantity}`,
    };
  }
  if (progress.requiredUnits > 0 && progress.approvedUnits >= progress.requiredUnits) {
    return { title: "All objectives complete — rewards pending", detail: null, progress: null };
  }
  if (campaignTabStatus(campaign) === "completed") {
    return { title: "Campaign complete", detail: null, progress: null };
  }
  return { title: "No required objectives configured", detail: null, progress: null };
}

function campaignRewardSummary(campaign: any) {
  const rewards: { icon: any; label: string; tone?: string }[] = [];
  const totalXp = Number(campaign.total_campaign_xp ?? 0);

  if (totalXp > 0) rewards.push({ icon: Zap, label: `+${totalXp.toLocaleString()} Bounty XP Reward`, tone: NEON });
  const gftAmount = Number(campaign.gft_reward_amount ?? 0);
  if (gftAmount > 0) rewards.push({ icon: Trophy, label: `${gftAmount.toLocaleString()} GFT`, tone: "#fbbf24" });
  if (campaign.has_full_game_reward || campaign.completion_full_game_key || campaign.completion_reward_type === "full_game_key") {
    rewards.push({ icon: Gift, label: "Full game", tone: "#a78bfa" });
  }
  if (campaign.completion_reward_type === "xp_badge" || campaign.has_badge_reward) {
    rewards.push({ icon: Star, label: "Profile badge", tone: "#60a5fa" });
  }
  return rewards;
}

function CampaignRewardChip({ icon: Icon, label, tone }: { icon: any; label: string; tone?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold whitespace-nowrap text-white/70">
      <Icon size={12} strokeWidth={2.4} style={{ color: tone ?? NEON }} />
      {label}
    </span>
  );
}

// ── Requirement pill ──────────────────────────────────────────────────────
const REQ_ICON: Record<string, any> = {
  clip: Film, screenshot: Camera, feedback: MessageSquare,
  reel: Film, session: Zap, bug: AlertCircle, stream: Zap,
};
function reqPillLabel(ct: string, qty: number) {
  if (ct === "clip")       return `×${qty} Clips`;
  if (ct === "screenshot") return `×${qty} Screenshots`;
  if (ct === "feedback")   return `×${qty} Feedback`;
  if (ct === "review")     return `×${qty} Reviews`;
  if (ct === "reel")       return `×${qty} Reels`;
  if (ct === "stream")     return `×${qty} Livestream${qty !== 1 ? "s" : ""}`;
  if (ct === "session")    return `×${qty} Play Session${qty !== 1 ? "s" : ""}`;
  if (ct === "bug")        return `×${qty} Bug Reports`;
  return `×${qty} ${CONTENT_TYPE_LABEL[ct] ?? ct}`;
}
function FeaturedHeroBackground({ campaign, className }: { campaign: any; className?: string }) {
  const sources = campaignHeroSources(campaign);
  const [sourceIndex, setSourceIndex] = useState(0);
  const source = sources[sourceIndex] ?? null;

  useEffect(() => {
    setSourceIndex(0);
  }, [campaign.id, sources.join("|")]);

  useEffect(() => {
    if (!source) return;
    const probe = new Image();
    probe.onerror = () => {
      setSourceIndex(current => {
        if (current !== sourceIndex) return current;
        const nextSource = nextCampaignHeroSource(sources, source);
        return nextSource ? sources.indexOf(nextSource) : sources.length;
      });
    };
    probe.src = source;
    return () => {
      probe.onload = null;
      probe.onerror = null;
    };
  }, [source, sourceIndex]);

  return (
    <div
      className={className ?? "absolute inset-0 bg-center bg-cover bg-no-repeat transition-[background-image] duration-300"}
      aria-hidden="true"
      style={{
        backgroundImage: source
          ? `url("${source}")`
          : CAMPAIGN_HERO_FALLBACK,
        backgroundPosition: "center",
      }}
    />
  );
}

const OBJECTIVE_MARKETING_TITLES: Record<string, string> = {
  feedback: "Share Your Feedback",
  review: "Review the Game",
  clip: "Create a Gameplay Clip",
  reel: "Make a Reel",
  screenshot: "Capture the Game",
  stream: "Go Live",
  bug: "Find & Report Bugs",
  session: "Play the Game",
};

function objectiveMarketingTitle(bounty: any) {
  const contentType = String(bounty.content_type ?? "").toLowerCase();
  return OBJECTIVE_MARKETING_TITLES[contentType] ?? String(bounty.title ?? contentType).toUpperCase();
}

function objectiveRequirementLabel(bounty: any) {
  const quantity = Math.max(Number(bounty.quantity ?? 1), 1);
  const nouns: Record<string, string> = {
    feedback: "feedback item",
    review: "review",
    clip: "gameplay clip",
    reel: "reel",
    screenshot: "screenshot",
    stream: "livestream",
    bug: "bug report",
    session: "play session",
  };
  const noun = nouns[String(bounty.content_type ?? "").toLowerCase()] ?? "submission";
  return `${quantity} ${noun}${quantity === 1 ? "" : "s"} required`;
}

function campaignRewardStats(campaign: any, bounties: any[], joined: boolean) {
  // Every configured objective is a required step. Legacy rows may still have
  // mandatory=false, but that flag no longer changes this campaign flow.
  const required = configuredObjectives(bounties);
  const units = (items: any[], field?: string) => items.reduce((sum: number, bounty: any) => {
    const quantity = Math.max(Number(bounty.quantity ?? 1), 1);
    const value = field ? Number(bounty[field] ?? 0) : quantity;
    return sum + Math.min(value, quantity);
  }, 0);
  const approvedUnits = joined
    ? Number(campaign.approved_objective_units ?? units(required, "approved_count"))
    : 0;
  const submittedUnits = joined
    ? Number(campaign.submitted_objective_units ?? units(required, "submitted_count"))
    : 0;
  const preparedUnits = joined
    ? required.reduce((sum: number, bounty: any) => {
      const quantity = Math.max(Number(bounty.quantity ?? 1), 1);
      return sum + Math.min(Number(bounty.staged_count ?? 0) + Number(bounty.submitted_count ?? 0) + Number(bounty.approved_count ?? 0), quantity);
    }, 0)
    : 0;
  const requiredUnits = Number(campaign.required_objective_units ?? units(required));
  const requiredXp = Math.max(Number(campaign.total_campaign_xp ?? 0), 0);
  const earnedXp = Number(campaign.awarded_campaign_xp ?? 0);

  return {
    requiredUnits,
    approvedUnits: Math.min(approvedUnits, requiredUnits),
    submittedUnits: Math.min(submittedUnits, requiredUnits),
    preparedUnits: Math.min(preparedUnits, requiredUnits),
    requiredXp,
    earnedXp,
    percent: requiredUnits > 0 ? Math.round(Math.min(approvedUnits, requiredUnits) / requiredUnits * 100) : 0,
  };
}

function campaignGameTitle(campaign: any) {
  return campaign.catalog_game_name || campaign.game_profile_name || campaign.game_name || null;
}

function committedSubmissionSummary(bounties: any[]) {
  const submittedSlots = new Set<string>();
  const timestamps: number[] = [];
  for (const bounty of bounties) {
    for (const [index, submission] of (Array.isArray(bounty.submissions) ? bounty.submissions : []).entries()) {
      const state = String(submission.status ?? "").toLowerCase();
      if (!["pending", "submitted", "submitted_for_review", "under_review", "approved", "changes_requested", "rejected"].includes(state)) continue;
      const slot = Number(submission.slot_index ?? index);
      if (Number.isInteger(slot) && slot >= 0) submittedSlots.add(`${bounty.id}:${slot}`);
      const submittedAt = submission.submitted_at ? new Date(submission.submitted_at).getTime() : NaN;
      if (Number.isFinite(submittedAt)) timestamps.push(submittedAt);
    }
  }
  return { count: submittedSlots.size, submittedAt: timestamps.length ? new Date(Math.max(...timestamps)).toISOString() : null };
}

function latestCampaignSubmissionForSlot(submissions: any[], slotIndex: number) {
  return submissions.reduce((latest: any, submission: any, index: number) => {
    if (Number(submission.slot_index ?? index) !== slotIndex) return latest;
    return !latest || Number(submission.id) > Number(latest.id) ? submission : latest;
  }, null);
}

function requestedSlotIsEditable(submissions: any[], slotIndex: number) {
  const latest = latestCampaignSubmissionForSlot(submissions, slotIndex);
  const status = String(latest?.status ?? "").toLowerCase();
  if (["changes_requested", "rejected"].includes(status)) return true;
  // A staged replacement stays editable until the whole package is resubmitted.
  return status === "staged" && submissions.some((submission: any, index: number) =>
    Number(submission.slot_index ?? index) === slotIndex
    && ["changes_requested", "rejected"].includes(String(submission.status ?? "").toLowerCase())
  );
}

function campaignGameArtwork(campaign: any) {
  return campaign.game_profile_header_artwork_url
    || campaign.catalog_game_artwork_url
    || campaign.game_profile_capsule_artwork_url
    || campaign.game_profile_screenshot_artwork_url
    || (!campaign.catalog_game_name ? campaign.game_artwork_url : null)
    || (!campaign.catalog_game_name ? campaign.campaign_artwork_url : null)
    || null;
}

function campaignGenreKeys(campaign: any): Set<string> {
  const rawGenres = campaign.game_profile_genres ?? campaign.genres ?? [];
  let genres: unknown[] = [];
  if (Array.isArray(rawGenres)) {
    genres = rawGenres;
  } else if (typeof rawGenres === "string") {
    try {
      const parsed = JSON.parse(rawGenres);
      genres = Array.isArray(parsed) ? parsed : rawGenres.split(",");
    } catch {
      genres = rawGenres.split(",");
    }
  }
  return new Set(genres.map(genre => String(genre).trim().toLowerCase()).filter(Boolean));
}

function ObjectiveArtwork({ bounty, campaign }: { bounty: any; campaign: any }) {
  const contentType = String(bounty.content_type ?? "").toLowerCase();
  const Icon = CONTENT_TYPE_ICON[contentType] ?? Target;

  // Keep objective artwork consistent and subordinate to the copy. This
  // replaces the legacy character-art fallbacks in the campaign flow.
  void campaign;

  return (
    <div className="relative flex h-[128px] items-center justify-center sm:h-[142px]" aria-hidden="true">
      <div className="absolute bottom-3 h-12 w-28 rounded-full bg-black/25 blur-2xl" />
      <span className="relative z-10 inline-flex items-center justify-center bg-background px-2">
        <Icon size={58} strokeWidth={1.25} className="text-white/80 sm:h-[66px] sm:w-[66px]" />
      </span>
    </div>
  );
}

function VisualMissionCard({ bounty, campaign, marker }: { bounty: any; campaign: any; marker: string }) {
  return (
    <article className="min-w-0">
      <ObjectiveArtwork bounty={bounty} campaign={campaign} />
      <div className="flex max-w-[520px] flex-col space-y-3">
        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/35">{marker}</div>
        <h3 className="min-h-[2em] text-[clamp(1.15rem,1.8vw,1.55rem)] font-black uppercase leading-[0.98] tracking-tight text-white">
          {objectiveMarketingTitle(bounty)}
        </h3>
        <p className="min-h-[2.5rem] max-w-[500px] text-xs leading-relaxed text-white/48">
          {objectiveMarketingDescription(bounty)}
        </p>
        <div className="max-w-[500px] border-b border-white/[0.14] pb-3 pt-1 text-[11px] font-black uppercase tracking-wide text-white/78">
          {objectiveRequirementLabel(bounty).replace(" required", "")}
        </div>
      </div>
    </article>
  );
}

function objectiveMarketingDescription(bounty: any) {
  const quantity = Math.max(Number(bounty.quantity ?? 1), 1);
  const contentType = String(bounty.content_type ?? "").toLowerCase();
  if (contentType === "feedback") return `Add ${quantity} feedback item${quantity === 1 ? "" : "s"} for the developer.`;
  if (contentType === "review") return `Submit ${quantity} Gamefolio review${quantity === 1 ? "" : "s"}.`;
  if (contentType === "screenshot") return `Upload ${quantity} gameplay screenshot${quantity === 1 ? "" : "s"}.`;
  if (contentType === "clip") return `Record ${quantity} gameplay or review clip${quantity === 1 ? "" : "s"}.`;
  if (contentType === "reel") return `Create ${quantity} gameplay highlight reel${quantity === 1 ? "" : "s"}.`;
  if (contentType === "stream") return "Go live and share your gameplay.";
  if (contentType === "bug") return `Document ${quantity} bug report${quantity === 1 ? "" : "s"}.`;
  if (contentType === "session") return "Complete a play session.";
  return bounty.description ?? objectiveDescription(bounty);
}

function rewardPaymentStatus(transactions:any[],type:string,fallback:string){
 const reward=transactions?.find(r=>r.reward_type===type);
 if(!reward)return fallback;
 return ({paid:'Paid',no_additional_bonus:'No additional bonus',requires_onboarding:'Connect your payout account',failed:'Payment needs retry',processing:'Payment processing',reserved:'Reserved',pending:'Pending payment'} as Record<string,string>)[reward.status]??'Pending payment';
}
function CampaignRewardJourney({ campaign, bounties, joined, compact = false, showApprovalProgress = true, showProgress = true }: { campaign: any; bounties: any[]; joined: boolean; compact?: boolean; showApprovalProgress?: boolean; showProgress?: boolean }) {
  const stats = campaignRewardStats(campaign, bounties, joined);
  const journey = String(campaign.journey_status ?? campaign.participant_status ?? "").toLowerCase();
  const awaitingApproval = ["under_review", "submitted", "submitted_for_review", "pending_review"].includes(journey);
  const approvedState = ["approved", "completed", "completed_and_verified", "full_game_awarded"].includes(journey);
  const awardedXp = Math.max(0, stats.earnedXp);
  const requiredComplete = showApprovalProgress && stats.requiredUnits > 0 && stats.approvedUnits >= stats.requiredUnits;
  const progressUnits = showApprovalProgress ? stats.approvedUnits : stats.preparedUnits;
  const progressPercent = stats.requiredUnits > 0 ? Math.round(Math.min(progressUnits, stats.requiredUnits) / stats.requiredUnits * 100) : 0;
  const accessMethod = campaign.access_method ?? campaign.accessMethod;
  const keylessAccess = ["public_demo", "free_to_play"].includes(accessMethod ?? "")
    || (["custom_access", "custom"].includes(accessMethod ?? "")
      && (campaign.custom_access_needs_key ?? campaign.customAccessNeedsKey) === false);
  const availableAccessKeys = campaignAccessKeysRemaining(campaign);
  const hasKeyAccess = Boolean(
    campaign.demo_key_id ||
    campaign.access_key_id ||
    campaign.access_key_reserved ||
    availableAccessKeys > 0,
  );
  const hasAccessReward = hasKeyAccess || keylessAccess;
  const accessKeyRevealed = Boolean(campaign.access_revealed_at);
  const accessKeyReserved = Boolean(campaign.access_key_reserved || campaign.access_key_id || campaign.demo_key_id);
  const hasFullGameReward = Boolean(
    campaign.has_full_game_reward ||
    campaign.completion_full_game_key ||
    campaign.completion_reward_type === "full_game_key",
  );
  const completionKeyClaimed = Boolean(
    campaign.completion_key_available || campaign.full_key_id || campaign.full_key_value,
  );
  const hasBadgeReward = campaign.completion_reward_type === "xp_badge" || Boolean(campaign.has_badge_reward);
  const gftAmount = Number(campaign.gft_reward_amount ?? 0);
  const rewards = [
    hasAccessReward ? {
      key: "access",
      title: keylessAccess ? "Game Access" : "Campaign Access",
      detail: !joined
        ? "Available on acceptance"
        : keylessAccess
          ? accessMethodLabel(campaign)
          : accessKeyRevealed
            ? "Access key revealed"
            : accessKeyReserved
              ? "Key reserved · reveal when ready"
              : "Available",
      icon: keylessAccess ? Gamepad2 : Key,
      state: !joined
        ? "available"
        : keylessAccess || accessKeyRevealed
        ? "unlocked"
        : accessKeyReserved
          ? "available"
          : "locked",
    } : null,
    stats.requiredXp > 0 ? {
      key: "xp",
       title: `${stats.requiredXp.toLocaleString()} Bounty XP`,
       detail: awardedXp >= stats.requiredXp && stats.requiredXp > 0
         ? "Awarded"
         : awardedXp > 0
           ? `${awardedXp.toLocaleString()} Bounty XP awarded`
          : awaitingApproval
              ? "Pending"
             : approvedState
               ? "Pending fulfillment"
               : joined
                 ? "Unlocks when approved"
                 : "Awarded after campaign approval",
      image: BOUNTY_XP_IMAGE,
       state: awardedXp >= stats.requiredXp && stats.requiredXp > 0 ? "unlocked" : awardedXp > 0 ? "partial" : joined ? "locked" : "available",
    } : null,
    hasFullGameReward ? {
      key: "full-game",
      title: "Full Game",
        detail: completionKeyClaimed ? "Claimed" : requiredComplete ? "Available to claim" : awaitingApproval ? "Pending" : joined ? "Unlocks when approved" : "Complete all campaign steps",
      image: "/icons/full-game-icon.png",
        state: completionKeyClaimed ? "unlocked" : requiredComplete ? "available" : "locked",
    } : null,
    hasBadgeReward ? {
      key: "badge",
      title: "Profile Badge",
        detail: awaitingApproval ? "Pending" : approvedState ? "Pending fulfillment" : joined ? "Unlocks when approved" : "Complete campaign",
      image: "/attached_assets/green_badge_128_1758978841463.png",
       state: "locked",
    } : null,
    gftAmount > 0 ? {
      key: "gft",
      title: `${gftAmount.toLocaleString()} GFT`,
        detail: awaitingApproval ? "Pending" : approvedState ? "Pending fulfillment" : "After campaign verification",
       image: "/attached_assets/Gamefolio token_1762633908726.png",
       state: "locked",
    } : null,
  ].filter(Boolean) as { key: string; title: string; detail: string; image?: string; icon?: any; state: "available" | "locked" | "partial" | "unlocked" }[];

  if (rewards.length === 0) return null;

  return (
    <section className={compact ? "" : "mt-20 border-t border-white/[0.12] pt-12"}>
      {campaign.monetary_rewards && <section className="mb-6 space-y-4 rounded-xl border border-[#303447] bg-[#151827] p-5 text-[#D2D6E0]">
        <h3 className="text-xl font-bold text-white">Cash and XP</h3>
        <div className="grid gap-5 sm:grid-cols-3">
          <div><p className="text-xl font-bold text-[#B9FF1A]">{stats.requiredXp.toLocaleString()} Bounty XP</p><p>{awardedXp>=stats.requiredXp&&awardedXp>0?'Awarded':'Pending approval'}</p><p className="text-sm">XP is not money.</p></div>
          <div><p className="text-xl font-bold text-[#B9FF1A]">{new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(campaign.monetary_rewards.guaranteedPence/100)} {campaign.monetary_rewards.unusedRewardPolicy==='refund-uncompleted-v1'?'per approved completion':'guaranteed reward'}</p><p>{rewardPaymentStatus(campaign.monetary_rewards.transactions,'guaranteed_creator_reward','Reserved')}</p></div>
          {campaign.monetary_rewards.unusedRewardPolicy!=='refund-uncompleted-v1'&&<div><p className="text-lg font-semibold text-white">Potential completion bonus: up to {new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(campaign.monetary_rewards.maximumBonusPence/100)}</p><p>{rewardPaymentStatus(campaign.monetary_rewards.transactions,'campaign_completion_bonus',approvedState?'Pending campaign closure':'Calculated when campaign closes')}</p></div>}
        </div><p className="text-sm leading-6">After all required work is approved, XP is awarded and your guaranteed reward is released. Cash payments require an eligible connected payout account. {campaign.monetary_rewards.unusedRewardPolicy==='refund-uncompleted-v1'?'Unclaimed reward money is refunded to the developer after closure.':'Any additional bonus is calculated after the campaign closes and all active work is resolved.'}</p>
      </section>}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/15 pb-4">
        <h2 className={`font-black tracking-tight text-white ${compact ? "text-2xl" : "text-3xl sm:text-4xl"}`}>Rewards</h2>
        {joined && showProgress ? <div className="text-right">
          <div className="text-2xl font-black tabular-nums text-white">{showApprovalProgress ? `${stats.approvedUnits} of ${stats.requiredUnits} required approved` : `${stats.preparedUnits} of ${stats.requiredUnits} items ready`}</div>
          <div className="mt-1 text-sm font-black tabular-nums text-[#B9FF1A]">{progressPercent}%</div>
        </div> : !joined ? (
          <div className="max-w-[180px] text-right text-xs font-bold leading-relaxed text-white/40">
             Complete all campaign steps to earn the completion rewards.
          </div>
        ) : null}
      </div>
      {joined && showProgress && <>
        <div className="mt-6 h-2 overflow-hidden bg-white/[0.08]">
          <div className="h-full bg-[#B9FF1A] transition-[width] duration-700" style={{ width: `${progressPercent}%` }} />
        </div>
        {showApprovalProgress && stats.submittedUnits > stats.approvedUnits && (
          <div className="mt-2 text-xs font-bold text-white/38">
            {stats.submittedUnits - stats.approvedUnits} submitted and awaiting review
          </div>
        )}
      </>}

      <div className={compact ? "mt-7 space-y-5" : `relative mt-12 grid gap-x-8 gap-y-10 ${rewards.length >= 4 ? "sm:grid-cols-2 lg:grid-cols-4" : rewards.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        {!compact && <div className="absolute left-[10%] right-[10%] top-[54px] hidden h-px bg-white/[0.14] sm:block" aria-hidden="true">
          <div className="h-full bg-[#B9FF1A] transition-[width] duration-700" style={{ width: `${stats.percent}%` }} />
        </div>}
        {rewards.map(reward => {
          const muted = reward.state === "locked";
          const partial = reward.state === "partial";
          const RewardIcon = reward.icon;
          return (
            <div key={reward.key} className={compact ? "relative flex items-center gap-3" : "relative text-center"}>
              <div className={`relative flex items-center justify-center ${compact ? "h-14 w-14 shrink-0" : "mx-auto h-28"}`}>
                {RewardIcon
                  ? <RewardIcon size={compact ? 24 : 42} className={muted ? "text-white/35" : "text-[#B9FF1A]"} />
                  : <img
                    src={reward.image}
                    alt=""
                    className={`${compact ? "max-h-12 max-w-14" : "max-h-24 max-w-[9rem]"} object-contain transition-all duration-700`}
                    style={{
                      filter: muted ? "grayscale(1)" : partial ? "grayscale(0.35)" : "none",
                      opacity: muted ? 0.38 : partial ? 0.72 : 1,
                    }}
                  />}
              </div>
              <div className={compact ? "min-w-0" : ""}>
                <div className={`${compact ? "" : "mt-3"} text-sm font-black uppercase tracking-wide text-white`}>{reward.title}</div>
                <div className={`mt-1 text-xs font-bold ${muted ? "text-white/35" : partial ? "text-[#B9FF1A]/75" : "text-[#B9FF1A]"}`}>
                {reward.state === "unlocked" && <Check size={12} className="mr-1 inline" strokeWidth={3} />}
                {reward.state === "locked" && <Lock size={11} className="mr-1 inline" />}
                {reward.detail}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function AvailableCampaignPreview({campaign,mandatory,canAccept,joinBlocker,user,onAccept,onSignIn,compactReward,preparedMedia,onPreparedMedia,preparedText,onPreparedText,preparedRating,onPreparedRating}:BountyDraftProps & {campaign:any;mandatory:any[];canAccept:boolean;joinBlocker?:string;user:any;onAccept:()=>void;onSignIn?:()=>void;compactReward?:boolean}) {
  const [clipPreviewOpen, setClipPreviewOpen] = useState(false);
  const regularBounty=isRegularBounty(campaign);
  const submissionHeadingId=`bounty-submission-heading-${bountyInstanceId(campaign)}`;
  const days=Number(campaign.creator_deadline_days??0);
  const capacity=Number(campaign.max_places??campaign.participant_capacity??0);
  const remaining=capacity>0?Math.max(0,capacity-Number(campaign.participant_count??0)):null;
  const stream=mandatory.find(objective=>objective.content_type==='stream');
  const rewards=campaignRewardSummary(campaign);
  const money=campaign.monetary_rewards;
  const platforms=Array.isArray(campaign.game_profile_platforms)?campaign.game_profile_platforms:[];
  const xp = Number(campaign.total_campaign_xp ?? 0);
  const unavailable = <p className="bounty-detail-blocker" role="status">{joinBlocker ?? "This bounty is not currently available."}</p>;
  const signInLabel = regularBounty ? "Sign in to submit" : "Sign in to join";
  const joinAction = !user ? (
    onSignIn
      ? <button type="button" className="bounty-detail-start" onClick={onSignIn}><Lock size={18}/>{signInLabel}<ChevronRight size={18}/></button>
      : <a className="bounty-detail-start" href="/auth"><Lock size={18}/>{signInLabel}<ChevronRight size={18}/></a>
  ) : canAccept ? (
    <button type="button" className="bounty-detail-start" onClick={onAccept}>{regularBounty ? "Get game access" : "Join bounty"}<ChevronRight size={18}/></button>
  ) : compactReward ? unavailable : (
    <><button type="button" className="bounty-detail-start" disabled><Lock size={18}/>Not available for this account</button>{unavailable}</>
  );
  return <div className="bounty-detail-body">
    <div className="bounty-detail-grid">
      <section className="bounty-detail-brief" aria-labelledby={submissionHeadingId}>
        <h2 id={submissionHeadingId}>{regularBounty?"Add your content":"What to submit"}</h2>
        {mandatory.length?<ul className="bounty-detail-objectives">{mandatory.map(objective=>{
          const Icon=CONTENT_TYPE_ICON[objective.content_type]??Target;
          const description=String(objective.description??'').trim();
          const quantityLabel=regularBounty?(CONTENT_TYPE_LABEL[objective.content_type]??'Your content'):objectiveRequirementLabel(objective).replace(' required','');
          return <li key={objective.id}><span className="bounty-detail-objective-icon"><Icon size={23} aria-hidden="true"/></span><div>{!regularBounty&&<h3>{quantityLabel}</h3>}{!regularBounty&&description&&description.toLowerCase()!==quantityLabel.toLowerCase()&&<p>{description}</p>}
          {onPreparedMedia && ['clip','reel','screenshot'].includes(objective.content_type) && <>
            <CampaignFileDropzone type={objective.content_type} file={preparedMedia?.file}
              onFile={file => {
                onPreparedMedia(file ? { file } : null);
                if (file && regularBounty && objective.content_type === "clip") setClipPreviewOpen(true);
              }}
              hint="Files stay on your device until you submit." />
            {regularBounty && objective.content_type === "clip" && preparedMedia &&
              <button type="button" className="mt-2 text-sm text-[#B9FF1A] underline" onClick={() => setClipPreviewOpen(true)}>Edit clip details</button>}
          </>}
          {objective.content_type === "review" && onPreparedRating && <ReviewStarRating value={preparedRating} onChange={onPreparedRating} />}
          {onPreparedText&&['feedback','review','stream'].includes(objective.content_type)&&<label className="bounty-inline-draft">{objective.content_type==='stream'?'Stream or VOD link':objective.content_type==='review'?'Your review':'Your feedback'}{objective.content_type==='stream'?<input type="url" value={preparedText??''} onChange={event=>onPreparedText(event.target.value)} placeholder="https://twitch.tv/videos/…"/>:<textarea value={preparedText??''} onChange={event=>onPreparedText(event.target.value)} maxLength={10000} rows={5} placeholder={objective.content_type==='review'?'Write your review of the game…':'Share what worked and what could be improved…'}/>}<span>{objective.content_type==='stream'?'A connected streaming account and verified stream evidence are required.':'Your draft stays on this page until you join and save it.'}</span></label>}
          </div></li>;
        })}</ul>:<p>No objectives have been configured for this bounty.</p>}
        {stream&&<details className="bounty-detail-disclosure" open={!!user&&!canAccept&&joinBlocker?.startsWith('Connect an eligible')}><summary>Stream requirements &amp; connected account</summary><StreamSpotlightBrief campaign={campaign} objective={stream} user={user}/></details>}
    {(!onPreparedMedia||Object.values(campaign.management_data??{}).some(Boolean))&&<details className="bounty-detail-disclosure bounty-detail-game"><summary>{onPreparedMedia?'Developer guidance':'About the game & developer guidance'}</summary><CampaignGameDetails campaign={onPreparedMedia?{...campaign,game_id:null}:campaign} heading={onPreparedMedia?'Developer guidance':undefined}/></details>}
        {compactReward && !isIndieDeveloperUser(user) && <div className="mt-4 max-w-xs">{joinAction}</div>}
      </section>
      {compactReward ? (
        <aside className="w-full min-[901px]:self-center" aria-label="Bounty reward">
          <BountyXpBadge xp={xp} />
        </aside>
      ) : <aside className="bounty-detail-summary" aria-label="Bounty reward and joining">
        <h2>Your reward</h2>
        {rewards.length||money?<div className="bounty-detail-rewards">{rewards.map(({icon:Icon,label})=><p key={label}><Icon size={20} aria-hidden="true"/><strong>{label.replace(/^\+/, '').replace(' Reward','')}</strong></p>)}{money&&<p><Gift size={20} aria-hidden="true"/><strong>{new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(money.guaranteedPence/100)} {money.unusedRewardPolicy==='refund-uncompleted-v1'?'per approved completion':'guaranteed reward'}</strong></p>}</div>:<p>No completion reward configured.</p>}
        <p className="bounty-detail-approval">Awarded after all required work is approved.{campaign.included_discovery?' No cash reward.':''}</p>
        {joinAction}
        <dl className="bounty-detail-facts">
          {!isRegularBounty(campaign) && <div><dt>Time to complete</dt><dd>{days>0?`${days} days after accepting access`:'Deadline shown when you accept access'}</dd></div>}
          <div><dt>Game access</dt><dd>{accessMethodLabel(campaign)}</dd></div>
          {!!platforms.length&&<div><dt>Platforms</dt><dd>{platforms.map((platform:string)=>GAME_PLATFORM_LINKS[platform.toLowerCase()]?.label??platform).join(' · ')}</dd></div>}
          {!campaign.included_discovery&&remaining!==null&&<div><dt>Places available</dt><dd>{remaining.toLocaleString()} of {capacity.toLocaleString()}</dd></div>}
        </dl>

        {money&&<details className="bounty-detail-disclosure"><summary>Cash reward details</summary><CampaignRewardJourney campaign={campaign} bounties={mandatory} joined={false} compact/></details>}
      </aside>}
    </div>
    {clipPreviewOpen && preparedMedia && onPreparedMedia &&
      <PreparedClipDialog media={preparedMedia} onChange={onPreparedMedia}
        onClose={() => setClipPreviewOpen(false)}
        joinAction={!user ? (
          onSignIn
            ? <button type="button" className="bounty-detail-start" onClick={() => { setClipPreviewOpen(false); onSignIn(); }}>{signInLabel}</button>
            : <a className="bounty-detail-start" href="/auth">{signInLabel}</a>
        ) : canAccept ? (
          <button type="button" className="bounty-detail-start" onClick={() => { setClipPreviewOpen(false); onAccept(); }}>Get game access</button>
        ) : unavailable} />}
  </div>;
}

function AvailableBountyHero({campaign,onBack}:{campaign:any;onBack:()=>void}) {
  const game=campaignGameTitle(campaign);
  const savedTitle=String(campaign.campaign_title||campaign.template_name||'Creator bounty');
  // Remove only an exact leading game name and separator; preserve custom campaign titles.
  const suffix=game&&savedTitle.toLowerCase().startsWith(String(game).toLowerCase())?savedTitle.slice(String(game).length):'';
  const title=/^\s*[·:|–—-]\s*\S/.test(suffix)?suffix.replace(/^\s*[·:|–—-]\s*/,''):savedTitle;
  const gameHref=campaign.game_id&&campaign.catalog_game_name?publicGamePath(campaign.catalog_game_name):null;
  return <header className="bounty-detail-intro">
    <FeaturedHeroBackground campaign={campaign} className="bounty-detail-art"/><div className="bounty-detail-shade"/>
    <div className="bounty-detail-intro-inner"><button type="button" onClick={onBack} className="bounty-detail-back"><ChevronLeft size={18}/>Bounty Hub</button><div className="bounty-detail-game-line">{game&&<span>{game}</span>}{campaign.is_verified===true&&<span className="bounty-detail-verified"><VerifiedIcon size={18} decorative/>Verified</span>}</div><h1>{title}</h1>{gameHref&&<a href={gameHref} onClick={()=>trackDiscovery(campaign,'game_page_visit')} className="bounty-detail-game-link">View game<ChevronRight size={16}/></a>}</div>
  </header>;
}

function CampaignRowArtwork({ campaign, showFallbackIcon = false }: { campaign: any; showFallbackIcon?: boolean }) {
  const sources = [
    campaign.campaign_artwork_url,
    campaign.artwork_url,
    campaign.game_artwork_url,
    campaign.catalog_game_artwork_url,
    campaign.game_profile_capsule_artwork_url,
    campaign.game_profile_header_artwork_url,
    campaign.game_profile_screenshot_artwork_url,
  ].filter((source, index, all): source is string =>
    typeof source === "string" && source.trim().length > 0 && all.indexOf(source) === index,
  );
  const [sourceIndex, setSourceIndex] = useState(0);
  const source = sources[sourceIndex] ?? null;

  useEffect(() => {
    setSourceIndex(0);
  }, [campaign.instance_id, sources.join("|")]);

  if (!source) {
    return (
      <div
        className="w-14 h-14 rounded-lg flex-shrink-0 bg-center bg-cover bg-no-repeat flex items-center justify-center"
        style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}
        aria-hidden="true"
      >
        {showFallbackIcon && <Gamepad2 size={20} className="text-white/30" />}
      </div>
    );
  }

  return (
    <img
      src={source}
      alt=""
      className="w-14 h-14 rounded-lg flex-shrink-0 object-cover"
      onError={() => setSourceIndex(current => current + 1)}
    />
  );
}

function GameBountyCard({campaign,onClick}:{campaign:any;onClick:()=>void}) {
  const ref=useDiscoveryImpression(campaign);
  const { description, facts } = gameProfileBountyDetails({
    shortDescription: campaign.game_profile_short_description,
    fullDescription: campaign.game_profile_full_description,
    genres: campaign.game_profile_genres,
    platforms: campaign.game_profile_platforms,
    tags: campaign.game_profile_tags,
    keyFeatures: campaign.game_profile_key_features,
  });

  return <article ref={ref} className="game-bounty-card">
    <div className="game-bounty-card-art"><FeaturedHeroBackground campaign={campaign}/></div>
    <div className="game-bounty-card-copy">
      <h3>{campaign.game_profile_name || campaignGameTitle(campaign)}</h3>
      {description && <p className="line-clamp-3">{description}</p>}
      {facts.length > 0 && <ul className="game-bounty-card-types" aria-label="Game details">
        {facts.map(fact => {
          const Icon = gameProfileBountyFactIcon(fact);
          return <li key={fact}><Icon size={15} className="shrink-0" aria-hidden="true" />{fact}</li>;
        })}
      </ul>}
      <p className="game-bounty-card-xp"><Zap size={17}/>{bountyXpLabel(campaign)}</p>
      <button type="button" className="bounty-detail-start" onClick={onClick}>View bounties<ChevronRight size={18}/></button>
    </div>
  </article>;
}
function GameBountyPage({campaign,opportunities,onBack,onJoined,renderOpportunity}:{campaign:any;opportunities:any[];onBack:()=>void;onJoined:(campaign:any,result:any)=>void;renderOpportunity:(opportunity:any)=>React.ReactNode}) {
  return <div className="unified-game-bounty">
    <AvailableBountyHero campaign={{...campaign,campaign_title:'Play, create and share',description:null}} onBack={onBack}/>
    <div className="game-bounty-navigation"><nav aria-label="On this bounty page">{[['bounty-about','About the game'],['bounty-specs','Game specs'],['bounty-claim-key',campaign.requires_access_key?'Claim key':'Play game'],['bounty-community','Uploaded content'],['bounty-upload','Upload your content']].map(([id,label])=><a key={id} href={`#${id}`}>{label}</a>)}</nav></div>
    <div className="game-bounty-sections">
      <section id="bounty-about" className="bounty-page-section bounty-about-section" aria-labelledby="bounty-about-title">
        <h2 id="bounty-about-title">About the game</h2>
        <CampaignGameDetails campaign={{...campaign,management_data:undefined}} showHeading={false} showSpecs/>
      </section>
      <GameBountyAccess campaign={campaign} opportunities={opportunities} onJoined={onJoined}/>
      <GameBountyCommunity campaign={campaign}/>
      <section id="bounty-upload" className="bounty-page-section bounty-upload-section" aria-labelledby="bounty-upload-title"><h2 id="bounty-upload-title">Upload your content</h2><p>Submit one piece of content per type. Each submission goes to the developer for review.</p>
        {opportunities.map(opportunity=>{
          const id=bountyInstanceId(opportunity),type=opportunity.bounties?.[0]?.content_type,Icon=CONTENT_TYPE_ICON[type]??Target;
          return <section key={id} id={`game-bounty-content-${id}`} className="game-bounty-section" aria-labelledby={`game-bounty-title-${id}`}><h3 id={`game-bounty-title-${id}`}><Icon size={23}/>{SUBMISSION_SECTION_LABELS[type]??opportunity.template_name}</h3>{renderOpportunity(opportunity)}</section>;
        })}
      </section>
    </div>
  </div>;
}

// ── Campaign card ─────────────────────────────────────────────────────────
function CampaignCard({ campaign, onClick }: { campaign: any; onClick: () => void }) {
  const impressionRef=useDiscoveryImpression(campaign);
  const demoLeft  = Number(campaign.demo_keys_remaining ?? 0);
  const fullLeft  = Number(campaign.full_keys_remaining ?? 0);
  const accessKeysLeft = campaignAccessKeysRemaining(campaign);
  const bounties = configuredObjectives(campaign.bounties);
  const totalXP = Number(campaign.total_campaign_xp ?? 0);
  const endDate = campaign.end_date ?? null;
  const tLeft = timeRemaining(endDate);
  const nearlyFull = accessKeysLeft > 0 && accessKeysLeft <= 5;
  const trending = Number(campaign.participant_count ?? 0) >= 10;
  const accepted = Boolean(campaign.is_joined || campaign.joined || campaign.participant_status);

  // Aggregate repeated rows of the same content type without losing required quantity.
  const pillQuantities = new Map<string, number>();
  for (const b of bounties) {
    pillQuantities.set(b.content_type, (pillQuantities.get(b.content_type) ?? 0) + Number(b.quantity));
  }
  const pills = Array.from(pillQuantities, ([ct, qty]) => ({ ct, qty }));

  return (
    <div
      ref={impressionRef}
      className="rounded-2xl overflow-hidden cursor-pointer group transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/60"
      style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(184,255,27,0.28)")}
      onMouseLeave={e => (e.currentTarget.style.borderColor = CARD_BORDER)}
      onClick={onClick}
    >
      {/* Discovery artwork */}
      <div className="relative h-36 overflow-hidden">
        <FeaturedHeroBackground
          campaign={campaign}
          className="absolute inset-0 bg-center bg-cover bg-no-repeat transition-transform duration-500 group-hover:scale-[1.05]"
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, #0e1520 0%, rgba(14,21,32,0.18) 60%, transparent 100%)" }} />
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {campaign.is_verified === true && <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full"
            style={{ background: "#141824", color: NEON }}>
            <VerifiedIcon size={14} decorative /> GF Verified
          </span>}
          {trending && (
            <span className="inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-full"
              style={{ background: "rgba(239,68,68,0.85)", color: "white" }}>
              <Flame size={8} /> Trending
            </span>
          )}
        </div>
        {nearlyFull && (
          <div className="absolute top-3 right-3">
            <span className="inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-full"
              style={{ background: "rgba(245,158,11,0.90)", color: "#070b10" }}>
              {accessKeysLeft} Left
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="px-4 pb-4 pt-3.5 space-y-3">
        {/* Title + description */}
        <div>
          <h3 className="text-lg font-black text-white leading-tight tracking-tight">
            {campaign.campaign_title || campaign.game_name || campaign.template_name}
          </h3>
          {campaign.description && (
            <p className="text-[12px] mt-1 line-clamp-1" style={{ color: "rgba(255,255,255,0.45)" }}>
              {campaign.description}
            </p>
          )}
        </div>

        {/* Requirement pills — horizontal */}
        {pills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {pills.map(({ ct, qty }) => {
              const Icon = REQ_ICON[ct] ?? Target;
              return (
                <span key={ct} className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg"
                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.70)", border: "1px solid rgba(255,255,255,0.09)" }}>
                  <Icon size={11} /> {reqPillLabel(ct, qty)}
                </span>
              );
            })}
          </div>
        )}

        {/* Urgency row */}
        <div className="flex items-center gap-3 text-[11px]">
          {accessKeysLeft > 0 && (
            <span style={{ color: NEON }} className="font-bold">
              {accessKeysLeft} / {Number(
                campaign.access_method === "full_game_upfront" || campaign.access_method === "full_upfront"
                  ? campaign.full_access_key_total ?? accessKeysLeft
                  : campaign.demo_key_total ?? accessKeysLeft,
              )} {campaign.access_method === "full_game_upfront" || campaign.access_method === "full_upfront" ? "full-game access keys" : "demo keys"}
            </span>
          )}
          {tLeft !== "Ended" && tLeft !== "Ongoing" && (
            <span className="text-white/35 flex items-center gap-1"><Clock size={10} /> {tLeft}</span>
          )}
          {Number(campaign.participant_count ?? 0) > 0 && (
            <span className="text-white/35 flex items-center gap-1"><Users size={10} /> {campaign.participant_count}</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold text-white/45">
          <span className="rounded-full px-2 py-1" style={{ background: "rgba(255,255,255,0.05)" }}>{accessMethodLabel(campaign)}</span>
          {campaign.application_period_days && <span>Applications open {campaign.application_period_days}d</span>}
        </div>

        {/* Compact reward summary: discovery, not a reward wall */}
        <div className="rounded-xl px-3 py-2.5" style={{ background: "rgba(184,255,27,0.045)", border: "1px solid rgba(184,255,27,0.12)" }}>
          <div className="text-[9px] font-black uppercase tracking-[0.18em] mb-1.5" style={{ color: "rgba(184,255,27,0.65)" }}>Rewards</div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold text-white/70">
            {demoLeft > 0 && <span className="inline-flex items-center gap-1"><img src="/icons/demo-key-icon.png" alt="" className="w-4 h-4 object-contain" /> Demo Key</span>}
            {fullLeft > 0 && <span className="inline-flex items-center gap-1"><img src="/icons/full-game-icon.png" alt="" className="w-4 h-4 object-contain" /> Full Game</span>}
            {totalXP > 0 && <span className="inline-flex items-center gap-1"><Zap size={13} color={NEON} /> {bountyXpLabel(campaign)}</span>}
          </div>
        </div>

        {/* CTA */}
        <button
          className="w-full py-3 rounded-xl text-sm font-black tracking-wide flex items-center justify-center gap-2 transition-all hover:brightness-110 hover:scale-[1.01] active:scale-[0.98]"
          style={{ background: NEON, color: "#070b10" }}
          onClick={e => { e.stopPropagation(); onClick(); }}
        >
          <ChevronRight size={15} /> {accepted ? "Continue Mission" : "View Campaign"}
        </button>
      </div>
    </div>
  );
}

// ── Featured bounty (cinematic hero) ──────────────────────────────────────
function FeaturedSlider({ campaigns, onSelect }: { campaigns: any[]; onSelect: (c: any) => void }) {
  const [idx, setIdx] = useState(0);
  const [fading, setFading] = useState(false);

  const goTo = useCallback((next: number) => {
    setFading(true);
    setTimeout(() => {
      setIdx(next);
      setFading(false);
    }, 220);
  }, []);

  const prev = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    goTo((idx - 1 + campaigns.length) % campaigns.length);
  }, [idx, campaigns.length, goTo]);

  const next = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    goTo((idx + 1) % campaigns.length);
  }, [idx, campaigns.length, goTo]);

  useEffect(() => {
    if (campaigns.length < 2) return;
    const t = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setIdx(i => (i + 1) % campaigns.length);
        setFading(false);
      }, 220);
    }, 5000);
    return () => clearInterval(t);
  }, [campaigns.length]);

  useEffect(() => {
    if (campaigns.length < 2) return;
    const adjacent = [
      campaigns[(idx + 1) % campaigns.length],
      campaigns[(idx - 1 + campaigns.length) % campaigns.length],
    ];
    const preloads = adjacent.map((adjacentCampaign: any) => {
      const source = campaignHeroSources(adjacentCampaign)[0];
      if (!source) return null;
      const image = new Image();
      image.src = source;
      return image;
    }).filter(Boolean);
    return () => preloads.forEach(image => {
      if (image) image.src = "";
    });
  }, [campaigns, idx]);

  if (campaigns.length === 0) return null;
  const campaign = campaigns[Math.min(idx,campaigns.length-1)];
  const demoLeft = Number(campaign.demo_keys_remaining ?? 0);
  const fullAccessLeft = Number(campaign.full_access_keys_remaining ?? 0);
  const bounties = configuredObjectives(campaign.bounties);
  const totalXP = Number(campaign.total_campaign_xp ?? 0);
  const fullLeft = Number(campaign.full_keys_remaining ?? 0);

  /* Arrow button shared style */
  const arrowBtn = "flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full transition-all hover:scale-110 hover:brightness-125";
  const arrowStyle = { background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.18)" };

  return (
    <div className="space-y-3">
      {/* Row: arrow | slide | arrow */}
      <div className="flex items-center gap-3">
        {/* Prev arrow — outside the slide */}
        {campaigns.length > 1 ? (
          <button className={arrowBtn} style={arrowStyle} onClick={prev}>
            <ChevronLeft size={18} className="text-white" />
          </button>
        ) : <div className="w-10 flex-shrink-0" />}

        {/* Slide */}
        <div className="relative flex-1 overflow-hidden cursor-pointer group rounded-2xl" style={{ height: 420 }}
          onClick={() => onSelect(campaign)}>

          {/* Associated game artwork, resolved server-side from the game record */}
          <div className="absolute inset-0 transition-opacity duration-300" style={{ opacity: fading ? 0 : 1 }}>
            <FeaturedHeroBackground campaign={campaign} />
            <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-[1.03]"
              style={{ background: "rgba(255,255,255,0.02)" }} />
          </div>

          {/* Readability overlays: directional on desktop, deeper on mobile */}
          <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(7,11,16,0.96) 0%, rgba(7,11,16,0.82) 35%, rgba(7,11,16,0.45) 65%, rgba(7,11,16,0.20) 100%)" }} />
          <div className="absolute inset-0" style={{ background: "linear-gradient(0deg, #070b10 0%, rgba(7,11,16,0.62) 34%, transparent 78%)" }} />
          <div className="absolute inset-0 sm:hidden" style={{ background: "rgba(7,11,16,0.22)" }} />

          {/* Content */}
          <div className="absolute inset-0 flex flex-col justify-end px-8 pb-8 transition-opacity duration-300"
            style={{ opacity: fading ? 0 : 1 }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm"
                style={{ color: NEON, background: "rgba(184,255,27,0.12)", border: "1px solid rgba(184,255,27,0.25)" }}>
                Featured Campaign
              </span>
              {campaign.is_verified === true && <span className="flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full"
                style={{ background: "#141824", color: NEON }}>
                <VerifiedIcon size={14} decorative /> GF Verified
              </span>}
            </div>

            {campaign.game_name && (
              <div className="text-sm font-bold mb-0.5" style={{ color: "rgba(255,255,255,0.50)" }}>{campaign.game_name}</div>
            )}
            <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight tracking-tight mb-2 max-w-lg">
              {campaign.campaign_title || campaign.template_name}
            </h2>
            {campaign.description && (
              <p className="text-sm mb-4 max-w-md line-clamp-1" style={{ color: "rgba(255,255,255,0.55)" }}>
                {campaign.description}
              </p>
            )}

            <div className="flex items-center gap-4 mb-5">
              {demoLeft > 0 && (
                <div className="flex items-center gap-1.5">
                  <img src="/icons/demo-key-icon.png" alt="" className="w-5 h-5 object-contain" />
                  <span className="text-xs font-black" style={{ color: NEON }}>Demo Key</span>
                </div>
              )}
              {fullAccessLeft > 0 && (
                <div className="flex items-center gap-1.5">
                  <img src="/icons/full-game-icon.png" alt="" className="w-5 h-5 object-contain" />
                  <span className="text-xs font-black" style={{ color: NEON }}>Full Game Access</span>
                </div>
              )}
              {fullLeft > 0 && (
                <div className="flex items-center gap-1.5">
                  <img src="/icons/full-game-icon.png" alt="" className="w-5 h-5 object-contain" />
                  <span className="text-xs font-bold text-white/70">Full Game</span>
                </div>
              )}
              {totalXP > 0 && (
                <div className="flex items-center gap-1.5">
                  <Zap size={16} color={NEON} />
                  <span className="text-xs font-bold text-white/70">{bountyXpLabel(campaign)}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black transition-all hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: NEON, color: "#070b10" }}
                onClick={e => { e.stopPropagation(); onSelect(campaign); }}>
                <ChevronRight size={16} /> {campaign.discovery_opportunities?"View bounties":"View Campaign"}
              </button>
              <span className="text-xs text-white/40 font-bold">
                {campaignAccessKeysRemaining(campaign) > 0
                  ? `${campaignAccessKeysRemaining(campaign)} ${campaign.access_method === "full_game_upfront" || campaign.access_method === "full_upfront" ? "full-game access keys" : "demo keys"} remaining`
                  : "Open campaign"}
              </span>
            </div>
          </div>
        </div>

        {/* Next arrow — outside the slide */}
        {campaigns.length > 1 ? (
          <button className={arrowBtn} style={arrowStyle} onClick={next}>
            <ChevronRight size={18} className="text-white" />
          </button>
        ) : <div className="w-10 flex-shrink-0" />}
      </div>

      {/* Dot indicators below the slide row */}
      {campaigns.length > 1 && (
        <div className="flex items-center justify-center gap-2">
          {campaigns.map((_, i) => (
            <button key={i}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === idx ? 24 : 6,
                height: 6,
                background: i === idx ? NEON : "rgba(255,255,255,0.25)",
              }}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Filter sidebar data ────────────────────────────────────────────────────
const FILTER_GROUPS = [
  {
    key: "status", label: "Campaign Status",
    options: [
      { key: "status_demo",     label: "Demo Available" },
      { key: "status_nearly",   label: "Nearly Full" },
      { key: "status_ending",   label: "Ending Soon" },
      { key: "status_new",      label: "New" },
      { key: "status_featured", label: "Featured" },
    ],
  },
  {
    key: "rewards", label: "Rewards",
    options: [
      { key: "demo",    label: "Demo Key" },
      { key: "full",    label: "Full Game" },
      { key: "xp",      label: "XP" },
      { key: "gft",     label: "GFT" },
      { key: "badge",   label: "Badge" },
    ],
  },
  {
    key: "requirements", label: "Requirements",
    options: [
      { key: "clip",       label: "Gameplay Clips" },
      { key: "screenshot", label: "Screenshots" },
      { key: "reel",       label: "Reels" },
      { key: "stream",     label: "Livestream" },
      { key: "feedback",   label: "Feedback" },
      { key: "bug",        label: "Bug Testing" },
    ],
  },
  {
    key: "genres", label: "Genres",
    options: [
      { key: "fps",       label: "FPS" },
      { key: "horror",    label: "Horror" },
      { key: "rpg",       label: "RPG" },
      { key: "racing",    label: "Racing" },
      { key: "strategy",  label: "Strategy" },
      { key: "survival",  label: "Survival" },
      { key: "puzzle",    label: "Puzzle" },
      { key: "action",    label: "Action" },
      { key: "adventure", label: "Adventure" },
    ],
  },
  {
    key: "difficulty", label: "Campaign Difficulty",
    options: [
      { key: "quick",    label: "Quick" },
      { key: "standard", label: "Standard" },
      { key: "premium",  label: "Premium" },
    ],
  },
] as const;

function FilterSidebar({
  active, onChange,
}: {
  active: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggle = (key: string) => {
    const next = new Set(active);
    if (next.has(key)) next.delete(key); else next.add(key);
    onChange(next);
  };
  const toggleGroup = (g: string) => {
    setCollapsed(prev => {
      const s = new Set(prev);
      if (s.has(g)) s.delete(g); else s.add(g);
      return s;
    });
  };

  return (
    <div className="space-y-1">
      {active.size > 0 && (
        <button
          onClick={() => onChange(new Set())}
          className="w-full flex items-center justify-center gap-1.5 py-2 mb-3 rounded-xl text-xs font-bold transition-all hover:brightness-110"
          style={{ background: "#151827", color: NEON, border: `1px solid rgba(184,255,27,0.20)` }}>
          <X size={11} /> Clear filters
        </button>
      )}
      {FILTER_GROUPS.map(group => {
        const isOpen = !collapsed.has(group.key);
        return (
          <div key={group.key} className="rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <button
              className="w-full flex items-center justify-between px-4 py-3 text-xs font-black uppercase tracking-wider text-white/60 hover:text-white/90 transition-colors"
              onClick={() => toggleGroup(group.key)}>
              {group.label}
              <ChevronDown size={12} className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
            </button>
            {isOpen && (
              <div className="px-3 pb-3 space-y-1">
                {group.options.map(opt => {
                  const on = active.has(opt.key);
                  return (
                    <button key={opt.key}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-all"
                      style={{
                        background: on ? "rgba(184,255,27,0.10)" : "transparent",
                        color: on ? NEON : "rgba(255,255,255,0.55)",
                        fontWeight: on ? 700 : 500,
                      }}
                      onClick={() => toggle(opt.key)}>
                      <span className="w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0 border transition-all"
                        style={{ borderColor: on ? NEON : "rgba(255,255,255,0.25)", background: on ? NEON : "transparent" }}>
                        {on && <Check size={9} color="#070b10" strokeWidth={3} />}
                      </span>
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CampaignDetail({ campaign, onBack, onJoined, onSignIn, embedded=false, compactPreview=false, otherOpportunity=false, preparedMedia,onPreparedMedia,preparedText,onPreparedText,preparedRating,onPreparedRating }: BountyDraftProps & { campaign: any; onBack: () => void; onJoined: (campaign: any, joinResult: any) => void; onSignIn?: () => void; embedded?:boolean; compactPreview?:boolean; otherOpportunity?:boolean }) {
  useEffect(()=>trackDiscovery(campaign,'listing_open'),[campaign.id,campaign.included_discovery]);
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const canParticipate = !isIndieDeveloperUser(user);
  const [, setClock] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setClock(value => value + 1), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const isGF = !!campaign.gamefolio_managed;
  const bounties = configuredObjectives(campaign.bounties);
  const streamObjective = bounties.find(objective => objective.content_type === "stream");
  const streamConfig = streamCampaignConfig(campaign, streamObjective);
  const streamEligibility = useStreamSpotlightEligibility(user, streamObjective ? streamConfig.allowedPlatforms : []);
  // Every configured objective is a required campaign step.
  const gameTitle = campaignGameTitle(campaign);
  const demoLeft = Number(campaign.demo_keys_remaining ?? 0);
  const timeLeft = timeRemaining(campaign.end_date ?? null);
  const accessMethod = campaign.access_method ?? campaign.accessMethod;
  const estimatedHours = campaign.estimated_hours ?? campaign.estimated_duration_hours ?? campaign.estimated_time_hours;
  const customAccessNeedsKey = campaign.custom_access_needs_key ?? campaign.customAccessNeedsKey;
  const keylessAccess = ["public_demo", "free_to_play"].includes(accessMethod)
    || (accessMethod === "custom_access" || accessMethod === "custom")
      && (customAccessNeedsKey === false
        || (customAccessNeedsKey == null && demoLeft === 0));
  const accessKeysLeft = campaignAccessKeysRemaining(campaign);
  const capacity = Number(campaign.max_places ?? campaign.participant_capacity ?? 0);
  const hasGameAccess = Boolean(campaign.has_game_access);
  const blockedByOtherBounty = otherOpportunity && !hasGameAccess;
  const participantCount = Number(campaign.participant_count ?? 0);
  const hasPlaces = capacity <= 0 || participantCount < capacity;
  const campaignActive = ["live", "approved"].includes(String(campaign.status)) && (!campaign.end_date || new Date(campaign.end_date).getTime() > Date.now());
  const canAccept = canParticipate && !blockedByOtherBounty && campaignActive && hasPlaces && !campaign.is_joined && !campaign.participant_status
    && (isGF || keylessAccess || hasGameAccess || accessKeysLeft > 0)
    && (!streamObjective || streamEligibility.eligible);

  const joinBlocker = !canParticipate ? 'Developer accounts cannot join creator campaigns.'
    : blockedByOtherBounty ? 'Complete or cancel your current bounty for this game before starting another content type.'
    : !campaignActive ? 'This campaign is not currently open to new creators.'
    : !hasPlaces ? 'All creator places are taken. Choose another campaign.'
    : campaign.is_joined || campaign.participant_status ? 'You already participate in this campaign. Continue from My Campaigns.'
    : !isGF && !keylessAccess && !hasGameAccess && accessKeysLeft <= 0 ? 'No access keys are currently available. Choose another campaign or check back later.'
    : streamObjective && !streamEligibility.eligible ? 'Connect an eligible streaming account in the stream requirements.'
    : undefined;

  const joinMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/bounties/${campaign.id}/join`, {}),
    onSuccess: async (res) => {
      const data = await res.json();
      if (data.applicationStatus === "pending" || data.applicationStatus === "application_pending") {
        setShowModal(false);
        toast({ title: "Application submitted", description: "The developer will review your application before you can start." });
        return;
      }
      qc.invalidateQueries({ queryKey: ["/api/bounties/my/campaigns"] });
      qc.invalidateQueries({ queryKey: ["/api/bounties/my", campaign.id] });
      qc.invalidateQueries({ queryKey: ["/api/bounties"] });
      setShowModal(false);
      onJoined({
        ...campaign,
        instance_id: campaign.id,
        participant_status: data.status ?? (data.accessKeyAvailable ? "access_reserved" : "joined"),
        application_status: data.applicationStatus ?? data.application_status,
        access_key_reserved: Boolean(data.accessKeyAvailable),
        access_key_revealed: false,
        deadline: data.deadline ?? null,
      }, data);
    },
    onError: async (err: any) => {
      const msg = err?.message ?? "Failed to join campaign";
      toast({ title: "Could not join", description: msg, variant: "destructive" });
      setShowModal(false);
    },
  });

  // ── Mission Workspace state ──
  const [activePanel, setActivePanel] = useState<{ bounty: any } | null>(null);
  const [selectedItems, setSelectedItems] = useState<Record<number, any[]>>({});
  const [submittedItems, setSubmittedItems] = useState<Record<number, any[]>>({});
  const [hasJoined, setHasJoined] = useState(Boolean(canParticipate && (campaign.is_joined || campaign.participant_status)));
  const [joinedAccessKey, setJoinedAccessKey] = useState<string | null>(null);
  const [panelSubmitting, setPanelSubmitting] = useState(false);
  const { data: joinedProgress, isError: joinedProgressError, refetch: refetchJoinedProgress } = useQuery<any>({
    queryKey: ["/api/bounties/my", campaign.id],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: hasJoined && canParticipate,
    staleTime: 15_000,
  });
  const rewardCampaign = hasJoined ? joinedProgress : campaign;
  const rewardBounties = hasJoined
    ? configuredObjectives(joinedProgress?.bounties)
    : bounties;
  const totalXp = Number(rewardCampaign?.total_campaign_xp ?? 0);
  const mandatory = rewardBounties;

  useEffect(() => {
    if (!canParticipate) {
      setHasJoined(false);
      setActivePanel(null);
    } else if (campaign.is_joined || campaign.participant_status) {
      setHasJoined(true);
    }
  }, [canParticipate, campaign.is_joined, campaign.participant_status]);

  const activePanelCt = activePanel?.bounty?.content_type ?? "none";
  const { data: pickerData, isLoading: pickerLoading } = useQuery<any>({
    queryKey: ["/api/bounties/my/content-picker", activePanelCt],
    queryFn: async () => {
      if (!activePanel || !user) return { items: [], count: 0 };
      const ct = activePanel.bounty.content_type;
      const res = await fetch(`/api/bounties/my/content-picker?contentType=${encodeURIComponent(ct)}`, { credentials: "include" });
      if (!res.ok) return { items: [], count: 0 };
      return res.json();
    },
    enabled: !!user && !!activePanel,
    staleTime: 30_000,
  });

  const getProgress = (bountyId: number) => {
    const bounty = mandatory.find(b => b.id === bountyId);
    return Math.max(Number(bounty?.approved_count ?? 0), Number(bounty?.submitted_count ?? 0));
  };
  const isObjectiveDone = (b: any) => Number(b.approved_count ?? 0) >= Number(b.quantity);
  const completedMandatoryCount = mandatory.filter(isObjectiveDone).length;
  const overallPct = mandatory.length > 0 ? Math.round(completedMandatoryCount / mandatory.length * 100) : 0;

  function toggleItem(bountyId: number, item: any, qty: number) {
    setSelectedItems(prev => {
      const current = prev[bountyId] ?? [];
      const exists = current.some((i: any) => i.id === item.id);
      if (exists) return { ...prev, [bountyId]: current.filter((i: any) => i.id !== item.id) };
      if (current.length >= qty) return prev;
      return { ...prev, [bountyId]: [...current, item] };
    });
  }

  async function handleConfirmSelection(bounty: any) {
    if (!user) return;
    const items = selectedItems[bounty.id] ?? [];
    if (items.length === 0) { setActivePanel(null); return; }
    setPanelSubmitting(true);
    try {
      if (!hasJoined) {
        const joinRes = await apiRequest("POST", `/api/bounties/${campaign.id}/join`, {});
        if (!joinRes.ok) {
          const err = await joinRes.json().catch(() => ({}));
          toast({ title: "Could not join", description: (err as any).error ?? "Join failed", variant: "destructive" });
          setPanelSubmitting(false);
          return;
        }
        const joinResult = await joinRes.json();
        if (typeof joinResult.key === "string" && joinResult.key.length > 0) {
          // Keep the immediate join key only in this mounted component's state.
          setJoinedAccessKey(joinResult.key);
        }
        setHasJoined(true);
        qc.invalidateQueries({ queryKey: ["/api/bounties/my/campaigns"] });
        setActivePanel(null);
        toast({
          title: "Mission accepted",
          description: typeof joinResult.key === "string" && joinResult.key.length > 0
            ? "Your assigned game key is shown in the mission workspace."
            : joinResult.accessKeyAvailable
              ? "Your assigned key is available in the mission workspace."
              : "No game key is required for this campaign.",
        });
        setPanelSubmitting(false);
        return;
      }
      const ct = bounty.content_type;
      for (const item of items) {
        const body: any = { contentType: ct };
        if (ct === "clip" || ct === "reel") body.clipId = item.id;
        else if (ct === "screenshot") body.screenshotId = item.id;
        else body.contentUrl = item.url ?? "";
        await apiRequest("POST", `/api/bounties/my/${campaign.id}/submit/${bounty.id}`, body);
      }
      setSubmittedItems(prev => ({ ...prev, [bounty.id]: [...(prev[bounty.id] ?? []), ...items] }));
      setSelectedItems(prev => ({ ...prev, [bounty.id]: [] }));
      qc.invalidateQueries({ queryKey: ["/api/bounties/my", campaign.id] });
      toast({ title: "✅ Objective Submitted!", description: `${items.length} item${items.length !== 1 ? "s" : ""} submitted for review.` });
      setActivePanel(null);
    } catch (e: any) {
      toast({ title: "Submission failed", description: e.message, variant: "destructive" });
    } finally {
      setPanelSubmitting(false);
    }
  }

  return (
    <div className={embedded ? "bounty-inline-workspace" : "min-h-screen bg-background"}>
      {!hasJoined&&!embedded&&<AvailableBountyHero campaign={campaign} onBack={onBack}/>}
      {hasJoined&&<>
      {/* Back */}
      <button onClick={onBack} className="flex items-center gap-2 px-5 py-3 text-white/50 hover:text-white transition-colors text-sm font-bold">
        <ChevronLeft size={16} /> Back to Bounty Hub
      </button>

      {/* ── CINEMATIC HERO ── */}
      <div className="relative overflow-hidden" style={{ minHeight: 390 }}>
        {/* Artwork */}
        <FeaturedHeroBackground
          campaign={campaign}
          className="absolute inset-0 bg-center bg-cover bg-no-repeat"
        />
        {/* Gradients */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(7,11,16,1) 0%, rgba(7,11,16,0.88) 35%, rgba(7,11,16,0.28) 68%, rgba(7,11,16,0.60) 100%)" }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, hsl(var(--background)) 0%, hsl(var(--background) / 0.5) 42%, transparent 100%)" }} />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-end" style={{ minHeight: 390 }}>
          <div className="px-6 pb-8 pt-20">
            <div className="max-w-[1600px] mx-auto flex items-end justify-between gap-10 px-2 lg:px-8">

              {/* LEFT: Game info */}
              <div className="flex-1 max-w-2xl">
                <div className="flex items-center gap-2 mb-4">
                  {campaign.is_verified === true && <span className="flex items-center gap-1.5 text-[10px] font-black px-3 py-1.5 rounded-full" style={{ background: "#141824", color: NEON }}>
                    <VerifiedIcon size={14} decorative /> GF Verified
                  </span>}
                  <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.65)" }}>
                    {isGF ? "Gamefolio Campaign" : "Creator Campaign"}
                  </span>
                  {campaign.platform && (
                    <span className="text-[11px] font-bold px-3 py-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.65)" }}>
                      {campaign.platform}
                    </span>
                  )}
                </div>
                <div className="font-black text-white leading-none mb-4 uppercase" style={{ fontSize: "clamp(2rem,4vw,3.5rem)", letterSpacing: "-0.02em", textShadow: "0 4px 60px rgba(0,0,0,0.80)" }}>
                  {campaign.campaign_title || campaign.template_name}
                </div>
                {gameTitle && (
                  <div className="text-lg font-black uppercase tracking-[0.12em] mb-1" style={{ color: "rgba(255,255,255,0.86)" }}>{gameTitle}</div>
                )}
                {campaign.description && (
                  <p className="text-sm leading-relaxed mb-6 max-w-lg" style={{ color: "rgba(255,255,255,0.50)" }}>{campaign.description}</p>
                )}
                <div className="flex items-center gap-x-5 gap-y-2 flex-wrap text-xs font-bold" style={{ color: "rgba(255,255,255,0.52)" }}>
                  <div className="flex items-center gap-1.5"><Target size={13} /> {mandatory.length} required</div>
                  {estimatedHours != null && (
                    <div className="flex items-center gap-1.5"><Clock size={13} /> Est. {String(estimatedHours).includes("hr") ? estimatedHours : `${estimatedHours} hrs`}</div>
                  )}
                  {timeLeft !== "Ended" && timeLeft !== "Ongoing" && (
                    <div className="flex items-center gap-1.5"><Clock size={13} /> <span style={{ color: "rgba(255,255,255,0.78)" }}>{timeLeft}</span></div>
                  )}
                   <div className="flex items-center gap-1.5"><Key size={13} /> <span style={{ color: "rgba(255,255,255,0.78)" }}>{accessMethodLabel(campaign)}</span></div>
                  {!isGF && accessKeysLeft > 0 && (
                    <div className="flex items-center gap-1.5 text-xs font-black" style={{ color: NEON }}>
                      <img src={accessMethod === "full_game_upfront" || accessMethod === "full_upfront" ? "/icons/full-game-icon.png" : "/icons/demo-key-icon.png"} alt="" className="w-3.5 h-3.5 object-contain" />
                      {accessKeysLeft} {accessMethod === "full_game_upfront" || accessMethod === "full_upfront" ? "full-game access places" : "places"} remaining
                    </div>
                  )}
                  {campaign.participant_count != null && (
                    <div className="flex items-center gap-1.5">
                      <Users size={13} /> <span style={{ color: "rgba(255,255,255,0.78)" }}>{Number(campaign.participant_count).toLocaleString()} creators joined</span>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT: Circular campaign completion widget */}
              {hasJoined && <div className="flex-shrink-0 hidden md:flex flex-col items-center p-6 rounded-3xl" style={{ background: "rgba(7,11,16,0.85)", border: "1px solid rgba(255,255,255,0.12)", backdropFilter: "blur(20px)", minWidth: 210 }}>
                <div className="text-[10px] font-black uppercase tracking-widest mb-5" style={{ color: "rgba(255,255,255,0.32)" }}>Campaign Completion</div>
                <div className="relative" style={{ width: 128, height: 128 }}>
                  <svg width="128" height="128" viewBox="0 0 128 128">
                    <circle cx="64" cy="64" r="54" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="11" />
                    <circle cx="64" cy="64" r="54" fill="none"
                      stroke={overallPct === 100 ? "#22c55e" : NEON}
                      strokeWidth="11"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 54}`}
                      strokeDashoffset={`${2 * Math.PI * 54 * (1 - overallPct / 100)}`}
                      transform="rotate(-90 64 64)"
                      style={{ transition: "stroke-dashoffset 1.2s ease-out, stroke 0.5s", filter: `drop-shadow(0 0 10px ${overallPct === 100 ? "rgba(34,197,94,0.70)" : "rgba(184,255,27,0.65)"})` }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-4xl font-black leading-none tabular-nums" style={{ color: overallPct === 100 ? "#22c55e" : NEON }}>{overallPct}%</div>
                  </div>
                </div>
                <div className="mt-4 text-xs text-center leading-relaxed" style={{ color: "rgba(255,255,255,0.35)" }}>
                  {completedMandatoryCount} / {mandatory.length} Objectives Complete
                </div>
                {overallPct > 0 && overallPct < 100 && (
                  <div className="mt-2 text-[10px] font-black px-3 py-1 rounded-full" style={{ background: "rgba(184,255,27,0.10)", color: NEON }}>In Progress</div>
                )}
                {overallPct === 100 && (
                  <div className="mt-2 text-[10px] font-black px-3 py-1 rounded-full" style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e" }}>✓ Complete</div>
                )}
              </div>}

            </div>
          </div>
        </div>
      </div>

      </>}

      {/* ── MAIN CONTENT ── */}
      {!hasJoined && (
        <AvailableCampaignPreview
          preparedMedia={preparedMedia} onPreparedMedia={onPreparedMedia} preparedText={preparedText} onPreparedText={onPreparedText}
          preparedRating={preparedRating} onPreparedRating={onPreparedRating}
          campaign={campaign}
          mandatory={mandatory}
          canAccept={canAccept}
          joinBlocker={joinBlocker}
          user={user}
          onSignIn={onSignIn}
          compactReward={compactPreview && isRegularBounty(campaign) && !campaign.monetary_rewards}
          onAccept={() => setShowModal(true)}
        />
      )}
      {hasJoined && (
      <div className="px-4 sm:px-6 lg:px-8 pt-8 max-w-[1400px] mx-auto">
        {joinedAccessKey && <div className="mb-5 rounded-xl p-4" style={{ background: "rgba(184,255,27,0.07)", border: "1px solid rgba(184,255,27,0.22)" }}>
          <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: NEON }}>Your game key</div>
          <code className="mt-2 block break-all text-sm font-bold text-white">{joinedAccessKey}</code>
        </div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="text-[10px] uppercase tracking-widest font-black text-white/45">Campaign access</div>
            <div className="text-sm font-bold text-white mt-1">{rewardCampaign ? accessMethodLabel(rewardCampaign) : "Loading campaign access…"}</div>
            <div className="text-[11px] text-white/45 mt-1">Access is assigned only after server-side eligibility checks.</div>
          </div>
          <div className="rounded-xl p-4" style={{ background: "rgba(184,255,27,0.045)", border: "1px solid rgba(184,255,27,0.14)" }}>
            <div className="text-[10px] uppercase tracking-widest font-black" style={{ color: NEON }}>Completion reward</div>
            <div className="text-sm font-bold text-white mt-1">
              {rewardCampaign
                ? campaignRewardSummary(rewardCampaign).map(reward => reward.label).join(" · ") || "No completion rewards configured"
                : "Loading configured rewards…"}
            </div>
            <div className="text-[11px] text-white/45 mt-1">Complete and validate every required objective before the individual deadline.</div>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6 mb-8 items-start">

          {/* ══ LEFT: Mission Objectives / post-acceptance workspace ══ */}
          <div>
            {/* Section header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(184,255,27,0.12)", border: "1px solid rgba(184,255,27,0.22)" }}>
                  <Target size={17} color={NEON} />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: NEON }}>{hasJoined ? "Mission Workspace" : "Mission Objectives"}</div>
                  <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.30)" }}>{mandatory.length} required steps</div>
                </div>
              </div>
              {hasJoined && completedMandatoryCount > 0 && (
                <div className="flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-full" style={{ background: "rgba(34,197,94,0.10)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.22)" }}>
                  <Check size={11} strokeWidth={3} /> {completedMandatoryCount}/{mandatory.length} done
                </div>
              )}
            </div>

            {hasJoined && completedMandatoryCount < mandatory.length && (() => {
              const nextObjective = mandatory.find((b: any) => !isObjectiveDone(b));
              if (!nextObjective) return null;
              const NextIcon = CONTENT_TYPE_ICON[nextObjective.content_type] ?? Target;
              const nextQty = Number(nextObjective.quantity ?? 1);
              const nextProgress = getProgress(nextObjective.id);
              return (
                <div className="mb-6 rounded-2xl p-5" style={{ background: "linear-gradient(110deg, rgba(184,255,27,0.14), rgba(184,255,27,0.035))", border: "1px solid rgba(184,255,27,0.28)" }}>
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] mb-2" style={{ color: NEON }}>What do I do next?</div>
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(184,255,27,0.18)" }}><NextIcon size={20} color={NEON} /></div>
                    <div className="flex-1 min-w-0">
                      <div className="text-lg font-black text-white">{objectiveLabel(nextObjective)}</div>
                  <div className="text-xs text-white/45 mt-0.5">{nextProgress} of {nextQty} submitted</div>
                    </div>
                    <button onClick={() => setActivePanel({ bounty: nextObjective })} className="px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 flex-shrink-0" style={{ background: NEON, color: "#070b10" }}>
                      <Upload size={13} /> Complete
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* ── Compact quest-log objectives ── */}
            {hasJoined && !joinedProgress && (
              <div role={joinedProgressError ? "alert" : "status"} className="mb-4 text-xs text-white/50">
                {joinedProgressError
                  ? <>Could not load your server-joined campaign objectives. <button type="button" onClick={() => void refetchJoinedProgress()} className="font-black underline">Retry</button></>
                  : "Loading your campaign objectives…"}
              </div>
            )}
            <div className="space-y-3 max-w-3xl">
              {mandatory.map((b: any) => {
                const progress = getProgress(b.id);
                const quantity = Number(b.quantity ?? 1);
                const done = progress >= quantity;
                return (
                  <CompactObjectiveRow
                    key={b.id}
                    title={objectiveLabel(b)}
                    description={objectiveDescription(b)}
                    contentType={b.content_type}
                    quantity={quantity}
                    progress={progress}
                    interactive={hasJoined && !!user}
                    done={done}
                     status={objectiveWorkflowStatus(b, progress, quantity, hasJoined)}
                    onClick={() => setActivePanel({ bounty: b })}
                  />
                );
              })}
            </div>

            {/* ── Legacy detailed objective layout retained for the accepted picker path ── */}
            <div className="hidden">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {mandatory.map((b: any, idx: number) => {
                  const ct = b.content_type as string;
                  const qty = Number(b.quantity ?? 1);
                  const Icon = CONTENT_TYPE_ICON[ct] ?? Target;
                  const prog = getProgress(b.id);
                  const done = prog >= qty;
                  const subItems = submittedItems[b.id] ?? [];

                  /* Per-type artwork (SVG) */
                  const artwork = ct === "clip" || ct === "reel" ? (
                    <svg width="100%" height="100%" viewBox="0 0 180 100" fill="none" preserveAspectRatio="xMidYMid slice">
                      <rect width="180" height="100" fill="url(#clipGrad)"/>
                      <defs><radialGradient id="clipGrad" cx="50%" cy="50%" r="70%"><stop offset="0%" stopColor="rgba(184,255,27,0.18)"/><stop offset="100%" stopColor="rgba(7,11,16,0)"/></radialGradient></defs>
                      <rect x="52" y="22" width="76" height="56" rx="8" fill="rgba(14,21,32,0.90)" stroke="rgba(184,255,27,0.30)" strokeWidth="1.5"/>
                      <circle cx="90" cy="50" r="14" fill="rgba(184,255,27,0.15)" stroke="rgba(184,255,27,0.50)" strokeWidth="1.5"/>
                      <polygon points="86,44 86,56 98,50" fill={NEON}/>
                      <rect x="130" y="30" width="10" height="8" rx="2" fill="rgba(184,255,27,0.40)"/>
                      <line x1="140" y1="34" x2="148" y2="30" stroke="rgba(184,255,27,0.40)" strokeWidth="2" strokeLinecap="round"/>
                      <line x1="140" y1="34" x2="148" y2="38" stroke="rgba(184,255,27,0.40)" strokeWidth="2" strokeLinecap="round"/>
                      <rect x="56" y="68" width="10" height="2" rx="1" fill="rgba(255,255,255,0.15)"/>
                      <rect x="70" y="68" width="6" height="2" rx="1" fill="rgba(255,255,255,0.10)"/>
                    </svg>
                  ) : ct === "screenshot" ? (
                    <svg width="100%" height="100%" viewBox="0 0 180 100" fill="none" preserveAspectRatio="xMidYMid slice">
                      <rect width="180" height="100" fill="url(#ssGrad)"/>
                      <defs><radialGradient id="ssGrad" cx="50%" cy="40%" r="60%"><stop offset="0%" stopColor="rgba(184,255,27,0.14)"/><stop offset="100%" stopColor="rgba(7,11,16,0)"/></radialGradient></defs>
                      <rect x="50" y="24" width="80" height="52" rx="6" fill="rgba(14,21,32,0.85)" stroke="rgba(184,255,27,0.25)" strokeWidth="1.5"/>
                      <rect x="56" y="30" width="68" height="38" rx="3" fill="rgba(184,255,27,0.06)"/>
                      <circle cx="90" cy="49" r="10" fill="none" stroke="rgba(184,255,27,0.50)" strokeWidth="1.5"/>
                      <circle cx="90" cy="49" r="3" fill={NEON}/>
                      <line x1="90" y1="36" x2="90" y2="40" stroke="rgba(184,255,27,0.50)" strokeWidth="1.5" strokeLinecap="round"/>
                      <line x1="90" y1="58" x2="90" y2="62" stroke="rgba(184,255,27,0.50)" strokeWidth="1.5" strokeLinecap="round"/>
                      <line x1="77" y1="49" x2="81" y2="49" stroke="rgba(184,255,27,0.50)" strokeWidth="1.5" strokeLinecap="round"/>
                      <line x1="99" y1="49" x2="103" y2="49" stroke="rgba(184,255,27,0.50)" strokeWidth="1.5" strokeLinecap="round"/>
                      <rect x="56" y="72" width="14" height="2" rx="1" fill="rgba(255,255,255,0.15)"/>
                    </svg>
                  ) : ct === "feedback" ? (
                    <svg width="100%" height="100%" viewBox="0 0 180 100" fill="none" preserveAspectRatio="xMidYMid slice">
                      <rect width="180" height="100" fill="url(#fbGrad)"/>
                      <defs><radialGradient id="fbGrad" cx="50%" cy="50%" r="65%"><stop offset="0%" stopColor="rgba(184,255,27,0.12)"/><stop offset="100%" stopColor="rgba(7,11,16,0)"/></radialGradient></defs>
                      <rect x="48" y="18" width="64" height="64" rx="8" fill="rgba(14,21,32,0.90)" stroke="rgba(184,255,27,0.25)" strokeWidth="1.5"/>
                      <rect x="56" y="30" width="36" height="3" rx="1.5" fill="rgba(184,255,27,0.60)"/>
                      <rect x="56" y="38" width="28" height="2.5" rx="1.25" fill="rgba(255,255,255,0.20)"/>
                      <rect x="56" y="45" width="32" height="2.5" rx="1.25" fill="rgba(255,255,255,0.20)"/>
                      <rect x="56" y="52" width="22" height="2.5" rx="1.25" fill="rgba(255,255,255,0.15)"/>
                      <path d="M116 44 L128 38 L140 44 L128 56 Z" fill="rgba(14,21,32,0.90)" stroke="rgba(184,255,27,0.40)" strokeWidth="1.5"/>
                      <circle cx="128" cy="47" r="4" fill={NEON}/>
                    </svg>
                  ) : ct === "stream" ? (
                    <svg width="100%" height="100%" viewBox="0 0 180 100" fill="none" preserveAspectRatio="xMidYMid slice">
                      <rect width="180" height="100" fill="url(#stGrad)"/>
                      <defs><radialGradient id="stGrad" cx="50%" cy="50%" r="65%"><stop offset="0%" stopColor="rgba(239,68,68,0.15)"/><stop offset="100%" stopColor="rgba(7,11,16,0)"/></radialGradient></defs>
                      <rect x="46" y="22" width="88" height="56" rx="8" fill="rgba(14,21,32,0.85)" stroke="rgba(239,68,68,0.30)" strokeWidth="1.5"/>
                      <circle cx="65" cy="36" r="5" fill="rgba(239,68,68,0.90)"/>
                      <rect x="74" y="33" width="24" height="3" rx="1.5" fill="rgba(255,255,255,0.25)"/>
                      <rect x="56" y="48" width="68" height="2.5" rx="1.25" fill="rgba(255,255,255,0.12)"/>
                      <rect x="56" y="55" width="50" height="2.5" rx="1.25" fill="rgba(255,255,255,0.08)"/>
                      <text x="65" y="39" fill="rgba(239,68,68,0.90)" fontSize="5" fontWeight="900" fontFamily="sans-serif">LIVE</text>
                    </svg>
                  ) : ct === "bug" ? (
                    <svg width="100%" height="100%" viewBox="0 0 180 100" fill="none" preserveAspectRatio="xMidYMid slice">
                      <rect width="180" height="100" fill="url(#bugGrad)"/>
                      <defs><radialGradient id="bugGrad" cx="50%" cy="50%" r="60%"><stop offset="0%" stopColor="rgba(251,146,60,0.14)"/><stop offset="100%" stopColor="rgba(7,11,16,0)"/></radialGradient></defs>
                      <circle cx="90" cy="50" r="26" fill="rgba(14,21,32,0.85)" stroke="rgba(251,146,60,0.35)" strokeWidth="1.5"/>
                      <line x1="75" y1="50" x2="105" y2="50" stroke="rgba(251,146,60,0.40)" strokeWidth="1.5"/>
                      <line x1="90" y1="35" x2="90" y2="65" stroke="rgba(251,146,60,0.40)" strokeWidth="1.5"/>
                      <circle cx="90" cy="50" r="8" fill="none" stroke="rgba(251,146,60,0.70)" strokeWidth="2"/>
                      <circle cx="90" cy="50" r="3" fill="rgb(251,146,60)"/>
                    </svg>
                  ) : (
                    /* session / default */
                    <svg width="100%" height="100%" viewBox="0 0 180 100" fill="none" preserveAspectRatio="xMidYMid slice">
                      <rect width="180" height="100" fill="url(#sesGrad)"/>
                      <defs><radialGradient id="sesGrad" cx="50%" cy="50%" r="65%"><stop offset="0%" stopColor="rgba(184,255,27,0.12)"/><stop offset="100%" stopColor="rgba(7,11,16,0)"/></radialGradient></defs>
                      <rect x="55" y="32" width="70" height="42" rx="12" fill="rgba(14,21,32,0.90)" stroke="rgba(184,255,27,0.28)" strokeWidth="1.5"/>
                      <circle cx="79" cy="53" r="5" fill="none" stroke="rgba(184,255,27,0.50)" strokeWidth="1.5"/>
                      <circle cx="101" cy="53" r="5" fill="none" stroke="rgba(184,255,27,0.50)" strokeWidth="1.5"/>
                      <rect x="86" y="45" width="2" height="8" rx="1" fill="rgba(184,255,27,0.50)"/>
                      <rect x="82" y="49" width="8" height="2" rx="1" fill="rgba(184,255,27,0.50)"/>
                      <circle cx="98" cy="50" r="1.5" fill={NEON}/>
                      <circle cx="104" cy="50" r="1.5" fill="rgba(184,255,27,0.40)"/>
                    </svg>
                  );

                  const baseAccent = ct === "stream" ? "rgba(239,68,68,0.85)" : ct === "bug" ? "rgba(251,146,60,0.85)" : NEON;
                  const baseBg    = ct === "stream" ? "rgba(239,68,68,0.10)" : ct === "bug" ? "rgba(251,146,60,0.10)" : "rgba(184,255,27,0.10)";
                  const accentColor = done ? "#22c55e" : baseAccent;
                  const accentBg    = done ? "rgba(34,197,94,0.10)" : baseBg;

                  return (
                    <div
                      key={b.id}
                      className="rounded-2xl flex flex-col overflow-hidden transition-all duration-500"
                      style={{ background: done ? "rgba(34,197,94,0.05)" : "rgba(255,255,255,0.03)", border: done ? "1px solid rgba(34,197,94,0.28)" : "1px solid rgba(255,255,255,0.08)", boxShadow: done ? "0 0 20px rgba(34,197,94,0.08)" : "none" }}
                    >
                      {/* Artwork zone */}
                      <div className="relative overflow-hidden flex-shrink-0" style={{ height: 105 }}>
                        {artwork}
                        {done && (
                          <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(34,197,94,0.22)" }}>
                            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "#22c55e", boxShadow: "0 0 24px rgba(34,197,94,0.60)" }}>
                              <Check size={18} color="white" strokeWidth={3} />
                            </div>
                          </div>
                        )}
                        <div className="absolute top-2.5 left-2.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black" style={{ background: "rgba(7,11,16,0.85)", color: accentColor, border: "1px solid rgba(255,255,255,0.12)" }}>
                          {done ? <Check size={9} strokeWidth={3} /> : idx + 1}
                        </div>
                      </div>

                      {/* Content zone */}
                      <div className="p-3.5 flex flex-col gap-2 flex-1">
                        <div className="flex items-start gap-2">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: accentBg }}>
                            <Icon size={14} style={{ color: accentColor }} />
                          </div>
                          <span className="text-sm font-black text-white leading-snug">{objectiveLabel(b)}</span>
                        </div>

                        <p className="text-[11px] leading-snug line-clamp-2" style={{ color: "rgba(255,255,255,0.36)" }}>
                          {b.description ?? (ct === "clip" ? `Record ${qty} gameplay clip${qty !== 1 ? "s" : ""}` :
                            ct === "screenshot" ? `Capture ${qty} in-game screenshot${qty !== 1 ? "s" : ""}` :
                            ct === "feedback" ? "Share your impressions of the game" :
                            ct === "reel" ? `Create ${qty} highlight reel${qty !== 1 ? "s" : ""}` :
                            ct === "stream" ? "Go live and stream your gameplay" :
                            ct === "bug" ? `Document ${qty} bug${qty !== 1 ? "s" : ""}` : "Complete this objective")}
                        </p>

                        {/* Submitted items with awaiting verification status */}
                        {subItems.length > 0 && (
                          <div className="rounded-xl p-2.5 space-y-1.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                            <div className="text-[9px] font-black uppercase tracking-widest text-white/25">Submitted</div>
                            <div className="flex gap-1 flex-wrap">
                              {subItems.map((item: any) => (
                                <div key={item.id} className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0" style={{ border: "1px solid rgba(34,197,94,0.45)" }}>
                                  {item.thumbnailUrl
                                    ? <img src={item.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                                    : <div className="w-full h-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}><Icon size={11} className="text-white/35" /></div>}
                                </div>
                              ))}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] font-bold" style={{ color: "rgba(251,191,36,0.85)" }}>
                              <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse flex-shrink-0" />
                              Awaiting Verification
                            </div>
                          </div>
                        )}

                        {hasJoined ? (
                          <div className="mt-auto">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-bold transition-colors duration-500" style={{ color: done ? "#22c55e" : "rgba(255,255,255,0.28)" }}>
                                {prog} / {qty}{done ? " ✓" : ""}
                              </span>
                              {!done && prog > 0 && <span className="text-[10px] text-white/22">{Math.round(prog / qty * 100)}%</span>}
                            </div>
                            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(prog / qty * 100, 100)}%`, background: done ? "#22c55e" : accentColor }} />
                            </div>
                          </div>
                        ) : (
                          <div className="mt-auto text-[11px] font-bold text-white/45">{qty} {CONTENT_TYPE_LABEL[ct] ?? ct}{qty !== 1 ? "s" : ""}</div>
                        )}

                        {/* Dynamic action button */}
                        {hasJoined && <button
                          onClick={() => !done && user ? setActivePanel({ bounty: b }) : undefined}
                          disabled={done || !user}
                          className="w-full py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all duration-200 hover:brightness-110 disabled:cursor-default"
                          style={done
                            ? { background: "rgba(34,197,94,0.10)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.22)" }
                            : { background: accentBg, color: accentColor, border: `1px solid ${ct === "stream" ? "rgba(239,68,68,0.22)" : ct === "bug" ? "rgba(251,146,60,0.22)" : "rgba(184,255,27,0.22)"}` }}
                        >
                          {done
                            ? <><Check size={11} strokeWidth={3} /> Submitted for Review</>
                            : ct === "stream"
                            ? <><Upload size={11} /> Submit Stream</>
                            : prog > 0
                            ? <><Plus size={11} /> Continue ({prog}/{qty})</>
                            : <><Upload size={11} /> {ct === "clip" ? "Add Clips" : ct === "screenshot" ? "Add Screenshots" : ct === "reel" ? "Add Reels" : ct === "feedback" ? "Write Feedback" : ct === "bug" ? "Report Bugs" : "Add Content"}</>}
                        </button>}
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          </div>

          {/* ══ RIGHT: Mission Rewards ══ */}
          <div className="rounded-3xl flex flex-col lg:sticky lg:top-4" style={{ background: CARD_BG, border: "1px solid rgba(184,255,27,0.20)", boxShadow: "0 0 50px rgba(184,255,27,0.06)" }}>

            {/* Card header */}
            <div className="px-6 pt-6 pb-4 flex items-center gap-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(184,255,27,0.10)", border: "1px solid rgba(184,255,27,0.18)" }}>
                <Gift size={15} color={NEON} />
              </div>
              <h2 className="text-base font-black text-white">Rewards</h2>
            </div>

            {/* Reward rows */}
            <div className="flex-1 p-4 space-y-2.5">
              {(() => {
                const allComplete = completedMandatoryCount >= mandatory.length && mandatory.length > 0;
                const earnedXp = Number(rewardCampaign?.awarded_campaign_xp ?? 0);
                const journeyAccessMethod = rewardCampaign?.access_method ?? accessMethod;
                const keylessJourneyAccess = ["public_demo", "free_to_play"].includes(journeyAccessMethod ?? "")
                  || (["custom_access", "custom"].includes(journeyAccessMethod ?? "")
                    && (rewardCampaign?.custom_access_needs_key ?? rewardCampaign?.customAccessNeedsKey) === false);
                const accessClaimed = Boolean(rewardCampaign?.access_revealed_at);
                const accessReserved = Boolean(rewardCampaign?.access_key_reserved || rewardCampaign?.access_key_id || rewardCampaign?.demo_key_id);
                const hasCampaignAccess = keylessJourneyAccess || accessReserved || accessClaimed
                  || (!hasJoined && campaignAccessKeysRemaining(rewardCampaign ?? campaign) > 0);
                const demoStatus = accessClaimed ? "claimed" : accessReserved ? "reserved" : canAccept || keylessJourneyAccess ? "available" : "locked";
                const fullGameClaimed = Boolean(rewardCampaign?.completion_key_available
                  || rewardCampaign?.full_key_id || rewardCampaign?.full_key_value);

                return (<>
                  {/* Campaign access */}
                  {hasCampaignAccess && (
                    <div className="flex items-center gap-3 rounded-2xl p-3.5 transition-all duration-500"
                      style={{ background: demoStatus === "claimed" ? "rgba(34,197,94,0.07)" : "rgba(184,255,27,0.07)", border: demoStatus === "claimed" ? "1px solid rgba(34,197,94,0.25)" : "1px solid rgba(184,255,27,0.18)" }}>
                      {keylessJourneyAccess
                        ? <Gamepad2 size={28} className="ml-2 mr-1" color={demoStatus === "claimed" ? "#22c55e" : NEON} />
                        : <Key size={28} className="ml-2 mr-1" color={demoStatus === "claimed" ? "#22c55e" : NEON} />}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-black" style={{ color: demoStatus === "claimed" ? "#22c55e" : NEON }}>{keylessJourneyAccess ? "Game Access" : "Campaign Access"}</div>
                        <div className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.38)" }}>{accessMethodLabel(rewardCampaign ?? campaign)}</div>
                      </div>
                      <div className="text-[10px] font-black px-2.5 py-1 rounded-full flex-shrink-0 flex items-center gap-1"
                        style={{ background: demoStatus === "claimed" ? "rgba(34,197,94,0.15)" : "rgba(184,255,27,0.15)", color: demoStatus === "claimed" ? "#22c55e" : NEON }}>
                        {demoStatus === "claimed"
                          ? <><Check size={9} strokeWidth={3} /> REVEALED</>
                          : demoStatus === "reserved"
                            ? <><Key size={9} /> RESERVED</>
                            : demoStatus === "available"
                              ? <><Zap size={9} /> AVAILABLE</>
                              : <><Lock size={9} /> LOCKED</>}
                      </div>
                    </div>
                  )}

                  {/* Full Game */}
                  {(rewardCampaign?.has_full_game_reward || rewardCampaign?.completion_reward_type === "full_game_key" || rewardCampaign?.completion_full_game_key) && <div className="flex items-center gap-3 rounded-2xl p-3.5 transition-all duration-500"
                    style={{ background: fullGameClaimed ? "rgba(34,197,94,0.06)" : "rgba(255,255,255,0.03)", border: fullGameClaimed ? "1px solid rgba(34,197,94,0.22)" : "1px solid rgba(255,255,255,0.07)", opacity: fullGameClaimed ? 1 : 0.68 }}>
                    <img src="/icons/full-game-icon.png" alt="Full Game" className="w-11 h-11 object-contain flex-shrink-0" style={{ filter: fullGameClaimed ? "drop-shadow(0 0 6px rgba(34,197,94,0.40))" : "grayscale(0.5)", opacity: fullGameClaimed ? 1 : 0.70 }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-black" style={{ color: fullGameClaimed ? "#22c55e" : "rgba(255,255,255,0.78)" }}>Full Game</div>
                      <div className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.32)" }}>{fullGameClaimed ? "Claimed" : "Available after required objectives are approved"}</div>
                    </div>
                    <div className="text-[10px] font-black px-2.5 py-1 rounded-full flex-shrink-0 flex items-center gap-1"
                      style={{ background: fullGameClaimed ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.07)", color: fullGameClaimed ? "#22c55e" : "rgba(255,255,255,0.32)" }}>
                      {fullGameClaimed ? <><Check size={9} strokeWidth={3} /> CLAIMED</> : <><Lock size={9} /> LOCKED</>}
                    </div>
                  </div>}

                  {/* XP with progress bar */}
                  {rewardCampaign && totalXp > 0 && (
                    <div className="rounded-2xl p-3.5 transition-all duration-500"
                      style={{ background: earnedXp > 0 ? "rgba(184,255,27,0.05)" : "rgba(255,255,255,0.03)", border: earnedXp > 0 ? "1px solid rgba(184,255,27,0.15)" : "1px solid rgba(255,255,255,0.07)" }}>
                      <div className="flex items-center gap-3 mb-2.5">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(184,255,27,0.10)", border: "1px solid rgba(184,255,27,0.18)" }}>
                          <Zap size={20} color={NEON} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-black text-white">Bounty XP Reward</div>
                          <div className="text-[11px] font-black tabular-nums" style={{ color: NEON }}>
                            {earnedXp > 0
                              ? `${earnedXp.toLocaleString()} XP awarded`
                              : allComplete
                                ? "Pending reward fulfillment"
                                : `Awarded after all ${mandatory.length} steps are approved`}
                          </div>
                        </div>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                        <div className="h-full rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${totalXp > 0 ? Math.round(earnedXp / totalXp * 100) : 0}%`, background: `linear-gradient(90deg,${NEON},rgba(184,255,27,0.65))`, boxShadow: earnedXp > 0 ? "0 0 8px rgba(184,255,27,0.40)" : "none" }} />
                      </div>
                        <div className="mt-2 text-right text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                          Full campaign reward <strong style={{ color: NEON }}>{totalXp.toLocaleString()} XP</strong>
                        </div>
                    </div>
                  )}

                </>);
              })()}
            </div>

            {/* CTA */}
            <div className="px-5 pb-5 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              {user ? (
                <div className="space-y-3">
                  {!canParticipate ? (
                    <div className="rounded-2xl p-4 text-center space-y-1.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <Lock size={18} className="mx-auto text-white/30" />
                      <div className="text-sm font-black text-white/75">Campaign view only</div>
                      <div className="text-[11px] leading-relaxed text-white/40">
                        Indie developers can manage their own campaigns, but creator participation is for Gamefolio creators.
                      </div>
                    </div>
                  ) : completedMandatoryCount === mandatory.length && mandatory.length > 0 ? (
                    <div className="rounded-2xl p-4 text-center space-y-1.5" style={{ background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.25)", boxShadow: "0 0 24px rgba(34,197,94,0.07)" }}>
                      <Trophy size={20} color={NEON} className="mx-auto" />
                      <div className="text-sm font-black text-white">Mission Complete!</div>
                      <div className="text-[11px] leading-relaxed" style={{ color: "rgba(255,255,255,0.38)" }}>Awaiting developer verification. Rewards distributed once approved.</div>
                      <div className="flex items-center justify-center gap-1.5 text-[11px] font-black" style={{ color: "#22c55e" }}>
                        <Check size={11} strokeWidth={3} /> All {mandatory.length} objectives submitted
                      </div>
                    </div>
                  ) : hasJoined ? (
                    <button
                      disabled={!joinedProgress}
                      onClick={() => { const next = mandatory.find((b: any) => !isObjectiveDone(b)); if (next) setActivePanel({ bounty: next }); }}
                      className="w-full py-3.5 rounded-2xl text-sm font-black flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-[0.99] disabled:cursor-wait disabled:opacity-50"
                      style={{ background: NEON, color: "#070b10", boxShadow: "0 0 22px rgba(184,255,27,0.32)" }}
                    >
                      {!joinedProgress && <Loader2 size={16} className="animate-spin" />}
                      {joinedProgress ? <><Upload size={16} /> Continue Mission</> : "Loading Mission"}
                    </button>
                  ) : (
                    <button
                      disabled={!canAccept}
                      onClick={() => setShowModal(true)}
                      className="w-full py-3.5 rounded-2xl text-sm font-black flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-40"
                      style={{ background: NEON, color: "#070b10", boxShadow: "0 0 22px rgba(184,255,27,0.32)" }}
                    >
                      {!canAccept
                        ? <><Lock size={16} /> {accessMethod === "full_game_upfront" || accessMethod === "full_upfront" ? "No Full-Game Access Keys" : "No Access Keys Available"}</>
                        : <><ShieldCheck size={16} /> Accept Mission</>}
                    </button>
                  )}
                  {!hasJoined && canAccept && (
                    <p className="text-[10px] text-center leading-relaxed" style={{ color: "rgba(255,255,255,0.22)" }}>
                      Accept = use key yourself · genuine content · follow{" "}
                      <span style={{ color: "rgba(184,255,27,0.55)" }}>Community Guidelines</span>
                    </p>
                  )}
                  {hasJoined && completedMandatoryCount < mandatory.length && (
                    <p className="text-[11px] text-center font-bold" style={{ color: "rgba(184,255,27,0.50)" }}>
                      {completedMandatoryCount}/{mandatory.length} objectives · keep creating!
                    </p>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl p-4 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <Lock size={20} className="mx-auto mb-2 text-white/22" />
                  <div className="text-sm font-bold mb-2" style={{ color: "rgba(255,255,255,0.40)" }}>Sign in to accept this mission</div>
                  <a href="/auth" className="text-sm font-black" style={{ color: NEON }}>Sign In →</a>
                </div>
              )}
            </div>
          </div>
        </div>

        {hasJoined && joinedProgress && (
          <CampaignRewardJourney campaign={rewardCampaign} bounties={rewardBounties} joined />
        )}

        {/* ── HOW IT WORKS ── */}
        {hasJoined && <div className="mb-10 rounded-3xl overflow-hidden" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
          <div className="px-6 sm:px-8 py-6 flex flex-col sm:flex-row items-center sm:items-stretch gap-0 sm:gap-0">
            {([
              { icon: <ShieldCheck size={16} color={NEON} />, num: "1", label: "Accept Mission", sub: "Confirm campaign access" },
              { icon: <Gamepad2 size={16} color={NEON} />, num: "2", label: "Play the Game", sub: "Use your assigned access" },
              { icon: <Upload size={16} color={NEON} />, num: "3", label: "Upload Content", sub: "Clips, screenshots, reels" },
              { icon: <Check size={16} strokeWidth={3} color={NEON} />, num: "4", label: "Verification", sub: "Dev reviews your content" },
              { icon: <Trophy size={16} color={NEON} />, num: "5", label: "Unlock Rewards", sub: "Configured campaign rewards" },
            ] as const).map((step, i, arr) => (
              <div key={step.label} className="flex sm:flex-col items-center flex-1 gap-3 sm:gap-0">
                <div className="flex sm:flex-col items-center flex-1 sm:px-4 py-0 sm:py-2">
                  <div className="flex sm:flex-col items-center sm:items-center gap-3 sm:gap-2 flex-shrink-0">
                    <div className="relative w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(184,255,27,0.08)", border: "1px solid rgba(184,255,27,0.18)" }}>
                      {step.icon}
                      <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black" style={{ background: NEON, color: "#070b10" }}>{step.num}</div>
                    </div>
                    <div className="sm:text-center">
                      <div className="text-xs font-black" style={{ color: "rgba(255,255,255,0.75)" }}>{step.label}</div>
                      <div className="text-[10px] mt-0.5 hidden sm:block" style={{ color: "rgba(255,255,255,0.28)" }}>{step.sub}</div>
                    </div>
                  </div>
                </div>
                {i < arr.length - 1 && (
                  <>
                    <div className="hidden sm:block flex-shrink-0 self-center" style={{ width: 1, height: 32, background: "linear-gradient(180deg, rgba(184,255,27,0.22), rgba(184,255,27,0.06))" }} />
                    <div className="sm:hidden w-px self-stretch" style={{ background: "linear-gradient(180deg, rgba(184,255,27,0.22), rgba(184,255,27,0.06))" }} />
                  </>
                )}
              </div>
            ))}
            {/* CTA pill */}
            {user && !hasJoined && canAccept && (
              <div className="hidden sm:flex items-center pl-4 ml-2 flex-shrink-0" style={{ borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
                <button onClick={() => setShowModal(true)}
                  className="py-2.5 px-5 rounded-2xl text-xs font-black flex items-center gap-1.5 whitespace-nowrap transition-all hover:brightness-110"
                  style={{ background: NEON, color: "#070b10", boxShadow: "0 0 18px rgba(184,255,27,0.28)" }}>
                  <ShieldCheck size={13} /> Accept Mission
                </button>
              </div>
            )}
            {user && hasJoined && completedMandatoryCount < mandatory.length && (
              <div className="hidden sm:flex items-center pl-4 ml-2 flex-shrink-0" style={{ borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
                <button onClick={() => { const next = mandatory.find((b: any) => !isObjectiveDone(b)); if (next) setActivePanel({ bounty: next }); }}
                  className="py-2.5 px-5 rounded-2xl text-xs font-black flex items-center gap-1.5 whitespace-nowrap transition-all hover:brightness-110"
                  style={{ background: NEON, color: "#070b10", boxShadow: "0 0 18px rgba(184,255,27,0.28)" }}>
                  <Upload size={13} /> Continue Mission
                </button>
              </div>
            )}
          </div>
        </div>}

        {/* bottom spacer */}
        <div className="pb-8" />
      </div>
      )}

      {/* ── CONTENT PICKER PANEL ── */}
      {activePanel && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: "rgba(0,0,0,0.82)" }}
          onClick={() => !panelSubmitting && setActivePanel(null)}>
          <div className="w-full rounded-t-3xl flex flex-col" style={{ background: "#0e1520", border: "1px solid rgba(184,255,27,0.16)", maxHeight: "80vh" }}
            onClick={e => e.stopPropagation()}>

            {/* Panel header */}
            <div className="flex items-start justify-between px-5 pt-5 pb-4 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest mb-0.5" style={{ color: NEON }}>
                  {activePanel.bounty.content_type === "screenshot" ? "Your Screenshots" : "Your Gameplay Clips"}
                </div>
                <div className="text-base font-black text-white">{objectiveLabel(activePanel.bounty)}</div>
                <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.38)" }}>
                  Select up to {Number(activePanel.bounty.quantity ?? 1)} item{Number(activePanel.bounty.quantity ?? 1) !== 1 ? "s" : ""}
                  {(selectedItems[activePanel.bounty.id] ?? []).length > 0 && <span style={{ color: NEON }}> · {(selectedItems[activePanel.bounty.id] ?? []).length} selected</span>}
                </div>
              </div>
              <button onClick={() => setActivePanel(null)} className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ml-4"
                style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.50)" }}>
                <X size={15} />
              </button>
            </div>

            {/* Content grid */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {pickerLoading ? (
                <div className="flex flex-col items-center justify-center py-14 gap-3">
                  <Loader2 size={24} className="animate-spin" style={{ color: NEON }} />
                  <span className="text-xs text-white/35">Finding your content…</span>
                </div>
              ) : (pickerData?.items ?? []).length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <Target size={28} color={NEON} className="mx-auto" />
                  <div className="text-sm font-bold text-white/40">No existing content found</div>
                  <div className="text-xs text-white/25 max-w-xs mx-auto">Upload {activePanel.bounty.content_type === "screenshot" ? "screenshots" : "clips"} to your Gamefolio profile first, then return here to submit them</div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-4" style={{ background: "rgba(184,255,27,0.06)", border: "1px solid rgba(184,255,27,0.14)" }}>
                    <Zap size={12} style={{ color: NEON }} />
                    <span className="text-xs font-bold" style={{ color: NEON }}>
                      Gamefolio found {pickerData.count} {activePanel.bounty.content_type === "screenshot" ? "screenshot" : "clip"}{pickerData.count !== 1 ? "s" : ""} · tap to select
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {(pickerData.items ?? []).map((item: any) => {
                      const isSelected = (selectedItems[activePanel.bounty.id] ?? []).some((i: any) => i.id === item.id);
                      const qty = Number(activePanel.bounty.quantity ?? 1);
                      const atMax = (selectedItems[activePanel.bounty.id] ?? []).length >= qty && !isSelected;
                      const Ic = CONTENT_TYPE_ICON[activePanel.bounty.content_type] ?? Target;
                      return (
                            <button key={item.id} onClick={() => !atMax && toggleItem(activePanel.bounty.id, item, qty)} disabled={atMax}
                          className="relative rounded-xl overflow-hidden transition-all duration-200 aspect-video"
                          style={{ border: isSelected ? "2px solid #22c55e" : "1px solid rgba(255,255,255,0.08)", opacity: atMax ? 0.28 : 1, boxShadow: isSelected ? "0 0 14px rgba(34,197,94,0.35)" : "none" }}>
                          {item.thumbnailUrl
                            ? <img src={item.thumbnailUrl} alt={item.title ?? ""} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}><Ic size={18} className="text-white/25" /></div>}
                          {isSelected && (
                            <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(34,197,94,0.28)" }}>
                              <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "#22c55e" }}>
                                <Check size={14} color="white" strokeWidth={3} />
                              </div>
                            </div>
                          )}
                          {item.title && (
                            <div className="absolute bottom-0 left-0 right-0 px-1.5 py-1 text-[9px] font-bold text-white truncate"
                              style={{ background: "linear-gradient(to top, rgba(0,0,0,0.82), transparent)" }}>
                              {item.title}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Panel footer */}
            <div className="px-5 pb-6 pt-3 flex-shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
              <button
                onClick={() => handleConfirmSelection(activePanel.bounty)}
                disabled={panelSubmitting || (selectedItems[activePanel.bounty.id] ?? []).length === 0}
                className="w-full py-3.5 rounded-2xl text-sm font-black flex items-center justify-center gap-2 transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: NEON, color: "#070b10", boxShadow: `0 0 24px rgba(184,255,27,0.32)` }}>
                {panelSubmitting
                  ? <><Loader2 size={16} className="animate-spin" /> Submitting…</>
                  : (selectedItems[activePanel.bounty.id] ?? []).length === 0
                  ? "Select items to continue"
                  : <><Check size={16} /> Submit {(selectedItems[activePanel.bounty.id] ?? []).length} Item{(selectedItems[activePanel.bounty.id] ?? []).length !== 1 ? "s" : ""} to Campaign</>}
              </button>
              <p className="text-center text-[11px] mt-2" style={{ color: "rgba(255,255,255,0.24)" }}>
                Your submission will be sent for developer review.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRMATION MODAL ── */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{ background: "rgba(0,0,0,0.80)" }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 space-y-5"
            style={{ background: "#0e1520", border: "1px solid rgba(184,255,27,0.18)" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <CampaignRowArtwork campaign={campaign} showFallbackIcon />
              <div className="min-w-0">
                <div className="text-lg font-black text-white">Start {campaign.campaign_title || campaign.template_name}?</div>
                <div className="text-xs text-white/45">{gameTitle || campaign.game_name || "Gamefolio campaign"}</div>
              </div>
            </div>
            <p className="text-sm text-white/60">{isRegularBounty(campaign) ? "Confirm game access so you can submit your content." : "Your place and submission deadline will be set when you start. You’ll stay on this page to prepare and submit your objectives."}</p>
            <div className="space-y-3 border-t border-white/10 pt-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-white/35 mb-1">Mission briefing</div>
              <div className="text-xs text-white/60">{mandatory.length} required steps · {timeLeft === "Ongoing" ? "Ongoing campaign" : timeLeft}</div>
              {!isGF && accessKeysLeft > 0 && <div className="text-xs font-bold mt-2" style={{ color: NEON }}>1 {accessMethod === "full_game_upfront" || accessMethod === "full_upfront" ? "full-game access key" : "access key"} will be reserved for you.</div>}
              {keylessAccess && <div className="text-xs font-bold mt-2" style={{ color: NEON }}>No access key is required. Access is available when you accept.</div>}
              {[
                ...(campaign.completion_full_game_key || campaign.has_full_game_reward || campaign.completion_reward_type === "full_game_key" ? [{ icon: <img src="/icons/full-game-icon.png" alt="" className="w-5 h-5 object-contain" />, text: "Full Game after required objectives" }] : []),
                ...(totalXp > 0 ? [{ icon: <Zap size={16} color={NEON} />, text: `${totalXp.toLocaleString()} Bounty XP Reward` }] : []),
              ].map(({ icon, text }) => (
                <div key={text} className="flex items-center gap-2.5 text-sm text-white/75">
                  {icon}<span>{text}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-3.5 rounded-xl text-sm font-black text-white/55 transition-colors hover:text-white"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.10)" }}
              >
                Cancel
              </button>
              <button
                onClick={() => joinMutation.mutate()}
                disabled={joinMutation.isPending}
                className="flex-1 py-3.5 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all hover:brightness-110 disabled:opacity-60"
                style={{ background: NEON, color: "#070b10" }}
              >
                {joinMutation.isPending
                  ? <Loader2 size={16} className="animate-spin" />
                   : <><ShieldCheck size={16} /> {streamObjective ? "Start Streaming Campaign" : "Start Campaign"}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CampaignProgress({ campaign: cp, onBack, embedded=false, directSubmission=false, preparedMedia,onPreparedMedia,preparedText,onPreparedText,preparedRating,onPreparedRating }: BountyDraftProps & { campaign: any; onBack: () => void; embedded?:boolean; directSubmission?:boolean }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [copiedDemo, setCopiedDemo] = useState(false);
  const [copiedFull, setCopiedFull] = useState(false);
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [submittingSlotIndex, setSubmittingSlotIndex] = useState<number | null>(null);
  const [submitUrl, setSubmitUrl] = useState("");
  const [reviewRatingDraft, setReviewRatingDraft] = useState<{ bountyId: number; slotIndex: number; rating: number }>();
  const ratingFor = (bountyId: number, slotIndex: number, savedContent: unknown) =>
    reviewRatingDraft?.bountyId === bountyId && reviewRatingDraft.slotIndex === slotIndex
      ? reviewRatingDraft.rating : savedReviewRating(savedContent) ?? preparedRating;
  const [draftStatus, setDraftStatus] = useState<"saving" | "saved" | "error" | null>(null);
  const [selectedContentId, setSelectedContentId] = useState<number | null>(null);
  const [nativeFile, setNativeFile] = useState<File | null>(null);
  const [nativeStep, setNativeStep] = useState<"preview" | "details">("preview");
  const [nativePreview, setNativePreview] = useState<string | null>(null);
  const [nativeUploadAttemptId, setNativeUploadAttemptId] = useState<string | null>(null);
  const [uploadedMedia, setUploadedMedia] = useState<{
    bountyId: number; slotIndex: number; id: number; type: "clip" | "reel" | "screenshot";
    title: string; mediaUrl: string | null; thumbnailUrl: string | null;
  } | null>(null);
  const [nativeTitle, setNativeTitle] = useState("");
  const [nativeDescription, setNativeDescription] = useState("");
  const [nativeDragging, setNativeDragging] = useState(false);
  const [nativeUploadError, setNativeUploadError] = useState<string | null>(null);
  const [nativeUploadStage, setNativeUploadStage] = useState<"idle" | "uploading" | "processing" | "submitting">("idle");
  const [nativeUploadPercent, setNativeUploadPercent] = useState(0);
  const [uploadQueue, setUploadQueue] = useState<Record<number, Array<{
    key: string; file?: File; status: "queued" | "uploading" | "staging" | "ready" | "failed";
    percent: number; error?: string; media?: any; attemptId: string; slotIndex?: number;
  }>>>({});
  const [feedbackInitialText, setFeedbackInitialText] = useState("");
  const [uploadAbort, setUploadAbort] = useState<(() => void) | null>(null);
  const activeUploadAttempt = useRef<string | null>(null);
  const mediaSelection = useRef(0);
  useEffect(() => () => { mediaSelection.current++; }, []);
  const directAccessReady = useRef(false);
  const [queueUploading, setQueueUploading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showSubmitReview, setShowSubmitReview] = useState(false);
  const [submissionCommitted, setSubmissionCommitted] = useState(false);
  const [commitAnimationRunning, setCommitAnimationRunning] = useState(false);
  const [commitAnimationDone, setCommitAnimationDone] = useState(false);
  const [commitFading, setCommitFading] = useState(false);
  const [revealedAccessKey, setRevealedAccessKey] = useState<string | null>(null);
  const [revealedDeadline, setRevealedDeadline] = useState<string | null>(null);
  const [claimedFullKey, setClaimedFullKey] = useState<string | null>(null);
  const [, setClock] = useState(0);
  const restoredPendingForKey = useRef<string | null>(null);
  const pendingAssociationStorageKey = user?.id != null
    ? `gamefolio:campaign-pending-media:${encodeURIComponent(String(user.id))}:${encodeURIComponent(String(cp.instance_id))}`
    : null;

  useEffect(() => {
    const timer = window.setInterval(() => setClock(value => value + 1), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!submissionCommitted) return;
    setCommitAnimationDone(false);
    setCommitAnimationRunning(false);
    setCommitFading(false);
    const start = window.setTimeout(() => setCommitAnimationRunning(true), 40);
    const reveal = window.setTimeout(() => setCommitAnimationDone(true), 1200);
    const fade = window.setTimeout(() => setCommitFading(true), 1650);
    const finish = window.setTimeout(() => setSubmissionCommitted(false), 2050);
    return () => { window.clearTimeout(start); window.clearTimeout(reveal); window.clearTimeout(fade); window.clearTimeout(finish); };
  }, [submissionCommitted]);

  useEffect(() => {
    return () => {
      if (nativePreview) URL.revokeObjectURL(nativePreview);
    };
  }, [nativePreview]);

  const loadCampaignProgress = async () => {
    const response = await authedFetch(`/api/bounties/my/${cp.instance_id}`, { method: "GET" });
    if (response.status === 401) return null;
    if (!response.ok) throw new Error("Could not load campaign progress");
    return response.json();
  };
  const { data: progress, isLoading, isError: progressError, refetch: refetchProgress } = useQuery<any>({
    queryKey: ["/api/bounties/my", cp.instance_id],
    queryFn: loadCampaignProgress,
    enabled: !directSubmission || Boolean(cp.participant_status || cp.is_joined),
  });
  const { data: feedbackDrafts, isLoading: feedbackDraftsLoading, isError: feedbackDraftsError, refetch: refetchFeedbackDrafts } = useQuery<any[]>({
    queryKey: ["/api/bounties/my", cp.instance_id, "feedback-drafts"],
    queryFn: async () => {
      const response = await authedFetch(`/api/bounties/my/${cp.instance_id}/feedback-drafts`, { method: "GET" });
      if (!response.ok) throw new Error("Could not load feedback drafts");
      return response.json();
    },
    enabled: Boolean(progress),
  });

  const data = progress ?? cp;
  const regularBounty = isRegularBounty(data);
  const progressBounties = configuredObjectives(progress?.bounties ?? (directSubmission ? cp.bounties : undefined));
  const submittingBounty = progressBounties.find((b: any) => b.id === submitting);
  const awaitingFirstSubmission = directSubmission && !cp.participant_status && !cp.is_joined && !progress;
  const canUpload = !directSubmission || awaitingFirstSubmission || Boolean(progress && !progressError);

  const prepareSubmissionAccess = async () => {
    if (!directSubmission || directAccessReady.current || progress?.access_revealed_at || progress?.access_key_revealed) return;
    const instanceId = cp.instance_id;
    let participation = progress;
    if (!participation) {
      const response = await authedFetch(`/api/bounties/${instanceId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startOnSubmission: true }),
      });
      const result = await response.json();
      if (response.ok && result.status === "access_accepted") {
        directAccessReady.current = true;
        return;
      }
      if (result.code === "BOUNTY_UNAVAILABLE") {
        void qc.invalidateQueries({ queryKey: ["/api/bounties"] });
      }
      if (response.status !== 409 || !String(result.error).includes("already joined")) {
        throw new Error(result.error || "Could not start this submission.");
      }
      participation = await loadCampaignProgress();
    }
    if (!participation || participation.access_key_reserved ||
        !["joined", "enrolled", "accepted", "active", "access_accepted", "in_progress", "changes_requested"].includes(participation.participant_status)) {
      throw new Error("This bounty is no longer available for submission. Refresh to check its status.");
    }
    if (!participation.access_revealed_at && !participation.access_key_revealed) {
      await apiRequest("POST", `/api/bounties/${instanceId}/reveal-access-key`, {});
    }
    directAccessReady.current = true;
  };
  const readPendingAssociations = () => {
    if (!pendingAssociationStorageKey) return [];
    try {
      const records = JSON.parse(window.localStorage.getItem(pendingAssociationStorageKey) ?? "[]");
      return Array.isArray(records) ? records.filter((record: any) =>
        Number.isInteger(Number(record?.bountyId))
        && Number.isInteger(Number(record?.slotIndex))
        && Number.isInteger(Number(record?.mediaId))
        && typeof record?.attemptId === "string"
        && ["clip", "reel", "screenshot"].includes(record?.contentType)
      ) : [];
    } catch { return []; }
  };
  const persistPendingAssociation = (association: { bountyId: number; slotIndex: number; mediaId: number; contentType: string; attemptId: string }) => {
    if (!pendingAssociationStorageKey) {
      toast({ title: "Recovery cannot be saved", description: "Your media is uploaded and can be retried in this tab, but this account could not be identified for refresh recovery.", variant: "destructive" });
      return;
    }
    try {
      const records = readPendingAssociations().filter((record: any) =>
        !(Number(record.bountyId) === association.bountyId && Number(record.slotIndex) === association.slotIndex)
      );
      records.push(association);
      window.localStorage.setItem(pendingAssociationStorageKey, JSON.stringify(records));
    } catch {
      toast({ title: "Recovery could not be saved", description: "Your media is uploaded and can be retried in this tab, but browser storage is unavailable for refresh recovery.", variant: "destructive" });
    }
  };
  const clearPendingAssociation = (mediaId: number) => {
    if (!pendingAssociationStorageKey) return;
    try {
      const records = readPendingAssociations().filter((record: any) => Number(record.mediaId) !== mediaId);
      if (records.length) window.localStorage.setItem(pendingAssociationStorageKey, JSON.stringify(records));
      else window.localStorage.removeItem(pendingAssociationStorageKey);
    } catch { /* Storage may be unavailable. */ }
  };
  useEffect(() => {
    if (!pendingAssociationStorageKey || !progress || restoredPendingForKey.current === pendingAssociationStorageKey) return;
    if (restoredPendingForKey.current && restoredPendingForKey.current !== pendingAssociationStorageKey) setUploadQueue({});
    restoredPendingForKey.current = pendingAssociationStorageKey;
    const knownObjectives = new Set(progressBounties.map((bounty: any) => Number(bounty.id)));
    const restored = readPendingAssociations().filter((record: any) => {
      if (!knownObjectives.has(Number(record.bountyId))) return false;
      const attached = progressBounties.some((bounty: any) =>
        Number(bounty.id) === Number(record.bountyId)
        && (bounty.submissions ?? []).some((submission: any) =>
          Number(submission.media_id ?? submission.clip_id ?? submission.reel_id ?? submission.screenshot_id) === Number(record.mediaId)
          && mediaReadyStatuses.includes(String(submission.status).toLowerCase())
        )
      );
      if (attached) clearPendingAssociation(Number(record.mediaId));
      return !attached;
    });
    if (!restored.length) return;
    setUploadQueue(previous => ({
      ...previous,
      ...restored.reduce((next: any, record: any) => {
        const bountyId = Number(record.bountyId);
        const key = `recovered:${bountyId}:${Number(record.slotIndex)}:${Number(record.mediaId)}`;
        next[bountyId] = [
          ...(next[bountyId] ?? []).filter((entry: any) => Number(entry.media?.id) !== Number(record.mediaId)),
          {
            key,
            status: "failed",
            percent: 100,
            error: "Media uploaded successfully but was not attached. Retry staging to finish this objective.",
            media: { id: Number(record.mediaId) },
            attemptId: record.attemptId,
            slotIndex: Number(record.slotIndex),
          },
        ];
        return next;
      }, {}),
    }));
  }, [pendingAssociationStorageKey, Boolean(progress)]);
  useEffect(() => {
    if (submittingBounty?.content_type !== "feedback" || submittingSlotIndex == null || awaitingFirstSubmission) return;
    if (submitUrl === feedbackInitialText) {
      setDraftStatus(null);
      return;
    }
    setDraftStatus("saving");
    const timer = window.setTimeout(async () => {
      try {
        await apiRequest("POST", `/api/bounties/my/${cp.instance_id}/feedback-drafts/${submittingBounty.id}`, {
          slotIndex: submittingSlotIndex, content: submitUrl,
        });
        setDraftStatus("saved");
      } catch {
        setDraftStatus("error");
      }
    }, 750);
    return () => window.clearTimeout(timer);
  }, [submitUrl, feedbackInitialText, submittingBounty?.id, submittingBounty?.content_type, submittingSlotIndex, cp.instance_id, awaitingFirstSubmission]);
  const usesExistingContent = ["clip", "reel", "screenshot"].includes(submittingBounty?.content_type);
  const singleScreenMedia = regularBounty && (directSubmission || submittingBounty?.content_type === "clip") && Boolean(nativeFile);
  const hasRegularMediaFile = regularBounty && Boolean(nativeFile);
  const showMediaDetails = hasRegularMediaFile && (singleScreenMedia || nativeStep === "details");
  const needsPreviewStep = hasRegularMediaFile && !showMediaDetails;
  const { data: pickerData, isLoading: pickerLoading } = useQuery<any>({
    queryKey: ["/api/bounties/my/content-picker", submittingBounty?.content_type, data?.game_id],
    queryFn: async () => {
      const gameQuery = data?.game_id ? `&gameId=${encodeURIComponent(String(data.game_id))}` : "";
      const res = await authedFetch(`/api/bounties/my/content-picker?contentType=${encodeURIComponent(submittingBounty.content_type)}${gameQuery}`, { method: "GET" });
      if (!res.ok) throw new Error("Could not load your Gamefolio content");
      return res.json();
    },
    enabled: Boolean(submittingBounty && usesExistingContent && data?.game_id),
    staleTime: 30_000,
  });
  const pickerMediaUrls = (pickerData?.items ?? []).flatMap((item: any) => [item.mediaUrl, item.thumbnailUrl]
    .filter((url: unknown): url is string => typeof url === "string" && url.length > 0));
  const { getSignedUrl: getPickerSignedUrl } = useSignedUrls(pickerMediaUrls);
  const selectedExistingMedia = pickerData?.items?.find((item: any) => Number(item.id) === selectedContentId);
  const { signedUrl: uploadedMediaUrl } = useSignedUrl(uploadedMedia?.mediaUrl ?? null);
  const { signedUrl: uploadedThumbnailUrl } = useSignedUrl(uploadedMedia?.thumbnailUrl ?? null);
  const selectedExistingMediaUrl = selectedExistingMedia?.mediaUrl ? getPickerSignedUrl(selectedExistingMedia.mediaUrl) : null;
  const selectedExistingThumbnailUrl = selectedExistingMedia?.thumbnailUrl ? getPickerSignedUrl(selectedExistingMedia.thumbnailUrl) : null;
  const { data: uploadAccess, isLoading: uploadLimitsLoading, isError: uploadLimitsError, refetch: refetchUploadLimits } = useQuery({
    queryKey: ["/api/upload/limits", "bounty", user?.id, user?.emailVerified, user?.userType],
    queryFn: async (): Promise<{ limits: UploadLimits } | { blocked: "verify-email" | "onboarding" }> => {
      const response = await authedFetch("/api/upload/limits", { method: "GET" });
      if (response.ok) return { limits: await response.json() };
      if (response.status === 403) {
        const { code } = await response.json().catch(() => ({}));
        if (code === "EMAIL_NOT_VERIFIED") return { blocked: "verify-email" };
        if (code === "ONBOARDING_REQUIRED") return { blocked: "onboarding" };
      }
      throw new Error("Could not load upload limits.");
    },
    staleTime: 5 * 60_000,
  });
  const uploadLimits = uploadAccess && "limits" in uploadAccess ? uploadAccess.limits : undefined;
  const uploadBlock = uploadAccess && "blocked" in uploadAccess ? uploadAccess.blocked : undefined;
  const uploadBlockMessage = uploadBlock === "verify-email" ? "Verify your email before uploading."
    : uploadBlock === "onboarding" ? "Finish setting up your profile before uploading." : null;
  const uploadBlockLink = uploadBlock === "verify-email"
    ? `/verify-code?from=${encodeURIComponent(window.location.pathname + window.location.search)}`
    : "/onboarding";
  const uploadLimitNotice = (maxMb: number | null) => {
    if (uploadBlockMessage) return <p role="status" className="text-sm text-white/80">
      {uploadBlockMessage} <a href={uploadBlockLink} className="font-semibold text-[#B9FF1A] underline">
        {uploadBlock === "verify-email" ? "Verify email" : "Finish setup"}
      </a>
    </p>;
    if (uploadLimitsLoading) return <p role="status" className="text-sm text-white/70">Checking upload limits…</p>;
    if (uploadLimitsError || maxMb == null) return <p role="status" className="text-sm text-white/80">
      Upload limits couldn’t be loaded. <button type="button" onClick={() => void refetchUploadLimits()} className="font-semibold text-[#B9FF1A] underline">Retry</button>
    </p>;
    return null;
  };

  const claimFullMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/bounties/my/${cp.instance_id}/claim-full-key`, {}),
    onSuccess: async (res) => {
      const data = await res.json();
      if (typeof data.fullKey === "string" && data.fullKey.length > 0) {
        // Keep completion keys ephemeral to this mounted mission view. Do not
        // put the returned plaintext in React Query, storage, URLs, or logs.
        setClaimedFullKey(data.fullKey);
      }
      qc.invalidateQueries({ queryKey: ["/api/bounties/my/campaigns"] });
      qc.invalidateQueries({ queryKey: ["/api/bounties/my", cp.instance_id] });
      qc.invalidateQueries({ queryKey: ["/api/bounties/my", cp.instance_id, "feedback-drafts"] });
      // The key is returned only by the explicit claim action. Keep it out of
      // logs/toasts; the server-backed campaign query remains key-free.
      toast({ title: "Full-game key claimed", description: "Your key is ready in the reward panel." });
    },
    onError: async (err: any) => {
      toast({ title: "Could not claim key", description: err?.message ?? "Error", variant: "destructive" });
    },
  });

  const revealAccessMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/bounties/${cp.instance_id}/reveal-access-key`, {}),
    onSuccess: async (res) => {
      const payload = await res.json();
      // Keep the returned access key ephemeral in component state only. Never
      // put it in query cache, campaign props, URLs, telemetry, or toasts.
      setRevealedAccessKey(typeof payload.key === "string" && payload.key.length > 0 ? payload.key : null);
      if (typeof payload.deadline === "string" && payload.deadline.length > 0) {
        setRevealedDeadline(payload.deadline);
      }
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["/api/bounties/my", cp.instance_id] }),
        qc.invalidateQueries({ queryKey: ["/api/bounties/my/campaigns"] }),
      ]);
      toast({
        title: payload.key ? "Access key revealed" : "Access accepted",
        description: regularBounty ? (payload.key ? "Your game key is ready." : "You can now submit your content.") : payload.key
          ? "Your access key is ready and your submission deadline has started."
          : "Access confirmed. Your submission deadline has started.",
      });
    },
    onError: async (err: any) => {
      toast({ title: "Could not reveal access", description: err?.message ?? "Please try again.", variant: "destructive" });
    },
  });

  const submitMutation = useMutation({
    mutationFn: async ({ bountyId, body }: { bountyId: number; body: Record<string, unknown> }) => {
      await prepareSubmissionAccess();
      return apiRequest("POST", `/api/bounties/my/${cp.instance_id}/stage/${bountyId}`, body);
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["/api/bounties/my", cp.instance_id] }),
        qc.invalidateQueries({ queryKey: ["/api/bounties/my/campaigns"] }),
      ]);
      setSubmitting(null);
      setSubmittingSlotIndex(null);
      setSubmitUrl("");
      setReviewRatingDraft(undefined);
      onPreparedRating?.(undefined);
      onPreparedText?.("");
      setDraftStatus(null);
      setSelectedContentId(null);
      setUploadedMedia(null);
      setNativeFile(null);
      setNativePreview(null);
      setNativeUploadAttemptId(null);
      setNativeTitle("");
      setNativeDescription("");
      setNativeUploadError(null);
      setNativeUploadStage("idle");
      if (usesExistingContent) onPreparedMedia?.(null);
      toast(regularBounty ? { title: "Content submitted", description: "Sent to the developer for review." } : { title: "Content ready", description: "Saved to this campaign. Submit everything together when all steps are ready." });
    },
    onError: async (err: any) => {
      toast({ title: "Could not save content", description: err?.message ?? "Error", variant: "destructive" });
    },
  });

  const nativeSubmitMutation = useMutation({
    mutationFn: async ({ bountyId, slotIndex, file, title, description, uploadAttemptId }: { bountyId: number; slotIndex: number; file: File; title?: string; description?: string; uploadAttemptId: string | null }) => {
      const bounty = progressBounties.find((item: any) => item.id === bountyId);
      if (!bounty) throw new Error("Objective not found");
      if (uploadLimitsLoading || uploadLimitsError || !uploadLimits) throw new Error(uploadBlockMessage ?? "Upload limits are unavailable. Wait for limits to load or retry before uploading.");
      const rawMaxMb = bounty.content_type === "screenshot" ? uploadLimits.maxScreenshotSizeMB : bounty.content_type === "reel" ? uploadLimits.maxReelSizeMB : uploadLimits.maxClipSizeMB;
      const maxMb = Number(rawMaxMb);
      if (!Number.isFinite(maxMb) || maxMb <= 0) throw new Error("The upload size limit is unavailable for this content type.");
      if (file.size > maxMb * 1024 * 1024) throw new Error(`This file is larger than the ${maxMb}MB campaign upload limit.`);
      setNativeUploadError(null);
      setNativeUploadStage("uploading");
      setNativeUploadPercent(0);
      const submissionTitle = title?.trim() || bounty.title || "Campaign upload";
      const submissionDescription = description?.trim() || (regularBounty ? "" : data?.description || "");
      const controller = new AbortController();
      setUploadAbort(() => () => controller.abort());
      const uploadWithProgress = async (url: string, form: FormData): Promise<any> => {
        // Capacitor rewrites and authenticates fetch requests, but not raw XHR.
        // On the web XHR keeps the actual upload percentage visible.
        if (isNative) {
          const response = await authedFetch(url, { method: "POST", body: form, signal: controller.signal });
          if (!response.ok) {
            const payload = await response.json().catch(() => ({}));
            throw new Error(payload?.message ?? payload?.error ?? "Upload failed");
          }
          setNativeUploadPercent(100);
          return response.json();
        }
        return new Promise<any>((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open("POST", url);
        request.withCredentials = true;
        const abortRequest = () => request.abort();
        if (controller.signal.aborted) return reject(new Error("Upload cancelled"));
        controller.signal.addEventListener("abort", abortRequest, { once: true });
        const cleanUp = () => controller.signal.removeEventListener("abort", abortRequest);
        request.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.min(100, Math.round(event.loaded / event.total * 100));
            setNativeUploadPercent(percent);
            setUploadQueue(previous => ({
              ...previous,
              [bountyId]: (previous[bountyId] ?? []).map(item => item.status === "uploading" ? { ...item, percent } : item),
            }));
          }
        };
        request.onload = () => {
          cleanUp();
          let payload: any = {};
          try { payload = JSON.parse(request.responseText); } catch { /* explicit error below for invalid replies */ }
          if (request.status >= 200 && request.status < 300) resolve(payload);
          else reject(new Error(payload?.message ?? payload?.error ?? "Upload failed"));
        };
        request.onerror = () => { cleanUp(); reject(new Error("Connection lost while uploading")); };
        request.onabort = () => { cleanUp(); reject(new Error("Upload cancelled")); };
        request.send(form);
        });
      };

      if (bounty.content_type === "screenshot") {
        const form = new FormData();
        form.append("title", submissionTitle);
        if (regularBounty && submissionDescription) form.append("description", submissionDescription);
        form.append("campaignInstanceId", String(cp.instance_id));
        form.append("campaignObjectiveId", String(bountyId));
        form.append("screenshot", file);
        const uploaded = await uploadWithProgress("/api/screenshots/upload", form);
        if (!uploaded.screenshot?.id) throw new Error("Screenshot was uploaded but could not be saved");
        return {
          bountyId, slotIndex, id: Number(uploaded.screenshot.id), type: "screenshot" as const,
          title: uploaded.screenshot.title || submissionTitle,
          mediaUrl: uploaded.screenshot.imageUrl ?? null,
          thumbnailUrl: uploaded.screenshot.thumbnailUrl ?? null,
        };
      }

      const uploadForm = new FormData();
      uploadForm.append("file", file);
      uploadForm.append("uploadType", bounty.content_type === "reel" ? "reel" : "clip");
      if (regularBounty) {
        uploadForm.append("campaignInstanceId", String(cp.instance_id));
        uploadForm.append("campaignObjectiveId", String(bountyId));
      }
      const uploaded = await uploadWithProgress("/api/upload/video-direct", uploadForm);

      if (controller.signal.aborted) throw new Error("Upload cancelled");
      setNativeUploadStage("processing");
      const processed = await authedFetch("/api/upload/process-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
        uploadResult: uploaded.result,
        title: submissionTitle,
        description: submissionDescription,
        campaignInstanceId: cp.instance_id,
        campaignObjectiveId: bountyId,
        videoType: bounty.content_type === "reel" ? "reel" : "clip",
        ...(uploadAttemptId ? { uploadAttemptId } : {}),
        }),
      });
      if (!processed.ok) {
        const payload = await processed.json().catch(() => ({}));
        throw new Error(payload?.message ?? payload?.error ?? "Could not process video");
      }
      const processedData = await processed.json();
      const mediaId = processedData.clip?.id;
      if (!mediaId) throw new Error("Video was uploaded but could not be published");
      return {
        bountyId, slotIndex, id: Number(mediaId), type: bounty.content_type as "clip" | "reel",
        title: processedData.clip.title || submissionTitle,
        mediaUrl: processedData.clip.videoUrl ?? null,
        thumbnailUrl: processedData.clip.thumbnailUrl ?? null,
      };
    },
    onSuccess: (media, variables) => {
      setUploadAbort(null);
      if (variables.uploadAttemptId && activeUploadAttempt.current !== variables.uploadAttemptId) return;
      setUploadedMedia(media);
      setNativeUploadError(null);
      setNativeUploadStage("idle");
      setNativeUploadPercent(100);
    },
    onError: (err: any, variables) => {
      setUploadAbort(null);
      if (variables.uploadAttemptId && activeUploadAttempt.current !== variables.uploadAttemptId) return;
      setNativeUploadStage("idle");
      setNativeUploadPercent(0);
      setNativeUploadError(err?.message ?? "Could not submit this upload");
    },
  });

  const removeStagedMutation = useMutation({
    mutationFn: (submissionId: number) =>
      apiRequest("DELETE", `/api/bounties/my/${cp.instance_id}/stage/${submissionId}`),
    onSuccess: async (_result, submissionId) => {
      const cached: any = qc.getQueryData(["/api/bounties/my", cp.instance_id]);
      const removedObjective = (cached?.bounties ?? []).find((objective: any) =>
        (objective.submissions ?? []).some((submission: any) => Number(submission.id) === Number(submissionId))
      );
      const removedSubmission = removedObjective?.submissions?.find((submission: any) => Number(submission.id) === Number(submissionId));
      const removedMediaId = Number(removedSubmission?.media_id ?? removedSubmission?.clip_id ?? removedSubmission?.reel_id ?? removedSubmission?.screenshot_id);
      const removedSlotIndex = removedSubmission ? Number(removedSubmission.slot_index ?? 0) : null;
      const removedBountyId = Number(removedObjective?.id);
      if (Number.isFinite(removedMediaId) && removedMediaId > 0) clearPendingAssociation(removedMediaId);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["/api/bounties/my", cp.instance_id] }),
        qc.invalidateQueries({ queryKey: ["/api/bounties/my/campaigns"] }),
      ]);
      if ((Number.isFinite(removedMediaId) && removedMediaId > 0) || (removedBountyId > 0 && removedSlotIndex != null)) {
        setUploadQueue(previous => ({
          ...previous,
          ...Object.fromEntries(Object.entries(previous).map(([objectiveId, items]) => [
            objectiveId,
            items.filter(item => !(item.status === "ready" && (
              Number(item.media?.id) === removedMediaId
              || (Number(objectiveId) === removedBountyId && removedSlotIndex != null && item.slotIndex === removedSlotIndex)
            ))),
          ])),
        }));
      }
    },
    onError: (err: any) => toast({ title: "Could not remove content", description: err?.message, variant: "destructive" }),
  });

  const submitPackageMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/bounties/my/${cp.instance_id}/submit-package`, {}),
    onSuccess: async () => {
      setShowSubmitReview(false);
      setSubmissionCommitted(true);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["/api/bounties/my", cp.instance_id] }),
        qc.invalidateQueries({ queryKey: ["/api/bounties/my/campaigns"] }),
      ]);
    },
    onError: (err: any) => toast({ title: "Could not submit campaign", description: err?.message, variant: "destructive" }),
  });

  const selectNativeFile = (file: File | null) => {
    if (file) {
      const activeType = submittingBounty?.content_type;
      const isScreenshot = activeType === "screenshot";
      const allowed = isScreenshot
        ? ["image/jpeg", "image/png", "image/jpg", "image/webp"]
        : ["video/mp4", "video/webm", "video/quicktime"];
      if (file.type && !allowed.includes(file.type)) {
        setNativeUploadError(isScreenshot ? "Please choose a JPG, PNG, or WebP image." : "Please choose an MP4, WebM, or MOV video.");
        return;
      }
      if (uploadLimitsLoading) {
        setNativeUploadError("Upload limits are still loading. Please wait before uploading.");
        return;
      }
      if (uploadLimitsError || !uploadLimits) {
        setNativeUploadError("Upload limits are unavailable. Retry loading limits before uploading.");
        return;
      }
      const rawMaxMb = isScreenshot ? uploadLimits.maxScreenshotSizeMB : activeType === "reel" ? uploadLimits.maxReelSizeMB : uploadLimits.maxClipSizeMB;
      const maxMb = Number(rawMaxMb);
      if (!Number.isFinite(maxMb) || maxMb <= 0) {
        setNativeUploadError("The upload size limit is unavailable for this content type.");
        return;
      }
      if (file.size > maxMb * 1024 * 1024) {
        setNativeUploadError(`This file is larger than the ${maxMb}MB campaign upload limit.`);
        return;
      }
    }
    setNativeUploadError(null);
    setNativeFile(file);
    setNativePreview(file ? URL.createObjectURL(file) : null);
    setSelectedContentId(null);
    if (file) {
      setUploadedMedia(null);
      setNativeUploadAttemptId(crypto.randomUUID());
    }
  };

  const openSubmissionForm = (bountyId: number, slotIndex: number) => {
    setNativeStep("preview");
    if (nativeSubmitMutation.isPending || submitMutation.isPending) return;
    const bounty = progressBounties.find((item: any) => item.id === bountyId);
    if (bounty?.content_type === "feedback" && !feedbackDrafts) return;
    mediaSelection.current++;
    const savedSubmission = latestCampaignSubmissionForSlot(bounty?.submissions ?? [], slotIndex);
    let savedText = "";
    try {
      const content = typeof savedSubmission?.content_data === "string" ? JSON.parse(savedSubmission.content_data) : savedSubmission?.content_data;
      savedText = typeof content?.text === "string" ? content.text : "";
    } catch {
      savedText = typeof savedSubmission?.content_data === "string" ? savedSubmission.content_data : "";
    }
    const feedbackDraftText = feedbackDrafts?.find(draft => Number(draft.bounty_id) === bountyId && Number(draft.slot_index) === slotIndex)?.content;
    setFeedbackInitialText(feedbackDraftText ?? savedText);
    setSubmitting(bountyId);
    setSubmittingSlotIndex(slotIndex);
    setReviewRatingDraft(undefined);
    setSelectedContentId(null);
    setSubmitUrl((bounty?.content_type === "feedback"
      ? feedbackDraftText ?? ""
      : "") || savedText);
    setDraftStatus(null);
    setNativeFile(null);
    setNativePreview(null);
    setUploadedMedia(null);
    setNativeUploadAttemptId(null);
    setNativeTitle("");
    setNativeDescription("");
    setNativeUploadError(null);
    setNativeUploadStage("idle");
  };

  const closeSubmissionForm = () => {
    if (submitMutation.isPending || nativeUploadStage === "submitting") return;
    if (nativeSubmitMutation.isPending) {
      if (!window.confirm("Upload in progress. Closing will cancel this upload. Cancel upload?")) return;
      uploadAbort?.();
    }
    const type = submittingBounty?.content_type;
    if (type && !["clip", "reel", "screenshot"].includes(type) &&
        submitUrl.trim() && submitUrl !== feedbackInitialText &&
        (type !== "feedback" || draftStatus !== "saved") &&
        !window.confirm("Your latest text may not have been saved yet. Close anyway?")) return;
    mediaSelection.current++;
    activeUploadAttempt.current = null;
    setUploadAbort(null);
    setUploadedMedia(null);
    setSelectedContentId(null);
    setNativeFile(null);
    setNativePreview(null);
    setNativeUploadError(null);
    setNativeUploadStage("idle");
    setSubmitting(null);
    setSubmittingSlotIndex(null);
  };

  useEffect(() => {
    if (submitting == null || submittingSlotIndex == null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeSubmissionForm();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [submitting, submittingSlotIndex, nativeSubmitMutation.isPending, submitMutation.isPending,
    nativeUploadStage, uploadAbort, submitUrl, feedbackInitialText, draftStatus]);

  const copyKey = (key: string, setter: (v: boolean) => void) => {
    navigator.clipboard.writeText(key).then(() => {
      setter(true);
      setTimeout(() => setter(false), 2000);
    });
  };

  const displayData = regularBounty ? { ...data, deadline: null }
    : revealedDeadline ? { ...data, deadline: revealedDeadline } : data;
  const bounties = progressBounties;
  const mandatory = bounties;
  const requiredUnits = Number(progress?.required_objective_units ?? mandatory.reduce((sum: number, b: any) => sum + Number(b.quantity ?? 1), 0));
  const approvedUnits = Number(progress?.approved_objective_units ?? mandatory.reduce((sum: number, b: any) => sum + Math.min(Number(b.quantity ?? 1), Number(b.approved_count ?? 0)), 0));
  const submittedUnits = Number(progress?.submitted_objective_units ?? mandatory.reduce((sum: number, b: any) => sum + Math.min(Number(b.quantity ?? 1), Number(b.submitted_count ?? 0)), 0));
  const progressUnits = Math.max(approvedUnits, submittedUnits);
  const approvedCount = mandatory.filter((b: any) => Number(b.approved_count ?? 0) >= Number(b.quantity ?? 1)).length;
  const pct = requiredUnits > 0 ? Math.min(100, Math.round((progressUnits / requiredUnits) * 100)) : 0;
  const nextObjectiveTitle = data.next_objective?.title ?? data.next_objective_title ?? mandatory.find((b: any) => Number(b.approved_count ?? 0) < Number(b.quantity ?? 1))?.title ?? mandatory.find((b: any) => Number(b.approved_count ?? 0) < Number(b.quantity ?? 1))?.description;
  const applicationStatus = String(data.application_status ?? data.applicationStatus ?? data.participant_status ?? "").toLowerCase();
  const applicationPending = ["pending", "pending_application", "application_pending", "awaiting_approval"].includes(applicationStatus);
  const applicationApproved = ["approved", "application_approved"].includes(applicationStatus);
  const statusCfg = applicationPending
    ? STATUS_CONFIG.pending_application
    : applicationApproved && !data.journey_status
    ? STATUS_CONFIG.application_approved
    : STATUS_CONFIG[data.journey_status ?? data.participant_status] ?? STATUS_CONFIG.enrolled;
  const accessReserved = Boolean(data.access_key_reserved ?? data.accessKeyAvailable);
  const accessRevealed = Boolean(data.access_revealed_at || data.access_key_revealed || revealedAccessKey);
  const accessNeedsReveal = !directSubmission && !applicationPending && !accessRevealed
    && (accessReserved || applicationApproved || data.participant_status === "joined" || data.participant_status === "enrolled");
  const canShowReservedKey = accessReserved && !revealedAccessKey;
  const allApproved = requiredUnits > 0 && approvedUnits >= requiredUnits;
  const fullGameKeyClaimed = Boolean(
    data.completion_key_available || data.full_key_id || data.full_key_value,
  );
  const canClaimFull = allApproved && !fullGameKeyClaimed;
  const deadlineLabel = campaignDeadlineLabel(displayData);
  const deadlineUrgency = campaignDeadlineUrgency(displayData);
  const showAccessAction = deadlineUrgency !== "expired" && data.journey_status !== "rejected" && (accessNeedsReveal || (canShowReservedKey && accessRevealed));
  const contentRequirements = regularBounty ? bounties.map((b:any)=>`${Number(b.staged_count??0)+Number(b.submitted_count??0)} ${CONTENT_TYPE_LABEL[b.content_type]??b.content_type}`) : bountyRequirements(bounties);
  const submissionSummary = committedSubmissionSummary(progressBounties);
  const submittedAtLabel = submissionSummary.submittedAt
    ? new Date(submissionSummary.submittedAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
    : null;
  const gameArtwork = campaignGameArtwork(data);
  const gameHref = data.game_id && data.catalog_game_name
    ? publicGamePath(data.catalog_game_name)
    : null;

  const renderSubmissionForm = (b: any, slotIndex: number) => {
    const Icon = CONTENT_TYPE_ICON[b.content_type] ?? Target;
    const isMedia = ["clip", "reel", "screenshot"].includes(b.content_type);
    const isVideo = ["clip", "reel"].includes(b.content_type);
    const latest = latestCampaignSubmissionForSlot(b.submissions ?? [], slotIndex);
    const replacement = ["staged", "changes_requested", "rejected"].includes(String(latest?.status ?? "").toLowerCase()) ? latest : null;
    const isReview = b.content_type === "review";
    const rating = isReview ? ratingFor(b.id, slotIndex, latest?.content_data) : undefined;
    const isNativeBusy = nativeSubmitMutation.isPending;
    if (b.content_type === "stream") {
      return (
        <StreamSpotlightSubmissionForm
          campaign={data}
          objective={b}
          user={user}
          previousSubmission={replacement??(embedded&&preparedText?{content_data:{streamUrl:preparedText}}:undefined)}
          busy={!canUpload || submitMutation.isPending||(embedded&&accessNeedsReveal)}
          onSave={(streamDraft) => {
            const body: Record<string, unknown> = {
              contentType: "stream",
              contentUrl: streamDraft.streamUrl,
              contentData: streamDraft,
              slotIndex,
            };
            if (replacement) body.supersedesSubmissionId = replacement.id;
            submitMutation.mutate({ bountyId: b.id, body });
          }}
          onCancel={embedded ? undefined : () => {
            setSubmitting(null);
            setSubmittingSlotIndex(null);
          }}
        />
      );
    }
    const campaignArtwork = data.game_artwork_url || data.hero_artwork_url || data.catalog_game_artwork_url || data.campaign_artwork_url;
    const campaignName = data.campaign_title || data.template_name || cp.template_name || "Campaign";
    const gameName = data.game_name || "Campaign game";
    const lockedGameId = data.game_id;
    const uploadedForSlot = uploadedMedia && uploadedMedia.bountyId === b.id && uploadedMedia.slotIndex === slotIndex
      ? uploadedMedia : null;
    const existingPicker = (
      <div className="space-y-3 border-t border-white/[0.08] pt-4">
        <div className="text-[10px] font-black uppercase tracking-wider text-white/35">
          Choose existing Gamefolio content
        </div>
        {!isVideo && nativeFile && nativePreview ? (
          <div className="overflow-hidden rounded-xl border border-white/10 bg-black/30">
            {b.content_type === "screenshot"
              ? <img src={nativePreview} alt={nativeFile.name} className="max-h-56 w-full object-contain" />
              : <video src={nativePreview} controls className="max-h-56 w-full" />}
            <div className="flex items-center justify-between gap-3 border-t border-white/[0.08] px-3 py-2">
              <span className="truncate text-xs text-white/65">{nativeFile.name}</span>
              <button type="button" onClick={() => selectNativeFile(null)} className="text-xs text-white/40 hover:text-white">Remove</button>
            </div>
          </div>
        ) : pickerLoading ? (
          <div className="flex items-center justify-center py-5"><Loader2 size={16} className="animate-spin text-white/35" /></div>
        ) : (pickerData?.items ?? []).length > 0 ? (
          <div className="grid max-h-52 grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4">
            {(pickerData?.items ?? []).map((item: any) => {
              const selected = selectedContentId === item.id;
              return (
                <button type="button" key={item.id} onClick={() => { selectNativeFile(null); setSelectedContentId(selected ? null : item.id); }} className={`relative overflow-hidden rounded-lg text-left ${b.content_type === "reel" ? "aspect-[9/16]" : "aspect-video"}`} style={{ border: selected ? `2px solid ${NEON}` : "1px solid rgba(255,255,255,0.10)" }}>
                  {item.thumbnailUrl && getPickerSignedUrl(item.thumbnailUrl) ? <img src={getPickerSignedUrl(item.thumbnailUrl) ?? undefined} alt={item.title ?? "Gamefolio content"} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center bg-white/5"><Icon size={16} className="text-white/35" /></div>}
                  {selected && <div className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full" style={{ background: NEON }}><Check size={11} color="#070b10" strokeWidth={3} /></div>}
                </button>
              );
            })}
          </div>
        ) : <div className="py-3 text-xs text-white/45">No matching Gamefolio content yet.</div>}
      </div>
    );
    const campaignContext = (
      <div className="flex items-center gap-3 rounded-xl border border-white/[0.09] bg-white/[0.025] p-3">
        <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-black/30">
          {campaignArtwork
            ? <img src={campaignArtwork} alt="" className="h-full w-full object-cover" />
            : <div className="flex h-full items-center justify-center"><Icon size={18} className="text-white/35" /></div>}
        </div>
        <div className="min-w-0">
          <div className="text-[9px] font-black uppercase tracking-[0.18em] text-white/35">Submitting to campaign</div>
          <div className="mt-1 truncate text-sm font-black text-white">{campaignName}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-white/45">
            <span>{gameName}</span>
            <span className="text-white/20">·</span>
            <span className="truncate">{objectiveLabel(b)}</span>
          </div>
        </div>
      </div>
    );
    return (
      <div className="space-y-4 border-t border-white/[0.06] pt-5">
        {campaignContext}
        {isVideo ? (
          <>
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="campaign-video-upload" className="text-xs font-semibold text-white/85">Video File</label>
              <div className="flex items-center text-[10px] text-white/35">
                <Info size={11} className="mr-1" />
                <span>Maximum {b.content_type === "reel" ? uploadLimits?.maxReelSizeMB ?? "unavailable" : uploadLimits?.maxClipSizeMB ?? "unavailable"}MB · {Math.round(((b.content_type === "reel" ? uploadLimits?.maxReelDurationSeconds : uploadLimits?.maxClipDurationSeconds) ?? 180) / 60)} min</span>
              </div>
            </div>
            <input
              id="campaign-video-upload"
              type="file"
              className="hidden"
              disabled={uploadLimitsLoading || uploadLimitsError || !uploadLimits || !(Number(b.content_type === "reel" ? uploadLimits?.maxReelSizeMB : uploadLimits?.maxClipSizeMB) > 0)}
              accept="video/mp4,video/webm,video/quicktime"
              onChange={(event) => { selectNativeFile(event.target.files?.[0] ?? null); event.target.value = ""; }}
            />
            {uploadedForSlot ? (
              <div className="space-y-3">
                <CampaignMediaPreview type={uploadedForSlot.type} mediaUrl={uploadedForSlot.mediaUrl} thumbnailUrl={uploadedForSlot.thumbnailUrl} title={uploadedForSlot.title} />
                <p className="text-xs text-[#B9FF1A]">Upload complete. Preview the video, then confirm it below to add it to this campaign.</p>
                <label htmlFor="campaign-video-upload" className="inline-block cursor-pointer text-xs font-bold text-white/55 hover:text-white">Choose a different video</label>
              </div>
            ) : !nativeFile || !nativePreview ? (
              <div
                className={`rounded-lg border border-dashed px-4 py-5 text-center transition-colors ${nativeDragging ? "border-[#B9FF1A] bg-[#B9FF1A]/5" : "border-white/15"} cursor-pointer hover:border-[#B9FF1A]`}
                onClick={() => document.getElementById("campaign-video-upload")?.click()}
                onDragEnter={(event) => { event.preventDefault(); setNativeDragging(true); }}
                onDragOver={(event) => { event.preventDefault(); setNativeDragging(true); }}
                onDragLeave={(event) => { event.preventDefault(); setNativeDragging(false); }}
                onDrop={(event) => {
                  event.preventDefault();
                  setNativeDragging(false);
                  selectNativeFile(event.dataTransfer.files?.[0] ?? null);
                }}
              >
                <Upload className="mx-auto mb-2 h-5 w-5 text-white/45" />
                <p className="text-xs font-medium text-white/80">Drop video here or browse files</p>
                <p className="mt-1 text-[10px] text-white/35">
                  MP4, WebM, or MOV up to {b.content_type === "reel" ? uploadLimits?.maxReelSizeMB ?? "unavailable" : uploadLimits?.maxClipSizeMB ?? "unavailable"}MB · {Math.round(((b.content_type === "reel" ? uploadLimits?.maxReelDurationSeconds : uploadLimits?.maxClipDurationSeconds) ?? 180) / 60)} min
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-hidden rounded-xl border border-white/[0.10] bg-black/40">
                  <video src={nativePreview} controls className="aspect-video max-h-64 w-full bg-black object-contain" />
                  <div className="flex items-center justify-between gap-3 border-t border-white/[0.08] px-3 py-2.5">
                    <span className="min-w-0 truncate text-xs text-white/65">{nativeFile.name}</span>
                    <div className="flex shrink-0 items-center gap-3">
                      <label htmlFor="campaign-video-upload" className="cursor-pointer text-xs font-bold text-white/55 hover:text-white">Replace</label>
                      <button type="button" onClick={() => selectNativeFile(null)} className="text-xs text-white/40 hover:text-white">Remove</button>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label htmlFor="campaign-video-title" className="flex items-center gap-1 text-xs font-semibold text-white/85">
                      Clip Title <span className="text-red-400">*</span>
                    </label>
                    <input
                      id="campaign-video-title"
                      value={nativeTitle}
                      onChange={(event) => setNativeTitle(event.target.value)}
                      placeholder="Give your clip a title"
                      maxLength={100}
                      className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#B9FF1A]/60"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="campaign-video-description" className="text-xs font-semibold text-white/85">Description</label>
                    <textarea
                      id="campaign-video-description"
                      value={nativeDescription}
                      onChange={(event) => setNativeDescription(event.target.value)}
                      placeholder="What’s happening in this clip?"
                      className="min-h-24 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#B9FF1A]/60"
                    />
                    <p className="text-[10px] text-white/35">Use @username to mention other users.</p>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.025] px-3 py-2.5">
                    <Lock size={13} className="shrink-0 text-white/35" />
                    <div className="min-w-0">
                      <div className="text-[9px] font-black uppercase tracking-wider text-white/35">Game</div>
                      <div className="truncate text-xs font-bold text-white/75">{gameName}</div>
                      {!lockedGameId && <div className="text-[10px] text-white/45">No game page is linked; your upload will still be attached to this campaign.</div>}
                    </div>
                  </div>
                  <p className="text-[10px] leading-relaxed text-white/35">This video will be published to your Gamefolio profile. Preview and confirm it below to attach it for developer review.</p>
                </div>
              </div>
            )}
            {nativeUploadError && <div className="rounded-lg border border-red-400/20 bg-red-400/[0.08] px-3 py-2 text-xs text-red-200" role="alert">{nativeUploadError}</div>}
            {isNativeBusy && (
              <div className="flex items-center gap-2 text-[11px] font-bold text-white/55" role="status" aria-live="polite">
                <Loader2 size={13} className="animate-spin" />
                {nativeUploadStage === "processing" ? "Processing your video…" : `Uploading… ${nativeUploadPercent}%`}
              </div>
            )}
            {lockedGameId && !uploadedForSlot ? existingPicker : !lockedGameId && !uploadedForSlot
              ? <p className="border-t border-white/[0.08] pt-3 text-xs text-white/45">Upload a new video for this campaign. Existing content cannot be selected without a linked game.</p>
              : null}
          </>
        ) : isMedia ? (
          <>
            <div className="flex items-center justify-between gap-3">
              <div className="text-[10px] font-black uppercase tracking-wider text-white/35">{lockedGameId ? "Choose existing Gamefolio content or upload new" : "Upload new campaign content"}</div>
              <label className="cursor-pointer text-xs font-black" style={{ color: NEON }}>
                <Upload size={12} className="mr-1 inline" /> Upload {b.content_type === "screenshot" ? "screenshot" : b.content_type === "reel" ? "reel" : "video"}
                <input
                  type="file"
                  className="hidden"
                  accept={b.content_type === "screenshot" ? "image/*" : "video/mp4,video/quicktime,video/webm"}
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                     selectNativeFile(file);
                     event.target.value = "";
                  }}
                />
              </label>
            </div>
            {uploadedForSlot ? (
              <div className="space-y-3">
                <CampaignMediaPreview type="screenshot" mediaUrl={uploadedForSlot.mediaUrl} thumbnailUrl={uploadedForSlot.thumbnailUrl} title={uploadedForSlot.title} />
                <p className="text-xs text-[#B9FF1A]">Upload complete. Confirm it below to add it to this campaign.</p>
              </div>
            ) : nativeFile && nativePreview ? (
              <div className="overflow-hidden rounded-xl border border-white/10 bg-black/30">
                <img src={nativePreview} alt={nativeFile.name} className="max-h-56 w-full object-contain" />
                <div className="flex items-center justify-between gap-3 border-t border-white/[0.08] px-3 py-2">
                  <span className="truncate text-xs text-white/65">{nativeFile.name}</span>
                  <button type="button" onClick={() => selectNativeFile(null)} className="text-xs text-white/40 hover:text-white">Remove</button>
                </div>
              </div>
            ) : lockedGameId ? (
              <>
                {pickerLoading ? (
                  <div className="flex items-center justify-center py-5"><Loader2 size={16} className="animate-spin text-white/35" /></div>
                ) : (pickerData?.items ?? []).length > 0 ? (
                  <div className="grid max-h-52 grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4">
                    {(pickerData?.items ?? []).map((item: any) => {
                      const selected = selectedContentId === item.id;
                      return (
                        <button type="button" key={item.id} onClick={() => setSelectedContentId(selected ? null : item.id)} className="relative aspect-video overflow-hidden rounded-lg text-left" style={{ border: selected ? `2px solid ${NEON}` : "1px solid rgba(255,255,255,0.10)" }}>
                          {item.thumbnailUrl ? <img src={item.thumbnailUrl} alt={item.title ?? "Gamefolio content"} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center bg-white/5"><Icon size={16} className="text-white/35" /></div>}
                          {selected && <div className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full" style={{ background: NEON }}><Check size={11} color="#070b10" strokeWidth={3} /></div>}
                        </button>
                      );
                    })}
                  </div>
                ) : <div className="py-3 text-xs text-white/45">No matching Gamefolio content yet. Upload a new file above.</div>}
              </>
            ) : (
              <p className="py-3 text-xs text-white/45">Upload a new screenshot for this campaign. Existing content cannot be selected without a linked game.</p>
            )}
            {!uploadedForSlot && <div
              onDragOver={event => event.preventDefault()}
              onDrop={event => {
                event.preventDefault();
                selectNativeFile(event.dataTransfer.files?.[0] ?? null);
              }}
              className="rounded-lg border border-dashed border-white/15 px-3 py-3 text-center text-[10px] text-white/40"
            >Drop a screenshot here or browse above. JPG, PNG and WebP supported.</div>}
          </>
        ) : (
          <div className="space-y-3">
            {isReview
              ? <ReviewStarRating value={rating} onChange={rating => setReviewRatingDraft({ bountyId: b.id, slotIndex, rating })} disabled={submitMutation.isPending} />
              : <label className="text-[10px] font-black uppercase tracking-wider text-white/35">{b.content_type === "stream" ? "Your livestream link" : "Your content for the developer"}</label>}
            {b.description && <p className="text-xs leading-relaxed text-white/60">{b.content_type === "feedback" ? String(b.description).replace(/\bresponses?\b/gi, "content") : b.description}</p>}
            {b.content_type === "stream"
              ? <>
                  <input type="url" value={submitUrl} onChange={e => setSubmitUrl(e.target.value)} placeholder="https://twitch.tv/your-channel" className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none" />
                  {submitUrl && (livestreamPlatform(submitUrl)
                    ? <a href={submitUrl} target="_blank" rel="noopener noreferrer" className="block text-xs font-bold text-[#B9FF1A]">{livestreamPlatform(submitUrl)} · Preview link ↗</a>
                    : <p className="text-xs text-amber-300">Use an HTTPS link from Twitch, Kick, YouTube or Rumble.</p>)}
                </>
              : b.content_type === "feedback"
              ? <>
                  <div className="text-xs font-bold text-white/65">Feedback {slotIndex + 1} of {Math.max(1, Number(b.quantity ?? 1))} · Reviewing {gameName}</div>
                  <label htmlFor="campaign-feedback-text" className="block text-xs font-black uppercase tracking-wider text-white/75">Your feedback</label>
                  <textarea id="campaign-feedback-text" autoFocus value={submitUrl} onChange={event => setSubmitUrl(event.target.value)}
                    maxLength={10000} placeholder="Share your feedback with the developer…"
                    className="min-h-40 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none placeholder:text-white/40 focus:border-[#B9FF1A]/60" />
                  <p role="status" className="text-xs text-white/70">{draftStatus === "saving" ? "Saving draft…" : draftStatus === "saved" ? "Draft saved across devices" : draftStatus === "error" ? "Could not save draft. Please retry." : "Drafts save automatically"} · {submitUrl.length}/10,000 characters</p>
                </>
              : <>
                  <textarea aria-label={isReview ? "Your review" : undefined} value={submitUrl} onChange={e => setSubmitUrl(e.target.value)} maxLength={10000} placeholder={isReview ? "Write your review of the game…" : b.content_type === "bug" ? "Describe the bug, steps to reproduce, and expected behaviour…" : "Add your content…"} className="min-h-28 w-full rounded-xl bg-black/30 px-3 py-2 text-sm text-white outline-none placeholder:text-white/25" style={{ border: "1px solid rgba(255,255,255,0.10)" }} />
                </>}
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (uploadedForSlot) {
                const body: Record<string, unknown> = { contentType: b.content_type, slotIndex };
                if (b.content_type === "clip") body.clipId = uploadedForSlot.id;
                else if (b.content_type === "reel") body.reelId = uploadedForSlot.id;
                else body.screenshotId = uploadedForSlot.id;
                if (replacement) body.supersedesSubmissionId = replacement.id;
                return submitMutation.mutate({ bountyId: b.id, body });
              }
              if (nativeFile) return nativeSubmitMutation.mutate({
                bountyId: b.id,
                slotIndex,
                file: nativeFile,
                title: nativeTitle,
                description: nativeDescription,
                uploadAttemptId: nativeUploadAttemptId,
              });
              const body: Record<string, unknown> = { contentType: b.content_type };
              body.slotIndex = slotIndex;
              if (b.content_type === "clip") body.clipId = selectedContentId;
              else if (b.content_type === "reel") body.reelId = selectedContentId;
              else if (b.content_type === "screenshot") body.screenshotId = selectedContentId;
              else if (b.content_type === "stream") body.contentUrl = submitUrl.trim();
              else body.contentData = isReview ? { text: submitUrl.trim(), rating } : { text: submitUrl.trim() };
              if (replacement) body.supersedesSubmissionId = replacement.id;
              submitMutation.mutate({ bountyId: b.id, body });
            }}
             disabled={isNativeBusy || submitMutation.isPending || (!uploadedForSlot && (isVideo
              ? ((!nativeFile && !selectedContentId) || (Boolean(nativeFile) && !nativeTitle.trim()))
            : isMedia
              ? (!nativeFile && !selectedContentId)
                : !submitUrl.trim() || (isReview && rating == null) || (b.content_type === "stream" && !livestreamPlatform(submitUrl))))}
            className="flex-1 rounded-lg py-2.5 text-sm font-black transition-all hover:brightness-110 disabled:opacity-50"
            style={{ background: NEON, color: "#070b10" }}
          >
            {isNativeBusy || submitMutation.isPending ? <Loader2 size={14} className="mx-auto animate-spin" /> : uploadedForSlot ? "Confirm upload" : nativeFile ? "Upload content" : isMedia ? "Add to campaign" : b.content_type === "feedback" ? "CONFIRM FEEDBACK →" : b.content_type === "stream" ? "Add Livestream" : b.content_type === "review" ? "Save review" : "Save content"}
          </button>
          <button type="button" disabled={isNativeBusy || submitMutation.isPending} onClick={closeSubmissionForm} className="px-4 py-2 text-sm text-white/50 hover:text-white disabled:opacity-40">Cancel</button>
        </div>
      </div>
    );
  };

  const mediaReadyStatuses = ["staged", "pending", "awaiting_review", "under_review", "submitted", "submitted_for_review", "approved"];
  const objectiveMaxMb = (bounty: any): number | null => {
    const value = bounty.content_type === "screenshot"
      ? uploadLimits?.maxScreenshotSizeMB
      : bounty.content_type === "reel" ? uploadLimits?.maxReelSizeMB : uploadLimits?.maxClipSizeMB;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  };
  const validateObjectiveFile = (file: File, bounty: any) => {
    if (uploadLimitsLoading) return "Upload limits are still loading. Please wait before uploading.";
    if (uploadLimitsError || !uploadLimits) return "Upload limits are unavailable. Retry loading limits before uploading.";
    const maxMb = objectiveMaxMb(bounty);
    if (maxMb == null) return "The upload size limit is unavailable for this content type.";
    const image = bounty.content_type === "screenshot";
    const validTypes = image ? ["image/jpeg", "image/png", "image/webp"] : ["video/mp4", "video/webm", "video/quicktime"];
    const validExt = image ? /\.(jpe?g|png|webp)$/i : /\.(mp4|webm|mov)$/i;
    if (!validTypes.includes(file.type) && !validExt.test(file.name)) {
      return image ? "Choose a JPG, PNG, or WebP image." : "Choose an MP4, WebM, or MOV video.";
    }
    if (file.size > maxMb * 1024 * 1024) return `This file is larger than the ${maxMb}MB campaign upload limit.`;
    return null;
  };

  const startCampaignUpload = async (bounty: any, slotIndex: number, file: File, retry = false, draft?: PreparedBountyMedia) => {
    if (nativeSubmitMutation.isPending || submitMutation.isPending || nativeUploadStage === "submitting" ||
        (regularBounty && uploadedMedia)) return;
    const selection = ++mediaSelection.current;
    const error = regularBounty
      ? campaignFileError(file, bounty.content_type, objectiveMaxMb(bounty) ?? undefined)
      : validateObjectiveFile(file, bounty);
    if (!error) {
      const dimensionError = await campaignVideoFileError(file, bounty.content_type);
      if (selection !== mediaSelection.current) return;
      if (dimensionError) {
        toast({ title: "Video doesn’t fit this bounty", description: dimensionError, variant: "destructive" });
        return;
      }
    }
    setSelectedContentId(null);
    setNativeStep("preview");
    setNativeTitle(draft?.title ?? file.name.slice(0, 100));
    setNativeDescription(draft?.description ?? "");
    if (error) {
      setSubmitting(bounty.id);
      setSubmittingSlotIndex(slotIndex);
      setNativeUploadError(error);
      setNativeFile(file);
      setNativePreview(URL.createObjectURL(file));
      setUploadedMedia(null);
      setNativeUploadStage("idle");
      return;
    }
    setSubmitting(bounty.id);
    setSubmittingSlotIndex(slotIndex);
    setSubmitUrl("");
    setNativeUploadError(null);
    setNativeUploadStage(regularBounty ? "idle" : "uploading");
    setNativeUploadPercent(0);
    setNativeFile(file);
    setNativePreview(URL.createObjectURL(file));
    setUploadedMedia(null);
    const attemptId = retry && nativeUploadAttemptId ? nativeUploadAttemptId : crypto.randomUUID();
    activeUploadAttempt.current = attemptId;
    setNativeUploadAttemptId(attemptId);
    if (regularBounty) return;
    void nativeSubmitMutation.mutateAsync({
      bountyId: Number(bounty.id),
      slotIndex,
      file,
      title: file.name.slice(0, 100),
      description: data?.description || "",
      uploadAttemptId: attemptId,
    }).catch(() => undefined);
  };

  const stageUploadedMedia = async (bounty: any, media: any, slotIndex: number) => {
    const duplicate = (bounty.submissions ?? []).some((submission: any) =>
      Number(submission.media_id ?? submission.clip_id ?? submission.reel_id ?? submission.screenshot_id ?? 0) === Number(media.id)
      && !["changes_requested", "rejected"].includes(String(submission.status).toLowerCase())
    );
    if (duplicate) throw new Error("This media is already attached to the objective.");
    const latest = latestCampaignSubmissionForSlot(bounty.submissions ?? [], slotIndex);
    const replacement = ["staged", "changes_requested", "rejected"].includes(String(latest?.status ?? "").toLowerCase()) ? latest : null;
    const body: Record<string, unknown> = { contentType: bounty.content_type, slotIndex };
    if (bounty.content_type === "clip") body.clipId = media.id;
    else if (bounty.content_type === "reel") body.reelId = media.id;
    else body.screenshotId = media.id;
    if (replacement) body.supersedesSubmissionId = replacement.id;
    await submitMutation.mutateAsync({ bountyId: bounty.id, body });
    clearPendingAssociation(Number(media.id));
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["/api/bounties/my", cp.instance_id] }),
      qc.invalidateQueries({ queryKey: ["/api/bounties/my/campaigns"] }),
    ]);
  };

  const confirmCampaignMedia = async () => {
    if (!submittingBounty || submittingSlotIndex == null || nativeSubmitMutation.isPending || submitMutation.isPending || nativeUploadStage === "submitting") return;
    mediaSelection.current++;
    const bounty = submittingBounty;
    const slotIndex = submittingSlotIndex;
    try {
      setNativeUploadError(null);
      setNativeUploadStage("submitting");
      const latest = latestCampaignSubmissionForSlot(bounty.submissions ?? [], slotIndex);
      const replacement = ["staged", "changes_requested", "rejected"].includes(String(latest?.status ?? "").toLowerCase()) ? latest : null;
      let media = uploadedMedia;
      let attemptId = nativeUploadAttemptId;
      if (regularBounty && nativeFile && !media) {
        if (!showMediaDetails || !nativeTitle.trim()) throw new Error("Enter a title for your submission.");
        if (uploadBlockMessage) throw new Error(uploadBlockMessage);
        const fileError = validateObjectiveFile(nativeFile, bounty) ?? await campaignVideoFileError(nativeFile, bounty.content_type);
        if (fileError) throw new Error(fileError);
        await prepareSubmissionAccess();
        attemptId ??= crypto.randomUUID();
        activeUploadAttempt.current = attemptId;
        setNativeUploadAttemptId(attemptId);
        media = await nativeSubmitMutation.mutateAsync({
          bountyId: Number(bounty.id), slotIndex, file: nativeFile,
          title: nativeTitle, description: nativeDescription, uploadAttemptId: attemptId,
        });
        if (activeUploadAttempt.current !== attemptId) return;
      }
      if (media?.bountyId === Number(bounty.id) && media.slotIndex === slotIndex) {
        setNativeUploadStage("submitting");
        persistPendingAssociation({
          bountyId: Number(bounty.id), slotIndex, mediaId: Number(media.id),
          contentType: String(bounty.content_type), attemptId: attemptId ?? crypto.randomUUID(),
        });
        await stageUploadedMedia(bounty, media, slotIndex);
      } else if (selectedContentId != null) {
        const body: Record<string, unknown> = { contentType: bounty.content_type, slotIndex };
        if (bounty.content_type === "clip") body.clipId = selectedContentId;
        else if (bounty.content_type === "reel") body.reelId = selectedContentId;
        else body.screenshotId = selectedContentId;
        if (replacement) body.supersedesSubmissionId = replacement.id;
        await submitMutation.mutateAsync({ bountyId: Number(bounty.id), body });
      }
    } catch (error: any) {
      setNativeUploadStage("idle");
      setNativeUploadError(error?.message ?? "Could not add this content to the campaign. Retry confirmation.");
    }
  };

  const renderSubmissionSlots = (b: any) => {
    const submissions: any[] = b.submissions ?? [];
    const quantity = regularBounty ? Math.max(Number(b.quantity ?? 1), nextBountySubmissionSlot(submissions)) : Math.max(Number(b.quantity ?? 1), 1);
    const journey = String(data.journey_status ?? data.participant_status ?? "").toLowerCase();
    const underReviewState = ["under_review", "submitted", "submitted_for_review", "pending_review"].includes(journey);
    const locked = ["under_review", "submitted", "submitted_for_review", "pending_review", "approved", "completed", "completed_and_verified", "full_game_awarded", "expired", "cancelled", "rejected"].includes(journey);
    const type = String(b.content_type ?? "");
    const mediaObjective = ["clip", "reel", "screenshot"].includes(type);
    const label = type === "screenshot" ? "screenshot" : type === "clip" ? "clip" : type === "reel" ? "reel" : type === "feedback" ? "feedback item" : type === "review" ? "review" : "submission";
    // submitted_count already includes approved units in the campaign progress response.
    const staged = Math.min(Number(b.staged_count ?? 0) + Number(b.submitted_count ?? 0), quantity);
    const approved = Math.min(Number(b.approved_count ?? 0), quantity);
    const approvedVisible = ["changes_requested", "rejected", "approved", "completed", "completed_and_verified", "full_game_awarded"].includes(journey);
    const latestForSlot = (slotIndex: number) => latestCampaignSubmissionForSlot(submissions, slotIndex);
    const submittedSlotCount = Array.from({ length: quantity }, (_, slotIndex) => {
      const state = String(latestForSlot(slotIndex)?.status ?? "").toLowerCase();
      return ["submitted", "submitted_for_review", "under_review", "approved", "changes_requested", "rejected"].includes(state);
    }).filter(Boolean).length;
    const changeSlot = Array.from({ length: quantity }, (_, slotIndex) => slotIndex)
      .find(slotIndex => regularBounty ? latestForSlot(slotIndex)?.status === "changes_requested" : requestedSlotIsEditable(submissions, slotIndex));
    const canStageChange = journey === "changes_requested" && changeSlot != null;
    const canAdd = canStageChange || (regularBounty ? submissions.length === 0 : staged < quantity);
    const editingAllowed = journey !== "changes_requested" || canStageChange;
    const activeBySlot = Array.from({ length: quantity }, (_, slotIndex) => {
      const forSlot = submissions.filter((s: any, index: number) => Number(s.slot_index ?? index) === slotIndex);
      const submission = forSlot.find((s: any) => !["changes_requested", "rejected"].includes(String(s.status).toLowerCase())) ?? forSlot[0];
      return submission ? { submission, slotIndex } : null;
    }).filter(Boolean) as Array<{ submission: any; slotIndex: number }>;
    const feedback = type === "feedback";
    const stream = type === "stream";
    const showSubmissionProgress = !embedded || !stream || submissions.length > 0;
    const uploadAllowed = canUpload && (!embedded||!accessNeedsReveal) && (canAdd || (!regularBounty && submitting === b.id && submittingSlotIndex != null))
      && !queueUploading && !nativeSubmitMutation.isPending && !submitMutation.isPending
      && (regularBounty || (!uploadLimitsLoading && !uploadLimitsError && objectiveMaxMb(b) != null));
    const queue = uploadQueue[b.id] ?? [];
    const streamMinutesVerified = stream ? verifiedStreamMinutes(submissions) : 0;
    const streamMinutesRequired = stream ? streamCampaignConfig(data, b).requiredMinutes : 0;
    const openSlot = () => {
      const rejected = changeSlot != null ? latestForSlot(changeSlot) : null;
      const occupied = new Set(activeBySlot.map(item => item.slotIndex));
      const slot = rejected
        ? Number(rejected.slot_index ?? 0)
        : regularBounty ? 0
        : Array.from({ length: quantity }, (_, i) => i).find(i => !occupied.has(i)) ?? 0;
      openSubmissionForm(b.id, slot);
    };
    const replaceableSlot = changeSlot != null ? latestForSlot(changeSlot) : null;
    const slotToAdd = submitting === b.id && submittingSlotIndex != null
      ? submittingSlotIndex
      : replaceableSlot
        ? Number(replaceableSlot.slot_index ?? 0)
        : regularBounty ? 0
        : Array.from({ length: quantity }, (_, index) => index).find(index => !activeBySlot.some(item => item.slotIndex === index)) ?? 0;
    const pickFile = () => {
      if (!uploadAllowed) return;
      document.getElementById(`campaign-files-${b.id}`)?.click();
    };
    return (
      <div className="mt-3 space-y-2.5">
        {showSubmissionProgress && <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-black uppercase tracking-wide text-white/75">{regularBounty ? `${approvedVisible?approved:underReviewState?submittedSlotCount:staged} ${approvedVisible?"approved":underReviewState?"submitted":"added"}` : underReviewState ? `${submittedSlotCount} / ${quantity} submitted` : approvedVisible ? `${approved} / ${quantity} approved` : `${staged} / ${quantity} ready`}</span>
          {approvedVisible
            ? <Check size={13} className={approved >= quantity ? "text-[#B9FF1A]" : "text-white/30"} />
            : underReviewState ? <Check size={13} className="text-[#B9FF1A]" /> : staged >= quantity ? <Check size={13} className="text-[#B9FF1A]" /> : null}
        </div>}
        {stream && showSubmissionProgress && (
          <div className="border-t border-white/[0.10] pt-2">
            <div className="flex justify-between text-[10px] text-white/55"><span>Verified stream time</span><b className="text-white/80">{streamMinutesVerified} / {streamMinutesRequired} min</b></div>
            <div className="mt-1.5 h-1 overflow-hidden bg-white/10"><div className="h-full bg-[#B9FF1A]" style={{ width: `${streamMinutesRequired ? Math.min(100, streamMinutesVerified / streamMinutesRequired * 100) : 0}%` }} /></div>
          </div>
        )}
        {!regularBounty&&<div className="h-[2px] overflow-hidden bg-white/10" aria-label={underReviewState ? `${submittedSlotCount} of ${quantity} submitted` : `${staged} of ${quantity} items ready`}>
          <div className="h-full bg-[#B9FF1A] transition-[width]" style={{ width: `${quantity ? Math.min(100, (underReviewState ? submittedSlotCount : approvedVisible ? approved : staged) / quantity * 100) : 0}%` }} />
        </div>}
        {mediaObjective && !locked && editingAllowed && <>
          <input id={`campaign-files-${b.id}`} type="file" disabled={!uploadAllowed} className="sr-only"
            accept={type === "screenshot" ? "image/jpeg,image/png,image/webp" : "video/mp4,video/webm,video/quicktime"}
            aria-label={`Choose ${label} files`}
            onChange={event => {
              const file = event.target.files?.[0];
              if (file) startCampaignUpload(b, slotToAdd, file);
              event.target.value = "";
            }} />
          {canAdd && (
            <div className="space-y-2">
              <CampaignFileDropzone type={type} file={preparedMedia?.file} onFile={file => {
                if (file && uploadAllowed) startCampaignUpload(b, slotToAdd, file);
                onPreparedMedia?.(null);
              }} disabled={!uploadAllowed} maxMb={objectiveMaxMb(b)??undefined}
                hint={accessNeedsReveal ? "Confirm game access below before uploading." : directSubmission ? "Preview your file and submit it for review." : regularBounty && type === "clip" ? "Preview and submit your clip." : regularBounty ? "Preview your file, then add a title and description." : "Upload and preview your file, then confirm it for this bounty."} />
              {preparedMedia && <button type="button" disabled={!uploadAllowed} className="bounty-detail-start" onClick={() => {
                startCampaignUpload(b, slotToAdd, preparedMedia.file, false, preparedMedia);
              }}>{regularBounty ? "Preview" : "Upload"} selected {label}</button>}
              {!awaitingFirstSubmission && <div className="flex flex-wrap items-center gap-2">
                <button type="button" disabled={!uploadAllowed} onClick={pickFile}
                  className="inline-flex items-center gap-1.5 border border-[#B9FF1A]/45 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-[#B9FF1A] hover:bg-[#151827] disabled:cursor-not-allowed disabled:opacity-40">
                  <Plus size={12} /> {canStageChange ? `Replace ${label}` : staged ? "Add More" : type === "screenshot" ? "Add Screenshot" : type === "reel" ? "Add Reel" : "Add Clip"}
                </button>
                {data.game_id && <button type="button" disabled={queueUploading} onClick={openSlot} className="text-[10px] font-bold text-white/45 underline underline-offset-2 hover:text-white">Choose existing</button>}
              </div>}
              <p className="text-[10px] text-white/40">{regularBounty ? `You can submit one ${label} each month.` : `Add one ${label} at a time`}</p>
              {uploadLimitNotice(objectiveMaxMb(b))}
            </div>
          )}
        </>}
        {!locked && editingAllowed && queue.filter(entry => entry.status !== "ready").map(entry => (
          <div key={entry.key} className="flex min-w-0 flex-wrap items-center gap-2 border-t border-white/[0.08] pt-2" aria-live="polite">
            <span className="min-w-0 flex-1 truncate text-[10px] text-white/60">{entry.file?.name ?? "Uploaded media — staging pending"}</span>
            {entry.status === "uploading" || entry.status === "staging"
              ? <span className="text-[9px] text-white/45">{entry.status === "staging" ? "Saving…" : `${nativeUploadStage === "processing" ? "Processing" : "Uploading"} ${nativeUploadPercent}%`}</span> : null}
            {entry.error && <span role="alert" className="w-full break-words text-[9px] text-red-200">{entry.error}</span>}
            {(entry.status === "uploading" || entry.status === "staging") && <div className="h-1 w-full overflow-hidden bg-white/10"><div className="h-full bg-[#B9FF1A]" style={{ width: `${entry.status === "staging" ? 100 : nativeUploadPercent}%` }} /></div>}
            {entry.status === "failed" && <button type="button" onClick={() => {
              const retry = async () => {
                setUploadQueue(prev => ({ ...prev, [b.id]: (prev[b.id] ?? []).map(item => item.key === entry.key ? { ...item, status: "queued", error: undefined } : item) }));
                const active = submissions.filter((s: any) => mediaReadyStatuses.includes(String(s.status).toLowerCase()));
                const slots = new Set(active.map((s: any, index: number) => Number(s.slot_index ?? index)));
                const rejectedSlot = submissions.find((s: any) => ["changes_requested", "rejected"].includes(String(s.status).toLowerCase()));
                const slotIndex = entry.slotIndex ?? (rejectedSlot ? Number(rejectedSlot.slot_index ?? 0) : Array.from({ length: quantity }, (_, i) => i).find(i => !slots.has(i)));
                if (slotIndex == null) return;
                setQueueUploading(true);
                const patchEntry = (patch: any) => setUploadQueue(prev => ({ ...prev, [b.id]: (prev[b.id] ?? []).map(item => item.key === entry.key ? { ...item, ...patch } : item) }));
                try {
                  let media = entry.media;
                  if (!media) {
                    if (!entry.file) throw new Error("The original file is unavailable. This media could not be recovered for upload.");
                    patchEntry({ status: "uploading" });
                     media = await nativeSubmitMutation.mutateAsync({ bountyId: b.id, slotIndex, file: entry.file, title: entry.file.name.slice(0, 100), description: data?.description || "", uploadAttemptId: entry.attemptId });
                    persistPendingAssociation({ bountyId: Number(b.id), slotIndex, mediaId: Number(media.id), contentType: type, attemptId: entry.attemptId });
                    patchEntry({ media, status: "staging" });
                  }
                  const fresh = await qc.fetchQuery<any>({
                    queryKey: ["/api/bounties/my", cp.instance_id],
                    queryFn: loadCampaignProgress,
                    staleTime: 0,
                  });
                  const freshObjective = fresh?.bounties?.find((objective: any) => Number(objective.id) === Number(b.id));
                  if (!freshObjective) throw new Error("Could not refresh campaign state. Retry staging when your campaign is available.");
                  const alreadyAttached = (freshObjective.submissions ?? []).some((submission: any) => Number(submission.media_id ?? submission.clip_id ?? submission.reel_id ?? submission.screenshot_id) === Number(media.id));
                  if (!alreadyAttached) await stageUploadedMedia(freshObjective, media, slotIndex);
                  else clearPendingAssociation(Number(media.id));
                  patchEntry({ status: "ready", media, percent: 100 });
                } catch (error: any) { patchEntry({ status: "failed", error: error?.message || "Retry failed." }); }
                finally { setQueueUploading(false); }
              };
              void retry();
            }} disabled={queueUploading} className="text-[9px] font-black uppercase text-amber-200 disabled:opacity-40">{entry.media ? "Retry stage" : "Retry"}</button>}
            {entry.status === "uploading" && uploadAbort && <button type="button" onClick={() => uploadAbort?.()} className="text-[9px] font-bold text-white/55">Cancel</button>}
          </div>
        ))}
        {activeBySlot.length > 0 && <p className="text-[10px] text-white/45">
          {activeBySlot.length} item{activeBySlot.length === 1 ? "" : "s"} {locked ? "included in the submission receipt below." : `added · Review ${activeBySlot.length === 1 ? "it" : "them"} in Uploaded Content below.`}
        </p>}
        {type === "review" && activeBySlot.map(({ submission }) => <SavedReviewStars key={submission.id} content={submission.content_data} />)}
        {embedded && !locked && editingAllowed && canAdd && (feedback || type === "review") && (() => {
          const saved = latestForSlot(slotToAdd);
          let content = saved?.content_data;
          try { if (typeof content === "string") content = JSON.parse(content); } catch { content = { text: content }; }
          const remote = feedback ? feedbackDrafts?.find(draft => Number(draft.bounty_id) === Number(b.id) && Number(draft.slot_index) === slotToAdd)?.content : undefined;
          const value = submitting === b.id ? submitUrl : preparedText || (remote ?? content?.text ?? "");
          const rating = feedback ? undefined : ratingFor(b.id, slotToAdd, content);
          const unavailable = !canUpload || (!awaitingFirstSubmission && feedback && (feedbackDraftsLoading || feedbackDraftsError || !feedbackDrafts));
          const disabled = unavailable || submitMutation.isPending;
          const fieldId = `written-bounty-${cp.instance_id}-${b.id}`;
          return <div className="bounty-inline-response">
            {accessNeedsReveal && <p>Confirm game access below before saving your response.</p>}
            {!feedback && <ReviewStarRating value={rating} disabled={disabled}
              onChange={rating => setReviewRatingDraft({ bountyId: b.id, slotIndex: slotToAdd, rating })} />}
            <label htmlFor={fieldId}>{feedback ? "Your feedback" : "Your review"}</label>
            <textarea id={fieldId} value={value} rows={6} maxLength={10000} disabled={disabled}
              onChange={event => { setSubmitting(b.id); setSubmittingSlotIndex(slotToAdd); setSubmitUrl(event.target.value); onPreparedText?.(event.target.value); }}
              placeholder={feedback ? "Share what worked and what could be improved…" : "Write your review of the game…"} />
            {feedback && <p role="status">{unavailable ? "Loading saved feedback…" : draftStatus === "saving" ? "Saving draft…" : draftStatus === "saved" ? "Draft saved" : "Feedback saves as a draft as you write."}</p>}
            <button type="button" className="bounty-detail-start" disabled={accessNeedsReveal || disabled || !String(value).trim() || (!feedback && rating == null)}
              onClick={() => {
                const text = String(value).trim();
                const body: Record<string, unknown> = { contentType: type, contentData: feedback ? { text } : { text, rating }, slotIndex: slotToAdd };
                if (saved && ["staged", "changes_requested", "rejected"].includes(saved.status)) body.supersedesSubmissionId = saved.id;
                submitMutation.mutate({ bountyId: b.id, body });
              }}>{submitMutation.isPending ? "Saving…" : `${regularBounty ? "Submit" : "Save"} ${feedback ? "feedback" : "review"}`}</button>
          </div>;
        })()}
        {embedded&&!locked&&editingAllowed&&canAdd&&stream&&renderSubmissionForm(b,slotToAdd)}
        {!embedded&&!locked&&editingAllowed&&canAdd&&!mediaObjective&&!stream&&!(feedback&&submitting===b.id)&&<button type="button" onClick={openSlot} disabled={feedback&&(!feedbackDrafts||feedbackDraftsLoading)} className="bounty-detail-start">{feedback?'Add feedback':`Add ${label}`}</button>}
        {!embedded&&!locked&&editingAllowed&&(!regularBounty||canAdd)&&stream&&submitting!==b.id&&<button type="button" onClick={()=>openSubmissionForm(b.id,changeSlot??0)} className="bounty-detail-start">{canStageChange?'Replace stream':'Add stream'}</button>}
        {locked && activeBySlot.length === 0 && <div className="text-[10px] text-white/45"><Lock size={11} className="mr-1 inline" />No submitted content</div>}
      </div>
    );
  };

  return (
    <div className={embedded ? "bounty-inline-workspace" : "min-h-screen bg-background pb-24 sm:pb-10"}>
      {!embedded&&<button onClick={onBack} className="flex items-center gap-2 px-5 py-3 text-sm font-bold text-white/50 transition-colors hover:text-white">
        <ChevronLeft size={16} /> Back to My Campaigns
      </button>}

      {/* Keep the joined hero edge-to-edge, like the campaign before joining. */}
      {!embedded&&<section className="relative isolate min-h-[390px] overflow-hidden bg-background">
        <FeaturedHeroBackground campaign={data} className="absolute inset-0 bg-center bg-cover bg-no-repeat" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(7,11,16,1) 0%, rgba(7,11,16,0.88) 35%, rgba(7,11,16,0.28) 68%, rgba(7,11,16,0.60) 100%)" }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, hsl(var(--background)) 0%, hsl(var(--background) / 0.5) 42%, transparent 100%)" }} />

        <div className="relative z-10 flex min-h-[390px] flex-col justify-end px-6 pb-8 pt-20">
          <div className="mx-auto flex w-full max-w-[1600px] items-end justify-between gap-10 px-2 lg:px-8">
            <div className="max-w-2xl flex-1">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-black" style={{ color: NEON, background: "#141824" }}>
                  <VerifiedIcon size={14} decorative /> GF Verified
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-white/65">Joined</span>
                {statusCfg.label !== "Joined" && (
                  <span className="rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider" style={{ color: statusCfg.color }}>{statusCfg.label}</span>
                )}
              </div>
              <h1 className="mb-4 font-black uppercase leading-none text-white" style={{ fontSize: "clamp(2rem,4vw,3.5rem)", letterSpacing: "-0.02em", textShadow: "0 4px 60px rgba(0,0,0,0.80)" }}>
                {data.campaign_title || data.template_name || cp.template_name}
              </h1>
              {campaignGameTitle(data) && (
                <div className="mb-1 text-lg font-black uppercase tracking-[0.12em] text-white/85">{campaignGameTitle(data)}</div>
              )}
              {data.description && <p className="mb-6 max-w-lg text-sm leading-relaxed text-white/50">{data.description}</p>}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-bold text-white/55">
                <span className="flex items-center gap-1.5"><Target size={13} /> {mandatory.length} required</span>
                {!regularBounty && <span className="flex items-center gap-1.5"><Clock size={13} /> <span aria-live="polite" className={deadlineUrgency === "urgent" ? "text-red-300" : deadlineUrgency === "soon" ? "text-amber-300" : ""}>{deadlineLabel}</span></span>}
                <span className="flex items-center gap-1.5"><Key size={13} /> {accessMethodLabel(data)}</span>
              </div>
            </div>
          </div>
        </div>
      </section>}

      <div className="mx-auto max-w-[1600px] px-5 sm:px-8 lg:px-16 xl:px-24">
        {!embedded && <details className="mt-6 rounded-xl border border-[#303447] bg-[#151827] p-5">
          <summary className="cursor-pointer text-base font-semibold text-white">Need help with this campaign?</summary>
          <p className="mt-3 text-sm leading-relaxed text-[#BAC0D0]">Report an access issue, technical blocker or disputed review. Include the affected submission and developer’s reason. Sending a report does not automatically extend your deadline or change approval.</p>
          <div className="mt-4 flex flex-wrap gap-3">{[...(['free_to_play','public_demo'].includes(data.access_method)?[]:['Key doesn’t work']),'Game won’t run','Submission problem','Disputed review'].map(issue=><a key={issue} href={`/help?campaign=${encodeURIComponent(String(data.instance_id ?? cp.instance_id ?? data.id ?? cp.id))}&issue=${encodeURIComponent(issue)}#contact-support`} className="rounded-lg border border-[#394158] px-4 py-3 text-sm font-semibold text-[#B9FF1A]">{issue}</a>)}</div>
        </details>}
        {!embedded && !regularBounty && data.joined_at && data.deadline && <div className="mt-8 max-w-xl">
          <CampaignTimeline creatorOnly creatorDays={Number(data.creator_deadline_days ?? cp.creator_deadline_days ?? 14)}
            joinedAt={data.joined_at} dueAt={displayData.deadline} />
        </div>}
        {!embedded&&<section className="relative isolate mt-8 min-h-[190px] overflow-hidden border-y border-white/[0.10] py-7 sm:min-h-[220px] sm:py-8">
          {gameArtwork && (
            <div className="absolute inset-y-0 right-0 w-full sm:w-[58%]" aria-hidden="true">
              <img src={gameArtwork} alt="" className="h-full w-full object-cover object-center opacity-70" />
              <div className="absolute inset-0 bg-gradient-to-r from-background via-background/75 to-background/15" />
              <div className="absolute inset-0 bg-gradient-to-t from-background/65 via-transparent to-background/20" />
            </div>
          )}
          <div className="relative z-10 flex min-h-[150px] max-w-2xl flex-col justify-center sm:min-h-[172px]">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#B9FF1A]">About the Game</div>
            {campaignGameTitle(data) && <h2 className="mt-3 text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">{campaignGameTitle(data)}</h2>}
            {gameHref && <a href={gameHref} onClick={()=>trackDiscovery(data.campaign,'game_page_visit')} className="mt-4 w-fit text-xs font-black uppercase tracking-wide text-[#B9FF1A] transition hover:text-white">View Game <ChevronRight size={14} className="ml-1 inline" /></a>}
          </div>
        </section>}
        {!embedded && <CampaignGameDetails campaign={data} />}

        {(applicationPending || applicationApproved) && (
          <div
            className="mt-5 rounded-xl px-4 py-3 flex items-start gap-3"
            role="status"
            aria-live="polite"
            style={{
              background: applicationPending ? "rgba(245,158,11,0.08)" : "rgba(185,255,26,0.08)",
              border: `1px solid ${applicationPending ? "rgba(245,158,11,0.22)" : "rgba(185,255,26,0.22)"}`,
            }}
          >
            {applicationPending ? <Clock size={16} className="text-amber-300 mt-0.5 flex-shrink-0" /> : <Check size={16} className="text-[#B9FF1A] mt-0.5 flex-shrink-0" />}
            <div>
              <div className={`text-xs font-black ${applicationPending ? "text-amber-200" : "text-[#B9FF1A]"}`}>
                {applicationPending ? "Application pending approval" : "Application approved"}
              </div>
              <div className="text-[11px] text-white/50 mt-1">
                {applicationPending
                  ? "The developer needs to approve your application before access and objectives become available."
                  : "Your application is approved. Confirm access below when you are ready to start your submission deadline."}
              </div>
            </div>
          </div>
        )}

        {(() => {
          const journey = String(data.journey_status ?? data.participant_status ?? "").toLowerCase();
          const underReview = ["under_review", "submitted", "submitted_for_review", "pending_review"].includes(journey);
          const changesRequested = journey === "changes_requested";
          const approvedCampaign = ["approved", "completed", "completed_and_verified", "full_game_awarded"].includes(journey);
           const rejectedCampaign = journey === "rejected";
          const expired = (deadlineUrgency === "expired" || journey === "expired") && !underReview && !approvedCampaign;
           const previousMonth = regularBounty && Boolean(data.previous_month);
           const packageLocked = underReview || approvedCampaign || expired || rejectedCampaign || (previousMonth && !changesRequested);
           const hasCampaignHud = approvedCampaign || rejectedCampaign || changesRequested || expired;
           const campaignHudState = approvedCampaign ? "complete"
             : rejectedCampaign ? "rejected"
               : changesRequested ? "changes_requested" : "ended";
          const preparedUnits = mandatory.reduce((sum: number, b: any) => {
            const qty = Math.max(Number(b.quantity ?? 1), 1);
              return sum + Math.min(qty, Number(b.staged_count ?? 0) + Number(b.submitted_count ?? 0));
          }, 0);
           const submittedPackageUnits = Math.min(submissionSummary.count, requiredUnits);
          const readyPct = requiredUnits > 0 ? Math.round(preparedUnits / requiredUnits * 100) : 0;
          const reviewPct = requiredUnits > 0 ? Math.round(submittedPackageUnits / requiredUnits * 100) : 0;
           const readyToSubmit = preparedUnits >= requiredUnits && requiredUnits > 0 && Boolean(progress) && !progressError && !expired && !packageLocked;
           const guidance = creatorJourneyGuidance({status:journey,expired,accessRequired:showAccessAction && !accessRevealed,ready:readyToSubmit,staged:progressBounties.some((b:any)=>Number(b.staged_count)>0),remaining:Math.max(0,requiredUnits-preparedUnits),nextObjective:nextObjectiveTitle});
           const statusText = approvedCampaign ? "APPROVED / COMPLETED" : rejectedCampaign ? "REJECTED" : underReview ? "AWAITING APPROVAL" : changesRequested ? "CHANGES REQUESTED" : expired ? "CAMPAIGN ENDED" : readyToSubmit ? "READY TO SUBMIT" : "IN PROGRESS";
          return (
            <>
               {regularBounty ? (approvedCampaign || underReview || rejectedCampaign || changesRequested || expired || previousMonth) && (
                 <p className="bounty-workspace-status" role="status">
                   {approvedCampaign ? 'Your submission was approved.' : underReview ? 'Your submission is awaiting review.'
                     : rejectedCampaign ? 'Your submission wasn’t approved.' : changesRequested ? 'The developer requested changes to your submission.'
                     : previousMonth ? 'Open this month’s bounty to submit new content.' : 'This bounty has ended.'}
                 </p>
               ) : <section className="mt-8 border-y border-white/[0.10] py-8">
                 {hasCampaignHud && <CampaignStatusHud state={campaignHudState} accent={campaignHudState === "changes_requested" ? "#FBBF24" : NEON} className="mb-6" />}
                <div className="flex flex-wrap items-end justify-between gap-5">
                  <div>
                     <div className="text-xs font-bold uppercase tracking-wider text-[#B9FF1A]">Your next step</div>
                     <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">{guidance.title}</h2>
                     <p className="mt-3 max-w-2xl text-base leading-relaxed text-[#BAC0D0]">{guidance.detail}</p>
                      {underReview && <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-[10px] font-black uppercase tracking-[0.14em] text-white/60">
                        <span>Submitted{submittedAtLabel ? ` · ${submittedAtLabel}` : ""}</span><span className="text-amber-200">Status · Awaiting approval</span><span>No automatic approval deadline is configured. Use campaign support if you need a review update.</span>
                      </div>}
                     {expired && !submittedPackageUnits && <div className="mt-3 text-xs font-black uppercase tracking-wide text-white/55">Not Submitted</div>}
                     {data.deadline && <div className="mt-3 text-xs font-bold text-white/55">Submission deadline: {formatCampaignMoment(data.deadline)?.dateLabel} · {formatCampaignMoment(data.deadline)?.timeLabel} · {deadlineLabel}</div>}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black tabular-nums text-white">{approvedCampaign ? `${approvedUnits} OF ${requiredUnits} APPROVED` : underReview ? `${submittedPackageUnits} OF ${requiredUnits} SUBMITTED` : `${preparedUnits} OF ${requiredUnits} ITEMS READY`}</div>
                    {underReview
                      ? <div className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-amber-200">Submission progress</div>
                      : <div className="mt-1 text-sm font-black tabular-nums" style={{ color: approvedCampaign ? NEON : NEON }}>{approvedCampaign ? reviewPct : readyPct}%</div>}
                  </div>
                </div>
                <div className="mt-5 h-2 overflow-hidden bg-white/[0.08]">
                  <div className="h-full transition-[width] duration-700" style={{ width: `${underReview || approvedCampaign ? reviewPct : readyPct}%`, background: NEON }} />
                </div>
                 {!hasCampaignHud && <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: NEON }}>
                  {underReview && <Check size={13} strokeWidth={3} />}{underReview && submittedPackageUnits >= requiredUnits ? `${submittedPackageUnits} OF ${requiredUnits} SUBMITTED` : statusText}
                  {underReview && <span className="ml-1 text-amber-200">· Awaiting approval</span>}
                 </div>}
                {underReview && <div className="mt-4 flex items-start gap-2 border-l border-amber-300/40 pl-3 text-xs leading-relaxed text-white/55"><Lock size={13} className="mt-0.5 shrink-0 text-amber-200" /><span><strong className="font-black uppercase tracking-wide text-amber-100">Submission locked.</strong> No changes can be made while your campaign is under review.</span></div>}
                {changesRequested && data.review_notes && <div className="mt-4 border-l-2 border-amber-300/60 pl-3 text-sm leading-relaxed text-amber-100/80">{data.review_notes}</div>}
               </section>}

              <section className="mt-9">
                {!regularBounty&&<div className="mb-5">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.22em]" style={{ color: NEON }}>What You&apos;ll Do</div>
                    <h2 className="mt-2 text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">Your campaign missions</h2>
                  </div>
                </div>}
                {!underReview && !approvedCampaign && feedbackDraftsError && <div role="alert" className="mb-4 text-xs text-amber-300">Saved feedback drafts could not be loaded. <button type="button" onClick={() => refetchFeedbackDrafts()} className="underline">Retry</button> before editing feedback.</div>}
                {!underReview && !approvedCampaign && feedbackDraftsLoading && mandatory.some((b: any) => b.content_type === "feedback") && <div role="status" className="mb-4 text-xs text-white/50">Loading saved feedback drafts…</div>}
                <div className="grid items-start gap-x-7 gap-y-8 lg:grid-cols-[minmax(0,1fr)_minmax(240px,28%)]">
                  <div className={`grid min-w-0 items-start gap-x-6 gap-y-7 md:grid-cols-2 ${mandatory.length >= 4 ? "lg:grid-cols-4" : mandatory.length === 3 ? "lg:grid-cols-3" : mandatory.length === 2 ? "lg:grid-cols-2" : "lg:grid-cols-1"}`}>
                    {mandatory.map((b: any, index: number) => {
                      const qty = Math.max(Number(b.quantity ?? 1), 1);
                      const objectiveReady = Math.min(qty, Number(b.staged_count ?? 0) + Number(b.submitted_count ?? 0) + Number(b.approved_count ?? 0));
                      const subs = b.submissions ?? [];
                      const submittedSlotCount = Array.from({ length: qty }, (_, slotIndex) => {
                        const latest = subs.filter((s: any, submissionIndex: number) => Number(s.slot_index ?? submissionIndex) === slotIndex)
                          .sort((a: any, c: any) => Number(c.id) - Number(a.id))[0];
                        return ["submitted", "submitted_for_review", "under_review", "approved", "changes_requested", "rejected"].includes(String(latest?.status ?? "").toLowerCase());
                      }).filter(Boolean).length;
                      const objectiveChanges = Array.from({ length: qty }, (_, slotIndex) =>
                        subs.filter((s: any) => Number(s.slot_index ?? 0) === slotIndex)
                          .sort((a: any, c: any) => Number(c.id) - Number(a.id))[0]
                      ).some((latest: any) => latest?.status === "changes_requested");
                      const objectiveApproved = approvedCampaign && Number(b.approved_count ?? 0) >= qty;
                      return (
                        <article key={b.id} className={`min-w-0 border-b pb-4 ${objectiveChanges ? "border-amber-300/50" : "border-white/[0.12]"}`}>
                          {!regularBounty&&<VisualMissionCard bounty={b} campaign={data} marker={String(index + 1).padStart(2, "0")} />}
                          {!regularBounty&&!underReview && <div className={`mt-1 text-[10px] font-black uppercase tracking-[0.12em] ${objectiveChanges ? "text-amber-200" : objectiveApproved ? "text-[#B9FF1A]" : "text-white/55"}`}>
                            {objectiveChanges ? "Changes requested" : objectiveApproved ? "Approved" : `${objectiveReady} / ${qty} ready`}
                          </div>}
                          {!applicationPending && (!previousMonth || changesRequested || underReview || approvedCampaign) && renderSubmissionSlots(b)}
                        </article>
                      );
                    })}
                  </div>
                  <aside className={`min-w-0 border-l border-white/[0.12] pl-0 sm:pl-5 lg:pl-6 ${embedded && awaitingFirstSubmission ? "lg:self-center" : ""}`}>
                     {awaitingFirstSubmission ? <BountyXpBadge xp={Number(data.total_campaign_xp ?? 0)} />
                       : progress && <CampaignRewardJourney campaign={displayData} bounties={bounties} joined compact showApprovalProgress showProgress={false} />}
                    {!awaitingFirstSubmission && !underReview && <div className="mt-6 border-t border-white/[0.12] pt-4">
                      <div className="flex items-center justify-between gap-3 text-[9px] font-black uppercase tracking-[0.16em] text-white/35">
                        <span>Mission status</span><span style={{ color: underReview ? NEON : approvedCampaign ? NEON : changesRequested ? "#fbbf24" : statusCfg.color }}>{underReview ? "Awaiting approval" : approvedCampaign ? "Approved" : changesRequested ? "Changes requested" : statusCfg.label}</span>
                      </div>
                      {!regularBounty && <div className="mt-2 text-xs font-bold text-white/70">{accessRevealed ? deadlineLabel : "Deadline starts when access is confirmed"}{data.deadline ? ` · ${new Date(data.deadline).toLocaleDateString()}` : ""}</div>}
                      {showAccessAction && <div className="mt-3">
                        <p className="mb-2 text-[10px] leading-relaxed text-white/45">
                          {regularBounty ? (accessReserved ? "You can view your game key here." : "Confirm game access to submit your content.") : accessReserved && accessRevealed ? "Your access key is available and your submission deadline is active." : accessReserved ? "Your key is reserved. Reveal it when ready to start your submission deadline." : "Confirm access when ready to start your submission deadline."}
                        </p>
                        <button type="button" onClick={() => revealAccessMutation.mutate()} disabled={revealAccessMutation.isPending} className="inline-flex items-center gap-2 border border-[#B9FF1A]/45 px-3 py-2 text-[10px] font-black uppercase text-[#B9FF1A] hover:bg-[#151827] disabled:opacity-50">
                          {revealAccessMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <KeyRound size={12} />}
                          {accessReserved ? accessRevealed ? "Show access key" : "Reveal Key & Start" : "Confirm Access & Start"}
                        </button>
                      </div>}
                      {revealedAccessKey && <div className="mt-3 border border-white/10 p-2">
                        <div className="text-[9px] font-black uppercase tracking-wide text-[#B9FF1A]">Access key</div>
                        <div className="mt-1 flex items-center gap-1">
                          <code className="min-w-0 flex-1 truncate text-[10px] text-white/70">{revealedAccessKey}</code>
                          <button onClick={() => copyKey(revealedAccessKey, setCopiedDemo)} className="p-1.5" aria-label="Copy revealed access key">{copiedDemo ? <Check size={13} color={NEON} /> : <Copy size={13} className="text-white/50" />}</button>
                          {data.game_steam_app_id && <a href={`https://store.steampowered.com/app/${data.game_steam_app_id}`} target="_blank" rel="noopener noreferrer" className="p-1.5" aria-label="Open game on Steam"><SiSteam size={13} className="text-white/50" /></a>}
                        </div>
                      </div>}
                      {claimedFullKey ? <div className="mt-3 border border-white/10 p-2">
                        <div className="text-[9px] font-black uppercase text-[#B9FF1A]">Full game key · claimed</div>
                        <div className="mt-1 flex items-center gap-1"><code className="min-w-0 flex-1 truncate text-[10px] text-white/70">{claimedFullKey}</code><button onClick={() => copyKey(claimedFullKey, setCopiedFull)} className="p-1.5" aria-label="Copy claimed full-game key">{copiedFull ? <Check size={13} className="text-[#B9FF1A]" /> : <Copy size={13} className="text-white/50" />}</button></div>
                      </div> : canClaimFull ? <button onClick={() => claimFullMutation.mutate()} disabled={claimFullMutation.isPending} className="mt-3 inline-flex items-center gap-2 border border-[#B9FF1A]/35 px-3 py-2 text-[10px] font-black uppercase text-[#B9FF1A] disabled:opacity-50">{claimFullMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Gift size={12} />} Claim full-game key</button> : null}
                    </div>}
                  </aside>
                </div>
              </section>

               {submittingBounty && submittingSlotIndex != null && !packageLocked && (!embedded||usesExistingContent) && createPortal(
                 <div className="fixed inset-0 z-[200010] flex items-center justify-center overflow-y-auto bg-black/65 p-4 backdrop-blur-md">
                   <div role="dialog" aria-modal="true" aria-label={`${objectiveMarketingTitle(submittingBounty)} submission`}
                     className="my-auto max-h-[92vh] w-full max-w-3xl overflow-y-auto border border-white/15 bg-[#111521] p-4 shadow-2xl sm:p-7">
                     <div className="mb-5 flex items-start justify-between gap-4 border-b border-white/10 pb-4">
                       <div>
                         {singleScreenMedia ? (
                           <h2 className="text-lg font-semibold text-white">Submit {CONTENT_TYPE_LABEL[submittingBounty.content_type]?.toLowerCase() ?? "content"}</h2>
                         ) : <>
                           <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#B9FF1A]">
                             {submittingBounty.content_type === "feedback" ? "Share your feedback" : usesExistingContent ? regularBounty && nativeFile ? nativeStep === "preview" ? "Step 1 of 2 · Preview" : "Step 2 of 2 · Submission details" : "Preview content" : "Add content"}
                           </div>
                           <h2 className="mt-1 text-lg font-black uppercase text-white">{objectiveMarketingTitle(submittingBounty)}</h2>
                         </>}
                       </div>
                       <button type="button" aria-label="Close submission" onClick={closeSubmissionForm}
                         className="p-1 text-xl leading-none text-white/55 hover:text-white">×</button>
                     </div>
                     {!usesExistingContent
                       ? renderSubmissionForm(submittingBounty, submittingSlotIndex)
                       : <div className="space-y-5">
                           {(!showMediaDetails || singleScreenMedia) && <div className="overflow-hidden border border-white/10 bg-black/35">
                             {nativeFile && nativePreview ? (
                               submittingBounty.content_type === "screenshot"
                                  ? <img src={uploadedMediaUrl || nativePreview} alt={nativeFile.name} className="max-h-[52vh] w-full object-contain" />
                                  : <div className="mx-auto overflow-hidden bg-black" style={singleScreenMedia
                                      ? { width: "min(100%, 67.5dvh)", aspectRatio: "16 / 9" }
                                      : campaignVideoFrameStyle(submittingBounty.content_type)}>
                                      <video key={uploadedMediaUrl || nativePreview} src={uploadedMediaUrl || nativePreview}
                                        poster={uploadedThumbnailUrl ?? undefined} aria-label="Video preview"
                                        controls playsInline className="h-full w-full object-contain" />
                                    </div>
                             ) : selectedExistingMedia ? (
                               submittingBounty.content_type === "screenshot"
                                  ? selectedExistingMediaUrl || selectedExistingThumbnailUrl
                                    ? <img src={selectedExistingMediaUrl || selectedExistingThumbnailUrl || ""} alt={selectedExistingMedia.title || "Selected screenshot"} className="max-h-[52vh] w-full object-contain" />
                                    : <div className="flex min-h-56 items-center justify-center text-sm text-white/45">Loading preview…</div>
                                  : selectedExistingMediaUrl
                                    ? <div className="mx-auto overflow-hidden bg-black" style={campaignVideoFrameStyle(submittingBounty.content_type)}>
                                        <video key={selectedExistingMediaUrl} src={selectedExistingMediaUrl}
                                          poster={selectedExistingThumbnailUrl ?? undefined} controls playsInline className="h-full w-full object-contain" />
                                      </div>
                                    : selectedExistingThumbnailUrl
                                      ? <img src={selectedExistingThumbnailUrl} alt={selectedExistingMedia.title || "Selected video"} className="mx-auto max-h-[52vh] max-w-full object-contain" />
                                      : <div className="flex min-h-56 items-center justify-center text-sm text-white/45">Loading preview…</div>
                             ) : (
                               <div className="flex min-h-56 items-center justify-center text-sm text-white/45">Choose a file to preview it here.</div>
                             )}
                           </div>}
                           {showMediaDetails && <>
                             <BountySubmissionFields title={nativeTitle} description={nativeDescription} autoFocus={!singleScreenMedia}
                               disabled={Boolean(uploadedMedia) || nativeSubmitMutation.isPending || submitMutation.isPending}
                               onTitle={setNativeTitle} onDescription={setNativeDescription} />
                             <p className="text-sm text-white/75">You can submit this content type once each month.</p>
                           </>}
                           {regularBounty && nativeFile && !uploadedMedia && uploadLimitNotice(objectiveMaxMb(submittingBounty))}
                           <div className="flex flex-wrap items-center justify-between gap-3">
                             <span className="min-w-0 flex-1 truncate text-xs text-white/65">{nativeFile?.name ?? uploadedMedia?.title ?? "Choose campaign content"}</span>
                             {!nativeSubmitMutation.isPending && (!regularBounty || (!uploadedMedia && (singleScreenMedia || nativeStep === "preview"))) && <button type="button" onClick={() => document.getElementById(`campaign-files-${submittingBounty.id}`)?.click()}
                               className="text-[10px] font-bold uppercase text-white/55 hover:text-white">{nativeFile ? "Choose another file" : "Choose file"}</button>}
                           </div>
                           {(nativeSubmitMutation.isPending || nativeUploadStage === "processing") && (
                             <div role="status" aria-live="polite" className="space-y-2 text-xs font-bold text-white/70">
                               <div className="flex items-center gap-2"><Loader2 size={14} className="animate-spin text-[#B9FF1A]" />
                                 {nativeUploadStage === "processing" ? "Processing content…" : isNative ? "Uploading…" : `Uploading… ${nativeUploadPercent}%`}
                               </div>
                               <div className="h-1.5 overflow-hidden bg-white/10">
                                 <div className={`h-full bg-[#B9FF1A] transition-[width] ${isNative && nativeUploadStage !== "processing" ? "animate-pulse" : ""}`}
                                   style={{ width: `${isNative || nativeUploadStage === "processing" ? 100 : nativeUploadPercent}%` }} />
                               </div>
                             </div>
                           )}
                           {nativeUploadStage === "submitting" && <p role="status" className="text-xs text-white/60">Adding content to this campaign…</p>}
                           {nativeUploadError && <div role="alert" className="border border-red-300/20 bg-red-300/[0.08] p-3 text-xs text-red-200">
                             <div className="font-black uppercase">Upload failed</div><p className="mt-1">{nativeUploadError}</p>
                             {nativeFile && !regularBounty && <button type="button" onClick={() => startCampaignUpload(submittingBounty, submittingSlotIndex, nativeFile, true)}
                               disabled={nativeSubmitMutation.isPending} className="mt-2 font-black uppercase underline disabled:opacity-40">Try again</button>}
                           </div>}
                           {data.game_id && !nativeFile && (
                             <div className="border-t border-white/10 pt-4">
                               <div className="mb-3 flex items-center justify-between gap-3">
                                 <span className="text-[10px] font-black uppercase tracking-wider text-white/45">Or choose existing Gamefolio content</span>
                                 {pickerLoading && <Loader2 size={14} className="animate-spin text-white/40" />}
                               </div>
                               {pickerData?.items?.length
                                 ? <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                                     {pickerData.items.map((item: any) => {
                                       const thumbnailUrl = item.thumbnailUrl ? getPickerSignedUrl(item.thumbnailUrl) : null;
                                       return (
                                         <button key={item.id} type="button" onClick={() => setSelectedContentId(Number(item.id))}
                                           className={`relative overflow-hidden border text-left ${submittingBounty.content_type === "reel" ? "aspect-[9/16]" : "aspect-video"}`}
                                           style={{ borderColor: selectedContentId === Number(item.id) ? NEON : "rgba(255,255,255,.12)" }}>
                                           {thumbnailUrl ? <img src={thumbnailUrl} alt={item.title ?? "Existing campaign media"} className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-[10px] text-white/50">{item.title ?? "Media"}</span>}
                                         </button>
                                       );
                                     })}
                                   </div>
                                 : !pickerLoading && <p className="text-xs text-white/40">{pickerData ? "No matching content found." : "Loading existing content…"}</p>}
                             </div>
                           )}
                           <div className="flex flex-wrap justify-end gap-3 border-t border-white/10 pt-4">
                             <button type="button" onClick={closeSubmissionForm} className="px-4 py-2 text-xs font-black uppercase text-white/55 hover:text-white">Cancel</button>
                             {showMediaDetails && !singleScreenMedia && !uploadedMedia && !nativeSubmitMutation.isPending &&
                               <button type="button" onClick={() => { setNativeUploadError(null); setNativeStep("preview"); }} className="px-4 py-2 text-xs font-bold text-white">Back</button>}
                             <button type="button" onClick={() => {
                               if (needsPreviewStep) setNativeStep("details");
                               else void confirmCampaignMedia();
                             }}
                               disabled={nativeSubmitMutation.isPending || submitMutation.isPending || nativeUploadStage === "submitting"
                                 || (regularBounty && nativeFile
                                   ? (needsPreviewStep ? Boolean(nativeUploadError) : !nativeTitle.trim()
                                     || (!uploadedMedia && (uploadLimitsError || objectiveMaxMb(submittingBounty) == null)))
                                   : !selectedContentId && (uploadedMedia?.bountyId !== Number(submittingBounty.id) || uploadedMedia?.slotIndex !== submittingSlotIndex))}
                               className="inline-flex items-center gap-2 bg-[#B9FF1A] px-5 py-2.5 text-xs font-black uppercase text-[#070b10] disabled:cursor-not-allowed disabled:opacity-40">
                               {singleScreenMedia ? "Submit" : regularBounty ? needsPreviewStep ? "Next" : "Submit content" : "Confirm content"} <ChevronRight size={14} /> {submitMutation.isPending && <Loader2 size={13} className="animate-spin" />}
                             </button>
                           </div>
                         </div>}
                   </div>
                 </div>, document.body
               )}

              {awaitingFirstSubmission ? null : progressError ? <div role="alert" className="mt-8 border-t border-white/[0.08] pt-5 text-xs text-amber-200">We couldn&apos;t load your saved campaign content. <button type="button" onClick={() => void refetchProgress()} className="font-black underline">Retry</button></div>
                : isLoading || !progress ? <div role="status" className="mt-8 border-t border-white/[0.08] pt-5 text-xs text-white/50">Loading saved campaign content…</div>
                : <CampaignContentGallery objectives={progressBounties}
                    state={approvedCampaign ? "approved" : underReview ? "submitted" : changesRequested ? "changes_requested" : packageLocked ? "locked" : "draft"}
                    gameName={campaignGameTitle(data) ?? undefined}
                    submittedAt={underReview ? null : submissionSummary.submittedAt}
                    submittedCount={submissionSummary.count}
                    editableSubmissionIds={progressBounties.flatMap((objective: any) => {
                      const grouped = new Map<number, any>();
                      for (const [index, submission] of (objective.submissions ?? []).entries()) {
                        const slot = Number(submission.slot_index ?? index);
                        if (!Number.isInteger(slot) || slot < 0) continue;
                        if (!grouped.has(slot) || Number(submission.id) > Number(grouped.get(slot).id)) grouped.set(slot, submission);
                      }
                      return Array.from(grouped.values())
                        .filter((submission: any) => regularBounty ? submission.status === "changes_requested" : requestedSlotIsEditable(
                          objective.submissions ?? [], Number(submission.slot_index ?? 0),
                        ))
                        .map((submission: any) => Number(submission.id));
                    })}
                    busy={removeStagedMutation.isPending || submitMutation.isPending || submitPackageMutation.isPending}
                    onEdit={item => openSubmissionForm(item.objectiveId, item.slotIndex)}
                    onRemove={item => removeStagedMutation.mutate(item.id)} />}

              {!underReview && (!regularBounty || progressBounties.some((b:any)=>Number(b.staged_count)>0)) && <section className="mt-9 flex flex-col gap-4 border-y border-white/[0.14] py-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.14em] text-white">{regularBounty&&!approvedCampaign?"Saved content":approvedCampaign ? "All content approved" : underReview ? "Submission status · Under review" : changesRequested ? "Ready to resubmit" : readyToSubmit ? "All content ready" : `${preparedUnits} of ${requiredUnits} items prepared`}</div>
                    <p className="mt-1 text-xs text-white/45">{regularBounty&&!approvedCampaign&&!changesRequested?"Send your saved content for approval.":approvedCampaign ? "Your campaign content was approved." : underReview ? `Submitted to ${campaignGameTitle(data) ?? "the campaign owner"}${submittedAtLabel ? ` on ${submittedAtLabel}` : ""}. We’ll notify you when your submission has been reviewed.` : changesRequested ? "Only items marked for changes are editable. Approved work stays preserved. Check each replacement’s submission status." : readyToSubmit ? `Check each item’s status above. Draft items must be submitted for approval; submitted items are available to the developer.` : `${Math.max(0, requiredUnits - preparedUnits)} required item${requiredUnits - preparedUnits === 1 ? "" : "s"} remaining.`}</p>
                  </div>
                  {!packageLocked && progressBounties.some((b:any)=>Number(b.staged_count)>0) && <button type="button" onClick={() => setShowSubmitReview(true)} disabled={!readyToSubmit || nativeSubmitMutation.isPending || submitMutation.isPending || removeStagedMutation.isPending} className="inline-flex shrink-0 items-center justify-center gap-2 bg-[#B9FF1A] px-5 py-3 text-xs font-black uppercase text-[#070b10] disabled:cursor-not-allowed disabled:opacity-35"><Send size={14} /> {changesRequested ? "Resubmit for approval" : regularBounty?"Finish & send for review":"Submit for approval"} <ChevronRight size={14} /></button>}
              </section>}
              {showSubmitReview && (
                <div className="mt-5 border border-white/15 bg-black/35 p-4 sm:p-5" role="dialog" aria-modal="false" aria-labelledby="campaign-submit-confirm">
                   <div id="campaign-submit-confirm" className="text-xs font-black uppercase tracking-[0.18em] text-white">Submit campaign?</div>
                   <p className="mt-2 text-xs text-white/55">You&apos;re sending this content to <strong className="text-white/80">{campaignGameTitle(data) ?? data.campaign_title ?? "the campaign owner"}</strong>:</p>
                   <ul className="mt-3 grid gap-x-6 gap-y-1 text-xs text-white/70 sm:grid-cols-2">
                     {contentRequirements.map(item => <li key={item} className="flex items-center gap-2"><Check size={12} className="shrink-0 text-[#B9FF1A]" />{item}</li>)}
                   </ul>
                   <p className="mt-3 text-[10px] leading-relaxed text-white/40">Once sent, your content will be locked while the campaign owner reviews it.</p>
                   <div className="mt-4 flex flex-wrap justify-end gap-2"><button type="button" onClick={() => setShowSubmitReview(false)} className="px-4 py-2 text-[10px] font-black uppercase text-white/55 hover:text-white">Go back</button><button type="button" onClick={() => submitPackageMutation.mutate()} disabled={submitPackageMutation.isPending || !readyToSubmit} className="inline-flex items-center gap-2 bg-[#B9FF1A] px-4 py-2 text-[10px] font-black uppercase text-[#070b10] disabled:opacity-40">{submitPackageMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Submit</button></div>
                </div>
              )}
               {submissionCommitted && createPortal(
                 <div className={`fixed inset-0 z-[200002] flex items-center justify-center bg-black/55 p-4 backdrop-blur-md transition-opacity duration-500 ${commitFading ? "opacity-0" : "opacity-100"}`} role="presentation">
                   <div role="dialog" aria-modal="true" aria-label="Campaign submission status"
                     className={`w-full max-w-md border bg-background/95 p-7 text-center shadow-2xl transition-all duration-500 sm:p-9 ${commitAnimationDone ? "scale-100 border-[#B9FF1A]/45 opacity-100" : "scale-[0.98] border-white/15 opacity-90"} ${commitFading ? "translate-y-1 opacity-0" : ""}`}>
                     {commitAnimationDone ? (
                       <>
                         <div className="mx-auto flex h-12 w-12 animate-[bounce_.45s_ease-out] items-center justify-center border border-[#B9FF1A]/50 text-[#B9FF1A]"><Check size={26} strokeWidth={3} /></div>
                         <h2 className="mt-5 text-lg font-black uppercase tracking-[0.12em] text-white">Submission committed</h2>
                         <p className="mt-3 text-sm leading-relaxed text-white/70">Your campaign has been sent to <strong className="text-white">{campaignGameTitle(data) ?? "the game owner"}</strong> for review.</p>
                         <p className="mt-2 text-xs text-white/45">We&apos;ll notify you when your submission has been reviewed.</p>
                         <div className="mt-6 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-amber-200"><Clock size={13} /> Now under review</div>
                       </>
                     ) : (
                       <div role="status" aria-live="polite">
                         <div className="text-xs font-black uppercase tracking-[0.18em] text-[#B9FF1A]">Committing your submission</div>
                         <div className="mt-5 flex justify-center gap-5">
                           {mandatory.map((objective: any) => {
                             const Icon = CONTENT_TYPE_ICON[objective.content_type] ?? Target;
                             return <div key={objective.id} className={`flex h-9 w-9 items-center justify-center border transition-colors duration-500 ${commitAnimationRunning ? "border-[#B9FF1A]/60 text-[#B9FF1A]" : "border-white/20 text-white/35"}`}><Icon size={17} /></div>;
                           })}
                         </div>
                         <div className="mt-6 h-1 overflow-hidden bg-white/10"><div className="h-full bg-[#B9FF1A] transition-[width] ease-out" style={{ width: commitAnimationRunning ? "100%" : "0%", transitionDuration: "1200ms" }} /></div>
                       </div>
                     )}
                   </div>
                 </div>,
                 document.body
               )}
            </>
          );
        })()}

      </div>
    </div>
  );
}

function CampaignStartedModal({ campaign, result, onCreate, onViewMy }: {
  campaign: any;
  result: any;
  onCreate: () => void;
  onViewMy: () => void;
}) {
  const first = result.firstCampaign === true;
  const regular = isRegularBounty(campaign);
  const deadline = result.deadline ? new Date(result.deadline) : null;
  return createPortal(
    <div className="fixed inset-0 z-[200001] flex items-center justify-center bg-black/85 px-4" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="campaign-started-title"
        className="relative w-full max-w-lg overflow-hidden border border-[#B9FF1A]/35 bg-background p-7 text-white shadow-[0_0_75px_rgba(185,255,26,0.12)] sm:p-9">
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-[#B9FF1A]/10 blur-3xl animate-pulse" aria-hidden="true" />
        {first && <div className="relative text-[10px] font-black uppercase tracking-[0.22em] text-[#B9FF1A]">Your first campaign</div>}
        <div className="relative mt-2 flex h-12 w-12 items-center justify-center border border-[#B9FF1A]/40 bg-[#B9FF1A]/10 text-[#B9FF1A]"><Check size={25} /></div>
        <h2 id="campaign-started-title" className="relative mt-5 text-3xl font-black uppercase tracking-tight">
          {first ? "Campaign started!" : "You’ve joined the campaign!"}
        </h2>
        <p className="relative mt-3 text-sm leading-relaxed text-white/60">
          {regular ? "Confirm your game access and submit your content when it’s ready." : first
            ? "You’re officially taking part. Your place is reserved; reveal or confirm access when you are ready to start the submission deadline."
            : "Your place is reserved. Reveal or confirm access when you are ready to start the submission deadline."}
        </p>
        {typeof result.key === "string" && result.key.length > 0 && <div className="relative mt-5 border border-[#B9FF1A]/30 bg-[#B9FF1A]/[0.06] p-4">
          <div className="text-[10px] font-black uppercase tracking-widest text-[#B9FF1A]">Your game key</div>
          <code className="mt-2 block break-all text-sm font-bold text-white">{result.key}</code>
        </div>}
        <dl className="relative mt-6 space-y-3 border-y border-white/10 py-5 text-sm">
          {[
            ["Campaign", campaign.campaign_title || campaign.template_name],
            ...(!regular ? [["Submission deadline", deadline && !Number.isNaN(deadline.getTime()) ? deadline.toLocaleString() : "Starts when access is confirmed"]] : []),
            ["Objectives", String(configuredObjectives(campaign.bounties).length)],
            ["Game key", typeof result.key === "string" && result.key.length > 0
              ? "Displayed above"
              : result.accessKeyAvailable ? "Reserved — reveal it in campaign details" : "No key required"],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4"><dt className="text-white/40">{label}</dt><dd className="text-right font-bold text-white/85">{value}</dd></div>
          ))}
        </dl>
        <button type="button" autoFocus onClick={onCreate} className="relative mt-6 w-full bg-[#B9FF1A] px-5 py-3 text-sm font-black uppercase text-[#0F101B]">Start Creating</button>
        <button type="button" onClick={onViewMy} className="relative mt-3 w-full py-2 text-xs font-bold text-white/55 hover:text-white">View My Campaigns</button>
      </div>
    </div>,
    document.body,
  );
}

function gameBountyDestination(campaign: any) {
  // Only linked indie profiles have the public game workspace.
  const id = bountyInstanceId(campaign);
  return campaign?.game_profile_developer_id && campaign.catalog_game_name && Number.isSafeInteger(id) && id > 0
    ? publicGameBountyPath(campaign.catalog_game_name, id)
    : null;
}

function GamePageBountyOpportunity({ campaign, participation, otherOpportunity, onJoined }: {
  campaign: any;
  participation: any;
  otherOpportunity: boolean;
  onJoined: (campaign: any, result: any) => void;
}) {
  const { user } = useAuth();
  const { openModal } = useAuthModal();
  const [preparedMedia, setPreparedMedia] = useState<PreparedBountyMedia>();
  const [preparedText, setPreparedText] = useState("");
  const [preparedRating, setPreparedRating] = useState<number>();
  const regular = isRegularBounty(campaign);
  const directSubmission = Boolean(user && !isIndieDeveloperUser(user) && canStartBountyOnSubmission(campaign));
  const capacity = Number(campaign.max_places ?? campaign.participant_capacity ?? 0);
  const openForSubmission = ["live", "approved", "in_progress"].includes(campaign.status)
    && !campaign.applications_paused
    && (!campaign.end_date || new Date(campaign.end_date).getTime() > Date.now())
    && (capacity <= 0 || Number(campaign.participant_count ?? 0) < capacity);
  const draft = regular ? {
    preparedMedia,
    onPreparedMedia: (media: PreparedBountyMedia | null) => setPreparedMedia(media ?? undefined),
    preparedText,
    onPreparedText: setPreparedText,
    preparedRating,
    onPreparedRating: setPreparedRating,
  } : {};

  return participation || (directSubmission && openForSubmission)
    ? <CampaignProgress key={user?.id} campaign={{ ...campaign, ...participation, instance_id: bountyInstanceId(campaign) }}
        onBack={() => {}} embedded directSubmission={directSubmission} {...draft} />
    : <CampaignDetail campaign={campaign} onBack={() => {}} onJoined={onJoined}
        onSignIn={() => openModal()} embedded compactPreview otherOpportunity={otherOpportunity} {...draft} />;
}

export function GameBountiesTab({ gameId, developerId, selectedId, onSelect }: {
  gameId: number;
  developerId: number;
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}) {
  const { user, authResolved } = useAuth();
  const search = useSearch();
  const [, navigate] = useLocation();
  const [joinedHere, setJoinedHere] = useState<any>(null);
  const [joinResult, setJoinResult] = useState<any>(null);
  const viewerId = user?.id;
  const canParticipate = Boolean(viewerId) && !isIndieDeveloperUser(user);
  const belongsToGame = (campaign: any) =>
    Number(campaign?.game_id) === gameId && Number(campaign?.developer_user_id) === developerId;
  const available = useQuery<any[]>({
    queryKey: ["/api/bounties", "game", gameId, viewerId],
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: query => query.state.data?.some(isRegularBounty) ? 60_000 : false,
    queryFn: async () => {
      const response = await authedFetch(`/api/bounties?gameId=${gameId}`, { method: "GET" });
      if (!response.ok) throw new Error("Could not load bounties");
      return response.json();
    },
  });
  const currentBountyIds = new Set((available.data ?? []).filter(belongsToGame).map(bountyInstanceId));
  const joined = useQuery<any[]>({
    queryKey: ["/api/bounties/my/campaigns"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: canParticipate,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: (query) => canParticipate && query.state.data?.some(
      campaign => belongsToGame(campaign) && campaignTabStatus(campaign) === "submitted",
    ) ? 30_000 : false,
  });
  const participations = new Map<number, any>();
  if (canParticipate) {
    if (joinedHere?.viewerId === viewerId && (!isRegularBounty(joinedHere.campaign) || currentBountyIds.has(bountyInstanceId(joinedHere.campaign)))) {
      participations.set(bountyInstanceId(joinedHere.campaign), joinedHere.campaign);
    }
    for (const campaign of joined.data ?? []) {
      const id = bountyInstanceId(campaign);
      if (belongsToGame(campaign) && (!isRegularBounty(campaign) || currentBountyIds.has(id))) {
        participations.set(id, campaign);
      }
    }
  }
  const detail = useQuery<any>({
    queryKey: ["/api/bounties", "game", gameId, "detail", selectedId, viewerId],
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: query => isRegularBounty(query.state.data) ? 60_000 : false,
    queryFn: async () => {
      const response = await authedFetch(`/api/bounties/${selectedId}`, { method: "GET" });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error("Could not load this bounty");
      return response.json();
    },
    enabled: selectedId !== null && !participations.has(selectedId),
  });
  const opportunities = new Map<number, any>();
  for (const campaign of available.data ?? []) {
    if (belongsToGame(campaign)) opportunities.set(bountyInstanceId(campaign), campaign);
  }
  participations.forEach((participation, id) => {
    opportunities.set(id, { ...opportunities.get(id), ...participation, id, instance_id: id });
  });
  const detailId = belongsToGame(detail.data) ? bountyInstanceId(detail.data) : null;
  const activeSelectedId = detailId ?? selectedId;
  if (detailId !== null && !participations.has(detailId)) {
    opportunities.set(detailId, { ...opportunities.get(detailId), ...detail.data });
  }

  const handleJoined = (campaign: any, result: any) => {
    setJoinedHere({ campaign, viewerId });
    setJoinResult(result);
    onSelect(bountyInstanceId(campaign));
  };
  const loadingParticipation = !authResolved || (canParticipate && joined.isPending);
  const selectedLoading = selectedId !== null && (loadingParticipation
    || (!participations.has(selectedId) && detail.isPending));
  const selectedUnavailable = selectedId !== null && !selectedLoading
    && !participations.has(selectedId) && !belongsToGame(detail.data);
  const selectedCampaign = activeSelectedId === null ? null : opportunities.get(activeSelectedId);
  const contentOrder = Object.keys(SUBMISSION_SECTION_LABELS);
  const sortRank = (campaign: any) => {
    if (!isRegularBounty(campaign)) return contentOrder.length;
    const typeIndex = contentOrder.indexOf(configuredObjectives(campaign.bounties)[0]?.content_type);
    return typeIndex < 0 ? contentOrder.length : typeIndex;
  };
  const orderedOpportunities = Array.from(opportunities)
    .sort(([, left], [, right]) => sortRank(left) - sortRank(right));
  const hasOpenBounties = available.data?.some(campaign => belongsToGame(campaign) && isRegularBounty(campaign));
  const openBounties = orderedOpportunities.map(([, campaign]) => campaign)
    .filter(campaign => currentBountyIds.has(bountyInstanceId(campaign)));
  const primaryAccess = openBounties.find(isRegularBounty)
    ?? openBounties.find(campaign => bountyInstanceId(campaign) === activeSelectedId)
    ?? openBounties[0];
  const reservedAccess = bountyNeedsKey(primaryAccess) && isRegularBounty(primaryAccess)
    ? openBounties.find(campaign => isRegularBounty(campaign) && campaign.access_method === primaryAccess.access_method
      && ['joined', 'accepted', 'active', 'in_progress', 'access_reserved', 'access_accepted'].includes(campaign.participant_status))
    : undefined;
  const previewKeyClaim = import.meta.env.DEV && window.location.hostname === '127.0.0.1'
    && new URLSearchParams(search).get('testBountyKey') === '1';
  const gateCampaign = previewKeyClaim && primaryAccess
    ? { ...primaryAccess, access_method: 'full_game_upfront', requires_access_key: true,
      full_access_keys_remaining: 1, has_game_access: false, access_revealed_at: null, participant_status: null }
    : isIndieDeveloperUser(user) ? undefined : reservedAccess ?? primaryAccess;

  return <GameBountyGate key={`${gameId}:${viewerId ?? 'guest'}:${previewKeyClaim}`} gameId={gameId} viewerId={viewerId}
    campaign={gateCampaign} previewKeyClaim={previewKeyClaim}>
    {locked => <section className="space-y-5" aria-labelledby="game-bounties-heading">
    <header>
      <h2 id="game-bounties-heading" tabIndex={-1} className="text-2xl font-bold">Available bounties</h2>
      {hasOpenBounties ? (
        <div className="mt-3 flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#B9FF1A]/10 text-[#B9FF1A]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6.5 8.5C9 8.5 10.5 11 12 13s3 4.5 5.5 4.5a4.5 4.5 0 0 0 0-9C15 8.5 13.5 11 12 13s-3 4.5-5.5 4.5a4.5 4.5 0 0 1 0-9Z" />
              <path d="M19.5 2v4m-2-2h4" />
            </svg>
          </span>
          <p className="text-sm leading-5 text-white/75">
            <strong className="block text-white">This game has opted into bounties.</strong>
            Submit one piece of content per bounty type each month. You’ll earn XP when the developer approves your submission.
          </p>
        </div>
      ) : (
        <p className="mt-2 text-sm text-white/70">Choose what you’d like to create. Rewards are awarded after your work is approved.</p>
      )}
    </header>
    {isIndieDeveloperUser(user) && (
      <p className="text-sm text-white/65">You’re previewing this tab as a developer. Creator accounts can join bounties here.</p>
    )}
    {available.isError && (
      <p role="alert" className="text-sm">Bounties couldn’t be loaded. <button className="text-[#B9FF1A] underline" onClick={() => void available.refetch()}>Try again</button></p>
    )}
    {canParticipate && joined.isError && (
      <p role="alert" className="text-sm">Your bounty progress couldn’t be loaded. <button className="text-[#B9FF1A] underline" onClick={() => void joined.refetch()}>Try again</button></p>
    )}
    {(available.isPending || selectedLoading) && <p role="status" className="text-sm text-white/70">Loading bounties…</p>}
    {selectedUnavailable && !detail.isError && <p role="status" className="text-sm text-white/70">This bounty is unavailable for this game.</p>}
    {detail.isError && !selectedLoading && !participations.has(selectedId ?? 0) && (
      <p role="alert" className="text-sm">This bounty’s details couldn’t be loaded. <button className="text-[#B9FF1A] underline" onClick={() => void detail.refetch()}>Try again</button></p>
    )}
    {!available.isPending && !available.isError && !opportunities.size && (
      <p className="rounded-xl border border-white/10 p-5 text-sm text-white/70">There are no open bounties for this game right now.</p>
    )}
    <ul className="space-y-3">
      {orderedOpportunities.map(([id, campaign]) => {
        const participation = participations.get(id);
        const regular = isRegularBounty(campaign);
        const objective = configuredObjectives(campaign.bounties)[0];
        const BountyIcon = regular && objective ? CONTENT_TYPE_ICON[objective.content_type] ?? Target : Target;
        const title = regular && objective
          ? CONTENT_TYPE_LABEL[objective.content_type] ?? objective.title
          : campaign.campaign_title || campaign.template_name || "Bounty";
        const days = regular ? 0 : Number(campaign.creator_deadline_days ?? 0);
        const due = !regular && participation?.deadline ? formatCampaignMoment(participation.deadline) : null;
        const xp = Number(campaign.total_campaign_xp ?? 0);
        const expanded = !locked && activeSelectedId === id;
        const completed = Boolean(participation && campaignTabStatus(participation) === "completed");
        const border = completed && !expanded ? "border-[#B9FF1A]/50" : "border-white/10";
        return <li key={id} className={`rounded-xl border ${border} bg-white/[0.035]`}>
          <button type="button" aria-expanded={expanded} aria-controls={expanded ? `game-bounty-${id}` : undefined}
            onClick={() => onSelect(expanded ? null : id)}
            className={`flex w-full items-center gap-4 rounded-xl p-4 text-left ${completed ? "bg-[#B9FF1A]/10 text-[#B9FF1A] hover:bg-[#B9FF1A]/15" : "hover:bg-white/5"}`}>
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#B9FF1A]/10 text-[#B9FF1A]">
              <BountyIcon size={22} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <strong className={`block text-lg leading-tight sm:text-xl ${completed ? "line-through" : ""}`}>{title}</strong>
              <span className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm text-white/70">
                {xp > 0 && <span className="text-base font-bold text-[#B9FF1A] sm:text-lg">{xp.toLocaleString()} Bounty XP</span>}
                {completed ? (
                  <span className="inline-flex items-center gap-1 font-semibold text-[#B9FF1A]">
                    <Check size={14} aria-hidden="true" /> Completed
                  </span>
                ) : (
                  <>
                    {due ? <span>Due {due.dateLabel}</span> : days > 0 && <span>{days} days after accepting access</span>}
                    {participation && <span className="capitalize">{String(campaignJourneyStatus(participation)).replace(/_/g, " ")}</span>}
                  </>
                )}
              </span>
            </span>
            <ChevronDown size={18} aria-hidden="true" className={expanded ? "shrink-0 rotate-180" : "shrink-0"} />
          </button>
          {expanded && <div id={`game-bounty-${id}`} className="game-bounty-section public-game-bounty-panel">
            {!selectedLoading && (participation || (detailId === id && (!canParticipate || !joined.isError))) && (
              <GamePageBountyOpportunity campaign={campaign} participation={participation}
                otherOpportunity={Boolean(otherActiveGameOpportunity(Array.from(participations.values()), campaign))}
                onJoined={handleJoined} />
            )}
          </div>}
        </li>;
      })}
    </ul>
    {joinResult && selectedCampaign && <CampaignStartedModal campaign={selectedCampaign} result={joinResult}
      onCreate={() => setJoinResult(null)} onViewMy={() => navigate("/bounties?tab=my")} />}
  </section>}
  </GameBountyGate>;
}

function MyCampaigns({ onViewProgress }: { onViewProgress: (campaign: any) => void }) {
  const [myTab, setMyTab] = useState<MyTab>("active");
  const [sortBy, setSortBy] = useState<"recent" | "ending" | "completion" | "reward">("recent");
  const { user } = useAuth();
  const canParticipate = !isIndieDeveloperUser(user);

  const { data: campaigns = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/bounties/my/campaigns"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user && canParticipate,
  });

  const tabs: { key: MyTab; label: string }[] = [
    { key: "active",    label: "Active" },
    { key: "submitted", label: "Under Review" },
    { key: "completed", label: "Completed" },
    { key: "expired",   label: "Expired" },
  ];
  const filter = (tab: MyTab) => (campaigns as any[]).filter(c => campaignTabStatus(c) === tab);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3">
        <Lock size={32} className="text-white/20" />
        <div className="text-white/40 font-bold">Sign in to see your campaigns</div>
        <a href="/auth" className="text-sm font-black" style={{ color: NEON }}>Sign In →</a>
      </div>
    );
  }

  if (!canParticipate) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3 text-center">
        <Lock size={32} className="text-white/20" />
        <div className="text-white/65 font-black">Creator missions are view-only for Indie developers</div>
        <div className="max-w-md text-xs leading-relaxed text-white/35">
          You can browse campaigns in the Bounty Hub and manage your own campaigns from the developer dashboard, but you cannot join or complete campaigns as a creator.
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-white/30" /></div>;
  }

  const currentCampaigns = filter(myTab).sort((a, b) => {
    if (sortBy === "ending") {
      const aDate = new Date(campaignDeadline(a) ?? "9999-12-31").getTime();
      const bDate = new Date(campaignDeadline(b) ?? "9999-12-31").getTime();
      return aDate - bDate;
    }
    if (sortBy === "completion") {
      const aProgress = campaignProgressUnits(a);
      const bProgress = campaignProgressUnits(b);
      const aPct = aProgress.requiredUnits > 0 ? aProgress.approvedUnits / aProgress.requiredUnits : 0;
      const bPct = bProgress.requiredUnits > 0 ? bProgress.approvedUnits / bProgress.requiredUnits : 0;
      return bPct - aPct;
    }
    if (sortBy === "reward") {
      const rewardTotal = (campaign: any) => campaignRewardSummary(campaign)
        .reduce((sum, reward) => sum + Number(reward.label.match(/[\d,]+/)?.[0]?.replace(/,/g, "") ?? 0), 0);
      return rewardTotal(b) - rewardTotal(a);
    }
    return new Date(b.joined_at ?? 0).getTime() - new Date(a.joined_at ?? 0).getTime();
  });

  return (
    <div className="space-y-5 pb-24 sm:pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Status navigation */}
        <div className="flex gap-1 p-1 rounded-xl overflow-x-auto" style={{ background: "rgba(255,255,255,0.035)" }} role="tablist" aria-label="Campaign status">
        {tabs.map(t => {
          const count = filter(t.key).length;
          return (
            <button
              key={t.key}
              onClick={() => setMyTab(t.key)}
              role="tab"
              aria-selected={myTab === t.key}
              className="flex items-center justify-center gap-2 min-w-max px-3.5 py-2 rounded-lg text-xs font-bold transition-all"
              style={myTab === t.key
                ? { background: NEON, color: "#0F101B" }
                : { background: "transparent", color: "rgba(255,255,255,0.58)" }}
            >
              {t.label}
              <span
                className="min-w-4 h-4 px-1 rounded-full text-[9px] font-black flex items-center justify-center"
                style={{ color: myTab === t.key ? "#0F101B" : "rgba(255,255,255,0.58)" }}
              >
                  {count}
              </span>
            </button>
          );
        })}
        </div>

        <label className="flex items-center gap-2 self-start sm:self-auto text-[11px] font-bold text-white/40">
          <SlidersHorizontal size={13} />
          Sort by
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as typeof sortBy)}
            className="rounded-lg px-2.5 py-2 text-[11px] font-bold text-white outline-none cursor-pointer"
            style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}
          >
            <option value="recent">Recently joined</option>
            <option value="ending">Ending soon</option>
            <option value="completion">Closest to completion</option>
            <option value="reward">Highest reward</option>
          </select>
        </label>
      </div>

      {currentCampaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-2">
          <Trophy size={28} className="text-white/20" />
          <div className="text-white/40 text-sm font-bold">No {myTab} campaigns</div>
          {myTab === "active" && <div className="text-white/30 text-xs">Browse the Marketplace to find and join campaigns</div>}
        </div>
      ) : (
        <div className="space-y-2.5">
          {currentCampaigns.map((c: any) => {
            const effectiveStatus = campaignJourneyStatus(c);
            const statusIsCompleted = ["completed", "completed_and_verified", "full_game_awarded"].includes(effectiveStatus);
            const statusIsReview = ["under_review", "submitted_for_review", "pending", "pending_application", "application_pending"].includes(effectiveStatus);
            const statusLabel = statusIsCompleted
              ? "Completed"
              : statusIsReview
                ? "Under Review"
                : effectiveStatus === "expired"
                  ? "Expired"
                  : "In Progress";
            const progress = campaignProgressUnits(c);
            const requiredUnits = progress.requiredUnits;
            const progressUnits = Math.max(progress.approvedUnits, progress.submittedUnits, progress.preparedUnits);
            const pct = requiredUnits > 0 ? Math.min(100, Math.round((progressUnits / requiredUnits) * 100)) : 0;
            const nextObjective = campaignNextObjective(c, progress);
            const deadlineLabel = campaignDeadlineLabel(c);
            const deadlineUrgency = campaignDeadlineUrgency(c);
            const rewards = campaignRewardSummary(c);
            const needsAction = effectiveStatus === "changes_requested";
            const demoKeyActive = Boolean(c.demo_key_value || c.demo_key_id);
            const fullKeyActive = Boolean(c.full_key_value || c.full_key_id);
            const campaignState = campaignTabStatus(c);
            const deadlineTone = deadlineUrgency === "expired"
              ? { color: "rgba(248,113,113,0.78)" }
              : deadlineUrgency === "critical"
                ? { color: "#fbbf24" }
                : deadlineUrgency === "urgent"
                  ? { color: "#fbbf24" }
                  : deadlineUrgency === "soon"
                    ? { color: "rgba(255,255,255,0.72)" }
                    : { color: "rgba(255,255,255,0.58)" };
            const ctaLabel = campaignState === "expired"
              ? "View Campaign"
              : needsAction
                ? "Continue Campaign"
                : campaignState === "submitted"
                ? "View Campaign"
                : campaignState === "completed"
                  ? "View Rewards"
                  : "Continue Campaign";

            return (
              <div
                key={c.instance_id}
                role="button"
                tabIndex={0}
                aria-label={`${c.campaign_title || c.template_name || "Campaign"} — ${ctaLabel}`}
                onClick={() => onViewProgress(c)}
                onKeyDown={event => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onViewProgress(c);
                  }
                }}
                className="group rounded-xl px-3.5 py-3 sm:px-4 sm:py-3.5 cursor-pointer transition-[background,border-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B9FF1A]/70"
                style={{
                  background: CARD_BG,
                  border: `1px solid ${CARD_BORDER}`,
                }}
                onMouseEnter={event => {
                  event.currentTarget.style.background = "rgba(255,255,255,0.055)";
                  event.currentTarget.style.borderColor = "rgba(255,255,255,0.16)";
                }}
                onMouseLeave={event => {
                  event.currentTarget.style.background = CARD_BG;
                  event.currentTarget.style.borderColor = CARD_BORDER;
                }}
              >
                <div className="flex flex-col gap-3 sm:grid sm:grid-cols-[minmax(220px,0.9fr)_minmax(250px,1.4fr)_auto] sm:items-center sm:gap-5">
                  <div className="flex items-center gap-3 min-w-0">
                  <CampaignRowArtwork campaign={c} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-white/40 font-bold">{c.game_name}</div>
                    <div className="text-sm font-black text-white leading-tight truncate">{c.campaign_title || c.template_name}</div>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.12em]"
                        style={{ color: statusIsCompleted ? NEON : statusIsReview ? "rgba(255,255,255,0.72)" : effectiveStatus === "expired" ? "rgba(255,255,255,0.42)" : "rgba(255,255,255,0.72)" }}>
                        {statusIsCompleted ? <Check size={11} strokeWidth={3} /> : !statusIsReview && effectiveStatus !== "expired" ? <span className="h-1.5 w-1.5 rounded-full" style={{ background: NEON }} /> : null}
                        {statusLabel}
                      </span>
                      {needsAction && <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-amber-300/80">Action required</span>}
                    </div>
                  </div>
                </div>

                  <div className="min-w-0">
                    <div className="flex items-center justify-between gap-3 mb-1.5">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-white/35">Required progress</div>
                      <div className="text-[11px] font-black tabular-nums" style={{ color: NEON }}>{progressUnits}/{requiredUnits || 0}</div>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.10)" }}>
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: NEON }} />
                    </div>
                    <div className="flex items-end justify-between gap-3 mt-2.5">
                      <div className="min-w-0">
                        <div className="text-[9px] font-black uppercase tracking-[0.16em]" style={{ color: NEON }}>Up next</div>
                        <div className="text-[11px] font-bold text-white/85 truncate mt-0.5">{nextObjective.title}</div>
                        {nextObjective.detail && nextObjective.detail !== nextObjective.title && (
                          <div className="text-[10px] text-white/52 truncate mt-0.5">{nextObjective.detail}</div>
                        )}
                      </div>
                      {nextObjective.progress && <span className="text-[11px] font-black tabular-nums text-white/55 whitespace-nowrap">{nextObjective.progress}</span>}
                    </div>
                  </div>

                  <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-4 sm:min-w-[175px]">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0">
                      {rewards.map((reward, index) => <CampaignRewardChip key={`${reward.label}-${index}`} {...reward} />)}
                      {demoKeyActive && <CampaignRewardChip icon={Key} label="Demo key active" tone={NEON} />}
                      {fullKeyActive && <CampaignRewardChip icon={Gift} label="Full game claimed" tone={NEON} />}
                    </div>
                    {!isRegularBounty(c) && <div
                      className="flex items-center gap-1 text-[10px] font-bold whitespace-nowrap"
                      style={{ color: deadlineTone.color }}
                      aria-label={`Campaign deadline: ${deadlineLabel}`}
                    >
                      <Clock size={11} />
                      {c.deadline ? `${new Date(c.deadline).toLocaleDateString()} · ${deadlineLabel}` : deadlineLabel}
                    </div>}
                    <button
                      type="button"
                      onClick={event => {
                        event.stopPropagation();
                        onViewProgress(c);
                      }}
                      className="w-full sm:w-auto flex-shrink-0 px-3.5 py-2 rounded-lg text-xs font-black flex items-center justify-center gap-1 transition-all hover:brightness-110"
                      style={{ background: NEON, color: "#070b10" }}
                    >
                      {ctaLabel}
                      <ChevronRight className="transition-transform duration-200 group-hover:translate-x-0.5" size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DeveloperBountyHubPrompt() {
  const [,setLocation]=useLocation();
  const {isEligible,overview}=useDeveloperBountySummary();
  if(!isEligible)return null;
  return <section className="border-b border-[#303448] bg-background px-6 py-8 sm:px-8 lg:px-16"><div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-6"><div><p className="text-xs font-semibold uppercase tracking-widest text-[#B7FF18]">For game developers</p><h2 className="mt-3 text-3xl font-bold text-white">Open your game to creators</h2><p className="mt-3 max-w-2xl text-base leading-7 text-[#C4CBD8]">Add game access and let gamers and streamers discover opportunities in the Bounty Hub. Included with Indie Game Pro.</p><p className="mt-2 text-sm text-[#C4CBD8]">Participation, content and streaming activity are not guaranteed.</p></div><div className="flex flex-wrap gap-3"><button className="min-h-12 rounded-lg bg-[#B7FF18] px-6 font-semibold text-[#0F101B]" onClick={()=>setLocation('/game-dashboard?tab=campaigns&campaignSub=bounties')}>Open Bounties <ChevronRight size={16} className="inline"/></button>{Number(overview?.activeCampaigns)>0&&<button className="min-h-12 rounded-lg border border-[#454D60] bg-[#171C2A] px-5 font-semibold text-white" onClick={()=>setLocation('/game-dashboard?tab=campaigns&campaignSub=my')}>Manage campaigns</button>}</div></div></section>;
}

export default function BountiesPage() {
  const [, setLocation] = useLocation();
  const routeSearch = useSearch();
  const requestedTab = new URLSearchParams(routeSearch).get("tab");
  const [mainTab, setMainTab] = useState<MainTab>(requestedTab === "my" || requestedTab === "reward-pool" ? requestedTab : "marketplace");
  const [view, setView]                     = useState<View>("marketplace");
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [progressCampaign, setProgressCampaign] = useState<any>(null);
  const [joinResult, setJoinResult] = useState<any>(null);
  const [search, setSearch]                 = useState("");
  const [activeFilters, setActiveFilters]   = useState<Set<string>>(new Set());
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const { user } = useAuth();

  const scrollCampaignToTop = useCallback(() => {
    const main = document.querySelector<HTMLElement>("main.profile-theme-main");
    if (main) {
      main.scrollTo({ top: 0, left: 0, behavior: "auto" });
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  }, []);

  useEffect(() => {
    setMainTab(requestedTab === "my" || requestedTab === "reward-pool" ? requestedTab : "marketplace");
  }, [requestedTab]);

  const openTab = (tab: MainTab) => {
    setMainTab(tab);
    setLocation(`/bounties?tab=${tab}`);
    scrollCampaignToTop();
  };

  const { data: allCampaigns = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/bounties"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
  const { data: joinedCampaigns, isLoading: joinedLoading } = useQuery<any[]>({
    queryKey: ["/api/bounties/my/campaigns"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: Boolean(user) && !isIndieDeveloperUser(user),
  });
  const routeCampaignId = Number(new URLSearchParams(routeSearch).get("campaign"));
  const { data: linkedCampaign, isLoading: linkedLoading } = useQuery<any>({
    queryKey: ["/api/bounties", routeCampaignId],
    queryFn: async () => {
      const response = await fetch(`/api/bounties/${routeCampaignId}`, { credentials: "include" });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error("Could not load campaign");
      return response.json();
    },
    enabled: Number.isInteger(routeCampaignId) && routeCampaignId > 0
      && !allCampaigns?.some((c: any) => Number(c.id) === routeCampaignId),
  });

  useEffect(() => {
    if (!Number.isInteger(routeCampaignId) || routeCampaignId <= 0) {
      setView("marketplace");
      return;
    }
    if (isLoading || joinedLoading || linkedLoading) return;
    const joined = joinedCampaigns?.find((c: any) => Number(c.instance_id) === routeCampaignId);
    if (joined && !isIndieDeveloperUser(user)) {
      setProgressCampaign(joined);
      setView("progress");
      return;
    }
    // The freshly joined campaign is already in memory while the My Campaigns
    // query is invalidating; don't briefly flash the available state.
    if (progressCampaign && Number(progressCampaign.instance_id) === routeCampaignId) return;
    const available = allCampaigns?.find((c: any) => Number(c.id) === routeCampaignId) ?? linkedCampaign;
    if (available) {
      setSelectedCampaign(available);
      setView("detail");
    }
  }, [routeCampaignId, isLoading, joinedLoading, linkedLoading, joinedCampaigns, allCampaigns, linkedCampaign, user, progressCampaign]);

  // The hub is available to every authenticated Gamefolio user. This includes
  // Gamefolio-managed starter campaigns alongside developer campaigns.
  const availableCampaigns = useMemo(() => groupDiscoveryGames(allCampaigns), [allCampaigns]);
  const rewardPoolGames = useMemo(() => {
    const games = new Map<number, any>();
    for (const campaign of availableCampaigns) {
      const gameId = Number(campaign.game_id);
      if (gameId > 0 && campaign.game_profile_name && (!games.has(gameId) || campaign.discovery_opportunities)) {
        games.set(gameId, campaign);
      }
    }
    return Array.from(games.values());
  }, [availableCampaigns]);

  // Apply search + filters
  const filtered = useMemo(() => {
    let list = availableCampaigns;

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c:any)=>[c,...(c.discovery_opportunities??[])].some(entry=>[entry.game_name,entry.campaign_title,entry.template_name,entry.description].some(value=>String(value??'').toLowerCase().includes(q))));
    }

    if (activeFilters.size > 0) {
      const now = Date.now();
      list = list.filter((c: any) => {
        const bounties = configuredObjectives(c.bounties);
        const contentTypes = new Set(bounties.map((b: any) => b.content_type));
        const genreKeys = campaignGenreKeys(c);
        const totalXp = Number(c.total_campaign_xp ?? 0);
        const demoLeft = Number(c.demo_keys_remaining ?? 0);
        const fullAccessLeft = Number(c.full_access_keys_remaining ?? 0);
        const fullLeft = Number(c.full_keys_remaining ?? 0);
        const totalSlots = Number(c.demo_key_total ?? 0) + Number(c.full_access_key_total ?? 0) + Number(c.full_key_total ?? 0);
        const totalTaken = totalSlots - demoLeft - fullAccessLeft - fullLeft;
        const fillPct = totalSlots > 0 ? totalTaken / totalSlots : 0;
        const endMs = c.end_date ? new Date(c.end_date).getTime() : null;
        const daysLeft = endMs ? (endMs - now) / 86400000 : Infinity;
        const ageMs = c.created_at ? now - new Date(c.created_at).getTime() : Infinity;
        const agedays = ageMs / 86400000;

        for (const f of Array.from(activeFilters)) {
          // Campaign Status
          if (f === "status_demo"     && demoLeft === 0) return false;
          if (f === "status_nearly"   && fillPct < 0.75) return false;
          if (f === "status_ending"   && daysLeft > 7)   return false;
          if (f === "status_new"      && agedays > 14)   return false;
          if (f === "status_featured" && !c.is_featured) return false;
          // Rewards
          if (f === "demo"  && demoLeft  === 0) return false;
          if (f === "full"  && fullLeft === 0 && !c.has_full_game_reward && !c.completion_full_game_key && c.completion_reward_type !== "full_game_key") return false;
          if (f === "xp"    && totalXp   === 0) return false;
          if (f === "gft"   && Number(c.gft_reward_amount ?? 0) <= 0) return false;
          if (f === "badge" && c.completion_reward_type !== "xp_badge" && !c.has_badge_reward) return false;
          // Requirements
          if (f === "clip"       && !contentTypes.has("clip"))       return false;
          if (f === "reel"       && !contentTypes.has("reel"))       return false;
          if (f === "screenshot" && !contentTypes.has("screenshot")) return false;
          if (f === "stream"     && !contentTypes.has("stream"))     return false;
          if (f === "feedback"   && !contentTypes.has("feedback"))   return false;
          if (f === "bug"        && !contentTypes.has("bug"))        return false;
          // Genres
          if (["fps", "horror", "rpg", "racing", "strategy", "survival", "puzzle", "action", "adventure"].includes(f)
              && !genreKeys.has(f)) return false;
        }
        return true;
      });
    }

    return list;
  }, [availableCampaigns, search, activeFilters]);

  // Top 3 trending campaigns for the hero slider — must be before early returns
  const featuredSlides = useMemo(() => {
    const sorted = [...availableCampaigns].sort(
      (a: any, b: any) => Number(b.participant_count ?? 0) - Number(a.participant_count ?? 0),
    );
    const pinned = sorted.find((c: any) => c.is_featured);
    const rest = sorted.filter((c: any) => !c.is_featured);
    const ordered = pinned ? [pinned, ...rest] : sorted;
    return ordered.slice(0, 3);
  }, [availableCampaigns]);

  const openDetail = (c: any) => {
    c=c.discovery_opportunities?.[0]??c;
    const id = c.instance_id ?? c.id;
    scrollCampaignToTop();
    const destination = gameBountyDestination(c);
    if (destination) {
      setLocation(destination);
      return;
    }
    setLocation(`/bounties?campaign=${id}`);
    if (!isIndieDeveloperUser(user) && (c.is_joined || c.participant_status)) {
      setProgressCampaign({ ...c, instance_id: id });
      setView("progress");
      return;
    }
    setSelectedCampaign(c);
    setView("detail");
  };

  const focused=view==='progress'?progressCampaign:selectedCampaign;
  if (view !== "marketplace" && bountyInstanceId(focused) === routeCampaignId && !window.location.hash) {
    const destination = gameBountyDestination(focused);
    if (destination) return <Redirect to={destination} replace />;
  }
  if(view!=='marketplace'&&discoveryGameKey(focused)) {
    const opportunities=discoveryGameOpportunities([...allCampaigns,...(joinedCampaigns??[])],focused);
    const back=()=>{setLocation('/bounties');setView('marketplace');setSelectedCampaign(null);setProgressCampaign(null);setJoinResult(null);};
    const onDiscoveryJoined=(campaign:any,result:any)=>{setLocation(`/bounties?campaign=${bountyInstanceId(campaign)}`);setJoinResult(result);setProgressCampaign(campaign);setView('progress');};
    return <><GameBountyPage campaign={focused} opportunities={opportunities} onBack={back} onJoined={onDiscoveryJoined} renderOpportunity={opportunity=>{
      const id=bountyInstanceId(opportunity),fresh=bountyInstanceId(progressCampaign)===id?progressCampaign:null;
      const participation=fresh??joinedCampaigns?.find(c=>bountyInstanceId(c)===id);
      return <GamePageBountyOpportunity key={id} campaign={opportunity}
        participation={isIndieDeveloperUser(user) ? undefined : participation}
        otherOpportunity={Boolean(otherActiveGameOpportunity(joinedCampaigns ?? [], opportunity))}
        onJoined={onDiscoveryJoined} />;
    }}/>{joinResult&&<CampaignStartedModal campaign={progressCampaign??focused} result={joinResult} onCreate={()=>setJoinResult(null)} onViewMy={()=>{setJoinResult(null);setLocation('/bounties?tab=my');setView('marketplace');setMainTab('my');}}/>}</>;
  }

  // ── Sub-views ──────────────────────────────────────────────────────────
  if (view === "detail" && selectedCampaign) {
    return (
      <CampaignDetail
        campaign={selectedCampaign}
        onBack={() => { setLocation("/bounties"); setView("marketplace"); setSelectedCampaign(null); }}
        onJoined={(joinedCampaign, result) => {
          setJoinResult(result);
          setProgressCampaign(joinedCampaign);
          setSelectedCampaign(null);
          setView("progress");
        }}
      />
    );
  }
  if (view === "progress" && progressCampaign) {
    return (
      <>
      <CampaignProgress
        campaign={progressCampaign}
        onBack={() => { setLocation("/bounties?tab=my"); setView("marketplace"); setMainTab("my"); setProgressCampaign(null); }}
      />
      {joinResult && <CampaignStartedModal
        campaign={progressCampaign}
        result={joinResult}
        onCreate={() => setJoinResult(null)}
        onViewMy={() => { setJoinResult(null); setLocation("/bounties?tab=my"); setMainTab("my"); setView("marketplace"); setProgressCampaign(null); }}
      />}
      </>
    );
  }

  const activeFilterCount = activeFilters.size;

  return (
    <div className="min-h-screen bg-background">

      {/* ── Featured Slider — full viewport width ── */}
      {mainTab === "marketplace" && !isLoading && featuredSlides.length > 0 && (
        <FeaturedSlider campaigns={featuredSlides} onSelect={openDetail} />
      )}

      <div className="mx-auto max-w-[1680px] space-y-8 px-4 pb-5 pt-8 sm:px-6 lg:px-8">

        {mainTab !== "reward-pool" && <DeveloperBountyHubPrompt />}

        {/* ── Tabs row ── */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <nav aria-label="Bounties sections" className="flex flex-wrap gap-0.5 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }}>
            {([
              { key: "marketplace", label: "Bounty Hub" },
              { key: "my",         label: "My Campaigns" },
              { key: "reward-pool", label: "Reward Pool" },
            ] as { key: MainTab; label: string }[]).map(t => (
              <button key={t.key} type="button" onClick={() => openTab(t.key)} aria-current={mainTab === t.key ? "page" : undefined}
                className="px-3 py-2 rounded-lg text-sm font-bold transition-all sm:px-5"
                style={mainTab === t.key
                  ? { background: NEON, color: "#070b10" }
                  : { color: "rgba(255,255,255,0.50)" }}>
                {t.label}
              </button>
            ))}
          </nav>

          {mainTab === "marketplace" && (
            <button
              className="lg:hidden flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-all"
              style={{
                background: activeFilterCount > 0 ? "rgba(184,255,27,0.12)" : "rgba(255,255,255,0.06)",
                color: activeFilterCount > 0 ? NEON : "rgba(255,255,255,0.60)",
                border: `1px solid ${activeFilterCount > 0 ? "rgba(184,255,27,0.25)" : "rgba(255,255,255,0.10)"}`,
              }}
              onClick={() => setShowMobileFilters(v => !v)}>
              <SlidersHorizontal size={14} />
              Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            </button>
          )}
        </div>
      </div>

        {mainTab === "reward-pool" ? (
          <BountyRewardPool userId={user?.id} onExplore={() => openTab("marketplace")}>
            <section aria-labelledby="reward-pool-games">
              <h2 id="reward-pool-games" className="text-2xl font-bold sm:text-3xl">Participating indie games</h2>
              <p className="mt-2 text-[#D2D7E4]">Find a game you want to play and choose a bounty to build your Reward Score.</p>
              {isLoading ? <p role="status" className="mt-5 text-[#D2D7E4]">Loading games…</p> : rewardPoolGames.length ? (
                <div className="mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3">
                  {rewardPoolGames.map(campaign => (
                    <div key={campaign.game_id} className="w-[min(78vw,360px)] shrink-0 snap-start sm:w-[320px]">
                      <GameBountyCard campaign={campaign} onClick={() => openDetail(campaign)} />
                    </div>
                  ))}
                </div>
              ) : <p className="mt-5 text-[#D2D7E4]">Indie games will appear here as they open bounties.</p>}
            </section>
          </BountyRewardPool>
        ) : (
          <div className="mx-auto max-w-[1680px] px-4 pb-10 pt-3 sm:px-6 lg:px-8">
          {mainTab === "marketplace" ? (
          <>
            {/* Marketplace header + search */}
            <div className="flex items-center gap-3 mb-6">
              <Store size={16} color={NEON} />
              <span className="text-base font-black text-white">Discover campaigns</span>
            </div>
            <div className="relative mb-8">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "rgba(255,255,255,0.35)" }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search games..."
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder:text-white/30 outline-none transition-all"
                style={{ background: "#111820", border: "1px solid rgba(255,255,255,0.10)", fontFamily: "inherit" }}
                onFocus={e => e.currentTarget.style.borderColor = "rgba(184,255,27,0.40)"}
                onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)"}
              />
              {search && (
                <button onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-white/10 transition-colors">
                  <X size={13} style={{ color: "rgba(255,255,255,0.35)" }} />
                </button>
              )}
            </div>

            <div className="flex gap-6 items-start">
              {/* Filter sidebar — desktop, sticky */}
              <aside className="hidden lg:block w-52 flex-shrink-0 sticky top-6">
                <FilterSidebar active={activeFilters} onChange={setActiveFilters} />
              </aside>

              {/* Mobile filter drawer */}
              {showMobileFilters && (
                <div className="lg:hidden fixed inset-0 z-50 flex">
                  <div className="absolute inset-0 bg-black/60" onClick={() => setShowMobileFilters(false)} />
                  <div className="relative ml-auto w-72 h-full overflow-y-auto py-6 px-4"
                    style={{ background: "#0d1420", borderLeft: "1px solid rgba(255,255,255,0.10)" }}>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-black text-white">Filters</span>
                      <button onClick={() => setShowMobileFilters(false)}
                        className="p-1 rounded-lg hover:bg-white/10 transition-colors">
                        <X size={16} style={{ color: "rgba(255,255,255,0.50)" }} />
                      </button>
                    </div>
                    <FilterSidebar active={activeFilters} onChange={setActiveFilters} />
                  </div>
                </div>
              )}

              {/* Campaign grid */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {isLoading ? "Loading…" : `${filtered.length} campaign${filtered.length !== 1 ? "s" : ""}`}
                  </span>
                  {activeFilterCount > 0 && (
                    <button onClick={() => setActiveFilters(new Set())}
                      className="text-xs font-bold flex items-center gap-1 transition-colors hover:opacity-80"
                      style={{ color: NEON }}>
                      <X size={10} /> Clear all
                    </button>
                  )}
                </div>

                {isLoading ? (
                  <div className="flex items-center justify-center py-24">
                    <Loader2 size={30} className="animate-spin" style={{ color: "rgba(255,255,255,0.20)" }} />
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                      style={{ background: "rgba(184,255,27,0.07)", border: "1px solid rgba(184,255,27,0.14)" }}>
                      <Target size={28} color="rgba(184,255,27,0.40)" />
                    </div>
                    <div>
                      <div className="text-white font-black text-lg mb-1">
                        {search || activeFilterCount > 0 ? "No matching campaigns" : "No campaigns yet"}
                      </div>
                      <div className="text-sm max-w-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                        {search || activeFilterCount > 0
                          ? "Try different search terms or clear your filters."
                          : "Indie developers are launching campaigns soon. Check back shortly."}
                      </div>
                    </div>
                    {(search || activeFilterCount > 0) && (
                      <button onClick={() => { setSearch(""); setActiveFilters(new Set()); }}
                        className="px-4 py-2 rounded-xl text-sm font-bold transition-all hover:brightness-110"
                        style={{ background: NEON, color: "#070b10" }}>
                        Clear search & filters
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 gap-5">
                    {filtered.map((c: any) => (
                      c.discovery_opportunities?<GameBountyCard key={c.id} campaign={c} onClick={()=>openDetail(c)}/>:<CampaignCard key={c.id} campaign={c} onClick={()=>openDetail(c)}/>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <MyCampaigns
            onViewProgress={openDetail}
          />
          )}
          </div>
        )}
    </div>
  );
}
