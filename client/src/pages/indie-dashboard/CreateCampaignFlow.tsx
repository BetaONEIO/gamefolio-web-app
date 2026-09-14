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
  ChevronRight, ChevronDown, ClipboardList, Globe2,
} from "lucide-react";
import { NEON, DASHBOARD_THEME, rgbaAccent } from "./constants";
import CommercialCampaignAccordion from "./CommercialCampaignAccordion";
import { CAMPAIGN_COMMERCIAL_MODEL } from "@shared/campaign-commercial-model";

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
  @media (prefers-reduced-motion: reduce) {
    .gf-accordion-motion, .gf-accordion-motion * {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
`;

// ─────────────────────────────────────────────
// Data types & constants
// ─────────────────────────────────────────────

export interface CampaignType {
  slug: string; name: string; shortName: string; tagline: string; description: string;
  shortDesc: string; subtitle: string; bestFor: string; bestForList: string[];
  duration: number;
  deliverables: number;
  xpReward: number; recommended?: boolean; custom?: boolean; icon: any;
  pills: { ct: string; qty: number }[];
}

const CAMPAIGN_TYPES: CampaignType[] = [
  {
    slug: "quick-creator", name: "Quick Creator Campaign", shortName: "Quick Creator",
    tagline: "Get your first creators playing fast.",
    subtitle: "Get your first creators playing fast.",
    shortDesc: "A short campaign designed to generate first impressions, gameplay content and useful creator feedback.",
    description: "A short campaign designed to generate first impressions, gameplay content and useful creator feedback.",
    bestFor: "🚀 New Launches",
    bestForList: ["New game launches", "Steam demos", "Early Access", "First wave of creator content"],
    duration: 7, deliverables: 5, xpReward: 3000, recommended: true, icon: Zap,
    pills: [{ ct: "clip", qty: 2 }, { ct: "screenshot", qty: 2 }, { ct: "feedback", qty: 1 }],
  },
  {
    slug: "content-boost", name: "Content Boost Campaign", shortName: "Content Boost",
    tagline: "Build a reusable content library for your game.",
    subtitle: "Build a reusable content library for your game.",
    shortDesc: "A multi-format campaign to generate gameplay clips, vertical content, screenshots and creator feedback.",
    description: "A multi-format campaign designed to generate gameplay clips, vertical content, screenshots and creator feedback for future marketing.",
    bestFor: "📈 Content Library",
    bestForList: ["Social media marketing", "Building a content library", "Steam page promotion", "Increasing game discovery"],
    duration: 14, deliverables: 8, xpReward: 7500, icon: Sparkles,
    pills: [{ ct: "clip", qty: 2 }, { ct: "reel", qty: 3 }, { ct: "screenshot", qty: 2 }, { ct: "feedback", qty: 1 }],
  },
  {
    slug: "creator-showcase", name: "Creator Showcase Campaign", shortName: "Creator Showcase",
    tagline: "Generate deeper engagement and premium creator coverage.",
    subtitle: "Generate deeper engagement and premium creator coverage.",
    shortDesc: "A longer campaign for creators who will spend more time playing, streaming and producing higher-value content.",
    description: "A longer campaign for creators who will spend more time playing, streaming and producing higher-value content.",
    bestFor: "⭐ Deep Engagement",
    bestForList: ["Full game launches", "Major updates", "DLC releases", "Seasonal events", "Deep creator engagement"],
    duration: 21, deliverables: 11, xpReward: 15000, icon: Rocket,
    pills: [{ ct: "clip", qty: 3 }, { ct: "reel", qty: 3 }, { ct: "screenshot", qty: 3 }, { ct: "stream", qty: 1 }, { ct: "feedback", qty: 1 }],
  },
  {
    slug: "custom-campaign", name: "Build Your Own Campaign", shortName: "Build Your Own",
    tagline: "Choose your own content objectives, access method and completion timeframe.",
    subtitle: "Configure a campaign around your goals.",
    shortDesc: "Choose your own content objectives, access method and completion timeframe.",
    description: "Build a campaign around your own goals with Gamefolio-calculated XP and deadlines.",
    bestFor: "⚙ Flexible Goals",
    bestForList: ["Specific content goals", "Product testing", "Flexible launches"],
    duration: 14, deliverables: 0, xpReward: 0, custom: true, icon: Sliders,
    pills: [],
  },
];

interface CampaignSettings {
  campaignTitle: string; description: string; gameName: string; gameId: number | null; gameImageUrl: string | null;
  startType: "asap" | "scheduled"; scheduledDate: string; scheduledTime: string; timeZone: string;
  regions: string; platforms: string[];
  customDuration?: number; customCapacity?: number;
  applicationPeriod: number; accessMethod: AccessMethod;
  completionFullGameKey: boolean; customObjectives: CustomObjective[];
  maxPlaces: number; manualApproval: boolean; customAccessInstructions: string; customAccessNeedsKey: boolean;
}

type AccessMethod = "demo_to_full" | "full_game_upfront" | "public_demo" | "free_to_play" | "private_playtest" | "custom_access";
type CustomObjective = { type: "clip" | "reel" | "screenshot" | "stream" | "review" | "feedback" | "bug"; quantity: number };

const ACCESS_METHODS: { id: AccessMethod; title: string; description: string; Icon: any }[] = [
  { id: "demo_to_full", title: "Demo to Full Game", description: "Creators receive demo or playtest access when they join and unlock the full game after completing the campaign.", Icon: KeyRound },
  { id: "full_game_upfront", title: "Full Game Upfront", description: "Creators receive the full game when they join. Bounty XP is their completion reward.", Icon: Gamepad2 },
  { id: "public_demo", title: "Public Demo", description: "Creators use your publicly available demo without an access key.", Icon: Globe2 },
  { id: "free_to_play", title: "Free-to-Play", description: "No game key is required. Creators earn Bounty XP for completing the campaign.", Icon: Zap },
  { id: "private_playtest", title: "Private Playtest", description: "Creators receive a private playtest key or access code.", Icon: Lock },
  { id: "custom_access", title: "Custom Access", description: "Provide creators with your own access instructions.", Icon: FileText },
];

const DEFAULT_OBJECTIVES: CustomObjective[] = [
  { type: "clip", quantity: 1 }, { type: "reel", quantity: 0 }, { type: "screenshot", quantity: 1 },
  { type: "stream", quantity: 0 }, { type: "review", quantity: 1 }, { type: "feedback", quantity: 0 },
  { type: "bug", quantity: 0 },
];

const OBJECTIVE_LABELS: Record<CustomObjective["type"], string> = {
  clip: "Gameplay Clips", reel: "Vertical Reels", screenshot: "Screenshots",
  stream: "Livestreams", review: "Creator Review", feedback: "Feedback Submission", bug: "Bug Reports",
};

const OBJECTIVE_XP: Record<CustomObjective["type"], number> = {
  clip: 500, reel: 750, screenshot: 200, stream: 2000, review: 750, feedback: 500, bug: 600,
};
function calculatedCustomXp(objectives: CustomObjective[]) {
  const subtotal = objectives.reduce((sum, objective) => sum + objective.quantity * OBJECTIVE_XP[objective.type], 0);
  return subtotal > 0 ? subtotal + 500 : 0;
}
function recommendedCustomDeadline(objectives: CustomObjective[]) {
  const days: Record<CustomObjective["type"], number> = { clip: 1, reel: 2, screenshot: 1, stream: 3, review: 2, feedback: 1, bug: 2 };
  const estimate = objectives.reduce((sum, objective) => sum + objective.quantity * days[objective.type], 0);
  return Math.max(1, Math.min(90, Math.ceil(estimate * 0.6)));
}
function objectiveSnapshot(objectives: CustomObjective[]): Record<string, number> {
  return Object.fromEntries(objectives.map(objective => [objective.type, objective.quantity]));
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
  { id: "windows", label: "Windows" },
  { id: "mac",     label: "Mac" },
  { id: "linux",   label: "Linux" },
  { id: "ps",      label: "PlayStation" },
  { id: "xbox",    label: "Xbox" },
  { id: "switch",  label: "Nintendo Switch" },
  { id: "mobile",  label: "Mobile" },
];

const REQ_ICON: Record<string, any> = {
  clip: Film, screenshot: Camera, feedback: MessageSquare,
  reel: Film, session: Zap, bug: AlertCircle, stream: Zap,
};
function reqPillLabel(ct: string, qty: number) {
  if (ct === "clip")       return `${qty} Gameplay Clip${qty === 1 ? "" : "s"}`;
  if (ct === "screenshot") return `${qty} Screenshot${qty === 1 ? "" : "s"}`;
  if (ct === "feedback")   return `${qty} Creator Review${qty === 1 ? "" : "s"}`;
  if (ct === "reel")       return `${qty} Gameplay Reel${qty === 1 ? "" : "s"}`;
  if (ct === "stream")     return "1 Livestream";
  if (ct === "session")    return "Play the Game";
  if (ct === "bug")        return `${qty} Bug Report${qty === 1 ? "" : "s"}`;
  return ct;
}

function campaignSummary(type: CampaignType) {
  return `${type.shortName} · ${type.duration} days · ${type.deliverables || "Custom"} deliverables · ${type.xpReward.toLocaleString()} Bounty XP Reward`;
}

const fieldStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
  color: "#fff", borderRadius: "12px", padding: "10px 14px",
  outline: "none", width: "100%", fontSize: "13px",
};

// ─────────────────────────────────────────────
// Confetti component
// ─────────────────────────────────────────────

const CONFETTI_COLOURS = [NEON];
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

  if (isUpcoming) {
    return (
      <div className="flex items-center gap-3.5 py-2" style={{ opacity: 0.25, pointerEvents: "none" }}>
        <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[11px] font-black"
          style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.4)" }}>
          {number}
        </div>
        <span className="text-sm text-white/40">{title}</span>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="flex items-center gap-3.5 py-2.5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center"
          style={{ background: NEON }}>
          <Check className="w-3.5 h-3.5" style={{ color: "#070b10" }} />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-bold text-white/65">{title}</span>
          {completedLine && (
            <span className="text-[11px] text-white/30 ml-2">{completedLine}</span>
          )}
        </div>
        {onEdit && (
          <button onClick={onEdit}
            className="text-[11px] font-bold text-white/30 hover:text-white/70 transition-colors shrink-0 px-2 py-1">
            Edit
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="gf-fade-up">
      <div className="flex items-center gap-3.5 mb-7">
        <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[11px] font-black"
          style={{ background: NEON, color: "#070b10" }}>
          {number}
        </div>
        <h3 className="text-base font-black text-white">{title}</h3>
      </div>
      <div className="pl-[42px]">
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Step 1: Choose Campaign Type — premium grid
// ─────────────────────────────────────────────

const TYPE_ACCENT: Record<string, string> = {
  "quick-creator":    NEON,
  "content-boost":    NEON,
  "creator-showcase": NEON,
};

// Hex accent → rgb components for rgba() usage
const ACCENT_RGB: Record<string, string> = {
  [NEON]:    "183,255,27",
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
  type, selected, onSelect,
}: {
  type: CampaignType; selected: boolean; onSelect: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const accent = TYPE_ACCENT[type.slug] ?? NEON;
  const rgb    = ACCENT_RGB[accent] ?? "183,255,27";

  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-pressed={selected}
      className="group relative rounded-2xl cursor-pointer flex flex-col overflow-hidden text-left w-full min-h-[620px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B7FF18] focus-visible:ring-offset-2 focus-visible:ring-offset-[#070b10]"
      style={{
        background: selected ? "#172317" : "#111923",
        border: `1.5px solid ${selected ? accent : hovered ? `rgba(${rgb},0.42)` : "rgba(255,255,255,0.12)"}`,
        boxShadow: selected
          ? `0 0 0 1px rgba(${rgb},0.16), 0 10px 28px rgba(${rgb},0.10)`
          : hovered ? "0 8px 24px rgba(0,0,0,0.28)" : "0 4px 14px rgba(0,0,0,0.16)",
        transition: "border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease",
      }}>

      {/* Illustration zone */}
      <div className="relative">
        <CampaignIllustration slug={type.slug} accent={accent} selected={selected} hovered={hovered} height="132px" />

        {/* Selection indicator */}
        <div className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center transition-colors duration-200"
          style={{
            background: selected ? accent : "#18232d",
            border: `1.5px solid ${selected ? accent : "rgba(255,255,255,0.24)"}`,
          }}>
          {selected
            ? <Check className="w-4 h-4" style={{ color: "#070b10" }} strokeWidth={3} />
            : <div className="w-2 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.40)" }} />
          }
        </div>

        {/* Recommended badge */}
        {type.recommended && (
          <div className="absolute top-3 left-3 text-[9px] font-black px-2.5 py-1 rounded-full"
            style={{ background: NEON, color: "#070b10" }}>
            Recommended
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="flex-1 flex flex-col px-5 pt-4 pb-5 gap-4">
        <div className="min-h-[68px]">
          <h3 className="text-base font-black text-white leading-tight">{type.shortName}</h3>
          {type.recommended && (
            <div className="text-[10px] font-bold mt-1" style={{ color: accent }}>Best for getting started</div>
          )}
          <p className="text-[11px] mt-1.5 leading-relaxed" style={{ color: "rgba(255,255,255,0.62)" }}>
            {type.shortDesc}
          </p>
        </div>

        {/* Comparable details stay aligned in every card */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { Icon: Clock, label: "Duration", value: `${type.duration} days` },
            { Icon: ClipboardList, label: "Deliverables", value: `${type.deliverables || "Custom"}` },
            { Icon: KeyRound, label: "Access", value: "Flexible" },
          ].map(({ Icon, label, value }) => (
            <div key={label} className="rounded-xl px-3 py-2.5" style={{ background: "#18232d", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider font-bold text-white/40">
                <Icon size={11} /> {label}
              </div>
              <div className="text-xs font-black text-white mt-1">{value}</div>
            </div>
          ))}
        </div>

        <div className="min-h-[112px]">
          <div className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: accent }}>Creator Objectives</div>
          <div className="flex flex-wrap gap-1.5">
            {type.pills.map(({ ct, qty }) => {
              const PIcon = REQ_ICON[ct] ?? Target;
              const label =
                ct === "clip"       ? `${qty} Gameplay Clip${qty > 1 ? "s" : ""}` :
                ct === "screenshot" ? `${qty} Screenshot${qty > 1 ? "s" : ""}` :
                ct === "reel"       ? `${qty} Vertical Reel${qty > 1 ? "s" : ""}` :
                ct === "stream"     ? "1 Livestream (30+ min)" :
                ct === "feedback"   ? "1 Creator Review" : `${qty} ${ct}`;
              return (
                <span key={ct} className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full"
                  style={{ background: selected ? `rgba(${rgb},0.12)` : "#1b2934", color: selected ? accent : "rgba(255,255,255,0.68)", border: `1px solid ${selected ? `rgba(${rgb},0.28)` : "rgba(255,255,255,0.10)"}` }}>
                  <PIcon size={9} /> {label}
                </span>
              );
            })}
          </div>
        </div>

        <div className="min-h-[82px]">
          <div className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: accent }}>Best for</div>
          <div className="flex flex-wrap gap-1.5">
            {type.bestForList.map(label => (
              <span key={label} className="text-[10px] px-2.5 py-1 rounded-full"
                style={{ background: "#1b2934", color: "rgba(255,255,255,0.68)", border: "1px solid rgba(255,255,255,0.10)" }}>
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-auto pt-3 text-[11px] font-bold" style={{ borderTop: "1px solid rgba(255,255,255,0.10)", color: selected ? accent : "rgba(255,255,255,0.48)" }}>
          <span className="block text-[9px] uppercase tracking-widest opacity-60">Bounty XP</span>
          <span className="block text-sm">{type.xpReward.toLocaleString()} XP</span>
        </div>
      </div>
    </button>
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

      {/* Artwork header */}
      <div className="relative w-full overflow-hidden shrink-0" style={{ height: "180px", borderRadius: "18px 18px 0 0" }}>
        <img
          src={`https://picsum.photos/seed/${seed}/400/380`}
          alt=""
          draggable={false}
          className="w-full h-full object-cover"
          style={{ display: "block" }}
        />
        <div className="absolute inset-0" style={{ background: "rgba(7,11,16,0.45)" }} />
        <div className="absolute inset-0" style={{ background: `linear-gradient(to top, rgba(${rgb},0.38) 0%, transparent 60%)` }} />
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
          {type.recommended && (
            <div className="inline-block text-[9px] font-bold px-2 py-0.5 rounded-full mb-2"
              style={{ background: "rgba(251,146,60,0.25)", color: "#fb923c", backdropFilter: "blur(6px)" }}>
              ★ Recommended
            </div>
          )}
          <h3 className="text-[16px] font-black leading-tight text-white drop-shadow-md">{type.shortName}</h3>
          <p className="text-[11px] mt-0.5 leading-snug font-semibold"
            style={{ color: `rgba(${rgb},0.9)`, textShadow: `0 0 10px rgba(${rgb},0.4)` }}>
            {type.subtitle}
          </p>
        </div>
      </div>

      {/* Card body */}
      <div className="flex-1 flex flex-col px-4 pt-4 gap-4">

        {/* Description */}
        <p className="text-[11px] leading-relaxed"
          style={{ color: isCenter ? "rgba(255,255,255,0.52)" : "rgba(255,255,255,0.24)" }}>
          {type.description}
        </p>

        {/* Campaign Details */}
        <div>
          <div className="text-[9px] font-bold uppercase tracking-widest mb-2.5"
            style={{ color: isCenter ? `rgba(${rgb},0.65)` : "rgba(255,255,255,0.22)" }}>
            Campaign Details
          </div>
          <div className="space-y-1.5">
            {[
              `${type.duration}-day campaign`,
              `${type.deliverables || "Custom"} deliverables per creator`,
              "Access requirements depend on your access method",
            ].map((label, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full shrink-0"
                  style={{ background: isCenter ? accent : "rgba(255,255,255,0.2)" }} />
                <span className="text-[11px]"
                  style={{ color: isCenter ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.28)" }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Creator Objectives */}
        <div>
          <div className="text-[9px] font-bold uppercase tracking-widest mb-2"
            style={{ color: isCenter ? `rgba(${rgb},0.65)` : "rgba(255,255,255,0.22)" }}>
            Creator Objectives
          </div>
          <div className="flex flex-wrap gap-1.5">
            {type.pills.map(({ ct, qty }) => {
              const label =
                ct === "clip"       ? `${qty} Gameplay Clip${qty > 1 ? "s" : ""}` :
                ct === "screenshot" ? `${qty} Screenshot${qty > 1 ? "s" : ""}` :
                ct === "reel"       ? `${qty} Vertical Reel${qty > 1 ? "s" : ""}` :
                ct === "stream"     ? "1 Livestream (30+ min)" :
                ct === "feedback"   ? "1 Creator Review" : `${qty} ${ct}`;
              return (
                <span key={ct}
                  className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full"
                  style={{
                    background: isCenter ? `rgba(${rgb},0.10)` : "rgba(255,255,255,0.04)",
                    color: isCenter ? accent : "rgba(255,255,255,0.30)",
                    border: `1px solid ${isCenter ? `rgba(${rgb},0.20)` : "rgba(255,255,255,0.06)"}`,
                  }}>
                  <Check style={{ width: "9px", height: "9px" }} />
                  {label}
                </span>
              );
            })}
          </div>
        </div>

        {/* Best For */}
        <div>
          <div className="text-[9px] font-bold uppercase tracking-widest mb-2"
            style={{ color: isCenter ? `rgba(${rgb},0.65)` : "rgba(255,255,255,0.22)" }}>
            Best For
          </div>
          <div className="flex flex-wrap gap-1.5">
            {type.bestForList.map(label => (
              <span key={label}
                className="text-[10px] px-2 py-0.5 rounded-full"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  color: isCenter ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.22)",
                  border: `1px solid rgba(255,255,255,${isCenter ? "0.09" : "0.05"})`,
                }}>
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="flex-1" />
      </div>

      {/* CTA button */}
      <div className="px-4 mt-4">
        <div className="w-full py-3.5 rounded-xl text-[13px] font-black text-center transition-all"
          style={{
            background: isCenter ? accent : "rgba(255,255,255,0.05)",
            color: isCenter ? "#070b10" : "rgba(255,255,255,0.35)",
            border: isCenter ? "none" : "1px solid rgba(255,255,255,0.08)",
            boxShadow: isCenter ? `0 0 24px 0 rgba(${rgb},0.30)` : "none",
          }}>
          {isCenter ? "Use Campaign →" : type.shortName}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
const CAMPAIGN_ARTWORK: Record<string, string> = {
  "quick-creator": "/attached_assets/generated_images/campaign-quick-creator.png",
  "content-boost": "/attached_assets/generated_images/campaign-content-boost.png",
  "creator-showcase": "/attached_assets/generated_images/campaign-creator-showcase.png",
  "custom-campaign": "/attached_assets/generated_images/campaign-creator-showcase.png",
};

function campaignKeySummary(type: CampaignType) {
  return "Key requirements depend on your chosen access method and campaign capacity.";
}

// Campaign type selection — full-width accessible accordion
// ─────────────────────────────────────────────

function CampaignAccordion({
  selectedType,
  onSelect,
  onContinue,
  onBack,
}: {
  selectedType: CampaignType | null;
  onSelect: (type: CampaignType) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  const [expandedSlug, setExpandedSlug] = useState<string | null>(
    () => CAMPAIGN_TYPES.find(type => type.recommended)?.slug ?? CAMPAIGN_TYPES[0].slug,
  );

  return (
    <div className="space-y-3" role="region" aria-label="Campaign types">
      {CAMPAIGN_TYPES.map(type => {
        const expanded = expandedSlug === type.slug;
        const selected = selectedType?.slug === type.slug;
        const accent = TYPE_ACCENT[type.slug] ?? NEON;
        const rgb = ACCENT_RGB[accent] ?? "183,255,24";
        const panelId = `campaign-panel-${type.slug}`;
        const rowId = `campaign-row-${type.slug}`;

        return (
          <section
            key={type.slug}
            className="gf-accordion-motion overflow-hidden rounded-2xl transition-[border-color,box-shadow,background-color] duration-200"
            style={{
              border: `1.5px solid ${selected ? NEON : expanded ? `rgba(${rgb},0.34)` : "rgba(255,255,255,0.12)"}`,
              background: selected ? "#111d17" : "#111923",
              boxShadow: selected ? "0 0 20px rgba(183,255,24,0.08)" : "none",
            }}>
            <button
              id={rowId}
              type="button"
              aria-expanded={expanded}
              aria-controls={panelId}
              onClick={() => setExpandedSlug(expanded ? null : type.slug)}
              className="w-full min-h-[88px] px-4 sm:px-5 py-4 flex items-center gap-3 sm:gap-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#B7FF18]"
              style={{ background: expanded ? "#17212b" : "transparent" }}>
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `rgba(${rgb},0.12)`, color: accent }}>
                <type.icon size={26} aria-hidden="true" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {selected && <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: NEON }} aria-label="Selected" />}
                  <h3 className="text-lg sm:text-xl font-black text-white truncate">{type.shortName}</h3>
                  {type.recommended && (
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-full shrink-0"
                      style={{ background: NEON, color: "#070b10" }}>
                      Recommended
                    </span>
                  )}
                </div>
                <p className="text-sm sm:text-[15px] text-white/70 mt-1.5 truncate">{type.tagline}</p>
              </div>

              <div className="order-3 sm:order-none basis-full sm:basis-auto flex items-center justify-center gap-5 sm:gap-7 shrink-0 self-center">
                <span className="min-w-[90px] sm:min-w-[100px] flex flex-col items-center justify-center text-center whitespace-nowrap">
                  <strong className="block text-[23px] sm:text-[27px] leading-[1.1] font-bold text-white">{type.duration}d</strong>
                  <span className="block mt-1.5 text-[11px] sm:text-xs leading-[1.2] font-bold uppercase tracking-[0.05em] text-white/85">DURATION</span>
                </span>
                <span className="min-w-[90px] sm:min-w-[100px] flex flex-col items-center justify-center text-center whitespace-nowrap">
                   <strong className="block text-[23px] sm:text-[27px] leading-[1.1] font-bold text-white">{type.deliverables || "Custom"}</strong>
                   <span className="block mt-1.5 text-[11px] sm:text-xs leading-[1.2] font-bold uppercase tracking-[0.05em] text-white/85">DELIVERABLES</span>
                </span>
                <span className="min-w-[120px] sm:min-w-[132px] flex flex-col items-center justify-center text-center whitespace-nowrap">
                  <strong className="block text-[23px] sm:text-[27px] leading-[1.1] font-bold" style={{ color: "#B9FF1A" }}>{type.xpReward.toLocaleString()}</strong>
                  <span className="block mt-1.5 text-[11px] sm:text-xs leading-[1.2] font-bold uppercase tracking-[0.05em] text-[#B9FF1A]">BOUNTY XP</span>
                </span>
              </div>

              <ChevronDown
                className="order-2 sm:order-none w-5 h-5 shrink-0 text-white/45 transition-transform duration-200"
                style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
                aria-hidden="true" />
            </button>

            <div
              id={panelId}
              role="region"
              aria-labelledby={rowId}
              aria-hidden={!expanded}
              className="grid transition-[grid-template-rows] duration-200 ease-out"
              style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}>
              <div className="min-h-0 overflow-hidden">
                <div
                  className="relative min-h-0 px-4 py-7 sm:px-7 sm:py-8 flex items-center lg:min-h-[460px] xl:min-h-[500px]"
                  style={{
                    backgroundImage: `linear-gradient(90deg, rgba(7,11,16,0.95) 0%, rgba(7,11,16,0.88) 30%, rgba(7,11,16,0.74) 55%, rgba(7,11,16,0.24) 100%), url("${CAMPAIGN_ARTWORK[type.slug]}")`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}>
                  <div className="relative z-10 flex w-full flex-col justify-center gap-7 lg:w-[55%] lg:max-w-[55%]">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] font-bold mb-3" style={{ color: accent }}>CAMPAIGN OVERVIEW</p>
                      <p className="text-[17px] leading-[1.55] font-normal text-white/90 max-w-[680px]">{type.description}</p>
                    </div>

                    <div className="min-h-[76px] rounded-xl px-4 py-4 flex items-center gap-3"
                      style={{ background: "#0b141d", border: "1px solid rgba(255,255,255,0.14)" }}>
                      <KeyRound size={22} className="shrink-0" style={{ color: accent }} aria-hidden="true" />
                      <div className="min-w-0">
                         <div className="text-xs uppercase tracking-[0.08em] font-bold text-white/75">ACCESS MODEL</div>
                         <div className="text-sm sm:text-base font-bold text-white mt-1 leading-snug">{campaignKeySummary(type)}</div>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs uppercase tracking-[0.16em] font-bold mb-3" style={{ color: accent }}>CREATOR OBJECTIVES</div>
                      <div className="flex flex-wrap gap-2">
                        {type.pills.map(({ ct, qty }) => {
                          const PIcon = REQ_ICON[ct] ?? Target;
                          return (
                            <span key={ct} className="inline-flex items-center gap-2 min-h-[38px] text-sm font-semibold px-4 py-2 rounded-lg"
                              style={{ background: `rgba(${rgb},0.12)`, color: "#f5f7fa", border: `1px solid rgba(${rgb},0.30)` }}>
                              <PIcon size={15} aria-hidden="true" /> {reqPillLabel(ct, qty)}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs uppercase tracking-[0.16em] font-bold mb-3" style={{ color: accent }}>BEST FOR</div>
                      <div className="flex flex-wrap gap-2">
                        {type.bestForList.map(label => (
                          <span key={label} className="min-h-[36px] inline-flex items-center text-[13px] font-medium px-4 py-2 rounded-lg text-white/85"
                            style={{ background: "rgba(11,20,29,0.82)", border: "1px solid rgba(255,255,255,0.12)" }}>
                            {label}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-1 sm:pt-2">
                      <button
                        type="button"
                        tabIndex={expanded ? 0 : -1}
                        aria-pressed={selected}
                        onClick={() => onSelect(type)}
                        className="w-full sm:w-auto min-w-[190px] px-5 py-3 rounded-xl text-sm font-black transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B7FF18] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b141d]"
                        style={{
                          background: selected ? "#263a25" : NEON,
                          color: selected ? NEON : "#070b10",
                          border: selected ? `1px solid ${NEON}` : "1px solid transparent",
                        }}>
                        {selected ? "Selected" : `Select ${type.shortName}`}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        );
      })}

      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-4">
        <button
          type="button"
          onClick={onBack}
          className="w-full sm:w-auto px-5 py-3 rounded-xl text-sm font-bold transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B7FF18]"
          style={{ color: "rgba(255,255,255,0.62)", border: "1px solid rgba(255,255,255,0.14)", background: "#111923" }}>
          Back
        </button>
        <button
          type="button"
          onClick={onContinue}
          disabled={!selectedType}
          className="w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all hover:brightness-110 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B7FF18]"
          style={{
            background: selectedType ? NEON : "#263039",
            color: selectedType ? "#070b10" : "rgba(255,255,255,0.78)",
            border: selectedType ? "1px solid transparent" : "1px solid rgba(255,255,255,0.16)",
          }}>
          {selectedType ? `Continue with ${selectedType.shortName} →` : "Select a campaign to continue"}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Step 2: Personalise
// ─────────────────────────────────────────────

function CustomObjectiveBuilder({ objectives, onChange }: { objectives: CustomObjective[]; onChange: (objectives: CustomObjective[]) => void }) {
  const update = (type: CustomObjective["type"], quantity: number) =>
    onChange(objectives.map(o => o.type === type ? { ...o, quantity } : o));
  const total = objectives.reduce((sum, objective) => sum + objective.quantity, 0);
  return (
    <div className="rounded-2xl p-4 sm:p-5 space-y-3" style={{ background: "#111923", border: "1px solid rgba(185,255,26,0.18)" }}>
      <div>
        <div className="text-xs font-black text-white">Custom objectives</div>
        <p className="text-[11px] text-white/50 mt-1">Choose supported objectives and sensible quantities. XP and the recommended deadline are calculated automatically.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {objectives.map(objective => (
          <div key={objective.type} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5" style={{ background: "rgba(255,255,255,0.04)" }}>
            <span className="text-xs font-bold text-white/80">{OBJECTIVE_LABELS[objective.type]}</span>
            <select aria-label={`${OBJECTIVE_LABELS[objective.type]} quantity`} value={objective.quantity}
              onChange={e => update(objective.type, Number(e.target.value))}
              style={{ ...fieldStyle, width: "76px", padding: "7px 8px" } as any}>
              {Array.from({ length: objective.type === "stream" ? 3 : objective.type === "review" || objective.type === "feedback" ? 2 : 6 }, (_, i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-3 text-[11px] font-bold" style={{ color: NEON }}>
        <span>{total} deliverables per creator</span>
        <span>Calculated XP: {calculatedCustomXp(objectives).toLocaleString()}</span>
        <span>Recommended deadline: {recommendedCustomDeadline(objectives)} days</span>
      </div>
      {objectives.some(o => o.type === "stream" && o.quantity > 0) && (
        <p className="text-[11px] text-amber-300">Livestream objectives require supported streaming platforms and a connected streaming account.</p>
      )}
    </div>
  );
}

function AccessMethodSelector({ settings, onChange }: { settings: CampaignSettings; onChange: (s: Partial<CampaignSettings>) => void }) {
  const method = ACCESS_METHODS.find(item => item.id === settings.accessMethod) ?? ACCESS_METHODS[0];
  return (
    <div className="space-y-3">
      <div>
        <label className="text-[11px] font-bold text-white/75 uppercase tracking-[0.08em] block">How will creators access your game?</label>
        <p className="text-[11px] text-white/50 mt-1">Campaign access and completion rewards are separate.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {ACCESS_METHODS.map(option => {
          const selected = option.id === settings.accessMethod;
          const Icon = option.Icon;
          return (
            <button key={option.id} type="button" aria-pressed={selected} onClick={() => onChange({
              accessMethod: option.id,
              completionFullGameKey: ["demo_to_full", "public_demo", "private_playtest"].includes(option.id),
            })}
              className="text-left rounded-xl p-3.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B9FF1A]"
              style={{ background: selected ? "#182817" : "#111923", border: `1.5px solid ${selected ? NEON : "rgba(255,255,255,0.12)"}` }}>
              <div className="flex items-start gap-3">
                <Icon size={17} style={{ color: selected ? NEON : "rgba(255,255,255,0.55)" }} />
                <div><div className="text-xs font-black text-white">{option.title}</div><div className="text-[11px] leading-relaxed text-white/50 mt-1">{option.description}</div></div>
              </div>
            </button>
          );
        })}
      </div>
      {["public_demo", "private_playtest"].includes(settings.accessMethod) && (
        <label className="flex items-center gap-2 text-xs text-white/70">
          <input type="checkbox" checked={settings.completionFullGameKey} onChange={e => onChange({ completionFullGameKey: e.target.checked })} />
          Full-game key unlocked after completion
        </label>
      )}
      {settings.accessMethod === "custom_access" && (
        <div className="space-y-2">
          <textarea value={settings.customAccessInstructions} onChange={e => onChange({ customAccessInstructions: e.target.value })}
            placeholder="Describe how creators access your game…" rows={3} style={{ ...fieldStyle, resize: "vertical" } as any} />
          <label className="flex items-center gap-2 text-xs text-white/70">
            <input type="checkbox" checked={settings.customAccessNeedsKey} onChange={e => onChange({ customAccessNeedsKey: e.target.checked })} />
            A key or access code is required
          </label>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl p-3.5" style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div><div className="text-[10px] uppercase font-bold tracking-wider text-white/45">Campaign access</div><div className="text-xs font-bold text-white mt-1">{method.id === "free_to_play" || method.id === "public_demo" || (method.id === "custom_access" && !settings.customAccessNeedsKey) ? "No access key required" : method.title}</div></div>
        <div><div className="text-[10px] uppercase font-bold tracking-wider text-white/45">Completion reward</div><div className="text-xs font-bold text-white mt-1">{settings.completionFullGameKey ? "Bounty XP + full-game key" : "Bounty XP"}</div></div>
      </div>
      {settings.completionFullGameKey && <p className="text-[11px] text-white/55">Full-game keys are released only after every campaign objective has been completed and validated.</p>}
    </div>
  );
}

function StepPersonalise({ type, settings, onChange }: {
  type: CampaignType; settings: CampaignSettings; onChange: (s: Partial<CampaignSettings>) => void;
}) {
  const { data: indieProfile } = useQuery<any>({
    queryKey: ["/api/indie/profile"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  const autoTitleRef = useRef("");

  useEffect(() => {
    const profile = indieProfile?.profile ?? {};
    const profileGameName = profile.gameName ?? "";
    const nextGameName = settings.gameName || profileGameName || "Your Game";
    const nextTitle = `${nextGameName} ${type.shortName} Campaign`;
    const patch: Partial<CampaignSettings> = {};

    if (profileGameName && !settings.gameName) {
      patch.gameName = profileGameName;
      patch.gameId = profile.gameId ?? null;
      patch.gameImageUrl = profile.headerImageUrl ?? null;
    }
    if (!settings.campaignTitle || settings.campaignTitle === autoTitleRef.current) {
      patch.campaignTitle = nextTitle;
      autoTitleRef.current = nextTitle;
    }
    if (Object.keys(patch).length > 0) {
      onChange(patch);
    }
  }, [indieProfile, settings.gameName, settings.campaignTitle, type.shortName]);

  const accent      = TYPE_ACCENT[type.slug] ?? NEON;
  const rgb         = ACCENT_RGB[accent] ?? "183,255,27";
  const profile     = indieProfile?.profile ?? {};
  const gameName    = settings.gameName || profile.gameName || "Your Game";
  const gameImage   = settings.gameImageUrl || profile.headerImageUrl || null;
  const studioName  = profile.studioName || profile.developerName || "Independent developer";
  const profilePlatforms = Array.isArray(profile.platforms) ? profile.platforms : [];
  const labelStyle  = "text-[11px] font-bold text-white/75 uppercase tracking-[0.08em] block mb-2";
  const helperStyle = "text-[11px] leading-relaxed text-white/55 mt-1.5";
  const tomorrow    = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];
  const timeZoneOptions = Array.from(new Set([
    settings.timeZone || "UTC",
    "UTC",
    "Europe/London",
    "America/New_York",
    "America/Los_Angeles",
    "Asia/Tokyo",
  ]));
  const regionLabel = REGION_OPTIONS.find(r => r.id === settings.regions)?.label ?? settings.regions;
  const platformLabels = settings.platforms.length > 0
    ? PLATFORM_OPTIONS.filter(p => settings.platforms.includes(p.id)).map(p => p.label)
    : ["All platforms"];

  return (
    <div className="gf-fade-up -mx-1 rounded-2xl px-1 py-1" style={{ background: "#0F101B" }}>
      <div className="mx-auto max-w-[1200px] grid grid-cols-1 lg:grid-cols-[minmax(0,1.8fr)_minmax(280px,1fr)] gap-8 items-start">
        <div className="space-y-8">
          <div>
            <p className="text-sm leading-relaxed text-white/60 max-w-2xl">
              Tell creators about your game and choose when and where your campaign will be available.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="campaign-title" className={labelStyle}>Campaign Title <span style={{ color: NEON }}>*</span></label>
              <input
                id="campaign-title"
                required
                maxLength={120}
                style={fieldStyle}
                value={settings.campaignTitle}
                onChange={e => onChange({ campaignTitle: e.target.value })}
                placeholder={`${gameName} ${type.shortName} Campaign`} />
              <p className={helperStyle}>This is the title creators will see in the Bounty Hub.</p>
            </div>

            <div>
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="campaign-brief" className={labelStyle}>Campaign Brief <span style={{ color: NEON }}>*</span></label>
                <span className="text-[11px] text-white/55 tabular-nums">{settings.description.length} / 300</span>
              </div>
              <textarea
                id="campaign-brief"
                required
                maxLength={300}
                style={{ ...fieldStyle, minHeight: "132px", resize: "vertical" } as any}
                value={settings.description}
                onChange={e => onChange({ description: e.target.value })}
                placeholder="What makes your game worth playing, and what would you like creators to focus on?" />
              <p className={helperStyle}>Give creators a clear introduction to your game and the experience you want them to capture.</p>
            </div>
          </div>

          <div className="pt-1">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <label className={labelStyle}>Selected Game</label>
                <p className="text-[11px] text-white/50">The game associated with this campaign.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl px-3.5 py-3"
              style={{ background: "#111923", border: "1px solid rgba(255,255,255,0.12)" }}>
              {gameImage ? (
                <img src={gameImage} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `rgba(${rgb},0.12)` }}>
                  <Gamepad2 className="w-6 h-6" style={{ color: accent }} />
                </div>
              )}
              <div className="min-w-0">
                <div className="text-sm font-black text-white truncate">{gameName}</div>
                <div className="text-[11px] text-white/60 mt-1 truncate">{studioName}</div>
                {profilePlatforms.length > 0 && (
                  <div className="text-[10px] text-white/45 mt-1 truncate">
                    {profilePlatforms.join(" · ")}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className={labelStyle}>Launch Timing</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {([
                { value: "asap" as const, title: "Launch Immediately", description: "Start the campaign as soon as it has been approved.", Icon: Rocket },
                { value: "scheduled" as const, title: "Schedule Launch", description: "Choose a future date and time for the campaign to begin.", Icon: Calendar },
              ]).map(opt => {
                const on = settings.startType === opt.value;
                const Icon = opt.Icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    aria-pressed={on}
                    onClick={() => onChange({ startType: opt.value })}
                    className="text-left rounded-xl p-3.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B9FF1A]"
                    style={{
                      background: on ? "#182817" : "#111923",
                      border: `1.5px solid ${on ? "#B9FF1A" : "rgba(255,255,255,0.12)"}`,
                    }}>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: on ? "rgba(185,255,26,0.16)" : "#1a2732", color: on ? "#B9FF1A" : "rgba(255,255,255,0.58)" }}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0"
                            style={{ borderColor: on ? "#B9FF1A" : "rgba(255,255,255,0.30)", background: on ? "#B9FF1A" : "transparent" }}>
                            {on && <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#070b10" }} />}
                          </span>
                          <span className="text-xs font-black" style={{ color: on ? "#fff" : "rgba(255,255,255,0.78)" }}>{opt.title}</span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-white/55 mt-2">{opt.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {settings.startType === "scheduled" && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                <div>
                  <label htmlFor="launch-date" className="text-[10px] font-bold uppercase tracking-wider text-white/65 block mb-1.5">Launch date</label>
                  <input id="launch-date" type="date" min={tomorrowStr}
                    style={{ ...fieldStyle, colorScheme: "dark" } as any}
                    value={settings.scheduledDate}
                    onChange={e => onChange({ scheduledDate: e.target.value })} />
                </div>
                <div>
                  <label htmlFor="launch-time" className="text-[10px] font-bold uppercase tracking-wider text-white/65 block mb-1.5">Launch time</label>
                  <input id="launch-time" type="time"
                    style={{ ...fieldStyle, colorScheme: "dark" } as any}
                    value={settings.scheduledTime}
                    onChange={e => onChange({ scheduledTime: e.target.value })} />
                </div>
                <div>
                  <label htmlFor="launch-timezone" className="text-[10px] font-bold uppercase tracking-wider text-white/65 block mb-1.5">Time zone</label>
                  <select id="launch-timezone" style={{ ...fieldStyle, paddingRight: "28px" } as any}
                    value={settings.timeZone}
                    onChange={e => onChange({ timeZone: e.target.value })}>
                    {timeZoneOptions.map(zone => <option key={zone} value={zone}>{zone}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <label className={labelStyle}>Supported Platforms</label>
                <p className="text-[11px] text-white/55">Select the platforms creators must use to take part.</p>
              </div>
              <div className="flex items-center gap-3 shrink-0 pt-0.5">
                <button type="button" onClick={() => onChange({ platforms: PLATFORM_OPTIONS.map(p => p.id) })}
                  className="text-[10px] font-bold hover:text-white transition-colors" style={{ color: NEON }}>Select all</button>
                <button type="button" onClick={() => onChange({ platforms: [] })}
                  className="text-[10px] font-bold text-white/55 hover:text-white transition-colors">Clear all</button>
              </div>
            </div>
            <p className="text-[10px] text-white/45 mt-2">Choose one or more platforms.</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {PLATFORM_OPTIONS.map(p => {
                const on = settings.platforms.includes(p.id);
                return (
                  <button key={p.id} type="button"
                    aria-pressed={on}
                    onClick={() => onChange({ platforms: on ? settings.platforms.filter(x => x !== p.id) : [...settings.platforms, p.id] })}
                    className="px-3.5 py-2 rounded-lg text-[11px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B9FF1A]"
                    style={{
                      background: on ? "#182817" : "#111923",
                      color: on ? "#F4FFD7" : "rgba(255,255,255,0.72)",
                      border: `1.5px solid ${on ? "#B9FF1A" : "rgba(255,255,255,0.14)"}`,
                    }}>
                    <span className="inline-flex items-center gap-1.5">
                      {on && <Check className="w-3 h-3" style={{ color: "#B9FF1A" }} />}
                      {p.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor="eligible-region" className={labelStyle}>Eligible Region</label>
            <p className="text-[11px] text-white/55 mb-2.5">Choose where creators must be based or where your game keys can be activated.</p>
            <select id="eligible-region" style={{ ...fieldStyle, paddingRight: "32px" } as any}
              value={settings.regions} onChange={e => onChange({ regions: e.target.value })}>
              {REGION_OPTIONS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </div>

          <div className="pt-2">
            <AccessMethodSelector settings={settings} onChange={onChange} />
          </div>

          <div>
            <label htmlFor="application-period" className={labelStyle}>Campaign Application Period</label>
            <p className="text-[11px] text-white/55 mb-2.5">How long new creators can join. Their individual completion deadline starts when access is accepted or revealed.</p>
            <select id="application-period" style={{ ...fieldStyle, paddingRight: "32px" } as any} value={settings.applicationPeriod}
              onChange={e => onChange({ applicationPeriod: Number(e.target.value) })}>
              {[7, 14, 30, 60].map(days => <option key={days} value={days}>{days} days</option>)}
              <option value={90}>Custom (up to 90 days)</option>
            </select>
          </div>

          {type.custom && (
            <div className="space-y-4 pt-5" style={{ borderTop: "1px solid rgba(255,255,255,0.10)" }}>
              <CustomObjectiveBuilder objectives={settings.customObjectives} onChange={customObjectives => onChange({ customObjectives })} />
              <div>
                <label className={labelStyle}>Recommended completion deadline (days)</label>
                <input type="number" min={1} max={90} style={fieldStyle}
                  value={settings.customDuration ?? type.duration}
                  onChange={e => onChange({ customDuration: Math.max(1, Math.min(90, Number(e.target.value))) })} />
                <p className={helperStyle}>Gamefolio calculates XP centrally from your selected objectives. Rewards are not arbitrary.</p>
              </div>
            </div>
          )}
          {type.custom && settings.customObjectives.some(o => o.type === "stream" && o.quantity > 0) && settings.platforms.length === 0 && (
            <p className="text-[11px] text-amber-300">Select a supported streaming platform before launching livestream objectives.</p>
          )}
          {!type.custom && (
            <div className="rounded-xl px-4 py-3" style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="text-[10px] font-bold uppercase tracking-wider text-white/50">Creator completion deadline</div>
              <div className="text-sm font-black text-white mt-1">{type.duration} days after access is claimed</div>
              {type.slug === "creator-showcase" && <p className="text-[11px] text-amber-300 mt-1">Creator Showcase requires livestream-capable creators with a connected streaming account.</p>}
            </div>
          )}
        </div>

        <aside className="lg:sticky lg:top-5 rounded-2xl overflow-hidden"
          style={{ background: "#111923", border: "1px solid rgba(255,255,255,0.14)" }}>
          <div className="p-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.10)" }}>
            <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-white/55">Campaign Summary</p>
            <p className="text-sm font-black text-white mt-2 leading-relaxed">{campaignSummary(type)}</p>
           <p className="text-[11px] text-white/55 mt-2">
             Each creator can earn up to <strong className="text-[#B9FF1A]">{(type.custom ? calculatedCustomXp(settings.customObjectives) : type.xpReward).toLocaleString()} Bounty XP</strong> by completing all required objectives.
           </p>
          </div>
          <div className="p-5 space-y-5">
            <div className="flex items-center gap-3">
              {gameImage ? (
                <img src={gameImage} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />
              ) : (
                <div className="w-16 h-16 rounded-xl flex items-center justify-center shrink-0" style={{ background: `rgba(${rgb},0.12)` }}>
                  <Gamepad2 className="w-7 h-7" style={{ color: accent }} />
                </div>
              )}
              <div className="min-w-0">
                <div className="text-[11px] text-white/55">Game</div>
                <div className="text-sm font-black text-white truncate mt-1">{gameName}</div>
                <div className="text-[11px] text-white/55 truncate mt-1">{studioName}</div>
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-wider font-bold text-white/50">Campaign</div>
              <div className="text-sm font-bold text-white mt-1 break-words">{settings.campaignTitle || `${gameName} ${type.shortName} Campaign`}</div>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.10)" }}>
              {[
                { label: "Duration", value: `${type.duration} days` },
                { label: "Deliverables", value: `${type.deliverables || "Custom"} per creator` },
                { label: "Access", value: "Selected in personalisation" },
                { label: "Bounty XP Reward", value: `${type.xpReward.toLocaleString()} XP`, accent: true },
              ].map(item => (
                <div key={item.label}>
                  <div className="text-[10px] uppercase tracking-wider font-bold text-white/50">{item.label}</div>
                  <div className="text-xs font-black mt-1 leading-snug" style={{ color: item.accent ? "#B9FF1A" : "#fff" }}>{item.value}</div>
                </div>
              ))}
            </div>

            <div className="space-y-3 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.10)" }}>
              <div>
                <div className="text-[10px] uppercase tracking-wider font-bold text-white/50">Launch timing</div>
                <div className="text-xs text-white/85 mt-1">
                  {settings.startType === "asap"
                    ? "Launch immediately after approval"
                    : `${settings.scheduledDate || "Date pending"} · ${settings.scheduledTime || "Time pending"} · ${settings.timeZone}`}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider font-bold text-white/50">Platforms</div>
                <div className="text-xs text-white/85 mt-1 leading-relaxed">{platformLabels.join(" · ")}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider font-bold text-white/50">Eligible region</div>
                <div className="text-xs text-white/85 mt-1">{regionLabel}</div>
              </div>
            </div>
          </div>
        </aside>
      </div>
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
  label, accent, accentRgb, description, keys, needed, vaultAvail, useVault, onUseVaultChange, onChange,
}: {
  label: string; accent: string; accentRgb: string; description: string;
  keys: string; needed: number; vaultAvail: number; useVault: boolean;
  onUseVaultChange: (v: boolean) => void; onChange: (v: string) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [justLoaded, setJustLoaded] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const pasted          = parseKeyLines(keys).length;
  const effectiveVault  = useVault ? vaultAvail : 0;
  const total           = effectiveVault + pasted;
  const met             = total >= needed && needed > 0;
  const pct             = needed > 0 ? Math.min(100, Math.round((total / needed) * 100)) : (total > 0 ? 100 : 0);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string ?? "";
      const isCSV = file.name.endsWith(".csv") || text.includes(",");
      const extracted = isCSV ? parseCSVKeys(text) : parseKeyLines(text);
      onChange(extracted.join("\n"));
      setJustLoaded(true);
      setTimeout(() => setJustLoaded(false), 2000);
    };
    reader.readAsText(file);
  }, [onChange]);

  return (
    <div className="space-y-3">

      {/* Vault banner — shown whenever vault has keys */}
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
          {/* Toggle switch */}
          <button
            onClick={() => onUseVaultChange(!useVault)}
            className="shrink-0 rounded-full flex items-center transition-all duration-200"
            style={{
              width: "40px", height: "22px", padding: "2px",
              background: useVault ? accent : "rgba(255,255,255,0.14)",
            }}>
            <div className="rounded-full bg-white shadow-sm transition-all duration-200"
              style={{ width: "18px", height: "18px", transform: useVault ? "translateX(18px)" : "translateX(0)" }} />
          </button>
        </div>
      )}

      {/* Label + count */}
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

      {/* Progress bar */}
      {needed > 0 && (
        <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: met ? NEON : accent }} />
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
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
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />

      {/* Paste toggle */}
      <button
        onClick={() => setPasteOpen(v => !v)}
        className="flex items-center gap-1.5 text-[11px] text-white/30 hover:text-white/55 transition-colors">
        <ClipboardList className="w-3.5 h-3.5" />
        Paste keys manually
        {pasteOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>

      {pasteOpen && (
        <textarea
          value={keys}
          onChange={e => onChange(e.target.value)}
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
  onDemoChange, onFullChange, accessMethod, completionFullGameKey, maxPlaces, onMaxPlacesChange }: {
  type: CampaignType;
  demoKeys: string; fullKeys: string; vaultDemo: number; vaultFull: number;
  useVaultDemo: boolean; useVaultFull: boolean;
  onUseVaultDemoChange: (v: boolean) => void; onUseVaultFullChange: (v: boolean) => void;
  onDemoChange: (v: string) => void; onFullChange: (v: string) => void;
  accessMethod: AccessMethod; completionFullGameKey: boolean; maxPlaces: number; onMaxPlacesChange: (v: number) => void;
}) {
  const effectiveDemo = (useVaultDemo ? vaultDemo : 0) + parseKeyLines(demoKeys).length;
  const effectiveFull = (useVaultFull ? vaultFull : 0) + parseKeyLines(fullKeys).length;
  const needsDemo = accessMethod === "demo_to_full" || accessMethod === "private_playtest";
  const needsAccessFull = accessMethod === "full_game_upfront";
  const needsRewardFull = completionFullGameKey && ["demo_to_full", "public_demo", "private_playtest"].includes(accessMethod);
  const needsCustomKey = accessMethod === "custom_access" && customAccessNeedsKey;
  const allReady = (!(needsDemo || needsCustomKey) || effectiveDemo > 0) && (!needsAccessFull || effectiveFull > 0) && (!needsRewardFull || effectiveFull > 0);
  const capacity = needsDemo && needsRewardFull ? Math.min(effectiveDemo, effectiveFull)
    : needsAccessFull ? effectiveFull
    : needsDemo ? effectiveDemo
    : needsRewardFull ? effectiveFull : needsCustomKey ? effectiveDemo : maxPlaces;
  const showFull = needsAccessFull || needsRewardFull;

  return (
    <div className="space-y-6 gf-fade-up">

      {/* Minimal lock note */}
      <p className="text-[11px] text-white/35 flex items-center gap-1.5">
        <Lock className="w-3 h-3 text-orange-400/70 shrink-0" />
        Keys lock when the campaign goes live — they cannot be withdrawn once creators join.
      </p>

      {/* Separate pools are shown only when relevant to the selected access model. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
        {(needsDemo || needsCustomKey) && <KeyUploadArea
          label={accessMethod === "private_playtest" ? "Demo or Playtest Access Keys" : "Demo or Playtest Access Keys"} accent="#60a5fa" accentRgb="96,165,250"
          description="Released when eligible creators join."
          keys={demoKeys} needed={1} vaultAvail={vaultDemo}
          useVault={useVaultDemo} onUseVaultChange={onUseVaultDemoChange}
          onChange={onDemoChange} />}
        {showFull && <KeyUploadArea
          label={needsAccessFull ? "Full-Game Access Keys" : "Full-Game Completion Reward Keys"} accent="#fb923c" accentRgb="251,146,60"
          description={needsAccessFull ? "Creators receive the full game when they join." : "Released only after every objective is completed and validated."}
          keys={fullKeys} needed={1} vaultAvail={vaultFull}
          useVault={useVaultFull} onUseVaultChange={onUseVaultFullChange}
          onChange={onFullChange} />}
      </div>
      {!needsDemo && !needsAccessFull && !needsRewardFull && !needsCustomKey && (
        <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <label className="text-xs font-black text-white block">How many campaign places would you like to make available?</label>
          <select value={maxPlaces} onChange={e => onMaxPlacesChange(Number(e.target.value))} style={{ ...fieldStyle, marginTop: "10px" } as any}>
            <option value={3}>3</option><option value={5}>5</option><option value={10}>10</option><option value={25}>Custom (25)</option>
          </select>
        </div>
      )}
      <div className="rounded-xl p-4" style={{ background: "rgba(185,255,26,0.05)", border: "1px solid rgba(185,255,26,0.16)" }}>
        <div className="text-[10px] uppercase tracking-wider font-bold" style={{ color: NEON }}>Campaign capacity: {Math.max(0, capacity)} places</div>
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
          {capacity > 0 ? <><div className="text-xs text-white/75 mt-2">Expected participation: approximately {Math.max(1, Math.floor(capacity * 0.6))}–{Math.max(1, capacity)} creators</div><div className="text-xs text-white/75 mt-1">Expected completions: approximately {Math.max(1, Math.floor(capacity * 0.4))}–{Math.max(1, Math.floor(capacity * 0.8))} creators</div></> : <div className="text-xs text-white/55 mt-2">Participation estimate unavailable. Starting with a small campaign is recommended.</div>}
          <p className="text-[10px] text-white/40 mt-2">Estimates are based on eligible active creators, selected platforms and previous campaign performance. Results are not guaranteed.</p>
        </div>
      </div>

      {/* All ready */}
      {allReady && (
        <div className="flex items-center gap-2 text-sm font-bold gf-scale-in" style={{ color: NEON }}>
          <CheckCircle2 className="w-4 h-4" />
          Access and completion reward pools are ready
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Step 4: Launch
// ─────────────────────────────────────────────

function StepLaunch({ type, settings, capacity, confirmed, onConfirm, submitting, onLaunch, commercialBudgetPence }: {
  type: CampaignType; settings: CampaignSettings; confirmed: boolean;
  capacity: number;
  commercialBudgetPence: number | null;
  onConfirm: (v: boolean) => void; submitting: boolean; onLaunch: () => void;
}) {
  const duration = type.custom && settings.customDuration ? settings.customDuration : type.duration;
  const bountyXp = type.custom ? calculatedCustomXp(settings.customObjectives) : type.xpReward;
  const requiresDemo = settings.accessMethod === "demo_to_full" || settings.accessMethod === "private_playtest"
    || (settings.accessMethod === "custom_access" && settings.customAccessNeedsKey);
  const regionLabel = REGION_OPTIONS.find(r => r.id === settings.regions)?.label ?? "Worldwide";
  const accent = TYPE_ACCENT[type.slug] ?? NEON;
  const rgb    = ACCENT_RGB[accent] ?? "183,255,27";

  return (
    <div className="space-y-5 gf-fade-up">
      <div className="rounded-xl p-4" style={{ background: commercialBudgetPence == null ? "rgba(183,255,24,0.05)" : "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
        <div className="text-[10px] uppercase tracking-wider font-bold text-white/45">{commercialBudgetPence == null ? "Included with Pro" : "Campaign cost"}</div>
        <div className="mt-1 text-lg font-black text-white">{commercialBudgetPence == null ? "Monthly Quick Creator benefit" : `£${(commercialBudgetPence / 100).toFixed(0)}`}</div>
        {commercialBudgetPence != null && <p className="mt-1 text-[11px] text-white/50">This campaign will be submitted for review. Payment is not collected by this launch step.</p>}
      </div>

      {/* Campaign summary */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
        {/* Game identity row */}
        <div className="flex items-center gap-4 px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
            style={{ background: `rgba(${rgb},0.08)`, border: `1px solid rgba(${rgb},0.15)` }}>
            {settings.gameImageUrl ? (
              <img src={settings.gameImageUrl} alt={settings.gameName} className="w-full h-full object-cover" />
            ) : (
              <Gamepad2 className="w-6 h-6" style={{ color: accent }} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            {settings.gameName && <div className="text-[11px] text-white/40 truncate">{settings.gameName}</div>}
            <div className="text-base font-black text-white leading-tight">{type.name}</div>
            <div className="flex items-center gap-1 mt-0.5">
              <ShieldCheck className="w-3 h-3" style={{ color: NEON }} />
              <span className="text-[10px] font-bold" style={{ color: NEON }}>GF Verified Campaign</span>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3">
          {[
            { label: "Duration",  value: `${duration}d` },
            { label: "Deliverables", value: type.deliverables || "Custom" },
            { label: "Bounty XP", value: `${bountyXp.toLocaleString()} XP` },
          ].map((s, i) => (
            <div key={s.label} className="flex flex-col items-center py-3.5"
              style={{ borderRight: i < 3 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
              <div className="text-base font-black text-white">{s.value}</div>
              <div className="text-[9px] text-white/25 uppercase tracking-wider mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Details row */}
        <div className="flex items-center flex-wrap gap-3 px-5 py-2.5 text-[10px] text-white/30"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <span>{settings.startType === "asap" ? "🚀 Launches immediately" : `📅 Launches ${settings.scheduledDate}`}</span>
          <span>· {regionLabel}</span>
          {settings.platforms.length > 0 && <span>· {settings.platforms.join(", ")}</span>}
           <span>· Application period: {settings.applicationPeriod}d</span>
           <span>· Capacity: {capacity} places</span>
        </div>
      </div>

       <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
         <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.08)" }}>
           <div className="text-[10px] uppercase tracking-wider font-bold text-white/45">Campaign access</div>
           <div className="text-sm font-bold text-white mt-1">{ACCESS_METHODS.find(m => m.id === settings.accessMethod)?.title}</div>
           <div className="text-[11px] text-white/50 mt-1">{requiresDemo ? "Access keys released when eligible creators join." : "No access key required unless configured."}</div>
         </div>
         <div className="rounded-xl p-4" style={{ background: "rgba(185,255,26,0.05)", border: "1px solid rgba(185,255,26,0.16)" }}>
           <div className="text-[10px] uppercase tracking-wider font-bold" style={{ color: NEON }}>Completion reward</div>
           <div className="text-sm font-bold text-white mt-1">Up to {bountyXp.toLocaleString()} Bounty XP</div>
           {settings.completionFullGameKey && <div className="text-[11px] text-white/60 mt-1">Full-game key unlocked after completion</div>}
         </div>
       </div>
       <p className="text-[11px] text-white/50">Estimates are based on eligible active creators, selected platforms and previous campaign performance. Results are not guaranteed.</p>

       {/* Confirmation checkbox */}
       <button type="button" role="checkbox" aria-checked={confirmed} onClick={() => onConfirm(!confirmed)}
        className="w-full flex items-start gap-3 text-left p-4 rounded-2xl transition-all"
        style={{
          background: confirmed ? "rgba(183,255,24,0.05)" : "rgba(255,255,255,0.02)",
          border: `1px solid ${confirmed ? "rgba(183,255,24,0.25)" : "rgba(255,255,255,0.08)"}`,
        }}>
        <div className="w-5 h-5 rounded-md border-2 shrink-0 flex items-center justify-center mt-0.5 transition-all"
          style={{ borderColor: confirmed ? NEON : "rgba(255,255,255,0.2)", background: confirmed ? NEON : "transparent" }}>
          {confirmed && <Check className="w-3 h-3" style={{ color: "#070b10" }} />}
        </div>
        <span className="text-sm text-white/60 leading-snug">
           I understand that creator participation and content-output figures are estimates and are not guaranteed.
        </span>
      </button>

      {/* Launch button */}
      <button onClick={onLaunch} disabled={!confirmed || submitting}
        className="w-full py-4 rounded-2xl text-sm font-black transition-all flex items-center justify-center gap-2.5 disabled:opacity-40"
        style={{ background: confirmed && !submitting ? NEON : "rgba(183,255,24,0.25)", color: "#070b10",
          boxShadow: confirmed && !submitting ? "0 4px 24px rgba(183,255,24,0.28)" : "none",
        }}>
        {submitting ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Launching Campaign…</>
        ) : (
          <><Rocket className="w-4 h-4" /> {commercialBudgetPence == null ? "Launch Campaign" : "Submit Paid Campaign for Review"}</>
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
    <div className="space-y-5 gf-fade-up">
      <p className="text-sm text-white/50 leading-relaxed">
        Upload your game keys once. Gamefolio selects the right campaign template, manages creator onboarding, distributes keys automatically, and starts the next campaign when one ends — all within limits you control.
      </p>

      {/* Process steps — clean vertical list */}
      <div className="space-y-0">
        {AUTO_PROCESS.map((step, i) => {
          const Icon = step.icon;
          return (
            <div key={i} className="flex items-center gap-3 py-2.5"
              style={{ borderBottom: i < AUTO_PROCESS.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
              <div className="w-6 h-6 rounded-lg shrink-0 flex items-center justify-center"
                style={{ background: "rgba(167,139,250,0.10)" }}>
                <Icon className="w-3.5 h-3.5" style={{ color: "#a78bfa" }} />
              </div>
              <span className="text-[12px] text-white/60 font-medium">{step.label}</span>
            </div>
          );
        })}
      </div>

      {/* Safeguard note */}
      <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl"
        style={{ background: "rgba(167,139,250,0.05)", border: "1px solid rgba(167,139,250,0.12)" }}>
        <ShieldCheck className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
        <p className="text-[11px] text-purple-300/60">
          Uses only <strong className="text-purple-300/90">Quick Creator</strong>, <strong className="text-purple-300/90">Content Boost</strong>, and <strong className="text-purple-300/90">Creator Showcase</strong> templates — no custom campaigns run automatically.
        </p>
      </div>
    </div>
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
    <div className="space-y-5 gf-fade-up">

      {/* Existing pool counter — only when pool already has keys */}
      {(poolDemo > 0 || poolFull > 0) && (
        <div className="flex items-center gap-4 px-4 py-3 rounded-xl"
          style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
          {[
            { label: "Demo Keys in Pool", value: poolDemo, color: "#60a5fa" },
            { label: "Full Keys in Pool", value: poolFull, color: "#fb923c" },
          ].map((s, i) => (
            <div key={s.label} className="flex items-center gap-2.5" style={{ borderLeft: i > 0 ? "1px solid rgba(255,255,255,0.07)" : "none", paddingLeft: i > 0 ? "16px" : "0" }}>
              <span className="text-xl font-black" style={{ color: s.color }}>{s.value}</span>
              <span className="text-[10px] text-white/35">{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Two upload cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <KeyUploadArea
          label="Demo Keys" accent="#60a5fa" accentRgb="96,165,250"
          description="Issued automatically when a creator joins a campaign."
          keys={demoKeys} needed={1} vaultAvail={poolDemo}
          onChange={onDemoChange} />
        <KeyUploadArea
          label="Full Game Keys" accent="#fb923c" accentRgb="251,146,60"
          description="Rewarded when a creator completes their campaign deliverables."
          keys={fullKeys} needed={1} vaultAvail={poolFull}
          onChange={onFullChange} />
      </div>

      {/* Status messages */}
      {hasKeys && (
        <div className="flex items-center gap-3 p-3.5 rounded-xl gf-scale-in"
          style={{ background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.18)" }}>
          <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: "#a78bfa" }} />
          <span className="text-sm font-bold" style={{ color: "#a78bfa" }}>
            Pool ready — {totalDemo} demo · {totalFull} full game keys
          </span>
        </div>
      )}

      {!hasKeys && poolDemo === 0 && poolFull === 0 && (
        <div className="flex items-center gap-2 p-3 rounded-xl"
          style={{ background: "rgba(251,146,60,0.05)", border: "1px solid rgba(251,146,60,0.12)" }}>
          <AlertCircle className="w-4 h-4 text-orange-400 shrink-0" />
          <p className="text-[11px] text-orange-300/70">Upload at least one demo and one full game key to continue.</p>
        </div>
      )}
    </div>
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
  const labelStyle = "text-[10px] font-bold text-white/30 uppercase tracking-wider block mb-2.5";
  const spinnerBtn = "w-8 h-8 rounded-lg flex items-center justify-center font-black text-base transition-colors hover:bg-white/10";
  const spinnerBtnStyle = { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.65)" };

  return (
    <div className="space-y-6 gf-fade-up">

      {/* Max creators */}
      <div>
        <label className={labelStyle}>Maximum campaign places</label>
        <div className="flex items-center justify-between">
          <p className="text-sm text-white/50">How many creators can join each campaign</p>
          <div className="flex items-center gap-3 shrink-0">
            <button onClick={() => onChange({ maxCreators: Math.max(5, limits.maxCreators - 5) })}
              className={spinnerBtn} style={spinnerBtnStyle}>−</button>
            <span className="text-xl font-black text-white w-10 text-center">{limits.maxCreators}</span>
            <button onClick={() => onChange({ maxCreators: Math.min(100, limits.maxCreators + 5) })}
              className={spinnerBtn} style={spinnerBtnStyle}>+</button>
          </div>
        </div>
      </div>

      {/* Frequency */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "20px" }}>
        <label className={labelStyle}>Campaign Frequency</label>
        <div className="grid grid-cols-2 gap-2">
          {FREQUENCY_OPTS.map(opt => (
            <button key={opt.id} onClick={() => onChange({ frequency: opt.id })}
              className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-left transition-all"
              style={{
                background: limits.frequency === opt.id ? "rgba(167,139,250,0.08)" : "rgba(255,255,255,0.02)",
                border: `1px solid ${limits.frequency === opt.id ? "rgba(167,139,250,0.28)" : "rgba(255,255,255,0.06)"}`,
              }}>
              <div className="w-3.5 h-3.5 rounded-full border-2 shrink-0 flex items-center justify-center"
                style={{ borderColor: limits.frequency === opt.id ? "#a78bfa" : "rgba(255,255,255,0.2)", background: limits.frequency === opt.id ? "#a78bfa" : "transparent" }}>
                {limits.frequency === opt.id && <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#070b10" }} />}
              </div>
              <span className="text-[12px] font-semibold" style={{ color: limits.frequency === opt.id ? "#a78bfa" : "rgba(255,255,255,0.50)" }}>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Key reserves */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "20px" }}>
        <label className={labelStyle}>Minimum Key Reserve</label>
        <p className="text-[11px] text-white/35 mb-4">Campaigns pause if your pool drops below these amounts</p>
        <div className="space-y-3">
          {[
            { key: "minDemoReserve" as const, label: "Demo Keys", color: "#60a5fa" },
            { key: "minFullReserve" as const, label: "Full Game Keys", color: "#fb923c" },
          ].map(f => (
            <div key={f.key} className="flex items-center justify-between">
              <span className="text-sm text-white/50">{f.label}</span>
              <div className="flex items-center gap-3 shrink-0">
                <button onClick={() => onChange({ [f.key]: Math.max(0, limits[f.key] - 5) })}
                  className={spinnerBtn} style={spinnerBtnStyle}>−</button>
                <span className="text-lg font-black w-10 text-center" style={{ color: f.color }}>{limits[f.key]}</span>
                <button onClick={() => onChange({ [f.key]: Math.min(200, limits[f.key] + 5) })}
                  className={spinnerBtn} style={spinnerBtnStyle}>+</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Max active */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "20px" }}>
        <div className="flex items-center justify-between">
          <div>
            <label className={labelStyle}>Maximum Active Campaigns</label>
            <p className="text-sm text-white/50">How many campaigns run simultaneously</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button onClick={() => onChange({ maxActive: Math.max(1, limits.maxActive - 1) })}
              className={spinnerBtn} style={spinnerBtnStyle}>−</button>
            <span className="text-xl font-black text-white w-10 text-center">{limits.maxActive}</span>
            <button onClick={() => onChange({ maxActive: Math.min(5, limits.maxActive + 1) })}
              className={spinnerBtn} style={spinnerBtnStyle}>+</button>
          </div>
        </div>
      </div>

    </div>
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
    <div className="space-y-5 gf-fade-up">

      {/* Summary */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
        {/* Game identity */}
        <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          {gameImage ? (
            <img src={gameImage} alt={gameName} className="w-10 h-10 rounded-xl object-cover shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center"
              style={{ background: "rgba(167,139,250,0.08)" }}>
              <Gamepad2 className="w-5 h-5" style={{ color: "#a78bfa" }} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-[10px] text-white/35 truncate">{gameName}</div>
            <div className="text-sm font-black text-white">Automatic Campaigns</div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold"
            style={{ background: "rgba(167,139,250,0.10)", color: "#a78bfa" }}>
            <div className="w-1.5 h-1.5 rounded-full bg-current" /> Ready
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2">
          {[
            { label: "Demo Keys",        value: poolDemo,              color: "#60a5fa" },
            { label: "Full Keys",        value: poolFull,              color: "#fb923c" },
            { label: "Max places",       value: limits.maxCreators,    color: "rgba(255,255,255,0.8)" },
            { label: "Frequency",        value: freqLabel,             color: "rgba(255,255,255,0.8)" },
            { label: "Min Demo Reserve", value: limits.minDemoReserve, color: "#60a5fa" },
            { label: "Min Full Reserve", value: limits.minFullReserve, color: "#fb923c" },
          ].map((s, i) => (
            <div key={s.label} className="px-4 py-3"
              style={{
                borderBottom: i < 4 ? "1px solid rgba(255,255,255,0.05)" : "none",
                borderRight: i % 2 === 0 ? "1px solid rgba(255,255,255,0.05)" : "none",
              }}>
              <div className="text-[9px] text-white/25 uppercase tracking-wider mb-1">{s.label}</div>
              <div className="text-sm font-black truncate" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Confirmation */}
      <button onClick={() => onConfirm(!confirmed)}
        className="w-full flex items-start gap-3 text-left p-4 rounded-2xl transition-all"
        style={{
          background: confirmed ? "rgba(167,139,250,0.06)" : "rgba(255,255,255,0.02)",
          border: `1px solid ${confirmed ? "rgba(167,139,250,0.25)" : "rgba(255,255,255,0.08)"}`,
        }}>
        <div className="w-5 h-5 rounded-md border-2 shrink-0 flex items-center justify-center mt-0.5 transition-all"
          style={{ borderColor: confirmed ? "#a78bfa" : "rgba(255,255,255,0.2)", background: confirmed ? "#a78bfa" : "transparent" }}>
          {confirmed && <Check className="w-3 h-3" style={{ color: "#070b10" }} />}
        </div>
        <span className="text-sm text-white/60 leading-snug">
          I understand Gamefolio will automatically manage campaigns using these settings and keys in my pool.
        </span>
      </button>

      {/* Activate button */}
      <button onClick={onActivate} disabled={!confirmed || submitting}
        className="w-full py-4 rounded-2xl text-sm font-black transition-all flex items-center justify-center gap-2.5 disabled:opacity-40"
        style={{
          background: confirmed && !submitting ? "#a78bfa" : "rgba(167,139,250,0.25)",
          color: "#070b10",
          boxShadow: confirmed && !submitting ? "0 4px 24px rgba(167,139,250,0.28)" : "none",
        }}>
        {submitting ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Activating…</>
        ) : (
          <><Bot className="w-4 h-4" /> Activate Automatic Campaigns</>
        )}
      </button>
    </div>
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
  const [commercialBudgetPence, setCommercialBudgetPence] = useState<number>(CAMPAIGN_COMMERCIAL_MODEL.paidMinimumPence);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pendingDemoKeys, setPendingDemoKeys] = useState("");
  const [pendingFullKeys, setPendingFullKeys] = useState("");
  const [useVaultDemo, setUseVaultDemo] = useState(true);
  const [useVaultFull, setUseVaultFull] = useState(true);
  const [settings, setSettings] = useState<CampaignSettings>({
    campaignTitle: "", description: "", startType: "asap", scheduledDate: "",
    scheduledTime: "12:00",
    timeZone: typeof Intl !== "undefined" ? (Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC") : "UTC",
    gameName: "", gameId: null, gameImageUrl: null,
    regions: "worldwide", platforms: [], applicationPeriod: 30,
    accessMethod: "demo_to_full", completionFullGameKey: true,
    customObjectives: DEFAULT_OBJECTIVES, maxPlaces: 5, manualApproval: false,
    customAccessInstructions: "", customAccessNeedsKey: false,
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
  const { data: commercialModel, isLoading: commercialModelLoading } = useQuery<any>({
    queryKey: ["/api/campaigns/commercial-model"],
    queryFn: getQueryFn({ on401: "throw" }),
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
  const effectiveVaultDemo = useVaultDemo ? vaultDemo : 0;
  const effectiveVaultFull = useVaultFull ? vaultFull : 0;
  const accessDemoCount = effectiveVaultDemo + pendDemo;
  const accessFullCount = effectiveVaultFull + pendFull;
  const requiresDemoAccess = settings.accessMethod === "demo_to_full" || settings.accessMethod === "private_playtest" || (settings.accessMethod === "custom_access" && settings.customAccessNeedsKey);
  const requiresFullAccess = settings.accessMethod === "full_game_upfront";
  const requiresFullReward = settings.completionFullGameKey && ["demo_to_full", "public_demo", "private_playtest"].includes(settings.accessMethod);
  const keysReady = !!selectedType &&
    (!requiresDemoAccess || accessDemoCount > 0) &&
    (!requiresFullAccess || accessFullCount > 0) &&
    (!requiresFullReward || accessFullCount > 0);
  const campaignCapacity = requiresDemoAccess && requiresFullReward ? Math.min(accessDemoCount, accessFullCount)
    : requiresFullAccess ? accessFullCount
    : requiresDemoAccess ? accessDemoCount
    : requiresFullReward ? accessFullCount : settings.maxPlaces;
  const personaliseReady = !!selectedType &&
    settings.campaignTitle.trim().length > 0 &&
    settings.description.trim().length > 0 &&
    settings.platforms.length > 0 &&
    (settings.startType === "asap" || (settings.scheduledDate.length > 0 && settings.scheduledTime.length > 0)) &&
    (settings.accessMethod !== "custom_access" || settings.customAccessInstructions.trim().length > 0) &&
    (!selectedType.custom || settings.customObjectives.some(objective => objective.quantity > 0));

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
      const customObjectives = selectedType.custom ? objectiveSnapshot(settings.customObjectives) : undefined;
      const completionDeadlineDays = selectedType.custom
        ? (settings.customDuration ?? recommendedCustomDeadline(settings.customObjectives))
        : selectedType.duration;
      const estimateSnapshot = {
        estimatedCreatorReach: settings.platforms.length > 0 && settings.regions ? { min: Math.max(1, Math.floor(campaignCapacity * 2.5)), max: Math.max(2, campaignCapacity * 4) } : null,
        expectedParticipation: settings.platforms.length > 0 && settings.regions ? { min: Math.max(1, Math.floor(campaignCapacity * 0.6)), max: Math.max(1, campaignCapacity) } : null,
        expectedCompletions: settings.platforms.length > 0 && settings.regions ? { min: Math.max(1, Math.floor(campaignCapacity * 0.4)), max: Math.max(1, Math.floor(campaignCapacity * 0.8)) } : null,
        estimatesGuaranteed: false,
      };
      const inst = await apiRequest("POST", "/api/campaigns/instances", {
        templateId, campaignTitle: settings.campaignTitle, gameName: settings.gameName, gameId: settings.gameId,
        gameArtworkUrl: settings.gameImageUrl, startType: settings.startType,
        scheduledStart: settings.startType === "scheduled" && settings.scheduledDate
          ? `${settings.scheduledDate}T${settings.scheduledTime || "12:00"}:00`
          : null,
        artworkUrl: settings.gameImageUrl || null,
        description: settings.description || undefined,
        regions: settings.regions,
         platforms: settings.platforms.length > 0 ? settings.platforms : undefined,
         accessMethod: settings.accessMethod,
         accessInstructions: settings.customAccessInstructions || undefined,
         applicationPeriodDays: settings.applicationPeriod,
         creatorDeadlineDays: completionDeadlineDays,
         maxPlaces: campaignCapacity,
         completionRewardType: settings.completionFullGameKey ? "full_game_key" : "bounty_xp",
         completionRewardKeyRequired: settings.completionFullGameKey,
         manualApprovalRequired: settings.manualApproval,
         objectiveSnapshot: customObjectives,
         estimateSnapshot,
         commercialType: selectedType.slug === "quick-creator" ? "starter" : "paid",
         budgetPence: selectedType.slug === "quick-creator" ? undefined : commercialBudgetPence,
         customAccessNeedsKey: settings.accessMethod === "custom_access" ? settings.customAccessNeedsKey : undefined,
         // Persist the canonical API field as well for deployments that
         // serialize campaign access settings in snake_case.
         custom_access_needs_key: settings.accessMethod === "custom_access" ? settings.customAccessNeedsKey : undefined,
      });
      const instData = await inst.json();
      if (!inst.ok) throw new Error(instData.message || "Failed to create campaign");
      const demoKeyList = parseKeyLines(pendingDemoKeys);
      const fullKeyList = parseKeyLines(pendingFullKeys);
       if (demoKeyList.length > 0) {
         await apiRequest("POST", `/api/campaigns/instances/${instData.id}/keys`, { keyType: "demo", keyPool: "access", keys: demoKeyList });
      }
      if (fullKeyList.length > 0) {
         const keyPool = settings.accessMethod === "full_game_upfront" ? "access" : "reward";
         await apiRequest("POST", `/api/campaigns/instances/${instData.id}/keys`, { keyType: "full", keyPool, keys: fullKeyList });
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
        await apiRequest("POST", "/api/campaigns/auto/keys", { keyType: "full", keyPool: "reward", keys: fullKeyList });
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
    settings.startType === "asap" ? "Launch Immediately" : `Scheduled: ${settings.scheduledDate} ${settings.scheduledTime}`,
    settings.platforms.length ? settings.platforms.join(", ") : "All platforms",
  ].join(" · ");
  const step3ManualSummary = keysReady
    ? `${vaultDemo + pendDemo} demo · ${vaultFull + pendFull} full game keys ready`
    : "Keys pending";

  const autoStep1Summary = mode === "auto" ? "Automatic Campaigns" : "";
  const autoStep2Summary = `${poolDemo} demo · ${poolFull} full keys in pool`;
  const autoStep3Summary = `${autoLimits.maxCreators} campaign places · ${FREQUENCY_OPTS.find(f => f.id === autoLimits.frequency)?.label}`;
  const SelectedTypeIcon = selectedType?.icon ?? Gamepad2;
  const selectedTypeSummary = selectedType ? campaignSummary(selectedType) : "";

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
        {mode === "manual" && currentStep > 1 && (
          <div className="mx-auto max-w-[1200px] flex flex-wrap items-center gap-2 sm:gap-3 pb-2 text-[10px] sm:text-[11px] font-bold tracking-wide"
            aria-label="Campaign setup progress">
            <span className="text-white/45"><span className="text-[#B9FF1A]">1</span> Choose Type</span>
            <span className="text-white/25">→</span>
            <span className={currentStep === 2 ? "text-[#B9FF1A]" : "text-white/45"}><span>2</span> Personalise</span>
            <span className="text-white/25">→</span>
             <span className={currentStep === 3 ? "text-[#B9FF1A]" : "text-white/45"}><span>3</span> Add Access</span>
            <span className="text-white/25">→</span>
            <span className={currentStep === 4 ? "text-[#B9FF1A]" : "text-white/45"}><span>4</span> Review &amp; Launch</span>
          </div>
        )}

        {/* ── Step 1: open layout when active, compact row when completed ── */}
        {(mode === "auto" ? autoStep > 1 : currentStep > 1) ? (
          /* Completed row — matches StepCard completed style */
          <div className="flex items-center gap-3.5 py-3"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
              style={{ background: NEON }}>
              <Check className="w-3.5 h-3.5" style={{ color: "#070b10" }} />
            </div>
            {mode === "manual" && selectedType && (
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: "rgba(185,255,26,0.10)", color: NEON }}>
                <SelectedTypeIcon className="w-4 h-4" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-white">
                {mode === "auto" ? "Automatic Campaigns" : selectedType?.shortName ?? ""}
              </span>
              {mode === "manual" && selectedType && (
                <span className="block text-[11px] text-white/55 mt-1 truncate">{selectedTypeSummary}</span>
              )}
            </div>
            <button
              onClick={() => {
                if (mode === "auto") setAutoStep(1);
                else { setCurrentStep(1); setConfirmed(false); }
              }}
              className="text-[11px] font-bold transition-colors shrink-0 px-2 py-1"
              style={{ color: NEON }}>
              Change
            </button>
          </div>
        ) : (
          /* Active — open, breathable, no heavy box */
          <div className="gf-fade-up">
            {/* Title row + Automatic toggle */}
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-8 gap-5">
              <div>
                <p className="text-[10px] uppercase tracking-widest mb-1.5 font-bold" style={{ color: "rgba(255,255,255,0.25)" }}>Step 1</p>
                <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">Choose Your Campaign Type</h2>
                 <p className="text-sm text-white/70 mt-2 max-w-2xl">Start with a ready-made campaign or build one around your own goals.</p>
                 <p className="text-sm text-white/70 mt-1 max-w-2xl">Indie Game Pro includes one Quick Creator campaign each billing month.</p>
                <div className="mt-4 text-[11px] font-bold tracking-wide text-white/45" aria-label="Campaign creation steps">
                  <span style={{ color: NEON }}>1 Choose Type</span>
                  <span className="mx-2 text-white/25">→</span>
                  <span>2 Personalise</span>
                  <span className="mx-2 text-white/25">→</span>
                   <span>3 Add Access</span>
                  <span className="mx-2 text-white/25">→</span>
                  <span>4 Review &amp; Launch</span>
                </div>
              </div>

               <button type="button" onClick={() => {
                 setMode("auto");
                 setAutoStep(1);
                 setCurrentStep(1);
                 setConfirmed(false);
                 setAutoConfirmed(false);
                 setSelectedType(CAMPAIGN_TYPES.find(t => t.recommended) ?? null);
               }} className="self-start lg:mt-2 text-sm font-bold underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B7FF18]" style={{ color: NEON }}>
                 Not sure? Help me choose →
               </button>
            </div>

            {/* Accordion content — keyed so Automatic can open Quick Creator by default */}
            <div key={mode} className="gf-fade-up">
              <CommercialCampaignAccordion
                selectedType={selectedType}
                campaignTypes={CAMPAIGN_TYPES}
                allowance={commercialModel?.starterAllowance}
                commercialModel={commercialModel?.model}
                allowanceLoading={commercialModelLoading}
                 gameArtworkUrl={indieProfile?.profile?.headerImageUrl ?? indieProfile?.profile?.backgroundImageUrl ?? indieProfile?.profile?.gameImageUrl ?? null}
                onBack={onComplete}
                onSelect={(t) => {
                  setSelectedType(t);
                  const preset = CAMPAIGN_COMMERCIAL_MODEL.presets.find(p => p.slug === t.slug);
                  if (preset?.priceFromPence && t.slug !== "custom-campaign") {
                    setCommercialBudgetPence(preset.priceFromPence);
                  }
                  setConfirmed(false);
                }}
                onContinue={() => {
                  if (mode === "auto") setAutoStep(2);
                  else setCurrentStep(2);
                }}
              />
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
                  <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 mt-8">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="w-full sm:w-auto px-5 py-3 rounded-xl text-sm font-bold transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B9FF1A]"
                      style={{ background: "#111923", color: "rgba(255,255,255,0.70)", border: "1px solid rgba(255,255,255,0.16)" }}>
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      disabled={!personaliseReady}
                      className="w-full sm:w-[290px] px-5 py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-colors disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B9FF1A]"
                      style={{
                        background: personaliseReady ? "#B9FF1A" : "#263039",
                        color: personaliseReady ? "#070b10" : "rgba(255,255,255,0.78)",
                        border: personaliseReady ? "1px solid transparent" : "1px solid rgba(255,255,255,0.16)",
                      }}>
                      Continue to Upload Keys <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </StepCard>

             <StepCard number={3} title="Add Access" icon={KeyRound}
              state={manualStepState(3)} completedLine={step3ManualSummary}
              onEdit={() => setCurrentStep(3)}>
              {selectedType && (
                <div>
                  <StepUploadKeys type={selectedType}
                    demoKeys={pendingDemoKeys} fullKeys={pendingFullKeys}
                    vaultDemo={vaultDemo} vaultFull={vaultFull}
                    useVaultDemo={useVaultDemo} useVaultFull={useVaultFull}
                    onUseVaultDemoChange={setUseVaultDemo} onUseVaultFullChange={setUseVaultFull}
                     onDemoChange={setPendingDemoKeys} onFullChange={setPendingFullKeys}
                     accessMethod={settings.accessMethod} completionFullGameKey={settings.completionFullGameKey}
                     maxPlaces={settings.maxPlaces} onMaxPlacesChange={value => updateSettings({ maxPlaces: value })} />
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

             <StepCard number={4} title="Review & Launch" icon={Rocket}
              state={manualStepState(4)}>
              {selectedType && (
                <StepLaunch type={selectedType} settings={settings} capacity={campaignCapacity}
                  commercialBudgetPence={selectedType.slug === "quick-creator" ? null : commercialBudgetPence}
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
