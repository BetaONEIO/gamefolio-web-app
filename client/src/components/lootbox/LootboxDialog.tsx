import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, Sparkles, Timer, Star, Crown, Gem, Package, Zap, Coins, X } from "lucide-react";
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
      setTimeout(() => setPhase("reveal"), 1500);
      queryClient.invalidateQueries({ queryKey: ["/api/lootbox/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/lootbox/rewards"] });
    },
    onError: (error: Error) => {
      console.error("Failed to open lootbox:", error);
      setPhase("idle");
    },
  });

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
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-[#0f0f1a] border border-purple-900/30 rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-start px-6 pt-6">
          <div className="flex items-center gap-2">
            <Gift className="w-6 h-6 text-purple-500" />
            <span className="text-lg font-semibold text-white">Daily Lootbox</span>
          </div>
        </div>

        <div className="flex flex-col items-center px-6 pb-6">
          <AnimatePresence mode="wait">
            {phase === "idle" && (
              <motion.div
                key="idle"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex flex-col items-center w-full"
              >
                {/* Lootbox Chest */}
                <motion.div
                  className="relative my-6"
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  {/* Glow effect behind chest */}
                  <div className="absolute inset-0 bg-purple-500/20 blur-3xl rounded-full scale-150" />
                  
                  {/* Chest container */}
                  <div className="relative w-40 h-36">
                    {/* Chest body - dark blue/green */}
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-36 h-24 bg-gradient-to-b from-[#2a3f4f] to-[#1a2a35] rounded-lg border-2 border-[#1a2a35] shadow-lg">
                      {/* Chest straps */}
                      <div className="absolute inset-x-0 top-0 h-full">
                        <div className="absolute left-2 top-0 w-3 h-full bg-gradient-to-b from-[#7ddb5c] to-[#4fa83d] rounded-sm" />
                        <div className="absolute right-2 top-0 w-3 h-full bg-gradient-to-b from-[#7ddb5c] to-[#4fa83d] rounded-sm" />
                      </div>
                      {/* Chest lock */}
                      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-10 bg-gradient-to-b from-gray-300 to-gray-400 rounded-sm flex items-center justify-center border border-gray-500">
                        <div className="w-3 h-4 bg-[#1a2a35] rounded-sm" />
                      </div>
                      {/* Chest ring */}
                      <div className="absolute left-1/2 bottom-2 -translate-x-1/2 w-6 h-6 border-4 border-[#3a8a9a] rounded-full bg-transparent" />
                    </div>
                    
                    {/* Chest lid */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-36 h-12 bg-gradient-to-b from-[#3a5060] to-[#2a3f4f] rounded-t-xl border-2 border-[#1a2a35]">
                      {/* Lid straps */}
                      <div className="absolute left-2 top-0 w-3 h-full bg-gradient-to-b from-[#7ddb5c] to-[#5fc044] rounded-t-lg" />
                      <div className="absolute right-2 top-0 w-3 h-full bg-gradient-to-b from-[#7ddb5c] to-[#5fc044] rounded-t-lg" />
                      {/* Lid curve on straps */}
                      <div className="absolute left-0 -top-1 w-8 h-4 bg-gradient-to-r from-[#7ddb5c] to-[#5fc044] rounded-tl-xl" />
                      <div className="absolute right-0 -top-1 w-8 h-4 bg-gradient-to-l from-[#7ddb5c] to-[#5fc044] rounded-tr-xl" />
                    </div>
                    
                    {/* Sparkle effects */}
                    <motion.div
                      className="absolute -top-2 -right-2"
                      animate={{ rotate: [0, 360], scale: [1, 1.2, 1] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    >
                      <Sparkles className="w-5 h-5 text-yellow-400" />
                    </motion.div>
                    <motion.div
                      className="absolute -bottom-1 -left-3"
                      animate={{ rotate: [0, -360], scale: [1, 1.3, 1] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    >
                      <Sparkles className="w-4 h-4 text-purple-400" />
                    </motion.div>
                  </div>
                </motion.div>

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

                    {/* What's Inside section */}
                    <div className="w-full mt-6 pt-6 border-t border-gray-800">
                      <h3 className="text-center font-bold text-white mb-4">What's Inside?</h3>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 text-gray-300">
                          <Zap className="w-5 h-5 text-yellow-400" />
                          <span>100-500 XP</span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-300">
                          <Coins className="w-5 h-5 text-amber-400" />
                          <span>50-200 Coins</span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-300">
                          <Star className="w-5 h-5 text-purple-400" />
                          <span>Rare Items</span>
                        </div>
                      </div>
                    </div>
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
                    
                    {/* What's Inside section */}
                    <div className="w-full mt-4 pt-4 border-t border-gray-800">
                      <h3 className="text-center font-bold text-white mb-4">What's Inside?</h3>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 text-gray-300">
                          <Zap className="w-5 h-5 text-yellow-400" />
                          <span>100-500 XP</span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-300">
                          <Coins className="w-5 h-5 text-amber-400" />
                          <span>50-200 Coins</span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-300">
                          <Star className="w-5 h-5 text-purple-400" />
                          <span>Rare Items</span>
                        </div>
                      </div>
                    </div>
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
                className="flex flex-col items-center gap-6 py-12"
              >
                <motion.div
                  className="relative w-40 h-36"
                  animate={{
                    scale: [1, 1.1, 1, 1.15, 1],
                    rotate: [0, -3, 3, -3, 0],
                  }}
                  transition={{ duration: 1.5, ease: "easeInOut" }}
                >
                  {/* Intense glow during opening */}
                  <motion.div
                    className="absolute inset-0 bg-purple-500/40 blur-3xl rounded-full scale-200"
                    animate={{ opacity: [0.4, 0.8, 0.4] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                  />
                  
                  {/* Chest body */}
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-36 h-24 bg-gradient-to-b from-[#2a3f4f] to-[#1a2a35] rounded-lg border-2 border-purple-500 shadow-lg shadow-purple-500/50">
                    <div className="absolute inset-x-0 top-0 h-full">
                      <div className="absolute left-2 top-0 w-3 h-full bg-gradient-to-b from-[#7ddb5c] to-[#4fa83d] rounded-sm" />
                      <div className="absolute right-2 top-0 w-3 h-full bg-gradient-to-b from-[#7ddb5c] to-[#4fa83d] rounded-sm" />
                    </div>
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-10 bg-gradient-to-b from-yellow-300 to-yellow-500 rounded-sm flex items-center justify-center border border-yellow-600 animate-pulse">
                      <div className="w-3 h-4 bg-[#1a2a35] rounded-sm" />
                    </div>
                    <div className="absolute left-1/2 bottom-2 -translate-x-1/2 w-6 h-6 border-4 border-[#3a8a9a] rounded-full bg-transparent" />
                  </div>
                  
                  {/* Lid bouncing */}
                  <motion.div
                    className="absolute top-4 left-1/2 -translate-x-1/2 w-36 h-12 bg-gradient-to-b from-[#3a5060] to-[#2a3f4f] rounded-t-xl border-2 border-purple-500"
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 0.2, repeat: Infinity }}
                  >
                    <div className="absolute left-2 top-0 w-3 h-full bg-gradient-to-b from-[#7ddb5c] to-[#5fc044] rounded-t-lg" />
                    <div className="absolute right-2 top-0 w-3 h-full bg-gradient-to-b from-[#7ddb5c] to-[#5fc044] rounded-t-lg" />
                    <div className="absolute left-0 -top-1 w-8 h-4 bg-gradient-to-r from-[#7ddb5c] to-[#5fc044] rounded-tl-xl" />
                    <div className="absolute right-0 -top-1 w-8 h-4 bg-gradient-to-l from-[#7ddb5c] to-[#5fc044] rounded-tr-xl" />
                  </motion.div>
                  
                  {/* Flying sparkles */}
                  {[...Array(6)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute left-1/2 top-1/2"
                      animate={{
                        x: [0, (i % 2 === 0 ? 1 : -1) * (30 + i * 10)],
                        y: [0, -40 - i * 10],
                        opacity: [1, 0],
                        scale: [1, 0.5],
                      }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        delay: i * 0.2,
                      }}
                    >
                      <Sparkles className="w-4 h-4 text-yellow-400" />
                    </motion.div>
                  ))}
                </motion.div>
                <p className="text-lg font-semibold text-purple-400 animate-pulse">Opening...</p>
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
