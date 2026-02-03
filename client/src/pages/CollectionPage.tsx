import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
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
  Sparkles
} from "lucide-react";
import { formatDistance } from "date-fns";
import { Link } from "wouter";
import { useSignedUrl } from "@/hooks/use-signed-url";

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
    enabled: !!user,
  });

  const filteredItems = data?.items.filter((item: CollectionItem) => {
    if (filter === "all") return true;
    if (filter === "xp") return item.rewardType === "xp_reward";
    if (filter === "coins") return item.rewardType === "gf_tokens";
    if (filter === "special") return ["avatar_border", "profile_banner", "profile_background", "badge", "emoji", "sound_effect"].includes(item.rewardType);
    return true;
  }) || [];

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
      {/* Header */}
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
              <p className="text-xs text-gray-500">Lootbox rewards</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="text-gray-400 hover:text-white"
          >
            <RefreshCw className={`w-5 h-5 ${isRefetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* Stats Overview */}
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

        {/* Rarity Breakdown */}
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

        {/* Filter Tabs */}
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

        {/* Items Grid */}
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
              {filteredItems.map((item) => (
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
