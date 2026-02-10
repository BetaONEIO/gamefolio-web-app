import { ArrowLeft, ArrowRight, Copy, Check, Share2 } from "lucide-react";
import { useState, useRef, useCallback, useEffect } from "react";
import MintedNftDetailScreen from "./MintedNftDetailScreen";

interface NftAttribute {
  trait_type: string;
  value: string;
}

interface MintedNFT {
  id: number;
  name?: string;
  imageUrl: string;
  rarity: number;
  attributes?: NftAttribute[];
}

interface MultiMintSuccessScreenProps {
  quantity: number;
  mintedNfts: MintedNFT[];
  txHash: string;
  walletAddress?: string;
  onViewCollection: () => void;
  onViewExplorer: () => void;
  onBack: () => void;
  soldNftIds?: Set<number>;
  onNftSold?: (nftId: number) => void;
}

function getRarityLabel(rarity: number): string {
  if (rarity >= 95) return "Legendary";
  if (rarity >= 85) return "Epic";
  if (rarity >= 70) return "Rare";
  return "Common";
}

function getTokenIdPadded(id: number): string {
  return `#${String(id).padStart(4, "0")}`;
}

const SKALE_EXPLORER_BASE_URL = "https://lanky-ill-funny-testnet.explorer.testnet.skalenodes.com";

export default function MultiMintSuccessScreen({
  quantity,
  mintedNfts,
  txHash,
  walletAddress,
  onViewCollection,
  onViewExplorer,
  onBack,
  soldNftIds: externalSoldIds,
  onNftSold,
}: MultiMintSuccessScreenProps) {
  const [copied, setCopied] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedNft, setSelectedNft] = useState<MintedNFT | null>(null);
  const [internalSoldIds, setInternalSoldIds] = useState<Set<number>>(new Set());
  const carouselRef = useRef<HTMLDivElement>(null);

  const soldNftIds = externalSoldIds || internalSoldIds;

  const handleNftSold = (nftId: number) => {
    if (onNftSold) {
      onNftSold(nftId);
    } else {
      setInternalSoldIds(prev => { const next = new Set(prev); next.add(nftId); return next; });
    }
  };

  const displayNfts = mintedNfts.length > 0
    ? mintedNfts
    : Array.from({ length: quantity }, (_, i) => ({
        id: i + 1,
        name: undefined as string | undefined,
        imageUrl: "",
        rarity: Math.floor(Math.random() * 30) + 70,
      }));

  const totalSlides = displayNfts.length;

  const scrollToIndex = useCallback((index: number) => {
    if (!carouselRef.current) return;
    const el = carouselRef.current;
    const cardWidth = 280;
    const gap = 16;
    const containerWidth = el.clientWidth;
    const scrollPos = index * (cardWidth + gap) - (containerWidth - cardWidth) / 2;
    el.scrollTo({ left: scrollPos, behavior: "smooth" });
    setActiveIndex(index);
  }, []);

  const handlePrev = () => {
    const newIndex = Math.max(0, activeIndex - 1);
    scrollToIndex(newIndex);
  };

  const handleNext = () => {
    const newIndex = Math.min(totalSlides - 1, activeIndex + 1);
    scrollToIndex(newIndex);
  };

  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    const handleScroll = () => {
      const cardWidth = 280;
      const gap = 16;
      const containerWidth = el.clientWidth;
      const offset = el.scrollLeft + (containerWidth - cardWidth) / 2;
      const idx = Math.round(offset / (cardWidth + gap));
      setActiveIndex(Math.max(0, Math.min(totalSlides - 1, idx)));
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [totalSlides]);

  const copyTxHash = () => {
    navigator.clipboard.writeText(txHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const costPerNft = 100;
  const totalValue = quantity * costPerNft;

  if (selectedNft) {
    return (
      <MintedNftDetailScreen
        nft={selectedNft}
        txHash={txHash}
        walletAddress={walletAddress}
        onClose={() => setSelectedNft(null)}
        onViewExplorer={() => window.open(`${SKALE_EXPLORER_BASE_URL}/tx/${txHash}`, "_blank")}
        initialSold={soldNftIds.has(selectedNft.id)}
        onSold={() => handleNftSold(selectedNft.id)}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-[#020617] flex flex-col overflow-hidden font-['Plus_Jakarta_Sans',sans-serif]">
      <header className="sticky top-0 z-40 backdrop-blur-md bg-[#020617cc] border-b border-[#1e293b80] flex-shrink-0">
        <div className="flex items-center justify-between w-full max-w-[430px] md:max-w-5xl mx-auto px-6 pt-12 md:pt-6 pb-[17px]">
          <button
            onClick={onBack}
            className="w-10 h-10 flex items-center justify-center hover:bg-[#1e293b] rounded-full transition-colors"
          >
            <ArrowLeft className="h-6 w-6 text-[#f8fafc]" />
          </button>
          <span className="text-lg font-bold text-[#f8fafc] leading-7">Success!</span>
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: `Minted ${quantity} NFTs`, url: `https://explorer.nebula-testnet.skalelabs.com/tx/${txHash}` });
              }
            }}
            className="w-10 h-10 rounded-full bg-[#1e293b80] flex items-center justify-center hover:bg-[#1e293b] transition-colors"
          >
            <Share2 className="h-5 w-5 text-[#f8fafc]" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="w-full max-w-[430px] md:max-w-5xl mx-auto flex flex-col">

          <div className="flex flex-col md:flex-row md:gap-8 md:px-4 md:py-8">

            <div className="md:flex-[3] relative w-full" style={{ minHeight: "450px" }}>
              <div className="flex justify-center items-start gap-1.5 px-6 pt-4 pb-2 max-w-[320px] mx-auto">
                {displayNfts.slice(0, 5).map((_, i) => (
                  <div
                    key={i}
                    className={`flex-1 h-1.5 rounded-full transition-colors ${
                      i === activeIndex % 5 ? "bg-[#4ade80]" : "bg-[#1e293b]"
                    }`}
                  />
                ))}
              </div>

              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-[#4ade801a] blur-[40px] pointer-events-none" />

              <div
                ref={carouselRef}
                className="flex gap-4 overflow-x-auto snap-x snap-mandatory px-[75px] md:px-[calc(50%-140px)] py-4 scrollbar-hide"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {displayNfts.map((nft, index) => (
                  <div
                    key={index}
                    className="snap-center flex-shrink-0 cursor-pointer"
                    style={{ width: "280px" }}
                    onClick={() => setSelectedNft(nft)}
                  >
                    <div className="w-[280px] rounded-[40px] border border-[#1e293b80] bg-[#0f172a] overflow-hidden shadow-[0_25px_50px_-12px_rgba(74,222,128,0.05)] active:scale-[0.98] hover:border-[#4ade8040] transition-all">
                      <div className="p-6 pb-1 flex flex-col gap-1">
                        <div className="flex items-start justify-between gap-4">
                          <span className="text-lg font-bold text-[#f8fafc] leading-7 truncate">
                            {nft.name || `Gamefolio Genesis ${getTokenIdPadded(nft.id)}`}
                          </span>
                          <span className="text-sm font-normal text-[#4ade80] font-['JetBrains_Mono',monospace] leading-5 flex-shrink-0">
                            {getTokenIdPadded(nft.id)}
                          </span>
                        </div>
                        <span className="text-xs font-normal text-[#94a3b8] leading-4">
                          Genesis Collection
                        </span>
                      </div>

                      <div className="relative w-full aspect-square">
                        {nft.imageUrl ? (
                          <img
                            src={nft.imageUrl}
                            alt={nft.name || `NFT #${nft.id}`}
                            className={`w-full h-full object-cover transition-all duration-300 ${soldNftIds.has(nft.id) ? "grayscale brightness-50" : ""}`}
                          />
                        ) : (
                          <div className="w-full h-full bg-[#1e293b] flex items-center justify-center">
                            <div className="w-12 h-12 rounded-full border-2 border-[#4ade80]/30 border-t-[#4ade80] animate-spin" />
                          </div>
                        )}

                        {soldNftIds.has(nft.id) && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-4xl font-black text-white/80 uppercase tracking-[6px] rotate-[-15deg] drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
                              SOLD
                            </span>
                          </div>
                        )}

                        {!soldNftIds.has(nft.id) && (
                          <div className="absolute bottom-3 left-3">
                            <div className="backdrop-blur-md bg-black/40 border border-white/10 rounded-full px-3 py-1.5 flex items-center justify-center">
                              <span className="text-[10px] font-bold text-white uppercase tracking-[0.5px] leading-[15px]">
                                {getRarityLabel(nft.rarity)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {activeIndex > 0 && (
                <button
                  onClick={handlePrev}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-[#1e293bcc] border border-[#1e293b80] backdrop-blur-md flex items-center justify-center shadow-[0_4px_6px_-4px_rgba(0,0,0,0.1),0_10px_15px_-3px_rgba(0,0,0,0.1)] hover:bg-[#334155] transition-colors"
                >
                  <ArrowLeft className="h-6 w-6 text-[#f8fafc]" />
                </button>
              )}
              {activeIndex < totalSlides - 1 && (
                <button
                  onClick={handleNext}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-[#1e293bcc] border border-[#1e293b80] backdrop-blur-md flex items-center justify-center shadow-[0_4px_6px_-4px_rgba(0,0,0,0.1),0_10px_15px_-3px_rgba(0,0,0,0.1)] hover:bg-[#334155] transition-colors"
                >
                  <ArrowRight className="h-6 w-6 text-[#f8fafc]" />
                </button>
              )}
            </div>

            <div className="md:flex-[2] flex flex-col">
              <div className="flex flex-col items-center gap-4 px-6 md:px-0 py-8">
                <div className="flex items-center gap-2 bg-[#4ade801a] border border-[#4ade8033] rounded-full px-[13px] py-[5px]">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" clipRule="evenodd" d="M14.6663 8.00001C14.6663 11.682 11.6817 14.6667 7.99968 14.6667C4.31768 14.6667 1.33301 11.682 1.33301 8.00001C1.33301 4.31801 4.31768 1.33334 7.99968 1.33334C11.6817 1.33334 14.6663 4.31801 14.6663 8.00001ZM10.6863 5.98001C10.8813 6.17522 10.8813 6.49147 10.6863 6.68668L7.35301 10.02C7.1578 10.215 6.84155 10.215 6.64634 10.02L5.31301 8.68668C5.17924 8.56203 5.12418 8.37431 5.16942 8.19715C5.21466 8.02 5.35299 7.88166 5.53015 7.83642C5.70731 7.79118 5.89503 7.84624 6.01968 7.98001L6.99968 8.96001L8.48968 7.47001L9.97968 5.98001C10.1749 5.78504 10.4911 5.78504 10.6863 5.98001Z" fill="#4ADE80" />
                  </svg>
                  <span className="text-[10px] font-bold text-[#4ade80] uppercase tracking-[1px] leading-[15px]">
                    Transaction Confirmed
                  </span>
                </div>

                <span className="text-[30px] md:text-4xl font-bold text-[#f8fafc] text-center leading-9 md:leading-[44px]">
                  {quantity} NFTs Minted
                </span>

                <span className="text-sm font-normal text-[#94a3b8] text-center leading-5 max-w-[223px]">
                  Your new digital assets have been successfully forged on-chain.
                </span>
              </div>

              <div className="flex flex-col gap-3 px-6 md:px-0 pb-4">
                <div className="w-full h-[74px] rounded-2xl bg-[#0f172a80] border border-[#1e293b80] flex items-center justify-between px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#1e293b] flex items-center justify-center">
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" clipRule="evenodd" d="M7.61339 4.52303C8.6753 2.6188 9.20583 1.66669 9.99954 1.66669C10.7933 1.66669 11.3238 2.6188 12.3857 4.52303L12.6606 5.01585C12.9623 5.55729 13.1132 5.828 13.3479 6.00652C13.5825 6.18505 13.8759 6.25126 14.4626 6.38368L14.9956 6.50437C17.0574 6.97121 18.0875 7.20421 18.3331 7.99289C18.5778 8.78073 17.8754 9.60294 16.4699 11.2465L16.1062 11.6714C15.7072 12.1383 15.5069 12.3721 15.4172 12.6604C15.3275 12.9496 15.3577 13.2614 15.4181 13.8841L15.4734 14.4515C15.6854 16.6449 15.7919 17.7412 15.1499 18.2281C14.5078 18.7151 13.5423 18.2709 11.6129 17.3825L11.1126 17.1528C10.5644 16.8997 10.2904 16.774 9.99954 16.774C9.70871 16.774 9.43464 16.8997 8.88651 17.1528L8.38698 17.3825C6.45677 18.2709 5.49124 18.7151 4.85007 18.229C4.20723 17.7412 4.31367 16.6449 4.52572 14.4515L4.58103 13.8849C4.64138 13.2614 4.67155 12.9496 4.58103 12.6613C4.49219 12.3721 4.29188 12.1383 3.89293 11.6723L3.52918 11.2465C2.12363 9.60378 1.42128 8.78157 1.66602 7.99289C1.91075 7.20421 2.94249 6.97037 5.00429 6.50437L5.53734 6.38368C6.12319 6.25126 6.4157 6.18505 6.65121 6.00652C6.88673 5.828 7.03675 5.55729 7.33848 5.01585L7.61339 4.52303Z" fill="#4ADE80" />
                      </svg>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-[#94a3b8] uppercase leading-[15px]">
                        Collection Value
                      </span>
                      <span className="text-sm font-bold text-[#f8fafc] leading-5">
                        {totalValue} GF Tokens
                      </span>
                    </div>
                  </div>
                  <button onClick={onViewCollection} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <span className="text-sm font-bold text-[#4ade80] leading-5">Explore All</span>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M2.66699 8H13.3337M13.3337 8L9.33366 4M13.3337 8L9.33366 12" stroke="#4ADE80" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>

                <button
                  onClick={onViewCollection}
                  className="w-full h-14 rounded-2xl bg-[#4ade80] flex items-center justify-center gap-[6.5px] shadow-[0_4px_6px_-4px_rgba(74,222,128,0.2),0_10px_15px_-3px_rgba(74,222,128,0.2)] hover:bg-[#22c55e] transition-colors"
                >
                  <svg width="18" height="15" viewBox="0 0 18 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" clipRule="evenodd" d="M15.9164 4.16984C15.8691 4.16706 15.8189 4.16595 15.7655 4.1665H13.6614C11.938 4.1665 10.4639 5.52317 10.4639 7.2915C10.4639 9.05984 11.9389 10.4165 13.6614 10.4165H15.7655C15.8189 10.4171 15.8694 10.4159 15.9172 10.4132C16.6498 10.369 17.2363 9.78864 17.288 9.0565C17.2914 9.0065 17.2914 8.95234 17.2914 8.90234V5.68067C17.2914 5.63067 17.2914 5.5765 17.288 5.5265C17.2363 4.79437 16.649 4.21401 15.9164 4.16984ZM13.4772 8.12484C13.9205 8.12484 14.2797 7.7515 14.2797 7.2915C14.2797 6.8315 13.9205 6.45817 13.4772 6.45817C13.033 6.45817 12.6739 6.8315 12.6739 7.2915C12.6739 7.7515 13.033 8.12484 13.4772 8.12484Z" fill="#022C22" />
                    <path fillRule="evenodd" clipRule="evenodd" d="M15.765 11.6667C15.8234 11.6643 15.8795 11.69 15.9158 11.7357C15.9522 11.7815 15.9646 11.8419 15.9491 11.8983C15.7825 12.4916 15.5166 12.9983 15.0908 13.4233C14.4666 14.0483 13.6758 14.3241 12.6991 14.4558C11.7492 14.5833 10.5367 14.5833 9.00499 14.5833H7.24499C5.71333 14.5833 4.49999 14.5833 3.55083 14.4558C2.57416 14.3241 1.78333 14.0475 1.15917 13.4241C0.535833 12.8 0.259166 12.0092 0.1275 11.0325C0 10.0825 0 8.86999 0 7.33832V7.24499C0 5.71333 0 4.49999 0.1275 3.54999C0.259166 2.57333 0.535833 1.7825 1.15917 1.15833C1.78333 0.534999 2.57416 0.258333 3.55083 0.126666C4.50083 0 5.71333 0 7.24499 0H9.00499C10.5367 0 11.75 0 12.6991 0.1275C13.6758 0.259166 14.4666 0.535833 15.0908 1.15917C15.5166 1.58583 15.7825 2.09166 15.9491 2.685C15.9646 2.74139 15.9522 2.80179 15.9158 2.84756C15.8795 2.89334 15.8234 2.91901 15.765 2.91666H13.6616C11.2975 2.91666 9.21415 4.78333 9.21415 7.29166C9.21415 9.79999 11.2975 11.6667 13.6616 11.6667H15.765ZM3.125 3.33333C2.77982 3.33333 2.5 3.61315 2.5 3.95833C2.5 4.30351 2.77982 4.58333 3.125 4.58333H6.45832C6.8035 4.58333 7.08332 4.30351 7.08332 3.95833C7.08332 3.61315 6.8035 3.33333 6.45832 3.33333H3.125Z" fill="#022C22" />
                  </svg>
                  <span className="text-base font-bold text-[#022c22] leading-6">Go to Inventory</span>
                </button>

                <button
                  onClick={onBack}
                  className="w-full h-[58px] rounded-2xl bg-[#1e293b] border border-[#1e293b80] flex items-center justify-center gap-[6.5px] hover:bg-[#334155] transition-colors"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" clipRule="evenodd" d="M10.0184 1.875C6.02345 1.875 2.74011 4.9275 2.42011 8.81917H1.61928C1.36586 8.81905 1.13746 8.97196 1.04102 9.20631C0.944573 9.44066 0.999186 9.71005 1.17928 9.88833L2.57928 11.2767C2.82291 11.5182 3.21565 11.5182 3.45928 11.2767L4.85928 9.88833C5.03938 9.71005 5.09399 9.44066 4.99755 9.20631C4.9011 8.97196 4.6727 8.81905 4.41928 8.81917H3.67511C3.99178 5.62667 6.70678 3.125 10.0184 3.125C12.2387 3.12072 14.3016 4.27039 15.4659 6.16083C15.58 6.35723 15.7916 6.47629 16.0187 6.47184C16.2457 6.46739 16.4525 6.34011 16.5588 6.1394C16.665 5.93869 16.6541 5.69613 16.5301 5.50583C15.1386 3.24603 12.6723 1.87118 10.0184 1.875Z" fill="#F8FAFC" />
                    <path fillRule="evenodd" clipRule="evenodd" d="M17.3201 8.7225C17.0767 8.4821 16.6852 8.4821 16.4418 8.7225L15.0359 10.1108C14.8554 10.2889 14.8003 10.5585 14.8966 10.7931C14.9929 11.0278 15.2215 11.181 15.4751 11.1808H16.2243C15.9059 14.3725 13.1818 16.875 9.85428 16.875C7.62727 16.8807 5.55653 15.7313 4.38345 13.8383C4.26614 13.6482 4.05634 13.5352 3.83306 13.5417C3.60978 13.5482 3.40695 13.6734 3.30098 13.87C3.195 14.0667 3.20198 14.3049 3.31928 14.495C4.72016 16.757 7.19364 18.1309 9.85428 18.125C13.8609 18.125 17.1584 15.075 17.4793 11.1808H18.2859C18.5396 11.181 18.7681 11.0278 18.8644 10.7931C18.9608 10.5585 18.9057 10.2889 18.7251 10.1108L17.3201 8.7225Z" fill="#F8FAFC" />
                  </svg>
                  <span className="text-base font-bold text-[#f8fafc] leading-6">Mint More NFTs</span>
                </button>
              </div>

              <div className="flex flex-col items-center gap-4 px-6 md:px-0 py-8">
                <button
                  onClick={copyTxHash}
                  className="flex items-center gap-2 bg-[#1e293b4d] border border-[#1e293b4d] rounded-full px-[17px] py-[9px] hover:bg-[#1e293b80] transition-colors"
                >
                  <span className="text-[10px] text-[#94a3b8] leading-[15px] font-['JetBrains_Mono',monospace]">
                    Tx Hash: {txHash.slice(0, 6)}...{txHash.slice(-4)}
                  </span>
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-[#4ade80] flex-shrink-0" />
                  ) : (
                    <svg width="11" height="12" viewBox="0 0 11 12" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
                      <path fillRule="evenodd" clipRule="evenodd" d="M1.75 5.25C1.75 3.60033 1.75 2.77492 2.26275 2.26275C2.77492 1.75 3.60033 1.75 5.25 1.75H7C8.64967 1.75 9.47508 1.75 9.98725 2.26275C10.5 2.77492 10.5 3.60033 10.5 5.25V8.16667C10.5 9.81633 10.5 10.6417 9.98725 11.1539C9.47508 11.6667 8.64967 11.6667 7 11.6667H5.25C3.60033 11.6667 2.77492 11.6667 2.26275 11.1539C1.75 10.6417 1.75 9.81633 1.75 8.16667V5.25Z" stroke="#4ADE80" strokeWidth="0.875" />
                      <path d="M1.75 9.91667C0.783502 9.91667 0 9.13317 0 8.16667V4.66667C0 2.46692 0 1.36675 0.683667 0.683667C1.36733 0.000583291 2.46692 0 4.66667 0H7C7.9665 0 8.75 0.783502 8.75 1.75" stroke="#4ADE80" strokeWidth="0.875" />
                    </svg>
                  )}
                </button>

                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#4ade80]" />
                  <span className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-[2px] leading-[15px]">
                    SKALE Nebula
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}