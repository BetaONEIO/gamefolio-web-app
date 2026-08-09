import { useState } from "react";
import { Loader2, Key, Zap, Users, Trophy, ChevronRight, Lock, Unlock, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

const NEON = "#C1FF00";
const CARD_BG = "rgba(255,255,255,0.04)";
const CARD_BORDER = "rgba(255,255,255,0.08)";

export interface Campaign {
  id: number;
  title: string;
  campaignTitle?: string;
  description?: string;
  gameId?: number;
  createdByUserId?: number;
  creatorUsername?: string;
  maxParticipants?: number;
  participantCount?: number;
  demoKeysRemaining?: number;
  fullKeysRemaining?: number;
  totalXpAvailable?: number;
  xpJoin?: number;
  xpPerClip?: number;
  xpPerReel?: number;
  xpPerScreenshot?: number;
  xpCompletionBonus?: number;
  requiredClips?: number;
  requiredReels?: number;
  requiredScreenshots?: number;
  requiredViews?: number;
  completionBadge?: string;
  endDate?: string;
  status?: string;
  imageUrl?: string;
}

interface CampaignCardProps {
  campaign: Campaign;
  isFeatured?: boolean;
  onJoin: (id: number) => void;
  onViewDashboard: (id: number) => void;
  onClaimKey: (id: number) => void;
  joining?: boolean;
  joined?: boolean;
  completed?: boolean;
  fullKey?: string | null;
  progressPercent?: number;
}

export function CampaignCard({
  campaign,
  isFeatured = false,
  onJoin,
  onViewDashboard,
  onClaimKey,
  joining = false,
  joined = false,
  completed = false,
  fullKey = null,
  progressPercent = 0,
}: CampaignCardProps) {
  const { user } = useAuth();
  const slotsUsed = campaign.participantCount ?? 0;
  const totalSlots = campaign.maxParticipants ?? 10;
  const isFull = slotsUsed >= totalSlots;
  const endDateStr = campaign.endDate ? new Date(campaign.endDate).toLocaleDateString() : null;
  const badges = [
    campaign.demoKeysRemaining > 0 && { label: "Demo Key Available", color: "rgba(193,255,0,0.15)", text: NEON },
    campaign.fullKeysRemaining > 0 && { label: "Full Key Unlockable", color: "rgba(193,255,0,0.1)", text: NEON },
    campaign.totalXpAvailable > 0 && { label: "Huge XP Rewards", color: "rgba(193,255,0,0.1)", text: NEON },
  ].filter(Boolean) as { label: string; color: string; text: string }[];

  const cardStyle = isFeatured ? {
    background: "linear-gradient(135deg, rgba(193,255,0,0.08) 0%, rgba(120,40,200,0.10) 100%)",
    border: "1px solid rgba(193,255,0,0.2)",
    boxShadow: "0 0 40px rgba(193,255,0,0.06)",
  } : {
    background: CARD_BG,
    border: `1px solid ${CARD_BORDER}`,
  };

  return (
    <div className="rounded-2xl overflow-hidden relative" style={cardStyle}>
      {/* Glow accent */}
      {isFeatured && (
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(ellipse, rgba(193,255,0,0.08) 0%, transparent 70%)", transform: "translate(30%, -30%)" }} />
      )}

      {/* Game artwork banner (featured only) */}
      {isFeatured && campaign.imageUrl && (
        <div className="relative w-full overflow-hidden" style={{ height: "90px" }}>
          <img src={campaign.imageUrl} alt="" className="w-full h-full object-cover"
            style={{ opacity: 0.35, filter: "blur(2px)", transform: "scale(1.05)" }} />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80" />
          <div className="absolute bottom-2 left-3 flex items-center gap-2">
            <img src={campaign.imageUrl} alt="" className="w-8 h-8 rounded-lg object-cover border border-white/20 flex-shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Creator Campaign</span>
          </div>
        </div>
      )}

      <div className="p-4 sm:p-5 relative z-10">
        {/* Badges */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {badges.map((b, i) => (
            <span key={i} className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md"
              style={{ background: b.color, color: b.text }}>
              {b.label}
            </span>
          ))}
        </div>

        {/* Non-featured: small game art inline */}
        {!isFeatured && campaign.imageUrl && (
          <div className="flex items-center gap-2 mb-2">
            <img src={campaign.imageUrl} alt="" className="w-6 h-6 rounded object-cover flex-shrink-0 border border-white/10" />
          </div>
        )}

        {/* Title */}
        <h3 className="font-black text-white leading-tight mb-1"
          style={{ fontSize: isFeatured ? "1.25rem" : "1.05rem" }}>
          {campaign.campaignTitle || campaign.title}
        </h3>
        {campaign.description && (
          <p className="text-sm text-gray-400 mb-3 line-clamp-2">{campaign.description}</p>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          <div className="rounded-lg px-2.5 py-2" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${CARD_BORDER}` }}>
            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">
              <Key className="w-3 h-3" /> Demo Keys
            </div>
            <div className="text-sm font-black text-white">{campaign.demoKeysRemaining ?? 0}</div>
          </div>
          <div className="rounded-lg px-2.5 py-2" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${CARD_BORDER}` }}>
            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">
              <Unlock className="w-3 h-3" /> Full Keys
            </div>
            <div className="text-sm font-black text-white">{campaign.fullKeysRemaining ?? 0}</div>
          </div>
          <div className="rounded-lg px-2.5 py-2" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${CARD_BORDER}` }}>
            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">
              <Zap className="w-3 h-3" style={{ color: NEON }} /> XP Available
            </div>
            <div className="text-sm font-black" style={{ color: NEON }}>{(campaign.totalXpAvailable ?? 0).toLocaleString()}</div>
          </div>
          <div className="rounded-lg px-2.5 py-2" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${CARD_BORDER}` }}>
            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">
              <Users className="w-3 h-3" /> Creators
            </div>
            <div className="text-sm font-black text-white">{slotsUsed}/{totalSlots}</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1 mb-4">
          <div className="flex justify-between text-xs text-gray-400">
            <span>{slotsUsed} of {totalSlots} creator slots filled</span>
            <span>{Math.round((slotsUsed / totalSlots) * 100)}%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
            <div className="h-full rounded-full transition-all"
              style={{ width: `${Math.min((slotsUsed / totalSlots) * 100, 100)}%`, background: isFull ? "#f87171" : NEON }} />
          </div>
          {endDateStr && (
            <div className="text-[11px] text-gray-500">Campaign ends {endDateStr}</div>
          )}
        </div>

        {/* CTA */}
        {joined ? (
          completed ? (
            fullKey ? (
              <div className="space-y-2">
                <div className="rounded-lg p-3 flex items-center gap-2"
                  style={{ background: "rgba(193,255,0,0.1)", border: "1px solid rgba(193,255,0,0.2)" }}>
                  <Gift className="w-4 h-4" style={{ color: NEON }} />
                  <span className="text-sm font-bold text-white">Full Key: </span>
                  <code className="text-sm font-mono" style={{ color: NEON }}>{fullKey}</code>
                </div>
                <Button className="w-full font-bold text-sm py-3" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", border: CARD_BORDER }}
                  disabled>
                  <Trophy className="w-4 h-4 mr-2" style={{ color: NEON }} /> Campaign Complete
                </Button>
              </div>
            ) : (
              <Button
                className="w-full font-bold text-sm py-3"
                style={{ background: NEON, color: "#0a0f1c", boxShadow: "0 8px 24px rgba(193,255,0,0.25)" }}
                onClick={() => onClaimKey(campaign.id)}
              >
                <Unlock className="w-4 h-4 mr-2" /> Claim Full Key
              </Button>
            )
          ) : (
            <Button
              className="w-full font-bold text-sm py-3"
              style={{ background: "rgba(255,255,255,0.08)", color: "#fff", border: `1px solid ${CARD_BORDER}` }}
              onClick={() => onViewDashboard(campaign.id)}
            >
              View Objectives <ChevronRight className="w-4 h-4 ml-1" />
              {progressPercent > 0 && (
                <span className="ml-2 text-[10px] font-black px-1.5 py-0.5 rounded" style={{ background: "rgba(193,255,0,0.2)", color: NEON }}>
                  {progressPercent}%
                </span>
              )}
            </Button>
          )
        ) : (
          <Button
            disabled={isFull || joining || !user}
            onClick={() => onJoin(campaign.id)}
            className="w-full font-bold text-sm py-3"
            style={isFull ? {
              background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.3)", border: CARD_BORDER
            } : {
              background: NEON, color: "#0a0f1c", boxShadow: "0 8px 24px rgba(193,255,0,0.25)"
            }}
          >
            {joining ? <Loader2 className="w-4 h-4 animate-spin" /> :
              isFull ? "Campaign Full" :
              !user ? "Sign In to Join" :
              "Join Campaign"}
          </Button>
        )}
      </div>
    </div>
  );
}
