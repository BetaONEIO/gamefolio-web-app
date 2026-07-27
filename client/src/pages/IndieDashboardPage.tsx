import { useState } from "react";
import {
  Target, BarChart3, KeyRound, Film, Settings, LayoutDashboard,
} from "lucide-react";
import CreateCampaignFlow from "./indie-dashboard/CreateCampaignFlow";
import MyCampaignsTab from "./indie-dashboard/MyCampaignsTab";
import CreatorContentTab from "./indie-dashboard/CreatorContentTab";
import KeyManagementTab from "./indie-dashboard/KeyManagementTab";
import AnalyticsTab from "./indie-dashboard/AnalyticsTab";
import GameProfileTab from "./indie-dashboard/GameProfileTab";
import RunCampaignWizard from "./indie-dashboard/RunCampaignWizard";
import GameHeroBanner from "./indie-dashboard/GameHeroBanner";
import DashboardTab from "./indie-dashboard/DashboardTab";

import { NEON, PAGE_BG } from "./indie-dashboard/constants";

type TopTabId = "overview" | "campaigns" | "creator-content" | "keys" | "analytics" | "game-profile";
type CampaignSubTab = "create" | "my";


const TOP_TABS: { id: TopTabId; label: string; icon: any }[] = [
  { id: "overview",        label: "Overview",       icon: LayoutDashboard },
  { id: "campaigns",       label: "Campaigns",      icon: Target },
  { id: "creator-content", label: "Creator Content", icon: Film },
  { id: "keys",            label: "Keys",           icon: KeyRound },
  { id: "analytics",       label: "Analytics",      icon: BarChart3 },
  { id: "game-profile",    label: "Game Profile",   icon: Settings },
];

export default function IndieDashboardPage() {
  const [tab, setTab] = useState<TopTabId>("overview");
  const [campaignSub, setCampaignSub] = useState<CampaignSubTab>("my");
  const [runWizardTemplate, setRunWizardTemplate] = useState<any>(null);

  const goTo = (toTab: TopTabId, sub?: string) => {
    setTab(toTab);
    if (toTab === "campaigns" && sub) setCampaignSub(sub as CampaignSubTab);
  };

  const openRunWizard = (template?: any) => {
    if (template) setRunWizardTemplate(template);
    else goTo("campaigns", "create");
  };

  return (
    <div className="min-h-screen" style={{ background: PAGE_BG }}>
      {/* Full-width cinematic hero banner (edge-to-edge) */}
      <GameHeroBanner />

      <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Top tab bar — underline style */}
        <div className="flex items-center overflow-x-auto scrollbar-hide mb-10"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          {TOP_TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="relative flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold whitespace-nowrap transition-colors"
                style={{ color: active ? NEON : "rgba(255,255,255,0.4)" }}>
                <t.icon className="w-3.5 h-3.5" />
                {t.label}
                {active && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full"
                    style={{ background: NEON }} />
                )}
              </button>
            );
          })}
        </div>

        {/* ── OVERVIEW ── */}
        {tab === "overview" && (
          <DashboardTab onGoTo={goTo} onRunCampaign={openRunWizard} />
        )}

        {/* ── CAMPAIGNS ── */}
        {tab === "campaigns" && (
          <>
            {campaignSub === "my" && (
              <MyCampaignsTab onCreateCampaign={() => setCampaignSub("create")} />
            )}
            {campaignSub === "create" && (
              <CreateCampaignFlow onComplete={() => goTo("campaigns", "my")} />
            )}
          </>
        )}

        {/* ── CREATOR CONTENT ── */}
        {tab === "creator-content" && <CreatorContentTab />}

        {/* ── KEYS ── */}
        {tab === "keys" && <KeyManagementTab />}

        {/* ── ANALYTICS ── */}
        {tab === "analytics" && <AnalyticsTab />}

        {/* ── GAME PROFILE ── */}
        {tab === "game-profile" && <GameProfileTab />}

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
