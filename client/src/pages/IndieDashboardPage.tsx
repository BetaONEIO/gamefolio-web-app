import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import {
  Rocket, Trophy, Users, Eye, Key, Zap, Inbox, Sparkles,
  Plus, ListChecks, ClipboardCheck, KeyRound, BarChart3, Loader2, Gamepad2,
} from "lucide-react";
import CreateBountyWizard from "./indie-dashboard/CreateBountyWizard";
import ActiveBountiesTab from "./indie-dashboard/ActiveBountiesTab";
import SubmissionReviewTab from "./indie-dashboard/SubmissionReviewTab";
import KeyManagementTab from "./indie-dashboard/KeyManagementTab";
import AnalyticsTab from "./indie-dashboard/AnalyticsTab";

export const NEON = "#c1ff00";
export const CARD_BG = "rgba(255,255,255,0.04)";
export const CARD_BORDER = "rgba(255,255,255,0.09)";
export const PAGE_BG = "#070b10";

const TABS = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "create", label: "Create Bounty", icon: Plus },
  { id: "bounties", label: "Active Bounties", icon: ListChecks },
  { id: "review", label: "Submission Review", icon: ClipboardCheck },
  { id: "keys", label: "Key Management", icon: KeyRound },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
] as const;

type TabId = typeof TABS[number]["id"];

interface OverviewData {
  totalBounties: number;
  activeBounties: number;
  draftBounties: number;
  endedBounties: number;
  demoKeysRemaining: number;
  fullKeysRemaining: number;
  totalCreators: number;
  totalViews: number;
  totalXpAwarded: number;
  pendingSubmissions: number;
  recentBounties: Array<{
    id: number;
    title: string;
    status: string;
    createdAt: string;
    gameName: string | null;
    gameImageUrl: string | null;
  }>;
}

function StatCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string | number; accent?: boolean }) {
  return (
    <div
      className="rounded-2xl p-4 flex items-center gap-3"
      style={{ background: CARD_BG, border: `1px solid ${accent ? "rgba(193,255,0,0.25)" : CARD_BORDER}` }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: accent ? "rgba(193,255,0,0.12)" : "rgba(255,255,255,0.06)" }}
      >
        <Icon className="w-5 h-5" style={{ color: accent ? NEON : "#fff" }} />
      </div>
      <div>
        <div className="text-xl font-black text-white">{value}</div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{label}</div>
      </div>
    </div>
  );
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: "Active", color: "#4ade80", bg: "rgba(74,222,128,0.12)" },
  draft: { label: "Draft", color: "#facc15", bg: "rgba(250,204,21,0.12)" },
  paused: { label: "Paused", color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
  ended: { label: "Ended", color: "#f87171", bg: "rgba(248,113,113,0.12)" },
  cancelled: { label: "Cancelled", color: "#f87171", bg: "rgba(248,113,113,0.12)" },
};

function OverviewTab({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  const { data, isLoading } = useQuery<OverviewData>({
    queryKey: ["/api/games/indie/overview"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: NEON }} />
      </div>
    );
  }

  const d = data ?? {
    totalBounties: 0, activeBounties: 0, draftBounties: 0, endedBounties: 0,
    demoKeysRemaining: 0, fullKeysRemaining: 0, totalCreators: 0, totalViews: 0,
    totalXpAwarded: 0, pendingSubmissions: 0, recentBounties: [],
  };

  return (
    <div className="space-y-6">
      {d.pendingSubmissions > 0 && (
        <button
          onClick={() => onNavigate("review")}
          className="w-full flex items-center gap-3 rounded-2xl p-4 text-left transition-transform hover:-translate-y-0.5"
          style={{ background: "rgba(193,255,0,0.08)", border: "1px solid rgba(193,255,0,0.3)" }}
        >
          <Inbox className="w-5 h-5 shrink-0" style={{ color: NEON }} />
          <div className="flex-1">
            <div className="text-sm font-bold text-white">
              {d.pendingSubmissions} submission{d.pendingSubmissions === 1 ? "" : "s"} awaiting review
            </div>
            <div className="text-xs text-gray-400">Review creator content to release rewards</div>
          </div>
          <span className="text-xs font-bold" style={{ color: NEON }}>Review now →</span>
        </button>
      )}

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <StatCard icon={Trophy} label="Active Bounties" value={d.activeBounties} accent />
        <StatCard icon={Users} label="Creators Joined" value={d.totalCreators} />
        <StatCard icon={Eye} label="Total Views" value={d.totalViews.toLocaleString()} />
        <StatCard icon={Zap} label="XP Awarded" value={d.totalXpAwarded.toLocaleString()} />
        <StatCard icon={Key} label="Demo Keys Left" value={d.demoKeysRemaining} />
        <StatCard icon={Key} label="Full Keys Left" value={d.fullKeysRemaining} />
        <StatCard icon={Sparkles} label="Draft Bounties" value={d.draftBounties} />
        <StatCard icon={ListChecks} label="Total Bounties" value={d.totalBounties} />
      </div>

      <div className="rounded-2xl p-5" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Recent Bounties</h3>
          <button onClick={() => onNavigate("bounties")} className="text-xs font-bold" style={{ color: NEON }}>
            View all →
          </button>
        </div>
        {d.recentBounties.length === 0 ? (
          <div className="text-center py-10">
            <Rocket className="w-8 h-8 mx-auto mb-3 text-gray-600" />
            <p className="text-sm text-gray-500 mb-4">You haven't launched a bounty yet.</p>
            <button
              onClick={() => onNavigate("create")}
              className="text-sm font-bold px-4 py-2 rounded-xl"
              style={{ background: NEON, color: "#0a0f1c" }}
            >
              Create Your First Bounty
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {d.recentBounties.map((b) => {
              const cfg = STATUS_CONFIG[b.status] ?? STATUS_CONFIG.active;
              return (
                <div
                  key={b.id}
                  className="flex items-center gap-3 rounded-xl p-3"
                  style={{ background: "rgba(255,255,255,0.03)" }}
                >
                  {b.gameImageUrl ? (
                    <img src={b.gameImageUrl} alt={b.gameName ?? ""} className="w-9 h-9 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <Gamepad2 className="w-4 h-4 text-gray-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{b.title}</div>
                    <div className="text-xs text-gray-500 truncate">{b.gameName ?? "Unknown game"}</div>
                  </div>
                  <span
                    className="text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide shrink-0"
                    style={{ color: cfg.color, background: cfg.bg }}
                  >
                    {cfg.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function IndieDashboardPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabId>("overview");

  return (
    <div className="min-h-screen" style={{ background: PAGE_BG }}>
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(193,255,0,0.12)" }}>
            <Rocket className="h-5 w-5" style={{ color: NEON }} />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Indie Developer Dashboard</h1>
            <p className="text-xs text-gray-500">
              Welcome{user?.displayName ? `, ${user.displayName}` : ""} — manage your content bounties
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 mt-6 mb-6 overflow-x-auto pb-1">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors"
                style={{
                  background: active ? "rgba(193,255,0,0.14)" : "rgba(255,255,255,0.04)",
                  color: active ? NEON : "rgba(255,255,255,0.55)",
                  border: `1px solid ${active ? "rgba(193,255,0,0.3)" : "rgba(255,255,255,0.08)"}`,
                }}
              >
                <t.icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {tab === "overview" && <OverviewTab onNavigate={setTab} />}
        {tab === "create" && <CreateBountyWizard onCreated={() => setTab("bounties")} />}
        {tab === "bounties" && <ActiveBountiesTab onCreateNew={() => setTab("create")} />}
        {tab === "review" && <SubmissionReviewTab />}
        {tab === "keys" && <KeyManagementTab />}
        {tab === "analytics" && <AnalyticsTab />}
      </div>
    </div>
  );
}
