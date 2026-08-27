import { useState, useEffect } from "react";
import { useSearch } from "wouter";
import {
  Target, BarChart3, KeyRound, Film, Settings, LayoutDashboard,
} from "lucide-react";
import { CAMPAIGNS_ENABLED, GAME_KEYS_ENABLED } from "@/lib/feature-flags";
import CreateCampaignFlow from "./indie-dashboard/CreateCampaignFlow";
import MyCampaignsTab from "./indie-dashboard/MyCampaignsTab";
import CreatorContentTab from "./indie-dashboard/CreatorContentTab";
import KeyManagementTab from "./indie-dashboard/KeyManagementTab";
import AnalyticsTab from "./indie-dashboard/AnalyticsTab";
import GameProfileTab from "./indie-dashboard/GameProfileTab";
import RunCampaignWizard from "./indie-dashboard/RunCampaignWizard";
import GameHeroBanner from "./indie-dashboard/GameHeroBanner";
import DashboardTab from "./indie-dashboard/DashboardTab";

export { NEON, CARD_BG, CARD_BORDER, PAGE_BG, DASHBOARD_THEME } from "./indie-dashboard/constants";
import { DASHBOARD_THEME } from "./indie-dashboard/constants";

type TopTabId = "overview" | "campaigns" | "creator-content" | "keys" | "analytics" | "game-profile";
type CampaignSubTab = "create" | "my";


// "Campaigns" tab hidden while CAMPAIGNS_ENABLED is false — bounty campaigns
// are shipping in a later build. Filtered out of this array (not just
// unlisted) so it also can't be reached via the ?tab= deep-link guard below,
// which validates against these ids.
const TOP_TABS: { id: TopTabId; label: string; icon: any }[] = [
  { id: "overview",        label: "Overview",       icon: LayoutDashboard },
  { id: "game-profile",    label: "Game Profile",   icon: Settings },
  ...(CAMPAIGNS_ENABLED ? [{ id: "campaigns" as const, label: "Campaigns", icon: Target }] : []),
  { id: "creator-content", label: "Content",         icon: Film },
  ...(GAME_KEYS_ENABLED ? [{ id: "keys" as const, label: "Keys", icon: KeyRound }] : []),
  { id: "analytics",       label: "Analytics",      icon: BarChart3 },
];

const TOP_TAB_IDS = TOP_TABS.map((t) => t.id);

export default function IndieDashboardPage() {
  const [tab, setTab] = useState<TopTabId>("overview");
  const [campaignSub, setCampaignSub] = useState<CampaignSubTab>("my");
  const [runWizardTemplate, setRunWizardTemplate] = useState<any>(null);

  const search = useSearch();
  const gameIdParam = new URLSearchParams(search).get("gameId");
  const activeGameId = gameIdParam && /^\d+$/.test(gameIdParam) ? Number(gameIdParam) : undefined;
  useEffect(() => {
    const tabParam = new URLSearchParams(search).get("tab");
    if (tabParam && (TOP_TAB_IDS as string[]).includes(tabParam)) {
      setTab(tabParam as TopTabId);
    }
  }, [search]);

  const goTo = (toTab: TopTabId, sub?: string) => {
    setTab(toTab);
    if (toTab === "campaigns" && sub) setCampaignSub(sub as CampaignSubTab);
  };

  const openRunWizard = (template?: any) => {
    if (template) setRunWizardTemplate(template);
    else goTo("campaigns", "create");
  };

  return (
    <div className="min-h-screen" style={{ background: DASHBOARD_THEME.page, color: DASHBOARD_THEME.text }}>
      {/* Full-width cinematic hero banner (edge-to-edge) */}
      <GameHeroBanner gameId={activeGameId} />

      <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Top tab bar — underline style */}
        <div className="flex items-center overflow-x-auto scrollbar-hide mb-10"
          style={{ borderBottom: `1px solid ${DASHBOARD_THEME.borderSubtle}` }}>
          {TOP_TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="relative flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold whitespace-nowrap transition-colors"
                style={{ color: active ? DASHBOARD_THEME.accent : DASHBOARD_THEME.textMuted }}>
                <t.icon className="w-3.5 h-3.5" />
                {t.label}
                {active && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full"
                    style={{ background: DASHBOARD_THEME.accent }} />
                )}
              </button>
            );
          })}
        </div>

        {/* ── OVERVIEW ── */}
        {tab === "overview" && (
          <DashboardTab onGoTo={goTo} />
        )}

        {/* ── CAMPAIGNS ── */}
        {CAMPAIGNS_ENABLED && tab === "campaigns" && (
          <>
            {campaignSub === "my" && (
              <MyCampaignsTab onCreateCampaign={() => setCampaignSub("create")} />
            )}
            {campaignSub === "create" && (
              <CreateCampaignFlow onComplete={() => goTo("campaigns", "my")} />
            )}
          </>
        )}

        {/* ── CONTENT ── */}
        {tab === "creator-content" && <CreatorContentTab />}

        {/* ── KEYS ── */}
        {GAME_KEYS_ENABLED && tab === "keys" && <KeyManagementTab />}

        {/* ── ANALYTICS ── */}
        {tab === "analytics" && <AnalyticsTab />}

        {/* ── GAME PROFILE ── */}
        {tab === "game-profile" && <GameProfileTab gameId={activeGameId} />}

      </div>

      {runWizardTemplate && (
        <RunCampaignWizard
          template={runWizardTemplate}
          onClose={() => setRunWizardTemplate(null)}
          onComplete={() => { setRunWizardTemplate(null); goTo("campaigns", "my"); }}
        />
      )}
    </div>
  );
}
