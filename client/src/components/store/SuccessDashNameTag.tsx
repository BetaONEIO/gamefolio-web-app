import { Button } from "@/components/ui/button";
import { Check, Copy, ExternalLink, PartyPopper } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface SuccessDashNameTagProps {
  assetName: string;
  rarity: string;
  imageUrl: string;
  transactionId: string;
  totalCost: number;
  onClose: () => void;
}

export function SuccessDashNameTag({
  assetName,
  rarity,
  imageUrl,
  transactionId,
  totalCost,
  onClose,
}: SuccessDashNameTagProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(transactionId);
    setCopied(true);
    toast({
      description: "Transaction ID copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const rarityColor = rarity?.toLowerCase() === 'legendary' ? '#f0b100'
    : rarity?.toLowerCase() === 'epic' ? '#F97316'
    : rarity?.toLowerCase() === 'rare' ? '#2b7fff'
    : '#94a3b8';

  return (
    <div className="flex flex-col items-center justify-center flex-1 w-full bg-[#101D27] text-white p-6 animate-in zoom-in-95 duration-500">
      <div className="flex flex-col items-center gap-8 max-w-[382px] w-full">
        
        {/* Success Animation Header */}
        <div className="relative flex items-center justify-center w-40 h-40 mb-4">
          <div className="absolute inset-0 bg-[#f0b1004d] blur-[50px] rounded-full" />
          <div className="relative w-28 h-28 bg-[#f0b100] rounded-full shadow-[0_25px_50px_-12px_rgba(240,177,0,0.5)] flex items-center justify-center">
            <PartyPopper className="w-16 h-16 text-black" />
          </div>
          <div className="absolute w-40 h-40 border-4 border-[#f0b10033] rounded-full" />
          <div className="absolute w-[161px] h-[161px] border-4 border-[#f0b100] rounded-full animate-ping opacity-20" />
        </div>

        {/* Success Message */}
        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="text-[36px] font-black uppercase tracking-[-1.8px] leading-[40px] text-[#f8fafc]">
            Legendary Gain!
          </h2>
          <p className="text-sm font-bold uppercase tracking-[-0.35px] leading-[22.75px] text-[#94a3b8]">
            The <span className="text-[#f0b100]">{assetName}</span> Name Tag has been added to your inventory
          </p>
        </div>

        {/* Receipt Card */}
        <div className="w-full flex flex-col p-5 bg-[#0f172a4d] backdrop-blur-[4px] border border-[#1e293b4d] rounded-[24px] gap-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[1px] text-[#94a3b8]">Transaction ID</span>
            <button 
              onClick={copyToClipboard}
              className="flex items-center gap-2 px-2 py-1 bg-[#1e293b80] rounded-md transition-colors hover:bg-[#1e293b]"
            >
              <span className="text-[12px] font-bold text-[#f8fafc] font-mono">{transactionId.slice(0, 8)}...</span>
              {copied ? <Check className="w-3 h-3 text-[#B7FF1A]" /> : <Copy className="w-3 h-3 text-[#94a3b8]" />}
            </button>
          </div>
          
          <div className="border-t border-[#1e293b80]" />
          
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[1px] text-[#94a3b8]">Total Cost</span>
            <span className="text-sm font-black text-[#f0b100]">{totalCost} GF</span>
          </div>
        </div>

        {/* Asset Preview Card */}
        <div className="w-full bg-[#0f172a] border border-[#f0b1004d] rounded-[40px] overflow-hidden shadow-[0_25px_50px_-12px_rgba(255,105,0,0.1)]">
          <div className="h-[200px] bg-black flex items-center justify-center p-8">
            <img src={imageUrl} alt={assetName} className="w-full h-full object-contain" />
          </div>
          <div className="p-6 bg-gradient-to-b from-[#0f172a] to-[#101D27] flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-[2px] text-[#94a3b8]">Asset Name</span>
              <span className="text-2xl font-black uppercase tracking-[-1.2px] text-[#f8fafc]">{assetName}</span>
            </div>
            <div className="bg-[#f0b1001a] border border-[#f0b1004d] rounded-2xl px-4 py-2 flex items-center gap-2">
              <span className="text-[12px] font-black uppercase tracking-[1.2px] text-[#f0b100]">{rarity}</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="w-full flex flex-col gap-3 pt-4">
          <Button
            onClick={onClose}
            className="w-full h-[68px] rounded-[16px] bg-[#f0b100] text-black text-lg font-black uppercase shadow-[0_8px_10px_-6px_rgba(240,177,0,0.2)] hover:bg-[#d9a000] active:scale-[0.98] transition-all"
            style={{ letterSpacing: '-0.9px' }}
          >
            Back to Store
          </Button>
          <button className="flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-[1.1px] text-[#94a3b8] hover:text-[#f8fafc] transition-colors">
            <ExternalLink className="w-3 h-3" />
            View on Explorer
          </button>
        </div>
      </div>
    </div>
  );
}
