import { ArrowLeft, Info, ShoppingCart } from "lucide-react";

interface TransactionErrorScreenProps {
  onBack: () => void;
  onBuyGFT?: () => void;
  onBridge?: () => void;
  onCancel?: () => void;
  transactionType?: string;
  totalRequired?: number;
  availableBalance?: number;
}

export default function TransactionErrorScreen({
  onBack,
  onBuyGFT,
  onBridge,
  onCancel,
  transactionType = "Staking Deposit",
  totalRequired = 250.0,
  availableBalance = 12.45,
}: TransactionErrorScreenProps) {
  const amountNeeded = Math.max(0, totalRequired - availableBalance);

  return (
    <div
      className="flex flex-col min-h-screen w-full"
      style={{ background: "#101D27", fontFamily: "Plus Jakarta Sans, sans-serif" }}
    >
      {/* Header with Red Gradient */}
      <div
        className="flex flex-col items-center gap-6 px-6 pt-12 pb-8"
        style={{
          background: "linear-gradient(180deg, rgba(239, 68, 68, 0.1) 0%, #101D27 100%)",
          borderBottom: "1px solid rgba(30, 41, 59, 0.3)",
        }}
      >
        {/* Top Row */}
        <div className="flex items-center justify-between w-full max-w-[430px] md:max-w-[600px] lg:max-w-[800px] mx-auto">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:bg-slate-700"
            style={{ background: "#1e293b", border: "1px solid #1e293b" }}
          >
            <ArrowLeft className="w-6 h-6" style={{ color: "#f8fafc" }} />
          </button>

          <span className="text-xl font-bold" style={{ color: "#f8fafc" }}>
            Transaction Error
          </span>

          <button
            className="w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:bg-slate-700"
            style={{ background: "#1e293b", border: "1px solid #1e293b" }}
          >
            <Info className="w-6 h-6" style={{ color: "#94a3b8" }} />
          </button>
        </div>

        {/* Error Icon */}
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
          }}
        >
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M5 17.3617C5 12.0317 5 9.36667 5.63 8.47C6.25833 7.575 8.76333 6.71667 13.775 5.00167L14.73 4.675C17.3417 3.78 18.6467 3.33334 20 3.33334C21.3533 3.33334 22.6583 3.78 25.27 4.675L26.225 5.00167C31.2367 6.71667 33.7417 7.575 34.37 8.47C35 9.36667 35 12.0333 35 17.3617V19.985C35 29.3817 27.935 33.9433 23.5017 35.8783C22.3 36.4033 21.7 36.6667 20 36.6667C18.3 36.6667 17.7 36.4033 16.4983 35.8783C12.065 33.9417 5 29.3833 5 19.985V17.3617ZM20 12.0833C20.6904 12.0833 21.25 12.643 21.25 13.3333V20C21.25 20.6904 20.6904 21.25 20 21.25C19.3096 21.25 18.75 20.6904 18.75 20V13.3333C18.75 12.643 19.3096 12.0833 20 12.0833ZM20 26.6667C20.9205 26.6667 21.6667 25.9205 21.6667 25C21.6667 24.0795 20.9205 23.3333 20 23.3333C19.0795 23.3333 18.3333 24.0795 18.3333 25C18.3333 25.9205 19.0795 26.6667 20 26.6667Z"
              fill="#EF4444"
            />
          </svg>
        </div>

        {/* Error Title */}
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold" style={{ color: "#f8fafc" }}>
            Insufficient GFT
          </h1>
          <p className="text-sm max-w-[250px]" style={{ color: "#94a3b8", lineHeight: "20px" }}>
            Your current balance is not enough to cover the transaction and gas fees.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col gap-6 px-6 py-8 max-w-[430px] md:max-w-[600px] lg:max-w-[800px] mx-auto w-full">
        {/* Transaction Details Card */}
        <div
          className="flex flex-col gap-4 p-6 rounded-2xl"
          style={{
            background: "#0f172a",
            border: "1px solid rgba(30, 41, 59, 0.5)",
          }}
        >
          {/* Transaction Type Row */}
          <div
            className="flex items-center justify-between pb-4"
            style={{ borderBottom: "1px solid rgba(30, 41, 59, 0.3)" }}
          >
            <span className="text-sm" style={{ color: "#94a3b8" }}>
              Transaction Type
            </span>
            <span className="text-base" style={{ color: "#f8fafc" }}>
              {transactionType}
            </span>
          </div>

          {/* Amount Details */}
          <div className="flex flex-col gap-3 py-2">
            {/* Total Required */}
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: "#94a3b8" }}>
                Total Required
              </span>
              <span className="text-base font-bold" style={{ color: "#f8fafc" }}>
                {totalRequired.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GFT
              </span>
            </div>

            {/* Available Balance */}
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: "#94a3b8" }}>
                Available Balance
              </span>
              <span className="text-base font-bold" style={{ color: "#ef4444" }}>
                {availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GFT
              </span>
            </div>
          </div>

          {/* Amount Needed Row */}
          <div
            className="flex items-center justify-between pt-4"
            style={{ borderTop: "1px solid rgba(30, 41, 59, 0.3)" }}
          >
            <span className="text-sm font-bold" style={{ color: "#4ade80" }}>
              Amount Needed
            </span>
            <span className="text-lg font-black" style={{ color: "#4ade80" }}>
              {amountNeeded.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GFT
            </span>
          </div>
        </div>

        {/* Info Box */}
        <div
          className="flex items-start gap-3 p-4 rounded-2xl"
          style={{
            background: "rgba(30, 41, 59, 0.5)",
            border: "1px solid rgba(30, 41, 59, 0.5)",
          }}
        >
          <div
            className="w-5 h-5 rounded flex-shrink-0"
            style={{ background: "#4ade80" }}
          />
          <p className="text-xs leading-relaxed" style={{ color: "#94a3b8" }}>
            GFT tokens are required for all transactions on the SKALE network. You can top up your wallet using a credit card or by bridging from another network.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 mt-auto">
          {/* Buy GFT Tokens Button */}
          <button
            onClick={onBuyGFT}
            className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-bold transition-all hover:opacity-90 active:scale-[0.98]"
            style={{
              background: "#4ade80",
              boxShadow: "0 0 20px -5px #4ade80",
              color: "#022c22",
            }}
          >
            <ShoppingCart className="w-5 h-5" />
            <span>Buy GFT Tokens</span>
          </button>

          {/* Bridge from Ethereum Button */}
          <button
            onClick={onBridge}
            className="flex items-center justify-center w-full py-4 rounded-2xl font-bold transition-all hover:bg-slate-700"
            style={{
              background: "#1e293b",
              border: "1px solid #1e293b",
              color: "#f8fafc",
            }}
          >
            Bridge from Ethereum
          </button>

          {/* Cancel Transaction Link */}
          <button
            onClick={onCancel}
            className="flex items-center justify-center w-full py-4 text-sm font-medium transition-colors hover:opacity-80"
            style={{ color: "#94a3b8" }}
          >
            Cancel Transaction
          </button>
        </div>
      </div>
    </div>
  );
}
