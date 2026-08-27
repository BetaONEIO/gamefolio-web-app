import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import {
  Rocket, Film, Camera, Video,
  ArrowUpRight, ChevronRight,
  AlertCircle, Star, CheckCircle2,
  TrendingUp, Play, ImagePlus,
} from "lucide-react";
import { NEON, CARD_BG, DASHBOARD_THEME, rgbaAccent } from "./constants";

type TopTabId = "overview" | "creator-content" | "analytics" | "game-profile";

const ESSENTIAL_FIELDS = ["gameName","shortDescription","headerImageUrl","steamUrl","epicUrl","itchUrl"];
const ALL_PROFILE_FIELDS = [
  "gameName","shortDescription","headerImageUrl","steamUrl","epicUrl","itchUrl",
  "fullDescription","releaseDate","studioName","genres","tags","platforms",
  "capsuleImageUrl","trailerUrl","screenshotUrls","keyFeatures",
  "websiteUrl","twitterUrl","discordUrl","ageRating","supportedLanguages",
];

const PROFILE_STEPS: { field: string; label: string; pct: number }[] = [
  { field: "trailerUrl", label: "Upload a trailer", pct: 5 },
  { field: "steamUrl", label: "Add Steam Store URL", pct: 3 },
  { field: "discordUrl", label: "Connect Discord", pct: 2 },
  { field: "fullDescription", label: "Write full description", pct: 4 },
  { field: "screenshotUrls", label: "Add screenshots", pct: 3 },
  { field: "capsuleImageUrl", label: "Add capsule image", pct: 2 },
  { field: "keyFeatures", label: "List key features", pct: 2 },
  { field: "genres", label: "Tag your genres", pct: 1 },
  { field: "platforms", label: "Select platforms", pct: 1 },
  { field: "websiteUrl", label: "Add website URL", pct: 1 },
];

function isFieldFilled(profile: any, f: string): boolean {
  if (!profile) return false;
  const v = profile[f];
  if (v === null || v === undefined || v === "") return false;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

export default function DashboardTab({
  onGoTo,
}: {
  onGoTo: (tab: TopTabId, sub?: string) => void;
}) {
  const { user } = useAuth();
  const [showUpgrade, setShowUpgrade] = useState(false);

  const { data: profileData } = useQuery<any>({
    queryKey: ["/api/indie/profile"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  const { data: analyticsData } = useQuery<any>({
    queryKey: ["/api/indie/analytics"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  const { data: contentData } = useQuery<any>({
    queryKey: ["/api/indie/creator-content"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const profile = profileData?.profile ?? null;
  const allFilled = ALL_PROFILE_FIELDS.filter((f) => isFieldFilled(profile, f)).length;
  const profilePct = Math.round((allFilled / ALL_PROFILE_FIELDS.length) * 100);
  const missingEssential = ESSENTIAL_FIELDS.filter((f) => !isFieldFilled(profile, f));
  const nextSteps = PROFILE_STEPS.filter((s) => !isFieldFilled(profile, s.field)).slice(0, 3);

  const content = Array.isArray(contentData)
    ? contentData
    : contentData?.ownedGameContent ?? contentData?.items ?? [];
  const clipsTotal = analyticsData?.clipsGenerated ?? 0;
  const screenshotsTotal = analyticsData?.screenshotsGenerated ?? 0;
  const reelsTotal = analyticsData?.reelsGenerated ?? 0;
  const analyticsContentTotal = clipsTotal + screenshotsTotal + reelsTotal;
  const contentTotal = analyticsContentTotal || contentData?.ownedGameContentTotal || content.length;

  const hasContent = content.length > 0;
  const profileReady = missingEssential.length === 0;
  /* ── LAUNCH CHECKLIST ITEMS ── */
  const checklist = [
    { label: "Complete your game profile", done: profileReady, action: () => onGoTo("game-profile"), pct: profilePct },
  ];

  const doneCount = checklist.filter((c) => c.done).length;

  return (
    <div className="space-y-8">

      {/* ── 1. LAUNCH CHECKLIST ── */}
      <div className="rounded-2xl overflow-hidden"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="px-6 py-5 flex items-center gap-3"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(183,255,24,0.09)" }}>
              <Rocket className="w-4 h-4" style={{ color: NEON }} />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">Launch Checklist</h3>
              <p className="text-[11px] text-white/30">{doneCount} of {checklist.length} complete</p>
            </div>
          </div>
          <div className="px-6 py-4 space-y-3">
            {checklist.map((item) => (
              <button key={item.label} onClick={item.action}
                className="w-full flex items-center gap-3 text-left group py-2 rounded-lg px-3 transition-colors hover:bg-white/[0.03]">
                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors"
                 style={{ background: item.done ? rgbaAccent(0.12) : CARD_BG, border: `1px solid ${item.done ? rgbaAccent(0.25) : DASHBOARD_THEME.border}` }}>
                  {item.done ? (
                     <CheckCircle2 className="w-3.5 h-3.5" style={{ color: NEON }} />
                  ) : (
                    <div className="w-2 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`text-xs font-semibold transition-colors ${item.done ? "text-white/35" : "text-white/70 group-hover:text-white"}`}>
                    {item.label}
                  </span>
                  {item.pct !== null && (
                   <span className="text-[10px] ml-2" style={{ color: item.pct >= 80 ? NEON : DASHBOARD_THEME.warning }}>({item.pct}%)</span>
                  )}
                </div>
                {!item.done && (
                  <ChevronRight className="w-3.5 h-3.5 text-white/15 group-hover:text-white/40 transition-colors" />
                )}
              </button>
            ))}
          </div>
        </div>

      {/* ── 2. CONTENT PREVIEW ── */}
      {hasContent && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-white">Content</h3>
            {hasContent && (
              <button onClick={() => onGoTo("creator-content")}
                className="text-xs font-bold flex items-center gap-1 text-white/35 hover:text-white/65 transition-colors">
                View all <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {hasContent ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {content.slice(0, 6).map((item: any, i: number) => (
                <button key={item.id ?? i} onClick={() => onGoTo("creator-content")}
                  className="rounded-xl overflow-hidden group text-left"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="aspect-video relative overflow-hidden">
                    {item.thumbnail_url ? (
                      <img src={item.thumbnail_url} alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.035)" }}>
                        {(item.type ?? "clip") === "screenshot" ? (
                          <Camera className="w-5 h-5 text-white/15" />
                        ) : (item.type ?? "clip") === "reel" ? (
                          <Video className="w-5 h-5 text-white/15" />
                        ) : (
                          <Film className="w-5 h-5 text-white/15" />
                        )}
                      </div>
                    )}
                    <div className="absolute bottom-1.5 left-1.5">
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: "rgba(0,0,0,0.55)", color: "#fff" }}>
                        {(item.type ?? "clip").toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="p-2">
                    <div className="text-[9px] text-white/40 truncate">@{item.creator_username ?? "creator"}</div>
                    <div className="text-[9px] text-white/20 mt-0.5 flex items-center gap-1">
                      <Play className="w-2.5 h-2.5" /> {(item.views ?? 0).toLocaleString()}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-xl py-8 text-center"
              style={{ background: "rgba(255,255,255,0.015)", border: "1px dashed rgba(255,255,255,0.07)" }}>
              <Film className="w-6 h-6 text-white/10 mx-auto mb-2" />
              <p className="text-xs font-semibold text-white/30 mb-1">Content will appear here</p>
              <p className="text-[10px] text-white/20">Clips, reels and screenshots for your game will appear here.</p>
            </div>
          )}
        </div>
      )}

      {/* ── 5. SUPPORTING ROW: Key Inventory + Profile Strength ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Key Inventory */}
        <div className="rounded-2xl p-5"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-white">Key Inventory</h3>
            <button onClick={() => onGoTo("keys")}
              className="text-[10px] font-bold flex items-center gap-1 text-white/35 hover:text-white/65 transition-colors">
              Manage <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {!hasKeys ? (
            <div className="text-center py-4">
              <KeyRound className="w-5 h-5 mx-auto mb-2" style={{ color: "rgba(255,255,255,0.12)" }} />
              <p className="text-xs text-white/30 mb-3">No keys uploaded yet</p>
              <button onClick={() => onGoTo("keys")}
                className="text-[11px] font-bold px-4 py-2 rounded-lg transition-all hover:brightness-110"
                style={{ background: "rgba(183,255,24,0.10)", color: NEON, border: "1px solid rgba(183,255,24,0.20)" }}>
                Upload Keys
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {[
                { label: "Demo Keys", avail: demoKeys.available, committed: demoKeys.claimed ?? 0, total: (demoKeys.available ?? 0) + (demoKeys.claimed ?? 0) },
                { label: "Full Game Keys", avail: fullKeys.available, committed: fullKeys.awarded ?? 0, total: (fullKeys.available ?? 0) + (fullKeys.awarded ?? 0) },
              ].map((item) => {
                const pct = item.total > 0 ? Math.round((item.avail / item.total) * 100) : 0;
                const isLow = item.avail <= 3;
                const barColor = isLow ? "#f87171" : item.avail <= 10 ? "#f59e0b" : NEON;
                return (
                  <div key={item.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-white/60">{item.label}</span>
                      <span className="text-xs font-black" style={{ color: barColor }}>{item.avail}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: barColor }} />
                    </div>
                    <div className="text-[9px] text-white/20 mt-1">
                      {item.avail} available · {item.committed} committed
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Profile Strength */}
        <div className="rounded-2xl p-5"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-white">Profile Strength</h3>
            <button onClick={() => onGoTo("game-profile")}
              className="text-[10px] font-bold flex items-center gap-1 text-white/35 hover:text-white/65 transition-colors">
              Edit <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="relative w-14 h-14 shrink-0">
              <svg className="w-14 h-14 -rotate-90" viewBox="0 0 44 44">
                <circle cx="22" cy="22" r="17" fill="none" strokeWidth="3.5" stroke="rgba(255,255,255,0.06)" />
                <circle cx="22" cy="22" r="17" fill="none" strokeWidth="3.5"
                  stroke={profilePct >= 80 ? NEON : profilePct >= 50 ? "#f59e0b" : "#f87171"}
                  strokeDasharray={`${2 * Math.PI * 17 * profilePct / 100} ${2 * Math.PI * 17}`}
                  strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-black text-white">{profilePct}%</span>
              </div>
            </div>
            <div>
              <div className="text-sm font-black text-white">{profileReady ? "Profile Ready" : "Setup in Progress"}</div>
              <div className="text-[10px] text-white/30 mt-0.5">{allFilled} of {ALL_PROFILE_FIELDS.length} fields complete</div>
            </div>
          </div>
          {nextSteps.length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-[10px] text-white/25 mb-1.5">Recommended next steps:</p>
              {nextSteps.map((step, i) => (
                <button key={step.field ?? i} onClick={() => onGoTo("game-profile")}
                  className="w-full flex items-center gap-2 text-left group py-1.5 rounded-lg px-2 transition-colors hover:bg-white/[0.03]">
                  <div className="w-4 h-4 rounded-full border flex items-center justify-center shrink-0"
                    style={{ borderColor: "rgba(255,255,255,0.12)" }}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
                  </div>
                  <span className="flex-1 text-xs text-white/40 group-hover:text-white/65 transition-colors truncate">{step.label}</span>
                  <span className="text-[9px] font-black shrink-0" style={{ color: NEON }}>+{step.pct}%</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: NEON }}>
              <CheckCircle2 className="w-3.5 h-3.5" /> All fields complete
            </div>
          )}
        </div>
      </div>

      {/* ── 6. NEEDS ATTENTION (if any) ── */}
      {(!profileReady || demoKeys.available < 5 || content.length > 0) && (
        <div className="rounded-2xl p-5"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <h3 className="text-sm font-black text-white mb-4">Needs Attention</h3>
          <div className="space-y-2">
            {!profileReady && (
              <button onClick={() => onGoTo("game-profile")}
                className="w-full flex items-center gap-3 text-left group py-2.5 px-3 rounded-xl transition-colors hover:bg-white/[0.03]"
                style={{ background: "rgba(248,113,113,0.03)", border: "1px solid rgba(248,113,113,0.10)" }}>
                <AlertCircle className="w-4 h-4 shrink-0" style={{ color: "#f87171" }} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-white/70">Complete your game profile</div>
                  <div className="text-[10px] text-white/25">{missingEssential.length} essential field{missingEssential.length > 1 ? "s" : ""} missing</div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-white/15 group-hover:text-white/40" />
              </button>
            )}
            {demoKeys.available < 5 && (
              <button onClick={() => onGoTo("keys")}
                className="w-full flex items-center gap-3 text-left group py-2.5 px-3 rounded-xl transition-colors hover:bg-white/[0.03]"
                 style={{ background: `${DASHBOARD_THEME.warning}08`, border: `1px solid ${DASHBOARD_THEME.warning}1a` }}>
                 <KeyRound className="w-4 h-4 shrink-0" style={{ color: DASHBOARD_THEME.warning }} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-white/70">Low on demo keys</div>
                  <div className="text-[10px] text-white/25">Only {demoKeys.available} remaining — upload more</div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-white/15 group-hover:text-white/40" />
              </button>
            )}
            {content.length > 0 && (
              <button onClick={() => onGoTo("creator-content")}
                className="w-full flex items-center gap-3 text-left group py-2.5 px-3 rounded-xl transition-colors hover:bg-white/[0.03]"
                 style={{ background: rgbaAccent(0.03), border: `1px solid ${rgbaAccent(0.10)}` }}>
                 <Film className="w-4 h-4 shrink-0" style={{ color: NEON }} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-white/70">{content.length} submission{content.length > 1 ? "s" : ""} to review</div>
                  <div className="text-[10px] text-white/25">Feature the best community content</div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-white/15 group-hover:text-white/40" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── 7. INDIE PRO UPSELL ── */}
      {!user?.isIndieDevSubscriber && (
        <div className="rounded-xl p-5"
          style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-start gap-3">
            <Star className="w-4 h-4 shrink-0 mt-0.5" style={{ color: NEON }} />
            <div className="flex-1">
              <div className="text-xs font-bold text-white mb-1">Indie Pro</div>
              <p className="text-[10px] text-white/25 mb-3 leading-relaxed">
                Unlock additional developer tools and promotion benefits for your game.
              </p>
              <button onClick={() => setShowUpgrade(true)}
                className="text-[10px] font-bold px-4 py-2 rounded-lg transition-all hover:brightness-110"
                style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}>
                View Indie Pro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
