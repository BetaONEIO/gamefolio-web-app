import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Info, ShieldCheck } from "lucide-react";
import gfTokenLogo from "@assets/Gamefolio token_1762633908726.png";
import AssetPurchaseProcessing from "./AssetPurchaseProcessing";
import { SuccessVerificationBadge } from "./SuccessVerificationBadge";
import { useState } from "react";

interface VerificationBadge {
  id: number;
  name: string;
  imageUrl: string;
  rarity: string;
  gfCost: number;
}

interface VerificationBadgeCheckoutDialogProps {
  badge: VerificationBadge | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (id: number) => void;
  isPurchasing: boolean;
  gfBalance: number;
}

export function VerificationBadgeCheckoutDialog({
  badge,
  open,
  onOpenChange,
  onConfirm,
  isPurchasing,
  gfBalance,
}: VerificationBadgeCheckoutDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [transactionId, setTransactionId] = useState("");

  if (!badge) return null;

  const networkFee = 12; // Based on design: generated_12_170_1140
  const totalCost = badge.gfCost + networkFee;
  const canAfford = gfBalance >= totalCost;

  const handleConfirm = () => {
    setIsProcessing(true);
    onConfirm(badge.id);
  };

  const handleProcessingComplete = () => {
    setIsProcessing(false);
    setTransactionId("0x" + Math.random().toString(16).slice(2, 10) + "..." + Math.random().toString(16).slice(2, 6));
    setShowSuccess(true);
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setIsProcessing(false);
      setShowSuccess(false);
    }, 300);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-[#101D27] border-none text-white p-0 max-w-[430px] w-full h-[90vh] max-h-[900px] overflow-hidden flex flex-col [&>button]:hidden">
          {isProcessing || isPurchasing ? (
            <AssetPurchaseProcessing onComplete={handleProcessingComplete} />
          ) : (
            <div className="flex-1 flex flex-col">
              {/* Header */}
              <div className="flex items-center gap-4 px-6 pt-12 pb-6">
                <button
                  onClick={() => onOpenChange(false)}
                  className="w-10 h-10 rounded-full bg-[#1e293b]/50 flex items-center justify-center transition-colors hover:bg-[#1e293b]/80"
                >
                  <ArrowLeft className="h-6 w-6 text-white" />
                </button>
                <span className="text-xl font-bold text-[#f8fafc] uppercase tracking-[-0.5px]">
                  Checkout
                </span>
              </div>

              <div className="flex-1 overflow-y-auto px-6 space-y-8 hide-scrollbar">
                <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>
                
                {/* Item Details Section */}
                <div className="space-y-4">
                  <span className="text-[12px] font-black text-[#94a3b8] uppercase tracking-[2.4px]">Item Details</span>
                  <div className="bg-[#0f172a] border border-[#1e293b80] rounded-[24px] p-6 flex items-center gap-5">
                    <div className="w-24 h-24 bg-[#1e293b4d] border border-[#1e293b4d] rounded-[16px] flex items-center justify-center p-4 overflow-hidden">
                      <img src={badge.imageUrl} alt={badge.name} className="w-full h-full object-contain" />
                    </div>
                    <div className="flex flex-col justify-center">
                      <span className="text-[10px] font-black text-[#00c950] uppercase tracking-[1px] mb-1">Identity Series</span>
                      <h3 className="text-2xl font-black text-[#f8fafc] uppercase tracking-[-0.6px] leading-tight mb-1">{badge.name}</h3>
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#94a3b8]" />
                        <span className="text-[12px] font-bold text-[#94a3b8]">Legendary Asset</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Purchase Summary Section */}
                <div className="space-y-4">
                  <span className="text-[12px] font-black text-[#94a3b8] uppercase tracking-[2.4px]">Purchase Summary</span>
                  <div className="bg-[#0f172a] border border-[#1e293b80] rounded-[24px] overflow-hidden">
                    <div className="flex justify-between items-center p-4 border-b border-[#1e293b4d]">
                      <span className="text-sm text-[#94a3b8]">Price</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-[#f8fafc]">{badge.gfCost}</span>
                        <div className="bg-[#4ade801a] rounded px-1.5 py-0.5">
                          <span className="text-[10px] font-bold text-[#4ade80] uppercase">GF</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center p-4 border-b border-[#1e293b4d]">
                      <span className="text-sm text-[#94a3b8]">Network Fee</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-[#f8fafc]">{networkFee}</span>
                        <div className="bg-[#4ade801a] rounded px-1.5 py-0.5">
                          <span className="text-[10px] font-bold text-[#4ade80] uppercase">GF</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center p-5">
                      <span className="text-[16px] font-bold text-[#f8fafc] uppercase tracking-[1.4px]">Total Cost</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-[#4ade80] tracking-[-0.5px] uppercase">{totalCost}</span>
                        <span className="text-2xl font-black text-[#4ade80] tracking-[-0.5px] uppercase ml-1">GF</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Wallet Balance Section */}
                <div className="space-y-4">
                  <div className="bg-[#1e293b33] border border-[#1e293b4d] rounded-[16px] p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#4ade801a] flex items-center justify-center p-2.5">
                        <img src={gfTokenLogo} alt="G" className="w-full h-full" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-[#94a3b8] uppercase">Your Balance</span>
                        <span className={`text-lg font-bold ${canAfford ? 'text-[#f8fafc]' : 'text-red-400'}`}>{gfBalance} GF</span>
                      </div>
                    </div>
                    {!canAfford && (
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-bold text-red-400 uppercase">Insufficient Funds</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Action */}
              <div className="p-6 bg-[#101D27] space-y-4">
                <Button
                  disabled
                  className="w-full h-[68px] rounded-[16px] text-black text-lg font-black uppercase cursor-not-allowed opacity-50"
                  style={{
                    background: '#1e293b',
                    color: '#475569',
                    letterSpacing: '-0.9px',
                  }}
                >
                  Confirm Purchase
                </Button>
                <div className="flex items-center justify-center gap-2">
                  <Info className="w-3 h-3 text-[#94a3b8]" />
                  <span className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-[1px]">
                    Instant identity verification included
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <SuccessVerificationBadge
        open={showSuccess}
        onOpenChange={(val) => {
          setShowSuccess(val);
          if (!val) handleClose();
        }}
        badgeName={badge.name}
        badgeImage={badge.imageUrl}
        transactionId={transactionId}
      />
    </>
  );
}
