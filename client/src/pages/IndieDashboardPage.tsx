import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useLocation } from "wouter";
import {
  Rocket, Users, Eye, Key, Zap, Inbox, Target, BarChart3,
  Gamepad, ListChecks, ClipboardCheck, KeyRound, Loader2,
  BookOpen, ShieldCheck, TrendingUp, Calendar, AlertTriangle,
  CheckCircle2, Circle, ChevronRight, Play, Pause, XCircle,
  Upload, Film, Camera, Megaphone, Star, AlertCircle,
  Video, Image as ImageIcon, FileText, Plus, ArrowUpRight,
  Package, Activity, Crosshair, RefreshCw,
} from "lucide-react";
import CampaignLibraryTab from "./indie-dashboard/CampaignLibraryTab";
import MyCampaignsTab from "./indie-dashboard/MyCampaignsTab";
import SubmissionReviewTab from "./indie-dashboard/SubmissionReviewTab";
import KeyManagementTab from "./indie-dashboard/KeyManagementTab";
import AnalyticsTab from "./indie-dashboard/AnalyticsTab";
import GameProfileTab from "./indie-dashboard/GameProfileTab";
import RunCampaignWizard from "./indie-dashboard/RunCampaignWizard";

export { NEON, CARD_BG, CARD_BORDER, PAGE_BG } from "./indie-dashboard/constants";
import { NEON, CARD_BG, CARD_BORDER, PAGE_BG } from "./indie-dashboard/constants";

const TABS = [
  { id: "overview",   label: "Dashboard",         icon: BarChart3 },
  { id: "library",    label: "Campaign Library",  icon: BookOpen },
  { id: "campaigns",  label: "My Campaigns",      icon: Target },
  { id: "submissions",label: "Submissions",        icon: ClipboardCheck },
  { id: "keys",       label: "Keys & Rewards",    icon: KeyRound },
  { id: "analytics",  label: "Analytics",         icon: TrendingUp },
  { id: "game-profile",label: "Game Profile",     icon: Gamepad },
] as const;

type TabId = typeof TABS[number]["id"];

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

const ESSENTIAL_FIELDS = ["gameName", "shortDescription", "headerImageUrl", "steamUrl", "epicUrl", "itchUrl"];
const ALL_PROFILE_FIELDS = [
  "gameName", "shortDescription", "headerImageUrl", "steamUrl", "epicUrl", "itchUrl",
  "fullDescription", "releaseDate", "studioName", "genres", "tags", "platforms",
  "capsuleImageUrl", "trailerUrl", "screenshotUrls", "keyFeatures",
  "websiteUrl", "twitterUrl", "discordUrl", "ageRating", "supportedLanguages",
];

function isFieldFilled(profile: any, f: string): boolean {
  if (!profile) return false;
  const v = profile[f];
  if (v === null || v === undefined || v === "") return false;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

function healthColor(val: number, warn: number, danger: number, invert = false) {
  if (invert) {
    if (val >= danger) return "#ef4444";
    if (val >= warn) return "#f59e0b";
    return NEON;
  }
  if (val <= danger) return "#ef4444";
  if (val <= warn) return "#f59e0b";
  return NEON;
}

// ─────────────────────────────────────────────
// Summary Card
// ─────────────────────────────────────────────
function SummaryCard({
  icon: Icon, label, value, sub, color, onClick, badge,
}: {
  icon: any; label: string; value: string | number; sub?: string;
  color?: string; onClick?: () => void; badge?: string;
}) {
  const c = color ?? NEON;
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className="rounded-2xl p-4 text-left w-full transition-all hover:brightness-110 disabled:cursor-default"
      style={{ background: `${c}0d`, border: `1px solid ${c}30` }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${c}18` }}>
          <Icon className="w-4 h-4" style={{ color: c }} />
        </div>
        {badge && (
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider"
            style={{ background: `${c}20`, color: c }}>
            {badge}
          </span>
        )}
      </div>
      <div className="text-2xl font-black text-white leading-none mb-1">{value}</div>
      <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{label}</div>
      {sub && <div className="text-[10px] text-white/30 mt-0.5">{sub}</div>}
    </button>
  );
}

// ─────────────────────────────────────────────
// Section wrapper
// ─────────────────────────────────────────────
function Section({ title, icon: Icon, action, children }: { title: string; icon: any; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-black text-white flex items-center gap-2">
          <Icon className="w-4 h-4" style={{ color: NEON }} />
          {title}
        </h3>
        {action}
      </div>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────
// Quick Action Button
// ─────────────────────────────────────────────
function QuickAction({ icon: Icon, label, onClick, accent }: { icon: any; label: string; onClick: () => void; accent?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all hover:brightness-110 whitespace-nowrap"
      style={{
        background: accent ? NEON : "rgba(255,255,255,0.05)",
        color: accent ? "#070b10" : "rgba(255,255,255,0.7)",
        border: accent ? "none" : "1px solid rgba(255,255,255,0.09)",
      }}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

// ─────────────────────────────────────────────
// Overview (Dashboard) Tab
// ─────────────────────────────────────────────
function OverviewTab({ onNavigate, onRunCampaign }: { onNavigate: (t: TabId) => void; onRunCampaign: () => void }) {
  const [, setLocation] = useLocation();

  const { data: overview, isLoading: loadingOverview } = useQuery<any>({
    queryKey: ["/api/campaigns/overview"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: profileData } = useQuery<any>({
    queryKey: ["/api/indie/profile"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: analyticsData } = useQuery<any>({
    queryKey: ["/api/indie/analytics"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: bountyStatus } = useQuery<any>({
    queryKey: ["/api/indie/bounty-status"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: contentData } = useQuery<any[]>({
    queryKey: ["/api/indie/creator-content"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: updatesData } = useQuery<any[]>({
    queryKey: ["/api/indie/updates"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: campaigns } = useQuery<any[]>({
    queryKey: ["/api/campaigns/my"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Profile completeness
  const profile = profileData?.profile ?? null;
  const essentialFilled = ESSENTIAL_FIELDS.filter(f => isFieldFilled(profile, f)).length;
  const allFilled = ALL_PROFILE_FIELDS.filter(f => isFieldFilled(profile, f)).length;
  const profilePct = Math.round((allFilled / ALL_PROFILE_FIELDS.length) * 100);
  const missingEssential = ESSENTIAL_FIELDS.filter(f => !isFieldFilled(profile, f));
  const missingOptional = ALL_PROFILE_FIELDS.filter(f => !ESSENTIAL_FIELDS.includes(f) && !isFieldFilled(profile, f)).slice(0, 4);

  // Campaign stats
  const d = overview ?? {
    activeCampaigns: 0, scheduledCampaigns: 0, completedCampaigns: 0, draftCampaigns: 0,
    totalParticipants: 0, demoKeysRemaining: 0, fullKeysRemaining: 0, recentCampaigns: [],
  };

  // Key inventory
  const demoKeys = bountyStatus?.demoKeys ?? { available: d.demoKeysRemaining ?? 0, claimed: 0 };
  const fullKeys = bountyStatus?.fullGameKeys ?? { available: d.fullKeysRemaining ?? 0, awarded: 0 };

  // Creator content
  const content = Array.isArray(contentData) ? contentData : [];
  const clips = content.filter((c: any) => c.type === "clip");
  const reels = content.filter((c: any) => c.type === "reel");
  const screenshots = content.filter((c: any) => c.type === "screenshot");

  // Analytics
  const clipsTotal = analyticsData?.clipsGenerated ?? 0;
  const screenshotsTotal = analyticsData?.screenshotsGenerated ?? 0;
  const reelsTotal = analyticsData?.reelsGenerated ?? 0;
  const contentTotal = clipsTotal + screenshotsTotal + reelsTotal;

  // Active campaigns for overview
  const activeCampaigns = (campaigns ?? []).filter((c: any) => c.status === "live" || c.status === "approved");
  const featuredContent = content.slice(0, 6);

  if (loadingOverview && !profile) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: NEON }} />
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── TOP SUMMARY CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <SummaryCard
          icon={Gamepad}
          label="Game Profile"
          value={`${profilePct}%`}
          sub={profilePct < 100 ? `${ALL_PROFILE_FIELDS.length - allFilled} fields missing` : "Fully complete"}
          color={healthColor(profilePct, 60, 30)}
          badge={profilePct < 60 ? "Needs Attention" : profilePct === 100 ? "Complete" : undefined}
          onClick={() => onNavigate("game-profile")}
        />
        <SummaryCard
          icon={Target}
          label="Active Campaigns"
          value={d.activeCampaigns}
          sub={d.activeCampaigns > 0 ? "Currently live" : "No active campaigns"}
          color={d.activeCampaigns > 0 ? NEON : "#f59e0b"}
          badge={d.activeCampaigns > 0 ? "LIVE" : undefined}
          onClick={() => onNavigate("campaigns")}
        />
        <SummaryCard
          icon={Users}
          label="Active Creators"
          value={d.totalParticipants}
          sub="Total across campaigns"
          color={d.totalParticipants > 0 ? NEON : "#94a3b8"}
          onClick={() => onNavigate("campaigns")}
        />
        <SummaryCard
          icon={KeyRound}
          label="Demo Keys"
          value={demoKeys.available}
          sub={`${demoKeys.claimed ?? 0} claimed`}
          color={healthColor(demoKeys.available, 10, 3)}
          badge={demoKeys.available < 5 ? "Low Stock" : undefined}
          onClick={() => onNavigate("keys")}
        />
        <SummaryCard
          icon={Film}
          label="Community Content"
          value={contentTotal}
          sub={`${clipsTotal} clips · ${screenshotsTotal} screenshots`}
          color={contentTotal > 0 ? NEON : "#94a3b8"}
          onClick={() => onNavigate("analytics")}
        />
        <SummaryCard
          icon={Star}
          label="Awaiting Feature"
          value={featuredContent.length}
          sub="Items to review"
          color={featuredContent.length > 0 ? "#f59e0b" : "#94a3b8"}
          badge={featuredContent.length > 0 ? "Review" : undefined}
          onClick={() => onNavigate("submissions")}
        />
        <SummaryCard
          icon={TrendingUp}
          label="Exposure"
          value={contentTotal > 0 ? `+${Math.min(99, contentTotal * 3)}%` : "—"}
          sub="Est. reach this week"
          color={NEON}
        />
        <SummaryCard
          icon={Package}
          label="Full Game Keys"
          value={fullKeys.available}
          sub={`${fullKeys.awarded ?? 0} awarded`}
          color={healthColor(fullKeys.available, 10, 3)}
          onClick={() => onNavigate("keys")}
        />
      </div>

      {/* ── QUICK ACTIONS ── */}
      <div className="rounded-2xl p-4" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
        <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Quick Actions</div>
        <div className="flex flex-wrap gap-2">
          <QuickAction icon={Plus} label="Run New Campaign" onClick={onRunCampaign} accent />
          <QuickAction icon={Gamepad} label="Edit Game Profile" onClick={() => onNavigate("game-profile")} />
          <QuickAction icon={Upload} label="Upload Keys" onClick={() => onNavigate("keys")} />
          <QuickAction icon={Film} label="Manage Content" onClick={() => onNavigate("submissions")} />
          <QuickAction icon={TrendingUp} label="View Analytics" onClick={() => onNavigate("analytics")} />
          <QuickAction icon={Megaphone} label="Publish Update" onClick={() => setLocation("/settings")} />
          <QuickAction icon={BarChart3} label="Browse Campaigns" onClick={() => onNavigate("library")} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ── PROFILE COMPLETENESS ── */}
        <Section title="Game Profile" icon={Gamepad} action={
          <button onClick={() => onNavigate("game-profile")}
            className="text-xs font-bold flex items-center gap-1" style={{ color: NEON }}>
            Edit <ChevronRight className="w-3 h-3" />
          </button>
        }>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-gray-500">Completeness</span>
                <span className="text-xs font-black" style={{ color: healthColor(profilePct, 60, 30) }}>{profilePct}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${profilePct}%`, background: healthColor(profilePct, 60, 30) }} />
              </div>
            </div>
            {missingEssential.length > 0 && (
              <div>
                <div className="text-[10px] font-bold text-red-400/70 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Essential missing
                </div>
                <div className="space-y-1">
                  {missingEssential.map(f => (
                    <button key={f} onClick={() => onNavigate("game-profile")}
                      className="flex items-center gap-2 text-[11px] text-white/50 hover:text-white/80 transition-colors w-full text-left">
                      <Circle className="w-2.5 h-2.5 shrink-0 text-red-400/50" />
                      {f.replace(/([A-Z])/g, " $1").trim()}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {missingOptional.length > 0 && (
              <div>
                <div className="text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-1.5">Recommended</div>
                <div className="space-y-1">
                  {missingOptional.map(f => (
                    <button key={f} onClick={() => onNavigate("game-profile")}
                      className="flex items-center gap-2 text-[11px] text-white/30 hover:text-white/60 transition-colors w-full text-left">
                      <Circle className="w-2.5 h-2.5 shrink-0 text-gray-700" />
                      {f.replace(/([A-Z])/g, " $1").trim()}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {profilePct === 100 && (
              <div className="flex items-center gap-2 text-xs" style={{ color: NEON }}>
                <CheckCircle2 className="w-4 h-4" /> Your game profile is complete!
              </div>
            )}
          </div>
        </Section>

        {/* ── KEY INVENTORY ── */}
        <Section title="Key Inventory" icon={KeyRound} action={
          <button onClick={() => onNavigate("keys")}
            className="text-xs font-bold flex items-center gap-1" style={{ color: NEON }}>
            Manage <ChevronRight className="w-3 h-3" />
          </button>
        }>
          <div className="space-y-4">
            {[
              { label: "Demo Keys", avail: demoKeys.available, claimed: demoKeys.claimed ?? 0, warn: 10, danger: 3 },
              { label: "Full Game Keys", avail: fullKeys.available, awarded: fullKeys.awarded ?? 0, warn: 10, danger: 3 },
            ].map(({ label, avail, claimed, awarded, warn, danger }) => {
              const total = avail + (claimed ?? awarded ?? 0);
              const pct = total > 0 ? Math.round((avail / total) * 100) : 0;
              const c = healthColor(avail, warn, danger);
              const isLow = avail <= danger;
              return (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-white/70">{label}</span>
                    <div className="flex items-center gap-2">
                      {isLow && <AlertTriangle className="w-3 h-3 text-red-400" />}
                      <span className="text-sm font-black" style={{ color: c }}>{avail} remaining</span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden mb-1" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: c }} />
                  </div>
                  <div className="text-[10px] text-gray-600">{claimed ?? awarded ?? 0} {claimed !== undefined ? "claimed" : "awarded"} · {total} total uploaded</div>
                  {isLow && (
                    <div className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-red-400/80">
                      <AlertCircle className="w-3 h-3" /> Running low — upload more keys
                    </div>
                  )}
                </div>
              );
            })}
            <button onClick={() => onNavigate("keys")}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all hover:brightness-110"
              style={{ background: "rgba(183,255,24,0.08)", color: NEON, border: "1px solid rgba(183,255,24,0.2)" }}>
              <Upload className="w-3.5 h-3.5" /> Upload More Keys
            </button>
          </div>
        </Section>

      </div>

      {/* ── CAMPAIGN OVERVIEW ── */}
      <Section title="Campaign Overview" icon={Target} action={
        <div className="flex items-center gap-2">
          <button onClick={onRunCampaign}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:brightness-110"
            style={{ background: NEON, color: "#070b10" }}>
            <Plus className="w-3 h-3" /> New Campaign
          </button>
          <button onClick={() => onNavigate("campaigns")}
            className="text-xs font-bold flex items-center gap-1" style={{ color: NEON }}>
            View all <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      }>
        {activeCampaigns.length === 0 && d.recentCampaigns.length === 0 ? (
          <div className="text-center py-8">
            <Crosshair className="w-8 h-8 mx-auto mb-3 text-white/10" />
            <p className="text-sm text-white/40 mb-3">No campaigns yet</p>
            <button onClick={() => onNavigate("library")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold"
              style={{ background: "rgba(183,255,24,0.1)", color: NEON, border: "1px solid rgba(183,255,24,0.25)" }}>
              <BookOpen className="w-3.5 h-3.5" /> Browse Campaign Library
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {(activeCampaigns.length > 0 ? activeCampaigns : d.recentCampaigns).slice(0, 4).map((c: any) => {
              const statusColor = STATUS_COLORS[c.status] ?? "#94a3b8";
              const daysLeft = c.ends_at ? Math.max(0, Math.ceil((new Date(c.ends_at).getTime() - Date.now()) / 86400000)) : null;
              const completionPct = c.participant_count && c.participant_capacity
                ? Math.round((c.participant_count / c.participant_capacity) * 100)
                : null;
              return (
                <div key={c.id} className="rounded-xl p-3.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-white truncate">{c.template_name ?? c.name ?? "Campaign"}</div>
                      <div className="text-[10px] text-gray-600">{c.game_name ?? "Your game"}</div>
                    </div>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide shrink-0"
                      style={{ color: statusColor, background: `${statusColor}18` }}>
                      {(c.status ?? "").replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center mb-2.5">
                    <div>
                      <div className="text-xs font-black text-white">{c.participant_count ?? 0}</div>
                      <div className="text-[9px] text-gray-600 uppercase">Creators</div>
                    </div>
                    {completionPct !== null && (
                      <div>
                        <div className="text-xs font-black" style={{ color: NEON }}>{completionPct}%</div>
                        <div className="text-[9px] text-gray-600 uppercase">Full</div>
                      </div>
                    )}
                    {daysLeft !== null && (
                      <div>
                        <div className="text-xs font-black text-white">{daysLeft}d</div>
                        <div className="text-[9px] text-gray-600 uppercase">Left</div>
                      </div>
                    )}
                  </div>
                  {completionPct !== null && (
                    <div className="h-1 rounded-full overflow-hidden mb-2.5" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div className="h-full rounded-full" style={{ width: `${completionPct}%`, background: NEON }} />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => onNavigate("campaigns")}
                      className="flex-1 text-[10px] font-bold py-1.5 rounded-lg transition-all hover:brightness-110"
                      style={{ background: "rgba(183,255,24,0.1)", color: NEON }}>
                      View
                    </button>
                    <button onClick={() => onNavigate("submissions")}
                      className="flex-1 text-[10px] font-bold py-1.5 rounded-lg transition-all"
                      style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)" }}>
                      Submissions
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ── CONTENT WAITING FOR REVIEW ── */}
        <Section title="Content Waiting for Review" icon={Star} action={
          <button onClick={() => onNavigate("submissions")}
            className="text-xs font-bold flex items-center gap-1" style={{ color: NEON }}>
            Review all <ChevronRight className="w-3 h-3" />
          </button>
        }>
          {clips.length === 0 && reels.length === 0 && screenshots.length === 0 ? (
            <div className="text-center py-6">
              <Inbox className="w-7 h-7 mx-auto mb-2 text-white/10" />
              <p className="text-xs text-white/30">No content waiting to be featured</p>
            </div>
          ) : (
            <div className="space-y-3">
              {[
                { label: "Clips", count: clips.length, icon: Film, color: "#818cf8" },
                { label: "Reels", count: reels.length, icon: Video, color: "#f472b6" },
                { label: "Screenshots", count: screenshots.length, icon: Camera, color: "#34d399" },
              ].filter(x => x.count > 0).map(({ label, count, icon: Icon, color }) => (
                <div key={label} className="flex items-center gap-3 rounded-xl p-3"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}18` }}>
                    <Icon className="w-4 h-4" style={{ color }} />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-white">{count} {label}</div>
                    <div className="text-[10px] text-gray-600">Waiting to be featured</div>
                  </div>
                  <button onClick={() => onNavigate("submissions")}
                    className="text-[10px] font-bold px-3 py-1.5 rounded-lg"
                    style={{ background: `${color}18`, color }}>
                    Review
                  </button>
                </div>
              ))}
              {featuredContent.slice(0, 2).map((item: any, i: number) => (
                <div key={item.id ?? i} className="flex items-center gap-3 rounded-xl p-2.5"
                  style={{ background: "rgba(255,255,255,0.02)" }}>
                  {item.thumbnail_url ? (
                    <img src={item.thumbnail_url} alt="" className="w-12 h-8 rounded object-cover shrink-0" />
                  ) : (
                    <div className="w-12 h-8 rounded shrink-0 flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
                      <ImageIcon className="w-3.5 h-3.5 text-white/20" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-semibold text-white/70 truncate">{item.creator_username ?? "Creator"}</div>
                    <div className="text-[9px] text-gray-600">{item.views ?? 0} views</div>
                  </div>
                  <button className="text-[10px] font-bold px-2 py-1 rounded" style={{ background: "rgba(183,255,24,0.1)", color: NEON }}>
                    Feature
                  </button>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* ── ANALYTICS SNAPSHOT ── */}
        <Section title="Analytics Snapshot" icon={BarChart3} action={
          <button onClick={() => onNavigate("analytics")}
            className="text-xs font-bold flex items-center gap-1" style={{ color: NEON }}>
            Full report <ChevronRight className="w-3 h-3" />
          </button>
        }>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Community Clips", value: clipsTotal, icon: Film, color: "#818cf8" },
              { label: "Community Reels", value: reelsTotal, icon: Video, color: "#f472b6" },
              { label: "Screenshots", value: screenshotsTotal, icon: Camera, color: "#34d399" },
              { label: "Total Content", value: contentTotal, icon: Activity, color: NEON },
              { label: "Campaigns Run", value: (d.activeCampaigns ?? 0) + (d.completedCampaigns ?? 0), icon: Target, color: "#60a5fa" },
              { label: "Creators Joined", value: d.totalParticipants ?? 0, icon: Users, color: "#f59e0b" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="rounded-xl p-3 flex items-center gap-2.5"
                style={{ background: "rgba(255,255,255,0.03)" }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}15` }}>
                  <Icon className="w-3.5 h-3.5" style={{ color }} />
                </div>
                <div>
                  <div className="text-base font-black text-white">{value}</div>
                  <div className="text-[9px] text-gray-600 uppercase tracking-wider">{label}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>

      </div>

      {/* ── RECENT UPDATES ── */}
      {updatesData && updatesData.length > 0 && (
        <Section title="Recent Updates" icon={Megaphone} action={
          <button onClick={() => setLocation("/settings")}
            className="text-xs font-bold flex items-center gap-1" style={{ color: NEON }}>
            Manage <ChevronRight className="w-3 h-3" />
          </button>
        }>
          <div className="space-y-2">
            {updatesData.slice(0, 3).map((u: any) => (
              <div key={u.id} className="flex items-center gap-3 rounded-xl p-3"
                style={{ background: "rgba(255,255,255,0.03)" }}>
                <div className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: u.published ? NEON : "#94a3b8" }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{u.title}</div>
                  <div className="text-[10px] text-gray-600">{u.published ? "Published" : "Draft"} · {u.type}</div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{
                    background: u.published ? "rgba(183,255,24,0.1)" : "rgba(255,255,255,0.05)",
                    color: u.published ? NEON : "#94a3b8",
                  }}>
                  {u.published ? "Live" : "Draft"}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── NO CAMPAIGNS CTA ── */}
      {d.activeCampaigns === 0 && d.scheduledCampaigns === 0 && (
        <div className="rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-5"
          style={{ background: "rgba(183,255,24,0.04)", border: "1px solid rgba(183,255,24,0.2)" }}>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4" style={{ color: NEON }} />
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: NEON }}>
                Gamefolio Verified Campaigns
              </span>
            </div>
            <h2 className="text-base font-black text-white mb-1">
              Launch a campaign and let creators do the marketing.
            </h2>
            <p className="text-[13px] text-white/40">
              Provide demo keys. Gamefolio handles bounties, creator management and moderation.
            </p>
          </div>
          <button onClick={() => onNavigate("library")}
            className="shrink-0 flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-black transition-all hover:brightness-110 whitespace-nowrap"
            style={{ background: NEON, color: "#070b10" }}>
            <BookOpen className="w-4 h-4" /> Browse Campaign Library
          </button>
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
      setTab("library");
    }
  };

  return (
    <div className="min-h-screen" style={{ background: PAGE_BG }}>
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Page header */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(183,255,24,0.12)" }}>
              <Rocket className="h-5 w-5" style={{ color: NEON }} />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">Game Dashboard</h1>
              <p className="text-xs text-gray-500">
                {user?.displayName ? `Welcome back, ${user.displayName}` : "Your indie game command centre"}
              </p>
            </div>
          </div>
          <button
            onClick={() => openRunWizard()}
            className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all hover:brightness-110"
            style={{ background: NEON, color: "#070b10" }}>
            <Plus className="w-3.5 h-3.5" /> New Campaign
          </button>
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
