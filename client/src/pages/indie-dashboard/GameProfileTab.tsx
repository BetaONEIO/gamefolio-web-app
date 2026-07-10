import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Pencil, Check, X, RefreshCw, Info, UploadCloud,
  ExternalLink, ChevronDown, ChevronUp, Loader2,
  ScanSearch, Store, CircleCheck, AlertCircle,
} from "lucide-react";
import { SiSteam, SiEpicgames, SiItchdotio } from "react-icons/si";
import { NEON, CARD_BG, CARD_BORDER } from "@/pages/IndieDashboardPage";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// ─── Types ──────────────────────────────────────────────────────────────────

interface FieldOverride {
  id: number;
  userId: number;
  fieldName: string;
  importedValue: string | null;
  importSource: string | null;
  manualOverride: string | null;
  isOverride: boolean;
  lastImportedAt: string | null;
  lastEditedAt: string | null;
}

interface GameProfileData {
  fields: {
    gameDescription: string | null;
    gameKeyFeatures: string[];
    studioFoundedYear: string | null;
    studioTeamSize: string | null;
    gameReleaseDate: string | null;
    gameSteamUrl: string | null;
    gameEpicUrl: string | null;
    gameTrailerUrl: string | null;
    gameScreenshotUrls: string[];
  };
  overrides: Record<string, FieldOverride>;
}

interface StorePreview {
  source: string;
  gameName: string;
  headerImage?: string;
  preview: Record<string, { value: any; label: string }>;
}

// ─── Field Definitions ───────────────────────────────────────────────────────

const FIELDS: Array<{
  key: keyof GameProfileData["fields"];
  label: string;
  type: "text" | "textarea" | "array" | "url";
  placeholder: string;
  completeness: boolean;
}> = [
  { key: "gameDescription", label: "Game Description", type: "textarea", placeholder: "Describe your game in a few sentences…", completeness: true },
  { key: "gameKeyFeatures", label: "Key Features", type: "array", placeholder: "Add a feature (press Enter)", completeness: true },
  { key: "studioFoundedYear", label: "Studio Founded Year", type: "text", placeholder: "e.g. 2021", completeness: true },
  { key: "studioTeamSize", label: "Team Size", type: "text", placeholder: "e.g. 4 Members", completeness: true },
  { key: "gameReleaseDate", label: "Release Date", type: "text", placeholder: "e.g. Q3 2025 or Coming Soon", completeness: true },
  { key: "gameSteamUrl", label: "Steam URL", type: "url", placeholder: "https://store.steampowered.com/app/…", completeness: false },
  { key: "gameEpicUrl", label: "Epic Games URL", type: "url", placeholder: "https://store.epicgames.com/en-US/p/…", completeness: false },
  { key: "gameTrailerUrl", label: "Trailer URL", type: "url", placeholder: "YouTube or video URL", completeness: true },
  { key: "gameScreenshotUrls", label: "Screenshots", type: "array", placeholder: "Paste image URL", completeness: true },
];

const COMPLETENESS_FIELDS = FIELDS.filter(f => f.completeness).map(f => f.key);

// ─── Source Badge ────────────────────────────────────────────────────────────

function SourceBadge({ override, fieldKey }: { override?: FieldOverride; fieldKey: string }) {
  if (!override) return null;
  if (override.isOverride) {
    return (
      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: "rgba(193,255,0,0.15)", color: NEON }}>
        <Pencil size={9} /> Manual
      </span>
    );
  }
  if (override.importSource) {
    const src = override.importSource;
    return (
      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: "rgba(102,192,244,0.15)", color: "#66c0f4" }}>
        {src === "steam" && <SiSteam size={9} />}
        {src === "epic" && <SiEpicgames size={9} />}
        {src === "itch" && <SiItchdotio size={9} />}
        {src === "steam" ? "Steam" : src === "epic" ? "Epic" : "itch.io"}
      </span>
    );
  }
  return null;
}

// ─── Field Editor ────────────────────────────────────────────────────────────

function FieldEditor({
  fieldDef,
  currentValue,
  override,
  onSave,
  onClearOverride,
}: {
  fieldDef: typeof FIELDS[0];
  currentValue: any;
  override?: FieldOverride;
  onSave: (key: string, value: any) => Promise<void>;
  onClearOverride: (key: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [tagInput, setTagInput] = useState("");

  const displayValue = currentValue;
  const hasImported = !!override?.importedValue;

  const startEdit = () => {
    setDraft(
      fieldDef.type === "array"
        ? Array.isArray(displayValue) ? [...displayValue] : []
        : displayValue ?? ""
    );
    setEditing(true);
  };

  const cancel = () => { setEditing(false); setDraft(null); setTagInput(""); };

  const save = async () => {
    setSaving(true);
    try { await onSave(fieldDef.key, draft); setEditing(false); setDraft(null); }
    finally { setSaving(false); }
  };

  const isEmpty = Array.isArray(displayValue)
    ? !displayValue || displayValue.length === 0
    : !displayValue;

  return (
    <div className="rounded-2xl p-4" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
      <div className="flex items-center justify-between mb-2 gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-white uppercase tracking-wider">{fieldDef.label}</span>
          <SourceBadge override={override} fieldKey={fieldDef.key} />
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {override?.isOverride && hasImported && (
            <button
              onClick={() => onClearOverride(fieldDef.key)}
              title="Revert to imported value"
              className="text-[10px] font-bold px-2 py-1 rounded-lg text-gray-400 hover:text-white transition-colors"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              <RefreshCw size={10} className="inline mr-1" />Revert
            </button>
          )}
          {!editing && (
            <button
              onClick={startEdit}
              className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg transition-colors"
              style={{ background: "rgba(193,255,0,0.12)", color: NEON }}
            >
              <Pencil size={11} /> Edit
            </button>
          )}
        </div>
      </div>

      {!editing ? (
        <div className="min-h-[28px]">
          {isEmpty ? (
            <span className="text-xs text-gray-500 italic">Not set — click Edit to add</span>
          ) : fieldDef.type === "array" ? (
            <div className="flex flex-wrap gap-1.5">
              {(displayValue as string[]).map((v, i) => (
                <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-white/8 text-gray-300 border border-white/10">{v}</span>
              ))}
            </div>
          ) : fieldDef.type === "url" ? (
            <a href={displayValue} target="_blank" rel="noreferrer"
               className="text-sm text-blue-400 hover:underline flex items-center gap-1 break-all">
              {displayValue} <ExternalLink size={11} />
            </a>
          ) : (
            <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{displayValue}</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {fieldDef.type === "textarea" ? (
            <textarea
              className="w-full rounded-xl p-3 text-sm text-white outline-none resize-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", minHeight: 100 }}
              value={draft ?? ""}
              onChange={e => setDraft(e.target.value)}
              placeholder={fieldDef.placeholder}
            />
          ) : fieldDef.type === "array" ? (
            <div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {(draft as string[]).map((v, i) => (
                  <span key={i} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-white/8 text-gray-300 border border-white/10">
                    {v}
                    <button onClick={() => setDraft((draft as string[]).filter((_: any, j: number) => j !== i))}>
                      <X size={10} className="text-gray-500 hover:text-white" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  className="flex-1 rounded-xl px-3 py-2 text-sm text-white outline-none"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  placeholder={fieldDef.placeholder}
                  onKeyDown={e => {
                    if (e.key === "Enter" && tagInput.trim()) {
                      setDraft([...(draft as string[]), tagInput.trim()]);
                      setTagInput("");
                    }
                  }}
                />
                <button
                  onClick={() => { if (tagInput.trim()) { setDraft([...(draft as string[]), tagInput.trim()]); setTagInput(""); } }}
                  className="px-3 py-2 rounded-xl text-xs font-bold"
                  style={{ background: NEON, color: "#0a0f1c" }}
                >Add</button>
              </div>
            </div>
          ) : (
            <input
              className="w-full rounded-xl px-3 py-2 text-sm text-white outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
              value={draft ?? ""}
              onChange={e => setDraft(e.target.value)}
              placeholder={fieldDef.placeholder}
              type={fieldDef.type === "url" ? "url" : "text"}
            />
          )}
          <div className="flex gap-2 justify-end">
            <button onClick={cancel} className="px-3 py-1.5 rounded-xl text-xs font-bold text-gray-400 hover:text-white"
                    style={{ background: "rgba(255,255,255,0.06)" }}>
              Cancel
            </button>
            <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
                    style={{ background: NEON, color: "#0a0f1c" }}>
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Store Import Panel ───────────────────────────────────────────────────────

type StoreId = "steam" | "epic" | "itch";

function StoreImportPanel({ onImported }: { onImported: () => void }) {
  const [activeStore, setActiveStore] = useState<StoreId>("steam");
  const [identifier, setIdentifier] = useState("");
  const [itchKey, setItchKey] = useState("");
  const [preview, setPreview] = useState<StorePreview | null>(null);
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const { toast } = useToast();

  const stores: Array<{ id: StoreId; label: string; icon: any; color: string; placeholder: string; hint: string }> = [
    {
      id: "steam",
      label: "Steam",
      icon: SiSteam,
      color: "#66c0f4",
      placeholder: "App ID or Steam store URL",
      hint: "Find your App ID in your Steam store URL (e.g. store.steampowered.com/app/1234567)",
    },
    {
      id: "epic",
      label: "Epic Games",
      icon: SiEpicgames,
      color: "#ffffff",
      placeholder: "Product slug from Epic store URL",
      hint: "Copy the slug from your Epic Games store URL (e.g. store.epicgames.com/en-US/p/my-game-slug)",
    },
    {
      id: "itch",
      label: "itch.io",
      icon: SiItchdotio,
      color: "#fa5c5c",
      placeholder: "Game title or itch.io URL slug",
      hint: "Requires your itch.io API key. The key proves ownership and is never stored.",
    },
  ];

  const currentStore = stores.find(s => s.id === activeStore)!;

  const handlePreview = async () => {
    if (!identifier.trim()) return;
    setLoading(true);
    setPreview(null);
    try {
      const body: any = { store: activeStore, identifier: identifier.trim() };
      if (activeStore === "itch") body.apiKey = itchKey.trim();
      const res = await apiRequest("POST", "/api/indie/store-import/preview", body);
      const data = await res.json();
      if (!res.ok) { toast({ title: "Import failed", description: data.message, variant: "destructive" }); return; }
      setPreview(data);
      // Pre-select all fields that have values
      const initial = new Set(
        Object.entries(data.preview)
          .filter(([, v]) => (v as any).value !== null && (v as any).value !== undefined)
          .map(([k]) => k)
      );
      setSelectedFields(initial);
    } catch {
      toast({ title: "Network error", description: "Could not reach store API. Try again.", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handleApply = async () => {
    if (!preview) return;
    setApplying(true);
    try {
      const fields: Record<string, any> = {};
      for (const key of selectedFields) {
        const val = preview.preview[key]?.value;
        if (val !== null && val !== undefined) fields[key] = val;
      }
      const res = await apiRequest("POST", "/api/indie/store-import/apply", { source: preview.source, fields });
      const data = await res.json();
      if (!res.ok) { toast({ title: "Apply failed", description: data.message, variant: "destructive" }); return; }
      toast({ title: "Import applied!", description: `${data.updatedFields?.length ?? 0} field(s) updated.` });
      setPreview(null);
      setIdentifier("");
      onImported();
    } finally { setApplying(false); }
  };

  const toggleField = (key: string) => {
    setSelectedFields(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  return (
    <div className="rounded-2xl p-5 space-y-4" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
      <div className="flex items-center gap-2 mb-1">
        <Store size={16} style={{ color: NEON }} />
        <h3 className="text-sm font-black text-white uppercase tracking-wider">Import from Store</h3>
      </div>

      {/* Store Selector */}
      <div className="flex gap-2">
        {stores.map(s => {
          const active = activeStore === s.id;
          return (
            <button
              key={s.id}
              onClick={() => { setActiveStore(s.id); setPreview(null); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors"
              style={{
                background: active ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${active ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.08)"}`,
                color: active ? s.color : "rgba(255,255,255,0.5)",
              }}
            >
              <s.icon size={13} />
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Input */}
      <div className="space-y-2">
        <input
          className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
          placeholder={currentStore.placeholder}
          value={identifier}
          onChange={e => setIdentifier(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handlePreview()}
        />
        {activeStore === "itch" && (
          <input
            className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
            placeholder="itch.io API key (from itch.io → Account settings → API keys)"
            value={itchKey}
            onChange={e => setItchKey(e.target.value)}
            type="password"
          />
        )}
        <p className="text-[11px] text-gray-500 flex items-start gap-1">
          <Info size={11} className="shrink-0 mt-0.5" />{currentStore.hint}
        </p>
      </div>

      <button
        onClick={handlePreview}
        disabled={loading || !identifier.trim()}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-opacity disabled:opacity-40"
        style={{ background: NEON, color: "#0a0f1c" }}
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <ScanSearch size={14} />}
        {loading ? "Fetching…" : "Fetch & Preview"}
      </button>

      {/* Preview */}
      {preview && (
        <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="flex items-center gap-3 mb-2">
            {preview.headerImage && (
              <img src={preview.headerImage} alt={preview.gameName} className="h-12 rounded-lg object-cover" />
            )}
            <div>
              <div className="text-sm font-black text-white">{preview.gameName}</div>
              <div className="text-[11px] text-gray-400">Select the fields to import:</div>
            </div>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {Object.entries(preview.preview).map(([key, { value, label }]) => {
              if (value === null || value === undefined) return null;
              const selected = selectedFields.has(key);
              const displayVal = Array.isArray(value)
                ? value.slice(0, 3).join(", ") + (value.length > 3 ? `… +${value.length - 3}` : "")
                : String(value).slice(0, 120);
              return (
                <label key={key}
                  className="flex items-start gap-3 p-2.5 rounded-xl cursor-pointer transition-colors"
                  style={{ background: selected ? "rgba(193,255,0,0.07)" : "rgba(255,255,255,0.03)" }}
                >
                  <div className="mt-0.5 w-4 h-4 rounded flex items-center justify-center shrink-0"
                       style={{ background: selected ? NEON : "rgba(255,255,255,0.1)", border: selected ? "none" : "1px solid rgba(255,255,255,0.2)" }}>
                    {selected && <Check size={10} color="#0a0f1c" />}
                  </div>
                  <input type="checkbox" className="sr-only" checked={selected}
                         onChange={() => toggleField(key)} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">{label}</div>
                    <div className="text-xs text-gray-300 truncate mt-0.5">{displayVal}</div>
                  </div>
                </label>
              );
            })}
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={() => setPreview(null)}
              className="px-3 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-white"
              style={{ background: "rgba(255,255,255,0.06)" }}>
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={applying || selectedFields.size === 0}
              className="flex items-center gap-1.5 flex-1 justify-center px-3 py-2 rounded-xl text-xs font-bold disabled:opacity-40"
              style={{ background: NEON, color: "#0a0f1c" }}
            >
              {applying ? <Loader2 size={12} className="animate-spin" /> : <UploadCloud size={12} />}
              Apply {selectedFields.size} Field{selectedFields.size !== 1 ? "s" : ""}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Profile Completeness ─────────────────────────────────────────────────────

function CompletenessBar({ fields }: { fields: GameProfileData["fields"] }) {
  const filled = COMPLETENESS_FIELDS.filter(k => {
    const v = fields[k];
    return Array.isArray(v) ? v.length > 0 : !!v;
  }).length;
  const pct = Math.round((filled / COMPLETENESS_FIELDS.length) * 100);

  return (
    <div className="rounded-2xl p-5" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {pct === 100
            ? <CircleCheck size={16} style={{ color: NEON }} />
            : <AlertCircle size={16} className="text-yellow-400" />}
          <span className="text-sm font-black text-white uppercase tracking-wider">Profile Completeness</span>
        </div>
        <span className="text-lg font-black" style={{ color: pct === 100 ? NEON : "white" }}>{pct}%</span>
      </div>
      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: pct === 100 ? NEON : `linear-gradient(90deg, ${NEON}, #66c0f4)`,
            boxShadow: pct > 0 ? `0 0 12px ${NEON}55` : "none",
          }}
        />
      </div>
      <div className="text-[11px] text-gray-500 mt-2">
        {filled} of {COMPLETENESS_FIELDS.length} key fields filled — complete your profile to attract more creators
      </div>
    </div>
  );
}

// ─── Main GameProfileTab ──────────────────────────────────────────────────────

export default function GameProfileTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showImport, setShowImport] = useState(true);

  const { data, isLoading } = useQuery<GameProfileData>({
    queryKey: ["/api/indie/game-profile"],
  });

  const saveMutation = useMutation({
    mutationFn: ({ fieldName, value }: { fieldName: string; value: any }) =>
      apiRequest("PUT", `/api/indie/field-override/${fieldName}`, { value }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/indie/game-profile"] });
      qc.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  const clearMutation = useMutation({
    mutationFn: (fieldName: string) =>
      apiRequest("PUT", `/api/indie/field-override/${fieldName}`, { clearOverride: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/indie/game-profile"] });
      qc.invalidateQueries({ queryKey: ["/api/user"] });
    },
  });

  const handleSave = async (fieldName: string, value: any) => {
    await saveMutation.mutateAsync({ fieldName, value });
    toast({ title: "Saved", description: `${FIELDS.find(f => f.key === fieldName)?.label} updated.` });
  };

  const handleClearOverride = async (fieldName: string) => {
    await clearMutation.mutateAsync(fieldName);
    toast({ title: "Override cleared", description: "Field reverted to imported value." });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: NEON }} />
      </div>
    );
  }

  const profileData = data ?? { fields: {
    gameDescription: null, gameKeyFeatures: [], studioFoundedYear: null,
    studioTeamSize: null, gameReleaseDate: null, gameSteamUrl: null,
    gameEpicUrl: null, gameTrailerUrl: null, gameScreenshotUrls: [],
  }, overrides: {} };

  return (
    <div className="space-y-5 pb-10">
      {/* Completeness */}
      <CompletenessBar fields={profileData.fields} />

      {/* Store Import (collapsible) */}
      <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${CARD_BORDER}` }}>
        <button
          onClick={() => setShowImport(v => !v)}
          className="w-full flex items-center justify-between px-5 py-4"
          style={{ background: CARD_BG }}
        >
          <div className="flex items-center gap-2">
            <Store size={15} style={{ color: NEON }} />
            <span className="text-sm font-black text-white uppercase tracking-wider">Store Import</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                  style={{ background: "rgba(193,255,0,0.15)", color: NEON }}>
              Steam · Epic · itch.io
            </span>
          </div>
          {showImport ? <ChevronUp size={15} className="text-gray-500" /> : <ChevronDown size={15} className="text-gray-500" />}
        </button>
        {showImport && (
          <div className="px-5 pb-5 pt-1" style={{ background: CARD_BG }}>
            <StoreImportPanel onImported={() => qc.invalidateQueries({ queryKey: ["/api/indie/game-profile"] })} />
          </div>
        )}
      </div>

      {/* Field-by-field editing */}
      <div>
        <div className="flex items-center gap-2 mb-3 px-1">
          <Pencil size={14} style={{ color: NEON }} />
          <span className="text-sm font-black text-white uppercase tracking-wider">Edit Fields</span>
        </div>
        <div className="space-y-3">
          {FIELDS.map(fieldDef => (
            <FieldEditor
              key={fieldDef.key}
              fieldDef={fieldDef}
              currentValue={profileData.fields[fieldDef.key]}
              override={profileData.overrides[fieldDef.key]}
              onSave={handleSave}
              onClearOverride={handleClearOverride}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
