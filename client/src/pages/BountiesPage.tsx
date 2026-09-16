import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useDeveloperBountySummary } from "@/hooks/use-developer-bounty-summary";
import {
  Target, ShieldCheck, Clock, Users, Key, KeyRound, ChevronRight, ChevronLeft,
  Zap, Copy, Check, Loader2, Lock,
  Film, Camera, MessageSquare, Star, AlertCircle, Upload, Plus,
  Trophy, Gift, Search, SlidersHorizontal, X, ChevronDown, Store, Flame, Info,
} from "lucide-react";
import { SiSteam } from "react-icons/si";
import {
  CAMPAIGN_HERO_FALLBACK,
  campaignHeroSources,
  nextCampaignHeroSource,
} from "@/lib/campaign-hero";

const NEON = "#B8FF1B";
const PAGE_BG = "#0F101B";
const CARD_BG = "rgba(255,255,255,0.035)";
const CARD_BORDER = "rgba(255,255,255,0.10)";

type View = "marketplace" | "detail" | "progress";
type MyTab = "active" | "submitted" | "completed" | "expired";
type MainTab = "marketplace" | "my";

const CONTENT_TYPE_ICON: Record<string, any> = {
  clip: Film, screenshot: Camera, feedback: MessageSquare,
  reel: Film, session: Zap, bug: AlertCircle, stream: Zap,
};

const CONTENT_TYPE_LABEL: Record<string, string> = {
  clip: "Gameplay Clip", screenshot: "Screenshot", feedback: "Feedback Form",
  reel: "Reel", session: "Play Session", bug: "Bug Report", stream: "Livestream",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  active:                  { label: "In Progress",             color: NEON,      bg: "transparent" },
  under_review:            { label: "Under Review",             color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  pending:                 { label: "Submitted for Review",     color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  enrolled:               { label: "Joined",                  color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
  pending_application:    { label: "Application Pending",     color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  application_pending:    { label: "Application Pending",     color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  application_approved:   { label: "Application Approved",    color: "#4ade80", bg: "rgba(74,222,128,0.12)" },
  approved:               { label: "Application Approved",    color: "#4ade80", bg: "rgba(74,222,128,0.12)" },
  demo_key_claimed:       { label: "Demo Key Claimed",        color: NEON,      bg: "rgba(183,255,24,0.12)" },
  in_progress:            { label: "In Progress",             color: NEON,      bg: "transparent" },
  submitted_for_review:   { label: "Submitted for Review",    color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  changes_requested:      { label: "Changes Requested",       color: "#f97316", bg: "rgba(249,115,22,0.12)" },
  completed_and_verified: { label: "All Bounties Verified",   color: NEON,      bg: "rgba(183,255,24,0.12)" },
  completed:              { label: "Completed",               color: "#4ade80", bg: "rgba(74,222,128,0.12)" },
  full_game_awarded:      { label: "Full Game Awarded",       color: NEON,      bg: "transparent" },
  rejected:               { label: "Rejected",                color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  expired:                { label: "Expired",                 color: "#6b7280", bg: "rgba(107,114,128,0.1)"  },
};

function isIndieDeveloperUser(user: any): boolean {
  const role = String(user?.role ?? '').toLowerCase();
  if (role === "admin" || role === "moderator") return false;
  return role === "indie_developer"
    || String(user?.partnerType ?? user?.partner_type ?? '').toLowerCase() === "indie"
    || Boolean(user?.isIndieDevSubscriber ?? user?.is_indie_dev_subscriber);
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

// ── Build requirement checklist from bounties ────────────────────────────────────────────────────
function bountyRequirements(bounties: any[]): string[] {
  const reqs: string[] = [];
  const seen = new Set<string>();
  for (const b of bounties) {
    const qty = Number(b.quantity ?? 1);
    const ct = b.content_type as string;
    if (seen.has(ct)) continue;
    seen.add(ct);
    if (ct === "clip")       reqs.push(`Upload ${qty} Gameplay Clip${qty !== 1 ? "s" : ""}`);
    else if (ct === "screenshot") reqs.push(`Upload ${qty} Screenshot${qty !== 1 ? "s" : ""}`);
    else if (ct === "feedback")   reqs.push("Submit Feedback");
    else if (ct === "reel")       reqs.push(`Upload ${qty} Reel${qty !== 1 ? "s" : ""}`);
    else if (ct === "stream")     reqs.push("Go Live on Stream");
    else if (ct === "session")    reqs.push("Complete a Play Session");
    else if (ct === "bug")        reqs.push(`File ${qty} Bug Report${qty !== 1 ? "s" : ""}`);
    else reqs.push(ct.charAt(0).toUpperCase() + ct.slice(1));
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
  xp,
  quantity,
  progress = 0,
  isBonus = false,
  interactive = false,
  flat = false,
  done = false,
  status,
  onClick,
}: {
  title: string;
  description: string;
  contentType: string;
  xp: number;
  quantity: number;
  progress?: number;
  isBonus?: boolean;
  interactive?: boolean;
  flat?: boolean;
  done?: boolean;
  status?: string;
  onClick?: () => void;
}) {
  const Icon = CONTENT_TYPE_ICON[contentType] ?? Target;
  const accent = done ? "#4ade80" : isBonus ? "rgba(255,255,255,0.42)" : NEON;
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
        opacity: isBonus && !done ? 0.9 : 1,
      } : {
        background: done ? "rgba(74,222,128,0.045)" : isBonus ? "rgba(255,255,255,0.025)" : CARD_BG,
        border: `1px solid ${done ? "rgba(74,222,128,0.22)" : "rgba(255,255,255,0.09)"}`,
        opacity: isBonus && !done ? 0.82 : 1,
      }}
    >
      <div className={`${flat ? "w-7 h-7" : "w-9 h-9 rounded-lg"} flex items-center justify-center flex-shrink-0`}
        style={{ background: flat ? "transparent" : done ? "rgba(74,222,128,0.12)" : "rgba(184,255,27,0.08)", color: accent }}>
        {done ? <Check size={16} strokeWidth={3} /> : <Icon size={16} />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="text-sm font-black text-white leading-tight">{title}</div>
          {status && <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full" style={{ color: done ? "#4ade80" : NEON, background: done ? "rgba(74,222,128,0.10)" : "rgba(184,255,27,0.08)" }}>{status}</span>}
        </div>
        <div className="text-[11px] text-white/40 truncate mt-1">{description}</div>
        {interactive && !flat && (
          <div className="h-1.5 rounded-full overflow-hidden mt-2 max-w-sm" style={{ background: "rgba(255,255,255,0.07)" }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${quantity > 0 ? (clampedProgress / quantity) * 100 : 0}%`, background: done ? "#4ade80" : NEON }} />
          </div>
        )}
      </div>

      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        {xp > 0 && <div className="text-xs font-black tabular-nums text-right" style={{ color: NEON }}>+{xp.toLocaleString()}<span className="block text-[8px] uppercase tracking-wider opacity-60">Bounty XP</span></div>}
        <div className="text-[11px] font-black tabular-nums" style={{ color: done ? "#4ade80" : "rgba(255,255,255,0.52)" }}>
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
  const objectives: any[] = Array.isArray(campaign.objective_progress) ? campaign.objective_progress : [];
  const required = objectives.filter((objective: any) => Boolean(objective.mandatory));
  const requiredUnits = required.reduce((sum: number, objective: any) => sum + Math.max(Number(objective.quantity ?? 1), 1), 0);
  const approvedUnits = required.reduce((sum: number, objective: any) => sum + Math.min(Number(objective.approved_count ?? 0), Math.max(Number(objective.quantity ?? 1), 1)), 0);
  const submittedUnits = required.reduce((sum: number, objective: any) => sum + Math.min(Number(objective.submitted_count ?? 0), Math.max(Number(objective.quantity ?? 1), 1)), 0);

  return {
    requiredUnits: Number(campaign.required_objective_units ?? requiredUnits),
    approvedUnits: Number(campaign.approved_objective_units ?? approvedUnits),
    submittedUnits: Number(campaign.submitted_objective_units ?? submittedUnits),
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
  const deadline = campaignDeadline(campaign);
  if (deadline && new Date(deadline).getTime() <= Date.now()) return "expired";
  return "active";
}

function campaignDeadline(campaign: any) {
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
  if (campaign.has_full_game_reward || campaign.completion_reward_type === "full_game_key") {
    rewards.push({ icon: Gift, label: "Full game", tone: "#a78bfa" });
  }
  if (campaign.completion_reward_type === "xp_badge") {
    rewards.push({ icon: Star, label: "Profile badge", tone: "#60a5fa" });
  }
  return rewards;
}

function missionRewardItems(campaign: any, bounties: any[], complete: boolean) {
  const completionDescription = String(campaign.completion_reward_description ?? "");
  const gft = completionDescription.match(/([\d,]+)\s*GFT/i)?.[1];
  const awardedXp = bounties.reduce((total: number, bounty: any) => {
    const submissions = Array.isArray(bounty.submissions) ? bounty.submissions : [];
    return total + submissions.reduce((sum: number, submission: any) =>
      sum + (submission.status === "approved" ? Number(submission.xp_awarded ?? 0) : 0), 0);
  }, 0);
  const configuredXp = Number(campaign.total_campaign_xp ?? 0);
  const rewards: { icon: any; label: string; state: string; tone: string }[] = [];

  if (campaign.demo_key_id || campaign.demo_key_value) {
    rewards.push({
      icon: Key,
      label: "Demo Key",
      state: campaign.demo_key_value ? "Claimed" : "Unlocked",
      tone: NEON,
    });
  }
  if (configuredXp > 0) {
    rewards.push({
      icon: Zap,
       label: `${configuredXp.toLocaleString()} Bounty XP Reward`,
      state: `${Math.min(awardedXp, configuredXp).toLocaleString()}/${configuredXp.toLocaleString()} earned`,
      tone: NEON,
    });
  }
  if (gft) {
    rewards.push({
      icon: Trophy,
      label: `${gft} GFT`,
      state: complete ? "Earned" : "Complete required objectives",
      tone: "#fbbf24",
    });
  }
  if (campaign.completion_reward === "full_game_key" || /full[- ]game/i.test(completionDescription)) {
    rewards.push({
      icon: Gift,
      label: "Full Game",
      state: campaign.full_key_value ? "Claimed" : complete ? "Unlocked" : "Complete required objectives",
      tone: campaign.full_key_value ? "#4ade80" : "#a78bfa",
    });
  }
  if (campaign.completion_reward === "xp_badge" || /badge/i.test(completionDescription)) {
    rewards.push({
      icon: Star,
      label: "Profile Badge",
      state: complete ? "Earned" : "Complete required objectives",
      tone: "#60a5fa",
    });
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
  if (ct === "feedback")   return "Feedback";
  if (ct === "reel")       return `×${qty} Reels`;
  if (ct === "stream")     return "Livestream";
  if (ct === "session")    return "Play Session";
  if (ct === "bug")        return `×${qty} Bug Reports`;
  return ct;
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
  clip: "Create a Gameplay Clip",
  reel: "Make a Reel",
  screenshot: "Capture the Game",
  stream: "Go Live",
  bug: "Find & Report Bugs",
  session: "Play the Game",
};

const OBJECTIVE_ARTWORK_FALLBACKS: Record<string, string> = {
  clip: "/attached_assets/mac-gamer.png",
  reel: "/attached_assets/Mac-cat_1780747173609.png",
  screenshot: "/attached_assets/Indie-block-gamer-cropped_1780995777073.png",
  feedback: "/attached_assets/Follow-icon_1785852557979.png",
  stream: "/attached_assets/streamer_1780747173601.png",
  bug: "/attached_assets/gf-plug_1780932928172.png",
  session: "/attached_assets/mac-gamer.png",
};

function objectiveMarketingTitle(bounty: any) {
  const contentType = String(bounty.content_type ?? "").toLowerCase();
  return OBJECTIVE_MARKETING_TITLES[contentType] ?? String(bounty.title ?? contentType).toUpperCase();
}

function objectiveRequirementLabel(bounty: any) {
  const quantity = Math.max(Number(bounty.quantity ?? 1), 1);
  const nouns: Record<string, string> = {
    feedback: "review",
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
  const required = bounties.filter((bounty: any) => Boolean(bounty.mandatory));
  const optional = bounties.filter((bounty: any) => !bounty.mandatory);
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
  const requiredUnits = Number(campaign.required_objective_units ?? units(required));
  const requiredXp = required.reduce((sum: number, bounty: any) =>
    sum + Math.max(Number(bounty.xp_reward ?? 0), 0) * Math.max(Number(bounty.quantity ?? 1), 1), 0);
  const bonusXp = optional.reduce((sum: number, bounty: any) =>
    sum + Math.max(Number(bounty.xp_reward ?? 0), 0) * Math.max(Number(bounty.quantity ?? 1), 1), 0);
  const earnedXp = joined
    ? bounties.reduce((sum: number, bounty: any) =>
      sum + (Array.isArray(bounty.submissions)
        ? bounty.submissions.reduce((submissionSum: number, submission: any) =>
          submissionSum + (submission.status === "approved" ? Number(submission.xp_awarded ?? 0) : 0), 0)
        : 0), 0)
    : 0;

  return {
    requiredUnits,
    approvedUnits: Math.min(approvedUnits, requiredUnits),
    submittedUnits: Math.min(submittedUnits, requiredUnits),
    requiredXp,
    bonusXp,
    earnedXp: Math.min(earnedXp, requiredXp),
    percent: requiredUnits > 0 ? Math.round(Math.min(approvedUnits, requiredUnits) / requiredUnits * 100) : 0,
  };
}

function objectiveArtworkSources(bounty: any, campaign: any) {
  const contentType = String(bounty.content_type ?? "").toLowerCase();
  return [
    bounty.customArtwork,
    bounty.custom_artwork,
    bounty.custom_artwork_url,
    bounty.objectiveArtwork,
    bounty.objective_artwork_url,
    bounty.artwork,
    bounty.artwork_url,
    OBJECTIVE_ARTWORK_FALLBACKS[contentType],
    campaign.game_profile_screenshot_artwork_url,
    campaign.game_artwork_url,
    campaign.catalog_game_artwork_url,
    campaign.game_profile_capsule_artwork_url,
    campaign.campaign_artwork_url,
  ].filter((source, index, all): source is string =>
    typeof source === "string" && source.trim().length > 0 && all.indexOf(source) === index,
  );
}

function ObjectiveArtwork({ bounty, campaign }: { bounty: any; campaign: any }) {
  const sources = objectiveArtworkSources(bounty, campaign);
  const [sourceIndex, setSourceIndex] = useState(0);
  const source = sources[sourceIndex] ?? null;
  const Icon = CONTENT_TYPE_ICON[bounty.content_type] ?? Target;
  const artworkScale = bounty.content_type === "feedback" ? "max-h-[70%]" : "max-h-[80%]";

  useEffect(() => {
    setSourceIndex(0);
  }, [bounty.id, sources.join("|")]);

  return (
    <div className="relative flex h-[280px] items-center justify-center sm:h-[340px]">
      {source ? (
        <img
          src={source}
          alt=""
          className={`h-auto w-auto max-w-[88%] object-contain object-center drop-shadow-[0_24px_35px_rgba(0,0,0,0.28)] ${artworkScale}`}
          onError={() => setSourceIndex(current => current + 1)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <Icon size={64} strokeWidth={1.2} className="text-white/20" />
        </div>
      )}
    </div>
  );
}

function VisualMissionCard({ bounty, campaign, marker, isBonus = false }: { bounty: any; campaign: any; marker: string; isBonus?: boolean }) {
  const quantity = Math.max(Number(bounty.quantity ?? 1), 1);
  const xp = Math.max(Number(bounty.xp_reward ?? 0), 0) * quantity;

  return (
    <article className="min-w-0">
      <ObjectiveArtwork bounty={bounty} campaign={campaign} />
      <div className="flex max-w-[520px] flex-col space-y-4">
        <div className={`text-[11px] font-black uppercase tracking-[0.22em] ${isBonus ? "text-[#B8FF1B]" : "text-white/35"}`}>
          {marker}
        </div>
        <h3 className="min-h-[2em] text-[clamp(1.65rem,2.6vw,2.15rem)] font-black uppercase leading-[0.98] tracking-tight text-white">
          {objectiveMarketingTitle(bounty)}
        </h3>
        <p className="min-h-[3rem] max-w-[500px] text-sm leading-relaxed text-white/48">
          {bounty.description ?? objectiveDescription(bounty)}
        </p>
        <div className="flex max-w-[500px] items-end justify-between gap-4 border-b border-white/[0.14] pb-4 pt-2">
          <div className="text-sm font-black uppercase tracking-wide text-white/78">
            {isBonus ? objectiveRequirementLabel(bounty).replace(" required", " optional") : objectiveRequirementLabel(bounty)}
          </div>
          {xp > 0 && (
            <div className="text-right">
              <div className="text-xl font-black tabular-nums text-[#B8FF1B]">+{xp.toLocaleString()} XP</div>
              <div className="text-[9px] font-black uppercase tracking-[0.18em] text-[#B8FF1B]/55">Bounty XP</div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function CampaignRewardJourney({ campaign, bounties, joined }: { campaign: any; bounties: any[]; joined: boolean }) {
  const stats = campaignRewardStats(campaign, bounties, joined);
  const requiredComplete = stats.requiredUnits > 0 && stats.approvedUnits >= stats.requiredUnits;
  const accessMethod = campaign.access_method ?? campaign.accessMethod;
  const hasAccessReward = Boolean(
    campaign.gamefolio_managed ||
    campaign.demo_keys_remaining > 0 ||
    campaign.full_keys_remaining > 0 ||
    ["public_demo", "free_to_play", "demo_to_full", "full_game_upfront", "full_upfront"].includes(accessMethod ?? ""),
  );
  const hasFullGameReward = Boolean(
    campaign.has_full_game_reward ||
    campaign.completion_full_game_key ||
    campaign.completion_reward_type === "full_game_key",
  );
  const hasBadgeReward = campaign.completion_reward_type === "xp_badge" || Boolean(campaign.has_badge_reward);
  const gftAmount = Number(campaign.gft_reward_amount ?? 0);
  const rewards = [
    hasAccessReward ? {
      key: "access",
      title: "Demo Access",
      detail: joined ? "Unlocked" : "Unlocks on acceptance",
      image: "/icons/demo-key-icon.png",
      state: joined ? "unlocked" : "available",
    } : null,
    stats.requiredXp > 0 ? {
      key: "xp",
      title: "Bounty XP",
      detail: `${stats.earnedXp.toLocaleString()} / ${stats.requiredXp.toLocaleString()} XP`,
      image: "/attached_assets/XP-text_1779960376768.png",
      state: stats.earnedXp >= stats.requiredXp ? "unlocked" : stats.earnedXp > 0 ? "partial" : "locked",
    } : null,
    hasFullGameReward ? {
      key: "full-game",
      title: "Full Game",
      detail: requiredComplete ? "Unlocked" : "Complete required missions",
      image: "/icons/full-game-icon.png",
      state: requiredComplete ? "unlocked" : "locked",
    } : null,
    hasBadgeReward ? {
      key: "badge",
      title: "Profile Badge",
      detail: requiredComplete ? "Earned" : "Complete campaign",
      image: "/attached_assets/green_badge_128_1758978841463.png",
      state: requiredComplete ? "unlocked" : "locked",
    } : null,
    gftAmount > 0 ? {
      key: "gft",
      title: `${gftAmount.toLocaleString()} GFT`,
      detail: requiredComplete ? "Earned after verification" : "After campaign verification",
      image: "/attached_assets/Gamefolio token_1762633908726.png",
      state: requiredComplete ? "unlocked" : "locked",
    } : null,
  ].filter(Boolean) as { key: string; title: string; detail: string; image: string; state: "available" | "locked" | "partial" | "unlocked" }[];

  if (rewards.length === 0) return null;

  return (
    <section className="mt-20 border-t border-white/[0.12] pt-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#B8FF1B]">Your Rewards</div>
          <h2 className="mt-2 text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">Campaign Progress</h2>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black tabular-nums text-white">{stats.approvedUnits} of {stats.requiredUnits} required approved</div>
          <div className="mt-1 text-sm font-black tabular-nums text-[#B8FF1B]">{stats.percent}%</div>
        </div>
      </div>
      <div className="mt-6 h-3 overflow-hidden bg-white/[0.08]">
        <div className="h-full bg-[#B8FF1B] transition-[width] duration-700" style={{ width: `${stats.percent}%` }} />
      </div>
      {stats.submittedUnits > stats.approvedUnits && (
        <div className="mt-2 text-xs font-bold text-white/38">
          {stats.submittedUnits - stats.approvedUnits} submitted and awaiting review
        </div>
      )}

      <div className={`relative mt-12 grid gap-x-8 gap-y-10 ${rewards.length >= 4 ? "sm:grid-cols-2 lg:grid-cols-4" : rewards.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        <div className="absolute left-[10%] right-[10%] top-[54px] hidden h-px bg-white/[0.14] sm:block" aria-hidden="true">
          <div className="h-full bg-[#B8FF1B] transition-[width] duration-700" style={{ width: `${stats.percent}%` }} />
        </div>
        {rewards.map(reward => {
          const muted = reward.state === "locked";
          const partial = reward.state === "partial";
          return (
            <div key={reward.key} className="relative text-center">
              <div className="relative mx-auto flex h-28 items-center justify-center">
                <img
                  src={reward.image}
                  alt=""
                  className="max-h-24 max-w-[9rem] object-contain transition-all duration-700"
                  style={{
                    filter: muted ? "grayscale(1)" : partial ? "grayscale(0.35)" : "none",
                    opacity: muted ? 0.38 : partial ? 0.72 : 1,
                  }}
                />
              </div>
              <div className="mt-3 text-sm font-black uppercase tracking-wide text-white">{reward.title}</div>
              <div className={`mt-2 text-xs font-bold ${muted ? "text-white/35" : partial ? "text-[#B8FF1B]/75" : "text-[#B8FF1B]"}`}>
                {reward.state === "unlocked" && <Check size={12} className="mr-1 inline" strokeWidth={3} />}
                {reward.state === "locked" && <Lock size={11} className="mr-1 inline" />}
                {reward.detail}
              </div>
            </div>
          );
        })}
      </div>
      {stats.bonusXp > 0 && (
        <div className="mt-10 border-t border-white/[0.10] pt-5 text-sm font-black uppercase tracking-wide text-white/55">
          +{stats.bonusXp.toLocaleString()} XP <span className="text-[#B8FF1B]">bonus available</span>
        </div>
      )}
    </section>
  );
}

function AvailableCampaignPreview({
  campaign,
  mandatory,
  optional,
  canAccept,
  user,
  onAccept,
}: {
  campaign: any;
  mandatory: any[];
  optional: any[];
  canAccept: boolean;
  user: any;
  onAccept: () => void;
}) {
  const durationDays = Number(campaign.duration_days ?? campaign.creator_deadline_days ?? 0);
  const missions = [
    ...mandatory.map((bounty, index) => ({ bounty, marker: String(index + 1).padStart(2, "0"), isBonus: false })),
    ...optional.map((bounty, index) => ({ bounty, marker: optional.length === 1 ? "BONUS" : `BONUS ${String(index + 1).padStart(2, "0")}`, isBonus: true })),
  ];

  return (
    <div className="mx-auto max-w-[1600px] px-5 pb-20 sm:px-8 lg:px-16 xl:px-24">
      <section className="pt-10">
        <div className="mb-5">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#B8FF1B]">Your Missions</div>
          <h2 className="mt-2 text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">What You&apos;ll Actually Do</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/42">Complete the required missions below to finish this campaign.</p>
        </div>
        {missions.length > 0 ? (
          <div className={`grid gap-x-12 gap-y-20 ${missions.length === 3 ? "lg:grid-cols-3" : missions.length === 4 ? "lg:grid-cols-2 xl:grid-cols-4" : missions.length >= 5 ? "xl:grid-cols-5 lg:grid-cols-3" : "md:grid-cols-2"}`}>
            {missions.map(({ bounty, marker, isBonus }) => (
              <VisualMissionCard key={`${isBonus ? "bonus" : "required"}-${bounty.id}`} bounty={bounty} campaign={campaign} marker={marker} isBonus={isBonus} />
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-white/10 px-5 py-10 text-center text-sm text-white/40">No required missions configured.</div>
        )}
      </section>

      <CampaignRewardJourney campaign={campaign} bounties={[...mandatory, ...optional]} joined={false} />

      <section className="mt-16 border-t border-white/[0.12] pt-12 text-center">
        <h2 className="text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">Ready to Start?</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/45">
          {durationDays > 0
            ? `You'll have ${durationDays} days after claiming access to complete the required objectives.`
            : "Your individual completion deadline starts when you claim access to the campaign."}
        </p>
        {!user ? (
          <a href="/auth" className="mt-6 inline-flex items-center justify-center gap-2 bg-[#B8FF1B] px-8 py-4 text-sm font-black uppercase text-[#070b10]">
            <Lock size={16} /> Sign In to Accept Mission
          </a>
        ) : (
          <button
            type="button"
            disabled={!canAccept}
            onClick={onAccept}
            className="mt-6 inline-flex items-center justify-center gap-2 bg-[#B8FF1B] px-8 py-4 text-sm font-black uppercase text-[#070b10] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {!canAccept ? <><Lock size={16} /> No Access Available</> : <><ShieldCheck size={16} /> Accept Mission <ChevronRight size={16} /></>}
          </button>
        )}
        {user && !canAccept && <div className="mt-3 text-xs text-white/35">This campaign is not currently available for your account.</div>}
      </section>
    </div>
  );
}

function CampaignRowArtwork({ campaign }: { campaign: any }) {
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
        className="w-14 h-14 rounded-lg flex-shrink-0 bg-center bg-cover bg-no-repeat"
        style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}
        aria-hidden="true"
      />
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

// ── Campaign card ─────────────────────────────────────────────────────────
function CampaignCard({ campaign, onClick }: { campaign: any; onClick: () => void }) {
  const demoLeft  = Number(campaign.demo_keys_remaining ?? 0);
  const fullLeft  = Number(campaign.full_keys_remaining ?? 0);
  const bounties: any[] = campaign.bounties ?? [];
  const totalXP = campaign.total_campaign_xp ?? bounties.reduce((a: number, b: any) => a + Number(b.xp_reward ?? 0), 0);
  const endDate = campaign.end_date ?? null;
  const tLeft = timeRemaining(endDate);
  const nearlyFull = demoLeft > 0 && demoLeft <= 5;
  const trending = Number(campaign.participant_count ?? 0) >= 10;
  const accepted = Boolean(campaign.is_joined || campaign.joined || campaign.participant_status);

  // Deduplicated requirement pills from bounties
  const seen = new Set<string>();
  const pills: { ct: string; qty: number }[] = [];
  for (const b of bounties) {
    if (!seen.has(b.content_type)) {
      seen.add(b.content_type);
      pills.push({ ct: b.content_type, qty: Number(b.quantity ?? 1) });
    }
  }

  return (
    <div
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
          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full"
            style={{ background: NEON, color: "#070b10" }}>
            <ShieldCheck size={9} /> GF Verified
          </span>
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
              {demoLeft} Left
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
          {demoLeft > 0 && (
            <span style={{ color: NEON }} className="font-bold">{demoLeft} / {Number(campaign.demo_key_total ?? demoLeft)} demo keys</span>
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
            {totalXP > 0 && <span className="inline-flex items-center gap-1"><Zap size={13} color={NEON} /> {totalXP.toLocaleString()} Bounty XP Reward</span>}
            <span className="inline-flex items-center gap-1"><img src="/icons/token-icon.png" alt="" className="w-4 h-4 object-contain" /> GFT</span>
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
  const campaign = campaigns[idx];
  const demoLeft = Number(campaign.demo_keys_remaining ?? 0);
  const bounties: any[] = campaign.bounties ?? [];
  const totalXP = campaign.total_campaign_xp ?? bounties.reduce((a: number, b: any) => a + Number(b.xp_reward ?? 0), 0);
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
              <span className="flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full"
                style={{ background: NEON, color: "#070b10" }}>
                <ShieldCheck size={9} /> GF Verified
              </span>
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
              {fullLeft > 0 && (
                <div className="flex items-center gap-1.5">
                  <img src="/icons/full-game-icon.png" alt="" className="w-5 h-5 object-contain" />
                  <span className="text-xs font-bold text-white/70">Full Game</span>
                </div>
              )}
              {totalXP > 0 && (
                <div className="flex items-center gap-1.5">
                  <Zap size={16} color={NEON} />
                  <span className="text-xs font-bold text-white/70">{totalXP.toLocaleString()} Bounty XP Reward</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <img src="/icons/token-icon.png" alt="" className="w-5 h-5 object-contain" />
                <span className="text-xs font-bold text-white/70">GFT</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black transition-all hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: NEON, color: "#070b10" }}
                onClick={e => { e.stopPropagation(); onSelect(campaign); }}>
                <ChevronRight size={16} /> View Campaign
              </button>
              <span className="text-xs text-white/40 font-bold">
                {demoLeft > 0 ? `${demoLeft} demo keys remaining` : "Open campaign"}
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
          style={{ background: "rgba(184,255,27,0.10)", color: NEON, border: `1px solid rgba(184,255,27,0.20)` }}>
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

function CampaignDetail({ campaign, onBack, onJoined }: { campaign: any; onBack: () => void; onJoined: (campaign: any) => void }) {
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
  const bounties: any[] = campaign.bounties ?? [];
  const mandatory = bounties.filter((b: any) => b.mandatory);
  const optional = bounties.filter((b: any) => !b.mandatory);
  const totalXp = Number(campaign.total_campaign_xp ?? bounties.reduce((acc: number, b: any) =>
    acc + Number(b.xp_reward ?? 0) * Math.max(Number(b.quantity ?? 1), 1), 0));
  const demoLeft = Number(campaign.demo_keys_remaining ?? 0);
  const fullLeft = Number(campaign.full_keys_remaining ?? 0);
  const timeLeft = timeRemaining(campaign.end_date ?? null);
  const accessMethod = campaign.access_method ?? campaign.accessMethod;
  const estimatedHours = campaign.estimated_hours ?? campaign.estimated_duration_hours ?? campaign.estimated_time_hours;
  const customAccessNeedsKey = campaign.custom_access_needs_key ?? campaign.customAccessNeedsKey;
  const keylessAccess = ["public_demo", "free_to_play"].includes(accessMethod)
    || (accessMethod === "custom_access" || accessMethod === "custom")
      && (customAccessNeedsKey === false
        || (customAccessNeedsKey == null && demoLeft === 0 && fullLeft === 0));
  const canAccept = canParticipate && (isGF || keylessAccess || demoLeft > 0 || fullLeft > 0);

  const joinMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/bounties/${campaign.id}/join`, {}),
    onSuccess: async (res) => {
      const data = await res.json();
      qc.invalidateQueries({ queryKey: ["/api/bounties/my/campaigns"] });
      qc.invalidateQueries({ queryKey: ["/api/bounties/my", campaign.id] });
      const applicationPending = ["pending", "awaiting_approval", "application_pending"].includes(String(data.applicationStatus ?? data.application_status ?? "").toLowerCase());
      toast({
        title: applicationPending ? "Application submitted" : "Mission Accepted!",
        description: data.message,
      });
      setShowModal(false);
      onJoined({
        ...campaign,
        instance_id: campaign.id,
        participant_status: data.status ?? (data.accessKeyAvailable ? "access_reserved" : "joined"),
        application_status: data.applicationStatus ?? data.application_status,
        access_key_reserved: Boolean(data.accessKeyAvailable),
        access_key_revealed: false,
        // Joining reserves access only. The key and countdown arrive after
        // the creator explicitly reveals/accepts access in the workspace.
        deadline: data.deadline ?? null,
      });
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
  const [panelSubmitting, setPanelSubmitting] = useState(false);
  const { data: joinedProgress } = useQuery<any>({
    queryKey: ["/api/bounties/my", campaign.id],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: hasJoined && canParticipate,
    staleTime: 15_000,
  });
  const rewardCampaign = joinedProgress ?? campaign;
  const rewardBounties: any[] = joinedProgress?.bounties ?? bounties;

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

  const getProgress = (bountyId: number) => selectedItems[bountyId]?.length ?? 0;
  const isObjectiveDone = (b: any) => getProgress(b.id) >= Number(b.quantity ?? 1);
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
        setHasJoined(true);
        qc.invalidateQueries({ queryKey: ["/api/bounties/my/campaigns"] });
        setActivePanel(null);
        toast({ title: "Mission accepted", description: "Reveal access in your mission workspace before submitting objectives." });
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
    <div className="min-h-screen" style={{ background: "#0F101B" }}>
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
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(7,11,16,1) 0%, rgba(7,11,16,0.50) 42%, transparent 100%)" }} />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-end" style={{ minHeight: 390 }}>
          <div className="px-6 pb-8 pt-20">
            <div className="max-w-[1600px] mx-auto flex items-end justify-between gap-10 px-2 lg:px-8">

              {/* LEFT: Game info */}
              <div className="flex-1 max-w-2xl">
                <div className="flex items-center gap-2 mb-4">
                  <span className="flex items-center gap-1.5 text-[10px] font-black px-3 py-1.5 rounded-full" style={{ color: "#070b10", background: NEON }}>
                    <ShieldCheck size={10} /> GF Verified
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.65)" }}>
                    {isGF ? "Gamefolio Campaign" : "Creator Campaign"}
                  </span>
                  {campaign.platform && (
                    <span className="text-[11px] font-bold px-3 py-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.65)" }}>
                      {campaign.platform}
                    </span>
                  )}
                </div>
                {campaign.game_name && (
                  <div className="text-xs font-black uppercase tracking-[0.22em] mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>{campaign.game_name}</div>
                )}
                <div className="font-black text-white leading-none mb-4 uppercase" style={{ fontSize: "clamp(2rem,4vw,3.5rem)", letterSpacing: "-0.02em", textShadow: "0 4px 60px rgba(0,0,0,0.80)" }}>
                  {campaign.campaign_title || campaign.template_name}
                </div>
                {campaign.description && (
                  <p className="text-sm leading-relaxed mb-6 max-w-lg" style={{ color: "rgba(255,255,255,0.50)" }}>{campaign.description}</p>
                )}
                <div className="flex items-center gap-x-5 gap-y-2 flex-wrap text-xs font-bold" style={{ color: "rgba(255,255,255,0.52)" }}>
                  <div className="flex items-center gap-1.5"><Target size={13} /> {mandatory.length} required</div>
                  {optional.length > 0 && <div className="flex items-center gap-1.5"><Star size={13} /> {optional.length} bonus</div>}
                  {estimatedHours != null && (
                    <div className="flex items-center gap-1.5"><Clock size={13} /> Est. {String(estimatedHours).includes("hr") ? estimatedHours : `${estimatedHours} hrs`}</div>
                  )}
                  {timeLeft !== "Ended" && timeLeft !== "Ongoing" && (
                    <div className="flex items-center gap-1.5"><Clock size={13} /> <span style={{ color: "rgba(255,255,255,0.78)" }}>{timeLeft}</span></div>
                  )}
                   <div className="flex items-center gap-1.5"><Key size={13} /> <span style={{ color: "rgba(255,255,255,0.78)" }}>{accessMethodLabel(campaign)}</span></div>
                  {!isGF && demoLeft > 0 && (
                    <div className="flex items-center gap-1.5 text-xs font-black" style={{ color: NEON }}>
                      <img src="/icons/demo-key-icon.png" alt="" className="w-3.5 h-3.5 object-contain" />
                      {demoLeft} places remaining
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

      {/* ── MAIN CONTENT ── */}
      {!hasJoined && (
        <AvailableCampaignPreview
          campaign={campaign}
          mandatory={mandatory}
          optional={optional}
          canAccept={canAccept}
          user={user}
          onAccept={() => setShowModal(true)}
        />
      )}
      {hasJoined && (
      <div className="px-4 sm:px-6 lg:px-8 pt-8 max-w-[1400px] mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="text-[10px] uppercase tracking-widest font-black text-white/45">Campaign access</div>
            <div className="text-sm font-bold text-white mt-1">{accessMethodLabel(campaign)}</div>
            <div className="text-[11px] text-white/45 mt-1">Access is assigned only after server-side eligibility checks.</div>
          </div>
          <div className="rounded-xl p-4" style={{ background: "rgba(184,255,27,0.045)", border: "1px solid rgba(184,255,27,0.14)" }}>
            <div className="text-[10px] uppercase tracking-widest font-black" style={{ color: NEON }}>Completion reward</div>
            <div className="text-sm font-bold text-white mt-1">Bounty XP{campaign.completion_full_game_key ? " · Full-game key unlocked after completion" : ""}</div>
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
                  <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.30)" }}>{mandatory.length} required · {optional.length} bonus</div>
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
                 <div className="text-xs text-white/45 mt-0.5">{nextProgress} of {nextQty} submitted · +{Number(nextObjective.xp_reward ?? 0).toLocaleString()} Bounty XP</div>
                    </div>
                    <button onClick={() => setActivePanel({ bounty: nextObjective })} className="px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 flex-shrink-0" style={{ background: NEON, color: "#070b10" }}>
                      <Upload size={13} /> Complete
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* ── Compact quest-log objectives ── */}
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
                    xp={Number(b.xp_reward ?? 0)}
                    quantity={quantity}
                    progress={progress}
                    interactive={hasJoined && !!user}
                    done={done}
                     status={objectiveWorkflowStatus(b, progress, quantity, hasJoined)}
                    onClick={() => setActivePanel({ bounty: b })}
                  />
                );
              })}
              {optional.length > 0 && (
                <>
                  <div className="text-[10px] font-black uppercase tracking-widest text-white/30 pt-4 px-1">Bonus Objectives <span className="text-white/20">· Optional</span></div>
                  {optional.map((b: any) => {
                    const progress = getProgress(b.id);
                    const quantity = Number(b.quantity ?? 1);
                    return (
                      <CompactObjectiveRow
                        key={b.id}
                        title={objectiveLabel(b)}
                        description={objectiveDescription(b)}
                        contentType={b.content_type}
                        xp={Number(b.xp_reward ?? 0)}
                        quantity={quantity}
                        progress={progress}
                        isBonus
                        interactive={hasJoined && !!user}
                        done={progress >= quantity}
                         status={objectiveWorkflowStatus(b, progress, quantity, hasJoined)}
                        onClick={() => setActivePanel({ bounty: b })}
                      />
                    );
                  })}
                </>
              )}
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
                        {b.xp_reward > 0 && (
                          <div className="absolute top-2.5 right-2.5 text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: accentBg, color: accentColor, border: "1px solid rgba(255,255,255,0.10)" }}>
                            +{Number(b.xp_reward).toLocaleString()} Bounty XP
                          </div>
                        )}
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
                          <div className="mt-auto text-[11px] font-bold text-white/45">{qty} {CONTENT_TYPE_LABEL[ct] ?? ct}{qty !== 1 ? "s" : ""} required</div>
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
                            : prog > 0
                            ? <><Plus size={11} /> Continue ({prog}/{qty})</>
                            : <><Upload size={11} /> {ct === "clip" ? "Add Clips" : ct === "screenshot" ? "Add Screenshots" : ct === "reel" ? "Add Reels" : ct === "feedback" ? "Write Feedback" : ct === "stream" ? "Go Live" : ct === "bug" ? "Report Bugs" : "Add Content"}</>}
                        </button>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── Bonus objectives ── */}
              {optional.length > 0 && (
                <div className="mt-5">
                  <div className="text-[10px] font-black uppercase tracking-widest text-white/25 mb-3 px-1">Bonus Objectives</div>
                  <div className="grid grid-cols-2 gap-3">
                    {optional.map((b: any) => {
                      const Icon = CONTENT_TYPE_ICON[b.content_type] ?? Target;
                      const qty = Number(b.quantity ?? 1);
                      const prog = getProgress(b.id);
                      const done = prog >= qty;
                      return (
                        <div key={b.id} className="rounded-2xl flex flex-col overflow-hidden transition-all duration-500"
                          style={{ background: done ? "rgba(34,197,94,0.04)" : "rgba(255,255,255,0.02)", border: done ? "1px solid rgba(34,197,94,0.20)" : "1px dashed rgba(255,255,255,0.08)", opacity: done ? 1 : 0.72 }}>
                          <div className="h-14 flex items-center justify-center relative" style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px dashed rgba(255,255,255,0.06)" }}>
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: done ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.06)" }}>
                              <Icon size={18} style={{ color: done ? "#22c55e" : "rgba(255,255,255,0.30)" }} />
                            </div>
                            {done && <div className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: "#22c55e" }}><Check size={9} color="white" strokeWidth={3} /></div>}
                          </div>
                          <div className="p-3 flex flex-col gap-1.5">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-black leading-tight" style={{ color: done ? "#22c55e" : "rgba(255,255,255,0.40)" }}>{objectiveLabel(b)}</span>
                              {b.xp_reward > 0 && <span className="text-[10px] font-black text-white/22 flex-shrink-0">+{Number(b.xp_reward).toLocaleString()} Bounty XP</span>}
                            </div>
                            <div className="flex items-center gap-1">
                              <Star size={9} className="text-white/20 flex-shrink-0" />
                              <span className="text-[10px] text-white/22">{hasJoined ? `Bonus · ${prog}/${qty}` : `${qty} required`}</span>
                            </div>
                            {hasJoined && <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(prog / qty * 100, 100)}%`, background: done ? "#22c55e" : "rgba(255,255,255,0.18)" }} />
                            </div>}
                            {hasJoined && <button onClick={() => user && !done && setActivePanel({ bounty: b })} disabled={done || !user} className="w-full mt-0.5 py-1.5 rounded-lg text-[11px] font-black flex items-center justify-center gap-1 transition-all"
                              style={{ background: done ? "rgba(34,197,94,0.08)" : "rgba(255,255,255,0.04)", color: done ? "#22c55e" : "rgba(255,255,255,0.28)", border: done ? "1px solid rgba(34,197,94,0.18)" : "1px dashed rgba(255,255,255,0.09)" }}>
                              {done ? <><Check size={10} strokeWidth={3} /> Done</> : hasJoined ? <><Plus size={10} /> Add</> : <><Lock size={10} /> Unlock after accepting</>}
                            </button>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ══ RIGHT: Mission Rewards ══ */}
          <div className="rounded-3xl flex flex-col lg:sticky lg:top-4" style={{ background: CARD_BG, border: "1px solid rgba(184,255,27,0.20)", boxShadow: "0 0 50px rgba(184,255,27,0.06)" }}>

            {/* Card header */}
            <div className="px-6 pt-6 pb-4 flex items-center gap-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(184,255,27,0.10)", border: "1px solid rgba(184,255,27,0.18)" }}>
                <Gift size={15} color={NEON} />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: NEON }}>Mission Rewards</div>
                <div className="text-base font-black text-white">What You'll Earn</div>
              </div>
            </div>

            {/* Reward rows */}
            <div className="flex-1 p-4 space-y-2.5">
              {(() => {
                const earnedXp = mandatory.reduce((sum: number, b: any) => isObjectiveDone(b) ? sum + (Number(b.xp_reward) || 0) : sum, 0);
                const allComplete = completedMandatoryCount >= mandatory.length && mandatory.length > 0;
                const demoStatus = hasJoined ? "claimed" : canAccept ? "available" : "locked";
                const completionBonus = Number(campaign.completion_bonus_xp ?? 0);
                const remainingXp = Math.max(totalXp - earnedXp, 0);

                return (<>
                  {/* Campaign access */}
                  {(demoLeft > 0 || fullLeft > 0 || isGF || keylessAccess) && (
                    <div className="flex items-center gap-3 rounded-2xl p-3.5 transition-all duration-500"
                      style={{ background: demoStatus === "claimed" ? "rgba(34,197,94,0.07)" : "rgba(184,255,27,0.07)", border: demoStatus === "claimed" ? "1px solid rgba(34,197,94,0.25)" : "1px solid rgba(184,255,27,0.18)" }}>
                      <Key size={28} className="ml-2 mr-1" color={demoStatus === "claimed" ? "#22c55e" : NEON} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-black" style={{ color: demoStatus === "claimed" ? "#22c55e" : NEON }}>Campaign Access</div>
                        <div className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.38)" }}>{accessMethodLabel(campaign)}</div>
                      </div>
                      <div className="text-[10px] font-black px-2.5 py-1 rounded-full flex-shrink-0 flex items-center gap-1"
                        style={{ background: demoStatus === "claimed" ? "rgba(34,197,94,0.15)" : "rgba(184,255,27,0.15)", color: demoStatus === "claimed" ? "#22c55e" : NEON }}>
                        {demoStatus === "claimed" ? <><Check size={9} strokeWidth={3} /> CLAIMED</> : <><Zap size={9} /> INSTANT</>}
                      </div>
                    </div>
                  )}

                  {/* Full Game */}
                  {(campaign.completion_full_game_key || fullLeft > 0 || /full[- ]game/i.test(String(campaign.completion_reward_description ?? ""))) && <div className="flex items-center gap-3 rounded-2xl p-3.5 transition-all duration-500"
                    style={{ background: allComplete ? "rgba(34,197,94,0.06)" : "rgba(255,255,255,0.03)", border: allComplete ? "1px solid rgba(34,197,94,0.22)" : "1px solid rgba(255,255,255,0.07)", opacity: allComplete ? 1 : 0.68 }}>
                    <img src="/icons/full-game-icon.png" alt="Full Game" className="w-11 h-11 object-contain flex-shrink-0" style={{ filter: allComplete ? "drop-shadow(0 0 6px rgba(34,197,94,0.40))" : "grayscale(0.5)", opacity: allComplete ? 1 : 0.70 }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-black" style={{ color: allComplete ? "#22c55e" : "rgba(255,255,255,0.78)" }}>Full Game</div>
                      <div className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.32)" }}>Unlocked after all objectives</div>
                    </div>
                    <div className="text-[10px] font-black px-2.5 py-1 rounded-full flex-shrink-0 flex items-center gap-1"
                      style={{ background: allComplete ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.07)", color: allComplete ? "#22c55e" : "rgba(255,255,255,0.32)" }}>
                      {allComplete ? <><Check size={9} strokeWidth={3} /> UNLOCKED</> : <><Lock size={9} /> LOCKED</>}
                    </div>
                  </div>}

                  {/* XP with progress bar */}
                  {totalXp > 0 && (
                    <div className="rounded-2xl p-3.5 transition-all duration-500"
                      style={{ background: earnedXp > 0 ? "rgba(184,255,27,0.05)" : "rgba(255,255,255,0.03)", border: earnedXp > 0 ? "1px solid rgba(184,255,27,0.15)" : "1px solid rgba(255,255,255,0.07)" }}>
                      <div className="flex items-center gap-3 mb-2.5">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(184,255,27,0.10)", border: "1px solid rgba(184,255,27,0.18)" }}>
                          <Zap size={20} color={NEON} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-black text-white">Bounty XP Reward</div>
                          <div className="text-[11px] font-black tabular-nums" style={{ color: NEON }}>
                            {earnedXp.toLocaleString()} earned · {remainingXp.toLocaleString()} remaining
                          </div>
                        </div>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                        <div className="h-full rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${totalXp > 0 ? Math.round(earnedXp / totalXp * 100) : 0}%`, background: `linear-gradient(90deg,${NEON},rgba(184,255,27,0.65))`, boxShadow: earnedXp > 0 ? "0 0 8px rgba(184,255,27,0.40)" : "none" }} />
                      </div>
                       <div className="grid grid-cols-2 gap-2 mt-2 text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                         <span>Completion bonus <strong className="text-white/65">{completionBonus.toLocaleString()} XP</strong></span>
                         <span className="text-right">Total <strong style={{ color: NEON }}>{totalXp.toLocaleString()} XP</strong></span>
                       </div>
                    </div>
                  )}

                  {/* GFT Tokens */}
                  <div className="flex items-center gap-3 rounded-2xl p-3.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", opacity: 0.62 }}>
                    <img src="/icons/token-icon.png" alt="GFT" className="w-11 h-11 object-contain flex-shrink-0" style={{ filter: "grayscale(0.55)", opacity: 0.72 }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-black text-white/70">GFT Tokens</div>
                      <div className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.30)" }}>On-chain · after verification</div>
                    </div>
                    <div className="text-[10px] font-black px-2.5 py-1 rounded-full flex-shrink-0 flex items-center gap-1" style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.30)" }}>
                      <Lock size={9} /> LOCKED
                    </div>
                  </div>

                  {/* Exclusive Badge */}
                  <div className="flex items-center gap-3 rounded-2xl p-3.5 transition-all duration-500"
                    style={{ background: allComplete ? "rgba(139,92,246,0.07)" : "rgba(255,255,255,0.03)", border: allComplete ? "1px solid rgba(139,92,246,0.25)" : "1px solid rgba(255,255,255,0.07)", opacity: allComplete ? 1 : 0.62 }}>
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: allComplete ? "rgba(139,92,246,0.14)" : "rgba(255,255,255,0.05)", border: `1px solid ${allComplete ? "rgba(139,92,246,0.28)" : "rgba(255,255,255,0.07)"}` }}>
                      <Trophy size={20} style={{ color: allComplete ? "#a78bfa" : "rgba(255,255,255,0.22)" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-black" style={{ color: allComplete ? "#a78bfa" : "rgba(255,255,255,0.70)" }}>Exclusive Badge</div>
                      <div className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.30)" }}>Show off your achievement</div>
                    </div>
                    <div className="text-[10px] font-black px-2.5 py-1 rounded-full flex-shrink-0 flex items-center gap-1"
                      style={{ background: allComplete ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.07)", color: allComplete ? "#a78bfa" : "rgba(255,255,255,0.30)" }}>
                      {allComplete ? <><Check size={9} strokeWidth={3} /> UNLOCKED</> : <><Lock size={9} /> LOCKED</>}
                    </div>
                  </div>
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
                      onClick={() => { const next = mandatory.find((b: any) => !isObjectiveDone(b)); if (next) setActivePanel({ bounty: next }); }}
                      className="w-full py-3.5 rounded-2xl text-sm font-black flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-[0.99]"
                      style={{ background: NEON, color: "#070b10", boxShadow: "0 0 22px rgba(184,255,27,0.32)" }}
                    >
                      <Upload size={16} /> Continue Mission
                    </button>
                  ) : (
                    <button
                      disabled={!canAccept}
                      onClick={() => setShowModal(true)}
                      className="w-full py-3.5 rounded-2xl text-sm font-black flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-40"
                      style={{ background: NEON, color: "#070b10", boxShadow: "0 0 22px rgba(184,255,27,0.32)" }}
                    >
                      {!canAccept ? <><Lock size={16} /> No Keys Available</> : <><ShieldCheck size={16} /> Accept Mission</>}
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

        {hasJoined && (
          <CampaignRewardJourney campaign={rewardCampaign} bounties={rewardBounties} joined />
        )}

        {/* ── HOW IT WORKS ── */}
        {hasJoined && <div className="mb-10 rounded-3xl overflow-hidden" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
          <div className="px-6 sm:px-8 py-6 flex flex-col sm:flex-row items-center sm:items-stretch gap-0 sm:gap-0">
            {([
              { icon: <ShieldCheck size={16} color={NEON} />, num: "1", label: "Accept Mission", sub: "Get your demo key" },
              { icon: <img src="/icons/demo-key-icon.png" alt="" className="w-4 h-4 object-contain" />, num: "2", label: "Play the Game", sub: "Use your key & play" },
              { icon: <Upload size={16} color={NEON} />, num: "3", label: "Upload Content", sub: "Clips, screenshots, reels" },
              { icon: <Check size={16} strokeWidth={3} color={NEON} />, num: "4", label: "Verification", sub: "Dev reviews your content" },
              { icon: <Trophy size={16} color={NEON} />, num: "5", label: "Unlock Rewards", sub: "Full game, XP, GFT" },
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
              <img src="/icons/demo-key-icon.png" alt="" className="w-11 h-11 object-contain" />
              <div>
                <div className="text-lg font-black text-white">Accept {campaign.template_name}?</div>
                <div className="text-xs text-white/45">You are joining a Gamefolio campaign</div>
              </div>
            </div>
            <p className="text-sm text-white/60">Once accepted, this campaign moves to My Campaigns. Track objectives, submit content and unlock rewards from your Mission Workspace.</p>
            <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(184,255,27,0.05)", border: "1px solid rgba(184,255,27,0.12)" }}>
              <div className="text-[10px] font-black uppercase tracking-widest text-white/35 mb-1">Mission briefing</div>
              <div className="text-xs text-white/60">{mandatory.length} required objectives · {optional.length} bonus objective{optional.length === 1 ? "" : "s"} · {timeLeft === "Ongoing" ? "Ongoing campaign" : timeLeft}</div>
              {!isGF && demoLeft > 0 && <div className="text-xs font-bold mt-2" style={{ color: NEON }}>1 access key will be reserved for you.</div>}
              {keylessAccess && <div className="text-xs font-bold mt-2" style={{ color: NEON }}>No access key is required. Access is available when you accept.</div>}
              {[
                ...(campaign.completion_full_game_key || fullLeft > 0 ? [{ icon: <img src="/icons/full-game-icon.png" alt="" className="w-5 h-5 object-contain" />, text: "Full Game after required objectives" }] : []),
                { icon: <Zap size={16} color={NEON} />, text: totalXp > 0 ? `${totalXp.toLocaleString()} Bounty XP Reward` : "Bounty XP Rewards" },
                { icon: <img src="/icons/token-icon.png" alt="" className="w-5 h-5 object-contain" />, text: "GFT after verification" },
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
                  : <><ShieldCheck size={16} /> Accept Mission</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CampaignProgress({ campaign: cp, onBack }: { campaign: any; onBack: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [copiedDemo, setCopiedDemo] = useState(false);
  const [copiedFull, setCopiedFull] = useState(false);
  const [expandedBounty, setExpandedBounty] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [submittingSlotIndex, setSubmittingSlotIndex] = useState<number | null>(null);
  const [submitUrl, setSubmitUrl] = useState("");
  const [selectedContentId, setSelectedContentId] = useState<number | null>(null);
  const [nativeFile, setNativeFile] = useState<File | null>(null);
  const [nativePreview, setNativePreview] = useState<string | null>(null);
  const [nativeTitle, setNativeTitle] = useState("");
  const [nativeDescription, setNativeDescription] = useState("");
  const [nativeDragging, setNativeDragging] = useState(false);
  const [nativeUploadError, setNativeUploadError] = useState<string | null>(null);
  const [nativeUploadStage, setNativeUploadStage] = useState<"idle" | "uploading" | "processing" | "submitting">("idle");
  const [showDetails, setShowDetails] = useState(false);
  const [revealedAccessKey, setRevealedAccessKey] = useState<string | null>(null);
  const [revealedDeadline, setRevealedDeadline] = useState<string | null>(null);
  const [claimedFullKey, setClaimedFullKey] = useState<string | null>(null);
  const [, setClock] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(value => value + 1), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    return () => {
      if (nativePreview) URL.revokeObjectURL(nativePreview);
    };
  }, [nativePreview]);

  const { data: progress, isLoading } = useQuery<any>({
    queryKey: ["/api/bounties/my", cp.instance_id],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const data = progress ?? cp;
  const progressBounties: any[] = progress?.bounties ?? cp.bounties ?? [];
  const submittingBounty = progressBounties.find((b: any) => b.id === submitting);
  const usesExistingContent = ["clip", "reel", "screenshot"].includes(submittingBounty?.content_type);
  const { data: pickerData, isLoading: pickerLoading } = useQuery<any>({
    queryKey: ["/api/bounties/my/content-picker", submittingBounty?.content_type, data?.game_id],
    queryFn: async () => {
      const gameQuery = data?.game_id ? `&gameId=${encodeURIComponent(String(data.game_id))}` : "";
      const res = await fetch(`/api/bounties/my/content-picker?contentType=${encodeURIComponent(submittingBounty.content_type)}${gameQuery}`, { credentials: "include" });
      if (!res.ok) throw new Error("Could not load your Gamefolio content");
      return res.json();
    },
    enabled: Boolean(submittingBounty && usesExistingContent),
    staleTime: 30_000,
  });
  const { data: uploadLimits } = useQuery<any>({
    queryKey: ["/api/upload/limits"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 5 * 60_000,
  });

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
        description: "Your completion countdown is now active.",
      });
    },
    onError: async (err: any) => {
      toast({ title: "Could not reveal access", description: err?.message ?? "Please try again.", variant: "destructive" });
    },
  });

  const submitMutation = useMutation({
    mutationFn: ({ bountyId, body }: { bountyId: number; body: Record<string, unknown> }) =>
      apiRequest("POST", `/api/bounties/my/${cp.instance_id}/submit/${bountyId}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/bounties/my", cp.instance_id] });
      qc.invalidateQueries({ queryKey: ["/api/bounties/my/campaigns"] });
      setSubmitting(null);
      setSubmittingSlotIndex(null);
      setSubmitUrl("");
      setSelectedContentId(null);
      setNativeFile(null);
      setNativePreview(null);
      setNativeTitle("");
      setNativeDescription("");
      setNativeUploadError(null);
      setNativeUploadStage("idle");
      toast({ title: "Submitted for review", description: "Gamefolio will verify your submission" });
    },
    onError: async (err: any) => {
      toast({ title: "Submission failed", description: err?.message ?? "Error", variant: "destructive" });
    },
  });

  const nativeSubmitMutation = useMutation({
    mutationFn: async ({ bountyId, slotIndex, file, title, description, supersedesSubmissionId }: { bountyId: number; slotIndex: number; file: File; title?: string; description?: string; supersedesSubmissionId?: number }) => {
      const bounty = progressBounties.find((item: any) => item.id === bountyId);
      if (!bounty) throw new Error("Objective not found");
      setNativeUploadError(null);
      setNativeUploadStage("uploading");
      const submissionTitle = title?.trim() || bounty.title || "Campaign upload";
      const submissionDescription = description?.trim() || data?.description || "";

      if (bounty.content_type === "screenshot") {
        const form = new FormData();
        form.append("title", submissionTitle);
        if (data?.game_id) form.append("gameId", String(data.game_id));
        form.append("screenshot", file);
        const upload = await fetch("/api/screenshots/upload", { method: "POST", body: form, credentials: "include" });
        const uploaded = await upload.json().catch(() => ({}));
        if (!upload.ok) throw new Error(uploaded?.message ?? "Screenshot upload failed");
        setNativeUploadStage("submitting");
        return apiRequest("POST", `/api/bounties/my/${cp.instance_id}/submit/${bountyId}`, {
          contentType: bounty.content_type,
          screenshotId: uploaded.screenshot?.id,
          slotIndex,
          ...(supersedesSubmissionId ? { supersedesSubmissionId } : {}),
        });
      }

      const uploadForm = new FormData();
      uploadForm.append("file", file);
      uploadForm.append("uploadType", bounty.content_type === "reel" ? "reel" : "clip");
      const upload = await fetch("/api/upload/video-direct", { method: "POST", body: uploadForm, credentials: "include" });
      const uploaded = await upload.json().catch(() => ({}));
      if (!upload.ok) throw new Error(uploaded?.message ?? uploaded?.error ?? "Video upload failed");

      setNativeUploadStage("processing");
      const processed = await apiRequest("POST", "/api/upload/process-video", {
        uploadResult: uploaded.result,
        title: submissionTitle,
        description: submissionDescription,
        gameId: data?.game_id ?? null,
        videoType: bounty.content_type === "reel" ? "reel" : "clip",
      });
      const processedData = await processed.json();
      const mediaId = processedData.clip?.id;
      if (!mediaId) throw new Error("Video was uploaded but could not be published");
      setNativeUploadStage("submitting");
      return apiRequest("POST", `/api/bounties/my/${cp.instance_id}/submit/${bountyId}`, {
        contentType: bounty.content_type,
        slotIndex,
        ...(bounty.content_type === "reel" ? { reelId: mediaId } : { clipId: mediaId }),
        ...(supersedesSubmissionId ? { supersedesSubmissionId } : {}),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/bounties/my", cp.instance_id] });
      qc.invalidateQueries({ queryKey: ["/api/bounties/my/campaigns"] });
      setSubmitting(null);
      setSubmittingSlotIndex(null);
      setNativeFile(null);
      setNativePreview(null);
      setNativeTitle("");
      setNativeDescription("");
      setSelectedContentId(null);
      setNativeUploadError(null);
      setNativeUploadStage("idle");
      toast({ title: "Submitted for review", description: "Your upload is now attached to this campaign objective." });
    },
    onError: (err: any) => {
      setNativeUploadStage("idle");
      setNativeUploadError(err?.message ?? "Could not submit this upload");
      toast({ title: "Upload failed", description: err?.message ?? "Could not submit this upload", variant: "destructive" });
    },
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
      const maxMb = isScreenshot ? uploadLimits?.maxScreenshotSizeMB : (activeType === "reel" ? uploadLimits?.maxReelSizeMB : uploadLimits?.maxClipSizeMB);
      if (maxMb && file.size > maxMb * 1024 * 1024) {
        setNativeUploadError(`This file is larger than the ${maxMb}MB campaign upload limit.`);
        return;
      }
    }
    setNativeUploadError(null);
    setNativeFile(file);
    setNativePreview(file ? URL.createObjectURL(file) : null);
    setSelectedContentId(null);
  };

  const openSubmissionForm = (bountyId: number, slotIndex: number) => {
    setSubmitting(bountyId);
    setSubmittingSlotIndex(slotIndex);
    setSelectedContentId(null);
    setSubmitUrl("");
    setNativeFile(null);
    setNativePreview(null);
    setNativeTitle("");
    setNativeDescription("");
    setNativeUploadError(null);
    setNativeUploadStage("idle");
  };

  const copyKey = (key: string, setter: (v: boolean) => void) => {
    navigator.clipboard.writeText(key).then(() => {
      setter(true);
      setTimeout(() => setter(false), 2000);
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: PAGE_BG }}>
        <Loader2 size={28} className="animate-spin text-white/30" />
      </div>
    );
  }

  const displayData = revealedDeadline ? { ...data, deadline: revealedDeadline } : data;
  const bounties: any[] = data.bounties ?? [];
  const mandatory = bounties.filter((b: any) => b.mandatory);
  const optional = bounties.filter((b: any) => !b.mandatory);
  const requiredUnits = Number(data.required_objective_units ?? mandatory.reduce((sum: number, b: any) => sum + Number(b.quantity ?? 1), 0));
  const approvedUnits = Number(data.approved_objective_units ?? mandatory.reduce((sum: number, b: any) => sum + Math.min(Number(b.quantity ?? 1), Number(b.approved_count ?? 0)), 0));
  const submittedUnits = Number(data.submitted_objective_units ?? mandatory.reduce((sum: number, b: any) => sum + Math.min(Number(b.quantity ?? 1), Number(b.submitted_count ?? 0)), 0));
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
  const accessRevealed = Boolean(data.access_key_revealed || revealedAccessKey || data.participant_status === "access_accepted");
  const accessNeedsReveal = !applicationPending && !accessRevealed
    && (accessReserved || applicationApproved || data.participant_status === "joined" || data.participant_status === "enrolled");
  const canShowReservedKey = accessReserved && !revealedAccessKey;
  const showAccessAction = accessNeedsReveal || (canShowReservedKey && accessRevealed);
  const allApproved = requiredUnits > 0 && approvedUnits >= requiredUnits;
  const canClaimFull = allApproved && !data.full_key_value;
  const deadlineLabel = campaignDeadlineLabel(displayData);
  const deadlineUrgency = campaignDeadlineUrgency(displayData);
  const missionRewards = missionRewardItems(displayData, bounties, allApproved);
  const completedOptional = optional.filter((b: any) => Number(b.approved_count ?? 0) >= Number(b.quantity ?? 1)).length;
  const contentRequirements = bountyRequirements(bounties);

  const renderSubmissionForm = (b: any, slotIndex: number) => {
    const Icon = CONTENT_TYPE_ICON[b.content_type] ?? Target;
    const isMedia = ["clip", "reel", "screenshot"].includes(b.content_type);
    const isVideo = ["clip", "reel"].includes(b.content_type);
    const submissionsForSlot = (b.submissions ?? []).filter((submission: any, index: number) =>
      Number(submission.slot_index ?? index) === slotIndex
    );
    const replacement = submissionsForSlot.find((submission: any) => ["changes_requested", "rejected"].includes(submission.status));
    const isNativeBusy = nativeSubmitMutation.isPending;
    const campaignArtwork = data.game_artwork_url || data.hero_artwork_url || data.catalog_game_artwork_url || data.campaign_artwork_url;
    const campaignName = data.campaign_title || data.template_name || cp.template_name || "Campaign";
    const gameName = data.game_name || "Campaign game";
    const lockedGameId = data.game_id;
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
                <button type="button" key={item.id} onClick={() => { selectNativeFile(null); setSelectedContentId(selected ? null : item.id); }} className="relative aspect-video overflow-hidden rounded-lg text-left" style={{ border: selected ? `2px solid ${NEON}` : "1px solid rgba(255,255,255,0.10)" }}>
                  {item.thumbnailUrl ? <img src={item.thumbnailUrl} alt={item.title ?? "Gamefolio content"} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center bg-white/5"><Icon size={16} className="text-white/35" /></div>}
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
                <span>Maximum {uploadLimits?.maxClipSizeMB ?? 100}MB · {Math.round((uploadLimits?.maxClipDurationSeconds ?? 180) / 60)} min</span>
              </div>
            </div>
            <input
              id="campaign-video-upload"
              type="file"
              className="hidden"
              accept="video/mp4,video/webm,video/quicktime"
              onChange={(event) => selectNativeFile(event.target.files?.[0] ?? null)}
            />
            {!nativeFile || !nativePreview ? (
              <div
                className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors ${nativeDragging ? "border-[#B8FF1B] bg-[#B8FF1B]/5" : "border-white/15"} cursor-pointer hover:border-[#B8FF1B]`}
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
                <Upload className="mx-auto mb-2 h-10 w-10 text-white/45" />
                <p className="font-medium text-white/80">Drag and drop your video or click to browse</p>
                <p className="mt-1 text-sm text-white/35">
                  MP4, WebM, or MOV up to {uploadLimits?.maxClipSizeMB ?? 100}MB · {Math.round((uploadLimits?.maxClipDurationSeconds ?? 180) / 60)} min
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1.15fr)_minmax(260px,0.85fr)]">
                <div className="overflow-hidden rounded-xl border border-white/[0.10] bg-black/40">
                  <video src={nativePreview} controls className="h-[320px] w-full bg-black object-contain sm:h-[370px]" />
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
                      className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#B8FF1B]/60"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="campaign-video-description" className="text-xs font-semibold text-white/85">Description</label>
                    <textarea
                      id="campaign-video-description"
                      value={nativeDescription}
                      onChange={(event) => setNativeDescription(event.target.value)}
                      placeholder="What’s happening in this clip?"
                      className="min-h-24 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#B8FF1B]/60"
                    />
                    <p className="text-[10px] text-white/35">Use @username to mention other users.</p>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.025] px-3 py-2.5">
                    <Lock size={13} className="shrink-0 text-white/35" />
                    <div className="min-w-0">
                      <div className="text-[9px] font-black uppercase tracking-wider text-white/35">Game</div>
                      <div className="truncate text-xs font-bold text-white/75">{gameName}</div>
                      {!lockedGameId && <div className="text-[10px] text-red-300">This campaign game is not configured.</div>}
                    </div>
                  </div>
                  <p className="text-[10px] leading-relaxed text-white/35">This video will be published to your Gamefolio profile and attached to this campaign for developer review.</p>
                </div>
              </div>
            )}
            {nativeUploadError && <div className="rounded-lg border border-red-400/20 bg-red-400/[0.08] px-3 py-2 text-xs text-red-200" role="alert">{nativeUploadError}</div>}
            {isNativeBusy && (
              <div className="flex items-center gap-2 text-[11px] font-bold text-white/55" role="status" aria-live="polite">
                <Loader2 size={13} className="animate-spin" />
                {nativeUploadStage === "processing" ? "Processing your video…" : nativeUploadStage === "submitting" ? "Attaching to campaign…" : "Uploading your video…"}
              </div>
            )}
            {existingPicker}
          </>
        ) : isMedia ? (
          <>
            <div className="flex items-center justify-between gap-3">
              <div className="text-[10px] font-black uppercase tracking-wider text-white/35">Choose existing Gamefolio content</div>
              <label className="cursor-pointer text-xs font-black" style={{ color: NEON }}>
                <Upload size={12} className="mr-1 inline" /> Upload {b.content_type === "screenshot" ? "screenshot" : b.content_type === "reel" ? "reel" : "video"}
                <input
                  type="file"
                  className="hidden"
                  accept={b.content_type === "screenshot" ? "image/*" : "video/mp4,video/quicktime,video/webm"}
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    selectNativeFile(file);
                  }}
                />
              </label>
            </div>
            {nativeFile && nativePreview ? (
              <div className="overflow-hidden rounded-xl border border-white/10 bg-black/30">
                <img src={nativePreview} alt={nativeFile.name} className="max-h-56 w-full object-contain" />
                <div className="flex items-center justify-between gap-3 border-t border-white/[0.08] px-3 py-2">
                  <span className="truncate text-xs text-white/65">{nativeFile.name}</span>
                  <button type="button" onClick={() => selectNativeFile(null)} className="text-xs text-white/40 hover:text-white">Remove</button>
                </div>
              </div>
            ) : (
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
            )}
            <p className="text-[10px] text-white/30">PNG, JPG and other supported image formats are accepted.</p>
          </>
        ) : (
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-wider text-white/35">Your response</label>
            <textarea value={submitUrl} onChange={e => setSubmitUrl(e.target.value)} placeholder={b.content_type === "feedback" ? "Tell the developer what you thought…" : b.content_type === "bug" ? "Describe the bug, steps to reproduce, and expected behaviour…" : "Paste a supporting link or write your response…"} className="min-h-28 w-full rounded-xl bg-black/30 px-3 py-2 text-sm text-white outline-none placeholder:text-white/25" style={{ border: "1px solid rgba(255,255,255,0.10)" }} />
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (nativeFile) return nativeSubmitMutation.mutate({
                bountyId: b.id,
                slotIndex,
                file: nativeFile,
                title: nativeTitle,
                description: nativeDescription,
                ...(replacement ? { supersedesSubmissionId: replacement.id } : {}),
              });
              const body: Record<string, unknown> = { contentType: b.content_type };
              body.slotIndex = slotIndex;
              if (b.content_type === "clip") body.clipId = selectedContentId;
              else if (b.content_type === "reel") body.reelId = selectedContentId;
              else if (b.content_type === "screenshot") body.screenshotId = selectedContentId;
              else body.contentData = { text: submitUrl.trim() };
              if (replacement) body.supersedesSubmissionId = replacement.id;
              submitMutation.mutate({ bountyId: b.id, body });
            }}
            disabled={isNativeBusy || submitMutation.isPending || (isVideo
              ? ((!nativeFile && !selectedContentId) || (Boolean(nativeFile) && !nativeTitle.trim()))
              : isMedia
              ? (!nativeFile && !selectedContentId)
              : !submitUrl.trim())}
            className="flex-1 rounded-lg py-2.5 text-sm font-black transition-all hover:brightness-110 disabled:opacity-50"
            style={{ background: NEON, color: "#070b10" }}
          >
            {isNativeBusy || submitMutation.isPending ? <Loader2 size={14} className="mx-auto animate-spin" /> : isMedia ? "Submit to Campaign" : b.content_type === "feedback" ? "Submit feedback" : "Submit report"}
          </button>
          <button type="button" onClick={() => { setSubmitting(null); setSubmittingSlotIndex(null); setSubmitUrl(""); setSelectedContentId(null); selectNativeFile(null); setNativeTitle(""); setNativeDescription(""); setNativeUploadError(null); setNativeUploadStage("idle"); }} className="px-4 py-2 text-sm text-white/50 hover:text-white">Cancel</button>
        </div>
      </div>
    );
  };

  const renderSubmissionSlots = (b: any) => {
    const quantity = Math.max(Number(b.quantity ?? 1), 1);
    const submissions: any[] = b.submissions ?? [];
    const contentLabel = b.content_type === "reel"
      ? "Reel"
      : b.content_type === "screenshot"
      ? "Screenshot"
      : b.content_type === "bug"
      ? "Report"
      : b.content_type === "feedback"
      ? "Response"
      : "Clip";

    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold text-white/45">
          <span>{Math.min(Number(b.submitted_count ?? 0), quantity)} / {quantity} submitted</span>
          <span className="text-white/20">·</span>
          <span>{Math.min(Number(b.approved_count ?? 0), quantity)} / {quantity} approved</span>
          <span className="text-white/20">·</span>
          <span>+{(Number(b.xp_reward ?? 0) * quantity).toLocaleString()} XP total</span>
        </div>
        <div className="space-y-2">
          {Array.from({ length: quantity }, (_, slotIndex) => {
            const slotSubmissions = submissions.filter((submission: any, index: number) =>
              Number(submission.slot_index ?? index) === slotIndex
            );
            const submission = slotSubmissions[0];
            const statusCfg = submission
              ? (STATUS_CONFIG[submission.status] ?? { label: submission.status, color: "#94a3b8", bg: "" })
              : null;
            const isSlotOpen = submitting === b.id && submittingSlotIndex === slotIndex;
            const canReplace = submission && ["changes_requested", "rejected"].includes(submission.status);

            return (
              <div key={`${b.id}-${slotIndex}`} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/45">{contentLabel} {slotIndex + 1}</div>
                  {statusCfg && <span className="rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wider" style={{ color: statusCfg.color, background: statusCfg.bg }}>{statusCfg.label}</span>}
                </div>

                {isSlotOpen ? (
                  <div className="mt-3">{renderSubmissionForm(b, slotIndex)}</div>
                ) : submission ? (
                  <div className="mt-3 flex items-center gap-3">
                    {submission.thumbnail_url
                      ? <img src={submission.thumbnail_url} alt="" className="h-12 w-16 shrink-0 rounded-lg object-cover" />
                      : <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg bg-black/30"><Target size={16} className="text-white/25" /></div>}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-black text-white/80">{submission.media_title || `${contentLabel} submission`}</div>
                      <div className="mt-1 text-[10px] text-white/35">{submission.submitted_at ? `Submitted ${new Date(submission.submitted_at).toLocaleString()}` : "Submitted"}</div>
                      {submission.status === "pending" || submission.status === "under_review"
                        ? <div className="mt-1 text-[10px] font-bold text-white/45">+{Number(b.xp_reward ?? 0).toLocaleString()} XP pending review</div>
                        : submission.status === "approved"
                        ? <div className="mt-1 text-[10px] font-bold text-green-300">+{Number(submission.xp_awarded ?? b.xp_reward ?? 0).toLocaleString()} XP earned</div>
                        : submission.review_notes
                        ? <div className="mt-1 line-clamp-2 text-[10px] text-orange-300">{submission.review_notes}</div>
                        : null}
                    </div>
                    {submission.media_url && (
                      <a href={submission.media_url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-[10px] font-bold text-white/45 hover:text-white">View</a>
                    )}
                    {canReplace && (
                      <button type="button" onClick={() => openSubmissionForm(b.id, slotIndex)} className="shrink-0 rounded-lg border border-white/10 px-2.5 py-2 text-[10px] font-black text-white/65 hover:text-white">
                        Replace
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => openSubmissionForm(b.id, slotIndex)}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/15 px-3 py-3 text-xs font-black text-white/60 transition-colors hover:border-[#B8FF1B]/60 hover:text-white"
                  >
                    <Plus size={14} /> Upload {contentLabel}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderObjective = (b: any, isBonus = false) => {
    const Icon = CONTENT_TYPE_ICON[b.content_type] ?? Target;
    const approved = Number(b.approved_count ?? 0);
    const submitted = Number(b.submitted_count ?? 0);
    const qty = Number(b.quantity ?? 1);
    const done = approved >= qty;
    const visibleProgress = Math.max(approved, submitted);
    const subs: any[] = b.submissions ?? [];
    const lastSub = subs[0];
    const isExpanded = expandedBounty === b.id;
    const subStatusCfg = lastSub ? (STATUS_CONFIG[lastSub.status] ?? { label: lastSub.status, color: "#94a3b8", bg: "" }) : null;
    const rowStatus = subStatusCfg?.label ?? (done ? "Completed" : submitted > 0 ? "In Progress" : "Not Started");

    return (
      <div key={b.id} className="overflow-hidden border-b border-white/[0.08] last:border-b-0">
        <CompactObjectiveRow
          title={objectiveLabel(b)}
          description={objectiveDescription(b)}
          contentType={b.content_type}
          xp={Number(b.xp_reward ?? 0) * qty}
          quantity={qty}
          progress={visibleProgress}
          interactive
          flat
          isBonus={isBonus}
          done={done}
          status={isBonus && !done ? undefined : rowStatus}
          onClick={() => setExpandedBounty(isExpanded ? null : b.id)}
        />

        {isExpanded && (
         <div className="px-1 sm:px-10 pb-5 border-t border-white/[0.06] pt-4 space-y-4">

             {!applicationPending && renderSubmissionSlots(b)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-24 sm:pb-10" style={{ background: "#0A0A10" }}>
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
        <button onClick={onBack} className="flex items-center gap-2 py-4 text-white/50 hover:text-white transition-colors text-sm font-bold">
          <ChevronLeft size={16} /> Back to My Campaigns
        </button>

        {/* Compact game and campaign hero */}
        <section className="relative overflow-hidden rounded-xl bg-[#0A0A10] sm:min-h-[300px]">
          <FeaturedHeroBackground
            campaign={data}
            className="absolute inset-x-0 top-0 h-[220px] bg-center bg-cover bg-no-repeat transition-[background-image] duration-300 sm:inset-0 sm:h-auto"
          />
          <div
            className="absolute inset-x-0 top-0 h-[245px] sm:hidden"
            style={{ background: "linear-gradient(180deg, rgba(15,16,27,0.02) 0%, rgba(15,16,27,0.08) 55%, rgba(15,16,27,0.92) 88%, #0A0A10 100%)" }}
          />
          <div
            className="absolute inset-0 hidden sm:block"
            style={{ background: "linear-gradient(90deg, rgba(15,16,27,0.99) 0%, rgba(15,16,27,0.95) 28%, rgba(15,16,27,0.74) 46%, rgba(15,16,27,0.22) 70%, rgba(15,16,27,0.04) 100%)" }}
          />
          <div className="absolute inset-0 hidden sm:block" style={{ background: "linear-gradient(0deg, rgba(15,16,27,0.42) 0%, transparent 35%)" }} />

          <div className="relative z-10 flex flex-col justify-end px-5 pb-6 pt-[225px] sm:min-h-[300px] sm:max-w-[600px] sm:justify-center sm:px-9 sm:py-8 lg:px-11">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full"
                style={{ color: "#070b10", background: NEON }}>
                <ShieldCheck size={10} /> GF Verified
              </span>
              <span className="text-[9px] font-black uppercase tracking-[0.16em] text-white/62">Joined</span>
              {statusCfg.label !== "Joined" && (
                <>
                  <span className="text-white/25" aria-hidden="true">·</span>
                  <span className="text-[9px] font-black uppercase tracking-[0.16em]" style={{ color: statusCfg.color }}>{statusCfg.label}</span>
                </>
              )}
            </div>

            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/45">Game</div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-white leading-[0.95] mt-1">{data.game_name || "Gamefolio"}</h1>
            <div className="text-sm sm:text-lg font-black uppercase tracking-[0.08em] mt-2" style={{ color: NEON }}>{data.campaign_title || data.template_name || cp.template_name}</div>
            {data.description && <p className="text-sm text-white/62 mt-3 max-w-xl leading-relaxed line-clamp-3">{data.description}</p>}

            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-4 text-[11px] font-bold text-white/55">
              <span>Joined</span>
              <span aria-hidden="true">·</span>
              <span aria-live="polite" className={deadlineUrgency === "urgent" ? "text-red-300" : deadlineUrgency === "soon" ? "text-amber-300" : ""}>{deadlineLabel}</span>
            </div>

            {missionRewards.length > 0 && (
              <div className="mt-4">
                <div className="text-[9px] font-black uppercase tracking-[0.18em] text-white/40 mb-2">Your Rewards</div>
                <div className="flex flex-wrap gap-2">
                  {missionRewards.map(({ icon: RewardIcon, label, state, tone }) => (
                    <div key={label} className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[10px] font-bold"
                      style={{ background: "rgba(6,8,14,0.74)", border: "1px solid rgba(255,255,255,0.12)" }}>
                      <RewardIcon size={13} style={{ color: tone }} />
                      <span className="text-white/85">{label}</span>
                      <span className="text-white/38 text-[8px]">· {state}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {(applicationPending || applicationApproved) && (
          <div
            className="mt-5 rounded-xl px-4 py-3 flex items-start gap-3"
            role="status"
            aria-live="polite"
            style={{
              background: applicationPending ? "rgba(245,158,11,0.08)" : "rgba(74,222,128,0.08)",
              border: `1px solid ${applicationPending ? "rgba(245,158,11,0.22)" : "rgba(74,222,128,0.22)"}`,
            }}
          >
            {applicationPending ? <Clock size={16} className="text-amber-300 mt-0.5 flex-shrink-0" /> : <Check size={16} className="text-green-400 mt-0.5 flex-shrink-0" />}
            <div>
              <div className={`text-xs font-black ${applicationPending ? "text-amber-200" : "text-green-300"}`}>
                {applicationPending ? "Application pending approval" : "Application approved"}
              </div>
              <div className="text-[11px] text-white/50 mt-1">
                {applicationPending
                  ? "The developer needs to approve your application before access and objectives become available."
                  : "Your application is approved. Accept access below when you are ready to start your countdown."}
              </div>
            </div>
          </div>
        )}

        {/* Mission progress and next action */}
        <section className="mt-7 pb-7 border-b border-white/[0.08]">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="text-xs font-black uppercase tracking-[0.16em] text-white/65">Mission Progress</div>
            <div className="text-sm font-black tabular-nums" style={{ color: pct >= 100 ? "#4ade80" : NEON }}>{progressUnits} / {requiredUnits}</div>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#252938" }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: pct >= 100 ? "#4ade80" : NEON }} />
          </div>
        </section>

        {nextObjectiveTitle && pct < 100 && (
          <section className="mt-8 border-b border-white/[0.08] pb-8">
            <div className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: NEON }}>Up Next</div>
            {(() => {
              const nextBounty = mandatory.find((b: any) => Number(b.approved_count ?? 0) < Number(b.quantity ?? 1));
              const nextQty = Number(nextBounty?.quantity ?? 1);
              const nextSubmitted = Number(nextBounty?.submitted_count ?? 0);
              return (
                <button
                  onClick={() => nextBounty && setExpandedBounty(nextBounty.id)}
                  className="mt-3 flex w-full items-end justify-between gap-5 text-left"
                >
                  <span className="min-w-0">
                    <span className="block text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">{nextObjectiveTitle}</span>
                    <span className="mt-2 block max-w-2xl text-sm leading-relaxed text-white/50">{objectiveDescription(nextBounty ?? {})}</span>
                    <span className="mt-3 block text-xs font-bold text-white/45">{Math.min(nextSubmitted, nextQty)} / {nextQty} submitted <span className="mx-1 text-white/20">·</span> +{Number(nextBounty?.xp_reward ?? 0).toLocaleString()} Bounty XP</span>
                  </span>
                  <span className="shrink-0 rounded-lg px-4 py-2.5 text-xs font-black" style={{ background: NEON, color: "#070b10" }}>Start objective <ChevronRight size={14} className="ml-1 inline" /></span>
                </button>
              );
            })()}
          </section>
        )}

        <div className="mt-8">
          <main className="space-y-8 min-w-0">

        {/* Required objectives */}
        {mandatory.length > 0 && (
          <section>
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs font-black uppercase tracking-wider text-white/55">Required Objectives</div>
              <div className="text-[11px] font-black tabular-nums text-white/40">{approvedCount} / {mandatory.length}</div>
            </div>
            {mandatory.map((b: any) => {
              const Icon = CONTENT_TYPE_ICON[b.content_type] ?? Target;
              const approved = Number(b.approved_count ?? 0);
              const submitted = Number(b.submitted_count ?? 0);
              const qty = Number(b.quantity ?? 1);
              const done = approved >= qty;
              const visibleProgress = Math.max(approved, submitted);
              const subs: any[] = b.submissions ?? [];
              const lastSub = subs[0];
              const isExpanded = expandedBounty === b.id;

              const subStatusCfg = lastSub ? (STATUS_CONFIG[lastSub.status] ?? { label: lastSub.status, color: "#94a3b8", bg: "" }) : null;
              const rowStatus = subStatusCfg?.label ?? (done ? "Completed" : submitted > 0 ? "Submitted" : "Not Started");

              return (
                <div key={b.id} className="overflow-hidden border-b border-white/[0.08] last:border-b-0">
                  <CompactObjectiveRow
                    title={objectiveLabel(b)}
                    description={objectiveDescription(b)}
                    contentType={b.content_type}
                    xp={Number(b.xp_reward ?? 0) * qty}
                    quantity={qty}
                    progress={visibleProgress}
                    interactive
                    flat
                    done={done}
                    status={rowStatus}
                    onClick={() => setExpandedBounty(isExpanded ? null : b.id)}
                  />

                  {isExpanded && (
                        <div className="px-1 sm:px-10 pb-5 border-t border-white/[0.06] pt-4 space-y-4">

                      {!applicationPending && renderSubmissionSlots(b)}
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        )}

        {/* Optional objectives */}
        {optional.length > 0 && (
          <section>
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs font-black uppercase tracking-wider text-white/55">Optional Objectives</div>
              <div className="text-[11px] font-black tabular-nums text-white/40">{completedOptional} / {optional.length}</div>
            </div>
            {optional.map((b: any) => renderObjective(b, true))}
          </section>
        )}

            {/* Campaign details, collapsed by default */}
            <section className="border-y border-white/[0.08]">
              <button
                type="button"
                onClick={() => setShowDetails(value => !value)}
                aria-expanded={showDetails}
                className="w-full flex items-center justify-between gap-4 px-1 py-4 text-left hover:bg-white/[0.025] transition-colors"
              >
                <span className="text-xs font-black uppercase tracking-wider text-white/60">Campaign Details</span>
                <ChevronDown size={16} className={`text-white/40 transition-transform ${showDetails ? "rotate-180" : ""}`} />
              </button>
              {showDetails && (
                <div className="px-1 pb-5 pt-5 grid sm:grid-cols-2 gap-x-8 gap-y-5 border-t border-white/[0.06]">
                  {data.description && (
                    <div className="sm:col-span-2">
                      <div className="text-[9px] font-black uppercase tracking-wider text-white/30 mb-1">Campaign</div>
                      <p className="text-xs leading-relaxed text-white/55">{data.description}</p>
                    </div>
                  )}
                  <div>
                    <div className="text-[9px] font-black uppercase tracking-wider text-white/30 mb-1">Game</div>
                    <div className="text-xs font-bold text-white/70">{data.game_name || "Gamefolio"}</div>
                  </div>
                  <div>
                    <div className="text-[9px] font-black uppercase tracking-wider text-white/30 mb-1">Deadline</div>
                    <div aria-live="polite" className={`text-xs font-bold ${deadlineUrgency === "urgent" ? "text-red-300" : deadlineUrgency === "soon" ? "text-amber-300" : "text-white/70"}`}>
                      {deadlineLabel}{campaignDeadline(displayData) ? ` · ${new Date(campaignDeadline(displayData)).toLocaleDateString()}` : ""}
                    </div>
                  </div>
                  {contentRequirements.length > 0 && (
                    <div className="sm:col-span-2">
                      <div className="text-[9px] font-black uppercase tracking-wider text-white/30 mb-1.5">Content Requirements</div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                        {contentRequirements.map(requirement => (
                          <span key={requirement} className="inline-flex items-center gap-1.5 text-[10px] font-bold text-white/58">
                            <span className="w-1 h-1 rounded-full" style={{ background: NEON }} />
                            {requirement}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="text-[9px] font-black uppercase tracking-wider text-white/30 mb-1">Verification</div>
                    <p className="text-xs leading-relaxed text-white/50">Submitted objectives are reviewed before progress and rewards are approved.</p>
                  </div>
                  {data.completion_reward_description && (
                    <div>
                      <div className="text-[9px] font-black uppercase tracking-wider text-white/30 mb-1">Reward Conditions</div>
                      <p className="text-xs leading-relaxed text-white/50">{data.completion_reward_description}</p>
                    </div>
                  )}
                </div>
              )}
            </section>
          </main>

          {/* Access and rewards stay in the mission flow, not in a duplicate sidebar. */}
          <section className="border-t border-white/[0.08] pt-8">
            <div className="rounded-xl p-4 space-y-4" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
              <div className="text-xs font-black uppercase tracking-[0.16em] text-white/65">Access & Rewards</div>

              <div>
                <div className="flex items-center justify-between text-[10px] font-bold text-white/38 mb-1.5">
                  <span>Progress</span>
                  <span className="tabular-nums text-white/65">{progressUnits} / {requiredUnits} objectives</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#1b2231" }}>
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct >= 100 ? "#4ade80" : NEON }} />
                </div>
              </div>

              {nextObjectiveTitle && pct < 100 && (
                <div>
                  <div className="text-[9px] font-black uppercase tracking-wider text-white/30">Next</div>
                  <div className="text-xs font-black text-white/75 mt-1">{nextObjectiveTitle}</div>
                </div>
              )}

              {missionRewards.length > 0 && (
                <div>
                  <div className="text-[9px] font-black uppercase tracking-wider text-white/30 mb-2">Rewards</div>
                  <div className="space-y-2">
                    {missionRewards.map(({ icon: RewardIcon, label, state, tone }) => (
                      <div key={label} className="flex items-start gap-2">
                        <RewardIcon size={13} className="mt-0.5 flex-shrink-0" style={{ color: tone }} />
                        <div className="min-w-0">
                          <div className="text-[11px] font-black text-white/75">{label}</div>
                          <div className="text-[9px] leading-snug text-white/35">{state}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/5">
                <div>
                  <div className="text-[9px] font-black uppercase tracking-wider text-white/30">Deadline</div>
                  <div aria-live="polite" className={`text-[11px] font-bold mt-1 ${deadlineUrgency === "urgent" ? "text-red-300" : deadlineUrgency === "soon" ? "text-amber-300" : "text-white/65"}`}>{deadlineLabel}</div>
                </div>
                <div>
                  <div className="text-[9px] font-black uppercase tracking-wider text-white/30">Status</div>
                  <div className="text-[11px] font-bold mt-1" style={{ color: statusCfg.color }}>{statusCfg.label}</div>
                </div>
              </div>

              {showAccessAction && (
                <div className="pt-3 border-t border-white/5" aria-live="polite">
                  <div className="text-[9px] font-black uppercase tracking-wider mb-2" style={{ color: NEON }}>
                    {accessReserved ? (accessRevealed ? "Access key available" : "Access key reserved") : "Access acceptance required"}
                  </div>
                  <p className="text-[11px] leading-relaxed text-white/50 mb-3">
                    {accessReserved && accessRevealed
                      ? "Show your assigned access key again. Your completion countdown is already active."
                      : accessReserved
                      ? "Reveal your assigned access key when you are ready. This starts your individual completion countdown."
                      : "Accept access when you are ready. This starts your individual completion countdown."}
                  </p>
                  <button
                    type="button"
                    onClick={() => revealAccessMutation.mutate()}
                    disabled={revealAccessMutation.isPending}
                    className="w-full py-2.5 rounded-lg text-xs font-black flex items-center justify-center gap-2 transition-all hover:brightness-110 disabled:opacity-50"
                    style={{ background: NEON, color: "#070b10" }}
                  >
                    {revealAccessMutation.isPending
                      ? <><Loader2 size={14} className="animate-spin" /> Revealing access…</>
                      : accessReserved ? <><KeyRound size={14} /> {accessRevealed ? "Show access key" : "Reveal access key & start mission"}</> : <><ShieldCheck size={14} /> Accept access & start mission</>}
                  </button>
                </div>
              )}

              {revealedAccessKey && (
                <div className="pt-3 border-t border-white/5">
                  <div className="text-[9px] font-black uppercase tracking-wider mb-2" style={{ color: NEON }}>Access Key · Revealed</div>
                  <div className="flex items-center gap-1.5">
                    <div className="min-w-0 flex-1 font-mono text-[10px] text-white/70 bg-black/25 rounded-md px-2 py-2 truncate" aria-label="Revealed access key">{revealedAccessKey}</div>
                    <button onClick={() => copyKey(revealedAccessKey, setCopiedDemo)} className="p-2 rounded-md hover:bg-white/5" aria-label="Copy revealed access key">
                      {copiedDemo ? <Check size={14} color={NEON} /> : <Copy size={14} className="text-white/45" />}
                    </button>
                    {data.game_steam_app_id && (
                      <a href={`https://store.steampowered.com/app/${data.game_steam_app_id}`} target="_blank" rel="noopener noreferrer"
                        className="p-2 rounded-md hover:bg-white/5" aria-label="Open game on Steam">
                        <SiSteam size={14} className="text-white/45" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {claimedFullKey ? (
                <div className="pt-3 border-t border-white/5">
                  <div className="text-[9px] font-black uppercase tracking-wider text-green-400 mb-2">Full Game · Claimed</div>
                  <div className="flex items-center gap-1.5">
                    <div className="min-w-0 flex-1 font-mono text-[10px] text-white/70 bg-black/25 rounded-md px-2 py-2 truncate" aria-label="Claimed full-game key">{claimedFullKey}</div>
                    <button onClick={() => copyKey(claimedFullKey, setCopiedFull)} className="p-2 rounded-md hover:bg-white/5" aria-label="Copy claimed full-game key">
                      {copiedFull ? <Check size={14} className="text-green-400" /> : <Copy size={14} className="text-white/45" />}
                    </button>
                  </div>
                </div>
              ) : canClaimFull ? (
                <button
                  onClick={() => claimFullMutation.mutate()}
                  disabled={claimFullMutation.isPending}
                  className="w-full py-2.5 rounded-lg text-xs font-black flex items-center justify-center gap-2 transition-all hover:brightness-110 disabled:opacity-50"
                  style={{ background: "#4ade80", color: "#052e16" }}
                >
                  {claimFullMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Gift size={14} />}
                  Claim Full-Game Key
                </button>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
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
            const progressUnits = Math.max(progress.approvedUnits, progress.submittedUnits);
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
                ? "Submit Content"
                : campaignState === "submitted"
                ? "View Campaign"
                : campaignState === "completed"
                  ? "View Rewards"
                  : "Continue Mission";

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
                className="group rounded-xl px-3.5 py-3 sm:px-4 sm:py-3.5 cursor-pointer transition-[background,border-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B8FF1B]/70"
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
                      {fullKeyActive && <CampaignRewardChip icon={Gift} label="Full game claimed" tone="#4ade80" />}
                    </div>
                    <div
                      className="flex items-center gap-1 text-[10px] font-bold whitespace-nowrap"
                      style={{ color: deadlineTone.color }}
                      aria-label={`Campaign deadline: ${deadlineLabel}`}
                    >
                      <Clock size={11} />
                      {deadlineLabel}
                    </div>
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
  const [, setLocation] = useLocation();
  const { isEligible, isLoading, allowance, overview } = useDeveloperBountySummary();

  if (!isEligible) return null;

  const activeCampaigns = Number(overview?.activeCampaigns ?? 0);
  const monthlyAvailable = Boolean(allowance?.eligible && allowance.available);
  const monthlyUsed = Boolean(allowance?.eligible && allowance.used);
  const resetDate = allowance?.periodEnd
    ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long" }).format(new Date(allowance.periodEnd))
    : "your next billing reset";
  const goToCreate = () => setLocation("/game-dashboard?tab=campaigns&campaignSub=create");
  const goToManage = () => setLocation("/game-dashboard?tab=campaigns&campaignSub=my");

  return (
    <section
      className="relative overflow-hidden px-6 py-8 sm:px-8 sm:py-10 lg:px-10 xl:px-16"
      style={{
        backgroundColor: "#0f101b",
        backgroundImage: "linear-gradient(0deg, rgba(15,16,27,0.46) 0%, transparent 34%), linear-gradient(90deg, rgba(15,16,27,1) 0%, rgba(15,16,27,0.98) 20%, rgba(15,16,27,0.86) 34%, rgba(15,16,27,0.42) 52%, rgba(15,16,27,0.12) 70%, rgba(15,16,27,0.02) 100%), url('/attached_assets/creator-campaign-hero.png')",
        backgroundPosition: "center right",
        backgroundSize: "cover",
      }}
      aria-label="Developer campaign actions"
    >
      <div className="flex min-h-[380px] items-center sm:min-h-[400px]">
        <div className="min-w-0 lg:max-w-[700px]">
          {isLoading ? (
            <>
              <div className="h-3.5 w-44 animate-pulse rounded bg-white/10" />
              <div className="mt-4 h-9 w-[min(100%,28rem)] animate-pulse rounded bg-white/10" />
              <div className="mt-3 h-4 w-[min(100%,34rem)] animate-pulse rounded bg-white/5" />
            </>
          ) : monthlyAvailable ? (
            <>
              <p className="text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: NEON }}>
                Your Monthly Bounty Is Ready
              </p>
              <h2 className="mt-3 max-w-[680px] text-3xl font-black leading-[1.05] tracking-tight text-white sm:text-[42px]">
                <span className="block">Get creators playing</span>
                <span className="block">your game.</span>
              </h2>
              <p className="mt-4 max-w-[620px] pr-8 text-base leading-7 text-white/70 sm:pr-12 sm:text-[17px]">
                Your Quick Creator campaign is ready to launch. Get Gamefolio creators playing your game and creating content around it.
              </p>
              <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm font-bold text-white/80 lg:flex-nowrap sm:text-[15px]">
                {["Creator content", "Gamefolio promotion", "Included with Pro"].map(item => (
                  <span key={item} className="inline-flex items-center gap-2">
                    <Check size={14} style={{ color: NEON }} />
                    {item}
                  </span>
                ))}
              </div>
              <div className="mt-6 flex flex-col items-start gap-3">
                <button
                  type="button"
                  onClick={goToCreate}
                  className="inline-flex min-h-[54px] w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-black transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B7FF18] sm:w-[240px]"
                  style={{ background: NEON, color: "#070b10" }}
                >
                  Create Bounty <ChevronRight size={16} />
                </button>
                <button type="button" onClick={goToCreate} className="text-[13px] font-black text-white/60 transition hover:text-white">
                  Explore larger campaigns →
                </button>
              </div>
            </>
          ) : monthlyUsed ? (
            <>
              <p className="text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: NEON }}>
                Creator Campaigns
              </p>
              <h2 className="mt-3 max-w-[680px] text-3xl font-black leading-[1.05] tracking-tight text-white sm:text-[42px]">
                Ready for another creator push?
              </h2>
              <p className="mt-4 max-w-[620px] pr-8 text-base leading-7 text-white/70 sm:pr-12 sm:text-[17px]">
                Your included Quick Creator campaign has been used for this billing period.
              </p>
              <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm font-bold text-white/80 lg:flex-nowrap sm:text-[15px]">
                {["Creator campaigns from £10", "Gamefolio promotion", "Creator content"].map(item => (
                  <span key={item} className="inline-flex items-center gap-2">
                    <Check size={14} style={{ color: NEON }} />
                    {item}
                  </span>
                ))}
              </div>
              <div className="mt-5 text-xs font-bold text-white/55">
                Next Quick Creator: <span className="text-white/80">{resetDate}</span>
              </div>
              <div className="mt-6 flex flex-col items-start gap-3">
                <button
                  type="button"
                  onClick={goToCreate}
                  className="inline-flex min-h-[54px] w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-black transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B7FF18] sm:w-[240px]"
                  style={{ background: NEON, color: "#070b10" }}
                >
                  Build Another Campaign <ChevronRight size={16} />
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: NEON }}>
                Creator Campaigns
              </p>
              <h2 className="mt-3 max-w-[680px] text-3xl font-black leading-[1.05] tracking-tight text-white sm:text-[42px]">
                <span className="block">Get creators playing</span>
                <span className="block">your game.</span>
              </h2>
              <p className="mt-4 max-w-[620px] pr-8 text-base leading-7 text-white/70 sm:pr-12 sm:text-[17px]">
                Launch a Gamefolio creator campaign for clips, reels, screenshots, streams and more.
              </p>
              <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm font-bold text-white/80 lg:flex-nowrap sm:text-[15px]">
                {["Creator content", "Gamefolio promotion", "Campaigns from £10"].map(item => (
                  <span key={item} className="inline-flex items-center gap-2">
                    <Check size={14} style={{ color: NEON }} />
                    {item}
                  </span>
                ))}
              </div>
              <div className="mt-6 flex flex-col items-start gap-3">
                <button
                  type="button"
                  onClick={goToCreate}
                  className="inline-flex min-h-[54px] w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-black transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B7FF18] sm:w-[240px]"
                  style={{ background: NEON, color: "#070b10" }}
                >
                  Build a Campaign <ChevronRight size={16} />
                </button>
                <button type="button" onClick={() => setLocation("/game-dashboard?tab=overview")} className="text-[13px] font-black text-white/65 transition hover:text-white">
                  Quick Creator is included monthly with Indie Game Pro · <span style={{ color: NEON }}>View Pro →</span>
                </button>
              </div>
            </>
          )}

          {activeCampaigns > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-white/45">
              <span>{activeCampaigns} {activeCampaigns === 1 ? "campaign" : "campaigns"} active</span>
              <span aria-hidden="true">·</span>
              <button type="button" onClick={goToManage} className="font-black text-white/65 transition hover:text-white">
                Manage →
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default function BountiesPage() {
  const [mainTab, setMainTab]               = useState<MainTab>("marketplace");
  const [view, setView]                     = useState<View>("marketplace");
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [progressCampaign, setProgressCampaign] = useState<any>(null);
  const [search, setSearch]                 = useState("");
  const [activeFilters, setActiveFilters]   = useState<Set<string>>(new Set());
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const routeSearch = useSearch();
  const { user } = useAuth();

  useEffect(() => {
    const tab = new URLSearchParams(routeSearch).get("tab");
    if (tab === "my" || tab === "marketplace") setMainTab(tab);
  }, [routeSearch]);

  const { data: allCampaigns = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/bounties"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // The hub is available to every authenticated Gamefolio user. This includes
  // Gamefolio-managed starter campaigns alongside developer campaigns.
  const availableCampaigns = useMemo(() => allCampaigns, [allCampaigns]);

  // Apply search + filters
  const filtered = useMemo(() => {
    let list = availableCampaigns;

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c: any) =>
        (c.game_name ?? "").toLowerCase().includes(q) ||
        (c.campaign_title ?? "").toLowerCase().includes(q) ||
        (c.template_name ?? "").toLowerCase().includes(q) ||
        (c.description ?? "").toLowerCase().includes(q),
      );
    }

    if (activeFilters.size > 0) {
      const now = Date.now();
      list = list.filter((c: any) => {
        const bounties: any[] = c.bounties ?? [];
        const contentTypes = new Set(bounties.map((b: any) => b.content_type));
        const totalXp = bounties.reduce((a: number, b: any) => a + Number(b.xp_reward ?? 0), 0);
        const demoLeft = Number(c.demo_keys_remaining ?? 0);
        const fullLeft = Number(c.full_keys_remaining ?? 0);
        const totalSlots = Number(c.demo_key_total ?? 0) + Number(c.full_key_total ?? 0);
        const totalTaken = totalSlots - demoLeft - fullLeft;
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
          if (f === "full"  && fullLeft  === 0) return false;
          if (f === "xp"    && totalXp   === 0) return false;
          // Requirements
          if (f === "clip"       && !contentTypes.has("clip"))       return false;
          if (f === "reel"       && !contentTypes.has("reel"))       return false;
          if (f === "screenshot" && !contentTypes.has("screenshot")) return false;
          if (f === "stream"     && !contentTypes.has("stream"))     return false;
          if (f === "feedback"   && !contentTypes.has("feedback"))   return false;
          if (f === "bug"        && !contentTypes.has("bug"))        return false;
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
    if (!isIndieDeveloperUser(user) && (c.is_joined || c.participant_status)) {
      setProgressCampaign({ ...c, instance_id: c.instance_id ?? c.id });
      setView("progress");
      return;
    }
    setSelectedCampaign(c);
    setView("detail");
  };

  // ── Sub-views ──────────────────────────────────────────────────────────
  if (view === "detail" && selectedCampaign) {
    return (
      <CampaignDetail
        campaign={selectedCampaign}
        onBack={() => { setView("marketplace"); setSelectedCampaign(null); }}
        onJoined={(joinedCampaign) => {
          setProgressCampaign(joinedCampaign);
          setSelectedCampaign(null);
          setMainTab("my");
          setView("progress");
        }}
      />
    );
  }
  if (view === "progress" && progressCampaign) {
    return (
      <CampaignProgress
        campaign={progressCampaign}
        onBack={() => { setView("marketplace"); setMainTab("my"); setProgressCampaign(null); }}
      />
    );
  }

  const activeFilterCount = activeFilters.size;

  return (
    <div className="min-h-screen" style={{ background: PAGE_BG }}>

      {/* ── Featured Slider — full viewport width ── */}
      {mainTab === "marketplace" && !isLoading && featuredSlides.length > 0 && (
        <FeaturedSlider campaigns={featuredSlides} onSelect={openDetail} />
      )}

      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        <DeveloperBountyHubPrompt />

        {/* ── Tabs row ── */}
        <div className="flex items-center justify-between">
          <div className="flex gap-0.5 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }}>
            {([
              { key: "marketplace", label: "Bounty Hub" },
              { key: "my",         label: "My Campaigns" },
            ] as { key: MainTab; label: string }[]).map(t => (
              <button key={t.key} onClick={() => setMainTab(t.key)}
                className="px-5 py-2 rounded-lg text-sm font-bold transition-all"
                style={mainTab === t.key
                  ? { background: NEON, color: "#070b10" }
                  : { color: "rgba(255,255,255,0.50)" }}>
                {t.label}
              </button>
            ))}
          </div>

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

        {/* ── Marketplace / My Campaigns ── */}
        <div className="pb-10">
        {mainTab === "marketplace" ? (
          <>
            {/* Marketplace header + search */}
            <div className="flex items-center gap-3 mb-6">
              <Store size={16} color={NEON} />
              <span className="text-base font-black text-white">Marketplace</span>
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
                      <CampaignCard
                        key={c.id}
                        campaign={c}
                        onClick={() => openDetail(c)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <MyCampaigns
            onViewProgress={(c) => { setProgressCampaign(c); setView("progress"); }}
          />
        )}
        </div>
      </div>
    </div>
  );
}
