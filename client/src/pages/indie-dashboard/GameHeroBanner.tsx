import { useState, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getQueryFn, queryClient } from "@/lib/queryClient";
import { Loader2, ImagePlus } from "lucide-react";
import { NEON } from "./constants";

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

export default function GameHeroBanner() {
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

  const { data: profileData } = useQuery<any>({
    queryKey: ["/api/indie/profile"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const profile = profileData?.profile ?? null;
  const allFilled = ALL_PROFILE_FIELDS.filter((f) => isFieldFilled(profile, f)).length;
  const profilePct = Math.round((allFilled / ALL_PROFILE_FIELDS.length) * 100);
  const nextSteps = PROFILE_STEPS.filter((s) => !isFieldFilled(profile, s.field)).slice(0, 3);

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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
