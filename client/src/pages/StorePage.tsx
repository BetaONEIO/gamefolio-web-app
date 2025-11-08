import { useAuth } from "@/hooks/use-auth";
import { useCrossmint } from "@/hooks/use-crossmint";
import { Link } from "wouter";
import { ShoppingCart, DollarSign, Sparkles, Wallet, Menu, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NFTPurchaseDialog } from "@/components/store/NFTPurchaseDialog";
import gfTokenLogo from "@assets/Gamefolio token_1762633908726.png";

type TabType = "buy" | "sell" | "mint";

interface NFT {
  id: number;
  name: string;
  image: string;
  price: number;
  priceUSD: number;
  description: string;
  forSale: boolean;
  rarity: string;
  currentBid: number;
  owner: string;
}

export default function StorePage() {
  const { user } = useAuth();
  const { wallet } = useCrossmint();
  const [activeTab, setActiveTab] = useState<TabType>("buy");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [rarityFilter, setRarityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [priceFilter, setPriceFilter] = useState<string>("all");
  const [mintFilter, setMintFilter] = useState<string>("all");
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);

  // Mock Gamefolio NFT Collection data
  const gamefolioNFTs = [
    {
      id: 1,
      name: "Gamer Avatar #001",
      image: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop",
      price: 250,
      priceUSD: 12.50,
      description: "Epic gaming avatar with RGB effects",
      forSale: true,
      rarity: "epic",
      currentBid: 220,
      owner: "GameMaster",
    },
    {
      id: 2,
      name: "Gamer Avatar #002",
      image: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=400&h=400&fit=crop",
      price: 500,
      priceUSD: 25.00,
      description: "Legendary warrior profile picture",
      forSale: true,
      rarity: "legendary",
      currentBid: 450,
      owner: "WarriorKing",
    },
    {
      id: 3,
      name: "Gamer Avatar #003",
      image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop",
      price: 350,
      priceUSD: 17.50,
      description: "Futuristic cyber gamer avatar",
      forSale: true,
      rarity: "rare",
      currentBid: 320,
      owner: "CyberNinja",
    },
    {
      id: 4,
      name: "Gamer Avatar #004",
      image: "https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400&h=400&fit=crop",
      price: 400,
      priceUSD: 20.00,
      description: "Pro esports champion avatar",
      forSale: true,
      rarity: "epic",
      currentBid: 375,
      owner: "ProGamer",
    },
    {
      id: 5,
      name: "Gamer Avatar #005",
      image: "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=400&h=400&fit=crop",
      price: 600,
      priceUSD: 30.00,
      description: "Mystical mage gaming portrait",
      forSale: true,
      rarity: "legendary",
      currentBid: 550,
      owner: "MysticMage",
    },
    {
      id: 6,
      name: "Gamer Avatar #006",
      image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop",
      price: 180,
      priceUSD: 9.00,
      description: "Cyberpunk warrior avatar",
      forSale: true,
      rarity: "common",
      currentBid: 160,
      owner: "PunkWarrior",
    },
  ];

  const gfBalance = user?.gfTokenBalance || 0;

  const handleBuyNFT = (nft: NFT) => {
    setSelectedNFT(nft);
    setPurchaseDialogOpen(true);
  };

  const SidebarContent = () => (
    <div className="space-y-2">
      <h2 className="text-2xl font-bold mb-6 text-white" data-testid="text-store-title">
        Store
      </h2>
      
      <Button
        variant={activeTab === "buy" ? "default" : "ghost"}
        className={`w-full justify-start gap-3 ${
          activeTab === "buy" 
            ? "bg-blue-600 hover:bg-blue-700" 
            : "hover:bg-gray-800"
        }`}
        onClick={() => {
          setActiveTab("buy");
          setMobileMenuOpen(false);
        }}
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
        onClick={() => {
          setActiveTab("sell");
          setMobileMenuOpen(false);
        }}
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
        onClick={() => {
          setActiveTab("mint");
          setMobileMenuOpen(false);
        }}
        data-testid="button-tab-mint"
      >
        <Sparkles className="h-5 w-5" />
        Mint NFT
      </Button>

      <div className="mt-8 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
        <div className="flex items-center gap-2 mb-2">
          <img src={gfTokenLogo} alt="GF Token" className="w-5 h-5" />
          <span className="text-sm text-gray-400">GF Balance</span>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-xl font-bold" data-testid="text-gf-balance">{gfBalance.toLocaleString()}</p>
          <span className="text-sm text-gray-400">GF</span>
        </div>
        <p className="text-xs text-gray-500 mt-1" data-testid="text-gf-balance-usd">
          ≈ ${(gfBalance * 0.05).toFixed(2)} USD
        </p>
        {!wallet?.address && (
          <Link href="/wallet">
            <Button size="sm" variant="outline" className="w-full mt-3" data-testid="button-create-wallet">
              Create Wallet
            </Button>
          </Link>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      <div className="flex flex-col md:flex-row">
        {/* Desktop Sidebar */}
        <aside className="hidden md:block w-64 min-h-screen bg-gray-900/50 backdrop-blur-sm border-r border-gray-800 p-6">
          <SidebarContent />
        </aside>

        {/* Mobile Header with Dropdown Menu */}
        <div className="md:hidden sticky top-0 z-40 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800">
          <Collapsible open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">
                  Store
                </h2>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8" data-testid="avatar-user-mobile">
                      <AvatarImage src={user?.avatarUrl || undefined} />
                      <AvatarFallback className="bg-gray-800">
                        {user?.username?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-gray-300" data-testid="text-username-mobile">
                      {user?.username || "Guest"}
                    </span>
                  </div>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="icon" data-testid="button-mobile-menu">
                      <Menu className="h-6 w-6" />
                    </Button>
                  </CollapsibleTrigger>
                </div>
              </div>
              
              {/* Mobile Tab Indicator */}
              <div className="mt-3 flex items-center gap-2 text-sm text-gray-400">
                <span>Current:</span>
                <span className="text-blue-400 font-semibold">
                  {activeTab === "buy" && "Buy NFT"}
                  {activeTab === "sell" && "Sell NFT"}
                  {activeTab === "mint" && "Mint NFT"}
                </span>
              </div>
            </div>

            <CollapsibleContent className="border-t border-gray-800">
              <div className="p-4 space-y-2">
                <Button
                  variant={activeTab === "buy" ? "default" : "ghost"}
                  className={`w-full justify-start gap-3 ${
                    activeTab === "buy" 
                      ? "bg-blue-600 hover:bg-blue-700" 
                      : "hover:bg-gray-800"
                  }`}
                  onClick={() => {
                    setActiveTab("buy");
                    setMobileMenuOpen(false);
                  }}
                  data-testid="button-tab-buy-mobile"
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
                  onClick={() => {
                    setActiveTab("sell");
                    setMobileMenuOpen(false);
                  }}
                  data-testid="button-tab-sell-mobile"
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
                  onClick={() => {
                    setActiveTab("mint");
                    setMobileMenuOpen(false);
                  }}
                  data-testid="button-tab-mint-mobile"
                >
                  <Sparkles className="h-5 w-5" />
                  Mint NFT
                </Button>

                <div className="mt-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    <img src={gfTokenLogo} alt="GF Token" className="w-5 h-5" />
                    <span className="text-sm text-gray-400">GF Balance</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-xl font-bold" data-testid="text-gf-balance-mobile">{gfBalance.toLocaleString()}</p>
                    <span className="text-sm text-gray-400">GF</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1" data-testid="text-gf-balance-usd-mobile">
                    ≈ ${(gfBalance * 0.05).toFixed(2)} USD
                  </p>
                  {!wallet?.address && (
                    <Link href="/wallet">
                      <Button size="sm" variant="outline" className="w-full mt-3" data-testid="button-create-wallet-mobile">
                        Create Wallet
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-8">
          {/* Header */}
          <div className="mb-6 md:mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-sm md:text-base text-gray-400" data-testid="text-section-description">
                  {activeTab === "buy" && "Browse and purchase exclusive Gamefolio NFT avatars for your profile"}
                  {activeTab === "sell" && "List your NFTs for sale in the Gamefolio marketplace"}
                  {activeTab === "mint" && "Create and mint your own custom NFT avatars"}
                </p>
              </div>
              
              <div className="hidden md:flex items-center gap-3">
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
              <div className="mb-4 md:mb-6">
                <h2 className="text-lg md:text-xl font-semibold mb-4" data-testid="heading-collection">
                  Gamefolio Collection
                </h2>

                {/* Category Filters */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Rarity</label>
                    <Select value={rarityFilter} onValueChange={setRarityFilter}>
                      <SelectTrigger className="bg-gray-800 border-gray-700" data-testid="select-rarity">
                        <SelectValue placeholder="All Rarities" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        <SelectItem value="all">All Rarities</SelectItem>
                        <SelectItem value="common">Common</SelectItem>
                        <SelectItem value="rare">Rare</SelectItem>
                        <SelectItem value="epic">Epic</SelectItem>
                        <SelectItem value="legendary">Legendary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Type</label>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="bg-gray-800 border-gray-700" data-testid="select-type">
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="badge">Badge</SelectItem>
                        <SelectItem value="collectible">Collectible</SelectItem>
                        <SelectItem value="skin">Skin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Price</label>
                    <Select value={priceFilter} onValueChange={setPriceFilter}>
                      <SelectTrigger className="bg-gray-800 border-gray-700" data-testid="select-price">
                        <SelectValue placeholder="All Prices" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        <SelectItem value="all">All Prices</SelectItem>
                        <SelectItem value="low">Low to High</SelectItem>
                        <SelectItem value="high">High to Low</SelectItem>
                        <SelectItem value="under-0.05">Under 0.05 ETH</SelectItem>
                        <SelectItem value="0.05-0.1">0.05 - 0.1 ETH</SelectItem>
                        <SelectItem value="over-0.1">Over 0.1 ETH</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Mint Number</label>
                    <Select value={mintFilter} onValueChange={setMintFilter}>
                      <SelectTrigger className="bg-gray-800 border-gray-700" data-testid="select-mint">
                        <SelectValue placeholder="All Numbers" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        <SelectItem value="all">All Numbers</SelectItem>
                        <SelectItem value="1-100">1 - 100</SelectItem>
                        <SelectItem value="101-500">101 - 500</SelectItem>
                        <SelectItem value="501-1000">501 - 1000</SelectItem>
                        <SelectItem value="1000+">1000+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
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
                      <Badge className="absolute top-2 right-2 bg-blue-600 text-xs">
                        For Sale
                      </Badge>
                    </div>
                    
                    <div className="p-3 space-y-2">
                      <div>
                        <h3 className="font-semibold text-sm md:text-base mb-1 line-clamp-1" data-testid={`text-nft-name-${nft.id}`}>
                          {nft.name}
                        </h3>
                        <p className="text-xs text-gray-400 line-clamp-2" data-testid={`text-nft-description-${nft.id}`}>
                          {nft.description}
                        </p>
                      </div>
                      
                      <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                        <div>
                          <p className="text-xs text-gray-400">Price</p>
                          <div className="flex items-center gap-1">
                            <img src={gfTokenLogo} alt="GF Token" className="w-4 h-4" />
                            <p className="text-sm md:text-base font-bold text-blue-400" data-testid={`text-nft-price-${nft.id}`}>
                              {nft.price} GF
                            </p>
                          </div>
                          <p className="text-xs text-gray-500" data-testid={`text-nft-price-usd-${nft.id}`}>
                            ≈ ${nft.priceUSD}
                          </p>
                        </div>
                        
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-xs"
                          onClick={() => handleBuyNFT(nft)}
                          data-testid={`button-buy-nft-${nft.id}`}
                        >
                          <ShoppingCart className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                          Buy
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
            <div className="flex flex-col items-center justify-center min-h-[50vh] md:min-h-[60vh] px-4">
              <DollarSign className="h-16 w-16 md:h-20 md:w-20 text-gray-600 mb-4" />
              <h3 className="text-xl md:text-2xl font-semibold mb-2 text-center" data-testid="heading-sell-coming-soon">
                Sell Your NFTs
              </h3>
              <p className="text-sm md:text-base text-gray-400 text-center max-w-md" data-testid="text-sell-description">
                List your owned NFTs for sale in the Gamefolio marketplace. This feature is coming soon!
              </p>
              <Button className="mt-6" variant="outline" size="sm" data-testid="button-view-inventory">
                View Your Inventory
              </Button>
            </div>
          )}

          {/* Mint NFT Section */}
          {activeTab === "mint" && (
            <div className="flex flex-col items-center justify-center min-h-[50vh] md:min-h-[60vh] px-4">
              <Sparkles className="h-16 w-16 md:h-20 md:w-20 text-gray-600 mb-4" />
              <h3 className="text-xl md:text-2xl font-semibold mb-2 text-center" data-testid="heading-mint-coming-soon">
                Mint Your Own NFT
              </h3>
              <p className="text-sm md:text-base text-gray-400 text-center max-w-md" data-testid="text-mint-description">
                Create and mint custom NFT avatars for your profile. Upload your gaming clips or artwork to mint as NFTs!
              </p>
              <Button className="mt-6" variant="outline" size="sm" data-testid="button-start-minting">
                Start Minting
              </Button>
            </div>
          )}
        </main>
      </div>

      {/* NFT Purchase Dialog */}
      <NFTPurchaseDialog
        nft={selectedNFT}
        open={purchaseDialogOpen}
        onOpenChange={setPurchaseDialogOpen}
        onPurchaseComplete={() => {
          // Refresh user data or show success message
        }}
      />
    </div>
  );
}
