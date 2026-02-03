import { useState } from "react";
import { ArrowLeft, Info, TrendingUp, Lock } from "lucide-react";
import StakeProcessingScreen from "./StakeProcessingScreen";
import StakeSuccessScreen from "./StakeSuccessScreen";

interface ConfirmStakeScreenProps {
  onBack: () => void;
  onConfirm: (amount: number) => void;
  availableBalance?: number;
  currentStake?: number;
  apy?: number;
}

const GFT_TO_GBP = 0.056;

type StakeFlowStep = "confirm" | "processing" | "success";

export default function ConfirmStakeScreen({
  onBack,
  onConfirm,
  availableBalance = 790.0,
  currentStake = 1250.0,
  apy = 12.5,
}: ConfirmStakeScreenProps) {
  const [amount, setAmount] = useState<string>("");
  const [flowStep, setFlowStep] = useState<StakeFlowStep>("confirm");
  const [stakedAmount, setStakedAmount] = useState(0);

  const numericAmount = parseFloat(amount) || 0;
  const newTotalBalance = currentStake + numericAmount;
  const newTotalGBP = newTotalBalance * GFT_TO_GBP;

  const handleMaxClick = () => {
    setAmount(availableBalance.toString());
  };

  const handleConfirm = () => {
    if (numericAmount <= 0 || numericAmount > availableBalance) return;
    setStakedAmount(numericAmount);
    setFlowStep("processing");
  };

  const isValidAmount = numericAmount > 0 && numericAmount <= availableBalance;

  if (flowStep === "processing") {
    return (
      <StakeProcessingScreen
        onBack={() => setFlowStep("confirm")}
        onComplete={() => setFlowStep("success")}
        stakeAmount={stakedAmount}
      />
    );
  }

  if (flowStep === "success") {
    return (
      <StakeSuccessScreen
        onBack={onBack}
        onDone={() => onConfirm(stakedAmount)}
        amount={stakedAmount}
        newTotalStaked={currentStake + stakedAmount}
        apy={apy}
      />
    );
  }

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

        <span
          className="text-xl font-bold"
          style={{ color: "#f8fafc" }}
        >
          Confirm Stake
        </span>

        <button
          className="w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:bg-slate-700"
          style={{ background: "#1e293b", border: "1px solid #1e293b" }}
        >
          <Info className="w-6 h-6" style={{ color: "#4ade80" }} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col gap-8 px-6 py-8">
        {/* Stake Amount Section */}
        <div className="flex flex-col gap-4">
          {/* Label Row */}
          <div className="flex items-center justify-between">
            <span
              className="text-sm font-bold uppercase tracking-wider"
              style={{ color: "#94a3b8", letterSpacing: "0.7px" }}
            >
              Stake Amount
            </span>
            <div className="flex items-center gap-1">
              <span
                className="text-xs font-medium"
                style={{ color: "#94a3b8" }}
              >
                Available:
              </span>
              <span
                className="text-xs font-medium"
                style={{ color: "#f8fafc" }}
              >
                {availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GFT
              </span>
            </div>
          </div>

          {/* Amount Input Box */}
          <div
            className="flex items-center justify-center gap-3 p-6 rounded-2xl"
            style={{ background: "#1e293b", border: "2px solid #1e293b" }}
          >
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => {
                const val = e.target.value;
                if (/^\d*\.?\d*$/.test(val)) {
                  setAmount(val);
                }
              }}
              placeholder="0.00"
              className="bg-transparent text-4xl font-bold text-center outline-none w-full max-w-[180px]"
              style={{ color: "#fff", fontFamily: "Plus Jakarta Sans, sans-serif" }}
            />
            <span
              className="text-4xl font-bold"
              style={{ color: "#4ade80" }}
            >
              GFT
            </span>
            <button
              onClick={handleMaxClick}
              className="px-4 py-2 rounded-2xl font-bold text-sm transition-colors hover:bg-green-400/20"
              style={{ background: "rgba(74, 222, 128, 0.1)", color: "#4ade80" }}
            >
              MAX
            </button>
          </div>
        </div>

        {/* Staking Summary Section */}
        <div className="flex flex-col gap-4">
          <span
            className="text-sm font-bold uppercase tracking-wider"
            style={{ color: "#94a3b8", letterSpacing: "0.7px" }}
          >
            Staking Summary
          </span>

          <div
            className="flex flex-col gap-4 p-5 rounded-2xl"
            style={{ background: "#0f172a", border: "1px solid rgba(30, 41, 59, 0.5)" }}
          >
            {/* Current Stake Row */}
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: "#94a3b8" }}>
                Current Stake
              </span>
              <span className="text-sm font-bold" style={{ color: "#f8fafc" }}>
                {currentStake.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GFT
              </span>
            </div>

            {/* APY Row */}
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: "#94a3b8" }}>
                Staking Reward APY
              </span>
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" style={{ color: "#4ade80" }} />
                <span className="text-sm font-bold" style={{ color: "#4ade80" }}>
                  {apy}%
                </span>
              </div>
            </div>

            {/* Divider */}
            <div className="w-full h-px" style={{ background: "rgba(30, 41, 59, 0.5)" }} />

            {/* New Total Balance Row */}
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-bold" style={{ color: "#fff" }}>
                  New Total Balance
                </span>
                <span className="text-[10px]" style={{ color: "#94a3b8" }}>
                  After confirmation
                </span>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-xl font-bold" style={{ color: "#4ade80" }}>
                  {newTotalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GFT
                </span>
                <span className="text-[10px]" style={{ color: "#94a3b8" }}>
                  ≈ £{newTotalGBP.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GBP
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Liquid Staking Info Card */}
        <div
          className="flex gap-4 p-4 rounded-2xl"
          style={{
            background: "rgba(20, 83, 45, 0.1)",
            border: "1px solid rgba(74, 222, 128, 0.2)",
          }}
        >
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(74, 222, 128, 0.2)" }}
          >
            <Lock className="w-6 h-6" style={{ color: "#4ade80" }} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold" style={{ color: "#4ade80" }}>
              Liquid Staking
            </span>
            <span className="text-xs leading-relaxed" style={{ color: "#94a3b8" }}>
              Your GFT remains liquid. There is no lock-up period and you can unstake or claim rewards at any time.
            </span>
          </div>
        </div>
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
          onClick={handleConfirm}
          disabled={!isValidAmount}
          className="w-full h-[68px] rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: isValidAmount ? "#4ade80" : "rgba(74, 222, 128, 0.3)",
            color: "#022c22",
            boxShadow: isValidAmount ? "0 0 20px -5px #4ade80" : "none",
          }}
        >
          <Lock className="w-6 h-6" />
          <span>Confirm Stake</span>
        </button>
      </div>
    </div>
  );
}
