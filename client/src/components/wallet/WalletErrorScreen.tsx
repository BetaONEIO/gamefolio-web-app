import { ArrowLeft, HelpCircle, RefreshCw, Shield, AlertTriangle, XCircle, Info } from "lucide-react";

interface WalletErrorScreenProps {
  onBack: () => void;
  onRetry: () => void;
  onGoHome: () => void;
  errorCode?: string;
  errorMessage?: string;
  title?: string;
  description?: string;
}

export default function WalletErrorScreen({
  onBack,
  onRetry,
  onGoHome,
  errorCode = "0x403",
  errorMessage = "err_connection_timed_out: RPC endpoint failed to respond within 5000ms. check_skale_node_status.",
  title = "Unable to Connect",
  description = "We're having trouble reaching the blockchain network. This might be due to a poor connection or temporary server maintenance.",
}: WalletErrorScreenProps) {
  return (
    <div
      className="flex flex-col min-h-screen w-full"
      style={{ background: "#020617", fontFamily: "Plus Jakarta Sans, sans-serif" }}
    >
      {/* Header with red gradient */}
      <div
        className="flex flex-col items-center gap-4 px-6 pt-12 pb-6"
        style={{
          background: "linear-gradient(180deg, rgba(239, 68, 68, 0.1) 0%, #020617 100%)",
          borderBottom: "1px solid rgba(30, 41, 59, 0.3)",
        }}
      >
        {/* Top row */}
        <div className="flex items-center justify-between w-full max-w-[430px]">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:bg-slate-700"
            style={{ background: "#1e293b", border: "1px solid #1e293b" }}
          >
            <ArrowLeft className="w-6 h-6" style={{ color: "#f8fafc" }} />
          </button>

          <span className="text-xl font-bold" style={{ color: "#f8fafc" }}>
            Error Encountered
          </span>

          <button
            className="w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:bg-slate-700"
            style={{ background: "#1e293b", border: "1px solid #1e293b" }}
          >
            <HelpCircle className="w-6 h-6" style={{ color: "#94a3b8" }} />
          </button>
        </div>

        <span className="text-sm text-center max-w-[270px]" style={{ color: "#94a3b8" }}>
          Something went wrong while processing your wallet request.
        </span>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col px-6 py-10 gap-8 max-w-[430px] mx-auto w-full">
        {/* Error Display */}
        <div className="flex flex-col items-center gap-6">
          {/* Error Text */}
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="text-2xl font-bold" style={{ color: "#f8fafc" }}>
              {title}
            </span>
            <span className="text-sm leading-relaxed max-w-[336px]" style={{ color: "#94a3b8", lineHeight: "22.75px" }}>
              {description}
            </span>
          </div>

          {/* Error Icon */}
          <div className="relative w-24 h-24">
            <div
              className="w-24 h-24 rounded-3xl flex items-center justify-center"
              style={{
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
              }}
            >
              <Shield className="w-12 h-12" style={{ color: "#ef4444" }} />
            </div>
            {/* X Badge */}
            <div
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "#020617", border: "2px solid #ef4444" }}
            >
              <XCircle className="w-5 h-5" style={{ color: "#ef4444" }} />
            </div>
          </div>
        </div>

        {/* Technical Details Section */}
        <div className="flex flex-col gap-4">
          <div
            className="flex flex-col gap-3 p-5 rounded-2xl"
            style={{ background: "#0f172a", border: "1px solid rgba(30, 41, 59, 0.5)" }}
          >
            {/* Header Row */}
            <div className="flex items-center justify-between">
              <span
                className="text-xs font-bold uppercase tracking-wider"
                style={{ color: "#94a3b8", letterSpacing: "0.6px" }}
              >
                Technical Details
              </span>
              <div
                className="px-2 py-1 rounded"
                style={{ background: "#1e293b" }}
              >
                <span className="text-[10px] font-bold" style={{ color: "#94a3b8" }}>
                  CODE {errorCode}
                </span>
              </div>
            </div>

            {/* Error Message Box */}
            <div
              className="p-3 rounded-2xl"
              style={{ background: "rgba(30, 41, 59, 0.5)", border: "1px solid #1e293b" }}
            >
              <span
                className="text-xs leading-4"
                style={{ color: "#94a3b8", fontFamily: "JetBrains Mono, monospace" }}
              >
                {errorMessage}
              </span>
            </div>
          </div>

          {/* Funds Safe Notice */}
          <div
            className="flex items-center gap-4 p-4 rounded-2xl"
            style={{
              background: "rgba(74, 222, 128, 0.05)",
              border: "1px solid rgba(74, 222, 128, 0.2)",
            }}
          >
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(74, 222, 128, 0.1)" }}
            >
              <Info className="w-5 h-5" style={{ color: "#4ade80" }} />
            </div>
            <div className="flex-1">
              <span className="text-xs leading-relaxed" style={{ color: "#94a3b8", lineHeight: "16.5px" }}>
                Your funds are <span className="font-bold" style={{ color: "#4ade80" }}>safe</span> and remain on the SKALE network. This is only a display issue.
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 mt-auto">
          <button
            onClick={onRetry}
            className="w-full h-14 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.98]"
            style={{
              background: "#4ade80",
              color: "#022c22",
              boxShadow: "0 0 20px -5px #4ade80",
            }}
          >
            <RefreshCw className="w-5 h-5" />
            Retry Connection
          </button>

          <button
            onClick={onGoHome}
            className="w-full h-14 rounded-2xl font-bold text-base transition-all hover:bg-slate-700"
            style={{
              background: "#1e293b",
              border: "1px solid #1e293b",
              color: "#f8fafc",
            }}
          >
            Return to Home
          </button>
        </div>
      </div>
    </div>
  );
}
