import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Key, Zap, Check, Lock, Unlock, Trophy, Play, Video, Camera,
  Eye, ChevronRight, Copy, CheckCircle2
} from "lucide-react";

const NEON = "#C1FF00";
const CARD_BG = "rgba(255,255,255,0.04)";
const CARD_BORDER = "rgba(255,255,255,0.08)";

interface Objective {
  key: string;
  label: string;
  required: number;
  current: number;
  icon: React.ReactNode;
  xpReward: number;
}

interface CreatorStatus {
  bountyId: number;
  userId: number;
  demoKey: string | null;
  fullKey: string | null;
  clipsUploaded: number;
  reelsUploaded: number;
  screenshotsUploaded: number;
  totalViews: number;
  xpEarned: number;
  progressPercent: number;
  status: string;
  joinedAt: string;
  completedAt: string | null;
  completedBadgeAwarded: boolean;
  title: string;
  campaignTitle: string;
  description: string;
  requiredClips: number;
  requiredReels: number;
  requiredScreenshots: number;
  requiredViews: number;
  xpJoin: number;
  xpPerClip: number;
  xpPerReel: number;
  xpPerScreenshot: number;
  xpViewMilestone: number;
  xpCompletionBonus: number;
  totalXpAvailable: number;
  completionBadge: string;
  fullKeysRemaining: number;
  bountyStatus: string;
}

interface CreatorDashboardProps {
  bountyId: number;
  open: boolean;
  onClose: () => void;
}

export function CreatorDashboard({ bountyId, open, onClose }: CreatorDashboardProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const { data: status, isLoading } = useQuery<CreatorStatus>({
    queryKey: ["/api/games/bounties", bountyId, "me"],
    queryFn: async () => {
      const r = await fetch(`/api/games/bounties/${bountyId}/me`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load status");
      return r.json();
    },
    enabled: open && !!bountyId,
  });

  const checkProgress = useMutation({
    mutationFn: () => apiRequest("POST", `/api/games/bounties/${bountyId}/check-progress`, {}),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/games/bounties", bountyId, "me"] });
      if (data.xpEarned > 0) {
        toast({
          title: "Progress Updated!",
          description: `+${data.xpEarned} XP earned. Progress: ${data.progressPercent}%`,
          variant: "gamefolioSuccess",
        });
      } else if (data.completed) {
        toast({
          title: "Campaign Complete!",
          description: "All objectives completed! Claim your full game key.",
          variant: "gamefolioSuccess",
        });
      } else {
        toast({
          title: "Progress Checked",
          description: "No new progress detected yet. Keep creating content!",
        });
      }
    },
    onError: () => {
      toast({ title: "Error", description: "Could not check progress.", variant: "gamefolioError" });
    },
  });

  const claimKey = useMutation({
    mutationFn: () => apiRequest("POST", `/api/games/bounties/${bountyId}/claim-full-key`, {}),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/games/bounties", bountyId, "me"] });
      toast({
        title: "Full Key Unlocked!",
        description: "Your full game key has been assigned.",
        variant: "gamefolioSuccess",
      });
      setClaiming(false);
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message || "Could not claim key.",
        variant: "gamefolioError",
      });
      setClaiming(false);
    },
  });

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-lg border-0" style={{ background: "#0B1319", border: "1px solid rgba(255,255,255,0.1)" }}>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: NEON }} />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!status) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-lg border-0" style={{ background: "#0B1319", border: "1px solid rgba(255,255,255,0.1)" }}>
          <div className="text-center py-8 text-gray-400">Failed to load campaign status.</div>
        </DialogContent>
      </Dialog>
    );
  }

  const s = status;
  const completed = s.status === "completed";

  const objectives: Objective[] = [
    {
      key: "clips",
      label: "Upload Clips",
      required: s.requiredClips || 0,
      current: s.clipsUploaded || 0,
      icon: <Play className="w-4 h-4" />,
      xpReward: (s.xpPerClip || 1000) * (s.requiredClips || 0),
    },
    {
      key: "reels",
      label: "Upload Reels",
      required: s.requiredReels || 0,
      current: s.reelsUploaded || 0,
      icon: <Video className="w-4 h-4" />,
      xpReward: (s.xpPerReel || 2500) * (s.requiredReels || 0),
    },
    {
      key: "screenshots",
      label: "Upload Screenshots",
      required: s.requiredScreenshots || 0,
      current: s.screenshotsUploaded || 0,
      icon: <Camera className="w-4 h-4" />,
      xpReward: (s.xpPerScreenshot || 200) * (s.requiredScreenshots || 0),
    },
    {
      key: "views",
      label: "Reach Views Milestone",
      required: s.requiredViews || 0,
      current: s.totalViews || 0,
      icon: <Eye className="w-4 h-4" />,
      xpReward: s.xpViewMilestone || 2500,
    },
  ].filter(o => o.required > 0);

  const totalRequired = objectives.reduce((sum, o) => sum + (o.required > 0 ? 1 : 0), 0);
  const totalDone = objectives.reduce((sum, o) => sum + (o.current >= o.required ? 1 : 0), 0);
  const progressPercent = totalRequired > 0 ? Math.round((totalDone / totalRequired) * 100) : 0;

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg border-0 overflow-hidden" style={{ background: "#0B1319", border: "1px solid rgba(255,255,255,0.1)" }}>
        <DialogHeader>
          <DialogTitle className="text-lg font-black text-white flex items-center gap-2">
            <Zap className="w-5 h-5" style={{ color: NEON }} />
            {s.campaignTitle || s.title || "Campaign Dashboard"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Demo Key */}
          {s.demoKey && (
            <div className="rounded-xl p-3 flex items-center justify-between gap-2"
              style={{ background: "rgba(193,255,0,0.08)", border: "1px solid rgba(193,255,0,0.2)" }}>
              <div className="flex items-center gap-2 min-w-0">
                <Key className="w-4 h-4 flex-shrink-0" style={{ color: NEON }} />
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Demo Key</div>
                  <code className="text-sm font-mono text-white truncate block">{s.demoKey}</code>
                </div>
              </div>
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => copyKey(s.demoKey!)}>
                {copied ? <CheckCircle2 className="w-4 h-4" style={{ color: NEON }} /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          )}

          {/* Progress bar */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-gray-400">Campaign Progress</span>
              <span className="text-xs font-black" style={{ color: NEON }}>{progressPercent}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%`, background: completed ? NEON : "rgba(193,255,0,0.7)", boxShadow: completed ? "0 0 12px rgba(193,255,0,0.5)" : "none" }} />
            </div>
          </div>

          {/* XP Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl p-3 text-center" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
              <div className="text-lg font-black" style={{ color: NEON }}>{(s.xpEarned || 0).toLocaleString()}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">XP Earned</div>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
              <div className="text-lg font-black text-white">{(s.totalXpAvailable || 0).toLocaleString()}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total XP</div>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
              <div className="text-lg font-black text-white">{totalDone}/{totalRequired}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Objectives</div>
            </div>
          </div>

          {/* Objectives Checklist */}
          <div>
            <h4 className="text-sm font-black text-white mb-2">Objective Checklist</h4>
            <div className="space-y-1.5">
              {objectives.map(obj => {
                const isDone = obj.current >= obj.required;
                return (
                  <div key={obj.key} className="flex items-center gap-3 rounded-lg p-2.5"
                    style={{ background: isDone ? "rgba(193,255,0,0.06)" : CARD_BG, border: `1px solid ${isDone ? "rgba(193,255,0,0.15)" : CARD_BORDER}` }}>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: isDone ? "rgba(193,255,0,0.2)" : "rgba(255,255,255,0.06)" }}>
                      {isDone ? (
                        <Check className="w-3.5 h-3.5" style={{ color: NEON }} />
                      ) : (
                        <span className="text-gray-500">{obj.icon}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-bold ${isDone ? "text-white" : "text-gray-300"}`}>
                          {obj.label}
                        </span>
                        <span className="text-xs font-bold" style={{ color: isDone ? NEON : "rgba(255,255,255,0.4)" }}>
                          +{obj.xpReward.toLocaleString()} XP
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {obj.current}/{obj.required} {isDone && "Completed"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Full Key Section */}
          {completed && s.fullKey ? (
            <div className="rounded-xl p-4 space-y-2"
              style={{ background: "rgba(193,255,0,0.08)", border: "1px solid rgba(193,255,0,0.2)" }}>
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5" style={{ color: NEON }} />
                <span className="text-sm font-black text-white">Full Game Key Unlocked</span>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-lg p-2.5"
                style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(193,255,0,0.15)" }}>
                <code className="text-sm font-mono text-white">{s.fullKey}</code>
                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => copyKey(s.fullKey!)}>
                  {copied ? <CheckCircle2 className="w-4 h-4" style={{ color: NEON }} /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              {s.completionBadge && (
                <div className="flex items-center gap-2 text-xs text-gray-300">
                  <CheckCircle2 className="w-4 h-4" style={{ color: NEON }} />
                  <span>{s.completionBadge} earned</span>
                </div>
              )}
            </div>
          ) : completed && !s.fullKey ? (
            <Button
              className="w-full font-bold py-3"
              style={{ background: NEON, color: "#0a0f1c", boxShadow: "0 8px 24px rgba(193,255,0,0.25)" }}
              onClick={() => { setClaiming(true); claimKey.mutate(); }}
              disabled={claiming || claimKey.isPending}
            >
              {claiming || claimKey.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Unlock className="w-4 h-4 mr-2" />
              )}
              Claim Full Game Key
            </Button>
          ) : (
            <Button
              className="w-full font-bold py-3"
              style={{ background: "rgba(255,255,255,0.08)", color: "#fff", border: `1px solid ${CARD_BORDER}` }}
              onClick={() => checkProgress.mutate()}
              disabled={checkProgress.isPending}
            >
              {checkProgress.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <ChevronRight className="w-4 h-4 mr-2" />
              )}
              Check Progress & Award XP
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
