import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import {
  Loader2, Clock, Users, Key, Target, ChevronRight,
  ShieldCheck, AlertCircle, CheckCircle, Pause, XCircle,
  Calendar, BarChart3, Gamepad2, FileText,
} from "lucide-react";
import { NEON, CARD_BG, CARD_BORDER } from "./constants";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  draft:              { label: "Draft",                  color: "#94a3b8", bg: "rgba(148,163,184,0.12)", icon: FileText },
  awaiting_review:    { label: "Awaiting Review",        color: "#f59e0b", bg: "rgba(245,158,11,0.12)", icon: Clock },
  changes_requested:  { label: "Changes Requested",      color: "#f97316", bg: "rgba(249,115,22,0.12)", icon: AlertCircle },
  approved:           { label: "Approved",               color: "#4ade80", bg: "rgba(74,222,128,0.12)", icon: CheckCircle },
  scheduled:          { label: "Scheduled",              color: "#60a5fa", bg: "rgba(96,165,250,0.12)", icon: Calendar },
  live:               { label: "Live",                   color: NEON,      bg: "rgba(183,255,24,0.12)", icon: Target },
  paused:             { label: "Paused",                 color: "#94a3b8", bg: "rgba(148,163,184,0.12)", icon: Pause },
  completed:          { label: "Completed",              color: "#4ade80", bg: "rgba(74,222,128,0.12)", icon: CheckCircle },
  cancelled:          { label: "Cancelled",              color: "#f87171", bg: "rgba(248,113,113,0.12)", icon: XCircle },
};

function daysRemaining(endDate: string | null) {
  if (!endDate) return null;
  const diff = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000);
  return diff;
}

function CampaignCard({ campaign, onViewDetails }: { campaign: any; onViewDetails: () => void }) {
  const cfg = STATUS_CONFIG[campaign.status] ?? STATUS_CONFIG.draft;
  const StatusIcon = cfg.icon;
  const remaining = daysRemaining(campaign.end_date);
  const participantPct = campaign.participant_capacity > 0
    ? Math.round((Number(campaign.participant_count ?? 0) / campaign.participant_capacity) * 100)
    : 0;
  const demoKeyPct = campaign.demo_keys_required > 0
    ? Math.round((Number(campaign.demo_keys_total ?? 0) / campaign.demo_keys_required) * 100)
    : null;
  const fullKeyPct = campaign.full_keys_required > 0
    ? Math.round((Number(campaign.full_keys_total ?? 0) / campaign.full_keys_required) * 100)
    : null;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
      <div className="h-1 w-full" style={{ background: cfg.color, opacity: 0.6 }} />

      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          {campaign.game_artwork_url
            ? <img src={campaign.game_artwork_url} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
            : <div className="w-12 h-12 rounded-xl shrink-0 flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
                <Gamepad2 size={20} className="text-white/30" />
              </div>
          }
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
                style={{ color: cfg.color, background: cfg.bg }}>
                <StatusIcon size={9} />
                {cfg.label}
              </span>
              <span className="text-[10px] text-white/30 flex items-center gap-1">
                <ShieldCheck size={9} /> {campaign.template_name}
              </span>
            </div>
            <h3 className="text-sm font-black text-white truncate">{campaign.game_name ?? "No game selected"}</h3>
          </div>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg p-2.5 text-center" style={{ background: "rgba(255,255,255,0.03)" }}>
            <div className="text-sm font-black text-white">{campaign.participant_count ?? 0}</div>
            <div className="text-[9px] text-white/30 uppercase tracking-wide">Players</div>
          </div>
          <div className="rounded-lg p-2.5 text-center" style={{ background: "rgba(255,255,255,0.03)" }}>
            <div className="text-sm font-black" style={{ color: demoKeyPct !== null && demoKeyPct < 100 ? "#f87171" : "white" }}>
              {Number(campaign.demo_keys_remaining ?? 0)}
            </div>
            <div className="text-[9px] text-white/30 uppercase tracking-wide">Demo Keys Left</div>
          </div>
          <div className="rounded-lg p-2.5 text-center" style={{ background: "rgba(255,255,255,0.03)" }}>
            <div className="text-sm font-black" style={{ color: fullKeyPct !== null && fullKeyPct < 100 ? "#f87171" : "white" }}>
              {Number(campaign.full_keys_remaining ?? 0)}
            </div>
            <div className="text-[9px] text-white/30 uppercase tracking-wide">Full Keys Left</div>
          </div>
        </div>

        {/* Progress bars */}
        {(demoKeyPct !== null || fullKeyPct !== null) && (
          <div className="space-y-2">
            {demoKeyPct !== null && (
              <div>
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-white/40">Demo Keys Uploaded</span>
                  <span className="text-white/60">{campaign.demo_keys_total ?? 0} / {campaign.demo_keys_required}</span>
                </div>
                <div className="h-1 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <div className="h-1 rounded-full transition-all"
                    style={{ width: `${Math.min(demoKeyPct, 100)}%`, background: demoKeyPct >= 100 ? "#4ade80" : NEON }} />
                </div>
              </div>
            )}
            {fullKeyPct !== null && (
              <div>
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-white/40">Full Keys Uploaded</span>
                  <span className="text-white/60">{campaign.full_keys_total ?? 0} / {campaign.full_keys_required}</span>
                </div>
                <div className="h-1 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <div className="h-1 rounded-full transition-all"
                    style={{ width: `${Math.min(fullKeyPct, 100)}%`, background: fullKeyPct >= 100 ? "#4ade80" : NEON }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Dates / time remaining */}
        <div className="flex items-center justify-between text-[11px] text-white/30">
          <span>
            {campaign.actual_start
              ? `Started ${new Date(campaign.actual_start).toLocaleDateString()}`
              : campaign.scheduled_start
              ? `Scheduled ${new Date(campaign.scheduled_start).toLocaleDateString()}`
              : campaign.submitted_at
              ? `Submitted ${new Date(campaign.submitted_at).toLocaleDateString()}`
              : `Created ${new Date(campaign.created_at).toLocaleDateString()}`}
          </span>
          {remaining !== null && campaign.status === "live" && (
            <span className={remaining <= 2 ? "text-red-400" : "text-white/40"}>
              {remaining > 0 ? `${remaining}d remaining` : "Ending today"}
            </span>
          )}
        </div>

        {/* Changes requested notice */}
        {campaign.status === "changes_requested" && campaign.rejection_reason && (
          <div className="rounded-lg px-3 py-2.5 text-[11px]" style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.25)" }}>
            <div className="font-bold text-orange-400 mb-0.5 flex items-center gap-1.5"><AlertCircle size={11} /> Changes Requested</div>
            <div className="text-white/50">{campaign.rejection_reason}</div>
          </div>
        )}

        {/* Action */}
        <button onClick={onViewDetails}
          className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
          style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)", border: `1px solid ${CARD_BORDER}` }}
          onMouseEnter={e => (e.currentTarget.style.color = "white")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}>
          View Campaign <ChevronRight size={12} />
        </button>
      </div>
    </div>
  );
}

export default function MyCampaignsTab({ onBrowseLibrary }: { onBrowseLibrary: () => void }) {
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
      <div className="text-center py-20 space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center" style={{ background: "rgba(183,255,24,0.08)", border: "1px solid rgba(183,255,24,0.2)" }}>
          <Target size={28} style={{ color: NEON }} />
        </div>
        <div>
          <div className="text-base font-black text-white mb-1">No campaigns yet</div>
          <div className="text-sm text-white/40">Browse the Campaign Library and run your first Gamefolio Verified Campaign.</div>
        </div>
        <button onClick={onBrowseLibrary}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black"
          style={{ background: NEON, color: "#070b10" }}>
          Browse Campaign Library
        </button>
      </div>
    );
  }

  const byStatus = (statuses: string[]) => campaigns.filter(c => statuses.includes(c.status));
  const live = byStatus(["live"]);
  const pending = byStatus(["draft", "awaiting_review", "changes_requested", "approved", "scheduled"]);
  const archived = byStatus(["completed", "cancelled", "paused"]);

  return (
    <div className="space-y-8">
      {live.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: NEON }} />
            <h2 className="text-xs font-bold uppercase tracking-wider text-white/60">Live Campaigns</h2>
          </div>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            {live.map(c => <CampaignCard key={c.id} campaign={c} onViewDetails={() => {}} />)}
          </div>
        </section>
      )}

      {pending.length > 0 && (
        <section>
          <h2 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-4">In Progress</h2>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            {pending.map(c => <CampaignCard key={c.id} campaign={c} onViewDetails={() => {}} />)}
          </div>
        </section>
      )}

      {archived.length > 0 && (
        <section>
          <h2 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-4">Completed & Archived</h2>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            {archived.map(c => <CampaignCard key={c.id} campaign={c} onViewDetails={() => {}} />)}
          </div>
        </section>
      )}
    </div>
  );
}
