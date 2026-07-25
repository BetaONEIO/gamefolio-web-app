import { useState, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getQueryFn, queryClient } from "@/lib/queryClient";
import {
  Rocket, Users, Target, BarChart3,
  Gamepad, KeyRound, Loader2,
  TrendingUp, AlertTriangle,
  CheckCircle2, ChevronRight,
  Film, Camera,
  Video, ArrowUpRight,
  Crosshair, Settings, LayoutDashboard,
  AlertCircle, Star, Circle, Upload, Zap, Activity, ImagePlus,
} from "lucide-react";
import CreateCampaignFlow from "./indie-dashboard/CreateCampaignFlow";
import MyCampaignsTab from "./indie-dashboard/MyCampaignsTab";
import SubmissionReviewTab from "./indie-dashboard/SubmissionReviewTab";
import KeyManagementTab from "./indie-dashboard/KeyManagementTab";
import AnalyticsTab from "./indie-dashboard/AnalyticsTab";
import GameProfileTab from "./indie-dashboard/GameProfileTab";
import RunCampaignWizard from "./indie-dashboard/RunCampaignWizard";
import IndieDevUpgradeDialog from "@/components/IndieDevUpgradeDialog";

export { NEON, CARD_BG, CARD_BORDER, PAGE_BG } from "./indie-dashboard/constants";
import { NEON, PAGE_BG } from "./indie-dashboard/constants";

type TopTabId = "overview" | "campaigns" | "community" | "keys" | "analytics" | "settings";
type CampaignSubTab = "create" | "my";
type CommunitySubTab = "content" | "submissions";
type SettingsSubTab = "profile" | "store" | "subscription" | "auto";
import AutoCampaignSettingsTab from "./indie-dashboard/AutoCampaignSettingsTab";

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

function IndieDevSubscriptionTab() {
  const { user } = useAuth();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const isSubscriber = !!user?.isIndieDevSubscriber;

  return (
    <div className="max-w-xl">
      <div className="rounded-2xl p-6"
        style={{
          background: "linear-gradient(135deg, rgba(183,255,24,0.055) 0%, rgba(255,255,255,0.018) 100%)",
          border: "1px solid rgba(183,255,24,0.13)",
        }}>
        <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: NEON }}>
          Indie Developer Subscription
        </p>
        <h3 className="text-xl font-black text-white mb-3">
          {isSubscriber ? "You're subscribed" : "Run more campaigns at once"}
        </h3>
        <p className="text-sm text-white/50 mb-2">
          Active campaign limit: <span className="font-bold text-white">{isSubscriber ? 5 : 1}</span>
        </p>
        <p className="text-sm text-white/50 mb-5">
          {isSubscriber
            ? `Billed ${user?.indieDevSubscriptionType === "yearly" ? "yearly (£49.99/yr)" : "monthly (£4.99/mo)"}.`
            : "Upgrade to run up to 5 active campaigns at once, plus get featured on gamefolio.com/games and included in Gamefolio's social promotion."}
        </p>
        {!isSubscriber && (
          <button onClick={() => setShowUpgrade(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black transition-all hover:brightness-110"
            style={{ background: NEON, color: "#070b10" }}>
            Upgrade to Indie Developer <ArrowUpRight className="w-4 h-4" />
          </button>
        )}
      </div>
      <IndieDevUpgradeDialog open={showUpgrade} onOpenChange={setShowUpgrade} />
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
  const { user } = useAuth();
  const [showIndieDevUpgrade, setShowIndieDevUpgrade] = useState(false);
  const [imgError, setImgError] = useState(false);
  const artworkInputRef = useRef<HTMLInputElement>(null);
  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("field", "capsuleImageUrl");
      const res = await fetch("/api/indie/profile/upload-image", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Upload failed");
      return res.json() as Promise<{ url: string; field: string }>;
    },
    onSuccess: () => {
      setImgError(false);
      queryClient.invalidateQueries({ queryKey: ["/api/indie/profile"] });
    },
  });
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
    icon: any; color: string; priority: "critical" | "warning" | "suggestion";
    title: string; desc: string; cta: string; action: () => void;
  }[] = [];
  if (missingEssential.length > 0) {
    attentionItems.push({
      icon: AlertCircle, color: "#f87171", priority: "critical",
      title: "Complete your game profile",
      desc: `${missingEssential.length} essential field${missingEssential.length > 1 ? "s" : ""} still missing`,
      cta: "Edit Profile",
      action: () => onGoTo("settings", "profile"),
    });
  }
  if (demoKeys.available < 5) {
    attentionItems.push({
      icon: AlertTriangle, color: "#fb923c", priority: "critical",
      title: "No demo keys available",
      desc: `${demoKeys.available === 0 ? "Upload keys before creators can join your campaign" : `Only ${demoKeys.available} remaining`}`,
      cta: "Upload Keys",
      action: () => onGoTo("keys"),
    });
  }
  if (content.length > 0) {
    attentionItems.push({
      icon: Star, color: "#a78bfa", priority: "suggestion",
      title: `${content.length} creator submission${content.length > 1 ? "s" : ""} to review`,
      desc: "Feature the best community content",
      cta: "Review",
      action: () => onGoTo("community", "submissions"),
    });
  }
  if (activeCampaigns.length === 0) {
    attentionItems.push({
      icon: Rocket, color: NEON, priority: "suggestion",
      title: "Launch your first campaign",
      desc: "Recruit creators to build buzz for your game",
      cta: "Create Campaign",
      action: () => onGoTo("campaigns", "create"),
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
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(183,255,24,0.07) 0%, transparent 65%)" }} />

        <div className="flex flex-col sm:flex-row sm:items-start gap-6 relative z-10">
          {/* Game artwork — clickable upload */}
          <button
            onClick={() => artworkInputRef.current?.click()}
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl shrink-0 overflow-hidden flex items-center justify-center relative group transition-transform hover:scale-[1.02]"
            style={{ background: "rgba(183,255,24,0.08)", border: "1px solid rgba(183,255,24,0.18)", boxShadow: "0 8px 32px rgba(183,255,24,0.08)" }}
            title="Upload game artwork">
            {uploadImageMutation.isPending ? (
              <Loader2 className="w-7 h-7 animate-spin" style={{ color: NEON }} />
            ) : (profile?.capsuleImageUrl || profile?.headerImageUrl) && !imgError ? (
              <>
                <img
                  src={profile.capsuleImageUrl ?? profile.headerImageUrl}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={() => setImgError(true)}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                  <ImagePlus className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-1.5 px-2 text-center">
                <ImagePlus className="w-7 h-7" style={{ color: NEON }} />
                <span className="text-[9px] font-bold leading-tight" style={{ color: NEON }}>Upload Art</span>
              </div>
            )}
          </button>
          <input
            ref={artworkInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadImageMutation.mutate(file);
              e.target.value = "";
            }}
          />

          <div className="flex-1 min-w-0">
            <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight mb-1">
              {profile?.gameName ?? "Set up your game"}
            </h2>
            <div className="flex items-center gap-2 mb-5">
              {profile?.releaseStatus && (
                <span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.45)" }}>
                  {profile.releaseStatus.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
                </span>
              )}
              {(profile?.steamUrl || profile?.epicUrl || profile?.itchUrl) && (
                <>
                  <span className="text-white/20">·</span>
                  <span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {profile.steamUrl ? "Steam" : profile.epicUrl ? "Epic" : "itch.io"}
                  </span>
                </>
              )}
            </div>

            {/* Profile Strength — progress bar */}
            <div className="mb-5 max-w-xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>
                  Profile Strength
                </span>
                <span className="text-[11px] font-black" style={{ color: profilePct >= 80 ? NEON : profilePct >= 50 ? "#f59e0b" : "#f87171" }}>
                  {profilePct}%
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${profilePct}%`,
                    background: profilePct >= 80 ? NEON : profilePct >= 50 ? "#f59e0b" : "#f87171",
                  }} />
              </div>
              {profilePct < 100 && nextSteps.length > 0 && (
                <p className="text-[10px] mt-1.5" style={{ color: "rgba(255,255,255,0.25)" }}>
                  Next: {nextSteps[0].label} <span style={{ color: NEON }}>+{nextSteps[0].pct}%</span>
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {missingEssential.length > 0 ? (
                <button onClick={() => onGoTo("settings", "profile")}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black transition-all hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: NEON, color: "#070b10", boxShadow: "0 4px 20px rgba(183,255,24,0.25)" }}>
                  Continue Setup <ArrowUpRight className="w-4 h-4" />
                </button>
              ) : activeCampaigns.length === 0 ? (
                <button onClick={() => onGoTo("campaigns", "create")}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black transition-all hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: NEON, color: "#070b10", boxShadow: "0 4px 20px rgba(183,255,24,0.25)" }}>
                  Create Your First Campaign <ArrowUpRight className="w-4 h-4" />
                </button>
              ) : (
                <button onClick={() => onGoTo("campaigns", "my")}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black transition-all hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: NEON, color: "#070b10", boxShadow: "0 4px 20px rgba(183,255,24,0.25)" }}>
                  View Active Campaign <ArrowUpRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Secondary metrics */}
          <div className="shrink-0 grid grid-cols-3 gap-4 sm:w-56">
            {[
              {
                label: "Campaign",
                value: activeCampaigns.length > 0 ? "Live" : "None",
                sub: activeCampaigns.length > 0
                  ? (activeCampaigns[0].template_name ?? activeCampaigns[0].name ?? "Campaign")
                  : "No active campaign",
                color: activeCampaigns.length > 0 ? NEON : "#475569",
              },
              {
                label: "Creators",
                value: String(d.totalParticipants),
                sub: "Active now",
                color: d.totalParticipants > 0 ? NEON : "#475569",
              },
              {
                label: "Demo Keys",
                value: String(demoKeys.available),
                sub: "Available",
                color: demoKeys.available < 5 ? "#f87171" : demoKeys.available < 15 ? "#f59e0b" : NEON,
              },
            ].map(({ label, value, sub, color }) => (
              <div key={label} className="text-center">
                <div className="text-[10px] text-white/25 uppercase tracking-wider mb-0.5">{label}</div>
                <div className="text-lg font-black" style={{ color }}>{value}</div>
                <div className="text-[10px] text-white/20 truncate">{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* GET YOUR GAME READY — onboarding steps */}
      {activeCampaigns.length === 0 && (
        <div className="rounded-2xl p-6 sm:p-8 space-y-6"
          style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(183,255,24,0.09)" }}>
              <Rocket className="w-4 h-4" style={{ color: NEON }} />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Get Your Game Ready</h3>
              <p className="text-[11px] text-white/30 mt-0.5">Complete three steps to start recruiting creators</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Step 1: Game Profile */}
            {(() => {
              const done = missingEssential.length === 0;
              return (
                <div className="rounded-xl p-4 space-y-3 transition-all hover:scale-[1.01]"
                  style={{
                    background: done ? "rgba(74,222,128,0.04)" : "rgba(255,255,255,0.025)",
                    border: `1px solid ${done ? "rgba(74,222,128,0.18)" : "rgba(255,255,255,0.07)"}`,
                    boxShadow: done ? "0 0 24px rgba(74,222,128,0.06)" : "none",
                  }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black"
                        style={done
                          ? { background: "rgba(74,222,128,0.20)", color: "#4ade80" }
                          : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}>
                        {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : "1"}
                      </div>
                      <span className="text-xs font-bold text-white">Complete Game Profile</span>
                    </div>
                    {done && <span className="text-[9px] font-black px-1.5 py-0.5 rounded" style={{ background: "rgba(74,222,128,0.12)", color: "#4ade80" }}>Done</span>}
                  </div>
                  {/* Progress bar */}
                  <div>
                    <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${profilePct}%`, background: done ? "#4ade80" : profilePct >= 50 ? "#f59e0b" : "#f87171" }} />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[9px] text-white/25">{profilePct}% complete</span>
                      {!done && <span className="text-[9px]" style={{ color: "#f59e0b" }}>{missingEssential.length} fields missing</span>}
                    </div>
                  </div>
                  <button onClick={() => onGoTo("settings", "profile")}
                    className="w-full text-[11px] font-bold py-2 rounded-lg transition-all hover:brightness-110"
                    style={{
                      background: done ? "rgba(74,222,128,0.10)" : "rgba(183,255,24,0.09)",
                      color: done ? "#4ade80" : NEON,
                      border: `1px solid ${done ? "rgba(74,222,128,0.20)" : "rgba(183,255,24,0.18)"}`,
                    }}>
                    {done ? "Edit Profile" : "Continue Setup →"}
                  </button>
                </div>
              );
            })()}

            {/* Step 2: Upload Keys */}
            {(() => {
              const done = demoKeys.available > 0;
              return (
                <div className="rounded-xl p-4 space-y-3 transition-all hover:scale-[1.01]"
                  style={{
                    background: done ? "rgba(74,222,128,0.04)" : "rgba(255,255,255,0.025)",
                    border: `1px solid ${done ? "rgba(74,222,128,0.18)" : "rgba(255,255,255,0.07)"}`,
                    boxShadow: done ? "0 0 24px rgba(74,222,128,0.06)" : "none",
                  }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black"
                        style={done
                          ? { background: "rgba(74,222,128,0.20)", color: "#4ade80" }
                          : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}>
                        {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : "2"}
                      </div>
                      <span className="text-xs font-bold text-white">Upload Game Keys</span>
                    </div>
                    {done && <span className="text-[9px] font-black px-1.5 py-0.5 rounded" style={{ background: "rgba(74,222,128,0.12)", color: "#4ade80" }}>Done</span>}
                  </div>
                  <div className="text-[10px] text-white/30 leading-relaxed">
                    {done
                      ? `${demoKeys.available} demo · ${fullKeys.available} full game keys ready`
                      : "Keys are required for creators to claim access to your game."}
                  </div>
                  <button onClick={() => onGoTo("keys")}
                    className="w-full text-[11px] font-bold py-2 rounded-lg transition-all hover:brightness-110 flex items-center justify-center gap-1.5"
                    style={{
                      background: done ? "rgba(74,222,128,0.10)" : "rgba(183,255,24,0.09)",
                      color: done ? "#4ade80" : NEON,
                      border: `1px solid ${done ? "rgba(74,222,128,0.20)" : "rgba(183,255,24,0.18)"}`,
                    }}>
                    {done ? "Manage Keys" : <><Upload className="w-3 h-3" /> Upload Keys</>}
                  </button>
                </div>
              );
            })()}

            {/* Step 3: Create Campaign */}
            <div className="rounded-xl p-4 space-y-3 transition-all hover:scale-[1.01]"
              style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black"
                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}>
                  3
                </div>
                <span className="text-xs font-bold text-white">Create Your First Campaign</span>
              </div>
              <div className="text-[10px] text-white/30 leading-relaxed">
                Select a campaign type and Gamefolio recruits creators automatically.
              </div>
              <button onClick={() => onGoTo("campaigns", "create")}
                className="w-full text-[11px] font-bold py-2 rounded-lg transition-all hover:brightness-110"
                style={{ background: NEON, color: "#070b10", boxShadow: "0 0 16px rgba(183,255,24,0.18)" }}>
                Create Campaign →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TWO-COLUMN BODY */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">

        {/* ── LEFT COLUMN (70%) — primary content ── */}
        <div className="flex-1 min-w-0 space-y-10">

          {/* Metric cards — only when campaigns exist */}
          {activeCampaigns.length > 0 && (
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
          )}

          {/* Active Campaigns */}
          <div>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-black text-white">Active Campaigns</h3>
              {activeCampaigns.length > 0 && (
                <button onClick={() => onGoTo("campaigns", "my")}
                  className="text-xs font-bold flex items-center gap-1 text-white/35 hover:text-white/65 transition-colors">
                  View all <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {activeCampaigns.length === 0 ? (
              <div className="rounded-2xl px-8 py-10"
                style={{ background: "rgba(255,255,255,0.018)", border: "1px dashed rgba(255,255,255,0.07)" }}>
                {/* Flow illustration */}
                <div className="flex items-center justify-center gap-2 mb-6">
                  {[
                    { icon: Gamepad, label: "Your Game", color: NEON, rgb: "183,255,27" },
                    { icon: Users,   label: "Creators",  color: "#60a5fa", rgb: "96,165,250" },
                    { icon: Film,    label: "Content",   color: "#f472b6", rgb: "244,114,182" },
                    { icon: TrendingUp, label: "Exposure", color: "#34d399", rgb: "52,211,153" },
                  ].map(({ icon: Icon, label, color, rgb }, i, arr) => (
                    <div key={label} className="flex items-center gap-2">
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{ background: `rgba(${rgb},0.10)`, border: `1px solid rgba(${rgb},0.18)` }}>
                          <Icon className="w-5 h-5" style={{ color }} />
                        </div>
                        <span className="text-[9px] font-bold text-white/30">{label}</span>
                      </div>
                      {i < arr.length - 1 && (
                        <div className="text-white/15 mb-4">→</div>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-sm font-semibold text-white/50 text-center mb-1">Launch your first campaign</p>
                <p className="text-xs text-white/25 text-center mb-6 max-w-xs mx-auto">
                  Once live, you'll track active creators, content submitted, keys issued, and campaign progress here.
                </p>
                <div className="flex justify-center">
                  <button onClick={() => onGoTo("campaigns", "create")}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all hover:brightness-110 hover:scale-[1.02]"
                    style={{ background: NEON, color: "#070b10", boxShadow: "0 4px 20px rgba(183,255,24,0.22)" }}>
                    <Rocket className="w-4 h-4" /> Create Your First Campaign
                  </button>
                </div>
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

          {/* Latest Creator Content — only when campaigns exist */}
          {activeCampaigns.length > 0 && (
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
                    Creator clips, reels and screenshots will appear here once your first campaign begins.
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
          )}

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
                {attentionItems.map(({ icon: Icon, color, priority, title, desc, cta, action }, i) => {
                  const priorityLabel = priority === "critical" ? "Critical" : priority === "warning" ? "Warning" : "Suggestion";
                  const priorityColor = priority === "critical" ? "#f87171" : priority === "warning" ? "#fb923c" : "#a78bfa";
                  return (
                    <div key={i}
                      className="rounded-xl p-3.5"
                      style={{ background: "rgba(255,255,255,0.022)", border: `1px solid ${color}22` }}>
                      <div className="flex items-start gap-3 mb-2.5">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                          style={{ background: `${color}12` }}>
                          <Icon className="w-3.5 h-3.5" style={{ color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-[8px] font-black uppercase tracking-widest"
                              style={{ color: priorityColor }}>{priorityLabel}</span>
                          </div>
                          <div className="text-xs font-semibold text-white/85 leading-snug">{title}</div>
                          <div className="text-[10px] text-white/30 mt-0.5">{desc}</div>
                        </div>
                      </div>
                      <button onClick={action}
                        className="w-full text-[10px] font-bold py-1.5 rounded-lg transition-all hover:brightness-110"
                        style={{ background: `${color}15`, color }}>
                        {cta}
                      </button>
                    </div>
                  );
                })}
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

            {(demoKeys.available === 0 && fullKeys.available === 0) ? (
              <div className="rounded-xl p-5"
                style={{ background: "rgba(255,255,255,0.015)", border: "1px dashed rgba(255,255,255,0.09)" }}>
                <div className="flex items-center justify-center w-10 h-10 rounded-xl mx-auto mb-3"
                  style={{ background: "rgba(183,255,24,0.07)", border: "1px solid rgba(183,255,24,0.12)" }}>
                  <KeyRound className="w-5 h-5" style={{ color: NEON }} />
                </div>
                <p className="text-xs font-bold text-white/50 text-center mb-1">No keys uploaded yet</p>
                <div className="flex items-center justify-center gap-4 my-3">
                  <div className="text-center">
                    <div className="text-lg font-black text-white/20">0</div>
                    <div className="text-[9px] text-white/20 uppercase tracking-wider">Demo Keys</div>
                  </div>
                  <div className="w-px h-6 bg-white/10" />
                  <div className="text-center">
                    <div className="text-lg font-black text-white/20">0</div>
                    <div className="text-[9px] text-white/20 uppercase tracking-wider">Full Keys</div>
                  </div>
                </div>
                <button onClick={() => onGoTo("keys")}
                  className="w-full text-[11px] font-bold py-2 rounded-lg transition-all hover:brightness-110 flex items-center justify-center gap-1.5 mt-1"
                  style={{ background: "rgba(183,255,24,0.10)", color: NEON, border: "1px solid rgba(183,255,24,0.20)" }}>
                  <Upload className="w-3 h-3" /> Upload Keys
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {[
                  { label: "Demo Keys", avail: demoKeys.available, committed: demoKeys.claimed ?? 0, issued: (demoKeys as any).issued ?? 0 },
                  { label: "Full Game Keys", avail: fullKeys.available, committed: fullKeys.awarded ?? 0, awarded: (fullKeys as any).awarded ?? 0 },
                ].map((item) => {
                  const isDemo = item.label === "Demo Keys";
                  const committed = item.committed ?? 0;
                  const out = isDemo ? (item as any).issued ?? 0 : (item as any).awarded ?? 0;
                  const avail = item.avail ?? 0;
                  const total = avail + committed + out;
                  const pct = total > 0 ? Math.round((avail / total) * 100) : 0;
                  const isLow = avail <= 3;
                  const isWarn = !isLow && avail <= 10;
                  const barColor = isLow ? "#f87171" : isWarn ? "#f59e0b" : NEON;
                  return (
                    <div key={item.label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-white/70">{item.label}</span>
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
                        <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.25)" }}>
                          {avail} available · {committed} committed · {out} {isDemo ? "issued" : "awarded"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Profile Strength */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-white">Profile Strength</h3>
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
                    {missingEssential.length === 0 ? "Profile Ready" : "Setup in Progress"}
                  </div>
                  <div className="text-[10px] text-white/30 mt-0.5">
                    {allFilled} of {ALL_PROFILE_FIELDS.length} fields complete
                  </div>
                </div>
              </div>

              {profilePct < 100 && nextSteps.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] text-white/25 mb-2">Recommended actions:</p>
                  {nextSteps.map((step, i) => (
                    <button key={step.field ?? i} onClick={() => onGoTo("settings", "profile")}
                      className="w-full flex items-center gap-2.5 text-left group py-1 rounded-lg px-2 transition-colors hover:bg-white/[0.03]">
                      <div className="w-4 h-4 rounded-full border shrink-0 flex items-center justify-center"
                        style={{ borderColor: "rgba(255,255,255,0.12)" }}>
                        <Circle className="w-1.5 h-1.5 text-white/15" />
                      </div>
                      <span className="flex-1 text-xs text-white/40 group-hover:text-white/65 transition-colors truncate">
                        {step.label}
                      </span>
                      <span className="text-[9px] font-black shrink-0" style={{ color: NEON }}>+{step.pct}%</span>
                    </button>
                  ))}
                </div>
              )}

              {profilePct === 100 && (
                <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: NEON }}>
                  <CheckCircle2 className="w-3.5 h-3.5" /> All fields complete
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-sm font-black text-white">Recent Activity</h3>
            </div>
            <div className="rounded-2xl p-4"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
              {activeCampaigns.length === 0 ? (
                <div className="flex flex-col items-center py-4 text-center">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2"
                    style={{ background: "rgba(255,255,255,0.04)" }}>
                    <Activity className="w-4 h-4 text-white/15" />
                  </div>
                  <p className="text-[11px] font-semibold text-white/25 mb-1">No activity yet</p>
                  <p className="text-[10px] text-white/15 leading-relaxed">
                    Creator joins, key claims, and content submissions will appear here once your campaign is live.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {[
                    d.totalParticipants > 0 && {
                      icon: Users, color: NEON,
                      text: `${d.totalParticipants} creator${d.totalParticipants === 1 ? "" : "s"} enrolled`,
                      sub: "Active campaign",
                    },
                    contentTotal > 0 && {
                      icon: Film, color: "#f472b6",
                      text: `${contentTotal} piece${contentTotal === 1 ? "" : "s"} of content`,
                      sub: "Submitted this cycle",
                    },
                    demoKeys.available < 10 && {
                      icon: KeyRound, color: "#fb923c",
                      text: `${demoKeys.available} demo keys remaining`,
                      sub: "Consider uploading more",
                    },
                  ].filter(Boolean).slice(0, 3).map((item: any, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                        style={{ background: `${item.color}12` }}>
                        <item.icon className="w-3 h-3" style={{ color: item.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-semibold text-white/70 truncate">{item.text}</div>
                        <div className="text-[9px] text-white/30">{item.sub}</div>
                      </div>
                    </div>
                  ))}
                  {[d.totalParticipants > 0, contentTotal > 0, demoKeys.available < 10].filter(Boolean).length === 0 && (
                    <p className="text-[11px] text-white/25 text-center py-2">Campaign is warming up…</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Indie Pro panel — separate from Needs Attention */}
          {!user?.isIndieDevSubscriber && (
            <div className="rounded-xl p-4"
              style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-3.5 h-3.5" style={{ color: NEON }} />
                <span className="text-xs font-bold text-white">Indie Pro</span>
              </div>
              <p className="text-[10px] text-white/25 mb-3 leading-relaxed">
                Run unlimited campaigns and access advanced promotional tools.
              </p>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] text-white/40">Free Plan</span>
                <span className="text-[10px] font-bold text-white/60">1 active campaign</span>
              </div>
              <button onClick={() => setShowIndieDevUpgrade(true)}
                className="w-full text-[10px] font-bold py-2 rounded-lg transition-all hover:brightness-110"
                style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}>
                View Indie Pro
              </button>
            </div>
          )}

          {/* Weekly Analytics — hide for new accounts */}
          {activeCampaigns.length > 0 && (
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
          )}

        </div>{/* end right column */}

      </div>{/* end two-column */}

      <IndieDevUpgradeDialog open={showIndieDevUpgrade} onOpenChange={setShowIndieDevUpgrade} />
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
    else goTo("campaigns", "create");
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
                { id: "my",     label: "My Campaigns" },
                { id: "create", label: "Create Campaign" },
              ]}
              active={campaignSub}
              onChange={v => setCampaignSub(v as CampaignSubTab)}
            />
            {campaignSub === "my" && (
              <MyCampaignsTab onCreateCampaign={() => setCampaignSub("create")} />
            )}
            {campaignSub === "create" && (
              <CreateCampaignFlow
                onComplete={() => goTo("campaigns", "my")}
              />
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
                { id: "profile",      label: "Game Profile" },
                { id: "auto",         label: "Auto Campaigns" },
                { id: "store",        label: "Store & Media" },
                { id: "subscription", label: "Subscription" },
              ]}
              active={settingsSub}
              onChange={v => setSettingsSub(v as SettingsSubTab)}
            />
            {settingsSub === "profile" && <GameProfileTab />}
            {settingsSub === "auto" && <AutoCampaignSettingsTab />}
            {settingsSub === "store" && (
              <div className="text-center py-24" style={{ color: "rgba(255,255,255,0.2)" }}>
                <Settings className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Store &amp; Media settings — use Game Profile for now</p>
              </div>
            )}
            {settingsSub === "subscription" && <IndieDevSubscriptionTab />}
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
