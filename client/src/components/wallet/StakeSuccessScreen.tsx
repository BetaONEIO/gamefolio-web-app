import { ArrowLeft, Check, ExternalLink, Copy, Share2 } from "lucide-react";
import { useState } from "react";

interface StakeSuccessScreenProps {
  onBack: () => void;
  onDone: () => void;
  onStakeMore?: () => void;
  amount: number;
  newTotalStaked?: number;
  transactionHash?: string;
  apy?: number;
}

const GFT_TO_USD = 0.498;

export default function StakeSuccessScreen({
  onBack,
  onDone,
  onStakeMore,
  amount,
  newTotalStaked = 1750,
  transactionHash = "0x8a2f7c9d3e1b5a4f6c8d2e1f3a5b7c9d3f4b",
  apy = 12.4,
}: StakeSuccessScreenProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(transactionHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const truncatedHash = `${transactionHash.slice(0, 5)}...${transactionHash.slice(-4)}`;
  const usdValue = (amount * GFT_TO_USD).toFixed(2);

  return (
    <div
      className="flex flex-col min-h-screen w-full"
      style={{ background: "#101D27", fontFamily: "Plus Jakarta Sans, sans-serif" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-center px-6 pt-12 pb-6"
        style={{ borderBottom: "1px solid rgba(30, 41, 59, 0.3)" }}
      >
        <div className="flex items-center justify-between w-full max-w-[430px] md:max-w-[600px] lg:max-w-[800px]">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:bg-slate-700"
            style={{ background: "#1e293b", border: "1px solid #1e293b" }}
          >
            <ArrowLeft className="w-6 h-6" style={{ color: "#f8fafc" }} />
          </button>

          <span className="text-xl font-bold" style={{ color: "#f8fafc" }}>
            Transaction Result
          </span>

          <button
            className="w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:bg-slate-700"
            style={{ background: "#1e293b", border: "1px solid #1e293b" }}
          >
            <Share2 className="w-5 h-5" style={{ color: "#4ade80" }} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center gap-10 px-6 py-10 max-w-[430px] md:max-w-[600px] lg:max-w-[800px] mx-auto w-full">
        {/* Success Icon with Glow */}
        <div className="relative">
          <div
            className="absolute rounded-full blur-3xl"
            style={{
              background: "rgba(74, 222, 128, 0.2)",
              width: "176px",
              height: "176px",
              top: "-24px",
              left: "-24px",
            }}
          />
          <div
            className="relative w-32 h-32 rounded-full flex items-center justify-center"
            style={{
              background: "#0f172a",
              border: "2px solid rgba(74, 222, 128, 0.3)",
              boxShadow: "0 25px 50px -12px rgba(74, 222, 128, 0.1)",
            }}
          >
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center"
              style={{
                background: "rgba(74, 222, 128, 0.1)",
                border: "1px solid rgba(74, 222, 128, 0.2)",
              }}
            >
              <Check className="w-14 h-14" style={{ color: "#4ade80" }} strokeWidth={2.5} />
            </div>
          </div>
        </div>

        {/* Success Message */}
        <div className="flex flex-col items-center gap-3 text-center">
          <span
            className="text-3xl font-black tracking-tight"
            style={{ color: "#f8fafc", letterSpacing: "-0.75px" }}
          >
            Stake Confirmed
          </span>
          <span
            className="text-base max-w-[300px] leading-relaxed"
            style={{ color: "#94a3b8", lineHeight: "26px" }}
          >
            Your transaction has been validated on the blockchain. Your GFT is now earning rewards.
          </span>
        </div>

        {/* Transaction Details Card */}
        <div
          className="flex flex-col gap-5 p-6 rounded-2xl w-full max-w-[382px]"
          style={{ background: "#0f172a", border: "1px solid rgba(30, 41, 59, 0.5)" }}
        >
          {/* Transaction ID Row */}
          <div className="flex items-center justify-between">
            <span
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: "#94a3b8", letterSpacing: "0.6px" }}
            >
              Transaction ID
            </span>
            <div className="flex items-center gap-2">
              <span
                className="text-sm"
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
                  <Copy className="w-4 h-4" style={{ color: "#4ade80" }} />
                )}
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="w-full h-px" style={{ background: "rgba(30, 41, 59, 0.3)" }} />

          {/* Amount Staked Row */}
          <div className="flex items-center justify-between">
            <span
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: "#94a3b8", letterSpacing: "0.6px" }}
            >
              Amount Staked
            </span>
            <div className="flex flex-col items-end">
              <span className="text-sm font-bold" style={{ color: "#f8fafc" }}>
                {amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GFT
              </span>
              <span className="text-xs" style={{ color: "#94a3b8" }}>
                ≈ ${usdValue}
              </span>
            </div>
          </div>

          {/* Pool Reward APR Row */}
          <div className="flex items-center justify-between">
            <span
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: "#94a3b8", letterSpacing: "0.6px" }}
            >
              Pool Reward (APR)
            </span>
            <span className="text-sm font-bold" style={{ color: "#4ade80" }}>
              +{apy}%
            </span>
          </div>

          {/* Status Row */}
          <div className="flex items-center justify-between">
            <span
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: "#94a3b8", letterSpacing: "0.6px" }}
            >
              Status
            </span>
            <div
              className="flex items-center gap-1.5 px-3 py-1 rounded-full"
              style={{
                background: "rgba(74, 222, 128, 0.1)",
                border: "1px solid rgba(74, 222, 128, 0.2)",
              }}
            >
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "#4ade80" }}
              />
              <span
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color: "#4ade80", letterSpacing: "0.25px" }}
              >
                Confirmed
              </span>
            </div>
          </div>
        </div>

        {/* View on Explorer */}
        <button className="flex items-center gap-2 py-2">
          <svg width="16" height="16" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" clipRule="evenodd" d="M0 6.33334C0 2.83553 2.83553 0 6.33334 0C9.83114 0 12.6667 2.83553 12.6667 6.33334C12.6667 9.83114 9.83114 12.6667 6.33334 12.6667C2.83553 12.6667 0 9.83114 0 6.33334Z" stroke="#94A3B8" />
            <path d="M11 11L13.3333 13.3333" stroke="#94A3B8" strokeLinecap="round" />
          </svg>
          <span className="text-sm font-medium" style={{ color: "#94a3b8" }}>
            View on Explorer
          </span>
          <ExternalLink className="w-3 h-3" style={{ color: "#94a3b8" }} />
        </button>
      </div>

      {/* Bottom Buttons */}
      <div
        className="flex flex-col gap-3 px-6 py-6 pb-10"
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
            boxShadow: "0 10px 15px -3px rgba(74, 222, 128, 0.2), 0 4px 6px -4px rgba(74, 222, 128, 0.2)",
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 9H21M3 15H21M9 9V21M9 3V21M21 7.8V16.2C21 17.8802 21 18.7202 20.673 19.362C20.3854 19.9265 19.9265 20.3854 19.362 20.673C18.7202 21 17.8802 21 16.2 21H7.8C6.11984 21 5.27976 21 4.63803 20.673C4.07354 20.3854 3.6146 19.9265 3.32698 19.362C3 18.7202 3 17.8802 3 16.2V7.8C3 6.11984 3 5.27976 3.32698 4.63803C3.6146 4.07354 4.07354 3.6146 4.63803 3.32698C5.27976 3 6.11984 3 7.8 3H16.2C17.8802 3 18.7202 3 19.362 3.32698C19.9265 3.6146 20.3854 4.07354 20.673 4.63803C21 5.27976 21 6.11984 21 7.8Z" stroke="#022C22" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Go to Wallet
        </button>

        <button
          onClick={onStakeMore}
          className="w-full h-[70px] rounded-2xl font-bold text-lg flex items-center justify-center transition-all hover:bg-slate-700"
          style={{
            background: "#1e293b",
            border: "1px solid #1e293b",
            color: "#f8fafc",
          }}
        >
          Stake More
        </button>
      </div>
    </div>
  );
}
