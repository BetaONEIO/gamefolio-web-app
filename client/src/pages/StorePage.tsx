import { useAuth } from "@/hooks/use-auth";
import { useCrossmint } from "@/hooks/use-crossmint";
import { Link } from "wouter";
import { ShoppingCart, DollarSign, Sparkles, Wallet, Menu, Filter, Heart, Loader2, CheckCircle, Trash2 } from "lucide-react";
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
import { useAccount, useWalletClient, usePublicClient, useChainId } from "wagmi";
import { useOpenConnectModal } from "@0xsequence/connect";
import { parseUnits, type Address } from "viem";
import { GF_TOKEN_ADDRESS, GF_TOKEN_ABI, SKALE_NEBULA_TESTNET } from "@shared/contracts";
import nft1 from "@assets/1_1762777399632.png";
import nft2 from "@assets/2_1762777399661.png";
import nft3 from "@assets/3_1762777399661.png";
import nft4 from "@assets/4_1762777399662.png";
import nft5 from "@assets/5_1762777399662.png";
import nft6 from "@assets/6_1762777399663.png";
import nft7 from "@assets/7_1762777399663.png";
import nft8 from "@assets/8_1762777399663.png";
import nft9 from "@assets/9_1762777399664.png";
import nft10 from "@assets/10_1762777399664.png";
import nft11 from "@assets/11_1762777399665.png";
import nft12 from "@assets/12_1762777399665.png";
import nft13 from "@assets/13_1762777399665.png";
import nft14 from "@assets/14_1762777399666.png";
import nft15 from "@assets/15_1762777399666.png";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type TabType = "buy" | "sell" | "mint" | "watchlist";

interface StoreItem {
  id: number;
  name: string;
  description: string | null;
  image: string | null;
  gfCost: number;
  category: string;
  rarity: string | null;
  available: boolean;
}

interface OwnedItem extends StoreItem {
  purchaseId: string;
  purchasedAt: string;
  txHash: string | null;
}

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

const GF_DECIMALS = 18;
const SKALE_CHAIN_ID = SKALE_NEBULA_TESTNET.id;

export default function StorePage() {
  const { user } = useAuth();
  const { wallet } = useCrossmint();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>("buy");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [rarityFilter, setRarityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [priceFilter, setPriceFilter] = useState<string>("all");
  const [mintFilter, setMintFilter] = useState<string>("all");
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [purchasingItemId, setPurchasingItemId] = useState<number | null>(null);

  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const chainId = useChainId();
  const { setOpenConnectModal } = useOpenConnectModal();

  const { data: storeItems = [], isLoading: isLoadingItems } = useQuery<StoreItem[]>({
    queryKey: ["/api/store/items"],
    queryFn: async () => {
      const response = await fetch('/api/store/items', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch store items');
      }
      return response.json();
    },
  });

  const { data: ownedItems = [], refetch: refetchOwned } = useQuery<OwnedItem[]>({
    queryKey: ["/api/store/owned"],
    queryFn: async () => {
      const response = await fetch('/api/store/owned', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch owned items');
      }
      return response.json();
    },
    enabled: !!user,
  });

  const ownedItemIds = new Set(ownedItems.map(item => item.id));

  const handlePurchaseWithGF = async (item: StoreItem) => {
    if (!user) {
      toast({ title: "Login required", description: "Please log in to purchase items", variant: "destructive" });
      return;
    }

    if (!isConnected || !walletClient || !publicClient) {
      toast({ title: "Wallet not connected", description: "Please connect your wallet first", variant: "destructive" });
      setOpenConnectModal(true);
      return;
    }

    if (chainId !== SKALE_CHAIN_ID) {
      toast({ title: "Wrong network", description: "Please switch to SKALE Nebula Testnet", variant: "destructive" });
      return;
    }

    if (ownedItemIds.has(item.id)) {
      toast({ title: "Already owned", description: "You already own this item", variant: "destructive" });
      return;
    }

    setPurchasingItemId(item.id);

    try {
      const intentRes = await fetch("/api/store/purchase-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ itemId: item.id }),
      });

      if (!intentRes.ok) {
        const error = await intentRes.json();
        throw new Error(error.error || "Failed to create purchase intent");
      }

      const { purchaseId, gfCost, treasuryAddress } = await intentRes.json();

      toast({ title: "Confirm transaction", description: `Sending ${gfCost} GF tokens...` });

      const amountRaw = parseUnits(String(gfCost), GF_DECIMALS);

      const txHash = await walletClient.writeContract({
        address: GF_TOKEN_ADDRESS,
        abi: GF_TOKEN_ABI,
        functionName: "transfer",
        args: [treasuryAddress as Address, amountRaw],
      });

      toast({ title: "Verifying purchase...", description: "Please wait while we confirm your transaction" });

      await publicClient.waitForTransactionReceipt({ hash: txHash, confirmations: 1 });

      const verifyRes = await fetch("/api/store/verify-purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ purchaseId, txHash }),
      });

      if (!verifyRes.ok) {
        throw new Error("Failed to verify purchase");
      }

      toast({ title: "Item unlocked!", description: `You now own ${item.name}` });
      refetchOwned();
      queryClient.invalidateQueries({ queryKey: ["/api/store/owned"] });

    } catch (error: any) {
      let description = error.message || "Transaction failed";
      if (error.message?.includes("user rejected") || error.message?.includes("User rejected")) {
        description = "Transaction was cancelled";
      } else if (error.message?.includes("insufficient")) {
        description = "Insufficient GF token balance";
      }
      toast({ title: "Purchase failed", description, variant: "destructive" });
    } finally {
      setPurchasingItemId(null);
    }
  };

  // Fetch user's watchlist
  const { data: watchlist = [] } = useQuery<any[]>({
    queryKey: ["/api/nft/watchlist"],
    queryFn: async () => {
      const response = await fetch('/api/nft/watchlist', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch watchlist');
      }
      return response.json();
    },
    enabled: !!user,
  });

  // Add to watchlist mutation
  const addToWatchlistMutation = useMutation({
    mutationFn: async (nft: NFT) => {
      return await apiRequest("POST", "/api/nft/watchlist", {
        nftId: nft.id,
        nftName: nft.name,
        nftImage: nft.image,
        nftPrice: nft.price,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nft/watchlist"] });
      toast({
        title: "Added to Watchlist",
        description: "NFT has been added to your watchlist",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to add to watchlist",
        variant: "destructive",
      });
    },
  });

  // Remove from watchlist mutation
  const removeFromWatchlistMutation = useMutation({
    mutationFn: async (nftId: number) => {
      return await apiRequest("DELETE", `/api/nft/watchlist/${nftId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nft/watchlist"] });
      toast({
        title: "Removed from Watchlist",
        description: "NFT has been removed from your watchlist",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove from watchlist",
        variant: "destructive",
      });
    },
  });

  // Check if NFT is in watchlist
  const isInWatchlist = (nftId: number) => {
    return watchlist.some((item: any) => item.nftId === nftId);
  };

  // Toggle watchlist
  const toggleWatchlist = (nft: NFT) => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to add NFTs to your watchlist",
        variant: "destructive",
      });
      return;
    }

    if (isInWatchlist(nft.id)) {
      removeFromWatchlistMutation.mutate(nft.id);
    } else {
      addToWatchlistMutation.mutate(nft);
    }
  };

  // Gamefolio NFT Collection data with exclusive character avatars
  const gamefolioNFTs = [
    {
      id: 1,
      name: "Cyber Pilot #001",
      image: nft1,
      price: 250,
      priceUSD: 12.50,
      description: "Elite cyber pilot with advanced tech helmet and signature yellow jacket",
      forSale: true,
      rarity: "epic",
      currentBid: 220,
      owner: "GameMaster",
    },
    {
      id: 2,
      name: "Divine Guardian #002",
      image: nft2,
      price: 800,
      priceUSD: 40.00,
      description: "Blessed guardian with golden halo and pure spirit",
      forSale: true,
      rarity: "legendary",
      currentBid: 750,
      owner: "AngelicWarrior",
    },
    {
      id: 3,
      name: "Street Samurai #003",
      image: nft3,
      price: 550,
      priceUSD: 27.50,
      description: "Tattooed warrior with deadly precision and street style",
      forSale: true,
      rarity: "legendary",
      currentBid: 500,
      owner: "BladeMaster",
    },
    {
      id: 4,
      name: "Urban Rogue #004",
      image: nft4,
      price: 350,
      priceUSD: 17.50,
      description: "Mysterious rogue with ice-blue shades and urban aesthetic",
      forSale: true,
      rarity: "rare",
      currentBid: 320,
      owner: "ShadowRunner",
    },
    {
      id: 5,
      name: "Matrix Assassin #005",
      image: nft5,
      price: 700,
      priceUSD: 35.00,
      description: "Digital assassin mastering the code matrix",
      forSale: true,
      rarity: "legendary",
      currentBid: 650,
      owner: "CodeBreaker",
    },
    {
      id: 6,
      name: "Golden Warrior #006",
      image: nft6,
      price: 600,
      priceUSD: 30.00,
      description: "Legendary warrior wielding the sacred blade of light",
      forSale: true,
      rarity: "legendary",
      currentBid: 550,
      owner: "KnightCommander",
    },
    {
      id: 7,
      name: "Cyber Ronin #007",
      image: nft7,
      price: 650,
      priceUSD: 32.50,
      description: "Futuristic ronin with laser-edge katana",
      forSale: true,
      rarity: "legendary",
      currentBid: 600,
      owner: "DigitalSamurai",
    },
    {
      id: 8,
      name: "Desert Wanderer #008",
      image: nft8,
      price: 400,
      priceUSD: 20.00,
      description: "Nomadic survivor with crystalline blade",
      forSale: true,
      rarity: "epic",
      currentBid: 375,
      owner: "SandStrider",
    },
    {
      id: 9,
      name: "Space Mercenary #009",
      image: nft9,
      price: 500,
      priceUSD: 25.00,
      description: "Battle-hardened merc from the outer rim",
      forSale: true,
      rarity: "epic",
      currentBid: 450,
      owner: "StarHunter",
    },
    {
      id: 10,
      name: "Crystal Knight #010",
      image: nft10,
      price: 750,
      priceUSD: 37.50,
      description: "Cosmic knight wielding the ethereal crystal blade",
      forSale: true,
      rarity: "legendary",
      currentBid: 700,
      owner: "GalacticGuardian",
    },
    {
      id: 11,
      name: "Retro Explorer #011",
      image: nft11,
      price: 300,
      priceUSD: 15.00,
      description: "Classic adventurer with 3D vision and frontier spirit",
      forSale: true,
      rarity: "rare",
      currentBid: 275,
      owner: "VintageHero",
    },
    {
      id: 12,
      name: "Eastern Mystic #012",
      image: nft12,
      price: 450,
      priceUSD: 22.50,
      description: "Wise wanderer from the ancient lands",
      forSale: true,
      rarity: "epic",
      currentBid: 425,
      owner: "ZenMaster",
    },
    {
      id: 13,
      name: "Digital Miner #013",
      image: nft13,
      price: 350,
      priceUSD: 17.50,
      description: "VR-enabled miner extracting digital resources",
      forSale: true,
      rarity: "rare",
      currentBid: 320,
      owner: "CryptoDigger",
    },
    {
      id: 14,
      name: "Tech Operative #014",
      image: nft14,
      price: 420,
      priceUSD: 21.00,
      description: "Tactical agent with next-gen plasma weaponry",
      forSale: true,
      rarity: "epic",
      currentBid: 390,
      owner: "AgentX",
    },
    {
      id: 15,
      name: "Royal Outlaw #015",
      image: nft15,
      price: 900,
      priceUSD: 45.00,
      description: "Crowned rebel leading the resistance with style",
      forSale: true,
      rarity: "legendary",
      currentBid: 850,
      owner: "RogueKing",
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

      <div className="my-4 border-t border-gray-700" />

      <Button
        variant={activeTab === "watchlist" ? "default" : "ghost"}
        className={`w-full justify-start gap-3 ${
          activeTab === "watchlist" 
            ? "bg-red-600 hover:bg-red-700" 
            : "hover:bg-gray-800"
        }`}
        onClick={() => {
          setActiveTab("watchlist");
          setMobileMenuOpen(false);
        }}
        data-testid="button-watchlist"
      >
        <Heart className="h-5 w-5" />
        My Watchlist
        {watchlist.length > 0 && (
          <Badge variant="secondary" className="ml-auto">
            {watchlist.length}
          </Badge>
        )}
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
        <aside className="hidden md:block w-64 min-h-screen bg-gray-900/50 backdrop-blur-sm border-r border-gray-800 p-4">
          <SidebarContent />
        </aside>

        {/* Mobile Header */}
        <div className="md:hidden sticky top-0 z-40 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800">
          <Collapsible open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <div className="p-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">
                STORE
              </h2>
              <div className="flex items-center gap-2 bg-gray-800/80 rounded-xl px-3 py-2">
                <img src={gfTokenLogo} alt="GF" className="w-5 h-5" />
                <span className="text-sm font-bold text-white">{user?.gfTokenBalance || 0}</span>
                <span className="text-xs text-gray-400">GF</span>
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

                <div className="my-4 border-t border-gray-700" />

                <Button
                  variant={activeTab === "watchlist" ? "default" : "ghost"}
                  className={`w-full justify-start gap-3 ${
                    activeTab === "watchlist" 
                      ? "bg-red-600 hover:bg-red-700" 
                      : "hover:bg-gray-800"
                  }`}
                  onClick={() => {
                    setActiveTab("watchlist");
                    setMobileMenuOpen(false);
                  }}
                  data-testid="button-watchlist-mobile"
                >
                  <Heart className="h-5 w-5" />
                  My Watchlist
                  {watchlist.length > 0 && (
                    <Badge variant="secondary" className="ml-auto">
                      {watchlist.length}
                    </Badge>
                  )}
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
        <main className="flex-1 p-4 md:p-6">
          {/* Mobile Tab Navigation */}
          <div 
            className="md:hidden flex gap-2 overflow-x-auto mb-4 hide-scrollbar"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>
            <button
              onClick={() => setActiveTab("buy")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
                activeTab === "buy"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800/50 text-gray-400 hover:bg-gray-800"
              }`}
              data-testid="tab-buy-mobile"
            >
              <ShoppingCart className="h-4 w-4" />
              Buy NFT
            </button>
            <button
              onClick={() => setActiveTab("sell")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
                activeTab === "sell"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800/50 text-gray-400 hover:bg-gray-800"
              }`}
              data-testid="tab-sell-mobile"
            >
              <DollarSign className="h-4 w-4" />
              Sell NFT
            </button>
            <button
              onClick={() => setActiveTab("mint")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
                activeTab === "mint"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800/50 text-gray-400 hover:bg-gray-800"
              }`}
              data-testid="tab-mint-mobile"
            >
              <Sparkles className="h-4 w-4" />
              Mint NFT
            </button>
            <button
              onClick={() => setActiveTab("watchlist")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
                activeTab === "watchlist"
                  ? "bg-red-600 text-white"
                  : "bg-gray-800/50 text-gray-400 hover:bg-gray-800"
              }`}
              data-testid="tab-watchlist-mobile"
            >
              <Heart className="h-4 w-4" />
              Watchlist
            </button>
          </div>

          {/* Header */}
          <div className="mb-4 md:mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-sm md:text-base text-gray-400" data-testid="text-section-description">
                  {activeTab === "buy" && "Browse and purchase exclusive Gamefolio NFT avatars for your profile"}
                  {activeTab === "sell" && "List your NFTs for sale in the Gamefolio marketplace"}
                  {activeTab === "mint" && "Create and mint your own custom NFT avatars"}
                  {activeTab === "watchlist" && "Your saved NFTs - track prices and never miss out on favorites"}
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

              {/* NFT Collection Grid */}
              <h3 className="text-base font-semibold text-gray-300 mb-3">NFT Avatars</h3>
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 mb-8">
                {gamefolioNFTs.map((nft) => (
                  <Card
                    key={nft.id}
                    className="bg-gray-800/50 border-gray-700 overflow-hidden transition-all hover:shadow-lg hover:border-[#4ade80] hover:shadow-[#4ade80]/20 cursor-pointer"
                    onClick={() => handleBuyNFT(nft)}
                  >
                    <div className="relative aspect-[3/4] overflow-hidden">
                      <img
                        src={nft.image}
                        alt={nft.name}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWatchlist(nft);
                        }}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
                      >
                        {watchlist?.some((w: any) => w.nftId === nft.id) ? (
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="url(#heartGradient)" stroke="none">
                            <defs>
                              <linearGradient id="heartGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#4ade80" />
                                <stop offset="100%" stopColor="#22c55e" />
                              </linearGradient>
                            </defs>
                            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                          </svg>
                        ) : (
                          <Heart className="h-4 w-4 text-white" />
                        )}
                      </button>
                    </div>
                    
                    <div className="p-2 space-y-1.5">
                      <div>
                        <h3 className="font-semibold text-xs line-clamp-1">{nft.name}</h3>
                        <p className="text-[10px] text-gray-400">by {nft.owner}</p>
                        <Badge className={`mt-1 text-[10px] px-1.5 py-0.5 text-white capitalize ${
                          nft.rarity === "legendary" ? "bg-gradient-to-r from-yellow-500 to-amber-600" :
                          nft.rarity === "epic" ? "bg-gradient-to-r from-purple-500 to-pink-600" :
                          nft.rarity === "rare" ? "bg-gradient-to-r from-blue-500 to-cyan-600" : "bg-gray-600"
                        }`}>
                          {nft.rarity}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between pt-1.5 border-t border-gray-700">
                        <div>
                          <p className="text-[9px] text-gray-500">Price</p>
                          <div className="flex items-center gap-0.5">
                            <img src={gfTokenLogo} alt="GF" className="w-3 h-3" />
                            <span className="text-xs font-bold text-[#4ade80]">{nft.price}</span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          className="bg-gradient-to-r from-[#4ade80] to-[#22c55e] hover:from-[#22c55e] hover:to-[#16a34a] text-white text-[10px] h-6 px-2"
                        >
                          <ShoppingCart className="h-2.5 w-2.5 mr-0.5" />
                          Buy
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Store Items */}
              <h3 className="text-base font-semibold text-gray-300 mb-3">Digital Items</h3>
              {isLoadingItems ? (
                <div className="col-span-full flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                {storeItems.map((item) => {
                  const isOwned = ownedItemIds.has(item.id);
                  const isPurchasing = purchasingItemId === item.id;
                  
                  return (
                  <Card
                    key={item.id}
                    className={`bg-gray-800/50 border-gray-700 overflow-hidden transition-all hover:shadow-lg ${isOwned ? "border-green-500 hover:border-green-400 hover:shadow-green-500/20" : "hover:border-blue-500 hover:shadow-blue-500/20"}`}
                    data-testid={`card-item-${item.id}`}
                  >
                    <div 
                      className="relative aspect-square overflow-hidden"
                      data-testid={`img-item-${item.id}`}
                    >
                      <img
                        src={item.image || gfTokenLogo}
                        alt={item.name}
                        className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                      />
                      {isOwned ? (
                        <Badge className="absolute top-2 right-2 bg-green-600 text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Unlocked
                        </Badge>
                      ) : (
                        <Badge className="absolute top-2 right-2 bg-blue-600 text-xs">
                          For Sale
                        </Badge>
                      )}
                    </div>
                    
                    <div className="p-2 space-y-1.5">
                      <div>
                        <h3 className="font-semibold text-xs mb-0.5 line-clamp-1" data-testid={`text-item-name-${item.id}`}>
                          {item.name}
                        </h3>
                        <p className="text-[10px] text-gray-400 line-clamp-2" data-testid={`text-item-description-${item.id}`}>
                          {item.description}
                        </p>
                        {item.rarity && (
                          <Badge className={`mt-1 text-[10px] px-1.5 py-0.5 text-white capitalize ${
                            item.rarity === "legendary" ? "bg-gradient-to-r from-yellow-500 to-amber-600" :
                            item.rarity === "epic" ? "bg-gradient-to-r from-purple-500 to-pink-600" :
                            item.rarity === "rare" ? "bg-gradient-to-r from-blue-500 to-cyan-600" : "bg-gray-600"
                          }`}>
                            {item.rarity}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between pt-1.5 border-t border-gray-700">
                        <div>
                          <p className="text-[9px] text-gray-500">Price</p>
                          <div className="flex items-center gap-0.5">
                            <img src={gfTokenLogo} alt="GF Token" className="w-3 h-3" />
                            <p className="text-xs font-bold text-blue-400" data-testid={`text-item-price-${item.id}`}>
                              {item.gfCost} GF
                            </p>
                          </div>
                        </div>
                        
                        {isOwned ? (
                          <Button
                            size="sm"
                            className="bg-gradient-to-r from-green-500 to-emerald-600 text-white text-[10px] h-6 px-2 cursor-default"
                            disabled
                          >
                            <CheckCircle className="h-2.5 w-2.5 mr-0.5" />
                            Owned
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            className="bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white text-[10px] h-6 px-2"
                            onClick={() => handlePurchaseWithGF(item)}
                            disabled={isPurchasing}
                            data-testid={`button-buy-item-${item.id}`}
                          >
                            {isPurchasing ? (
                              <>
                                <Loader2 className="h-2.5 w-2.5 mr-0.5 animate-spin" />
                                Buying...
                              </>
                            ) : (
                              <>
                                <ShoppingCart className="h-2.5 w-2.5 mr-0.5" />
                                Buy
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );})}
              </div>
              )}
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

          {/* Mint NFT Section - Redirects to dedicated page */}
          {activeTab === "mint" && (
            <div className="flex flex-col items-center justify-center min-h-[50vh] md:min-h-[60vh] px-4">
              <Sparkles className="h-16 w-16 md:h-20 md:w-20 text-[#4ade80] mb-4" />
              <h3 className="text-xl md:text-2xl font-semibold mb-2 text-center" data-testid="heading-mint-coming-soon">
                Mint Your Own NFT
              </h3>
              <p className="text-sm md:text-base text-gray-400 text-center max-w-md" data-testid="text-mint-description">
                Create and mint custom NFT avatars for your profile. Upload your gaming clips or artwork to mint as NFTs!
              </p>
              <Link href="/mint-nft">
                <Button className="mt-6 bg-[#4ade80] hover:bg-[#22c55e] text-[#022c22]" size="sm" data-testid="button-start-minting">
                  Start Minting
                </Button>
              </Link>
            </div>
          )}

          {/* Watchlist Section */}
          {activeTab === "watchlist" && (
            <div>
              {!user ? (
                <div className="flex flex-col items-center justify-center min-h-[50vh] md:min-h-[60vh] px-4">
                  <Heart className="h-16 w-16 md:h-20 md:w-20 text-gray-600 mb-4" />
                  <h3 className="text-xl md:text-2xl font-semibold mb-2 text-center">
                    Login Required
                  </h3>
                  <p className="text-sm md:text-base text-gray-400 text-center max-w-md">
                    Please login to view your NFT watchlist
                  </p>
                  <Link href="/auth">
                    <Button className="mt-6" data-testid="button-login-watchlist">
                      Login
                    </Button>
                  </Link>
                </div>
              ) : watchlist.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[50vh] md:min-h-[60vh] px-4">
                  <Heart className="h-16 w-16 md:h-20 md:w-20 text-gray-600 mb-4" />
                  <h3 className="text-xl md:text-2xl font-semibold mb-2 text-center" data-testid="heading-empty-watchlist">
                    Your Watchlist is Empty
                  </h3>
                  <p className="text-sm md:text-base text-gray-400 text-center max-w-md" data-testid="text-empty-description">
                    Start adding NFTs to your watchlist to track price changes and never miss out on your favorite items.
                  </p>
                  <Button 
                    className="mt-6 bg-blue-600 hover:bg-blue-700" 
                    onClick={() => setActiveTab("buy")}
                    data-testid="button-browse-nfts"
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Browse NFTs
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                  {watchlist.map((item: any) => (
                    <Card
                      key={item.id}
                      className="bg-gray-800/50 border-gray-700 overflow-hidden hover:border-red-500 transition-all hover:shadow-lg hover:shadow-red-500/20"
                      data-testid={`card-watchlist-${item.nftId}`}
                    >
                      <div className="relative aspect-square overflow-hidden">
                        <img
                          src={item.nftImage}
                          alt={item.nftName}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                        <button
                          onClick={() => removeFromWatchlistMutation.mutate(item.nftId)}
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
                          data-testid={`button-remove-${item.nftId}`}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </button>
                        <Badge className="absolute top-2 left-2 bg-red-600 text-xs flex items-center gap-1">
                          <Heart className="h-3 w-3 fill-white" />
                          Saved
                        </Badge>
                      </div>

                      <div className="p-2 space-y-1.5">
                        <div>
                          <h3 className="font-semibold text-xs line-clamp-1" data-testid={`text-nft-name-${item.nftId}`}>
                            {item.nftName}
                          </h3>
                          <p className="text-[10px] text-gray-400">
                            Added {new Date(item.createdAt).toLocaleDateString()}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-1.5 border-t border-gray-700">
                          <div>
                            <p className="text-[9px] text-gray-500">Price</p>
                            <div className="flex items-center gap-0.5">
                              <img src={gfTokenLogo} alt="GF Token" className="w-3 h-3" />
                              <p className="text-xs font-bold text-blue-400" data-testid={`text-price-${item.nftId}`}>
                                {item.nftPrice} GF
                              </p>
                            </div>
                          </div>

                          <Button
                            size="sm"
                            className="bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white text-[10px] h-6 px-2"
                            onClick={() => {
                              const nft: NFT = {
                                id: item.nftId,
                                name: item.nftName,
                                image: item.nftImage,
                                price: item.nftPrice,
                                priceUSD: item.nftPrice * 0.05,
                                description: "",
                                forSale: true,
                                rarity: "Epic",
                                currentBid: item.nftPrice,
                                owner: "Gamefolio",
                              };
                              setSelectedNFT(nft);
                              setPurchaseDialogOpen(true);
                            }}
                            data-testid={`button-buy-${item.nftId}`}
                          >
                            <ShoppingCart className="h-2.5 w-2.5 mr-0.5" />
                            Buy
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
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
