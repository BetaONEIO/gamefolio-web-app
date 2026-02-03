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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  const [step, setStep] = useState<'details' | 'checkout' | 'success'>('details');
  const [transactionHash, setTransactionHash] = useState<string>('');
  
  // Fetch level progress for success screen
  const { data: levelProgress } = useQuery<{
    level: number;
    currentXP: number;
    currentPoints: number;
    pointsForCurrentLevel: number;
    pointsForNextLevel: number;
    pointsRemaining: number;
    progressPercent: number;
  }>({
    queryKey: ["/api/user", user?.id, "level-progress"],
    queryFn: async () => {
      if (!user?.id) throw new Error("No user");
      const response = await fetch(`/api/user/${user.id}/level-progress`);
      if (!response.ok) throw new Error("Failed to fetch level progress");
      return response.json();
    },
    enabled: !!user?.id && step === 'success',
  });

  const purchaseMutation = useMutation({
    mutationFn: async (data: { nftId: number }) => {
      const response = await apiRequest("POST", "/api/nft/purchase", data);
      return response.json();
    },
    onSuccess: (data: { transactionHash?: string }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setTransactionHash(data?.transactionHash || `0x${Math.random().toString(16).slice(2, 10)}...${Math.random().toString(16).slice(2, 6)}`);
      setStep('success');
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
                  {/* Network Fee row - 53px height */}
                  <div className="flex items-center justify-between px-4 h-[53px] border-b border-[#1e293b]/30">
                    <span className="text-sm text-[#94a3b8]">Network Fee</span>
                    <span className="text-sm font-bold text-[#f8fafc]">{networkFee.toFixed(2)} GFT</span>
                  </div>
                  {/* Total Payment row - 75px height, green tinted bg */}
                  <div className="flex items-center justify-between px-4 h-[75px] bg-[#14532d]/10">
                    <span className="text-sm font-bold text-[#f8fafc]">Total Payment</span>
                    <div className="flex flex-col items-end">
                      <span className="text-lg font-bold text-[#4ade80] leading-7">{totalAmount.toFixed(2)} GFT</span>
                      <span className="text-[10px] text-[#94a3b8]">≈ ${(totalAmount * 4.44).toFixed(2)} USD</span>
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

  // Success Screen - Level Progress Popup
  if (step === 'success') {
    const handleContinue = () => {
      setStep('details');
      onOpenChange(false);
      onPurchaseComplete?.();
    };

    // Use real level data from user profile
    const currentLevel = levelProgress?.level || user?.level || 1;
    const nextLevel = currentLevel + 1;
    const currentXP = levelProgress?.pointsRemaining ? (levelProgress.pointsForNextLevel - levelProgress.pointsRemaining) : 0;
    const xpToNextLevel = levelProgress?.pointsForNextLevel || 3000;
    const totalXP = Math.round(levelProgress?.currentPoints || 0);
    const progressPercent = levelProgress?.progressPercent || 0;
    
    // Calculate stroke dashoffset for circular progress
    const circumference = 2 * Math.PI * 100; // radius = 100
    const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent 
          className="bg-transparent border-none text-white p-0 max-w-[430px] w-full h-[90vh] max-h-[900px] overflow-hidden flex flex-col items-center justify-center [&>button]:hidden"
          data-testid="dialog-level-progress"
        >
          {/* Background with NFT image blur */}
          <div className="absolute inset-0 z-0">
            <img
              src={nft.image}
              alt=""
              className="w-full h-full object-cover opacity-30 blur-sm"
            />
            <div className="absolute inset-0 bg-[#020617]/60" />
          </div>

          {/* Modal Card */}
          <div className="relative z-10 bg-[#0f172a] border border-[#1e293b] rounded-3xl w-[382px] overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] flex flex-col">
            
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4">
              <span className="text-2xl font-bold text-[#f8fafc]">Level Progress</span>
              <button
                onClick={handleContinue}
                className="w-10 h-10 rounded-full bg-[#1e293b] border border-[#1e293b] flex items-center justify-center hover:bg-[#334155] transition-colors"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" clipRule="evenodd" d="M22 12C22 17.523 17.523 22 12 22C6.477 22 2 17.523 2 12C2 6.477 6.477 2 12 2C17.523 2 22 6.477 22 12ZM8.97 8.97C9.26282 8.67755 9.73718 8.67755 10.03 8.97L12 10.94L13.97 8.97C14.2655 8.69464 14.726 8.70277 15.0116 8.98838C15.2972 9.27399 15.3054 9.73449 15.03 10.03L13.06 12L15.03 13.97C15.3054 14.2655 15.2972 14.726 15.0116 15.0116C14.726 15.2972 14.2655 15.3054 13.97 15.03L12 13.06L10.03 15.03C9.73449 15.3054 9.27399 15.2972 8.98838 15.0116C8.70277 14.726 8.69464 14.2655 8.97 13.97L10.94 12L8.97 10.03C8.67755 9.73718 8.67755 9.26282 8.97 8.97Z" fill="#94A3B8" />
                </svg>
              </button>
            </div>

            {/* Circular Progress with Level */}
            <div className="flex flex-col items-center justify-center py-8">
              <div className="relative w-56 h-56 flex items-center justify-center">
                {/* Background Circle */}
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 224 224">
                  <circle
                    cx="112"
                    cy="112"
                    r="100"
                    stroke="#1E293B"
                    strokeWidth="12"
                    fill="none"
                  />
                  {/* Progress Circle */}
                  <circle
                    cx="112"
                    cy="112"
                    r="100"
                    stroke="#4ADE80"
                    strokeWidth="12"
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                
                {/* Center Content */}
                <div className="flex flex-col items-center justify-center z-10">
                  {/* Trophy Icon */}
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" clipRule="evenodd" d="M36.6663 13.6034V13.725C36.6663 15.1584 36.6663 15.8767 36.3213 16.4634C35.9763 17.05 35.348 17.3984 34.0946 18.0967L32.773 18.83C33.683 15.75 33.988 12.44 34.0996 9.61003L34.1163 9.2417L34.1196 9.15503C35.2046 9.5317 35.8146 9.81336 36.1946 10.34C36.6663 10.995 36.6663 11.865 36.6663 13.6034Z" fill="#EF4444" />
                    <path fillRule="evenodd" clipRule="evenodd" d="M3.33301 13.6034V13.725C3.33301 15.1584 3.33301 15.8767 3.67801 16.4634C4.02301 17.05 4.65134 17.3984 5.90467 18.0967L7.228 18.83C6.31634 15.75 6.01134 12.44 5.89967 9.61003L5.883 9.2417L5.88134 9.15503C4.79467 9.5317 4.18467 9.81336 3.80467 10.34C3.33301 10.995 3.33301 11.8667 3.33301 13.6034Z" fill="#EF4444" />
                    <path fillRule="evenodd" clipRule="evenodd" d="M19.9566 3.33301C22.9299 3.33301 25.3783 3.59468 27.2517 3.91135C29.15 4.23135 30.0983 4.39135 30.8917 5.36803C31.685 6.34471 31.6417 7.39972 31.5584 9.50974C31.2717 16.7582 29.7083 25.8099 21.2066 26.6099V32.5H23.5899C24.3841 32.5005 25.0676 33.0612 25.2233 33.84L25.54 35.4167H29.9567C30.647 35.4167 31.2067 35.9763 31.2067 36.6667C31.2067 37.3571 30.647 37.9167 29.9567 37.9167H9.95646C9.2661 37.9167 8.70645 37.357 8.70645 36.6667C8.70645 35.9763 9.2661 35.4167 9.95646 35.4167H14.3732L14.6899 33.84C14.8455 33.0612 15.5291 32.5005 16.3232 32.5H18.7066V26.6099C10.2049 25.8099 8.64156 16.7582 8.35489 9.50974C8.27156 7.39972 8.22823 6.34471 9.02156 5.36803C9.8149 4.39135 10.7632 4.23135 12.6616 3.91135C14.5349 3.59468 16.9832 3.33301 19.9566 3.33301Z" fill="#EF4444" />
                  </svg>
                  {/* Level Number */}
                  <span className="text-[60px] font-black text-[#f8fafc] leading-[60px] mt-2">
                    {currentLevel}
                  </span>
                  {/* Level Label */}
                  <span className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider">
                    Level
                  </span>
                </div>
              </div>
            </div>

            {/* XP Progress Info */}
            <div className="flex flex-col items-center gap-2 px-6 pb-6">
              <div className="flex items-center gap-1">
                <span className="text-xl font-bold text-[#ef4444]">{currentXP}</span>
                <span className="text-xl font-medium text-[#94a3b8]">/</span>
                <span className="text-xl font-medium text-[#f8fafc]">{xpToNextLevel} XP to Level</span>
                <span className="text-xl font-bold text-[#f8fafc]">{nextLevel}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium text-[#94a3b8]">Total XP:</span>
                <span className="text-sm font-bold text-[#f8fafc]">{totalXP}</span>
              </div>

              {/* Progress Bar Segments */}
              <div className="flex items-center gap-1 w-full max-w-[316px] mt-4">
                {[1, 2, 3, 4, 5].map((segment) => (
                  <div
                    key={segment}
                    className={`flex-1 h-1.5 rounded-full ${
                      segment <= 4 ? 'bg-[#4ade80]' : 'bg-[#1e293b]'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Rarity Counts */}
            <div className="flex items-center justify-center gap-4 px-6 pb-4 border-t border-[#1e293b]">
              <div className="flex items-center gap-2 px-4 py-3">
                <span className="text-lg font-bold text-[#f8fafc]">0</span>
                <span className="text-sm font-medium text-[#a855f7]">Legendary</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-3">
                <span className="text-lg font-bold text-[#f8fafc]">0</span>
                <span className="text-sm font-medium text-[#ec4899]">Epic</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-3">
                <span className="text-lg font-bold text-[#f8fafc]">0</span>
                <span className="text-sm font-medium text-[#4ade80]">Rare</span>
              </div>
            </div>

            {/* Continue Button */}
            <div className="p-6 pt-0">
              <Button
                onClick={handleContinue}
                className="w-full h-[60px] rounded-2xl bg-[#4ade80] hover:bg-[#22c55e] text-[#022c22] text-lg font-bold shadow-[0_4px_6px_-4px_rgba(0,0,0,0.1),0_10px_15px_-3px_rgba(0,0,0,0.1)]"
              >
                Continue
              </Button>
            </div>
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
