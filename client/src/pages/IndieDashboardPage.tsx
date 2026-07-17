import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import {
  Rocket, Users, Target, BarChart3,
  Gamepad, KeyRound, Loader2,
  BookOpen, TrendingUp, AlertTriangle,
  CheckCircle2, ChevronRight,
  Upload, Film, Camera,
  Video, Plus, ArrowUpRight,
  Crosshair, Settings, LayoutDashboard,
  AlertCircle, Star, Circle,
} from "lucide-react";
import CampaignLibraryTab from "./indie-dashboard/CampaignLibraryTab";
import MyCampaignsTab from "./indie-dashboard/MyCampaignsTab";
import SubmissionReviewTab from "./indie-dashboard/SubmissionReviewTab";
import KeyManagementTab from "./indie-dashboard/KeyManagementTab";
import AnalyticsTab from "./indie-dashboard/AnalyticsTab";
import GameProfileTab from "./indie-dashboard/GameProfileTab";
import RunCampaignWizard from "./indie-dashboard/RunCampaignWizard";

export { NEON, CARD_BG, CARD_BORDER, PAGE_BG } from "./indie-dashboard/constants";
import { NEON, PAGE_BG } from "./indie-dashboard/constants";

type TopTabId = "overview" | "campaigns" | "community" | "keys" | "analytics" | "settings";
type CampaignSubTab = "library" | "my";
type CommunitySubTab = "content" | "submissions";
type SettingsSubTab = "profile" | "store";

const ESSENTIAL_FIELDS = ["gameName", "shortDescription", "headerImageUrl", "steamUrl", "epicUrl", "itchUrl"];
const ALL_PROFILE_FIELDS = [
  "gameName", "shortDescription", "headerImageUrl", "steamUrl", "epicUrl", "itchUrl",
  "fullDescription", "releaseDate", "studioName", "genres", "tags", "platforms",
  "capsuleImageUrl", "trailerUrl", "screenshotUrls", "keyFeatures",
  "websiteUrl", "twitterUrl", "discordUrl", "ageRating", "supportedLanguages",
];

const PROFILE_STEPS: { field: string; label: string; pct: number }[] = [
  { field: "trailerUrl",      label: "Upload a trailer",       pct: 5 },
  { field: "steamUrl",        label: "Add Steam Store URL",    pct: 3 },
  { field: "discordUrl",      label: "Connect Discord",        pct: 2 },
  { field: "fullDescription", label: "Write full description", pct: 4 },
  { field: "screenshotUrls",  label: "Add screenshots",        pct: 3 },
  { field: "capsuleImageUrl", label: "Add capsule image",      pct: 2 },
  { field: "keyFeatures",     label: "List key features",      pct: 2 },
  { field: "genres",          label: "Tag your genres",        pct: 1 },
  { field: "platforms",       label: "Select platforms",       pct: 1 },
  { field: "websiteUrl",      label: "Add website URL",        pct: 1 },
];

function isFieldFilled(profile: any, f: string): boolean {
  if (!profile) return false;
  const v = profile[f];
  if (v === null || v === undefined || v === "") return false;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

const STATUS_COLORS: Record<string, string> = {
  live: NEON, approved: "#4ade80", scheduled: "#60a5fa",
  awaiting_review: "#f59e0b", changes_requested: "#f97316",
  draft: "#94a3b8", completed: "#4ade80", cancelled: "#f87171", paused: "#94a3b8",
};

function SubNav({ items, active, onChange }: {
  items: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-1 mb-7"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      {items.map(({ id, label }) => (
        <button key={id} onClick={() => onChange(id)}
          className="relative px-4 py-2.5 text-xs font-bold transition-colors"
          style={{ color: active === id ? NEON : "rgba(255,255,255,0.4)" }}>
          {label}
          {active === id && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full"
              style={{ background: NEON }} />
          )}
        </button>
      ))}
    </div>
  );
}

function DashboardTab({
  onGoTo,
  onRunCampaign,
}: {
  onGoTo: (tab: TopTabId, sub?: string) => void;
  onRunCampaign: () => void;
}) {
  const { data: overview, isLoading } = useQuery<any>({
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
  const { data: campaigns } = useQuery<any[]>({
    queryKey: ["/api/campaigns/my"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const profile = profileData?.profile ?? null;
  const allFilled = ALL_PROFILE_FIELDS.filter(f => isFieldFilled(profile, f)).length;
  const profilePct = Math.round((allFilled / ALL_PROFILE_FIELDS.length) * 100);
  const missingEssential = ESSENTIAL_FIELDS.filter(f => !isFieldFilled(profile, f));
  const nextSteps = PROFILE_STEPS.filter(s => !isFieldFilled(profile, s.field)).slice(0, 3);

  const d = overview ?? {
    activeCampaigns: 0, totalParticipants: 0,
    demoKeysRemaining: 0, fullKeysRemaining: 0, recentCampaigns: [],
  };
  const demoKeys = bountyStatus?.demoKeys ?? { available: d.demoKeysRemaining ?? 0, claimed: 0 };
  const fullKeys = bountyStatus?.fullGameKeys ?? { available: d.fullKeysRemaining ?? 0, awarded: 0 };
  const content = Array.isArray(contentData) ? contentData : [];
  const clipsTotal = analyticsData?.clipsGenerated ?? 0;
  const screenshotsTotal = analyticsData?.screenshotsGenerated ?? 0;
  const reelsTotal = analyticsData?.reelsGenerated ?? 0;
  const contentTotal = clipsTotal + screenshotsTotal + reelsTotal;
  const activeCampaigns = (campaigns ?? []).filter((c: any) => c.status === "live" || c.status === "approved");
  const exposureEst = contentTotal > 0 ? `+${Math.min(99, contentTotal * 3)}%` : "—";

  const attentionItems: {
    icon: any; color: string; title: string; desc: string; cta: string; action: () => void;
  }[] = [];
  if (missingEssential.length > 0) {
    attentionItems.push({
      icon: AlertCircle, color: "#f87171",
      title: "Complete your game profile",
      desc: `${missingEssential.length} essential field${missingEssential.length > 1 ? "s" : ""} still missing`,
      cta: "Edit Profile",
      action: () => onGoTo("settings", "profile"),
    });
  }
  if (demoKeys.available < 5) {
    attentionItems.push({
      icon: AlertTriangle, color: "#f59e0b",
      title: "Demo key stock is running low",
      desc: `Only ${demoKeys.available} key${demoKeys.available === 1 ? "" : "s"} remaining`,
      cta: "Upload Keys",
      action: () => onGoTo("keys"),
    });
  }
  if (content.length > 0) {
    attentionItems.push({
      icon: Star, color: "#a78bfa",
      title: `Review ${content.length} creator submission${content.length > 1 ? "s" : ""}`,
      desc: "Feature the best community content",
      cta: "Review",
      action: () => onGoTo("community", "submissions"),
    });
  }
  if (activeCampaigns.length === 0) {
    attentionItems.push({
      icon: Rocket, color: NEON,
      title: "Launch your first campaign",
      desc: "Recruit creators to build buzz for your game",
      cta: "Browse Templates",
      action: () => onGoTo("campaigns", "library"),
    });
  }

  if (isLoading && !profile) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: NEON }} />
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* HERO — full width */}
      <div className="rounded-2xl p-6 sm:p-8 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(183,255,24,0.055) 0%, rgba(255,255,255,0.018) 100%)",
          border: "1px solid rgba(183,255,24,0.13)",
        }}>
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(183,255,24,0.06) 0%, transparent 65%)" }} />

        <div className="flex flex-col sm:flex-row sm:items-start gap-6 relative z-10">
          <div className="w-16 h-16 rounded-2xl shrink-0 overflow-hidden flex items-center justify-center"
            style={{ background: "rgba(183,255,24,0.08)", border: "1px solid rgba(183,255,24,0.18)" }}>
            {(profile?.capsuleImageUrl || profile?.headerImageUrl) ? (
              <img src={profile.capsuleImageUrl ?? profile.headerImageUrl} alt=""
                className="w-full h-full object-cover" />
            ) : (
              <Gamepad className="w-7 h-7" style={{ color: NEON }} />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: NEON }}>
              Your Game
            </p>
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-5 leading-tight">
              {profile?.gameName ?? "Set up your game"}
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
              {[
                {
                  label: "Game Profile",
                  value: `${profilePct}%`,
                  sub: profilePct < 100 ? "complete" : "Complete ✓",
                  color: profilePct >= 80 ? NEON : profilePct >= 50 ? "#f59e0b" : "#f87171",
                  badge: undefined as string | undefined,
                },
                {
                  label: "Active Campaign",
                  value: activeCampaigns.length > 0 ? "Live" : "None",
                  sub: activeCampaigns.length > 0
                    ? (activeCampaigns[0].template_name ?? activeCampaigns[0].name ?? "Campaign")
                    : "No active campaign",
                  color: activeCampaigns.length > 0 ? NEON : "#475569",
                  badge: activeCampaigns.length > 0 ? "LIVE" : undefined,
                },
                {
                  label: "Active Creators",
                  value: String(d.totalParticipants),
                  sub: "Across campaigns",
                  color: d.totalParticipants > 0 ? NEON : "#475569",
                  badge: undefined as string | undefined,
                },
                {
                  label: "Demo Keys",
                  value: String(demoKeys.available),
                  sub: "remaining",
                  color: demoKeys.available < 5 ? "#f87171" : demoKeys.available < 15 ? "#f59e0b" : NEON,
                  badge: undefined as string | undefined,
                },
              ].map(({ label, value, sub, color, badge }) => (
                <div key={label}>
                  <div className="text-[10px] text-white/35 uppercase tracking-wider mb-0.5">{label}</div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl sm:text-2xl font-black" style={{ color }}>{value}</span>
                    {badge && (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full animate-pulse"
                        style={{ background: "rgba(183,255,24,0.14)", color: NEON }}>
                        {badge}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-white/25 mt-0.5 truncate">{sub}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 shrink-0">
            {profilePct < 100 && (
              <button onClick={() => onGoTo("settings", "profile")}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black transition-all hover:brightness-110 whitespace-nowrap"
                style={{ background: NEON, color: "#070b10" }}>
                Continue Setup <ArrowUpRight className="w-4 h-4" />
              </button>
            )}
            <button onClick={onRunCampaign}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap"
              style={{
                background: "rgba(255,255,255,0.05)",
                color: "rgba(255,255,255,0.6)",
                border: "1px solid rgba(255,255,255,0.09)",
              }}>
              <Plus className="w-4 h-4" /> New Campaign
            </button>
          </div>
        </div>
      </div>

      {/* TWO-COLUMN BODY */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">

        {/* ── LEFT COLUMN (70%) — primary content ── */}
        <div className="flex-1 min-w-0 space-y-10">

          {/* Metric cards */}
          <div className="grid grid-cols-2 gap-4">
            {[
              {
                icon: Users, label: "Active Creators",
                value: String(d.totalParticipants),
                desc: "Across all campaigns",
                color: d.totalParticipants > 0 ? NEON : "#334155",
                onClick: () => onGoTo("campaigns", "my"),
              },
              {
                icon: TrendingUp, label: "Exposure",
                value: exposureEst,
                desc: "Estimated this week",
                color: contentTotal > 0 ? NEON : "#334155",
                onClick: () => onGoTo("analytics"),
              },
              {
                icon: Film, label: "Community Content",
                value: String(contentTotal),
                desc: `${clipsTotal} clips · ${reelsTotal} reels · ${screenshotsTotal} ss`,
                color: contentTotal > 0 ? "#a78bfa" : "#334155",
                onClick: () => onGoTo("community", "content"),
              },
              {
                icon: KeyRound, label: "Keys Remaining",
                value: String(demoKeys.available + fullKeys.available),
                desc: `${demoKeys.available} demo · ${fullKeys.available} full`,
                color: (demoKeys.available + fullKeys.available) < 5 ? "#f87171" : NEON,
                onClick: () => onGoTo("keys"),
              },
            ].map(({ icon: Icon, label, value, desc, color, onClick }) => (
              <button key={label} onClick={onClick}
                className="rounded-2xl p-5 text-left group transition-all hover:scale-[1.01] active:scale-[0.99]"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: `${color}12` }}>
                    <Icon className="w-4 h-4" style={{ color }} />
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-white/15 group-hover:text-white/40 transition-colors" />
                </div>
                <div className="text-2xl font-black text-white mb-0.5">{value}</div>
                <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">{label}</div>
                <div className="text-[11px] text-white/20 leading-snug">{desc}</div>
              </button>
            ))}
          </div>

          {/* Active Campaigns */}
          <div>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-black text-white">Active Campaigns</h3>
              <button onClick={() => onGoTo("campaigns", "my")}
                className="text-xs font-bold flex items-center gap-1 text-white/35 hover:text-white/65 transition-colors">
                View all <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {activeCampaigns.length === 0 ? (
              <div className="rounded-2xl px-8 py-12 text-center"
                style={{ background: "rgba(255,255,255,0.018)", border: "1px dashed rgba(255,255,255,0.07)" }}>
                <Crosshair className="w-9 h-9 mx-auto mb-3 text-white/10" />
                <p className="text-sm font-semibold text-white/35 mb-1">No active campaigns</p>
                <p className="text-xs text-white/20 mb-6 max-w-xs mx-auto">
                  Create your first campaign to start recruiting creators and build community buzz.
                </p>
                <button onClick={() => onGoTo("campaigns", "library")}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all hover:brightness-110"
                  style={{ background: NEON, color: "#070b10" }}>
                  <BookOpen className="w-4 h-4" /> Browse Campaign Library
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {activeCampaigns.slice(0, 4).map((c: any) => {
                  const statusColor = STATUS_COLORS[c.status] ?? "#94a3b8";
                  const daysLeft = c.ends_at
                    ? Math.max(0, Math.ceil((new Date(c.ends_at).getTime() - Date.now()) / 86400000))
                    : null;
                  const completionPct = c.participant_count && c.participant_capacity
                    ? Math.round((c.participant_count / c.participant_capacity) * 100) : null;
                  return (
                    <div key={c.id} className="rounded-2xl p-5 flex flex-col gap-4"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-white truncate">
                            {c.template_name ?? c.name ?? "Campaign"}
                          </div>
                          <div className="text-[10px] text-white/25 mt-0.5">{c.game_name ?? "Your game"}</div>
                        </div>
                        <span className="text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-wide shrink-0"
                          style={{ color: statusColor, background: `${statusColor}16` }}>
                          {(c.status ?? "").replace(/_/g, " ")}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center">
                        {[
                          { val: c.participant_count ?? 0, lbl: "Creators" },
                          completionPct !== null ? { val: `${completionPct}%`, lbl: "Filled" } : null,
                          daysLeft !== null ? { val: `${daysLeft}d`, lbl: "Left" } : null,
                        ].filter(Boolean).map(({ val, lbl }: any) => (
                          <div key={lbl}>
                            <div className="text-sm font-black text-white">{val}</div>
                            <div className="text-[9px] text-white/25 uppercase tracking-wider mt-0.5">{lbl}</div>
                          </div>
                        ))}
                      </div>

                      {completionPct !== null && (
                        <div className="h-1 rounded-full overflow-hidden"
                          style={{ background: "rgba(255,255,255,0.06)" }}>
                          <div className="h-full rounded-full"
                            style={{ width: `${completionPct}%`, background: NEON }} />
                        </div>
                      )}

                      <button onClick={() => onGoTo("campaigns", "my")}
                        className="w-full text-xs font-bold py-2 rounded-xl transition-all hover:brightness-110"
                        style={{ background: "rgba(183,255,24,0.09)", color: NEON, border: "1px solid rgba(183,255,24,0.18)" }}>
                        View Campaign
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Latest Creator Content */}
          <div>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-black text-white">Latest Creator Content</h3>
              <button onClick={() => onGoTo("community", "content")}
                className="text-xs font-bold flex items-center gap-1 text-white/35 hover:text-white/65 transition-colors">
                View all <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {content.length === 0 ? (
              <div className="rounded-2xl px-8 py-12 text-center"
                style={{ background: "rgba(255,255,255,0.018)", border: "1px dashed rgba(255,255,255,0.07)" }}>
                <Film className="w-9 h-9 mx-auto mb-3 text-white/10" />
                <p className="text-sm font-semibold text-white/35 mb-1">No creator content yet</p>
                <p className="text-xs text-white/20">
                  Once creators participate in your campaigns, their clips and screenshots will appear here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {content.slice(0, 6).map((item: any, i: number) => (
                  <div key={item.id ?? i}
                    className="rounded-xl overflow-hidden group"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div className="aspect-video relative overflow-hidden">
                      {item.thumbnail_url ? (
                        <img src={item.thumbnail_url} alt=""
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"
                          style={{ background: "rgba(255,255,255,0.035)" }}>
                          {item.type === "screenshot" ? <Camera className="w-5 h-5 text-white/15" />
                            : item.type === "reel" ? <Video className="w-5 h-5 text-white/15" />
                            : <Film className="w-5 h-5 text-white/15" />}
                        </div>
                      )}
                      <div className="absolute top-1.5 left-1.5">
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase"
                          style={{ background: "rgba(0,0,0,0.6)", color: "rgba(255,255,255,0.65)" }}>
                          {item.type ?? "clip"}
                        </span>
                      </div>
                    </div>
                    <div className="p-2.5">
                      <div className="text-[10px] font-semibold text-white/60 truncate">
                        @{item.creator_username ?? "creator"}
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-[9px] text-white/25">{(item.views ?? 0).toLocaleString()} views</span>
                        {item.fires > 0 && (
                          <span className="text-[9px] text-orange-400">⚡{item.fires}</span>
                        )}
                      </div>
                      <div className="flex gap-1 mt-2">
                        <button className="flex-1 text-[9px] font-bold py-1 rounded transition-all hover:brightness-110"
                          style={{ background: "rgba(183,255,24,0.09)", color: NEON }}>
                          Feature
                        </button>
                        <button className="text-[9px] font-bold px-2 py-1 rounded"
                          style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.3)" }}>
                          Hide
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>{/* end left column */}

        {/* ── RIGHT COLUMN (30%) — action rail ── */}
        <div className="w-full lg:w-[300px] xl:w-[320px] shrink-0 space-y-8">

          {/* What Needs Your Attention */}
          {attentionItems.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-sm font-black text-white">Needs Attention</h3>
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black"
                  style={{ background: "rgba(248,113,113,0.14)", color: "#f87171" }}>
                  {attentionItems.length}
                </span>
              </div>
              <div className="space-y-2">
                {attentionItems.map(({ icon: Icon, color, title, desc, cta, action }, i) => (
                  <div key={i}
                    className="rounded-xl p-3.5"
                    style={{ background: "rgba(255,255,255,0.022)", border: "1px solid rgba(255,255,255,0.055)" }}>
                    <div className="flex items-start gap-3 mb-2.5">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: `${color}10` }}>
                        <Icon className="w-3.5 h-3.5" style={{ color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-white/85 leading-snug">{title}</div>
                        <div className="text-[10px] text-white/30 mt-0.5">{desc}</div>
                      </div>
                    </div>
                    <button onClick={action}
                      className="w-full text-[10px] font-bold py-1.5 rounded-lg transition-all hover:brightness-110"
                      style={{ background: `${color}13`, color }}>
                      {cta}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key Inventory */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-white">Key Inventory</h3>
              <button onClick={() => onGoTo("keys")}
                className="text-[10px] font-bold flex items-center gap-1 text-white/35 hover:text-white/65 transition-colors">
                Manage <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-5">
              {[
                { label: "Demo Keys", avail: demoKeys.available, used: demoKeys.claimed ?? 0, usedLabel: "claimed" },
                { label: "Full Game Keys", avail: fullKeys.available, used: fullKeys.awarded ?? 0, usedLabel: "awarded" },
              ].map(({ label, avail, used, usedLabel }) => {
                const total = avail + used;
                const pct = total > 0 ? Math.round((avail / total) * 100) : 0;
                const isLow = avail <= 3;
                const isWarn = !isLow && avail <= 10;
                const barColor = isLow ? "#f87171" : isWarn ? "#f59e0b" : NEON;
                return (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-white/70">{label}</span>
                      <div className="flex items-center gap-1">
                        {isLow && <AlertTriangle className="w-3 h-3 text-red-400" />}
                        <span className="text-xs font-black" style={{ color: barColor }}>{avail}</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden mb-1"
                      style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: barColor }} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.2)" }}>
                        {used} {usedLabel} · {total} total
                      </span>
                      <button onClick={() => onGoTo("keys")}
                        className="text-[9px] font-bold flex items-center gap-0.5 hover:opacity-70 transition-opacity"
                        style={{ color: NEON }}>
                        <Upload className="w-2.5 h-2.5" /> Upload
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Profile Completion */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-white">Profile Completion</h3>
              <button onClick={() => onGoTo("settings", "profile")}
                className="text-[10px] font-bold flex items-center gap-1 text-white/35 hover:text-white/65 transition-colors">
                Edit <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="rounded-2xl p-4"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-4 mb-4">
                <div className="relative w-12 h-12 shrink-0">
                  <svg className="w-12 h-12 -rotate-90" viewBox="0 0 44 44">
                    <circle cx="22" cy="22" r="17" fill="none" strokeWidth="3.5"
                      stroke="rgba(255,255,255,0.06)" />
                    <circle cx="22" cy="22" r="17" fill="none" strokeWidth="3.5"
                      stroke={profilePct >= 80 ? NEON : profilePct >= 50 ? "#f59e0b" : "#f87171"}
                      strokeDasharray={`${2 * Math.PI * 17 * profilePct / 100} ${2 * Math.PI * 17}`}
                      strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[11px] font-black text-white">{profilePct}%</span>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-black text-white">
                    {profilePct === 100 ? "Complete!" : `${100 - profilePct}% left`}
                  </div>
                  <div className="text-[10px] text-white/30 mt-0.5">
                    {profilePct === 100 ? "Fully set up" : "Attract more creators"}
                  </div>
                </div>
              </div>

              {profilePct < 100 && nextSteps.length > 0 && (
                <div className="space-y-2">
                  {nextSteps.map(({ field, label, pct }) => (
                    <button key={field} onClick={() => onGoTo("settings", "profile")}
                      className="w-full flex items-center gap-2.5 text-left group">
                      <div className="w-4 h-4 rounded-full border shrink-0 flex items-center justify-center"
                        style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                        <Circle className="w-1.5 h-1.5 text-white/15" />
                      </div>
                      <span className="flex-1 text-xs text-white/40 group-hover:text-white/65 transition-colors truncate">
                        {label}
                      </span>
                      <span className="text-[9px] font-bold shrink-0" style={{ color: NEON }}>+{pct}%</span>
                    </button>
                  ))}
                </div>
              )}

              {profilePct === 100 && (
                <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: NEON }}>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Profile complete!
                </div>
              )}
            </div>
          </div>

          {/* Weekly Analytics */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-white">This Week</h3>
              <button onClick={() => onGoTo("analytics")}
                className="text-[10px] font-bold flex items-center gap-1 text-white/35 hover:text-white/65 transition-colors">
                Full report <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-2.5">
              {[
                { label: "Community Clips",   value: clipsTotal,             icon: Film,   color: "#818cf8" },
                { label: "Community Reels",   value: reelsTotal,             icon: Video,  color: "#f472b6" },
                { label: "Screenshots",       value: screenshotsTotal,       icon: Camera, color: "#34d399" },
                { label: "Active Creators",   value: d.totalParticipants,    icon: Users,  color: NEON },
                { label: "Campaigns Running", value: d.activeCampaigns ?? 0, icon: Target, color: "#60a5fa" },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                    style={{ background: `${color}12` }}>
                    <Icon className="w-3 h-3" style={{ color }} />
                  </div>
                  <span className="flex-1 text-xs text-white/45">{label}</span>
                  <span className="text-xs font-black text-white">{Number(value).toLocaleString()}</span>
                </div>
              ))}
            </div>
            <button onClick={() => onGoTo("analytics")}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold mt-4 transition-all hover:brightness-110"
              style={{
                background: "rgba(255,255,255,0.03)",
                color: "rgba(255,255,255,0.4)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}>
              View Full Analytics <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>{/* end right column */}

      </div>{/* end two-column */}

    </div>
  );
}

const TOP_TABS: { id: TopTabId; label: string; icon: any }[] = [
  { id: "overview",   label: "Dashboard",  icon: LayoutDashboard },
  { id: "campaigns",  label: "Campaigns",  icon: Target },
  { id: "community",  label: "Community",  icon: Users },
  { id: "keys",       label: "Keys",       icon: KeyRound },
  { id: "analytics",  label: "Analytics",  icon: BarChart3 },
  { id: "settings",   label: "Settings",   icon: Settings },
];

export default function IndieDashboardPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<TopTabId>("overview");
  const [campaignSub, setCampaignSub] = useState<CampaignSubTab>("my");
  const [communitySub, setCommunitySub] = useState<CommunitySubTab>("content");
  const [settingsSub, setSettingsSub] = useState<SettingsSubTab>("profile");
  const [runWizardTemplate, setRunWizardTemplate] = useState<any>(null);

  const goTo = (toTab: TopTabId, sub?: string) => {
    setTab(toTab);
    if (toTab === "campaigns" && sub) setCampaignSub(sub as CampaignSubTab);
    if (toTab === "community" && sub) setCommunitySub(sub as CommunitySubTab);
    if (toTab === "settings" && sub) setSettingsSub(sub as SettingsSubTab);
  };

  const openRunWizard = (template?: any) => {
    if (template) setRunWizardTemplate(template);
    else goTo("campaigns", "library");
  };

  return (
    <div className="min-h-screen" style={{ background: PAGE_BG }}>
      <div className="max-w-6xl mx-auto px-4 py-6">

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(183,255,24,0.09)" }}>
              <Rocket className="h-5 w-5" style={{ color: NEON }} />
            </div>
            <div>
              <h1 className="text-lg font-black text-white">Game Dashboard</h1>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.28)" }}>
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

        {tab === "overview" && (
          <DashboardTab onGoTo={goTo} onRunCampaign={openRunWizard} />
        )}

        {tab === "campaigns" && (
          <>
            <SubNav
              items={[
                { id: "my",      label: "My Campaigns" },
                { id: "library", label: "Campaign Library" },
              ]}
              active={campaignSub}
              onChange={v => setCampaignSub(v as CampaignSubTab)}
            />
            {campaignSub === "my" && (
              <MyCampaignsTab onBrowseLibrary={() => setCampaignSub("library")} />
            )}
            {campaignSub === "library" && (
              <CampaignLibraryTab onRunCampaign={t => setRunWizardTemplate(t)} />
            )}
          </>
        )}

        {tab === "community" && (
          <>
            <SubNav
              items={[
                { id: "content",     label: "Creator Content" },
                { id: "submissions", label: "Submissions" },
              ]}
              active={communitySub}
              onChange={v => setCommunitySub(v as CommunitySubTab)}
            />
            {communitySub === "submissions" && <SubmissionReviewTab />}
            {communitySub === "content" && (
              <div className="text-center py-24" style={{ color: "rgba(255,255,255,0.2)" }}>
                <Film className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Creator content feed coming soon</p>
              </div>
            )}
          </>
        )}

        {tab === "keys" && <KeyManagementTab />}
        {tab === "analytics" && <AnalyticsTab />}

        {tab === "settings" && (
          <>
            <SubNav
              items={[
                { id: "profile", label: "Game Profile" },
                { id: "store",   label: "Store & Media" },
              ]}
              active={settingsSub}
              onChange={v => setSettingsSub(v as SettingsSubTab)}
            />
            {settingsSub === "profile" && <GameProfileTab />}
            {settingsSub === "store" && (
              <div className="text-center py-24" style={{ color: "rgba(255,255,255,0.2)" }}>
                <Settings className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Store &amp; Media settings — use Game Profile for now</p>
              </div>
            )}
          </>
        )}

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
