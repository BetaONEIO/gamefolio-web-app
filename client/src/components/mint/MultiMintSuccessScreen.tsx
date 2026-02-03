import { ArrowLeft, ExternalLink, Copy, Wallet, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface MintedNFT {
  id: number;
  imageUrl: string;
  rarity: number;
}

interface MultiMintSuccessScreenProps {
  quantity: number;
  mintedNfts: MintedNFT[];
  txHash: string;
  onViewCollection: () => void;
  onViewExplorer: () => void;
  onBack: () => void;
}

const PLACEHOLDER_IMAGES = [
  "https://rupzmxqyhqktpifgfmzc.supabase.co/storage/v1/object/public/gamefolio-assets/nft-placeholders/guardian-1.png",
  "https://rupzmxqyhqktpifgfmzc.supabase.co/storage/v1/object/public/gamefolio-assets/nft-placeholders/guardian-2.png",
  "https://rupzmxqyhqktpifgfmzc.supabase.co/storage/v1/object/public/gamefolio-assets/nft-placeholders/guardian-3.png",
];

export default function MultiMintSuccessScreen({
  quantity,
  mintedNfts,
  txHash,
  onViewCollection,
  onViewExplorer,
  onBack,
}: MultiMintSuccessScreenProps) {
  const [copied, setCopied] = useState(false);

  const copyTxHash = () => {
    navigator.clipboard.writeText(txHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const avgRarity = mintedNfts.length > 0 
    ? Math.round(mintedNfts.reduce((sum, nft) => sum + nft.rarity, 0) / mintedNfts.length)
    : Math.floor(Math.random() * 30) + 70;

  const displayNfts = mintedNfts.slice(0, 10);
  const remainingCount = Math.max(0, quantity - 10);

  const generatedNfts = displayNfts.length > 0 ? displayNfts : 
    Array.from({ length: Math.min(quantity, 10) }, (_, i) => ({
      id: Math.floor(Math.random() * 487) + 1,
      imageUrl: PLACEHOLDER_IMAGES[i % PLACEHOLDER_IMAGES.length],
      rarity: Math.floor(Math.random() * 30) + 70,
    }));

  return (
    <div className="fixed inset-0 z-[100] bg-[#020617] flex flex-col overflow-y-auto font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Header - Responsive: 430px base, 600px, 800px */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-[#020617]/80 border-b border-[#1e293b]/50">
        <div className="flex items-center justify-between w-full max-w-[430px] min-[600px]:max-w-[600px] min-[800px]:max-w-[800px] mx-auto px-6 py-[17px] pt-12 min-[600px]:pt-6">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full hover:bg-[#1e293b]/50 flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="h-6 w-6 text-white/50" />
          </button>
          <span className="text-lg font-bold text-[#f8fafc]">Mint Complete</span>
          <div className="w-10 h-10" />
        </div>
      </header>

      {/* Main Content - Responsive container */}
      <main className="flex-1 flex flex-col items-center px-6 py-8 gap-8 max-w-[430px] min-[600px]:max-w-[600px] min-[800px]:max-w-[800px] mx-auto w-full">
        {/* Stacked NFT Preview with Count Badge */}
        <div className="relative">
          {/* Glow effect */}
          <div className="absolute inset-0 blur-[30px] bg-[#4ade80]/10 rounded-full scale-125" />
          
          {/* Stacked cards - Responsive sizing 430/600/800px */}
          <div className="relative w-[280px] h-[280px] min-[600px]:w-[300px] min-[600px]:h-[300px] min-[800px]:w-[320px] min-[800px]:h-[320px]">
            {/* Back card */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[295px] h-[295px] min-[600px]:w-[308px] min-[600px]:h-[308px] min-[800px]:w-[330px] min-[800px]:h-[330px] rounded-[40px] border border-[#1e293b]/50 bg-[#0f172a] shadow-xl -rotate-6" />
            
            {/* Middle card */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] min-[600px]:w-[295px] min-[600px]:h-[295px] min-[800px]:w-[315px] min-[800px]:h-[315px] rounded-[40px] border border-[#1e293b]/50 bg-[#0f172a] shadow-xl rotate-3" />
            
            {/* Front card with image */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[260px] h-[260px] min-[600px]:w-[280px] min-[600px]:h-[280px] min-[800px]:w-[300px] min-[800px]:h-[300px] rounded-[40px] border-2 border-[#4ade80]/30 bg-[#0f172a] shadow-[0_25px_50px_-12px_rgba(74,222,128,0.2)] overflow-hidden">
              <img 
                src={generatedNfts[0]?.imageUrl || PLACEHOLDER_IMAGES[0]}
                alt="Minted NFT"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              
              {/* Batch Mint Badge */}
              <div className="absolute top-4 left-4 flex items-center gap-2">
                <div className="px-3 py-1.5 rounded-full border border-[#4ade80]/30 bg-[#4ade80]/20 backdrop-blur-md">
                  <span className="text-[10px] font-bold text-[#4ade80] uppercase tracking-[0.5px]">
                    Batch Mint
                  </span>
                </div>
              </div>
              
              {/* Avatar stack preview */}
              <div className="absolute top-4 right-4 flex -space-x-2">
                {generatedNfts.slice(1, 3).map((nft, i) => (
                  <div key={i} className="w-6 h-6 rounded-full border-2 border-[#020617] overflow-hidden">
                    <img src={nft.imageUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>

            {/* Count Badge */}
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full border-4 border-[#020617] bg-[#4ade80] shadow-[0_4px_6px_-4px_rgba(74,222,128,0.4),0_10px_15px_-3px_rgba(74,222,128,0.4)] flex flex-col items-center justify-center">
              <span className="text-xl font-black text-[#022c22]">{quantity}</span>
              <span className="text-[8px] font-bold text-[#022c22] uppercase">NFTs</span>
            </div>
          </div>
        </div>

        {/* Success Text */}
        <div className="flex flex-col items-center gap-3 text-center max-w-[300px]">
          <span className="text-sm font-bold text-[#4ade80] uppercase tracking-[1.4px]">
            Transaction Successful
          </span>
          <h2 className="text-[30px] font-bold text-[#f8fafc] leading-9 tracking-[-0.75px]">
            {quantity} Guardians Minted
          </h2>
          <p className="text-sm text-[#94a3b8] leading-5">
            Your batch of {quantity} unique Guardians has been successfully forged and added to your collection.
          </p>
        </div>

        {/* Minted Collection Card - 382px width per Figma, responsive */}
        <div className="w-full max-w-[382px] min-[600px]:max-w-[420px] min-[800px]:max-w-[500px] h-auto rounded-3xl border border-[#1e293b]/50 bg-[#0f172a]/50 p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-bold text-[#94a3b8] uppercase tracking-[0.7px]">
              Minted Collection
            </span>
            <div className="px-2 py-1 rounded bg-[#4ade80]/10">
              <span className="text-[10px] font-bold text-[#4ade80]">Rarity Summary</span>
            </div>
          </div>

          {/* NFT Grid - 59px tiles per Figma spec, 5 columns, 2 rows */}
          <div className="grid grid-cols-5 gap-[11px] mb-4">
            {generatedNfts.slice(0, 10).map((nft, index) => (
              <div 
                key={index}
                className="w-[59px] h-[59px] min-[600px]:w-[68px] min-[600px]:h-[68px] min-[800px]:w-[80px] min-[800px]:h-[80px] rounded-xl border border-[#1e293b] overflow-hidden p-[1px]"
              >
                <img 
                  src={nft.imageUrl} 
                  alt={`NFT #${nft.id}`}
                  className="w-full h-full object-cover rounded-[10px]"
                />
              </div>
            ))}
            {remainingCount > 0 && (
              <div className="w-[59px] h-[59px] min-[600px]:w-[68px] min-[600px]:h-[68px] min-[800px]:w-[80px] min-[800px]:h-[80px] rounded-xl border border-[#1e293b] bg-[#1e293b]/50 flex items-center justify-center">
                <span className="text-xs font-bold text-[#94a3b8]">+{remainingCount}</span>
              </div>
            )}
          </div>

          {/* Stats Row */}
          <div className="flex gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-8 h-8 rounded-full bg-[#1e293b] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-[#4ade80]" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-[#94a3b8] uppercase">Avg Rarity</span>
                <span className="text-sm font-bold text-[#f8fafc]">Top {100 - avgRarity}%</span>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-1">
              <div className="w-8 h-8 rounded-full bg-[#1e293b] flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 1L2 8L8 10.5L14 8L8 1Z" fill="#4ADE80" fillOpacity="0.6"/>
                  <path d="M8 10.5L2 8L8 15L14 8L8 10.5Z" fill="#4ADE80"/>
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-[#94a3b8] uppercase">Gas Saved</span>
                <span className="text-sm font-bold text-[#f8fafc]">{(quantity - 1) * 15}% Efficiency</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons - 382px width matching collection card, 56/58px heights per Figma */}
        <div className="flex flex-col gap-3 w-full max-w-[382px] min-[600px]:max-w-[420px] min-[800px]:max-w-[500px]">
          <Button
            onClick={onViewCollection}
            className="w-full h-[56px] rounded-2xl bg-[#4ade80] hover:bg-[#22c55e] text-[#022c22] text-base font-bold shadow-[0_4px_6px_-4px_rgba(74,222,128,0.2),0_10px_15px_-3px_rgba(74,222,128,0.2)] flex items-center justify-center gap-[6.5px]"
          >
            <Wallet className="h-5 w-5" />
            View All in My NFTs
          </Button>
          <Button
            onClick={onViewExplorer}
            className="w-full h-[58px] rounded-2xl bg-[#1e293b] hover:bg-[#334155] border border-[#1e293b]/50 text-[#f8fafc] text-base font-bold flex items-center justify-center gap-[6.5px]"
          >
            <ExternalLink className="h-5 w-5" />
            View on Explorer
          </Button>
        </div>

        {/* Transaction Info - Figma spec: 152px pill with JetBrains Mono font */}
        <div className="flex flex-col items-center gap-4 py-8">
          {/* TX Hash Pill */}
          <button
            onClick={copyTxHash}
            className="w-[152px] h-[33px] px-[17px] py-[9px] rounded-full border border-[#1e293b]/30 bg-[#1e293b]/30 flex items-center justify-center gap-2 hover:bg-[#1e293b]/50 transition-colors"
          >
            <span className="text-[10px] text-[#94a3b8] leading-[15px] font-mono">
              Tx: {txHash.slice(0, 8)}...
            </span>
            {copied ? (
              <Check className="w-3.5 h-3.5 text-[#4ade80] flex-shrink-0" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-[#94a3b8] flex-shrink-0" />
            )}
          </button>

          {/* Network Indicator */}
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#4ade80]" />
            <span className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-[2px] leading-[15px]">
              Network: SKALE Nebula
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
