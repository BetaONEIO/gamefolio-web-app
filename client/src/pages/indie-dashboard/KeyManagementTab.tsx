import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import {
  KeyRound, Upload, X, CheckCircle2,
  ChevronDown, ChevronRight, Shield, Lock,
  Loader2, FileText, ClipboardList, Check,
  AlertCircle, Gamepad2,
} from "lucide-react";
import {
  SiSteam, SiEpicgames, SiItchdotio,
  SiPlaystation, SiNintendo,
} from "react-icons/si";
import { NEON, CARD_BG, CARD_BORDER, DASHBOARD_THEME, rgbaAccent } from "./constants";

// ─── Types ────────────────────────────────────────────────────────────────────

type KeyType = "demo" | "full";
type Platform = "steam" | "epic" | "itch" | "xbox" | "playstation" | "switch" | "other";
type CardPhase = "idle" | "dragging" | "processing" | "preview" | "uploading" | "done";

interface BountyData {
  id: number;
  title: string;
  gameName: string | null;
  gameImageUrl: string | null;
  status: string;
  demoKeysRemaining: number;
  fullKeysRemaining: number;
  participantCount: number;
  maxParticipants: number | null;
}

interface BountyKeyStatus {
  demoKeysRemaining: number;
  fullKeysRemaining: number;
  demoKeysDistributed: number;
  fullKeysDistributed: number;
}

interface BountyStatus {
  status: string;
  demoKeys: { uploaded: number; valid: number; available: number; claimed: number };
  fullGameKeys: { uploaded: number; valid: number; available: number; awarded: number };
}

interface ParsedKey {
  value: string;
  platform: Platform;
  region: string;
}

interface UploadValidation {
  total: number;
  valid: ParsedKey[];
  duplicates: string[];
  invalid: string[];
  missingPlatform: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PLATFORMS: { id: Platform; label: string; icon: any }[] = [
  { id: "steam",       label: "Steam",          icon: SiSteam },
  { id: "epic",        label: "Epic Games",      icon: SiEpicgames },
  { id: "itch",        label: "itch.io",         icon: SiItchdotio },
  { id: "xbox",        label: "Xbox",            icon: Gamepad2 },
  { id: "playstation", label: "PlayStation",     icon: SiPlaystation },
  { id: "switch",      label: "Nintendo Switch", icon: SiNintendo },
  { id: "other",       label: "Other",           icon: KeyRound },
];

const PROCESS_STEPS = ["Uploading…", "Validating…", "Checking duplicates…", "Import Complete"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseCSVLine(line: string): { key: string; platform: string; region: string } | null {
  const parts = line.split(",").map(s => s.trim());
  if (parts.length < 1 || !parts[0]) return null;
  return { key: parts[0], platform: parts[1] ?? "", region: parts[2] ?? "" };
}

function validateKeys(
  rawLines: string[],
  defaultPlatform: Platform,
  isCSV = false,
): UploadValidation {
  const seen = new Set<string>();
  const valid: ParsedKey[] = [];
  const duplicates: string[] = [];
  const invalid: string[] = [];
  const missingPlatform: string[] = [];

  for (const raw of rawLines) {
    const line = raw.trim();
    if (!line) continue;

    let keyVal = line;
    let platform: Platform = defaultPlatform;
    let region = "";

    if (isCSV) {
      const parsed = parseCSVLine(line);
      if (!parsed) { invalid.push(line); continue; }
      keyVal = parsed.key;
      platform = (PLATFORMS.find(p =>
        p.id === parsed.platform.toLowerCase() ||
        p.label.toLowerCase() === parsed.platform.toLowerCase()
      )?.id) ?? defaultPlatform;
      if (!parsed.platform) missingPlatform.push(keyVal);
      region = parsed.region;
    }

    if (keyVal.length < 4) { invalid.push(keyVal); continue; }
    if (seen.has(keyVal)) { duplicates.push(keyVal); continue; }

    seen.add(keyVal);
    valid.push({ value: keyVal, platform, region });
  }

  return { total: rawLines.filter(l => l.trim()).length, valid, duplicates, invalid, missingPlatform };
}

// ─── Upload Card ──────────────────────────────────────────────────────────────

function UploadCard({
  keyType,
  available,
  required,
  bounties,
}: {
  keyType: KeyType;
  available: number;
  required: number;
  bounties: BountyData[];
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<CardPhase>("idle");
  const [isDragging, setIsDragging] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [validation, setValidation] = useState<UploadValidation | null>(null);
  const [processStep, setProcessStep] = useState(0);
  const [doneCount, setDoneCount] = useState(0);
  const [displayCount, setDisplayCount] = useState(available);

  const isDone = available >= required && required > 0;
  const pct = required > 0 ? Math.min(100, Math.round((available / required) * 100)) : (available > 0 ? 100 : 0);

  const isDemo = keyType === "demo";
  const accent = DASHBOARD_THEME.accent;
  const accentRgb = DASHBOARD_THEME.accentRgb;
  const label = isDemo ? "Demo Keys" : "Full Game Keys";
  const desc = isDemo
    ? "Store demo keys securely for your game."
    : "Store full-game keys securely for your game.";

  // Animate count up on success
  useEffect(() => {
    if (phase !== "done") { setDisplayCount(available); return; }
    const target = available + doneCount;
    let current = available;
    const step = Math.ceil(doneCount / 20);
    const interval = setInterval(() => {
      current = Math.min(current + step, target);
      setDisplayCount(current);
      if (current >= target) clearInterval(interval);
    }, 40);
    return () => clearInterval(interval);
  }, [phase, available, doneCount]);

  const uploadMutation = useMutation({
    mutationFn: async (keys: ParsedKey[]) => {
      const keyValues = keys.map(k => k.value);
      if (bounties.length === 1) {
        const demoKeys = keyType === "demo" ? keyValues : [];
        const fullKeys = keyType === "full" ? keyValues : [];
        const res = await apiRequest("POST", `/api/games/bounties/${bounties[0].id}/keys`, { demoKeys, fullKeys });
        return res.json();
      } else {
        const res = await apiRequest("POST", "/api/campaigns/auto/keys", { keyType, keys: keyValues });
        const data = await res.json();
        return { added: data.added ?? 0 };
      }
    },
    onSuccess: (data) => {
      const added = data.demoKeysAdded ?? data.fullKeysAdded ?? data.added ?? 0;
      setDoneCount(added);
      setPhase("done");
      queryClient.invalidateQueries({ queryKey: ["/api/games/indie/bounties"] });
      queryClient.invalidateQueries({ queryKey: ["/api/indie/bounty-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns/overview"] });
    },
    onError: () => {
      toast({ title: "Upload failed", description: "Could not upload keys.", variant: "gamefolioError" as any });
      setPhase("idle");
    },
  });

  const runProcessAnimation = useCallback((v: UploadValidation) => {
    setValidation(v);
    setPhase("processing");
    setProcessStep(0);
    let s = 0;
    const advance = () => {
      s++;
      setProcessStep(s);
      if (s < PROCESS_STEPS.length - 1) {
        setTimeout(advance, 600 + Math.random() * 300);
      } else {
        setTimeout(() => setPhase("preview"), 500);
      }
    };
    setTimeout(advance, 700);
  }, []);

  const handleText = useCallback((text: string, isCSV = false) => {
    const lines = isCSV ? text.split("\n").slice(1) : text.split("\n");
    const result = validateKeys(lines, "steam", isCSV);
    runProcessAnimation(result);
  }, [runProcessAnimation]);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => handleText(ev.target?.result as string ?? "", true);
    reader.readAsText(file);
  }, [handleText]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const confirm = () => {
    if (!validation || validation.valid.length === 0) return;
    setPhase("uploading");
    uploadMutation.mutate(validation.valid);
  };

  const reset = () => {
    setPhase("idle");
    setPasteText("");
    setPasteOpen(false);
    setValidation(null);
    setProcessStep(0);
  };

  return (
    <div className="rounded-2xl overflow-hidden flex flex-col"
      style={{
        background: rgbaAccent(0.04),
        border: `1px solid ${rgbaAccent(0.16)}`,
        transition: "box-shadow 0.2s",
      }}>

      {/* Card header */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
             style={{ background: rgbaAccent(0.14) }}>
            <KeyRound className="w-4 h-4" style={{ color: accent }} />
          </div>
          <h3 className="text-base font-black text-white">{label}</h3>
        </div>
        <p className="text-xs text-white/40 leading-relaxed pl-11">{desc}</p>
      </div>

      {/* Progress bar */}
      <div className="px-5 pb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>
            {required > 0 ? `${displayCount} / ${required} Imported` : `${displayCount} Imported`}
          </span>
          {isDone && (
            <span className="flex items-center gap-1 text-[10px] font-black" style={{ color: NEON }}>
              <Check className="w-3 h-3" /> Ready
            </span>
          )}
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${pct}%`,
               background: isDone ? DASHBOARD_THEME.success : `rgba(${accentRgb},0.8)`,
            }}
          />
        </div>
        {required > 0 && !isDone && (
          <p className="text-[10px] mt-1 text-white/20">{required - available} remaining</p>
        )}
      </div>

      {/* Upload zone / states */}
      <div className="px-5 pb-5 flex-1 flex flex-col gap-3">

        {/* ── IDLE or DRAGGING ── */}
        {(phase === "idle" || phase === "dragging") && (
          <>
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
              className="rounded-xl flex flex-col items-center justify-center text-center cursor-pointer select-none transition-all duration-200"
              style={{
                minHeight: "140px",
                 background: isDragging ? rgbaAccent(0.12) : "rgba(255,255,255,0.025)",
                 border: `2px dashed ${isDragging ? accent : DASHBOARD_THEME.border}`,
                 boxShadow: isDragging ? `0 0 24px ${rgbaAccent(0.18)}` : "none",
              }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-all duration-200"
                 style={{ background: isDragging ? rgbaAccent(0.2) : CARD_BG }}>
                <Upload className="w-5 h-5 transition-colors" style={{ color: isDragging ? accent : "rgba(255,255,255,0.25)" }} />
              </div>
              <p className="text-sm font-bold text-white/50 mb-1">
                {isDragging ? "Drop to upload" : "Drag CSV here"}
              </p>
              <p className="text-xs text-white/25">or</p>
              <p className="text-xs font-bold mt-1" style={{ color: accent }}>Browse Files</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
            />

            {/* Paste toggle */}
            <button
              onClick={() => setPasteOpen(v => !v)}
              className="flex items-center gap-1.5 text-xs font-bold text-white/30 hover:text-white/60 transition-colors w-fit mx-auto">
              <ClipboardList className="w-3.5 h-3.5" />
              Paste Keys Manually
              {pasteOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>

            {pasteOpen && (
              <div className="space-y-2">
                <textarea
                  value={pasteText}
                  onChange={e => setPasteText(e.target.value)}
                  placeholder={"One key per line:\nXXXXX-XXXXX-XXXXX"}
                  rows={5}
                  className="w-full rounded-xl text-xs font-mono text-white/70 resize-none p-3 outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                />
                <button
                  onClick={() => pasteText.trim() && handleText(pasteText)}
                  disabled={!pasteText.trim()}
                  className="w-full py-2 rounded-xl text-xs font-black transition-all hover:brightness-110 disabled:opacity-30"
                   style={{ background: rgbaAccent(0.15), color: accent, border: `1px solid ${rgbaAccent(0.25)}` }}>
                  Validate Keys
                </button>
              </div>
            )}
          </>
        )}

        {/* ── PROCESSING ── */}
        {phase === "processing" && (
          <div className="rounded-xl flex flex-col items-center justify-center py-10 gap-5"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: accent }} />
            <div className="space-y-2 w-full max-w-[180px]">
              {PROCESS_STEPS.map((s, i) => (
                <div key={s} className="flex items-center gap-2 transition-all duration-300"
                  style={{ opacity: i <= processStep ? 1 : 0.2 }}>
                  {i < processStep ? (
                    <Check className="w-3.5 h-3.5 shrink-0" style={{ color: NEON }} />
                  ) : i === processStep ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" style={{ color: accent }} />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ background: "rgba(255,255,255,0.1)" }} />
                  )}
                  <span className="text-xs font-semibold" style={{ color: i <= processStep ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.2)" }}>
                    {s}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── PREVIEW ── */}
        {phase === "preview" && validation && (
          <div className="space-y-3">
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Valid",       value: validation.valid.length,      color: NEON },
                { label: "Duplicates", value: validation.duplicates.length, color: "#f59e0b" },
                { label: "Invalid",    value: validation.invalid.length,    color: "#f87171" },
              ].map(({ label: l, value, color }) => (
                <div key={l} className="rounded-xl py-3 text-center"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="text-lg font-black" style={{ color }}>{value}</div>
                  <div className="text-[9px] text-white/30 uppercase tracking-wider mt-0.5">{l}</div>
                </div>
              ))}
            </div>

            {/* Key preview */}
            {validation.valid.length > 0 && (
              <div className="rounded-xl p-3 space-y-1.5"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <p className="text-[9px] text-white/25 uppercase tracking-wider mb-2">
                  Preview ({Math.min(3, validation.valid.length)} of {validation.valid.length})
                </p>
                {validation.valid.slice(0, 3).map((k, i) => (
                  <div key={i} className="text-[10px] font-mono text-white/40 truncate">
                    {k.value.slice(0, 4)}••••••••••{k.value.slice(-4)}
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={reset}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white/40 hover:text-white/70 transition-colors"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                Cancel
              </button>
              <button
                onClick={confirm}
                disabled={validation.valid.length === 0}
                className="flex-1 py-2.5 rounded-xl text-xs font-black transition-all hover:brightness-110 disabled:opacity-30"
                 style={{ background: rgbaAccent(0.18), color: accent, border: `1px solid ${rgbaAccent(0.3)}` }}>
                Add {validation.valid.length} Key{validation.valid.length !== 1 ? "s" : ""}
              </button>
            </div>
          </div>
        )}

        {/* ── UPLOADING ── */}
        {phase === "uploading" && (
          <div className="rounded-xl flex flex-col items-center justify-center py-10 gap-3"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: accent }} />
            <p className="text-xs font-semibold text-white/40">Securing keys in vault…</p>
          </div>
        )}

        {/* ── DONE ── */}
        {phase === "done" && (
          <div className="rounded-xl flex flex-col items-center justify-center py-8 gap-4 text-center"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center animate-[scale-in_0.3s_ease-out]"
              style={{ background: `rgba(${accentRgb},0.12)` }}>
              <CheckCircle2 className="w-6 h-6" style={{ color: accent }} />
            </div>
            <div>
              <p className="text-sm font-black text-white mb-1">Import Complete</p>
              <p className="text-[11px] text-white/40">
                ✓ {doneCount} Key{doneCount !== 1 ? "s" : ""} Imported
              </p>
              {validation && validation.duplicates.length > 0 && (
                <p className="text-[11px] text-white/30">· {validation.duplicates.length} Duplicates skipped</p>
              )}
              {validation && validation.invalid.length > 0 && (
                <p className="text-[11px] text-white/30">· {validation.invalid.length} Invalid skipped</p>
              )}
            </div>
            <button onClick={reset}
              className="text-xs font-bold transition-colors hover:text-white/70"
              style={{ color: "rgba(255,255,255,0.35)" }}>
              Upload More
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Campaign Vault Card ───────────────────────────────────────────────────────

function VaultCard({ bounty }: { bounty: BountyData }) {
  const [expanded, setExpanded] = useState(false);
  const { data: keyStatus } = useQuery<BountyKeyStatus>({
    queryKey: ["/api/games/bounties", bounty.id, "keys"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/games/bounties/${bounty.id}/keys`);
      return res.json();
    },
    enabled: expanded,
  });

  const demoRemaining  = keyStatus?.demoKeysRemaining   ?? bounty.demoKeysRemaining;
  const fullRemaining  = keyStatus?.fullKeysRemaining   ?? bounty.fullKeysRemaining;
  const demoDistributed = keyStatus?.demoKeysDistributed ?? 0;
  const fullDistributed = keyStatus?.fullKeysDistributed ?? 0;
  const demoTotal = demoRemaining + demoDistributed;
  const fullTotal = fullRemaining + fullDistributed;
  const statusColor = bounty.status === "active" ? NEON
    : bounty.status === "completed" ? "#34d399"
    : bounty.status === "draft" ? "#94a3b8" : "#f59e0b";

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="flex items-center gap-4 p-4 cursor-pointer select-none"
        onClick={() => setExpanded(v => !v)}>
        {bounty.gameImageUrl ? (
          <img src={bounty.gameImageUrl} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center"
            style={{ background: "rgba(183,255,24,0.08)" }}>
            <Shield className="w-5 h-5" style={{ color: NEON }} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white truncate">{bounty.title}</span>
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wide shrink-0"
              style={{ color: statusColor, background: `${statusColor}16` }}>
              {bounty.status}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-1">
            <span className="text-[10px] text-white/30">
              {bounty.participantCount} / {bounty.maxParticipants ?? "∞"} creators
            </span>
            <span className="text-[10px]" style={{ color: NEON }}>
              {demoRemaining}D · {fullRemaining}F remaining
            </span>
          </div>
        </div>
        <Lock className="w-3.5 h-3.5 text-white/20 shrink-0" />
        {expanded
          ? <ChevronDown className="w-4 h-4 text-white/30 shrink-0" />
          : <ChevronRight className="w-4 h-4 text-white/30 shrink-0" />}
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-0 space-y-4 border-t"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="grid grid-cols-2 gap-3 pt-4">
            {[
              { label: "Demo Keys",      remaining: demoRemaining, distributed: demoDistributed, total: demoTotal },
              { label: "Full Game Keys", remaining: fullRemaining, distributed: fullDistributed, total: fullTotal },
            ].map(({ label, remaining, distributed, total }) => {
              const pct = total > 0 ? Math.round((remaining / total) * 100) : 0;
              const isLow = remaining < 5 && total > 0;
              const barColor = isLow ? "#f87171" : NEON;
              return (
                <div key={label} className="rounded-xl p-3"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="text-[10px] text-white/30 mb-2">{label}</div>
                  <div className="h-1.5 rounded-full mb-2" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: barColor }} />
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <div>
                      <div className="text-sm font-black" style={{ color: barColor }}>{remaining}</div>
                      <div className="text-[9px] text-white/25">Remaining</div>
                    </div>
                    <div>
                      <div className="text-sm font-black text-white">{distributed}</div>
                      <div className="text-[9px] text-white/25">Distributed</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-start gap-2 rounded-xl p-3"
            style={{ background: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.12)" }}>
            <Lock className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
            <p className="text-[10px] text-blue-300/70">
              Committed keys are locked in the Gamefolio Key Vault and cannot be withdrawn while creators are participating.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function KeyManagementTab() {
  const { data: bounties = [], isLoading } = useQuery<BountyData[]>({
    queryKey: ["/api/games/indie/bounties"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: bountyStatus } = useQuery<BountyStatus>({
    queryKey: ["/api/indie/bounty-status"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const demoKeys = bountyStatus?.demoKeys      ?? { available: 0, valid: 0, claimed: 0, uploaded: 0 };
  const fullKeys = bountyStatus?.fullGameKeys  ?? { available: 0, valid: 0, awarded: 0, uploaded: 0 };

  const required = 0;

  return (
    <div className="space-y-7">

      {/* ── Compact hero ── */}
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center"
          style={{ background: "rgba(183,255,24,0.08)", border: "1px solid rgba(183,255,24,0.14)" }}>
          <KeyRound className="w-5 h-5" style={{ color: NEON }} />
        </div>
        <div>
          <h2 className="text-lg font-black text-white mb-0.5">Secure Key Vault</h2>
          <p className="text-xs text-white/40 leading-relaxed max-w-lg">
            Upload your demo and full game keys. Gamefolio validates them automatically and securely stores them until they're distributed to creators.
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {[
              { icon: "🔒", label: "Secure Escrow" },
              { icon: "✓",  label: "Automatic Validation" },
              { icon: "🔑", label: "Smart Distribution" },
            ].map(({ icon, label }) => (
              <span key={label} className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full"
                style={{ background: "rgba(183,255,24,0.07)", color: "rgba(255,255,255,0.45)", border: "1px solid rgba(183,255,24,0.14)" }}>
                {icon} {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Upload cards ── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: NEON }} />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <UploadCard keyType="demo" available={demoKeys.available} required={required} bounties={bounties} />
          <UploadCard keyType="full" available={fullKeys.available} required={required} bounties={bounties} />
        </div>
      )}

    </div>
  );
}
