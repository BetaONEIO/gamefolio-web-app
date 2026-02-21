import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Info } from "lucide-react";
import gfTokenLogo from "@assets/Gamefolio token_1762633908726.png";
import AssetPurchaseProcessing from "./AssetPurchaseProcessing";
import { SuccessDashNameTag } from "./SuccessDashNameTag";
import { useState } from "react";

interface NameTag {
  id: number;
  name: string;
  imageUrl: string;
  rarity: string;
  gfCost: number;
}

interface NameTagCheckoutDialogProps {
  nameTag: NameTag | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (id: number) => void;
  isPurchasing: boolean;
  gfBalance: number;
}

export function NameTagCheckoutDialog({
  nameTag,
  open,
  onOpenChange,
  onConfirm,
  isPurchasing,
  gfBalance,
}: NameTagCheckoutDialogProps) {
  const [showSuccess, setShowSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!nameTag) return null;

  const networkFee = 25;
  const totalCost = nameTag.gfCost + networkFee;
  const canAfford = gfBalance >= totalCost;

  const handleConfirm = () => {
    setIsProcessing(true);
    onConfirm(nameTag.id);
  };

  const handleProcessingComplete = () => {
    setIsProcessing(false);
    setShowSuccess(true);
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state after dialog animation completes
    setTimeout(() => {
      setShowSuccess(false);
      setIsProcessing(false);
    }, 300);
  };

  const rarityColor = nameTag.rarity?.toLowerCase() === 'legendary' ? '#f0b100'
    : nameTag.rarity?.toLowerCase() === 'epic' ? '#a855f7'
    : nameTag.rarity?.toLowerCase() === 'rare' ? '#2b7fff'
    : '#94a3b8';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#020617] border-none text-white p-0 max-w-[430px] w-full h-[90vh] max-h-[900px] overflow-hidden flex flex-col [&>button]:hidden">
        {showSuccess ? (
          <SuccessDashNameTag
            assetName={nameTag.name}
            rarity={nameTag.rarity}
            imageUrl={nameTag.imageUrl}
            transactionId="0x7dF39e...4a2b"
            totalCost={totalCost}
            onClose={handleClose}
          />
        ) : isProcessing || isPurchasing ? (
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
                <div className="bg-[#0f172a] border border-[#f0b10033] rounded-[24px] p-4 flex items-center gap-4 shadow-[0_10px_15px_-3px_rgba(255,105,0,0.05)]">
                  <div className="w-24 h-24 bg-black border border-white/10 rounded-[16px] overflow-hidden flex-shrink-0">
                    <img src={nameTag.imageUrl} alt={nameTag.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col justify-center">
                    <span className="text-[10px] font-black text-[#f0b100] uppercase tracking-[1px] mb-1">Gamefolio Collection</span>
                    <h3 className="text-2xl font-black text-[#f8fafc] uppercase tracking-[-1.2px] leading-tight mb-1">{nameTag.name}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-[0.5px]">Type</span>
                      <span className="text-[12px] font-bold text-[#f8fafc]">Name Tag</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Purchase Summary Section */}
              <div className="space-y-4">
                <span className="text-[12px] font-black text-[#94a3b8] uppercase tracking-[2.4px]">Purchase Summary</span>
                <div className="bg-[#0f172a] border border-[#1e293b80] rounded-[24px] overflow-hidden shadow-sm">
                  <div className="flex justify-between items-center p-4 border-b border-[#1e293b4d]">
                    <span className="text-sm text-[#94a3b8]">Item Price</span>
                    <span className="text-sm font-bold text-[#f8fafc]">{nameTag.gfCost} GF</span>
                  </div>
                  <div className="flex justify-between items-center p-4 border-b border-[#1e293b4d]">
                    <span className="text-sm text-[#94a3b8]">Network Fee</span>
                    <span className="text-sm font-bold text-[#f8fafc]">{networkFee} GF</span>
                  </div>
                  <div className="flex justify-between items-center p-5 bg-[#f0b1000d]">
                    <span className="text-sm font-black text-[#f8fafc] uppercase tracking-[1.4px]">Total</span>
                    <div className="text-right">
                      <div className="text-2xl font-black text-[#f0b100] tracking-[-0.6px]">{totalCost} GF</div>
                      <div className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-[0.5px]">≈ £{(totalCost * 0.01).toFixed(2)} GBP</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Wallet Balance Section */}
              <div className="space-y-4">
                <span className="text-[12px] font-black text-[#94a3b8] uppercase tracking-[2.4px]">Wallet Balance</span>
                <div className={`p-4 rounded-[24px] border flex items-center justify-between ${canAfford ? 'bg-[#0f172a] border-[#1e293b80]' : 'bg-red-500/10 border-red-500/50'}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#1e293b]/50 flex items-center justify-center">
                      <img src={gfTokenLogo} alt="GF" className="w-6 h-6" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-[#94a3b8] uppercase tracking-[1px]">Your Balance</span>
                      <span className={`text-lg font-bold ${canAfford ? 'text-[#f8fafc]' : 'text-red-400'}`}>{gfBalance} GF</span>
                    </div>
                  </div>
                  {!canAfford && (
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-bold text-red-400 uppercase">Insufficient Funds</span>
                      <span className="text-[10px] text-red-400/70">Need {totalCost - gfBalance} more GF</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Action */}
            <div className="p-6 bg-[#020617] space-y-4">
              <Button
                disabled
                className="w-full h-[68px] rounded-[24px] text-black text-lg font-black uppercase cursor-not-allowed opacity-50"
                style={{
                  background: '#1e293b',
                  color: '#475569',
                  letterSpacing: '-0.9px',
                }}
              >
                Confirm Purchase
              </Button>
              <p className="text-sm md:text-base text-amber-400 text-center max-w-md mx-auto mt-3">Currently disabled on Beta! We will be on Mainnet soon!</p>
              <div className="flex items-center justify-center gap-2">
                <Info className="w-3 h-3 text-[#94a3b8]" />
                <span className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-[1px]">
                  Transaction is final and non-refundable
                </span>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
