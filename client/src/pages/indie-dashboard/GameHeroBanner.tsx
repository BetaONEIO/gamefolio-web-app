import { useState, useRef, useCallback, useEffect, useId } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useSignedUrl } from "@/hooks/use-signed-url";
import { Loader2, ImagePlus, X, CropIcon, Upload, ArrowUpRight, Edit3 } from "lucide-react";
import { SiEpicgames, SiItchdotio, SiSteam } from "react-icons/si";
import { publicUrl } from "@/lib/platform";
import { GAME_PLATFORM_LINKS, GAME_SOCIAL_LINKS } from "@/lib/indie-game-links";
import { NEON } from "./constants";
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

const BANNER_ASPECT = 16 / 9;
const CAPSULE_ASPECT = 3 / 4;

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

function makeInitialCrop(imgWidth: number, imgHeight: number, aspect: number): Crop {
  return centerCrop(
    makeAspectCrop({ unit: "%", width: 90 }, aspect, imgWidth, imgHeight),
    imgWidth, imgHeight,
  );
}

// ── Crop modal ─────────────────────────────────────────────────────────────────
interface CropModalProps {
  src: string;
  onConfirm: (blob: Blob) => void;
  onCancel: () => void;
  isUploading: boolean;
  aspect: number;
  title: string;
  aspectLabel: string;
  confirmLabel: string;
}

function ImageCropModal({
  src,
  onConfirm,
  onCancel,
  isUploading,
  aspect,
  title,
  aspectLabel,
  confirmLabel,
}: CropModalProps) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isUploading) {
        onCancel();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      ));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [isUploading, onCancel]);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(makeInitialCrop(width, height, aspect));
  }, [aspect]);

  const handleConfirm = async () => {
    if (!imgRef.current || !completedCrop) return;
    const blob = await getCroppedBlob(imgRef.current, completedCrop);
    onConfirm(blob);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(6px)" }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId}
        className="flex flex-col gap-4 w-full max-w-2xl"
        style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 16, padding: 24 }}>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CropIcon className="w-4 h-4" style={{ color: NEON }} />
            <span id={titleId} className="text-sm font-black text-white">{title}</span>
          </div>
          <button ref={closeButtonRef} onClick={onCancel} disabled={isUploading} aria-label={`Close ${title}`}
            className="rounded-lg p-1.5 transition-colors hover:bg-white/10">
            <X className="w-4 h-4 text-white/50" />
          </button>
        </div>

        <p className="text-[11px] text-white/40 -mt-2">
          Drag to reposition · Resize handles to adjust · {aspectLabel} aspect ratio
        </p>

        {/* Cropper */}
        <div className="rounded-xl overflow-hidden flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.6)", maxHeight: "55vh" }}>
          <ReactCrop
            crop={crop}
            onChange={c => setCrop(c)}
            onComplete={c => setCompletedCrop(c)}
            aspect={aspect}
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
            {isUploading ? "Uploading…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main banner component ───────────────────────────────────────────────────────
export default function GameHeroBanner({
  gameId,
  onGoTo,
  onEditProfile,
}: {
  gameId?: number;
  onGoTo?: (field: string) => void;
  onEditProfile?: () => void;
}) {
  const { user } = useAuth();
  const [imgError, setImgError] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [capsuleCropSrc, setCapsuleCropSrc] = useState<string | null>(null);
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
        setCropSrc(null);
      } else {
        setLocalCapsulePreview(data.url);
        setCapsuleCropSrc(null);
      }
      queryClient.setQueryData(["/api/indie/profile", variables.gameId ?? null], (cached: any) => ({
        ...(cached ?? {}),
        profile: { ...(cached?.profile ?? {}), [variables.field]: data.url },
      }));
      queryClient.invalidateQueries({ queryKey: ["/api/indie/profile"] });
    },
    onError: () => {
      setLocalPreview(null);
      setLocalCapsulePreview(null);
      setCropSrc(null);
      setCapsuleCropSrc(null);
    },
  });

  const { data: profileData } = useQuery<any>({
    queryKey: ["/api/indie/profile", gameId ?? null],
    queryFn: () => apiRequest("GET", `/api/indie/profile${gameId ? `?gameId=${gameId}` : ""}`).then(r => r.json()),
  });

  const profile = profileData?.profile ?? null;

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
    if (capsuleCropSrc) URL.revokeObjectURL(capsuleCropSrc);
    setCapsuleCropSrc(URL.createObjectURL(file));
    setImgError(false);
    e.target.value = "";
  };

  const handleBannerCropCancel = () => {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  };

  const handleCapsuleCropConfirm = (blob: Blob) => {
    if (capsuleCropSrc) URL.revokeObjectURL(capsuleCropSrc);
    setCapsuleCropSrc(null);
    setLocalCapsulePreview(URL.createObjectURL(blob));
    uploadMutation.mutate({ blob, field: "capsuleImageUrl", gameId: profile?.id ?? gameId });
  };

  const handleCapsuleCropCancel = () => {
    if (capsuleCropSrc) URL.revokeObjectURL(capsuleCropSrc);
    setCapsuleCropSrc(null);
  };

  return (
    <>
      {/* ── Crop modal ─────────────────────────────────────────────────── */}
      {cropSrc && (
        <ImageCropModal
          src={cropSrc}
          onConfirm={handleCropConfirm}
          onCancel={handleBannerCropCancel}
          isUploading={uploadMutation.isPending}
          aspect={BANNER_ASPECT}
          title="Crop Banner Image"
          aspectLabel="16:9"
          confirmLabel="Upload Banner"
        />
      )}
      {capsuleCropSrc && (
        <ImageCropModal
          src={capsuleCropSrc}
          onConfirm={handleCapsuleCropConfirm}
          onCancel={handleCapsuleCropCancel}
          isUploading={uploadMutation.isPending}
          aspect={CAPSULE_ASPECT}
          title="Crop Game Icon"
          aspectLabel="3:4"
          confirmLabel="Upload Game Icon"
        />
      )}

      <div className="relative w-full overflow-hidden" style={{ background: "#0a0f14" }}>
        {/* Banner artwork stays visually separate from the game identity section below. */}
        <div className="relative h-[300px] sm:h-[420px] md:h-[520px]">
          {displayBannerUrl && (
            <img src={displayBannerUrl} alt=""
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
              onError={() => { setImgError(true); setLocalPreview(null); }} />
          )}

          <div className="absolute inset-0"
            style={{ background: "linear-gradient(90deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0.35) 100%)" }} />
          <div className="absolute inset-0"
            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, transparent 50%)" }} />

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

          {uploadMutation.isPending && (
            <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl backdrop-blur-md"
                style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(183,255,24,0.25)" }}>
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: NEON }} />
                <span className="text-xs font-bold" style={{ color: NEON }}>Uploading banner…</span>
              </div>
            </div>
          )}
        </div>

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

        {/* Game identity section — intentionally below the banner, with a larger icon. */}
        <div className="relative z-10 border-t border-white/10">
          <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-7">
              <button
                type="button"
                onClick={() => capsuleInputRef.current?.click()}
                disabled={uploadMutation.isPending}
                aria-label={displayCapsuleUrl ? "Change game icon" : "Upload game icon"}
                className="group relative w-36 sm:w-44 md:w-48 aspect-[3/4] shrink-0 rounded-xl overflow-hidden shadow-2xl disabled:cursor-wait"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: displayCapsuleUrl ? "1px solid rgba(255,255,255,0.10)" : "1px dashed rgba(255,255,255,0.12)",
                }}>
                {displayCapsuleUrl ? (
                  <img src={displayCapsuleUrl} alt="Game icon" className="w-full h-full object-cover" />
                ) : (
                  <span className="w-full h-full flex flex-col items-center justify-center gap-2">
                    <ImagePlus className="w-8 h-8 text-white/25" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white/35">Upload icon</span>
                  </span>
                )}
                {displayCapsuleUrl && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-[10px] font-bold uppercase tracking-wider text-white opacity-0 transition-opacity group-hover:opacity-100">
                    Change icon
                  </span>
                )}
                {uploadMutation.isPending && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/60">
                    <Loader2 className="w-6 h-6 animate-spin" style={{ color: NEON }} />
                  </span>
                )}
              </button>

              <div className="min-w-0 flex-1">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white leading-tight mb-2">
                  {profile?.gameName ?? "Your Game"}
                </h2>
                {(profile?.shortDescription || profile?.fullDescription) && (
                  <p className="mb-3 max-w-3xl text-sm leading-relaxed text-white/60 line-clamp-2 sm:text-base">
                    {profile.shortDescription || profile.fullDescription}
                  </p>
                )}
                {!!profile?.platforms?.length && (
                  <div className="mb-4 flex flex-wrap gap-2" aria-label="Available platforms">
                    {profile.platforms.map((platform: string) => {
                      const definition = GAME_PLATFORM_LINKS[platform.toLowerCase()];
                      const Icon = definition?.icon;
                      return (
                        <span key={platform}
                          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold text-white"
                          style={{ background: "#151724", border: "1px solid #252938" }}>
                          {Icon && <Icon className="h-3 w-3" />}
                          {definition?.label ?? platform.replace(/_/g, " ")}
                        </span>
                      );
                    })}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-3 mb-5">
                  {profile?.releaseStatus && (
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded uppercase tracking-wider"
                      style={{ background: "rgba(183,255,24,0.12)", color: "#B7FF18", border: "1px solid rgba(183,255,24,0.20)" }}>
                      {profile.releaseStatus.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
                    </span>
                  )}
                  {profile?.studioName && <span className="text-[11px] text-white/40">{profile.studioName}</span>}
                </div>

                {(profile?.steamUrl || profile?.epicUrl || profile?.itchUrl || GAME_SOCIAL_LINKS.some(({ field }) => profile?.[field])) && (
                  <div className="mb-5 flex flex-wrap gap-2">
                    {profile?.steamUrl && (
                      <a href={profile.steamUrl} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold transition-opacity hover:opacity-80"
                        style={{ background: "#1b2838", color: "#c6d4df", border: "1px solid #1b2838" }}>
                        <SiSteam className="h-3 w-3" /> Steam
                      </a>
                    )}
                    {profile?.epicUrl && (
                      <a href={profile.epicUrl} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold transition-opacity hover:opacity-80"
                        style={{ background: "#2a2a2a", color: "#fff", border: "1px solid #444" }}>
                        <SiEpicgames className="h-3 w-3" /> Epic Games
                      </a>
                    )}
                    {profile?.itchUrl && (
                      <a href={profile.itchUrl} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold text-white transition-opacity hover:opacity-80"
                        style={{ background: "#fa5c5c", border: "1px solid #fa5c5c" }}>
                        <SiItchdotio className="h-3 w-3" /> itch.io
                      </a>
                    )}
                    {GAME_SOCIAL_LINKS.map(({ field, label, color, borderColor, icon: Icon }) => {
                      const href = profile?.[field];
                      return href ? (
                        <a key={field} href={href} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold text-white transition-[filter] hover:brightness-110"
                          style={{ background: color, border: `1px solid ${borderColor}` }}>
                          <Icon className="h-3 w-3" /> {label}
                        </a>
                      ) : null;
                    })}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                   {onEditProfile && (
                     <button type="button" onClick={onEditProfile}
                       className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[10px] font-black transition-all hover:brightness-110"
                       style={{ background: NEON, color: "#071000" }}>
                       <Edit3 className="h-3 w-3" /> Edit game profile
                     </button>
                   )}
                   {user?.username && profile?.id && (
                     <a href={publicUrl(`/studio/${encodeURIComponent(user.username)}?gameId=${profile.id}`)}
                       target="_blank" rel="noreferrer"
                       className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[10px] font-black text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                       style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}>
                       View public page <ArrowUpRight className="h-3 w-3" />
                     </a>
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
