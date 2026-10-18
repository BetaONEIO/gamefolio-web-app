import { Info } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface StakingInfoDialogProps {
  iconColor?: string;
  className?: string;
}

export default function StakingInfoDialog({
  iconColor = "#B7FF18",
  className = "transition-all hover:bg-slate-700",
}: StakingInfoDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="How GFT staking works"
          className={`w-10 h-10 rounded-full flex items-center justify-center ${className}`}
          style={{ background: "#1B2A33", border: "1px solid #1B2A33" }}
        >
          <Info className="w-6 h-6" style={{ color: iconColor }} />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md border-slate-700 bg-[#0A0A10] text-white">
        <DialogHeader>
          <DialogTitle>How GFT staking works</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm leading-relaxed text-[#B8C0AE]">
          <p>
            Stake GFT from your connected wallet to earn staking rewards. The displayed APY is an estimate and can change over time.
          </p>
          <div className="space-y-2 rounded-xl border border-[#B7FF18]/20 bg-[#B7FF18]/5 p-4">
            <p><span className="font-semibold text-[#B7FF18]">No lock-up:</span> you can unstake your GFT at any time.</p>
            <p><span className="font-semibold text-[#B7FF18]">Rewards:</span> accrued rewards can be claimed from the Staking Hub.</p>
            <p><span className="font-semibold text-[#B7FF18]">Network:</span> staking, unstaking, and claiming are blockchain transactions and may take a moment to confirm.</p>
          </div>
          <p>Review the amount shown on the confirmation screen before approving a transaction.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
