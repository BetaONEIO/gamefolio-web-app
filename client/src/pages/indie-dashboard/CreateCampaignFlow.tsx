import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Rocket, Clock, Users, KeyRound, Lock, AlertTriangle, Loader2,
  ChevronRight, ChevronLeft, Check, ShieldCheck, Calendar,
  CheckCircle2, Search, Sparkles, Cog, Zap,
} from "lucide-react";
import { NEON } from "./constants";

// ─────────────────────────────────────────────
// STEP 1: Pick Campaign Type — 4 simplified options
// ─────────────────────────────────────────────

interface CampaignType {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  duration: number;
  capacity: number;
  demoKeys: number;
  fullKeys: number;
  recommended?: boolean;
  custom?: boolean;
  icon: any;
  estimated: {
    clips: number; reels: number; screenshots: number; feedback: number;
    viewsMin: number; viewsMax: number;
  };
}

const CAMPAIGN_TYPES: CampaignType[] = [
  {
    slug: "quick-creator",
    name: "Quick Creator Campaign",
    tagline: "Get your first creators playing fast",
    description: "5-day sprint to get creators engaged with quick clips and first impressions. Great for new launches or building momentum.",
    duration: 5,
    capacity: 20,
    demoKeys: 20,
    fullKeys: 20,
    icon: Zap,
    estimated: { clips: 40, reels: 10, screenshots: 40, feedback: 20, viewsMin: 3000, viewsMax: 15000 },
  },
  {
    slug: "content-boost",
    name: "Content Boost Campaign",
    tagline: "Build a content library",
    description: "10-day multi-format campaign to generate clips, reels and screenshots. Best for marketing assets and discovery.",
    duration: 10,
    capacity: 35,
    demoKeys: 35,
    fullKeys: 35,
    recommended: true,
    icon: Sparkles,
    estimated: { clips: 70, reels: 35, screenshots: 105, feedback: 35, viewsMin: 10000, viewsMax: 50000 },
  },
  {
    slug: "creator-showcase",
    name: "Creator Showcase Campaign",
    tagline: "Maximum exposure with premium content",
    description: "21-day deep engagement with streams, reviews and clips. The premium option for serious developer marketing.",
    duration: 21,
    capacity: 25,
    demoKeys: 25,
    fullKeys: 25,
    icon: Rocket,
    estimated: { clips: 50, reels: 25, screenshots: 75, feedback: 25, viewsMin: 15000, viewsMax: 80000 },
  },
  {
    slug: "custom-campaign",
    name: "Custom Campaign",
    tagline: "Full control for experienced developers",
    description: "Set your own duration, capacity, regions and platforms. For developers who know exactly what they need.",
    duration: 14,
    capacity: 20,
    demoKeys: 20,
    fullKeys: 20,
    custom: true,
    icon: Cog,
    estimated: { clips: 40, reels: 20, screenshots: 60, feedback: 20, viewsMin: 5000, viewsMax: 30000 },
  },
];

const STEP_LABELS = ["Pick Type", "Customise", "Review", "Launch"];

interface CampaignSettings {
  campaignName: string;
  description: string;
  gameName: string;
  gameId: number | null;
  gameImageUrl: string | null;
  startType: "asap" | "scheduled";
  scheduledDate: string;
  regions: string;
  platforms: string[];
  // custom overrides
  customDuration?: number;
  customCapacity?: number;
}

const REGION_OPTIONS = [
  { id: "worldwide",        label: "Worldwide" },
  { id: "north_america",    label: "North America" },
  { id: "europe",           label: "Europe" },
  { id: "asia_pacific",     label: "Asia Pacific" },
  { id: "latin_america",    label: "Latin America" },
  { id: "middle_east",      label: "Middle East & Africa" },
];

const PLATFORM_OPTIONS = [
  { id: "pc",      label: "PC (Windows / Mac / Linux)" },
  { id: "ps",      label: "PlayStation" },
  { id: "xbox",    label: "Xbox" },
  { id: "switch",  label: "Nintendo Switch" },
  { id: "mobile",  label: "Mobile (iOS / Android)" },
];

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function StepHeader({ step, total, label }: { step: number; total: number; label: string }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} className="h-1 flex-1 rounded-full transition-all duration-500"
            style={{ background: i < step ? NEON : i === step - 1 ? "rgba(183,255,24,0.4)" : "rgba(255,255,255,0.08)" }} />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-0.5">
            Step {step} of {total}
          </p>
          <h2 className="text-xl font-black text-white">{label}</h2>
        </div>
      </div>
    </div>
  );
}

function TypeCard({ type, selected, onSelect }: { type: CampaignType; selected: boolean; onSelect: () => void }) {
  const Icon = type.icon;
  const est = type.estimated;
  return (
    <button onClick={onSelect}
      className="w-full text-left rounded-2xl transition-all p-5"
      style={{
        background: selected ? "rgba(183,255,24,0.055)" : "rgba(255,255,255,0.025)",
        border: `1px solid ${selected ? "rgba(183,255,24,0.3)" : "rgba(255,255,255,0.07)"}`,
      }}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded flex items-center gap-1"
              style={{ background: "rgba(183,255,24,0.1)", color: NEON }}>
              <ShieldCheck className="w-2.5 h-2.5" /> GAMEFOLIO VERIFIED
            </span>
            {type.recommended && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                style={{ background: "rgba(251,146,60,0.1)", color: "#fb923c" }}>
                Recommended
              </span>
            )}
            {type.custom && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                style={{ background: "rgba(96,165,250,0.1)", color: "#60a5fa" }}>
                Advanced
              </span>
            )}
          </div>
          <h3 className="text-base font-black text-white leading-tight">{type.name}</h3>
          <p className="text-xs font-semibold mt-0.5" style={{ color: selected ? NEON : "rgba(255,255,255,0.45)" }}>
            {type.tagline}
          </p>
          <p className="text-[12px] text-white/40 mt-1.5 line-clamp-2">{type.description}</p>
        </div>
        <div className="w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center mt-1"
          style={{ borderColor: selected ? NEON : "rgba(255,255,255,0.2)", background: selected ? NEON : "transparent" }}>
          {selected && <Check className="w-3.5 h-3.5" style={{ color: "#070b10" }} />}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { icon: Clock,    label: "Duration",   value: `${type.duration}d` },
          { icon: Users,    label: "Creators",   value: type.capacity },
          { icon: KeyRound, label: "Demo Keys",  value: type.demoKeys },
          { icon: KeyRound, label: "Full Keys",  value: type.fullKeys },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-xl p-2.5 text-center"
            style={{ background: "rgba(255,255,255,0.04)" }}>
            <Icon className="w-3 h-3 mx-auto mb-1 text-white/25" />
            <div className="text-sm font-black text-white">{value}</div>
            <div className="text-[9px] text-white/30 uppercase tracking-wide">{label}</div>
          </div>
        ))}
      </div>

      <div className="text-[10px] text-white/25">
        Est. output: {est.clips} clips · {est.reels} reels · {est.screenshots} screenshots · {est.feedback} reviews
        <span className="text-white/15"> · {est.viewsMin.toLocaleString()}–{est.viewsMax.toLocaleString()} views</span>
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────
// Step 1: Pick Campaign Type
// ─────────────────────────────────────────────

function StepPickType({ selected, onSelect }: { selected: CampaignType | null; onSelect: (t: CampaignType) => void }) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-white/40">
        Choose the campaign type that matches your goals. Every campaign gives creators a <strong className="text-white/60">demo key on join</strong> and a <strong className="text-white/60">full game key on completion</strong>.
      </p>

      {CAMPAIGN_TYPES.map(t => (
        <TypeCard key={t.slug} type={t} selected={selected?.slug === t.slug} onSelect={() => onSelect(t)} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// Step 2: Customise (skip for non-custom)
// ─────────────────────────────────────────────

const fieldStyle = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "#fff",
  borderRadius: "12px",
  padding: "10px 14px",
  outline: "none",
  width: "100%",
  fontSize: "13px",
};

function StepCustomise({ type, settings, onChange }: {
  type: CampaignType; settings: CampaignSettings; onChange: (s: Partial<CampaignSettings>) => void;
}) {
  const [gameQuery, setGameQuery] = useState("");
  const { data: indieProfile } = useQuery<any>({
    queryKey: ["/api/indie/profile"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  const { data: gameResults = [], isFetching } = useQuery<any[]>({
    queryKey: ["/api/games/search", gameQuery],
    queryFn: async () => {
      if (gameQuery.trim().length < 2) return [];
      const res = await fetch(`/api/games/search?q=${encodeURIComponent(gameQuery)}`);
      return res.ok ? res.json() : [];
    },
    enabled: gameQuery.trim().length >= 2,
  });

  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];
  const labelStyle = "text-[10px] font-bold text-white/30 uppercase tracking-wider block mb-1.5";

  return (
    <div className="space-y-6">
      <p className="text-sm text-white/40">
        Personalise your campaign. The bounty requirements, XP rewards and creator protections are managed by Gamefolio and cannot be changed.
      </p>

      {/* Gamefolio-managed notice */}
      <div className="flex items-start gap-3 rounded-xl p-4"
        style={{ background: "rgba(251,146,60,0.06)", border: "1px solid rgba(251,146,60,0.15)" }}>
        <Lock className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-bold text-orange-300 mb-0.5">Gamefolio-managed settings</p>
          <p className="text-[11px] text-orange-300/60">
            Duration ({type.duration} days) · {type.capacity} creator capacity · {type.demoKeys} demo keys · {type.fullKeys} full game keys · Bounty requirements · XP values · Moderation rules
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Campaign name */}
        <div className="sm:col-span-2">
          <label className={labelStyle}>Campaign Name</label>
          <input style={fieldStyle} value={settings.campaignName}
            onChange={e => onChange({ campaignName: e.target.value })}
            placeholder={`${type.name} — My Game`} />
        </div>

        {/* Game */}
        <div className="sm:col-span-2">
          <label className={labelStyle}>Your Game</label>
          {indieProfile?.profile?.gameName && (
            <button onClick={() => onChange({
              gameName: indieProfile.profile.gameName,
              gameId: null,
              gameImageUrl: indieProfile.profile.headerImageUrl ?? null,
            })}
              className="flex items-center gap-3 w-full p-3 rounded-xl mb-2 text-left transition-all"
              style={{
                background: settings.gameName === indieProfile.profile.gameName ? "rgba(183,255,24,0.07)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${settings.gameName === indieProfile.profile.gameName ? "rgba(183,255,24,0.3)" : "rgba(255,255,255,0.07)"}`,
              }}>
              {indieProfile.profile.headerImageUrl && (
                <img src={indieProfile.profile.headerImageUrl} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-white truncate">{indieProfile.profile.gameName}</div>
                <div className="text-[10px] text-white/30">From your Game Profile</div>
              </div>
              {settings.gameName === indieProfile.profile.gameName && <Check className="w-3.5 h-3.5 shrink-0" style={{ color: NEON }} />}
            </button>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25" />
            <input style={{ ...fieldStyle, paddingLeft: "36px" }} value={gameQuery}
              onChange={e => setGameQuery(e.target.value)} placeholder="Or search for your game…" />
            {isFetching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 animate-spin text-white/25" />}
          </div>
          {gameResults.length > 0 && (
            <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
              {gameResults.map((g: any) => (
                <button key={g.id}
                  onClick={() => { onChange({ gameName: g.title, gameId: g.id, gameImageUrl: g.imageUrl ?? null }); setGameQuery(""); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left hover:bg-white/5 transition-colors text-sm text-white">
                  {g.imageUrl && <img src={g.imageUrl} alt="" className="w-7 h-7 rounded object-cover shrink-0" />}
                  {g.title}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Description */}
        <div className="sm:col-span-2">
          <label className={labelStyle}>Public Campaign Description <span className="text-white/20 normal-case font-normal">(optional)</span></label>
          <textarea
            style={{ ...fieldStyle, minHeight: "80px", resize: "vertical" } as any}
            value={settings.description}
            onChange={e => onChange({ description: e.target.value })}
            placeholder="Tell creators what makes your game worth covering…"
          />
        </div>

        {/* Start date */}
        <div>
          <label className={labelStyle}>Start Date</label>
          <div className="space-y-2">
            {(["asap", "scheduled"] as const).map(t => (
              <button key={t} onClick={() => onChange({ startType: t })}
                className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                style={{
                  background: settings.startType === t ? "rgba(183,255,24,0.07)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${settings.startType === t ? "rgba(183,255,24,0.25)" : "rgba(255,255,255,0.07)"}`,
                }}>
                <div className="w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center"
                  style={{ borderColor: settings.startType === t ? NEON : "rgba(255,255,255,0.2)", background: settings.startType === t ? NEON : "transparent" }}>
                  {settings.startType === t && <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#070b10" }} />}
                </div>
                <div>
                  <div className="text-xs font-bold text-white">
                    {t === "asap" ? "Start after review" : "Schedule a date"}
                  </div>
                  <div className="text-[10px] text-white/30 mt-0.5">
                    {t === "asap" ? "Launches as soon as Gamefolio approves" : "Pick a specific launch date"}
                  </div>
                </div>
              </button>
            ))}
            {settings.startType === "scheduled" && (
              <input type="date" style={{ ...fieldStyle, colorScheme: "dark" } as any}
                value={settings.scheduledDate} min={tomorrowStr}
                onChange={e => onChange({ scheduledDate: e.target.value })} />
            )}
          </div>
        </div>

        {/* Eligible Regions */}
        <div>
          <label className={labelStyle}>Eligible Regions</label>
          <select
            style={{ ...fieldStyle, paddingRight: "32px" } as any}
            value={settings.regions}
            onChange={e => onChange({ regions: e.target.value })}>
            {REGION_OPTIONS.map(r => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
        </div>

        {/* Supported Platforms */}
        <div className="sm:col-span-2">
          <label className={labelStyle}>Supported Platforms <span className="text-white/20 normal-case font-normal">(select all that apply)</span></label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PLATFORM_OPTIONS.map(p => {
              const on = settings.platforms.includes(p.id);
              return (
                <button key={p.id}
                  onClick={() => onChange({
                    platforms: on
                      ? settings.platforms.filter(x => x !== p.id)
                      : [...settings.platforms, p.id],
                  })}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-all"
                  style={{
                    background: on ? "rgba(183,255,24,0.07)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${on ? "rgba(183,255,24,0.25)" : "rgba(255,255,255,0.07)"}`,
                  }}>
                  <div className="w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center"
                    style={{ borderColor: on ? NEON : "rgba(255,255,255,0.2)", background: on ? NEON : "transparent" }}>
                    {on && <Check className="w-2.5 h-2.5" style={{ color: "#070b10" }} />}
                  </div>
                  <span className="text-[11px] font-semibold" style={{ color: on ? NEON : "rgba(255,255,255,0.55)" }}>
                    {p.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom overrides (only for custom type) */}
        {type.custom && (
          <>
            <div>
              <label className={labelStyle}>Custom Duration (days)</label>
              <input type="number" min={3} max={60} style={fieldStyle}
                value={settings.customDuration ?? type.duration}
                onChange={e => onChange({ customDuration: Math.max(3, Math.min(60, Number(e.target.value))) })} />
            </div>
            <div>
              <label className={labelStyle}>Custom Creator Capacity</label>
              <input type="number" min={5} max={100} style={fieldStyle}
                value={settings.customCapacity ?? type.capacity}
                onChange={e => onChange({ customCapacity: Math.max(5, Math.min(100, Number(e.target.value))) })} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Step 3: Review
// ─────────────────────────────────────────────

function StepReview({ type, settings, keysOk, onConfirm, confirmed }: {
  type: CampaignType; settings: CampaignSettings; keysOk: boolean;
  onConfirm: (v: boolean) => void; confirmed: boolean;
}) {
  const { data: bountyStatus } = useQuery<any>({
    queryKey: ["/api/indie/bounty-status"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const demoAvail = bountyStatus?.demoKeys?.available ?? 0;
  const fullAvail = bountyStatus?.fullGameKeys?.available ?? 0;
  const duration = type.custom && settings.customDuration ? settings.customDuration : type.duration;
  const capacity = type.custom && settings.customCapacity ? settings.customCapacity : type.capacity;

  const regionLabel = REGION_OPTIONS.find(r => r.id === settings.regions)?.label ?? "Worldwide";
  const platformsLabel = settings.platforms.length === 0
    ? "All platforms"
    : settings.platforms.map(p => PLATFORM_OPTIONS.find(o => o.id === p)?.label ?? p).join(", ");

  const rows = [
    { label: "Campaign Name",  value: settings.campaignName || type.name },
    { label: "Campaign Type",  value: type.name },
    { label: "Game",          value: settings.gameName || "—" },
    { label: "Duration",      value: `${duration} days` },
    { label: "Creator Capacity", value: capacity },
    { label: "Start",         value: settings.startType === "asap" ? "After Gamefolio review" : settings.scheduledDate || "—" },
    { label: "Demo Keys Needed", value: type.demoKeys },
    { label: "Full Keys Needed", value: type.fullKeys },
    { label: "Demo Keys in Vault", value: `${demoAvail} available` },
    { label: "Full Keys in Vault", value: `${fullAvail} available` },
    { label: "Creator Eligibility", value: regionLabel },
    { label: "Supported Platforms", value: platformsLabel },
  ];

  return (
    <div className="space-y-6">
      <p className="text-sm text-white/40">
        Review your campaign before launching. Keys will be committed to the Campaign Key Vault.
      </p>

      {/* Summary table */}
      <div className="rounded-2xl overflow-hidden"
        style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
        {rows.map(({ label, value }, i) => (
          <div key={label}
            className="flex items-start gap-4 px-4 py-3"
            style={{
              borderBottom: i < rows.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
              background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent",
            }}>
            <div className="text-[10px] font-bold text-white/30 uppercase tracking-wide w-40 shrink-0 pt-0.5">{label}</div>
            <div className="text-sm text-white flex-1">{value}</div>
          </div>
        ))}
      </div>

      {/* Key status */}
      {!keysOk && (
        <div className="rounded-2xl p-5"
          style={{ background: "rgba(248,113,113,0.05)", border: "1px solid rgba(248,113,113,0.2)" }}>
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-300">More keys needed</p>
              <p className="text-xs text-red-300/60 mt-1">
                Upload the required keys to your Key Vault before launching. Every campaign needs both demo keys (for creators to join) and full game keys (for completion rewards).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Escrow warning */}
      <div className="rounded-2xl p-5"
        style={{ background: "rgba(251,146,60,0.06)", border: "1px solid rgba(251,146,60,0.2)" }}>
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-orange-300 mb-2">Campaign Key Vault — Escrow Protection</p>
            <p className="text-xs text-orange-300/70 leading-relaxed">
              Once this campaign begins, committed keys will be locked in the Gamefolio Key Vault. They <strong className="text-orange-300">cannot be withdrawn</strong> after creators begin participating.
            </p>
          </div>
        </div>
      </div>

      {/* Confirmation checkbox */}
      <button onClick={() => onConfirm(!confirmed)}
        className="w-full flex items-start gap-3 text-left p-4 rounded-2xl transition-all"
        style={{
          background: confirmed ? "rgba(183,255,24,0.06)" : "rgba(255,255,255,0.02)",
          border: `1px solid ${confirmed ? "rgba(183,255,24,0.3)" : "rgba(255,255,255,0.09)"}`,
        }}>
        <div className="w-5 h-5 rounded-md border-2 shrink-0 flex items-center justify-center mt-0.5 transition-all"
          style={{ borderColor: confirmed ? NEON : "rgba(255,255,255,0.2)", background: confirmed ? NEON : "transparent" }}>
          {confirmed && <Check className="w-3 h-3" style={{ color: "#070b10" }} />}
        </div>
        <span className="text-sm text-white/70 leading-snug">
          I understand that the campaign rewards will be committed to the Campaign Key Vault and cannot be withdrawn after creators join and complete the campaign.
        </span>
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Flow
// ─────────────────────────────────────────────

export default function CreateCampaignFlow({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState<CampaignType | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [settings, setSettings] = useState<CampaignSettings>({
    campaignName: "",
    description: "",
    startType: "asap",
    scheduledDate: "",
    gameName: "",
    gameId: null,
    gameImageUrl: null,
    regions: "worldwide",
    platforms: [],
  });

  const { data: bountyStatus } = useQuery<any>({
    queryKey: ["/api/indie/bounty-status"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: templates = [] } = useQuery<any[]>({
    queryKey: ["/api/campaigns/templates"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const keysOk = !!selectedType && (
    (bountyStatus?.demoKeys?.available ?? 0) >= selectedType.demoKeys &&
    (bountyStatus?.fullGameKeys?.available ?? 0) >= selectedType.fullKeys
  );

  // Map campaign type slug to actual template ID
  const getTemplateId = (): number | null => {
    if (!selectedType) return null;
    const tmpl = templates.find((t: any) => t.slug === selectedType.slug);
    return tmpl?.id ?? null;
  };

  // Effective step count: skip customise if not custom
  const hasCustomStep = selectedType?.custom ?? false;
  const totalSteps = hasCustomStep ? 4 : 3;
  const effectiveStep = hasCustomStep ? step : (step >= 2 ? step + 1 : step);
  const stepLabel = step <= totalSteps ? STEP_LABELS[effectiveStep - 1] : "Launch";

  const canAdvance = (): boolean => {
    if (step === 1) return !!selectedType;
    if (step === 2) return hasCustomStep ? settings.gameName.trim().length > 0 : true;
    if (step === 3) return keysOk && confirmed;
    return false;
  };

  const handleSubmit = async () => {
    const templateId = getTemplateId();
    if (!templateId || !selectedType) return;
    setSubmitting(true);
    try {
      const inst = await apiRequest("POST", "/api/campaigns/instances", {
        templateId,
        gameName: settings.gameName,
        gameId: settings.gameId,
        gameArtworkUrl: settings.gameImageUrl,
        startType: settings.startType,
        scheduledStart: settings.startType === "scheduled" && settings.scheduledDate ? settings.scheduledDate : null,
        artworkUrl: settings.gameImageUrl || null,
        customName: settings.campaignName || undefined,
        description: settings.description || undefined,
        regions: settings.regions,
        platforms: settings.platforms.length > 0 ? settings.platforms : undefined,
      });
      const instData = await inst.json();
      if (!inst.ok) throw new Error(instData.message || "Failed to create campaign");

      const submitRes = await apiRequest("POST", `/api/campaigns/instances/${instData.id}/submit`, {});
      if (!submitRes.ok) throw new Error("Failed to submit campaign for review");

      queryClient.invalidateQueries({ queryKey: ["/api/campaigns/instances"] });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns/overview"] });

      toast({ description: "Campaign submitted for review. You'll hear back within 24 hours." });
      onComplete();
    } catch (err: any) {
      toast({ description: err.message || "Failed to launch campaign", variant: "gamefolioError" as any });
    } finally {
      setSubmitting(false);
    }
  };

  const updateSettings = (partial: Partial<CampaignSettings>) => setSettings(s => ({ ...s, ...partial }));

  return (
    <div className="max-w-2xl">
      <StepHeader step={effectiveStep} total={4} label={stepLabel} />

      <div className="min-h-[400px]">
        {step === 1 && <StepPickType selected={selectedType} onSelect={t => { setSelectedType(t); setConfirmed(false); }} />}
        {step === 2 && hasCustomStep && selectedType && (
          <StepCustomise type={selectedType} settings={settings} onChange={updateSettings} />
        )}
        {((step === 2 && !hasCustomStep) || (step === 3 && hasCustomStep) || (step === totalSteps && selectedType)) && selectedType && (
          <StepReview type={selectedType} settings={settings} keysOk={keysOk} confirmed={confirmed} onConfirm={setConfirmed} />
        )}
      </div>

      <div className="flex items-center justify-between pt-8 mt-8"
        style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <button
          onClick={() => step > 1 ? setStep(s => s - 1) : undefined}
          disabled={step === 1}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-0"
          style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.55)" }}>
          <ChevronLeft className="w-4 h-4" /> Back
        </button>

        {step < totalSteps ? (
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={!canAdvance()}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all hover:brightness-110 disabled:opacity-40"
            style={{ background: NEON, color: "#070b10" }}>
            Continue <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!canAdvance() || submitting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all hover:brightness-110 disabled:opacity-40"
            style={{ background: NEON, color: "#070b10" }}>
            {submitting
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Launching…</>
              : <><Lock className="w-4 h-4" /> Commit Keys &amp; Launch Campaign</>}
          </button>
        )}
      </div>
    </div>
  );
}