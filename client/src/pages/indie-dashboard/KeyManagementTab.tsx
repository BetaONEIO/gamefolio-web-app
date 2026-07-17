import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import {
  KeyRound, Plus, Upload, X, AlertTriangle, CheckCircle2,
  ChevronDown, ChevronRight, Download, Shield, Lock,
  Loader2, FileText, ClipboardList, Pencil, Info,
  AlertCircle, Gamepad2,
} from "lucide-react";
import {
  SiSteam, SiEpicgames, SiItchdotio,
  SiPlaystation, SiNintendo,
} from "react-icons/si";
import { NEON, CARD_BG, CARD_BORDER } from "./constants";

// ─── Types ────────────────────────────────────────────────────────────────────

type KeyType = "demo" | "full";
type Platform = "steam" | "epic" | "itch" | "xbox" | "playstation" | "switch" | "other";
type UploadMethod = "paste" | "csv" | "manual";

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
  { id: "steam",       label: "Steam",           icon: SiSteam },
  { id: "epic",        label: "Epic Games",       icon: SiEpicgames },
  { id: "itch",        label: "itch.io",          icon: SiItchdotio },
  { id: "xbox",        label: "Xbox",             icon: Gamepad2 },
  { id: "playstation", label: "PlayStation",      icon: SiPlaystation },
  { id: "switch",      label: "Nintendo Switch",  icon: SiNintendo },
  { id: "other",       label: "Other",            icon: KeyRound },
];

const STATUS_COLORS: Record<string, string> = {
  available: NEON,
  committed: "#60a5fa",
  reserved: "#a78bfa",
  issued: "#f472b6",
  redeemed: "#34d399",
  invalid: "#f87171",
  replaced: "#94a3b8",
  returned: "#fb923c",
};

const KEY_STATUS_LABELS = [
  { id: "available", label: "Available", desc: "Ready to commit to campaigns" },
  { id: "committed", label: "Committed", desc: "Locked in a campaign vault" },
  { id: "reserved",  label: "Reserved",  desc: "Assigned to a creator, not yet revealed" },
  { id: "issued",    label: "Issued",    desc: "Revealed to a creator" },
  { id: "redeemed",  label: "Redeemed",  desc: "Activated by creator" },
  { id: "invalid",   label: "Invalid",   desc: "Rejected during upload validation" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function inferPlatform(key: string): Platform {
  const k = key.trim().toUpperCase();
  if (/^[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}$/.test(k)) return "steam";
  if (/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(k)) return "epic";
  return "other";
}

function parseCSVLine(line: string): { key: string; platform: string; region: string } | null {
  const parts = line.split(",").map(s => s.trim());
  if (parts.length < 1 || !parts[0]) return null;
  return { key: parts[0], platform: parts[1] ?? "", region: parts[2] ?? "" };
}

function validateKeys(
  rawLines: string[],
  defaultPlatform: Platform,
  keyType: KeyType,
  existingKeys: Set<string>,
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
      platform = (PLATFORMS.find(p => p.id === parsed.platform.toLowerCase() ||
        p.label.toLowerCase() === parsed.platform.toLowerCase())?.id) ?? defaultPlatform;
      if (!parsed.platform) missingPlatform.push(keyVal);
      region = parsed.region;
    }

    if (keyVal.length < 4) { invalid.push(keyVal); continue; }
    if (seen.has(keyVal) || existingKeys.has(keyVal)) { duplicates.push(keyVal); continue; }

    seen.add(keyVal);
    valid.push({ value: keyVal, platform, region });
  }

  return { total: rawLines.filter(l => l.trim()).length, valid, duplicates, invalid, missingPlatform };
}

function downloadErrorReport(validation: UploadValidation) {
  const lines = [
    "type,key,reason",
    ...validation.duplicates.map(k => `duplicate,${k},Already uploaded`),
    ...validation.invalid.map(k => `invalid,${k},Invalid format`),
    ...validation.missingPlatform.map(k => `warning,${k},Missing platform`),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "key-upload-errors.csv"; a.click();
  URL.revokeObjectURL(url);
}

// ─── Upload Modal ─────────────────────────────────────────────────────────────

function UploadModal({
  bounties,
  onClose,
}: {
  bounties: BountyData[];
  onClose: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [method, setMethod] = useState<UploadMethod>("paste");
  const [keyType, setKeyType] = useState<KeyType>("demo");
  const [platform, setPlatform] = useState<Platform>("steam");
  const [selectedBountyId, setSelectedBountyId] = useState<number | null>(
    bounties.length === 1 ? bounties[0].id : null
  );
  const [pasteText, setPasteText] = useState("");
  const [manualKey, setManualKey] = useState("");
  const [csvText, setCsvText] = useState("");
  const [validation, setValidation] = useState<UploadValidation | null>(null);
  const [step, setStep] = useState<"input" | "preview" | "done">("input");
  const [doneResult, setDoneResult] = useState<{ demo: number; full: number } | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async (keys: ParsedKey[]) => {
      if (!selectedBountyId) throw new Error("No campaign selected");
      const demoKeys = keyType === "demo" ? keys.map(k => k.value) : [];
      const fullKeys = keyType === "full" ? keys.map(k => k.value) : [];
      const res = await apiRequest("POST", `/api/games/bounties/${selectedBountyId}/keys`, {
        demoKeys, fullKeys,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setDoneResult({ demo: data.demoKeysAdded ?? 0, full: data.fullKeysAdded ?? 0 });
      setStep("done");
      queryClient.invalidateQueries({ queryKey: ["/api/games/indie/bounties"] });
      queryClient.invalidateQueries({ queryKey: ["/api/indie/bounty-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns/overview"] });
    },
    onError: () => toast({ title: "Upload failed", description: "Could not upload keys.", variant: "gamefolioError" as any }),
  });

  const doValidate = useCallback(() => {
    let lines: string[] = [];
    const isCSV = method === "csv";

    if (method === "paste") lines = pasteText.split("\n");
    else if (method === "csv") lines = csvText.split("\n").slice(1); // skip header
    else if (method === "manual") lines = [manualKey];

    const result = validateKeys(lines, platform, keyType, new Set(), isCSV);
    setValidation(result);
    setStep("preview");
  }, [method, pasteText, csvText, manualKey, platform, keyType]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCsvText(ev.target?.result as string ?? "");
    };
    reader.readAsText(file);
  };

  const hasInput = method === "paste" ? pasteText.trim().length > 0
    : method === "csv" ? csvText.trim().length > 0
    : manualKey.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}>
      <div className="relative w-full max-w-xl rounded-2xl p-6 overflow-y-auto max-h-[90vh]"
        style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.1)" }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(183,255,24,0.09)" }}>
              <KeyRound className="w-4 h-4" style={{ color: NEON }} />
            </div>
            <div>
              <h2 className="text-base font-black text-white">Upload Keys</h2>
              <p className="text-[10px] text-white/30">Add to your Key Vault</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-white/70 transition-colors"
            style={{ background: "rgba(255,255,255,0.04)" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {step === "done" ? (
          <div className="text-center py-10">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: "rgba(183,255,24,0.12)" }}>
              <CheckCircle2 className="w-7 h-7" style={{ color: NEON }} />
            </div>
            <h3 className="text-lg font-black text-white mb-2">Keys Added Successfully</h3>
            <div className="space-y-1 mb-8">
              {(doneResult?.demo ?? 0) > 0 && (
                <p className="text-sm text-white/50">
                  <span className="font-black text-white">{doneResult!.demo}</span> demo key{doneResult!.demo > 1 ? "s" : ""} added
                </p>
              )}
              {(doneResult?.full ?? 0) > 0 && (
                <p className="text-sm text-white/50">
                  <span className="font-black text-white">{doneResult!.full}</span> full game key{doneResult!.full > 1 ? "s" : ""} added
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setStep("input"); setValidation(null); setPasteText(""); setManualKey(""); setCsvText(""); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)" }}>
                Upload More
              </button>
              <button onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-black transition-all hover:brightness-110"
                style={{ background: NEON, color: "#070b10" }}>
                Done
              </button>
            </div>
          </div>
        ) : step === "preview" && validation ? (
          <div className="space-y-5">
            {/* Summary */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Submitted",  value: validation.total,              color: "text-white" },
                { label: "Valid",       value: validation.valid.length,       color: `text-[${NEON}]` },
                { label: "Duplicates", value: validation.duplicates.length,   color: "text-amber-400" },
                { label: "Invalid",    value: validation.invalid.length,      color: "text-red-400" },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-xl p-3 text-center"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className={`text-xl font-black ${color}`}>{value}</div>
                  <div className="text-[9px] text-white/30 uppercase tracking-wider mt-0.5">{label}</div>
                </div>
              ))}
            </div>

            {validation.missingPlatform.length > 0 && (
              <div className="flex items-start gap-2.5 rounded-xl p-3.5"
                style={{ background: "rgba(251,146,60,0.08)", border: "1px solid rgba(251,146,60,0.18)" }}>
                <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                <p className="text-xs text-orange-300">
                  {validation.missingPlatform.length} keys have no platform set — they'll be saved as "Other".
                </p>
              </div>
            )}

            {validation.valid.length > 0 && (
              <div>
                <div className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-2">
                  Valid Keys Preview ({Math.min(5, validation.valid.length)} of {validation.valid.length})
                </div>
                <div className="space-y-1.5">
                  {validation.valid.slice(0, 5).map((k, i) => {
                    const pl = PLATFORMS.find(p => p.id === k.platform);
                    return (
                      <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2"
                        style={{ background: "rgba(183,255,24,0.04)", border: "1px solid rgba(183,255,24,0.1)" }}>
                        {pl && <pl.icon className="w-3 h-3 text-white/30 shrink-0" />}
                        <span className="text-[11px] font-mono text-white/70 flex-1 truncate">
                          {k.value.slice(0, 4)}••••••••••••{k.value.slice(-4)}
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                          style={{ background: "rgba(183,255,24,0.1)", color: NEON }}>
                          {pl?.label ?? k.platform}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {(validation.duplicates.length > 0 || validation.invalid.length > 0) && (
              <button onClick={() => downloadErrorReport(validation)}
                className="flex items-center gap-2 text-xs font-bold text-white/40 hover:text-white/70 transition-colors">
                <Download className="w-3.5 h-3.5" /> Download error report
              </button>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={() => setStep("input")}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)" }}>
                Back
              </button>
              <button
                onClick={() => validation.valid.length > 0 && uploadMutation.mutate(validation.valid)}
                disabled={validation.valid.length === 0 || uploadMutation.isPending}
                className="flex-1 py-2.5 rounded-xl text-sm font-black transition-all hover:brightness-110 disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ background: NEON, color: "#070b10" }}>
                {uploadMutation.isPending
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</>
                  : `Add ${validation.valid.length} Key${validation.valid.length !== 1 ? "s" : ""}`}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Key type + campaign */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-1.5 block">
                  Key Type
                </label>
                <div className="flex rounded-xl overflow-hidden"
                  style={{ border: "1px solid rgba(255,255,255,0.09)" }}>
                  {(["demo", "full"] as KeyType[]).map((t) => (
                    <button key={t} onClick={() => setKeyType(t)}
                      className="flex-1 py-2 text-xs font-bold transition-all"
                      style={{
                        background: keyType === t ? "rgba(183,255,24,0.12)" : "transparent",
                        color: keyType === t ? NEON : "rgba(255,255,255,0.4)",
                      }}>
                      {t === "demo" ? "Demo" : "Full Game"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-1.5 block">
                  Default Platform
                </label>
                <select
                  value={platform}
                  onChange={e => setPlatform(e.target.value as Platform)}
                  className="w-full rounded-xl py-2 px-3 text-xs font-semibold text-white"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}>
                  {PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>
            </div>

            {bounties.length > 1 && (
              <div>
                <label className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-1.5 block">
                  Campaign
                </label>
                <select
                  value={selectedBountyId ?? ""}
                  onChange={e => setSelectedBountyId(Number(e.target.value))}
                  className="w-full rounded-xl py-2 px-3 text-xs font-semibold text-white"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}>
                  <option value="">Select a campaign…</option>
                  {bounties.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
                </select>
              </div>
            )}

            {/* Method tabs */}
            <div>
              <div className="flex rounded-xl overflow-hidden mb-4"
                style={{ border: "1px solid rgba(255,255,255,0.09)" }}>
                {([
                  { id: "paste", label: "Paste Keys",   icon: ClipboardList },
                  { id: "csv",   label: "CSV Upload",   icon: FileText },
                  { id: "manual",label: "Single Entry", icon: Pencil },
                ] as { id: UploadMethod; label: string; icon: any }[]).map(({ id, label, icon: Icon }) => (
                  <button key={id} onClick={() => setMethod(id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold transition-all"
                    style={{
                      background: method === id ? "rgba(183,255,24,0.1)" : "transparent",
                      color: method === id ? NEON : "rgba(255,255,255,0.35)",
                    }}>
                    <Icon className="w-3.5 h-3.5" /> {label}
                  </button>
                ))}
              </div>

              {method === "paste" && (
                <div>
                  <textarea
                    value={pasteText}
                    onChange={e => setPasteText(e.target.value)}
                    placeholder={"Paste keys here, one per line:\nXXXXX-XXXXX-XXXXX\nXXXXX-XXXXX-XXXXX"}
                    rows={7}
                    className="w-full rounded-xl text-xs font-mono text-white/80 resize-none p-4 outline-none"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                  />
                  <p className="text-[10px] text-white/25 mt-1.5">
                    One key per line. Keys are masked in transit.
                  </p>
                </div>
              )}

              {method === "csv" && (
                <div className="space-y-3">
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="rounded-xl p-6 text-center cursor-pointer transition-all hover:brightness-110"
                    style={{ background: "rgba(255,255,255,0.03)", border: "2px dashed rgba(255,255,255,0.1)" }}>
                    <Upload className="w-6 h-6 mx-auto mb-2 text-white/20" />
                    <p className="text-xs font-semibold text-white/40">
                      {csvText ? "File loaded — click to replace" : "Click to upload CSV"}
                    </p>
                    <p className="text-[10px] text-white/20 mt-1">Format: key,platform,region</p>
                    <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFileUpload} />
                  </div>
                  {csvText && (
                    <div className="flex items-center gap-2 text-[10px] text-white/30">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                      {csvText.trim().split("\n").length - 1} data rows detected
                    </div>
                  )}
                  <div className="rounded-xl p-3"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <p className="text-[10px] font-bold text-white/30 mb-1.5">Expected CSV Format</p>
                    <pre className="text-[10px] font-mono text-white/40 whitespace-pre">
{`key,platform,region
XXXXX-XXXXX-XXXXX,steam,global
ABCDE-12345-FGHIJ,epic,us`}
                    </pre>
                  </div>
                </div>
              )}

              {method === "manual" && (
                <div className="space-y-3">
                  <input
                    value={manualKey}
                    onChange={e => setManualKey(e.target.value)}
                    placeholder="Enter key (e.g. XXXXX-XXXXX-XXXXX)"
                    className="w-full rounded-xl text-xs font-mono text-white/80 px-4 py-3 outline-none"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                  />
                  <p className="text-[10px] text-white/25">
                    Use for one-off additions. For bulk upload, use Paste or CSV.
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={doValidate}
              disabled={!hasInput || (bounties.length > 1 && !selectedBountyId)}
              className="w-full py-3 rounded-xl text-sm font-black transition-all hover:brightness-110 disabled:opacity-40"
              style={{ background: NEON, color: "#070b10" }}>
              Validate Keys
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

  const demoRemaining = keyStatus?.demoKeysRemaining ?? bounty.demoKeysRemaining;
  const fullRemaining = keyStatus?.fullKeysRemaining ?? bounty.fullKeysRemaining;
  const demoDistributed = keyStatus?.demoKeysDistributed ?? 0;
  const fullDistributed = keyStatus?.fullKeysDistributed ?? 0;
  const demoTotal = demoRemaining + demoDistributed;
  const fullTotal = fullRemaining + fullDistributed;

  const statusColor = bounty.status === "active" ? NEON
    : bounty.status === "completed" ? "#34d399"
    : bounty.status === "draft" ? "#94a3b8"
    : "#f59e0b";

  const filledPct = bounty.maxParticipants
    ? Math.round((bounty.participantCount / bounty.maxParticipants) * 100) : null;

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

          {/* Fill progress */}
          {filledPct !== null && (
            <div className="pt-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-white/40">Campaign fill</span>
                <span className="text-[10px] font-bold text-white/60">{filledPct}%</span>
              </div>
              <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="h-full rounded-full" style={{ width: `${filledPct}%`, background: NEON }} />
              </div>
            </div>
          )}

          {/* Key breakdown */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Demo Keys", remaining: demoRemaining, distributed: demoDistributed, total: demoTotal },
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
              Committed keys are locked in the Gamefolio Key Vault. They cannot be withdrawn while creators are participating or awaiting review.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function KeyManagementTab() {
  const [showUpload, setShowUpload] = useState(false);
  const [showStatusInfo, setShowStatusInfo] = useState(false);

  const { data: bounties = [], isLoading: bounciesLoading } = useQuery<BountyData[]>({
    queryKey: ["/api/games/indie/bounties"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: bountyStatus } = useQuery<BountyStatus>({
    queryKey: ["/api/indie/bounty-status"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const demoKeys = bountyStatus?.demoKeys ?? { available: 0, valid: 0, claimed: 0, uploaded: 0 };
  const fullKeys = bountyStatus?.fullGameKeys ?? { available: 0, valid: 0, awarded: 0, uploaded: 0 };

  const totalDemoCommitted = bounties.reduce((sum, b) => {
    const active = b.status === "active" || b.status === "live";
    return active ? sum + b.demoKeysRemaining : sum;
  }, 0);
  const totalFullCommitted = bounties.reduce((sum, b) => {
    const active = b.status === "active" || b.status === "live";
    return active ? sum + b.fullKeysRemaining : sum;
  }, 0);

  const isLoading = bounciesLoading;

  return (
    <div className="space-y-8">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white">Keys &amp; Rewards</h2>
          <p className="text-xs text-white/30 mt-0.5">
            Secure Key Vault — escrow-style management for campaign rewards
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowStatusInfo(v => !v)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white/30 hover:text-white/60 transition-colors"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <Info className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowUpload(true)}
            disabled={bounties.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black transition-all hover:brightness-110 disabled:opacity-40"
            style={{ background: NEON, color: "#070b10" }}>
            <Upload className="w-4 h-4" /> Upload Keys
          </button>
        </div>
      </div>

      {/* Status legend */}
      {showStatusInfo && (
        <div className="rounded-2xl p-5"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <h4 className="text-sm font-black text-white mb-4">Key Status Reference</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {KEY_STATUS_LABELS.map(({ id, label, desc }) => (
              <div key={id} className="flex items-start gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full shrink-0 mt-1"
                  style={{ background: STATUS_COLORS[id] ?? "#94a3b8" }} />
                <div>
                  <div className="text-xs font-bold text-white/75">{label}</div>
                  <div className="text-[10px] text-white/30 leading-snug">{desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t flex items-start gap-2.5"
            style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <Lock className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
            <p className="text-[10px] text-blue-300/70">
              <strong className="text-blue-300">Committed, Reserved and Issued keys</strong> are locked and cannot be deleted or withdrawn by developers. This protects creators from reward removal after they've invested time creating content.
            </p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: NEON }} />
        </div>
      ) : (
        <>
          {/* ── Summary Cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[
              {
                label: "Demo Keys",
                stats: [
                  { label: "Available",  value: demoKeys.available,  color: NEON },
                  { label: "Committed",  value: totalDemoCommitted,  color: "#60a5fa" },
                  { label: "Issued",     value: demoKeys.claimed,    color: "#f472b6" },
                  { label: "Invalid",    value: Math.max(0, (demoKeys.uploaded ?? 0) - (demoKeys.valid ?? demoKeys.available)), color: "#f87171" },
                ],
              },
              {
                label: "Full Game Keys",
                stats: [
                  { label: "Available",  value: fullKeys.available,  color: NEON },
                  { label: "Committed",  value: totalFullCommitted,  color: "#60a5fa" },
                  { label: "Awarded",    value: fullKeys.awarded,    color: "#34d399" },
                  { label: "Invalid",    value: Math.max(0, (fullKeys.uploaded ?? 0) - (fullKeys.valid ?? fullKeys.available)), color: "#f87171" },
                ],
              },
            ].map(({ label, stats }) => (
              <div key={label} className="rounded-2xl p-5"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="flex items-center gap-2.5 mb-5">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(183,255,24,0.08)" }}>
                    <KeyRound className="w-4 h-4" style={{ color: NEON }} />
                  </div>
                  <span className="text-sm font-black text-white">{label}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {stats.map(({ label: sl, value, color }) => (
                    <div key={sl} className="rounded-xl p-3"
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <div className="text-xl font-black mb-0.5" style={{ color }}>{value}</div>
                      <div className="text-[9px] text-white/30 uppercase tracking-wider">{sl}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* ── Campaign Vaults ── */}
          <div>
            <div className="flex items-center gap-2.5 mb-5">
              <h3 className="text-base font-black text-white">Campaign Vaults</h3>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                style={{ background: "rgba(183,255,24,0.08)", border: "1px solid rgba(183,255,24,0.15)" }}>
                <Shield className="w-3 h-3" style={{ color: NEON }} />
                <span className="text-[10px] font-bold" style={{ color: NEON }}>Escrow Protected</span>
              </div>
            </div>

            {bounties.length === 0 ? (
              <div className="rounded-2xl px-8 py-14 text-center"
                style={{ background: "rgba(255,255,255,0.018)", border: "1px dashed rgba(255,255,255,0.07)" }}>
                <Shield className="w-9 h-9 mx-auto mb-3 text-white/10" />
                <p className="text-sm font-semibold text-white/35 mb-1">No campaign vaults yet</p>
                <p className="text-xs text-white/20 max-w-xs mx-auto">
                  When you launch a campaign, committed keys are locked in a secure vault until creators earn them.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {bounties.map(b => <VaultCard key={b.id} bounty={b} />)}
              </div>
            )}
          </div>

          {/* ── Key Inventory Table ── */}
          <div>
            <h3 className="text-base font-black text-white mb-5">Key Inventory by Platform</h3>
            <div className="rounded-2xl overflow-hidden"
              style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                    {["Platform", "Key Type", "Available", "Committed", "Reserved", "Issued", "Invalid"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[10px] font-bold text-white/30 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bounties.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-white/20 text-xs">
                        Upload keys to see inventory breakdown
                      </td>
                    </tr>
                  ) : (
                    bounties.flatMap(b => [
                      { bounty: b, type: "Demo",      avail: b.demoKeysRemaining, committed: 0, reserved: 0, issued: 0, invalid: 0 },
                      { bounty: b, type: "Full Game",  avail: b.fullKeysRemaining, committed: 0, reserved: 0, issued: 0, invalid: 0 },
                    ]).filter(r => r.avail > 0 || r.committed > 0 || r.issued > 0).map((row, i) => (
                      <tr key={i}
                        className="border-t"
                        style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-white/70">Steam</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded"
                            style={{
                              background: row.type === "Demo" ? "rgba(183,255,24,0.08)" : "rgba(96,165,250,0.08)",
                              color: row.type === "Demo" ? NEON : "#60a5fa",
                            }}>
                            {row.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-black text-white">{row.avail}</td>
                        <td className="px-4 py-3" style={{ color: "#60a5fa" }}>{row.committed}</td>
                        <td className="px-4 py-3" style={{ color: "#a78bfa" }}>{row.reserved}</td>
                        <td className="px-4 py-3" style={{ color: "#f472b6" }}>{row.issued}</td>
                        <td className="px-4 py-3" style={{ color: "#f87171" }}>{row.invalid}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-white/20 mt-2.5 flex items-center gap-1.5">
              <Lock className="w-3 h-3" />
              Raw key values are never displayed here. Individual keys are only revealed to the specific creator they're assigned to.
            </p>
          </div>

          {/* ── No campaigns notice for upload ── */}
          {bounties.length === 0 && (
            <div className="flex items-start gap-3 rounded-xl p-4"
              style={{ background: "rgba(251,146,60,0.07)", border: "1px solid rgba(251,146,60,0.15)" }}>
              <AlertCircle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-orange-300">Create a campaign first</p>
                <p className="text-[11px] text-orange-300/60 mt-0.5">
                  You need at least one campaign before you can upload keys. Go to Campaigns → Campaign Library to launch your first campaign.
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Upload modal */}
      {showUpload && (
        <UploadModal bounties={bounties} onClose={() => setShowUpload(false)} />
      )}
    </div>
  );
}
