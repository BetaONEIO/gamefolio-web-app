import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Heart, ShoppingCart, ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { NFTPurchaseDialog } from "@/components/store/NFTPurchaseDialog";
import gfTokenLogo from "@assets/Gamefolio token_1762633908726.png";

interface WatchlistItem {
  id: number;
  userId: number;
  nftId: number;
  nftName: string;
  nftImage: string;
  nftPrice: number;
  createdAt: string;
}

interface NFT {
  id: number;
  name: string;
  description: string;
  image: string;
  price: number;
  priceGBP: number;
  rarity: string;
  type: string;
  mintNumber: number;
  currentBid: number;
  owner: string;
  forSale: boolean;
}

export default function WatchlistPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);

  // Fetch user's watchlist
  const { data: watchlist = [], isLoading } = useQuery<WatchlistItem[]>({
    queryKey: ["/api/nft/watchlist"],
    enabled: !!user,
  });

  // Remove from watchlist mutation
  const removeFromWatchlistMutation = useMutation({
    mutationFn: async (nftId: number) => {
      const response = await fetch(`/api/nft/watchlist/${nftId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to remove from watchlist");
      return response.json();
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

  const handleBuyNFT = (watchlistItem: WatchlistItem) => {
    // Convert watchlist item to NFT format for purchase dialog
    const nft: NFT = {
      id: watchlistItem.nftId,
      name: watchlistItem.nftName,
      description: "",
      image: watchlistItem.nftImage,
      price: watchlistItem.nftPrice,
      priceGBP: watchlistItem.nftPrice * 0.01,
      rarity: "Epic",
      type: "Avatar",
      mintNumber: 1,
      currentBid: watchlistItem.nftPrice,
      owner: "Gamefolio",
      forSale: true,
    };
    setSelectedNFT(nft);
    setPurchaseDialogOpen(true);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0f1419] flex items-center justify-center p-4">
        <div className="text-center">
          <Heart className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Login Required</h2>
          <p className="text-gray-400 mb-4">
            Please login to view your NFT watchlist
          </p>
          <Link href="/auth">
            <Button>Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1419]">
      {/* Header */}
      <div className="border-b border-gray-800 bg-[#0f1419]/90 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/store">
                <Button variant="ghost" size="icon" data-testid="button-back">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Heart className="h-6 w-6 text-red-500 fill-red-500" />
                  My Watchlist
                </h1>
                <p className="text-sm text-gray-400" data-testid="text-watchlist-count">
                  {watchlist.length} NFT{watchlist.length !== 1 ? "s" : ""} saved
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex justify-center items-center min-h-[50vh]">
            <div className="text-gray-400">Loading watchlist...</div>
          </div>
        ) : watchlist.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
            <Heart className="h-20 w-20 text-gray-600 mb-4" />
            <h3 className="text-2xl font-semibold mb-2" data-testid="heading-empty-watchlist">
              Your Watchlist is Empty
            </h3>
            <p className="text-gray-400 mb-6 max-w-md" data-testid="text-empty-description">
              Start adding NFTs to your watchlist to track price changes and never miss out on your favorite items.
            </p>
            <Link href="/store">
              <Button className="bg-blue-600 hover:bg-blue-700" data-testid="button-browse-nfts">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Browse NFTs
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {watchlist.map((item: WatchlistItem) => (
              <Card
                key={item.id}
                className="bg-gray-800/50 border-gray-700 overflow-hidden hover:border-blue-500 transition-all hover:shadow-lg hover:shadow-blue-500/20"
                data-testid={`card-watchlist-${item.nftId}`}
              >
                <div className="relative aspect-square overflow-hidden">
                  <img
                    src={item.nftImage}
                    alt={item.nftName}
                    className="w-full h-full object-cover"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute top-2 right-2 h-8 w-8 bg-black/50 hover:bg-black/70"
                    onClick={() => removeFromWatchlistMutation.mutate(item.nftId)}
                    data-testid={`button-remove-${item.nftId}`}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                  <Badge className="absolute top-2 left-2 bg-red-600 text-xs flex items-center gap-1">
                    <Heart className="h-3 w-3 fill-white" />
                    Saved
                  </Badge>
                </div>

                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold text-base mb-1 line-clamp-1" data-testid={`text-nft-name-${item.nftId}`}>
                      {item.nftName}
                    </h3>
                    <p className="text-xs text-gray-400">
                      Added {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                    <div>
                      <p className="text-xs text-gray-400">Price</p>
                      <div className="flex items-center gap-1">
                        <img src={gfTokenLogo} alt="GF Token" className="w-4 h-4" />
                        <p className="text-base font-bold text-blue-400" data-testid={`text-price-${item.nftId}`}>
                          {item.nftPrice} GF
                        </p>
                      </div>
                      <p className="text-xs text-gray-500">
                        ≈ £{(item.nftPrice * 0.01).toFixed(2)}
                      </p>
                    </div>

                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => handleBuyNFT(item)}
                      data-testid={`button-buy-${item.nftId}`}
                    >
                      <ShoppingCart className="h-4 w-4 mr-1" />
                      Buy
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
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
