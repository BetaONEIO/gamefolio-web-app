import { ArrowLeft, Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface QuickSellNft {
  id: number;
  name?: string;
  imageUrl: string;
}

interface QuickSellScreenProps {
  nft: QuickSellNft;
  txHash: string;
  canSell?: boolean;
  onClose: () => void;
  onSold: (result: { receivedAmount: number; txHash: string }) => void;
}

const QUICK_SELL_PRICE = 250;
const PLATFORM_FEE_PERCENT = 1.5;
const QUICK_LIST_FEE = 1.25;

function getTokenIdPadded(id: number): string {
  return `#${String(id).padStart(3, "0")}`;
}

export default function QuickSellScreen({
  nft,
  txHash,
  canSell = false,
  onClose,
  onSold,
}: QuickSellScreenProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const platformFee = QUICK_SELL_PRICE * (PLATFORM_FEE_PERCENT / 100);
  const totalDeductions = platformFee + QUICK_LIST_FEE;
  const youReceive = QUICK_SELL_PRICE - totalDeductions;
  const displayName = nft.name || `Gamefolio Genesis ${getTokenIdPadded(nft.id)}`;
  const collectionName = nft.name?.split(" ").slice(0, -1).join(" ") || "Genesis Collection";

  const handleConfirmSell = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch("/api/nft/quick-sell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ tokenId: nft.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Quick sell failed");
      }
      onSold({ receivedAmount: data.receivedAmount, txHash: data.txHash || txHash });
    } catch (err: any) {
      toast({
        title: "Quick Sell Failed",
        description: err.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-[#101D27] flex flex-col overflow-hidden font-['Plus_Jakarta_Sans',sans-serif]">
      <header className="backdrop-blur-md bg-[#101D27cc] flex-shrink-0 z-40">
        <div className="flex items-center justify-between w-full max-w-[430px] md:max-w-3xl mx-auto px-4 pt-12 md:pt-6 pb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-[#1e293b] transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-[#f8fafc]" />
            </button>
            <span className="text-xl font-bold text-[#f8fafc] uppercase tracking-[-0.5px] leading-7">Quick Sell</span>
          </div>
          <div className="w-10 h-10" />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="w-full max-w-[430px] md:max-w-3xl mx-auto flex flex-col items-center px-6 pt-4 pb-[250px] md:pb-[200px]">

          <div className="flex flex-col md:flex-row items-center gap-6 w-full py-6">
            <div className="w-[192px] h-[192px] md:w-[240px] md:h-[240px] rounded-3xl overflow-hidden bg-white/[0.01] shadow-[0_25px_50px_-12px_rgba(74,222,128,0.1)] flex-shrink-0">
              {nft.imageUrl ? (
                <img
                  src={nft.imageUrl}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-[#d3d3d3]" />
              )}
            </div>
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <span className="text-sm font-normal text-[#4ade80] leading-5 text-center md:text-left">
                {collectionName}
              </span>
              <span className="text-2xl md:text-3xl font-bold text-[#f8fafc] leading-8 md:leading-9 text-center md:text-left truncate">
                {displayName}
              </span>
            </div>
          </div>

          <div className="w-full rounded-3xl bg-[#0f172a] border border-[#1e293b80] p-6 md:p-8 flex flex-col gap-6">
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs font-bold text-[#94a3b8] uppercase tracking-[1.2px] leading-4">
                Fixed Quick Sell Price
              </span>
              <div className="flex items-center gap-3">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="16" cy="16" r="16" fill="#4ADE80" fillOpacity="0.15" />
                  <text x="16" y="22" textAnchor="middle" fill="#4ADE80" fontSize="16" fontWeight="700" fontFamily="Plus Jakarta Sans">G</text>
                </svg>
                <span className="text-4xl md:text-5xl font-bold text-[#f8fafc] leading-10 md:leading-[56px]">
                  {QUICK_SELL_PRICE} GFT
                </span>
              </div>
              <span className="text-sm font-normal text-[#94a3b8] leading-5">
                ≈ $12.50 USD
              </span>
            </div>

            <div className="w-full h-px bg-[#1e293b4d]" />

            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-normal text-[#94a3b8] leading-5">Platform Fee (1.5%)</span>
                <span className="text-sm font-normal text-[#ef4444] leading-5">-{platformFee.toFixed(2)} GFT</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-normal text-[#94a3b8] leading-5">Quick-List Processing</span>
                <span className="text-sm font-normal text-[#ef4444] leading-5">-{QUICK_LIST_FEE.toFixed(2)} GFT</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-[#1e293b4d]">
                <span className="text-base font-bold text-[#f8fafc] leading-6">You Will Receive</span>
                <span className="text-xl font-bold text-[#4ade80] leading-7">{youReceive.toFixed(1)} GFT</span>
              </div>
            </div>
          </div>

          <div className="w-full rounded-2xl bg-[#14532d1a] border border-[#14532d33] p-[17px] flex gap-4 mt-6">
            <div className="flex-shrink-0 pt-0.5">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" clipRule="evenodd" d="M12.832 21.6777C15.958 21.0517 20 18.8027 20 12.9877C20 7.69671 16.127 4.17271 13.342 2.55371C12.723 2.19371 12 2.66671 12 3.38171V5.20971C12 6.65171 11.394 9.28371 9.71 10.3787C8.85 10.9377 7.92 10.1007 7.816 9.08071L7.73 8.24271C7.63 7.26871 6.638 6.67771 5.86 7.27171C4.461 8.33671 3 10.2067 3 12.9867C3 20.0977 8.289 21.8767 10.933 21.8767C11.0877 21.8767 11.249 21.8717 11.417 21.8617C10.111 21.7507 8 20.9407 8 18.3207C8 16.2707 9.495 14.8857 10.631 14.2107C10.937 14.0307 11.294 14.2657 11.294 14.6207V15.2107C11.294 15.6607 11.469 16.3657 11.884 16.8477C12.354 17.3937 13.043 16.8217 13.098 16.1037C13.116 15.8777 13.344 15.7337 13.54 15.8477C14.181 16.2227 15 17.0227 15 18.3207C15 20.3687 13.871 21.3107 12.832 21.6777Z" fill="#4ADE80" />
              </svg>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-bold text-[#4ade80] uppercase tracking-[0.35px] leading-5">
                Rapid Liquidity
              </span>
              <span className="text-sm font-normal text-[#94a3b8] leading-[22.75px]">
                Quick Sell bypasses the standard auction process. Your NFT is listed at the floor-guaranteed price of {QUICK_SELL_PRICE} GFT and typically settles within minutes.
              </span>
            </div>
          </div>

          <div className="py-4">
            <span className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.55px] leading-[16.5px] text-center block">
              Proceeding will list this asset for immediate purchase
            </span>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-md bg-[#101D27cc] border-t border-[#1e293b4d]">
        <div className="w-full max-w-[430px] md:max-w-3xl mx-auto flex flex-col md:flex-row-reverse gap-3 px-6 py-6 pb-8 md:pb-6">
          <button
            onClick={canSell ? handleConfirmSell : undefined}
            disabled={!canSell || isProcessing}
            className={`w-full md:flex-1 h-[60px] rounded-2xl bg-[#4ade80] flex items-center justify-center gap-2 ${
              canSell && !isProcessing ? "hover:bg-[#22c55e] cursor-pointer" : "cursor-not-allowed opacity-50"
            }`}
          >
            <span className="text-lg font-bold text-[#022c22] leading-7">
              {isProcessing ? "Processing..." : "Confirm Quick Sell"}
            </span>
          </button>
          <button
            onClick={onClose}
            className="w-full md:flex-1 h-[60px] rounded-2xl flex items-center justify-center hover:bg-[#1e293b] transition-colors"
          >
            <span className="text-lg font-bold text-[#94a3b8] leading-7">Go Back</span>
          </button>
        </div>
      </div>
    </div>
  );
}