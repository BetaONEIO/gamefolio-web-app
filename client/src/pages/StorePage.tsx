import { useAuthModal } from "@/hooks/use-auth-modal";
import { useAuth } from "@/hooks/use-auth";
import { useCrossmint } from "@/hooks/use-crossmint";
import { Link } from "wouter";
import { ShoppingCart, DollarSign, Sparkles, Wallet, Menu, Filter, Heart, Loader2, CheckCircle, Trash2, Tag, Crown, Lock, Circle } from "lucide-react";
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
import { NameTagDetailDialog } from "@/components/store/NameTagDetailDialog";
import { BorderDetailDialog } from "@/components/store/BorderDetailDialog";
import gfTokenLogo from "@assets/Gamefolio token_1762633908726.png";
import { useAccount, useWalletClient, usePublicClient, useChainId } from "wagmi";
import { useLocation } from "wouter";
import {
  Dialog as WalletDialog,
  DialogContent as WalletDialogContent,
  DialogDescription as WalletDialogDescription,
  DialogFooter as WalletDialogFooter,
  DialogHeader as WalletDialogHeader,
  DialogTitle as WalletDialogTitle,
} from "@/components/ui/dialog";
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
import ProUpgradeDialog from "@/components/ProUpgradeDialog";

const rarityGradients: Record<string, string> = {
  legendary: "from-amber-500 via-yellow-400 to-amber-600",
  epic: "from-purple-500 via-fuchsia-400 to-purple-600",
  rare: "from-green-500 via-emerald-400 to-green-600",
  common: "from-gray-500 via-gray-400 to-gray-500",
};

const rarityBorderColors: Record<string, string> = {
  legendary: "border-amber-400",
  epic: "border-purple-400",
  rare: "border-green-400",
  common: "border-gray-400",
};

function NameTagFallback({ name, rarity }: { name: string; rarity: string }) {
  const gradient = rarityGradients[rarity] || rarityGradients.common;
  return (
    <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${gradient} rounded-lg px-2`}>
      <span className="text-white font-bold text-sm tracking-wide drop-shadow-md text-center leading-tight" style={{ textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>
        {name}
      </span>
    </div>
  );
}

function BorderFallback({ name, rarity }: { name: string; rarity: string }) {
  const borderColor = rarityBorderColors[rarity] || rarityBorderColors.common;
  const gradient = rarityGradients[rarity] || rarityGradients.common;
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className={`w-20 h-20 rounded-full border-4 ${borderColor} bg-gradient-to-br ${gradient} flex items-center justify-center opacity-80`}>
        <div className="w-14 h-14 rounded-full bg-gray-900/80 flex items-center justify-center">
          <Circle className="w-6 h-6 text-gray-400" />
        </div>
      </div>
    </div>
  );
}

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
  priceGBP: number;
  description: string;
  forSale: boolean;
  rarity: string;
  currentBid: number;
  owner: string;
}

const GF_DECIMALS = 18;
const SKALE_CHAIN_ID = SKALE_NEBULA_TESTNET.id;

const nftImageMap: Record<string, string> = {
  "/assets/nft1.png": nft1,
  "/assets/nft2.png": nft2,
  "/assets/nft3.png": nft3,
  "/assets/nft4.png": nft4,
  "/assets/nft5.png": nft5,
  "/assets/nft6.png": nft6,
  "/assets/nft7.png": nft7,
  "/assets/nft8.png": nft8,
  "/assets/nft9.png": nft9,
  "/assets/nft10.png": nft10,
  "/assets/nft11.png": nft11,
  "/assets/nft12.png": nft12,
  "/assets/nft13.png": nft13,
  "/assets/nft14.png": nft14,
  "/assets/nft15.png": nft15,
};

function resolveStoreImage(imagePath: string | null): string {
  if (!imagePath) return gfTokenLogo;
  return nftImageMap[imagePath] || imagePath;
}

function MarketplaceNftImage({ tokenId }: { tokenId: number }) {
  const { data } = useQuery({
    queryKey: ['/api/nft/metadata', tokenId],
    queryFn: async () => {
      const res = await fetch(`/api/nft/metadata/${tokenId}`);
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 300_000,
  });

  if (!data?.image) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-800">
        <Loader2 className="h-8 w-8 text-gray-600 animate-spin" />
      </div>
    );
  }

  return (
    <img
      src={data.image}
      alt={data.name || `Genesis #${tokenId}`}
      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
    />
  );
}

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
  const [accessFilter, setAccessFilter] = useState<string>("all");
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [purchasingItemId, setPurchasingItemId] = useState<number | null>(null);
  const [selectedNameTag, setSelectedNameTag] = useState<any>(null);
  const [nameTagDialogOpen, setNameTagDialogOpen] = useState(false);
  const [selectedBorder, setSelectedBorder] = useState<any>(null);
  const [borderDialogOpen, setBorderDialogOpen] = useState(false);
  const [walletRedirectOpen, setWalletRedirectOpen] = useState(false);
  const [, navigate] = useLocation();

  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const chainId = useChainId();

  const [brokenNameTagImages, setBrokenNameTagImages] = useState<Set<number>>(new Set());
  const [brokenBorderImages, setBrokenBorderImages] = useState<Set<number>>(new Set());
  const [purchasingNameTagId, setPurchasingNameTagId] = useState<number | null>(null);
  const [purchasingBorderId, setPurchasingBorderId] = useState<number | null>(null);
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

  interface StoreNameTag {
    id: number;
    name: string;
    imageUrl: string;
    rarity: string;
    gfCost: number | null;
    owned: boolean;
  }

  const { data: storeNameTags = [], isLoading: isLoadingNameTags } = useQuery<StoreNameTag[]>({
    queryKey: ["/api/store/name-tags"],
    queryFn: async () => {
      const response = await fetch('/api/store/name-tags', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch store name tags');
      return response.json();
    },
  });

  const [purchasingNameTagId, setPurchasingNameTagId] = useState<number | null>(null);
  const [brokenNameTagImages, setBrokenNameTagImages] = useState<Set<number>>(new Set());
  const [brokenBorderImages, setBrokenBorderImages] = useState<Set<number>>(new Set());

  const purchaseNameTagMutation = useMutation({
    mutationFn: async (nameTagId: number) => {
      const response = await apiRequest("POST", "/api/store/purchase-name-tag", { nameTagId });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to purchase name tag");
      }
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "Name Tag Purchased!", description: data.message });
      queryClient.invalidateQueries({ queryKey: ["/api/store/name-tags"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/name-tags"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setPurchasingNameTagId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Purchase Failed", description: error.message, variant: "destructive" });
      setPurchasingNameTagId(null);
    },
  });

  interface StoreBorder {
    id: number;
    name: string;
    imageUrl: string;
    rarity: string;
    gfCost: number | null;
    owned: boolean;
    isPro: boolean;
    proOnly: boolean;
    shape?: string;
  }

  const hasNftProfile = !!(user?.nftProfileTokenId && user?.nftProfileImageUrl);
  const borderShapeFilter = hasNftProfile ? 'square' : 'circle';

  const { data: storeBorders = [], isLoading: isLoadingBorders } = useQuery<StoreBorder[]>({
    queryKey: ["/api/store/borders", borderShapeFilter],
    queryFn: async () => {
      const response = await fetch(`/api/store/borders?shape=${borderShapeFilter}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch store borders');
      return response.json();
    },
  });

  const [purchasingBorderId, setPurchasingBorderId] = useState<number | null>(null);
  const [proUpgradeOpen, setProUpgradeOpen] = useState(false);

  const purchaseBorderMutation = useMutation({
    mutationFn: async (borderId: number) => {
      const response = await apiRequest("POST", "/api/store/purchase-border", { borderId });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to purchase border");
      }
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "Border Purchased!", description: data.message });
      queryClient.invalidateQueries({ queryKey: ["/api/store/borders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setPurchasingBorderId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Purchase Failed", description: error.message, variant: "destructive" });
      setPurchasingBorderId(null);
    },
  });

  interface MarketplaceListing {
    token_id: number;
    listed_price: number;
    sold_at: string;
    user_id: number;
    username: string;
    display_name: string | null;
  }

  const { data: marketplaceData, isLoading: isLoadingMarketplace, refetch: refetchMarketplace } = useQuery<{ listings: MarketplaceListing[] }>({
    queryKey: ["/api/marketplace/listings"],
    queryFn: async () => {
      const response = await fetch('/api/marketplace/listings', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch marketplace listings');
      return response.json();
    },
  });

  const [buyingTokenId, setBuyingTokenId] = useState<number | null>(null);

  const buyMarketplaceNftMutation = useMutation({
    mutationFn: async ({ tokenId, sellerId }: { tokenId: number; sellerId: number }) => {
      const response = await apiRequest("POST", "/api/marketplace/buy", { tokenId, sellerId });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to purchase NFT");
      }
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "NFT Purchased!", description: data.message });
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/listings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/nfts/owned"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setBuyingTokenId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Purchase Failed", description: error.message, variant: "destructive" });
      setBuyingTokenId(null);
    },
  });

  const { openModal } = useAuthModal();

  const handlePurchaseWithGF = async (item: StoreItem) => {
    if (!user) {
      openModal();
      return;
    }

    if (!isConnected || !walletClient || !publicClient) {
      toast({ title: "Wallet not connected", description: "Please connect your wallet first", variant: "destructive" });
      setWalletRedirectOpen(true);
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
      openModal();
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
      priceGBP: 2.50,
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
      priceGBP: 8.00,
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
      priceGBP: 5.50,
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
      priceGBP: 3.50,
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
      priceGBP: 7.00,
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
      priceGBP: 6.00,
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
      priceGBP: 6.50,
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
      priceGBP: 4.00,
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
      priceGBP: 5.00,
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
      priceGBP: 7.50,
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
      priceGBP: 3.00,
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
      priceGBP: 4.50,
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
      priceGBP: 3.50,
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
      priceGBP: 4.20,
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
      priceGBP: 9.00,
      description: "Crowned rebel leading the resistance with style",
      forSale: true,
      rarity: "legendary",
      currentBid: 850,
      owner: "RogueKing",
    },
  ];

  const { data: availableCatalog } = useQuery<{ id: number }[]>({
    queryKey: ['/api/nft/store-catalog'],
    queryFn: async () => {
      const response = await fetch('/api/nft/store-catalog', { credentials: 'include' });
      if (!response.ok) return [];
      return response.json();
    },
  });

  const availableIds = new Set(availableCatalog?.map((n: { id: number }) => n.id) || gamefolioNFTs.map(n => n.id));
  const availableNFTs = gamefolioNFTs.filter(nft => availableIds.has(nft.id));

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
            ? "bg-green-600 hover:bg-green-700" 
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
            ? "bg-green-600 hover:bg-green-700" 
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
            ? "bg-green-600 hover:bg-green-700" 
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
          ≈ £{(gfBalance * 0.01).toFixed(2)} GBP
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
                      ? "bg-green-600 hover:bg-green-700" 
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
                      ? "bg-green-600 hover:bg-green-700" 
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
                      ? "bg-green-600 hover:bg-green-700" 
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
                    ≈ £{(gfBalance * 0.01).toFixed(2)} GBP
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
                  ? "bg-green-600 text-white"
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
                  ? "bg-green-600 text-white"
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
                  ? "bg-green-600 text-white"
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
                {user?.nftProfileTokenId && user?.nftProfileImageUrl ? (
                  <div className="h-10 w-10 rounded-lg overflow-hidden border border-[#4ade80]/40">
                    <img src={user.nftProfileImageUrl} alt={user.username || "User"} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <Avatar className="h-10 w-10" data-testid="avatar-user">
                    <AvatarImage src={user?.avatarUrl || undefined} />
                    <AvatarFallback className="bg-gray-800">
                      {user?.username?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                )}
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
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Access</label>
                    <Select value={accessFilter} onValueChange={setAccessFilter}>
                      <SelectTrigger className="bg-gray-800 border-gray-700" data-testid="select-access">
                        <SelectValue placeholder="All Items" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        <SelectItem value="all">All Items</SelectItem>
                        <SelectItem value="free">Free User Items</SelectItem>
                        <SelectItem value="pro">Pro Items Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

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
              {accessFilter !== "pro" && (
              <>
              <h3 className="text-base font-semibold text-gray-300 mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#4ade80]" />
                NFT Avatars
              </h3>
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 mb-8">
                {availableNFTs
                  .filter((nft) => {
                    if (rarityFilter !== "all" && nft.rarity.toLowerCase() !== rarityFilter.toLowerCase()) {
                      return false;
                    }
                    if (priceFilter !== "all") {
                      if (priceFilter === "low" && nft.price > 300) return false;
                      if (priceFilter === "medium" && (nft.price < 300 || nft.price > 500)) return false;
                      if (priceFilter === "high" && nft.price < 500) return false;
                    }
                    if (mintFilter !== "all") {
                      if (mintFilter === "1-100" && nft.id > 100) return false;
                      if (mintFilter === "101-500" && (nft.id < 101 || nft.id > 500)) return false;
                      if (mintFilter === "500+" && nft.id < 500) return false;
                    }
                    return true;
                  })
                  .map((nft) => (
                  <Card
                    key={nft.id}
                    className="bg-gray-800/50 border-0 overflow-hidden transition-all hover:shadow-lg hover:shadow-[#4ade80]/20 cursor-pointer"
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
                          nft.rarity === "rare" ? "bg-gradient-to-r from-green-500 to-emerald-600" : "bg-gray-600"
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
              </>
              )}

              {/* Marketplace Listings */}
              {marketplaceData && marketplaceData.listings.length > 0 && accessFilter !== "pro" && (
              <>
              <h3 className="text-base font-semibold text-gray-300 mb-3 flex items-center gap-2">
                <Tag className="h-4 w-4 text-orange-400" />
                Marketplace
                <Badge className="bg-orange-600/30 text-[10px] px-1.5 py-0.5 text-orange-300 ml-1">
                  Player Listed
                </Badge>
              </h3>
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 mb-8">
                {marketplaceData.listings.map((listing: MarketplaceListing) => (
                  <div
                    key={`marketplace-${listing.token_id}-${listing.user_id}`}
                    className="rounded-2xl overflow-hidden bg-slate-900 transition-all duration-200 hover:scale-[1.03] hover:shadow-[0_0_20px_rgba(249,115,22,0.3)]"
                  >
                    <div className="relative aspect-square overflow-hidden">
                      <MarketplaceNftImage tokenId={listing.token_id} />
                      <div className="absolute top-2 left-2 bg-orange-500/90 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                        Resale
                      </div>
                      <div className="absolute top-2 right-2 backdrop-blur-md bg-black/60 border border-white/10 rounded-xl px-2.5 py-1.5">
                        <span className="text-[10px] font-bold text-green-400">#{listing.token_id}</span>
                      </div>
                    </div>
                    
                    <div className="p-3 pt-2">
                      <h3 className="font-bold text-sm text-slate-50 truncate">Genesis #{listing.token_id}</h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">by {listing.display_name || listing.username}</p>
                      
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800">
                        <div className="flex items-center gap-1">
                          <img src={gfTokenLogo} alt="GF" className="w-3.5 h-3.5" />
                          <span className="text-sm font-bold text-orange-400">{listing.listed_price}</span>
                        </div>
                        <Button
                          size="sm"
                          disabled={buyingTokenId === listing.token_id || listing.user_id === user?.id}
                          className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-[10px] h-7 px-3 rounded-xl disabled:opacity-50"
                          onClick={() => {
                            setBuyingTokenId(listing.token_id);
                            buyMarketplaceNftMutation.mutate({ tokenId: listing.token_id, sellerId: listing.user_id });
                          }}
                        >
                          {buyingTokenId === listing.token_id ? (
                            <Loader2 className="h-2.5 w-2.5 animate-spin" />
                          ) : listing.user_id === user?.id ? (
                            "Your listing"
                          ) : (
                            <>
                              <ShoppingCart className="h-2.5 w-2.5 mr-0.5" />
                              Buy
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              </>
              )}

              {/* Store Items */}
              {accessFilter !== "pro" && (
              <>
              <h3 className="text-base font-semibold text-gray-300 mb-3 flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-green-400" />
                Digital Items
                <Badge className="bg-gray-600 text-[10px] px-1.5 py-0.5 text-gray-200 ml-1">
                  All Users
                </Badge>
              </h3>
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
                    className={`bg-gray-800/50 border-gray-700 overflow-hidden transition-all hover:shadow-lg ${isOwned ? "border-green-500 hover:border-green-400 hover:shadow-green-500/20" : "hover:border-green-500 hover:shadow-green-500/20"}`}
                    data-testid={`card-item-${item.id}`}
                  >
                    <div 
                      className="relative aspect-square overflow-hidden"
                      data-testid={`img-item-${item.id}`}
                    >
                      <img
                        src={resolveStoreImage(item.image)}
                        alt={item.name}
                        className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                      />
                      {isOwned ? (
                        <Badge className="absolute top-2 right-2 bg-green-600 text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Unlocked
                        </Badge>
                      ) : (
                        <Badge className="absolute top-2 right-2 bg-green-600 text-xs">
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
                            item.rarity === "rare" ? "bg-gradient-to-r from-green-500 to-emerald-600" : "bg-gray-600"
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
                            {(item as any).proDiscount && (item as any).originalPrice !== item.gfCost ? (
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-gray-500 line-through">{(item as any).originalPrice} GF</span>
                                <p className="text-xs font-bold text-green-400" data-testid={`text-item-price-${item.id}`}>
                                  {item.gfCost} GF
                                </p>
                              </div>
                            ) : (
                              <p className="text-xs font-bold text-green-400" data-testid={`text-item-price-${item.id}`}>
                                {item.gfCost} GF
                              </p>
                            )}
                          </div>
                          {(item as any).proDiscount && (
                            <span className="text-[8px] text-green-400 flex items-center gap-0.5">
                              <Crown className="h-2 w-2" /> 20% Pro Discount
                            </span>
                          )}
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
                            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-[10px] h-6 px-2"
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
              </>
              )}

              {/* Name Tags Section */}
              {accessFilter !== "pro" && (
              <>
              <h3 className="text-base font-semibold text-gray-300 mb-3 mt-8 flex items-center gap-2">
                <Tag className="h-4 w-4 text-purple-400" />
                Name Tags
                <Badge className="bg-gray-600 text-[10px] px-1.5 py-0.5 text-gray-200 ml-1">
                  All Users
                </Badge>
              </h3>
              <p className="text-xs text-gray-500 mb-3">
                Customize your profile with unique name tags. Purchase with GF tokens or win from daily lootboxes! Pro members get 20% off.
              </p>
              {isLoadingNameTags ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : storeNameTags.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  No name tags available in the store yet.
                </div>
              ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
                {storeNameTags
                  .filter((tag) => rarityFilter === "all" || tag.rarity === rarityFilter)
                  .map((tag) => {
                  const isPurchasing = purchasingNameTagId === tag.id;
                  const cost = tag.gfCost || 0;
                  
                  return (
                  <Card
                    key={tag.id}
                    className={`bg-gray-800/50 border-gray-700 overflow-hidden transition-all hover:shadow-lg cursor-pointer ${
                      tag.owned 
                        ? "border-green-500/50 hover:border-green-400 hover:shadow-green-500/20" 
                        : tag.rarity === 'legendary' ? "hover:border-amber-500 hover:shadow-amber-500/20"
                        : tag.rarity === 'epic' ? "hover:border-purple-500 hover:shadow-purple-500/20"
                        : tag.rarity === 'rare' ? "hover:border-green-500 hover:shadow-green-500/20"
                        : "hover:border-gray-500 hover:shadow-gray-500/20"
                    }`}
                    onClick={() => {
                      setSelectedNameTag(tag);
                      setNameTagDialogOpen(true);
                    }}
                  >
                    <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-3">
                      {brokenNameTagImages.has(tag.id) ? (
                        <NameTagFallback name={tag.name} rarity={tag.rarity} />
                      ) : (
                        <img
                          src={tag.imageUrl}
                          alt={tag.name}
                          className="max-w-full max-h-full object-contain drop-shadow-lg"
                          onError={() => setBrokenNameTagImages(prev => new Set(prev).add(tag.id))}
                        />
                      )}
                      {tag.owned && (
                        <Badge className="absolute top-1.5 right-1.5 bg-green-600 text-[10px] px-1.5 py-0.5">
                          <CheckCircle className="w-2.5 h-2.5 mr-0.5" />
                          Owned
                        </Badge>
                      )}
                    </div>
                    
                    <div className="p-2 space-y-1.5">
                      <div>
                        <h3 className="font-semibold text-xs line-clamp-1">{tag.name}</h3>
                        <Badge className={`mt-1 text-[10px] px-1.5 py-0.5 text-white capitalize ${
                          tag.rarity === "legendary" ? "bg-gradient-to-r from-yellow-500 to-amber-600" :
                          tag.rarity === "epic" ? "bg-gradient-to-r from-purple-500 to-pink-600" :
                          tag.rarity === "rare" ? "bg-gradient-to-r from-green-500 to-emerald-600" : "bg-gray-600"
                        }`}>
                          {tag.rarity}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between pt-1.5 border-t border-gray-700">
                        <div>
                          <p className="text-[9px] text-gray-500">Price</p>
                          <div className="flex items-center gap-0.5">
                            <img src={gfTokenLogo} alt="GF" className="w-3 h-3" />
                            {(tag as any).proDiscount && (tag as any).originalPrice !== cost ? (
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-gray-500 line-through">{(tag as any).originalPrice} GF</span>
                                <span className="text-xs font-bold text-green-400">{cost} GF</span>
                              </div>
                            ) : (
                              <span className="text-xs font-bold text-purple-400">{cost} GF</span>
                            )}
                          </div>
                          {(tag as any).proDiscount && (
                            <span className="text-[8px] text-green-400 flex items-center gap-0.5">
                              <Crown className="h-2 w-2" /> 20% Pro Discount
                            </span>
                          )}
                        </div>
                        
                        {tag.owned ? (
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
                            className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white text-[10px] h-6 px-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!user) {
                                toast({ title: "Login required", description: "Please log in to purchase name tags", variant: "destructive" });
                                return;
                              }
                              setPurchasingNameTagId(tag.id);
                              purchaseNameTagMutation.mutate(tag.id);
                            }}
                            disabled={isPurchasing}
                          >
                            {isPurchasing ? (
                              <>
                                <Loader2 className="h-2.5 w-2.5 mr-0.5 animate-spin" />
                                Buying...
                              </>
                            ) : (
                              <>
                                <Tag className="h-2.5 w-2.5 mr-0.5" />
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
              </>
              )}

              {/* Profile Borders Section - Pro Only */}
              {accessFilter !== "free" && (
              <>
              <h3 className="text-base font-semibold text-gray-300 mb-3 mt-8 flex items-center gap-2">
                <Circle className="h-4 w-4 text-amber-400" />
                {hasNftProfile ? 'NFT Profile Borders' : 'Profile Picture Borders'}
                <Badge className="bg-gradient-to-r from-amber-500 to-yellow-600 text-[10px] px-1.5 py-0.5 text-white ml-1">
                  <Crown className="w-2.5 h-2.5 mr-0.5" />
                  PRO EXCLUSIVE
                </Badge>
              </h3>
              <p className="text-xs text-gray-500 mb-3">
                {hasNftProfile
                  ? 'Square borders designed for your NFT profile picture. Requires an active Pro subscription to purchase and use.'
                  : 'Add stunning borders around your profile picture. Requires an active Pro subscription to purchase and use.'}
              </p>
              {isLoadingBorders ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : storeBorders.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  No profile borders available in the store yet.
                </div>
              ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
                {storeBorders
                  .filter((border) => rarityFilter === "all" || border.rarity === rarityFilter)
                  .map((border) => {
                  const isPurchasing = purchasingBorderId === border.id;
                  const cost = border.gfCost || 0;
                  const isUserPro = user?.isPro === true;
                  
                  return (
                  <Card
                    key={border.id}
                    className={`bg-gray-800/50 border-gray-700 overflow-hidden transition-all cursor-pointer ${
                      !isUserPro ? "opacity-70 hover:opacity-80" :
                      border.owned 
                        ? "border-green-500/50 hover:border-green-400 hover:shadow-green-500/20 hover:shadow-lg" 
                        : border.rarity === 'legendary' ? "hover:border-amber-500 hover:shadow-amber-500/20 hover:shadow-lg"
                        : border.rarity === 'epic' ? "hover:border-purple-500 hover:shadow-purple-500/20 hover:shadow-lg"
                        : border.rarity === 'rare' ? "hover:border-green-500 hover:shadow-green-500/20 hover:shadow-lg"
                        : "hover:border-gray-500 hover:shadow-gray-500/20 hover:shadow-lg"
                    }`}
                    onClick={() => {
                      setSelectedBorder(border);
                      setBorderDialogOpen(true);
                    }}
                  >
                    <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-3">
                      {brokenBorderImages.has(border.id) ? (
                        <BorderFallback name={border.name} rarity={border.rarity} />
                      ) : (
                        <img
                          src={border.imageUrl}
                          alt={border.name}
                          className={`max-w-full max-h-full object-contain drop-shadow-lg ${!isUserPro ? "grayscale-[30%]" : ""}`}
                          onError={() => setBrokenBorderImages(prev => new Set(prev).add(border.id))}
                        />
                      )}
                      {border.owned && (
                        <Badge className="absolute top-1.5 right-1.5 bg-green-600 text-[10px] px-1.5 py-0.5">
                          <CheckCircle className="w-2.5 h-2.5 mr-0.5" />
                          Owned
                        </Badge>
                      )}
                      <Badge className="absolute top-1.5 left-1.5 bg-gradient-to-r from-amber-500 to-yellow-600 text-[10px] px-1.5 py-0.5 text-white">
                        <Crown className="w-2.5 h-2.5 mr-0.5" />
                        PRO
                      </Badge>
                      {!isUserPro && (
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <div className="bg-black/70 rounded-lg px-3 py-2 flex flex-col items-center gap-1">
                            <Lock className="w-5 h-5 text-amber-400" />
                            <span className="text-[10px] text-amber-300 font-medium">Pro Only</span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="p-2 space-y-1.5">
                      <div>
                        <h3 className="font-semibold text-xs line-clamp-1">{border.name}</h3>
                        <div className="flex items-center gap-1 mt-1">
                          <Badge className={`text-[10px] px-1.5 py-0.5 text-white capitalize ${
                            border.rarity === "legendary" ? "bg-gradient-to-r from-yellow-500 to-amber-600" :
                            border.rarity === "epic" ? "bg-gradient-to-r from-purple-500 to-pink-600" :
                            border.rarity === "rare" ? "bg-gradient-to-r from-green-500 to-emerald-600" : "bg-gray-600"
                          }`}>
                            {border.rarity}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-1.5 border-t border-gray-700">
                        <div>
                          <p className="text-[9px] text-gray-500">Price</p>
                          <div className="flex items-center gap-0.5">
                            <img src={gfTokenLogo} alt="GF" className="w-3 h-3" />
                            <span className="text-xs font-bold text-purple-400">{cost} GF</span>
                          </div>
                        </div>
                        
                        {border.owned ? (
                          <Button
                            size="sm"
                            className="bg-gradient-to-r from-green-500 to-emerald-600 text-white text-[10px] h-6 px-2 cursor-default"
                            disabled
                          >
                            <CheckCircle className="h-2.5 w-2.5 mr-0.5" />
                            Owned
                          </Button>
                        ) : !isUserPro ? (
                          <Button
                            size="sm"
                            className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white text-[10px] h-6 px-2"
                            onClick={(e) => { e.stopPropagation(); setProUpgradeOpen(true); }}
                          >
                            <Crown className="h-2.5 w-2.5 mr-0.5" />
                            Get Pro
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white text-[10px] h-6 px-2"
                            onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBorder(border);
                            setBorderDialogOpen(true);
                          }}
                            disabled={isPurchasing}
                          >
                            {isPurchasing ? (
                              <>
                                <Loader2 className="h-2.5 w-2.5 mr-0.5 animate-spin" />
                                Buying...
                              </>
                            ) : (
                              <>
                                <Circle className="h-2.5 w-2.5 mr-0.5" />
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
              </>
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
              <Link href="/collection">
                <Button className="mt-6" variant="outline" size="sm" data-testid="button-view-inventory">
                  View Collection
                </Button>
              </Link>
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
                    className="mt-6 bg-green-600 hover:bg-green-700" 
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
                        <div className="absolute top-2 left-2 p-1.5 rounded-full bg-black/50">
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="url(#heartGradientWatchlist)" stroke="none">
                            <defs>
                              <linearGradient id="heartGradientWatchlist" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#4ade80" />
                                <stop offset="100%" stopColor="#22c55e" />
                              </linearGradient>
                            </defs>
                            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                          </svg>
                        </div>
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
                              <p className="text-xs font-bold text-green-400" data-testid={`text-price-${item.nftId}`}>
                                {item.nftPrice} GF
                              </p>
                            </div>
                          </div>

                          <Button
                            size="sm"
                            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-[10px] h-6 px-2"
                            onClick={() => {
                              const nft: NFT = {
                                id: item.nftId,
                                name: item.nftName,
                                image: item.nftImage,
                                price: item.nftPrice,
                                priceGBP: item.nftPrice * 0.01,
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
          queryClient.invalidateQueries({ queryKey: ['/api/nft/store-catalog'] });
          queryClient.invalidateQueries({ queryKey: ['/api/user'] });
        }}
      />

      {/* Name Tag Detail Dialog */}
      <NameTagDetailDialog
        nameTag={selectedNameTag}
        open={nameTagDialogOpen}
        onOpenChange={setNameTagDialogOpen}
        onPurchase={(id) => {
          if (!user) {
            toast({ title: "Login required", description: "Please log in to purchase name tags", variant: "destructive" });
            return;
          }
          setPurchasingNameTagId(id);
          purchaseNameTagMutation.mutate(id);
        }}
        isPurchasing={purchasingNameTagId === selectedNameTag?.id}
        brokenImage={selectedNameTag ? brokenNameTagImages.has(selectedNameTag.id) : false}
      />

      {/* Wallet Redirect Dialog */}
      <WalletDialog open={walletRedirectOpen} onOpenChange={setWalletRedirectOpen}>
        <WalletDialogContent className="bg-[#0f172a] border-gray-700 text-white max-w-sm">
          <WalletDialogHeader>
            <WalletDialogTitle className="text-white text-lg">Wallet Required</WalletDialogTitle>
            <WalletDialogDescription className="text-gray-400">
              You need to create a wallet before making purchases. Would you like to go to the wallet page to set one up?
            </WalletDialogDescription>
          </WalletDialogHeader>
          <WalletDialogFooter>
            <Button
              variant="outline"
              className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
              onClick={() => setWalletRedirectOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-[#4ade80] hover:bg-[#22c55e] text-black font-bold"
              onClick={() => {
                setWalletRedirectOpen(false);
                navigate("/wallet");
              }}
            >
              Go to Wallet
            </Button>
          </WalletDialogFooter>
        </WalletDialogContent>
      </WalletDialog>

      {/* Pro Upgrade Dialog for borders */}
      <ProUpgradeDialog
        open={proUpgradeOpen}
        onOpenChange={setProUpgradeOpen}
      />

      {/* Border Detail Dialog */}
      <BorderDetailDialog
        border={selectedBorder}
        open={borderDialogOpen}
        onOpenChange={setBorderDialogOpen}
        onPurchase={(id) => {
          if (!user) {
            toast({ title: "Login required", description: "Please log in to purchase borders", variant: "destructive" });
            return;
          }
          setPurchasingBorderId(id);
          purchaseBorderMutation.mutate(id);
        }}
        isPurchasing={purchasingBorderId === selectedBorder?.id}
        brokenImage={selectedBorder ? brokenBorderImages.has(selectedBorder.id) : false}
        isUserPro={user?.isPro === true}
        onUpgradePro={() => {
          setBorderDialogOpen(false);
          setProUpgradeOpen(true);
        }}
      />
    </div>
  );
}
