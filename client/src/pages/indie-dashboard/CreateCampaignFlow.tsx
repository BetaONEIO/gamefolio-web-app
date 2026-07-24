import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Rocket, Clock, Users, KeyRound, Lock, Loader2,
  Check, ShieldCheck, Zap, Film, Camera,
  MessageSquare, Target, AlertCircle, Gamepad2,
  Sparkles, Cog, Upload, FileText, X, ArrowRight,
  CheckCircle2, Calendar,
} from "lucide-react";
import { NEON } from "./constants";

// ── Design tokens ─────────────────────────────────────────────────────────────
const CARD_BG     = "#0e1520";
const CARD_BORDER = "rgba(255,255,255,0.10)";

// ── Injected keyframe animations ──────────────────────────────────────────────
const ANIM_CSS = `
  @keyframes gfNeonPulse {
    0%,100% { box-shadow: 0 0 0 0 rgba(183,255,24,0); border-color: rgba(183,255,24,0.30); }
    50%     { box-shadow: 0 0 22px 3px rgba(183,255,24,0.09); border-color: rgba(183,255,24,0.60); }
  }
  @keyframes gfFadeUp {
    from { opacity:0; transform:translateY(14px); }
    to   { opacity:1; transform:translateY(0);    }
  }
  @keyframes gfCheckDraw {
    from { stroke-dashoffset:40; opacity:0; }
    to   { stroke-dashoffset:0;  opacity:1; }
  }
  @keyframes gfScaleIn {
    from { transform:scale(0.94); opacity:0; }
    to   { transform:scale(1);    opacity:1; }
  }
  @keyframes gfConfettiFall {
    0%   { transform: translateY(-10px) rotate(var(--r,0deg)); opacity:1; }
    100% { transform: translateY(520px) rotate(calc(var(--r,0deg) + 540deg)); opacity:0; }
  }
  .gf-step-glow  { animation: gfNeonPulse 2.4s ease-in-out infinite; }
  .gf-fade-up    { animation: gfFadeUp 0.34s cubic-bezier(0.22,1,0.36,1) both; }
  .gf-scale-in   { animation: gfScaleIn 0.28s ease-out both; }
  .gf-check-draw { stroke-dasharray:40; animation: gfCheckDraw 0.4s ease-out 0.1s both; }
`;

// ─────────────────────────────────────────────
// Data types & constants
// ─────────────────────────────────────────────

interface CampaignType {
  slug: string; name: string; tagline: string; description: string;
  duration: number; capacity: number; demoKeys: number; fullKeys: number;
  xpReward: number; recommended?: boolean; custom?: boolean; icon: any;
  pills: { ct: string; qty: number }[];
  estimated: { clips: number; reels: number; screenshots: number; feedback: number; viewsMin: number; viewsMax: number };
}

const CAMPAIGN_TYPES: CampaignType[] = [
  {
    slug: "quick-creator", name: "Quick Creator Campaign",
    tagline: "Get your first creators playing fast",
    description: "5-day sprint to get creators engaged with quick clips and first impressions. Great for new launches or building momentum.",
    duration: 5, capacity: 20, demoKeys: 20, fullKeys: 20, xpReward: 750, icon: Zap,
    pills: [{ ct: "clip", qty: 2 }, { ct: "screenshot", qty: 2 }],
    estimated: { clips: 40, reels: 10, screenshots: 40, feedback: 20, viewsMin: 3000, viewsMax: 15000 },
  },
  {
    slug: "content-boost", name: "Content Boost Campaign",
    tagline: "Build a content library fast",
    description: "10-day multi-format campaign to generate clips, reels and screenshots. Best for marketing assets and discovery.",
    duration: 10, capacity: 35, demoKeys: 35, fullKeys: 35, xpReward: 1200, recommended: true, icon: Sparkles,
    pills: [{ ct: "clip", qty: 2 }, { ct: "reel", qty: 1 }, { ct: "screenshot", qty: 3 }],
    estimated: { clips: 70, reels: 35, screenshots: 105, feedback: 35, viewsMin: 10000, viewsMax: 50000 },
  },
  {
    slug: "creator-showcase", name: "Creator Showcase Campaign",
    tagline: "Maximum exposure with premium content",
    description: "21-day deep engagement with streams, reviews and clips. The premium option for serious developer marketing.",
    duration: 21, capacity: 25, demoKeys: 25, fullKeys: 25, xpReward: 2500, icon: Rocket,
    pills: [{ ct: "clip", qty: 2 }, { ct: "reel", qty: 1 }, { ct: "screenshot", qty: 3 }, { ct: "stream", qty: 1 }],
    estimated: { clips: 50, reels: 25, screenshots: 75, feedback: 25, viewsMin: 15000, viewsMax: 80000 },
  },
  {
    slug: "custom-campaign", name: "Custom Campaign",
    tagline: "Full control for experienced developers",
    description: "Set your own duration, capacity, regions and platforms. For developers who know exactly what they need.",
    duration: 14, capacity: 20, demoKeys: 20, fullKeys: 20, xpReward: 1000, custom: true, icon: Cog,
    pills: [{ ct: "clip", qty: 2 }, { ct: "screenshot", qty: 2 }, { ct: "feedback", qty: 1 }],
    estimated: { clips: 40, reels: 20, screenshots: 60, feedback: 20, viewsMin: 5000, viewsMax: 30000 },
  },
];

interface CampaignSettings {
  description: string; gameName: string; gameId: number | null; gameImageUrl: string | null;
  startType: "asap" | "scheduled"; scheduledDate: string; regions: string; platforms: string[];
  customDuration?: number; customCapacity?: number;
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
  return ct;
}

const fieldStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
  color: "#fff", borderRadius: "12px", padding: "10px 14px",
  outline: "none", width: "100%", fontSize: "13px",
};

// ─────────────────────────────────────────────
// Confetti component
// ─────────────────────────────────────────────

const CONFETTI_COLOURS = ["#B8FF1B","#60a5fa","#fb923c","#f472b6","#a78bfa","#34d399"];
function Confetti() {
  const pieces = Array.from({ length: 55 }, (_, i) => ({
    id: i,
    color: CONFETTI_COLOURS[i % CONFETTI_COLOURS.length],
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 1.2}s`,
    duration: `${2.4 + Math.random() * 1.4}s`,
    size: `${6 + Math.random() * 8}px`,
    rotate: `${Math.floor(Math.random() * 360)}deg`,
  }));
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" style={{ zIndex: 9999 }}>
      {pieces.map(p => (
        <div key={p.id} style={{
          position: "absolute", top: 0, left: p.left,
          width: p.size, height: p.size, background: p.color,
          borderRadius: Math.random() > 0.5 ? "50%" : "2px",
          animationName: "gfConfettiFall",
          animationDuration: p.duration, animationDelay: p.delay,
          animationTimingFunction: "linear", animationFillMode: "both",
          ["--r" as any]: p.rotate,
        }} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// Animated check mark (SVG)
// ─────────────────────────────────────────────

function AnimatedCheck({ size = 24, color = NEON }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="11" stroke={color} strokeWidth="1.5" opacity="0.25" />
      <polyline points="6.5,12 10,15.5 17.5,8" stroke={color} strokeWidth="2.2"
        strokeLinecap="round" strokeLinejoin="round" className="gf-check-draw" />
    </svg>
  );
}

// ─────────────────────────────────────────────
// Step wrapper card (active / completed / upcoming)
// ─────────────────────────────────────────────

type StepState = "active" | "completed" | "upcoming";

function StepCard({
  number, title, icon: Icon, state, completedLine, onEdit, children,
}: {
  number: number; title: string; icon: any; state: StepState;
  completedLine?: string; onEdit?: () => void; children?: React.ReactNode;
}) {
  const isActive    = state === "active";
  const isCompleted = state === "completed";
  const isUpcoming  = state === "upcoming";

  return (
    <div className={`rounded-2xl transition-all duration-500 ${isActive ? "gf-step-glow" : ""}`}
      style={{
        background: isUpcoming ? "rgba(255,255,255,0.015)" : CARD_BG,
        border: `1px solid ${isActive ? "rgba(183,255,24,0.35)" : isCompleted ? "rgba(183,255,24,0.12)" : "rgba(255,255,255,0.06)"}`,
        opacity: isUpcoming ? 0.45 : 1,
        filter: isUpcoming ? "grayscale(0.6)" : "none",
        pointerEvents: isUpcoming ? "none" : "auto",
      }}>

      {/* Step header row */}
      <div className="flex items-center gap-4 px-6 py-4">
        {/* Number badge */}
        <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-sm font-black transition-all duration-300"
          style={{
            background: isCompleted ? NEON : isActive ? "rgba(183,255,24,0.12)" : "rgba(255,255,255,0.06)",
            color: isCompleted ? "#070b10" : isActive ? NEON : "rgba(255,255,255,0.4)",
            border: `1.5px solid ${isActive ? "rgba(183,255,24,0.4)" : "transparent"}`,
          }}>
          {isCompleted ? <Check className="w-4 h-4" /> : number}
        </div>

        {/* Title */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-black transition-colors duration-300"
              style={{ color: isActive ? "#fff" : isCompleted ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.35)" }}>
              {title}
            </h3>
            {isCompleted && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                style={{ background: "rgba(183,255,24,0.1)", color: NEON }}>
                Complete
              </span>
            )}
          </div>
          {isCompleted && completedLine && (
            <p className="text-[11px] text-white/35 mt-0.5 truncate">{completedLine}</p>
          )}
        </div>

        {/* Edit link for completed steps */}
        {isCompleted && onEdit && (
          <button onClick={onEdit}
            className="text-[11px] font-bold transition-colors px-3 py-1 rounded-lg"
            style={{ color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.04)" }}
            onMouseOver={e => (e.currentTarget.style.color = "#fff")}
            onMouseOut={e => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}>
            Edit
          </button>
        )}

        {/* Icon for upcoming */}
        {isUpcoming && (
          <Icon className="w-4 h-4 shrink-0" style={{ color: "rgba(255,255,255,0.2)" }} />
        )}
      </div>

      {/* Step content (only shown when active) */}
      {isActive && (
        <div className="px-6 pb-6 gf-fade-up">
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "20px" }}>
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Step 1: Choose Campaign Type
// ─────────────────────────────────────────────

const TYPE_ACCENT: Record<string, string> = {
  "quick-creator":    "#60a5fa",
  "content-boost":    NEON,
  "creator-showcase": "#fb923c",
  "custom-campaign":  "#a78bfa",
};

function TypeCard({ type, selected, onSelect }: { type: CampaignType; selected: boolean; onSelect: () => void }) {
  const Icon   = type.icon;
  const accent = TYPE_ACCENT[type.slug] ?? NEON;
  return (
    <button onClick={onSelect}
      className="w-full text-left rounded-2xl transition-all duration-300 group"
      style={{
        transform: selected ? "scale(1.015)" : "scale(1)",
        background: selected ? `rgba(${accent === NEON ? "183,255,24" : "255,255,255"},0.04)` : "rgba(255,255,255,0.025)",
        border: `1.5px solid ${selected ? accent : "rgba(255,255,255,0.08)"}`,
        boxShadow: selected ? `0 0 24px 0 ${accent}18` : "none",
        padding: "18px 20px",
      }}>
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="w-11 h-11 rounded-xl shrink-0 flex items-center justify-center transition-all duration-300"
          style={{
            background: selected ? `${accent}18` : "rgba(255,255,255,0.06)",
            border: `1px solid ${selected ? `${accent}30` : "rgba(255,255,255,0.08)"}`,
          }}>
          <Icon className="w-5 h-5" style={{ color: selected ? accent : "rgba(255,255,255,0.4)" }} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-black text-white">{type.name}</span>
            {type.recommended && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                style={{ background: "rgba(251,146,60,0.12)", color: "#fb923c" }}>
                ⭐ Recommended
              </span>
            )}
            {type.custom && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                style={{ background: "rgba(167,139,250,0.12)", color: "#a78bfa" }}>
                Advanced
              </span>
            )}
          </div>
          <p className="text-[12px] mb-2" style={{ color: selected ? accent : "rgba(255,255,255,0.4)" }}>
            {type.tagline}
          </p>
          <p className="text-[11px] text-white/30 leading-relaxed line-clamp-2">{type.description}</p>

          {/* Stats row */}
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            {[
              { label: `${type.duration}d`, desc: "duration" },
              { label: `${type.capacity}`, desc: "creators" },
              { label: `${type.demoKeys}`, desc: "demo keys" },
              { label: `${type.fullKeys}`, desc: "full keys" },
            ].map(s => (
              <div key={s.desc} className="flex items-baseline gap-1">
                <span className="text-xs font-black" style={{ color: selected ? accent : "rgba(255,255,255,0.6)" }}>
                  {s.label}
                </span>
                <span className="text-[10px] text-white/25">{s.desc}</span>
              </div>
            ))}
          </div>

          {/* Pills */}
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {type.pills.map(({ ct, qty }) => {
              const PIcon = REQ_ICON[ct] ?? Target;
              return (
                <span key={ct} className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg"
                  style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <PIcon size={9} /> {reqPillLabel(ct, qty)}
                </span>
              );
            })}
          </div>
        </div>

        {/* Check */}
        <div className="w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center mt-0.5 transition-all duration-300"
          style={{ borderColor: selected ? accent : "rgba(255,255,255,0.15)", background: selected ? accent : "transparent" }}>
          {selected && <Check className="w-3.5 h-3.5" style={{ color: "#070b10" }} />}
        </div>
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────
// Step 2: Personalise
// ─────────────────────────────────────────────

function StepPersonalise({ type, settings, onChange }: {
  type: CampaignType; settings: CampaignSettings; onChange: (s: Partial<CampaignSettings>) => void;
}) {
  const { data: indieProfile } = useQuery<any>({
    queryKey: ["/api/indie/profile"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  useEffect(() => {
    if (indieProfile?.profile?.gameName && !settings.gameName) {
      onChange({
        gameName: indieProfile.profile.gameName,
        gameId: indieProfile.profile.gameId ?? null,
        gameImageUrl: indieProfile.profile.headerImageUrl ?? null,
      });
    }
  }, [indieProfile]);

  const gameName  = settings.gameName || indieProfile?.profile?.gameName;
  const gameImage = settings.gameImageUrl || indieProfile?.profile?.headerImageUrl;
  const labelStyle = "text-[10px] font-bold text-white/30 uppercase tracking-wider block mb-2";
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  return (
    <div className="space-y-6">
      {/* Game (read-only) */}
      <div className="flex items-center gap-3 p-4 rounded-xl"
        style={{ background: "rgba(183,255,24,0.04)", border: "1px solid rgba(183,255,24,0.12)" }}>
        {gameImage ? (
          <img src={gameImage} alt={gameName} className="w-12 h-12 rounded-xl object-cover shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded-xl shrink-0 flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
            <Gamepad2 className="w-6 h-6 text-white/20" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-black text-white truncate">{gameName || "Your game"}</div>
          <div className="text-[10px] flex items-center gap-1 mt-0.5" style={{ color: NEON }}>
            <ShieldCheck className="w-2.5 h-2.5" /> Verified Indie Game
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-lg"
          style={{ background: "rgba(183,255,24,0.1)", color: NEON }}>
          {type.duration}d · {type.capacity} creators
        </div>
      </div>

      {/* Description */}
      <div>
        <label className={labelStyle}>Campaign Description <span className="text-white/20 normal-case font-normal">(optional)</span></label>
        <textarea style={{ ...fieldStyle, minHeight: "80px", resize: "vertical" } as any}
          value={settings.description}
          onChange={e => onChange({ description: e.target.value })}
          placeholder="Tell creators why your game is worth playing — what makes it unique?" />
      </div>

      {/* Launch timing */}
      <div>
        <label className={labelStyle}>Launch Timing</label>
        <div className="grid grid-cols-2 gap-2">
          {([
            { value: "asap",      label: "Launch Immediately", desc: "Goes live right after confirmation." },
            { value: "scheduled", label: "Schedule Date",      desc: "Pick a specific go-live date." },
          ] as const).map(opt => (
            <button key={opt.value} onClick={() => onChange({ startType: opt.value })}
              className="flex items-start gap-3 p-3.5 rounded-xl text-left transition-all"
              style={{
                background: settings.startType === opt.value ? "rgba(183,255,24,0.07)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${settings.startType === opt.value ? "rgba(183,255,24,0.25)" : "rgba(255,255,255,0.07)"}`,
              }}>
              <div className="w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center"
                style={{ borderColor: settings.startType === opt.value ? NEON : "rgba(255,255,255,0.2)", background: settings.startType === opt.value ? NEON : "transparent" }}>
                {settings.startType === opt.value && <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#070b10" }} />}
              </div>
              <div>
                <div className="text-xs font-bold text-white">{opt.label}</div>
                <div className="text-[10px] text-white/30 mt-0.5">{opt.desc}</div>
              </div>
              {opt.value === "asap" && (
                <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0"
                  style={{ background: "rgba(183,255,24,0.1)", color: NEON }}>Recommended</span>
              )}
            </button>
          ))}
        </div>
        {settings.startType === "scheduled" && (
          <input type="date" style={{ ...fieldStyle, colorScheme: "dark", marginTop: "8px" } as any}
            value={settings.scheduledDate} min={tomorrowStr}
            onChange={e => onChange({ scheduledDate: e.target.value })} />
        )}
      </div>

      {/* Platforms */}
      <div>
        <label className={labelStyle}>Supported Platforms <span className="text-white/20 normal-case font-normal">(select all that apply)</span></label>
        <div className="grid grid-cols-2 gap-2">
          {PLATFORM_OPTIONS.map(p => {
            const on = settings.platforms.includes(p.id);
            return (
              <button key={p.id}
                onClick={() => onChange({ platforms: on ? settings.platforms.filter(x => x !== p.id) : [...settings.platforms, p.id] })}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-all"
                style={{ background: on ? "rgba(183,255,24,0.07)" : "rgba(255,255,255,0.03)", border: `1px solid ${on ? "rgba(183,255,24,0.25)" : "rgba(255,255,255,0.07)"}` }}>
                <div className="w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center"
                  style={{ borderColor: on ? NEON : "rgba(255,255,255,0.2)", background: on ? NEON : "transparent" }}>
                  {on && <Check className="w-2.5 h-2.5" style={{ color: "#070b10" }} />}
                </div>
                <span className="text-[11px] font-semibold" style={{ color: on ? NEON : "rgba(255,255,255,0.55)" }}>{p.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Regions */}
      <div>
        <label className={labelStyle}>Eligible Regions</label>
        <select style={{ ...fieldStyle, paddingRight: "32px" } as any}
          value={settings.regions} onChange={e => onChange({ regions: e.target.value })}>
          {REGION_OPTIONS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
      </div>

      {/* Custom overrides */}
      {type.custom && (
        <div className="grid grid-cols-2 gap-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div>
            <label className={labelStyle}>Duration (days)</label>
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
// Step 3: Upload Keys
// ─────────────────────────────────────────────

function parseKeyLines(text: string): string[] {
  return text.split("\n").map(l => l.trim()).filter(Boolean);
}
function parseCSVKeys(csv: string): string[] {
  return csv.split("\n").slice(1)
    .map(l => l.split(",")[0]?.trim() ?? "")
    .filter(Boolean);
}

function KeyUploadArea({
  label, accent, keys, needed, vaultAvail, onChange,
}: {
  label: string; accent: string; keys: string; needed: number; vaultAvail: number; onChange: (v: string) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [justLoaded, setJustLoaded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const pasted = parseKeyLines(keys).length;
  const total  = vaultAvail + pasted;
  const met    = total >= needed;

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string ?? "";
      const isCSV = file.name.endsWith(".csv") || text.includes(",");
      const extracted = isCSV ? parseCSVKeys(text) : parseKeyLines(text);
      onChange(extracted.join("\n"));
      setJustLoaded(true);
      setTimeout(() => setJustLoaded(false), 1800);
    };
    reader.readAsText(file);
  }, [onChange]);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-black text-white">{label}</div>
          <div className="text-[11px] text-white/30 mt-0.5">{needed} required</div>
        </div>
        {/* Counter badge */}
        <div className="text-right">
          <div className="text-2xl font-black transition-all duration-300 gf-scale-in" style={{ color: met ? NEON : "rgba(255,255,255,0.6)", lineHeight: 1 }}>
            {total}
          </div>
          <div className="text-[9px] text-white/25 uppercase tracking-wider">{met ? "✓ Ready" : `of ${needed}`}</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(100, (total / needed) * 100)}%`, background: met ? NEON : accent }} />
      </div>

      {/* Drag & drop area */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        onClick={() => fileRef.current?.click()}
        className="flex flex-col items-center justify-center gap-2 py-5 rounded-xl cursor-pointer transition-all"
        style={{
          border: `1.5px dashed ${dragging ? NEON : justLoaded ? "rgba(183,255,24,0.4)" : "rgba(255,255,255,0.1)"}`,
          background: dragging ? "rgba(183,255,24,0.04)" : justLoaded ? "rgba(183,255,24,0.03)" : "rgba(255,255,255,0.02)",
        }}>
        {justLoaded ? (
          <>
            <CheckCircle2 className="w-6 h-6" style={{ color: NEON }} />
            <span className="text-xs font-bold" style={{ color: NEON }}>Keys loaded!</span>
          </>
        ) : (
          <>
            <Upload className="w-5 h-5 text-white/30" />
            <span className="text-xs font-semibold text-white/40">Drop CSV or TXT file</span>
            <span className="text-[10px] text-white/20">or click to browse</span>
          </>
        )}
      </div>
      <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />

      {/* Paste textarea */}
      <textarea
        style={{ ...fieldStyle, minHeight: "80px", resize: "vertical", fontSize: "11px", fontFamily: "monospace" } as any}
        value={keys}
        onChange={e => onChange(e.target.value)}
        placeholder={"Or paste one key per line…\nKEY-XXXX-XXXX\nKEY-YYYY-YYYY"}
      />

      {vaultAvail > 0 && (
        <p className="text-[10px] text-white/30">
          ↳ {vaultAvail} already in your key vault
        </p>
      )}
    </div>
  );
}

function StepUploadKeys({ type, demoKeys, fullKeys, vaultDemo, vaultFull, onDemoChange, onFullChange }: {
  type: CampaignType;
  demoKeys: string; fullKeys: string; vaultDemo: number; vaultFull: number;
  onDemoChange: (v: string) => void; onFullChange: (v: string) => void;
}) {
  const duration = type.custom ? type.duration : type.duration;
  const allReady = (vaultDemo + parseKeyLines(demoKeys).length) >= type.demoKeys &&
    (vaultFull + parseKeyLines(fullKeys).length) >= type.fullKeys;

  return (
    <div className="space-y-7">
      {/* Visual intro */}
      <div className="flex items-center gap-4 p-4 rounded-2xl"
        style={{ background: "rgba(183,255,24,0.04)", border: "1px solid rgba(183,255,24,0.10)" }}>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "rgba(183,255,24,0.08)", border: "1px solid rgba(183,255,24,0.15)" }}>
          <KeyRound className="w-6 h-6" style={{ color: NEON }} />
        </div>
        <div>
          <div className="text-sm font-black text-white">Campaign Key Vault</div>
          <div className="text-[11px] text-white/40 mt-0.5 leading-relaxed">
            Keys are locked in Gamefolio's escrow vault at launch. Creators receive demo keys on join · full game keys on completion.
          </div>
        </div>
      </div>

      {/* Two-column key areas */}
      <div className="grid grid-cols-2 gap-6">
        <KeyUploadArea label="Demo Keys" accent="#60a5fa"
          keys={demoKeys} needed={type.demoKeys} vaultAvail={vaultDemo}
          onChange={onDemoChange} />
        <KeyUploadArea label="Full Game Keys" accent="#fb923c"
          keys={fullKeys} needed={type.fullKeys} vaultAvail={vaultFull}
          onChange={onFullChange} />
      </div>

      {/* All ready banner */}
      {allReady && (
        <div className="flex items-center gap-3 p-4 rounded-xl gf-scale-in"
          style={{ background: "rgba(183,255,24,0.06)", border: "1px solid rgba(183,255,24,0.2)" }}>
          <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: NEON }} />
          <div>
            <div className="text-sm font-bold" style={{ color: NEON }}>All keys ready</div>
            <div className="text-[11px] text-white/40 mt-0.5">
              {type.demoKeys} demo keys · {type.fullKeys} full game keys committed to vault on launch
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Step 4: Launch
// ─────────────────────────────────────────────

function StepLaunch({ type, settings, confirmed, onConfirm, submitting, onLaunch }: {
  type: CampaignType; settings: CampaignSettings; confirmed: boolean;
  onConfirm: (v: boolean) => void; submitting: boolean; onLaunch: () => void;
}) {
  const duration = type.custom && settings.customDuration ? settings.customDuration : type.duration;
  const capacity = type.custom && settings.customCapacity ? settings.customCapacity : type.capacity;
  const regionLabel = REGION_OPTIONS.find(r => r.id === settings.regions)?.label ?? "Worldwide";

  return (
    <div className="space-y-6">
      {/* Large visual summary */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "#0a0f18", border: "1px solid rgba(255,255,255,0.08)" }}>
        {/* Header banner */}
        <div className="relative h-28 overflow-hidden flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #0d1624 0%, #0a1020 50%, #0d1624 100%)" }}>
          {settings.gameImageUrl && (
            <img src={settings.gameImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />
          )}
          <div className="relative flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl overflow-hidden border-2"
              style={{ borderColor: "rgba(183,255,24,0.3)" }}>
              {settings.gameImageUrl ? (
                <img src={settings.gameImageUrl} alt={settings.gameName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center" style={{ background: "rgba(183,255,24,0.08)" }}>
                  <Gamepad2 className="w-7 h-7" style={{ color: NEON }} />
                </div>
              )}
            </div>
            <div>
              {settings.gameName && <div className="text-xs text-white/40">{settings.gameName}</div>}
              <div className="text-lg font-black text-white leading-tight">{type.name}</div>
              <div className="flex items-center gap-1 mt-0.5">
                <ShieldCheck className="w-3 h-3" style={{ color: NEON }} />
                <span className="text-[10px] font-bold" style={{ color: NEON }}>GF Verified Campaign</span>
              </div>
            </div>
          </div>
        </div>

        {/* Key stats */}
        <div className="grid grid-cols-4 divide-x" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.06)" }}>
          {[
            { label: "Duration",  value: `${duration}d` },
            { label: "Creators",  value: capacity },
            { label: "Demo Keys", value: type.demoKeys },
            { label: "Full Keys", value: type.fullKeys },
          ].map(s => (
            <div key={s.label} className="flex flex-col items-center py-3.5"
              style={{ borderRight: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="text-base font-black text-white">{s.value}</div>
              <div className="text-[9px] text-white/25 uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Details row */}
        <div className="flex items-center gap-4 px-4 py-3 text-[11px] text-white/30"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <span>{settings.startType === "asap" ? "🚀 Launches immediately" : `📅 Launches ${settings.scheduledDate}`}</span>
          <span>· {regionLabel}</span>
          {settings.platforms.length > 0 && (
            <span>· {settings.platforms.join(", ")}</span>
          )}
        </div>
      </div>

      {/* Vault notice */}
      <div className="flex items-start gap-3 p-4 rounded-xl"
        style={{ background: "rgba(251,146,60,0.05)", border: "1px solid rgba(251,146,60,0.15)" }}>
        <Lock className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
        <div className="text-[11px] text-orange-300/70 leading-relaxed">
          <strong className="text-orange-300">Key Vault Escrow</strong> — Keys will be locked in the Gamefolio vault at launch and{" "}
          <strong className="text-orange-300">cannot be withdrawn</strong> once creators join.
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
          I confirm I am ready to launch this campaign. Keys will be committed to the Campaign Key Vault and cannot be withdrawn after creators join.
        </span>
      </button>

      {/* Launch button */}
      <button
        onClick={onLaunch}
        disabled={!confirmed || submitting}
        className="w-full py-4 rounded-2xl text-base font-black tracking-wide transition-all flex items-center justify-center gap-2.5 disabled:opacity-40"
        style={{ background: confirmed && !submitting ? NEON : "rgba(183,255,24,0.3)", color: "#070b10",
          boxShadow: confirmed && !submitting ? "0 0 32px 0 rgba(183,255,24,0.25)" : "none",
        }}>
        {submitting ? (
          <><Loader2 className="w-5 h-5 animate-spin" /> Launching Campaign…</>
        ) : (
          <><Rocket className="w-5 h-5" /> Launch Campaign</>
        )}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
// Success screen
// ─────────────────────────────────────────────

function SuccessScreen({ type, onDashboard }: { type: CampaignType; onDashboard: () => void }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 9998, background: "rgba(7,11,16,0.96)" }}>
      <Confetti />
      <div className="relative text-center max-w-sm mx-auto px-6 gf-scale-in">
        {/* Big animated check */}
        <div className="w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center"
          style={{ background: "rgba(183,255,24,0.1)", border: "2px solid rgba(183,255,24,0.3)" }}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <polyline points="10,24 20,34 38,14" stroke={NEON} strokeWidth="4"
              strokeLinecap="round" strokeLinejoin="round" className="gf-check-draw" />
          </svg>
        </div>

        <h2 className="text-3xl font-black text-white mb-2">Campaign Live!</h2>
        <p className="text-sm text-white/45 mb-2">{type.name}</p>
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full mb-8 text-xs font-bold"
          style={{ background: "rgba(183,255,24,0.1)", color: NEON }}>
          <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
          LIVE
        </div>

        <div className="space-y-3">
          <button onClick={onDashboard}
            className="w-full py-3.5 rounded-2xl font-black text-sm transition-all hover:brightness-110"
            style={{ background: NEON, color: "#070b10" }}>
            Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Flow
// ─────────────────────────────────────────────

export default function CreateCampaignFlow({ onComplete }: { onComplete: () => void }) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [launched, setLaunched] = useState(false);
  const [selectedType, setSelectedType] = useState<CampaignType | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pendingDemoKeys, setPendingDemoKeys] = useState("");
  const [pendingFullKeys, setPendingFullKeys] = useState("");
  const [settings, setSettings] = useState<CampaignSettings>({
    description: "", startType: "asap", scheduledDate: "",
    gameName: "", gameId: null, gameImageUrl: null,
    regions: "worldwide", platforms: [],
  });

  const { data: bountyStatus } = useQuery<any>({
    queryKey: ["/api/indie/bounty-status"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  const { data: templates = [] } = useQuery<any[]>({
    queryKey: ["/api/campaigns/templates"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const vaultDemo = bountyStatus?.demoKeys?.available ?? 0;
  const vaultFull = bountyStatus?.fullGameKeys?.available ?? 0;

  const pendDemo  = parseKeyLines(pendingDemoKeys).length;
  const pendFull  = parseKeyLines(pendingFullKeys).length;
  const keysReady = !!selectedType &&
    (vaultDemo + pendDemo >= selectedType.demoKeys) &&
    (vaultFull + pendFull >= selectedType.fullKeys);

  const getTemplateId = (): number | null => {
    if (!selectedType) return null;
    const tmpl = (templates as any[]).find((t: any) => t.slug === selectedType.slug);
    return tmpl?.id ?? null;
  };

  const updateSettings = (partial: Partial<CampaignSettings>) => setSettings(s => ({ ...s, ...partial }));

  const canAdvance = (): boolean => {
    if (currentStep === 1) return !!selectedType;
    if (currentStep === 2) return true;
    if (currentStep === 3) return keysReady;
    return false;
  };

  const handleLaunch = async () => {
    const templateId = getTemplateId();
    if (!templateId || !selectedType) return;
    setSubmitting(true);
    try {
      const inst = await apiRequest("POST", "/api/campaigns/instances", {
        templateId, gameName: settings.gameName, gameId: settings.gameId,
        gameArtworkUrl: settings.gameImageUrl, startType: settings.startType,
        scheduledStart: settings.startType === "scheduled" && settings.scheduledDate ? settings.scheduledDate : null,
        artworkUrl: settings.gameImageUrl || null,
        description: settings.description || undefined,
        regions: settings.regions,
        platforms: settings.platforms.length > 0 ? settings.platforms : undefined,
      });
      const instData = await inst.json();
      if (!inst.ok) throw new Error(instData.message || "Failed to create campaign");

      const demoKeyList = parseKeyLines(pendingDemoKeys);
      const fullKeyList = parseKeyLines(pendingFullKeys);
      if (demoKeyList.length > 0 || fullKeyList.length > 0) {
        await apiRequest("POST", `/api/campaigns/instances/${instData.id}/keys`, {
          demoKeys: demoKeyList, fullKeys: fullKeyList,
        });
      }

      const submitRes = await apiRequest("POST", `/api/campaigns/instances/${instData.id}/submit`, {});
      if (!submitRes.ok) throw new Error("Failed to submit campaign");

      queryClient.invalidateQueries({ queryKey: ["/api/campaigns/instances"] });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns/overview"] });
      queryClient.invalidateQueries({ queryKey: ["/api/indie/bounty-status"] });

      setLaunched(true);
    } catch (err: any) {
      toast({ description: err.message || "Failed to launch campaign", variant: "gamefolioError" as any });
    } finally {
      setSubmitting(false);
    }
  };

  // Computed state for each step card
  function stepState(n: number): StepState {
    if (n < currentStep) return "completed";
    if (n === currentStep) return "active";
    return "upcoming";
  }

  // Completed summaries
  const step1Summary = selectedType?.name ?? "";
  const step2Summary = [
    settings.startType === "asap" ? "Launch Immediately" : `Scheduled: ${settings.scheduledDate}`,
    settings.platforms.length ? settings.platforms.join(", ") : "All platforms",
  ].join(" · ");
  const step3Summary = keysReady
    ? `${vaultDemo + pendDemo} demo · ${vaultFull + pendFull} full game keys ready`
    : "Keys pending";

  return (
    <>
      {/* Inject CSS animations */}
      <style>{ANIM_CSS}</style>

      {/* Success overlay */}
      {launched && selectedType && (
        <SuccessScreen type={selectedType} onDashboard={onComplete} />
      )}

      <div className="space-y-3 max-w-2xl">

        {/* ── Step 1: Choose Campaign ── */}
        <StepCard number={1} title="Choose Campaign Type" icon={Sparkles}
          state={stepState(1)} completedLine={step1Summary}
          onEdit={() => { setCurrentStep(1); setConfirmed(false); }}>
          <div className="space-y-3">
            <p className="text-[12px] text-white/40 mb-4">
              Every campaign gives creators a <strong className="text-white/60">demo key on join</strong> and a <strong className="text-white/60">full game key on completion</strong>.
            </p>
            {CAMPAIGN_TYPES.map(t => (
              <TypeCard key={t.slug} type={t}
                selected={selectedType?.slug === t.slug}
                onSelect={() => { setSelectedType(t); setConfirmed(false); }} />
            ))}
            <button
              onClick={() => selectedType && setCurrentStep(2)}
              disabled={!selectedType}
              className="w-full mt-2 py-3 rounded-2xl text-sm font-black flex items-center justify-center gap-2 transition-all disabled:opacity-35 hover:brightness-110"
              style={{ background: NEON, color: "#070b10" }}>
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </StepCard>

        {/* ── Step 2: Personalise ── */}
        <StepCard number={2} title="Personalise Your Campaign" icon={Gamepad2}
          state={stepState(2)} completedLine={step2Summary}
          onEdit={() => setCurrentStep(2)}>
          {selectedType && (
            <div>
              <StepPersonalise type={selectedType} settings={settings} onChange={updateSettings} />
              <button
                onClick={() => setCurrentStep(3)}
                className="w-full mt-6 py-3 rounded-2xl text-sm font-black flex items-center justify-center gap-2 transition-all hover:brightness-110"
                style={{ background: NEON, color: "#070b10" }}>
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </StepCard>

        {/* ── Step 3: Upload Keys ── */}
        <StepCard number={3} title="Upload Game Keys" icon={KeyRound}
          state={stepState(3)} completedLine={step3Summary}
          onEdit={() => setCurrentStep(3)}>
          {selectedType && (
            <div>
              <StepUploadKeys type={selectedType}
                demoKeys={pendingDemoKeys} fullKeys={pendingFullKeys}
                vaultDemo={vaultDemo} vaultFull={vaultFull}
                onDemoChange={setPendingDemoKeys} onFullChange={setPendingFullKeys} />
              <button
                onClick={() => keysReady && setCurrentStep(4)}
                disabled={!keysReady}
                className="w-full mt-6 py-3 rounded-2xl text-sm font-black flex items-center justify-center gap-2 transition-all hover:brightness-110 disabled:opacity-35"
                style={{ background: NEON, color: "#070b10" }}>
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </StepCard>

        {/* ── Step 4: Launch ── */}
        <StepCard number={4} title="Launch Campaign" icon={Rocket}
          state={stepState(4)}>
          {selectedType && (
            <StepLaunch type={selectedType} settings={settings}
              confirmed={confirmed} onConfirm={setConfirmed}
              submitting={submitting} onLaunch={handleLaunch} />
          )}
        </StepCard>

      </div>
    </>
  );
}
