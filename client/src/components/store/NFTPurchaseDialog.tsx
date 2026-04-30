import { useState } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useCrossmint } from "@/hooks/use-crossmint";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import gfTokenLogo from "@assets/Gamefolio token_1762633908726.png";
import { LoginPromptModal } from "@/components/auth/LoginPromptModal";
import { useWalletClient, usePublicClient, useChainId } from "wagmi";
import { parseUnits, type Address } from "viem";
import { GF_TOKEN_ADDRESS, GF_TOKEN_ABI, SKALE_NEBULA_TESTNET } from "@shared/contracts";
import { useTokenBalance } from "@/hooks/use-token";
import { useWallet } from "@/hooks/use-wallet";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

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
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);

  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const chainId = useChainId();
  const { data: tokenBalance } = useTokenBalance();
  const { walletMode, setWalletMode } = useWallet();

  const effectiveAddress = user?.walletAddress;
  const useServerSigning =
    walletMode === 'gamefolio'
      ? !!effectiveAddress
      : walletMode === 'external'
      ? false
      : !!effectiveAddress && !walletClient;
  const externalUnavailable = walletMode === 'external' && !walletClient;

  const SKALE_CHAIN_ID = SKALE_NEBULA_TESTNET.id;
  const GF_DECIMALS = 18;

  const quickSellMutation = useMutation({
    mutationFn: async (data: { tokenId: number }) => {
      const response = await apiRequest("POST", "/api/nft/quick-sell", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "NFT Listed for Sale!",
        description: data.message || "Your NFT has been listed on the marketplace.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/nfts/owned"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Sell Failed",
        description: error?.message || "There was an error listing your NFT. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setStep('details');
    onOpenChange(false);
  };

  if (!nft) return null;

  const userBalance = parseFloat(tokenBalance?.balance || '0');
  const networkFee = 0;
  const totalAmount = nft.price + networkFee;
  const hasEnoughBalance = userBalance >= totalAmount;
  const remainingBalance = userBalance - totalAmount;

  const handleProceedToCheckout = () => {
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }
    setStep('checkout');
  };

  const handleConfirmPurchase = async () => {
    if (!hasEnoughBalance) {
      toast({ title: "Insufficient Balance", description: "You don't have enough GF tokens to purchase this NFT.", variant: "destructive" });
      return;
    }
    if (!effectiveAddress) {
      toast({ title: "No wallet found", description: "Please set up your wallet first.", variant: "destructive" });
      return;
    }
    if (externalUnavailable) {
      toast({ title: "External wallet not connected", description: "Connect an external wallet or switch to your Gamefolio wallet.", variant: "destructive" });
      return;
    }
    setIsPurchasing(true);
    try {
      if (useServerSigning) {
        toast({ title: "Processing purchase...", description: `Sending ${nft.price} GFT tokens...` });
        const res = await apiRequest("POST", "/api/nft/server-purchase", { nftId: nft.id });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || data.error || "Purchase failed");
        toast({ title: "Purchase Successful!", description: `You've purchased ${nft.name} for ${nft.price} GFT tokens.` });
      } else {
        if (!walletClient || !publicClient) {
          toast({ title: "Wallet not ready", description: "Please wait for your wallet to connect.", variant: "destructive" });
          return;
        }
        if (chainId !== SKALE_CHAIN_ID) {
          toast({ title: "Wrong Network", description: "Please switch to SKALE Nebula network.", variant: "destructive" });
          return;
        }
        const intentRes = await fetch("/api/nft/purchase-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ nftId: nft.id }),
        });
        if (!intentRes.ok) {
          const err = await intentRes.json();
          throw new Error(err.message || err.error || "Failed to create purchase intent");
        }
        const { gfCost, treasuryAddress } = await intentRes.json();

        toast({ title: "Confirm transaction", description: `Sending ${gfCost} GFT tokens...` });
        const amountRaw = parseUnits(String(gfCost), GF_DECIMALS);
        const txHash = await walletClient.writeContract({
          address: GF_TOKEN_ADDRESS,
          abi: GF_TOKEN_ABI,
          functionName: "transfer",
          args: [treasuryAddress as Address, amountRaw],
        });

        toast({ title: "Verifying purchase...", description: "Please wait while we confirm your transaction" });
        await publicClient.waitForTransactionReceipt({ hash: txHash, confirmations: 1 });

        const verifyRes = await fetch("/api/nft/verify-purchase", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ nftId: nft.id, txHash }),
        });
        if (!verifyRes.ok) {
          const err = await verifyRes.json();
          throw new Error(err.message || err.error || "Failed to verify purchase");
        }
        toast({ title: "Purchase Successful!", description: `You've purchased ${nft.name} for ${gfCost} GFT tokens.` });
      }

      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/token/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/nfts/owned"] });
      setStep('details');
      onOpenChange(false);
      onPurchaseComplete?.();
    } catch (error: any) {
      let description = error.message || "There was an error processing your purchase.";
      if (error.message?.includes("user rejected") || error.message?.includes("User rejected")) {
        description = "Transaction was cancelled.";
      }
      toast({ title: "Purchase Failed", description, variant: "destructive" });
    } finally {
      setIsPurchasing(false);
    }
  };

  const contractAddress = "0x892a...F4e1";
  const tokenId = nft.id.toString().padStart(4, '0');
  const walletAddress = wallet?.address ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}` : "0x892a...f4e1";

  // Verified badge SVG from Figma
  const VerifiedBadge = () => (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M4.76313 1.47997C4.68207 1.55272 4.59721 1.62113 4.5089 1.6849C4.35585 1.78762 4.18379 1.85849 4.00301 1.89444C3.92443 1.90985 3.84225 1.91653 3.67841 1.92937C3.26702 1.96224 3.06107 1.97867 2.88953 2.03928C2.49214 2.17935 2.17959 2.49189 2.03952 2.88928C1.97892 3.06083 1.96248 3.26678 1.92961 3.67817C1.92371 3.78691 1.91206 3.89526 1.89469 4.00276C1.85874 4.18355 1.78786 4.35561 1.68514 4.50866C1.64046 4.57543 1.58704 4.63809 1.48021 4.76289C1.21263 5.07721 1.07858 5.23437 1 5.39872C0.8187 5.77879 0.8187 6.22048 1 6.60054C1.07858 6.76489 1.21263 6.92206 1.48021 7.23638C1.58704 7.36118 1.64046 7.42384 1.68514 7.49061C1.78786 7.64366 1.85874 7.81572 1.89469 7.9965C1.9101 8.07508 1.91677 8.15726 1.92961 8.3211C1.96248 8.73249 1.97892 8.93844 2.03952 9.10998C2.17959 9.50737 2.49214 9.81992 2.88953 9.95999C3.06107 10.0206 3.26702 10.037 3.67841 10.0699C3.84225 10.0827 3.92443 10.0894 4.00301 10.1048C4.18379 10.1408 4.35585 10.2122 4.5089 10.3144C4.57567 10.3591 4.63833 10.4125 4.76313 10.5193C5.07746 10.7869 5.23462 10.9209 5.39897 10.9995C5.77903 11.1808 6.22072 11.1808 6.60079 10.9995C6.76514 10.9209 6.9223 10.7869 7.23662 10.5193C7.36143 10.4125 7.42409 10.3591 7.49085 10.3144C7.64391 10.2117 7.81596 10.1408 7.99675 10.1048C8.07533 10.0894 8.1575 10.0827 8.32134 10.0699C8.73273 10.037 8.93869 10.0206 9.11023 9.95999C9.50762 9.81992 9.82016 9.50737 9.96023 9.10998C10.0208 8.93844 10.0373 8.73249 10.0701 8.3211C10.083 8.15726 10.0897 8.07508 10.1051 7.9965C10.141 7.81572 10.2124 7.64366 10.3146 7.49061C10.3593 7.42384 10.4127 7.36118 10.5195 7.23638C10.7871 6.92206 10.9212 6.76489 10.9998 6.60054C11.1811 6.22048 11.1811 5.77879 10.9998 5.39872C10.9212 5.23437 10.7871 5.07721 10.5195 4.76289C10.4468 4.68183 10.3784 4.59696 10.3146 4.50866C10.2118 4.35563 10.1406 4.18365 10.1051 4.00276C10.0877 3.89526 10.076 3.78691 10.0701 3.67817C10.0373 3.26678 10.0208 3.06083 9.96023 2.88928C9.82016 2.49189 9.50762 2.17935 9.11023 2.03928C8.93869 1.97867 8.73273 1.96224 8.32134 1.92937C8.1575 1.91653 8.07533 1.90985 7.99675 1.89444C7.81596 1.85849 7.64391 1.78762 7.49085 1.6849C7.42409 1.62113 7.36143 1.55272 7.23662 1.47997C6.9223 1.21263 6.76514 1.07858 6.60079 1C6.22072 0.8187 5.77903 0.8187 5.39897 1C5.23462 1.07858 5.07746 1.21263 4.76313 1.47997ZM8.35355 5.35355C8.54882 5.15829 8.54882 4.84171 8.35355 4.64645C8.15829 4.45118 7.84171 4.45118 7.64645 4.64645L5.5 6.79289L4.35355 5.64645C4.15829 5.45118 3.84171 5.45118 3.64645 5.64645C3.45118 5.84171 3.45118 6.15829 3.64645 6.35355L5.14645 7.85355C5.34171 8.04882 5.65829 8.04882 5.85355 7.85355L8.35355 5.35355Z" fill="#B7FF1A"/>
    </svg>
  );

  // Wallet icon SVG from Figma
  const WalletIcon = () => (
    <svg width="18" height="15" viewBox="0 0 18 15" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M15.9164 4.16984C15.8691 4.16706 15.8189 4.16595 15.7655 4.1665H13.6614C11.938 4.1665 10.4639 5.52317 10.4639 7.2915C10.4639 9.05984 11.9389 10.4165 13.6614 10.4165H15.7655C15.8189 10.4171 15.8694 10.4159 15.9172 10.4132C16.6498 10.369 17.2363 9.78864 17.288 9.0565C17.2914 9.0065 17.2914 8.95234 17.2914 8.90234V5.68067C17.2914 5.63067 17.2914 5.5765 17.288 5.5265C17.2363 4.79437 16.649 4.21401 15.9164 4.16984ZM13.4772 8.12484C13.9205 8.12484 14.2797 7.7515 14.2797 7.2915C14.2797 6.8315 13.9205 6.45817 13.4772 6.45817C13.033 6.45817 12.6739 6.8315 12.6739 7.2915C12.6739 7.7515 13.033 8.12484 13.4772 8.12484Z" fill="#B7FF1A" />
      <path fillRule="evenodd" clipRule="evenodd" d="M15.765 11.6667C15.8234 11.6643 15.8795 11.69 15.9158 11.7357C15.9522 11.7815 15.9646 11.8419 15.9491 11.8983C15.7825 12.4916 15.5166 12.9983 15.0908 13.4233C14.4666 14.0483 13.6758 14.3241 12.6991 14.4558C11.7492 14.5833 10.5367 14.5833 9.00499 14.5833H7.24499C5.71333 14.5833 4.49999 14.5833 3.55083 14.4558C2.57416 14.3241 1.78333 14.0475 1.15917 13.4241C0.535833 12.8 0.259166 12.0092 0.1275 11.0325C0 10.0825 0 8.86999 0 7.33832V7.24499C0 5.71333 0 4.49999 0.1275 3.54999C0.259166 2.57333 0.535833 1.7825 1.15917 1.15833C1.78333 0.534999 2.57416 0.258333 3.55083 0.126666C4.50083 0 5.71333 0 7.24499 0H9.00499C10.5367 0 11.75 0 12.6991 0.1275C13.6758 0.259166 14.4666 0.535833 15.0908 1.15917C15.5166 1.58583 15.7825 2.09166 15.9491 2.685C15.9646 2.74139 15.9522 2.80179 15.9158 2.84756C15.8795 2.89334 15.8234 2.91901 15.765 2.91666H13.6616C11.2975 2.91666 9.21415 4.78333 9.21415 7.29166C9.21415 9.79999 11.2975 11.6667 13.6616 11.6667H15.765ZM4.16666 10.4167C3.82148 10.4167 3.54166 10.1368 3.54166 9.79165V4.79166C3.54166 4.44648 3.82148 4.16666 4.16666 4.16666C4.51184 4.16666 4.79166 4.44648 4.79166 4.79166V9.79165C4.79166 10.1368 4.51184 10.4167 4.16666 10.4167Z" fill="#B7FF1A" />
    </svg>
  );

  // Checkmark circle SVG from Figma
  const CheckmarkCircle = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M14.6663 7.99992C14.6663 11.6819 11.6817 14.6666 7.99967 14.6666C4.31767 14.6666 1.33301 11.6819 1.33301 7.99992C1.33301 4.31792 4.31767 1.33325 7.99967 1.33325C11.6817 1.33325 14.6663 4.31792 14.6663 7.99992ZM10.6863 5.97992C10.8813 6.17513 10.8813 6.49137 10.6863 6.68658L7.35301 10.0199C7.1578 10.2149 6.84155 10.2149 6.64634 10.0199L5.31301 8.68658C5.17924 8.56194 5.12417 8.37421 5.16942 8.19706C5.21466 8.0199 5.35299 7.88157 5.53015 7.83633C5.7073 7.79109 5.89503 7.84615 6.01967 7.97992L6.99967 8.95992L8.48967 7.46992L9.97967 5.97992C10.1749 5.78495 10.4911 5.78495 10.6863 5.97992Z" fill="#B7FF1A" />
    </svg>
  );

  // Checkout Screen
  if (step === 'checkout') {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent 
          className="bg-[#101D27] border-none text-white p-0 max-w-[430px] w-full h-[90vh] max-h-[900px] overflow-hidden flex flex-col [&>button]:hidden"
          data-testid="dialog-nft-checkout"
        >
          {/* Header - left aligned */}
          <div className="flex items-center gap-4 px-4 pt-12 pb-4 bg-[#101D27]/80 backdrop-blur-md">
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
                      <span className="text-[10px] font-bold text-[#B7FF1A] uppercase" style={{ letterSpacing: '0.5px' }}>
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
                    <span className="text-sm font-bold text-[#B7FF1A]">Free</span>
                  </div>
                  {/* Total Payment row - 75px height, green tinted bg */}
                  <div className="flex items-center justify-between px-4 h-[75px] bg-[#14532d]/10">
                    <span className="text-sm font-bold text-[#f8fafc]">Total Payment</span>
                    <div className="flex flex-col items-end">
                      <span className="text-lg font-bold text-[#B7FF1A] leading-7">{totalAmount.toFixed(2)} GFT</span>
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
                  {/* Wallet mode picker */}
                  <RadioGroup
                    value={walletMode === 'auto' ? 'gamefolio' : walletMode}
                    onValueChange={(v) => setWalletMode(v as 'gamefolio' | 'external')}
                    className="grid grid-cols-2 gap-2"
                    data-testid="wallet-mode-picker"
                  >
                    {[
                      { val: 'gamefolio', label: 'Gamefolio' },
                      { val: 'external', label: 'External' },
                    ].map((opt) => (
                      <Label
                        key={opt.val}
                        htmlFor={`wm-${opt.val}`}
                        className={`cursor-pointer rounded-xl border px-3 py-2 text-center text-xs font-bold transition-colors ${
                          walletMode === opt.val
                            ? 'border-[#B7FF1A] bg-[#B7FF1A]/10 text-[#B7FF1A]'
                            : 'border-[#1e293b] text-[#94a3b8] hover:text-[#f8fafc]'
                        }`}
                      >
                        <RadioGroupItem id={`wm-${opt.val}`} value={opt.val} className="sr-only" />
                        {opt.label}
                      </Label>
                    ))}
                  </RadioGroup>
                  {externalUnavailable && (
                    <div className="text-[10px] text-amber-400 px-1">
                      External wallet selected but not connected. Connect one or switch to Gamefolio.
                    </div>
                  )}

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
                    <div className="flex items-center gap-2 px-3 py-2 bg-[#B7FF1A]/10 rounded-2xl h-8">
                      <CheckmarkCircle />
                      <span className="text-xs text-[#B7FF1A]">Sufficient balance for this transaction</span>
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
                    disabled={isPurchasing || !hasEnoughBalance || !effectiveAddress}
                    className="w-full h-[60px] rounded-2xl bg-[#B7FF1A] text-[#071013] text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    data-testid="button-confirm-purchase"
                  >
                    {isPurchasing ? "Processing..." : "Confirm Purchase"}
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

  // Details Screen (default)
  return (
    <>
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent 
        className="bg-[#101D27] border-none text-white p-0 max-w-[430px] md:max-w-[860px] w-full md:h-auto h-[100dvh] md:max-h-[90vh] overflow-hidden flex flex-col [&>button]:hidden rounded-none sm:rounded-none md:rounded-lg top-0 translate-y-0 md:top-[50%] md:translate-y-[-50%]"
        data-testid="dialog-nft-purchase"
      >
        <div 
          className="flex-1 overflow-y-auto"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>
          <div className="hide-scrollbar flex flex-col">
            
            {/* Header with back button */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-[#101D27]/80 backdrop-blur-md">
              <button
                onClick={handleClose}
                className="w-10 h-10 rounded-full hover:bg-[#1e293b]/50 flex items-center justify-center transition-colors"
              >
                <ArrowLeft className="h-6 w-6 text-white/50" />
              </button>
              <span className="text-lg font-bold text-[#f8fafc]">NFT Details</span>
              <div className="w-10 h-10" />
            </div>

            <div className="flex flex-col md:flex-row">
              {/* Left Column: NFT Image Section */}
              <div className="flex justify-center items-start px-4 py-2 md:sticky md:top-[64px] md:h-fit">
                <div className="relative w-full max-w-[398px] aspect-square rounded-3xl overflow-hidden shadow-[0_25px_50px_-12px_rgba(183, 255, 26,0.05)]">
                  <img
                    src={nft.image}
                    alt={nft.name}
                    className="w-full h-full object-cover"
                    data-testid="img-nft-preview"
                  />
                  {/* Verified Asset Badge */}
                  <div className="absolute top-4 left-4 backdrop-blur-md bg-black/40 rounded-2xl px-3 py-1.5 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#B7FF1A]" />
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                      Verified Asset
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Content Section */}
              <div className="flex flex-col gap-6 px-6 py-6 flex-1">
                
                {/* Collection & NFT Info */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[#B7FF1A]">Cyber Guardians</span>
                    <Check className="w-4 h-4 text-[#B7FF1A]" />
                  </div>
                  <h1 className="text-3xl font-bold text-[#f8fafc]" data-testid="text-nft-name">
                    {nft.name.replace(/^.*#/, 'Guardian #')}
                  </h1>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#B7FF1A] to-[#A2F000] border-2 border-[#101D27]" />
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
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider">
                        Ending In
                      </span>
                      <span className="text-sm font-bold text-[#B7FF1A]">2h 45m 02s</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-3">
                    <Button
                      onClick={handleProceedToCheckout}
                      className="w-full h-[60px] rounded-2xl bg-[#B7FF1A] text-[#071013] text-lg font-bold hover:opacity-90 transition-all"
                      data-testid="button-buy-nft"
                    >
                      Buy NFT Now
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => nft && quickSellMutation.mutate({ tokenId: nft.id })}
                      disabled={quickSellMutation.isPending}
                      className="w-full h-[58px] rounded-2xl bg-[#1e293b] border border-[#1e293b]/50 text-[#f8fafc] text-base font-bold flex items-center justify-center gap-2 hover:bg-[#1e293b]/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <img src={gfTokenLogo} alt="GF" className="w-5 h-5" />
                      {quickSellMutation.isPending ? "Listing..." : "Sell To Gamefolio"}
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
                        <span className="text-[10px] text-[#B7FF1A]">{prop.percent}</span>
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
                              detail.link ? "text-[#B7FF1A]" : "text-[#f8fafc]"
                            } ${detail.mono ? "font-mono" : ""}`}
                          >
                            {detail.value}
                          </span>
                          {detail.link && (
                            <ExternalLink className="w-3 h-3 text-[#B7FF1A]" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    <LoginPromptModal
      isOpen={showLoginPrompt}
      onOpenChange={setShowLoginPrompt}
      title="Sign in to continue"
      description="Create an account or log in to buy and sell NFTs on Gamefolio."
    />
    </>
  );
}
