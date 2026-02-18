import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle, Loader2 } from "lucide-react";
import gfTokenLogo from "@assets/Gamefolio token_1762633908726.png";
import { useState } from "react";
import { NameTagCheckoutDialog } from "./NameTagCheckoutDialog";
import { useAuth } from "@/hooks/use-auth";

interface NameTag {
  id: number;
  name: string;
  imageUrl: string;
  rarity: string;
  gfCost: number;
  owned?: boolean;
  proDiscount?: boolean;
  originalPrice?: number;
}

interface NameTagDetailDialogProps {
  nameTag: NameTag | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPurchase: (id: number) => void;
  isPurchasing: boolean;
  brokenImage: boolean;
}

function NameTagFallback({ name, rarity }: { name: string; rarity: string }) {
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

export function NameTagDetailDialog({
  nameTag,
  open,
  onOpenChange,
  onPurchase,
  isPurchasing,
  brokenImage,
}: NameTagDetailDialogProps) {
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const { user } = useAuth();
  
  if (!nameTag) return null;

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

  const rarityColor = nameTag.rarity?.toLowerCase() === 'legendary' ? '#f0b100'
    : nameTag.rarity?.toLowerCase() === 'epic' ? '#a855f7'
    : nameTag.rarity?.toLowerCase() === 'rare' ? '#2b7fff'
    : '#94a3b8';

  const rarityChance = nameTag.rarity?.toLowerCase() === 'legendary' ? '0.05%'
    : nameTag.rarity?.toLowerCase() === 'epic' ? '0.5%'
    : nameTag.rarity?.toLowerCase() === 'rare' ? '5%'
    : '25%';

  const rarityRating = nameTag.rarity?.toLowerCase() === 'legendary' ? 98
    : nameTag.rarity?.toLowerCase() === 'epic' ? 85
    : nameTag.rarity?.toLowerCase() === 'rare' ? 70
    : 45;

  const cost = nameTag.gfCost || 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="bg-[#020617] border-none text-white p-0 max-w-[430px] w-full h-[90vh] max-h-[900px] overflow-hidden flex flex-col [&>button]:hidden"
      >
        <div
          className="flex-1 overflow-y-auto relative"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>
          <div className="hide-scrollbar flex flex-col">

            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 pt-12 pb-4 bg-[#020617]/80 backdrop-blur-md">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleClose}
                  className="w-10 h-10 rounded-full bg-[#1e293b]/50 flex items-center justify-center transition-colors hover:bg-[#1e293b]/80"
                >
                  <ArrowLeft className="h-6 w-6 text-white" />
                </button>
                <span className="text-xl font-bold text-[#f8fafc] uppercase" style={{ letterSpacing: '-0.5px' }}>
                  NFT Details
                </span>
              </div>
              <button className="w-10 h-10 rounded-full bg-[#1e293b]/50 flex items-center justify-center transition-colors hover:bg-[#1e293b]/80">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7 17L17 7M17 7H7M17 7V17" stroke="#F8FAFC" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            {/* Name Tag Image with overlay badges */}
            <div className="flex justify-center items-center px-4 py-2">
              <div className="relative w-full max-w-[398px] rounded-3xl overflow-hidden border border-white/10" style={{ boxShadow: `0 25px 50px -12px ${rarityColor}1a` }}>
                {brokenImage ? (
                  <div className="w-full aspect-[3/2]">
                    <NameTagFallback name={nameTag.name} rarity={nameTag.rarity} />
                  </div>
                ) : (
                  <img
                    src={nameTag.imageUrl}
                    alt={nameTag.name}
                    className="w-full aspect-[3/2] object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                {/* Bottom-left badges */}
                <div className="absolute bottom-4 left-4 flex items-center gap-2">
                  <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-full px-3 py-1.5 flex items-center gap-1.5">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" clipRule="evenodd" d="M1.16758 7.44269C1.33603 8.03137 1.78971 8.48448 2.69651 9.39127L3.77057 10.4653C5.34939 12.0447 6.13821 12.833 7.11837 12.833C8.09911 12.833 8.88793 12.0441 10.4662 10.4659C12.045 8.8871 12.8338 8.09828 12.8338 7.11754C12.8338 6.13738 12.045 5.34797 10.4668 3.76974L9.39268 2.69568C8.48531 1.78888 8.0322 1.33519 7.44352 1.16675C6.85484 0.997715 6.22977 1.1421 4.98022 1.43086L4.25948 1.59696C3.20772 1.83936 2.68183 1.96085 2.32147 2.32063C1.9611 2.68042 1.84078 3.20747 1.59779 4.25865L1.43111 4.97938C1.14293 6.22953 0.998546 6.85401 1.16699 7.44269M5.86236 4.18822C6.17047 4.48536 6.29418 4.92569 6.1859 5.33982C6.07761 5.75395 5.75419 6.07736 5.34006 6.18565C4.92593 6.29394 4.4856 6.17023 4.18846 5.86211C3.74041 5.39752 3.7471 4.65965 4.2035 4.20325C4.65989 3.74686 5.39776 3.74017 5.86236 4.18822ZM11.1024 6.9937L7.00627 11.0904C6.83347 11.2571 6.55892 11.2546 6.3892 11.0848C6.21948 10.9149 6.21723 10.6403 6.38413 10.4677L10.4797 6.37097C10.6516 6.19901 10.9304 6.19901 11.1024 6.37097C11.2743 6.54293 11.2743 6.82174 11.1024 6.9937Z" fill="white" />
                    </svg>
                    <span className="text-[10px] font-black text-white uppercase" style={{ letterSpacing: '1px' }}>Name Tag</span>
                  </div>
                  <div className="backdrop-blur-md border rounded-full px-3 py-1.5 flex items-center gap-1.5" style={{ background: `${rarityColor}20`, borderColor: `${rarityColor}50` }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" clipRule="evenodd" d="M5.33015 3.16619C6.07349 1.83323 6.44486 1.16675 7.00046 1.16675C7.55605 1.16675 7.92743 1.83323 8.67077 3.16619L8.8632 3.51116C9.07441 3.89017 9.18001 4.07967 9.34429 4.20463C9.50856 4.3296 9.7139 4.37595 10.1246 4.46864L10.4977 4.55313C11.941 4.87991 12.662 5.04301 12.8339 5.59509C13.0052 6.14658 12.5136 6.72212 11.5297 7.87262L11.2751 8.17007C10.9958 8.49686 10.8556 8.66055 10.7928 8.86237C10.7301 9.06478 10.7512 9.28303 10.7934 9.71894L10.8321 10.1161C10.9806 11.6515 11.0551 12.4189 10.6057 12.7598C10.1563 13.1006 9.4804 12.7897 8.12984 12.1678L7.77958 12.007C7.39589 11.8299 7.20404 11.7418 7.00046 11.7418C6.79688 11.7418 6.60503 11.8299 6.22133 12.007L5.87167 12.1678C4.52052 12.7897 3.84465 13.1006 3.39583 12.7603C2.94584 12.4189 3.02035 11.6515 3.16878 10.1161L3.2075 9.71953C3.24974 9.28303 3.27086 9.06478 3.2075 8.86296C3.14531 8.66055 3.00509 8.49686 2.72583 8.17066L2.47121 7.87262C1.48733 6.72271 0.995678 6.14717 1.16699 5.59509C1.33831 5.04301 2.06052 4.87933 3.50378 4.55313L3.87692 4.46864C4.28701 4.37595 4.49177 4.3296 4.65663 4.20463C4.82149 4.07967 4.92651 3.89017 5.13771 3.51116L5.33015 3.16619Z" fill={rarityColor} />
                    </svg>
                    <span className="text-[10px] font-black uppercase capitalize" style={{ letterSpacing: '1px', color: rarityColor }}>{nameTag.rarity}</span>
                  </div>
                </div>

                {/* Expand icon */}
                <button className="absolute bottom-4 right-4 backdrop-blur-md bg-white/10 border border-white/20 rounded-full w-10 h-10 flex items-center justify-center hover:bg-white/20 transition-colors">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M7.50033 12.5001L1.66699 18.3334M1.66699 18.3334H6.54783M1.66699 18.3334V13.4526M12.5003 7.50009L18.3337 1.66675M18.3337 1.66675H13.4528M18.3337 1.66675V6.54759" stroke="white" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content Section */}
            <div className="flex flex-col px-6 pt-4 pb-2">

              {/* Collection name */}
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-bold uppercase text-[#f0b100]" style={{ letterSpacing: '0.35px' }}>
                  Gamefolio Collection
                </span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" clipRule="evenodd" d="M6.3515 1.97329C6.24341 2.0703 6.13026 2.1615 6.01252 2.24653C5.80845 2.38349 5.57904 2.47799 5.338 2.52593C5.23322 2.54647 5.12365 2.55537 4.9052 2.57249C4.35668 2.61632 4.08208 2.63823 3.85335 2.71904C3.3235 2.9058 2.90677 3.32253 2.72001 3.85238C2.63921 4.0811 2.61729 4.3557 2.57347 4.90423C2.5656 5.04921 2.55006 5.19368 2.5269 5.33702C2.47897 5.57807 2.38446 5.80748 2.2475 6.01154C2.18793 6.10057 2.11671 6.18411 1.97427 6.35052C1.61749 6.76962 1.43876 6.97916 1.33398 7.1983C1.09225 7.70505 1.09225 8.29397 1.33398 8.80072C1.43876 9.01986 1.61749 9.22941 1.97427 9.6485C2.11671 9.81491 2.18793 9.89846 2.2475 9.98748C2.38446 10.1915 2.47897 10.421 2.5269 10.662C2.54745 10.7668 2.55635 10.8763 2.57347 11.0948C2.61729 11.6433 2.63921 11.9179 2.72001 12.1466C2.90677 12.6765 3.3235 13.0932 3.85335 13.28C4.08208 13.3608 4.35668 13.3827 4.9052 13.4265C5.12365 13.4437 5.23322 13.4526 5.338 13.4731C5.57904 13.521 5.80845 13.6162 6.01252 13.7525C6.10154 13.8121 6.18509 13.8833 6.3515 14.0257C6.77059 14.3825 6.98014 14.5612 7.19928 14.666C7.70603 14.9077 8.29495 14.9077 8.8017 14.666C9.02084 14.5612 9.23038 14.3825 9.64948 14.0257C9.81589 13.8833 9.89943 13.8121 9.98846 13.7525C10.1925 13.6155 10.4219 13.521 10.663 13.4731C10.7678 13.4526 10.8773 13.4437 11.0958 13.4265C11.6443 13.3827 11.9189 13.3608 12.1476 13.28C12.6775 13.0932 13.0942 12.6765 13.281 12.1466C13.3618 11.9179 13.3837 11.6433 13.4275 11.0948C13.4446 10.8763 13.4535 10.7668 13.4741 10.662C13.522 10.421 13.6172 10.1915 13.7535 9.98748C13.813 9.89846 13.8843 9.81491 14.0267 9.6485C14.3835 9.22941 14.5622 9.01986 14.667 8.80072C14.9087 8.29397 14.9087 7.70505 14.667 7.1983C14.5622 6.97916 14.3835 6.76962 14.0267 6.35052C13.9297 6.24244 13.8385 6.12929 13.7535 6.01154C13.6164 5.80751 13.5214 5.5782 13.4741 5.33702C13.4509 5.19368 13.4354 5.04921 13.4275 4.90423C13.3837 4.3557 13.3618 4.0811 13.281 3.85238C13.0942 3.32253 12.6775 2.9058 12.1476 2.71904C11.9189 2.63823 11.6443 2.61632 11.0958 2.57249C10.8773 2.55537 10.7678 2.54647 10.663 2.52593C10.4219 2.47799 10.1925 2.38349 9.98846 2.24653C9.89943 2.18696 9.81589 2.11574 9.64948 1.9733C9.23038 1.61652 9.02084 1.43779 8.8017 1.33301C8.29495 1.09128 7.70603 1.09128 7.19928 1.33301C6.98014 1.43779 6.77059 1.61652 6.3515 1.97329ZM10.5765 6.57647C10.8368 6.31616 10.8368 5.89405 10.5765 5.63373C10.3162 5.37342 9.89405 5.37342 9.63373 5.63373L7.10512 8.16235L6.57647 7.63373C6.31616 7.37342 5.89405 7.37342 5.63373 7.63373C5.37342 7.89405 5.37342 8.31616 5.63373 8.57647L6.63373 9.57647C6.89405 9.83679 7.31616 9.83679 7.57647 9.57647L10.5765 6.57647Z" fill="#4ade80" />
                </svg>
              </div>

              {/* Name Tag Name */}
              <h1 className="text-4xl font-black text-[#f8fafc] uppercase mb-3" style={{ letterSpacing: '-0.9px', lineHeight: '40px' }}>
                {nameTag.name}
              </h1>

              {/* Owner & Viewers */}
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-[#1e293b]/30 rounded-full flex items-center gap-2 pr-4 pl-1 py-1">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 border-2 border-[#020617]" />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-[#94a3b8] leading-[10px]">Owner</span>
                    <span className="text-xs font-bold text-[#f8fafc] leading-4">Gamefolio</span>
                  </div>
                </div>
                <div className="bg-[#1e293b]/30 border border-[#1e293b]/50 rounded-full flex items-center gap-2 px-3 py-1.5">
                  <svg width="16" height="11" viewBox="0 0 14 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" clipRule="evenodd" d="M0.849999 7.53066C0.283333 6.79466 0 6.42599 0 5.33333C0 4.24 0.283333 3.87266 0.849999 3.136C1.98133 1.66667 3.87866 0 6.66666 0C9.45466 0 11.352 1.66667 12.4833 3.136C13.05 3.87333 13.3333 4.24066 13.3333 5.33333C13.3333 6.42666 13.05 6.79399 12.4833 7.53066C11.352 8.99999 9.45466 10.6667 6.66666 10.6667C3.87866 10.6667 1.98133 8.99999 0.849999 7.53066Z" stroke="#94A3B8" strokeWidth="0.999999" />
                    <path fillRule="evenodd" clipRule="evenodd" d="M8.66699 5.33325C8.66699 6.43782 7.77156 7.33325 6.66699 7.33325C5.56242 7.33325 4.66699 6.43782 4.66699 5.33325C4.66699 4.22868 5.56242 3.33325 6.66699 3.33325C7.77156 3.33325 8.66699 4.22868 8.66699 5.33325Z" stroke="#94A3B8" />
                  </svg>
                  <span className="text-xs font-bold text-[#94a3b8]">1.2k active</span>
                </div>
              </div>

              {/* Description */}
              <div className="flex flex-col gap-3 mb-6">
                <span className="text-xs font-black text-[#94a3b8] uppercase" style={{ letterSpacing: '2.4px' }}>Description</span>
                <p className="text-sm text-[#94a3b8]/80 leading-[22.75px]">
                  The <span className="text-[#f8fafc]">{nameTag.name}</span> name tag is a high-kinetic {nameTag.rarity?.toLowerCase()} asset from the Gamefolio Collection series. It features adaptive luminescence that reacts to your profile activity, symbolizing unmatched speed and precision on the leaderboard.
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
                  <div className="w-12 h-12 flex items-center justify-center">
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" clipRule="evenodd" d="M21.1373 17.4278C22.4106 15.1426 23.0483 14 23.9998 14C24.9513 14 25.589 15.1426 26.8624 17.4278L27.1923 18.0192C27.5544 18.669 27.7354 18.9929 28.0171 19.2061C28.2987 19.4214 28.6527 19.5018 29.3548 19.6607L29.9945 19.8056C32.4688 20.3648 33.706 20.6444 33.9997 21.5919C34.2954 22.5374 33.4505 23.5231 31.7647 25.4965L31.3282 26.0074C30.8494 26.5667 30.6101 26.8483 30.5034 27.1943C30.3928 27.5403 30.429 27.9145 30.5034 28.6628L30.5678 29.3427C30.8233 31.9739 30.95 33.2896 30.1796 33.8749C29.4091 34.4583 28.2524 33.9272 25.935 32.8611L25.3356 32.5835C24.6778 32.2817 24.3499 32.1288 23.9998 32.1288C23.6518 32.1288 23.3219 32.2817 22.6641 32.5835L22.0646 32.8611C19.7472 33.9272 18.5905 34.4603 17.8201 33.8749C17.0496 33.2916 17.1764 31.9739 17.4318 29.3427L17.4962 28.6628C17.5707 27.9145 17.6069 27.5403 17.4962 27.1943C17.3896 26.8483 17.1502 26.5667 16.6714 26.0074L16.2349 25.4965C14.5492 23.5251 13.7043 22.5394 14 21.5919C14.2937 20.6464 15.5288 20.3648 18.0032 19.8056L18.6449 19.6607C19.3489 19.4998 19.699 19.4214 19.9826 19.2081C20.2642 18.9929 20.4453 18.669 20.8074 18.0213L21.1373 17.4278Z" fill={rarityColor} />
                    </svg>
                  </div>
                </div>
              </div>

            </div>

            {/* Sticky Bottom: Equip/Buy Button */}
            <div className="sticky bottom-0 bg-gradient-to-t from-[#020617] via-[#020617] to-transparent px-6 pt-4 pb-6 flex flex-col gap-4 items-center">
              {nameTag.owned ? (
                <Button
                  className="w-full h-[68px] rounded-2xl text-white text-lg font-black uppercase bg-gradient-to-r from-green-500 to-emerald-600 cursor-default"
                  disabled
                  style={{ letterSpacing: '-0.9px' }}
                >
                  <CheckCircle className="h-6 w-6 mr-2" />
                  Owned
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
                This asset is tradeable on the marketplace
              </span>
            </div>
          </div>
        </div>
      </DialogContent>

      <NameTagCheckoutDialog
        nameTag={nameTag}
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        onConfirm={handleConfirmPurchase}
        isPurchasing={isPurchasing}
        gfBalance={user?.gfTokenBalance || 0}
      />
    </Dialog>
  );
}