import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useSignedUrl, useSignedUrls } from "@/hooks/use-signed-url";
import {
  Pencil, X, Check, Loader2, Upload, Plus, Trash2, ExternalLink,
  Image as ImageIcon, Video, Globe, Gamepad2, Monitor, Smartphone,
  Play, Sparkles, Building2, Package, Download, Twitter,
} from "lucide-react";
import { SiSteam, SiEpicgames, SiItchdotio, SiDiscord } from "react-icons/si";
import { NEON, CARD_BG, CARD_BORDER } from "./constants";
import { StoreImportPanel } from "./edit-profile/StoreImportPanel";
import { SyncPanel } from "./edit-profile/SyncPanel";
import { SourceBadge } from "./edit-profile/FieldRow";
import {
  isFieldFilled, RELEASE_STATUS_OPTIONS, PLATFORM_OPTIONS,
  type Profile, type FieldMeta,
} from "./edit-profile/types";

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

function computeHealth(profile: Profile | null) {
  let earned = 0;
  const missing: typeof HEALTH_FIELDS[number][] = [];
  for (const f of HEALTH_FIELDS) {
    if (isFieldFilled(profile, f.key)) earned += f.pts;
    else missing.push(f);
  }
  const total = HEALTH_FIELDS.reduce((s, f) => s + f.pts, 0);
  const pct = Math.round((earned / total) * 100);
  return { pct, top3: missing.sort((a, b) => b.pts - a.pts).slice(0, 3) };
}

// ─── Save hook ─────────────────────────────────────────────────────────────────
function useSaveProfile(gameId?: number, onSuccess?: () => void) {
  const { toast } = useToast();
  return useMutation({
    mutationFn: (fields: Record<string, any>) =>
      apiRequest("PUT", "/api/indie/profile", fields).then(r => r.json()),
    onSuccess: async (data) => {
      queryClient.setQueryData(["/api/indie/profile", gameId ?? null], data);
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
  title, onClose, children, onSave, isSaving, saveLabel = "Save changes",
}: {
  title: string; onClose: () => void; children: React.ReactNode;
  onSave?: () => void; isSaving?: boolean; saveLabel?: string;
}) {
  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-4 pt-20"
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)" }}>
      <div className="relative w-full max-w-2xl max-h-[calc(100vh-6rem)] flex flex-col rounded-2xl overflow-hidden"
        style={{ background: "#0e1419", border: `1px solid ${CARD_BORDER}`, boxShadow: "0 32px 80px rgba(0,0,0,0.7)" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0"
          style={{ borderColor: CARD_BORDER }}>
          <h3 className="text-base font-bold text-white">{title}</h3>
          <button onClick={onClose}
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
    </div>
  );
}

// ─── TagInput ──────────────────────────────────────────────────────────────────
function TagInput({ value = [], onChange, placeholder }: { value?: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
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
        <input value={input} onChange={e => setInput(e.target.value)}
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
function FieldInput({ label, value, onChange, type = "text", placeholder, rows }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; rows?: number;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-white/50 uppercase tracking-wider">{label}</label>
      {rows ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows}
          placeholder={placeholder}
          className="w-full bg-transparent border rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-white/30 resize-none"
          style={{ borderColor: CARD_BORDER }} />
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)}
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
    <div className={`relative rounded-xl overflow-hidden cursor-pointer group ${className}`}
      style={{ border: `2px dashed ${dragging ? NEON : CARD_BORDER}`, transition: "border-color 0.15s" }}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
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
function ProfileHealthCard({ profile }: { profile: Profile | null }) {
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
              <div key={f.key} className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full shrink-0" style={{ background: color }} />
                <span className="text-xs text-white/50">Add {f.label}</span>
                <span className="text-[10px] ml-auto" style={{ color: `${color}80` }}>+{f.pts}pts</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── About Card ────────────────────────────────────────────────────────────────
function AboutCard({ profile, fieldMeta }: { profile: Profile | null; fieldMeta: FieldMeta }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [short, setShort] = useState("");
  const [full, setFull] = useState("");
  const [genres, setGenres] = useState<string[]>([]);
  const [features, setFeatures] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const [price, setPrice] = useState("");

  const save = useSaveProfile(profile?.id, () => setOpen(false));

  const openModal = () => {
    setName(profile?.gameName ?? "");
    setShort(profile?.shortDescription ?? "");
    setFull(profile?.fullDescription ?? "");
    setGenres((profile?.genres as string[]) ?? []);
    setFeatures((profile?.keyFeatures as string[]) ?? []);
    setStatus(profile?.releaseStatus ?? "");
    setPrice(profile?.price ?? "");
    setOpen(true);
  };

  const genreList = (profile?.genres as string[] | null) ?? [];
  const featureList = (profile?.keyFeatures as string[] | null) ?? [];

  return (
    <>
      <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${CARD_BORDER}` }}>
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
            <h2 className="flex flex-wrap items-center gap-2 text-2xl font-black text-white">
              {profile.gameName}
              <SourceBadge fieldName="gameName" fieldMeta={fieldMeta} />
            </h2>
          ) : (
            <p className="text-white/20 text-sm italic">No game name set</p>
          )}
          {/* Release status + price row */}
          <div className="flex flex-wrap gap-2">
            {profile?.releaseStatus && (
              <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{ background: `${NEON}18`, color: NEON, border: `1px solid ${NEON}33` }}>
                {RELEASE_STATUS_OPTIONS.find(o => o.value === profile.releaseStatus)?.label ?? profile.releaseStatus}
                <span className="ml-2 inline-flex align-middle"><SourceBadge fieldName="releaseStatus" fieldMeta={fieldMeta} /></span>
              </span>
            )}
            {profile?.price && (
              <span className="text-xs px-2.5 py-1 rounded-full font-medium text-white/60"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                ${profile.price}
                <span className="ml-2 inline-flex align-middle"><SourceBadge fieldName="price" fieldMeta={fieldMeta} /></span>
              </span>
            )}
            {profile?.isFree && (
              <span className="text-xs px-2.5 py-1 rounded-full font-medium text-green-400"
                style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.25)" }}>
                Free to Play
                <span className="ml-2 inline-flex align-middle"><SourceBadge fieldName="isFree" fieldMeta={fieldMeta} /></span>
              </span>
            )}
          </div>
          {/* Short description */}
          {profile?.shortDescription && (
            <div>
              <div className="mb-1"><SourceBadge fieldName="shortDescription" fieldMeta={fieldMeta} /></div>
              <p className="text-sm text-white/70 leading-relaxed">{profile.shortDescription}</p>
            </div>
          )}
          {/* Genres */}
          {genreList.length > 0 && (
            <div>
              <div className="mb-1"><SourceBadge fieldName="genres" fieldMeta={fieldMeta} /></div>
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
                <SourceBadge fieldName="keyFeatures" fieldMeta={fieldMeta} />
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
        <EditModal title="About Your Game" onClose={() => setOpen(false)}
          onSave={() => save.mutate({ gameId: profile?.id, gameName: name, shortDescription: short, fullDescription: full, genres, keyFeatures: features, releaseStatus: status, price })}
          isSaving={save.isPending}>
          <FieldInput label="Game Name" value={name} onChange={setName} placeholder="My Awesome Game" />
          <div>
            <label className="text-xs font-medium text-white/50 uppercase tracking-wider block mb-1.5">Release Status</label>
            <div className="flex gap-2">
              {RELEASE_STATUS_OPTIONS.map(o => (
                <button key={o.value} onClick={() => setStatus(o.value)}
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
          <FieldInput label="Price (USD)" value={price} onChange={setPrice} placeholder="19.99" />
          <FieldInput label="Short Description" value={short} onChange={setShort} rows={2}
            placeholder="One or two sentences about your game…" />
          <FieldInput label="Full Description" value={full} onChange={setFull} rows={5}
            placeholder="Detailed description for store pages, campaign listings, and press kits…" />
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/50 uppercase tracking-wider block">Genres</label>
            <TagInput value={genres} onChange={setGenres} placeholder="e.g. Action, RPG, Platformer" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/50 uppercase tracking-wider block">Key Features</label>
            <TagInput value={features} onChange={setFeatures} placeholder="e.g. Open world, Co-op, Procedural generation" />
          </div>
        </EditModal>
      )}
    </>
  );
}

// ─── Media Card ────────────────────────────────────────────────────────────────
function MediaCard({ profile, fieldMeta }: { profile: Profile | null; fieldMeta: FieldMeta }) {
  // Trailer modal state
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [trailer, setTrailer] = useState("");
  const trailerFileRef = useRef<HTMLInputElement>(null);

  // Screenshots modal state
  const [shotsOpen, setShotsOpen] = useState(false);
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

  const addShot = () => {
    if (newShot.trim() && !screenshots.includes(newShot.trim())) {
      setScreenshots([...screenshots, newShot.trim()]);
      setNewShot("");
    }
  };

  return (
    <>
      <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${CARD_BORDER}` }}>
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
                Banner · 16:9 <SourceBadge fieldName="headerImageUrl" fieldMeta={fieldMeta} />
              </p>
              <DropZone currentUrl={profile?.headerImageUrl} field="headerImageUrl" gameId={profile?.id}
                label="Drop banner or click to upload" aspect="1920 × 1080 recommended"
                className="h-40" />
            </div>
            <div>
              <p className="flex items-center gap-2 text-[10px] text-white/30 uppercase tracking-wider mb-1.5 font-medium">
                Capsule · 2:3 <SourceBadge fieldName="capsuleImageUrl" fieldMeta={fieldMeta} />
              </p>
              <DropZone currentUrl={profile?.capsuleImageUrl} field="capsuleImageUrl" gameId={profile?.id}
                label="Drop capsule" aspect="460 × 215 min"
                className="h-40" />
            </div>
          </div>

          {/* Trailer */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="flex items-center gap-2 text-[10px] text-white/30 uppercase tracking-wider font-medium">
                Trailer <SourceBadge fieldName="trailerUrl" fieldMeta={fieldMeta} />
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
                <span className="ml-2 inline-flex align-middle"><SourceBadge fieldName="screenshotUrls" fieldMeta={fieldMeta} /></span>
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
        <EditModal title="Trailer" onClose={() => setTrailerOpen(false)}
          onSave={() => saveTrailer.mutate({ gameId: profile?.id, trailerUrl: trailer })}
          isSaving={saveTrailer.isPending}>
          {/* URL input */}
          <FieldInput label="Trailer URL (YouTube / Vimeo)" value={trailer} onChange={setTrailer}
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
        <EditModal title="Screenshots" onClose={() => setShotsOpen(false)}
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
    </>
  );
}

// ─── Store Listing Card ────────────────────────────────────────────────────────
function StoreListingCard({ profile, fieldMeta, onGoToStoreLinks }: { profile: Profile | null; fieldMeta: FieldMeta; onGoToStoreLinks?: () => void }) {
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

  const stores = [
     { key: "steam", fieldName: "steamUrl", icon: <SiSteam size={20} className="text-[#66c0f4]" />, label: "Steam", filled: !!(profile?.steamUrl || profile?.steamAppId), url: profile?.steamUrl, bg: "rgba(102,192,244,0.08)", border: "rgba(102,192,244,0.2)" },
     { key: "epic",  fieldName: "epicUrl", icon: <SiEpicgames size={20} className="text-white" />, label: "Epic Games", filled: !!(profile?.epicUrl || profile?.epicSlug), url: profile?.epicUrl, bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.12)" },
     { key: "itch",  fieldName: "itchUrl", icon: <SiItchdotio size={20} className="text-[#fa5c5c]" />, label: "itch.io", filled: !!(profile?.itchUrl), url: profile?.itchUrl, bg: "rgba(250,92,92,0.08)", border: "rgba(250,92,92,0.2)" },
     { key: "web",   fieldName: "websiteUrl", icon: <Globe size={20} className="text-white/50" />, label: "Website", filled: !!(profile?.websiteUrl), url: profile?.websiteUrl, bg: "rgba(255,255,255,0.04)", border: CARD_BORDER },
  ];

  return (
    <>
      <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${CARD_BORDER}` }}>
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
              style={{ background: s.filled ? s.bg : "rgba(255,255,255,0.02)", border: `1px solid ${s.filled ? s.border : CARD_BORDER}` }}>
              <div className="shrink-0">{s.icon}</div>
              <div className="flex-1 min-w-0">
                 <div className="flex items-center gap-2 text-xs font-bold text-white/70">
                   {s.label} <SourceBadge fieldName={s.fieldName} fieldMeta={fieldMeta} />
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
        <EditModal title="Store Listing" onClose={() => setOpen(false)}
          onSave={() => save.mutate({ gameId: profile?.id, steamAppId, steamUrl, epicSlug, epicUrl, itchUrl, websiteUrl })}
          isSaving={save.isPending}>
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <SiSteam size={14} className="text-[#66c0f4]" />
              <span className="text-xs font-bold text-white/70 uppercase tracking-wider">Steam</span>
            </div>
            <FieldInput label="Steam App ID" value={steamAppId} onChange={setSteamAppId} placeholder="e.g. 730" />
            <FieldInput label="Steam Store URL" value={steamUrl} onChange={setSteamUrl} type="url"
              placeholder="https://store.steampowered.com/app/…" />
          </div>
          <div className="h-px" style={{ background: CARD_BORDER }} />
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <SiEpicgames size={14} className="text-white/70" />
              <span className="text-xs font-bold text-white/70 uppercase tracking-wider">Epic Games</span>
            </div>
            <FieldInput label="Epic Slug" value={epicSlug} onChange={setEpicSlug} placeholder="e.g. my-game" />
            <FieldInput label="Epic Store URL" value={epicUrl} onChange={setEpicUrl} type="url"
              placeholder="https://store.epicgames.com/…" />
          </div>
          <div className="h-px" style={{ background: CARD_BORDER }} />
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <SiItchdotio size={14} className="text-[#fa5c5c]" />
              <span className="text-xs font-bold text-white/70 uppercase tracking-wider">itch.io</span>
            </div>
            <FieldInput label="itch.io URL" value={itchUrl} onChange={setItchUrl} type="url"
              placeholder="https://user.itch.io/game" />
          </div>
          <div className="h-px" style={{ background: CARD_BORDER }} />
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Globe size={14} className="text-white/50" />
              <span className="text-xs font-bold text-white/70 uppercase tracking-wider">Website</span>
            </div>
            <FieldInput label="Game / Studio Website" value={websiteUrl} onChange={setWebsiteUrl} type="url"
              placeholder="https://mygame.com" />
          </div>
        </EditModal>
      )}
    </>
  );
}

// ─── Platforms Card ─────────────────────────────────────────────────────────────
function PlatformCard({ profile, fieldMeta }: { profile: Profile | null; fieldMeta: FieldMeta }) {
  const { toast } = useToast();
  const selected: string[] = (profile?.platforms as string[] | null) ?? [];

  const toggle = async (id: string) => {
    const next = selected.includes(id) ? selected.filter(p => p !== id) : [...selected, id];
    try {
      const data = await (await apiRequest("PUT", "/api/indie/profile", { gameId: profile?.id, platforms: next })).json();
      queryClient.setQueryData(["/api/indie/profile", profile?.id ?? null], data);
      await queryClient.invalidateQueries({ queryKey: ["/api/indie/profile"] });
    } catch (error: any) {
      toast({ description: error?.message?.replace(/^\d+:\s*/, "") || "Save failed", variant: "gamefolioError" });
    }
  };

  const platformIcons: Record<string, React.ReactNode> = {
    windows: <Monitor size={18} />, mac: <Monitor size={18} />, linux: <Globe size={18} />,
    ps5: <Gamepad2 size={18} />, xbox: <Gamepad2 size={18} />, switch: <Gamepad2 size={18} />,
    ios: <Smartphone size={18} />, android: <Smartphone size={18} />,
  };

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${CARD_BORDER}` }}>
      <div className="flex items-center gap-2.5 px-5 py-4"
        style={{ background: "rgba(255,255,255,0.03)", borderBottom: `1px solid ${CARD_BORDER}` }}>
        <Gamepad2 size={16} style={{ color: NEON }} />
         <span className="flex items-center gap-2 text-sm font-bold text-white">
           Platforms <SourceBadge fieldName="platforms" fieldMeta={fieldMeta} />
         </span>
      </div>
      <div className="p-5 grid grid-cols-4 gap-2">
        {PLATFORM_OPTIONS.map(p => {
          const on = selected.includes(p.id);
          return (
            <button key={p.id} onClick={() => toggle(p.id)}
              className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all"
              style={{
                background: on ? `${NEON}14` : "rgba(255,255,255,0.03)",
                border: `1px solid ${on ? `${NEON}55` : CARD_BORDER}`,
                color: on ? NEON : "rgba(255,255,255,0.3)",
              }}>
              {platformIcons[p.id]}
              <span className="text-[10px] font-bold">{p.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Studio Card ───────────────────────────────────────────────────────────────
function StudioCard({ profile, fieldMeta }: { profile: Profile | null; fieldMeta: FieldMeta }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [year, setYear] = useState("");
  const [team, setTeam] = useState("");
  const [website, setWebsite] = useState("");
  const [twitter, setTwitter] = useState("");
  const [discord, setDiscord] = useState("");
  const save = useSaveProfile(profile?.id, () => setOpen(false));

  const openModal = () => {
    setName(profile?.studioName ?? "");
    setCountry(profile?.studioCountry ?? "");
    setYear(profile?.studioFoundedYear ? String(profile.studioFoundedYear) : "");
    setTeam(profile?.studioTeamSize ? String(profile.studioTeamSize) : "");
    setWebsite(profile?.studioWebsite ?? "");
    setTwitter(profile?.twitterUrl ?? "");
    setDiscord(profile?.discordUrl ?? "");
    setOpen(true);
  };

  const hasInfo = profile?.studioName || profile?.studioCountry || profile?.studioFoundedYear;

  return (
    <>
      <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${CARD_BORDER}` }}>
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
                   {profile.studioName} <SourceBadge fieldName="studioName" fieldMeta={fieldMeta} />
                 </h3>
              )}
              <div className="flex flex-wrap gap-3 text-sm text-white/50">
                {profile?.studioCountry && <span>📍 {profile.studioCountry}</span>}
                {profile?.studioFoundedYear && <span>Est. {profile.studioFoundedYear}</span>}
                {profile?.studioTeamSize && <span>{profile.studioTeamSize} person{profile.studioTeamSize !== 1 ? "s" : ""}</span>}
              </div>
              <div className="flex flex-wrap gap-2">
                {profile?.studioWebsite && (
                   <a href={profile.studioWebsite} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white/60 hover:text-white transition-colors"
                    style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${CARD_BORDER}` }}>
                     <Globe size={11} /> Website <SourceBadge fieldName="studioWebsite" fieldMeta={fieldMeta} />
                  </a>
                )}
                {profile?.twitterUrl && (
                  <a href={profile.twitterUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white/60 hover:text-white transition-colors"
                    style={{ background: "rgba(29,161,242,0.08)", border: "1px solid rgba(29,161,242,0.2)" }}>
                    <Twitter size={10} className="text-[#1da1f2]" /> Twitter / X
                  </a>
                )}
                {profile?.discordUrl && (
                  <a href={profile.discordUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white/60 hover:text-white transition-colors"
                    style={{ background: "rgba(88,101,242,0.08)", border: "1px solid rgba(88,101,242,0.2)" }}>
                    <SiDiscord size={10} className="text-[#5865f2]" /> Discord
                  </a>
                )}
              </div>
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
        <EditModal title="Studio" onClose={() => setOpen(false)}
          onSave={() => save.mutate({
            gameId: profile?.id,
            studioName: name, studioCountry: country,
            studioFoundedYear: year ? parseInt(year) : null,
            studioTeamSize: team ? parseInt(team) : null,
            studioWebsite: website, twitterUrl: twitter, discordUrl: discord,
          })} isSaving={save.isPending}>
          <FieldInput label="Studio Name" value={name} onChange={setName} placeholder="Acme Games" />
          <div className="grid grid-cols-2 gap-3">
            <FieldInput label="Country" value={country} onChange={setCountry} placeholder="e.g. UK" />
            <FieldInput label="Founded Year" value={year} onChange={setYear} placeholder="e.g. 2022" />
          </div>
          <FieldInput label="Team Size" value={team} onChange={setTeam} placeholder="e.g. 3" />
          <FieldInput label="Studio Website" value={website} onChange={setWebsite} type="url" placeholder="https://…" />
          <div className="h-px" style={{ background: CARD_BORDER }} />
          <FieldInput label="Twitter / X URL" value={twitter} onChange={setTwitter} type="url" placeholder="https://twitter.com/…" />
          <FieldInput label="Discord Server URL" value={discord} onChange={setDiscord} type="url" placeholder="https://discord.gg/…" />
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

// ─── Main export ───────────────────────────────────────────────────────────────
export default function GameProfileTab({ gameId }: { gameId?: number }) {
  const { data } = useQuery<{ profile: Profile; fieldMeta: FieldMeta }>({
    queryKey: ["/api/indie/profile", gameId ?? null],
    queryFn: () => apiRequest("GET", `/api/indie/profile${gameId ? `?gameId=${gameId}` : ""}`).then(r => r.json()),
  });

  const profile = (data as any)?.profile ?? null;
  const fieldMeta: FieldMeta = (data as any)?.fieldMeta ?? {};

  return (
    <div className="space-y-4 pb-10">
      <ProfileHealthCard profile={profile} />
      <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-xs text-white/55"
        style={{ background: "rgba(102,192,244,0.06)", border: "1px solid rgba(102,192,244,0.18)" }}>
        <Download size={14} className="shrink-0 text-[#66c0f4]" />
        <span>Information imported from a connected store is marked with an API badge.</span>
      </div>
      <AboutCard profile={profile} fieldMeta={fieldMeta} />
      <MediaCard profile={profile} fieldMeta={fieldMeta} />
      <StoreListingCard profile={profile} fieldMeta={fieldMeta} />
      <PlatformCard profile={profile} fieldMeta={fieldMeta} />
      <StudioCard profile={profile} fieldMeta={fieldMeta} />
      <AdvancedCard profile={profile} fieldMeta={fieldMeta} />
    </div>
  );
}
