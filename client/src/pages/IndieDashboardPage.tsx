import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import {
  Rocket, Users, Eye, Key, Zap, Inbox, Target, BarChart3,
  Gamepad, ListChecks, ClipboardCheck, KeyRound, Loader2,
  BookOpen, ShieldCheck, TrendingUp, Calendar,
} from "lucide-react";
import CampaignLibraryTab from "./indie-dashboard/CampaignLibraryTab";
import MyCampaignsTab from "./indie-dashboard/MyCampaignsTab";
import SubmissionReviewTab from "./indie-dashboard/SubmissionReviewTab";
import KeyManagementTab from "./indie-dashboard/KeyManagementTab";
import AnalyticsTab from "./indie-dashboard/AnalyticsTab";
import GameProfileTab from "./indie-dashboard/GameProfileTab";
import RunCampaignWizard from "./indie-dashboard/RunCampaignWizard";

export { NEON, CARD_BG, CARD_BORDER, PAGE_BG } from "./indie-dashboard/constants";

const TABS = [
  { id: "overview",   label: "Overview",          icon: BarChart3 },
  { id: "library",    label: "Campaign Library",  icon: BookOpen },
  { id: "campaigns",  label: "My Campaigns",      icon: Target },
  { id: "submissions",label: "Submissions",        icon: ClipboardCheck },
  { id: "keys",       label: "Keys & Rewards",    icon: KeyRound },
  { id: "analytics",  label: "Analytics",         icon: TrendingUp },
  { id: "game-profile",label: "Game Profile",     icon: Gamepad },
] as const;

type TabId = typeof TABS[number]["id"];

// ─────────────────────────────────────────────
// Overview Tab
// ─────────────────────────────────────────────

interface OverviewData {
  activeCampaigns: number;
  scheduledCampaigns: number;
  completedCampaigns: number;
  draftCampaigns: number;
  totalParticipants: number;
  demoKeysRemaining: number;
  fullKeysRemaining: number;
  recentCampaigns: any[];
}

function StatCard({ icon: Icon, label, value, accent, sub }: { icon: any; label: string; value: string | number; accent?: boolean; sub?: string }) {
  return (
    <div className="rounded-2xl p-4 flex items-center gap-3"
      style={{ background: CARD_BG, border: `1px solid ${accent ? "rgba(183,255,24,0.25)" : CARD_BORDER}` }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: accent ? "rgba(183,255,24,0.12)" : "rgba(255,255,255,0.06)" }}>
        <Icon className="w-5 h-5" style={{ color: accent ? NEON : "#fff" }} />
      </div>
      <div>
        <div className="text-xl font-black text-white">{value}</div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{label}</div>
        {sub && <div className="text-[10px] text-white/25 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  live: NEON,
  approved: "#4ade80",
  scheduled: "#60a5fa",
  awaiting_review: "#f59e0b",
  changes_requested: "#f97316",
  draft: "#94a3b8",
  completed: "#4ade80",
  cancelled: "#f87171",
  paused: "#94a3b8",
};

function OverviewTab({ onNavigate, onRunCampaign }: { onNavigate: (t: TabId) => void; onRunCampaign: () => void }) {
  const { data, isLoading } = useQuery<OverviewData>({
    queryKey: ["/api/campaigns/overview"],
  });

  const { data: templates = [] } = useQuery<any[]>({
    queryKey: ["/api/campaigns/templates"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: NEON }} />
      </div>
    );
  }

  const d = data ?? {
    activeCampaigns: 0, scheduledCampaigns: 0, completedCampaigns: 0, draftCampaigns: 0,
    totalParticipants: 0, demoKeysRemaining: 0, fullKeysRemaining: 0, recentCampaigns: [],
  };

  const hasAnyCampaign = d.activeCampaigns + d.scheduledCampaigns + d.completedCampaigns + d.draftCampaigns > 0;
  const recommended = templates.filter((t: any) => t.recommended);

  return (
    <div className="space-y-6">
      {/* Primary CTA when no campaigns yet */}
      {!hasAnyCampaign && (
        <div className="rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-5"
          style={{ background: "rgba(183,255,24,0.06)", border: "1px solid rgba(183,255,24,0.25)" }}>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck size={15} style={{ color: NEON }} />
              <span className="text-xs font-bold uppercase tracking-wider text-[#B7FF18]">Gamefolio Verified Campaigns</span>
            </div>
            <h2 className="text-lg font-black text-white mb-1">Pick a campaign. Provide the keys. Gamefolio handles the rest.</h2>
            <p className="text-[13px] text-white/50">
              Browse our catalogue of proven campaign packages — each pre-defined with bounties, XP, validation rules and moderation.
            </p>
          </div>
          <button onClick={() => onNavigate("library")}
            className="shrink-0 flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-black transition-all hover:brightness-110 whitespace-nowrap"
            style={{ background: NEON, color: "#070b10" }}>
            <BookOpen size={14} /> Browse Campaign Library
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <StatCard icon={Target} label="Live Campaigns" value={d.activeCampaigns} accent />
        <StatCard icon={Calendar} label="Scheduled" value={d.scheduledCampaigns} />
        <StatCard icon={Users} label="Total Participants" value={d.totalParticipants} />
        <StatCard icon={ClipboardCheck} label="Completed" value={d.completedCampaigns} />
        <StatCard icon={Key} label="Demo Keys Left" value={d.demoKeysRemaining} />
        <StatCard icon={Key} label="Full Keys Left" value={d.fullKeysRemaining} />
        <StatCard icon={Rocket} label="Drafts" value={d.draftCampaigns} />
        <StatCard icon={BarChart3} label="Total Campaigns" value={d.activeCampaigns + d.scheduledCampaigns + d.completedCampaigns + d.draftCampaigns} />
      </div>

      {/* Recent campaigns */}
      {d.recentCampaigns.length > 0 && (
        <div className="rounded-2xl p-5" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Recent Campaigns</h3>
            <button onClick={() => onNavigate("campaigns")} className="text-xs font-bold" style={{ color: NEON }}>
              View all →
            </button>
          </div>
          <div className="space-y-2">
            {d.recentCampaigns.map((c: any) => (
              <div key={c.id} className="flex items-center gap-3 rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)" }}>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{c.game_name ?? "No game"}</div>
                  <div className="text-xs text-gray-500">{c.template_name}</div>
                </div>
                <span className="text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide shrink-0"
                  style={{ color: STATUS_COLORS[c.status] ?? "#94a3b8", background: `${STATUS_COLORS[c.status] ?? "#94a3b8"}18` }}>
                  {c.status.replace(/_/g, " ")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommended campaigns from library */}
      {recommended.length > 0 && (
        <div className="rounded-2xl p-5" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck size={13} style={{ color: NEON }} /> Recommended Campaigns
            </h3>
            <button onClick={() => onNavigate("library")} className="text-xs font-bold" style={{ color: NEON }}>
              View all →
            </button>
          </div>
          <div className="space-y-2">
            {recommended.slice(0, 3).map((t: any) => (
              <div key={t.id} className="flex items-center gap-3 rounded-xl p-3 cursor-pointer hover:bg-white/5 transition-colors"
                style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${CARD_BORDER}` }}
                onClick={() => onNavigate("library")}>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{t.name}</div>
                  <div className="text-xs text-white/30">{t.duration} days · {t.participant_capacity} participants</div>
                </div>
                <button onClick={e => { e.stopPropagation(); onRunCampaign(); }}
                  className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold"
                  style={{ background: "rgba(183,255,24,0.12)", color: NEON }}>
                  <Target size={10} /> Run
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────

export default function IndieDashboardPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabId>("overview");
  const [runWizardTemplate, setRunWizardTemplate] = useState<any>(null);

  const openRunWizard = (template?: any) => {
    if (template) {
      setRunWizardTemplate(template);
    } else {
      // Navigate to library so user picks a template
      setTab("library");
    }
  };

  return (
    <div className="min-h-screen" style={{ background: PAGE_BG }}>
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Page header */}
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(183,255,24,0.12)" }}>
            <Rocket className="h-5 w-5" style={{ color: NEON }} />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Indie Bounty Programme</h1>
            <p className="text-xs text-gray-500">
              Welcome{user?.displayName ? `, ${user.displayName}` : ""} — run Gamefolio Verified Campaigns for your game
            </p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1.5 mt-6 mb-6 overflow-x-auto pb-1 scrollbar-hide">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors"
                style={{
                  background: active ? "rgba(183,255,24,0.14)" : "rgba(255,255,255,0.04)",
                  color: active ? NEON : "rgba(255,255,255,0.55)",
                  border: `1px solid ${active ? "rgba(183,255,24,0.3)" : "rgba(255,255,255,0.08)"}`,
                }}>
                <t.icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        {tab === "overview"    && <OverviewTab onNavigate={setTab} onRunCampaign={openRunWizard} />}
        {tab === "library"     && <CampaignLibraryTab onRunCampaign={template => setRunWizardTemplate(template)} />}
        {tab === "campaigns"   && <MyCampaignsTab onBrowseLibrary={() => setTab("library")} />}
        {tab === "submissions" && <SubmissionReviewTab />}
        {tab === "keys"        && <KeyManagementTab />}
        {tab === "analytics"   && <AnalyticsTab />}
        {tab === "game-profile"&& <GameProfileTab />}
      </div>

      {/* Run Campaign Wizard modal */}
      {runWizardTemplate && (
        <RunCampaignWizard
          template={runWizardTemplate}
          onClose={() => setRunWizardTemplate(null)}
          onComplete={() => { setRunWizardTemplate(null); setTab("campaigns"); }}
        />
      )}
    </div>
  );
}
