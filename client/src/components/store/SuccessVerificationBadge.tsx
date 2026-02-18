import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { CheckCircle, ExternalLink, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface SuccessVerificationBadgeProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  badgeName: string;
  badgeImage: string;
  transactionId: string;
}

export function SuccessVerificationBadge({
  open,
  onOpenChange,
  badgeName,
  badgeImage,
  transactionId,
}: SuccessVerificationBadgeProps) {
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      description: "Transaction ID copied to clipboard",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#020617] border-none text-white p-0 max-w-[430px] w-full overflow-hidden flex flex-col [&>button]:hidden">
        <div className="flex-1 flex flex-col items-center px-6 pt-12 pb-8 text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 rounded-full bg-[#00c9501a] flex items-center justify-center mb-6">
            <CheckCircle className="w-10 h-10 text-[#00c950]" />
          </div>

          <h2 className="text-3xl font-black text-[#f8fafc] uppercase tracking-[-1px] mb-2">
            Verification Confirmed!
          </h2>
          <p className="text-[#94a3b8] text-sm mb-8">
            Your Identity Series badge has been successfully minted and added to your profile.
          </p>

          {/* Asset Preview */}
          <div className="w-full aspect-[398/266] rounded-3xl overflow-hidden border border-[#00c95033] bg-gradient-to-b from-[#00c9500d] to-transparent flex items-center justify-center mb-8 relative shadow-[0_20px_40px_-12px_rgba(0,201,80,0.2)]">
            <img
              src={badgeImage}
              alt={badgeName}
              className="w-40 h-40 object-contain drop-shadow-[0_0_20px_rgba(0,201,80,0.3)]"
            />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#00c95033] backdrop-blur-md border border-[#00c95080] rounded-full px-4 py-1">
              <span className="text-[10px] font-black text-[#00c950] uppercase tracking-[1px]">
                {badgeName}
              </span>
            </div>
          </div>

          {/* Transaction Info */}
          <div className="w-full bg-[#0f172a] border border-[#1e293b80] rounded-2xl p-4 mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black text-[#94a3b8] uppercase tracking-[1px]">
                Transaction ID
              </span>
              <button 
                onClick={() => copyToClipboard(transactionId)}
                className="text-[#00c950] hover:text-[#00e05a] transition-colors"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-mono text-[#f8fafc] truncate flex-1 text-left">
                {transactionId}
              </span>
              <ExternalLink className="w-4 h-4 text-[#475569]" />
            </div>
          </div>

          {/* Action Button */}
          <Button
            onClick={() => onOpenChange(false)}
            className="w-full h-[68px] rounded-2xl text-black text-lg font-black uppercase bg-[#00c950] hover:bg-[#00e05a] transition-all active:scale-[0.98] shadow-[0_8px_20px_-6px_rgba(0,201,80,0.4)]"
          >
            Back to Store
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
