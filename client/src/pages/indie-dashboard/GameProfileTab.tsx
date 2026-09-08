import { useState, useRef, useCallback, useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useSignedUrl, useSignedUrls } from "@/hooks/use-signed-url";
import {
  Pencil, X, Check, Loader2, Upload, Plus, Trash2, ExternalLink,
  Image as ImageIcon, Video, Globe, Gamepad2,
  Play, Sparkles, Building2, Package, Download,
  ArrowUpRight, ChevronDown, ChevronRight, Share2,
} from "lucide-react";
import {
  SiSteam, SiEpicgames, SiItchdotio, SiMacos, SiLinux,
  SiPlaystation, SiNintendoswitch, SiIos, SiAndroid,
} from "react-icons/si";
import { FaWindows, FaXbox } from "react-icons/fa6";
import { NEON, CARD_BG, CARD_BORDER } from "./constants";
import { useAuth } from "@/hooks/use-auth";
import { publicUrl } from "@/lib/platform";
import {
  GAME_SOCIAL_LINKS,
  emptyGameSocialValues,
  type GameSocialField,
} from "@/lib/indie-game-links";
import { StoreImportPanel } from "./edit-profile/StoreImportPanel";
import { SyncPanel } from "./edit-profile/SyncPanel";
import { DataSourceExplainer } from "./edit-profile/DataSourceExplainer";
import {
  isFieldFilled, RELEASE_STATUS_OPTIONS, PLATFORM_OPTIONS,
  type Profile, type FieldMeta,
} from "./edit-profile/types";
import { validateGameSocialUrl } from "@shared/store-urls";

// ─── Health scoring ────────────────────────────────────────────────────────────
const HEALTH_FIELDS = [
  { key: "gameName",        label: "Game name",          pts: 15, section: "about"  },
  { key: "shortDescription",label: "Short description",  pts: 12, section: "about"  },
  { key: "fullDescription", label: "Full description",   pts: 8,  section: "about"  },
  { key: "headerImageUrl",  label: "Banner image",       pts: 15, section: "media"  },
  { key: "capsuleImageUrl", label: "Capsule artwork",    pts: 10, section: "media"  },
  { key: "trailerUrl",      label: "Game trailer",       pts: 10, section: "media"  },
  { key: "genres",          label: "Genres",             pts: 5,  section: "about"  },
  { key: "keyFeatures",     label: "Key features",       pts: 5,  section: "about"  },
  { key: "platforms",       label: "Platforms",          pts: 5,  section: "platforms"},
  { key: "studioName",      label: "Studio name",        pts: 5,  section: "studio" },
  { key: "releaseStatus",   label: "Release status",     pts: 5,  section: "about"  },
  { key: "screenshotUrls",  label: "Screenshots",        pts: 5,  section: "media"  },
] as const;

type ProfileSectionId = "basics" | "platforms" | "stores" | "media" | "details" | "developer" | "advanced";

const PROFILE_SECTION_BY_FIELD: Record<string, ProfileSectionId> = {
  gameName: "basics",
  shortDescription: "basics",
  releaseStatus: "basics",
  genres: "basics",
   platforms: "platforms",
  fullDescription: "details",
  tags: "details",
  keyFeatures: "details",
  releaseDate: "details",
  price: "basics",
  headerImageUrl: "media",
  capsuleImageUrl: "media",
  trailerUrl: "media",
  screenshotUrls: "media",
  steamUrl: "stores",
  steamAppId: "stores",
  epicUrl: "stores",
  epicSlug: "stores",
  itchUrl: "stores",
  websiteUrl: "stores",
  studioName: "developer",
  studioCountry: "developer",
  studioFoundedYear: "developer",
  studioTeamSize: "developer",
  studioWebsite: "developer",
   twitterUrl: "platforms",
   discordUrl: "platforms",
   youtubeUrl: "platforms",
   twitchUrl: "platforms",
   instagramUrl: "platforms",
   facebookUrl: "platforms",
   tiktokUrl: "platforms",
  ageRating: "details",
  supportedLanguages: "details",
  contentDescriptors: "details",
};

const PROFILE_SECTION_FIELDS: Record<Exclude<ProfileSectionId, "stores" | "advanced">, string[]> = {
  basics: ["gameName", "shortDescription", "releaseStatus", "genres"],
  platforms: ["platforms", ...GAME_SOCIAL_LINKS.map(({ field }) => field)],
  media: ["headerImageUrl", "capsuleImageUrl", "trailerUrl", "screenshotUrls"],
  details: ["fullDescription", "tags", "keyFeatures", "releaseDate", "ageRating", "supportedLanguages", "contentDescriptors"],
  developer: ["studioName", "studioCountry", "studioFoundedYear", "studioTeamSize", "studioWebsite"],
};

function computeHealth(profile: Profile | null) {
  let earned = 0;
  const missing: typeof HEALTH_FIELDS[number][] = [];
  for (const f of HEALTH_FIELDS) {
    if (isFieldFilled(profile, f.key)) earned += f.pts;
    else missing.push(f);
  }
  const total = HEALTH_FIELDS.reduce((s, f) => s + f.pts, 0);
  const pct = Math.round((earned / total) * 100);
  return { pct, top3: missing.sort((a, b) => b.pts - a.pts).slice(0, 3), missing, missingCount: missing.length };
}

function getSectionStatus(profile: Profile | null, section: ProfileSectionId) {
  if (section === "advanced") {
    return {
      label: profile?.steamAppId || profile?.epicSlug ? "Sync ready" : "Import available",
      color: profile?.steamAppId || profile?.epicSlug ? NEON : "rgba(255,255,255,0.5)",
    };
  }

  if (section === "stores") {
    const connected = [
      !!(profile?.steamUrl || profile?.steamAppId),
      !!(profile?.epicUrl || profile?.epicSlug),
      !!profile?.itchUrl,
      !!profile?.websiteUrl,
    ].filter(Boolean).length;
    return {
      label: connected ? `${connected} link${connected === 1 ? "" : "s"} connected` : "No links connected",
      color: connected ? NEON : "#f59e0b",
    };
  }

  const fields = PROFILE_SECTION_FIELDS[section];
  const filled = fields.filter(field => isFieldFilled(profile, field)).length;
  const missing = fields.length - filled;
  return {
    label: missing === 0 ? "Complete" : `${missing} to add`,
    color: missing === 0 ? NEON : filled > 0 ? "#d8b24c" : "#f59e0b",
  };
}

// ─── Save hook ─────────────────────────────────────────────────────────────────
function profileId(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function updateMatchingProfileCaches(data: any, submittedFields: Record<string, any> = {}) {
  const savedProfileId = profileId(submittedFields.gameId ?? data?.profile?.id);
  const submittedProfileFields = Object.fromEntries(
    Object.entries(submittedFields).filter(([field]) => field !== "gameId"),
  );

  queryClient.setQueriesData(
    {
      predicate: (query) => {
        if (query.queryKey[0] !== "/api/indie/profile") return false;
        if (savedProfileId == null) return true;

        const queryGameId = profileId(query.queryKey[1]);
        const cachedProfileId = profileId((query.state.data as any)?.profile?.id);
        return queryGameId === savedProfileId || cachedProfileId === savedProfileId;
      },
    },
    (cached: any) => {
      if (!cached) return cached;
      // Merge the returned profile into each active profile query. The
      // dashboard and editor can both be mounted with slightly different
      // resolved values, so replacing the whole cache can make a multi-field
      // save appear to undo unrelated fields until the refetch finishes.
      return {
        ...cached,
        ...data,
        profile: {
          ...(cached.profile ?? {}),
          ...submittedProfileFields,
          ...(data?.profile ?? {}),
        },
        fieldMeta: { ...(cached.fieldMeta ?? {}), ...(data?.fieldMeta ?? {}) },
      };
    },
  );
}

function useSaveProfile(_gameId?: number, onSuccess?: () => void) {
  const { toast } = useToast();
  return useMutation({
    mutationFn: (fields: Record<string, any>) =>
      apiRequest("PUT", "/api/indie/profile", fields).then(r => r.json()),
    onSuccess: async (data, submittedFields) => {
      updateMatchingProfileCaches(data, submittedFields);
      await queryClient.invalidateQueries({ queryKey: ["/api/indie/profile"] });
      toast({ description: "Saved" });
      onSuccess?.();
    },
    onError: (error: Error) => {
      const message = error.message.replace(/^\d+:\s*/, "");
      toast({ description: message || "Save failed", variant: "gamefolioError" });
    },
  });
}

// ─── Image upload hook ─────────────────────────────────────────────────────────
function useUploadImage() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ file, field, gameId }: { file: File; field: "headerImageUrl" | "capsuleImageUrl"; gameId?: number }) => {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("field", field);
      if (gameId) fd.append("gameId", String(gameId));
      const res = await fetch("/api/indie/profile/upload-image", {
        method: "POST", body: fd, credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || data?.message || "Image upload failed");
      }
      return res.json() as Promise<{ url: string; field: string }>;
    },
    onSuccess: async (data, variables) => {
      queryClient.setQueryData(["/api/indie/profile", variables.gameId ?? null], (cached: any) => ({
        ...(cached ?? {}),
        profile: { ...(cached?.profile ?? {}), [data.field]: data.url },
      }));
      await queryClient.invalidateQueries({ queryKey: ["/api/indie/profile"] });
      toast({ description: "Image uploaded" });
    },
    onError: (error: Error) => toast({ description: error.message, variant: "gamefolioError" }),
  });
}

function useUploadTrailer() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ file, gameId }: { file: File; gameId?: number }) => {
      const fd = new FormData();
      fd.append("video", file);
      if (gameId) fd.append("gameId", String(gameId));
      const res = await fetch("/api/indie/profile/upload-trailer", {
        method: "POST", body: fd, credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || data?.message || "Trailer upload failed");
      }
      return res.json() as Promise<{ url: string; field: string }>;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/indie/profile"] });
      toast({ description: "Trailer uploaded" });
    },
    onError: (error: Error) => toast({ description: error.message, variant: "gamefolioError" }),
  });
}

function useUploadScreenshot() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ files, gameId }: { files: File[]; gameId?: number }) => {
      const fd = new FormData();
      files.forEach(file => fd.append("screenshot", file));
      if (gameId) fd.append("gameId", String(gameId));
      const res = await fetch("/api/indie/upload/screenshot", {
        method: "POST", body: fd, credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || data?.message || "Screenshot upload failed");
      }
      return res.json() as Promise<{ urls: string[]; screenshotUrls: string[] }>;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/indie/profile"] });
      toast({ description: "Screenshots uploaded" });
    },
    onError: (error: Error) => toast({ description: error.message, variant: "gamefolioError" }),
  });
}

// ─── EditModal ─────────────────────────────────────────────────────────────────
function EditModal({
  title, onClose, children, onSave, isSaving, saveLabel = "Save changes", focusField,
}: {
  title: string; onClose: () => void; children: React.ReactNode;
  onSave?: () => void; isSaving?: boolean; saveLabel?: string; focusField?: string;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    window.requestAnimationFrame(() => {
      const target = focusField
        ? dialogRef.current?.querySelector<HTMLElement>(`[data-profile-field="${focusField}"]`)
        : null;
      (target ?? closeButtonRef.current)?.focus();
    });
    return () => previousFocus?.focus();
  }, [focusField]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      ));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto p-4 overscroll-contain"
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)", paddingTop: "calc(env(safe-area-inset-top, 0px) + 4.5rem)" }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId}
        className="relative w-full max-w-2xl max-h-[calc(100dvh-7rem)] flex flex-col rounded-2xl overflow-hidden"
        style={{ background: "#0e1419", border: `1px solid ${CARD_BORDER}`, boxShadow: "0 32px 80px rgba(0,0,0,0.7)" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0"
          style={{ borderColor: CARD_BORDER }}>
          <h3 id={titleId} className="text-base font-bold text-white">{title}</h3>
          <button ref={closeButtonRef} onClick={onClose} aria-label={`Close ${title}`}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10 text-white/50 hover:text-white">
            <X size={16} />
          </button>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 min-h-0">
          {children}
        </div>
        {/* Footer */}
        {onSave && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t shrink-0"
            style={{ borderColor: CARD_BORDER }}>
            <button onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-white/50 hover:text-white transition-colors">
              Cancel
            </button>
            <button onClick={onSave} disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all"
              style={{ background: NEON, color: "#070b10", opacity: isSaving ? 0.7 : 1 }}>
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {saveLabel}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

// ─── TagInput ──────────────────────────────────────────────────────────────────
function TagInput({ value = [], onChange, placeholder, fieldName }: {
  value?: string[]; onChange: (v: string[]) => void; placeholder?: string; fieldName?: string;
}) {
  const [input, setInput] = useState("");
  const add = () => {
    const t = input.trim();
    if (t && !value.includes(t)) onChange([...value, t]);
    setInput("");
  };
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {value.map((tag, i) => (
          <span key={i} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
            style={{ background: `${NEON}18`, color: NEON, border: `1px solid ${NEON}44` }}>
            {tag}
            <button onClick={() => onChange(value.filter((_, j) => j !== i))} className="hover:text-white/80">
              <X size={10} />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input data-profile-field={fieldName} value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder || "Type and press Enter…"}
          className="flex-1 bg-transparent border rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white/30"
          style={{ borderColor: CARD_BORDER }} />
        <button onClick={add} className="px-3 py-2 rounded-lg text-xs font-bold text-white/60 border border-white/10 hover:text-white hover:border-white/30 transition-all">
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── FieldInput ────────────────────────────────────────────────────────────────
function FieldInput({ label, value, onChange, type = "text", placeholder, rows, fieldName }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; rows?: number; fieldName?: string;
}) {
  const inputId = useId();
  return (
    <div className="space-y-1.5">
      {label && <label htmlFor={inputId} className="text-xs font-medium text-white/50 uppercase tracking-wider">{label}</label>}
      {rows ? (
          <textarea id={inputId} data-profile-field={fieldName} value={value} onChange={e => onChange(e.target.value)} rows={rows}
          placeholder={placeholder}
          className="w-full bg-transparent border rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-white/30 resize-none"
          style={{ borderColor: CARD_BORDER }} />
      ) : (
        <input id={inputId} data-profile-field={fieldName} type={type} value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent border rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-white/30"
          style={{ borderColor: CARD_BORDER }} />
      )}
    </div>
  );
}

// ─── DropZone ──────────────────────────────────────────────────────────────────
function DropZone({
  currentUrl, field, gameId, onUploaded, label, aspect, className = "",
}: {
  currentUrl?: string | null; field: "headerImageUrl" | "capsuleImageUrl";
  gameId?: number;
  onUploaded?: () => void; label?: string; aspect?: string; className?: string;
}) {
  const [dragging, setDragging] = useState(false);
  const upload = useUploadImage();
  const inputRef = useRef<HTMLInputElement>(null);
  const { signedUrl: displayUrl, isLoading: isLoadingImage } = useSignedUrl(currentUrl);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    upload.mutate({ file, field, gameId }, { onSuccess: () => onUploaded?.() });
  }, [upload, field, gameId, onUploaded]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div
      data-profile-field={field}
      role="button"
      tabIndex={0}
      aria-label={label || `Upload ${field === "headerImageUrl" ? "banner" : "capsule artwork"}`}
      className={`relative rounded-xl overflow-hidden cursor-pointer group ${className}`}
      style={{ border: `2px dashed ${dragging ? NEON : CARD_BORDER}`, transition: "border-color 0.15s" }}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onKeyDown={e => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onClick={() => inputRef.current?.click()}>
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />

      {currentUrl && displayUrl ? (
        <>
          <img src={displayUrl} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}>
            {upload.isPending
              ? <Loader2 size={20} className="animate-spin text-white mb-1" />
              : <Upload size={20} className="text-white mb-1" />}
            <span className="text-xs font-bold text-white">Replace image</span>
            {aspect && <span className="text-[10px] text-white/50 mt-0.5">{aspect}</span>}
          </div>
        </>
      ) : currentUrl && isLoadingImage ? (
        <div className="flex h-full flex-col items-center justify-center gap-2">
          <Loader2 size={20} className="animate-spin" style={{ color: NEON }} />
          <span className="text-xs text-white/35">Loading image…</span>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 px-4">
          {upload.isPending
            ? <Loader2 size={22} className="animate-spin mb-2" style={{ color: NEON }} />
            : <Upload size={22} className="mb-2 text-white/20 group-hover:text-white/50 transition-colors" />}
          <span className="text-sm font-medium text-white/30 group-hover:text-white/60 transition-colors text-center">
            {label || "Drop image or click to upload"}
          </span>
          {aspect && <span className="text-[11px] text-white/20 mt-1">{aspect}</span>}
        </div>
      )}
    </div>
  );
}

// ─── Profile Health Card ────────────────────────────────────────────────────────
function ProfileHealthCard({
  profile,
  onSelectField,
}: {
  profile: Profile | null;
  onSelectField: (field: string) => void;
}) {
  const { pct, top3 } = computeHealth(profile);
  const color = pct >= 80 ? NEON : pct >= 50 ? "#f59e0b" : "#ef4444";
  const label = pct >= 80 ? "Looking great" : pct >= 50 ? "Good progress" : "Needs attention";

  return (
    <div className="rounded-2xl p-5 flex items-center gap-6"
      style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
      {/* Circle */}
      <div className="relative shrink-0 w-20 h-20">
        <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
          <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
          <circle cx="40" cy="40" r="32" fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={`${2 * Math.PI * 32}`}
            strokeDashoffset={`${2 * Math.PI * 32 * (1 - pct / 100)}`}
            strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.8s ease" }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-black" style={{ color }}>{pct}%</span>
        </div>
      </div>
      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-bold text-white">Profile Health</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: `${color}18`, color, border: `1px solid ${color}44` }}>
            {label}
          </span>
        </div>
        {top3.length === 0 ? (
          <p className="text-xs text-white/40">Your profile is fully complete. Nice work!</p>
        ) : (
          <div className="space-y-1">
            {top3.map(f => (
              <button
                key={f.key}
                type="button"
                onClick={() => onSelectField(f.key)}
                className="flex w-full items-center gap-2 rounded-md px-1 py-0.5 text-left transition-colors hover:bg-white/[0.04]"
              >
                <div className="w-1 h-1 rounded-full shrink-0" style={{ background: color }} />
                <span className="text-xs text-white/50">Add {f.label}</span>
                <span className="text-[10px] ml-auto" style={{ color: `${color}80` }}>+{f.pts}pts</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── About Card ────────────────────────────────────────────────────────────────
function AboutCard({
  profile,
  fieldMeta,
  focusRequest,
}: {
  profile: Profile | null;
  fieldMeta: FieldMeta;
  focusRequest?: { field: string } | null;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [short, setShort] = useState("");
  const [full, setFull] = useState("");
  const [genres, setGenres] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [features, setFeatures] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [price, setPrice] = useState("");

  const save = useSaveProfile(profile?.id, () => setOpen(false));

  const openModal = () => {
    setName(profile?.gameName ?? "");
    setShort(profile?.shortDescription ?? "");
    setFull(profile?.fullDescription ?? "");
    setGenres((profile?.genres as string[]) ?? []);
    setTags((profile?.tags as string[]) ?? []);
    setFeatures((profile?.keyFeatures as string[]) ?? []);
    setStatus(profile?.releaseStatus ?? "");
    setReleaseDate(profile?.releaseDate ? String(profile.releaseDate).slice(0, 10) : "");
    setPrice(profile?.price ?? "");
    setOpen(true);
  };

  useEffect(() => {
    const aboutFields = new Set([
      "gameName", "shortDescription", "fullDescription", "genres", "tags",
      "keyFeatures", "releaseStatus", "releaseDate", "price",
    ]);
    if (profile && focusRequest && aboutFields.has(focusRequest.field)) openModal();
  }, [focusRequest, profile?.id]);

  const genreList = (profile?.genres as string[] | null) ?? [];
  const featureList = (profile?.keyFeatures as string[] | null) ?? [];

  return (
    <>
      <div data-profile-section="about" className="scroll-mt-24 rounded-2xl overflow-hidden" style={{ border: `1px solid ${CARD_BORDER}` }}>
        <div className="flex items-center justify-between px-5 py-4"
          style={{ background: "rgba(255,255,255,0.03)", borderBottom: `1px solid ${CARD_BORDER}` }}>
          <div className="flex items-center gap-2.5">
            <Sparkles size={16} style={{ color: NEON }} />
            <span className="text-sm font-bold text-white">About Your Game</span>
          </div>
          <button onClick={openModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:bg-white/10"
            style={{ border: `1px solid ${CARD_BORDER}`, color: "white" }}>
            <Pencil size={11} /> Edit
          </button>
        </div>
        <div className="p-5 space-y-4">
          {/* Game name */}
          {profile?.gameName ? (
            <h2 className="text-2xl font-black text-white">{profile.gameName}</h2>
          ) : (
            <p className="text-white/20 text-sm italic">No game name set</p>
          )}
          {/* Release status + price row */}
          <div className="flex flex-wrap gap-2">
            {profile?.releaseStatus && (
              <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{ background: `${NEON}18`, color: NEON, border: `1px solid ${NEON}33` }}>
                {RELEASE_STATUS_OPTIONS.find(o => o.value === profile.releaseStatus)?.label ?? profile.releaseStatus}
              </span>
            )}
            {profile?.price && (
              <span className="text-xs px-2.5 py-1 rounded-full font-medium text-white/60"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                ${profile.price}
              </span>
            )}
            {profile?.isFree && (
              <span className="text-xs px-2.5 py-1 rounded-full font-medium text-green-400"
                style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.25)" }}>
                Free to Play
              </span>
            )}
          </div>
          {/* Short description */}
          {profile?.shortDescription && (
            <div>
              <p className="text-sm text-white/70 leading-relaxed">{profile.shortDescription}</p>
            </div>
          )}
          {/* Genres */}
          {genreList.length > 0 && (
            <div>
              <div className="flex flex-wrap gap-1.5">
                {genreList.map((g, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded-md text-white/50"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    {g}
                  </span>
                ))}
              </div>
            </div>
          )}
          {/* Key features */}
          {featureList.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <p className="text-xs text-white/30 uppercase tracking-wider font-medium">Key Features</p>
              </div>
              <div className="grid gap-1.5">
                {featureList.slice(0, 4).map((f, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ background: NEON }} />
                    <span className="text-sm text-white/60">{f}</span>
                  </div>
                ))}
                {featureList.length > 4 && (
                  <p className="text-xs text-white/30 ml-3">+{featureList.length - 4} more</p>
                )}
              </div>
            </div>
          )}
          {!profile?.gameName && !profile?.shortDescription && genreList.length === 0 && (
            <button onClick={openModal}
              className="w-full py-6 flex flex-col items-center justify-center gap-2 rounded-xl transition-all hover:bg-white/5"
              style={{ border: `1px dashed ${CARD_BORDER}` }}>
              <Plus size={20} className="text-white/20" />
              <span className="text-sm text-white/30">Fill in your game details</span>
            </button>
          )}
        </div>
      </div>

      {open && (
        <EditModal title="About Your Game" onClose={() => setOpen(false)} focusField={focusRequest?.field}
          onSave={() => save.mutate({ gameId: profile?.id, gameName: name, shortDescription: short, fullDescription: full, genres, tags, keyFeatures: features, releaseStatus: status, releaseDate: releaseDate || null, price })}
          isSaving={save.isPending}>
          <FieldInput fieldName="gameName" label="Game Name" value={name} onChange={setName} placeholder="My Awesome Game" />
          <div>
            <label className="text-xs font-medium text-white/50 uppercase tracking-wider block mb-1.5">Release Status</label>
            <div className="flex gap-2">
              {RELEASE_STATUS_OPTIONS.map(o => (
                <button key={o.value} data-profile-field={o.value === "coming_soon" ? "releaseStatus" : undefined} onClick={() => setStatus(o.value)}
                  className="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
                  style={{
                    background: status === o.value ? `${NEON}22` : "rgba(255,255,255,0.04)",
                    border: `1px solid ${status === o.value ? `${NEON}88` : CARD_BORDER}`,
                    color: status === o.value ? NEON : "rgba(255,255,255,0.5)",
                  }}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <FieldInput fieldName="releaseDate" label="Release Date" value={releaseDate} onChange={setReleaseDate} type="date" />
          <FieldInput fieldName="price" label="Price (USD)" value={price} onChange={setPrice} placeholder="19.99" />
          <FieldInput fieldName="shortDescription" label="Short Description" value={short} onChange={setShort} rows={2}
            placeholder="One or two sentences about your game…" />
          <FieldInput fieldName="fullDescription" label="Full Description" value={full} onChange={setFull} rows={5}
            placeholder="Detailed description for store pages, campaign listings, and press kits…" />
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/50 uppercase tracking-wider block">Genres</label>
            <TagInput fieldName="genres" value={genres} onChange={setGenres} placeholder="e.g. Action, RPG, Platformer" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/50 uppercase tracking-wider block">Tags</label>
            <TagInput fieldName="tags" value={tags} onChange={setTags} placeholder="e.g. Co-op, Roguelite, Indie" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/50 uppercase tracking-wider block">Key Features</label>
            <TagInput fieldName="keyFeatures" value={features} onChange={setFeatures} placeholder="e.g. Open world, Co-op, Procedural generation" />
          </div>
        </EditModal>
      )}
    </>
  );
}

// ─── Media Card ────────────────────────────────────────────────────────────────
function MediaCard({
  profile,
  fieldMeta,
  focusRequest,
}: {
  profile: Profile | null;
  fieldMeta: FieldMeta;
  focusRequest?: { field: string } | null;
}) {
  // Trailer modal state
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [trailer, setTrailer] = useState("");
  const trailerFileRef = useRef<HTMLInputElement>(null);

  // Screenshots modal state
  const [shotsOpen, setShotsOpen] = useState(false);
  const [artworkOpen, setArtworkOpen] = useState<"headerImageUrl" | "capsuleImageUrl" | null>(null);
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [newShot, setNewShot] = useState("");
  const shotFileRef = useRef<HTMLInputElement>(null);

  const saveTrailer = useSaveProfile(profile?.id, () => setTrailerOpen(false));
  const saveShots = useSaveProfile(profile?.id, () => setShotsOpen(false));
  const uploadTrailer = useUploadTrailer();
  const uploadScreenshot = useUploadScreenshot();
  const shotList = (profile?.screenshotUrls as string[] | null) ?? [];
  const { getSignedUrl: getScreenshotUrl } = useSignedUrls(shotList);

  const openTrailerModal = () => {
    setTrailer(profile?.trailerUrl ?? "");
    setTrailerOpen(true);
  };

  const openShotsModal = () => {
    setScreenshots((profile?.screenshotUrls as string[] | null) ?? []);
    setNewShot("");
    setShotsOpen(true);
  };

  useEffect(() => {
    if (!profile) return;
    if (focusRequest?.field === "trailerUrl") openTrailerModal();
    if (focusRequest?.field === "screenshotUrls") openShotsModal();
    if (focusRequest?.field === "headerImageUrl" || focusRequest?.field === "capsuleImageUrl") {
      setArtworkOpen(focusRequest.field);
    }
  }, [focusRequest, profile?.id]);

  const addShot = () => {
    if (newShot.trim() && !screenshots.includes(newShot.trim())) {
      setScreenshots([...screenshots, newShot.trim()]);
      setNewShot("");
    }
  };

  return (
    <>
      <div data-profile-section="media" className="scroll-mt-24 rounded-2xl overflow-hidden" style={{ border: `1px solid ${CARD_BORDER}` }}>
        <div className="flex items-center px-5 py-4"
          style={{ background: "rgba(255,255,255,0.03)", borderBottom: `1px solid ${CARD_BORDER}` }}>
          <div className="flex items-center gap-2.5">
            <ImageIcon size={16} style={{ color: NEON }} />
            <span className="text-sm font-bold text-white">Media & Artwork</span>
          </div>
        </div>
        <div className="p-5 space-y-4">
          {/* Banner + Capsule row — direct drag-and-drop, no modal needed */}
          <div className="grid grid-cols-[1fr_160px] gap-3">
            <div>
              <p className="flex items-center gap-2 text-[10px] text-white/30 uppercase tracking-wider mb-1.5 font-medium">
                Banner · 16:9
              </p>
              <DropZone currentUrl={profile?.headerImageUrl} field="headerImageUrl" gameId={profile?.id}
                label="Drop banner or click to upload" aspect="1920 × 1080 recommended"
                className="aspect-video" />
            </div>
            <div>
              <p className="flex items-center gap-2 text-[10px] text-white/30 uppercase tracking-wider mb-1.5 font-medium">
                Capsule · 2:3
              </p>
              <DropZone currentUrl={profile?.capsuleImageUrl} field="capsuleImageUrl" gameId={profile?.id}
                label="Drop capsule" aspect="600 × 800 recommended"
                className="h-40" />
              <p className="mt-1 text-[10px] text-white/25">Recommended: 600 × 800 px (3:4)</p>
            </div>
          </div>

          {/* Trailer */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="flex items-center gap-2 text-[10px] text-white/30 uppercase tracking-wider font-medium">
                Trailer
              </p>
              <button
                type="button"
                onClick={openTrailerModal}
                className="flex items-center gap-1 text-[11px] text-white/30 hover:text-white transition-colors"
              >
                <Pencil size={11} /> Edit
              </button>
            </div>
            {profile?.trailerUrl ? (
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                style={{ border: `1px solid ${CARD_BORDER}` }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "rgba(239,68,68,0.15)" }}>
                  <Play size={14} className="text-red-400 ml-0.5" />
                </div>
                <span className="text-sm text-white/60 truncate flex-1">{profile.trailerUrl}</span>
                <button onClick={openTrailerModal}
                  className="text-[11px] text-white/30 hover:text-white transition-colors shrink-0">
                  <Pencil size={12} />
                </button>
              </div>
            ) : (
              <button onClick={openTrailerModal}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl transition-all hover:bg-white/5"
                style={{ border: `1px dashed ${CARD_BORDER}` }}>
                <Video size={16} className="text-white/20" />
                <span className="text-sm text-white/30">Add trailer URL or upload</span>
              </button>
            )}
          </div>

          {/* Screenshots */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] text-white/30 uppercase tracking-wider font-medium">
                Screenshots ({shotList.length})
              </p>
              <button
                type="button"
                onClick={openShotsModal}
                className="flex items-center gap-1 text-[11px] text-white/30 hover:text-white transition-colors"
              >
                <Pencil size={11} /> Edit
              </button>
            </div>
            {shotList.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {shotList.slice(0, 5).map((url, i) => {
                  const displayUrl = getScreenshotUrl(url);
                  return displayUrl ? (
                    <img key={i} src={displayUrl} alt={`Screenshot ${i + 1}`} className="rounded-lg w-full aspect-video object-cover"
                      style={{ border: `1px solid ${CARD_BORDER}` }} />
                  ) : (
                    <div key={i} className="rounded-lg aspect-video flex items-center justify-center"
                      style={{ border: `1px solid ${CARD_BORDER}`, background: "rgba(255,255,255,0.04)" }}>
                      <Loader2 size={16} className="animate-spin text-white/30" />
                    </div>
                  );
                })}
                {shotList.length > 5 && (
                  <div className="rounded-lg aspect-video flex items-center justify-center"
                    style={{ border: `1px solid ${CARD_BORDER}`, background: "rgba(255,255,255,0.04)" }}>
                    <span className="text-sm font-bold text-white/40">+{shotList.length - 5}</span>
                  </div>
                )}
              </div>
            ) : (
              <button onClick={openShotsModal}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl transition-all hover:bg-white/5"
                style={{ border: `1px dashed ${CARD_BORDER}` }}>
                <ImageIcon size={16} className="text-white/20" />
                <span className="text-sm text-white/30">Add screenshots</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Trailer modal ─────────────────────────────────────────────────────── */}
      {trailerOpen && (
        <EditModal title="Trailer" onClose={() => setTrailerOpen(false)} focusField={focusRequest?.field}
          onSave={() => saveTrailer.mutate({ gameId: profile?.id, trailerUrl: trailer })}
          isSaving={saveTrailer.isPending}>
          {/* URL input */}
          <FieldInput fieldName="trailerUrl" label="Trailer URL (YouTube / Vimeo)" value={trailer} onChange={setTrailer}
            type="url" placeholder="https://youtu.be/…" />

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: CARD_BORDER }} />
            <span className="text-xs text-white/25 font-medium">or upload a file</span>
            <div className="flex-1 h-px" style={{ background: CARD_BORDER }} />
          </div>

          {/* File upload area */}
          <input
            ref={trailerFileRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0];
                 if (f) {
                 uploadTrailer.mutate({ file: f, gameId: profile?.id }, { onSuccess: () => setTrailerOpen(false) });
              }
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => trailerFileRef.current?.click()}
            disabled={uploadTrailer.isPending}
            className="w-full flex flex-col items-center justify-center gap-2 py-6 rounded-xl transition-all hover:bg-white/5 disabled:opacity-50"
            style={{ border: `2px dashed ${CARD_BORDER}` }}
          >
            {uploadTrailer.isPending
              ? <Loader2 size={22} className="animate-spin" style={{ color: NEON }} />
              : <Upload size={22} className="text-white/20" />}
            <span className="text-sm text-white/30">
              {uploadTrailer.isPending ? "Uploading video…" : "Click to upload video file"}
            </span>
            <span className="text-xs text-white/15">MP4, MOV, WebM — max 500 MB</span>
          </button>

          {/* Currently set URL reminder if filled */}
          {profile?.trailerUrl && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${CARD_BORDER}` }}>
              <Play size={12} className="text-red-400 shrink-0" />
              <span className="text-xs text-white/40 truncate flex-1">Current: {profile.trailerUrl}</span>
            </div>
          )}
        </EditModal>
      )}

      {/* ── Screenshots modal ──────────────────────────────────────────────────── */}
      {shotsOpen && (
        <EditModal title="Screenshots" onClose={() => setShotsOpen(false)} focusField={focusRequest?.field}
          onSave={() => saveShots.mutate({ gameId: profile?.id, screenshotUrls: screenshots })}
          isSaving={saveShots.isPending}>

          {/* Upload a file */}
          <div>
            <label className="text-xs font-medium text-white/50 uppercase tracking-wider block mb-2">
              Upload screenshot
            </label>
            <input
              ref={shotFileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={e => {
                const files = Array.from(e.target.files ?? []);
                if (files.length > 0) {
                  uploadScreenshot.mutate(
                    { files, gameId: profile?.id },
                    { onSuccess: (data) => setScreenshots(data.screenshotUrls ?? []) },
                  );
                }
                e.target.value = "";
              }}
            />
            <button
              type="button"
              data-profile-field="screenshotUrls"
              onClick={() => shotFileRef.current?.click()}
              disabled={uploadScreenshot.isPending}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-xl transition-all hover:bg-white/5 disabled:opacity-50"
              style={{ border: `2px dashed ${CARD_BORDER}` }}
            >
              {uploadScreenshot.isPending
                ? <Loader2 size={18} className="animate-spin" style={{ color: NEON }} />
                : <Upload size={18} className="text-white/20" />}
              <span className="text-sm text-white/30">
                {uploadScreenshot.isPending ? "Uploading…" : "Click to upload one or more images"}
              </span>
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: CARD_BORDER }} />
            <span className="text-xs text-white/25 font-medium">or add a URL</span>
            <div className="flex-1 h-px" style={{ background: CARD_BORDER }} />
          </div>

          {/* URL list */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/50 uppercase tracking-wider block">
              Screenshot URLs ({screenshots.length})
            </label>
            {screenshots.length > 0 && (
              <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                {screenshots.map((url, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input value={url}
                      onChange={e => setScreenshots(screenshots.map((s, j) => j === i ? e.target.value : s))}
                      className="flex-1 bg-transparent border rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white/30"
                      style={{ borderColor: CARD_BORDER }} />
                    <button onClick={() => setScreenshots(screenshots.filter((_, j) => j !== i))}
                      className="text-white/30 hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2 mt-1">
              <input value={newShot} onChange={e => setNewShot(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addShot(); } }}
                placeholder="https://…"
                className="flex-1 bg-transparent border rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white/30"
                style={{ borderColor: CARD_BORDER }} />
              <button onClick={addShot}
                className="px-3 py-2 rounded-lg text-xs font-bold text-white/60 border border-white/10 hover:text-white hover:border-white/30 transition-all">
                <Plus size={14} />
              </button>
            </div>
          </div>
        </EditModal>
      )}
      {artworkOpen && (
        <EditModal
          title={artworkOpen === "headerImageUrl" ? "Game Banner" : "Game Icon"}
          onClose={() => setArtworkOpen(null)}
          focusField={artworkOpen}
        >
          <p className="text-xs leading-relaxed text-white/45">
            {artworkOpen === "headerImageUrl"
              ? "Upload a 16:9 banner for the top of your public game page."
              : "Upload a portrait game icon for cards and game identity."}
          </p>
          <DropZone
            currentUrl={profile?.[artworkOpen]}
            field={artworkOpen}
            gameId={profile?.id}
            label={artworkOpen === "headerImageUrl" ? "Drop banner or click to upload" : "Drop game icon or click to upload"}
            aspect={artworkOpen === "headerImageUrl" ? "1920 × 1080 recommended" : "600 × 800 recommended"}
            className={artworkOpen === "headerImageUrl" ? "aspect-video" : "mx-auto h-72 max-w-56"}
          />
        </EditModal>
      )}
    </>
  );
}

// ─── Store Listing Card ────────────────────────────────────────────────────────
function StoreListingCard({
  profile,
  fieldMeta,
  focusRequest,
}: {
  profile: Profile | null;
  fieldMeta: FieldMeta;
  focusRequest?: { field: string } | null;
}) {
  const [open, setOpen] = useState(false);
  const [steamAppId, setSteamAppId] = useState("");
  const [steamUrl, setSteamUrl] = useState("");
  const [epicSlug, setEpicSlug] = useState("");
  const [epicUrl, setEpicUrl] = useState("");
  const [itchUrl, setItchUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const save = useSaveProfile(profile?.id, () => setOpen(false));

  const openModal = () => {
    setSteamAppId(profile?.steamAppId ?? "");
    setSteamUrl(profile?.steamUrl ?? "");
    setEpicSlug(profile?.epicSlug ?? "");
    setEpicUrl(profile?.epicUrl ?? "");
    setItchUrl(profile?.itchUrl ?? "");
    setWebsiteUrl(profile?.websiteUrl ?? "");
    setOpen(true);
  };

  useEffect(() => {
    const storeFields = new Set(["steamUrl", "steamAppId", "epicUrl", "epicSlug", "itchUrl", "websiteUrl"]);
    if (profile && focusRequest && storeFields.has(focusRequest.field)) openModal();
  }, [focusRequest, profile?.id]);

  const stores = [
     { key: "steam", fieldName: "steamUrl", icon: <SiSteam size={20} className="text-white/85" />, label: "Steam", filled: !!(profile?.steamUrl || profile?.steamAppId), url: profile?.steamUrl },
     { key: "epic",  fieldName: "epicUrl", icon: <SiEpicgames size={20} className="text-white/85" />, label: "Epic Games", filled: !!(profile?.epicUrl || profile?.epicSlug), url: profile?.epicUrl },
     { key: "itch",  fieldName: "itchUrl", icon: <SiItchdotio size={20} className="text-white/85" />, label: "itch.io", filled: !!(profile?.itchUrl), url: profile?.itchUrl },
     { key: "web",   fieldName: "websiteUrl", icon: <Globe size={20} className="text-white/85" />, label: "Website", filled: !!(profile?.websiteUrl), url: profile?.websiteUrl },
  ];

  return (
    <>
      <div data-profile-section="store" className="scroll-mt-24 rounded-2xl overflow-hidden" style={{ border: `1px solid ${CARD_BORDER}` }}>
        <div className="flex items-center justify-between px-5 py-4"
          style={{ background: "rgba(255,255,255,0.03)", borderBottom: `1px solid ${CARD_BORDER}` }}>
          <div className="flex items-center gap-2.5">
            <Package size={16} style={{ color: NEON }} />
            <span className="text-sm font-bold text-white">Store Listing</span>
          </div>
          <button onClick={openModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:bg-white/10"
            style={{ border: `1px solid ${CARD_BORDER}`, color: "white" }}>
            <Pencil size={11} /> Edit
          </button>
        </div>
        <div className="p-5 grid grid-cols-2 gap-3">
     {stores.map(s => (
            <div key={s.key}
              className="flex items-center gap-3 p-4 rounded-xl transition-all"
               style={{ background: "#0F101B", border: `1px solid ${CARD_BORDER}` }}>
              <div className="shrink-0">{s.icon}</div>
              <div className="flex-1 min-w-0">
                 <div className="flex items-center gap-2 text-xs font-bold text-white/70">
                    {s.label}
                 </div>
                {s.filled && s.url ? (
                  <a href={s.url} target="_blank" rel="noopener noreferrer"
                    className="text-[10px] text-white/30 hover:text-white/60 flex items-center gap-1 truncate transition-colors">
                    View page <ExternalLink size={8} />
                  </a>
                ) : (
                  <button onClick={openModal} className="text-[10px] text-white/20 hover:text-white/40 transition-colors">
                    Add link →
                  </button>
                )}
              </div>
              <div className={`w-2 h-2 rounded-full shrink-0 ${s.filled ? "" : "opacity-20"}`}
                style={{ background: s.filled ? NEON : "white" }} />
            </div>
          ))}
        </div>
      </div>

      {open && (
        <EditModal title="Store Listing" onClose={() => setOpen(false)} focusField={focusRequest?.field}
          onSave={() => save.mutate({ gameId: profile?.id, steamAppId, steamUrl, epicSlug, epicUrl, itchUrl, websiteUrl })}
          isSaving={save.isPending}>
          <div className="space-y-3">
             <div className="flex items-center gap-2 mb-1">
               <SiSteam size={14} className="text-white/85" />
              <span className="text-xs font-bold text-white/70 uppercase tracking-wider">Steam</span>
            </div>
            <FieldInput fieldName="steamAppId" label="Steam App ID" value={steamAppId} onChange={setSteamAppId} placeholder="e.g. 730" />
            <FieldInput fieldName="steamUrl" label="Steam Store URL" value={steamUrl} onChange={setSteamUrl} type="url"
              placeholder="https://store.steampowered.com/app/…" />
          </div>
          <div className="h-px" style={{ background: CARD_BORDER }} />
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <SiEpicgames size={14} className="text-white/70" />
              <span className="text-xs font-bold text-white/70 uppercase tracking-wider">Epic Games</span>
            </div>
            <FieldInput fieldName="epicSlug" label="Epic Slug" value={epicSlug} onChange={setEpicSlug} placeholder="e.g. my-game" />
            <FieldInput fieldName="epicUrl" label="Epic Store URL" value={epicUrl} onChange={setEpicUrl} type="url"
              placeholder="https://store.epicgames.com/…" />
          </div>
          <div className="h-px" style={{ background: CARD_BORDER }} />
          <div className="space-y-3">
             <div className="flex items-center gap-2 mb-1">
               <SiItchdotio size={14} className="text-white/85" />
              <span className="text-xs font-bold text-white/70 uppercase tracking-wider">itch.io</span>
            </div>
            <FieldInput fieldName="itchUrl" label="itch.io URL" value={itchUrl} onChange={setItchUrl} type="url"
              placeholder="https://user.itch.io/game" />
          </div>
          <div className="h-px" style={{ background: CARD_BORDER }} />
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Globe size={14} className="text-white/50" />
              <span className="text-xs font-bold text-white/70 uppercase tracking-wider">Website</span>
            </div>
            <FieldInput fieldName="websiteUrl" label="Game / Studio Website" value={websiteUrl} onChange={setWebsiteUrl} type="url"
              placeholder="https://mygame.com" />
          </div>
        </EditModal>
      )}
    </>
  );
}

// ─── Platforms Card ─────────────────────────────────────────────────────────────
function PlatformCard({
  profile,
  fieldMeta,
  focusRequest,
}: {
  profile: Profile | null;
  fieldMeta: FieldMeta;
  focusRequest?: { field: string } | null;
}) {
  const { toast } = useToast();
  const selected: string[] = (profile?.platforms as string[] | null) ?? [];
  const [optimisticSelected, setOptimisticSelected] = useState<string[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const displayedSelected = optimisticSelected ?? selected;
  const displayedSelectedRef = useRef(selected);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const pendingWritesRef = useRef(0);

  useEffect(() => {
    if (optimisticSelected === null) displayedSelectedRef.current = selected;
  }, [selected, optimisticSelected]);

  useEffect(() => {
    if (profile && focusRequest?.field === "platforms") setOpen(true);
  }, [focusRequest, profile?.id]);

  const toggle = (id: string) => {
    const current = displayedSelectedRef.current;
    const next = current.includes(id)
      ? current.filter(p => p !== id)
      : [...current, id];
    // Reflect the choice immediately. The profile PUT also reconciles the
    // catalogue row, so waiting for its response makes this simple toggle
    // feel unresponsive even though the write is still progressing.
    displayedSelectedRef.current = next;
    setOptimisticSelected(next);
    pendingWritesRef.current += 1;
    setIsSaving(true);

    // Queue snapshots so rapid clicks remain responsive without allowing
    // out-of-order responses to overwrite the user's final selection.
    const save = async () => {
      try {
        const data = await (await apiRequest("PUT", "/api/indie/profile", { gameId: profile?.id, platforms: next })).json();
        updateMatchingProfileCaches(data);
      } catch (error: any) {
        if (pendingWritesRef.current === 1) {
          displayedSelectedRef.current = selected;
          setOptimisticSelected(null);
        }
        toast({ description: error?.message?.replace(/^\d+:\s*/, "") || "Save failed", variant: "gamefolioError" });
      } finally {
        pendingWritesRef.current -= 1;
        if (pendingWritesRef.current === 0) {
          setIsSaving(false);
          setOptimisticSelected(null);
          await queryClient.invalidateQueries({ queryKey: ["/api/indie/profile"] });
        }
      }
    };
    saveQueueRef.current = saveQueueRef.current.then(save, save);
  };

  const platformIcons: Record<string, React.ElementType> = {
    windows: FaWindows,
    mac: SiMacos,
    linux: SiLinux,
    ps5: SiPlaystation,
    xbox: FaXbox,
    switch: SiNintendoswitch,
    ios: SiIos,
    android: SiAndroid,
  };

  const platformButtons = (
    <div data-profile-field="platforms" tabIndex={-1} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {PLATFORM_OPTIONS.map(p => {
        const on = displayedSelected.includes(p.id);
        const Icon = platformIcons[p.id] ?? Gamepad2;
        return (
          <button key={p.id} type="button" onClick={() => toggle(p.id)}
            aria-pressed={on}
            className={`flex flex-col items-center gap-2 rounded-xl border p-3 transition-[background-color,border-color,color,transform] hover:-translate-y-0.5 ${
              on
                ? "border-[#B7FF18] bg-[#B7FF18] text-[#0F101B]"
                : "border-[#252938] bg-[#151724] text-[#F8FAFC] hover:border-[#B7FF18] hover:bg-[#1A1D2B]"
            }`}>
            <Icon size={21} />
            <span className="text-[10px] font-bold">{p.label}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <>
    <div data-profile-card="platforms" className="scroll-mt-24 rounded-2xl overflow-hidden" style={{ border: `1px solid ${CARD_BORDER}` }}>
      <div className="flex items-center gap-2.5 px-5 py-4" aria-busy={isSaving}
        style={{ background: "rgba(255,255,255,0.03)", borderBottom: `1px solid ${CARD_BORDER}` }}>
        <Gamepad2 size={16} style={{ color: NEON }} />
         <span className="flex items-center gap-2 text-sm font-bold text-white">
            Platforms
         </span>
         {isSaving && <Loader2 size={12} className="animate-spin text-white/40" aria-label="Saving platform changes" />}
      </div>
      <div className="p-5">{platformButtons}</div>
    </div>
    {open && (
      <EditModal title="Platforms" onClose={() => setOpen(false)} focusField={focusRequest?.field}>
        <p className="text-xs leading-relaxed text-white/45">Choose every platform where players can find your game. Changes save automatically.</p>
        {platformButtons}
      </EditModal>
    )}
    </>
  );
}

// ─── Studio Card ───────────────────────────────────────────────────────────────
function StudioCard({
  profile,
  fieldMeta,
  focusRequest,
}: {
  profile: Profile | null;
  fieldMeta: FieldMeta;
  focusRequest?: { field: string } | null;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [year, setYear] = useState("");
  const [team, setTeam] = useState("");
  const [website, setWebsite] = useState("");
  const save = useSaveProfile(profile?.id, () => setOpen(false));

  const openModal = () => {
    setName(profile?.studioName ?? "");
    setCountry(profile?.studioCountry ?? "");
    setYear(profile?.studioFoundedYear ? String(profile.studioFoundedYear) : "");
    setTeam(profile?.studioTeamSize ? String(profile.studioTeamSize) : "");
    setWebsite(profile?.studioWebsite ?? "");
    setOpen(true);
  };

  useEffect(() => {
    const studioFields = new Set([
      "studioName", "studioCountry", "studioFoundedYear", "studioTeamSize",
      "studioWebsite",
    ]);
    if (profile && focusRequest && studioFields.has(focusRequest.field)) openModal();
  }, [focusRequest, profile?.id]);

  const hasInfo = profile?.studioName || profile?.studioCountry || profile?.studioFoundedYear || profile?.studioTeamSize || profile?.studioWebsite;

  return (
    <>
      <div data-profile-section="studio" className="scroll-mt-24 rounded-2xl overflow-hidden" style={{ border: `1px solid ${CARD_BORDER}` }}>
        <div className="flex items-center justify-between px-5 py-4"
          style={{ background: "rgba(255,255,255,0.03)", borderBottom: `1px solid ${CARD_BORDER}` }}>
          <div className="flex items-center gap-2.5">
            <Building2 size={16} style={{ color: NEON }} />
            <span className="text-sm font-bold text-white">Studio</span>
          </div>
          <button onClick={openModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:bg-white/10"
            style={{ border: `1px solid ${CARD_BORDER}`, color: "white" }}>
            <Pencil size={11} /> Edit
          </button>
        </div>
        <div className="p-5">
          {hasInfo ? (
            <div className="space-y-3">
              {profile?.studioName && (
                 <h3 className="flex items-center gap-2 text-lg font-bold text-white">
                   {profile.studioName}
                 </h3>
              )}
              <div className="flex flex-wrap gap-3 text-sm text-white/50">
                {profile?.studioCountry && <span>📍 {profile.studioCountry}</span>}
                {profile?.studioFoundedYear && <span>Est. {profile.studioFoundedYear}</span>}
                {profile?.studioTeamSize && <span>{profile.studioTeamSize} person{Number(profile.studioTeamSize) !== 1 ? "s" : ""}</span>}
              </div>
              {profile?.studioWebsite && (
                <a href={profile.studioWebsite} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white/60 hover:text-white transition-colors"
                  style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${CARD_BORDER}` }}>
                  <Globe size={11} /> Studio website
                </a>
              )}
            </div>
          ) : (
            <button onClick={openModal}
              className="w-full py-6 flex flex-col items-center justify-center gap-2 rounded-xl transition-all hover:bg-white/5"
              style={{ border: `1px dashed ${CARD_BORDER}` }}>
              <Building2 size={20} className="text-white/20" />
              <span className="text-sm text-white/30">Add studio information</span>
            </button>
          )}
        </div>
      </div>

      {open && (
        <EditModal title="Studio" onClose={() => setOpen(false)} focusField={focusRequest?.field}
          onSave={() => save.mutate({
            gameId: profile?.id,
            studioName: name, studioCountry: country,
            studioFoundedYear: year ? parseInt(year) : null,
            studioTeamSize: team ? parseInt(team) : null,
            studioWebsite: website,
          })} isSaving={save.isPending}>
          <FieldInput fieldName="studioName" label="Studio Name" value={name} onChange={setName} placeholder="Acme Games" />
          <div className="grid grid-cols-2 gap-3">
            <FieldInput fieldName="studioCountry" label="Country" value={country} onChange={setCountry} placeholder="e.g. UK" />
            <FieldInput fieldName="studioFoundedYear" label="Founded Year" value={year} onChange={setYear} placeholder="e.g. 2022" />
          </div>
          <FieldInput fieldName="studioTeamSize" label="Team Size" value={team} onChange={setTeam} placeholder="e.g. 3" />
          <FieldInput fieldName="studioWebsite" label="Studio Website" value={website} onChange={setWebsite} type="url" placeholder="https://…" />
        </EditModal>
      )}
    </>
  );
}

// ─── Store Metadata Card ───────────────────────────────────────────────────────
function MetadataCard({
  profile,
  fieldMeta,
  focusRequest,
}: {
  profile: Profile | null;
  fieldMeta: FieldMeta;
  focusRequest?: { field: string } | null;
}) {
  const [open, setOpen] = useState(false);
  const [ageRating, setAgeRating] = useState("");
  const [supportedLanguages, setSupportedLanguages] = useState<string[]>([]);
  const [contentDescriptors, setContentDescriptors] = useState<string[]>([]);
  const save = useSaveProfile(profile?.id, () => setOpen(false));

  const openModal = () => {
    setAgeRating(profile?.ageRating ?? "");
    setSupportedLanguages((profile?.supportedLanguages as string[] | null) ?? []);
    setContentDescriptors((profile?.contentDescriptors as string[] | null) ?? []);
    setOpen(true);
  };

  useEffect(() => {
    if (focusRequest && PROFILE_SECTION_BY_FIELD[focusRequest.field] === "details"
      && ["ageRating", "supportedLanguages", "contentDescriptors"].includes(focusRequest.field)) openModal();
  }, [focusRequest, profile?.id]);

  const hasMetadata = !!profile?.ageRating
    || ((profile?.supportedLanguages as string[] | null) ?? []).length > 0
    || ((profile?.contentDescriptors as string[] | null) ?? []).length > 0;

  return (
    <>
      <div data-profile-section="metadata" className="rounded-2xl overflow-hidden scroll-mt-24" style={{ border: `1px solid ${CARD_BORDER}` }}>
        <div className="flex items-center justify-between px-5 py-4"
          style={{ background: "rgba(255,255,255,0.03)", borderBottom: `1px solid ${CARD_BORDER}` }}>
          <div className="flex items-center gap-2.5">
            <Globe size={16} style={{ color: NEON }} />
            <span className="text-sm font-bold text-white">Store Metadata</span>
          </div>
          <button onClick={openModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:bg-white/10"
            style={{ border: `1px solid ${CARD_BORDER}`, color: "white" }}>
            <Pencil size={11} /> Edit
          </button>
        </div>
        <div className="p-5">
          {hasMetadata ? (
            <div className="space-y-3 text-sm text-white/55">
              {profile?.ageRating && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-white/30">Age rating</span>
                  <span>{profile.ageRating}</span>
                </div>
              )}
              {((profile?.supportedLanguages as string[] | null) ?? []).length > 0 && (
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-white/30">Languages</span>
                  </div>
                  <p>{(profile?.supportedLanguages as string[]).join(", ")}</p>
                </div>
              )}
              {((profile?.contentDescriptors as string[] | null) ?? []).length > 0 && (
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-white/30">Content descriptors</span>
                  </div>
                  <p>{(profile?.contentDescriptors as string[]).join(", ")}</p>
                </div>
              )}
            </div>
          ) : (
            <button onClick={openModal}
              className="w-full py-6 flex flex-col items-center justify-center gap-2 rounded-xl transition-all hover:bg-white/5"
              style={{ border: `1px dashed ${CARD_BORDER}` }}>
              <Globe size={20} className="text-white/20" />
              <span className="text-sm text-white/30">Add store metadata</span>
            </button>
          )}
        </div>
      </div>

      {open && (
        <EditModal title="Store Metadata" onClose={() => setOpen(false)} focusField={focusRequest?.field}
          onSave={() => save.mutate({
            gameId: profile?.id,
            ageRating,
            supportedLanguages,
            contentDescriptors,
          })}
          isSaving={save.isPending}>
          <FieldInput fieldName="ageRating" label="Age Rating" value={ageRating} onChange={setAgeRating} placeholder="e.g. PEGI 12, ESRB T" />
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/50 uppercase tracking-wider block">Supported Languages</label>
            <TagInput fieldName="supportedLanguages" value={supportedLanguages} onChange={setSupportedLanguages} placeholder="e.g. English, French, Japanese" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/50 uppercase tracking-wider block">Content Descriptors</label>
            <TagInput fieldName="contentDescriptors" value={contentDescriptors} onChange={setContentDescriptors} placeholder="e.g. Fantasy Violence, Online Interactions" />
          </div>
        </EditModal>
      )}
    </>
  );
}

// ─── Advanced Card ─────────────────────────────────────────────────────────────
function AdvancedCard({ profile, fieldMeta }: { profile: Profile | null; fieldMeta: FieldMeta }) {
  const [tab, setTab] = useState<"import" | "sync">("import");

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${CARD_BORDER}` }}>
      <div className="px-5 py-4"
        style={{ background: "rgba(255,255,255,0.03)", borderBottom: `1px solid ${CARD_BORDER}` }}>
        <div className="flex items-center gap-2.5 mb-3">
          <Download size={16} style={{ color: NEON }} />
          <span className="text-sm font-bold text-white">Advanced</span>
        </div>
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: "rgba(0,0,0,0.3)" }}>
          {(["import", "sync"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-1.5 rounded text-xs font-bold transition-all"
              style={{
                background: tab === t ? CARD_BG : "transparent",
                border: tab === t ? `1px solid ${CARD_BORDER}` : "1px solid transparent",
                color: tab === t ? "white" : "rgba(255,255,255,0.35)",
              }}>
              {t === "import" ? "Import from Store" : "Sync Updates"}
            </button>
          ))}
        </div>
      </div>
      <div className="p-5">
        {tab === "import" && (
          <StoreImportPanel profile={profile} gameId={profile?.id} fieldMeta={fieldMeta}
            onImported={() => queryClient.invalidateQueries({ queryKey: ["/api/indie/profile"] })} />
        )}
        {tab === "sync" && (
          <SyncPanel profile={profile} gameId={profile?.id}
            onSynced={() => queryClient.invalidateQueries({ queryKey: ["/api/indie/profile"] })} />
        )}
      </div>
    </div>
  );
}

// ─── Social Platforms Card ──────────────────────────────────────────────────────
function CommunitySocialCard({
  profile,
  focusRequest,
}: {
  profile: Profile | null;
  focusRequest?: { field: string } | null;
}) {
  const [open, setOpen] = useState(false);
  const [socialValues, setSocialValues] = useState<Record<GameSocialField, string>>(emptyGameSocialValues);
  const save = useSaveProfile(profile?.id, () => setOpen(false));
  const socialErrors = Object.fromEntries(
    GAME_SOCIAL_LINKS.map(({ field }) => [field, validateGameSocialUrl(field, socialValues[field])]),
  ) as Record<GameSocialField, string | null>;
  const hasSocialErrors = Object.values(socialErrors).some(Boolean);

  useEffect(() => {
    if (!profile) return;
    setSocialValues(Object.fromEntries(
      GAME_SOCIAL_LINKS.map(({ field }) => [field, profile[field] ?? ""]),
    ) as Record<GameSocialField, string>);
  }, [profile?.id]);

  const openModal = () => {
    if (!profile) return;
    setSocialValues(Object.fromEntries(
      GAME_SOCIAL_LINKS.map(({ field }) => [field, profile[field] ?? ""]),
    ) as Record<GameSocialField, string>);
    setOpen(true);
  };

  useEffect(() => {
    if (profile && focusRequest && GAME_SOCIAL_LINKS.some(({ field }) => field === focusRequest.field)) {
      openModal();
    }
  }, [focusRequest, profile?.id]);

  const renderSocialFields = () => GAME_SOCIAL_LINKS.map(({ field, inputLabel, placeholder, color, icon: Icon }) => (
    <div key={field} className="rounded-xl p-3" style={{ background: "#151724", border: "1px solid #252938" }}>
      <div className="flex items-start gap-2.5">
        <Icon size={18} className="mt-0.5 shrink-0 text-white" style={{ color: "#fff" }} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <FieldInput
            fieldName={field}
            label={inputLabel}
            value={socialValues[field]}
            onChange={(value) => setSocialValues(current => ({ ...current, [field]: value }))}
            type="url"
            placeholder={placeholder}
          />
          {socialErrors[field] && (
            <p className="mt-1.5 text-[11px] text-red-400">{socialErrors[field]}</p>
          )}
        </div>
      </div>
    </div>
  ));

  return (
    <>
      <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${CARD_BORDER}` }}>
        <div className="flex items-center gap-2.5 px-5 py-4"
          style={{ background: "rgba(255,255,255,0.03)", borderBottom: `1px solid ${CARD_BORDER}` }}>
          <Share2 size={16} style={{ color: NEON }} aria-hidden="true" />
          <div>
            <span className="text-sm font-bold text-white">Social platforms</span>
            <p className="mt-0.5 text-[11px] text-white/35">Add the social spaces that belong to this game.</p>
          </div>
        </div>
        <div className="space-y-4 p-5">
          <p className="text-xs leading-relaxed text-white/45">
            These links appear as branded badges in the dashboard and on the game’s public profile.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {renderSocialFields()}
          </div>
          <div className="flex justify-end border-t pt-4" style={{ borderColor: CARD_BORDER }}>
            <button
              type="button"
              onClick={() => save.mutate({ gameId: profile?.id, ...socialValues })}
              disabled={save.isPending || hasSocialErrors}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              style={{ background: NEON, color: "#0F101B" }}
            >
              {save.isPending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              {save.isPending ? "Saving…" : "Save social platforms"}
            </button>
          </div>
        </div>
      </div>

      {open && (
        <EditModal
          title="Social Platforms"
          onClose={() => setOpen(false)}
          focusField={focusRequest?.field}
          onSave={() => save.mutate({ gameId: profile?.id, ...socialValues })}
          isSaving={save.isPending}
          saveLabel="Save social platforms"
        >
          <p className="text-xs leading-relaxed text-white/45">
            These links belong to this game and appear on its public profile.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {renderSocialFields()}
          </div>
        </EditModal>
      )}
    </>
  );
}

// ─── Details Summary ───────────────────────────────────────────────────────────
function GameDetailsSummary({ profile, onEdit }: { profile: Profile | null; onEdit: (field: string) => void }) {
  const fullDescription = profile?.fullDescription;
  const tags = (profile?.tags as string[] | null) ?? [];
  const features = (profile?.keyFeatures as string[] | null) ?? [];
  const releaseDate = profile?.releaseDate ? String(profile.releaseDate).slice(0, 10) : "";
  const hasDetails = !!fullDescription || tags.length > 0 || features.length > 0 || !!releaseDate;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${CARD_BORDER}` }}>
      <div className="flex items-center justify-between px-5 py-4"
        style={{ background: "rgba(255,255,255,0.03)", borderBottom: `1px solid ${CARD_BORDER}` }}>
        <div className="flex items-center gap-2.5">
          <Sparkles size={16} style={{ color: NEON }} />
          <div>
            <span className="text-sm font-bold text-white">Game details</span>
            <p className="mt-0.5 text-[11px] text-white/35">Tell players what makes this game worth discovering.</p>
          </div>
        </div>
        <button type="button" onClick={() => onEdit("fullDescription")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:bg-white/10"
          style={{ border: `1px solid ${CARD_BORDER}`, color: "white" }}>
          <Pencil size={11} /> Edit in Game Basics
        </button>
      </div>
      <div className="p-5">
        {hasDetails ? (
          <div className="space-y-4">
            {releaseDate && (
              <div className="flex items-center gap-2 text-sm text-white/55">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/30">Release date</span>
                <span>{releaseDate}</span>
              </div>
            )}
            {fullDescription && (
              <p className="text-sm leading-relaxed text-white/60 whitespace-pre-wrap">{fullDescription}</p>
            )}
            {features.length > 0 && (
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-white/30">Key features</p>
                <div className="flex flex-wrap gap-1.5">
                  {features.map((feature, index) => (
                    <span key={`${feature}-${index}`} className="rounded-full px-2.5 py-1 text-xs text-white/55"
                      style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${CARD_BORDER}` }}>
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {tags.length > 0 && (
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-white/30">Discovery tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag, index) => (
                    <span key={`${tag}-${index}`} className="rounded-full px-2.5 py-1 text-xs text-white/45"
                      style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${CARD_BORDER}` }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <button type="button" onClick={() => onEdit("fullDescription")}
            className="w-full py-6 flex flex-col items-center justify-center gap-2 rounded-xl transition-all hover:bg-white/5"
            style={{ border: `1px dashed ${CARD_BORDER}` }}>
            <Sparkles size={20} className="text-white/20" />
            <span className="text-sm text-white/30">Add a full description, features, or tags</span>
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Profile Accordion ─────────────────────────────────────────────────────────
function ProfileAccordion({
  id,
  title,
  description,
  status,
  open,
  onToggle,
  children,
}: {
  id: ProfileSectionId;
  title: string;
  description: string;
  status: { label: string; color: string };
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const headingId = `profile-section-heading-${id}`;
  const contentId = `profile-section-content-${id}`;

  return (
    <section data-profile-section={id} className="scroll-mt-24 overflow-hidden rounded-2xl"
      style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
      <button
        type="button"
        id={headingId}
        aria-expanded={open}
        aria-controls={contentId}
        onClick={onToggle}
        className="flex min-h-[4.5rem] w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.035] sm:px-5"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{ background: open ? `${NEON}16` : "rgba(255,255,255,0.045)", color: open ? NEON : "rgba(255,255,255,0.5)" }}>
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-white">{title}</span>
          <span className="mt-0.5 block truncate text-[11px] text-white/35">{description}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-semibold" style={{ color: status.color }}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: status.color }} />
          <span className="hidden sm:inline">{status.label}</span>
        </span>
      </button>
      <div
        id={contentId}
        role="region"
        aria-labelledby={headingId}
        aria-hidden={!open}
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className={`min-h-0 overflow-hidden ${open ? "visible" : "invisible pointer-events-none"}`}>
          <div className="space-y-4 border-t px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Profile Header ────────────────────────────────────────────────────────────
function ProfileEditorHeader({
  profile,
  publicProfileUrl,
  onSelectField,
  hasOverrides,
}: {
  profile: Profile | null;
  publicProfileUrl: string | null;
  onSelectField: (field: string) => void;
  hasOverrides: boolean;
}) {
  const health = computeHealth(profile);
  const color = health.pct >= 80 ? NEON : health.pct >= 50 ? "#d8b24c" : "#e66b73";
  const status = health.pct >= 80 ? "Looking great" : health.pct >= 50 ? "Good progress" : "Needs attention";

  return (
    <header className="overflow-hidden rounded-2xl" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
      <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5 sm:py-5">
        <div className="min-w-0">
          <div className="mb-1.5 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: NEON }}>
            <SettingsIcon />
            Game Profile
          </div>
           <h1 className="text-xl font-black tracking-tight text-white sm:text-2xl">
             Game profile
           </h1>
           <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-white/40">
             Manage the information players see on your public game page.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
           <button type="button" onClick={() => onSelectField("gameName")}
             className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-xs font-black transition-all hover:brightness-110"
             style={{ background: NEON, color: "#071000" }}>
             <Pencil size={13} /> Edit game profile
          </button>
          {publicProfileUrl && (
            <a href={publicProfileUrl} target="_blank" rel="noreferrer"
               className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-xs font-black text-white transition-colors hover:bg-white/10"
               style={{ background: "#0F101B", border: `1px solid ${CARD_BORDER}` }}>
               View public page <ArrowUpRight size={13} />
            </a>
          )}
        </div>
      </div>

      <div className="border-t px-4 py-4 sm:px-5" style={{ borderColor: CARD_BORDER }}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white">Profile completeness</span>
            <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ color, background: `${color}18` }}>{status}</span>
          </div>
          <span className="text-sm font-black" style={{ color }}>{health.pct}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.07]" role="progressbar"
          aria-label="Profile completeness" aria-valuemin={0} aria-valuemax={100} aria-valuenow={health.pct}>
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${health.pct}%`, background: color }} />
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[11px] text-white/35">
            {health.missingCount
              ? `${health.missingCount} improvement${health.missingCount === 1 ? "" : "s"} available`
              : "Everything needed for a complete profile is in place"}
          </span>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {health.top3.map(field => (
              <button key={field.key} type="button" onClick={() => onSelectField(field.key)}
                className="text-left text-[11px] font-bold transition-colors hover:text-white"
                style={{ color: `${color}cc` }}>
                Add {field.label} <span className="text-white/25">+{field.pts}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 border-t pt-3 text-[11px] text-white/30" style={{ borderColor: CARD_BORDER }}>
          <span>Imported values stay separate from direct edits.</span>
          <DataSourceExplainer showOverridden={hasOverrides} />
        </div>
      </div>
    </header>
  );
}

function SettingsIcon() {
  return <span className="h-1.5 w-1.5 rounded-full" style={{ background: NEON, boxShadow: `0 0 10px ${NEON}` }} />;
}

// ─── Main export ───────────────────────────────────────────────────────────────
export default function GameProfileTab({
  gameId,
  focusRequest,
  isVisible = true,
}: {
  gameId?: number;
  focusRequest?: { field: string } | null;
  isVisible?: boolean;
}) {
  const { user } = useAuth();
  const { data, isLoading } = useQuery<{ profile: Profile; fieldMeta: FieldMeta }>({
    queryKey: ["/api/indie/profile", gameId ?? null],
    queryFn: () => apiRequest("GET", `/api/indie/profile${gameId ? `?gameId=${gameId}` : ""}`).then(r => r.json()),
  });

  const profile = (data as any)?.profile ?? null;
  const fieldMeta: FieldMeta = (data as any)?.fieldMeta ?? {};
  const [activeFocusRequest, setActiveFocusRequest] = useState<{ field: string } | null>(null);
  const [activeSection, setActiveSection] = useState<ProfileSectionId | null>("basics");

  useEffect(() => {
    const nextRequest = focusRequest ?? null;
    setActiveFocusRequest(nextRequest);
    if (nextRequest) {
      const section = PROFILE_SECTION_BY_FIELD[nextRequest.field];
      if (section) setActiveSection(section);
    }
  }, [focusRequest]);

  useEffect(() => {
    if (!isVisible || !activeFocusRequest || !profile) return;
    const section = PROFILE_SECTION_BY_FIELD[activeFocusRequest.field];
    if (!section) return;
    window.requestAnimationFrame(() => {
      document.querySelector(`[data-profile-section="${section}"]`)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, [activeFocusRequest, profile?.id, isVisible]);

  const requestFocus = (field: string) => {
    const section = PROFILE_SECTION_BY_FIELD[field];
    if (section) setActiveSection(section);
    setActiveFocusRequest({ field });
  };
  const profileUrl = user?.username && profile?.id
    ? publicUrl(`/studio/${encodeURIComponent(user.username)}?gameId=${profile.id}`)
    : null;
  const toggleSection = (section: ProfileSectionId) => {
    setActiveSection(current => current === section ? null : section);
  };

  return (
    <div className={`space-y-4 pb-10 ${isVisible ? "" : "hidden"}`}>
      <ProfileEditorHeader
        profile={profile}
        publicProfileUrl={profileUrl}
        onSelectField={requestFocus}
        hasOverrides={Object.values(fieldMeta).some(meta => meta?.isManualOverride && meta?.importedValue)}
      />
      {isLoading ? (
        <div className="rounded-2xl px-5 py-12 text-center text-sm text-white/40"
          style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
          Loading your game profile…
        </div>
      ) : (
        <div className="space-y-3">
           <ProfileAccordion id="basics" title="Game Basics"
             description="Name, description, release status, and genres"
            status={getSectionStatus(profile, "basics")} open={activeSection === "basics"}
            onToggle={() => toggleSection("basics")}>
            <AboutCard profile={profile} fieldMeta={fieldMeta} focusRequest={activeFocusRequest} />
          </ProfileAccordion>

           <ProfileAccordion id="platforms" title="Platforms"
             description="Choose where players can play and follow your game"
             status={getSectionStatus(profile, "platforms")} open={activeSection === "platforms"}
             onToggle={() => toggleSection("platforms")}>
             <PlatformCard profile={profile} fieldMeta={fieldMeta} focusRequest={activeFocusRequest} />
             <CommunitySocialCard profile={profile} focusRequest={activeFocusRequest} />
           </ProfileAccordion>

          <ProfileAccordion id="stores" title="Store & Purchase Links"
            description="Connect the places where players can buy or learn more about your game"
            status={getSectionStatus(profile, "stores")} open={activeSection === "stores"}
            onToggle={() => toggleSection("stores")}>
            <StoreListingCard profile={profile} fieldMeta={fieldMeta} focusRequest={activeFocusRequest} />
          </ProfileAccordion>

          <ProfileAccordion id="media" title="Media & Branding"
            description="Banner, capsule artwork, trailer, and screenshots"
            status={getSectionStatus(profile, "media")} open={activeSection === "media"}
            onToggle={() => toggleSection("media")}>
            <MediaCard profile={profile} fieldMeta={fieldMeta} focusRequest={activeFocusRequest} />
          </ProfileAccordion>

          <ProfileAccordion id="details" title="Game Details"
            description="Detailed descriptions, features, discovery tags, and store metadata"
            status={getSectionStatus(profile, "details")} open={activeSection === "details"}
            onToggle={() => toggleSection("details")}>
            <GameDetailsSummary profile={profile} onEdit={requestFocus} />
            <MetadataCard profile={profile} fieldMeta={fieldMeta} focusRequest={activeFocusRequest} />
          </ProfileAccordion>

          <ProfileAccordion id="developer" title="Developer Information"
            description="Studio identity, location, team size, and developer website"
            status={getSectionStatus(profile, "developer")} open={activeSection === "developer"}
            onToggle={() => toggleSection("developer")}>
            <StudioCard profile={profile} fieldMeta={fieldMeta} focusRequest={activeFocusRequest} />
          </ProfileAccordion>

          <ProfileAccordion id="advanced" title="Advanced Settings"
            description="Import fields from a store or review updates before syncing them"
            status={getSectionStatus(profile, "advanced")} open={activeSection === "advanced"}
            onToggle={() => toggleSection("advanced")}>
            <AdvancedCard profile={profile} fieldMeta={fieldMeta} />
          </ProfileAccordion>
        </div>
      )}
    </div>
  );
}
