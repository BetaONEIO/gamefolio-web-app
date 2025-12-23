import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, Sparkles, Timer, Star, Crown, Gem, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { AssetReward } from "@shared/schema";

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
    setPhase("opening");
    openMutation.mutate();
  };

  const handleClose = () => {
    setPhase("idle");
    setReward(null);
    setIsDuplicate(false);
    onOpenChange(false);
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
      <DialogContent className="sm:max-w-md overflow-hidden bg-gradient-to-br from-background via-background to-primary/5">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Gift className="w-6 h-6 text-primary" />
            Daily Lootbox
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center py-6 min-h-[300px]">
          <AnimatePresence mode="wait">
            {phase === "idle" && (
              <motion.div
                key="idle"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex flex-col items-center gap-6"
              >
                <motion.div
                  className="relative"
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 border-2 border-primary/40 flex items-center justify-center relative overflow-hidden">
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent"
                      animate={{ opacity: [0.3, 0.6, 0.3] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    <Gift className="w-16 h-16 text-primary" />
                    <motion.div
                      className="absolute top-2 right-2"
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    >
                      <Sparkles className="w-5 h-5 text-yellow-400" />
                    </motion.div>
                  </div>
                </motion.div>

                {statusLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    Loading...
                  </div>
                ) : status?.canOpen ? (
                  <>
                    <p className="text-center text-muted-foreground">
                      Your daily lootbox is ready!
                    </p>
                    <Button
                      onClick={handleOpen}
                      disabled={openMutation.isPending}
                      className="px-8 py-3 text-lg font-semibold"
                      data-testid="button-open-lootbox"
                    >
                      <Gift className="w-5 h-5 mr-2" />
                      Open Lootbox
                    </Button>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Timer className="w-5 h-5" />
                      <span>Next lootbox in:</span>
                    </div>
                    <p className="text-2xl font-bold text-primary">
                      {status?.nextOpenAt ? formatTimeRemaining(status.nextOpenAt) : "Loading..."}
                    </p>
                    <p className="text-sm text-muted-foreground">Come back tomorrow!</p>
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
                className="flex flex-col items-center gap-6"
              >
                <motion.div
                  className="w-32 h-32 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 border-2 border-primary flex items-center justify-center"
                  animate={{
                    scale: [1, 1.1, 1, 1.15, 1],
                    rotate: [0, -5, 5, -5, 0],
                    boxShadow: [
                      "0 0 20px rgba(74, 222, 128, 0.3)",
                      "0 0 40px rgba(74, 222, 128, 0.5)",
                      "0 0 60px rgba(74, 222, 128, 0.7)",
                      "0 0 80px rgba(74, 222, 128, 0.9)",
                      "0 0 100px rgba(74, 222, 128, 1)",
                    ],
                  }}
                  transition={{ duration: 1.5, ease: "easeInOut" }}
                >
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
                  >
                    <Sparkles className="w-16 h-16 text-primary" />
                  </motion.div>
                </motion.div>
                <p className="text-lg font-semibold text-primary animate-pulse">Opening...</p>
              </motion.div>
            )}

            {phase === "reveal" && reward && (
              <motion.div
                key="reveal"
                initial={{ opacity: 0, scale: 0.5, y: 50 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: "spring", duration: 0.6 }}
                className="flex flex-col items-center gap-4"
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
                    "w-40 h-40 rounded-xl border-2 overflow-hidden flex items-center justify-center bg-card",
                    rarityStyle.border
                  )}>
                    {reward.imageUrl ? (
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
                      "px-2 py-1 rounded-full text-xs font-bold uppercase",
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
                  <h3 className="text-xl font-bold">{reward.name}</h3>
                  <p className="text-sm text-muted-foreground capitalize">{reward.assetType.replace("_", " ")}</p>
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
                >
                  <Button onClick={handleClose} data-testid="button-close-lootbox">
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
          className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}
    </Button>
  );
}
