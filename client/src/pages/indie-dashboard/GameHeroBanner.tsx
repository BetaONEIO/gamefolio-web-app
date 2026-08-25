import { useState, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useSignedUrl } from "@/hooks/use-signed-url";
import { Loader2, ImagePlus, X, CropIcon, Upload } from "lucide-react";
import { NEON } from "./constants";
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

const ALL_PROFILE_FIELDS = [
  "gameName", "shortDescription", "headerImageUrl", "steamUrl", "epicUrl", "itchUrl",
  "fullDescription", "releaseDate", "studioName", "genres", "tags", "platforms",
  "capsuleImageUrl", "trailerUrl", "screenshotUrls", "keyFeatures",
  "websiteUrl", "twitterUrl", "discordUrl", "ageRating", "supportedLanguages",
];

const PROFILE_STEPS: { field: string; label: string; pct: number }[] = [
  { field: "trailerUrl",       label: "Upload a trailer",      pct: 5 },
  { field: "steamUrl",         label: "Add Steam Store URL",   pct: 3 },
  { field: "fullDescription",  label: "Write full description", pct: 3 },
  { field: "releaseDate",      label: "Set release date",      pct: 3 },
  { field: "screenshotUrls",   label: "Add screenshots",       pct: 2 },
  { field: "genres",           label: "Select genres",         pct: 2 },
  { field: "tags",             label: "Add tags",              pct: 2 },
  { field: "platforms",        label: "Set platforms",         pct: 2 },
];

const BANNER_ASPECT = 16 / 9;

function isFieldFilled(profile: any, field: string) {
  if (!profile) return false;
  const v = profile[field];
  if (v === null || v === undefined || v === "") return false;
  if (Array.isArray(v) && v.length === 0) return false;
  return true;
}

function getCroppedBlob(image: HTMLImageElement, crop: PixelCrop): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  canvas.width = Math.round(crop.width * scaleX);
  canvas.height = Math.round(crop.height * scaleY);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(
    image,
    crop.x * scaleX, crop.y * scaleY,
    crop.width * scaleX, crop.height * scaleY,
    0, 0, canvas.width, canvas.height,
  );
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Canvas toBlob failed")), "image/jpeg", 0.92);
  });
}

function makeInitialCrop(imgWidth: number, imgHeight: number): Crop {
  return centerCrop(
    makeAspectCrop({ unit: "%", width: 90 }, BANNER_ASPECT, imgWidth, imgHeight),
    imgWidth, imgHeight,
  );
}

// ── Crop modal ─────────────────────────────────────────────────────────────────
interface CropModalProps {
  src: string;
  onConfirm: (blob: Blob) => void;
  onCancel: () => void;
  isUploading: boolean;
}

function BannerCropModal({ src, onConfirm, onCancel, isUploading }: CropModalProps) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(makeInitialCrop(width, height));
  }, []);

  const handleConfirm = async () => {
    if (!imgRef.current || !completedCrop) return;
    const blob = await getCroppedBlob(imgRef.current, completedCrop);
    onConfirm(blob);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(6px)" }}>
      <div className="flex flex-col gap-4 w-full max-w-2xl"
        style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 16, padding: 24 }}>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CropIcon className="w-4 h-4" style={{ color: NEON }} />
            <span className="text-sm font-black text-white">Crop Banner Image</span>
          </div>
          <button onClick={onCancel} disabled={isUploading}
            className="rounded-lg p-1.5 transition-colors hover:bg-white/10">
            <X className="w-4 h-4 text-white/50" />
          </button>
        </div>

        <p className="text-[11px] text-white/40 -mt-2">
          Drag to reposition · Resize handles to adjust · 16:9 aspect ratio
        </p>

        {/* Cropper */}
        <div className="rounded-xl overflow-hidden flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.6)", maxHeight: "55vh" }}>
          <ReactCrop
            crop={crop}
            onChange={c => setCrop(c)}
            onComplete={c => setCompletedCrop(c)}
            aspect={BANNER_ASPECT}
            minWidth={120}>
            <img
              ref={imgRef}
              src={src}
              alt="Crop preview"
              onLoad={onImageLoad}
              style={{ maxHeight: "55vh", maxWidth: "100%", display: "block" }}
            />
          </ReactCrop>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-1">
          <button onClick={onCancel} disabled={isUploading}
            className="px-4 py-2 rounded-lg text-sm font-bold transition-colors text-white/50 hover:text-white/80"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }}>
            Cancel
          </button>
          <button onClick={handleConfirm} disabled={isUploading || !completedCrop}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-black transition-all"
            style={{
              background: isUploading || !completedCrop ? "rgba(183,255,24,0.25)" : NEON,
              color: "#0a0f14",
              opacity: !completedCrop ? 0.5 : 1,
            }}>
            {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            {isUploading ? "Uploading…" : "Upload Banner"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main banner component ───────────────────────────────────────────────────────
export default function GameHeroBanner({ gameId }: { gameId?: number }) {
  const { user } = useAuth();
  const [imgError, setImgError] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [localCapsulePreview, setLocalCapsulePreview] = useState<string | null>(null);
  const artworkInputRef = useRef<HTMLInputElement>(null);
  const capsuleInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useMutation({
    mutationFn: async ({ blob, field, gameId }: { blob: Blob; field: "headerImageUrl" | "capsuleImageUrl"; gameId?: number }) => {
      const fd = new FormData();
      fd.append("image", blob, field === "headerImageUrl" ? "banner.jpg" : "capsule.jpg");
      fd.append("field", field);
      if (gameId) fd.append("gameId", String(gameId));
      const res = await fetch("/api/indie/profile/upload-image", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Upload failed");
      return res.json() as Promise<{ url: string; field: string }>;
    },
    onSuccess: (data, variables) => {
      setImgError(false);
      setCropSrc(null);
      // Replace the local blob preview with the real server URL
      if (variables.field === "headerImageUrl") {
        setLocalPreview(data.url);
      } else {
        setLocalCapsulePreview(data.url);
      }
      queryClient.setQueryData(["/api/indie/profile", variables.gameId ?? null], (cached: any) => ({
        ...(cached ?? {}),
        profile: { ...(cached?.profile ?? {}), [variables.field]: data.url },
      }));
      queryClient.invalidateQueries({ queryKey: ["/api/indie/profile"] });
    },
    onError: () => {
      setCropSrc(null);
      setLocalPreview(null);
      setLocalCapsulePreview(null);
    },
  });

  const { data: profileData } = useQuery<any>({
    queryKey: ["/api/indie/profile", gameId ?? null],
    queryFn: () => apiRequest("GET", `/api/indie/profile${gameId ? `?gameId=${gameId}` : ""}`).then(r => r.json()),
  });

  const profile = profileData?.profile ?? null;
  const allFilled = ALL_PROFILE_FIELDS.filter((f) => isFieldFilled(profile, f)).length;
  const profilePct = Math.round((allFilled / ALL_PROFILE_FIELDS.length) * 100);
  const nextSteps = PROFILE_STEPS.filter((s) => !isFieldFilled(profile, s.field)).slice(0, 3);

  // Use local optimistic preview first, then server data, then fallback
  const serverBannerUrl = !imgError ? (profile?.headerImageUrl || profile?.capsuleImageUrl || null) : null;
  const bannerUrl = localPreview ?? serverBannerUrl;
  const capsuleUrl = localCapsulePreview ?? profile?.capsuleImageUrl ?? null;
  const { signedUrl: displayBannerUrl } = useSignedUrl(bannerUrl);
  const { signedUrl: displayCapsuleUrl } = useSignedUrl(capsuleUrl);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Revoke old blob if any
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    const objectUrl = URL.createObjectURL(file);
    setCropSrc(objectUrl);
    setImgError(false);
    e.target.value = "";
  };

  const handleCropConfirm = (blob: Blob) => {
    // Show optimistic preview immediately
    const previewUrl = URL.createObjectURL(blob);
    setLocalPreview(previewUrl);
    uploadMutation.mutate({ blob, field: "headerImageUrl", gameId: profile?.id ?? gameId });
  };

  const handleCapsuleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLocalCapsulePreview(URL.createObjectURL(file));
    uploadMutation.mutate({ blob: file, field: "capsuleImageUrl", gameId: profile?.id ?? gameId });
    e.target.value = "";
  };

  const handleCropCancel = () => {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  };

  return (
    <>
      {/* ── Crop modal ─────────────────────────────────────────────────── */}
      {cropSrc && (
        <BannerCropModal
          src={cropSrc}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
          isUploading={uploadMutation.isPending}
        />
      )}

      <div className="relative w-full overflow-hidden min-h-[420px] sm:min-h-[560px] md:min-h-[640px]"
        style={{ background: "#0a0f14" }}>

        {/* Background banner image — full width, no rounding */}
        {displayBannerUrl && (
          <img src={displayBannerUrl} alt=""
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
            onError={() => { setImgError(true); setLocalPreview(null); }} />
        )}

        {/* Dark gradient overlays */}
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(90deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0.35) 100%)" }} />
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, transparent 50%)" }} />

        {/* Neon bottom border */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5"
          style={{ background: "rgba(183,255,24,0.25)" }} />

        {/* Change banner button */}
        <button
          onClick={() => artworkInputRef.current?.click()}
          disabled={uploadMutation.isPending}
          className="absolute top-5 right-5 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all backdrop-blur-md"
          style={{ background: "rgba(0,0,0,0.45)", color: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.12)" }}>
          {uploadMutation.isPending
            ? <Loader2 className="w-3 h-3 animate-spin" />
            : <ImagePlus className="w-3 h-3" />}
          {uploadMutation.isPending ? "Uploading…" : "Change Banner"}
        </button>

        {/* Upload indicator overlay */}
        {uploadMutation.isPending && (
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl backdrop-blur-md"
              style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(183,255,24,0.25)" }}>
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: NEON }} />
              <span className="text-xs font-bold" style={{ color: NEON }}>Uploading banner…</span>
            </div>
          </div>
        )}

        <input
          ref={artworkInputRef}
          type="file" accept="image/*" className="hidden"
          onChange={handleFileChange}
        />
        <input
          ref={capsuleInputRef}
          type="file" accept="image/*" className="hidden"
          onChange={handleCapsuleFileChange}
        />

        {/* Hero content */}
        <div className="relative z-10 max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col justify-center min-h-[420px] sm:min-h-[560px] md:min-h-[640px]">
          <div className="flex flex-col lg:flex-row lg:items-end gap-8 py-10">

            {/* LEFT — Capsule + game info */}
            <div className="flex items-end gap-5 flex-1 min-w-0">
              {/* Capsule image */}
              <button
                type="button"
                onClick={() => capsuleInputRef.current?.click()}
                disabled={uploadMutation.isPending}
                aria-label={displayCapsuleUrl ? "Change game icon" : "Upload game icon"}
                className="group relative shrink-0 rounded-lg overflow-hidden shadow-2xl disabled:cursor-wait"
                style={{
                  width: 128,
                  aspectRatio: "3/4",
                  background: "rgba(255,255,255,0.04)",
                  border: displayCapsuleUrl ? "1px solid rgba(255,255,255,0.10)" : "1px dashed rgba(255,255,255,0.12)",
                }}>
                {displayCapsuleUrl ? (
                  <img src={displayCapsuleUrl} alt="Game icon" className="w-full h-full object-cover" />
                ) : (
                  <span className="w-full h-full flex flex-col items-center justify-center gap-2">
                    <ImagePlus className="w-6 h-6 text-white/25" />
                    <span className="text-[9px] font-bold uppercase tracking-wider text-white/35">Upload icon</span>
                  </span>
                )}
                {displayCapsuleUrl && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-[9px] font-bold uppercase tracking-wider text-white opacity-0 transition-opacity group-hover:opacity-100">
                    Change icon
                  </span>
                )}
                {uploadMutation.isPending && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/60">
                    <Loader2 className="w-5 h-5 animate-spin" style={{ color: NEON }} />
                  </span>
                )}
              </button>

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
    </>
  );
}
