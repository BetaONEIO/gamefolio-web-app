import { useState, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getQueryFn, queryClient } from "@/lib/queryClient";
import {
  Rocket, Users, Loader2,
  TrendingUp,
  ArrowUpRight,
  Film,
  ImagePlus,
} from "lucide-react";
import { NEON } from "./constants";

const ESSENTIAL_FIELDS = ["gameName", "shortDescription", "headerImageUrl", "steamUrl", "epicUrl", "itchUrl"];
const ALL_PROFILE_FIELDS = [
  "gameName", "shortDescription", "headerImageUrl", "steamUrl", "epicUrl", "itchUrl",
  "fullDescription", "releaseDate", "studioName", "genres", "tags", "platforms",
  "capsuleImageUrl", "trailerUrl", "screenshotUrls", "keyFeatures",
  "websiteUrl", "twitterUrl", "discordUrl", "ageRating", "supportedLanguages",
];

const PROFILE_STEPS: { field: string; label: string; pct: number }[] = [
  { field: "trailerUrl", label: "Upload a trailer", pct: 5 },
  { field: "steamUrl", label: "Add Steam Store URL", pct: 3 },
  { field: "fullDescription", label: "Write full description", pct: 3 },
  { field: "releaseDate", label: "Set release date", pct: 3 },
  { field: "screenshotUrls", label: "Add screenshots", pct: 2 },
  { field: "genres", label: "Select genres", pct: 2 },
  { field: "tags", label: "Add tags", pct: 2 },
  { field: "platforms", label: "Set platforms", pct: 2 },
];

function isFieldFilled(profile: any, field: string) {
  if (!profile) return false;
  const v = profile[field];
  if (v === null || v === undefined || v === "") return false;
  if (Array.isArray(v) && v.length === 0) return false;
  return true;
}

type TopTabId = "overview" | "campaigns" | "creator-content" | "keys" | "analytics" | "game-profile";

export default function GameHeroBanner({ onGoTo }: { onGoTo: (tab: TopTabId, sub?: string) => void }) {
  const { user } = useAuth();
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

  const { data: overview } = useQuery<any>({
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
  const allFilled = ALL_PROFILE_FIELDS.filter((f) => isFieldFilled(profile, f)).length;
  const profilePct = Math.round((allFilled / ALL_PROFILE_FIELDS.length) * 100);
  const missingEssential = ESSENTIAL_FIELDS.filter((f) => !isFieldFilled(profile, f));
  const nextSteps = PROFILE_STEPS.filter((s) => !isFieldFilled(profile, s.field)).slice(0, 3);

  const d = overview ?? {
    activeCampaigns: 0, totalParticipants: 0,
    demoKeysRemaining: 0, fullKeysRemaining: 0, recentCampaigns: [],
  };
  const demoKeys = bountyStatus?.demoKeys ?? { available: d.demoKeysRemaining ?? 0, claimed: 0 };
  const fullKeys = bountyStatus?.fullGameKeys ?? { available: d.fullKeysRemaining ?? 0, awarded: 0 };

  const activeCampaigns = (campaigns ?? []).filter((c: any) => {
    const s = (c.status ?? "").toLowerCase();
    return s === "active" || s === "live" || s === "running" || s === "approved";
  });

  const content = Array.isArray(contentData) ? contentData : [];
  const contentTotal = content.length;
  const clipsTotal = content.filter((c: any) => (c.type ?? "clip") === "clip").length;
  const reelsTotal = content.filter((c: any) => (c.type ?? "clip") === "reel").length;
  const screenshotsTotal = content.filter((c: any) => (c.type ?? "clip") === "screenshot").length;

  const bannerUrl = (!imgError && (profile?.headerImageUrl || profile?.capsuleImageUrl))
    ? (profile.headerImageUrl ?? profile.capsuleImageUrl) : null;
  const capsuleUrl = profile?.capsuleImageUrl ?? null;

  return (
    <div className="relative w-full overflow-hidden min-h-[420px] sm:min-h-[560px] md:min-h-[640px]"
      style={{ background: "#0a0f14" }}>

      {/* Background banner image — full width, no rounding */}
      {bannerUrl && (
        <img src={bannerUrl} alt=""
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => setImgError(true)} />
      )}

      {/* Dark gradient overlays — match frontend hero style */}
      <div className="absolute inset-0"
        style={{ background: "linear-gradient(90deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0.35) 100%)" }} />
      <div className="absolute inset-0"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, transparent 50%)" }} />

      {/* Neon bottom border — match frontend */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5"
        style={{ background: "rgba(183,255,24,0.25)" }} />

      {/* Change banner button — top-right */}
      <button
        onClick={() => artworkInputRef.current?.click()}
        className="absolute top-5 right-5 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all backdrop-blur-md"
        style={{ background: "rgba(0,0,0,0.45)", color: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.12)" }}>
        {uploadImageMutation.isPending
          ? <Loader2 className="w-3 h-3 animate-spin" />
          : <ImagePlus className="w-3 h-3" />}
        {uploadImageMutation.isPending ? "Uploading…" : "Change Banner"}
      </button>
      <input
        ref={artworkInputRef}
        type="file" accept="image/*" className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) { setImgError(false); uploadImageMutation.mutate(file); }
          e.target.value = "";
        }}
      />

      {/* Hero content — vertically centred */}
      <div className="relative z-10 max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col justify-center min-h-[420px] sm:min-h-[560px] md:min-h-[640px]">
        <div className="flex flex-col lg:flex-row lg:items-end gap-8 py-10">

          {/* LEFT — Capsule + game info */}
          <div className="flex items-end gap-5 flex-1 min-w-0">
            {/* Capsule image */}
            {capsuleUrl ? (
              <div className="shrink-0 rounded-lg overflow-hidden shadow-2xl"
                style={{ width: 128, aspectRatio: "3/4", border: "1px solid rgba(255,255,255,0.10)" }}>
                <img src={capsuleUrl} alt="" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="shrink-0 rounded-lg flex items-center justify-center"
                style={{ width: 128, aspectRatio: "3/4", background: "rgba(255,255,255,0.04)", border: "1px dashed rgba(255,255,255,0.12)" }}>
                <ImagePlus className="w-6 h-6 text-white/15" />
              </div>
            )}

            <div className="min-w-0 pb-1">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white leading-tight mb-3 drop-shadow-lg">
                {profile?.gameName ?? "Your Game"}
              </h2>
              <div className="flex flex-wrap items-center gap-3 mb-5">
                {profile?.releaseStatus && (
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded uppercase tracking-wider"
                    style={{ background: "rgba(183,255,24,0.12)", color: "#B7FF18", border: "1px solid rgba(183,255,24,0.20)" }}>
                    {profile.releaseStatus.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
                  </span>
                )}
                {profile?.platforms?.[0] && (
                  <span className="text-[11px] text-white/40">{profile.platforms[0]}</span>
                )}
                {profile?.studioName && (
                  <span className="text-[11px] text-white/40">{profile.studioName}</span>
                )}
              </div>

              {/* Profile Strength */}
              <div className="mb-5 max-w-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">Profile Strength</span>
                  <span className="text-[11px] font-black"
                    style={{ color: profilePct >= 80 ? NEON : profilePct >= 50 ? "#f59e0b" : "#f87171" }}>
                    {profilePct}%
                  </span>
                </div>
                <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.10)" }}>
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${profilePct}%`,
                      background: profilePct >= 80 ? NEON : profilePct >= 50 ? "#f59e0b" : "#f87171" }} />
                </div>
                {profilePct < 100 && nextSteps.length > 0 && (
                  <p className="text-[10px] mt-1.5 text-white/30">
                    Next: {nextSteps[0].label} <span style={{ color: NEON }}>+{nextSteps[0].pct}%</span>
                  </p>
                )}
              </div>

              {/* Primary CTA */}
              <div className="flex flex-wrap items-center gap-2">
                {missingEssential.length > 0 ? (
                  <button onClick={() => onGoTo("game-profile")}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]"
                    style={{ background: NEON, color: "#070b10", boxShadow: "0 4px 24px rgba(183,255,24,0.25)" }}>
                    Complete Setup <ArrowUpRight className="w-4 h-4" />
                  </button>
                ) : activeCampaigns.length === 0 ? (
                  <button onClick={() => onGoTo("campaigns", "create")}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]"
                    style={{ background: NEON, color: "#070b10", boxShadow: "0 4px 24px rgba(183,255,24,0.25)" }}>
                    <Rocket className="w-4 h-4" /> Create Campaign
                  </button>
                ) : (
                  <button onClick={() => onGoTo("campaigns", "my")}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]"
                    style={{ background: NEON, color: "#070b10", boxShadow: "0 4px 24px rgba(183,255,24,0.25)" }}>
                    View Campaign <ArrowUpRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT — Compact stats */}
          <div className="shrink-0 grid grid-cols-2 sm:grid-cols-3 gap-3 lg:w-[340px]">
            {[
              { label: "Active Campaign", value: activeCampaigns.length > 0 ? "Live" : "None",
                sub: activeCampaigns.length > 0 ? (activeCampaigns[0].template_name ?? "Campaign") : "No campaign", color: activeCampaigns.length > 0 ? NEON : "#475569" },
              { label: "Active Creators", value: String(d.totalParticipants),
                sub: "Enrolled", color: d.totalParticipants > 0 ? NEON : "#475569" },
              { label: "Demo Keys", value: String(demoKeys.available),
                sub: "Available", color: demoKeys.available < 5 ? "#f87171" : demoKeys.available < 15 ? "#f59e0b" : NEON },
              { label: "Content Created", value: String(contentTotal),
                sub: `${clipsTotal} clips \u00b7 ${reelsTotal} reels`, color: contentTotal > 0 ? "#a78bfa" : "#475569" },
              { label: "Total Views", value: (analyticsData?.totalViews ?? d.totalViews ?? 0).toLocaleString(),
                sub: "Across all content", color: (analyticsData?.totalViews ?? d.totalViews ?? 0) > 0 ? "#60a5fa" : "#475569" },
              { label: "Profile", value: `${profilePct}%`,
                sub: profilePct >= 80 ? "Complete" : "Needs work", color: profilePct >= 80 ? "#4ade80" : profilePct >= 50 ? "#f59e0b" : "#f87171" },
            ].map(({ label, value, sub, color }) => (
              <div key={label} className="rounded-xl p-3 text-center"
                style={{ background: "rgba(0,0,0,0.40)", border: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(8px)" }}>
                <div className="text-[9px] text-white/30 uppercase tracking-wider mb-1">{label}</div>
                <div className="text-base font-black" style={{ color }}>{value}</div>
                <div className="text-[9px] text-white/20 truncate">{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
