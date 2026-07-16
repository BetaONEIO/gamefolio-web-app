import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Check, AlertTriangle, ShieldCheck, ShieldAlert,
  Copy, KeyRound, LogOut, ExternalLink, ChevronRight,
} from "lucide-react";
import { SiSteam, SiEpicgames, SiItchdotio } from "react-icons/si";
import { NEON, CARD_BG, CARD_BORDER } from "../../IndieDashboardPage";
import { formatFieldName, formatValue, type Profile, type FieldMeta } from "./types";

interface StoreImportPanelProps {
  profile: Profile | null;
  fieldMeta: FieldMeta;
  onImported: () => void;
  onGoToStoreLinks?: () => void;
}

export function StoreImportPanel({ profile, fieldMeta, onImported, onGoToStoreLinks }: StoreImportPanelProps) {
  const { toast } = useToast();
  const [tab, setTab] = useState<"steam" | "epic" | "itch">("steam");
  const [epicInput, setEpicInput] = useState(profile?.epicSlug ?? "");
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewSource, setPreviewSource] = useState("");
  const [previewAppId, setPreviewAppId] = useState("");
  const [previewSlug, setPreviewSlug] = useState("");
  const [selectedItchGame, setSelectedItchGame] = useState<any>(null);
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [isPreviewing, setIsPreviewing] = useState(false);

  // ── Steam verification state ──
  const { data: steamStatus, refetch: refetchSteamStatus } = useQuery<any>({
    queryKey: ["/api/indie/steam/status"],
  });
  const [steamVerifLoading, setSteamVerifLoading] = useState(false);
  const [steamVerifStep, setSteamVerifStep] = useState<"idle" | "code" | "checking">("idle");
  const [steamVerifCode, setSteamVerifCode] = useState<{ code: string; steamAppId: string; expiresAt: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showManualSteam, setShowManualSteam] = useState(false);
  const [manualSteamId, setManualSteamId] = useState(profile?.steamAppId ?? "");

  const startSteamVerif = async () => {
    setSteamVerifLoading(true);
    try {
      const res = await fetch("/api/indie/steam/start-verification", { method: "POST", credentials: "include" });
      const data = await res.json();
      if (!res.ok) { toast({ description: data.message || "Could not start verification", variant: "gamefolioError" }); return; }
      setSteamVerifCode(data);
      setSteamVerifStep("code");
    } catch { toast({ description: "Verification start failed", variant: "gamefolioError" }); }
    finally { setSteamVerifLoading(false); }
  };

  const checkSteamVerif = async () => {
    setSteamVerifStep("checking");
    try {
      const res = await fetch("/api/indie/steam/verify", { method: "POST", credentials: "include" });
      const data = await res.json();
      if (!res.ok) {
        toast({ description: data.message || "Code not found yet — save on Steam first", variant: "gamefolioError" });
        setSteamVerifStep("code"); return;
      }
      toast({ description: `Steam ownership verified! App ${data.steamVerifiedAppId}` });
      setSteamVerifStep("idle"); setSteamVerifCode(null);
      refetchSteamStatus();
    } catch { toast({ description: "Verification check failed", variant: "gamefolioError" }); setSteamVerifStep("code"); }
  };

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(true); setTimeout(() => setCopiedCode(false), 2000);
  };

  // ── itch.io connection state ──
  const { data: itchStatus, refetch: refetchItchStatus } = useQuery<any>({
    queryKey: ["/api/indie/itch/status"],
  });
  const [showItchConnect, setShowItchConnect] = useState(false);
  const [itchKeyInput, setItchKeyInput] = useState("");
  const [itchConnecting, setItchConnecting] = useState(false);
  const [itchPreviewLoading, setItchPreviewLoading] = useState(false);
  const [itchPreviewGameId, setItchPreviewGameId] = useState<number | null>(null);

  const connectItch = async () => {
    if (!itchKeyInput.trim()) return;
    setItchConnecting(true);
    try {
      const res = await fetch("/api/indie/itch/connect", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: itchKeyInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { toast({ description: data.error || "Failed to connect itch.io", variant: "gamefolioError" }); return; }
      toast({ description: `Connected as @${data.itchUsername}!` });
      setItchKeyInput(""); setShowItchConnect(false);
      refetchItchStatus();
    } catch { toast({ description: "itch.io connection failed", variant: "gamefolioError" }); }
    finally { setItchConnecting(false); }
  };

  const disconnectItch = async () => {
    await fetch("/api/indie/itch/disconnect", { method: "DELETE", credentials: "include" });
    refetchItchStatus();
    toast({ description: "itch.io disconnected" });
  };

  const fetchItchGameDetails = async (gameId: number) => {
    setItchPreviewLoading(true); setItchPreviewGameId(gameId);
    try {
      const res = await fetch(`/api/indie/itch/game/${gameId}`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) { toast({ description: data.error || "Failed to fetch game details", variant: "gamefolioError" }); return; }
      setPreviewData(data); setPreviewSource("itch");
      setSelectedItchGame({ id: gameId, url: data.url });
      setSelectedFields(new Set(Object.keys(data.fields ?? {}).filter(k => data.fields[k] != null)));
    } catch { toast({ description: "Failed to load game details", variant: "gamefolioError" }); }
    finally { setItchPreviewLoading(false); setItchPreviewGameId(null); }
  };

  // ── Steam preview (manual or from connected app) ──
  const fetchSteam = async (appId?: string) => {
    const id = (appId ?? manualSteamId).replace(/\D/g, "");
    if (!id) return toast({ description: "No App ID available", variant: "gamefolioError" });
    setIsPreviewing(true);
    try {
      const data = await (await apiRequest("GET", `/api/indie/steam/preview?appId=${id}`)).json();
      setPreviewData(data); setPreviewSource("steam"); setPreviewAppId(id);
      setSelectedFields(new Set(Object.keys(data.fields ?? {}).filter((k: string) => (data.fields as any)[k] != null)));
    } catch { toast({ description: "Steam app not found.", variant: "gamefolioError" }); }
    finally { setIsPreviewing(false); }
  };

  const fetchEpic = async () => {
    if (!epicInput.trim()) return toast({ description: "Enter an Epic slug", variant: "gamefolioError" });
    setIsPreviewing(true);
    try {
      const data = await (await apiRequest("GET", `/api/indie/epic/preview?slug=${encodeURIComponent(epicInput.trim())}`)).json();
      setPreviewData(data); setPreviewSource("epic"); setPreviewSlug(epicInput.trim());
      setSelectedFields(new Set(Object.keys(data.fields ?? {}).filter((k: string) => (data.fields as any)[k] !== null)));
    } catch { toast({ description: "Epic product not found.", variant: "gamefolioError" }); }
    finally { setIsPreviewing(false); }
  };

  const toggleField = (k: string) => {
    const next = new Set(selectedFields);
    if (next.has(k)) next.delete(k); else next.add(k);
    setSelectedFields(next);
  };

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
        ? `${data.imported ?? 0} field${data.imported !== 1 ? "s" : ""} imported. ${protectedFields.length} preserved (manual override).`
        : `${data.imported ?? selectedFields.size} field${(data.imported ?? selectedFields.size) !== 1 ? "s" : ""} imported.`;
      toast({ description: msg, duration: protectedFields.length > 0 ? 6000 : 3000 });
      await queryClient.invalidateQueries({ queryKey: ["/api/indie/profile"] });
      setPreviewData(null); setSelectedFields(new Set()); onImported();
    },
    onError: () => toast({ description: "Import failed.", variant: "gamefolioError" }),
  });

  const previewFields = previewData?.fields ?? {};
  const previewEntries = Object.entries(previewFields).filter(([, v]) => v !== null && v !== undefined);
  const steamVerified = steamStatus?.verified;
  const itchConnected = itchStatus?.connected;

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }}>
        {(["steam", "epic", "itch"] as const).map(t => (
          <button key={t} onClick={() => { setTab(t); setPreviewData(null); setSelectedFields(new Set()); }}
            className="flex-1 flex items-center justify-center gap-2 py-1.5 rounded text-xs font-bold transition-all"
            style={{ background: tab === t ? CARD_BG : "transparent", border: tab === t ? `1px solid ${CARD_BORDER}` : "1px solid transparent", color: tab === t ? "white" : "rgba(255,255,255,0.4)" }}>
            {t === "steam" && <SiSteam size={13} className="text-[#66c0f4]" />}
            {t === "epic" && <SiEpicgames size={13} />}
            {t === "itch" && <SiItchdotio size={13} className="text-[#fa5c5c]" />}
            {t === "steam" ? "Steam" : t === "epic" ? "Epic Games" : "itch.io"}
            {t === "steam" && steamVerified && <span className="w-1.5 h-1.5 rounded-full bg-green-400 ml-0.5" />}
            {t === "itch" && itchConnected && <span className="w-1.5 h-1.5 rounded-full bg-[#fa5c5c] ml-0.5" />}
          </button>
        ))}
      </div>

      {/* ── STEAM TAB ── */}
      {!previewData && tab === "steam" && (
        <div className="space-y-3">
          {steamVerified ? (
            /* Connected: one-click pull */
            <div className="rounded-lg p-3.5 space-y-3" style={{ background: "rgba(102,192,244,0.07)", border: "1px solid rgba(102,192,244,0.25)" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={13} className="text-[#66c0f4]" />
                  <span className="text-xs font-bold text-[#66c0f4]">
                    Connected · App {steamStatus.steamVerifiedAppId}
                  </span>
                </div>
                <button onClick={() => fetchSteam(steamStatus.steamVerifiedAppId)} disabled={isPreviewing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold"
                  style={{ background: "#66c0f4", color: "#000" }}>
                  {isPreviewing ? <Loader2 size={12} className="animate-spin" /> : <SiSteam size={12} />}
                  Pull from Steam
                </button>
              </div>
              <p className="text-[11px] text-white/40">
                Pulls live data from your verified Steam store page. Pick which fields to apply below.
              </p>
            </div>
          ) : (
            /* Not connected: show verification flow */
            <div className="rounded-lg p-3.5 space-y-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <div className="flex items-center gap-2">
                <ShieldAlert size={13} className="text-white/30" />
                <span className="text-xs font-bold text-white/50">No Steam game connected</span>
              </div>

              {steamVerifStep === "idle" && (
                <div className="space-y-2">
                  <p className="text-[11px] text-white/40">
                    Prove ownership by adding a short code to your Steam store page description. Set your Steam App ID in Store Links first, then click Verify.
                  </p>
                  <button onClick={startSteamVerif} disabled={steamVerifLoading || !profile?.steamAppId}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold"
                    style={{ background: "#66c0f4", color: "#000", opacity: !profile?.steamAppId ? 0.4 : 1 }}>
                    {steamVerifLoading ? <Loader2 size={12} className="animate-spin" /> : <SiSteam size={12} />}
                    Verify Steam Ownership
                  </button>
                  {!profile?.steamAppId && (
                    <button
                      onClick={onGoToStoreLinks}
                      className="text-[10px] text-yellow-500/70 underline underline-offset-2 hover:text-yellow-400 transition-colors text-left"
                    >
                      Add your Steam App ID in Store Links section first →
                    </button>
                  )}
                </div>
              )}

              {(steamVerifStep === "code" || steamVerifStep === "checking") && steamVerifCode && (
                <div className="space-y-2.5">
                  <p className="text-[11px] text-white/50">
                    <strong className="text-white">Step 1:</strong> Copy this code, paste it into your Steam store page description (About the Game or Short Description), then save.
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 font-mono text-sm font-bold px-3 py-2 rounded select-all"
                      style={{ background: "rgba(183,255,24,0.08)", color: NEON, border: "1px solid rgba(183,255,24,0.2)", letterSpacing: "0.1em" }}>
                      {steamVerifCode.code}
                    </div>
                    <button onClick={() => copyCode(steamVerifCode.code)}
                      className="p-2 rounded border border-white/10 hover:border-white/30 transition-colors">
                      {copiedCode ? <Check size={13} style={{ color: NEON }} /> : <Copy size={13} className="text-white/40" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-white/50">
                    <strong className="text-white">Step 2:</strong> After saving on Steam, click below to confirm the code is live.
  </p>
                  <div className="flex gap-2">
                    <button onClick={checkSteamVerif} disabled={steamVerifStep === "checking"}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold"
                      style={{ background: NEON, color: "#070b10" }}>
                      {steamVerifStep === "checking" ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                      Check Verification
                    </button>
                    <button onClick={() => { setSteamVerifStep("idle"); setSteamVerifCode(null); }}
                      className="px-3 py-1.5 rounded text-xs font-bold text-white/40 border border-white/10 hover:text-white/70">
                      Cancel
                    </button>
                  </div>
                  <p className="text-[10px] text-white/20">Code expires {new Date(steamVerifCode.expiresAt).toLocaleTimeString()}</p>
                </div>
              )}
            </div>
          )}

          {/* Manual App ID fallback */}
          <details className="group">
            <summary className="text-[11px] text-white/30 hover:text-white/60 cursor-pointer list-none flex items-center gap-1 select-none">
              <ChevronRight size={11} className="transition-transform group-open:rotate-90" />
              Pull a different App ID manually
            </summary>
            <div className="flex gap-2 mt-2">
              <input value={manualSteamId} onChange={e => setManualSteamId(e.target.value)}
                onKeyDown={e => e.key === "Enter" && fetchSteam()}
                placeholder="e.g. 730" className="flex-1 bg-transparent border rounded px-3 py-2 text-sm text-white outline-none"
                style={{ borderColor: "rgba(255,255,255,0.2)" }} />
              <button onClick={() => fetchSteam()} disabled={isPreviewing || !manualSteamId.trim()}
                className="px-4 py-2 rounded text-xs font-bold flex items-center gap-1.5"
                style={{ background: NEON, color: "#070b10" }}>
                {isPreviewing ? <Loader2 size={12} className="animate-spin" /> : "Preview"}
              </button>
            </div>
          </details>
        </div>
      )}

      {/* ── EPIC TAB ── */}
      {!previewData && tab === "epic" && (
        <div className="space-y-2">
          <label className="text-xs text-white/50">
            Epic Games slug <span className="opacity-50">(from store URL: .../p/your-game-slug)</span>
          </label>
          <div className="flex gap-2">
            <input value={epicInput} onChange={e => setEpicInput(e.target.value)} onKeyDown={e => e.key === "Enter" && fetchEpic()}
              placeholder="e.g. fortnite" className="flex-1 bg-transparent border rounded px-3 py-2 text-sm text-white outline-none"
              style={{ borderColor: "rgba(255,255,255,0.2)" }} />
            <button onClick={fetchEpic} disabled={isPreviewing}
              className="px-4 py-2 rounded text-xs font-bold flex items-center gap-1.5"
              style={{ background: NEON, color: "#070b10" }}>
              {isPreviewing ? <Loader2 size={13} className="animate-spin" /> : "Preview"}
            </button>
          </div>
        </div>
      )}

      {/* ── ITCH.IO TAB ── */}
      {!previewData && tab === "itch" && (
        <div className="space-y-3">
          {itchConnected ? (
            <>
              {/* Connected banner */}
              <div className="flex items-center justify-between rounded-lg px-3.5 py-2.5"
                style={{ background: "rgba(250,92,92,0.08)", border: "1px solid rgba(250,92,92,0.25)" }}>
                <div className="flex items-center gap-2">
                  <SiItchdotio size={13} style={{ color: "#fa5c5c" }} />
                  <span className="text-xs font-bold text-white">
                    @{itchStatus.itchUsername}
                    <span className="text-white/40 font-normal ml-1">· {itchStatus.games?.length ?? 0} game{itchStatus.games?.length !== 1 ? "s" : ""}</span>
                  </span>
                </div>
                <button onClick={disconnectItch} className="flex items-center gap-1 text-[11px] text-white/30 hover:text-red-400 transition-colors">
                  <LogOut size={10} /> Disconnect
                </button>
              </div>

              {/* Games list */}
              {(itchStatus.games?.length ?? 0) === 0 ? (
                <p className="text-xs text-white/30 py-1">No games found on this account.</p>
              ) : (
                <div className="space-y-1.5">
                  <p className="text-xs text-white/50">Select your game to import:</p>
                  <div className="max-h-52 overflow-y-auto pr-0.5 space-y-1.5">
                    {itchStatus.games.map((g: any) => (
                      <button key={g.id} onClick={() => fetchItchGameDetails(g.id)}
                        disabled={itchPreviewLoading}
                        className="w-full flex items-center gap-3 p-2.5 rounded hover:bg-white/5 transition-colors text-left"
                        style={{ border: `1px solid ${CARD_BORDER}` }}>
                        {g.coverUrl
                          ? <img src={g.coverUrl} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                          : <div className="w-10 h-10 rounded shrink-0 flex items-center justify-center" style={{ background: "rgba(250,92,92,0.15)" }}><SiItchdotio size={16} style={{ color: "#fa5c5c" }} /></div>
                        }
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-white truncate">{g.title}</div>
                          <div className="text-[11px] text-white/40 truncate">{g.url}</div>
                        </div>
                        {itchPreviewLoading && itchPreviewGameId === g.id
                          ? <Loader2 size={13} className="animate-spin text-white/30 shrink-0" />
                          : <ChevronRight size={13} className="text-white/20 shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Not connected: show connect flow */
            <div className="rounded-lg p-3.5 space-y-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <div className="flex items-center gap-2">
                <KeyRound size={13} className="text-white/30" />
                <span className="text-xs font-bold text-white/50">Connect your itch.io account</span>
              </div>
              <p className="text-[11px] text-white/40">
                Generate an API key on itch.io and paste it below. Your games will appear and your key is saved so you don't need to re-enter it.
              </p>
              {!showItchConnect ? (
                <div className="flex gap-2">
                  <button onClick={() => setShowItchConnect(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold"
                    style={{ background: "#fa5c5c", color: "#fff" }}>
                    <SiItchdotio size={12} /> Connect itch.io
                  </button>
                  <a href="https://itch.io/user/settings/api-keys" target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 px-3 py-1.5 rounded text-xs text-white/40 border border-white/10 hover:text-white/70 transition-colors">
                    Get API Key <ExternalLink size={10} />
                  </a>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input type="password" value={itchKeyInput} onChange={e => setItchKeyInput(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && connectItch()}
                      placeholder="Paste your itch.io API key…"
                      className="flex-1 bg-transparent border rounded px-3 py-2 text-sm text-white outline-none font-mono"
                      style={{ borderColor: "rgba(255,255,255,0.2)" }} />
                    <button onClick={connectItch} disabled={itchConnecting || !itchKeyInput.trim()}
                      className="px-4 py-2 rounded text-xs font-bold"
                      style={{ background: "#fa5c5c", color: "#fff", opacity: itchConnecting || !itchKeyInput.trim() ? 0.6 : 1 }}>
                      {itchConnecting ? <Loader2 size={13} className="animate-spin" /> : "Connect"}
                    </button>
                    <button onClick={() => { setShowItchConnect(false); setItchKeyInput(""); }}
                      className="px-3 py-2 rounded text-xs text-white/30 border border-white/10 hover:text-white/60">
                      Cancel
                    </button>
                  </div>
                  <a href="https://itch.io/user/settings/api-keys" target="_blank" rel="noopener noreferrer"
                    className="text-[10px] text-white/25 hover:text-white/50 flex items-center gap-1">
                    <ExternalLink size={9} /> itch.io → Account Settings → API Keys → Generate new API key
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── FIELD PICKER (all sources) ── */}
      {previewData && previewEntries.length > 0 && (
        <div className="space-y-3">
          {/* Header with game name for itch preview */}
          {previewSource === "itch" && previewData.name && (
            <div className="flex items-center gap-2.5 py-1">
              {previewData.coverUrl && <img src={previewData.coverUrl} alt="" className="w-9 h-9 rounded object-cover shrink-0" />}
              <div>
                <div className="text-sm font-bold text-white">{previewData.name}</div>
                <div className="text-[11px] text-white/40">{previewData.url}</div>
              </div>
            </div>
          )}

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
                      {hasOverride && <span className="flex items-center gap-0.5 text-[9px] text-yellow-400"><AlertTriangle size={9} /> manual edit</span>}
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
            <button onClick={() => { setPreviewData(null); setSelectedFields(new Set()); }}
              className="px-4 py-2 rounded text-xs font-bold text-white/60 border border-white/15 hover:text-white">
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
