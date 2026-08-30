import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Loader2, Key, Zap, Users, Play, Video, Camera, Eye, Trophy,
  BarChart3, TrendingUp, Lock, Unlock
} from "lucide-react";

const NEON = "#C1FF00";
const CARD_BG = "rgba(255,255,255,0.04)";
const CARD_BORDER = "rgba(255,255,255,0.08)";

interface Participant {
  userId: number;
  username: string;
  displayName: string;
  avatarUrl?: string;
  clipsUploaded: number;
  reelsUploaded: number;
  screenshotsUploaded: number;
  totalViews: number;
  xpEarned: number;
  progressPercent: number;
  status: string;
  completedAt: string | null;
  demoKey: string | null;
  fullKey: string | null;
}

interface DashboardData {
  bounty: {
    title: string;
    campaignTitle: string;
    description: string;
    demoKeysRemaining: number;
    fullKeysRemaining: number;
    maxParticipants: number;
    totalXpAvailable: number;
    endDate: string;
    status: string;
  };
  stats: {
    totalParticipants: number;
    completedCount: number;
    totalClips: number;
    totalReels: number;
    totalScreenshots: number;
    totalViews: number;
    totalXPEarned: number;
    completionRate: number;
    demoKeysDistributed: number;
    fullKeysUnlocked: number;
  };
  participants: Participant[];
}

interface DeveloperDashboardProps {
  bountyId: number;
  open: boolean;
  onClose: () => void;
}

export function DeveloperDashboard({ bountyId, open, onClose }: DeveloperDashboardProps) {
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/games/bounties", bountyId, "dashboard"],
    queryFn: async () => {
      const r = await fetch(`/api/games/bounties/${bountyId}/dashboard`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load dashboard");
      return r.json();
    },
    enabled: open && !!bountyId,
  });

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl border-0" style={{ background: "#0B1319", border: "1px solid rgba(255,255,255,0.1)" }}>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: NEON }} />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!data) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl border-0" style={{ background: "#0B1319", border: "1px solid rgba(255,255,255,0.1)" }}>
          <div className="text-center py-8 text-gray-400">Failed to load dashboard.</div>
        </DialogContent>
      </Dialog>
    );
  }

  const { bounty, stats, participants } = data;
  const endDateStr = bounty.endDate ? new Date(bounty.endDate).toLocaleDateString() : null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl border-0 overflow-hidden" style={{ background: "#0B1319", border: "1px solid rgba(255,255,255,0.1)" }}>
        <DialogHeader>
          <DialogTitle className="text-lg font-black text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5" style={{ color: NEON }} />
            {bounty.campaignTitle || bounty.title || "Campaign Dashboard"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Campaign Header */}
          <div className="rounded-xl p-4" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Campaign Status</span>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded"
                style={{ background: bounty.status === "active" ? "rgba(193,255,0,0.15)" : "rgba(255,255,255,0.08)", color: bounty.status === "active" ? NEON : "#fff" }}>
                {bounty.status}
              </span>
            </div>
            {endDateStr && (
              <div className="text-xs text-gray-500">Ends {endDateStr}</div>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="rounded-xl p-3 text-center" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
              <div className="flex items-center justify-center gap-1 mb-1">
                <Key className="w-3.5 h-3.5 text-gray-400" />
              </div>
              <div className="text-lg font-black text-white">{stats.demoKeysDistributed}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Demo Keys</div>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
              <div className="flex items-center justify-center gap-1 mb-1">
                <Unlock className="w-3.5 h-3.5 text-gray-400" />
              </div>
              <div className="text-lg font-black text-white">{stats.fullKeysUnlocked}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Full Keys</div>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
              <div className="flex items-center justify-center gap-1 mb-1">
                <Users className="w-3.5 h-3.5 text-gray-400" />
              </div>
              <div className="text-lg font-black text-white">{stats.totalParticipants}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Creators</div>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingUp className="w-3.5 h-3.5" style={{ color: NEON }} />
              </div>
              <div className="text-lg font-black" style={{ color: NEON }}>{stats.completionRate}%</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Complete</div>
            </div>
          </div>

          {/* Content Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="rounded-xl p-3 flex items-center gap-2" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
              <Play className="w-4 h-4" style={{ color: NEON }} />
              <div>
                <div className="text-sm font-black text-white">{stats.totalClips}</div>
                <div className="text-[10px] font-bold text-gray-400">Clips</div>
              </div>
            </div>
            <div className="rounded-xl p-3 flex items-center gap-2" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
              <Video className="w-4 h-4" style={{ color: NEON }} />
              <div>
                <div className="text-sm font-black text-white">{stats.totalReels}</div>
                <div className="text-[10px] font-bold text-gray-400">Reels</div>
              </div>
            </div>
            <div className="rounded-xl p-3 flex items-center gap-2" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
              <Camera className="w-4 h-4" style={{ color: NEON }} />
              <div>
                <div className="text-sm font-black text-white">{stats.totalScreenshots}</div>
                <div className="text-[10px] font-bold text-gray-400">Screenshots</div>
              </div>
            </div>
            <div className="rounded-xl p-3 flex items-center gap-2" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
              <Eye className="w-4 h-4" style={{ color: NEON }} />
              <div>
                <div className="text-sm font-black text-white">{stats.totalViews.toLocaleString()}</div>
                <div className="text-[10px] font-bold text-gray-400">Views</div>
              </div>
            </div>
          </div>

          {/* Remaining Keys */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl p-3 flex items-center justify-between" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-bold text-white">Demo Keys Left</span>
              </div>
              <span className="text-sm font-black text-white">{bounty.demoKeysRemaining}</span>
            </div>
            <div className="rounded-xl p-3 flex items-center justify-between" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
              <div className="flex items-center gap-2">
                <Unlock className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-bold text-white">Full Keys Left</span>
              </div>
              <span className="text-sm font-black text-white">{bounty.fullKeysRemaining}</span>
            </div>
          </div>

          {/* Participants Table */}
          <div>
            <h4 className="text-sm font-black text-white mb-2">Participants</h4>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {participants.length === 0 ? (
                <div className="text-center py-6 text-gray-500 text-sm">No participants yet</div>
              ) : (
                participants.map(p => (
                  <div key={p.userId} className="flex items-center gap-3 rounded-lg p-2.5"
                    style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(255,255,255,0.08)", border: `1px solid ${CARD_BORDER}` }}>
                      {p.avatarUrl ? (
                        <img src={p.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-white">{p.username?.[0]?.toUpperCase()}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white truncate">{p.displayName || p.username}</span>
                        {p.status === "completed" && (
                          <Trophy className="w-3.5 h-3.5 flex-shrink-0" style={{ color: NEON }} />
                        )}
                      </div>
                      <div className="text-[10px] text-gray-500 flex items-center gap-2 mt-0.5">
                        <span>{p.clipsUploaded} clips</span>
                        <span>{p.reelsUploaded} reels</span>
                        <span>{p.screenshotsUploaded} ss</span>
                        <span>{p.totalViews} views</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs font-black" style={{ color: NEON }}>{p.xpEarned.toLocaleString()} XP</div>
                      <div className="text-[10px] text-gray-500">{p.progressPercent}%</div>
                    </div>
                    {p.fullKey && (
                      <div className="text-[10px] font-black px-1.5 py-0.5 rounded" style={{ background: "rgba(193,255,0,0.15)", color: NEON }}>
                        Key
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
