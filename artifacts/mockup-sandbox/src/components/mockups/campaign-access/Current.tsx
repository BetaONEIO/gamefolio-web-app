import './_group.css';
import { useState, useRef, useCallback } from 'react';
import {
  ArrowRight, CheckCircle2, ChevronDown, ChevronRight, ClipboardList,
  KeyRound, Lock, Upload,
} from 'lucide-react';

const NEON = '#B9FF1A';
const fieldStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
  color: "#fff", borderRadius: "12px", padding: "10px 14px",
  outline: "none", width: "100%", fontSize: "13px",
};

type CampaignType = {
  slug: string;
  pills: { ct: string; qty: number }[];
};

type AccessMethod = "demo_to_full" | "full_game_upfront" | "public_demo" | "free_to_play" | "private_playtest" | "custom_access";
type CampaignSettings = { streamConfig: Record<string, unknown> };

function parseKeyLines(text: string): string[] {
  return text.split("\n").map(line => line.trim()).filter(Boolean);
}

function reqPillLabel(ct: string, qty: number) {
  if (ct === "clip") return `${qty} Gameplay Clip${qty === 1 ? "" : "s"}`;
  if (ct === "screenshot") return `${qty} Screenshot${qty === 1 ? "" : "s"}`;
  if (ct === "feedback") return `${qty} Creator Feedback${qty === 1 ? "" : " submissions"}`;
  if (ct === "reel") return `${qty} Gameplay Reel${qty === 1 ? "" : "s"}`;
  if (ct === "stream") return "1 Livestream";
  if (ct === "session") return "Play the Game";
  if (ct === "bug") return `${qty} Bug Report${qty === 1 ? "" : "s"}`;
  return ct;
}

function KeyUploadArea({
  label, accent, accentRgb, description, keys, needed, vaultAvail, useVault, onUseVaultChange, onChange,
}: {
  label: string; accent: string; accentRgb: string; description: string;
  keys: string; needed: number; vaultAvail: number; useVault: boolean;
  onUseVaultChange: (value: boolean) => void; onChange: (value: string) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [justLoaded, setJustLoaded] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const pasted = parseKeyLines(keys).length;
  const effectiveVault = useVault ? vaultAvail : 0;
  const total = effectiveVault + pasted;
  const met = total >= needed && needed > 0;
  const pct = needed > 0 ? Math.min(100, Math.round((total / needed) * 100)) : (total > 0 ? 100 : 0);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = event => {
      const text = event.target?.result as string ?? "";
      const isCSV = file.name.endsWith(".csv") || text.includes(",");
      const extracted = isCSV
        ? text.split("\n").slice(1).map(line => line.split(",")[0]?.trim() ?? "").filter(Boolean)
        : parseKeyLines(text);
      onChange(extracted.join("\n"));
      setJustLoaded(true);
      setTimeout(() => setJustLoaded(false), 2000);
    };
    reader.readAsText(file);
  }, [onChange]);

  return (
    <div className="space-y-3">
      {vaultAvail > 0 && (
        <div className="rounded-2xl p-3 flex items-center justify-between gap-3 transition-all duration-200"
          style={{
            background: useVault ? `rgba(${accentRgb},0.08)` : "rgba(255,255,255,0.04)",
            border: `1.5px solid ${useVault ? `rgba(${accentRgb},0.22)` : "rgba(255,255,255,0.07)"}`,
          }}>
          <div className="flex items-center gap-2.5 min-w-0">
            <KeyRound className="w-4 h-4 shrink-0" style={{ color: useVault ? accent : "rgba(255,255,255,0.28)" }} />
            <div className="min-w-0">
              <p className="text-[12px] font-bold leading-tight" style={{ color: useVault ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.40)" }}>
                {vaultAvail} {label.toLowerCase()} in your vault
              </p>
              <p className="text-[10px] leading-tight mt-0.5" style={{ color: useVault ? `rgba(${accentRgb},0.70)` : "rgba(255,255,255,0.28)" }}>
                {useVault
                  ? vaultAvail >= needed
                    ? "Enough to cover this campaign"
                    : `${needed - vaultAvail} more needed`
                  : "Not using vault keys for this campaign"}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label={`${useVault ? "Stop using" : "Use"} ${label.toLowerCase()} from your key vault`}
            aria-pressed={useVault}
            onClick={() => onUseVaultChange(!useVault)}
            className="shrink-0 rounded-full flex items-center transition-all duration-200"
            style={{ width: "40px", height: "22px", padding: "2px", background: useVault ? accent : "rgba(255,255,255,0.14)" }}>
            <div className="rounded-full bg-white shadow-sm transition-all duration-200"
              style={{ width: "18px", height: "18px", transform: useVault ? "translateX(18px)" : "translateX(0)" }} />
          </button>
        </div>
      )}

      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-sm font-black text-white">{label}</span>
          <p className="text-[11px] text-white/35 mt-0.5 leading-snug">{description}</p>
        </div>
        {total > 0 && (
          <span className="text-sm font-black shrink-0 mt-0.5" style={{ color: met ? NEON : accent }}>
            {total}{needed > 0 ? ` / ${needed}` : ""}
          </span>
        )}
      </div>

      {needed > 0 && (
        <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: met ? NEON : accent }} />
        </div>
      )}

      <div
        role="button"
        tabIndex={0}
        aria-label={`Upload ${label} from a CSV or text file`}
        onKeyDown={event => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            fileRef.current?.click();
          }
        }}
        onDragOver={event => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={event => { event.preventDefault(); setDragging(false); const file = event.dataTransfer.files[0]; if (file) handleFile(file); }}
        onClick={() => fileRef.current?.click()}
        className="flex flex-col items-center justify-center gap-2 rounded-2xl cursor-pointer transition-all duration-200 text-center"
        style={{
          minHeight: "100px",
          border: `1.5px dashed ${dragging ? accent : justLoaded ? "rgba(183,255,24,0.35)" : "rgba(255,255,255,0.09)"}`,
          background: dragging ? `rgba(${accentRgb},0.07)` : "transparent",
        }}>
        {justLoaded ? (
          <>
            <CheckCircle2 className="w-6 h-6" style={{ color: NEON }} />
            <span className="text-xs font-black" style={{ color: NEON }}>Keys loaded!</span>
          </>
        ) : (
          <>
            <Upload className="w-4 h-4" style={{ color: dragging ? accent : "rgba(255,255,255,0.22)" }} />
            <p className="text-[11px] text-white/35">
              {dragging ? "Drop to import" : "Drag a CSV here, or "}
              {!dragging && <span className="font-bold" style={{ color: accent }}>browse</span>}
            </p>
          </>
        )}
      </div>
      <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden"
        onChange={event => { const file = event.target.files?.[0]; if (file) handleFile(file); event.target.value = ""; }} />

      <button
        onClick={() => setPasteOpen(value => !value)}
        className="flex items-center gap-1.5 text-[11px] text-white/30 hover:text-white/55 transition-colors">
        <ClipboardList className="w-3.5 h-3.5" />
        Paste keys manually
        {pasteOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>

      {pasteOpen && (
        <textarea
          aria-label={`${label} to paste`}
          value={keys}
          onChange={event => onChange(event.target.value)}
          placeholder={"One key per line:\nXXXXX-XXXXX-XXXXX"}
          rows={4}
          className="w-full rounded-xl text-[11px] font-mono text-white/65 resize-none p-3 outline-none transition-all"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
        />
      )}
    </div>
  );
}

function StepUploadKeys({ type, demoKeys, fullKeys, vaultDemo, vaultFull,
  useVaultDemo, useVaultFull, onUseVaultDemoChange, onUseVaultFullChange,
  onDemoChange, onFullChange, accessMethod, completionFullGameKey, customAccessNeedsKey, maxPlaces, onMaxPlacesChange, streamCampaign, settings, onSettingsChange }: {
  type: CampaignType;
  demoKeys: string; fullKeys: string; vaultDemo: number; vaultFull: number;
  useVaultDemo: boolean; useVaultFull: boolean;
  onUseVaultDemoChange: (value: boolean) => void; onUseVaultFullChange: (value: boolean) => void;
  onDemoChange: (value: string) => void; onFullChange: (value: string) => void;
  accessMethod: AccessMethod; completionFullGameKey: boolean; customAccessNeedsKey: boolean; maxPlaces: number; onMaxPlacesChange: (value: number) => void; streamCampaign: boolean;
  settings: CampaignSettings;
  onSettingsChange: (changes: Record<string, unknown>) => void;
}) {
  const simplifiedStream = type.slug === "stream-spotlight";
  const effectiveDemo = (useVaultDemo ? vaultDemo : 0) + parseKeyLines(demoKeys).length;
  const effectiveFull = (useVaultFull ? vaultFull : 0) + parseKeyLines(fullKeys).length;
  const needsDemo = accessMethod === "demo_to_full" || accessMethod === "private_playtest";
  const needsAccessFull = accessMethod === "full_game_upfront";
  const needsRewardFull = completionFullGameKey && ["demo_to_full", "public_demo", "private_playtest"].includes(accessMethod);
  const needsCustomKey = accessMethod === "custom_access" && customAccessNeedsKey;
  const allReady = (!(needsDemo || needsCustomKey) || effectiveDemo > 0) && (!needsAccessFull || effectiveFull > 0) && (!needsRewardFull || effectiveFull > 0);
  const keyCapacity = needsDemo && needsRewardFull ? Math.min(effectiveDemo, effectiveFull)
    : needsAccessFull ? effectiveFull
    : needsDemo ? effectiveDemo
    : needsRewardFull ? effectiveFull : needsCustomKey ? effectiveDemo : maxPlaces;
  const capacity = simplifiedStream ? keyCapacity : streamCampaign ? maxPlaces : keyCapacity;
  const showFull = needsAccessFull || needsRewardFull;
  const streamEstimate = null;

  return (
    <div className="space-y-6 gf-fade-up">
      <p className="text-[11px] text-white/35 flex items-center gap-1.5">
        <Lock className="w-3 h-3 text-orange-400/70 shrink-0" />
        Keys lock when the campaign goes live — they cannot be withdrawn once creators join.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
        {(needsDemo || needsCustomKey) && <KeyUploadArea
          label="Demo or Playtest Access Keys" accent="#60a5fa" accentRgb="96,165,250"
          description="Released when eligible creators join."
          keys={demoKeys} needed={1} vaultAvail={vaultDemo} useVault={useVaultDemo} onUseVaultChange={onUseVaultDemoChange}
          onChange={onDemoChange} />}
        {showFull && <KeyUploadArea
          label={needsAccessFull ? "Full-Game Access Keys" : "Full-Game Completion Reward Keys"} accent="#fb923c" accentRgb="251,146,60"
          description={needsAccessFull ? "Creators receive the full game when they join." : "Released only after every objective is completed and validated."}
          keys={fullKeys} needed={1} vaultAvail={vaultFull} useVault={useVaultFull} onUseVaultChange={onUseVaultFullChange}
          onChange={onFullChange} />}
      </div>

      {!simplifiedStream && ((!needsDemo && !needsAccessFull && !needsRewardFull && !needsCustomKey) || (streamCampaign && !simplifiedStream)) && (
        <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <label className="text-xs font-black text-white block">{streamCampaign ? "How many streamer places would you like to make available?" : "How many campaign places would you like to make available?"}</label>
          {streamCampaign ? (
            <>
              <div className="mt-3 inline-flex items-center gap-4 rounded-lg bg-[#0F101B] p-1.5">
                <button type="button" aria-label="Fewer streamers" disabled={maxPlaces <= 1}
                  onClick={() => onMaxPlacesChange(Math.max(1, maxPlaces - 1))}
                  className="h-9 w-9 rounded-md bg-[#1C2636] text-lg font-bold text-white disabled:opacity-40">−</button>
                <span className="min-w-[95px] text-center text-sm font-bold text-white">{maxPlaces} streamer{maxPlaces === 1 ? "" : "s"}</span>
                <button type="button" aria-label="More streamers" disabled={maxPlaces >= 25}
                  onClick={() => onMaxPlacesChange(Math.min(25, maxPlaces + 1))}
                  className="h-9 w-9 rounded-md bg-[#1C2636] text-lg font-bold text-white disabled:opacity-40">+</button>
              </div>
              <p className="mt-2 text-xs text-white/75">
                {needsDemo || needsAccessFull || needsRewardFull || needsCustomKey
                  ? `You will need ${maxPlaces} game keys for this campaign${needsDemo && needsRewardFull ? " in each access and reward pool" : ""}.`
                  : "No game keys are required for this access method."}
              </p>
              {keyCapacity < maxPlaces && (
                <p className="mt-1 text-xs text-amber-300" role="alert">
                  Add {maxPlaces - keyCapacity} more eligible key{maxPlaces - keyCapacity === 1 ? "" : "s"} before launching.
                </p>
              )}
            </>
          ) : (
            <select value={maxPlaces} onChange={event => onMaxPlacesChange(Number(event.target.value))} style={{ ...fieldStyle, marginTop: "10px" }}>
              <option value={3}>3</option><option value={5}>5</option><option value={10}>10</option><option value={25}>Custom (25)</option>
            </select>
          )}
        </div>
      )}

      <div className="rounded-xl p-4" style={{ background: "rgba(185,255,26,0.05)", border: "1px solid rgba(185,255,26,0.16)" }}>
        <div className="text-[10px] uppercase tracking-wider font-bold" style={{ color: NEON }}>
          {`Campaign capacity: ${Math.max(0, capacity)} places`}
        </div>
        <p className="text-[11px] text-white/55 mt-1">
          {needsDemo && needsRewardFull
            ? `Calculated from the smaller valid key pool (${effectiveDemo} access keys and ${effectiveFull} full-game reward keys).`
            : needsDemo || needsAccessFull || needsRewardFull
              ? "Calculated from your valid key inventory."
              : needsCustomKey ? "Calculated from your custom access key inventory." : "No key inventory limits participation; your maximum places setting applies."}
        </p>
        {needsDemo && needsRewardFull && effectiveDemo !== effectiveFull && <p className="text-[11px] text-amber-300 mt-1">Your key pools are mismatched. Add keys to expand campaign capacity.</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="text-[10px] uppercase tracking-wider font-bold text-white/45">Maximum potential output</div>
          {type.pills.length > 0
            ? type.pills.map(({ ct, qty }) => <div key={ct} className="text-xs text-white/75 mt-2">{qty * Math.max(0, capacity)} {reqPillLabel(ct, 1).replace(/^×1 /, "")}</div>)
            : <div className="text-xs text-white/55 mt-2">Calculated from your selected objectives and campaign places.</div>}
        </div>
        <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="text-[10px] uppercase tracking-wider font-bold text-white/45">Estimated output &amp; campaign performance</div>
          {streamEstimate ? (
            <div className="space-y-1.5 mt-2 text-xs text-white/75">Estimated streamers</div>
          ) : capacity > 0 ? <><div className="text-xs text-white/75 mt-2">Expected participation: approximately {Math.max(1, Math.floor(capacity * 0.6))}–{Math.max(1, capacity)} creators</div><div className="text-xs text-white/75 mt-1">Expected completions: approximately {Math.max(1, Math.floor(capacity * 0.4))}–{Math.max(1, Math.floor(capacity * 0.8))} creators</div></> : <div className="text-xs text-white/55 mt-2">Participation estimate unavailable. Starting with a small campaign is recommended.</div>}
          <p className="text-[10px] text-white/40 mt-2">Estimates are based on eligible active creators, selected platforms and previous campaign performance. Results are not guaranteed.</p>
        </div>
      </div>

      {allReady && (
        <div className="flex items-center gap-2 text-sm font-bold gf-scale-in" style={{ color: NEON }}>
          <CheckCircle2 className="w-4 h-4" />
          Access and completion reward pools are ready
        </div>
      )}
    </div>
  );
}

const CONTENT_BOOST: CampaignType = {
  slug: "content-boost",
  pills: [{ ct: "clip", qty: 2 }, { ct: "reel", qty: 1 }, { ct: "screenshot", qty: 1 }],
};
const INITIAL_DEMO_KEYS = "DEMO-8K2P-4N7Q\nDEMO-3M9R-6T1V";
const INITIAL_FULL_KEYS = "FULL-5J3W-9C2A\nFULL-7H4L-1D8E";

export function Current() {
  const [demoKeys, setDemoKeys] = useState(INITIAL_DEMO_KEYS);
  const [fullKeys, setFullKeys] = useState(INITIAL_FULL_KEYS);
  const [useVaultDemo, setUseVaultDemo] = useState(true);
  const [useVaultFull, setUseVaultFull] = useState(true);
  const [maxPlaces, setMaxPlaces] = useState(10);
  const [accessMethod] = useState<AccessMethod>("demo_to_full");
  const [completionFullGameKey] = useState(true);
  const [settings] = useState<CampaignSettings>({ streamConfig: {} });
  const updateSettings = (_changes: Record<string, unknown>) => undefined;
  const noOpMaxPlacesChange = (value: number) => setMaxPlaces(value);

  return (
    <main className="campaign-access-preview min-h-screen px-4 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-[1040px] rounded-2xl p-5 sm:p-8"
        style={{ background: "#0e1520", border: "1px solid rgba(255,255,255,0.10)" }}>
        <section className="gf-fade-up" aria-label="Step 3: Add Access">
          <div className="flex items-center gap-3.5 mb-7">
            <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[11px] font-black"
              style={{ background: NEON, color: "#070b10" }}>3</div>
            <h3 className="text-base font-black text-white">Add Access</h3>
          </div>
          <div className="pl-[42px]">
            <StepUploadKeys
              type={CONTENT_BOOST}
              demoKeys={demoKeys} fullKeys={fullKeys}
              vaultDemo={8} vaultFull={8}
              useVaultDemo={useVaultDemo} useVaultFull={useVaultFull}
              onUseVaultDemoChange={setUseVaultDemo} onUseVaultFullChange={setUseVaultFull}
              onDemoChange={setDemoKeys} onFullChange={setFullKeys}
              accessMethod={accessMethod} completionFullGameKey={completionFullGameKey}
              customAccessNeedsKey={false} maxPlaces={maxPlaces} onMaxPlacesChange={noOpMaxPlacesChange}
              streamCampaign={false} settings={settings} onSettingsChange={updateSettings}
            />
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 mt-8">
              <button type="button" className="w-full sm:w-auto px-5 py-3 rounded-xl text-sm font-bold transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B9FF1A]"
                style={{ background: "#111923", color: "rgba(255,255,255,0.70)", border: "1px solid rgba(255,255,255,0.16)" }}>
                Back
              </button>
              <button type="button"
                className="w-full sm:w-[290px] px-5 py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B9FF1A]"
                style={{ background: NEON, color: "#070b10", border: "1px solid transparent" }}>
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}