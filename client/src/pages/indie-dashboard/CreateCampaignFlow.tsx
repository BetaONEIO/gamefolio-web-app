import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Rocket, Clock, Users, KeyRound, Lock, Loader2,
  Check, ShieldCheck, Zap, Film, Camera,
  MessageSquare, Target, AlertCircle, Gamepad2,
  Sparkles, Cog, Upload, FileText, X, ArrowRight,
  CheckCircle2, Calendar, Bot, Sliders,
  ChevronLeft, ChevronRight,
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
  slug: string; name: string; shortName: string; tagline: string; description: string;
  shortDesc: string; bestFor: string;
  duration: number; capacity: number; demoKeys: number; fullKeys: number;
  xpReward: number; recommended?: boolean; custom?: boolean; icon: any;
  pills: { ct: string; qty: number }[];
  estimated: { clips: number; reels: number; screenshots: number; feedback: number; viewsMin: number; viewsMax: number };
}

const CAMPAIGN_TYPES: CampaignType[] = [
  {
    slug: "quick-creator", name: "Quick Creator Campaign", shortName: "Quick Creator",
    tagline: "Get your first creators playing fast",
    shortDesc: "Perfect for launching a new game and getting your first creator content.",
    bestFor: "🚀 New Launches",
    description: "5-day sprint to get creators engaged with quick clips and first impressions. Great for new launches or building momentum.",
    duration: 5, capacity: 20, demoKeys: 20, fullKeys: 20, xpReward: 750, icon: Zap,
    pills: [{ ct: "clip", qty: 2 }, { ct: "screenshot", qty: 2 }],
    estimated: { clips: 40, reels: 10, screenshots: 40, feedback: 20, viewsMin: 3000, viewsMax: 15000 },
  },
  {
    slug: "content-boost", name: "Content Boost Campaign", shortName: "Content Boost",
    tagline: "Build a content library fast",
    shortDesc: "Generate a larger library of clips, reels and screenshots.",
    bestFor: "📈 Building Content",
    description: "10-day multi-format campaign to generate clips, reels and screenshots. Best for marketing assets and discovery.",
    duration: 10, capacity: 35, demoKeys: 35, fullKeys: 35, xpReward: 1200, recommended: true, icon: Sparkles,
    pills: [{ ct: "clip", qty: 2 }, { ct: "reel", qty: 1 }, { ct: "screenshot", qty: 3 }],
    estimated: { clips: 70, reels: 35, screenshots: 105, feedback: 35, viewsMin: 10000, viewsMax: 50000 },
  },
  {
    slug: "creator-showcase", name: "Creator Showcase Campaign", shortName: "Creator Showcase",
    tagline: "Maximum exposure with premium content",
    shortDesc: "Maximum exposure with higher creator commitment.",
    bestFor: "⭐ Maximum Exposure",
    description: "21-day deep engagement with streams, reviews and clips. The premium option for serious developer marketing.",
    duration: 21, capacity: 25, demoKeys: 25, fullKeys: 25, xpReward: 2500, icon: Rocket,
    pills: [{ ct: "clip", qty: 2 }, { ct: "reel", qty: 1 }, { ct: "screenshot", qty: 3 }, { ct: "stream", qty: 1 }],
    estimated: { clips: 50, reels: 25, screenshots: 75, feedback: 25, viewsMin: 15000, viewsMax: 80000 },
  },
  {
    slug: "custom-campaign", name: "Custom Campaign", shortName: "Custom",
    tagline: "Full control for experienced developers",
    shortDesc: "Create your own campaign using Gamefolio's campaign builder.",
    bestFor: "⚙ Advanced Users",
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
// Hero illustration — rich orbital composition
// ─────────────────────────────────────────────

type SideIcon = { icon: any; top?: string; bottom?: string; left?: string; right?: string };

function StepIllustration({ icon: Icon, accent, rgb, sideIcons = [] }: {
  icon: any; accent: string; rgb: string; sideIcons?: SideIcon[];
}) {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      {/* Dot grid */}
      <div className="absolute inset-0" style={{
        backgroundImage: `radial-gradient(circle, rgba(${rgb},0.65) 1px, transparent 1px)`,
        backgroundSize: "28px 28px", opacity: 0.065,
      }} />
      {/* Ambient glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div style={{ width: "380px", height: "380px", background: `radial-gradient(circle, rgba(${rgb},0.10) 0%, transparent 63%)`, borderRadius: "50%" }} />
      </div>
      {/* Orbital rings */}
      <div className="absolute rounded-full"
        style={{ width: "196px", height: "196px", border: `1px solid rgba(${rgb},0.11)` }} />
      <div className="absolute rounded-full"
        style={{ width: "270px", height: "270px", border: `1px solid rgba(${rgb},0.06)` }} />
      {/* Satellite icons */}
      {sideIcons.map(({ icon: SIcon, top, bottom, left, right }, i) => (
        <div key={i} className="absolute flex items-center justify-center"
          style={{ top, bottom, left, right, width: "40px", height: "40px", borderRadius: "12px", background: `rgba(${rgb},0.08)`, border: `1px solid rgba(${rgb},0.15)` }}>
          <SIcon style={{ width: "18px", height: "18px", color: accent, opacity: 0.6 }} />
        </div>
      ))}
      {/* Central icon */}
      <div className="relative">
        <div className="flex items-center justify-center"
          style={{ width: "96px", height: "96px", borderRadius: "28px",
            background: `linear-gradient(145deg, rgba(${rgb},0.18) 0%, rgba(${rgb},0.07) 100%)`,
            border: `1.5px solid rgba(${rgb},0.30)`,
            boxShadow: `0 0 80px 0 rgba(${rgb},0.13), 0 0 0 6px rgba(${rgb},0.04), inset 0 1px 0 rgba(255,255,255,0.07)`,
          }}>
          <Icon style={{ width: "48px", height: "48px", color: accent, filter: `drop-shadow(0 0 22px ${accent}90)` }} />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Shared StepHero — premium feature-card shell
// ─────────────────────────────────────────────

function StepHero({
  icon: Icon, title, description,
  accent = NEON, rgb = "183,255,27",
  sideIcons,
  features, banner, children,
}: {
  icon: any; title: string; description: string;
  accent?: string; rgb?: string;
  sideIcons?: SideIcon[];
  features?: { icon: any; title: string; desc: string }[];
  banner?: { icon: any; text: ReactNode; accent: string; rgb: string };
  children?: ReactNode;
}) {
  return (
    <div className="space-y-7 gf-fade-up">
      {/* ── Large hero illustration (~40% of card) ── */}
      <div className="relative rounded-2xl overflow-hidden"
        style={{ height: "260px", background: `linear-gradient(160deg, rgba(${rgb},0.09) 0%, rgba(5,8,14,1) 70%)`, border: `1px solid rgba(${rgb},0.11)` }}>
        <StepIllustration icon={Icon} accent={accent} rgb={rgb} sideIcons={sideIcons} />
      </div>

      {/* ── Title & description — centered ── */}
      <div className="text-center">
        <h3 className="text-[22px] font-black text-white mb-2.5 leading-tight tracking-tight">{title}</h3>
        <p className="text-[13px] leading-relaxed mx-auto" style={{ color: "rgba(255,255,255,0.42)", maxWidth: "360px" }}>{description}</p>
      </div>

      {/* ── Feature list — borderless, landing-page style ── */}
      {features && features.length > 0 && (
        <div className="space-y-5 px-1">
          {features.map((f, i) => {
            const FIcon = f.icon;
            return (
              <div key={i} className="flex items-start gap-4">
                <div className="shrink-0 flex items-center justify-center"
                  style={{ width: "44px", height: "44px", borderRadius: "14px", background: `rgba(${rgb},0.09)`, border: `1px solid rgba(${rgb},0.15)` }}>
                  <FIcon style={{ width: "20px", height: "20px", color: accent }} />
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <div className="text-[13px] font-bold text-white leading-tight">{f.title}</div>
                  <div className="text-[12px] mt-1.5 leading-snug" style={{ color: "rgba(255,255,255,0.38)" }}>{f.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Optional banner ── */}
      {banner && (
        <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl"
          style={{ background: `rgba(${banner.rgb},0.05)`, border: `1px solid rgba(${banner.rgb},0.16)` }}>
          <banner.icon style={{ width: "16px", height: "16px", marginTop: "2px", flexShrink: 0, color: banner.accent }} />
          <p className="text-[11px] leading-relaxed" style={{ color: `rgba(${banner.rgb},0.85)` }}>{banner.text}</p>
        </div>
      )}

      {/* ── Functional step content ── */}
      {children && <div className="space-y-5">{children}</div>}
    </div>
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
// Step 1: Choose Campaign Type — premium grid
// ─────────────────────────────────────────────

const TYPE_ACCENT: Record<string, string> = {
  "quick-creator":    "#60a5fa",
  "content-boost":    NEON,
  "creator-showcase": "#fb923c",
  "custom-campaign":  "#a78bfa",
};

// Hex accent → rgb components for rgba() usage
const ACCENT_RGB: Record<string, string> = {
  "#60a5fa": "96,165,250",
  [NEON]:    "183,255,27",
  "#fb923c": "251,146,60",
  "#a78bfa": "167,139,250",
};

// Per-campaign floating decoration sets
const TYPE_DECOS: Record<string, Array<{ Icon: any; x: string; y: string; size: number; op: number }>> = {
  "quick-creator": [
    { Icon: Film,          x: "12%",  y: "18%", size: 15, op: 0.30 },
    { Icon: Camera,        x: "78%",  y: "14%", size: 13, op: 0.22 },
    { Icon: Gamepad2,      x: "82%",  y: "68%", size: 14, op: 0.18 },
    { Icon: MessageSquare, x: "10%",  y: "72%", size: 12, op: 0.20 },
  ],
  "content-boost": [
    { Icon: Film,          x: "10%",  y: "16%", size: 14, op: 0.28 },
    { Icon: Camera,        x: "80%",  y: "12%", size: 13, op: 0.24 },
    { Icon: MessageSquare, x: "8%",   y: "70%", size: 12, op: 0.22 },
    { Icon: Target,        x: "80%",  y: "70%", size: 13, op: 0.20 },
  ],
  "creator-showcase": [
    { Icon: Users,         x: "10%",  y: "15%", size: 15, op: 0.28 },
    { Icon: Film,          x: "78%",  y: "14%", size: 14, op: 0.24 },
    { Icon: Camera,        x: "10%",  y: "68%", size: 13, op: 0.20 },
    { Icon: Zap,           x: "80%",  y: "68%", size: 13, op: 0.22 },
  ],
  "custom-campaign": [
    { Icon: Zap,           x: "10%",  y: "16%", size: 14, op: 0.24 },
    { Icon: Target,        x: "80%",  y: "14%", size: 13, op: 0.22 },
    { Icon: Users,         x: "10%",  y: "68%", size: 13, op: 0.20 },
    { Icon: Film,          x: "80%",  y: "70%", size: 12, op: 0.18 },
  ],
};

function CampaignIllustration({ slug, accent, selected, hovered, height = "120px" }: {
  slug: string; accent: string; selected: boolean; hovered?: boolean; height?: string;
}) {
  const Icon  = CAMPAIGN_TYPES.find(t => t.slug === slug)?.icon ?? Sparkles;
  const rgb   = ACCENT_RGB[accent] ?? "183,255,27";
  const decos = TYPE_DECOS[slug] ?? [];
  const lit   = selected || hovered;
  return (
    <div className="relative w-full overflow-hidden" style={{ height }}>
      {/* Deep gradient bg */}
      <div className="absolute inset-0 transition-all duration-500"
        style={{
          background: `radial-gradient(ellipse 90% 110% at 50% 65%, rgba(${rgb},${selected ? 0.22 : lit ? 0.14 : 0.08}) 0%, rgba(7,11,16,0) 100%)`,
        }} />
      {/* Subtle dot grid */}
      <div className="absolute inset-0 transition-opacity duration-500"
        style={{
          opacity: selected ? 0.12 : 0.06,
          backgroundImage: `radial-gradient(circle, rgba(${rgb},0.8) 1px, transparent 1px)`,
          backgroundSize: "18px 18px",
        }} />
      {/* Floating decos */}
      {decos.map((d, i) => (
        <div key={i} className="absolute transition-all duration-500"
          style={{ left: d.x, top: d.y, opacity: lit ? d.op * 1.8 : d.op, transform: selected ? "scale(1.1)" : "scale(1)" }}>
          <d.Icon size={d.size} color={accent} />
        </div>
      ))}
      {/* Central icon */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="transition-all duration-500"
          style={{ transform: selected ? "scale(1.18)" : lit ? "scale(1.06)" : "scale(1)" }}>
          <Icon size={48}
            style={{
              color: accent,
              filter: selected ? `drop-shadow(0 0 20px ${accent}90)` : lit ? `drop-shadow(0 0 8px ${accent}50)` : "none",
              transition: "all 0.4s ease",
            }} />
        </div>
      </div>
      {/* Bottom fade */}
      <div className="absolute bottom-0 inset-x-0 h-10"
        style={{ background: `linear-gradient(to bottom, transparent, rgba(7,11,16,0.95))` }} />
    </div>
  );
}

function TypeCard({
  type, selected, anySelected, onSelect,
}: {
  type: CampaignType; selected: boolean; anySelected: boolean; onSelect: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const accent = TYPE_ACCENT[type.slug] ?? NEON;
  const rgb    = ACCENT_RGB[accent] ?? "183,255,27";

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="rounded-2xl cursor-pointer flex flex-col overflow-hidden"
      style={{
        background: selected
          ? `linear-gradient(180deg, rgba(${rgb},0.09) 0%, rgba(7,11,16,0.98) 55%)`
          : "rgba(255,255,255,0.03)",
        border: `1.5px solid ${selected ? accent : hovered ? `rgba(${rgb},0.25)` : "rgba(255,255,255,0.07)"}`,
        boxShadow: selected
          ? `0 16px 56px 0 rgba(${rgb},0.2), 0 0 0 1px rgba(${rgb},0.1)`
          : hovered ? `0 8px 32px 0 rgba(0,0,0,0.5)` : "none",
        transform: selected
          ? "translateY(-4px) scale(1.02)"
          : hovered && !anySelected ? "translateY(-3px) scale(1.01)"
          : anySelected && !selected ? "scale(0.98)" : "scale(1)",
        opacity: anySelected && !selected ? 0.45 : 1,
        filter: anySelected && !selected ? "saturate(0.35) brightness(0.8)" : "saturate(1) brightness(1)",
        transition: "all 0.28s cubic-bezier(0.22,1,0.36,1)",
      }}>

      {/* Large illustration zone */}
      <div className="relative">
        <CampaignIllustration slug={type.slug} accent={accent} selected={selected} hovered={hovered} />

        {/* Animated selection tick — top right */}
        <div className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300"
          style={{
            background: selected ? accent : "rgba(7,11,16,0.65)",
            border: `1.5px solid ${selected ? "transparent" : "rgba(255,255,255,0.18)"}`,
            backdropFilter: "blur(6px)",
            transform: selected ? "scale(1)" : "scale(0.8)",
            opacity: selected ? 1 : hovered ? 0.7 : 0.5,
          }}>
          {selected
            ? <Check className="w-3.5 h-3.5" style={{ color: "#070b10" }} />
            : <div className="w-2 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.3)" }} />
          }
        </div>

        {/* Best-for pill — bottom left of illustration */}
        <div className="absolute bottom-3 left-3 text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all duration-300"
          style={{
            background: selected ? `rgba(${rgb},0.15)` : "rgba(7,11,16,0.7)",
            color: selected ? accent : "rgba(255,255,255,0.55)",
            border: `1px solid ${selected ? `rgba(${rgb},0.3)` : "rgba(255,255,255,0.1)"}`,
            backdropFilter: "blur(8px)",
          }}>
          {type.bestFor}
        </div>

        {/* Recommended badge */}
        {type.recommended && (
          <div className="absolute top-3 left-3 text-[9px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: "rgba(251,146,60,0.15)", color: "#fb923c", border: "1px solid rgba(251,146,60,0.25)", backdropFilter: "blur(6px)" }}>
            ★ Recommended
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="flex-1 flex flex-col px-4 pt-3 pb-4 gap-3">
        {/* Name */}
        <div>
          <h3 className="text-sm font-black text-white leading-tight">{type.shortName}</h3>
          <p className="text-[11px] mt-1 leading-relaxed transition-colors duration-300"
            style={{ color: selected ? `rgba(${rgb},0.85)` : "rgba(255,255,255,0.38)" }}>
            {type.shortDesc}
          </p>
        </div>

        {/* Inline stats — no boxes */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 pt-2.5"
          style={{ borderTop: `1px solid ${selected ? `rgba(${rgb},0.15)` : "rgba(255,255,255,0.06)"}` }}>
          {[
            { e: "🕒", v: `${type.duration} Days` },
            { e: "👥", v: `${type.capacity} Creators` },
            { e: "🔑", v: `${type.demoKeys} Demo` },
            { e: "🏆", v: `${type.fullKeys} Full` },
          ].map(s => (
            <span key={s.e} className="text-[10px] transition-colors duration-300"
              style={{ color: selected ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.32)" }}>
              {s.e} {s.v}
            </span>
          ))}
        </div>

        {/* Expanded: content requirements — shown only when selected */}
        {selected && (
          <div className="gf-fade-up space-y-2.5" style={{ marginTop: "2px" }}>
            <div>
              <div className="text-[9px] uppercase tracking-widest mb-1.5" style={{ color: "rgba(255,255,255,0.2)" }}>Creator Requirements</div>
              <div className="flex flex-wrap gap-1.5">
                {type.pills.map(({ ct, qty }) => {
                  const PIcon = REQ_ICON[ct] ?? Target;
                  return (
                    <span key={ct} className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md"
                      style={{ background: `rgba(${rgb},0.08)`, color: accent, border: `1px solid rgba(${rgb},0.18)` }}>
                      <PIcon size={9} /> {reqPillLabel(ct, qty)}
                    </span>
                  );
                })}
              </div>
            </div>
            <div className="text-[10px] pt-1" style={{ color: "rgba(255,255,255,0.22)", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              Est. {type.estimated.viewsMin.toLocaleString()}–{type.estimated.viewsMax.toLocaleString()} views
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Thin pricing card (used inside carousel)
// ─────────────────────────────────────────────

// per-type picsum seeds that give dark cinematic photos
const CARD_IMG_SEED: Record<string, string> = {
  "quick-creator":    "1067",  // dark forest / moody
  "content-boost":    "0376",  // colourful abstract light
  "creator-showcase": "0180",  // neon city night
  "custom-campaign":  "0842",  // dark architecture
};

function ThinTypeCard({
  type, isCenter, onClick,
}: {
  type: CampaignType; isCenter: boolean; onClick: () => void;
}) {
  const accent = TYPE_ACCENT[type.slug] ?? NEON;
  const rgb    = ACCENT_RGB[accent] ?? "183,255,27";
  const seed   = CARD_IMG_SEED[type.slug] ?? "1000";

  return (
    <div
      onClick={onClick}
      className="relative flex flex-col overflow-hidden cursor-pointer select-none"
      style={{
        flex: isCenter ? "1.08" : "1",
        borderRadius: "18px",
        background: CARD_BG,
        border: `1.5px solid ${isCenter ? `rgba(${rgb},0.30)` : "rgba(255,255,255,0.07)"}`,
        boxShadow: isCenter
          ? `0 28px 64px 0 rgba(${rgb},0.18), 0 0 0 1px rgba(${rgb},0.06)`
          : "none",
        transform: isCenter ? "translateY(-14px) scale(1.03)" : "scale(0.97)",
        opacity: isCenter ? 1 : 0.55,
        filter: isCenter ? "none" : "saturate(0.4) brightness(0.75)",
        transition: "all 0.35s cubic-bezier(0.22,1,0.36,1)",
        padding: "0 0 28px 0",
        zIndex: isCenter ? 2 : 1,
      }}>

      {/* ── Full-width gaming image header ── */}
      <div className="relative w-full overflow-hidden shrink-0" style={{ height: "190px", borderRadius: "18px 18px 0 0" }}>
        <img
          src={`https://picsum.photos/seed/${seed}/400/380`}
          alt=""
          draggable={false}
          className="w-full h-full object-cover"
          style={{ display: "block" }}
        />
        {/* dark base overlay so text is always readable */}
        <div className="absolute inset-0" style={{ background: "rgba(7,11,16,0.40)" }} />
        {/* accent colour tint rising from the bottom */}
        <div className="absolute inset-0" style={{
          background: `linear-gradient(to top, rgba(${rgb},0.32) 0%, transparent 55%)`,
        }} />
        {/* title + badge sit over the image */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
          {type.recommended && (
            <div className="inline-block text-[9px] font-bold px-2 py-0.5 rounded-full mb-2"
              style={{ background: "rgba(251,146,60,0.22)", color: "#fb923c", backdropFilter: "blur(6px)" }}>
              ★ Best
            </div>
          )}
          <h3 className="text-[15px] font-black leading-tight text-white drop-shadow-md">
            {type.shortName}
          </h3>
          <span className="text-[10px] font-bold" style={{ color: accent, textShadow: `0 0 12px ${accent}` }}>
            {type.duration} days
          </span>
        </div>
      </div>

      {/* Short description */}
      <p className="px-4 pt-4 text-[11px] leading-relaxed line-clamp-2"
        style={{ color: isCenter ? "rgba(255,255,255,0.50)" : "rgba(255,255,255,0.25)", minHeight: "36px" }}>
        {type.description}
      </p>

      {/* Feature / stat rows */}
      <div className="px-4 mt-3 space-y-0 flex-1">
        {[
          { ok: true,  label: `${type.capacity} Creators` },
          { ok: true,  label: `${type.demoKeys} Demo Keys` },
          { ok: true,  label: `${type.fullKeys} Full Keys` },
          { ok: type.recommended ?? false, label: `${type.xpReward.toLocaleString()} XP` },
        ].map((row, i) => (
          <div key={i} className="flex items-center gap-2.5 py-3"
            style={{ borderBottom: i < 3 ? `1px solid ${isCenter ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.04)"}` : "none" }}>
            <div className="shrink-0 flex items-center justify-center rounded-full"
              style={{
                width: "18px", height: "18px",
                background: row.ok ? `rgba(${rgb},0.14)` : "rgba(255,255,255,0.04)",
              }}>
              {row.ok
                ? <Check style={{ width: "10px", height: "10px", color: accent }} />
                : <X    style={{ width: "10px", height: "10px", color: "rgba(255,255,255,0.25)" }} />
              }
            </div>
            <span className="text-[12px]" style={{ color: isCenter ? "rgba(255,255,255,0.72)" : "rgba(255,255,255,0.35)" }}>
              {row.label}
            </span>
          </div>
        ))}
      </div>

      {/* Select button */}
      <div className="px-4 mt-5">
        <div className="w-full py-3.5 rounded-xl text-[13px] font-black text-center transition-all"
          style={{
            background: isCenter ? accent : "rgba(255,255,255,0.05)",
            color: isCenter ? "#070b10" : "rgba(255,255,255,0.35)",
            border: isCenter ? "none" : "1px solid rgba(255,255,255,0.08)",
            boxShadow: isCenter ? `0 0 24px 0 rgba(${rgb},0.30)` : "none",
          }}>
          {isCenter ? "Select →" : type.shortName}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Campaign type carousel — 3 cards visible, center elevated
// ─────────────────────────────────────────────

function TypeCardCarousel({
  selectedType,
  onSelectAndContinue,
}: {
  selectedType: CampaignType | null;
  onSelectAndContinue: (type: CampaignType) => void;
}) {
  const n = CAMPAIGN_TYPES.length;
  const initIdx = selectedType
    ? Math.max(0, CAMPAIGN_TYPES.findIndex(t => t.slug === selectedType.slug))
    : 1;
  const [centerIdx, setCenterIdx] = useState(initIdx);

  const prev = (centerIdx - 1 + n) % n;
  const next = (centerIdx + 1) % n;

  const visible = [
    { type: CAMPAIGN_TYPES[prev],      isCenter: false, idx: prev },
    { type: CAMPAIGN_TYPES[centerIdx], isCenter: true,  idx: centerIdx },
    { type: CAMPAIGN_TYPES[next],      isCenter: false, idx: next },
  ];

  const centerAccent = TYPE_ACCENT[CAMPAIGN_TYPES[centerIdx].slug] ?? NEON;

  return (
    <div className="space-y-5">
      {/* Arrow row above cards */}
      <div className="flex items-center justify-between px-1">
        <button
          onClick={() => setCenterIdx(prev)}
          className="flex items-center gap-1.5 text-[12px] font-bold px-3 py-1.5 rounded-full transition-all hover:opacity-80"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.55)" }}>
          <ChevronLeft style={{ width: "14px", height: "14px" }} /> Prev
        </button>

        <span className="text-[11px] font-bold" style={{ color: "rgba(255,255,255,0.28)" }}>
          {centerIdx + 1} / {n}
        </span>

        <button
          onClick={() => setCenterIdx(next)}
          className="flex items-center gap-1.5 text-[12px] font-bold px-3 py-1.5 rounded-full transition-all hover:opacity-80"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.55)" }}>
          Next <ChevronRight style={{ width: "14px", height: "14px" }} />
        </button>
      </div>

      {/* Three cards */}
      <div className="flex items-end gap-3 pb-4">
        {visible.map(({ type, isCenter, idx: i }) => (
          <ThinTypeCard
            key={type.slug}
            type={type}
            isCenter={isCenter}
            onClick={() => {
              if (!isCenter) {
                setCenterIdx(i);
              } else {
                onSelectAndContinue(type);
              }
            }}
          />
        ))}
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center items-center gap-2">
        {CAMPAIGN_TYPES.map((t, i) => {
          const a = TYPE_ACCENT[t.slug] ?? NEON;
          return (
            <button
              key={t.slug}
              onClick={() => setCenterIdx(i)}
              className="transition-all duration-300"
              style={{
                height: "7px",
                width: i === centerIdx ? "22px" : "7px",
                borderRadius: "9999px",
                background: i === centerIdx ? a : "rgba(255,255,255,0.16)",
              }} />
          );
        })}
      </div>
    </div>
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
    <StepHero
      icon={Gamepad2}
      title="Personalise Your Campaign"
      description="Tell us when you'd like to launch and which platforms your game supports. We'll match you with the right creators."
      sideIcons={[
        { icon: Calendar,  top: "32px",    left: "56px"  },
        { icon: Users,     bottom: "32px", right: "56px" },
        { icon: Sparkles,  top: "28px",    right: "80px" },
      ]}
      features={[
        { icon: Gamepad2,  title: "Your Verified Game",  desc: "Pre-filled from your indie developer profile." },
        { icon: Calendar,  title: "Flexible Launch Timing", desc: "Go live immediately or schedule a specific start date." },
        { icon: Users,     title: "Targeted Distribution",  desc: "Choose platforms and regions to reach the right audience." },
      ]}
    >
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
    </StepHero>
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
  const allReady = (vaultDemo + parseKeyLines(demoKeys).length) >= type.demoKeys &&
    (vaultFull + parseKeyLines(fullKeys).length) >= type.fullKeys;

  return (
    <StepHero
      icon={KeyRound}
      title="Secure Key Vault"
      description="Your game keys are encrypted and held in escrow. Creators receive a demo key on join, and a full game key when they complete the campaign."
      sideIcons={[
        { icon: ShieldCheck,  top: "28px",    right: "60px" },
        { icon: Lock,         bottom: "30px", left:  "60px" },
        { icon: CheckCircle2, bottom: "28px", right: "80px" },
      ]}
      features={[
        { icon: Lock,         title: "Encrypted Escrow",        desc: "Keys are locked in the vault at launch and securely stored." },
        { icon: CheckCircle2, title: "Automatic Validation",    desc: "Duplicate and invalid keys are detected automatically." },
        { icon: KeyRound,     title: "Smart Distribution",      desc: "Demo keys on join · full game keys on completion." },
      ]}
      banner={{ icon: Lock, text: "Keys committed to the vault at launch cannot be withdrawn once creators join.", accent: "#fb923c", rgb: "251,146,60" }}
    >
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
    </StepHero>
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
    <StepHero
      icon={Rocket}
      title="Launch Your Campaign"
      description="Review your campaign and send it live. Your game will be discovered by verified creators on Gamefolio."
      sideIcons={[
        { icon: ShieldCheck, top:    "28px", left:  "64px" },
        { icon: Users,       top:    "28px", right: "64px" },
        { icon: Zap,         bottom: "28px", left:  "80px" },
      ]}
      features={[
        { icon: Users,      title: `${capacity} Verified Creators`,  desc: `${duration}-day campaign · ${type.demoKeys} demo keys · ${type.fullKeys} full game keys.` },
        { icon: ShieldCheck, title: "GF Verified Campaign",          desc: "Only eligible creators can apply — Gamefolio handles all moderation." },
        { icon: Zap,        title: `${type.xpReward.toLocaleString()} XP Rewarded`, desc: "Creators earn XP on completion, driving high-quality participation." },
      ]}
    >
      {/* Campaign summary card */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "#0a0f18", border: "1px solid rgba(255,255,255,0.08)" }}>
        {/* Header banner */}
        <div className="relative h-24 overflow-hidden flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #0d1624 0%, #0a1020 50%, #0d1624 100%)" }}>
          {settings.gameImageUrl && (
            <img src={settings.gameImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />
          )}
          <div className="relative flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl overflow-hidden border-2"
              style={{ borderColor: "rgba(183,255,24,0.3)" }}>
              {settings.gameImageUrl ? (
                <img src={settings.gameImageUrl} alt={settings.gameName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center" style={{ background: "rgba(183,255,24,0.08)" }}>
                  <Gamepad2 className="w-6 h-6" style={{ color: NEON }} />
                </div>
              )}
            </div>
            <div>
              {settings.gameName && <div className="text-[10px] text-white/40">{settings.gameName}</div>}
              <div className="text-base font-black text-white leading-tight">{type.name}</div>
              <div className="flex items-center gap-1 mt-0.5">
                <ShieldCheck className="w-3 h-3" style={{ color: NEON }} />
                <span className="text-[10px] font-bold" style={{ color: NEON }}>GF Verified Campaign</span>
              </div>
            </div>
          </div>
        </div>
        {/* Stats grid */}
        <div className="grid grid-cols-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {[
            { label: "Duration",  value: `${duration}d` },
            { label: "Creators",  value: capacity },
            { label: "Demo Keys", value: type.demoKeys },
            { label: "Full Keys", value: type.fullKeys },
          ].map((s, i) => (
            <div key={s.label} className="flex flex-col items-center py-3"
              style={{ borderRight: i < 3 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
              <div className="text-base font-black text-white">{s.value}</div>
              <div className="text-[9px] text-white/25 uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>
        {/* Details row */}
        <div className="flex items-center gap-3 px-4 py-2.5 text-[10px] text-white/30 flex-wrap"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <span>{settings.startType === "asap" ? "🚀 Launches immediately" : `📅 Launches ${settings.scheduledDate}`}</span>
          <span>· {regionLabel}</span>
          {settings.platforms.length > 0 && <span>· {settings.platforms.join(", ")}</span>}
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
      <button onClick={onLaunch} disabled={!confirmed || submitting}
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
    </StepHero>
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
// Mode Selector (Auto vs Manual)
// ─────────────────────────────────────────────

function ModeSelector({ mode, onChange }: { mode: "auto" | "manual"; onChange: (m: "auto" | "manual") => void }) {
  const opts = [
    {
      id: "auto" as const,
      icon: Bot,
      title: "Automatic Campaigns",
      desc: "Upload your keys once and let Gamefolio continuously create and manage campaigns for your game.",
      accent: "#a78bfa",
      rgb: "167,139,250",
      feature: "Gamefolio manages everything",
    },
    {
      id: "manual" as const,
      icon: Sparkles,
      title: "Choose a Campaign",
      desc: "Choose a specific campaign template and launch campaigns yourself.",
      accent: NEON,
      rgb: "183,255,27",
      feature: "You stay in full control",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 mb-8">
      {opts.map(opt => {
        const Icon = opt.icon;
        const sel = mode === opt.id;
        return (
          <button key={opt.id} onClick={() => onChange(opt.id)}
            className="relative text-left rounded-2xl overflow-hidden transition-all duration-300"
            style={{
              background: sel
                ? `linear-gradient(135deg, rgba(${opt.rgb},0.10) 0%, rgba(7,11,16,0.98) 60%)`
                : "rgba(255,255,255,0.02)",
              border: `1.5px solid ${sel ? `rgba(${opt.rgb},0.45)` : "rgba(255,255,255,0.07)"}`,
              boxShadow: sel ? `0 8px 48px 0 rgba(${opt.rgb},0.14), 0 0 0 1px rgba(${opt.rgb},0.08) inset` : "none",
              transform: sel ? "translateY(-1px)" : "none",
            }}>

            {/* Colored left bar */}
            <div className="absolute left-0 top-0 bottom-0 w-[3px] transition-all duration-300 rounded-l-2xl"
              style={{ background: sel ? opt.accent : "transparent" }} />

            <div className="p-5 pl-6">
              {/* Icon row */}
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300"
                  style={{
                    background: sel ? `rgba(${opt.rgb},0.12)` : "rgba(255,255,255,0.05)",
                    border: `1px solid ${sel ? `rgba(${opt.rgb},0.2)` : "rgba(255,255,255,0.07)"}`,
                  }}>
                  <Icon className="w-5 h-5" style={{ color: sel ? opt.accent : "rgba(255,255,255,0.35)" }} />
                </div>

                {/* Animated check */}
                <div className="w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300"
                  style={{
                    background: sel ? opt.accent : "transparent",
                    border: `1.5px solid ${sel ? "transparent" : "rgba(255,255,255,0.18)"}`,
                    transform: sel ? "scale(1)" : "scale(0.9)",
                  }}>
                  {sel && <Check className="w-3 h-3" style={{ color: "#070b10" }} />}
                </div>
              </div>

              {/* Text */}
              <h4 className="text-[13px] font-black text-white mb-1.5">{opt.title}</h4>
              <p className="text-[11px] leading-relaxed mb-3" style={{ color: "rgba(255,255,255,0.38)" }}>
                {opt.desc}
              </p>

              {/* Feature line */}
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 shrink-0" style={{ color: sel ? opt.accent : "rgba(255,255,255,0.2)" }} />
                <span className="text-[10px] font-semibold transition-colors duration-300"
                  style={{ color: sel ? opt.accent : "rgba(255,255,255,0.25)" }}>
                  {opt.feature}
                </span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────
// Auto Campaign info card (shown in Step 1 when auto is selected)
// ─────────────────────────────────────────────

const AUTO_PROCESS = [
  { label: "Upload Keys",                    icon: Upload },
  { label: "Gamefolio Selects a Campaign",   icon: Bot },
  { label: "Eligible Creators Join",         icon: Users },
  { label: "Content Is Created",             icon: Film },
  { label: "Full Game Keys Are Rewarded",    icon: KeyRound },
];
const AUTO_HANDLES = [
  "Chooses the most suitable campaign template",
  "Creates and launches creator bounties",
  "Sets duration, requirements, and capacity",
  "Issues demo keys when creators join",
  "Tracks content creation and XP",
  "Releases full game keys on valid completion",
  "Ends completed campaigns and starts the next",
];

function AutoCampaignInfo() {
  return (
    <StepHero
      icon={Bot}
      title="Automatic Campaigns"
      description="Upload your keys once and let Gamefolio continuously create, launch and manage creator campaigns for your game. You set the limits — we handle the rest."
      accent="#a78bfa" rgb="167,139,250"
      sideIcons={[
        { icon: KeyRound, top:    "30px", left:  "56px" },
        { icon: Film,     top:    "30px", right: "56px" },
        { icon: Users,    bottom: "28px", right: "72px" },
      ]}
      features={[
        { icon: Upload,     title: "Upload Keys Once",            desc: "Add your game keys to the Gamefolio key pool — one time setup." },
        { icon: Bot,        title: "Gamefolio Manages Everything", desc: "Campaigns are created, launched and managed automatically." },
        { icon: KeyRound,   title: "Smart Key Distribution",      desc: "Demo keys on join · full game keys on completion. All automatic." },
        { icon: ShieldCheck, title: "Safeguards Always Active",   desc: "Campaigns stop if your key reserve drops below your set limit." },
      ]}
      banner={{ icon: ShieldCheck, text: <>Uses only <strong style={{color:"#a78bfa"}}>Quick Creator</strong>, <strong style={{color:"#a78bfa"}}>Content Boost</strong>, and <strong style={{color:"#a78bfa"}}>Creator Showcase</strong> verified templates — no custom campaigns run automatically.</>, accent: "#a78bfa", rgb: "167,139,250" }}
    />
  );
}

// ─────────────────────────────────────────────
// Auto Step 2: Upload Keys to Pool
// ─────────────────────────────────────────────

function AutoStepUploadKeys({ demoKeys, fullKeys, poolDemo, poolFull, onDemoChange, onFullChange }: {
  demoKeys: string; fullKeys: string; poolDemo: number; poolFull: number;
  onDemoChange: (v: string) => void; onFullChange: (v: string) => void;
}) {
  const pendDemo = parseKeyLines(demoKeys).length;
  const pendFull = parseKeyLines(fullKeys).length;
  const totalDemo = poolDemo + pendDemo;
  const totalFull = poolFull + pendFull;
  const hasKeys = totalDemo > 0 && totalFull > 0;

  return (
    <StepHero
      icon={Upload}
      title="Build Your Key Pool"
      description="Upload your game keys once. Gamefolio draws from this pool to fuel every campaign it creates for you — automatically and within your set limits."
      accent="#a78bfa" rgb="167,139,250"
      sideIcons={[
        { icon: KeyRound,    top:    "28px", left:  "56px" },
        { icon: ShieldCheck, top:    "28px", right: "56px" },
        { icon: Rocket,      bottom: "30px", left:  "80px" },
      ]}
      features={[
        { icon: KeyRound,   title: "Demo Keys",             desc: "Issued to creators automatically when they join a campaign." },
        { icon: Rocket,     title: "Full Game Keys",        desc: "Rewarded when creators complete their campaign deliverables." },
        { icon: ShieldCheck, title: "Automatic Safeguards", desc: "New campaigns only launch when your pool has enough keys." },
      ]}
    >
      {/* Pool status */}
      {(poolDemo > 0 || poolFull > 0) && (
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Demo Keys in Pool", value: poolDemo, color: "#60a5fa" },
            { label: "Full Keys in Pool", value: poolFull, color: "#fb923c" },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-3.5 text-center"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="text-xl font-black mb-0.5" style={{ color: s.color }}>{s.value}</div>
              <div className="text-[10px] text-white/30">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Two-column upload */}
      <div className="grid grid-cols-2 gap-6">
        <KeyUploadArea label="Demo Keys" accent="#60a5fa"
          keys={demoKeys} needed={1} vaultAvail={poolDemo}
          onChange={onDemoChange} />
        <KeyUploadArea label="Full Game Keys" accent="#fb923c"
          keys={fullKeys} needed={1} vaultAvail={poolFull}
          onChange={onFullChange} />
      </div>

      {/* All ready */}
      {hasKeys && (
        <div className="flex items-center gap-3 p-3.5 rounded-xl gf-scale-in"
          style={{ background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.2)" }}>
          <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: "#a78bfa" }} />
          <div>
            <div className="text-sm font-bold" style={{ color: "#a78bfa" }}>Pool ready</div>
            <div className="text-[11px] text-white/40 mt-0.5">{totalDemo} demo · {totalFull} full game keys in pool</div>
          </div>
        </div>
      )}

      {!hasKeys && poolDemo === 0 && poolFull === 0 && (
        <div className="flex items-center gap-2 p-3 rounded-xl"
          style={{ background: "rgba(251,146,60,0.05)", border: "1px solid rgba(251,146,60,0.12)" }}>
          <AlertCircle className="w-4 h-4 text-orange-400 shrink-0" />
          <p className="text-[11px] text-orange-300/70">Upload at least some demo and full game keys to continue.</p>
        </div>
      )}
    </StepHero>
  );
}

// ─────────────────────────────────────────────
// Auto Step 3: Set Limits
// ─────────────────────────────────────────────

interface AutoLimits {
  maxCreators: number;
  frequency: string;
  minDemoReserve: number;
  minFullReserve: number;
  maxActive: number;
}

const FREQUENCY_OPTS = [
  { id: "after_previous", label: "After previous campaign ends" },
  { id: "weekly",         label: "Weekly" },
  { id: "fortnightly",    label: "Fortnightly" },
  { id: "monthly",        label: "Monthly" },
];

function AutoStepLimits({ limits, onChange }: { limits: AutoLimits; onChange: (l: Partial<AutoLimits>) => void }) {
  const labelStyle = "text-[10px] font-bold text-white/30 uppercase tracking-wider block mb-2";

  return (
    <StepHero
      icon={Sliders}
      title="Set Your Limits"
      description="Stay in control of how many creators participate and how often campaigns run. Gamefolio handles everything within these limits."
      accent="#a78bfa" rgb="167,139,250"
      sideIcons={[
        { icon: Users,  top:    "32px", left:  "52px" },
        { icon: Clock,  top:    "32px", right: "52px" },
        { icon: Lock,   bottom: "30px", left:  "72px" },
      ]}
      features={[
        { icon: Users,      title: "Creator Cap",       desc: "Maximum creators per campaign — Gamefolio never exceeds this." },
        { icon: Clock,      title: "Campaign Frequency", desc: "Control how often new campaigns are automatically created." },
        { icon: Lock,       title: "Key Reserve",        desc: "Set a minimum — campaigns pause if your pool drops below it." },
      ]}
    >
      {/* Max creators */}
      <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div>
          <label className="text-sm font-bold text-white block mb-0.5">Maximum Creators per Campaign</label>
          <p className="text-[11px] text-white/30">How many creators can join each campaign. Default: 20</p>
        </div>
        <div className="flex items-center gap-2 ml-4 shrink-0">
          <button onClick={() => onChange({ maxCreators: Math.max(5, limits.maxCreators - 5) })}
            className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-lg transition-all"
            style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)" }}>−</button>
          <span className="text-xl font-black text-white w-12 text-center">{limits.maxCreators}</span>
          <button onClick={() => onChange({ maxCreators: Math.min(100, limits.maxCreators + 5) })}
            className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-lg transition-all"
            style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)" }}>+</button>
        </div>
      </div>

      {/* Frequency */}
      <div>
        <label className={labelStyle}>Campaign Frequency</label>
        <div className="grid grid-cols-2 gap-2">
          {FREQUENCY_OPTS.map(opt => (
            <button key={opt.id} onClick={() => onChange({ frequency: opt.id })}
              className="flex items-start gap-2.5 p-3.5 rounded-xl text-left transition-all"
              style={{
                background: limits.frequency === opt.id ? "rgba(167,139,250,0.07)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${limits.frequency === opt.id ? "rgba(167,139,250,0.3)" : "rgba(255,255,255,0.07)"}`,
              }}>
              <div className="w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center"
                style={{ borderColor: limits.frequency === opt.id ? "#a78bfa" : "rgba(255,255,255,0.2)", background: limits.frequency === opt.id ? "#a78bfa" : "transparent" }}>
                {limits.frequency === opt.id && <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#070b10" }} />}
              </div>
              <span className="text-[11px] font-semibold" style={{ color: limits.frequency === opt.id ? "#a78bfa" : "rgba(255,255,255,0.55)" }}>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Min key reserve */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { key: "minDemoReserve" as const, label: "Min Demo Key Reserve", color: "#60a5fa" },
          { key: "minFullReserve" as const, label: "Min Full Key Reserve", color: "#fb923c" },
        ].map(f => (
          <div key={f.key} className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <label className={labelStyle}>{f.label}</label>
            <p className="text-[10px] text-white/25 mb-3">Campaigns pause if pool drops below this</p>
            <div className="flex items-center gap-2">
              <button onClick={() => onChange({ [f.key]: Math.max(0, limits[f.key] - 5) })}
                className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-base"
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)" }}>−</button>
              <span className="text-lg font-black w-10 text-center" style={{ color: f.color }}>{limits[f.key]}</span>
              <button onClick={() => onChange({ [f.key]: Math.min(200, limits[f.key] + 5) })}
                className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-base"
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)" }}>+</button>
            </div>
          </div>
        ))}
      </div>

      {/* Max active */}
      <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div>
          <label className="text-sm font-bold text-white block mb-0.5">Maximum Active Campaigns</label>
          <p className="text-[11px] text-white/30">How many campaigns can run simultaneously. Default: 1</p>
        </div>
        <div className="flex items-center gap-2 ml-4 shrink-0">
          <button onClick={() => onChange({ maxActive: Math.max(1, limits.maxActive - 1) })}
            className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-lg transition-all"
            style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)" }}>−</button>
          <span className="text-xl font-black text-white w-12 text-center">{limits.maxActive}</span>
          <button onClick={() => onChange({ maxActive: Math.min(5, limits.maxActive + 1) })}
            className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-lg transition-all"
            style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)" }}>+</button>
        </div>
      </div>
    </StepHero>
  );
}

// ─────────────────────────────────────────────
// Auto Step 4: Confirm & Activate
// ─────────────────────────────────────────────

function AutoStepConfirm({ limits, poolDemo, poolFull, indieProfile, confirmed, onConfirm, submitting, onActivate }: {
  limits: AutoLimits; poolDemo: number; poolFull: number; indieProfile: any;
  confirmed: boolean; onConfirm: (v: boolean) => void; submitting: boolean; onActivate: () => void;
}) {
  const freqLabel = FREQUENCY_OPTS.find(f => f.id === limits.frequency)?.label ?? limits.frequency;
  const gameName = indieProfile?.profile?.gameName ?? "Your Game";
  const gameImage = indieProfile?.profile?.headerImageUrl ?? null;

  return (
    <StepHero
      icon={Bot}
      title="Ready to Activate"
      description="Gamefolio will manage your campaigns automatically within these limits. You can pause or adjust everything from your dashboard at any time."
      accent="#a78bfa" rgb="167,139,250"
      sideIcons={[
        { icon: ShieldCheck,  top:    "28px", left:  "52px" },
        { icon: CheckCircle2, top:    "28px", right: "52px" },
        { icon: Rocket,       bottom: "30px", right: "72px" },
      ]}
      features={[
        { icon: ShieldCheck,  title: "Safeguards Always Active",    desc: "Campaigns never launch without sufficient keys in your pool." },
        { icon: Sliders,      title: "Always Respects Your Limits", desc: "Creator caps, frequency, and key reserves are always enforced." },
        { icon: CheckCircle2, title: "Full Dashboard Control",      desc: "Pause, adjust or stop automatic campaigns from your dashboard." },
      ]}
    >
      {/* Summary card */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "#0a0f18", border: "1px solid rgba(167,139,250,0.15)" }}>
        <div className="flex items-center gap-3 p-4"
          style={{ background: "linear-gradient(135deg, rgba(167,139,250,0.08) 0%, transparent 70%)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          {gameImage ? (
            <img src={gameImage} alt={gameName} className="w-10 h-10 rounded-xl object-cover shrink-0"
              style={{ border: "1px solid rgba(167,139,250,0.25)" }} />
          ) : (
            <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center" style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)" }}>
              <Gamepad2 className="w-5 h-5" style={{ color: "#a78bfa" }} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-[10px] text-white/35 truncate">{gameName}</div>
            <div className="text-sm font-black text-white">Automatic Campaigns</div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-bold shrink-0"
            style={{ background: "rgba(167,139,250,0.1)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.2)" }}>
            <div className="w-1.5 h-1.5 rounded-full bg-current" /> Ready
          </div>
        </div>

        <div className="grid grid-cols-2">
          {[
            { label: "Demo Keys",          value: poolDemo,              color: "#60a5fa" },
            { label: "Full Keys",          value: poolFull,              color: "#fb923c" },
            { label: "Max Creators",       value: limits.maxCreators,    color: "rgba(255,255,255,0.8)" },
            { label: "Frequency",          value: freqLabel,             color: "rgba(255,255,255,0.8)" },
            { label: "Min Demo Reserve",   value: limits.minDemoReserve, color: "#60a5fa" },
            { label: "Min Full Reserve",   value: limits.minFullReserve, color: "#fb923c" },
          ].map((s, i) => (
            <div key={s.label} className="p-3"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", borderRight: i % 2 === 0 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
              <div className="text-[9px] text-white/25 uppercase tracking-wider mb-1">{s.label}</div>
              <div className="text-sm font-black truncate" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Confirmation checkbox */}
      <button onClick={() => onConfirm(!confirmed)}
        className="w-full flex items-start gap-3 text-left p-4 rounded-2xl transition-all"
        style={{
          background: confirmed ? "rgba(167,139,250,0.07)" : "rgba(255,255,255,0.02)",
          border: `1px solid ${confirmed ? "rgba(167,139,250,0.3)" : "rgba(255,255,255,0.09)"}`,
        }}>
        <div className="w-5 h-5 rounded-md border-2 shrink-0 flex items-center justify-center mt-0.5 transition-all"
          style={{ borderColor: confirmed ? "#a78bfa" : "rgba(255,255,255,0.2)", background: confirmed ? "#a78bfa" : "transparent" }}>
          {confirmed && <Check className="w-3 h-3" style={{ color: "#070b10" }} />}
        </div>
        <span className="text-sm text-white/70 leading-snug">
          I understand that Gamefolio will automatically manage campaigns using these settings and the keys in my pool.
        </span>
      </button>

      {/* Activate button */}
      <button onClick={onActivate} disabled={!confirmed || submitting}
        className="w-full py-4 rounded-2xl text-base font-black tracking-wide transition-all flex items-center justify-center gap-2.5 disabled:opacity-40"
        style={{
          background: confirmed && !submitting ? "#a78bfa" : "rgba(167,139,250,0.3)",
          color: "#070b10",
          boxShadow: confirmed && !submitting ? "0 0 32px 0 rgba(167,139,250,0.25)" : "none",
        }}>
        {submitting ? (
          <><Loader2 className="w-5 h-5 animate-spin" /> Activating…</>
        ) : (
          <><Bot className="w-5 h-5" /> Activate Automatic Campaigns</>
        )}
      </button>
    </StepHero>
  );
}

// ─────────────────────────────────────────────
// Auto Success Screen
// ─────────────────────────────────────────────

function AutoSuccessScreen({ poolDemo, poolFull, onView, onDashboard }: {
  poolDemo: number; poolFull: number; onView: () => void; onDashboard: () => void;
}) {
  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 9998, background: "rgba(7,11,16,0.96)" }}>
      <Confetti />
      <div className="relative text-center max-w-sm mx-auto px-6 gf-scale-in">
        <div className="w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center"
          style={{ background: "rgba(167,139,250,0.1)", border: "2px solid rgba(167,139,250,0.3)" }}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <polyline points="10,24 20,34 38,14" stroke="#a78bfa" strokeWidth="4"
              strokeLinecap="round" strokeLinejoin="round" className="gf-check-draw" />
          </svg>
        </div>

        <h2 className="text-3xl font-black text-white mb-2">Automatic Campaigns Activated</h2>
        <p className="text-sm text-white/45 mb-6">Gamefolio will now create and manage creator campaigns for your game automatically.</p>

        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: "Status",      value: "Active",      color: "#a78bfa" },
            { label: "Demo Keys",   value: `${poolDemo}`, color: "#60a5fa" },
            { label: "Full Keys",   value: `${poolFull}`, color: "#fb923c" },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-3"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="text-base font-black mb-0.5" style={{ color: s.color }}>{s.value}</div>
              <div className="text-[9px] text-white/30 uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="rounded-xl p-3 mb-6 text-[11px] text-white/40"
          style={{ background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.12)" }}>
          <Bot className="w-4 h-4 inline mr-1.5 mb-0.5" style={{ color: "#a78bfa" }} />
          Gamefolio is preparing your first campaign
        </div>

        <div className="space-y-2.5">
          <button onClick={onView}
            className="w-full py-3.5 rounded-2xl font-black text-sm transition-all hover:brightness-110"
            style={{ background: "#a78bfa", color: "#070b10" }}>
            View Automatic Campaigns
          </button>
          <button onClick={onDashboard}
            className="w-full py-3 rounded-2xl font-bold text-sm transition-all"
            style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.09)" }}>
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

  // ── Mode ───────────────────────────────────
  const [mode, setMode] = useState<"auto" | "manual">("manual");

  // ── Manual mode state ──────────────────────
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

  // ── Auto mode state ────────────────────────
  const [autoStep, setAutoStep]       = useState(1);
  const [autoSuccess, setAutoSuccess] = useState(false);
  const [autoConfirmed, setAutoConfirmed] = useState(false);
  const [autoSubmitting, setAutoSubmitting] = useState(false);
  const [autoDemoKeys, setAutoDemoKeys] = useState("");
  const [autoFullKeys, setAutoFullKeys] = useState("");
  const [autoLimits, setAutoLimits]   = useState<AutoLimits>({
    maxCreators: 20, frequency: "after_previous",
    minDemoReserve: 20, minFullReserve: 20, maxActive: 1,
  });

  // ── Shared queries ─────────────────────────
  const { data: bountyStatus } = useQuery<any>({
    queryKey: ["/api/indie/bounty-status"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  const { data: templates = [] } = useQuery<any[]>({
    queryKey: ["/api/campaigns/templates"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  const { data: poolStatus, refetch: refetchPool } = useQuery<any>({
    queryKey: ["/api/campaigns/auto/pool"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  const { data: indieProfile } = useQuery<any>({
    queryKey: ["/api/indie/profile"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Manual keys
  const vaultDemo = bountyStatus?.demoKeys?.available ?? 0;
  const vaultFull = bountyStatus?.fullGameKeys?.available ?? 0;
  const pendDemo  = parseKeyLines(pendingDemoKeys).length;
  const pendFull  = parseKeyLines(pendingFullKeys).length;
  const keysReady = !!selectedType &&
    (vaultDemo + pendDemo >= selectedType.demoKeys) &&
    (vaultFull + pendFull >= selectedType.fullKeys);

  // Auto pool counts (adds pasted keys to pool live count)
  const poolDemo    = (poolStatus?.demoKeys ?? 0) + parseKeyLines(autoDemoKeys).length;
  const poolFull    = (poolStatus?.fullKeys  ?? 0) + parseKeyLines(autoFullKeys).length;
  const autoHasKeys = poolDemo > 0 && poolFull > 0;

  const getTemplateId = (): number | null => {
    if (!selectedType) return null;
    const tmpl = (templates as any[]).find((t: any) => t.slug === selectedType.slug);
    return tmpl?.id ?? null;
  };

  const updateSettings = (partial: Partial<CampaignSettings>) => setSettings(s => ({ ...s, ...partial }));
  const updateAutoLimits = (partial: Partial<AutoLimits>) => setAutoLimits(l => ({ ...l, ...partial }));

  // ── Manual launch ──────────────────────────
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
      if (demoKeyList.length > 0) {
        await apiRequest("POST", `/api/campaigns/instances/${instData.id}/keys`, { keyType: "demo", keys: demoKeyList });
      }
      if (fullKeyList.length > 0) {
        await apiRequest("POST", `/api/campaigns/instances/${instData.id}/keys`, { keyType: "full", keys: fullKeyList });
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

  // ── Auto activate ──────────────────────────
  const handleActivate = async () => {
    setAutoSubmitting(true);
    try {
      // Upload pending pool keys
      const demoKeyList = parseKeyLines(autoDemoKeys);
      const fullKeyList = parseKeyLines(autoFullKeys);
      if (demoKeyList.length > 0) {
        await apiRequest("POST", "/api/campaigns/auto/keys", { keyType: "demo", keys: demoKeyList });
      }
      if (fullKeyList.length > 0) {
        await apiRequest("POST", "/api/campaigns/auto/keys", { keyType: "full", keys: fullKeyList });
      }

      // Get curated template IDs (all 3 non-custom)
      const curatedSlugs = ["quick-creator", "content-boost", "creator-showcase"];
      const allowedTemplates = (templates as any[])
        .filter((t: any) => curatedSlugs.includes(t.slug))
        .map((t: any) => t.id);

      const gameName     = indieProfile?.profile?.gameName ?? "";
      const gameArtwork  = indieProfile?.profile?.headerImageUrl ?? "";

      const res = await apiRequest("POST", "/api/campaigns/auto/settings", {
        enabled: true,
        allowedTemplates,
        frequency: autoLimits.frequency,
        maxCreatorsPerCampaign: autoLimits.maxCreators,
        minKeyReserve: Math.min(autoLimits.minDemoReserve, autoLimits.minFullReserve),
        keyPoolSize: poolDemo + poolFull,
        gameName,
        gameArtworkUrl: gameArtwork,
      });
      if (!res.ok) throw new Error("Failed to activate automatic campaigns");

      queryClient.invalidateQueries({ queryKey: ["/api/campaigns/auto/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns/auto/pool"] });
      refetchPool();
      setAutoSuccess(true);
    } catch (err: any) {
      toast({ description: err.message || "Failed to activate", variant: "gamefolioError" as any });
    } finally {
      setAutoSubmitting(false);
    }
  };

  // ── Step state helpers ─────────────────────
  function manualStepState(n: number): StepState {
    if (n < currentStep) return "completed";
    if (n === currentStep) return "active";
    return "upcoming";
  }
  function autoStepState(n: number): StepState {
    if (n < autoStep) return "completed";
    if (n === autoStep) return "active";
    return "upcoming";
  }

  const step1ManualSummary = selectedType?.name ?? "";
  const step2ManualSummary = [
    settings.startType === "asap" ? "Launch Immediately" : `Scheduled: ${settings.scheduledDate}`,
    settings.platforms.length ? settings.platforms.join(", ") : "All platforms",
  ].join(" · ");
  const step3ManualSummary = keysReady
    ? `${vaultDemo + pendDemo} demo · ${vaultFull + pendFull} full game keys ready`
    : "Keys pending";

  const autoStep1Summary = mode === "auto" ? "Automatic Campaigns" : "";
  const autoStep2Summary = `${poolDemo} demo · ${poolFull} full keys in pool`;
  const autoStep3Summary = `${autoLimits.maxCreators} creators · ${FREQUENCY_OPTS.find(f => f.id === autoLimits.frequency)?.label}`;

  return (
    <>
      <style>{ANIM_CSS}</style>

      {/* Manual success overlay */}
      {launched && selectedType && (
        <SuccessScreen type={selectedType} onDashboard={onComplete} />
      )}

      {/* Auto success overlay */}
      {autoSuccess && (
        <AutoSuccessScreen
          poolDemo={poolStatus?.demoKeys ?? 0}
          poolFull={poolStatus?.fullKeys  ?? 0}
          onView={onComplete}
          onDashboard={onComplete} />
      )}

      <div className="space-y-3">

        {/* ── Step 1: open layout when active, compact row when completed ── */}
        {(mode === "auto" ? autoStep > 1 : currentStep > 1) ? (
          /* Completed row — compact, no heavy border */
          <div className="flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all"
            style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(183,255,24,0.12)" }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
              style={{ background: NEON }}>
              <Check className="w-4 h-4" style={{ color: "#070b10" }} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-black text-white/70">
                {mode === "auto" ? "Automatic Campaigns" : selectedType?.shortName ?? ""}
              </span>
              {mode === "manual" && selectedType && (
                <span className="text-[10px] text-white/30 ml-2">{selectedType.bestFor}</span>
              )}
            </div>
            <button
              onClick={() => {
                if (mode === "auto") setAutoStep(1);
                else { setCurrentStep(1); setConfirmed(false); }
              }}
              className="text-[11px] font-bold px-3 py-1 rounded-lg transition-colors"
              style={{ color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.04)" }}
              onMouseOver={e => (e.currentTarget.style.color = "#fff")}
              onMouseOut={e => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}>
              Change
            </button>
          </div>
        ) : (
          /* Active — open, breathable, no heavy box */
          <div className="gf-fade-up">
            {/* Title row + Automatic toggle */}
            <div className="flex items-start justify-between mb-8 gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-widest mb-1.5 font-bold" style={{ color: "rgba(255,255,255,0.25)" }}>Step 1</p>
                <h2 className="text-2xl font-black text-white leading-tight">Create a Campaign</h2>
              </div>

              {/* Inline toggle pill */}
              <button
                onClick={() => {
                  const next = mode === "auto" ? "manual" : "auto";
                  setMode(next);
                  setAutoStep(1);
                  setCurrentStep(1);
                  setConfirmed(false);
                  setAutoConfirmed(false);
                  setSelectedType(null);
                }}
                className="shrink-0 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-all duration-300"
                style={{
                  background: mode === "auto" ? "rgba(167,139,250,0.12)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${mode === "auto" ? "rgba(167,139,250,0.32)" : "rgba(255,255,255,0.10)"}`,
                }}>
                {/* Toggle track */}
                <div className="relative shrink-0"
                  style={{ width: "34px", height: "18px", borderRadius: "9999px",
                    background: mode === "auto" ? "#a78bfa" : "rgba(255,255,255,0.15)",
                    transition: "background 0.25s ease" }}>
                  <div style={{
                    position: "absolute", top: "2px",
                    width: "14px", height: "14px", borderRadius: "50%",
                    background: "#fff",
                    left: mode === "auto" ? "18px" : "2px",
                    transition: "left 0.25s cubic-bezier(0.22,1,0.36,1)",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.35)",
                  }} />
                </div>
                <span className="text-[12px] font-bold whitespace-nowrap"
                  style={{ color: mode === "auto" ? "#a78bfa" : "rgba(255,255,255,0.40)" }}>
                  Automatic
                </span>
              </button>
            </div>

            {/* Mode content — keyed so React remounts it on toggle, triggering animation */}
            <div key={mode} className="gf-fade-up">
              {mode === "auto" ? (
                <>
                  <AutoCampaignInfo />
                  <button
                    onClick={() => setAutoStep(2)}
                    className="w-full mt-6 py-4 rounded-2xl text-sm font-black flex items-center justify-center gap-2 transition-all hover:brightness-110"
                    style={{ background: "#a78bfa", color: "#070b10", boxShadow: "0 0 32px 0 rgba(167,139,250,0.2)" }}>
                    Continue with Automatic Campaigns <ArrowRight className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <TypeCardCarousel
                  selectedType={selectedType}
                  onSelectAndContinue={(t) => {
                    setSelectedType(t);
                    setConfirmed(false);
                    setCurrentStep(2);
                  }}
                />
              )}
            </div>
          </div>
        )}

        {/* ════════ AUTO FLOW ════════ */}
        {mode === "auto" && (
          <>
            <StepCard number={2} title="Upload Game Keys" icon={KeyRound}
              state={autoStepState(2)} completedLine={autoStep2Summary}
              onEdit={() => setAutoStep(2)}>
              <div>
                <AutoStepUploadKeys
                  demoKeys={autoDemoKeys} fullKeys={autoFullKeys}
                  poolDemo={poolStatus?.demoKeys ?? 0} poolFull={poolStatus?.fullKeys ?? 0}
                  onDemoChange={setAutoDemoKeys} onFullChange={setAutoFullKeys} />
                <button
                  onClick={() => autoHasKeys && setAutoStep(3)}
                  disabled={!autoHasKeys}
                  className="w-full mt-6 py-3 rounded-2xl text-sm font-black flex items-center justify-center gap-2 transition-all hover:brightness-110 disabled:opacity-35"
                  style={{ background: "#a78bfa", color: "#070b10" }}>
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </StepCard>

            <StepCard number={3} title="Set Limits" icon={Sliders}
              state={autoStepState(3)} completedLine={autoStep3Summary}
              onEdit={() => setAutoStep(3)}>
              <div>
                <AutoStepLimits limits={autoLimits} onChange={updateAutoLimits} />
                <button
                  onClick={() => setAutoStep(4)}
                  className="w-full mt-6 py-3 rounded-2xl text-sm font-black flex items-center justify-center gap-2 transition-all hover:brightness-110"
                  style={{ background: "#a78bfa", color: "#070b10" }}>
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </StepCard>

            <StepCard number={4} title="Confirm & Activate" icon={Rocket}
              state={autoStepState(4)}>
              <AutoStepConfirm
                limits={autoLimits} poolDemo={poolDemo} poolFull={poolFull}
                indieProfile={indieProfile}
                confirmed={autoConfirmed} onConfirm={setAutoConfirmed}
                submitting={autoSubmitting} onActivate={handleActivate} />
            </StepCard>
          </>
        )}

        {/* ════════ MANUAL FLOW ════════ */}
        {mode === "manual" && (
          <>
            <StepCard number={2} title="Personalise Your Campaign" icon={Gamepad2}
              state={manualStepState(2)} completedLine={step2ManualSummary}
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

            <StepCard number={3} title="Upload Game Keys" icon={KeyRound}
              state={manualStepState(3)} completedLine={step3ManualSummary}
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

            <StepCard number={4} title="Launch Campaign" icon={Rocket}
              state={manualStepState(4)}>
              {selectedType && (
                <StepLaunch type={selectedType} settings={settings}
                  confirmed={confirmed} onConfirm={setConfirmed}
                  submitting={submitting} onLaunch={handleLaunch} />
              )}
            </StepCard>
          </>
        )}

      </div>
    </>
  );
}
