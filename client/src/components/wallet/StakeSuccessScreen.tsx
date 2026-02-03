import { ArrowLeft, Check, ExternalLink, Copy, TrendingUp } from "lucide-react";
import { useState } from "react";

interface StakeSuccessScreenProps {
  onBack: () => void;
  onDone: () => void;
  amount: number;
  newTotalStaked?: number;
  transactionHash?: string;
  apy?: number;
}

export default function StakeSuccessScreen({
  onBack,
  onDone,
  amount,
  newTotalStaked = 1750,
  transactionHash = "0x7a2f8c9d3e1b5a4f6c8d2e1f3a5b7c9d",
  apy = 12.5,
}: StakeSuccessScreenProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(transactionHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const truncatedHash = `${transactionHash.slice(0, 10)}...${transactionHash.slice(-8)}`;

  return (
    <div
      className="flex flex-col min-h-screen w-full"
      style={{ background: "#020617", fontFamily: "Plus Jakarta Sans, sans-serif" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 pt-12 pb-6"
        style={{ borderBottom: "1px solid rgba(30, 41, 59, 0.3)" }}
      >
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:bg-slate-700"
          style={{ background: "#1e293b", border: "1px solid #1e293b" }}
        >
          <ArrowLeft className="w-6 h-6" style={{ color: "#f8fafc" }} />
        </button>

        <span className="text-xl font-bold" style={{ color: "#f8fafc" }}>
          Stake Complete
        </span>

        <div className="w-10 h-10" />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6 py-8">
        {/* Success Icon with Glow */}
        <div className="relative">
          <div
            className="absolute inset-0 rounded-full blur-xl"
            style={{
              background: "rgba(74, 222, 128, 0.3)",
              width: "180px",
              height: "180px",
              top: "-26px",
              left: "-26px",
            }}
          />
          <div
            className="relative w-32 h-32 rounded-full flex items-center justify-center"
            style={{
              background: "#4ade80",
              boxShadow: "0 0 40px rgba(74, 222, 128, 0.5)",
            }}
          >
            <Check className="w-16 h-16" style={{ color: "#022c22" }} strokeWidth={3} />
          </div>
        </div>

        {/* Success Message */}
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="text-2xl font-bold" style={{ color: "#f8fafc" }}>
            Stake Successful!
          </span>
          <span className="text-base max-w-[300px]" style={{ color: "#94a3b8" }}>
            Your GFT has been successfully staked and is now earning rewards.
          </span>
        </div>

        {/* Amount Staked */}
        <div
          className="flex flex-col items-center gap-2 p-6 rounded-2xl w-full max-w-[382px]"
          style={{ background: "rgba(20, 83, 45, 0.15)", border: "1px solid rgba(74, 222, 128, 0.3)" }}
        >
          <span className="text-sm font-medium" style={{ color: "#94a3b8" }}>
            Amount Staked
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold" style={{ color: "#4ade80" }}>
              +{amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-xl font-bold" style={{ color: "#4ade80" }}>
              GFT
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <TrendingUp className="w-4 h-4" style={{ color: "#4ade80" }} />
            <span className="text-sm font-bold" style={{ color: "#4ade80" }}>
              Earning {apy}% APY
            </span>
          </div>
        </div>

        {/* Transaction Details Card */}
        <div
          className="flex flex-col gap-4 p-5 rounded-2xl w-full max-w-[382px]"
          style={{ background: "#0f172a", border: "1px solid rgba(30, 41, 59, 0.5)" }}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: "#94a3b8" }}>
              New Total Staked
            </span>
            <span className="text-sm font-bold" style={{ color: "#f8fafc" }}>
              {newTotalStaked.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GFT
            </span>
          </div>

          <div className="w-full h-px" style={{ background: "rgba(30, 41, 59, 0.5)" }} />

          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: "#94a3b8" }}>
              Transaction Hash
            </span>
            <div className="flex items-center gap-2">
              <span
                className="text-sm font-medium"
                style={{ color: "#f8fafc", fontFamily: "JetBrains Mono, monospace" }}
              >
                {truncatedHash}
              </span>
              <button
                onClick={handleCopy}
                className="p-1 rounded transition-colors hover:bg-slate-700"
              >
                {copied ? (
                  <Check className="w-4 h-4" style={{ color: "#4ade80" }} />
                ) : (
                  <Copy className="w-4 h-4" style={{ color: "#94a3b8" }} />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: "#94a3b8" }}>
              Network Fee
            </span>
            <span className="text-sm font-bold" style={{ color: "#4ade80" }}>
              Free
            </span>
          </div>
        </div>

        {/* View on Explorer */}
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-xl transition-colors hover:bg-slate-800"
        >
          <ExternalLink className="w-4 h-4" style={{ color: "#4ade80" }} />
          <span className="text-sm font-medium" style={{ color: "#4ade80" }}>
            View on Explorer
          </span>
        </button>
      </div>

      {/* Bottom Button */}
      <div
        className="px-6 py-6 pb-10"
        style={{
          background: "rgba(2, 6, 23, 0.8)",
          backdropFilter: "blur(6px)",
          borderTop: "1px solid rgba(30, 41, 59, 0.3)",
        }}
      >
        <button
          onClick={onDone}
          className="w-full h-[68px] rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all hover:opacity-90 active:scale-[0.98]"
          style={{
            background: "#4ade80",
            color: "#022c22",
            boxShadow: "0 0 20px -5px #4ade80",
          }}
        >
          Done
        </button>
      </div>
    </div>
  );
}
