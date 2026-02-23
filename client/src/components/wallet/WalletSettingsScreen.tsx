import { ArrowLeft, Copy, Check, ExternalLink, Headphones, Shield, ChevronRight } from "lucide-react";
import { useState } from "react";

interface WalletSettingsScreenProps {
  onBack: () => void;
  walletAddress?: string;
  network?: string;
  isConnected?: boolean;
}

export default function WalletSettingsScreen({
  onBack,
  walletAddress = "0x12a8...3b89e4f2",
  network = "SKALE Nebula",
  isConnected = true,
}: WalletSettingsScreenProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="flex flex-col min-h-screen w-full"
      style={{ background: "#101D27", fontFamily: "Plus Jakarta Sans, sans-serif" }}
    >
      {/* Header with gradient */}
      <div
        className="flex items-center justify-center px-6 pt-12 pb-6"
        style={{
          background: "linear-gradient(180deg, rgba(20, 83, 45, 0.2) 0%, #101D27 100%)",
          borderBottom: "1px solid rgba(30, 41, 59, 0.3)",
        }}
      >
        <div className="flex items-center justify-between w-full max-w-[430px] md:max-w-[600px] lg:max-w-[800px]">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:bg-slate-700"
            style={{ background: "#1e293b", border: "1px solid #1e293b" }}
          >
            <ArrowLeft className="w-6 h-6" style={{ color: "#f8fafc" }} />
          </button>

          <span className="text-lg font-bold" style={{ color: "#f8fafc" }}>
            Wallet Settings
          </span>

          <div className="w-10 h-10" />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col px-6 py-6 gap-8 max-w-[430px] md:max-w-[600px] lg:max-w-[800px] mx-auto w-full">
        {/* Identity & Network Section */}
        <div className="flex flex-col gap-4">
          <span
            className="text-xs font-bold uppercase tracking-wider px-0.5"
            style={{ color: "#94a3b8", letterSpacing: "1.2px" }}
          >
            Identity & Network
          </span>

          <div
            className="flex flex-col rounded-2xl overflow-hidden"
            style={{ background: "#0f172a", border: "1px solid rgba(30, 41, 59, 0.5)" }}
          >
            {/* Current Network Row */}
            <div className="flex items-center justify-between p-5">
              <div className="flex flex-col gap-1">
                <span
                  className="text-[10px] uppercase tracking-wide"
                  style={{ color: "#94a3b8", letterSpacing: "0.25px" }}
                >
                  Current Network
                </span>
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: isConnected ? "#4ade80" : "#f87171" }}
                  />
                  <span className="text-base font-bold" style={{ color: "#fff" }}>
                    {network}
                  </span>
                </div>
              </div>

              {/* Connected Badge */}
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{
                  background: "rgba(20, 83, 45, 0.2)",
                  border: "1px solid rgba(74, 222, 128, 0.3)",
                }}
              >
                <Shield className="w-3.5 h-3.5" style={{ color: "#4ade80" }} />
                <span
                  className="text-[10px] font-bold uppercase"
                  style={{ color: "#4ade80" }}
                >
                  {isConnected ? "Connected" : "Disconnected"}
                </span>
              </div>
            </div>

            {/* Public Address Row */}
            <div
              className="flex items-center justify-between p-4 mx-3 mb-3 rounded-2xl"
              style={{ background: "rgba(2, 6, 23, 0.5)", border: "1px solid #1e293b" }}
            >
              <div className="flex flex-col gap-0.5">
                <span
                  className="text-[10px] uppercase tracking-wide"
                  style={{ color: "#94a3b8", letterSpacing: "-0.25px" }}
                >
                  Your Public Address
                </span>
                <span
                  className="text-sm font-medium"
                  style={{ color: "#f8fafc", fontFamily: "JetBrains Mono, monospace", letterSpacing: "-0.35px" }}
                >
                  {walletAddress}
                </span>
              </div>

              <button
                onClick={handleCopy}
                className="w-[42px] h-[42px] rounded-xl flex items-center justify-center transition-colors hover:bg-slate-700"
                style={{ background: "#1e293b", border: "1px solid rgba(30, 41, 59, 0.5)" }}
              >
                {copied ? (
                  <Check className="w-5 h-5" style={{ color: "#4ade80" }} />
                ) : (
                  <Copy className="w-5 h-5" style={{ color: "#4ade80" }} />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Actions & Resources Section */}
        <div className="flex flex-col gap-3">
          <span
            className="text-xs font-bold uppercase tracking-wider px-0.5"
            style={{ color: "#94a3b8", letterSpacing: "1.2px" }}
          >
            Actions & Resources
          </span>

          <div
            className="flex flex-col rounded-2xl overflow-hidden"
            style={{ background: "#0f172a", border: "1px solid rgba(30, 41, 59, 0.5)" }}
          >
            {/* View on Explorer */}
            <button
              className="flex items-center gap-4 p-4 transition-colors hover:bg-slate-800/50"
              style={{ borderBottom: "1px solid rgba(30, 41, 59, 0.3)" }}
            >
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: "#1e293b", border: "1px solid #1e293b" }}
              >
                <ExternalLink className="w-5 h-5" style={{ color: "#f8fafc" }} />
              </div>
              <div className="flex flex-col items-start gap-0 flex-1">
                <span className="text-sm" style={{ color: "#f8fafc" }}>
                  View on Explorer
                </span>
                <span className="text-[11px]" style={{ color: "#94a3b8" }}>
                  Check transactions on SKALE Labs
                </span>
              </div>
              <ChevronRight className="w-5 h-5" style={{ color: "#94a3b8" }} />
            </button>

            {/* Customer Support */}
            <button className="flex items-center gap-4 p-4 transition-colors hover:bg-slate-800/50">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: "#1e293b", border: "1px solid #1e293b" }}
              >
                <Headphones className="w-5 h-5" style={{ color: "#f8fafc" }} />
              </div>
              <div className="flex flex-col items-start gap-0 flex-1">
                <span className="text-sm" style={{ color: "#f8fafc" }}>
                  Customer Support
                </span>
                <span className="text-[11px]" style={{ color: "#94a3b8" }}>
                  Get help with your wallet
                </span>
              </div>
              <ChevronRight className="w-5 h-5" style={{ color: "#94a3b8" }} />
            </button>
          </div>
        </div>

        {/* Footer Info */}
        <div className="flex-1 flex flex-col justify-end items-center gap-2 py-8">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" style={{ color: "#f8fafc" }} />
            <span
              className="text-[10px] font-bold uppercase tracking-wider"
              style={{ color: "#f8fafc", letterSpacing: "1px" }}
            >
              Secured by GFT Protocol
            </span>
          </div>
          <span className="text-[10px]" style={{ color: "#94a3b8" }}>
            Version 2.4.0 (Build 842)
          </span>
        </div>
      </div>
    </div>
  );
}
