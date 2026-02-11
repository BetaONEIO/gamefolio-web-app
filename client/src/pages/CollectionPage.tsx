import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { getQueryFn } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  RefreshCw,
  ArrowLeft,
  Hexagon,
  ExternalLink
} from "lucide-react";
import { Link } from "wouter";
import { SKALE_NEBULA_TESTNET, NFT_CONTRACT_ADDRESS } from "@shared/contracts";
import MintedNftDetailScreen from "@/components/mint/MintedNftDetailScreen";

interface OwnedNft {
  tokenId: number;
  name: string;
  image: string | null;
  description?: string;
  attributes?: Array<{ trait_type: string; value: string | number }>;
  txHash?: string;
  mintedAt?: string;
  sold?: boolean;
}

interface OwnedNftsData {
  nfts: OwnedNft[];
  count: number;
}

const SKALE_EXPLORER_BASE_URL = SKALE_NEBULA_TESTNET.blockExplorers.default.url;

const RARE_TRAITS: Record<string, string[]> = {
  Background: ["Melting_gold", "Aurora", "Neon_city", "Galaxy", "Diamond"],
  Hand: ["Cyber_punk_sword", "Lightning_staff", "Golden_scepter", "Plasma_gun"],
  Skin: ["Diamond_skin", "Galaxy_skin", "Golden_skin", "Holographic_skin"],
  Costume: ["Legendary_armor", "Royal_cape", "Cyber_suit", "Dragon_scale"],
  Eyes: ["Laser_eyes", "Diamond_eyes", "Galaxy_eyes", "Fire_eyes"],
  Mouth: ["Golden_grill", "Diamond_teeth", "Flame_breath"],
  Headwear: ["Crown", "Halo", "Dragon_horns", "Diamond_tiara"],
};

function computeNftRarityScore(nft: OwnedNft): number {
  if (!nft.attributes || nft.attributes.length === 0) return 30;
  let score = 0;
  const traitCount = nft.attributes.length;
  score += Math.min(traitCount * 8, 40);
  for (const attr of nft.attributes) {
    const traitType = attr.trait_type;
    const traitValue = String(attr.value);
    const rareList = RARE_TRAITS[traitType];
    if (rareList && rareList.some(r => traitValue.toLowerCase().includes(r.toLowerCase()))) {
      score += 15;
    }
  }
  let hash = 0;
  const combo = nft.attributes.map(a => `${a.trait_type}:${a.value}`).join('|');
  for (let i = 0; i < combo.length; i++) {
    hash = ((hash << 5) - hash + combo.charCodeAt(i)) | 0;
  }
  score += Math.abs(hash % 20);
  return Math.min(score, 100);
}

function getNftRarity(nft: OwnedNft): { label: string; score: number } {
  const rarityAttr = nft.attributes?.find(a => a.trait_type.toLowerCase() === "rarity");
  if (rarityAttr) {
    const val = String(rarityAttr.value).toLowerCase();
    if (val === "legendary") return { label: "legendary", score: 95 };
    if (val === "epic") return { label: "epic", score: 80 };
    if (val === "rare") return { label: "rare", score: 55 };
    if (val === "common") return { label: "common", score: 25 };
  }
  const score = computeNftRarityScore(nft);
  if (score >= 85) return { label: "legendary", score };
  if (score >= 65) return { label: "epic", score };
  if (score >= 40) return { label: "rare", score };
  return { label: "common", score };
}

const rarityCardStyles: Record<string, { bg: string; glow: string; dotColor: string; textStyle: string; nameColor: string }> = {
  legendary: {
    bg: "bg-gradient-to-b from-[#f6cfff] via-[#cefafe] to-[#fff085]",
    glow: "shadow-[0_0_25px_rgba(236,72,153,0.4)]",
    dotColor: "bg-green-500 shadow-[0_0_8px_#22c55e]",
    textStyle: "bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent font-black",
    nameColor: "text-slate-800",
  },
  epic: {
    bg: "bg-slate-900",
    glow: "",
    dotColor: "bg-green-600 shadow-[0_0_8px_#16a34a]",
    textStyle: "text-slate-400 font-normal",
    nameColor: "text-slate-50",
  },
  rare: {
    bg: "bg-gradient-to-b from-[#4ade8033] via-[#14532d4d] to-[#4ade8033]",
    glow: "shadow-[0_0_20px_rgba(74,222,128,0.3)]",
    dotColor: "bg-green-400 shadow-[0_0_8px_#4ade80]",
    textStyle: "text-slate-400 font-normal",
    nameColor: "text-slate-50",
  },
  common: {
    bg: "bg-slate-900",
    glow: "",
    dotColor: "bg-slate-400/50 shadow-[0_0_8px_#1e293b]",
    textStyle: "text-slate-400 font-normal",
    nameColor: "text-slate-50",
  },
};

function NftCard({ nft, onClick }: { nft: OwnedNft; onClick: () => void }) {
  const { label: rarity } = getNftRarity(nft);
  const styles = rarityCardStyles[rarity] || rarityCardStyles.common;
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div
      className={`rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 hover:scale-[1.03] ${styles.bg} ${styles.glow} ${nft.sold ? 'opacity-50 grayscale' : ''}`}
      onClick={onClick}
    >
      <div className="relative">
        <div className="aspect-square overflow-hidden">
          {nft.image && !imgFailed ? (
            <img
              src={nft.image}
              alt={nft.name}
              className={`w-full h-full object-cover ${nft.sold ? 'grayscale' : ''}`}
              onError={() => setImgFailed(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-800">
              <Hexagon className="w-12 h-12 text-slate-600" />
            </div>
          )}
        </div>

        <div className="absolute top-2 right-2 backdrop-blur-md bg-black/60 border border-white/10 rounded-xl px-2.5 py-1.5">
          <span className="text-[10px] font-bold text-green-400">#{nft.tokenId}</span>
        </div>

        {nft.sold && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="text-white/90 font-bold text-lg uppercase tracking-wider rotate-[-15deg]">SOLD</span>
          </div>
        )}
      </div>

      <div className="p-3 pt-2">
        <h3 className={`text-sm font-bold truncate ${styles.nameColor}`}>{nft.name}</h3>
        <div className="flex items-center gap-1.5 mt-1">
          <div className={`w-2 h-2 rounded-full ${styles.dotColor}`} />
          <span className={`text-[11px] uppercase tracking-tight ${styles.textStyle}`}>{rarity}</span>
        </div>
      </div>
    </div>
  );
}

export default function CollectionPage() {
  const { user } = useAuth();
  const [selectedNft, setSelectedNft] = useState<OwnedNft | null>(null);
  const [nftTab, setNftTab] = useState<"owned" | "sold">("owned");

  const { data: nftData, isLoading: nftsLoading, refetch: refetchNfts, isRefetching: nftsRefetching } = useQuery<OwnedNftsData>({
    queryKey: ["/api/nfts/owned"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!user,
    staleTime: 60_000,
  });

  if (selectedNft) {
    const { score } = getNftRarity(selectedNft);
    return (
      <MintedNftDetailScreen
        nft={{
          id: selectedNft.tokenId,
          name: selectedNft.name,
          imageUrl: selectedNft.image || '',
          rarity: score,
          attributes: selectedNft.attributes?.map(a => ({
            trait_type: a.trait_type,
            value: String(a.value),
          })),
        }}
        txHash={selectedNft.txHash || ''}
        walletAddress={user?.walletAddress || undefined}
        onClose={() => setSelectedNft(null)}
        onViewExplorer={() => {
          if (selectedNft.txHash) {
            window.open(`${SKALE_EXPLORER_BASE_URL}/tx/${selectedNft.txHash}`, '_blank');
          }
        }}
        initialSold={selectedNft.sold || false}
        onSold={() => {
          refetchNfts();
        }}
        mintedAt={selectedNft.mintedAt}
      />
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 text-center">
          <p className="text-slate-400 mb-4">Please log in to view your collection</p>
          <Link href="/auth">
            <Button className="bg-green-400 hover:bg-green-500 text-slate-900 font-bold">Log In</Button>
          </Link>
        </div>
      </div>
    );
  }

  const ownedNfts = nftData?.nfts.filter((n: OwnedNft) => !n.sold) || [];
  const soldNfts = nftData?.nfts.filter((n: OwnedNft) => n.sold) || [];
  const displayNfts = nftTab === "owned" ? ownedNfts : soldNfts;

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col">
      <div className="sticky top-0 z-10 backdrop-blur-md bg-[#020617]/80 border-b border-slate-800/30">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <button className="bg-slate-800 border border-slate-800 rounded-2xl w-10 h-10 flex items-center justify-center hover:bg-slate-700 transition-colors">
                <ArrowLeft className="w-5 h-5 text-slate-50" />
              </button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-50 leading-7">My Collection</h1>
              <p className="text-xs text-slate-400">NFTs & Lootbox rewards</p>
            </div>
          </div>
          <button
            onClick={() => refetchNfts()}
            disabled={nftsRefetching}
            className="bg-slate-800 border border-slate-800 rounded-2xl w-10 h-10 flex items-center justify-center hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 text-slate-50 ${nftsRefetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full px-4 md:px-8 flex-1">
        <div className="bg-gradient-to-b from-green-900/10 to-transparent py-6 md:py-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div className="flex items-start gap-6 md:gap-10">
              <div>
                <p className="text-xs font-bold text-green-400 uppercase tracking-wider mb-1">My NFTs</p>
                <div className="flex items-end gap-2">
                  <span className="text-4xl md:text-5xl font-black text-slate-50 leading-none">
                    {nftsLoading ? "—" : nftData?.count || 0}
                  </span>
                  <span className="text-sm text-slate-400 pb-1">Items Total</span>
                </div>
              </div>

              {nftData && nftData.count > 0 && (
                <a
                  href={`${SKALE_EXPLORER_BASE_URL}/address/${NFT_CONTRACT_ADDRESS}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-green-400 hover:text-green-300 transition-colors mt-1"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>View Contract</span>
                </a>
              )}
            </div>

            <div className="bg-slate-800 border border-slate-800 rounded-2xl p-1.5 flex w-full md:w-auto">
              <button
                onClick={() => setNftTab("owned")}
                className={`flex-1 md:w-44 h-10 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold transition-all ${
                  nftTab === "owned"
                    ? "bg-green-400 text-green-950 shadow-[0_0_15px_-5px_#4ade80]"
                    : "text-slate-400 hover:text-slate-300"
                }`}
              >
                <span>Owned</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-lg ${
                  nftTab === "owned"
                    ? "bg-green-950/20 text-green-950"
                    : "bg-slate-800 text-slate-400"
                }`}>
                  {ownedNfts.length}
                </span>
              </button>
              <button
                onClick={() => setNftTab("sold")}
                className={`flex-1 md:w-44 h-10 rounded-2xl flex items-center justify-center gap-2 text-sm transition-all ${
                  nftTab === "sold"
                    ? "bg-green-400 text-green-950 font-bold shadow-[0_0_15px_-5px_#4ade80]"
                    : "text-slate-400 hover:text-slate-300"
                }`}
              >
                <span>Sold</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-lg ${
                  nftTab === "sold"
                    ? "bg-green-950/20 text-green-950"
                    : "bg-slate-800 text-slate-400"
                }`}>
                  {soldNfts.length}
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="pb-24 md:pb-12">
          {nftsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="aspect-[3/4] bg-slate-800 rounded-2xl" />
              ))}
            </div>
          ) : displayNfts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {displayNfts.map((nft: OwnedNft) => (
                <NftCard key={nft.tokenId} nft={nft} onClick={() => setSelectedNft(nft)} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Hexagon className="w-12 h-12 text-slate-600 mb-3" />
              <p className="text-slate-400 text-sm">
                {nftTab === "owned" ? "No NFTs owned yet" : "No sold NFTs"}
              </p>
              {nftTab === "owned" && (
                <Link href="/store">
                  <Button variant="ghost" size="sm" className="mt-3 text-green-400 hover:text-green-300 hover:bg-green-500/10">
                    Mint NFTs
                  </Button>
                </Link>
              )}
              {nftTab === "sold" && (
                <p className="text-slate-500 text-xs mt-1">Quick sell NFTs from their detail view to list them here</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
