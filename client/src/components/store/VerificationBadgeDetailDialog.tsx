import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle, ShieldCheck, Star, Users, Info } from "lucide-react";
import gfTokenLogo from "@assets/Gamefolio token_1762633908726.png";
import { useState } from "react";
import { VerificationBadgeCheckoutDialog } from "./VerificationBadgeCheckoutDialog";
import { useAuth } from "@/hooks/use-auth";

interface VerificationBadge {
  id: number;
  name: string;
  imageUrl: string;
  rarity: string;
  gfCost: number;
  owned?: boolean;
}

interface VerificationBadgeDetailDialogProps {
  badge: VerificationBadge | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPurchase: (id: number) => void;
  isPurchasing: boolean;
}

export function VerificationBadgeDetailDialog({
  badge,
  open,
  onOpenChange,
  onPurchase,
  isPurchasing,
}: VerificationBadgeDetailDialogProps) {
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const { user } = useAuth();

  if (!badge) return null;

  const handleClose = () => {
    onOpenChange(false);
    setCheckoutOpen(false);
  };

  const handleBuyClick = () => {
    setCheckoutOpen(true);
  };

  const handleConfirmPurchase = (id: number) => {
    onPurchase(id);
  };

  const rarityColor = badge.rarity?.toLowerCase() === 'legendary' ? '#f0b100'
    : badge.rarity?.toLowerCase() === 'epic' ? '#a855f7'
    : badge.rarity?.toLowerCase() === 'rare' ? '#2b7fff'
    : '#00c950';

  const cost = badge.gfCost || 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="bg-[#020617] border-none text-white p-0 max-w-[430px] w-full h-[90vh] max-h-[900px] overflow-hidden flex flex-col [&>button]:hidden"
      >
        <div className="flex-1 overflow-y-auto relative hide-scrollbar">
          <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>
          
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between px-4 pt-12 pb-4 bg-[#020617]/80 backdrop-blur-md">
            <div className="flex items-center gap-4">
              <button
                onClick={handleClose}
                className="w-10 h-10 rounded-full bg-[#1e293b]/50 flex items-center justify-center transition-colors hover:bg-[#1e293b]/80"
              >
                <ArrowLeft className="h-6 w-6 text-white" />
              </button>
              <span className="text-xl font-bold text-[#f8fafc] uppercase tracking-[-0.5px]">
                Badge Details
              </span>
            </div>
          </div>

          <div className="flex flex-col">
            {/* Badge Image Section */}
            <div className="px-4 py-2">
              <div className="relative w-full aspect-[398/266] rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-b from-[#00c9500d] to-transparent flex items-center justify-center shadow-[0_25px_50px_-12px_rgba(0,201,80,0.1)]">
                <img
                  src={badge.imageUrl}
                  alt={badge.name}
                  className="w-48 h-48 object-contain drop-shadow-[0_0_30px_rgba(0,201,80,0.3)]"
                />
                
                {/* Badges Overlay */}
                <div className="absolute bottom-4 left-4 flex gap-2">
                  <div className="backdrop-blur-md bg-[#00c95033] border border-[#00c95080] rounded-full px-3 py-1 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#00c950]" />
                    <span className="text-[10px] font-black text-[#00c950] uppercase tracking-[1px]">Badge</span>
                  </div>
                  <div className="backdrop-blur-md bg-[#f0b10033] border border-[#f0b10080] rounded-full px-3 py-1 flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-[#f0b100]" />
                    <span className="text-[10px] font-black text-[#f0b100] uppercase tracking-[1px]">{badge.rarity}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Section */}
            <div className="flex flex-col px-6 pt-6 pb-2">
              <span className="text-sm font-bold uppercase text-[#00c950] tracking-[0.35px] mb-1">
                Identity Series
              </span>
              <h1 className="text-4xl font-black text-[#f8fafc] uppercase mb-4 tracking-[-0.9px] leading-[40px]">
                {badge.name}
              </h1>

              {/* Creator Tag */}
              <div className="flex items-center gap-3 mb-8">
                <div className="bg-[#1e293b4d] rounded-full flex items-center gap-2 pr-4 pl-1 py-1">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#00c950] to-[#008f39] border-2 border-[#020617]" />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-[#94a3b8] leading-[10px]">Creator</span>
                    <span className="text-xs font-bold text-[#f8fafc] leading-4">Gamefolio Admin</span>
                  </div>
                </div>
                <div className="bg-[#1e293b4d] border border-[#1e293b80] rounded-full px-3 py-1.5 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-[#94a3b8]" />
                  <span className="text-xs font-bold text-[#94a3b8]">Verified</span>
                </div>
              </div>

              {/* Description */}
              <div className="flex flex-col gap-3 mb-8">
                <span className="text-[12px] font-black text-[#94a3b8] uppercase tracking-[2.4px]">Description</span>
                <p className="text-sm text-[#94a3b8] leading-[22.75px]">
                  The mark of authenticity. This badge signals your <span className="text-[#f8fafc]">Verified</span> status to the entire community, unlocking higher trust scores and exclusive social features.
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3 mb-8">
                <div className="bg-[#0f172a] border border-[#1e293b80] rounded-2xl p-4 flex flex-col gap-1">
                  <span className="text-[10px] font-black text-[#94a3b8] uppercase tracking-[1px]">Rarity Tier</span>
                  <span className="text-2xl font-black text-[#f8fafc]">{badge.rarity}</span>
                </div>
                <div className="bg-[#0f172a] border border-[#1e293b80] rounded-2xl p-4 flex flex-col gap-1">
                  <span className="text-[10px] font-black text-[#94a3b8] uppercase tracking-[1px]">Market Value</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-[#00c950]">{cost}</span>
                    <span className="text-sm text-[#94a3b8]">GF</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Button */}
            <div className="sticky bottom-0 bg-gradient-to-t from-[#020617] via-[#020617] to-transparent px-6 pt-4 pb-6 flex flex-col gap-4 items-center">
              {badge.owned ? (
                <Button
                  className="w-full h-[68px] rounded-2xl text-white text-lg font-black uppercase bg-gradient-to-r from-green-500 to-emerald-600 cursor-default"
                  disabled
                >
                  <CheckCircle className="h-6 w-6 mr-2" />
                  Owned
                </Button>
              ) : (
                <Button
                  onClick={handleBuyClick}
                  disabled={isPurchasing}
                  className="w-full h-[68px] rounded-2xl text-black text-lg font-black uppercase transition-all active:scale-[0.98]"
                  style={{
                    background: rarityColor,
                    boxShadow: `0 8px 10px -6px ${rarityColor}4d, 0 20px 25px -5px ${rarityColor}33`,
                    letterSpacing: '-0.9px',
                  }}
                >
                  {isPurchasing ? (
                    <span className="flex items-center gap-2">
                      <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      Purchasing...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <img src={gfTokenLogo} alt="GF" className="w-6 h-6 mr-2" />
                      Buy Now - {cost} GF
                    </span>
                  )}
                </Button>
              )}
              <div className="flex items-center gap-2">
                <Info className="w-3 h-3 text-[#94a3b8]" />
                <span className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-[1px]">
                  Instant identity verification included
                </span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>

      <VerificationBadgeCheckoutDialog
        badge={badge}
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        onConfirm={handleConfirmPurchase}
        isPurchasing={isPurchasing}
        gfBalance={user?.gfTokenBalance || 0}
      />
    </Dialog>
  );
}
