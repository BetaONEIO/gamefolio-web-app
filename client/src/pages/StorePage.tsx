import { useAuth } from "@/hooks/use-auth";
import { useCrossmint } from "@/hooks/use-crossmint";
import { Link } from "wouter";
import { ShoppingCart, DollarSign, Sparkles, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

type TabType = "buy" | "sell" | "mint";

export default function StorePage() {
  const { user } = useAuth();
  const { wallet } = useCrossmint();
  const [activeTab, setActiveTab] = useState<TabType>("buy");

  // Mock Gamefolio NFT Collection data
  const gamefolioNFTs = [
    {
      id: 1,
      name: "Gamer Avatar #001",
      image: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop",
      price: "0.05 ETH",
      description: "Epic gaming avatar with RGB effects",
      forSale: true,
    },
    {
      id: 2,
      name: "Gamer Avatar #002",
      image: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=400&h=400&fit=crop",
      price: "0.08 ETH",
      description: "Legendary warrior profile picture",
      forSale: true,
    },
    {
      id: 3,
      name: "Gamer Avatar #003",
      image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop",
      price: "0.06 ETH",
      description: "Futuristic cyber gamer avatar",
      forSale: true,
    },
    {
      id: 4,
      name: "Gamer Avatar #004",
      image: "https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400&h=400&fit=crop",
      price: "0.07 ETH",
      description: "Pro esports champion avatar",
      forSale: true,
    },
    {
      id: 5,
      name: "Gamer Avatar #005",
      image: "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=400&h=400&fit=crop",
      price: "0.09 ETH",
      description: "Mystical mage gaming portrait",
      forSale: true,
    },
    {
      id: 6,
      name: "Gamer Avatar #006",
      image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop",
      price: "0.04 ETH",
      description: "Cyberpunk warrior avatar",
      forSale: true,
    },
  ];

  const walletBalance = wallet?.address ? "2.786 ETH" : "0 ETH";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      <div className="flex">
        {/* Left Sidebar */}
        <aside className="w-64 min-h-screen bg-gray-900/50 backdrop-blur-sm border-r border-gray-800 p-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent" data-testid="text-store-title">
              NFT Store
            </h2>
            
            <Button
              variant={activeTab === "buy" ? "default" : "ghost"}
              className={`w-full justify-start gap-3 ${
                activeTab === "buy" 
                  ? "bg-blue-600 hover:bg-blue-700" 
                  : "hover:bg-gray-800"
              }`}
              onClick={() => setActiveTab("buy")}
              data-testid="button-tab-buy"
            >
              <ShoppingCart className="h-5 w-5" />
              Buy NFT
            </Button>

            <Button
              variant={activeTab === "sell" ? "default" : "ghost"}
              className={`w-full justify-start gap-3 ${
                activeTab === "sell" 
                  ? "bg-blue-600 hover:bg-blue-700" 
                  : "hover:bg-gray-800"
              }`}
              onClick={() => setActiveTab("sell")}
              data-testid="button-tab-sell"
            >
              <DollarSign className="h-5 w-5" />
              Sell NFT
            </Button>

            <Button
              variant={activeTab === "mint" ? "default" : "ghost"}
              className={`w-full justify-start gap-3 ${
                activeTab === "mint" 
                  ? "bg-blue-600 hover:bg-blue-700" 
                  : "hover:bg-gray-800"
              }`}
              onClick={() => setActiveTab("mint")}
              data-testid="button-tab-mint"
            >
              <Sparkles className="h-5 w-5" />
              Mint NFT
            </Button>
          </div>

          <div className="mt-8 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="h-5 w-5 text-blue-400" />
              <span className="text-sm text-gray-400">Your Balance</span>
            </div>
            <p className="text-xl font-bold" data-testid="text-wallet-balance">{walletBalance}</p>
            {!wallet?.address && (
              <Link href="/wallet">
                <Button size="sm" variant="outline" className="w-full mt-3" data-testid="button-create-wallet">
                  Create Wallet
                </Button>
              </Link>
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2" data-testid="heading-section">
                  {activeTab === "buy" && "Buy NFT Profile Pictures"}
                  {activeTab === "sell" && "Sell Your NFTs"}
                  {activeTab === "mint" && "Mint New NFTs"}
                </h1>
                <p className="text-gray-400" data-testid="text-section-description">
                  {activeTab === "buy" && "Browse and purchase exclusive Gamefolio NFT avatars for your profile"}
                  {activeTab === "sell" && "List your NFTs for sale in the Gamefolio marketplace"}
                  {activeTab === "mint" && "Create and mint your own custom NFT avatars"}
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10" data-testid="avatar-user">
                  <AvatarImage src={user?.avatarUrl || undefined} />
                  <AvatarFallback className="bg-gray-800">
                    {user?.username?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-gray-400" data-testid="text-username">
                  {user?.username || "Guest"}
                </span>
              </div>
            </div>
          </div>

          {/* Buy NFT Section */}
          {activeTab === "buy" && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-2" data-testid="heading-collection">
                  Gamefolio Collection
                </h2>
                <p className="text-sm text-gray-400" data-testid="text-collection-info">
                  Exclusive NFT avatars you can use as your profile picture
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {gamefolioNFTs.map((nft) => (
                  <Card
                    key={nft.id}
                    className="bg-gray-800/50 border-gray-700 overflow-hidden hover:border-blue-500 transition-all hover:shadow-lg hover:shadow-blue-500/20"
                    data-testid={`card-nft-${nft.id}`}
                  >
                    <div className="relative aspect-square overflow-hidden">
                      <img
                        src={nft.image}
                        alt={nft.name}
                        className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                      />
                      <Badge className="absolute top-3 right-3 bg-blue-600">
                        For Sale
                      </Badge>
                    </div>
                    
                    <div className="p-4 space-y-3">
                      <div>
                        <h3 className="font-semibold text-lg mb-1" data-testid={`text-nft-name-${nft.id}`}>
                          {nft.name}
                        </h3>
                        <p className="text-sm text-gray-400" data-testid={`text-nft-description-${nft.id}`}>
                          {nft.description}
                        </p>
                      </div>
                      
                      <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                        <div>
                          <p className="text-xs text-gray-400">Price</p>
                          <p className="text-lg font-bold text-blue-400" data-testid={`text-nft-price-${nft.id}`}>
                            {nft.price}
                          </p>
                        </div>
                        
                        <Button
                          className="bg-blue-600 hover:bg-blue-700"
                          data-testid={`button-buy-nft-${nft.id}`}
                        >
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          Buy Now
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Sell NFT Section */}
          {activeTab === "sell" && (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
              <DollarSign className="h-20 w-20 text-gray-600 mb-4" />
              <h3 className="text-2xl font-semibold mb-2" data-testid="heading-sell-coming-soon">
                Sell Your NFTs
              </h3>
              <p className="text-gray-400 text-center max-w-md" data-testid="text-sell-description">
                List your owned NFTs for sale in the Gamefolio marketplace. This feature is coming soon!
              </p>
              <Button className="mt-6" variant="outline" data-testid="button-view-inventory">
                View Your Inventory
              </Button>
            </div>
          )}

          {/* Mint NFT Section */}
          {activeTab === "mint" && (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
              <Sparkles className="h-20 w-20 text-gray-600 mb-4" />
              <h3 className="text-2xl font-semibold mb-2" data-testid="heading-mint-coming-soon">
                Mint Your Own NFT
              </h3>
              <p className="text-gray-400 text-center max-w-md" data-testid="text-mint-description">
                Create and mint custom NFT avatars for your profile. Upload your gaming clips or artwork to mint as NFTs!
              </p>
              <Button className="mt-6" variant="outline" data-testid="button-start-minting">
                Start Minting
              </Button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
