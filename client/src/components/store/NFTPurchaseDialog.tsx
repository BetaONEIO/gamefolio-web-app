import { useState } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, ExternalLink, CheckCircle, Wallet } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useCrossmint } from "@/hooks/use-crossmint";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
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
  const [step, setStep] = useState<'details' | 'checkout'>('details');

  const purchaseMutation = useMutation({
    mutationFn: async (data: { nftId: number }) => {
      const response = await apiRequest("POST", "/api/nft/purchase", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Purchase Successful!",
        description: `You've purchased ${nft?.name} for ${nft?.price} GF tokens.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setStep('details');
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

  const handleClose = () => {
    setStep('details');
    onOpenChange(false);
  };

  if (!nft) return null;

  const userBalance = user?.gfTokenBalance || 0;
  const networkFee = 1.50;
  const totalAmount = nft.price + networkFee;
  const hasEnoughBalance = userBalance >= totalAmount;
  const remainingBalance = userBalance - totalAmount;

  const handleProceedToCheckout = () => {
    if (!wallet?.address) {
      toast({
        title: "Wallet Required",
        description: "Please create a wallet before purchasing NFTs.",
        variant: "destructive",
      });
      return;
    }
    setStep('checkout');
  };

  const handleConfirmPurchase = () => {
    if (!hasEnoughBalance) {
      toast({
        title: "Insufficient Balance",
        description: "You don't have enough GF tokens to purchase this NFT.",
        variant: "destructive",
      });
      return;
    }
    purchaseMutation.mutate({ nftId: nft.id });
  };

  const contractAddress = "0x892a...F4e1";
  const tokenId = nft.id.toString().padStart(4, '0');
  const walletAddress = wallet?.address ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}` : "0x892a...f4e1";

  // Checkout Screen
  if (step === 'checkout') {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent 
          className="bg-[#020617] border-none text-white p-0 max-w-[430px] w-full h-[90vh] max-h-[900px] overflow-hidden flex flex-col [&>button]:hidden"
          data-testid="dialog-nft-checkout"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 pt-12 bg-[#020617]/80 backdrop-blur-md border-b border-[#1e293b]/50">
            <button
              onClick={() => setStep('details')}
              className="w-10 h-10 rounded-full hover:bg-[#1e293b]/50 flex items-center justify-center transition-colors"
            >
              <ArrowLeft className="h-6 w-6 text-white/50" />
            </button>
            <span className="text-xl font-bold text-[#f8fafc] uppercase tracking-tight">Checkout</span>
            <div className="w-10 h-10" />
          </div>

          {/* Scrollable Content */}
          <div 
            className="flex-1 overflow-y-auto"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>
            <div className="hide-scrollbar flex flex-col gap-8 px-6 py-4">
              
              {/* Item Details */}
              <div className="flex flex-col gap-4">
                <span className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider">
                  Item Details
                </span>
                <div className="bg-[#0f172a] border border-[#1e293b]/50 rounded-2xl p-4 flex items-center gap-4">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0">
                    <img
                      src={nft.image}
                      alt={nft.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-[#4ade80] uppercase tracking-wider">
                        Cyber Guardians
                      </span>
                      <Check className="w-3 h-3 text-[#4ade80]" />
                    </div>
                    <span className="text-xl font-bold text-[#f8fafc]">
                      {nft.name.replace(/^.*#/, 'Guardian #')}
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-[#94a3b8]">Unit Price</span>
                      <span className="text-sm font-bold text-[#f8fafc]">{nft.price} GFT</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Purchase Summary */}
              <div className="flex flex-col gap-4">
                <span className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider">
                  Purchase Summary
                </span>
                <div className="bg-[#0f172a] border border-[#1e293b]/50 rounded-2xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-4 border-b border-[#1e293b]/30">
                    <span className="text-sm text-[#94a3b8]">Item Price</span>
                    <span className="text-sm font-bold text-[#f8fafc]">{nft.price.toFixed(2)} GFT</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-4 border-b border-[#1e293b]/30">
                    <span className="text-sm text-[#94a3b8]">Network Fee</span>
                    <span className="text-sm font-bold text-[#f8fafc]">{networkFee.toFixed(2)} GFT</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-5 bg-[#14532d]/10">
                    <span className="text-sm font-bold text-[#f8fafc]">Total Payment</span>
                    <div className="flex flex-col items-end">
                      <span className="text-lg font-bold text-[#4ade80]">{totalAmount.toFixed(2)} GFT</span>
                      <span className="text-[10px] text-[#94a3b8]">≈ ${(totalAmount * 4.44).toFixed(2)} USD</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Wallet Balance */}
              <div className="flex flex-col gap-4">
                <span className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider">
                  Wallet Balance
                </span>
                <div className="bg-[#0f172a] border border-[#1e293b]/50 rounded-2xl p-4 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#1e293b] flex items-center justify-center">
                        <Wallet className="w-5 h-5 text-[#4ade80]" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-[#f8fafc]">Personal Wallet</span>
                        <span className="text-[10px] font-mono text-[#94a3b8]">{walletAddress}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-bold text-[#f8fafc]">{userBalance.toFixed(2)} GFT</span>
                      <span className="text-[10px] text-[#94a3b8]">Available</span>
                    </div>
                  </div>
                  
                  {hasEnoughBalance ? (
                    <div className="flex items-center gap-2 px-3 py-2 bg-[#4ade80]/10 rounded-2xl">
                      <CheckCircle className="w-4 h-4 text-[#4ade80]" />
                      <span className="text-xs text-[#4ade80]">Sufficient balance for this transaction</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 rounded-2xl">
                      <span className="text-xs text-red-400">
                        Insufficient balance. You need {(totalAmount - userBalance).toFixed(2)} more GFT.
                      </span>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* Footer Actions */}
          <div className="border-t border-[#1e293b]/50 px-6 py-6 flex flex-col gap-3 bg-[#020617]">
            <Button
              onClick={handleConfirmPurchase}
              disabled={!hasEnoughBalance || purchaseMutation.isPending}
              className="w-full h-[60px] rounded-2xl bg-[#4ade80] hover:bg-[#22c55e] text-[#022c22] text-lg font-bold shadow-[0_4px_6px_-4px_rgba(74,222,128,0.2),0_10px_15px_-3px_rgba(74,222,128,0.2)]"
              data-testid="button-confirm-purchase"
            >
              {purchaseMutation.isPending ? "Processing..." : "Confirm Purchase"}
            </Button>
            <button
              onClick={() => setStep('details')}
              className="w-full h-[52px] text-sm font-bold text-[#94a3b8] hover:text-[#f8fafc] transition-colors"
            >
              Cancel Transaction
            </button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Details Screen (default)
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent 
        className="bg-[#020617] border-none text-white p-0 max-w-[430px] w-full h-[90vh] max-h-[900px] overflow-hidden flex flex-col [&>button]:hidden"
        data-testid="dialog-nft-purchase"
      >
        <div 
          className="flex-1 overflow-y-auto"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>
          <div className="hide-scrollbar flex flex-col">
            
            {/* Header with back button */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-[#020617]/80 backdrop-blur-md">
              <button
                onClick={handleClose}
                className="w-10 h-10 rounded-full hover:bg-[#1e293b]/50 flex items-center justify-center transition-colors"
              >
                <ArrowLeft className="h-6 w-6 text-white/50" />
              </button>
              <span className="text-lg font-bold text-[#f8fafc]">NFT Details</span>
              <div className="w-10 h-10" />
            </div>

            {/* NFT Image Section */}
            <div className="flex justify-center items-center px-4 py-2">
              <div className="relative w-[398px] h-[398px] rounded-3xl overflow-hidden shadow-[0_25px_50px_-12px_rgba(74,222,128,0.05)]">
                <img
                  src={nft.image}
                  alt={nft.name}
                  className="w-full h-full object-cover"
                  data-testid="img-nft-preview"
                />
                {/* Verified Asset Badge */}
                <div className="absolute top-4 left-4 backdrop-blur-md bg-black/40 rounded-2xl px-3 py-1.5 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#4ade80]" />
                  <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                    Verified Asset
                  </span>
                </div>
              </div>
            </div>

            {/* Content Section */}
            <div className="flex flex-col gap-6 px-6 py-6">
              
              {/* Collection & NFT Info */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#4ade80]">Cyber Guardians</span>
                  <Check className="w-4 h-4 text-[#4ade80]" />
                </div>
                <h1 className="text-3xl font-bold text-[#f8fafc]" data-testid="text-nft-name">
                  {nft.name.replace(/^.*#/, 'Guardian #')}
                </h1>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 border-2 border-[#020617]" />
                  <span className="text-sm text-[#94a3b8]">Owned by</span>
                  <span className="text-sm text-[#f8fafc]">{nft.owner}</span>
                </div>
              </div>

              {/* Price Card */}
              <div className="bg-[#0f172a] border border-[#1e293b]/50 rounded-2xl p-5 flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider">
                      Current Price
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-[#f8fafc]">{nft.price} GFT</span>
                    </div>
                    <span className="text-sm text-[#94a3b8]">${nft.priceUSD.toFixed(2)}</span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider">
                      Ending In
                    </span>
                    <span className="text-sm font-bold text-[#4ade80]">2h 45m 02s</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-3">
                  <Button
                    onClick={handleProceedToCheckout}
                    className="w-full h-[60px] rounded-2xl bg-[#4ade80] hover:bg-[#22c55e] text-[#022c22] text-lg font-bold shadow-[0_4px_6px_-4px_rgba(74,222,128,0.2),0_10px_15px_-3px_rgba(74,222,128,0.2)]"
                    data-testid="button-buy-nft"
                  >
                    Buy NFT Now
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full h-[58px] rounded-2xl bg-[#1e293b] hover:bg-[#334155] border border-[#1e293b]/50 text-[#f8fafc] text-base font-bold flex items-center justify-center gap-2"
                  >
                    <img src={gfTokenLogo} alt="GF" className="w-5 h-5" />
                    Sell To Gamefolio
                  </Button>
                </div>
              </div>

              {/* Properties Section */}
              <div className="flex flex-col gap-4">
                <span className="text-sm font-bold text-[#94a3b8] uppercase tracking-wider">
                  Properties
                </span>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Background", value: "Neon Void", percent: "8% have this" },
                    { label: "Armor", value: "Quantum Plating", percent: "5% have this" },
                    { label: "Eyes", value: "Laser Sight", percent: "5% have this" },
                    { label: "Special", value: "Aura Glow", percent: "5% have this" },
                  ].map((prop) => (
                    <div
                      key={prop.label}
                      className="bg-[#0f172a] border border-[#1e293b]/50 rounded-2xl p-3 flex flex-col gap-1"
                    >
                      <span className="text-[10px] font-bold text-[#94a3b8] uppercase">
                        {prop.label}
                      </span>
                      <span className="text-sm text-[#f8fafc]">{prop.value}</span>
                      <span className="text-[10px] text-[#4ade80]">{prop.percent}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Details Section */}
              <div className="flex flex-col gap-4">
                <span className="text-sm font-bold text-[#94a3b8] uppercase tracking-wider">
                  Details
                </span>
                <div className="bg-[#0f172a] border border-[#1e293b]/50 rounded-2xl overflow-hidden">
                  {[
                    { label: "Contract Address", value: contractAddress, mono: true, link: true },
                    { label: "Token ID", value: tokenId, mono: true },
                    { label: "Blockchain", value: "SKALE Nebula" },
                    { label: "Token Standard", value: "ERC-721" },
                  ].map((detail, idx) => (
                    <div
                      key={detail.label}
                      className={`flex items-center justify-between px-4 py-4 ${
                        idx < 3 ? "border-b border-[#1e293b]/30" : ""
                      }`}
                    >
                      <span className="text-sm text-[#94a3b8]">{detail.label}</span>
                      <div className="flex items-center gap-1">
                        <span
                          className={`text-sm ${
                            detail.link ? "text-[#4ade80]" : "text-[#f8fafc]"
                          } ${detail.mono ? "font-mono" : ""}`}
                        >
                          {detail.value}
                        </span>
                        {detail.link && (
                          <ExternalLink className="w-3 h-3 text-[#4ade80]" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
