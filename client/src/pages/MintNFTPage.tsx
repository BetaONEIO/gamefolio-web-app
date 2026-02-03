import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useCrossmint } from "@/hooks/use-crossmint";
import { ArrowLeft, Minus, Plus, Wallet, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import nft1 from "@assets/1_1762777399632.png";

const MINT_PRICE = 50;
const NETWORK_FEE = 0.50;
const MAX_PER_WALLET = 5;

export default function MintNFTPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { wallet } = useCrossmint();
  const { toast } = useToast();
  const [quantity, setQuantity] = useState(1);
  const [isMinting, setIsMinting] = useState(false);

  const gfBalance = user?.gfTokenBalance || 0;
  const isConnected = !!wallet?.address;

  const mintPrice = MINT_PRICE * quantity;
  const networkFee = NETWORK_FEE * quantity;
  const totalAmount = mintPrice + networkFee;
  const totalUSD = totalAmount * 0.049;

  const canMint = isConnected && gfBalance >= totalAmount && quantity <= MAX_PER_WALLET;

  const handleDecrement = () => {
    if (quantity > 1) setQuantity(quantity - 1);
  };

  const handleIncrement = () => {
    if (quantity < MAX_PER_WALLET) setQuantity(quantity + 1);
  };

  const handleMint = async () => {
    if (!canMint) {
      if (!isConnected) {
        toast({
          title: "Wallet Required",
          description: "Please connect your wallet first",
          variant: "destructive",
        });
        return;
      }
      if (gfBalance < totalAmount) {
        toast({
          title: "Insufficient Balance",
          description: `You need ${totalAmount.toFixed(2)} GFT but only have ${gfBalance.toFixed(2)} GFT`,
          variant: "destructive",
        });
        return;
      }
      return;
    }

    setIsMinting(true);
    try {
      toast({
        title: "Minting NFT",
        description: "Processing your transaction...",
      });
      await new Promise((resolve) => setTimeout(resolve, 2000));
      toast({
        title: "Coming Soon!",
        description: "NFT minting will be available soon. Check back later!",
      });
    } catch (error) {
      toast({
        title: "Minting Failed",
        description: "An error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-[#020617]/80 border-b border-white/10">
        <div className="flex items-center justify-between w-full max-w-[430px] mx-auto px-4 py-4">
          <Button
            variant="ghost"
            size="icon"
            className="w-10 h-10 rounded-full bg-[#1e293b]/50 hover:bg-[#1e293b]/80"
            onClick={() => navigate("/store")}
          >
            <ArrowLeft className="h-6 w-6 text-white" />
          </Button>
          <span className="text-lg font-bold text-[#f8fafc]">Confirm Mint</span>
          <div className="w-10 h-10" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-start py-6 pb-8">
        <div className="w-full max-w-[430px] px-6 flex flex-col gap-6">
          
          {/* NFT Image Card */}
          <div className="relative w-full aspect-[3/4] rounded-3xl overflow-hidden shadow-[0_25px_50px_-12px_rgba(74,222,128,0.1)]">
            <img
              src={nft1}
              alt="NFT Preview"
              className="w-full h-full object-cover"
            />
            {/* Overlay Info Card */}
            <div className="absolute bottom-4 left-4 right-4 backdrop-blur-md bg-black/40 border border-white/10 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-[#4ade80] uppercase tracking-wider">
                    Collection
                  </span>
                  <span className="text-xl font-bold text-[#f8fafc]">
                    Veridian Glassworks
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-bold text-[#94a3b8] uppercase">
                    Remaining
                  </span>
                  <span className="text-sm font-bold text-[#f8fafc]">
                    487 / 500
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Mint Details Card */}
          <div className="bg-[#0f172a] border border-[#1e293b]/50 rounded-3xl overflow-hidden">
            {/* Balance Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#1e293b]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#4ade80]/20 flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-[#4ade80]" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-[#94a3b8] uppercase">
                    Your Balance
                  </span>
                  <span className="text-sm font-bold text-[#f8fafc]">
                    {gfBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GFT
                  </span>
                </div>
              </div>
              <div className={`px-3 py-2 rounded-full border ${
                isConnected 
                  ? "bg-[#1e293b]/50 border-[#1e293b]/30" 
                  : "bg-red-500/20 border-red-500/30"
              }`}>
                <span className={`text-[10px] font-bold ${
                  isConnected ? "text-[#4ade80]" : "text-red-400"
                }`}>
                  {isConnected ? "Connected" : "Not Connected"}
                </span>
              </div>
            </div>

            {/* Quantity and Price Details */}
            <div className="p-5 flex flex-col gap-5">
              {/* Quantity Selector */}
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-[#f8fafc]">Quantity</span>
                  <span className="text-[10px] font-bold text-[#94a3b8] uppercase">
                    Max {MAX_PER_WALLET} per wallet
                  </span>
                </div>
                <div className="flex items-center gap-4 bg-[#1e293b] rounded-2xl p-1">
                  <button
                    onClick={handleDecrement}
                    disabled={quantity <= 1}
                    className="w-10 h-10 rounded-2xl bg-[#1e293b] hover:bg-[#334155] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                  >
                    <Minus className="h-5 w-5 text-[#f8fafc]" />
                  </button>
                  <span className="text-lg font-bold text-[#f8fafc] w-4 text-center">
                    {quantity}
                  </span>
                  <button
                    onClick={handleIncrement}
                    disabled={quantity >= MAX_PER_WALLET}
                    className="w-10 h-10 rounded-2xl bg-[#4ade80] hover:bg-[#22c55e] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                  >
                    <Plus className="h-5 w-5 text-[#022c22]" />
                  </button>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-[#1e293b]/30" />

              {/* Price Breakdown */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#94a3b8]">Mint Price</span>
                  <span className="text-sm font-bold text-[#f8fafc]">
                    {mintPrice.toFixed(2)} GFT
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#94a3b8]">Network Fee</span>
                  <span className="text-sm font-bold text-[#f8fafc]">
                    {networkFee.toFixed(2)} GFT
                  </span>
                </div>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between pt-3 border-t border-[#1e293b]/30">
                <span className="text-base font-bold text-[#f8fafc]">Total Amount</span>
                <div className="flex flex-col items-end">
                  <span className="text-xl font-bold text-[#4ade80]">
                    {totalAmount.toFixed(2)} GFT
                  </span>
                  <span className="text-[10px] font-medium text-[#94a3b8]">
                    ≈ ${totalUSD.toFixed(2)} USD
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Confirm Button */}
          <Button
            onClick={handleMint}
            disabled={!canMint || isMinting}
            className="w-full h-[68px] rounded-2xl bg-[#4ade80] hover:bg-[#22c55e] disabled:bg-[#4ade80]/50 text-[#022c22] text-xl font-bold shadow-[0_8px_10px_-6px_rgba(74,222,128,0.2),0_20px_25px_-5px_rgba(74,222,128,0.2)] flex items-center justify-center gap-2.5"
          >
            <Sparkles className="h-6 w-6" />
            {isMinting ? "Minting..." : "Confirm Mint"}
          </Button>

          {/* Terms */}
          <p className="text-[10px] text-[#94a3b8] text-center px-8 pb-4">
            By clicking Confirm, you agree to the Terms of Service and authorize the smart contract to execute this transaction.
          </p>
        </div>
      </main>
    </div>
  );
}
