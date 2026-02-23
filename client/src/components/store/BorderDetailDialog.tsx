import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle, Loader2, Crown, Lock } from "lucide-react";
import gfTokenLogo from "@assets/Gamefolio token_1762633908726.png";
import { useState } from "react";
import { BorderCheckoutDialog } from "./BorderCheckoutDialog";
import { useAuth } from "@/hooks/use-auth";

interface ProfileBorder {
  id: number;
  name: string;
  imageUrl: string;
  rarity: string;
  gfCost: number;
  owned?: boolean;
  shape: 'circle' | 'square';
}

interface BorderDetailDialogProps {
  border: ProfileBorder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPurchase: (id: number) => void;
  isPurchasing: boolean;
  brokenImage: boolean;
  isUserPro: boolean;
  onUpgradePro: () => void;
}

function BorderFallback({ name, rarity }: { name: string; rarity: string }) {
  const bg = rarity === 'legendary' ? 'from-yellow-500 to-amber-600'
    : rarity === 'epic' ? 'from-purple-500 to-pink-600'
    : rarity === 'rare' ? 'from-green-500 to-emerald-600'
    : 'from-gray-500 to-gray-600';
  return (
    <div className={`w-full h-full bg-gradient-to-br ${bg} flex items-center justify-center`}>
      <span className="text-white text-lg font-bold">{name}</span>
    </div>
  );
}

export function BorderDetailDialog({
  border,
  open,
  onOpenChange,
  onPurchase,
  isPurchasing,
  brokenImage,
  isUserPro,
  onUpgradePro,
}: BorderDetailDialogProps) {
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const { user } = useAuth();

  if (!border) return null;

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

  const rarityColor = border.rarity?.toLowerCase() === 'legendary' ? '#f0b100'
    : border.rarity?.toLowerCase() === 'epic' ? '#a855f7'
    : border.rarity?.toLowerCase() === 'rare' ? '#2b7fff'
    : '#94a3b8';

  const rarityChance = border.rarity?.toLowerCase() === 'legendary' ? '0.05%'
    : border.rarity?.toLowerCase() === 'epic' ? '0.5%'
    : border.rarity?.toLowerCase() === 'rare' ? '5%'
    : '25%';

  const rarityRating = border.rarity?.toLowerCase() === 'legendary' ? 98
    : border.rarity?.toLowerCase() === 'epic' ? 85
    : border.rarity?.toLowerCase() === 'rare' ? 70
    : 45;

  const cost = border.gfCost || 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="bg-[#101D27] border-none text-white p-0 max-w-[430px] w-full h-[90vh] max-h-[900px] overflow-hidden flex flex-col [&>button]:hidden"
      >
        <div
          className="flex-1 overflow-y-auto relative"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>
          <div className="hide-scrollbar flex flex-col">

            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 pt-12 pb-4 bg-[#101D27]/80 backdrop-blur-md">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleClose}
                  className="w-10 h-10 rounded-full bg-[#1e293b]/50 flex items-center justify-center transition-colors hover:bg-[#1e293b]/80"
                >
                  <ArrowLeft className="h-6 w-6 text-white" />
                </button>
                <span className="text-xl font-bold text-[#f8fafc] uppercase" style={{ letterSpacing: '-0.5px' }}>
                  Border Details
                </span>
              </div>
            </div>

            {/* Border Image with overlay badges */}
            <div className="flex justify-center items-center px-4 py-2">
              <div className="relative w-full max-w-[398px] aspect-square rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-8" style={{ boxShadow: `0 25px 50px -12px ${rarityColor}1a` }}>
                {brokenImage ? (
                  <div className="w-full h-full">
                    <BorderFallback name={border.name} rarity={border.rarity} />
                  </div>
                ) : (
                  <img
                    src={border.imageUrl}
                    alt={border.name}
                    className="max-w-full max-h-full object-contain drop-shadow-2xl"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

                {/* Bottom-left badges */}
                <div className="absolute bottom-4 left-4 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <div className="backdrop-blur-md bg-amber-500/20 border border-amber-500/30 rounded-full px-3 py-1.5 flex items-center gap-1.5">
                      <Crown className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-[10px] font-black text-amber-400 uppercase" style={{ letterSpacing: '1px' }}>Pro Exclusive</span>
                    </div>
                    <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-full px-3 py-1.5 flex items-center gap-1.5">
                      <span className="text-[10px] font-black text-white uppercase" style={{ letterSpacing: '1px' }}>{border.shape === 'square' ? 'NFT Border' : 'Profile Border'}</span>
                    </div>
                  </div>
                  <div className="backdrop-blur-md border rounded-full px-3 py-1.5 w-fit flex items-center gap-1.5" style={{ background: `${rarityColor}20`, borderColor: `${rarityColor}50` }}>
                    <span className="text-[10px] font-black uppercase" style={{ letterSpacing: '1px', color: rarityColor }}>{border.rarity}</span>
                  </div>
                </div>

                {!isUserPro && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
                    <div className="bg-black/80 rounded-2xl px-6 py-4 flex flex-col items-center gap-2 border border-amber-500/30">
                      <Lock className="w-8 h-8 text-amber-400" />
                      <span className="text-sm text-amber-300 font-bold uppercase tracking-wider">Locked - Pro Only</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Content Section */}
            <div className="flex flex-col px-6 pt-4 pb-2">

              {/* Collection name */}
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-bold uppercase text-[#f0b100]" style={{ letterSpacing: '0.35px' }}>
                  Gamefolio Cosmetics
                </span>
              </div>

              {/* Border Name */}
              <h1 className="text-4xl font-black text-[#f8fafc] uppercase mb-3" style={{ letterSpacing: '-0.9px', lineHeight: '40px' }}>
                {border.name}
              </h1>

              {/* Owner */}
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-[#1e293b]/30 rounded-full flex items-center gap-2 pr-4 pl-1 py-1">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-500 to-yellow-500 border-2 border-[#101D27]" />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-[#94a3b8] leading-[10px]">Creator</span>
                    <span className="text-xs font-bold text-[#f8fafc] leading-4">Gamefolio Studio</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="flex flex-col gap-3 mb-6">
                <span className="text-xs font-black text-[#94a3b8] uppercase" style={{ letterSpacing: '2.4px' }}>Description</span>
                <p className="text-sm text-[#94a3b8]/80 leading-[22.75px]">
                  The <span className="text-[#f8fafc]">{border.name}</span> is a premium {border.rarity?.toLowerCase()} profile cosmetic. {border.shape === 'square' ? 'Engineered specifically for NFT avatars' : 'Designed to make your profile picture stand out'}. Requires an active Pro subscription to unlock the full visual fidelity and equip it.
                </p>
              </div>

              {/* Rarity Chance & Rating Cards */}
              <div className="flex gap-3 mb-6">
                <div className="flex-1 bg-[#0f172a] border border-[#1e293b]/50 rounded-2xl p-4 flex flex-col gap-2">
                  <span className="text-[10px] font-black text-[#94a3b8] uppercase" style={{ letterSpacing: '1px' }}>Rarity Chance</span>
                  <span className="text-2xl font-black text-[#f8fafc]">{rarityChance}</span>
                </div>
                <div className="flex-1 bg-[#0f172a] border rounded-2xl p-4 flex items-center gap-3 overflow-hidden" style={{ borderColor: `${rarityColor}20` }}>
                  <div className="flex flex-col gap-2 flex-1">
                    <span className="text-[10px] font-black text-[#94a3b8] uppercase" style={{ letterSpacing: '1px' }}>Rating</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black" style={{ color: rarityColor }}>{rarityRating}</span>
                      <span className="text-sm text-[#94a3b8]">/100</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Sticky Bottom: Buy Button */}
            <div className="sticky bottom-0 bg-gradient-to-t from-[#101D27] via-[#101D27] to-transparent px-6 pt-4 pb-6 flex flex-col gap-4 items-center">
              {border.owned ? (
                <Button
                  className="w-full h-[68px] rounded-2xl text-white text-lg font-black uppercase bg-gradient-to-r from-green-500 to-emerald-600 cursor-default"
                  disabled
                  style={{ letterSpacing: '-0.9px' }}
                >
                  <CheckCircle className="h-6 w-6 mr-2" />
                  Owned
                </Button>
              ) : !isUserPro ? (
                <Button
                  onClick={onUpgradePro}
                  className="w-full h-[68px] rounded-2xl text-black text-lg font-black uppercase bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600"
                  style={{ letterSpacing: '-0.9px' }}
                >
                  <Crown className="h-6 w-6 mr-2" />
                  Upgrade to Pro to Buy
                </Button>
              ) : (
                <Button
                  onClick={handleBuyClick}
                  disabled={isPurchasing}
                  className="w-full h-[68px] rounded-2xl text-black text-lg font-black uppercase"
                  style={{
                    background: rarityColor,
                    boxShadow: `0 8px 10px -6px ${rarityColor}33, 0 20px 25px -5px ${rarityColor}33`,
                    letterSpacing: '-0.9px',
                  }}
                >
                  {isPurchasing ? (
                    <>
                      <Loader2 className="h-6 w-6 mr-2 animate-spin" />
                      Purchasing...
                    </>
                  ) : (
                    <>
                      <img src={gfTokenLogo} alt="GF" className="w-6 h-6 mr-2" />
                      Buy Now - {cost} GF
                    </>
                  )}
                </Button>
              )}
              <span className="text-[10px] font-bold text-[#94a3b8] uppercase text-center" style={{ letterSpacing: '1px' }}>
                Pro membership required for purchase and use
              </span>
            </div>
          </div>
        </div>
      </DialogContent>

      <BorderCheckoutDialog
        border={border}
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        onConfirm={handleConfirmPurchase}
        isPurchasing={isPurchasing}
        gfBalance={user?.gfTokenBalance || 0}
      />
    </Dialog>
  );
}
