import { useState, useRef, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useCrossmint } from "@/hooks/use-crossmint";
import { ArrowLeft, Minus, Plus, Wallet, Sparkles, X, ExternalLink, Check, Shield, Copy, AlertTriangle, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import MultiMintSuccessScreen from "@/components/mint/MultiMintSuccessScreen";

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
  const [allowanceApproved, setAllowanceApproved] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
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
  const walletAddress = wallet?.address || user?.walletAddress;
  const isConnected = !!walletAddress;

  const mintPrice = MINT_PRICE * quantity;
  const networkFee = NETWORK_FEE * quantity;
  const totalAmount = mintPrice + networkFee;
  const totalUSD = totalAmount * 0.049;

  const canMint = isConnected && gfBalance >= totalAmount && quantity <= MAX_PER_WALLET && allowanceApproved;
  const hasInsufficientBalance = gfBalance < totalAmount;

  const handleEnableAllowance = async () => {
    if (!isConnected) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }
    setIsApproving(true);
    await new Promise(r => setTimeout(r, 2000));
    setAllowanceApproved(true);
    setIsApproving(false);
    toast({
      title: "Allowance Approved",
      description: "GFT spending has been enabled for the mint contract",
    });
  };

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
    const rarityScore = (Math.random() * 10 + 90).toFixed(1);
    
    // Show multi-mint success screen when quantity > 1
    if (quantity > 1) {
      const mintedNfts = Array.from({ length: quantity }, (_, i) => ({
        id: mintedNftId + i,
        imageUrl: `https://rupzmxqyhqktpifgfmzc.supabase.co/storage/v1/object/public/gamefolio-assets/nft-placeholders/guardian-${(i % 3) + 1}.png`,
        rarity: Math.floor(Math.random() * 30) + 70,
      }));
      
      return (
        <MultiMintSuccessScreen
          quantity={quantity}
          mintedNfts={mintedNfts}
          txHash={txHash}
          onViewCollection={() => navigate("/collection")}
          onViewExplorer={() => window.open(`https://explorer.skale.space/tx/${txHash}`, "_blank")}
          onBack={() => navigate("/store")}
        />
      );
    }
    
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-40 backdrop-blur-md bg-[#020617]/80 border-b border-[#1e293b]/50">
          <div className="flex items-center justify-between w-full max-w-[430px] mx-auto px-6 pt-12 pb-4">
            <div className="w-10 h-10" />
            <span className="text-lg font-bold text-[#f8fafc]">Mint Complete</span>
            <Button
              variant="ghost"
              size="icon"
              className="w-10 h-10 rounded-full bg-[#1e293b]/50 hover:bg-[#1e293b]/80"
              onClick={() => navigate("/store")}
            >
              <X className="h-5 w-5 text-white" />
            </Button>
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center py-6 px-6 overflow-y-auto">
          <div className="w-full max-w-[430px] flex flex-col items-center gap-6">
            
            {/* NFT Image with Glow */}
            <div className="relative w-[300px] h-[300px]">
              {/* Blur glow background */}
              <div className="absolute inset-0 blur-[40px] bg-[#4ade80]/20 rounded-full scale-100" />
              
              {/* NFT Container */}
              <div className="relative w-[300px] h-[300px] rounded-[40px] border-2 border-[#4ade80]/30 overflow-hidden bg-white/[0.01] shadow-[0_25px_50px_-12px_rgba(74,222,128,0.2)]">
                <video
                  ref={previewVideo2Ref}
                  src={MINT_VIDEO_URL}
                  className="w-full h-full object-cover"
                  muted
                  playsInline
                  preload="metadata"
                />
                
                {/* Gradient overlay with badge */}
                <div className="absolute bottom-0 left-0 right-0 h-[69px] bg-gradient-to-t from-black/80 to-transparent flex items-center px-6">
                  <div className="backdrop-blur-sm bg-[#4ade80]/20 border border-[#4ade80]/30 rounded px-2 py-1">
                    <span className="text-[10px] font-bold text-[#4ade80] uppercase tracking-[0.5px]">
                      Rare Edition
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Success checkmark badge */}
              <div className="absolute -bottom-4 right-6 w-14 h-14 rounded-full bg-[#4ade80] border-4 border-[#020617] flex items-center justify-center shadow-[0_4px_6px_-4px_rgba(74,222,128,0.4),0_10px_15px_-3px_rgba(74,222,128,0.4)]">
                <Check className="h-8 w-8 text-[#022c22]" />
              </div>
            </div>

            {/* Transaction Info */}
            <div className="flex flex-col items-center gap-3 mt-2">
              {/* Tx Hash Pill */}
              <button
                onClick={() => {
                  navigator.clipboard.writeText(txHash);
                  toast({ title: "Copied!", description: "Transaction hash copied to clipboard" });
                }}
                className="flex items-center gap-2 bg-[#1e293b]/30 border border-[#1e293b]/30 rounded-full px-4 py-2 hover:bg-[#1e293b]/50 transition-colors"
              >
                <span className="text-[10px] text-[#94a3b8] font-mono">
                  Tx Hash: {txHash.slice(0, 10)}...
                </span>
                <Copy className="h-3.5 w-3.5 text-[#94a3b8]" />
              </button>
              
              {/* Network Indicator */}
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#4ade80]" />
                <span className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-[2px]">
                  Network: SKALE Nebula
                </span>
              </div>
            </div>

            {/* Success Text */}
            <div className="flex flex-col items-center gap-1 text-center w-[300px]">
              <span className="text-sm font-bold text-[#4ade80] uppercase tracking-[1.4px]">
                Successfully Minted
              </span>
              <h2 className="text-[30px] font-bold text-[#f8fafc] leading-9">
                Guardian #{mintedNftId}
              </h2>
              <p className="text-sm text-[#94a3b8] leading-5 mt-1">
                Your Guardian has been successfully forged and added to your collection on the blockchain.
              </p>
            </div>

            {/* Stats Cards */}
            <div className="flex gap-3 w-full max-w-[382px]">
              {/* Rarity Score */}
              <div className="flex-1 bg-[#0f172a] border border-[#1e293b]/50 rounded-2xl p-4 flex flex-col gap-1">
                <span className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-tight">
                  Rarity Score
                </span>
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path fillRule="evenodd" clipRule="evenodd" d="M6.09091 3.61833C6.94044 2.09494 7.36486 1.33325 7.99983 1.33325C8.6348 1.33325 9.05923 2.09494 9.90876 3.61833L10.1287 4.01259C10.3701 4.44573 10.4908 4.66231 10.6785 4.80512C10.8662 4.94794 11.1009 5.00091 11.5703 5.10685L11.9967 5.2034C13.6461 5.57687 14.4702 5.76327 14.6667 6.39422C14.8624 7.02449 14.3006 7.68226 13.1761 8.99712L12.8851 9.33706C12.566 9.71053 12.4057 9.8976 12.334 10.1283C12.2622 10.3596 12.2864 10.609 12.3346 11.1072L12.3789 11.5611C12.5485 13.3158 12.6337 14.1929 12.1201 14.5824C11.6065 14.972 10.8341 14.6166 9.29055 13.9059L8.89026 13.7222C8.45175 13.5197 8.2325 13.4191 7.99983 13.4191C7.76717 13.4191 7.54791 13.5197 7.1094 13.7222L6.70978 13.9059C5.16561 14.6166 4.39319 14.972 3.88025 14.5831C3.36598 14.1929 3.45113 13.3158 3.62077 11.5611L3.66502 11.1079C3.7133 10.609 3.73744 10.3596 3.66502 10.1289C3.59395 9.8976 3.4337 9.71053 3.11454 9.33773L2.82354 8.99712C1.6991 7.68293 1.13722 7.02516 1.33301 6.39422C1.5288 5.76327 2.35419 5.5762 4.00363 5.2034L4.43007 5.10685C4.89875 5.00091 5.13276 4.94794 5.32117 4.80512C5.50958 4.66231 5.6296 4.44573 5.87098 4.01259L6.09091 3.61833Z" fill="#4ADE80" />
                  </svg>
                  <span className="text-lg font-bold text-[#f8fafc]">{rarityScore}</span>
                </div>
              </div>
              
              {/* Mint Number */}
              <div className="flex-1 bg-[#0f172a] border border-[#1e293b]/50 rounded-2xl p-4 flex flex-col gap-1">
                <span className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-tight">
                  Mint Number
                </span>
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path fillRule="evenodd" clipRule="evenodd" d="M7.14835 2.11694C7.22198 1.85073 7.06588 1.57524 6.79968 1.5016C6.53348 1.42796 6.25798 1.58407 6.18434 1.85027L5.17501 5.48361H2.66634C2.3902 5.48361 2.16634 5.70746 2.16634 5.98361C2.16634 6.25975 2.3902 6.48361 2.66634 6.48361H4.89768L3.87901 10.1503H1.33301C1.05687 10.1503 0.833008 10.3741 0.833008 10.6503C0.833008 10.9264 1.05687 11.1503 1.33301 11.1503H3.60101L2.85101 13.8503C2.77737 14.1165 2.93347 14.392 3.19968 14.4656C3.46588 14.5392 3.74137 14.3831 3.81501 14.1169L4.63901 11.1503H9.60101L8.85101 13.8503C8.77738 14.1165 8.93348 14.392 9.19968 14.4656C9.46588 14.5392 9.74138 14.3831 9.81501 14.1169L10.639 11.1503H13.333C13.6092 11.1503 13.833 10.9264 13.833 10.6503C13.833 10.3741 13.6092 10.1503 13.333 10.1503H10.917L11.935 6.48361H14.6664C14.9425 6.48361 15.1664 6.25975 15.1664 5.98361C15.1664 5.70746 14.9425 5.48361 14.6664 5.48361H12.213L13.1483 2.11694C13.196 1.94473 13.1481 1.7602 13.0228 1.63285C12.8975 1.50549 12.7138 1.45466 12.5408 1.49951C12.3679 1.54436 12.232 1.67807 12.1843 1.85027L11.175 5.48361H6.21301L7.14835 2.11694ZM9.87901 10.1503L10.8977 6.48361H5.93501L4.91701 10.1503H9.87901Z" fill="#4ADE80" />
                  </svg>
                  <span className="text-lg font-bold text-[#f8fafc]">{mintedNftId}/1000</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 w-full max-w-[382px]">
              <Button
                onClick={() => navigate("/collection")}
                className="w-full h-14 rounded-2xl bg-[#4ade80] hover:bg-[#22c55e] text-[#022c22] text-base font-bold shadow-[0_4px_6px_-4px_rgba(74,222,128,0.2),0_10px_15px_-3px_rgba(74,222,128,0.2)] flex items-center justify-center gap-2"
              >
                <Wallet className="h-5 w-5" />
                View in My NFTs
              </Button>
              <Button
                onClick={() => window.open(`https://explorer.skale.space/tx/${txHash}`, "_blank")}
                className="w-full h-14 rounded-2xl bg-[#1e293b] hover:bg-[#334155] border border-[#1e293b]/50 text-[#f8fafc] text-base font-bold flex items-center justify-center gap-2"
              >
                <ExternalLink className="h-5 w-5" />
                View on Explorer
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col">
      <header className="sticky top-0 z-40 backdrop-blur-md bg-[#020617]/80">
        <div className="flex items-center justify-between w-full max-w-7xl mx-auto px-4 pt-12 pb-4">
          <Button
            variant="ghost"
            size="icon"
            className="w-10 h-10 rounded-full bg-[#1e293b]/50 hover:bg-[#1e293b]/80"
            onClick={() => navigate("/store")}
          >
            <ArrowLeft className="h-6 w-6 text-white" />
          </Button>
          <span className="text-lg font-bold text-[#f8fafc]">NFT Minting</span>
          <div className="w-10 h-10" />
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center py-6 md:py-12 px-4 md:px-8 overflow-y-auto">
        <div className="w-full max-w-[430px] md:max-w-5xl flex flex-col md:flex-row md:items-start md:gap-12 gap-6">

          {/* NFT Preview Card */}
          <div className="md:flex-1 md:max-w-[382px]">
            <div className="relative w-full aspect-square rounded-3xl overflow-hidden bg-white/[0.01] shadow-[0_25px_50px_-12px_rgba(74,222,128,0.05)]">
              <video
                ref={previewVideo3Ref}
                src={MINT_VIDEO_URL}
                className="w-full h-full object-cover"
                muted
                playsInline
                preload="metadata"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-0 left-0 right-0 p-6 flex items-end justify-between">
                <div className="flex flex-col gap-2">
                  <div className="bg-[#4ade80]/20 border border-[#4ade80]/20 rounded-xl px-2 py-1 w-fit">
                    <span className="text-[10px] font-bold text-[#4ade80] uppercase tracking-[0.5px]">
                      Live Minting
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-[#f8fafc] leading-8">
                    Cosmic Fragments #124
                  </h2>
                  <span className="text-sm text-[#94a3b8]">
                    Celestial Collection by Astra
                  </span>
                </div>
                <div className="backdrop-blur-md bg-white/10 border border-white/10 rounded-2xl p-3 flex flex-col items-center">
                  <span className="text-[10px] font-bold text-[#94a3b8] uppercase text-center">
                    Supply
                  </span>
                  <span className="text-sm font-bold text-[#f8fafc]">
                    487/1000
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Minting Details */}
          <div className="md:flex-1 flex flex-col gap-6 max-w-[382px] w-full mx-auto md:mx-0">

            {/* Balance & Allowance Card */}
            <div className="bg-[#0f172a] border border-[#1e293b]/50 rounded-3xl overflow-hidden">
              {/* Balance Header */}
              <div className="flex items-center justify-between p-5 bg-[#14532d]/5 border-b border-[#1e293b]/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#4ade80]/20 flex items-center justify-center">
                    <svg width="18" height="15" viewBox="0 0 18 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" clipRule="evenodd" d="M15.9164 4.16984C15.8691 4.16706 15.8189 4.16595 15.7655 4.1665H13.6614C11.938 4.1665 10.4639 5.52317 10.4639 7.2915C10.4639 9.05984 11.9389 10.4165 13.6614 10.4165H15.7655C15.8189 10.4171 15.8694 10.4159 15.9172 10.4132C16.6498 10.369 17.2363 9.78864 17.288 9.0565C17.2914 9.0065 17.2914 8.95234 17.2914 8.90234V5.68067C17.2914 5.63067 17.2914 5.5765 17.288 5.5265C17.2363 4.79437 16.649 4.21401 15.9164 4.16984ZM13.4772 8.12484C13.9205 8.12484 14.2797 7.7515 14.2797 7.2915C14.2797 6.8315 13.9205 6.45817 13.4772 6.45817C13.033 6.45817 12.6739 6.8315 12.6739 7.2915C12.6739 7.7515 13.033 8.12484 13.4772 8.12484Z" fill="#4ADE80" />
                      <path fillRule="evenodd" clipRule="evenodd" d="M15.765 11.6667C15.8234 11.6643 15.8795 11.69 15.9158 11.7357C15.9522 11.7815 15.9646 11.8419 15.9491 11.8983C15.7825 12.4916 15.5166 12.9983 15.0908 13.4233C14.4666 14.0483 13.6758 14.3241 12.6991 14.4558C11.7492 14.5833 10.5367 14.5833 9.00499 14.5833H7.24499C5.71333 14.5833 4.49999 14.5833 3.55083 14.4558C2.57416 14.3241 1.78333 14.0475 1.15917 13.4241C0.535833 12.8 0.259166 12.0092 0.1275 11.0325C0 10.0825 0 8.86999 0 7.33832V7.24499C0 5.71333 0 4.49999 0.1275 3.54999C0.259166 2.57333 0.535833 1.7825 1.15917 1.15833C1.78333 0.534999 2.57416 0.258333 3.55083 0.126666C4.50083 0 5.71333 0 7.24499 0H9.00499C10.5367 0 11.75 0 12.6991 0.1275C13.6758 0.259166 14.4666 0.535833 15.0908 1.15917C15.5166 1.58583 15.7825 2.09166 15.9491 2.685C15.9646 2.74139 15.9522 2.80179 15.9158 2.84756C15.8795 2.89334 15.8234 2.91901 15.765 2.91666H13.6616C11.2975 2.91666 9.21415 4.78333 9.21415 7.29166C9.21415 9.79999 11.2975 11.6667 13.6616 11.6667H15.765ZM4.16666 10.4167C3.82148 10.4167 3.54166 10.1368 3.54166 9.79165V4.79166C3.54166 4.44648 3.82148 4.16666 4.16666 4.16666C4.51184 4.16666 4.79166 4.44648 4.79166 4.79166V9.79165C4.79166 10.1368 4.51184 10.4167 4.16666 10.4167Z" fill="#4ADE80" />
                    </svg>
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
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className={`h-3 w-3 ${allowanceApproved ? 'text-[#4ade80]' : 'text-[#ef4444]'}`} />
                  <span className={`text-[10px] font-bold uppercase ${allowanceApproved ? 'text-[#4ade80]' : 'text-[#ef4444]'}`}>
                    {allowanceApproved ? 'Approved' : 'No Allowance'}
                  </span>
                </div>
              </div>

              {/* Mint Details */}
              <div className="p-5 flex flex-col gap-5">
                {/* Quantity Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-[#f8fafc]">Mint Quantity</span>
                    <span className="text-[10px] font-bold text-[#94a3b8] uppercase">
                      {MINT_PRICE} GFT per NFT
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

                {/* Price Breakdown */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#94a3b8]">Price ({quantity} NFT)</span>
                    <span className="text-sm font-bold text-[#f8fafc]">
                      {mintPrice.toFixed(2)} GFT
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#94a3b8]">Gas Estimate</span>
                    <span className="text-sm font-bold text-[#f8fafc]">
                      {networkFee.toFixed(2)} GFT
                    </span>
                  </div>
                </div>

                {/* Total */}
                <div className="flex items-center justify-between pt-3 border-t border-[#1e293b]/30">
                  <span className="text-base font-bold text-[#f8fafc]">Total Required</span>
                  <div className="flex flex-col items-end">
                    <span className="text-xl font-bold text-[#4ade80]">
                      {totalAmount.toFixed(2)} GFT
                    </span>
                    <span className="text-[10px] font-medium text-[#94a3b8]">
                      {hasInsufficientBalance ? 'Insufficient balance' : `≈ $${totalUSD.toFixed(2)} USD`}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Allowance Warning */}
            {!allowanceApproved && (
              <div className="bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-2xl p-5 flex gap-3">
                <AlertTriangle className="h-5 w-5 text-[#ef4444] flex-shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-bold text-[#f8fafc]">Allowance Required</span>
                  <span className="text-xs text-[#94a3b8] leading-[19.5px]">
                    To mint your NFT, you first need to authorize the mint contract to spend GFT from your wallet.
                  </span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-4">
              {!allowanceApproved ? (
                <>
                  <button
                    onClick={handleEnableAllowance}
                    disabled={isApproving}
                    className="w-full h-[68px] rounded-2xl bg-[#4ade80] hover:bg-[#22c55e] disabled:opacity-70 text-[#022c22] text-xl font-bold flex items-center justify-center gap-2.5 transition-colors"
                    style={{ boxShadow: '0 8px 10px -6px rgba(74, 222, 128, 0.2), 0 20px 25px -5px rgba(74, 222, 128, 0.2)' }}
                  >
                    {isApproving ? (
                      <>
                        <Loader2 className="h-6 w-6 animate-spin" />
                        Approving...
                      </>
                    ) : (
                      <>
                        <Lock className="h-6 w-6" />
                        Enable GFT Spending
                      </>
                    )}
                  </button>
                  <button
                    disabled
                    className="w-full h-[68px] rounded-2xl bg-[#1e293b] text-[#94a3b8] text-xl font-bold flex items-center justify-center gap-2.5 cursor-not-allowed"
                  >
                    <Sparkles className="h-6 w-6" />
                    Mint NFT
                  </button>
                </>
              ) : (
                <>
                  <div className="w-full h-[68px] rounded-2xl bg-[#1e293b] text-[#4ade80] text-xl font-bold flex items-center justify-center gap-2.5">
                    <Check className="h-6 w-6" />
                    GFT Spending Enabled
                  </div>
                  <Button
                    onClick={handleMint}
                    disabled={!canMint || mintState !== "idle"}
                    className="w-full h-[68px] rounded-2xl bg-[#4ade80] hover:bg-[#22c55e] disabled:bg-[#4ade80]/50 text-[#022c22] text-xl font-bold flex items-center justify-center gap-2.5"
                    style={{ boxShadow: '0 8px 10px -6px rgba(74, 222, 128, 0.2), 0 20px 25px -5px rgba(74, 222, 128, 0.2)' }}
                  >
                    <Sparkles className="h-6 w-6" />
                    Mint NFT
                  </Button>
                </>
              )}
            </div>

            <p className="text-[10px] text-[#94a3b8] text-center px-4 leading-[16.25px]">
              Enabling GFT spending is a one-time transaction per contract. This will call GFT.approve(mintContract, maxUint256) to save you gas on future mints.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
