import { useState, useRef, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useCrossmint } from "@/hooks/use-crossmint";
import { ArrowLeft, Minus, Plus, Wallet, Sparkles, X, ExternalLink, Check, Shield, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const MINT_VIDEO_URL = "https://rupzmxqyhqktpifgfmzc.supabase.co/storage/v1/object/sign/gamefolio-assets/NFT%20mint.mp4?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9hMzEyZGM4MC1lOGJlLTRjMDAtODFhNy1kOTI5MTgyYTJlYWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJnYW1lZm9saW8tYXNzZXRzL05GVCBtaW50Lm1wNCIsImlhdCI6MTc3MDEzNzMzOSwiZXhwIjoyMDg1NDk3MzM5fQ.rdKpWSU4H8CdDO-mfEAbTc96_zdl35E6Y7Md38HS-uY";

const MINT_PRICE = 50;
const NETWORK_FEE = 0.50;
const MAX_PER_WALLET = 5;

type MintState = "idle" | "processing" | "video" | "success";

interface MintStep {
  id: number;
  title: string;
  subtitle: string;
  status: "completed" | "active" | "pending";
}

export default function MintNFTPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { wallet } = useCrossmint();
  const { toast } = useToast();
  const [quantity, setQuantity] = useState(1);
  const [mintState, setMintState] = useState<MintState>("idle");
  const [mintedNftId] = useState(() => Math.floor(Math.random() * 487) + 1);
  const [txHash] = useState(() => `0x${Math.random().toString(16).slice(2, 10).toUpperCase()}`);
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewVideo1Ref = useRef<HTMLVideoElement>(null);
  const previewVideo2Ref = useRef<HTMLVideoElement>(null);
  const previewVideo3Ref = useRef<HTMLVideoElement>(null);
  const [mintSteps, setMintSteps] = useState<MintStep[]>([
    { id: 1, title: "Reserving Supply", subtitle: "Allocation secured for your wallet", status: "pending" },
    { id: 2, title: "Minting NFT", subtitle: "Writing metadata to the network", status: "pending" },
    { id: 3, title: "Finalising", subtitle: "Confirming transaction blocks", status: "pending" },
  ]);

  const gfBalance = user?.gfTokenBalance || 0;
  const isConnected = !!wallet?.address;

  const mintPrice = MINT_PRICE * quantity;
  const networkFee = NETWORK_FEE * quantity;
  const totalAmount = mintPrice + networkFee;
  const totalUSD = totalAmount * 0.049;

  const canMint = isConnected && gfBalance >= totalAmount && quantity <= MAX_PER_WALLET;

  useEffect(() => {
    const seekToFirstFrame = (video: HTMLVideoElement | null) => {
      if (!video) return;
      const handleLoadedData = () => {
        video.currentTime = 0.1;
      };
      video.addEventListener("loadeddata", handleLoadedData);
      video.load();
      return () => video.removeEventListener("loadeddata", handleLoadedData);
    };
    
    seekToFirstFrame(previewVideo1Ref.current);
    seekToFirstFrame(previewVideo2Ref.current);
    seekToFirstFrame(previewVideo3Ref.current);
  }, [mintState]);

  const handleDecrement = () => {
    if (quantity > 1) setQuantity(quantity - 1);
  };

  const handleIncrement = () => {
    if (quantity < MAX_PER_WALLET) setQuantity(quantity + 1);
  };

  const simulateMintingSteps = async () => {
    setMintSteps(steps => steps.map((s, i) => i === 0 ? { ...s, status: "active" } : s));
    await new Promise(r => setTimeout(r, 1500));
    
    setMintSteps(steps => steps.map((s, i) => 
      i === 0 ? { ...s, status: "completed" } : i === 1 ? { ...s, status: "active" } : s
    ));
    await new Promise(r => setTimeout(r, 2000));
    
    setMintSteps(steps => steps.map((s, i) => 
      i <= 1 ? { ...s, status: "completed" } : i === 2 ? { ...s, status: "active" } : s
    ));
    await new Promise(r => setTimeout(r, 1500));
    
    setMintSteps(steps => steps.map(s => ({ ...s, status: "completed" })));
    await new Promise(r => setTimeout(r, 500));
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

    setMintState("processing");
    
    await simulateMintingSteps();
    
    setMintState("video");
    
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {
          setMintState("success");
          toast({
            title: "NFT Minted!",
            description: `Successfully minted ${quantity} NFT${quantity > 1 ? "s" : ""}`,
          });
        });
      }
    }, 100);
  };

  const handleVideoEnd = () => {
    setMintState("success");
    toast({
      title: "NFT Minted!",
      description: `Successfully minted ${quantity} NFT${quantity > 1 ? "s" : ""}`,
    });
  };

  const handleCloseVideo = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    setMintState("success");
  };

  const copyTxHash = () => {
    navigator.clipboard.writeText(txHash);
    toast({ title: "Copied!", description: "Transaction hash copied to clipboard" });
  };

  if (mintState === "processing") {
    return (
      <div className="fixed inset-0 z-[100] bg-[#020617] flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-md md:max-w-2xl flex flex-col items-center">
          <div className="relative mb-8">
            <div className="absolute inset-0 blur-[32px] bg-[#4ade80]/20 rounded-full scale-150" />
            <div className="relative w-48 h-48 md:w-64 md:h-64 rounded-full border-4 border-[#1e293b]/50 flex items-center justify-center">
              <div className="w-40 h-40 md:w-52 md:h-52 rounded-full border-2 border-[#1e293b]/50 flex items-center justify-center overflow-hidden p-0.5">
                <video
                  ref={previewVideo1Ref}
                  src={MINT_VIDEO_URL}
                  className="w-full h-full rounded-full object-cover"
                  muted
                  playsInline
                  preload="metadata"
                />
              </div>
            </div>
            
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2">
              <div className="bg-[#0f172a] border border-[#1e293b] rounded-full px-4 py-2 shadow-lg flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#4ade80] animate-pulse" />
                <span className="text-xs font-bold text-[#4ade80]">On-Chain Processing</span>
              </div>
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-[#f8fafc] mb-2">
              Minting Your NFT
            </h1>
            <p className="text-sm md:text-base text-[#94a3b8] max-w-xs mx-auto">
              Please don't close the app or refresh. Your Guardian is being forged on the blockchain.
            </p>
          </div>

          <div className="w-full max-w-sm bg-[#0f172a] border border-[#1e293b]/50 rounded-3xl p-6">
            <div className="flex flex-col gap-4">
              {mintSteps.map((step, index) => (
                <div key={step.id} className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      step.status === "completed" ? "bg-[#4ade80]" :
                      step.status === "active" ? "bg-[#14532d] animate-pulse" :
                      "bg-[#1e293b]"
                    }`}>
                      {step.status === "completed" ? (
                        <Check className="w-4 h-4 text-[#022c22]" />
                      ) : step.status === "active" ? (
                        <div className="w-3 h-3 rounded-full bg-[#4ade80] animate-pulse" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-[#94a3b8]" />
                      )}
                    </div>
                    {index < mintSteps.length - 1 && (
                      <div className={`w-0.5 h-8 ${
                        step.status === "completed" ? "bg-[#4ade80]/30" : "bg-[#1e293b]/50"
                      }`} />
                    )}
                  </div>
                  <div className="flex-1 pt-0.5">
                    <p className={`text-sm font-bold ${
                      step.status === "active" ? "text-[#4ade80]" : "text-[#f8fafc]"
                    }`}>
                      {step.title}
                    </p>
                    <p className="text-xs text-[#94a3b8]">{step.subtitle}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col items-center gap-4 mt-8">
            <div className="flex items-center gap-2">
              <Shield className="w-3 h-3 text-[#94a3b8]" />
              <span className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">
                Secure Transaction
              </span>
            </div>
            <button
              onClick={copyTxHash}
              className="bg-[#1e293b]/30 rounded-full px-4 py-2 flex items-center gap-2 hover:bg-[#1e293b]/50 transition-colors"
            >
              <span className="text-xs font-mono text-[#94a3b8]">tx: {txHash}...</span>
              <Copy className="w-3 h-3 text-[#94a3b8]" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mintState === "video") {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-6 right-6 z-10 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20"
          onClick={handleCloseVideo}
        >
          <X className="h-6 w-6 text-white" />
        </Button>
        <video
          ref={videoRef}
          src={MINT_VIDEO_URL}
          className="w-full h-full object-contain"
          playsInline
          onEnded={handleVideoEnd}
        />
      </div>
    );
  }

  if (mintState === "success") {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col">
        <header className="sticky top-0 z-40 backdrop-blur-md bg-[#020617]/80 border-b border-white/10">
          <div className="flex items-center justify-between w-full max-w-7xl mx-auto px-4 py-4">
            <Button
              variant="ghost"
              size="icon"
              className="w-10 h-10 rounded-full bg-[#1e293b]/50 hover:bg-[#1e293b]/80"
              onClick={() => navigate("/store")}
            >
              <ArrowLeft className="h-6 w-6 text-white" />
            </Button>
            <span className="text-lg font-bold text-[#f8fafc]">Mint Complete</span>
            <div className="w-10 h-10" />
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center py-12 px-6">
          <div className="w-full max-w-md flex flex-col items-center gap-8">
            <div className="relative w-full max-w-[300px] aspect-[3/4] rounded-3xl overflow-hidden shadow-[0_25px_50px_-12px_rgba(74,222,128,0.3)]">
              <video
                ref={previewVideo2Ref}
                src={MINT_VIDEO_URL}
                className="w-full h-full object-cover"
                muted
                playsInline
                preload="metadata"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-[#4ade80] animate-pulse" />
                  <span className="text-xs font-bold text-[#4ade80] uppercase tracking-wider">
                    Minted Successfully
                  </span>
                </div>
                <span className="text-xl font-bold text-white">
                  Veridian Glassworks #{mintedNftId}
                </span>
              </div>
            </div>

            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">
                Congratulations!
              </h2>
              <p className="text-[#94a3b8] mb-6">
                You've successfully minted {quantity} NFT{quantity > 1 ? "s" : ""}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full">
              <Button
                onClick={() => navigate("/collection")}
                className="flex-1 h-14 rounded-2xl bg-[#4ade80] hover:bg-[#22c55e] text-[#022c22] font-bold"
              >
                View Collection
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setMintState("idle");
                  setQuantity(1);
                  setMintSteps([
                    { id: 1, title: "Reserving Supply", subtitle: "Allocation secured for your wallet", status: "pending" },
                    { id: 2, title: "Minting NFT", subtitle: "Writing metadata to the network", status: "pending" },
                    { id: 3, title: "Finalising", subtitle: "Confirming transaction blocks", status: "pending" },
                  ]);
                }}
                className="flex-1 h-14 rounded-2xl border-[#1e293b] bg-transparent hover:bg-[#1e293b]/50 text-white font-bold"
              >
                Mint Another
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col">
      <header className="sticky top-0 z-40 backdrop-blur-md bg-[#020617]/80 border-b border-white/10">
        <div className="flex items-center justify-between w-full max-w-7xl mx-auto px-4 py-4">
          <Button
            variant="ghost"
            size="icon"
            className="w-10 h-10 rounded-full bg-[#1e293b]/50 hover:bg-[#1e293b]/80"
            onClick={() => navigate("/store")}
          >
            <ArrowLeft className="h-6 w-6 text-white" />
          </Button>
          <span className="text-lg font-bold text-[#f8fafc] md:hidden">Confirm Mint</span>
          <div className="w-10 h-10 md:hidden" />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center py-6 md:py-12 px-4 md:px-8">
        <div className="w-full max-w-[430px] md:max-w-5xl flex flex-col md:flex-row md:items-start md:gap-12 gap-6">
          
          <div className="md:flex-1 md:max-w-md">
            <div className="bg-[#0f172a] border border-[#1e293b]/50 rounded-3xl p-5 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-lg font-bold text-white">NFTs</span>
                <Link href="/store" className="text-sm font-medium text-[#4ade80] hover:underline">
                  View All
                </Link>
              </div>
              <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden shadow-[0_25px_50px_-12px_rgba(74,222,128,0.15)]">
                <video
                  ref={previewVideo3Ref}
                  src={MINT_VIDEO_URL}
                  className="w-full h-full object-cover"
                  muted
                  playsInline
                  preload="metadata"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="md:flex-1 flex flex-col gap-5">
            <div className="bg-[#0f172a] border border-[#1e293b]/50 rounded-3xl overflow-hidden">
              <div className="flex items-center justify-between p-5">
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
            </div>

            <div className="bg-[#0f172a] border border-[#1e293b]/50 rounded-3xl p-5 flex flex-col gap-5">
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

              <div className="h-px bg-[#1e293b]/30" />

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

            <Button
              onClick={handleMint}
              disabled={!canMint || mintState !== "idle"}
              className="w-full h-[68px] rounded-2xl bg-[#4ade80] hover:bg-[#22c55e] disabled:bg-[#4ade80]/50 text-[#022c22] text-xl font-bold shadow-[0_8px_10px_-6px_rgba(74,222,128,0.2),0_20px_25px_-5px_rgba(74,222,128,0.2)] flex items-center justify-center gap-2.5"
            >
              <Sparkles className="h-6 w-6" />
              Confirm Mint
            </Button>

            <p className="text-[10px] text-[#94a3b8] text-center px-4">
              By clicking Confirm, you agree to the Terms of Service and authorize the smart contract to execute this transaction.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
