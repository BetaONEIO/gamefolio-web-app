import { useState, useMemo, useEffect, useRef, lazy, Suspense } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { useMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ClipWithUser, Game, GameBounty } from "@shared/schema";
import VideoClipGridItem from "@/components/clips/VideoClipGridItem";
import { MobileTrendingViewer } from "@/components/clips/MobileTrendingViewer";
import MobileClipsViewerOverlay from "@/components/clips/MobileClipsViewerOverlay";
import { openExternal } from "@/lib/platform";
import { CreatorDashboard } from "@/components/indie-bounty/CreatorDashboard";
import { DeveloperDashboard } from "@/components/indie-bounty/DeveloperDashboard";
import {
  ArrowLeft, Play, Camera, Users, Clock, Eye,
  Trophy, Zap, Key, Star, Gift, Sword, Plus, Upload, X,
  ChevronRight, Loader2, Radio, Target, Shield, Flame,
  BarChart3, Video, Globe, Heart, Gamepad2, Check,
  Gamepad, Monitor, Smartphone,
  Film, MessageSquare, AlertCircle, ShieldCheck, Unlock, Rocket,
} from "lucide-react";

const UploadPage = lazy(() => import("./UploadPage"));

const NEON = "#c1ff00";
const CARD_BG = "rgba(255,255,255,0.04)";
const CARD_BORDER = "rgba(255,255,255,0.09)";

const TABS = [
  { id: "overview",    label: "Overview",     icon: BarChart3 },
  { id: "clips",       label: "Clips",        icon: Play },
  { id: "reels",       label: "Reels",        icon: Video },
  { id: "screenshots", label: "Screenshots",  icon: Camera },
  { id: "bounties",    label: "Bounties",     icon: Sword },
] as const;

type TabId = typeof TABS[number]["id"];

const DIFFICULTY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  easy:   { label: "Easy",   color: "#4ade80", bg: "rgba(74,222,128,0.12)" },
  medium: { label: "Medium", color: "#facc15", bg: "rgba(250,204,21,0.12)" },
  hard:   { label: "Hard",   color: "#f87171", bg: "rgba(248,113,113,0.12)" },
};

const REWARD_ICONS: Record<string, any> = {
  game_key:      Key,
  xp:            Zap,
  badge:         Trophy,
  featured:      Star,
  early_access:  Shield,
  digital:       Gift,
};

/* ── Bounty Hub style card helpers (matches BountiesPage visual language) ── */
const HUB_NEON = "#B8FF1B";
const HUB_CARD_BG = "#0e1520";
const HUB_CARD_BORDER = "rgba(255,255,255,0.10)";

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

function timeRemaining(endDate: string | null) {
  if (!endDate) return "Ongoing";
  const diff = new Date(endDate).getTime() - Date.now();
  if (diff <= 0) return "Ended";
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h left`;
  return `${hours}h left`;
}

function HubRewardCol({ icon, label, sublabel, value, active }: { icon: any; label: string; sublabel: string; value: string; active: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all duration-200 hover:scale-[1.04]"
      style={{
        background: active ? "rgba(184,255,27,0.07)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${active ? "rgba(184,255,27,0.20)" : "rgba(255,255,255,0.07)"}`,
      }}>
      <div className="w-[54px] h-[54px] flex items-center justify-center">{icon}</div>
      <span className="text-[11px] font-black leading-tight text-center px-1" style={{ color: active ? HUB_NEON : "rgba(255,255,255,0.85)" }}>{value}</span>
      <span className="text-[9px] font-bold leading-tight text-center px-1" style={{ color: "rgba(255,255,255,0.40)" }}>{label}</span>
      <span className="text-[8px] leading-tight text-center px-1 uppercase tracking-wider" style={{ color: active ? "rgba(184,255,27,0.55)" : "rgba(255,255,255,0.20)" }}>{sublabel}</span>
    </div>
  );
}

/* Build requirement pills from a GameBounty */
function bountyRequirementPills(bounty: GameBounty & { participantCount?: number }): { ct: string; qty: number }[] {
  const pills: { ct: string; qty: number }[] = [];
  if ((bounty.requiredClips ?? 0) > 0) pills.push({ ct: "clip", qty: bounty.requiredClips ?? 1 });
  if ((bounty.requiredReels ?? 0) > 0) pills.push({ ct: "reel", qty: bounty.requiredReels ?? 1 });
  if ((bounty.requiredScreenshots ?? 0) > 0) pills.push({ ct: "screenshot", qty: bounty.requiredScreenshots ?? 1 });
  if ((bounty.requiredViews ?? 0) > 0) pills.push({ ct: "stream", qty: bounty.requiredViews ?? 1 });
  return pills;
}

/* Rich campaign card matching BountiesPage visual language */
function HubCampaignCard({
  bounty,
  gameImageUrl,
  gameName,
  onJoin,
  onViewDashboard,
  onClaimKey,
  joining = false,
  joined = false,
  completed = false,
  fullKey = null,
  progressPercent = 0,
  isFeatured = false,
}: {
  bounty: GameBounty & { participantCount?: number };
  gameImageUrl?: string;
  gameName?: string;
  onJoin: () => void;
  onViewDashboard: () => void;
  onClaimKey: () => void;
  joining?: boolean;
  joined?: boolean;
  completed?: boolean;
  fullKey?: string | null;
  progressPercent?: number;
  isFeatured?: boolean;
}) {
  const { user } = useAuth();
  const demoLeft = Number(bounty.demoKeysRemaining ?? 0);
  const fullLeft = Number(bounty.fullKeysRemaining ?? 0);
  const totalXP = bounty.totalXpAvailable ?? 0;
  const endDate = bounty.endDate ? new Date(bounty.endDate).toISOString() : null;
  const tLeft = timeRemaining(endDate);
  const nearlyFull = demoLeft > 0 && demoLeft <= 5;
  const trending = Number(bounty.participantCount ?? 0) >= 10;
  const slotsUsed = bounty.participantCount ?? 0;
  const totalSlots = bounty.creatorSlots ?? bounty.maxParticipants ?? 10;
  const isFull = slotsUsed >= totalSlots;
  const pills = bountyRequirementPills(bounty);

  const cardStyle = isFeatured ? {
    background: "linear-gradient(135deg, rgba(193,255,0,0.08) 0%, rgba(120,40,200,0.10) 100%)",
    border: "1px solid rgba(193,255,0,0.2)",
    boxShadow: "0 0 40px rgba(193,255,0,0.06)",
  } : {
    background: HUB_CARD_BG,
    border: `1px solid ${HUB_CARD_BORDER}`,
  };

  return (
    <div
      className="rounded-2xl overflow-hidden group transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/60"
      style={cardStyle}
      onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(184,255,27,0.28)")}
      onMouseLeave={e => (e.currentTarget.style.borderColor = isFeatured ? "rgba(193,255,0,0.2)" : HUB_CARD_BORDER)}
    >
      {/* Hero artwork */}
      <div className="relative h-48 overflow-hidden">
        {gameImageUrl ? (
          <img src={gameImageUrl} alt={gameName || bounty.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.05]" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #0d1624 0%, #0a1020 100%)" }}>
            <Target size={44} color="rgba(184,255,27,0.12)" />
          </div>
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, #0e1520 0%, rgba(14,21,32,0.18) 60%, transparent 100%)" }} />
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full"
            style={{ background: HUB_NEON, color: "#070b10" }}>
            <ShieldCheck size={9} /> GF Verified
          </span>
          {trending && (
            <span className="inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-full"
              style={{ background: "rgba(239,68,68,0.85)", color: "white" }}>
              <Flame size={8} /> Trending
            </span>
          )}
        </div>
        {nearlyFull && (
          <div className="absolute top-3 right-3">
            <span className="inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-full"
              style={{ background: "rgba(245,158,11,0.90)", color: "#070b10" }}>
              ⚡ {demoLeft} Left
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="px-5 pb-5 pt-4 space-y-3.5">
        {/* Title + description */}
        <div>
          <h3 className="text-lg font-black text-white leading-tight tracking-tight">
            {bounty.campaignTitle || bounty.title}
          </h3>
          {bounty.description && (
            <p className="text-[12px] mt-1 line-clamp-1" style={{ color: "rgba(255,255,255,0.45)" }}>
              {bounty.description}
            </p>
          )}
        </div>

        {/* Requirement pills */}
        {pills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {pills.map(({ ct, qty }) => {
              const Icon = REQ_ICON[ct] ?? Target;
              return (
                <span key={ct} className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg"
                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.70)", border: "1px solid rgba(255,255,255,0.09)" }}>
                  <Icon size={11} /> {reqPillLabel(ct, qty)}
                </span>
              );
            })}
          </div>
        )}

        {/* Urgency row */}
        <div className="flex items-center gap-3 text-[11px]">
          {demoLeft > 0 && (
            <span style={{ color: HUB_NEON }} className="font-bold">{demoLeft} / {Number(bounty.keyCount ?? demoLeft)} demo keys</span>
          )}
          {tLeft !== "Ended" && tLeft !== "Ongoing" && (
            <span className="text-white/35 flex items-center gap-1"><Clock size={10} /> {tLeft}</span>
          )}
          {Number(bounty.participantCount ?? 0) > 0 && (
            <span className="text-white/35 flex items-center gap-1"><Users size={10} /> {bounty.participantCount}</span>
          )}
        </div>

        {/* Rewards — 4 equal columns */}
        <div className="grid grid-cols-4 gap-1.5">
          <HubRewardCol
            icon={<img src="/icons/demo-key-icon.png" alt="Demo" className="w-[45px] h-[45px] object-contain" />}
            sublabel="Immediate" label="Demo Key"
            value={demoLeft > 0 ? `${demoLeft}` : "—"} active={demoLeft > 0} />
          <HubRewardCol
            icon={<img src="/icons/full-game-icon.png" alt="Full" className="w-[45px] h-[45px] object-contain" />}
            sublabel="Reward" label="Full Game"
            value={fullLeft > 0 ? `${fullLeft}` : "—"} active={fullLeft > 0} />
          <HubRewardCol
            icon={<Zap size={45} color={HUB_NEON} />}
            sublabel="Progress" label="XP"
            value={totalXP > 0 ? totalXP.toLocaleString() : "—"} active={totalXP > 0} />
          <HubRewardCol
            icon={<img src="/icons/token-icon.png" alt="Token" className="w-[45px] h-[45px] object-contain" />}
            sublabel="Bonus" label="GFT"
            value="—" active={false} />
        </div>

        {/* CTA */}
        {joined ? (
          completed ? (
            fullKey ? (
              <button
                disabled
                className="w-full py-3 rounded-xl text-sm font-black tracking-wide flex items-center justify-center gap-2"
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.3)", border: HUB_CARD_BORDER }}>
                <Trophy size={15} style={{ color: HUB_NEON }} /> Campaign Complete
              </button>
            ) : (
              <button
                className="w-full py-3 rounded-xl text-sm font-black tracking-wide flex items-center justify-center gap-2 transition-all hover:brightness-110 hover:scale-[1.01] active:scale-[0.98]"
                style={{ background: HUB_NEON, color: "#070b10" }}
                onClick={onClaimKey}>
                <Unlock size={15} /> Claim Full Key
              </button>
            )
          ) : (
            <button
              className="w-full py-3 rounded-xl text-sm font-black tracking-wide flex items-center justify-center gap-2 transition-all hover:brightness-110"
              style={{ background: "rgba(255,255,255,0.08)", color: "#fff", border: `1px solid ${HUB_CARD_BORDER}` }}
              onClick={onViewDashboard}>
              View Objectives <ChevronRight size={15} />
              {progressPercent > 0 && (
                <span className="ml-2 text-[10px] font-black px-1.5 py-0.5 rounded" style={{ background: "rgba(193,255,0,0.2)", color: HUB_NEON }}>
                  {progressPercent}%
                </span>
              )}
            </button>
          )
        ) : (
          <button
            disabled={isFull || joining || !user}
            className="w-full py-3 rounded-xl text-sm font-black tracking-wide flex items-center justify-center gap-2 transition-all hover:brightness-110 hover:scale-[1.01] active:scale-[0.98]"
            style={isFull ? {
              background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.3)", border: HUB_CARD_BORDER
            } : {
              background: HUB_NEON, color: "#070b10"
            }}
            onClick={onJoin}>
            {joining ? <Loader2 size={15} className="animate-spin" /> :
              isFull ? "Campaign Full" :
              !user ? "Sign In to Join" :
              <><ShieldCheck size={15} /> Accept Mission</>}
          </button>
        )}
      </div>
    </div>
  );
}

function DifficultyBadge({ difficulty }: { difficulty?: string | null }) {
  const cfg = DIFFICULTY_CONFIG[difficulty ?? "medium"] ?? DIFFICULTY_CONFIG.medium;
  return (
    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
      style={{ color: cfg.color, background: cfg.bg, letterSpacing: "1.2px" }}>
      {cfg.label}
    </span>
  );
}

function StatCard({ value, label, icon: Icon }: { value: string | number; label: string; icon: any }) {
  return (
    <div className="flex-1 rounded-xl p-3 flex flex-col gap-1.5"
      style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
      <div className="flex items-center gap-1.5 mb-0.5">
        <Icon className="w-3 h-3" style={{ color: NEON }} />
      </div>
      <span className="text-xl font-black text-white leading-none">{value}</span>
      <span className="text-[9px] uppercase font-bold tracking-widest" style={{ color: NEON }}>{label}</span>
    </div>
  );
}

function FeatureTag({ label }: { label: string }) {
  return (
    <span className="px-3 py-1.5 rounded-lg text-xs font-bold"
      style={{ background: "rgba(193,255,0,0.08)", border: "1px solid rgba(193,255,0,0.2)", color: NEON }}>
      {label}
    </span>
  );
}

function PlatformIcon({ platform }: { platform: string }) {
  const icons: Record<string, any> = {
    steam: Gamepad2,
    epic: Gamepad,
    xbox: Gamepad,
    playstation: Gamepad,
    nintendo: Gamepad,
    mobile: Smartphone,
    pc: Monitor,
  };
  const Icon = icons[platform.toLowerCase()] || Gamepad;
  const names: Record<string, string> = {
    steam: "Steam", epic: "Epic Games", xbox: "Xbox", playstation: "PlayStation",
    nintendo: "Nintendo Switch", mobile: "Mobile", pc: "PC",
  };
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold"
      style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${CARD_BORDER}`, color: "rgba(255,255,255,0.7)" }}>
      <Icon className="w-3.5 h-3.5" />
      {names[platform.toLowerCase()] || platform}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</span>
      <span className="text-sm font-bold text-white">{value}</span>
    </div>
  );
}

function BountyCard({ bounty, onAccept, accepting, alreadyAccepted }: {
  bounty: GameBounty & { participantCount?: number };
  onAccept: (id: number) => void;
  accepting: boolean;
  alreadyAccepted: boolean;
}) {
  const RewardIcon = REWARD_ICONS[bounty.rewardType ?? "game_key"] ?? Key;
  const slotsUsed = bounty.participantCount ?? 0;
  const totalSlots = bounty.creatorSlots ?? 10;
  const progress = Math.min((slotsUsed / totalSlots) * 100, 100);
  const isFull = slotsUsed >= totalSlots;

  return (
    <div className="rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden"
      style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${CARD_BORDER}` }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-white text-sm leading-tight mb-1 truncate">{bounty.title}</h4>
          {bounty.description && (
            <p className="text-xs text-gray-400 line-clamp-2">{bounty.description}</p>
          )}
        </div>
        <DifficultyBadge difficulty={bounty.difficulty} />
      </div>

      <div className="flex items-center gap-2 rounded-lg px-3 py-2"
        style={{ background: "rgba(193,255,0,0.07)", border: "1px solid rgba(193,255,0,0.15)" }}>
        <RewardIcon className="w-4 h-4 flex-shrink-0" style={{ color: NEON }} />
        <span className="text-sm font-bold" style={{ color: NEON }}>
          {bounty.rewardValue || bounty.rewardType?.replace(/_/g, " ") || "Reward"}
        </span>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-[11px] text-gray-400">
          <span>{slotsUsed}/{totalSlots} creators</span>
          {bounty.endDate && (
            <span>Ends {new Date(bounty.endDate).toLocaleDateString()}</span>
          )}
        </div>
        <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
          <div className="h-full rounded-full transition-all"
            style={{ width: `${progress}%`, background: isFull ? "#f87171" : NEON }} />
        </div>
      </div>

      <Button
        size="sm"
        disabled={isFull || alreadyAccepted || accepting}
        onClick={() => onAccept(bounty.id)}
        className="w-full font-bold text-sm"
        style={isFull || alreadyAccepted ? {
          background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.3)", border: CARD_BORDER
        } : {
          background: NEON, color: "#0a0f1c", boxShadow: "0 8px 24px rgba(193,255,0,0.25)"
        }}
      >
        {accepting ? <Loader2 className="w-4 h-4 animate-spin" /> :
          alreadyAccepted ? "Accepted ✓" : isFull ? "Full" : "Accept Bounty"}
      </Button>
    </div>
  );
}

function FeaturedBountyCard({ bounty, onAccept, accepting, alreadyAccepted }: {
  bounty: GameBounty & { participantCount?: number };
  onAccept: (id: number) => void;
  accepting: boolean;
  alreadyAccepted: boolean;
}) {
  const RewardIcon = REWARD_ICONS[bounty.rewardType ?? "game_key"] ?? Key;
  const slotsUsed = bounty.participantCount ?? 0;
  const totalSlots = bounty.creatorSlots ?? 10;
  const progress = Math.min((slotsUsed / totalSlots) * 100, 100);
  const isFull = slotsUsed >= totalSlots;

  return (
    <div className="rounded-2xl overflow-hidden relative"
      style={{ background: "linear-gradient(135deg, rgba(193,255,0,0.10) 0%, rgba(120,40,200,0.12) 100%)", border: "1px solid rgba(193,255,0,0.25)", boxShadow: "0 0 40px rgba(193,255,0,0.08)" }}>
      <div className="absolute top-0 right-0 w-48 h-48 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(193,255,0,0.08) 0%, transparent 70%)", transform: "translate(30%, -30%)" }} />
      <div className="p-5 relative z-10">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Star className="w-4 h-4" style={{ color: NEON }} />
              <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: NEON }}>Featured Bounty</span>
            </div>
            <h3 className="text-xl font-black text-white leading-tight">{bounty.title}</h3>
          </div>
          <DifficultyBadge difficulty={bounty.difficulty} />
        </div>

        {bounty.description && (
          <p className="text-sm text-gray-300 mb-4 leading-relaxed">{bounty.description}</p>
        )}

        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-2 rounded-xl px-4 py-2.5 flex-1"
            style={{ background: "rgba(193,255,0,0.1)", border: "1px solid rgba(193,255,0,0.2)" }}>
            <RewardIcon className="w-5 h-5" style={{ color: NEON }} />
            <div>
              <div className="text-[9px] uppercase font-bold text-gray-400 tracking-widest">Reward</div>
              <div className="text-sm font-black" style={{ color: NEON }}>
                {bounty.rewardValue || bounty.rewardType?.replace(/_/g, " ") || "Reward"}
              </div>
            </div>
          </div>
          <div className="rounded-xl px-4 py-2.5"
            style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${CARD_BORDER}` }}>
            <div className="text-[9px] uppercase font-bold text-gray-400 tracking-widest">Slots</div>
            <div className="text-sm font-black text-white">{totalSlots - slotsUsed} left</div>
          </div>
          {bounty.endDate && (
            <div className="rounded-xl px-4 py-2.5"
              style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${CARD_BORDER}` }}>
              <div className="text-[9px] uppercase font-bold text-gray-400 tracking-widest">Ends</div>
              <div className="text-sm font-black text-white">{new Date(bounty.endDate).toLocaleDateString()}</div>
            </div>
          )}
        </div>

        <div className="space-y-1.5 mb-4">
          <div className="flex justify-between text-xs text-gray-400">
            <span>{slotsUsed} of {totalSlots} creator slots filled</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
            <div className="h-full rounded-full transition-all"
              style={{ width: `${progress}%`, background: isFull ? "#f87171" : NEON, boxShadow: isFull ? "none" : "0 0 10px rgba(193,255,0,0.5)" }} />
          </div>
        </div>

        <Button
          disabled={isFull || alreadyAccepted || accepting}
          onClick={() => onAccept(bounty.id)}
          className="w-full py-3 font-black text-sm"
          style={isFull || alreadyAccepted ? {
            background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.3)", border: CARD_BORDER
          } : {
            background: NEON, color: "#0a0f1c", boxShadow: "0 12px 32px rgba(193,255,0,0.3)"
          }}
        >
          {accepting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          {accepting ? "Accepting..." : alreadyAccepted ? "Bounty Accepted ✓" : isFull ? "All Slots Filled" : "Accept Bounty →"}
        </Button>
      </div>
    </div>
  );
}

/* Inline confetti burst — no external dependency */
function fireConfetti(container: HTMLElement) {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999;';
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width = window.innerWidth;
  const h = canvas.height = window.innerHeight;
  const particles: { x: number; y: number; vx: number; vy: number; color: string; size: number; life: number }[] = [];
  const colors = ['#B8FF1B', '#00FF88', '#FFD700', '#FF6B6B', '#4ECDC4', '#FFFFFF', '#45B7D1'];
  for (let i = 0; i < 150; i++) {
    particles.push({
      x: w / 2, y: h / 2,
      vx: (Math.random() - 0.5) * 16,
      vy: (Math.random() - 1) * 14 - 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 5 + 2,
      life: 1,
    });
  }
  let anim = 0;
  const loop = () => {
    ctx.clearRect(0, 0, w, h);
    let alive = 0;
    for (const p of particles) {
      if (p.life <= 0) continue;
      alive++;
      p.x += p.vx; p.y += p.vy; p.vy += 0.35;
      p.life -= 0.012;
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (alive > 0) anim = requestAnimationFrame(loop);
    else canvas.remove();
  };
  anim = requestAnimationFrame(loop);
  setTimeout(() => cancelAnimationFrame(anim), 4000);
}

const TEMPLATES = [
  { slug: "quick-creator", name: "Quick Creator Campaign", duration: 5, capacity: 20, desc: "Fast exposure with quick creator participation and first impressions.", icon: Zap, recommended: false },
  { slug: "content-boost", name: "Content Boost Campaign", duration: 10, capacity: 35, desc: "Generate lots of promotional content across multiple formats.", icon: Film, recommended: true },
  { slug: "creator-showcase", name: "Creator Showcase Campaign", duration: 21, capacity: 25, desc: "Deep creator engagement with premium content including streams.", icon: Trophy, recommended: false },
  { slug: "custom", name: "Custom Campaign", duration: 14, capacity: 20, desc: "Full control over duration, capacity and targeting.", icon: Star, recommended: false },
];

function CreateBountyDialog({ open, onClose, gameId, onCreated, gameImageUrl, gameName }: {
  open: boolean; onClose: () => void; gameId: number; onCreated: () => void;
  gameImageUrl?: string; gameName?: string;
}) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const dialogRef = useRef<HTMLDivElement>(null);

  /* ── Wizard State ── */
  const [step, setStep] = useState(1);
  const [templateSlug, setTemplateSlug] = useState("");
  const [title, setTitle] = useState("");
  const [campaignTitle, setCampaignTitle] = useState("");
  const [description, setDescription] = useState("");
  const [creatorSlots, setCreatorSlots] = useState("10");
  const [endDate, setEndDate] = useState("");
  const [demoKeyPool, setDemoKeyPool] = useState("");
  const [fullKeyPool, setFullKeyPool] = useState("");
  const [requiredClips, setRequiredClips] = useState("2");
  const [requiredReels, setRequiredReels] = useState("1");
  const [requiredScreenshots, setRequiredScreenshots] = useState("0");
  const [requiredViews, setRequiredViews] = useState("500");
  const [xpJoin, setXpJoin] = useState("500");
  const [xpPerClip, setXpPerClip] = useState("1000");
  const [xpPerReel, setXpPerReel] = useState("2500");
  const [xpPerScreenshot, setXpPerScreenshot] = useState("200");
  const [xpViewMilestone, setXpViewMilestone] = useState("2500");
  const [xpCompletionBonus, setXpCompletionBonus] = useState("5000");
  const [completionBadge, setCompletionBadge] = useState("");

  /* ── Success State ── */
  const [success, setSuccess] = useState(false);
  const [createdCampaign, setCreatedCampaign] = useState<any>(null);
  const [showTick, setShowTick] = useState(false);

  const DIALOG_BG = "#0e1520";
  const DIALOG_BORDER = "rgba(255,255,255,0.10)";
  const HUB_NEON = "#B8FF1B";

  const sectionCard = { background: "rgba(255,255,255,0.03)", border: `1px solid ${DIALOG_BORDER}`, borderRadius: "12px", padding: "16px" };
  const inputStyle2 = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)", color: "#fff", borderRadius: "10px", padding: "10px 14px", width: "100%", outline: "none", fontSize: "14px", transition: "border-color 0.2s" };
  const labelStyle2 = { fontSize: "10px", fontWeight: 800, textTransform: "uppercase" as const, letterSpacing: "1.2px", color: "rgba(255,255,255,0.45)", display: "block", marginBottom: "6px" };

  const steps = [
    { num: 1, label: "Choose" },
    { num: 2, label: "Settings" },
    { num: 3, label: "Keys" },
    { num: 4, label: "Launch" },
  ];

  const resetForm = () => {
    setStep(1); setTemplateSlug(""); setTitle(""); setCampaignTitle(""); setDescription("");
    setCreatorSlots("10"); setEndDate("");
    setDemoKeyPool(""); setFullKeyPool("");
    setRequiredClips("2"); setRequiredReels("1"); setRequiredScreenshots("0"); setRequiredViews("500");
    setXpJoin("500"); setXpPerClip("1000"); setXpPerReel("2500"); setXpPerScreenshot("200");
    setXpViewMilestone("2500"); setXpCompletionBonus("5000"); setCompletionBadge("");
    setSuccess(false); setCreatedCampaign(null); setShowTick(false);
  };

  const totalXP = (parseInt(xpJoin) || 0)
    + (parseInt(xpPerClip) || 0) * (parseInt(requiredClips) || 0)
    + (parseInt(xpPerReel) || 0) * (parseInt(requiredReels) || 0)
    + (parseInt(xpPerScreenshot) || 0) * (parseInt(requiredScreenshots) || 0)
    + (parseInt(xpViewMilestone) || 0)
    + (parseInt(xpCompletionBonus) || 0);

  const demoKeys = demoKeyPool.split(/\n|,/).map(k => k.trim()).filter(Boolean);
  const fullKeys = fullKeyPool.split(/\n|,/).map(k => k.trim()).filter(Boolean);
  const selectedTemplate = TEMPLATES.find(t => t.slug === templateSlug);

  const mutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/games/${gameId}/bounties`, data),
    onSuccess: (data: any) => {
      setCreatedCampaign(data);
      setSuccess(true);
      setShowTick(true);
      onCreated();
      if (dialogRef.current) fireConfetti(dialogRef.current);
    },
    onError: () => toast({ title: "Error", description: "Failed to launch campaign.", variant: "gamefolioError" }),
  });

  const handleLaunch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const payload = {
      title: title.trim(),
      campaignTitle: campaignTitle.trim() || null,
      description: description.trim() || null,
      maxParticipants: parseInt(creatorSlots) || 10,
      endDate: endDate || null,
      demoKeyPool: demoKeys,
      fullKeyPool: fullKeys,
      requiredClips: parseInt(requiredClips) || 0,
      requiredReels: parseInt(requiredReels) || 0,
      requiredScreenshots: parseInt(requiredScreenshots) || 0,
      requiredViews: parseInt(requiredViews) || 0,
      xpJoin: parseInt(xpJoin) || 0,
      xpPerClip: parseInt(xpPerClip) || 0,
      xpPerReel: parseInt(xpPerReel) || 0,
      xpPerScreenshot: parseInt(xpPerScreenshot) || 0,
      xpViewMilestone: parseInt(xpViewMilestone) || 0,
      xpCompletionBonus: parseInt(xpCompletionBonus) || 0,
      completionBadge: completionBadge.trim() || null,
      manualApprovalRequired: false,
      status: "active",
    };
    mutation.mutate(payload);
  };

  const handleClose = () => { onClose(); resetForm(); };

  /* ── STEP CONTENT ── */

  const StepContent = () => {
    if (success) {
      return (
        <div className="space-y-5 text-center">
          {/* Animated tick */}
          <div className="flex flex-col items-center gap-3 pt-2">
            <div className="relative w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: "rgba(184,255,27,0.10)", border: "2px solid rgba(184,255,27,0.30)" }}>
              <div className={`transition-all duration-700 ${showTick ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
                <Check className="w-10 h-10" style={{ color: HUB_NEON }} strokeWidth={3} />
              </div>
              <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ border: `2px solid ${HUB_NEON}` }} />
            </div>
            <h2 className="text-2xl font-black text-white">Campaign Live!</h2>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.50)" }}>
              Your campaign is now live and eligible creators can begin joining immediately.
            </p>
          </div>

          {/* Campaign Summary */}
          <div style={sectionCard} className="text-left space-y-3">
            <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: HUB_NEON }}>Campaign Summary</div>
            <div className="space-y-2">
              {[
                { label: "Campaign", value: createdCampaign?.title || title || "—" },
                { label: "Status", value: (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: HUB_NEON }} />
                    <span className="font-bold" style={{ color: HUB_NEON }}>Live</span>
                  </span>
                )},
                { label: "Creator Capacity", value: `${creatorSlots} Creators` },
                { label: "Duration", value: endDate ? `${Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000)} Days` : "No end date" },
                { label: "Reserved Keys", value: `${demoKeys.length} Demo / ${fullKeys.length} Full` },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between text-sm">
                  <span style={{ color: "rgba(255,255,255,0.40)" }}>{row.label}</span>
                  <span className="font-semibold text-white">{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Live info */}
          <div style={sectionCard} className="text-left">
            <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: HUB_NEON }}>Live Information</div>
            <p className="text-xs mb-2" style={{ color: "rgba(255,255,255,0.50)" }}>Creators can now:</p>
            <ul className="space-y-1.5">
              {["Discover your campaign", "Join instantly (if eligible)", "Receive Demo Keys", "Begin creating content"].map(item => (
                <li key={item} className="flex items-center gap-2 text-xs text-white">
                  <Check className="w-3 h-3 shrink-0" style={{ color: HUB_NEON }} />{item}
                </li>
              ))}
            </ul>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <button type="button" onClick={() => { handleClose(); navigate(`/game/${gameId}/bounties`); }}
              className="flex-1 px-4 py-3 rounded-xl text-xs font-black transition-all hover:brightness-110"
              style={{ background: HUB_NEON, color: "#070b10", boxShadow: "0 8px 24px rgba(184,255,27,0.25)" }}>
              View Live Campaign
            </button>
            <button type="button" onClick={handleClose}
              className="px-4 py-3 rounded-xl text-xs font-bold transition-all hover:bg-white/5"
              style={{ color: "rgba(255,255,255,0.50)", border: `1px solid ${DIALOG_BORDER}` }}>
              Return to Dashboard
            </button>
          </div>
        </div>
      );
    }

    switch (step) {
      case 1:
        return (
          <div className="space-y-3">
            <div className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: HUB_NEON }}>Choose Campaign Type</div>
            {TEMPLATES.map(t => {
              const Icon = t.icon;
              const active = templateSlug === t.slug;
              return (
                <button key={t.slug} type="button" onClick={() => { setTemplateSlug(t.slug); setCreatorSlots(String(t.capacity)); setEndDate(""); }}
                  className="w-full text-left p-4 rounded-xl transition-all hover:brightness-110"
                  style={{
                    background: active ? "rgba(184,255,27,0.08)" : "rgba(255,255,255,0.03)",
                    border: active ? `1px solid rgba(184,255,27,0.35)` : `1px solid ${DIALOG_BORDER}`,
                  }}>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: active ? "rgba(184,255,27,0.15)" : "rgba(255,255,255,0.05)" }}>
                      <Icon className="w-4.5 h-4.5" style={{ color: active ? HUB_NEON : "rgba(255,255,255,0.40)" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{t.name}</span>
                        {t.recommended && <span className="text-[9px] font-black px-1.5 py-0.5 rounded" style={{ background: HUB_NEON, color: "#070b10" }}>RECOMMENDED</span>}
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.40)" }}>{t.desc}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[10px] font-semibold" style={{ color: "rgba(255,255,255,0.35)" }}>{t.duration} Days</span>
                        <span className="text-[10px] font-semibold" style={{ color: "rgba(255,255,255,0.35)" }}>{t.capacity} Creators</span>
                      </div>
                    </div>
                    {active && <Check className="w-5 h-5 shrink-0" style={{ color: HUB_NEON }} />}
                  </div>
                </button>
              );
            })}
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div style={sectionCard}>
              <div className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: HUB_NEON }}>Campaign Settings</div>
              <div className="space-y-3">
                <div>
                  <label style={labelStyle2}>Campaign Title *</label>
                  <input style={inputStyle2} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Early Creator Access" required
                    onFocus={e => e.currentTarget.style.borderColor = "rgba(184,255,27,0.35)"}
                    onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)"} />
                </div>
                <div>
                  <label style={labelStyle2}>Display Name (optional)</label>
                  <input style={inputStyle2} value={campaignTitle} onChange={e => setCampaignTitle(e.target.value)} placeholder="e.g. Creator Week One Challenge"
                    onFocus={e => e.currentTarget.style.borderColor = "rgba(184,255,27,0.35)"}
                    onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)"} />
                </div>
                <div>
                  <label style={labelStyle2}>Description</label>
                  <textarea style={{ ...inputStyle2, minHeight: "72px", resize: "vertical" }} value={description} onChange={e => setDescription(e.target.value)} placeholder="What should creators do to earn rewards?"
                    onFocus={e => e.currentTarget.style.borderColor = "rgba(184,255,27,0.35)"}
                    onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)"} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label style={labelStyle2}>Creator Slots</label>
                    <input style={inputStyle2} type="number" min="1" value={creatorSlots} onChange={e => setCreatorSlots(e.target.value)}
                      onFocus={e => e.currentTarget.style.borderColor = "rgba(184,255,27,0.35)"}
                      onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)"} />
                  </div>
                  <div>
                    <label style={labelStyle2}>End Date</label>
                    <input style={inputStyle2} type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                      onFocus={e => e.currentTarget.style.borderColor = "rgba(184,255,27,0.35)"}
                      onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)"} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div style={sectionCard}>
              <div className="text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: HUB_NEON }}>
                <Key className="w-3.5 h-3.5" /> Demo Keys
              </div>
              <textarea style={{ ...inputStyle2, minHeight: "100px", resize: "vertical", fontFamily: "monospace", fontSize: "13px" }}
                value={demoKeyPool} onChange={e => setDemoKeyPool(e.target.value)} placeholder="ABC-123-DEF&#10;GHI-456-JKL"
                onFocus={e => e.currentTarget.style.borderColor = "rgba(184,255,27,0.35)"}
                onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)"} />
              <div className="flex items-center gap-1.5 mt-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: demoKeys.length ? HUB_NEON : "rgba(255,255,255,0.15)" }} />
                <span className="text-[11px] font-bold" style={{ color: "rgba(255,255,255,0.40)" }}>{demoKeys.length} keys ready</span>
              </div>
            </div>
            <div style={sectionCard}>
              <div className="text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: HUB_NEON }}>
                <Unlock className="w-3.5 h-3.5" /> Full Keys
              </div>
              <textarea style={{ ...inputStyle2, minHeight: "100px", resize: "vertical", fontFamily: "monospace", fontSize: "13px" }}
                value={fullKeyPool} onChange={e => setFullKeyPool(e.target.value)} placeholder="FULL-KEY-001&#10;FULL-KEY-002"
                onFocus={e => e.currentTarget.style.borderColor = "rgba(184,255,27,0.35)"}
                onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)"} />
              <div className="flex items-center gap-1.5 mt-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: fullKeys.length ? HUB_NEON : "rgba(255,255,255,0.15)" }} />
                <span className="text-[11px] font-bold" style={{ color: "rgba(255,255,255,0.40)" }}>{fullKeys.length} keys ready</span>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            {/* Review summary */}
            <div style={sectionCard}>
              <div className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: HUB_NEON }}>Confirm & Launch</div>
              <div className="space-y-2.5">
                {[
                  { label: "Campaign", value: title || "—" },
                  { label: "Type", value: selectedTemplate?.name || "Custom" },
                  { label: "Creators", value: `${creatorSlots} slots` },
                  { label: "Demo Keys", value: `${demoKeys.length} reserved` },
                  { label: "Full Keys", value: `${fullKeys.length} reserved` },
                  { label: "Total XP", value: `${totalXP.toLocaleString()} XP` },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between text-sm">
                    <span style={{ color: "rgba(255,255,255,0.40)" }}>{row.label}</span>
                    <span className="font-semibold text-white">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: "rgba(184,255,27,0.06)", border: "1px solid rgba(184,255,27,0.18)" }}>
              <div className="text-xs font-bold" style={{ color: HUB_NEON }}>Your campaign will go live immediately. No approval required.</div>
            </div>
          </div>
        );

      default: return null;
    }
  };

  /* ── Live preview computed values ── */
  const previewClips = parseInt(requiredClips) || 0;
  const previewReels = parseInt(requiredReels) || 0;
  const previewShots = parseInt(requiredScreenshots) || 0;
  const previewTitle = title.trim() || (gameName ? `${gameName} Creator Campaign` : "Your Campaign Title");
  const previewDesc = description.trim() || "Add a description to tell creators what to do and what they'll earn.";
  const previewDemoCount = demoKeys.length;
  const previewFullCount = fullKeys.length;
  const previewSlots = parseInt(creatorSlots) || 10;

  /* ── Left panel — live card preview ── */
  const PreviewPanel = () => (
    <div className="flex flex-col h-full" style={{ background: "rgba(255,255,255,0.02)", borderRight: `1px solid ${DIALOG_BORDER}` }}>
      {/* Label */}
      <div className="px-5 pt-5 pb-3 flex items-center gap-2" style={{ borderBottom: `1px solid ${DIALOG_BORDER}` }}>
        <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: success ? HUB_NEON : "rgba(255,255,255,0.25)" }} />
        <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: success ? HUB_NEON : "rgba(255,255,255,0.30)" }}>
          {success ? "Live" : "Preview"}
        </span>
      </div>

      {/* Card */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className="rounded-2xl overflow-hidden" style={{ background: HUB_CARD_BG, border: `1px solid ${success ? "rgba(184,255,27,0.35)" : HUB_CARD_BORDER}`, boxShadow: success ? "0 0 32px rgba(184,255,27,0.10)" : "none" }}>
          {/* Hero image */}
          <div className="relative h-44 overflow-hidden">
            {gameImageUrl ? (
              <img src={gameImageUrl} alt={gameName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0d1624 0%, #0a1020 100%)" }}>
                <Gamepad2 size={44} color="rgba(184,255,27,0.10)" />
              </div>
            )}
            <div className="absolute inset-0" style={{ background: "linear-gradient(to top, #0e1520 0%, rgba(14,21,32,0.18) 55%, transparent 100%)" }} />
            <div className="absolute top-3 left-3">
              <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: HUB_NEON, color: "#070b10" }}>
                <ShieldCheck size={9} /> GF Verified
              </span>
            </div>
          </div>

          {/* Body */}
          <div className="px-4 pb-4 pt-3 space-y-3">
            {/* Title + desc */}
            <div>
              <h3 className={`text-base font-black leading-tight tracking-tight ${title.trim() ? "text-white" : ""}`}
                style={{ color: title.trim() ? "white" : "rgba(255,255,255,0.25)" }}>
                {previewTitle}
              </h3>
              <p className="text-[11px] mt-1 line-clamp-2" style={{ color: description.trim() ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.18)" }}>
                {previewDesc}
              </p>
            </div>

            {/* Requirement pills */}
            {(previewClips > 0 || previewReels > 0 || previewShots > 0) ? (
              <div className="flex flex-wrap gap-1.5">
                {previewClips > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg"
                    style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.70)", border: "1px solid rgba(255,255,255,0.09)" }}>
                    <Film size={10} /> ×{previewClips} Clips
                  </span>
                )}
                {previewShots > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg"
                    style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.70)", border: "1px solid rgba(255,255,255,0.09)" }}>
                    <Camera size={10} /> ×{previewShots} Screenshots
                  </span>
                )}
                {previewReels > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg"
                    style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.70)", border: "1px solid rgba(255,255,255,0.09)" }}>
                    <Film size={10} /> ×{previewReels} Reels
                  </span>
                )}
              </div>
            ) : (
              <div className="flex gap-1.5">
                {["Clips", "Screenshots", "Reels"].map(l => (
                  <span key={l} className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-lg"
                    style={{ background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    ×0 {l}
                  </span>
                ))}
              </div>
            )}

            {/* Keys / slots row */}
            <div className="flex items-center gap-3 text-[11px]">
              {previewDemoCount > 0 ? (
                <span className="font-bold" style={{ color: HUB_NEON }}>{previewDemoCount} / {previewDemoCount} demo keys</span>
              ) : (
                <span style={{ color: "rgba(255,255,255,0.20)" }}>0 demo keys</span>
              )}
              <span className="flex items-center gap-1" style={{ color: "rgba(255,255,255,0.30)" }}>
                <Users size={10} /> {previewSlots}
              </span>
            </div>

            {/* Reward grid */}
            <div className="grid grid-cols-4 gap-1">
              {[
                { src: "/icons/demo-key-icon.png", label: "Demo Key", sub: "IMMEDIATE", value: previewDemoCount > 0 ? String(previewDemoCount) : "—", active: previewDemoCount > 0 },
                { src: "/icons/full-game-icon.png", label: "Full Game", sub: "REWARD", value: previewFullCount > 0 ? String(previewFullCount) : "—", active: previewFullCount > 0 },
                { icon: <Zap size={32} color={totalXP > 0 ? HUB_NEON : "rgba(255,255,255,0.15)"} />, label: "XP", sub: "PROGRESS", value: totalXP > 0 ? totalXP.toLocaleString() : "—", active: totalXP > 0 },
                { src: "/icons/token-icon.png", label: "GFT", sub: "BONUS", value: "—", active: false },
              ].map(col => (
                <div key={col.label} className="flex flex-col items-center gap-1 py-2.5 rounded-xl"
                  style={{ background: col.active ? "rgba(184,255,27,0.07)" : "rgba(255,255,255,0.04)", border: `1px solid ${col.active ? "rgba(184,255,27,0.20)" : "rgba(255,255,255,0.07)"}` }}>
                  <div className="w-8 h-8 flex items-center justify-center">
                    {col.src ? <img src={col.src} alt={col.label} className="w-8 h-8 object-contain" /> : col.icon}
                  </div>
                  <span className="text-[10px] font-black" style={{ color: col.active ? HUB_NEON : "rgba(255,255,255,0.85)" }}>{col.value}</span>
                  <span className="text-[8px] font-bold" style={{ color: "rgba(255,255,255,0.35)" }}>{col.label}</span>
                  <span className="text-[7px] uppercase tracking-wider" style={{ color: col.active ? "rgba(184,255,27,0.55)" : "rgba(255,255,255,0.18)" }}>{col.sub}</span>
                </div>
              ))}
            </div>

            {/* CTA preview */}
            <div className="w-full py-2.5 rounded-xl text-sm font-black tracking-wide flex items-center justify-center gap-2"
              style={{ background: HUB_NEON, color: "#070b10" }}>
              <ShieldCheck size={14} /> Accept Mission
            </div>
          </div>
        </div>

        {/* Helper text */}
        {!success && (
          <p className="text-[10px] text-center mt-3" style={{ color: "rgba(255,255,255,0.18)" }}>
            Updates as you fill in the form
          </p>
        )}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent ref={dialogRef as any} className="p-0 border-0 overflow-hidden"
        style={{ background: DIALOG_BG, maxWidth: "900px", width: "95vw", maxHeight: "90vh" }}>
        <div className="flex" style={{ height: "min(650px, 90vh)" }}>

          {/* ── Left: live preview ── */}
          <div className="w-[360px] shrink-0 flex flex-col overflow-hidden">
            <PreviewPanel />
          </div>

          {/* ── Right: form wizard ── */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Header */}
            <div className="px-6 pt-5 pb-4 shrink-0" style={{ borderBottom: `1px solid ${DIALOG_BORDER}` }}>
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(184,255,27,0.12)", border: "1px solid rgba(184,255,27,0.25)" }}>
                  <Sword className="w-3.5 h-3.5" style={{ color: HUB_NEON }} />
                </div>
                <DialogTitle className="text-white font-black text-base tracking-tight">
                  {success ? "Campaign Launched" : "Launch Campaign"}
                </DialogTitle>
              </div>
              <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                {success ? "Your campaign is live and ready for creators." : "Choose a template, add keys, and launch instantly."}
              </p>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Step indicator */}
              {!success && (
                <div className="flex items-center gap-0">
                  {steps.map((s, i) => {
                    const active = step === s.num;
                    const done = step > s.num;
                    const isLast = i === steps.length - 1;
                    return (
                      <div key={s.num} className="flex items-center flex-1">
                        <button type="button" onClick={() => setStep(s.num)}
                          className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all"
                            style={{
                              background: active ? HUB_NEON : done ? "rgba(184,255,27,0.15)" : "rgba(255,255,255,0.06)",
                              color: active ? "#070b10" : done ? HUB_NEON : "rgba(255,255,255,0.35)",
                              border: active ? "none" : done ? "1px solid rgba(184,255,27,0.30)" : "1px solid rgba(255,255,255,0.12)",
                            }}>
                            {done ? <Check className="w-3.5 h-3.5" /> : s.num}
                          </div>
                          <span className="text-[9px] font-bold uppercase tracking-wider truncate"
                            style={{ color: active ? HUB_NEON : done ? "rgba(184,255,27,0.70)" : "rgba(255,255,255,0.30)" }}>
                            {s.label}
                          </span>
                        </button>
                        {!isLast && (
                          <div className="w-6 h-px flex-shrink-0 mx-1"
                            style={{ background: step > s.num ? HUB_NEON : "rgba(255,255,255,0.10)" }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <form onSubmit={handleLaunch} id="launch-form">
                <StepContent />
              </form>
            </div>

            {/* Footer */}
            {!success && (
              <div className="px-6 py-4 shrink-0 flex items-center gap-3" style={{ borderTop: `1px solid ${DIALOG_BORDER}` }}>
                {step > 1 ? (
                  <button type="button" onClick={() => setStep(s => s - 1)}
                    className="px-4 py-2 rounded-xl text-xs font-bold transition-all hover:bg-white/5"
                    style={{ color: "rgba(255,255,255,0.50)", border: `1px solid ${DIALOG_BORDER}` }}>
                    Back
                  </button>
                ) : (
                  <button type="button" onClick={handleClose}
                    className="px-4 py-2 rounded-xl text-xs font-bold transition-all hover:bg-white/5"
                    style={{ color: "rgba(255,255,255,0.50)", border: `1px solid ${DIALOG_BORDER}` }}>
                    Cancel
                  </button>
                )}
                <div className="flex-1" />
                {step < 4 ? (
                  <button type="button" onClick={() => setStep(s => s + 1)}
                    disabled={step === 1 && !templateSlug}
                    className="px-5 py-2 rounded-xl text-xs font-black transition-all hover:brightness-110 disabled:opacity-30"
                    style={{ background: "rgba(255,255,255,0.08)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)" }}>
                    Next →
                  </button>
                ) : (
                  <button type="submit" form="launch-form" disabled={mutation.isPending || !title.trim()}
                    className="px-5 py-2 rounded-xl text-xs font-black transition-all hover:brightness-110 disabled:opacity-40 flex items-center gap-2"
                    style={{ background: HUB_NEON, color: "#070b10", boxShadow: "0 8px 24px rgba(184,255,27,0.25)" }}>
                    {mutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Rocket className="w-3.5 h-3.5" />}
                    Launch Campaign
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ───────────────────────────────────────────────────────────────
   INDIE GAME PROFILE PAGE
   ─────────────────────────────────────────────────────────────── */

interface IndieGameMeta {
  developerName: string;
  description: string;
  developerDescription: string;
  releaseDate: string;
  genres: string[];
  platforms: string[];
  features: string[];
  website: string;
  discordUrl: string;
  steamUrl: string;
  verifiedDeveloper: boolean;
  trailerUrl?: string;
  followers: number;
  publisher?: string;
}

const IndieGamePage = () => {
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/indie-games/:slug");
  const gameSlug = params?.slug;
  const isMobile = useMobile();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [timePeriod, setTimePeriod] = useState<"recent" | "1w" | "1m" | "ever">("recent");
  const [selectedUserId, setSelectedUserId] = useState("all");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showCreateBounty, setShowCreateBounty] = useState(false);
  const [mobileViewerOpen, setMobileViewerOpen] = useState(false);
  const [mobileViewerIndex, setMobileViewerIndex] = useState(0);
  const [mobileViewerClipId, setMobileViewerClipId] = useState<number | null>(null);
  const [selectedScreenshot, setSelectedScreenshot] = useState<any>(null);
  const [acceptingBountyId, setAcceptingBountyId] = useState<number | null>(null);
  const [acceptedBounties, setAcceptedBounties] = useState<Set<number>>(new Set());
  const [showCreatorDashboard, setShowCreatorDashboard] = useState(false);
  const [showDeveloperDashboard, setShowDeveloperDashboard] = useState(false);
  const [selectedBountyId, setSelectedBountyId] = useState<number | null>(null);

  const { data: game, isLoading: gameLoading } = useQuery<Game & { indieMeta?: IndieGameMeta }>({
    queryKey: ["/api/games/slug", gameSlug],
    queryFn: async () => {
      const r = await fetch(`/api/games/slug/${gameSlug}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to fetch game");
      return r.json();
    },
    enabled: !!gameSlug,
  });

  // Fetch the developer's Indie Game Profile for enriched public data
  const { data: indieProfileData } = useQuery<{ profile: any; user: any } | null>({
    queryKey: ["/api/games/indie", gameSlug],
    queryFn: async () => {
      if (!gameSlug) return null;
      const r = await fetch(`/api/games/indie/${gameSlug}`, { credentials: "include" });
      if (!r.ok) return null;
      return r.json();
    },
    enabled: !!gameSlug,
  });

  const { data: clips } = useQuery<ClipWithUser[]>({
    queryKey: ["/api/games", game?.id, "clips"],
    queryFn: async () => {
      const r = await fetch(`/api/games/${game?.id}/clips`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to fetch clips");
      return r.json();
    },
    enabled: !!game?.id,
  });

  const { data: trendingClips, isLoading: isLoadingClips } = useQuery<ClipWithUser[]>({
    queryKey: ["/api/clips/trending", timePeriod, game?.id],
    queryFn: async () => {
      const p = new URLSearchParams({ period: timePeriod, limit: "20", gameId: game?.id?.toString() || "" });
      const r = await fetch(`/api/clips/trending?${p}`);
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    enabled: activeTab === "clips" && !!game?.id,
  });

  const { data: trendingReels, isLoading: isLoadingReels } = useQuery<ClipWithUser[]>({
    queryKey: ["/api/reels/trending", timePeriod, game?.id],
    queryFn: async () => {
      const p = new URLSearchParams({ period: timePeriod, limit: "20", gameId: game?.id?.toString() || "" });
      const r = await fetch(`/api/reels/trending?${p}`);
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    enabled: activeTab === "reels" && !!game?.id,
  });

  const { data: allScreenshots, isLoading: isLoadingScreenshots } = useQuery<any[]>({
    queryKey: ["/api/games", game?.id, "screenshots"],
    queryFn: async () => {
      const r = await fetch(`/api/games/${game?.id}/screenshots`, { credentials: "include" });
      if (!r.ok) return [];
      return r.json();
    },
    enabled: activeTab === "screenshots" && !!game?.id,
  });

  const { data: bounties = [], isLoading: bountiesLoading } = useQuery<(GameBounty & { participantCount?: number })[]>({
    queryKey: ["/api/games", game?.id, "bounties"],
    queryFn: async () => {
      const r = await fetch(`/api/games/${game?.id}/bounties`, { credentials: "include" });
      if (!r.ok) return [];
      return r.json();
    },
    enabled: !!game?.id,
  });

  const { data: bountyStats } = useQuery({
    queryKey: ["/api/games", game?.id, "bounty-stats"],
    queryFn: async () => {
      const r = await fetch(`/api/games/${game?.id}/bounty-stats`, { credentials: "include" });
      if (!r.ok) return { activeBounties: 0, creatorsJoined: 0, keysAvailable: 0 };
      return r.json();
    },
    enabled: !!game?.id,
  });

  // Batch-fetch the current user's join/progress status for all bounties in this game
  const { data: myBountyStatuses = {} } = useQuery<Record<number, {
    bountyId: number; status: string; demoKey: string | null; fullKey: string | null;
    progressPercent: number; xpEarned: number;
  }>>({
    queryKey: ["/api/games", game?.id, "bounties/my-statuses"],
    queryFn: async () => {
      const r = await fetch(`/api/games/${game?.id}/bounties/my-statuses`, { credentials: "include" });
      if (!r.ok) return {};
      return r.json();
    },
    enabled: !!game?.id && !!user,
  });

  const joinMutation = useMutation({
    mutationFn: (bountyId: number) => apiRequest("POST", `/api/games/bounties/${bountyId}/join`, {}),
    onSuccess: (data: any, bountyId) => {
      setAcceptedBounties(prev => new Set([...prev, bountyId]));
      setAcceptingBountyId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/games", game?.id, "bounties"] });
      queryClient.invalidateQueries({ queryKey: ["/api/games", game?.id, "bounty-stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/games", game?.id, "bounties/my-statuses"] });
      toast({
        title: "Campaign joined!",
        description: data.demoKey ? "Demo key assigned. Create content and unlock the full game!" : "Welcome to the campaign!",
        variant: "gamefolioSuccess",
      });
    },
    onError: (err: any) => {
      setAcceptingBountyId(null);
      toast({ title: "Error", description: err.message || "Could not join campaign.", variant: "gamefolioError" });
    },
  });

  const handleJoinCampaign = (bountyId: number) => {
    if (!user) { toast({ title: "Sign in required", description: "Sign in to join campaigns.", variant: "gamefolioError" }); return; }
    setAcceptingBountyId(bountyId);
    joinMutation.mutate(bountyId);
  };

  const handleViewDashboard = (bountyId: number) => {
    setSelectedBountyId(bountyId);
    setShowCreatorDashboard(true);
  };

  const handleViewDevDashboard = (bountyId: number) => {
    setSelectedBountyId(bountyId);
    setShowDeveloperDashboard(true);
  };

  const allClips = useMemo(() => clips ?? [], [clips]);
  const clipData = useMemo(() => {
    const src = (trendingClips?.length ? trendingClips : allClips).filter((c: any) => !c.videoType || c.videoType === "clip");
    if (selectedUserId === "all") return src;
    return src.filter((c: any) => c.user?.id === parseInt(selectedUserId));
  }, [trendingClips, allClips, selectedUserId]);

  const reelData = useMemo(() => {
    const src = (trendingReels?.length ? trendingReels : allClips).filter((c: any) => c.videoType === "reel");
    if (selectedUserId === "all") return src;
    return src.filter((c: any) => c.user?.id === parseInt(selectedUserId));
  }, [trendingReels, allClips, selectedUserId]);

  const uniqueCreators = useMemo(() => {
    const map = new Map<number, any>();
    [...allClips].forEach((item: any) => {
      if (item.user?.id && !map.has(item.user.id)) map.set(item.user.id, { ...item.user, uploadCount: 0 });
      if (item.user?.id) map.get(item.user.id).uploadCount++;
    });
    return Array.from(map.values()).sort((a, b) => b.uploadCount - a.uploadCount);
  }, [allClips]);

  const totalViews = useMemo(() => allClips.reduce((acc: number, c: any) => acc + (c.views || 0), 0), [allClips]);

  const canCreateBounty = !!user && (user.isAdmin || (user as any).userType === "indie" || (user as any).userType === "indie_developer");

  const handleOpenUpload = () => {
    if (game) {
      sessionStorage.setItem('uploadGameId', game.id.toString());
      sessionStorage.setItem('uploadGameName', game.name);
      sessionStorage.setItem('uploadGameImage', game.imageUrl || '');
    }
    setShowUploadDialog(true);
  };

  const handleUploadClose = () => {
    setShowUploadDialog(false);
    sessionStorage.removeItem('uploadGameId');
    sessionStorage.removeItem('uploadGameName');
    sessionStorage.removeItem('uploadGameImage');
    if (game?.id) {
      queryClient.invalidateQueries({ queryKey: ["/api/games", game.id, "clips"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clips/trending", timePeriod, game.id] });
    }
  };

  // Merge indie game profile data (from store integration) into meta, giving profile data priority
  const igp = indieProfileData?.profile ?? null;
  const meta: IndieGameMeta = {
    developerName: igp?.studioName ?? game?.indieMeta?.developerName ?? "Indie Developer",
    description: igp?.fullDescription ?? igp?.shortDescription ?? game?.indieMeta?.description ?? "An exciting indie game featured on Gamefolio.",
    developerDescription: game?.indieMeta?.developerDescription ?? "A passionate indie developer creating unique gaming experiences.",
    releaseDate: igp?.releaseDate ?? game?.indieMeta?.releaseDate ?? "TBA",
    genres: (igp?.genres?.length ? igp.genres : game?.indieMeta?.genres) ?? ["Indie"],
    platforms: (igp?.platforms?.length ? igp.platforms : game?.indieMeta?.platforms) ?? ["pc"],
    features: (igp?.keyFeatures?.length ? igp.keyFeatures : game?.indieMeta?.features) ?? [],
    website: igp?.websiteUrl ?? game?.indieMeta?.website ?? "",
    discordUrl: igp?.discordUrl ?? game?.indieMeta?.discordUrl ?? "",
    steamUrl: igp?.steamUrl ?? game?.indieMeta?.steamUrl ?? "",
    verifiedDeveloper: game?.indieMeta?.verifiedDeveloper ?? false,
    trailerUrl: igp?.trailerUrl ?? game?.indieMeta?.trailerUrl,
    followers: game?.indieMeta?.followers ?? 0,
    publisher: game?.indieMeta?.publisher ?? "Indie",
  };

  if (!match || !gameSlug) return <div className="p-8 text-center text-gray-400">Indie game not found</div>;

  if (gameLoading) {
    return (
      <div className="min-h-screen" style={{ background: "#0B1319" }}>
        <div className="h-72 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #0B1319 0%, #1a0b30 50%, #0d1f2d 100%)" }}>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <Skeleton className="h-20 w-20 rounded-2xl" />
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-4 w-40" />
            <div className="flex gap-3"><Skeleton className="h-10 w-32 rounded-lg" /><Skeleton className="h-10 w-28 rounded-lg" /></div>
          </div>
        </div>
        <div className="px-6 py-8 space-y-6 max-w-6xl mx-auto">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
          <Skeleton className="h-10 w-full rounded-none" />
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="py-6 px-4 sm:px-6">
        <button onClick={() => navigate("/explore")} className="flex items-center gap-1 text-sm text-gray-400 hover:text-white mb-6">
          <ArrowLeft className="w-4 h-4" />Back to Explore
        </button>
        <div className="text-center py-16">
          <h1 className="text-2xl font-bold mb-2">Indie game not found</h1>
          <p className="text-gray-400">The indie game you're looking for doesn't exist yet.</p>
        </div>
      </div>
    );
  }

  const periodButtons = (["recent", "1w", "1m", "ever"] as const).map(p => ({
    id: p, label: p === "recent" ? (isMobile ? "New" : "Recent") : p === "ever" ? "All Time" : p.toUpperCase()
  }));

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes igp-scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(200vh); }
        }
        @keyframes igp-flowDash {
          to { stroke-dashoffset: -20; }
        }
        @keyframes igp-pulseGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(193,255,0,0.15), 0 4px 30px rgba(0,0,0,0.3); }
          50% { box-shadow: 0 0 40px rgba(193,255,0,0.35), 0 4px 30px rgba(0,0,0,0.3); }
        }
        .igp-scan-container { position: relative; overflow: hidden; }
        .igp-scanline {
          position: absolute; top: 0; left: 0; width: 100%; height: 12px;
          background: linear-gradient(to bottom, transparent, rgba(193,255,0,0.25), transparent);
          animation: igp-scanline 10s linear infinite;
          pointer-events: none; z-index: 5;
        }
        .igp-flow-line {
          stroke: rgba(193,255,0,0.45);
          stroke-width: 2;
          stroke-dasharray: 6 4;
          animation: igp-flowDash 1.2s linear infinite;
        }
        .igp-dev-card { animation: igp-pulseGlow 4s ease-in-out infinite; }
        .igp-tab-btn { position: relative; transition: color 0.2s; }
        .igp-tab-active-bar {
          position: absolute; bottom: 0; left: 0; right: 0; height: 2px;
          border-radius: 9999px;
          background: #C1FF00;
          box-shadow: 0 0 10px rgba(193,255,0,0.8);
        }
      `}} />

      {isMobile && mobileViewerOpen && clipData.length > 0 && (
        activeTab === "clips" ? (
          <MobileClipsViewerOverlay
            clips={clipData as ClipWithUser[]}
            startClipId={mobileViewerClipId ?? (clipData as ClipWithUser[])[mobileViewerIndex]?.id ?? 0}
            onBack={() => setMobileViewerOpen(false)}
          />
        ) : (
          <MobileTrendingViewer
            content={reelData as ClipWithUser[]}
            initialIndex={mobileViewerIndex}
            onClose={() => setMobileViewerOpen(false)}
          />
        )
      )}

      {/* ── CINEMATIC HERO ── */}
      <section
        className="igp-scan-container relative w-full border-b border-white/5"
        style={{ background: "linear-gradient(135deg, #0B1319 0%, #1a0b30 55%, #0d1f2d 100%)", minHeight: isMobile ? "420px" : "480px" }}
      >
        <div className="igp-scanline" />

        {/* Background art with overlay */}
        {game.imageUrl && (
          <div className="absolute inset-0">
            <img src={game.imageUrl} alt="" className="w-full h-full object-cover" style={{ opacity: 0.08 }} />
          </div>
        )}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_60%,rgba(34,211,238,0.12)_0%,transparent_55%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,rgba(139,92,246,0.1)_0%,transparent_50%)] pointer-events-none" />

        {/* Back button */}
        <button
          onClick={() => navigate("/explore")}
          className="absolute top-4 left-4 z-20 flex items-center gap-1.5 text-xs font-bold text-white/50 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center text-center px-6 pt-16 pb-16">
          {/* Genre tags */}
          <div className="flex gap-2 mb-5 flex-wrap justify-center">
            {meta.genres.map(g => (
              <span key={g} className="px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full"
                style={{ background: "rgba(193,255,0,0.1)", color: NEON, border: "1px solid rgba(193,255,0,0.3)" }}>
                {g}
              </span>
            ))}
          </div>

          {/* Game art icon */}
          <div className="mb-5 flex-shrink-0"
            style={{
              width: isMobile ? "80px" : "100px", height: isMobile ? "80px" : "100px",
              borderRadius: "20px",
              border: "2px solid rgba(193,255,0,0.4)",
              boxShadow: "0 0 40px rgba(193,255,0,0.2), 0 12px 40px rgba(0,0,0,0.5)",
              overflow: "hidden",
            }}>
            <img
              src={game.imageUrl || `https://placehold.co/200x200/0B1218/333?text=${encodeURIComponent(game.name.charAt(0))}`}
              alt={game.name}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Title */}
          <h1
            className={`font-black tracking-tighter text-white mb-3 leading-none ${isMobile ? "text-4xl" : "text-6xl md:text-7xl"}`}
            style={{ textShadow: "0 0 40px rgba(255,255,255,0.2)" }}
          >
            {game.name.toUpperCase()}
          </h1>

          {/* Dev + status badge */}
          <div className="flex items-center gap-3 mb-8 flex-wrap justify-center">
            {indieProfileData?.user?.username ? (
              <a
                href={`/studio/${indieProfileData.user.username}`}
                className="text-sm font-semibold text-white/60 hover:text-white transition-colors underline-offset-2 hover:underline"
              >
                {meta.developerName}
              </a>
            ) : (
              <span className="text-sm font-semibold text-white/60">{meta.developerName}</span>
            )}
            <span className="w-1 h-1 rounded-full bg-white/30" />
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md"
              style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.12)" }}>
              <Sword className="w-3.5 h-3.5" style={{ color: NEON }} />
              <span className="text-xs font-black tracking-widest text-white/90">INDIE GAME</span>
            </div>
            {meta.verifiedDeveloper && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md"
                style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.3)" }}>
                <Check className="w-3 h-3 text-blue-400" />
                <span className="text-xs font-black tracking-widest text-blue-400">VERIFIED DEV</span>
              </div>
            )}
          </div>

          {/* Inline stats row (like regular gamefolio) */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            <span className="flex items-center gap-1.5 text-xs font-bold text-white/60">
              <Users className="w-3.5 h-3.5" style={{ color: NEON }} />
              {meta.followers.toLocaleString()} followers
            </span>
            <span className="flex items-center gap-1.5 text-xs font-bold text-white/60">
              <Users className="w-3.5 h-3.5" style={{ color: NEON }} />
              {uniqueCreators.length} creators
            </span>
            <span className="flex items-center gap-1.5 text-xs font-bold text-white/60">
              <Eye className="w-3.5 h-3.5" style={{ color: NEON }} />
              {totalViews.toLocaleString()} views
            </span>
            <span className="flex items-center gap-1.5 text-xs font-bold text-white/60">
              <Radio className="w-3.5 h-3.5" style={{ color: NEON }} />
              {0} streams
            </span>
            {meta.website && (
              <button
                onClick={() => openExternal(meta.website)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white/70 transition-all hover:bg-white/5 border border-white/10">
                <Globe className="w-3.5 h-3.5" />
                Website
              </button>
            )}
            {meta.discordUrl && (
              <button
                onClick={() => openExternal(meta.discordUrl)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white/70 transition-all hover:bg-white/5 border border-white/10">
                <Users className="w-3.5 h-3.5" />
                Discord
              </button>
            )}
            <button
              onClick={handleOpenUpload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:bg-white/5"
              style={{ background: "rgba(193,255,0,0.1)", border: "1px solid rgba(193,255,0,0.25)", color: NEON }}>
              <Upload className="w-3.5 h-3.5" />
              Upload
            </button>
          </div>
        </div>
      </section>

      {/* ── STICKY TAB NAV ── */}
      <nav className="sticky top-0 z-40 border-b border-[var(--gf-border)] bg-[var(--gf-surface-1)]">
        <div className="flex overflow-x-auto scrollbar-none px-2">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="igp-tab-btn flex items-center gap-1.5 px-4 sm:px-6 py-4 text-xs font-black tracking-widest uppercase whitespace-nowrap flex-shrink-0 transition-colors"
                style={{ color: isActive ? "#fff" : "rgba(255,255,255,0.4)" }}
              >
                <Icon className="w-3.5 h-3.5" style={{ color: isActive ? NEON : "rgba(255,255,255,0.35)" }} />
                {tab.label}
                {isActive && <div className="igp-tab-active-bar" />}
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── TAB CONTENT ── */}
      <div className="pb-24">

        {/* ──── OVERVIEW ──── */}
        {activeTab === "overview" && (
          <div className="py-8">
            {/* Main 2-col layout */}
            <div className="px-4 sm:px-6 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">

              {/* Left: About + Features + Screenshots + Trailer */}
              <div className="lg:col-span-2 space-y-8">

                {/* Trailer + Media Showcase */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-black text-white">Trailer & Artwork</h2>
                    <button onClick={() => setActiveTab("screenshots")}
                      className="text-xs font-bold flex items-center gap-1 transition-opacity hover:opacity-70"
                      style={{ color: NEON }}>
                      View all <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Main trailer or game art */}
                  <div className="rounded-2xl overflow-hidden aspect-video mb-4 relative group cursor-pointer"
                    style={{ border: `1px solid ${CARD_BORDER}`, boxShadow: "0 0 40px rgba(0,0,0,0.3)" }}
                    onClick={() => setSelectedScreenshot({ id: 0, imageUrl: game.imageUrl || "https://placehold.co/1280x720/0B1218/333?text=Game+Artwork", title: `${game.name} Artwork` })}>
                    {meta.trailerUrl ? (
                      <iframe src={meta.trailerUrl} className="w-full h-full" allowFullScreen title={`${game.name} Trailer`} />
                    ) : (
                      <>
                        <img
                          src={game.imageUrl || "https://placehold.co/1280x720/0B1218/333?text=Game+Artwork"}
                          alt="Game artwork"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                          <div className="w-16 h-16 rounded-full flex items-center justify-center"
                            style={{ background: "rgba(0,0,0,0.5)", border: "2px solid rgba(255,255,255,0.3)" }}>
                            <Play className="w-7 h-7 text-white ml-1" fill="white" />
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Artwork thumbnail strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {/* Artwork 1 */}
                    <div className="aspect-video rounded-xl overflow-hidden cursor-pointer group relative"
                      style={{ border: `1px solid ${CARD_BORDER}` }}
                      onClick={() => setSelectedScreenshot({ id: 1, imageUrl: game.imageUrl || "https://placehold.co/400x225/0B1218/333?text=Artwork+1", title: `Artwork 1` })}>
                      <img src={game.imageUrl || "https://placehold.co/400x225/0B1218/333?text=Artwork+1"}
                        alt="Artwork 1" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
                    </div>
                    {/* Artwork 2 */}
                    <div className="aspect-video rounded-xl overflow-hidden cursor-pointer group relative"
                      style={{ border: `1px solid ${CARD_BORDER}` }}
                      onClick={() => setSelectedScreenshot({ id: 2, imageUrl: game.imageUrl || "https://placehold.co/400x225/0B1218/333?text=Artwork+2", title: `Artwork 2` })}>
                      <img src={game.imageUrl || "https://placehold.co/400x225/0B1218/333?text=Artwork+2"}
                        alt="Artwork 2" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
                    </div>
                    {/* Artwork 3 */}
                    <div className="aspect-video rounded-xl overflow-hidden cursor-pointer group relative"
                      style={{ border: `1px solid ${CARD_BORDER}` }}
                      onClick={() => setSelectedScreenshot({ id: 3, imageUrl: game.imageUrl || "https://placehold.co/400x225/0B1218/333?text=Artwork+3", title: `Artwork 3` })}>
                      <img src={game.imageUrl || "https://placehold.co/400x225/0B1218/333?text=Artwork+3"}
                        alt="Artwork 3" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
                    </div>
                    {/* View all */}
                    <button
                      onClick={() => setActiveTab("screenshots")}
                      className="aspect-video rounded-xl overflow-hidden group relative flex items-center justify-center"
                      style={{ background: "rgba(193,255,0,0.05)", border: `1px solid ${CARD_BORDER}` }}>
                      <div className="text-center">
                        <ChevronRight className="w-6 h-6 mx-auto mb-1" style={{ color: NEON }} />
                        <span className="text-xs font-bold" style={{ color: NEON }}>View All</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Recent Clips preview */}
                {clipData.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-black text-white">Recent Clips</h2>
                      <button onClick={() => setActiveTab("clips")}
                        className="text-xs font-bold flex items-center gap-1 transition-opacity hover:opacity-70"
                        style={{ color: NEON }}>
                        View all <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {(clipData as ClipWithUser[]).slice(0, 3).map(clip => (
                        <VideoClipGridItem key={clip.id} clip={clip} userId={user?.id} compact={false}
                          clipsList={clipData as ClipWithUser[]}
                          onCardClick={isMobile ? (id) => {
                            const idx = clipData.findIndex((c: any) => c.id === id);
                            setMobileViewerIndex(idx >= 0 ? idx : 0);
                            setMobileViewerClipId(id);
                            setMobileViewerOpen(true);
                          } : undefined} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Reels preview */}
                {reelData.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-black text-white">Recent Reels</h2>
                      <button onClick={() => setActiveTab("reels")}
                        className="text-xs font-bold flex items-center gap-1 transition-opacity hover:opacity-70"
                        style={{ color: NEON }}>
                        View all <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {(reelData as ClipWithUser[]).slice(0, 4).map(reel => (
                        <VideoClipGridItem key={reel.id} clip={reel} userId={user?.id} compact={false} reelsList={reelData} />
                      ))}
                    </div>
                  </div>
                )}

                {/* About */}
                <div>
                  <h2 className="text-xl font-black text-white mb-4">About The Game</h2>
                  <div className="rounded-2xl p-6" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
                    <p className="text-sm text-gray-300 leading-relaxed">{meta.description}</p>
                  </div>
                </div>

                {/* Features */}
                <div>
                  <h2 className="text-xl font-black text-white mb-4">Key Features</h2>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {(meta.features.length > 0 ? meta.features : ["Singleplayer", "Co-op", "Multiplayer", "PvP", "Open World", "Crafting"]).map(f => (
                      <div key={f} className="flex items-start gap-3 p-4 rounded-xl"
                        style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
                        <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: NEON }} />
                        <span className="text-sm font-medium text-white/90">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Platforms */}
                <div>
                  <h2 className="text-xl font-black text-white mb-4">Available Platforms</h2>
                  <div className="flex flex-wrap gap-3">
                    {meta.platforms.map(p => <PlatformIcon key={p} platform={p} />)}
                    {meta.platforms.length === 0 && <PlatformIcon platform="pc" />}
                  </div>
                </div>

                {/* Community stats */}
                <div>
                  <h2 className="text-xl font-black text-white mb-4">Community Activity</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatCard value={totalViews.toLocaleString()} label="Total Views" icon={Eye} />
                    <StatCard value={allClips.filter((c: any) => !c.videoType || c.videoType === "clip").length} label="Clips" icon={Play} />
                    <StatCard value={allClips.filter((c: any) => c.videoType === "reel").length} label="Reels" icon={Video} />
                    <StatCard value={uniqueCreators.length} label="Creators" icon={Users} />
                  </div>
                </div>
              </div>

              {/* Right sidebar: Dev card + Game info + Store links */}
              <div className="space-y-5">

                {/* Developer card */}
                <div className="igp-dev-card rounded-2xl p-6 space-y-5"
                  style={{ background: CARD_BG, border: `1px solid rgba(193,255,0,0.18)` }}>
                  <div>
                    <div className="text-[9px] uppercase tracking-widest font-bold text-white/40 mb-1">Developer</div>
                    <div className="text-lg font-black text-white flex items-center gap-2">
                      <Sword className="w-4 h-4 flex-shrink-0" style={{ color: NEON }} />
                      {meta.developerName}
                    </div>
                    {meta.publisher && meta.publisher !== meta.developerName && (
                      <div className="text-xs text-white/40 mt-1">Published by {meta.publisher}</div>
                    )}
                  </div>

                  {meta.developerDescription && (
                    <p className="text-xs text-white/60 leading-relaxed">{meta.developerDescription}</p>
                  )}

                  <div className="h-px" style={{ background: "rgba(255,255,255,0.07)" }} />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[9px] uppercase tracking-widest font-bold text-white/40 mb-1">Release Date</div>
                      <div className="text-sm font-bold text-white">{meta.releaseDate || "TBA"}</div>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase tracking-widest font-bold text-white/40 mb-1">Genre</div>
                      <div className="text-sm font-bold text-white">{meta.genres[0] || "Indie"}</div>
                    </div>
                  </div>
                </div>

                {/* Game info card */}
                <div className="rounded-2xl p-5" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
                  <h3 className="text-[9px] uppercase tracking-widest font-bold text-white/40 mb-3">Game Info</h3>
                  <InfoRow label="Genres" value={meta.genres.join(", ")} />
                  <InfoRow label="Platforms" value={meta.platforms.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(", ")} />
                  {meta.releaseDate && <InfoRow label="Release" value={meta.releaseDate} />}
                </div>

                {/* Store links */}
                {(meta.steamUrl || meta.discordUrl || meta.website) && (
                  <div className="rounded-2xl p-5 space-y-3" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
                    <h3 className="text-[9px] uppercase tracking-widest font-bold text-white/40 mb-1">Links</h3>
                    {meta.steamUrl && (
                      <button
                        onClick={() => openExternal(meta.steamUrl)}
                        className="w-full flex items-center justify-between p-3 rounded-xl transition-colors group"
                        style={{ background: "#171a21", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div className="flex items-center gap-3">
                          <Gamepad2 className="w-5 h-5 text-[#66c0f4]" />
                          <span className="font-bold text-sm text-[#c7d5e0]">Steam</span>
                        </div>
                        <Globe className="w-4 h-4 text-white/20 group-hover:text-white/60 transition-colors" />
                      </button>
                    )}
                    {meta.discordUrl && (
                      <button
                        onClick={() => openExternal(meta.discordUrl)}
                        className="w-full flex items-center justify-between p-3 rounded-xl transition-colors group"
                        style={{ background: "#1e2124", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div className="flex items-center gap-3">
                          <Users className="w-5 h-5 text-[#5865F2]" />
                          <span className="font-bold text-sm text-white/80">Discord</span>
                        </div>
                        <Globe className="w-4 h-4 text-white/20 group-hover:text-white/60 transition-colors" />
                      </button>
                    )}
                    {meta.website && (
                      <button
                        onClick={() => openExternal(meta.website)}
                        className="w-full flex items-center justify-between p-3 rounded-xl transition-colors group"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div className="flex items-center gap-3">
                          <Globe className="w-5 h-5 text-white/60" />
                          <span className="font-bold text-sm text-white/80">Official Website</span>
                        </div>
                        <Globe className="w-4 h-4 text-white/20 group-hover:text-white/60 transition-colors" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Why Gamefolio section */}
            <div className="relative mt-16 py-16 overflow-hidden" style={{ background: "rgba(193,255,0,0.018)" }}>
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[rgba(193,255,0,0.25)] to-transparent" />
              <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[rgba(193,255,0,0.25)] to-transparent" />

              <div className="max-w-4xl mx-auto px-6 text-center">
                <h2 className="text-2xl sm:text-3xl font-black mb-4"
                  style={{ color: NEON, textShadow: "0 0 20px rgba(193,255,0,0.3)" }}>
                  WHY GAMEFOLIO?
                </h2>
                <p className="text-sm sm:text-base mb-12 max-w-2xl mx-auto text-white/60">
                  Gamefolio helps indie games get discovered by connecting developers, creators, streamers, and players in one living ecosystem.
                </p>

                <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0 relative">
                  <svg className="absolute hidden md:block w-full h-20 top-1/2 -translate-y-1/2 z-0 pointer-events-none">
                    <line x1="10%" y1="50%" x2="90%" y2="50%" className="igp-flow-line" />
                  </svg>
                  {["Indie Dev", "Gamefolio", "Creators", "Streamers", "Players"].map((node, i) => (
                    <div key={node} className="relative z-10 flex flex-col items-center gap-2 md:gap-0">
                      <div
                        className="w-28 h-28 rounded-2xl flex items-center justify-center text-center font-black text-sm text-white"
                        style={{
                          background: node === "Gamefolio" ? "rgba(193,255,0,0.1)" : CARD_BG,
                          border: node === "Gamefolio" ? `1px solid rgba(193,255,0,0.35)` : `1px solid ${CARD_BORDER}`,
                          boxShadow: node === "Gamefolio" ? "0 0 24px rgba(193,255,0,0.18)" : "none",
                          backdropFilter: "blur(10px)",
                        }}>
                        {node}
                      </div>
                      {i < 4 && (
                        <div className="md:hidden">
                          <ChevronRight className="w-5 h-5 rotate-90 text-white/20" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer CTA */}
            <div className="px-4 sm:px-6 py-10">
              <div className="max-w-4xl mx-auto rounded-2xl p-8 sm:p-12 text-center relative overflow-hidden"
                style={{ background: CARD_BG, border: `1px solid rgba(193,255,0,0.15)` }}>
                <div className="absolute inset-0 bg-gradient-to-br from-[rgba(193,255,0,0.07)] to-transparent pointer-events-none" />
                <h2 className="relative z-10 text-2xl sm:text-3xl font-black text-white mb-3">
                  Get Your Game on Gamefolio
                </h2>
                <p className="relative z-10 text-white/60 mb-7 max-w-xl mx-auto text-sm sm:text-base">
                  Join hundreds of indie developers building real communities and reaching new players every day.
                </p>
                <button
                  className="relative z-10 px-8 py-4 rounded-xl font-black text-sm text-black transition-transform hover:scale-105 active:scale-95"
                  style={{ background: NEON, boxShadow: `0 0 24px rgba(193,255,0,0.3)` }}>
                  Claim Your Developer Profile
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ──── CLIPS ──── */}
        {activeTab === "clips" && (
          <div className="py-5 space-y-4">
            <div className="flex flex-wrap gap-2 items-center justify-between">
              <div className="flex gap-1.5 flex-wrap">
                {periodButtons.map(p => (
                  <button key={p.id} onClick={() => setTimePeriod(p.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                    style={timePeriod === p.id
                      ? { background: NEON, color: "#0a0f1c" }
                      : { background: CARD_BG, color: "rgba(255,255,255,0.5)", border: `1px solid ${CARD_BORDER}` }}>
                    {p.label}
                  </button>
                ))}
              </div>
              {uniqueCreators.length > 1 && (
                <select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)}
                  className="text-xs rounded-lg px-3 py-1.5 font-bold"
                  style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, color: "rgba(255,255,255,0.7)" }}>
                  <option value="all">All Creators</option>
                  {uniqueCreators.map((c: any) => <option key={c.id} value={c.id}>{c.displayName || c.username}</option>)}
                </select>
              )}
            </div>

            {isLoadingClips ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="aspect-video rounded-xl" />)}
              </div>
            ) : clipData.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {(clipData as ClipWithUser[]).map(clip => (
                  <VideoClipGridItem key={clip.id} clip={clip} userId={user?.id} compact={false}
                    clipsList={clipData as ClipWithUser[]}
                    onCardClick={isMobile ? (id) => {
                      const idx = clipData.findIndex((c: any) => c.id === id);
                      setMobileViewerIndex(idx >= 0 ? idx : 0);
                      setMobileViewerClipId(id);
                      setMobileViewerOpen(true);
                    } : undefined} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <Play className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                <h3 className="text-lg font-semibold mb-1">No clips found</h3>
                <p className="text-gray-400 text-sm mb-4">Be the first to upload a clip for {game.name}</p>
                <Button onClick={handleOpenUpload} style={{ background: NEON, color: "#0a0f1c", fontWeight: 700 }}>
                  <Upload className="w-4 h-4 mr-2" />Upload Clip
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ──── REELS ──── */}
        {activeTab === "reels" && (
          <div className="py-5 space-y-4">
            <div className="flex gap-1.5 flex-wrap">
              {periodButtons.map(p => (
                <button key={p.id} onClick={() => setTimePeriod(p.id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                  style={timePeriod === p.id
                    ? { background: NEON, color: "#0a0f1c" }
                    : { background: CARD_BG, color: "rgba(255,255,255,0.5)", border: `1px solid ${CARD_BORDER}` }}>
                  {p.label}
                </button>
              ))}
            </div>

            {isLoadingReels ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="aspect-[9/16] rounded-xl" />)}
              </div>
            ) : reelData.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {(reelData as ClipWithUser[]).map(reel => (
                  <VideoClipGridItem key={reel.id} clip={reel} userId={user?.id} compact={false} reelsList={reelData} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <Video className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                <h3 className="text-lg font-semibold mb-1">No reels found</h3>
                <p className="text-gray-400 text-sm mb-4">Upload vertical reels for {game.name}</p>
                <Button onClick={handleOpenUpload} style={{ background: NEON, color: "#0a0f1c", fontWeight: 700 }}>
                  <Upload className="w-4 h-4 mr-2" />Upload Reel
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ──── SCREENSHOTS ──── */}
        {activeTab === "screenshots" && (
          <div className="py-5 space-y-6">
            {/* Official Screenshots */}
            <div>
              <h3 className="font-black text-white text-base mb-3 flex items-center gap-2">
                <Camera className="w-4 h-4" style={{ color: NEON }} />Official Screenshots
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {Array(3).fill(0).map((_, i) => (
                  <div key={i} className="aspect-video rounded-xl overflow-hidden cursor-pointer"
                    style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${CARD_BORDER}` }}
                    onClick={() => setSelectedScreenshot({ id: i, imageUrl: game.imageUrl || "https://placehold.co/400x225/0B1218/333?text=Screenshot", title: `Official Screenshot ${i + 1}` })}>
                    <img src={game.imageUrl || "https://placehold.co/400x225/0B1218/333?text=Screenshot"}
                      alt={`Official ${i + 1}`} className="w-full h-full object-cover opacity-60 hover:opacity-100 transition-opacity" />
                  </div>
                ))}
              </div>
            </div>

            {/* Community Screenshots */}
            <div>
              <h3 className="font-black text-white text-base mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" style={{ color: NEON }} />Community Screenshots
              </h3>
              {isLoadingScreenshots ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="aspect-video rounded-xl" />)}
                </div>
              ) : allScreenshots && allScreenshots.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {allScreenshots.map((shot: any) => (
                    <div key={shot.id} className="aspect-video rounded-xl overflow-hidden cursor-pointer"
                      style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${CARD_BORDER}` }}
                      onClick={() => setSelectedScreenshot(shot)}>
                      <img src={shot.imageUrl} alt={shot.title} className="w-full h-full object-cover hover:opacity-90 transition-opacity" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: `1px dashed ${CARD_BORDER}` }}>
                  <Camera className="w-10 h-10 mx-auto mb-3 text-gray-600" />
                  <p className="text-sm text-gray-400">No community screenshots yet</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ──── BOUNTIES ──── */}
        {activeTab === "bounties" && (
          <div className="py-5 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-black text-white text-base flex items-center gap-2">
                  <Sword className="w-5 h-5" style={{ color: NEON }} />Creator Campaigns
                </h2>
                <p className="text-xs text-gray-500 mt-1">Try before you earn. Claim demo access, create content, and unlock the full game.</p>
              </div>
              <div className="flex items-center gap-2">
                {canCreateBounty && (
                  <Button size="sm" onClick={() => setShowCreateBounty(true)}
                    className="font-bold text-xs"
                    style={{ background: NEON, color: "#0a0f1c", boxShadow: "0 4px 16px rgba(193,255,0,0.25)" }}>
                    <Plus className="w-3.5 h-3.5 mr-1.5" />Create Campaign
                  </Button>
                )}
                </div>
            </div>

            {/* Bounty stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard value={bountyStats?.activeBounties ?? 0} label="Active Campaigns" icon={Target} />
              <StatCard value={bountyStats?.creatorsJoined ?? 0} label="Creators Joined" icon={Users} />
              <StatCard value={bountyStats?.demoKeysAvailable ?? bountyStats?.keysAvailable ?? 0} label="Demo Keys" icon={Key} />
              <StatCard value={allClips.length} label="Content Generated" icon={Play} />
            </div>

            {bountiesLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-48 rounded-2xl" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Skeleton className="h-52 rounded-2xl" /><Skeleton className="h-52 rounded-2xl" />
                </div>
              </div>
            ) : bounties.length === 0 ? (
              <div className="text-center py-16 rounded-2xl"
                style={{ background: "rgba(193,255,0,0.03)", border: "1px dashed rgba(193,255,0,0.15)" }}>
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: "rgba(193,255,0,0.08)", border: "1px solid rgba(193,255,0,0.15)" }}>
                  <Sword className="w-8 h-8" style={{ color: NEON }} />
                </div>
                <h3 className="text-lg font-black text-white mb-2">No Active Campaigns</h3>
                <p className="text-sm text-gray-400 mb-5 max-w-xs mx-auto">
                  {canCreateBounty
                    ? "Launch your first creator campaign to start growing your game's community."
                    : "No creator campaigns are running right now. Check back soon!"}
                </p>
                {canCreateBounty && (
                  <Button onClick={() => setShowCreateBounty(true)}
                    style={{ background: NEON, color: "#0a0f1c", fontWeight: 700, boxShadow: "0 8px 24px rgba(193,255,0,0.25)" }}>
                    <Plus className="w-4 h-4 mr-2" />Create First Campaign
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {(() => {
                  const b0 = bounties[0];
                  const s0 = myBountyStatuses[b0.id];
                  const isJoined0 = acceptedBounties.has(b0.id) || !!s0;
                  const isOwner0 = user && b0.createdByUserId === user.id;
                  return (
                    <div>
                      {isOwner0 && (
                        <div className="flex justify-end mb-2">
                          <Button size="sm" variant="ghost" onClick={() => handleViewDevDashboard(b0.id)}
                            className="font-bold text-xs text-gray-400 hover:text-white">
                            <BarChart3 className="w-3.5 h-3.5 mr-1.5" />Dev Dashboard
                          </Button>
                        </div>
                      )}
                      <HubCampaignCard
                        bounty={b0}
                        gameImageUrl={game?.imageUrl ?? undefined}
                        gameName={game?.name}
                        isFeatured={true}
                        onJoin={() => handleJoinCampaign(b0.id)}
                        onViewDashboard={() => handleViewDashboard(b0.id)}
                        onClaimKey={() => { setSelectedBountyId(b0.id); setShowCreatorDashboard(true); }}
                        joining={acceptingBountyId === b0.id}
                        joined={isJoined0}
                        completed={s0?.status === "completed"}
                        progressPercent={s0?.progressPercent ?? 0}
                        fullKey={s0?.fullKey ?? null}
                      />
                    </div>
                  );
                })()}
                {bounties.length > 1 && (
                  <div>
                    <h3 className="font-black text-white text-sm mb-3 flex items-center gap-2">
                      <Flame className="w-4 h-4" style={{ color: NEON }} />More Campaigns
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {bounties.slice(1).map(bounty => {
                        const s = myBountyStatuses[bounty.id];
                        const isJoined = acceptedBounties.has(bounty.id) || !!s;
                        const isOwner = user && bounty.createdByUserId === user.id;
                        return (
                          <div key={bounty.id}>
                            {isOwner && (
                              <div className="flex justify-end mb-1">
                                <Button size="sm" variant="ghost" onClick={() => handleViewDevDashboard(bounty.id)}
                                  className="font-bold text-xs text-gray-400 hover:text-white h-7 px-2">
                                  <BarChart3 className="w-3 h-3 mr-1" />Dev Dashboard
                                </Button>
                              </div>
                            )}
                            <HubCampaignCard
                              bounty={bounty}
                              gameImageUrl={game?.imageUrl ?? undefined}
                              gameName={game?.name}
                              onJoin={() => handleJoinCampaign(bounty.id)}
                              onViewDashboard={() => handleViewDashboard(bounty.id)}
                              onClaimKey={() => { setSelectedBountyId(bounty.id); setShowCreatorDashboard(true); }}
                              joining={acceptingBountyId === bounty.id}
                              joined={isJoined}
                              completed={s?.status === "completed"}
                              progressPercent={s?.progressPercent ?? 0}
                              fullKey={s?.fullKey ?? null}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <Dialog open={showUploadDialog} onOpenChange={(v) => !v && handleUploadClose()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0" style={{ background: "#0B1218", border: "1px solid rgba(193,255,0,0.2)" }}>
          <Suspense fallback={<div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>}>
            <UploadPage />
          </Suspense>
        </DialogContent>
      </Dialog>

      <CreateBountyDialog open={showCreateBounty} onClose={() => setShowCreateBounty(false)}
        gameId={game?.id ?? 0} onCreated={() => queryClient.invalidateQueries({ queryKey: ["/api/games", game?.id, "bounties"] })}
        gameImageUrl={game?.imageUrl ?? undefined} gameName={game?.name} />

      {/* Creator Dashboard */}
      <CreatorDashboard
        bountyId={selectedBountyId ?? 0}
        open={showCreatorDashboard}
        onClose={() => {
          setShowCreatorDashboard(false);
          queryClient.invalidateQueries({ queryKey: ["/api/games", game?.id, "bounties/my-statuses"] });
        }}
      />

      {/* Developer Dashboard */}
      <DeveloperDashboard
        bountyId={selectedBountyId ?? 0}
        open={showDeveloperDashboard}
        onClose={() => setShowDeveloperDashboard(false)}
      />

      {/* Screenshot lightbox */}
      {selectedScreenshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={() => setSelectedScreenshot(null)}>
          <div className="relative max-w-4xl max-h-[90vh] w-full">
            <img src={selectedScreenshot.imageUrl} alt={selectedScreenshot.title}
              className="w-full h-full object-contain rounded-xl" />
            <button onClick={() => setSelectedScreenshot(null)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default IndieGamePage;
