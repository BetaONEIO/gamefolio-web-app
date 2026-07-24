import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Rocket, Clock, Users, KeyRound, Lock, AlertTriangle, Loader2,
  ChevronRight, ChevronLeft, Check, ShieldCheck, Calendar,
  CheckCircle2, Sparkles, Cog, Zap, Film, Camera,
  MessageSquare, Target, AlertCircle, Gamepad2,
} from "lucide-react";
import { NEON } from "./constants";

// ── Design tokens (match BountiesPage exactly) ────────────────────────────────
const CARD_BG     = "#0e1520";
const CARD_BORDER = "rgba(255,255,255,0.10)";

// ─────────────────────────────────────────────
// Campaign type definitions
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
  xpReward: number;
  recommended?: boolean;
  custom?: boolean;
  icon: any;
  pills: { ct: string; qty: number }[];
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
    xpReward: 750,
    icon: Zap,
    pills: [{ ct: "clip", qty: 2 }, { ct: "screenshot", qty: 2 }],
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
    xpReward: 1200,
    recommended: true,
    icon: Sparkles,
    pills: [{ ct: "clip", qty: 2 }, { ct: "reel", qty: 1 }, { ct: "screenshot", qty: 3 }],
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
    xpReward: 2500,
    icon: Rocket,
    pills: [{ ct: "clip", qty: 2 }, { ct: "reel", qty: 1 }, { ct: "screenshot", qty: 3 }, { ct: "stream", qty: 1 }],
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
    xpReward: 1000,
    custom: true,
    icon: Cog,
    pills: [{ ct: "clip", qty: 2 }, { ct: "screenshot", qty: 2 }, { ct: "feedback", qty: 1 }],
    estimated: { clips: 40, reels: 20, screenshots: 60, feedback: 20, viewsMin: 5000, viewsMax: 30000 },
  },
];

const STEP_LABELS = ["Pick Type", "Customise", "Review", "Launch"];

interface CampaignSettings {
  description: string;
  gameName: string;
  gameId: number | null;
  gameImageUrl: string | null;
  startType: "asap" | "scheduled";
  scheduledDate: string;
  regions: string;
  platforms: string[];
  customDuration?: number;
  customCapacity?: number;
}

const REGION_OPTIONS = [
  { id: "worldwide",     label: "Worldwide" },
  { id: "north_america", label: "North America" },
  { id: "europe",        label: "Europe" },
  { id: "asia_pacific",  label: "Asia Pacific" },
  { id: "latin_america", label: "Latin America" },
  { id: "middle_east",   label: "Middle East & Africa" },
];

const PLATFORM_OPTIONS = [
  { id: "pc",     label: "PC (Windows / Mac / Linux)" },
  { id: "ps",     label: "PlayStation" },
  { id: "xbox",   label: "Xbox" },
  { id: "switch", label: "Nintendo Switch" },
  { id: "mobile", label: "Mobile (iOS / Android)" },
];

// ── REQ pill helpers (matches BountiesPage) ───────────────────────────────────
const REQ_ICON: Record<string, any> = {
  clip: Film, screenshot: Camera, feedback: MessageSquare,
  reel: Film, session: Zap, bug: AlertCircle, stream: Zap,
};
function reqPillLabel(ct: string, qty: number) {
  if (ct === "clip")       return `×${qty} Clips`;
  if (ct === "screenshot") return `×${qty} Screenshots`;
  if (ct === "feedback")   return "Feedback";
  if (ct === "reel")       return `×${qty} Reels`;
  if (ct === "stream")     return "Livestream";
  if (ct === "session")    return "Play Session";
  if (ct === "bug")        return `×${qty} Bug Reports`;
  return ct;
}

// ── RewardCol (matches BountiesPage exactly) ──────────────────────────────────
function RewardCol({ icon, label, sublabel, value, active }: {
  icon: any; label: string; sublabel: string; value: string; active: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all duration-200"
      style={{
        background: active ? "rgba(184,255,27,0.07)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${active ? "rgba(184,255,27,0.20)" : "rgba(255,255,255,0.07)"}`,
      }}>
      <div className="w-[40px] h-[40px] flex items-center justify-center">{icon}</div>
      <span className="text-[10px] font-black leading-tight text-center px-1"
        style={{ color: active ? NEON : "rgba(255,255,255,0.85)" }}>{value}</span>
      <span className="text-[9px] font-bold leading-tight text-center px-1"
        style={{ color: "rgba(255,255,255,0.40)" }}>{label}</span>
      <span className="text-[8px] leading-tight text-center px-1 uppercase tracking-wider"
        style={{ color: active ? "rgba(184,255,27,0.55)" : "rgba(255,255,255,0.20)" }}>{sublabel}</span>
    </div>
  );
}

// ── Live Preview Card (styled exactly like CampaignCard in BountiesPage) ──────
function PreviewCard({ type, settings }: { type: CampaignType | null; settings: CampaignSettings }) {
  const demoKeys = type?.demoKeys ?? 0;
  const fullKeys = type?.fullKeys ?? 0;
  const xp       = type?.xpReward ?? 0;
  const duration = type?.custom && settings.customDuration ? settings.customDuration : (type?.duration ?? 0);
  const pills    = type?.pills ?? [];
  const title    = settings.campaignName.trim() || type?.name || "Your Campaign";
  const desc     = settings.description.trim();
  const imgUrl   = settings.gameImageUrl;

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>

      {/* Hero artwork */}
      <div className="relative overflow-hidden" style={{ height: 176 }}>
        {imgUrl ? (
          <img src={imgUrl} alt={settings.gameName}
            className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #0d1624 0%, #0a1020 100%)" }}>
            <Target size={40} color="rgba(184,255,27,0.12)" />
          </div>
        )}
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(to top, #0e1520 0%, rgba(14,21,32,0.18) 60%, transparent 100%)" }} />
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full"
            style={{ background: NEON, color: "#070b10" }}>
            <ShieldCheck size={9} /> GF Verified
          </span>
          {type?.recommended && (
            <span className="inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-full"
              style={{ background: "rgba(251,146,60,0.90)", color: "#fff" }}>
              ⭐ Recommended
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="px-4 pb-4 pt-3.5 space-y-3">

        {/* Title + game name */}
        <div>
          {settings.gameName && (
            <p className="text-[11px] font-bold mb-0.5" style={{ color: "rgba(255,255,255,0.40)" }}>
              {settings.gameName}
            </p>
          )}
          <h3 className="text-base font-black text-white leading-tight tracking-tight">
            {title}
          </h3>
          {desc && (
            <p className="text-[11px] mt-1 line-clamp-1" style={{ color: "rgba(255,255,255,0.45)" }}>
              {desc}
            </p>
          )}
        </div>

        {/* Requirement pills */}
        {pills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {pills.map(({ ct, qty }) => {
              const Icon = REQ_ICON[ct] ?? Target;
              return (
                <span key={ct}
                  className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    color: "rgba(255,255,255,0.70)",
                    border: "1px solid rgba(255,255,255,0.09)",
                  }}>
                  <Icon size={10} /> {reqPillLabel(ct, qty)}
                </span>
              );
            })}
          </div>
        )}

        {/* Urgency row */}
        <div className="flex items-center gap-3 text-[11px]">
          {demoKeys > 0 && (
            <span style={{ color: NEON }} className="font-bold">{demoKeys} demo keys</span>
          )}
          {duration > 0 && (
            <span className="text-white/35 flex items-center gap-1">
              <Clock size={10} /> {duration}d campaign
            </span>
          )}
          {type && (
            <span className="text-white/35 flex items-center gap-1">
              <Users size={10} /> {type.custom && settings.customCapacity ? settings.customCapacity : type.capacity} slots
            </span>
          )}
        </div>

        {/* Rewards — 4 equal columns (matches BountiesPage exactly) */}
        <div className="grid grid-cols-4 gap-1.5">
          <RewardCol
            icon={<img src="/icons/demo-key-icon.png" alt="Demo" className="w-[38px] h-[38px] object-contain"
              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />}
            sublabel="Immediate" label="Demo Key"
            value={demoKeys > 0 ? `${demoKeys}` : "—"} active={demoKeys > 0} />
          <RewardCol
            icon={<img src="/icons/full-game-icon.png" alt="Full" className="w-[38px] h-[38px] object-contain"
              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />}
            sublabel="Reward" label="Full Game"
            value={fullKeys > 0 ? `${fullKeys}` : "—"} active={fullKeys > 0} />
          <RewardCol
            icon={<Zap size={38} color={xp > 0 ? NEON : "rgba(255,255,255,0.15)"} />}
            sublabel="Progress" label="XP"
            value={xp > 0 ? xp.toLocaleString() : "—"} active={xp > 0} />
          <RewardCol
            icon={<img src="/icons/token-icon.png" alt="Token" className="w-[38px] h-[38px] object-contain"
              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />}
            sublabel="Bonus" label="GFT"
            value="—" active={false} />
        </div>

        {/* CTA */}
        <button
          className="w-full py-2.5 rounded-xl text-sm font-black tracking-wide flex items-center justify-center gap-2"
          style={{ background: NEON, color: "#070b10" }}>
          <ShieldCheck size={14} /> Accept Mission
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Step header (progress bar)
// ─────────────────────────────────────────────

function StepHeader({ step, total, label }: { step: number; total: number; label: string }) {
  return (
    <div className="mb-7">
      <div className="flex items-center gap-2 mb-4">
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} className="h-1 flex-1 rounded-full transition-all duration-500"
            style={{ background: i < step ? NEON : i === step - 1 ? "rgba(183,255,24,0.4)" : "rgba(255,255,255,0.08)" }} />
        ))}
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-0.5">
          Step {step} of {total}
        </p>
        <h2 className="text-xl font-black text-white">{label}</h2>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Step 1: Pick Campaign Type
// ─────────────────────────────────────────────

function TypeCard({ type, selected, onSelect }: { type: CampaignType; selected: boolean; onSelect: () => void }) {
  const Icon = type.icon;
  const est = type.estimated;
  return (
    <button onClick={onSelect}
      className="w-full text-left rounded-2xl transition-all p-4"
      style={{
        background: selected ? "rgba(183,255,24,0.055)" : "rgba(255,255,255,0.025)",
        border: `1px solid ${selected ? "rgba(183,255,24,0.3)" : "rgba(255,255,255,0.07)"}`,
      }}>
      <div className="flex items-start justify-between gap-3 mb-3">
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
          <h3 className="text-sm font-black text-white leading-tight">{type.name}</h3>
          <p className="text-xs font-semibold mt-0.5" style={{ color: selected ? NEON : "rgba(255,255,255,0.45)" }}>
            {type.tagline}
          </p>
          <p className="text-[11px] text-white/40 mt-1 line-clamp-2">{type.description}</p>
        </div>
        <div className="w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center mt-0.5"
          style={{ borderColor: selected ? NEON : "rgba(255,255,255,0.2)", background: selected ? NEON : "transparent" }}>
          {selected && <Check className="w-3 h-3" style={{ color: "#070b10" }} />}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1.5 mb-3">
        {[
          { icon: Clock,    label: "Duration",  value: `${type.duration}d` },
          { icon: Users,    label: "Creators",  value: type.capacity },
          { icon: KeyRound, label: "Demo Keys", value: type.demoKeys },
          { icon: KeyRound, label: "Full Keys", value: type.fullKeys },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-lg p-2 text-center"
            style={{ background: "rgba(255,255,255,0.04)" }}>
            <Icon className="w-3 h-3 mx-auto mb-0.5 text-white/25" />
            <div className="text-xs font-black text-white">{value}</div>
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

function StepPickType({ selected, onSelect }: { selected: CampaignType | null; onSelect: (t: CampaignType) => void }) {
  return (
    <div className="space-y-3">
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
// Step 2: Personalise
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
  const { data: indieProfile } = useQuery<any>({
    queryKey: ["/api/indie/profile"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Auto-populate game from indie profile on first load
  useEffect(() => {
    if (indieProfile?.profile?.gameName && !settings.gameName) {
      onChange({
        gameName: indieProfile.profile.gameName,
        gameId: indieProfile.profile.gameId ?? null,
        gameImageUrl: indieProfile.profile.headerImageUrl ?? null,
      });
    }
  }, [indieProfile]);

  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];
  const labelStyle = "text-[10px] font-bold text-white/30 uppercase tracking-wider block mb-1.5";

  const gameName  = settings.gameName || indieProfile?.profile?.gameName;
  const gameImage = settings.gameImageUrl || indieProfile?.profile?.headerImageUrl;

  return (
    <div className="space-y-5">

      {/* ── Read-only campaign summary ── */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Campaign",  value: type.name },
          { label: "Duration",  value: `${type.custom && settings.customDuration ? settings.customDuration : type.duration} Days` },
          { label: "Capacity",  value: `${type.custom && settings.customCapacity ? settings.customCapacity : type.capacity} Creators` },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl p-3 text-center"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="text-[9px] font-bold text-white/25 uppercase tracking-wider mb-1">{label}</div>
            <div className="text-xs font-black text-white leading-tight">{value}</div>
          </div>
        ))}
      </div>

      {/* ── Your Game (read-only, auto from profile) ── */}
      <div>
        <label className={labelStyle}>Your Game</label>
        <div className="flex items-center gap-3 p-3 rounded-xl"
          style={{ background: "rgba(183,255,24,0.04)", border: "1px solid rgba(183,255,24,0.15)" }}>
          {gameImage ? (
            <img src={gameImage} alt={gameName} className="w-10 h-10 rounded-xl object-cover shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.06)" }}>
              <Gamepad2 className="w-5 h-5 text-white/20" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-black text-white truncate">{gameName || "Your game"}</div>
            <div className="text-[10px] flex items-center gap-1 mt-0.5" style={{ color: NEON }}>
              <ShieldCheck className="w-2.5 h-2.5" /> Verified Indie Game
            </div>
          </div>
        </div>
      </div>

      {/* ── Description (optional) ── */}
      <div>
        <label className={labelStyle}>
          Campaign Description <span className="text-white/20 normal-case font-normal">(optional)</span>
        </label>
        <textarea
          style={{ ...fieldStyle, minHeight: "80px", resize: "vertical" } as any}
          value={settings.description}
          onChange={e => onChange({ description: e.target.value })}
          placeholder="Tell creators why your game is worth playing."
        />
      </div>

      {/* ── Launch timing ── */}
      <div>
        <label className={labelStyle}>Launch</label>
        <div className="space-y-2">
          {([
            { value: "asap",      label: "Launch Immediately",  desc: "The campaign becomes live immediately after confirmation." },
            { value: "scheduled", label: "Schedule Launch",     desc: "Pick a specific date for your campaign to go live." },
          ] as const).map(opt => (
            <button key={opt.value} onClick={() => onChange({ startType: opt.value })}
              className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all"
              style={{
                background: settings.startType === opt.value ? "rgba(183,255,24,0.07)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${settings.startType === opt.value ? "rgba(183,255,24,0.25)" : "rgba(255,255,255,0.07)"}`,
              }}>
              <div className="w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center"
                style={{
                  borderColor: settings.startType === opt.value ? NEON : "rgba(255,255,255,0.2)",
                  background: settings.startType === opt.value ? NEON : "transparent",
                }}>
                {settings.startType === opt.value && <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#070b10" }} />}
              </div>
              <div>
                <div className="text-xs font-bold text-white">{opt.label}</div>
                <div className="text-[10px] text-white/30 mt-0.5">{opt.desc}</div>
              </div>
              {opt.value === "asap" && (
                <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded"
                  style={{ background: "rgba(183,255,24,0.1)", color: NEON }}>
                  Recommended
                </span>
              )}
            </button>
          ))}
          {settings.startType === "scheduled" && (
            <input type="date" style={{ ...fieldStyle, colorScheme: "dark" } as any}
              value={settings.scheduledDate} min={tomorrowStr}
              onChange={e => onChange({ scheduledDate: e.target.value })} />
          )}
        </div>
      </div>

      {/* ── Platforms ── */}
      <div>
        <label className={labelStyle}>
          Supported Platforms <span className="text-white/20 normal-case font-normal">(select all that apply)</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
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

      {/* ── Regions ── */}
      <div>
        <label className={labelStyle}>Eligible Regions</label>
        <select style={{ ...fieldStyle, paddingRight: "32px" } as any}
          value={settings.regions}
          onChange={e => onChange({ regions: e.target.value })}>
          {REGION_OPTIONS.map(r => (
            <option key={r.id} value={r.id}>{r.label}</option>
          ))}
        </select>
      </div>

      {/* ── Custom campaign only: duration + capacity overrides ── */}
      {type.custom && (
        <div className="grid grid-cols-2 gap-4 pt-2"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div>
            <label className={labelStyle}>Custom Duration (days)</label>
            <input type="number" min={3} max={60} style={fieldStyle}
              value={settings.customDuration ?? type.duration}
              onChange={e => onChange({ customDuration: Math.max(3, Math.min(60, Number(e.target.value))) })} />
          </div>
          <div>
            <label className={labelStyle}>Creator Capacity</label>
            <input type="number" min={5} max={100} style={fieldStyle}
              value={settings.customCapacity ?? type.capacity}
              onChange={e => onChange({ customCapacity: Math.max(5, Math.min(100, Number(e.target.value))) })} />
          </div>
        </div>
      )}
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
  const duration  = type.custom && settings.customDuration ? settings.customDuration : type.duration;
  const capacity  = type.custom && settings.customCapacity ? settings.customCapacity : type.capacity;

  const regionLabel    = REGION_OPTIONS.find(r => r.id === settings.regions)?.label ?? "Worldwide";
  const platformsLabel = settings.platforms.length === 0
    ? "All platforms"
    : settings.platforms.map(p => PLATFORM_OPTIONS.find(o => o.id === p)?.label ?? p).join(", ");

  const rows = [
    { label: "Campaign",            value: type.name },
    { label: "Game",                value: settings.gameName || "—" },
    { label: "Duration",            value: `${duration} days` },
    { label: "Creator Capacity",    value: capacity },
    { label: "Launch",              value: settings.startType === "asap" ? "Immediately" : settings.scheduledDate || "—" },
    { label: "Demo Keys Needed",    value: type.demoKeys },
    { label: "Full Keys Needed",    value: type.fullKeys },
    { label: "Demo Keys in Vault",  value: `${demoAvail} available` },
    { label: "Full Keys in Vault",  value: `${fullAvail} available` },
    { label: "Creator Eligibility", value: regionLabel },
    { label: "Platforms",           value: platformsLabel },
  ];

  return (
    <div className="space-y-5">
      <p className="text-sm text-white/40">
        Review your campaign before launching. Keys will be committed to the Campaign Key Vault.
      </p>

      <div className="rounded-2xl overflow-hidden"
        style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
        {rows.map(({ label, value }, i) => (
          <div key={label} className="flex items-start gap-4 px-4 py-2.5"
            style={{
              borderBottom: i < rows.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
              background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent",
            }}>
            <div className="text-[10px] font-bold text-white/30 uppercase tracking-wide w-36 shrink-0 pt-0.5">{label}</div>
            <div className="text-sm text-white flex-1">{value}</div>
          </div>
        ))}
      </div>

      {!keysOk && (
        <div className="rounded-2xl p-4"
          style={{ background: "rgba(248,113,113,0.05)", border: "1px solid rgba(248,113,113,0.2)" }}>
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-300">More keys needed</p>
              <p className="text-xs text-red-300/60 mt-1">
                Upload the required keys to your Key Vault before launching. Every campaign needs both demo keys (for creators to join) and full game keys (for completion rewards).
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl p-4"
        style={{ background: "rgba(251,146,60,0.06)", border: "1px solid rgba(251,146,60,0.2)" }}>
        <div className="flex items-start gap-3">
          <Lock className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-orange-300 mb-1">Campaign Key Vault — Escrow Protection</p>
            <p className="text-xs text-orange-300/70 leading-relaxed">
              Once this campaign begins, committed keys will be locked in the Gamefolio Key Vault. They <strong className="text-orange-300">cannot be withdrawn</strong> after creators begin participating.
            </p>
          </div>
        </div>
      </div>

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
// Main Flow — 2-column layout
// ─────────────────────────────────────────────

export default function CreateCampaignFlow({ onComplete }: { onComplete: () => void }) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState<CampaignType | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [settings, setSettings] = useState<CampaignSettings>({
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

  const getTemplateId = (): number | null => {
    if (!selectedType) return null;
    const tmpl = templates.find((t: any) => t.slug === selectedType.slug);
    return tmpl?.id ?? null;
  };

  const hasCustomStep = selectedType?.custom ?? false;
  const totalSteps    = hasCustomStep ? 4 : 3;
  const effectiveStep = hasCustomStep ? step : (step >= 2 ? step + 1 : step);
  const stepLabel     = step <= totalSteps ? STEP_LABELS[effectiveStep - 1] : "Launch";

  const canAdvance = (): boolean => {
    if (step === 1) return !!selectedType;
    if (step === 2) return true;
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
    <div className="flex gap-8 items-start">

      {/* ── Left: Live Preview Card ── */}
      <div className="w-[300px] shrink-0 sticky top-6">
        <p className="text-[10px] font-bold uppercase tracking-widest mb-3"
          style={{ color: "rgba(255,255,255,0.25)" }}>
          Preview — creator view
        </p>
        <PreviewCard type={selectedType} settings={settings} />
        {!selectedType && (
          <p className="text-center text-[11px] text-white/20 mt-3">
            Select a campaign type to see a preview
          </p>
        )}
      </div>

      {/* ── Right: Wizard form ── */}
      <div className="flex-1 min-w-0">
        <StepHeader step={effectiveStep} total={4} label={stepLabel} />

        <div className="min-h-[380px]">
          {step === 1 && (
            <StepPickType selected={selectedType}
              onSelect={t => { setSelectedType(t); setConfirmed(false); }} />
          )}
          {step === 2 && hasCustomStep && selectedType && (
            <StepCustomise type={selectedType} settings={settings} onChange={updateSettings} />
          )}
          {((step === 2 && !hasCustomStep) || (step === 3 && hasCustomStep) || (step === totalSteps && selectedType)) && selectedType && (
            <StepReview type={selectedType} settings={settings} keysOk={keysOk} confirmed={confirmed} onConfirm={setConfirmed} />
          )}
        </div>

        <div className="flex items-center justify-between pt-6 mt-6"
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
                : <><Lock className="w-4 h-4" /> Commit Keys &amp; Launch</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
