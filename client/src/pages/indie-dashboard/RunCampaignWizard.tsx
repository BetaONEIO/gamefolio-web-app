import { useState, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, ChevronRight, ChevronLeft, Check, X, Search,
  Gamepad2, ShieldCheck, Calendar, Key, Image as ImageIcon,
  ClipboardCheck, Target, Upload, AlertTriangle, Plus, Trash2,
} from "lucide-react";
import { NEON, CARD_BG, CARD_BORDER } from "./constants";

const STEPS = [
  { id: 1, label: "Select Game" },
  { id: 2, label: "Confirm Package" },
  { id: 3, label: "Start Date" },
  { id: 4, label: "Upload Keys" },
  { id: 5, label: "Artwork" },
  { id: 6, label: "Review & Submit" },
];

// ── Step 1: Select Game ──────────────────────────────────────────────────

function StepSelectGame({ game, onSelect }: { game: any; onSelect: (g: any) => void }) {
  const [query, setQuery] = useState("");
  const { data: results = [], isFetching } = useQuery<any[]>({
    queryKey: ["/api/games/search", query],
    queryFn: async () => {
      if (query.trim().length < 2) return [];
      const res = await fetch(`/api/games/search?q=${encodeURIComponent(query)}`);
      return res.ok ? res.json() : [];
    },
    enabled: query.trim().length >= 2,
  });

  const { data: indieProfile } = useQuery<any>({
    queryKey: ["/api/indie/profile"],
  });

  const importFromProfile = () => {
    if (!indieProfile) return;
    onSelect({
      id: null,
      name: indieProfile.gameName ?? "",
      imageUrl: indieProfile.headerImageUrl ?? null,
      steamAppId: indieProfile.steamAppId ?? null,
      itchUrl: indieProfile.itchUrl ?? null,
      epicSlug: indieProfile.epicSlug ?? null,
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-black text-white mb-1">Select Your Game</h3>
        <p className="text-[12px] text-white/40">Choose the game this campaign will promote.</p>
      </div>

      {/* Use indie profile */}
      {indieProfile?.gameName && (
        <button onClick={importFromProfile}
          className="w-full flex items-center gap-3 p-3.5 rounded-xl text-left transition-all hover:border-white/20"
          style={{ background: game?.name === indieProfile.gameName ? "rgba(183,255,24,0.08)" : CARD_BG, border: `1px solid ${game?.name === indieProfile.gameName ? "rgba(183,255,24,0.35)" : CARD_BORDER}` }}>
          {indieProfile.headerImageUrl
            ? <img src={indieProfile.headerImageUrl} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
            : <div className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.05)" }}>
                <Gamepad2 size={18} className="text-white/30" />
              </div>
          }
          <div className="flex-1 min-w-0">
            <div className="text-sm font-black text-white truncate">{indieProfile.gameName}</div>
            <div className="text-[11px] text-white/40">From your Game Profile</div>
          </div>
          {game?.name === indieProfile.gameName && <Check size={14} style={{ color: NEON }} />}
        </button>
      )}

      {/* Search Gamefolio games */}
      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-white/40 block mb-2">Search Gamefolio Games</label>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search by game name…"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm text-white outline-none"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)" }}
          />
          {isFetching && <Loader2 size={12} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-white/30" />}
        </div>

        {results.length > 0 && (
          <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto">
            {results.map((g: any) => (
              <button key={g.id} onClick={() => { onSelect({ id: g.id, name: g.title, imageUrl: g.imageUrl ?? g.thumbnailUrl, steamAppId: null, itchUrl: null, epicSlug: null }); setQuery(""); }}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg text-left hover:bg-white/5 transition-colors"
                style={{ border: `1px solid ${CARD_BORDER}` }}>
                {g.imageUrl
                  ? <img src={g.imageUrl} alt="" className="w-9 h-9 rounded object-cover shrink-0" />
                  : <div className="w-9 h-9 rounded shrink-0 flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}><Gamepad2 size={14} className="text-white/30" /></div>
                }
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-white truncate">{g.title}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Manual entry */}
      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-white/40 block mb-2">Or Enter Manually</label>
        <input
          value={game?.name ?? ""} onChange={e => onSelect({ ...game, id: null, name: e.target.value })}
          placeholder="Game name"
          className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)" }}
        />
      </div>

      {/* Selected game preview */}
      {game?.name && (
        <div className="rounded-xl p-3.5 flex items-center gap-3" style={{ background: "rgba(183,255,24,0.05)", border: "1px solid rgba(183,255,24,0.2)" }}>
          <Check size={14} style={{ color: NEON }} />
          <span className="text-sm font-bold text-white">{game.name}</span>
        </div>
      )}
    </div>
  );
}

// ── Step 2: Confirm Package ──────────────────────────────────────────────

function StepConfirmPackage({ template }: { template: any }) {
  const bounties: any[] = template.bounties ?? [];
  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck size={14} style={{ color: NEON }} />
          <span className="text-xs font-bold text-[#B7FF18] uppercase tracking-wider">Gamefolio Verified Campaign</span>
        </div>
        <h3 className="text-base font-black text-white">{template.name}</h3>
        <p className="text-[12px] text-white/40 mt-1">{template.description}</p>
      </div>

      <div className="rounded-xl p-4" style={{ background: "rgba(255,165,0,0.06)", border: "1px solid rgba(255,165,0,0.2)" }}>
        <div className="flex items-start gap-2 text-[12px] text-orange-300/70">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" />
          The following campaign details are fixed by Gamefolio and cannot be changed. To use different settings, choose a different campaign package.
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Duration", value: `${template.duration} Days` },
          { label: "Participants", value: template.participant_capacity },
          { label: "Demo Keys", value: template.demo_keys_required > 0 ? template.demo_keys_required : "None" },
          { label: "Full Keys", value: template.full_keys_required > 0 ? template.full_keys_required : "None" },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl p-3 text-center" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
            <div className="text-base font-black text-white">{value}</div>
            <div className="text-[10px] text-white/40 uppercase tracking-wide mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-white/40 mb-2">Bounties (Fixed)</div>
        <div className="space-y-2">
          {bounties.map((b: any, i: number) => (
            <div key={i} className="flex items-center gap-3 rounded-xl p-3" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
              <div className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[10px] font-black"
                style={{ background: "rgba(183,255,24,0.12)", color: NEON }}>{i + 1}</div>
              <div className="flex-1 text-sm font-bold text-white">{b.title}</div>
              <span className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{ background: "rgba(183,255,24,0.08)", color: NEON }}>MANDATORY</span>
              <span className="text-[11px] text-white/30">+{b.xp_reward?.toLocaleString()} XP</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl px-4 py-3" style={{ background: "rgba(183,255,24,0.05)", border: "1px solid rgba(183,255,24,0.15)" }}>
        <div className="text-[10px] font-bold uppercase tracking-wider text-[#B7FF18] mb-0.5">Completion Reward</div>
        <div className="text-sm text-white">{template.completion_reward_description}</div>
      </div>
    </div>
  );
}

// ── Step 3: Start Date ───────────────────────────────────────────────────

function StepStartDate({ startType, scheduledDate, onChangeType, onChangeDate }: {
  startType: "asap" | "scheduled"; scheduledDate: string;
  onChangeType: (t: "asap" | "scheduled") => void; onChangeDate: (d: string) => void;
}) {
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-black text-white mb-1">Choose a Start Date</h3>
        <p className="text-[12px] text-white/40">The campaign duration is fixed by the selected package. You choose when it begins.</p>
      </div>

      <div className="space-y-3">
        {(["asap", "scheduled"] as const).map(t => (
          <button key={t} onClick={() => onChangeType(t)}
            className="w-full flex items-center gap-4 p-4 rounded-xl text-left transition-all"
            style={{
              background: startType === t ? "rgba(183,255,24,0.08)" : CARD_BG,
              border: `1px solid ${startType === t ? "rgba(183,255,24,0.35)" : CARD_BORDER}`,
            }}>
            <div className="w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center"
              style={{ borderColor: startType === t ? NEON : "rgba(255,255,255,0.2)", background: startType === t ? NEON : "transparent" }}>
              {startType === t && <div className="w-2 h-2 rounded-full" style={{ background: "#070b10" }} />}
            </div>
            <div>
              <div className="text-sm font-bold text-white">
                {t === "asap" ? "Start as soon as approved" : "Schedule a future date"}
              </div>
              <div className="text-[11px] text-white/40 mt-0.5">
                {t === "asap" ? "Gamefolio will activate your campaign immediately after review." : "Pick a specific date to launch after Gamefolio approval."}
              </div>
            </div>
          </button>
        ))}
      </div>

      {startType === "scheduled" && (
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-white/40 block mb-2">Campaign Start Date</label>
          <input
            type="date" value={scheduledDate} min={tomorrowStr}
            onChange={e => onChangeDate(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", colorScheme: "dark" }}
          />
        </div>
      )}
    </div>
  );
}

// ── Step 4: Upload Keys ──────────────────────────────────────────────────

function KeyUploadSection({
  keyType, label, required, current, onAdd,
}: {
  keyType: "demo" | "full"; label: string; required: number; current: string[]; onAdd: (keys: string[]) => void;
}) {
  const [text, setText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const parseKeys = (raw: string) =>
    raw.split(/[\n,;]/).map(k => k.trim()).filter(k => k.length > 0);

  const addFromText = () => {
    const parsed = parseKeys(text);
    if (parsed.length === 0) return;
    onAdd([...current, ...parsed].filter((v, i, a) => a.indexOf(v) === i));
    setText("");
  };

  const addFromFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const parsed = parseKeys(ev.target?.result as string);
      onAdd([...current, ...parsed].filter((v, i, a) => a.indexOf(v) === i));
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const removeKey = (idx: number) => {
    const next = [...current]; next.splice(idx, 1); onAdd(next);
  };

  const pct = required > 0 ? Math.min(Math.round((current.length / required) * 100), 100) : 100;
  const ready = current.length >= required;

  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: CARD_BG, border: `1px solid ${ready ? "rgba(74,222,128,0.3)" : CARD_BORDER}` }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Key size={13} className={ready ? "text-green-400" : "text-white/40"} />
          <span className="text-sm font-black text-white">{label}</span>
          {required > 0 && <span className="text-[10px] text-white/30">({required} required)</span>}
        </div>
        <div className="text-sm font-black" style={{ color: ready ? "#4ade80" : NEON }}>
          {current.length} / {required > 0 ? required : "∞"}
        </div>
      </div>

      {required > 0 && (
        <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
          <div className="h-1.5 rounded-full transition-all"
            style={{ width: `${pct}%`, background: ready ? "#4ade80" : NEON }} />
        </div>
      )}

      {!ready && (
        <>
          <textarea value={text} onChange={e => setText(e.target.value)}
            placeholder={`Paste keys here — one per line or comma separated`}
            className="w-full px-3 py-2.5 rounded-lg text-xs text-white outline-none font-mono resize-none"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", height: "80px" }} />
          <div className="flex gap-2">
            <button onClick={addFromText} disabled={!text.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
              style={{ background: NEON, color: "#070b10", opacity: !text.trim() ? 0.4 : 1 }}>
              <Plus size={11} /> Add Keys
            </button>
            <button onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-white/10 text-white/60 hover:text-white transition-colors">
              <Upload size={11} /> Import CSV
            </button>
            <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={addFromFile} />
          </div>
        </>
      )}

      {current.length > 0 && (
        <div className="space-y-1 max-h-36 overflow-y-auto pr-0.5">
          {current.map((k, i) => (
            <div key={i} className="flex items-center gap-2 rounded px-2 py-1 font-mono text-[11px]"
              style={{ background: "rgba(255,255,255,0.03)" }}>
              <span className="flex-1 text-green-400 truncate">{k}</span>
              <button onClick={() => removeKey(i)} className="shrink-0 text-white/20 hover:text-red-400">
                <Trash2 size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {ready && (
        <div className="flex items-center gap-2 text-[11px] text-green-400">
          <Check size={12} /> {current.length} keys ready
        </div>
      )}
    </div>
  );
}

function StepUploadKeys({ template, demoKeys, fullKeys, onSetDemo, onSetFull }: {
  template: any; demoKeys: string[]; fullKeys: string[];
  onSetDemo: (k: string[]) => void; onSetFull: (k: string[]) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-black text-white mb-1">Upload Required Keys</h3>
        <p className="text-[12px] text-white/40">
          Upload the exact number of keys required. Keys are stored securely and never exposed in logs.
        </p>
      </div>

      {template.demo_keys_required > 0 && (
        <KeyUploadSection keyType="demo" label="Demo Keys" required={template.demo_keys_required}
          current={demoKeys} onAdd={onSetDemo} />
      )}
      {template.full_keys_required > 0 && (
        <KeyUploadSection keyType="full" label="Full-Game Keys" required={template.full_keys_required}
          current={fullKeys} onAdd={onSetFull} />
      )}
      {template.demo_keys_required === 0 && template.full_keys_required === 0 && (
        <div className="rounded-xl px-4 py-5 text-center" style={{ background: CARD_BG }}>
          <Key size={20} className="mx-auto mb-2 text-white/20" />
          <div className="text-sm text-white/40">This campaign doesn't require key uploads.</div>
        </div>
      )}

      <div className="text-[11px] text-white/20">
        Keys are encrypted at rest, never appear in logs, and are revealed only to the verified participant they are assigned to.
      </div>
    </div>
  );
}

// ── Step 5: Artwork ──────────────────────────────────────────────────────

function StepArtwork({ artworkUrl, onSetArtwork, game }: { artworkUrl: string; onSetArtwork: (u: string) => void; game: any }) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-black text-white mb-1">Campaign Artwork</h3>
        <p className="text-[12px] text-white/40">Choose or paste a URL for the campaign's featured image. Game assets are suggested automatically.</p>
      </div>

      {game?.imageUrl && (
        <button onClick={() => onSetArtwork(game.imageUrl)}
          className="flex items-center gap-3 p-3.5 rounded-xl text-left w-full transition-all"
          style={{ background: artworkUrl === game.imageUrl ? "rgba(183,255,24,0.08)" : CARD_BG, border: `1px solid ${artworkUrl === game.imageUrl ? "rgba(183,255,24,0.35)" : CARD_BORDER}` }}>
          <img src={game.imageUrl} alt="" className="w-16 h-10 rounded object-cover shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-bold text-white">Game header image</div>
            <div className="text-[11px] text-white/40 truncate">{game.imageUrl}</div>
          </div>
          {artworkUrl === game.imageUrl && <Check size={14} style={{ color: NEON }} />}
        </button>
      )}

      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-white/40 block mb-2">Image URL</label>
        <input value={artworkUrl} onChange={e => onSetArtwork(e.target.value)}
          placeholder="https://…"
          className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)" }}
        />
      </div>

      {artworkUrl && (
        <div className="rounded-xl overflow-hidden aspect-video w-full max-w-sm" style={{ border: `1px solid ${CARD_BORDER}` }}>
          <img src={artworkUrl} alt="Campaign artwork" className="w-full h-full object-cover" onError={e => ((e.target as HTMLImageElement).style.display = "none")} />
        </div>
      )}

      {!artworkUrl && (
        <div className="rounded-xl flex items-center justify-center aspect-video w-full max-w-sm" style={{ background: CARD_BG, border: `1px dashed ${CARD_BORDER}` }}>
          <div className="text-center">
            <ImageIcon size={24} className="mx-auto mb-2 text-white/15" />
            <div className="text-[11px] text-white/25">No artwork selected (optional)</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Step 6: Review & Submit ──────────────────────────────────────────────

function StepReview({ template, game, startType, scheduledDate, demoKeys, fullKeys, artworkUrl }: any) {
  const rows = [
    { label: "Game", value: game?.name ?? "—" },
    { label: "Campaign Package", value: template.name },
    { label: "Duration", value: `${template.duration} days` },
    { label: "Participants", value: template.participant_capacity },
    { label: "Start", value: startType === "asap" ? "As soon as approved" : scheduledDate || "—" },
    { label: "Demo Keys", value: `${demoKeys.length} uploaded (${template.demo_keys_required} required)` },
    { label: "Full Keys", value: `${fullKeys.length} uploaded (${template.full_keys_required} required)` },
    { label: "Estimated Clips", value: template.estimated_clips > 0 ? `Up to ${template.estimated_clips}` : "—" },
    { label: "Estimated Screenshots", value: template.estimated_screenshots > 0 ? `Up to ${template.estimated_screenshots}` : "—" },
    { label: "Completion Reward", value: template.completion_reward_description },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-black text-white mb-1">Review & Submit</h3>
        <p className="text-[12px] text-white/40">
          Review your campaign before submitting to Gamefolio. Once submitted, the campaign will be reviewed within 24 hours.
        </p>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${CARD_BORDER}` }}>
        {rows.map(({ label, value }, i) => (
          <div key={label} className={`flex items-start gap-4 px-4 py-3 ${i !== rows.length - 1 ? "border-b" : ""}`}
            style={{ borderColor: "rgba(255,255,255,0.05)", background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent" }}>
            <div className="text-[11px] font-bold text-white/40 uppercase tracking-wide w-36 shrink-0 pt-0.5">{label}</div>
            <div className="text-sm text-white flex-1">{value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl p-4" style={{ background: "rgba(183,255,24,0.04)", border: "1px solid rgba(183,255,24,0.15)" }}>
        <div className="text-[11px] text-white/40 leading-relaxed">
          <strong className="text-white">Gamefolio review process:</strong> Your campaign will be reviewed for verified game ownership, key validity, artwork quality and content compliance. You'll be notified of the outcome within 24 hours. Gamefolio retains final approval authority over all campaign launches.
        </div>
      </div>
    </div>
  );
}

// ── Wizard Shell ─────────────────────────────────────────────────────────

interface WizardProps {
  template: any;
  onClose: () => void;
  onComplete: () => void;
}

export default function RunCampaignWizard({ template, onClose, onComplete }: WizardProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [game, setGame] = useState<any>(null);
  const [startType, setStartType] = useState<"asap" | "scheduled">("asap");
  const [scheduledDate, setScheduledDate] = useState("");
  const [demoKeys, setDemoKeys] = useState<string[]>([]);
  const [fullKeys, setFullKeys] = useState<string[]>([]);
  const [artworkUrl, setArtworkUrl] = useState(game?.imageUrl ?? "");
  const [instanceId, setInstanceId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canAdvance = () => {
    if (step === 1) return !!game?.name?.trim();
    if (step === 4) {
      const demoOk = template.demo_keys_required === 0 || demoKeys.length >= template.demo_keys_required;
      const fullOk = template.full_keys_required === 0 || fullKeys.length >= template.full_keys_required;
      return demoOk && fullOk;
    }
    return true;
  };

  const createInstance = async () => {
    const res = await apiRequest("POST", "/api/campaigns/instances", {
      templateId: template.id,
      gameName: game?.name,
      gameId: game?.id ?? null,
      gameArtworkUrl: game?.imageUrl ?? null,
      gameSteamAppId: game?.steamAppId ?? null,
      gameItchUrl: game?.itchUrl ?? null,
      gameEpicSlug: game?.epicSlug ?? null,
      startType,
      scheduledStart: startType === "scheduled" && scheduledDate ? scheduledDate : null,
      artworkUrl: artworkUrl || null,
    });
    if (!res.ok) throw new Error("Failed to create campaign");
    return res.json();
  };

  const uploadKeys = async (id: number) => {
    if (demoKeys.length > 0) {
      await apiRequest("POST", `/api/campaigns/instances/${id}/keys`, { keyType: "demo", keys: demoKeys });
    }
    if (fullKeys.length > 0) {
      await apiRequest("POST", `/api/campaigns/instances/${id}/keys`, { keyType: "full", keys: fullKeys });
    }
  };

  const handleSubmit = async (asDraft = false) => {
    setSubmitting(true);
    try {
      let id = instanceId;
      if (!id) {
        const inst = await createInstance();
        id = inst.id;
        setInstanceId(id);
        await uploadKeys(id!);
      }

      if (!asDraft) {
        const submitRes = await apiRequest("POST", `/api/campaigns/instances/${id}/submit`, {});
        if (!submitRes.ok) throw new Error("Submit failed");
        toast({ description: "Campaign submitted to Gamefolio for review! You'll hear back within 24 hours." });
      } else {
        toast({ description: "Campaign saved as draft." });
      }

      queryClient.invalidateQueries({ queryKey: ["/api/campaigns/instances"] });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns/overview"] });
      onComplete();
    } catch (err: any) {
      toast({ description: err.message || "Failed to submit campaign", variant: "gamefolioError" });
    } finally {
      setSubmitting(false);
    }
  };

  const progressPct = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)" }}>
      <div className="w-full max-w-xl rounded-2xl flex flex-col max-h-[95vh]" style={{ background: "#0d1520", border: "1px solid rgba(255,255,255,0.12)" }}>
        {/* Header */}
        <div className="p-5 pb-4 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-white/30 mb-0.5">
                Run Campaign — Step {step} of {STEPS.length}
              </div>
              <div className="text-base font-black text-white">{STEPS[step - 1].label}</div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-colors">
              <X size={16} />
            </button>
          </div>
          {/* Progress bar */}
          <div className="h-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div className="h-1 rounded-full transition-all" style={{ width: `${progressPct}%`, background: NEON }} />
          </div>
          {/* Step dots */}
          <div className="flex justify-between mt-2">
            {STEPS.map(s => (
              <div key={s.id} className="flex flex-col items-center gap-0.5">
                <div className="w-2 h-2 rounded-full transition-all"
                  style={{ background: step >= s.id ? NEON : "rgba(255,255,255,0.12)" }} />
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {step === 1 && <StepSelectGame game={game} onSelect={setGame} />}
          {step === 2 && <StepConfirmPackage template={template} />}
          {step === 3 && <StepStartDate startType={startType} scheduledDate={scheduledDate} onChangeType={setStartType} onChangeDate={setScheduledDate} />}
          {step === 4 && <StepUploadKeys template={template} demoKeys={demoKeys} fullKeys={fullKeys} onSetDemo={setDemoKeys} onSetFull={setFullKeys} />}
          {step === 5 && <StepArtwork artworkUrl={artworkUrl} onSetArtwork={setArtworkUrl} game={game} />}
          {step === 6 && <StepReview template={template} game={game} startType={startType} scheduledDate={scheduledDate} demoKeys={demoKeys} fullKeys={fullKeys} artworkUrl={artworkUrl} />}
        </div>

        {/* Footer */}
        <div className="p-5 shrink-0 flex gap-3" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          {step > 1 ? (
            <button onClick={() => setStep(s => s - 1)} disabled={submitting}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-white/60 border border-white/10 hover:text-white transition-colors">
              <ChevronLeft size={14} /> Back
            </button>
          ) : (
            <button onClick={onClose}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-white/60 border border-white/10 hover:text-white transition-colors">
              Cancel
            </button>
          )}

          <div className="flex-1" />

          {step < STEPS.length ? (
            <button onClick={() => setStep(s => s + 1)} disabled={!canAdvance()}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-black transition-all hover:brightness-110"
              style={{ background: NEON, color: "#070b10", opacity: !canAdvance() ? 0.4 : 1 }}>
              Continue <ChevronRight size={14} />
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => handleSubmit(true)} disabled={submitting}
                className="px-4 py-2.5 rounded-xl text-sm font-bold border border-white/10 text-white/60 hover:text-white transition-colors">
                {submitting ? <Loader2 size={14} className="animate-spin" /> : "Save Draft"}
              </button>
              <button onClick={() => handleSubmit(false)} disabled={submitting}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-black"
                style={{ background: NEON, color: "#070b10" }}>
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <><ClipboardCheck size={14} /> Submit to Gamefolio</>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
