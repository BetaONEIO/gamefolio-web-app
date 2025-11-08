import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet, Check, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useCrossmint } from "@/hooks/use-crossmint";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import gfTokenLogo from "@assets/Gamefolio token_1762633908726.png";

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

interface NFTPurchaseDialogProps {
  nft: NFT | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPurchaseComplete?: () => void;
}

export function NFTPurchaseDialog({
  nft,
  open,
  onOpenChange,
  onPurchaseComplete,
}: NFTPurchaseDialogProps) {
  const { user } = useAuth();
  const { wallet } = useCrossmint();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const purchaseMutation = useMutation({
    mutationFn: async (data: { nftId: number }) => {
      return await apiRequest("/api/nft/purchase", {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
          "Content-Type": "application/json",
        },
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Purchase Successful!",
        description: `You've purchased ${nft?.name} for ${nft?.price} GF tokens.`,
      });

      // Invalidate and refetch user data to update balance
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      
      onOpenChange(false);
      onPurchaseComplete?.();
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "There was an error processing your purchase. Please try again.";
      toast({
        title: "Purchase Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  if (!nft) return null;

  const userBalance = user?.gfTokenBalance || 0;
  const hasEnoughBalance = userBalance >= nft.price;
  const serviceFee = 0;
  const totalAmount = nft.price + serviceFee;

  const handlePurchase = async () => {
    if (!hasEnoughBalance) {
      toast({
        title: "Insufficient Balance",
        description: "You don't have enough GF tokens to purchase this NFT.",
        variant: "destructive",
      });
      return;
    }

    if (!wallet?.address) {
      toast({
        title: "Wallet Required",
        description: "Please create a wallet before purchasing NFTs.",
        variant: "destructive",
      });
      return;
    }

    purchaseMutation.mutate({
      nftId: nft.id,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-md" data-testid="dialog-nft-purchase">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold" data-testid="text-dialog-title">
            Place a bid
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* NFT Image */}
          <div className="relative aspect-video rounded-lg overflow-hidden">
            <img
              src={nft.image}
              alt={nft.name}
              className="w-full h-full object-cover"
              data-testid="img-nft-preview"
            />
          </div>

          {/* NFT Info */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-base" data-testid="text-nft-name">
                    {nft.name}
                  </h3>
                  <Badge className="bg-blue-600 text-xs">✓</Badge>
                </div>
                <p className="text-sm text-gray-400" data-testid="text-nft-owner">
                  Owned by {nft.owner}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Current Bid</p>
                <div className="flex items-center gap-1">
                  <img src={gfTokenLogo} alt="GF Token" className="w-4 h-4" />
                  <p className="text-blue-400 font-semibold" data-testid="text-current-bid">
                    {nft.currentBid} GF
                  </p>
                </div>
                <p className="text-xs text-gray-500" data-testid="text-current-bid-usd">
                  ${(nft.currentBid * 0.05).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Wallet Connection - Only show if wallet not connected */}
          {!wallet?.address && (
            <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
              <h4 className="text-sm font-medium mb-2">Connect Wallet</h4>
              <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                    <Wallet className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-medium text-sm">Crossmint</span>
                </div>
                <Link href="/wallet">
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700" data-testid="button-connect-wallet">
                    Connect
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* Bid Amount */}
          <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Bid Amount</span>
              <div className="text-right">
                <span className="text-sm text-gray-400">Your Balance: </span>
                <span className="font-medium" data-testid="text-user-balance">
                  {userBalance.toLocaleString()} GF
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
              <div className="flex items-center gap-2">
                <img src={gfTokenLogo} alt="GF Token" className="w-6 h-6" />
                <span className="text-sm font-medium">GF Token</span>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold" data-testid="text-bid-amount">
                  {nft.price}
                </p>
              </div>
            </div>

            {!hasEnoughBalance && (
              <div className="flex items-center gap-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span className="text-xs text-red-400" data-testid="text-insufficient-balance">
                  Insufficient balance. You need {(nft.price - userBalance).toLocaleString()} more GF tokens.
                </span>
              </div>
            )}
          </div>

          {/* Service Fee */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Service fee</span>
            <div className="flex items-center gap-1">
              <img src={gfTokenLogo} alt="GF Token" className="w-4 h-4" />
              <span data-testid="text-service-fee">{serviceFee} GF</span>
            </div>
          </div>

          {/* Total Amount */}
          <div className="flex items-center justify-between text-base font-semibold pt-2 border-t border-gray-700">
            <span>Total Amount</span>
            <div className="flex items-center gap-1">
              <img src={gfTokenLogo} alt="GF Token" className="w-5 h-5" />
              <span data-testid="text-total-amount">{totalAmount} GF</span>
            </div>
          </div>

          {/* Purchase Button */}
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 font-semibold"
            size="lg"
            onClick={handlePurchase}
            disabled={!hasEnoughBalance || !wallet?.address || purchaseMutation.isPending}
            data-testid="button-place-bid"
          >
            {purchaseMutation.isPending ? "Processing..." : "Place a bid"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
