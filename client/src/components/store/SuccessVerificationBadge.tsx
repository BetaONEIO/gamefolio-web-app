import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { CheckCircle, ExternalLink, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

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
  const [, setLocation] = useLocation();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      description: "Transaction ID copied to clipboard",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#101D27] border-none text-white p-0 max-w-[430px] w-full overflow-hidden flex flex-col [&>button]:hidden">
        <div className="relative flex-1 flex flex-col items-center px-6 pt-16 pb-8 text-center overflow-hidden">
          {/* Background Glows */}
          <div className="absolute top-[-10%] left-[-20%] w-[344px] h-[746px] bg-[#00c95033] blur-[60px] rounded-full pointer-events-none" />
          <div className="absolute top-[-10%] right-[-20%] w-[344px] h-[746px] bg-[#2b7fff1a] blur-[60px] rounded-full pointer-events-none" />

          {/* Success Label */}
          <div className="relative z-10 bg-[#00c9501a] border border-[#00c9504d] rounded-full px-4 py-1.5 mb-6">
            <span className="text-[10px] font-black text-[#00c950] uppercase tracking-[2px]">
              Transaction Confirmed
            </span>
          </div>

          <h2 className="relative z-10 text-4xl font-black text-[#f8fafc] uppercase tracking-[-0.9px] mb-4 leading-tight">
            Identity Verified
          </h2>
          
          <p className="relative z-10 text-[#94a3b8] text-base font-medium leading-[26px] mb-12 max-w-[283px]">
            You've unlocked the ultimate status symbol. Your profile now features the official verification badge.
          </p>

          {/* Badge Visual */}
          <div className="relative z-10 mb-12 group">
            {/* Soft Glow behind badge */}
            <div className="absolute inset-0 bg-[#05df724d] blur-[30px] rounded-full scale-150 opacity-50 transition-opacity group-hover:opacity-100" />
            
            {/* Badge Container */}
            <div className="relative w-[205px] h-[205px] backdrop-blur-[12px] bg-gradient-to-b from-white/10 to-transparent border border-white/20 rounded-[40px] flex items-center justify-center shadow-[0_25px_50px_-12px_rgba(0,0,0,0.4)]">
              <img
                src={badgeImage}
                alt={badgeName}
                className="w-[135px] h-[135px] object-contain drop-shadow-[0_0_20px_rgba(0,201,80,0.3)] transition-transform duration-500 group-hover:scale-110"
              />
              
              {/* Checkmark Floating Badge */}
              <div className="absolute bottom-[-10px] right-[-10px] w-[62px] h-[62px] bg-[#00c950] border-[4px] border-[#101D27] rounded-full flex items-center justify-center shadow-[0_8px_10px_-6px_rgba(0,0,0,0.1),0_20px_25px_-5px_rgba(0,0,0,0.1)]">
                <Check className="w-[31px] h-[31px] text-[#101D27] stroke-[4px]" />
              </div>
            </div>
          </div>

          {/* Transaction Info - Optional addition for utility */}
          <div className="relative z-10 w-full bg-[#0f172a]/50 backdrop-blur-sm border border-[#1e293b80] rounded-2xl p-4 mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black text-[#94a3b8] uppercase tracking-[1px]">
                Verification Hash
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

          {/* Action Buttons */}
          <div className="relative z-10 w-full space-y-3">
            <Button
              onClick={() => onOpenChange(false)}
              className="w-full h-[68px] rounded-2xl text-[#101D27] text-lg font-black uppercase bg-[#f8fafc] hover:bg-white transition-all active:scale-[0.98] shadow-[0_8px_10px_-6px_rgba(0,0,0,0.1),0_20px_25px_-5px_rgba(0,0,0,0.1)]"
              style={{ letterSpacing: '-0.9px' }}
            >
              Equip Badge
            </Button>
            <Button
              variant="ghost"
              onClick={() => setLocation('/profile')}
              className="w-full h-[52px] rounded-2xl text-[#f8fafc] text-sm font-bold uppercase bg-[#1e293b80] hover:bg-[#1e293b] transition-all"
              style={{ letterSpacing: '1.4px' }}
            >
              Back to Profile
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
