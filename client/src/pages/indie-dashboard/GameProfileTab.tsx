import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { IndieGameProfile, IndieGameFieldOverride } from "@shared/schema";
import { NEON, CARD_BG, CARD_BORDER } from "../IndieDashboardPage";
import {
  ChevronDown, ChevronRight, Edit2, Check, X, RefreshCw, RotateCcw,
  Loader2, Plus, Trash2, AlertTriangle, ExternalLink, CheckCircle2,
  Monitor, Smartphone, Globe, Gamepad2,
} from "lucide-react";
import { SiSteam, SiEpicgames, SiItchdotio } from "react-icons/si";

// ─── Types ────────────────────────────────────────────────────────────────────

type Profile = IndieGameProfile;
type FieldMeta = Record<string, IndieGameFieldOverride & { isManualOverride: boolean }>;
type SyncChange = { fieldName: string; currentValue: any; newValue: any; hasOverride: boolean };

// ─── Constants ────────────────────────────────────────────────────────────────

const ESSENTIAL_FIELDS = ["gameName", "shortDescription", "releaseDate", "keyFeatures", "screenshotUrls"];
const OPTIONAL_FIELDS = [
  "fullDescription", "studioName", "studioFoundedYear", "studioTeamSize", "studioWebsite",
  "studioCountry", "genres", "tags", "platforms", "headerImageUrl", "capsuleImageUrl",
  "trailerUrl", "steamUrl", "epicUrl", "itchUrl", "websiteUrl", "twitterUrl", "discordUrl", "price",
];

const PLATFORM_OPTIONS = [
  { id: "windows", label: "Windows", icon: Monitor },
  { id: "mac", label: "macOS", icon: Monitor },
  { id: "linux", label: "Linux", icon: Globe },
  { id: "ps5", label: "PlayStation", icon: Gamepad2 },
  { id: "xbox", label: "Xbox", icon: Gamepad2 },
  { id: "switch", label: "Switch", icon: Gamepad2 },
  { id: "ios", label: "iOS", icon: Smartphone },
  { id: "android", label: "Android", icon: Smartphone },
];

const RELEASE_STATUS_OPTIONS = [
  { value: "coming_soon", label: "Coming Soon" },
  { value: "early_access", label: "Early Access" },
  { value: "released", label: "Released" },
];

const SOURCE_COLORS: Record<string, string> = {
  steam: "#66c0f4",
  epic: "#a855f7",
  itch: "#fa5c5c",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isFieldFilled(profile: Profile | null, field: string): boolean {
  if (!profile) return false;
  const val = (profile as any)[field];
  if (Array.isArray(val)) return val.length > 0;
  if (typeof val === "boolean") return true;
  return val !== null && val !== undefined && val !== "";
}

function formatFieldName(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .replace(/Url$/, " URL")
    .replace(/Id$/, " ID")
    .trim();
}

function formatValue(val: any): string {
  if (val === null || val === undefined || val === "") return "—";
  if (Array.isArray(val)) return val.length === 0 ? "—" : val.slice(0, 3).join(", ") + (val.length > 3 ? ` +${val.length - 3}` : "");
  if (typeof val === "boolean") return val ? "Yes" : "No";
  const s = String(val);
  return s.length > 80 ? s.slice(0, 77) + "…" : s;
}

// ─── Source Badge ─────────────────────────────────────────────────────────────

function SourceBadge({ fieldName, fieldMeta }: { fieldName: string; fieldMeta: FieldMeta }) {
  const meta = fieldMeta[fieldName];
  if (!meta) return null;
  if (meta.isManualOverride) {
    return (
      <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
        style={{ background: `${NEON}22`, color: NEON, border: `1px solid ${NEON}44` }}>
        Manual
      </span>
    );
  }
  if (meta.importSource) {
    const color = SOURCE_COLORS[meta.importSource] ?? "#aaa";
    return (
      <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
        style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}>
        {meta.importSource}
      </span>
    );
  }
  return null;
}

// ─── Tag Array Editor ─────────────────────────────────────────────────────────

function TagArrayEditor({ values, onChange }: { values: string[]; onChange: (v: string[]) => void }) {
  const [input, setInput] = useState("");
  const add = () => { const t = input.trim(); if (t && !values.includes(t)) onChange([...values, t]); setInput(""); };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5 min-h-[28px]">
        {values.map((v, i) => (
          <span key={i} className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
            style={{ background: "rgba(255,255,255,0.08)", border: `1px solid ${CARD_BORDER}` }}>
            {v}
            <button onClick={() => onChange(values.filter((_, j) => j !== i))} className="opacity-50 hover:opacity-100 ml-0.5"><X size={10} /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="Type and press Enter"
          className="flex-1 bg-transparent border rounded px-2 py-1 text-sm text-white outline-none"
          style={{ borderColor: "rgba(255,255,255,0.2)" }} />
        <button onClick={add} className="px-2 py-1 rounded text-xs font-bold"
          style={{ background: `${NEON}22`, color: NEON, border: `1px solid ${NEON}44` }}>Add</button>
      </div>
    </div>
  );
}

// ─── URL Array Editor ─────────────────────────────────────────────────────────

function UrlArrayEditor({ values, onChange }: { values: string[]; onChange: (v: string[]) => void }) {
  const [input, setInput] = useState("");
  const add = () => { const t = input.trim(); if (t && !values.includes(t)) onChange([...values, t]); setInput(""); };
  return (
    <div className="space-y-1.5">
      {values.map((v, i) => (
        <div key={i} className="flex items-center gap-2">
          <input value={v} onChange={e => { const c = [...values]; c[i] = e.target.value; onChange(c); }}
            className="flex-1 bg-transparent border rounded px-2 py-1 text-xs text-white outline-none font-mono"
            style={{ borderColor: "rgba(255,255,255,0.15)" }} />
          <button onClick={() => onChange(values.filter((_, j) => j !== i))} className="text-red-400 opacity-60 hover:opacity-100">
            <Trash2 size={12} />
          </button>
        </div>
      ))}
      <div className="flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="https://..."
          className="flex-1 bg-transparent border rounded px-2 py-1 text-xs text-white outline-none font-mono"
          style={{ borderColor: "rgba(255,255,255,0.2)" }} />
        <button onClick={add} className="px-2 py-1 rounded text-xs font-bold"
          style={{ background: `${NEON}22`, color: NEON, border: `1px solid ${NEON}44` }}>
          <Plus size={12} />
        </button>
      </div>
    </div>
  );
}

// ─── Field Row ────────────────────────────────────────────────────────────────

interface FieldRowProps {
  fieldName: string;
  label: string;
  profile: Profile | null;
  fieldMeta: FieldMeta;
  type: "text" | "textarea" | "url" | "select" | "tag-array" | "url-array" | "platform-select";
  selectOptions?: { value: string; label: string }[];
  onSave: (fieldName: string, value: any) => void;
  onRevert: (fieldName: string) => void;
  isSaving: boolean;
}

function FieldRow({ fieldName, label, profile, fieldMeta, type, selectOptions, onSave, onRevert, isSaving }: FieldRowProps) {
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState<any>(null);
  const meta = fieldMeta[fieldName];
  const currentVal = (profile as any)?.[fieldName] ?? (type.includes("array") || type === "platform-select" ? [] : null);
  const canRevert = meta?.isManualOverride && !!(meta?.importedValue);

  const startEdit = () => {
    setEditVal(type.includes("array") || type === "platform-select" ? [...(Array.isArray(currentVal) ? currentVal : [])] : (currentVal ?? ""));
    setEditing(true);
  };
  const cancelEdit = () => { setEditing(false); setEditVal(null); };
  const saveEdit = () => { onSave(fieldName, editVal); setEditing(false); setEditVal(null); };

  return (
    <div className="py-3" style={{ borderBottom: `1px solid rgba(255,255,255,0.06)` }}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-white/50">{label}</span>
          <SourceBadge fieldName={fieldName} fieldMeta={fieldMeta} />
        </div>
        <div className="flex items-center gap-1">
          {canRevert && !editing && (
            <button onClick={() => onRevert(fieldName)} disabled={isSaving} title="Revert to imported value"
              className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded opacity-60 hover:opacity-100 transition-opacity"
              style={{ color: SOURCE_COLORS[(meta as any).importSource ?? ""] ?? "#aaa", border: "1px solid currentColor" }}>
              <RotateCcw size={9} /> Revert
            </button>
          )}
          {!editing && (
            <button onClick={startEdit}
              className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded opacity-60 hover:opacity-100 transition-opacity text-white"
              style={{ border: "1px solid rgba(255,255,255,0.15)" }}>
              <Edit2 size={9} /> Edit
            </button>
          )}
        </div>
      </div>

      {!editing ? (
        <div className="text-sm text-white/70 break-words">
          {type === "url-array" ? (
            Array.isArray(currentVal) && currentVal.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {(currentVal as string[]).map((u, i) => (
                  <a key={i} href={u} target="_blank" rel="noopener noreferrer"
                    className="text-xs flex items-center gap-1 opacity-70 hover:opacity-100" style={{ color: NEON }}>
                    <ExternalLink size={10} /> Screenshot {i + 1}
                  </a>
                ))}
              </div>
            ) : <span className="opacity-30 italic text-sm">Not set</span>
          ) : type === "tag-array" ? (
            Array.isArray(currentVal) && currentVal.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {(currentVal as string[]).map((t, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{ background: "rgba(255,255,255,0.07)", border: `1px solid ${CARD_BORDER}` }}>{t}</span>
                ))}
              </div>
            ) : <span className="opacity-30 italic text-sm">Not set</span>
          ) : type === "platform-select" ? (
            Array.isArray(currentVal) && currentVal.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {(currentVal as string[]).map(p => {
                  const opt = PLATFORM_OPTIONS.find(o => o.id === p);
                  const Icon = opt?.icon ?? Gamepad2;
                  return (
                    <span key={p} className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
                      style={{ background: "rgba(255,255,255,0.07)", border: `1px solid ${CARD_BORDER}` }}>
                      <Icon size={11} />{opt?.label ?? p}
                    </span>
                  );
                })}
              </div>
            ) : <span className="opacity-30 italic text-sm">Not set</span>
          ) : type === "select" ? (
            currentVal ? <span>{selectOptions?.find(o => o.value === currentVal)?.label ?? currentVal}</span> : <span className="opacity-30 italic">Not set</span>
          ) : type === "url" && currentVal ? (
            <a href={currentVal} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 hover:underline text-sm" style={{ color: NEON }}>
              {(currentVal as string).length > 60 ? (currentVal as string).slice(0, 57) + "…" : currentVal}
              <ExternalLink size={10} />
            </a>
          ) : currentVal ? (
            <span className="whitespace-pre-wrap text-sm">
              {String(currentVal).length > 300 ? String(currentVal).slice(0, 297) + "…" : String(currentVal)}
            </span>
          ) : <span className="opacity-30 italic text-sm">Not set</span>}
        </div>
      ) : (
        <div className="space-y-2">
          {type === "textarea" ? (
            <textarea value={editVal ?? ""} onChange={e => setEditVal(e.target.value)} rows={5}
              className="w-full bg-transparent border rounded px-3 py-2 text-sm text-white outline-none resize-none"
              style={{ borderColor: `${NEON}66` }} />
          ) : type === "tag-array" ? (
            <TagArrayEditor values={editVal ?? []} onChange={setEditVal} />
          ) : type === "url-array" ? (
            <UrlArrayEditor values={editVal ?? []} onChange={setEditVal} />
          ) : type === "platform-select" ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PLATFORM_OPTIONS.map(opt => {
                const selected = (editVal ?? []).includes(opt.id);
                const Icon = opt.icon;
                return (
                  <button key={opt.id}
                    onClick={() => setEditVal(selected ? (editVal ?? []).filter((p: string) => p !== opt.id) : [...(editVal ?? []), opt.id])}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded text-xs font-medium transition-all"
                    style={{ background: selected ? `${NEON}22` : "rgba(255,255,255,0.04)", border: `1px solid ${selected ? NEON : CARD_BORDER}`, color: selected ? NEON : "rgba(255,255,255,0.6)" }}>
                    <Icon size={12} />{opt.label}
                  </button>
                );
              })}
            </div>
          ) : type === "select" ? (
            <select value={editVal ?? ""} onChange={e => setEditVal(e.target.value)}
              className="w-full bg-[#0d1117] border rounded px-3 py-2 text-sm text-white outline-none"
              style={{ borderColor: `${NEON}66` }}>
              {selectOptions?.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          ) : (
            <input type="text" value={editVal ?? ""} onChange={e => setEditVal(e.target.value)}
              className="w-full bg-transparent border rounded px-3 py-2 text-sm text-white outline-none"
              style={{ borderColor: `${NEON}66` }} />
          )}
          <div className="flex gap-2">
            <button onClick={saveEdit} disabled={isSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold"
              style={{ background: NEON, color: "#070b10" }}>
              {isSaving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} Save
            </button>
            <button onClick={cancelEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold text-white/60 hover:text-white border border-white/15">
              <X size={11} /> Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Accordion Section ────────────────────────────────────────────────────────

function Section({ id, title, children, filledCount, totalCount, open, onToggle }: {
  id: string; title: string; children: React.ReactNode;
  filledCount: number; totalCount: number; open: boolean; onToggle: () => void;
}) {
  const pct = totalCount > 0 ? Math.round((filledCount / totalCount) * 100) : 0;
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
      <button className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors" onClick={onToggle}>
        <div className="flex items-center gap-3">
          {open ? <ChevronDown size={16} className="text-white/50" /> : <ChevronRight size={16} className="text-white/50" />}
          <span className="font-bold text-white text-sm">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold" style={{ color: pct === 100 ? NEON : "rgba(255,255,255,0.3)" }}>
            {filledCount}/{totalCount}
          </span>
          <div className="w-16 h-1 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct === 100 ? NEON : "#fff4" }} />
          </div>
        </div>
      </button>
      {open && <div className="px-5 pb-4">{children}</div>}
    </div>
  );
}

// ─── Store Import Panel ───────────────────────────────────────────────────────

function StoreImportPanel({ profile, fieldMeta, onImported }: {
  profile: Profile | null; fieldMeta: FieldMeta; onImported: () => void;
}) {
  const { toast } = useToast();
  const [tab, setTab] = useState<"steam" | "epic" | "itch">("steam");
  const [steamInput, setSteamInput] = useState(profile?.steamAppId ?? "");
  const [epicInput, setEpicInput] = useState(profile?.epicSlug ?? "");
  const [itchKey, setItchKey] = useState("");
  const [itchGames, setItchGames] = useState<any[]>([]);
  const [selectedItchGame, setSelectedItchGame] = useState<any>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewSource, setPreviewSource] = useState("");
  const [previewAppId, setPreviewAppId] = useState("");
  const [previewSlug, setPreviewSlug] = useState("");
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isFetchingItch, setIsFetchingItch] = useState(false);

  const importMutation = useMutation({
    mutationFn: async () => {
      const fields: Record<string, any> = {};
      const data = previewData?.fields ?? {};
      for (const k of selectedFields) { if (k in data) fields[k] = data[k]; }
      return apiRequest("POST", "/api/indie/import", {
        source: previewSource, fields,
        ...(previewSource === "steam" && previewAppId ? { steamAppId: previewAppId } : {}),
        ...(previewSource === "epic" && previewSlug ? { epicSlug: previewSlug } : {}),
        ...(previewSource === "itch" && selectedItchGame ? { itchGameUrl: selectedItchGame.url } : {}),
      });
    },
    onSuccess: async (data: any) => {
      const protectedFields: string[] = data.protected ?? [];
      const msg = protectedFields.length > 0
        ? `${data.imported ?? 0} field${data.imported !== 1 ? "s" : ""} imported. ${protectedFields.length} preserved (manual override active): ${protectedFields.map(formatFieldName).join(", ")}.`
        : `${data.imported ?? selectedFields.size} field${(data.imported ?? selectedFields.size) !== 1 ? "s" : ""} imported.`;
      toast({ description: msg, duration: protectedFields.length > 0 ? 6000 : 3000 });
      await queryClient.invalidateQueries({ queryKey: ["/api/indie/profile"] });
      setPreviewData(null); setSelectedFields(new Set()); onImported();
    },
    onError: () => toast({ description: "Import failed.", variant: "gamefolioError" }),
  });

  const fetchSteam = async () => {
    const appId = steamInput.replace(/\D/g, "");
    if (!appId) return toast({ description: "Enter a Steam App ID", variant: "gamefolioError" });
    setIsPreviewing(true);
    try {
      const data = await apiRequest("GET", `/api/indie/steam/preview?appId=${appId}`);
      setPreviewData(data); setPreviewSource("steam"); setPreviewAppId(appId);
      setSelectedFields(new Set(Object.keys(data.fields ?? {}).filter((k: string) => (data.fields as any)[k] !== null && (data.fields as any)[k] !== undefined)));
    } catch { toast({ description: "Steam app not found. Check the App ID.", variant: "gamefolioError" }); }
    finally { setIsPreviewing(false); }
  };

  const fetchEpic = async () => {
    if (!epicInput.trim()) return toast({ description: "Enter an Epic slug", variant: "gamefolioError" });
    setIsPreviewing(true);
    try {
      const data = await apiRequest("GET", `/api/indie/epic/preview?slug=${encodeURIComponent(epicInput.trim())}`);
      setPreviewData(data); setPreviewSource("epic"); setPreviewSlug(epicInput.trim());
      setSelectedFields(new Set(Object.keys(data.fields ?? {}).filter((k: string) => (data.fields as any)[k] !== null)));
    } catch { toast({ description: "Epic product not found. Check the slug.", variant: "gamefolioError" }); }
    finally { setIsPreviewing(false); }
  };

  const fetchItch = async () => {
    if (!itchKey.trim()) return toast({ description: "Enter your itch.io API key", variant: "gamefolioError" });
    setIsFetchingItch(true);
    try {
      const data = await apiRequest("POST", "/api/indie/itch/preview", { apiKey: itchKey });
      setItchGames(data.games ?? []);
    } catch { toast({ description: "Invalid itch.io API key or no games found.", variant: "gamefolioError" }); }
    finally { setIsFetchingItch(false); }
  };

  const selectItchGame = (game: any) => {
    setSelectedItchGame(game);
    const fields: Record<string, any> = {};
    if (game.title) fields.gameName = game.title;
    if (game.shortText) fields.shortDescription = game.shortText;
    if (game.url) fields.itchUrl = game.url;
    if (game.coverUrl) fields.headerImageUrl = game.coverUrl;
    setPreviewData({ source: "itch", fields }); setPreviewSource("itch");
    setSelectedFields(new Set(Object.keys(fields)));
  };

  const toggleField = (k: string) => {
    const next = new Set(selectedFields);
    if (next.has(k)) next.delete(k); else next.add(k);
    setSelectedFields(next);
  };

  const previewFields = previewData?.fields ?? {};
  const previewEntries = Object.entries(previewFields).filter(([, v]) => v !== null && v !== undefined);

  return (
    <div className="space-y-4">
      <div className="flex gap-1 p-1 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }}>
        {(["steam", "epic", "itch"] as const).map(t => (
          <button key={t} onClick={() => { setTab(t); setPreviewData(null); setSelectedFields(new Set()); }}
            className="flex-1 flex items-center justify-center gap-2 py-1.5 rounded text-xs font-bold transition-all"
            style={{ background: tab === t ? CARD_BG : "transparent", border: tab === t ? `1px solid ${CARD_BORDER}` : "1px solid transparent", color: tab === t ? "white" : "rgba(255,255,255,0.4)" }}>
            {t === "steam" && <SiSteam size={13} className="text-[#66c0f4]" />}
            {t === "epic" && <SiEpicgames size={13} />}
            {t === "itch" && <SiItchdotio size={13} className="text-[#fa5c5c]" />}
            {t === "steam" ? "Steam" : t === "epic" ? "Epic Games" : "itch.io"}
          </button>
        ))}
      </div>

      {!previewData && tab === "steam" && (
        <div className="space-y-2">
          <label className="text-xs text-white/50">Steam App ID <span className="opacity-50">(numbers from the store URL: .../app/730/...)</span></label>
          <div className="flex gap-2">
            <input value={steamInput} onChange={e => setSteamInput(e.target.value)} onKeyDown={e => e.key === "Enter" && fetchSteam()}
              placeholder="e.g. 730" className="flex-1 bg-transparent border rounded px-3 py-2 text-sm text-white outline-none"
              style={{ borderColor: "rgba(255,255,255,0.2)" }} />
            <button onClick={fetchSteam} disabled={isPreviewing} className="px-4 py-2 rounded text-xs font-bold flex items-center gap-1.5" style={{ background: NEON, color: "#070b10" }}>
              {isPreviewing ? <Loader2 size={13} className="animate-spin" /> : "Preview"}
            </button>
          </div>
        </div>
      )}

      {!previewData && tab === "epic" && (
        <div className="space-y-2">
          <label className="text-xs text-white/50">Epic Games slug <span className="opacity-50">(from store URL: .../p/your-game-slug)</span></label>
          <div className="flex gap-2">
            <input value={epicInput} onChange={e => setEpicInput(e.target.value)} onKeyDown={e => e.key === "Enter" && fetchEpic()}
              placeholder="e.g. fortnite" className="flex-1 bg-transparent border rounded px-3 py-2 text-sm text-white outline-none"
              style={{ borderColor: "rgba(255,255,255,0.2)" }} />
            <button onClick={fetchEpic} disabled={isPreviewing} className="px-4 py-2 rounded text-xs font-bold flex items-center gap-1.5" style={{ background: NEON, color: "#070b10" }}>
              {isPreviewing ? <Loader2 size={13} className="animate-spin" /> : "Preview"}
            </button>
          </div>
        </div>
      )}

      {!previewData && tab === "itch" && (
        <div className="space-y-3">
          <div className="space-y-2">
            <label className="text-xs text-white/50">itch.io API key <span className="opacity-50">(get it at itch.io/user/settings/api-keys — proves you own the game)</span></label>
            <div className="flex gap-2">
              <input value={itchKey} onChange={e => setItchKey(e.target.value)} type="password" onKeyDown={e => e.key === "Enter" && fetchItch()}
                placeholder="Your itch.io API key" className="flex-1 bg-transparent border rounded px-3 py-2 text-sm text-white outline-none"
                style={{ borderColor: "rgba(255,255,255,0.2)" }} />
              <button onClick={fetchItch} disabled={isFetchingItch} className="px-4 py-2 rounded text-xs font-bold flex items-center gap-1.5" style={{ background: NEON, color: "#070b10" }}>
                {isFetchingItch ? <Loader2 size={13} className="animate-spin" /> : "Fetch"}
              </button>
            </div>
          </div>
          {itchGames.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-white/50">Select your game:</p>
              {itchGames.map(g => (
                <button key={g.id} onClick={() => selectItchGame(g)}
                  className="w-full flex items-center gap-3 p-2.5 rounded hover:bg-white/5 transition-colors text-left"
                  style={{ border: `1px solid ${CARD_BORDER}` }}>
                  {g.coverUrl && <img src={g.coverUrl} alt="" className="w-10 h-10 rounded object-cover shrink-0" />}
                  <div>
                    <div className="text-sm font-bold text-white">{g.title}</div>
                    {g.shortText && <div className="text-xs text-white/50 line-clamp-1">{g.shortText}</div>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {previewData && previewEntries.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-white/70">Select fields to import ({selectedFields.size} selected)</p>
            <div className="flex gap-2">
              <button onClick={() => setSelectedFields(new Set(previewEntries.map(([k]) => k)))} className="text-[10px] text-white/50 hover:text-white">All</button>
              <button onClick={() => setSelectedFields(new Set())} className="text-[10px] text-white/50 hover:text-white">None</button>
            </div>
          </div>
          <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
            {previewEntries.map(([k, v]) => {
              const hasOverride = fieldMeta[k]?.isManualOverride;
              return (
                <label key={k} className="flex items-start gap-2.5 p-2 rounded cursor-pointer hover:bg-white/5 transition-colors">
                  <input type="checkbox" checked={selectedFields.has(k)} onChange={() => toggleField(k)} className="mt-0.5 accent-[#c1ff00]" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white">{formatFieldName(k)}</span>
                      {hasOverride && <span className="flex items-center gap-0.5 text-[9px] text-yellow-400"><AlertTriangle size={9} /> has manual edit</span>}
                    </div>
                    <div className="text-[11px] text-white/40 truncate">{formatValue(v)}</div>
                  </div>
                </label>
              );
            })}
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => importMutation.mutate()} disabled={importMutation.isPending || selectedFields.size === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded text-xs font-bold"
              style={{ background: NEON, color: "#070b10", opacity: selectedFields.size === 0 ? 0.4 : 1 }}>
              {importMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              Apply {selectedFields.size} field{selectedFields.size !== 1 ? "s" : ""}
            </button>
            <button onClick={() => { setPreviewData(null); setSelectedFields(new Set()); setSelectedItchGame(null); }}
              className="px-4 py-2 rounded text-xs font-bold text-white/60 border border-white/15 hover:text-white">Back</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sync Panel ───────────────────────────────────────────────────────────────

// Per-field sync decision: "keep" = don't apply, "use" = apply, "defer" = skip for now
type SyncDecision = "keep" | "use" | "defer";

function SyncPanel({ profile, onSynced }: { profile: Profile | null; onSynced: () => void }) {
  const { toast } = useToast();
  const [changes, setChanges] = useState<SyncChange[]>([]);
  const [source, setSource] = useState("");
  const [checked, setChecked] = useState(false);
  // Per-field decision: "keep" (manual wins), "use" (take store value), "defer" (skip for now)
  const [decisions, setDecisions] = useState<Record<string, SyncDecision>>({});
  const [isChecking, setIsChecking] = useState(false);

  const setDecision = useCallback((fieldName: string, d: SyncDecision) => {
    setDecisions(prev => ({ ...prev, [fieldName]: d }));
  }, []);

  const doCheck = async () => {
    setIsChecking(true);
    try {
      const data = await apiRequest("POST", "/api/indie/sync-check");
      const incoming: SyncChange[] = data.changes ?? [];
      setChanges(incoming); setSource(data.source ?? ""); setChecked(true);
      // Default decisions: overrides → keep, others → use
      const auto: Record<string, SyncDecision> = {};
      for (const c of incoming) auto[c.fieldName] = c.hasOverride ? "keep" : "use";
      setDecisions(auto);
      if (!data.hasChanges) toast({ description: "Profile is up to date — no changes found." });
    } catch (err: any) {
      toast({ description: err?.message || "Could not check for updates. Add a Steam App ID or Epic slug first.", variant: "gamefolioError" });
    } finally { setIsChecking(false); }
  };

  const applyMutation = useMutation({
    mutationFn: async () => {
      const fields = changes
        .filter(c => decisions[c.fieldName] === "use")
        .map(c => ({ fieldName: c.fieldName, newValue: c.newValue }));
      return apiRequest("POST", "/api/indie/sync-apply", { fields, source });
    },
    onSuccess: async (data: any) => {
      const n = data.applied?.length ?? 0;
      const sk = data.skipped?.length ?? 0;
      const deferred = changes.filter(c => decisions[c.fieldName] === "defer").length;
      const parts: string[] = [];
      if (n > 0) parts.push(`${n} field${n !== 1 ? "s" : ""} updated from store`);
      if (sk > 0) parts.push(`${sk} manual override${sk !== 1 ? "s" : ""} preserved`);
      if (deferred > 0) parts.push(`${deferred} deferred`);
      toast({ description: parts.join(", ") + "." });
      await queryClient.invalidateQueries({ queryKey: ["/api/indie/profile"] });
      setChecked(false); setChanges([]); setDecisions({}); onSynced();
    },
    onError: () => toast({ description: "Sync failed.", variant: "gamefolioError" }),
  });

  const useCount = changes.filter(c => decisions[c.fieldName] === "use").length;
  const hasStore = !!(profile?.steamAppId || profile?.epicSlug);
  if (!hasStore) return <p className="text-xs text-white/40 text-center py-3">Add a Steam App ID or Epic slug in Store Links to enable sync.</p>;

  if (!checked) {
    return (
      <button onClick={doCheck} disabled={isChecking}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded text-sm font-bold transition-all"
        style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${CARD_BORDER}`, color: "white" }}>
        {isChecking ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
        {isChecking ? "Checking for updates…" : `Check ${profile?.steamAppId ? "Steam" : "Epic"} for updates`}
      </button>
    );
  }

  if (changes.length === 0) {
    return <p className="text-xs text-white/50 text-center py-3 flex items-center justify-center gap-1.5"><CheckCircle2 size={14} style={{ color: NEON }} /> Profile is up to date</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-white/70">{changes.length} update{changes.length !== 1 ? "s" : ""} from {source}</p>
        <div className="flex gap-2">
          <button onClick={() => { const d: Record<string, SyncDecision> = {}; for (const c of changes) d[c.fieldName] = c.hasOverride ? "keep" : "use"; setDecisions(d); }}
            className="text-[10px] text-white/50 hover:text-white">Auto</button>
          <button onClick={() => { const d: Record<string, SyncDecision> = {}; for (const c of changes) d[c.fieldName] = "keep"; setDecisions(d); }}
            className="text-[10px] text-white/50 hover:text-white">Keep all</button>
        </div>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_1fr_80px] gap-2 px-2">
        <span className="text-[9px] text-white/30 uppercase tracking-wider">Current</span>
        <span className="text-[9px] text-white/30 uppercase tracking-wider">Store update</span>
        <span className="text-[9px] text-white/30 uppercase tracking-wider text-right">Action</span>
      </div>

      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {changes.map(c => {
          const dec = decisions[c.fieldName] ?? (c.hasOverride ? "keep" : "use");
          const isLocked = c.hasOverride && dec === "keep";
          return (
            <div key={c.fieldName} className="rounded-lg overflow-hidden" style={{ border: `1px solid ${CARD_BORDER}` }}>
              {/* Field name row */}
              <div className="flex items-center gap-1.5 px-2 py-1" style={{ background: "rgba(255,255,255,0.04)" }}>
                <span className="text-[10px] font-bold text-white/70">{formatFieldName(c.fieldName)}</span>
                {c.hasOverride && (
                  <span className="flex items-center gap-0.5 text-[9px] text-yellow-400 ml-1">
                    <AlertTriangle size={8} /> manual override
                  </span>
                )}
              </div>
              {/* Side-by-side current vs new */}
              <div className="grid grid-cols-2 divide-x divide-white/10">
                <div className="p-2" style={{ background: dec === "keep" ? "rgba(193,255,0,0.06)" : "transparent" }}>
                  <div className="text-[9px] text-white/30 mb-0.5 uppercase tracking-wider">Current</div>
                  <div className="text-[11px] text-white/55 break-words line-clamp-2">{formatValue(c.currentValue) || <span className="italic text-white/25">empty</span>}</div>
                </div>
                <div className="p-2" style={{ background: dec === "use" ? "rgba(193,255,0,0.06)" : "transparent" }}>
                  <div className="text-[9px] text-white/30 mb-0.5 uppercase tracking-wider">Store</div>
                  <div className="text-[11px] text-white/80 break-words line-clamp-2">{formatValue(c.newValue)}</div>
                </div>
              </div>
              {/* Decision buttons */}
              <div className="flex items-center gap-1 p-1.5 border-t border-white/5">
                {(["keep", "use", "defer"] as const).map(d => {
                  const labels: Record<SyncDecision, string> = { keep: "Keep current", use: "Use store", defer: "Review later" };
                  const active = dec === d;
                  const disabled = d === "use" && isLocked;
                  return (
                    <button key={d} disabled={disabled}
                      onClick={() => !disabled && setDecision(c.fieldName, d)}
                      className="flex-1 py-1 rounded text-[10px] font-bold transition-all"
                      style={{
                        background: active ? (d === "use" ? NEON : d === "keep" ? "rgba(255,255,255,0.12)" : "rgba(255,200,0,0.15)") : "transparent",
                        color: active ? (d === "use" ? "#070b10" : d === "keep" ? "white" : "#fbbf24") : "rgba(255,255,255,0.35)",
                        opacity: disabled ? 0.3 : 1,
                        border: active ? "none" : "1px solid rgba(255,255,255,0.08)",
                      }}>
                      {labels[d]}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2 pt-1">
        <button onClick={() => applyMutation.mutate()} disabled={applyMutation.isPending}
          className="flex items-center gap-1.5 px-4 py-2 rounded text-xs font-bold"
          style={{ background: NEON, color: "#070b10" }}>
          {applyMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
          Apply decisions{useCount > 0 ? ` (${useCount} store)` : ""}
        </button>
        <button onClick={() => { setChecked(false); setChanges([]); setDecisions({}); }}
          className="px-4 py-2 rounded text-xs font-bold text-white/60 border border-white/15 hover:text-white">Cancel</button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function GameProfileTab() {
  const { toast } = useToast();
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(["basic"]));
  const [importOpen, setImportOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);

  const { data, isLoading } = useQuery<{ profile: Profile; fieldMeta: FieldMeta }>({
    queryKey: ["/api/indie/profile"],
  });

  const profile = (data?.profile ?? null) as Profile | null;
  const fieldMeta = (data?.fieldMeta ?? {}) as FieldMeta;

  const saveMutation = useMutation({
    mutationFn: async ({ fieldName, value }: { fieldName: string; value: any }) =>
      apiRequest("PUT", "/api/indie/profile", { [fieldName]: value }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/indie/profile"] }); toast({ description: "Saved." }); },
    onError: () => toast({ description: "Save failed.", variant: "gamefolioError" }),
  });

  const revertMutation = useMutation({
    mutationFn: async ({ fieldName }: { fieldName: string }) =>
      apiRequest("POST", "/api/indie/field-revert", { fieldName }),
    onSuccess: (_data: any, { fieldName }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/indie/profile"] });
      toast({ description: `${formatFieldName(fieldName)} reverted to store value.` });
    },
    onError: (err: any) => toast({ description: err?.message ?? "Revert failed.", variant: "gamefolioError" }),
  });

  const handleSave = useCallback((fieldName: string, value: any) => saveMutation.mutate({ fieldName, value }), [saveMutation]);
  const handleRevert = useCallback((fieldName: string) => revertMutation.mutate({ fieldName }), [revertMutation]);
  const toggleSection = (id: string) => setOpenSections(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const SECTION_FIELDS: Record<string, string[]> = {
    basic: ["gameName", "releaseStatus", "releaseDate", "price"],
    studio: ["studioName", "studioFoundedYear", "studioTeamSize", "studioWebsite", "studioCountry"],
    description: ["shortDescription", "fullDescription"],
    features: ["keyFeatures", "genres", "tags"],
    media: ["headerImageUrl", "trailerUrl", "screenshotUrls"],
    platforms: ["platforms"],
    stores: ["steamAppId", "steamUrl", "epicSlug", "epicUrl", "itchUrl"],
    social: ["websiteUrl", "twitterUrl", "discordUrl"],
  };

  const sectionFilled = (id: string) => (SECTION_FIELDS[id] ?? []).filter(f => isFieldFilled(profile, f)).length;
  const essentialFilled = ESSENTIAL_FIELDS.filter(f => isFieldFilled(profile, f)).length;
  const optionalFilled = OPTIONAL_FIELDS.filter(f => isFieldFilled(profile, f)).length;
  const essentialPct = Math.round((essentialFilled / ESSENTIAL_FIELDS.length) * 100);
  const missingEssential = ESSENTIAL_FIELDS.filter(f => !isFieldFilled(profile, f));

  const fp = { profile, fieldMeta, onSave: handleSave, onRevert: handleRevert, isSaving: saveMutation.isPending || revertMutation.isPending };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-white/30" /></div>;
  }

  return (
    <div className="space-y-4 max-w-3xl">

      {/* Completeness card */}
      <div className="rounded-xl p-5 space-y-3" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-white">Profile Completeness</span>
          <span className="text-xs font-bold" style={{ color: essentialPct === 100 ? NEON : "rgba(255,255,255,0.5)" }}>
            {essentialFilled}/{ESSENTIAL_FIELDS.length} essential · {optionalFilled}/{OPTIONAL_FIELDS.length} optional
          </span>
        </div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${essentialPct}%`, background: essentialPct === 100 ? NEON : "linear-gradient(90deg,#fff4,#fff8)" }} />
        </div>
        {missingEssential.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {missingEssential.map(f => (
              <span key={f} className="text-[10px] px-2 py-0.5 rounded-full text-yellow-400"
                style={{ background: "rgba(250,204,21,0.08)", border: "1px solid rgba(250,204,21,0.2)" }}>
                {formatFieldName(f)} missing
              </span>
            ))}
          </div>
        )}
        {essentialPct === 100 && (
          <p className="text-xs flex items-center gap-1.5" style={{ color: NEON }}>
            <CheckCircle2 size={13} /> All essential fields complete — your public profile looks great!
          </p>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => { setImportOpen(p => !p); setSyncOpen(false); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all"
          style={{ background: importOpen ? `${NEON}22` : CARD_BG, border: `1px solid ${importOpen ? NEON : CARD_BORDER}`, color: importOpen ? NEON : "white" }}>
          <SiSteam size={14} /> Import from Store
        </button>
        <button onClick={() => { setSyncOpen(p => !p); setImportOpen(false); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all"
          style={{ background: syncOpen ? "rgba(99,102,241,0.15)" : CARD_BG, border: `1px solid ${syncOpen ? "#6366f1" : CARD_BORDER}`, color: syncOpen ? "#818cf8" : "white" }}>
          <RefreshCw size={14} /> Check for Updates
        </button>
      </div>

      {importOpen && (
        <div className="rounded-xl p-5" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
          <h3 className="text-sm font-bold text-white mb-4">Import from Store</h3>
          <StoreImportPanel profile={profile} fieldMeta={fieldMeta} onImported={() => setImportOpen(false)} />
        </div>
      )}

      {syncOpen && (
        <div className="rounded-xl p-5" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
          <h3 className="text-sm font-bold text-white mb-4">Sync with Store</h3>
          <SyncPanel profile={profile} onSynced={() => setSyncOpen(false)} />
        </div>
      )}

      {/* Section 1: Basic Info */}
      <Section id="basic" title="Basic Info" open={openSections.has("basic")} onToggle={() => toggleSection("basic")}
        filledCount={sectionFilled("basic")} totalCount={SECTION_FIELDS.basic.length}>
        <FieldRow {...fp} fieldName="gameName" label="Game Name" type="text" />
        <FieldRow {...fp} fieldName="releaseStatus" label="Release Status" type="select" selectOptions={RELEASE_STATUS_OPTIONS} />
        <FieldRow {...fp} fieldName="releaseDate" label="Release Date" type="text" />
        <FieldRow {...fp} fieldName="price" label="Price" type="text" />
      </Section>

      {/* Section 2: Studio */}
      <Section id="studio" title="Studio" open={openSections.has("studio")} onToggle={() => toggleSection("studio")}
        filledCount={sectionFilled("studio")} totalCount={SECTION_FIELDS.studio.length}>
        <FieldRow {...fp} fieldName="studioName" label="Studio Name" type="text" />
        <FieldRow {...fp} fieldName="studioFoundedYear" label="Founded Year" type="text" />
        <FieldRow {...fp} fieldName="studioTeamSize" label="Team Size" type="text" />
        <FieldRow {...fp} fieldName="studioWebsite" label="Studio Website" type="url" />
        <FieldRow {...fp} fieldName="studioCountry" label="Country" type="text" />
      </Section>

      {/* Section 3: Description */}
      <Section id="description" title="Description" open={openSections.has("description")} onToggle={() => toggleSection("description")}
        filledCount={sectionFilled("description")} totalCount={SECTION_FIELDS.description.length}>
        <FieldRow {...fp} fieldName="shortDescription" label="Short Description" type="textarea" />
        <FieldRow {...fp} fieldName="fullDescription" label="Full Description" type="textarea" />
      </Section>

      {/* Section 4: Features & Genre */}
      <Section id="features" title="Features & Genre" open={openSections.has("features")} onToggle={() => toggleSection("features")}
        filledCount={sectionFilled("features")} totalCount={SECTION_FIELDS.features.length}>
        <FieldRow {...fp} fieldName="keyFeatures" label="Key Features" type="tag-array" />
        <FieldRow {...fp} fieldName="genres" label="Genres" type="tag-array" />
        <FieldRow {...fp} fieldName="tags" label="Tags" type="tag-array" />
      </Section>

      {/* Section 5: Media */}
      <Section id="media" title="Media" open={openSections.has("media")} onToggle={() => toggleSection("media")}
        filledCount={sectionFilled("media")} totalCount={SECTION_FIELDS.media.length}>
        <FieldRow {...fp} fieldName="headerImageUrl" label="Header Image URL" type="url" />
        <FieldRow {...fp} fieldName="trailerUrl" label="Trailer URL" type="url" />
        <FieldRow {...fp} fieldName="screenshotUrls" label="Screenshot URLs" type="url-array" />
      </Section>

      {/* Section 6: Platforms */}
      <Section id="platforms" title="Platforms" open={openSections.has("platforms")} onToggle={() => toggleSection("platforms")}
        filledCount={sectionFilled("platforms")} totalCount={SECTION_FIELDS.platforms.length}>
        <FieldRow {...fp} fieldName="platforms" label="Supported Platforms" type="platform-select" />
      </Section>

      {/* Section 7: Store Links */}
      <Section id="stores" title="Store Links" open={openSections.has("stores")} onToggle={() => toggleSection("stores")}
        filledCount={sectionFilled("stores")} totalCount={SECTION_FIELDS.stores.length}>
        <FieldRow {...fp} fieldName="steamAppId" label="Steam App ID" type="text" />
        <FieldRow {...fp} fieldName="steamUrl" label="Steam Store URL" type="url" />
        <FieldRow {...fp} fieldName="epicSlug" label="Epic Games Slug" type="text" />
        <FieldRow {...fp} fieldName="epicUrl" label="Epic Store URL" type="url" />
        <FieldRow {...fp} fieldName="itchUrl" label="itch.io URL" type="url" />
      </Section>

      {/* Section 8: Social & Contact */}
      <Section id="social" title="Social & Contact" open={openSections.has("social")} onToggle={() => toggleSection("social")}
        filledCount={sectionFilled("social")} totalCount={SECTION_FIELDS.social.length}>
        <FieldRow {...fp} fieldName="websiteUrl" label="Website URL" type="url" />
        <FieldRow {...fp} fieldName="twitterUrl" label="Twitter / X URL" type="url" />
        <FieldRow {...fp} fieldName="discordUrl" label="Discord URL" type="url" />
      </Section>
    </div>
  );
}
