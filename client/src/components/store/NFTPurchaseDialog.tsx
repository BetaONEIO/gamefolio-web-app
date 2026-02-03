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
  const [step, setStep] = useState<'details' | 'checkout' | 'success'>('details');
  const [transactionHash, setTransactionHash] = useState<string>('');

  const purchaseMutation = useMutation({
    mutationFn: async (data: { nftId: number }) => {
      const response = await apiRequest("POST", "/api/nft/purchase", data);
      return response.json();
    },
    onSuccess: (data) => {
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

  // Success Screen
  if (step === 'success') {
    const handleViewDetails = () => {
      setStep('details');
    };

    const handleGoToMyNFTs = () => {
      setStep('details');
      onOpenChange(false);
      onPurchaseComplete?.();
    };

    const handleShare = () => {
      if (navigator.share) {
        navigator.share({
          title: `I just purchased ${nft.name}!`,
          text: `Check out my new NFT: ${nft.name}`,
          url: window.location.href,
        });
      }
    };

    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent 
          className="bg-[#020617] border-none text-white p-0 max-w-[430px] w-full h-[90vh] max-h-[900px] overflow-hidden flex flex-col [&>button]:hidden"
          data-testid="dialog-nft-success"
        >
          {/* Header - left aligned */}
          <div className="flex items-center justify-between px-4 pt-12 pb-4 bg-[#020617]/80 backdrop-blur-md">
            <div className="flex items-center gap-4">
              <button
                onClick={handleGoToMyNFTs}
                className="w-10 h-10 rounded-full bg-[#1e293b]/80 border border-[#1e293b]/50 flex items-center justify-center transition-colors hover:bg-[#1e293b]"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 12H4M4 12L10 6M4 12L10 18" stroke="#F8FAFC" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <span className="text-xl font-bold text-[#f8fafc] uppercase tracking-tight" style={{ letterSpacing: '-0.5px' }}>
                Success
              </span>
            </div>
            <button
              onClick={handleShare}
              className="w-10 h-10 rounded-full bg-[#1e293b]/80 border border-[#1e293b]/50 flex items-center justify-center transition-colors hover:bg-[#1e293b]"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" clipRule="evenodd" d="M11.5028 4.44413C11.5028 2.91079 12.7528 1.66663 14.2928 1.66663C15.0313 1.66463 15.7403 1.9562 16.2637 2.47713C16.7872 2.99806 17.0821 3.70565 17.0837 4.44413C17.0837 5.9783 15.8337 7.22247 14.2928 7.22247C13.5465 7.22301 12.831 6.9247 12.3062 6.39413L8.44367 9.02414C8.55104 9.55998 8.49829 10.1156 8.292 10.6216L12.527 13.405C13.026 12.9984 13.6501 12.7767 14.2937 12.7775C15.0321 12.7757 15.7411 13.0675 16.2643 13.5886C16.7876 14.1097 17.0824 14.8173 17.0837 15.5558C17.0837 17.0891 15.8337 18.3333 14.2928 18.3333C13.5545 18.3351 12.8457 18.0434 12.3225 17.5225C11.7992 17.0016 11.5044 16.2941 11.5028 15.5558C11.5022 15.1663 11.5843 14.7812 11.7437 14.4258L7.542 11.6666C7.03302 12.1088 6.38121 12.3518 5.707 12.3508C4.96852 12.3526 4.25961 12.0608 3.73634 11.5397C3.21306 11.0186 2.91832 10.3109 2.91699 9.57247C2.91854 8.83414 3.21338 8.12667 3.73663 7.60576C4.25988 7.08486 4.96866 6.7932 5.707 6.79497C6.59366 6.79497 7.382 7.2058 7.89283 7.8458L11.637 5.29663C11.5477 5.0213 11.5024 4.73359 11.5028 4.44413Z" fill="#F8FAFC" />
              </svg>
            </button>
          </div>

          {/* Scrollable Content */}
          <div 
            className="flex-1 overflow-y-auto"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>
            <div className="hide-scrollbar flex flex-col items-center px-6 py-6 gap-8">
              
              {/* Success Checkmark Animation */}
              <div className="relative w-32 h-32 flex items-center justify-center">
                <div className="absolute inset-0 bg-[#4ade80]/30 rounded-full blur-[32px]" />
                <div className="absolute inset-0 border-4 border-[#4ade80] rounded-full" />
                <div className="w-24 h-24 bg-[#4ade80] rounded-full flex items-center justify-center shadow-[0_25px_50px_-12px_rgba(74,222,128,0.4)]">
                  <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" clipRule="evenodd" d="M51.3336 28.0001C51.3336 40.8871 40.8873 51.3334 28.0003 51.3334C15.1133 51.3334 4.66699 40.8871 4.66699 28.0001C4.66699 15.1131 15.1133 4.66675 28.0003 4.66675C40.8873 4.66675 51.3336 15.1131 51.3336 28.0001ZM37.4037 20.9301C38.086 21.6133 38.086 22.7202 37.4037 23.4034L25.737 35.0701C25.0537 35.7525 23.9469 35.7525 23.2637 35.0701L18.597 30.4034C18.1288 29.9671 17.9361 29.3101 18.0944 28.6901C18.2528 28.07 18.7369 27.5859 19.357 27.4275C19.977 27.2692 20.6341 27.4619 21.0703 27.9301L24.5003 31.3601L29.7153 26.1451L34.9303 20.9301C35.6136 20.2477 36.7204 20.2477 37.4037 20.9301Z" fill="#022C22" />
                  </svg>
                </div>
              </div>

              {/* Title and Subtitle */}
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-[30px] font-bold text-[#f8fafc] leading-9">
                  Purchase Complete!
                </h1>
                <p className="text-sm text-[#94a3b8] leading-[22.75px] max-w-[284px]">
                  Your NFT has been successfully minted and transferred to your wallet.
                </p>
              </div>

              {/* NFT Card with Overlay */}
              <div className="relative w-full max-w-[380px]">
                <div className="bg-[#0f172a] border border-[#1e293b]/50 rounded-3xl overflow-hidden shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)]">
                  <div className="relative w-full aspect-square">
                    <img
                      src={nft.image}
                      alt={nft.name}
                      className="w-full h-full object-cover"
                    />
                    {/* Overlay at bottom */}
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="backdrop-blur-md bg-[#020617]/60 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-[#f8fafc]/70 uppercase tracking-wider">
                            Item Name
                          </span>
                          <span className="text-lg font-bold text-[#f8fafc]">
                            {nft.name.replace(/^.*#/, 'Guardian #')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 bg-[#4ade80]/20 border border-[#4ade80]/30 rounded-full px-3 py-1">
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path fillRule="evenodd" clipRule="evenodd" d="M8.55467 14.4517C10.6387 14.0344 13.3333 12.5351 13.3333 8.6584C13.3333 5.13106 10.7513 2.78173 8.89467 1.70239C8.48201 1.46239 8.00001 1.77773 8.00001 2.25439V3.47306C8.00001 4.4344 7.596 6.18906 6.47334 6.91906C5.9 7.29173 5.28 6.73373 5.21067 6.05373L5.15334 5.49506C5.08667 4.84573 4.42534 4.45173 3.90667 4.84773C2.974 5.55773 2 6.8044 2 8.65773C2 13.3984 5.526 14.5844 7.28867 14.5844C7.39178 14.5844 7.49934 14.5811 7.61134 14.5744C6.74067 14.5004 5.33334 13.9604 5.33334 12.2137C5.33334 10.8471 6.33 9.92373 7.08734 9.47373C7.29134 9.35373 7.52934 9.5104 7.52934 9.74707V10.1404C7.52934 10.4404 7.646 10.9104 7.92267 11.2317C8.23601 11.5957 8.69534 11.2144 8.73201 10.7357C8.74401 10.5851 8.89601 10.4891 9.02667 10.5651C9.45401 10.8151 10 11.3484 10 12.2137C10 13.5791 9.24734 14.2071 8.55467 14.4517Z" fill="#4ADE80" />
                          </svg>
                          <span className="text-xs font-bold text-[#4ade80]">
                            {nft.rarity.charAt(0).toUpperCase() + nft.rarity.slice(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Transaction Details Card */}
              <div className="w-full max-w-[380px] bg-[#0f172a] border border-[#1e293b]/50 rounded-2xl p-5 flex flex-col gap-4">
                {/* Status Row */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#94a3b8]">Status</span>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-bold text-[#4ade80]">Confirmed</span>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" clipRule="evenodd" d="M14.6663 7.99992C14.6663 11.6819 11.6817 14.6666 7.99967 14.6666C4.31767 14.6666 1.33301 11.6819 1.33301 7.99992C1.33301 4.31792 4.31767 1.33325 7.99967 1.33325C11.6817 1.33325 14.6663 4.31792 14.6663 7.99992ZM10.6863 5.97992C10.8813 6.17513 10.8813 6.49137 10.6863 6.68658L7.35301 10.0199C7.1578 10.2149 6.84155 10.2149 6.64634 10.0199L5.31301 8.68658C5.17924 8.56194 5.12417 8.37421 5.16942 8.19706C5.21466 8.0199 5.35299 7.88157 5.53015 7.83633C5.7073 7.79109 5.89503 7.84615 6.01967 7.97992L6.99967 8.95992L8.48967 7.46992L9.97967 5.97992C10.1749 5.78495 10.4911 5.78495 10.6863 5.97992Z" fill="#4ADE80" />
                    </svg>
                  </div>
                </div>
                
                <div className="h-px bg-[#1e293b]/50" />
                
                {/* Transaction Hash Row */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#94a3b8]">Transaction Hash</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-[#f8fafc] font-mono">
                      {transactionHash.length > 12 ? `${transactionHash.slice(0, 6)}...${transactionHash.slice(-4)}` : transactionHash}
                    </span>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" clipRule="evenodd" d="M10.16 1.33325H7.564C6.388 1.33325 5.456 1.33325 4.72733 1.43192C3.97667 1.53325 3.36933 1.74659 2.89067 2.22725C2.41133 2.70792 2.19867 3.31792 2.098 4.07125C2 4.80325 2 5.73858 2 6.91925V10.8112C2 11.8166 2.61333 12.6779 3.48467 13.0392C3.44 12.4326 3.44 11.5826 3.44 10.8746V7.53458C3.44 6.68058 3.44 5.94392 3.51867 5.35458C3.60333 4.72258 3.794 4.11725 4.28333 3.62592C4.77267 3.13458 5.376 2.94325 6.00533 2.85792C6.592 2.77925 7.32533 2.77925 8.17666 2.77925H10.2233C11.074 2.77925 11.806 2.77925 12.3933 2.85792C12.0333 1.93876 11.1472 1.33381 10.16 1.33325Z" fill="#94A3B8" />
                      <path fillRule="evenodd" clipRule="evenodd" d="M4.40039 7.59801C4.40039 5.78068 4.40039 4.87201 4.96306 4.30734C5.52506 3.74268 6.42973 3.74268 8.24039 3.74268H10.1604C11.9704 3.74268 12.8757 3.74268 13.4384 4.30734C14.0011 4.87201 14.0004 5.78068 14.0004 7.59801V10.8113C14.0004 12.6287 14.0004 13.5373 13.4384 14.102C12.8757 14.6667 11.9704 14.6667 10.1604 14.6667H8.24039C6.43039 14.6667 5.52506 14.6667 4.96306 14.102C4.40039 13.5373 4.40039 12.6287 4.40039 10.8113L4.40039 7.59801Z" fill="#94A3B8" />
                    </svg>
                  </div>
                </div>
                
                <div className="h-px bg-[#1e293b]/50" />
                
                {/* Total Paid Row */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#94a3b8]">Total Paid</span>
                  <span className="text-sm font-bold text-[#f8fafc]">{totalAmount.toFixed(2)} GFT</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="w-full max-w-[380px] flex flex-col gap-4 pt-2">
                <Button
                  onClick={handleViewDetails}
                  className="w-full h-[52px] rounded-2xl bg-[#4ade80] hover:bg-[#22c55e] text-[#022c22] text-sm font-bold flex items-center justify-center gap-2 shadow-[0_4px_6px_-4px_rgba(74,222,128,0.2),0_10px_15px_-3px_rgba(74,222,128,0.2)]"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" clipRule="evenodd" d="M8.125 10C8.125 8.96447 8.96447 8.125 10 8.125C11.0355 8.125 11.875 8.96447 11.875 10C11.875 11.0355 11.0355 11.875 10 11.875C8.96447 11.875 8.125 11.0355 8.125 10Z" fill="#022C22" />
                    <path fillRule="evenodd" clipRule="evenodd" d="M1.66699 9.99991C1.66699 11.3666 2.02116 11.8257 2.72949 12.7466C4.14366 14.5832 6.51532 16.6666 10.0003 16.6666C13.4853 16.6666 15.857 14.5832 17.2711 12.7466C17.9795 11.8266 18.3336 11.3657 18.3336 9.99991C18.3336 8.63325 17.9795 8.17408 17.2711 7.25325C15.857 5.41658 13.4853 3.33325 10.0003 3.33325C6.51532 3.33325 4.14366 5.41658 2.72949 7.25325C2.02116 8.17492 1.66699 8.63408 1.66699 9.99991ZM10.0003 6.87492C8.27443 6.87492 6.87532 8.27403 6.87532 9.99991C6.87532 11.7258 8.27443 13.1249 10.0003 13.1249C11.7262 13.1249 13.1253 11.7258 13.1253 9.99991C13.1253 8.27403 11.7262 6.87492 10.0003 6.87492Z" fill="#022C22" />
                  </svg>
                  View NFT Details
                </Button>
                <Button
                  onClick={handleGoToMyNFTs}
                  variant="outline"
                  className="w-full h-[54px] rounded-2xl bg-[#1e293b] hover:bg-[#334155] border border-[#1e293b]/50 text-[#f8fafc] text-sm font-bold flex items-center justify-center gap-2"
                >
                  <WalletIcon />
                  Go to My NFTs
                </Button>
              </div>

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
