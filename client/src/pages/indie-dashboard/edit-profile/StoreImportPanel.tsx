import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Check, AlertTriangle } from "lucide-react";
import { SiSteam, SiEpicgames, SiItchdotio } from "react-icons/si";
import { NEON, CARD_BG, CARD_BORDER } from "../../IndieDashboardPage";
import { formatFieldName, formatValue, type Profile, type FieldMeta } from "./types";

interface StoreImportPanelProps {
  profile: Profile | null;
  fieldMeta: FieldMeta;
  onImported: () => void;
}

export function StoreImportPanel({ profile, fieldMeta, onImported }: StoreImportPanelProps) {
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
      for (const k of Array.from(selectedFields)) { if (k in data) fields[k] = data[k]; }
      const res = await apiRequest("POST", "/api/indie/import", {
        source: previewSource, fields,
        ...(previewSource === "steam" && previewAppId ? { steamAppId: previewAppId } : {}),
        ...(previewSource === "epic" && previewSlug ? { epicSlug: previewSlug } : {}),
        ...(previewSource === "itch" && selectedItchGame ? { itchGameUrl: selectedItchGame.url } : {}),
      });
      return res.json();
    },
    onSuccess: async (data: any) => {
      const protectedFields: string[] = data.protected ?? [];
      const msg = protectedFields.length > 0
        ? `${data.imported ?? 0} field${data.imported !== 1 ? "s" : ""} imported. ${protectedFields.length} preserved (manual override): ${protectedFields.map(formatFieldName).join(", ")}.`
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
      const data = await (await apiRequest("GET", `/api/indie/steam/preview?appId=${appId}`)).json();
      setPreviewData(data); setPreviewSource("steam"); setPreviewAppId(appId);
      setSelectedFields(new Set(Object.keys(data.fields ?? {}).filter((k: string) => (data.fields as any)[k] !== null && (data.fields as any)[k] !== undefined)));
    } catch { toast({ description: "Steam app not found. Check the App ID.", variant: "gamefolioError" }); }
    finally { setIsPreviewing(false); }
  };

  const fetchEpic = async () => {
    if (!epicInput.trim()) return toast({ description: "Enter an Epic slug", variant: "gamefolioError" });
    setIsPreviewing(true);
    try {
      const data = await (await apiRequest("GET", `/api/indie/epic/preview?slug=${encodeURIComponent(epicInput.trim())}`)).json();
      setPreviewData(data); setPreviewSource("epic"); setPreviewSlug(epicInput.trim());
      setSelectedFields(new Set(Object.keys(data.fields ?? {}).filter((k: string) => (data.fields as any)[k] !== null)));
    } catch { toast({ description: "Epic product not found. Check the slug.", variant: "gamefolioError" }); }
    finally { setIsPreviewing(false); }
  };

  const fetchItch = async () => {
    if (!itchKey.trim()) return toast({ description: "Enter your itch.io API key", variant: "gamefolioError" });
    setIsFetchingItch(true);
    try {
      const data = await (await apiRequest("POST", "/api/indie/itch/preview", { apiKey: itchKey })).json();
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
          <label className="text-xs text-white/50">Steam App ID <span className="opacity-50">(from store URL: .../app/730/...)</span></label>
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
            <label className="text-xs text-white/50">itch.io API key <span className="opacity-50">(itch.io/user/settings/api-keys — proves ownership)</span></label>
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
