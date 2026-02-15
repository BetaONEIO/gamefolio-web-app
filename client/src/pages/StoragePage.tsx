import { useAuth } from "@/hooks/use-auth";
import { useCrossmint } from "@/hooks/use-crossmint";
import { Link } from "wouter";
import { Search, Bell, Sliders, Map, TrendingUp, User, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export default function StoragePage() {
  const { user } = useAuth();
  const { wallet } = useCrossmint();

  // Mock data for categories
  const categories = [
    { id: 1, name: "Art", image: "https://images.unsplash.com/photo-1561214115-f2f134cc4912?w=400&h=400&fit=crop", color: "from-purple-500 to-pink-500" },
    { id: 2, name: "Collectible", image: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&h=400&fit=crop", color: "from-gray-500 to-gray-700" },
    { id: 3, name: "Music", image: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=400&fit=crop", color: "from-orange-500 to-red-500" },
  ];

  // Mock data for top sellers
  const topSellers = [
    { id: 1, name: "KNS_Khass", avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop", amount: "25.0 ETH", verified: true },
    { id: 2, name: "Moazily", avatar: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&h=100&fit=crop", amount: "10.5 ETH", verified: true },
  ];

  // Mock data for trending NFTs
  const trendingNFTs = [
    { 
      id: 1, 
      name: "ZapiRobo #2178", 
      image: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=400&h=400&fit=crop",
      creator: "MetaGlow XI",
      price: "0.49 ETH",
      verified: true
    },
    { 
      id: 2, 
      name: "DidioFlox #4678", 
      image: "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=400&h=400&fit=crop",
      creator: "MetaGlow XI",
      price: "0.39 ETH",
      verified: true
    },
  ];

  // Mock data for top collections
  const topCollections = [
    { 
      id: 1, 
      name: "MetaGlow XI", 
      image: "https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?w=400&h=300&fit=crop",
      verified: true
    },
    { 
      id: 2, 
      name: "CryptoGuard", 
      image: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=400&h=300&fit=crop",
      verified: true
    },
  ];

  const walletBalance = wallet?.address ? "2,786" : "0";

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/95 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10" data-testid="avatar-user">
                <AvatarImage src={user?.avatarUrl || undefined} />
                <AvatarFallback className="bg-gray-800">
                  {user?.username?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <span className="text-lg" data-testid="text-greeting">
                Hi, {user?.username || "Guest"}
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-gray-800 rounded-full px-4 py-2" data-testid="wallet-balance">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <div className="w-3 h-3 bg-blue-400 rounded-full" />
                </div>
                <span className="font-semibold" data-testid="text-balance">{walletBalance}</span>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative"
                data-testid="button-notifications"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full" />
              </Button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input 
              placeholder="Collection, item or user"
              className="pl-12 pr-12 bg-gray-900 border-gray-800 text-white placeholder:text-gray-500 h-12 rounded-xl"
              data-testid="input-search"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-500"
              data-testid="button-filters"
            >
              <Sliders className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        {/* Categories */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold" data-testid="heading-categories">Categories</h2>
            <Link href="/storage/categories">
              <Button variant="link" className="text-blue-500 p-0" data-testid="link-see-all-categories">
                See all →
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {categories.map((category) => (
              <Card 
                key={category.id}
                className="bg-gray-900 border-gray-800 overflow-hidden cursor-pointer hover:border-gray-700 transition-colors"
                data-testid={`card-category-${category.id}`}
              >
                <div className="relative aspect-square">
                  <img 
                    src={category.image} 
                    alt={category.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className={`absolute inset-0 bg-gradient-to-br ${category.color} opacity-30`} />
                </div>
                <div className="p-3 text-center">
                  <p className="font-medium" data-testid={`text-category-name-${category.id}`}>{category.name}</p>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Top Sellers and Creators */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold" data-testid="heading-top-sellers">Top sellers and creators</h2>
            <Link href="/storage/sellers">
              <Button variant="link" className="text-blue-500 p-0" data-testid="link-see-all-sellers">
                See all →
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {topSellers.map((seller) => (
              <Card 
                key={seller.id}
                className="bg-gray-900 border-gray-800 p-4 cursor-pointer hover:border-gray-700 transition-colors"
                data-testid={`card-seller-${seller.id}`}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={seller.avatar} />
                    <AvatarFallback>{seller.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="font-semibold truncate" data-testid={`text-seller-name-${seller.id}`}>
                        {seller.name}
                      </p>
                      {seller.verified && (
                        <Badge className="bg-blue-500 h-4 w-4 p-0 flex items-center justify-center rounded-full">
                          <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-blue-500" data-testid={`text-seller-amount-${seller.id}`}>
                      {seller.amount}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Trending NFTs */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold" data-testid="heading-trending-nfts">Trending NFTs</h2>
            <Link href="/storage/trending">
              <Button variant="link" className="text-blue-500 p-0" data-testid="link-see-all-trending">
                See all →
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {trendingNFTs.map((nft) => (
              <Card 
                key={nft.id}
                className="bg-gray-900 border-gray-800 overflow-hidden cursor-pointer hover:border-gray-700 transition-colors"
                data-testid={`card-nft-${nft.id}`}
              >
                <div className="relative aspect-square">
                  <img 
                    src={nft.image} 
                    alt={nft.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="p-4 space-y-2">
                  <p className="font-semibold" data-testid={`text-nft-name-${nft.id}`}>{nft.name}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-sm text-gray-400">
                      <span className="text-orange-500">⚡</span>
                      <span data-testid={`text-nft-creator-${nft.id}`}>{nft.creator}</span>
                      {nft.verified && (
                        <Badge className="bg-blue-500 h-3 w-3 p-0 flex items-center justify-center rounded-full ml-1">
                          <svg className="h-2 w-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-blue-500 font-semibold" data-testid={`text-nft-price-${nft.id}`}>
                      {nft.price}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Top Collections */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold" data-testid="heading-top-collections">Top Collections</h2>
            <Link href="/storage/collections">
              <Button variant="link" className="text-blue-500 p-0" data-testid="link-see-all-collections">
                See all →
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {topCollections.map((collection) => (
              <Card 
                key={collection.id}
                className="bg-gray-900 border-gray-800 overflow-hidden cursor-pointer hover:border-gray-700 transition-colors"
                data-testid={`card-collection-${collection.id}`}
              >
                <div className="relative aspect-video">
                  <img 
                    src={collection.image} 
                    alt={collection.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold" data-testid={`text-collection-name-${collection.id}`}>
                      {collection.name}
                    </p>
                    {collection.verified && (
                      <Badge className="bg-blue-500 h-4 w-4 p-0 flex items-center justify-center rounded-full">
                        <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </Badge>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-black border-t border-gray-800 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-around py-4">
            <Link href="/storage">
              <Button 
                variant="ghost" 
                className="flex-col h-auto gap-1 text-blue-500"
                data-testid="nav-explore"
              >
                <Map className="h-6 w-6" />
                <span className="text-xs">Explore</span>
              </Button>
            </Link>
            <Button 
              variant="ghost" 
              className="flex-col h-auto gap-1 text-gray-400"
              data-testid="nav-activity"
            >
              <TrendingUp className="h-6 w-6" />
              <span className="text-xs">Activity</span>
            </Button>
            <Link href={`/user/${user?.id}`}>
              <Button 
                variant="ghost" 
                className="flex-col h-auto gap-1 text-gray-400"
                data-testid="nav-profile"
              >
                <User className="h-6 w-6" />
                <span className="text-xs">Profile</span>
              </Button>
            </Link>
            <Button 
              variant="ghost" 
              className="flex-col h-auto gap-1 text-gray-400"
              data-testid="nav-more"
            >
              <MoreHorizontal className="h-6 w-6" />
              <span className="text-xs">More</span>
            </Button>
          </div>
        </div>
      </nav>
    </div>
  );
}
