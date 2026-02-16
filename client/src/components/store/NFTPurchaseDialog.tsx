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
  priceGBP: number;
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
  const [transactionHash, setTransactionHash] = useState<string>('');

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
  const networkFee = 0;
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

  // Verified badge SVG from Figma
  const VerifiedBadge = () => (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M4.76313 1.47997C4.68207 1.55272 4.59721 1.62113 4.5089 1.6849C4.35585 1.78762 4.18379 1.85849 4.00301 1.89444C3.92443 1.90985 3.84225 1.91653 3.67841 1.92937C3.26702 1.96224 3.06107 1.97867 2.88953 2.03928C2.49214 2.17935 2.17959 2.49189 2.03952 2.88928C1.97892 3.06083 1.96248 3.26678 1.92961 3.67817C1.92371 3.78691 1.91206 3.89526 1.89469 4.00276C1.85874 4.18355 1.78786 4.35561 1.68514 4.50866C1.64046 4.57543 1.58704 4.63809 1.48021 4.76289C1.21263 5.07721 1.07858 5.23437 1 5.39872C0.8187 5.77879 0.8187 6.22048 1 6.60054C1.07858 6.76489 1.21263 6.92206 1.48021 7.23638C1.58704 7.36118 1.64046 7.42384 1.68514 7.49061C1.78786 7.64366 1.85874 7.81572 1.89469 7.9965C1.9101 8.07508 1.91677 8.15726 1.92961 8.3211C1.96248 8.73249 1.97892 8.93844 2.03952 9.10998C2.17959 9.50737 2.49214 9.81992 2.88953 9.95999C3.06107 10.0206 3.26702 10.037 3.67841 10.0699C3.84225 10.0827 3.92443 10.0894 4.00301 10.1048C4.18379 10.1408 4.35585 10.2122 4.5089 10.3144C4.57567 10.3591 4.63833 10.4125 4.76313 10.5193C5.07746 10.7869 5.23462 10.9209 5.39897 10.9995C5.77903 11.1808 6.22072 11.1808 6.60079 10.9995C6.76514 10.9209 6.9223 10.7869 7.23662 10.5193C7.36143 10.4125 7.42409 10.3591 7.49085 10.3144C7.64391 10.2117 7.81596 10.1408 7.99675 10.1048C8.07533 10.0894 8.1575 10.0827 8.32134 10.0699C8.73273 10.037 8.93869 10.0206 9.11023 9.95999C9.50762 9.81992 9.82016 9.50737 9.96023 9.10998C10.0208 8.93844 10.0373 8.73249 10.0701 8.3211C10.083 8.15726 10.0897 8.07508 10.1051 7.9965C10.141 7.81572 10.2124 7.64366 10.3146 7.49061C10.3593 7.42384 10.4127 7.36118 10.5195 7.23638C10.7871 6.92206 10.9212 6.76489 10.9998 6.60054C11.1811 6.22048 11.1811 5.77879 10.9998 5.39872C10.9212 5.23437 10.7871 5.07721 10.5195 4.76289C10.4468 4.68183 10.3784 4.59696 10.3146 4.50866C10.2118 4.35563 10.1406 4.18365 10.1051 4.00276C10.0877 3.89526 10.076 3.78691 10.0701 3.67817C10.0373 3.26678 10.0208 3.06083 9.96023 2.88928C9.82016 2.49189 9.50762 2.17935 9.11023 2.03928C8.93869 1.97867 8.73273 1.96224 8.32134 1.92937C8.1575 1.91653 8.07533 1.90985 7.99675 1.89444C7.81596 1.85849 7.64391 1.78762 7.49085 1.6849C7.42409 1.62113 7.36143 1.55272 7.23662 1.47997C6.9223 1.21263 6.76514 1.07858 6.60079 1C6.22072 0.8187 5.77903 0.8187 5.39897 1C5.23462 1.07858 5.07746 1.21263 4.76313 1.47997ZM8.35355 5.35355C8.54882 5.15829 8.54882 4.84171 8.35355 4.64645C8.15829 4.45118 7.84171 4.45118 7.64645 4.64645L5.5 6.79289L4.35355 5.64645C4.15829 5.45118 3.84171 5.45118 3.64645 5.64645C3.45118 5.84171 3.45118 6.15829 3.64645 6.35355L5.14645 7.85355C5.34171 8.04882 5.65829 8.04882 5.85355 7.85355L8.35355 5.35355Z" fill="#4ADE80"/>
    </svg>
  );

  // Wallet icon SVG from Figma
  const WalletIcon = () => (
    <svg width="18" height="15" viewBox="0 0 18 15" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M15.9164 4.16984C15.8691 4.16706 15.8189 4.16595 15.7655 4.1665H13.6614C11.938 4.1665 10.4639 5.52317 10.4639 7.2915C10.4639 9.05984 11.9389 10.4165 13.6614 10.4165H15.7655C15.8189 10.4171 15.8694 10.4159 15.9172 10.4132C16.6498 10.369 17.2363 9.78864 17.288 9.0565C17.2914 9.0065 17.2914 8.95234 17.2914 8.90234V5.68067C17.2914 5.63067 17.2914 5.5765 17.288 5.5265C17.2363 4.79437 16.649 4.21401 15.9164 4.16984ZM13.4772 8.12484C13.9205 8.12484 14.2797 7.7515 14.2797 7.2915C14.2797 6.8315 13.9205 6.45817 13.4772 6.45817C13.033 6.45817 12.6739 6.8315 12.6739 7.2915C12.6739 7.7515 13.033 8.12484 13.4772 8.12484Z" fill="#4ADE80" />
      <path fillRule="evenodd" clipRule="evenodd" d="M15.765 11.6667C15.8234 11.6643 15.8795 11.69 15.9158 11.7357C15.9522 11.7815 15.9646 11.8419 15.9491 11.8983C15.7825 12.4916 15.5166 12.9983 15.0908 13.4233C14.4666 14.0483 13.6758 14.3241 12.6991 14.4558C11.7492 14.5833 10.5367 14.5833 9.00499 14.5833H7.24499C5.71333 14.5833 4.49999 14.5833 3.55083 14.4558C2.57416 14.3241 1.78333 14.0475 1.15917 13.4241C0.535833 12.8 0.259166 12.0092 0.1275 11.0325C0 10.0825 0 8.86999 0 7.33832V7.24499C0 5.71333 0 4.49999 0.1275 3.54999C0.259166 2.57333 0.535833 1.7825 1.15917 1.15833C1.78333 0.534999 2.57416 0.258333 3.55083 0.126666C4.50083 0 5.71333 0 7.24499 0H9.00499C10.5367 0 11.75 0 12.6991 0.1275C13.6758 0.259166 14.4666 0.535833 15.0908 1.15917C15.5166 1.58583 15.7825 2.09166 15.9491 2.685C15.9646 2.74139 15.9522 2.80179 15.9158 2.84756C15.8795 2.89334 15.8234 2.91901 15.765 2.91666H13.6616C11.2975 2.91666 9.21415 4.78333 9.21415 7.29166C9.21415 9.79999 11.2975 11.6667 13.6616 11.6667H15.765ZM4.16666 10.4167C3.82148 10.4167 3.54166 10.1368 3.54166 9.79165V4.79166C3.54166 4.44648 3.82148 4.16666 4.16666 4.16666C4.51184 4.16666 4.79166 4.44648 4.79166 4.79166V9.79165C4.79166 10.1368 4.51184 10.4167 4.16666 10.4167Z" fill="#4ADE80" />
    </svg>
  );

  // Checkmark circle SVG from Figma
  const CheckmarkCircle = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M14.6663 7.99992C14.6663 11.6819 11.6817 14.6666 7.99967 14.6666C4.31767 14.6666 1.33301 11.6819 1.33301 7.99992C1.33301 4.31792 4.31767 1.33325 7.99967 1.33325C11.6817 1.33325 14.6663 4.31792 14.6663 7.99992ZM10.6863 5.97992C10.8813 6.17513 10.8813 6.49137 10.6863 6.68658L7.35301 10.0199C7.1578 10.2149 6.84155 10.2149 6.64634 10.0199L5.31301 8.68658C5.17924 8.56194 5.12417 8.37421 5.16942 8.19706C5.21466 8.0199 5.35299 7.88157 5.53015 7.83633C5.7073 7.79109 5.89503 7.84615 6.01967 7.97992L6.99967 8.95992L8.48967 7.46992L9.97967 5.97992C10.1749 5.78495 10.4911 5.78495 10.6863 5.97992Z" fill="#4ADE80" />
    </svg>
  );

  // Checkout Screen
  if (step === 'checkout') {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent 
          className="bg-[#020617] border-none text-white p-0 max-w-[430px] w-full h-[90vh] max-h-[900px] overflow-hidden flex flex-col [&>button]:hidden"
          data-testid="dialog-nft-checkout"
        >
          {/* Header - left aligned */}
          <div className="flex items-center gap-4 px-4 pt-12 pb-4 bg-[#020617]/80 backdrop-blur-md">
            <button
              onClick={() => setStep('details')}
              className="w-10 h-10 rounded-full hover:bg-[#1e293b]/50 flex items-center justify-center transition-colors"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 12H4M4 12L10 6M4 12L10 18" stroke="#F8FAFC" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <span className="text-xl font-bold text-[#f8fafc] uppercase tracking-tight" style={{ letterSpacing: '-0.5px' }}>
              Checkout
            </span>
          </div>

          {/* Scrollable Content - gap: 32px between sections */}
          <div 
            className="flex-1 overflow-y-auto"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>
            <div className="hide-scrollbar flex flex-col gap-8 px-6 py-4 pb-7">
              
              {/* Item Details - matches Container_65_614 */}
              <div className="flex flex-col gap-4">
                <span className="text-xs font-bold text-[#94a3b8] uppercase" style={{ letterSpacing: '1.2px' }}>
                  Item details
                </span>
                <div className="bg-[#0f172a] border border-[#1e293b]/50 rounded-2xl p-[17px] flex items-center gap-4 h-[130px]">
                  {/* 96x96 image */}
                  <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0">
                    <img
                      src={nft.image}
                      alt={nft.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {/* Info column */}
                  <div className="flex flex-col justify-center">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[10px] font-bold text-[#4ade80] uppercase" style={{ letterSpacing: '0.5px' }}>
                        Cyber Guardians
                      </span>
                      <VerifiedBadge />
                    </div>
                    <span className="text-xl font-bold text-[#f8fafc] leading-7">
                      {nft.name.replace(/^.*#/, 'Guardian #')}
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-[#94a3b8]">Unit Price</span>
                      <span className="text-sm font-bold text-[#f8fafc]">{nft.price} GFT</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Purchase Summary - matches Container_65_633 */}
              <div className="flex flex-col gap-4">
                <span className="text-xs font-bold text-[#94a3b8] uppercase" style={{ letterSpacing: '1.2px' }}>
                  Purchase Summary
                </span>
                <div className="bg-[#0f172a] border border-[#1e293b]/50 rounded-2xl overflow-hidden">
                  {/* Item Price row - 53px height */}
                  <div className="flex items-center justify-between px-4 h-[53px] border-b border-[#1e293b]/30">
                    <span className="text-sm text-[#94a3b8]">Item Price</span>
                    <span className="text-sm font-bold text-[#f8fafc]">{nft.price.toFixed(2)} GFT</span>
                  </div>
                  {/* Gas (sFUEL) row - 53px height */}
                  <div className="flex items-center justify-between px-4 h-[53px] border-b border-[#1e293b]/30">
                    <span className="text-sm text-[#94a3b8]">Gas (sFUEL)</span>
                    <span className="text-sm font-bold text-[#4ade80]">Free</span>
                  </div>
                  {/* Total Payment row - 75px height, green tinted bg */}
                  <div className="flex items-center justify-between px-4 h-[75px] bg-[#14532d]/10">
                    <span className="text-sm font-bold text-[#f8fafc]">Total Payment</span>
                    <div className="flex flex-col items-end">
                      <span className="text-lg font-bold text-[#4ade80] leading-7">{totalAmount.toFixed(2)} GFT</span>
                      <span className="text-[10px] text-[#94a3b8]">≈ £{(totalAmount * 0.01).toFixed(2)} GBP</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Wallet Balance - matches Container_65_655 */}
              <div className="flex flex-col gap-4">
                <span className="text-xs font-bold text-[#94a3b8] uppercase" style={{ letterSpacing: '1.2px' }}>
                  Wallet Balance
                </span>
                <div className="bg-[#0f172a] border border-[#1e293b]/50 rounded-2xl p-[17px] flex flex-col gap-4">
                  {/* Wallet row */}
                  <div className="flex items-center justify-between h-10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#1e293b] flex items-center justify-center">
                        <WalletIcon />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-[#f8fafc] leading-5">Personal Wallet</span>
                        <span className="text-[10px] font-mono text-[#94a3b8] leading-[15px]">{walletAddress}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-bold text-[#f8fafc] leading-5">{userBalance.toFixed(2)} GFT</span>
                      <span className="text-[10px] text-[#94a3b8] leading-[15px]">Available</span>
                    </div>
                  </div>
                  
                  {/* Balance status indicator */}
                  {hasEnoughBalance ? (
                    <div className="flex items-center gap-2 px-3 py-2 bg-[#4ade80]/10 rounded-2xl h-8">
                      <CheckmarkCircle />
                      <span className="text-xs text-[#4ade80]">Sufficient balance for this transaction</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 rounded-2xl h-8">
                      <span className="text-xs text-red-400">
                        Insufficient balance. You need {(totalAmount - userBalance).toFixed(2)} more GFT.
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons - inside scrollable content */}
              <div className="flex flex-col gap-3 pt-4">
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

            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const rarityColor = nft.rarity?.toLowerCase() === 'legendary' ? '#f0b100'
    : nft.rarity?.toLowerCase() === 'epic' ? '#a855f7'
    : nft.rarity?.toLowerCase() === 'rare' ? '#2b7fff'
    : '#94a3b8';

  const rarityChance = nft.rarity?.toLowerCase() === 'legendary' ? '0.05%'
    : nft.rarity?.toLowerCase() === 'epic' ? '0.5%'
    : nft.rarity?.toLowerCase() === 'rare' ? '5%'
    : '25%';

  const rarityRating = nft.rarity?.toLowerCase() === 'legendary' ? 98
    : nft.rarity?.toLowerCase() === 'epic' ? 85
    : nft.rarity?.toLowerCase() === 'rare' ? 70
    : 45;

  // Details Screen (default)
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent 
        className="bg-[#020617] border-none text-white p-0 max-w-[430px] w-full h-[90vh] max-h-[900px] overflow-hidden flex flex-col [&>button]:hidden"
        data-testid="dialog-nft-purchase"
      >
        <div 
          className="flex-1 overflow-y-auto relative"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>
          <div className="hide-scrollbar flex flex-col">
            
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 pt-12 pb-4 bg-[#020617]/80 backdrop-blur-md">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleClose}
                  className="w-10 h-10 rounded-full bg-[#1e293b]/50 flex items-center justify-center transition-colors hover:bg-[#1e293b]/80"
                >
                  <ArrowLeft className="h-6 w-6 text-white" />
                </button>
                <span className="text-xl font-bold text-[#f8fafc] uppercase" style={{ letterSpacing: '-0.5px' }}>
                  NFT Details
                </span>
              </div>
              <button className="w-10 h-10 rounded-full bg-[#1e293b]/50 flex items-center justify-center transition-colors hover:bg-[#1e293b]/80">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7 17L17 7M17 7H7M17 7V17" stroke="#F8FAFC" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            {/* NFT Image with overlay badges */}
            <div className="flex justify-center items-center px-4 py-2">
              <div className="relative w-full max-w-[398px] rounded-3xl overflow-hidden border border-white/10" style={{ boxShadow: `0 25px 50px -12px ${rarityColor}1a` }}>
                <img
                  src={nft.image}
                  alt={nft.name}
                  className="w-full aspect-[3/2] object-cover"
                  data-testid="img-nft-preview"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                
                {/* Bottom-left badges */}
                <div className="absolute bottom-4 left-4 flex items-center gap-2">
                  <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-full px-3 py-1.5 flex items-center gap-1.5">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" clipRule="evenodd" d="M1.16758 7.44269C1.33603 8.03137 1.78971 8.48448 2.69651 9.39127L3.77057 10.4653C5.34939 12.0447 6.13821 12.833 7.11837 12.833C8.09911 12.833 8.88793 12.0441 10.4662 10.4659C12.045 8.8871 12.8338 8.09828 12.8338 7.11754C12.8338 6.13738 12.045 5.34797 10.4668 3.76974L9.39268 2.69568C8.48531 1.78888 8.0322 1.33519 7.44352 1.16675C6.85484 0.997715 6.22977 1.1421 4.98022 1.43086L4.25948 1.59696C3.20772 1.83936 2.68183 1.96085 2.32147 2.32063C1.9611 2.68042 1.84078 3.20747 1.59779 4.25865L1.43111 4.97938C1.14293 6.22953 0.998546 6.85401 1.16699 7.44269M5.86236 4.18822C6.17047 4.48536 6.29418 4.92569 6.1859 5.33982C6.07761 5.75395 5.75419 6.07736 5.34006 6.18565C4.92593 6.29394 4.4856 6.17023 4.18846 5.86211C3.74041 5.39752 3.7471 4.65965 4.2035 4.20325C4.65989 3.74686 5.39776 3.74017 5.86236 4.18822ZM11.1024 6.9937L7.00627 11.0904C6.83347 11.2571 6.55892 11.2546 6.3892 11.0848C6.21948 10.9149 6.21723 10.6403 6.38413 10.4677L10.4797 6.37097C10.6516 6.19901 10.9304 6.19901 11.1024 6.37097C11.2743 6.54293 11.2743 6.82174 11.1024 6.9937Z" fill="white" />
                    </svg>
                    <span className="text-[10px] font-black text-white uppercase" style={{ letterSpacing: '1px' }}>Name Tag</span>
                  </div>
                  <div className="backdrop-blur-md border rounded-full px-3 py-1.5 flex items-center gap-1.5" style={{ background: `${rarityColor}20`, borderColor: `${rarityColor}50` }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" clipRule="evenodd" d="M5.33015 3.16619C6.07349 1.83323 6.44486 1.16675 7.00046 1.16675C7.55605 1.16675 7.92743 1.83323 8.67077 3.16619L8.8632 3.51116C9.07441 3.89017 9.18001 4.07967 9.34429 4.20463C9.50856 4.3296 9.7139 4.37595 10.1246 4.46864L10.4977 4.55313C11.941 4.87991 12.662 5.04301 12.8339 5.59509C13.0052 6.14658 12.5136 6.72212 11.5297 7.87262L11.2751 8.17007C10.9958 8.49686 10.8556 8.66055 10.7928 8.86237C10.7301 9.06478 10.7512 9.28303 10.7934 9.71894L10.8321 10.1161C10.9806 11.6515 11.0551 12.4189 10.6057 12.7598C10.1563 13.1006 9.4804 12.7897 8.12984 12.1678L7.77958 12.007C7.39589 11.8299 7.20404 11.7418 7.00046 11.7418C6.79688 11.7418 6.60503 11.8299 6.22133 12.007L5.87167 12.1678C4.52052 12.7897 3.84465 13.1006 3.39583 12.7603C2.94584 12.4189 3.02035 11.6515 3.16878 10.1161L3.2075 9.71953C3.24974 9.28303 3.27086 9.06478 3.2075 8.86296C3.14531 8.66055 3.00509 8.49686 2.72583 8.17066L2.47121 7.87262C1.48733 6.72271 0.995678 6.14717 1.16699 5.59509C1.33831 5.04301 2.06052 4.87933 3.50378 4.55313L3.87692 4.46864C4.28701 4.37595 4.49177 4.3296 4.65663 4.20463C4.82149 4.07967 4.92651 3.89017 5.13771 3.51116L5.33015 3.16619Z" fill={rarityColor} />
                    </svg>
                    <span className="text-[10px] font-black uppercase capitalize" style={{ letterSpacing: '1px', color: rarityColor }}>{nft.rarity}</span>
                  </div>
                </div>

                {/* Expand icon */}
                <button className="absolute bottom-4 right-4 backdrop-blur-md bg-white/10 border border-white/20 rounded-full w-10 h-10 flex items-center justify-center hover:bg-white/20 transition-colors">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M7.50033 12.5001L1.66699 18.3334M1.66699 18.3334H6.54783M1.66699 18.3334V13.4526M12.5003 7.50009L18.3337 1.66675M18.3337 1.66675H13.4528M18.3337 1.66675V6.54759" stroke="white" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content Section */}
            <div className="flex flex-col px-6 pt-4 pb-2">
              
              {/* Collection name */}
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-bold uppercase text-[#f0b100]" style={{ letterSpacing: '0.35px' }}>
                  Gamefolio Collection
                </span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" clipRule="evenodd" d="M6.3515 1.97329C6.24341 2.0703 6.13026 2.1615 6.01252 2.24653C5.80845 2.38349 5.57904 2.47799 5.338 2.52593C5.23322 2.54647 5.12365 2.55537 4.9052 2.57249C4.35668 2.61632 4.08208 2.63823 3.85335 2.71904C3.3235 2.9058 2.90677 3.32253 2.72001 3.85238C2.63921 4.0811 2.61729 4.3557 2.57347 4.90423C2.5656 5.04921 2.55006 5.19368 2.5269 5.33702C2.47897 5.57807 2.38446 5.80748 2.2475 6.01154C2.18793 6.10057 2.11671 6.18411 1.97427 6.35052C1.61749 6.76962 1.43876 6.97916 1.33398 7.1983C1.09225 7.70505 1.09225 8.29397 1.33398 8.80072C1.43876 9.01986 1.61749 9.22941 1.97427 9.6485C2.11671 9.81491 2.18793 9.89846 2.2475 9.98748C2.38446 10.1915 2.47897 10.421 2.5269 10.662C2.54745 10.7668 2.55635 10.8763 2.57347 11.0948C2.61729 11.6433 2.63921 11.9179 2.72001 12.1466C2.90677 12.6765 3.3235 13.0932 3.85335 13.28C4.08208 13.3608 4.35668 13.3827 4.9052 13.4265C5.12365 13.4437 5.23322 13.4526 5.338 13.4731C5.57904 13.521 5.80845 13.6162 6.01252 13.7525C6.10154 13.8121 6.18509 13.8833 6.3515 14.0257C6.77059 14.3825 6.98014 14.5612 7.19928 14.666C7.70603 14.9077 8.29495 14.9077 8.8017 14.666C9.02084 14.5612 9.23038 14.3825 9.64948 14.0257C9.81589 13.8833 9.89943 13.8121 9.98846 13.7525C10.1925 13.6155 10.4219 13.521 10.663 13.4731C10.7678 13.4526 10.8773 13.4437 11.0958 13.4265C11.6443 13.3827 11.9189 13.3608 12.1476 13.28C12.6775 13.0932 13.0942 12.6765 13.281 12.1466C13.3618 11.9179 13.3837 11.6433 13.4275 11.0948C13.4446 10.8763 13.4535 10.7668 13.4741 10.662C13.522 10.421 13.6172 10.1915 13.7535 9.98748C13.813 9.89846 13.8843 9.81491 14.0267 9.6485C14.3835 9.22941 14.5622 9.01986 14.667 8.80072C14.9087 8.29397 14.9087 7.70505 14.667 7.1983C14.5622 6.97916 14.3835 6.76962 14.0267 6.35052C13.9297 6.24244 13.8385 6.12929 13.7535 6.01154C13.6164 5.80751 13.5214 5.5782 13.4741 5.33702C13.4509 5.19368 13.4354 5.04921 13.4275 4.90423C13.3837 4.3557 13.3618 4.0811 13.281 3.85238C13.0942 3.32253 12.6775 2.9058 12.1476 2.71904C11.9189 2.63823 11.6443 2.61632 11.0958 2.57249C10.8773 2.55537 10.7678 2.54647 10.663 2.52593C10.4219 2.47799 10.1925 2.38349 9.98846 2.24653C9.89943 2.18696 9.81589 2.11574 9.64948 1.9733C9.23038 1.61652 9.02084 1.43779 8.8017 1.33301C8.29495 1.09128 7.70603 1.09128 7.19928 1.33301C6.98014 1.43779 6.77059 1.61652 6.3515 1.97329ZM10.5765 6.57647C10.8368 6.31616 10.8368 5.89405 10.5765 5.63373C10.3162 5.37342 9.89405 5.37342 9.63373 5.63373L7.10512 8.16235L6.57647 7.63373C6.31616 7.37342 5.89405 7.37342 5.63373 7.63373C5.37342 7.89405 5.37342 8.31616 5.63373 8.57647L6.63373 9.57647C6.89405 9.83679 7.31616 9.83679 7.57647 9.57647L10.5765 6.57647Z" fill="#4ade80" />
                </svg>
              </div>

              {/* NFT Name */}
              <h1 className="text-4xl font-black text-[#f8fafc] uppercase mb-3" style={{ letterSpacing: '-0.9px', lineHeight: '40px' }} data-testid="text-nft-name">
                {nft.name}
              </h1>

              {/* Owner & Viewers */}
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-[#1e293b]/30 rounded-full flex items-center gap-2 pr-4 pl-1 py-1">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 border-2 border-[#020617]" />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-[#94a3b8] leading-[10px]">Owner</span>
                    <span className="text-xs font-bold text-[#f8fafc] leading-4">{nft.owner}</span>
                  </div>
                </div>
                <div className="bg-[#1e293b]/30 border border-[#1e293b]/50 rounded-full flex items-center gap-2 px-3 py-1.5">
                  <svg width="16" height="11" viewBox="0 0 14 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" clipRule="evenodd" d="M0.849999 7.53066C0.283333 6.79466 0 6.42599 0 5.33333C0 4.24 0.283333 3.87266 0.849999 3.136C1.98133 1.66667 3.87866 0 6.66666 0C9.45466 0 11.352 1.66667 12.4833 3.136C13.05 3.87333 13.3333 4.24066 13.3333 5.33333C13.3333 6.42666 13.05 6.79399 12.4833 7.53066C11.352 8.99999 9.45466 10.6667 6.66666 10.6667C3.87866 10.6667 1.98133 8.99999 0.849999 7.53066Z" stroke="#94A3B8" strokeWidth="0.999999" />
                    <path fillRule="evenodd" clipRule="evenodd" d="M8.66699 5.33325C8.66699 6.43782 7.77156 7.33325 6.66699 7.33325C5.56242 7.33325 4.66699 6.43782 4.66699 5.33325C4.66699 4.22868 5.56242 3.33325 6.66699 3.33325C7.77156 3.33325 8.66699 4.22868 8.66699 5.33325Z" stroke="#94A3B8" />
                  </svg>
                  <span className="text-xs font-bold text-[#94a3b8]">1.2k active</span>
                </div>
              </div>

              {/* Description */}
              <div className="flex flex-col gap-3 mb-6">
                <span className="text-xs font-black text-[#94a3b8] uppercase" style={{ letterSpacing: '2.4px' }}>Description</span>
                <p className="text-sm text-[#94a3b8]/80 leading-[22.75px]">
                  The <span className="text-[#f8fafc]">{nft.name}</span> {nft.description || `name tag is a high-kinetic ${nft.rarity?.toLowerCase()} asset from the Gamefolio Collection series. It features adaptive luminescence that reacts to your profile activity, symbolizing unmatched speed and precision on the leaderboard.`}
                </p>
              </div>

              {/* Rarity Chance & Rating Cards */}
              <div className="flex gap-3 mb-6">
                <div className="flex-1 bg-[#0f172a] border border-[#1e293b]/50 rounded-2xl p-4 flex flex-col gap-2">
                  <span className="text-[10px] font-black text-[#94a3b8] uppercase" style={{ letterSpacing: '1px' }}>Rarity Chance</span>
                  <span className="text-2xl font-black text-[#f8fafc]">{rarityChance}</span>
                </div>
                <div className="flex-1 bg-[#0f172a] border rounded-2xl p-4 flex items-center gap-3 overflow-hidden" style={{ borderColor: `${rarityColor}20` }}>
                  <div className="flex flex-col gap-2 flex-1">
                    <span className="text-[10px] font-black text-[#94a3b8] uppercase" style={{ letterSpacing: '1px' }}>Rating</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black" style={{ color: rarityColor }}>{rarityRating}</span>
                      <span className="text-sm text-[#94a3b8]">/100</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 flex items-center justify-center">
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" clipRule="evenodd" d="M21.1373 17.4278C22.4106 15.1426 23.0483 14 23.9998 14C24.9513 14 25.589 15.1426 26.8624 17.4278L27.1923 18.0192C27.5544 18.669 27.7354 18.9929 28.0171 19.2061C28.2987 19.4214 28.6527 19.5018 29.3548 19.6607L29.9945 19.8056C32.4688 20.3648 33.706 20.6444 33.9997 21.5919C34.2954 22.5374 33.4505 23.5231 31.7647 25.4965L31.3282 26.0074C30.8494 26.5667 30.6101 26.8483 30.5034 27.1943C30.3928 27.5403 30.429 27.9145 30.5034 28.6628L30.5678 29.3427C30.8233 31.9739 30.95 33.2896 30.1796 33.8749C29.4091 34.4583 28.2524 33.9272 25.935 32.8611L25.3356 32.5835C24.6778 32.2817 24.3499 32.1288 23.9998 32.1288C23.6518 32.1288 23.3219 32.2817 22.6641 32.5835L22.0646 32.8611C19.7472 33.9272 18.5905 34.4603 17.8201 33.8749C17.0496 33.2916 17.1764 31.9739 17.4318 29.3427L17.4962 28.6628C17.5707 27.9145 17.6069 27.5403 17.4962 27.1943C17.3896 26.8483 17.1502 26.5667 16.6714 26.0074L16.2349 25.4965C14.5492 23.5251 13.7043 22.5394 14 21.5919C14.2937 20.6464 15.5288 20.3648 18.0032 19.8056L18.6449 19.6607C19.3489 19.4998 19.699 19.4214 19.9826 19.2081C20.2642 18.9929 20.4453 18.669 20.8074 18.0213L21.1373 17.4278Z" fill={rarityColor} />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Attributes */}
              <div className="flex flex-col gap-4 mb-6">
                <span className="text-xs font-black text-[#94a3b8] uppercase" style={{ letterSpacing: '2.4px' }}>Attributes</span>
                <div className="bg-[#1e293b]/20 border border-[#1e293b]/30 rounded-2xl p-4 flex items-center gap-3">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded-2xl bg-[#2b7fff]/10 border border-[#2b7fff]/20 flex items-center justify-center">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" clipRule="evenodd" d="M10 6V18C10 19.4 10 20.1 9.728 20.635C9.48811 21.1053 9.10549 21.4875 8.635 21.727C8.1 22 7.4 22 6 22C4.6 22 3.9 22 3.365 21.727C2.89451 21.1053 2.5119 21.1053 2.272 20.635C2 20.1 2 19.4 2 18V6C2 4.6 2 3.9 2.272 3.365C2.51173 2.89435 2.89435 2.51173 3.365 2.272C3.9 2 4.6 2 6 2C7.4 2 8.1 2 8.635 2.272C9.10565 2.51173 9.48828 2.89435 9.728 3.365C10 3.9 10 4.6 10 6Z" fill="#2B7FFF" />
                        <path d="M14 6V18C14 19.4 14 20.1 14.272 20.635C14.5119 21.1053 14.8945 21.4875 15.365 21.727C15.9 22 16.6 22 18 22C19.4 22 20.1 22 20.635 21.727C21.1053 21.4875 21.4875 21.1053 21.728 20.635C22 20.1 22 19.4 22 18V6C22 4.6 22 3.9 21.728 3.365C21.4881 2.89435 21.1055 2.51173 20.635 2.272C20.1 2 19.4 2 18 2C16.6 2 15.9 2 15.365 2.272C14.8943 2.51173 14.5117 2.89435 14.272 3.365C14 3.9 14 4.6 14 6Z" fill="#2B7FFF" opacity="0.4" />
                      </svg>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-[#f8fafc]">Midnight Frost</span>
                      <span className="text-[10px] text-[#94a3b8] uppercase" style={{ letterSpacing: '0.25px' }}>Color Theme</span>
                    </div>
                  </div>
                  <span className="text-xs font-black uppercase" style={{ color: '#2b7fff' }}>Rare</span>
                </div>
              </div>
            </div>

            {/* Sticky Bottom: Equip Button */}
            <div className="sticky bottom-0 bg-gradient-to-t from-[#020617] via-[#020617] to-transparent px-6 pt-4 pb-6 flex flex-col gap-4 items-center">
              <Button
                onClick={handleProceedToCheckout}
                className="w-full h-[68px] rounded-2xl text-black text-lg font-black uppercase"
                style={{
                  background: rarityColor,
                  boxShadow: `0 8px 10px -6px ${rarityColor}33, 0 20px 25px -5px ${rarityColor}33`,
                  letterSpacing: '-0.9px',
                }}
                data-testid="button-buy-nft"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
                  <path d="M3 3H5L5.4 5M7 13H17L21 5H5.4M7 13L5.4 5M7 13L4.707 15.293C4.077 15.923 4.523 17 5.414 17H17M17 17C15.895 17 15 17.895 15 19C15 20.105 15.895 21 17 21C18.105 21 19 20.105 19 19C19 17.895 18.105 17 17 17ZM9 19C9 20.105 8.105 21 7 21C5.895 21 5 20.105 5 19C5 17.895 5.895 17 7 17C8.105 17 9 17.895 9 19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Buy Now - {nft.price} GFT
              </Button>
              <span className="text-[10px] font-bold text-[#94a3b8] uppercase text-center" style={{ letterSpacing: '1px' }}>
                This asset is tradeable on the marketplace
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
