import { useState, ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useAuthModal } from "@/hooks/use-auth-modal";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useWallet } from "@/hooks/use-wallet";
import { useAccount, useWalletClient, usePublicClient, useChainId } from "wagmi";
import { useOpenConnectModal } from "@0xsequence/connect";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { parseUnits, type Address } from "viem";
import { GF_TOKEN_ADDRESS, GF_TOKEN_ABI, SKALE_NEBULA_TESTNET } from "@shared/contracts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const GF_DECIMALS = 18;
const SKALE_CHAIN_ID = SKALE_NEBULA_TESTNET.id;

export interface PendingNftPurchase {
  tokenId: number;
  sellerId: number;
  nftName?: string;
  nftDescription?: string;
  nftImage?: string;
  currentBalance?: string | number;
  price?: number;
}

export interface UseMarketplacePurchaseOptions {
  onSuccess?: (purchase: PendingNftPurchase) => void;
}

export function useMarketplacePurchase(options: UseMarketplacePurchaseOptions = {}) {
  const { user } = useAuth();
  const { openModal } = useAuthModal();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { walletMode, setWalletMode } = useWallet();
  const { isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const chainId = useChainId();
  const { setOpenConnectModal } = useOpenConnectModal();

  const [pendingNftPurchase, setPendingNftPurchase] = useState<PendingNftPurchase | null>(null);
  const [purchaseConfirmOpen, setPurchaseConfirmOpen] = useState(false);
  const [buyingTokenId, setBuyingTokenId] = useState<number | null>(null);

  const requireExternalWallet = (purchaseLabel: string): boolean => {
    if (walletMode === "gamefolio") {
      toast({
        title: "External wallet required",
        description: `${purchaseLabel} currently requires an external wallet (MetaMask, Coinbase, etc.). Switch to External wallet mode to continue.`,
        variant: "destructive",
        action: (
          <ToastAction
            altText="Switch to External"
            onClick={() => {
              setWalletMode("external");
              setOpenConnectModal(true);
            }}
          >
            Switch & Connect
          </ToastAction>
        ),
      });
      return false;
    }
    setOpenConnectModal(true);
    return false;
  };

  const requestBuy = (purchase: PendingNftPurchase) => {
    if (!user) {
      openModal();
      return;
    }
    setPendingNftPurchase(purchase);
    setPurchaseConfirmOpen(true);
  };

  const closePurchaseConfirm = () => {
    setPurchaseConfirmOpen(false);
    setPendingNftPurchase(null);
  };

  const confirmPurchase = async () => {
    if (!pendingNftPurchase) return;
    const purchase = pendingNftPurchase;
    const { tokenId, sellerId } = purchase;
    setPurchaseConfirmOpen(false);

    if (walletMode === "gamefolio") {
      setBuyingTokenId(tokenId);
      try {
        toast({ title: "Processing purchase...", description: "Sending GFT from your Gamefolio wallet" });
        await apiRequest("POST", "/api/marketplace/server-buy", { tokenId, sellerId });
        toast({ title: "NFT Purchased!", description: "Purchase complete" });
        queryClient.invalidateQueries({ queryKey: ["/api/marketplace/listings"] });
        queryClient.invalidateQueries({ queryKey: ["/api/nfts/owned"] });
        queryClient.invalidateQueries({ queryKey: ["/api/token/balance"] });
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        queryClient.invalidateQueries({ queryKey: ["/api/store/gamefolio-activity"] });
        options.onSuccess?.(purchase);
      } catch (error: any) {
        toast({ title: "Purchase Failed", description: error?.message || "Transaction failed", variant: "destructive" });
      } finally {
        setBuyingTokenId(null);
        setPendingNftPurchase(null);
      }
      return;
    }

    if (!isConnected || !walletClient || !publicClient) {
      requireExternalWallet("Buying NFTs from the marketplace");
      setPendingNftPurchase(null);
      return;
    }
    if (chainId !== SKALE_CHAIN_ID) {
      toast({ title: "Wrong network", description: "Please switch to SKALE Nebula Testnet", variant: "destructive" });
      setPendingNftPurchase(null);
      return;
    }
    setBuyingTokenId(tokenId);
    try {
      const intentRes = await fetch("/api/marketplace/buy-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ tokenId, sellerId }),
      });
      if (!intentRes.ok) {
        const error = await intentRes.json();
        throw new Error(error.error || "Failed to create purchase intent");
      }
      const { price, treasuryAddress } = await intentRes.json();

      toast({ title: "Confirm transaction", description: `Sending ${price} GFT tokens...` });
      const amountRaw = parseUnits(String(price), GF_DECIMALS);
      const txHash = await walletClient.writeContract({
        address: GF_TOKEN_ADDRESS,
        abi: GF_TOKEN_ABI,
        functionName: "transfer",
        args: [treasuryAddress as Address, amountRaw],
      });

      toast({ title: "Verifying purchase...", description: "Please wait while we confirm your transaction" });
      await publicClient.waitForTransactionReceipt({ hash: txHash, confirmations: 1 });

      const verifyRes = await fetch("/api/marketplace/verify-buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ tokenId, sellerId, txHash }),
      });
      if (!verifyRes.ok) {
        const error = await verifyRes.json();
        throw new Error(error.error || "Failed to verify purchase");
      }
      const result = await verifyRes.json();
      toast({ title: "NFT Purchased!", description: result.message });
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/listings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/nfts/owned"] });
      queryClient.invalidateQueries({ queryKey: ["/api/token/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      options.onSuccess?.(purchase);
    } catch (error: any) {
      let description = error.message || "Transaction failed";
      if (error.message?.includes("user rejected") || error.message?.includes("User rejected")) {
        description = "Transaction was cancelled";
      } else if (error.message?.includes("insufficient")) {
        description = "Insufficient GFT balance";
      }
      toast({ title: "Purchase Failed", description, variant: "destructive" });
    } finally {
      setBuyingTokenId(null);
      setPendingNftPurchase(null);
    }
  };

  return {
    pendingNftPurchase,
    purchaseConfirmOpen,
    buyingTokenId,
    requestBuy,
    confirmPurchase,
    closePurchaseConfirm,
    setPurchaseConfirmOpen,
  };
}

interface MarketplacePurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingNftPurchase: PendingNftPurchase | null;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}

export function MarketplacePurchaseDialog({
  open,
  onOpenChange,
  pendingNftPurchase,
  onConfirm,
  onCancel,
}: MarketplacePurchaseDialogProps) {
  const currentBalance =
    typeof pendingNftPurchase?.currentBalance === "number"
      ? pendingNftPurchase.currentBalance.toLocaleString(undefined, { maximumFractionDigits: 4 })
      : pendingNftPurchase?.currentBalance || "0";
  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : onCancel())}>
      <DialogContent className="bg-[#0f172a] border-gray-700 text-white max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-white text-lg">Confirm NFT Purchase</DialogTitle>
          <DialogDescription className="text-gray-400">
            {pendingNftPurchase
              ? `Review ${pendingNftPurchase.nftName || `NFT #${pendingNftPurchase.tokenId}`} before buying.`
              : "Are you sure you want to buy this NFT?"}
          </DialogDescription>
        </DialogHeader>
        {pendingNftPurchase && (
          <div className="space-y-3 rounded-xl bg-slate-900/60 p-4 border border-slate-700">
            <div className="flex gap-3">
              {pendingNftPurchase.nftImage && (
                <img
                  src={pendingNftPurchase.nftImage}
                  alt={pendingNftPurchase.nftName || `NFT #${pendingNftPurchase.tokenId}`}
                  className="w-16 h-16 rounded-lg object-cover"
                />
              )}
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">
                  {pendingNftPurchase.nftName || `NFT #${pendingNftPurchase.tokenId}`}
                </p>
                <p className="text-xs text-gray-400">
                  {pendingNftPurchase.nftDescription || "No description available."}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-black/20 p-3">
                <p className="text-gray-400 text-xs">Cost</p>
                <p className="text-white font-semibold">
                  {typeof pendingNftPurchase.price === "number" ? `${pendingNftPurchase.price} GFT` : "—"}
                </p>
              </div>
              <div className="rounded-lg bg-black/20 p-3">
                <p className="text-gray-400 text-xs">Your balance</p>
                <p className="text-white font-semibold">
                  {currentBalance} GFT
                </p>
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button
            variant="outline"
            className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            className="bg-[#4ade80] hover:bg-[#22c55e] text-black font-bold"
            onClick={onConfirm}
          >
            Buy Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
