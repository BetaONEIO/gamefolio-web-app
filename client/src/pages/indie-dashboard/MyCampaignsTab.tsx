import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import {
  Loader2, Clock, Users, KeyRound, Target, ChevronRight,
  ShieldCheck, AlertCircle, CheckCircle, Pause, XCircle,
  Calendar, BarChart3, Gamepad2, FileText, Play, Eye,
  Edit3, Film, Flag, Plus,
} from "lucide-react";
import { NEON, CARD_BG, CARD_BORDER } from "./constants";

const STATUS_CONFIG: Record<string, {
  label: string; color: string; bg: string; icon: any; filter: FilterTab;
}> = {
  draft:             { label: "Draft",          color: "#94a3b8", bg: "rgba(148,163,184,0.12)", icon: FileText,    filter: "draft" },
  awaiting_review:   { label: "In Review",       color: "#f59e0b", bg: "rgba(245,158,11,0.12)", icon: Clock,       filter: "draft" },
  changes_requested: { label: "Changes Needed",  color: "#f97316", bg: "rgba(249,115,22,0.12)", icon: AlertCircle, filter: "draft" },
  approved:          { label: "Approved",        color: "#4ade80", bg: "rgba(74,222,128,0.12)", icon: CheckCircle, filter: "scheduled" },
  scheduled:         { label: "Scheduled",       color: "#60a5fa", bg: "rgba(96,165,250,0.12)", icon: Calendar,    filter: "scheduled" },
  live:              { label: "Live",            color: NEON,      bg: "rgba(183,255,24,0.12)", icon: Target,      filter: "active" },
  paused:            { label: "Paused",          color: "#94a3b8", bg: "rgba(148,163,184,0.12)", icon: Pause,      filter: "active" },
  completed:         { label: "Completed",       color: "#4ade80", bg: "rgba(74,222,128,0.12)", icon: CheckCircle, filter: "completed" },
  cancelled:         { label: "Cancelled",       color: "#f87171", bg: "rgba(248,113,113,0.12)", icon: XCircle,    filter: "completed" },
};

type FilterTab = "all" | "active" | "scheduled" | "draft" | "completed";

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

function CampaignCard({ campaign }: { campaign: any }) {
  const cfg = STATUS_CONFIG[campaign.status] ?? STATUS_CONFIG.draft;
  const StatusIcon = cfg.icon;
  const remaining = daysRemaining(campaign.end_date);

  const name = campaign.name || campaign.template_name || "Unnamed Campaign";
  const completionRate = Number(campaign.participant_count ?? 0) > 0
    ? Math.round((Number(campaign.completed_count ?? 0) / Number(campaign.participant_count)) * 100)
    : 0;
  const bountyCount = campaign.bounty_count ?? (campaign.bounties?.length ?? 0);
  const contentCount = campaign.content_count ?? 0;

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
            style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.25)" }}>
            <div className="font-bold text-orange-400 mb-0.5 flex items-center gap-1.5">
              <AlertCircle size={10} /> Changes Requested
            </div>
            <div className="text-white/48">{campaign.rejection_reason}</div>
          </div>
        )}

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
