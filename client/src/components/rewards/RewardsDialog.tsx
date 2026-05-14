import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Coins, Gift, Sparkles, Wallet, X } from "lucide-react";
import { Dialog, DialogContent, DialogOverlay, DialogPortal } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useRewards, type RewardRow, type ClaimError } from "@/hooks/use-rewards";

interface RewardsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatTimeRemaining(iso: string): string {
  const next = new Date(iso).getTime();
  const diff = next - Date.now();
  if (diff <= 0) return "Expired";
  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  return `${hours}h ${minutes}m`;
}

function truncateHash(hash: string): string {
  return hash.length > 14 ? `${hash.slice(0, 8)}…${hash.slice(-4)}` : hash;
}

const errorMessages: Record<ClaimError, string> = {
  NOT_FOUND: "Reward not found.",
  ALREADY_CLAIMED: "This reward was already claimed.",
  EXPIRED: "This reward has expired.",
  WALLET_REQUIRED: "You need a wallet to claim GFT.",
  TRANSFER_FAILED: "On-chain transfer failed. Please try again.",
};

function RewardCard({
  reward,
  label,
  onClaim,
  isClaiming,
  walletAddress,
  onGoToWallet,
}: {
  reward: RewardRow;
  label: string;
  onClaim: (type: "xp" | "gft") => void;
  isClaiming: boolean;
  walletAddress: string | null | undefined;
  onGoToWallet: () => void;
}) {
  const [countdown, setCountdown] = useState(() => formatTimeRemaining(reward.expiresAt));
  useEffect(() => {
    const id = setInterval(() => setCountdown(formatTimeRemaining(reward.expiresAt)), 30_000);
    return () => clearInterval(id);
  }, [reward.expiresAt]);

  const claimedAsXp = reward.claimedType === "xp";
  const claimedAsGft = reward.claimedType === "gft";

  return (
    <div className="rounded-xl border border-border bg-card/70 p-4 space-y-3" data-testid={`reward-card-${reward.cadence}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#B7FF1A]" />
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{label}</h3>
        </div>
        <span className="text-xs text-muted-foreground">{countdown} left</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-background/60 p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">XP</p>
          <p className="text-2xl font-bold text-[#B7FF1A]">{reward.xpAmount.toLocaleString()}</p>
        </div>
        <div className="rounded-lg bg-background/60 p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">GFT</p>
          <p className="text-2xl font-bold text-[#B7FF1A]">{reward.gftAmount}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          className="flex-1 bg-gradient-to-r from-[#B7FF1A] to-[#A2F000] text-[#071013] hover:from-[#A2F000] hover:to-[#6FA800]"
          disabled={isClaiming || !!reward.claimedAt}
          onClick={() => onClaim("xp")}
          data-testid={`button-claim-xp-${reward.cadence}`}
        >
          <Sparkles className="h-4 w-4 mr-2" />
          {claimedAsXp ? "Claimed" : `Claim ${reward.xpAmount} XP`}
        </Button>
        {walletAddress ? (
          <Button
            variant="outline"
            className="flex-1"
            disabled={isClaiming || !!reward.claimedAt}
            onClick={() => onClaim("gft")}
            data-testid={`button-claim-gft-${reward.cadence}`}
          >
            <Coins className="h-4 w-4 mr-2" />
            {claimedAsGft ? "Claimed" : `Claim ${reward.gftAmount} GFT`}
          </Button>
        ) : (
          <Button
            variant="outline"
            className="flex-1"
            onClick={onGoToWallet}
            data-testid={`button-claim-gft-${reward.cadence}-wallet`}
          >
            <Wallet className="h-4 w-4 mr-2" />
            Set up wallet
          </Button>
        )}
      </div>
    </div>
  );
}

export function RewardsDialog({ open, onOpenChange }: RewardsDialogProps) {
  const { daily, weekly, hasClaimable, claim, isClaiming, isLoading } = useRewards();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleClaim = async (cadence: "daily" | "weekly", type: "xp" | "gft") => {
    const reward = cadence === "daily" ? daily : weekly;
    if (!reward) return;
    try {
      const result = await claim({ rewardId: reward.id, type });
      if (type === "xp") {
        toast({
          title: "XP claimed!",
          description: `+${result.claimAmount} XP — you now have ${result.newTotalXp?.toLocaleString() ?? "?"} total.`,
          variant: "gamefolioSuccess" as any,
        });
      } else {
        toast({
          title: "GFT sent",
          description: result.txHash
            ? `Tx: ${truncateHash(result.txHash)} — check your wallet.`
            : "Check your wallet for the transfer.",
          variant: "gamefolioSuccess" as any,
        });
      }
    } catch (err: any) {
      const code: ClaimError = err?.error ?? "NOT_FOUND";
      if (code === "WALLET_REQUIRED") {
        setLocation("/wallet");
        onOpenChange(false);
        return;
      }
      toast({
        title: "Couldn't claim",
        description: errorMessages[code] ?? "Something went wrong.",
        variant: "gamefolioError" as any,
      });
    }
  };

  const handleGoToWallet = () => {
    onOpenChange(false);
    setLocation("/wallet");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="bg-black/70 backdrop-blur-sm" />
        <DialogContent className="max-w-md bg-card border-border p-0 overflow-hidden gap-0 [&>button]:hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-[#B7FF1A]" />
              <h2 className="text-lg font-bold">Rewards</h2>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted/50"
              aria-label="Close"
              data-testid="button-close-rewards"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="px-5 pb-5 space-y-3">
            {isLoading && (
              <div className="space-y-3">
                <div className="h-32 rounded-xl bg-muted/40 animate-pulse" />
                <div className="h-32 rounded-xl bg-muted/40 animate-pulse" />
              </div>
            )}

            {!isLoading && !hasClaimable && (
              <div className="text-center py-8 text-muted-foreground">
                <Gift className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No rewards available right now.</p>
                <p className="text-xs mt-1">Check back tomorrow!</p>
              </div>
            )}

            {daily && (
              <RewardCard
                reward={daily}
                label="Daily"
                onClaim={(type) => handleClaim("daily", type)}
                isClaiming={isClaiming}
                walletAddress={user?.walletAddress}
                onGoToWallet={handleGoToWallet}
              />
            )}
            {weekly && (
              <RewardCard
                reward={weekly}
                label="Weekly"
                onClaim={(type) => handleClaim("weekly", type)}
                isClaiming={isClaiming}
                walletAddress={user?.walletAddress}
                onGoToWallet={handleGoToWallet}
              />
            )}
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}

export default RewardsDialog;
