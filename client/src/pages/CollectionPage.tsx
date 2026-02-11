import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { getQueryFn } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Package, 
  Zap, 
  Coins, 
  Crown, 
  Gem, 
  Award, 
  RefreshCw,
  ArrowLeft,
  Sparkles,
  Hexagon,
  ExternalLink
} from "lucide-react";
import { formatDistance } from "date-fns";
import { Link } from "wouter";
import { useSignedUrl } from "@/hooks/use-signed-url";
import { SKALE_NEBULA_TESTNET, NFT_CONTRACT_ADDRESS } from "@shared/contracts";

interface CollectionItem {
  id: number;
  name: string;
  imageUrl: string;
  rarity: string;
  rewardType: string;
  claimedAt: string;
}

interface CollectionData {
  stats: {
    totalLootboxesOpened: number;
    totalXpEarned: number;
    legendaryCount: number;
    epicCount: number;
    rareCount: number;
    commonCount: number;
  };
  items: CollectionItem[];
}

interface OwnedNft {
  tokenId: number;
  name: string;
  image: string | null;
  description?: string;
  attributes?: Array<{ trait_type: string; value: string | number }>;
}

interface OwnedNftsData {
  nfts: OwnedNft[];
  count: number;
}

const SKALE_EXPLORER_BASE_URL = SKALE_NEBULA_TESTNET.blockExplorers.default.url;

const rarityColors: Record<string, { bg: string; border: string; text: string; gradient: string }> = {
  legendary: {
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/50",
    text: "text-yellow-400",
    gradient: "from-yellow-500/20 via-amber-500/10 to-orange-500/20"
  },
  epic: {
    bg: "bg-purple-500/10",
    border: "border-purple-500/50",
    text: "text-purple-400",
    gradient: "from-purple-500/20 via-violet-500/10 to-fuchsia-500/20"
  },
  rare: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/50",
    text: "text-blue-400",
    gradient: "from-blue-500/20 via-cyan-500/10 to-sky-500/20"
  },
  common: {
    bg: "bg-gray-500/10",
    border: "border-gray-500/50",
    text: "text-gray-400",
    gradient: "from-gray-500/20 via-slate-500/10 to-zinc-500/20"
  }
};

const rewardTypeIcons: Record<string, typeof Zap> = {
  xp: Zap,
  coins: Coins,
  avatar_border: Crown,
  badge: Award,
  special: Gem,
  default: Sparkles
};

function getNftRarity(nft: OwnedNft): string {
  const rarityAttr = nft.attributes?.find(a => a.trait_type.toLowerCase() === "rarity");
  if (rarityAttr) {
    const val = String(rarityAttr.value).toLowerCase();
    if (["legendary", "epic", "rare", "common"].includes(val)) return val;
  }
  const scoreAttr = nft.attributes?.find(a => a.trait_type.toLowerCase() === "rarity score" || a.trait_type.toLowerCase() === "score");
  if (scoreAttr) {
    const score = Number(scoreAttr.value);
    if (score >= 95) return "legendary";
    if (score >= 75) return "epic";
    if (score >= 40) return "rare";
  }
  return "common";
}

const IPFS_FALLBACK_GATEWAYS = [
  'https://ipfs.io/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://w3s.link/ipfs/',
  'https://nftstorage.link/ipfs/',
];

function getIpfsFallbackUrl(originalUrl: string, attempt: number): string | null {
  const match = originalUrl.match(/\/ipfs\/(.+)$/);
  if (!match) return null;
  const path = match[1];
  if (attempt >= IPFS_FALLBACK_GATEWAYS.length) return null;
  return `${IPFS_FALLBACK_GATEWAYS[attempt]}${path}`;
}

function NftCard({ nft }: { nft: OwnedNft }) {
  const rarity = getNftRarity(nft);
  const colors = rarityColors[rarity] || rarityColors.common;
  const isLegendary = rarity === "legendary";
  const [imgSrc, setImgSrc] = useState(nft.image);
  const [imgError, setImgError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const handleImgError = useCallback(() => {
    if (!nft.image || retryCount >= IPFS_FALLBACK_GATEWAYS.length) {
      setImgError(true);
      return;
    }
    const fallback = getIpfsFallbackUrl(nft.image, retryCount);
    if (fallback) {
      setImgSrc(fallback);
      setRetryCount(prev => prev + 1);
    } else {
      setImgError(true);
    }
  }, [nft.image, retryCount]);
  
  return (
    <Card className={`${colors.border} border overflow-hidden relative group transition-transform hover:scale-[1.02] ${isLegendary ? 'ring-1 ring-yellow-500/30' : ''}`}>
      {isLegendary && (
        <div className="absolute inset-0 rounded-lg animate-pulse bg-gradient-to-br from-yellow-500/10 via-transparent to-amber-500/10 pointer-events-none z-0" />
      )}
      <div className="relative z-[1]">
        <div className="aspect-square bg-gray-900/80 flex items-center justify-center overflow-hidden">
          {imgSrc && !imgError ? (
            <img 
              src={imgSrc} 
              alt={nft.name} 
              className="w-full h-full object-cover"
              loading="lazy"
              onError={handleImgError}
            />
          ) : (
            <Hexagon className="w-12 h-12 text-gray-600" />
          )}
        </div>
        <div className={`p-3 bg-gradient-to-br ${colors.gradient}`}>
          <h3 className="font-semibold text-sm text-white truncate">{nft.name}</h3>
          <div className="flex items-center justify-between mt-1.5">
            <span className={`text-xs capitalize font-medium ${colors.text}`}>{rarity}</span>
            <span className="text-xs text-gray-500 font-mono">#{nft.tokenId}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

function CollectionItemCard({ item }: { item: CollectionItem }) {
  const { signedUrl } = useSignedUrl(item.imageUrl);
  const colors = rarityColors[item.rarity] || rarityColors.common;
  const IconComponent = rewardTypeIcons[item.rewardType] || rewardTypeIcons.default;
  
  return (
    <Card className={`${colors.bg} ${colors.border} border overflow-hidden`}>
      <div className={`bg-gradient-to-br ${colors.gradient} p-4`}>
        <div className="flex items-center justify-center mb-3">
          {signedUrl ? (
            <img 
              src={signedUrl} 
              alt={item.name} 
              className="w-16 h-16 object-contain rounded-lg"
            />
          ) : (
            <div className={`w-16 h-16 rounded-lg ${colors.bg} flex items-center justify-center`}>
              <IconComponent className={`w-8 h-8 ${colors.text}`} />
            </div>
          )}
        </div>
        <h3 className="font-semibold text-sm text-center text-white truncate">{item.name}</h3>
        <p className={`text-xs text-center ${colors.text} capitalize mt-1`}>{item.rarity}</p>
        <p className="text-xs text-center text-gray-500 mt-2">
          {formatDistance(new Date(item.claimedAt), new Date(), { addSuffix: true })}
        </p>
      </div>
    </Card>
  );
}

function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  iconColor 
}: { 
  icon: typeof Package; 
  label: string; 
  value: number | string; 
  iconColor: string;
}) {
  return (
    <Card className="bg-gray-900/50 border-gray-800">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2 rounded-lg ${iconColor}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-xs text-gray-400">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function RarityBadge({ rarity, count }: { rarity: string; count: number }) {
  const colors = rarityColors[rarity] || rarityColors.common;
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${colors.bg} ${colors.border} border`}>
      <span className={`text-lg font-bold ${colors.text}`}>{count}</span>
      <span className={`text-sm capitalize ${colors.text}`}>{rarity}</span>
    </div>
  );
}

export default function CollectionPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState("all");

  const { data, isLoading, refetch, isRefetching } = useQuery<CollectionData>({
    queryKey: ["/api/lootbox/collection"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!user,
  });

  const { data: nftData, isLoading: nftsLoading, refetch: refetchNfts, isRefetching: nftsRefetching } = useQuery<OwnedNftsData>({
    queryKey: ["/api/nfts/owned"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!user,
    staleTime: 60_000,
  });

  const filteredItems = data?.items.filter((item: CollectionItem) => {
    if (filter === "all") return true;
    if (filter === "xp") return item.rewardType === "xp_reward";
    if (filter === "coins") return item.rewardType === "gf_tokens";
    if (filter === "special") return ["avatar_border", "profile_banner", "profile_background", "badge", "emoji", "sound_effect"].includes(item.rewardType);
    return true;
  }) || [];

  const handleRefresh = () => {
    refetch();
    refetchNfts();
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0a1a] to-[#1a1a2e] flex items-center justify-center">
        <Card className="bg-gray-900/50 border-gray-800 p-8 text-center">
          <p className="text-gray-400 mb-4">Please log in to view your collection</p>
          <Link href="/auth">
            <Button className="bg-purple-600 hover:bg-purple-700">Log In</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a1a] via-[#1a1a2e] to-[#0a0a1a]">
      <div className="sticky top-0 z-10 bg-[#0a0a1a]/95 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-purple-400" />
                My Collection
              </h1>
              <p className="text-xs text-gray-500">NFTs & Lootbox rewards</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleRefresh}
            disabled={isRefetching || nftsRefetching}
            className="text-gray-400 hover:text-white"
          >
            <RefreshCw className={`w-5 h-5 ${(isRefetching || nftsRefetching) ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 space-y-6">
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-2">
              <Hexagon className="w-4 h-4 text-emerald-400" />
              My NFTs
              {nftData && nftData.count > 0 && (
                <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                  {nftData.count}
                </span>
              )}
            </h2>
            {nftData && nftData.count > 0 && (
              <a
                href={`${SKALE_EXPLORER_BASE_URL}/address/${NFT_CONTRACT_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gray-500 hover:text-emerald-400 flex items-center gap-1 transition-colors"
              >
                View Contract <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          {nftsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="aspect-[3/4] bg-gray-800 rounded-lg" />
              ))}
            </div>
          ) : nftData && nftData.nfts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {nftData.nfts.map((nft: OwnedNft) => (
                <NftCard key={nft.tokenId} nft={nft} />
              ))}
            </div>
          ) : (
            <Card className="bg-gray-900/50 border-gray-800 border-dashed p-6 text-center">
              <Hexagon className="w-10 h-10 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No NFTs collected yet</p>
              <Link href="/store">
                <Button variant="ghost" size="sm" className="mt-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10">
                  Mint NFTs
                </Button>
              </Link>
            </Card>
          )}
        </section>

        <div className="border-t border-gray-800/50" />

        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Stats Overview</h2>
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-20 bg-gray-800" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <StatCard 
                icon={Package} 
                label="Lootboxes Opened" 
                value={data?.stats.totalLootboxesOpened || 0}
                iconColor="bg-purple-600"
              />
              <StatCard 
                icon={Zap} 
                label="XP Earned" 
                value={data?.stats.totalXpEarned || 0}
                iconColor="bg-yellow-600"
              />
              <StatCard 
                icon={Crown} 
                label="Legendary Items" 
                value={data?.stats.legendaryCount || 0}
                iconColor="bg-amber-600"
              />
              <StatCard 
                icon={Gem} 
                label="Total Items" 
                value={(data?.stats.legendaryCount || 0) + (data?.stats.epicCount || 0) + (data?.stats.rareCount || 0) + (data?.stats.commonCount || 0)}
                iconColor="bg-blue-600"
              />
            </div>
          )}
        </section>

        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Rarity Breakdown</h2>
          {isLoading ? (
            <div className="flex gap-2 flex-wrap">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-24 bg-gray-800" />
              ))}
            </div>
          ) : (
            <div className="flex gap-2 flex-wrap">
              <RarityBadge rarity="legendary" count={data?.stats.legendaryCount || 0} />
              <RarityBadge rarity="epic" count={data?.stats.epicCount || 0} />
              <RarityBadge rarity="rare" count={data?.stats.rareCount || 0} />
              <RarityBadge rarity="common" count={data?.stats.commonCount || 0} />
            </div>
          )}
        </section>

        <section>
          <Tabs value={filter} onValueChange={setFilter} className="w-full">
            <TabsList className="bg-gray-900/50 border border-gray-800 w-full justify-start">
              <TabsTrigger value="all" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                All
              </TabsTrigger>
              <TabsTrigger value="xp" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                XP
              </TabsTrigger>
              <TabsTrigger value="coins" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                Coins
              </TabsTrigger>
              <TabsTrigger value="special" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                Special
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Collected Items ({filteredItems.length})
          </h2>
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-36 bg-gray-800" />
              ))}
            </div>
          ) : filteredItems.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {filteredItems.map((item: CollectionItem) => (
                <CollectionItemCard key={`${item.id}-${item.claimedAt}`} item={item} />
              ))}
            </div>
          ) : (
            <Card className="bg-gray-900/50 border-gray-800 p-8 text-center">
              <Package className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No items in this category yet</p>
              <p className="text-gray-500 text-sm mt-1">Open lootboxes to collect rewards!</p>
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}
