import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, Sparkles, Timer, Star, Crown, Gem, Package, Zap, Coins, X, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { AssetReward } from "@shared/schema";
import { useLevelTracker } from "@/hooks/use-level-tracker";
import { useAuth } from "@/hooks/use-auth";

interface LootboxStatus {
  canOpen: boolean;
  lastOpenedAt: string | null;
  nextOpenAt: string | null;
}

interface LootboxOpenResult {
  reward: AssetReward;
  isDuplicate: boolean;
  message: string;
}

interface LootboxDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const rarityColors: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  common: { bg: "bg-gray-500/20", border: "border-gray-400", text: "text-gray-300", glow: "shadow-gray-500/50" },
  rare: { bg: "bg-blue-500/20", border: "border-blue-400", text: "text-blue-300", glow: "shadow-blue-500/50" },
  epic: { bg: "bg-purple-500/20", border: "border-purple-400", text: "text-purple-300", glow: "shadow-purple-500/50" },
  legendary: { bg: "bg-amber-500/20", border: "border-amber-400", text: "text-amber-300", glow: "shadow-amber-500/50" },
};

const rarityIcons: Record<string, typeof Star> = {
  common: Package,
  rare: Gem,
  epic: Crown,
  legendary: Star,
};

export function LootboxDialog({ open, onOpenChange }: LootboxDialogProps) {
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<"idle" | "opening" | "reveal">("idle");
  const [reward, setReward] = useState<AssetReward | null>(null);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [previousXP, setPreviousXP] = useState<number | null>(null);
  const { showLevelTracker } = useLevelTracker();
  const { user } = useAuth();

  const { data: status, isLoading: statusLoading } = useQuery<LootboxStatus>({
    queryKey: ["/api/lootbox/status"],
    enabled: open,
  });

  const openMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/lootbox/open");
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      return response.json() as Promise<LootboxOpenResult>;
    },
    onSuccess: (data: LootboxOpenResult) => {
      setReward(data.reward);
      setIsDuplicate(data.isDuplicate);
      queryClient.invalidateQueries({ queryKey: ["/api/lootbox/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/lootbox/rewards"] });
    },
    onError: (error: Error) => {
      console.error("Failed to open lootbox:", error);
      setPhase("idle");
    },
  });

  const handleVideoEnded = () => {
    setPhase("reveal");
  };

  const resetMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/lootbox/reset");
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lootbox/status"] });
    },
  });

  const handleReset = () => {
    resetMutation.mutate();
  };

  const handleOpen = () => {
    if (!status?.canOpen || openMutation.isPending) return;
    if (user?.totalXP !== undefined) {
      setPreviousXP(user.totalXP);
    }
    setPhase("opening");
    openMutation.mutate();
  };

  const handleClose = () => {
    const wasXpReward = reward?.assetType === 'xp_reward';
    const xpAmount = wasXpReward ? parseInt(reward?.name?.match(/\d+/)?.[0] || '0', 10) : 0;
    
    setPhase("idle");
    setReward(null);
    setIsDuplicate(false);
    onOpenChange(false);
    
    if (wasXpReward && xpAmount > 0 && previousXP !== null) {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setTimeout(() => {
        showLevelTracker(xpAmount, previousXP);
      }, 300);
    }
    setPreviousXP(null);
  };

  useEffect(() => {
    if (!open) {
      setPhase("idle");
      setReward(null);
      setIsDuplicate(false);
    }
  }, [open]);

  const formatTimeRemaining = (nextOpenAt: string) => {
    const next = new Date(nextOpenAt);
    const now = new Date();
    const diff = next.getTime() - now.getTime();
    
    if (diff <= 0) return "Available now!";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  const rarityStyle = reward ? rarityColors[reward.rarity] || rarityColors.common : rarityColors.common;
  const RarityIcon = reward ? rarityIcons[reward.rarity] || Package : Package;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden bg-[#0f0f1a] border border-purple-900/30 rounded-2xl">
        <div className="flex flex-col items-center px-6 py-6">
          <AnimatePresence mode="wait">
            {phase === "idle" && (
              <motion.div
                key="idle"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex flex-col items-center w-full"
              >
                {/* Lootbox Video - paused on first frame */}
                <div className="relative my-4 w-full">
                  <video
                    muted
                    playsInline
                    preload="metadata"
                    className="w-full rounded-lg"
                    src="https://rupzmxqyhqktpifgfmzc.supabase.co/storage/v1/object/public/gamefolio-assets/lootbox%20animation%20full.webm#t=0.1"
                  />
                </div>

                {statusLoading ? (
                  <div className="flex items-center gap-2 text-gray-400 py-4">
                    <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                    Loading...
                  </div>
                ) : status?.canOpen ? (
                  <>
                    {/* Title and subtitle */}
                    <h2 className="text-2xl font-bold text-white mb-2">
                      Your Daily Lootbox Awaits!
                    </h2>
                    <p className="text-gray-400 text-center text-sm mb-6">
                      Claim your daily reward and earn XP,<br />
                      coins, and exclusive items!
                    </p>

                    {/* Claim button */}
                    <Button
                      onClick={handleOpen}
                      disabled={openMutation.isPending}
                      className="w-full py-6 text-lg font-bold bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 rounded-xl shadow-lg shadow-purple-500/30"
                      data-testid="button-open-lootbox"
                    >
                      Claim Lootbox
                    </Button>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-4 py-4">
                    <h2 className="text-xl font-bold text-white">
                      Come Back Tomorrow!
                    </h2>
                    <div className="flex items-center gap-2 text-gray-400">
                      <Timer className="w-5 h-5" />
                      <span>Next lootbox in:</span>
                    </div>
                    <p className="text-3xl font-bold text-purple-400">
                      {status?.nextOpenAt ? formatTimeRemaining(status.nextOpenAt) : "Loading..."}
                    </p>
                    
                    {/* Reset button for testing */}
                    <Button
                      onClick={handleReset}
                      disabled={resetMutation.isPending}
                      variant="outline"
                      className="mt-2 gap-2 border-gray-600 text-gray-300 hover:bg-gray-800"
                    >
                      <RotateCcw className="w-4 h-4" />
                      {resetMutation.isPending ? "Resetting..." : "Reset for Testing"}
                    </Button>
                  </div>
                )}
              </motion.div>
            )}

            {phase === "opening" && (
              <motion.div
                key="opening"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center w-full"
              >
                <video
                  autoPlay
                  muted
                  playsInline
                  onEnded={handleVideoEnded}
                  className="w-full rounded-lg"
                  src="https://rupzmxqyhqktpifgfmzc.supabase.co/storage/v1/object/public/gamefolio-assets/lootbox%20animation%20full.webm"
                />
              </motion.div>
            )}

            {phase === "reveal" && reward && (
              <motion.div
                key="reveal"
                initial={{ opacity: 0, scale: 0.5, y: 50 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: "spring", duration: 0.6 }}
                className="flex flex-col items-center gap-4 py-8"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className={cn(
                    "relative p-1 rounded-2xl",
                    rarityStyle.bg,
                    "shadow-lg",
                    rarityStyle.glow
                  )}
                >
                  <div className={cn(
                    "w-40 h-40 rounded-xl border-2 overflow-hidden flex items-center justify-center bg-[#1a1a2e]",
                    rarityStyle.border
                  )}>
                    {reward.assetType === 'xp_reward' ? (
                      <div className="w-28 h-28 rounded-full bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-yellow-500/30">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-300 to-amber-400 flex flex-col items-center justify-center border-4 border-yellow-200/50">
                          <Zap className="w-8 h-8 text-yellow-900 mb-1" />
                          <span className="text-2xl font-bold text-yellow-900">{reward.name.match(/\d+/)?.[0] || 'XP'}</span>
                        </div>
                      </div>
                    ) : reward.imageUrl ? (
                      <img
                        src={reward.imageUrl}
                        alt={reward.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <RarityIcon className={cn("w-20 h-20", rarityStyle.text)} />
                    )}
                  </div>
                  
                  <motion.div
                    className="absolute -top-2 -right-2"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.4, type: "spring" }}
                  >
                    <div className={cn(
                      "px-3 py-1 rounded-full text-xs font-bold uppercase",
                      rarityStyle.bg,
                      rarityStyle.text,
                      "border",
                      rarityStyle.border
                    )}>
                      {reward.rarity}
                    </div>
                  </motion.div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-center"
                >
                  <h3 className="text-2xl font-bold text-white">{reward.name}</h3>
                  <p className="text-sm text-gray-400 capitalize">{reward.assetType.replace("_", " ")}</p>
                </motion.div>

                {isDuplicate && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-sm text-yellow-500"
                  >
                    You already have this reward!
                  </motion.p>
                )}

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="w-full"
                >
                  <Button 
                    onClick={handleClose} 
                    className="w-full py-6 text-lg font-bold bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 rounded-xl"
                    data-testid="button-close-lootbox"
                  >
                    Awesome!
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function LootboxTrigger({ onClick }: { onClick: () => void }) {
  const { data: status } = useQuery<LootboxStatus>({
    queryKey: ["/api/lootbox/status"],
  });

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className="relative"
      title="Daily Lootbox"
      data-testid="button-lootbox-trigger"
    >
      <Gift className="w-5 h-5" />
      {status?.canOpen && (
        <motion.span
          className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 rounded-full"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}
    </Button>
  );
}
