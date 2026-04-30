import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, Sparkles, Star, Crown, Gem, Package, Check, ArrowRight, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { AssetReward } from "@shared/schema";

interface WelcomePackReward {
  type: "nft_voucher" | "store_item" | "animated_border";
  reward: AssetReward | null;
  name: string;
  description: string;
  imageUrl?: string;
}

interface WelcomePackResult {
  rewards: WelcomePackReward[];
  success: boolean;
  message: string;
}

interface WelcomePackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClaimComplete?: () => void;
}

const rarityColors: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  common: { bg: "bg-gray-500/20", border: "border-gray-400", text: "text-gray-300", glow: "shadow-gray-500/50" },
  rare: { bg: "bg-blue-500/20", border: "border-blue-400", text: "text-blue-300", glow: "shadow-blue-500/50" },
  epic: { bg: "bg-orange-500/20", border: "border-orange-400", text: "text-orange-300", glow: "shadow-orange-500/50" },
  legendary: { bg: "bg-amber-500/20", border: "border-amber-400", text: "text-amber-300", glow: "shadow-amber-500/50" },
};

const rewardTypeLabels: Record<string, { label: string; color: string }> = {
  nft_voucher: { label: "NFT Lootbox Voucher", color: "text-amber-400" },
  store_item: { label: "Store Item", color: "text-primary" },
  animated_border: { label: "Animated Border", color: "text-primary" },
};

export function WelcomePackDialog({ open, onOpenChange, onClaimComplete }: WelcomePackDialogProps) {
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<"preview" | "claiming" | "reveal" | "complete">("preview");
  const [rewards, setRewards] = useState<WelcomePackReward[]>([]);
  const [currentRevealIndex, setCurrentRevealIndex] = useState(0);
  const [claimSuccess, setClaimSuccess] = useState(false);

  const claimMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/welcome-pack/claim");
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      return response.json() as Promise<WelcomePackResult>;
    },
    onSuccess: (data: WelcomePackResult) => {
      setClaimSuccess(true);
      setRewards(data.rewards);
      setCurrentRevealIndex(0);
      setTimeout(() => setPhase("reveal"), 1500);
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/lootbox/rewards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/welcome-pack/status"] });
    },
    onError: (error: Error) => {
      console.error("Failed to claim welcome pack:", error);
      setPhase("preview");
    },
  });

  const handleClaim = () => {
    setPhase("claiming");
    claimMutation.mutate();
  };

  const handleNextReveal = () => {
    if (currentRevealIndex < rewards.length - 1) {
      setCurrentRevealIndex(prev => prev + 1);
    } else {
      setPhase("complete");
    }
  };

  const handleDismiss = (newOpen: boolean) => {
    if (!newOpen) {
      const wasSuccessfulClaim = claimSuccess;
      setPhase("preview");
      setRewards([]);
      setCurrentRevealIndex(0);
      setClaimSuccess(false);
      onOpenChange(false);
      if (wasSuccessfulClaim && onClaimComplete) {
        onClaimComplete();
      }
    }
  };

  const handleClaimComplete = () => {
    setPhase("preview");
    setRewards([]);
    setCurrentRevealIndex(0);
    setClaimSuccess(false);
    onOpenChange(false);
    if (onClaimComplete) {
      onClaimComplete();
    }
  };

  useEffect(() => {
    if (!open) {
      setPhase("preview");
      setRewards([]);
      setCurrentRevealIndex(0);
      setClaimSuccess(false);
    }
  }, [open]);

  const currentReward = rewards[currentRevealIndex];
  const rarity = currentReward?.reward?.rarity || "rare";
  const rarityStyle = rarityColors[rarity] || rarityColors.rare;

  return (
    <Dialog open={open} onOpenChange={handleDismiss}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden bg-gradient-to-b from-[#0f0f1a] to-[#1a1a2e] border border-amber-500/30 rounded-2xl">
        <div className="flex flex-col items-center px-6 py-8">
          <AnimatePresence mode="wait">
            {phase === "preview" && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex flex-col items-center w-full"
              >
                <motion.div
                  className="relative mb-6"
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <div className="absolute inset-0 bg-amber-500/20 blur-3xl rounded-full scale-150" />
                  
                  <div className="relative w-32 h-32 flex items-center justify-center">
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 rounded-2xl"
                      animate={{ rotate: [0, 5, -5, 0] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <div className="relative z-10 w-28 h-28 bg-gradient-to-br from-amber-300 to-orange-400 rounded-xl flex items-center justify-center border-4 border-amber-200/50">
                      <Gift className="w-14 h-14 text-amber-900" />
                    </div>
                    
                    <motion.div
                      className="absolute -top-3 -right-3"
                      animate={{ rotate: [0, 360], scale: [1, 1.2, 1] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    >
                      <Sparkles className="w-6 h-6 text-amber-400" />
                    </motion.div>
                    <motion.div
                      className="absolute -bottom-2 -left-3"
                      animate={{ rotate: [0, -360], scale: [1, 1.3, 1] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    >
                      <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                    </motion.div>
                  </div>
                </motion.div>

                <div className="text-center mb-6">
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 bg-clip-text text-transparent mb-2">
                    Welcome Pack!
                  </h2>
                  <p className="text-gray-400 text-sm">
                    Congratulations on joining Gamefolio!<br />
                    Claim your exclusive starter rewards.
                  </p>
                </div>

                <div className="w-full space-y-3 mb-6">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                      <Gift className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-amber-400">NFT Lootbox Voucher</p>
                      <p className="text-xs text-gray-500">Redeem for exclusive NFTs</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Package className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-primary">Random Store Item</p>
                      <p className="text-xs text-gray-500">A surprise from the store</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Crown className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-primary">Animated Profile Border</p>
                      <p className="text-xs text-gray-500">Make your avatar stand out</p>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleClaim}
                  disabled={claimMutation.isPending}
                  className="w-full py-6 text-lg font-bold bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:from-amber-400 hover:via-orange-400 hover:to-red-400 rounded-xl shadow-lg shadow-amber-500/30"
                  data-testid="button-claim-welcome-pack"
                >
                  Claim Welcome Pack
                </Button>
              </motion.div>
            )}

            {phase === "claiming" && (
              <motion.div
                key="claiming"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-6 py-12"
              >
                <motion.div
                  className="relative w-32 h-32"
                  animate={{
                    scale: [1, 1.1, 1, 1.15, 1],
                    rotate: [0, -3, 3, -3, 0],
                  }}
                  transition={{ duration: 1.5, ease: "easeInOut" }}
                >
                  <motion.div
                    className="absolute inset-0 bg-amber-500/40 blur-3xl rounded-full scale-200"
                    animate={{ opacity: [0.4, 0.8, 0.4] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                  />
                  
                  <div className="relative z-10 w-full h-full bg-gradient-to-br from-amber-300 to-orange-400 rounded-xl flex items-center justify-center border-4 border-amber-200/50">
                    <Gift className="w-14 h-14 text-amber-900 animate-bounce" />
                  </div>
                  
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
                      <Sparkles className="w-4 h-4 text-amber-400" />
                    </motion.div>
                  ))}
                </motion.div>
                <p className="text-lg font-semibold text-amber-400 animate-pulse">Opening your pack...</p>
              </motion.div>
            )}

            {phase === "reveal" && currentReward && (
              <motion.div
                key={`reveal-${currentRevealIndex}`}
                initial={{ opacity: 0, scale: 0.5, y: 50 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: "spring", duration: 0.6 }}
                className="flex flex-col items-center gap-4 py-4 w-full"
              >
                <div className="text-sm text-gray-400 mb-2">
                  Reward {currentRevealIndex + 1} of {rewards.length}
                </div>

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
                    {currentReward.imageUrl ? (
                      <img
                        src={currentReward.imageUrl}
                        alt={currentReward.name}
                        className="w-full h-full object-cover"
                      />
                    ) : currentReward.type === "nft_voucher" ? (
                      <div className="w-28 h-28 rounded-lg bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 flex items-center justify-center shadow-lg">
                        <Gift className="w-12 h-12 text-white" />
                      </div>
                    ) : currentReward.type === "store_item" ? (
                      <div className="w-28 h-28 rounded-lg bg-gradient-to-br from-[#B7FF1A] to-[#A2F000] flex items-center justify-center shadow-lg">
                        <Package className="w-12 h-12 text-white" />
                      </div>
                    ) : (
                      <div className="w-28 h-28 rounded-lg bg-gradient-to-br from-[#B7FF1A] to-[#A2F000] flex items-center justify-center shadow-lg">
                        <Crown className="w-12 h-12 text-white" />
                      </div>
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
                      {rarity}
                    </div>
                  </motion.div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-center"
                >
                  <p className={cn("text-xs font-medium mb-1", rewardTypeLabels[currentReward.type]?.color || "text-gray-400")}>
                    {rewardTypeLabels[currentReward.type]?.label || "Reward"}
                  </p>
                  <h3 className="text-2xl font-bold text-white">{currentReward.name}</h3>
                  <p className="text-sm text-gray-400 mt-1">{currentReward.description}</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="w-full mt-4"
                >
                  <Button 
                    onClick={handleNextReveal} 
                    className="w-full py-6 text-lg font-bold bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:from-amber-400 hover:via-orange-400 hover:to-red-400 rounded-xl"
                    data-testid="button-next-reward"
                  >
                    {currentRevealIndex < rewards.length - 1 ? (
                      <>
                        Next Reward <ArrowRight className="ml-2 w-5 h-5" />
                      </>
                    ) : (
                      <>
                        View All Rewards <Check className="ml-2 w-5 h-5" />
                      </>
                    )}
                  </Button>
                </motion.div>
              </motion.div>
            )}

            {phase === "complete" && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-6 py-6 w-full"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200 }}
                  className="w-20 h-20 rounded-full bg-gradient-to-br from-[#B7FF1A] to-[#6FA800] flex items-center justify-center shadow-lg shadow-primary/30"
                >
                  <Check className="w-10 h-10 text-white" />
                </motion.div>

                <div className="text-center">
                  <h2 className="text-2xl font-bold text-white mb-2">All Rewards Claimed!</h2>
                  <p className="text-gray-400 text-sm">
                    Your rewards have been added to your wallet.<br />
                    Check them out now!
                  </p>
                </div>

                <div className="w-full space-y-2">
                  {rewards.map((reward, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10"
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        reward.type === "nft_voucher" ? "bg-amber-500/20" :
                        reward.type === "store_item" ? "bg-primary/20" : "bg-primary/20"
                      )}>
                        {reward.type === "nft_voucher" ? (
                          <Gift className="w-5 h-5 text-amber-400" />
                        ) : reward.type === "store_item" ? (
                          <Package className="w-5 h-5 text-primary" />
                        ) : (
                          <Crown className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{reward.name}</p>
                        <p className={cn("text-xs", rewardTypeLabels[reward.type]?.color || "text-gray-400")}>
                          {rewardTypeLabels[reward.type]?.label}
                        </p>
                      </div>
                      <Check className="w-5 h-5 text-primary" />
                    </motion.div>
                  ))}
                </div>

                <Button 
                  onClick={handleClaimComplete} 
                  className="w-full py-6 text-lg font-bold bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:from-amber-400 hover:via-orange-400 hover:to-red-400 rounded-xl flex items-center justify-center gap-2"
                  data-testid="button-go-to-wallet"
                >
                  <Wallet className="w-5 h-5" />
                  Go to Wallet
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
