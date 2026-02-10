import { useState } from "react";
import { ArrowLeft, Info, TrendingUp, Gift, Clock, ChevronRight } from "lucide-react";
import ConfirmStakeScreen from "./ConfirmStakeScreen";

interface StakePosition {
  id: string;
  amount: number;
  apy: number;
  startDate: string;
  endDate: string;
  earned: number;
  status: "active" | "completed" | "pending";
}

interface StakingHubScreenProps {
  onBack: () => void;
  totalStaked?: number;
  rewardsEarned?: number;
  availableGft?: number;
  estimatedApy?: number;
  onStake?: (amount: number) => Promise<boolean>;
  onUnstake?: (amount: number) => Promise<boolean>;
  onClaimRewards?: () => Promise<boolean>;
}

const mockStakePositions: StakePosition[] = [
  {
    id: "1",
    amount: 150,
    apy: 5,
    startDate: "Jan 15, 2026",
    endDate: "Apr 15, 2026",
    earned: 5.25,
    status: "active",
  },
  {
    id: "2",
    amount: 100,
    apy: 5,
    startDate: "Dec 20, 2025",
    endDate: "Mar 20, 2026",
    earned: 3.59,
    status: "active",
  },
];

export default function StakingHubScreen({
  onBack,
  totalStaked = 250,
  rewardsEarned = 8.84,
  availableGft = 790,
  estimatedApy = 12.5,
  onStake,
  onUnstake,
  onClaimRewards,
}: StakingHubScreenProps) {
  const [activeTab, setActiveTab] = useState<"positions" | "history">("positions");
  const [showConfirmStake, setShowConfirmStake] = useState(false);
  const [showUnstakeDialog, setShowUnstakeDialog] = useState(false);
  const [unstakeAmount, setUnstakeAmount] = useState("");
  const [isUnstaking, setIsUnstaking] = useState(false);
  const [isStaking, setIsStaking] = useState(false);

  const handleStakeConfirm = async (amount: number) => {
    if (!onStake || amount <= 0) return;
    
    setIsStaking(true);
    const success = await onStake(amount);
    setIsStaking(false);
    
    if (success) {
      setShowConfirmStake(false);
    }
  };

  const handleUnstakeConfirm = async () => {
    const amount = parseFloat(unstakeAmount);
    if (!amount || amount <= 0 || amount > totalStaked || !onUnstake) return;
    
    setIsUnstaking(true);
    const success = await onUnstake(amount);
    setIsUnstaking(false);
    
    if (success) {
      setShowUnstakeDialog(false);
      setUnstakeAmount("");
    }
  };

  if (showUnstakeDialog) {
    const numericAmount = parseFloat(unstakeAmount) || 0;
    const isValidAmount = numericAmount > 0 && numericAmount <= totalStaked;
    
    return (
      <div
        className="flex flex-col min-h-screen w-full"
        style={{ background: "#020617", fontFamily: "Plus Jakarta Sans, sans-serif" }}
      >
        <div
          className="flex flex-col items-center gap-6 px-6 pt-12 pb-8"
          style={{
            background: "linear-gradient(180deg, rgba(239, 68, 68, 0.1) 0%, #020617 100%)",
            borderBottom: "1px solid rgba(30, 41, 59, 0.3)",
          }}
        >
          <div className="flex items-center justify-between w-full max-w-[430px] mx-auto">
            <button
              onClick={() => setShowUnstakeDialog(false)}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:bg-slate-700"
              style={{ background: "#1e293b", border: "1px solid #1e293b" }}
            >
              <ArrowLeft className="w-6 h-6" style={{ color: "#f8fafc" }} />
            </button>
            <span className="text-xl font-bold" style={{ color: "#fff" }}>Unstake GFT</span>
            <div className="w-10 h-10" />
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-6 px-6 py-8 max-w-[430px] mx-auto w-full">
          <div
            className="flex flex-col gap-4 p-5 rounded-2xl"
            style={{ background: "#0f172a", border: "1px solid rgba(30, 41, 59, 0.5)" }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: "#94a3b8" }}>Currently Staked</span>
              <span className="text-base font-bold" style={{ color: "#fff" }}>
                {totalStaked.toFixed(2)} GFT
              </span>
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" style={{ color: "#94a3b8" }}>
                Amount to Unstake
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={unstakeAmount}
                  onChange={(e) => setUnstakeAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full h-14 px-4 rounded-xl text-lg font-bold outline-none"
                  style={{
                    background: "#1e293b",
                    border: "1px solid rgba(30, 41, 59, 0.5)",
                    color: "#fff",
                  }}
                />
                <button
                  onClick={() => setUnstakeAmount(totalStaked.toString())}
                  className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg text-xs font-bold"
                  style={{ background: "rgba(74, 222, 128, 0.1)", color: "#4ade80" }}
                >
                  MAX
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={handleUnstakeConfirm}
            disabled={!isValidAmount || isUnstaking}
            className="w-full h-14 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            style={{
              background: isValidAmount ? "#ef4444" : "#1e293b",
              color: isValidAmount ? "#fff" : "#94a3b8",
            }}
          >
            {isUnstaking ? "Processing..." : "Confirm Unstake"}
          </button>
        </div>
      </div>
    );
  }

  if (showConfirmStake) {
    return (
      <ConfirmStakeScreen
        onBack={() => setShowConfirmStake(false)}
        onConfirm={handleStakeConfirm}
        availableBalance={availableGft}
        currentStake={totalStaked}
        apy={estimatedApy}
      />
    );
  }

  const fiatValueStaked = (totalStaked * 0.01).toFixed(2);
  const fiatValueRewards = (rewardsEarned * 0.01).toFixed(2);

  return (
    <div
      className="flex flex-col min-h-screen w-full"
      style={{ background: "#020617", fontFamily: "Plus Jakarta Sans, sans-serif" }}
    >
      {/* Header with gradient */}
      <div
        className="flex flex-col items-center gap-6 px-6 pt-12 pb-8"
        style={{
          background: "linear-gradient(180deg, rgba(20, 83, 45, 0.2) 0%, #020617 100%)",
          borderBottom: "1px solid rgba(30, 41, 59, 0.3)",
        }}
      >
        {/* Top row */}
        <div className="flex items-center justify-between w-full max-w-[430px] md:max-w-[600px] lg:max-w-[800px] mx-auto">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:bg-slate-700"
            style={{ background: "#1e293b", border: "1px solid #1e293b" }}
          >
            <ArrowLeft className="w-6 h-6" style={{ color: "#f8fafc" }} />
          </button>

          <span className="text-xl font-bold" style={{ color: "#f8fafc" }}>
            Staking Hub
          </span>

          <button
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:bg-slate-700"
            style={{ background: "#1e293b", border: "1px solid #1e293b" }}
          >
            <Info className="w-6 h-6" style={{ color: "#f8fafc" }} />
          </button>
        </div>

        {/* Total Staked Amount */}
        <div className="flex flex-col items-center gap-3 max-w-[430px] md:max-w-[600px] lg:max-w-[800px] mx-auto w-full">
          <span
            className="text-sm font-medium uppercase"
            style={{ color: "#94a3b8", letterSpacing: "0.7px" }}
          >
            Total Staked Amount
          </span>

          <div className="flex items-end gap-2">
            <span
              className="text-4xl md:text-5xl font-bold"
              style={{ color: "#fff" }}
            >
              {totalStaked.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span
              className="text-xl md:text-2xl font-bold pb-1"
              style={{ color: "#4ade80" }}
            >
              GFT
            </span>
          </div>

          {/* APY Badge */}
          <div
            className="flex items-center gap-1.5 px-3 py-1 rounded-full"
            style={{
              background: "rgba(20, 83, 45, 0.2)",
              border: "1px solid rgba(74, 222, 128, 0.3)",
            }}
          >
            <TrendingUp className="w-3.5 h-3.5" style={{ color: "#4ade80" }} />
            <span
              className="text-[10px] font-bold uppercase"
              style={{ color: "#4ade80" }}
            >
              ~{estimatedApy}% EST. APY
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col px-6 py-6 max-w-[430px] md:max-w-[600px] lg:max-w-[800px] mx-auto w-full gap-6">
        {/* Stats Cards */}
        <div className="flex gap-4">
          {/* Rewards Earned */}
          <div
            className="flex-1 flex flex-col gap-1 p-4 rounded-2xl"
            style={{
              background: "#0f172a",
              border: "1px solid rgba(30, 41, 59, 0.5)",
            }}
          >
            <span
              className="text-[10px] font-bold uppercase"
              style={{ color: "#94a3b8" }}
            >
              Rewards Earned
            </span>
            <span
              className="text-xl font-bold"
              style={{ color: "#4ade80" }}
            >
              +{rewardsEarned.toFixed(2)}
            </span>
            <span
              className="text-[10px]"
              style={{ color: "#94a3b8" }}
            >
              ≈ £{fiatValueRewards} GBP
            </span>
          </div>

          {/* Available GFT */}
          <div
            className="flex-1 flex flex-col gap-1 p-4 rounded-2xl"
            style={{
              background: "#0f172a",
              border: "1px solid rgba(30, 41, 59, 0.5)",
            }}
          >
            <span
              className="text-[10px] font-bold uppercase"
              style={{ color: "#94a3b8" }}
            >
              Available GFT
            </span>
            <span
              className="text-xl font-bold"
              style={{ color: "#fff" }}
            >
              {availableGft.toFixed(2)}
            </span>
            <span
              className="text-[10px]"
              style={{ color: "#94a3b8" }}
            >
              In wallet
            </span>
          </div>
        </div>

        {/* Stake New GFT Button */}
        <button
          onClick={() => setShowConfirmStake(true)}
          className="w-full h-14 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.98]"
          style={{
            background: "#4ade80",
            color: "#022c22",
            boxShadow: "0 0 20px -5px #4ade80",
          }}
        >
          <TrendingUp className="w-5 h-5" />
          Stake New GFT
        </button>

        {/* Secondary Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => setShowUnstakeDialog(true)}
            className="flex-1 h-14 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all hover:bg-slate-700"
            style={{
              background: "#1e293b",
              border: "1px solid #1e293b",
              color: "#f8fafc",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 3.33334V16.6667M10 16.6667L16.6667 10M10 16.6667L3.33334 10" stroke="#F8FAFC" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Unstake
          </button>

          <button
            onClick={onClaimRewards}
            className="flex-1 h-14 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all hover:bg-slate-700"
            style={{
              background: "#1e293b",
              border: "1px solid #1e293b",
              color: "#f8fafc",
            }}
          >
            <Gift className="w-5 h-5" style={{ color: "#f8fafc" }} />
            Claim Rewards
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-1 rounded-xl" style={{ background: "#0f172a" }}>
          <button
            onClick={() => setActiveTab("positions")}
            className="flex-1 py-2.5 rounded-lg text-sm font-bold transition-all"
            style={{
              background: activeTab === "positions" ? "#1e293b" : "transparent",
              color: activeTab === "positions" ? "#f8fafc" : "#94a3b8",
            }}
          >
            Active Stakes
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className="flex-1 py-2.5 rounded-lg text-sm font-bold transition-all"
            style={{
              background: activeTab === "history" ? "#1e293b" : "transparent",
              color: activeTab === "history" ? "#f8fafc" : "#94a3b8",
            }}
          >
            History
          </button>
        </div>

        {/* Stake Positions */}
        {activeTab === "positions" && (
          <div className="flex flex-col md:grid md:grid-cols-2 gap-3">
            {mockStakePositions.length > 0 ? (
              mockStakePositions.map((position) => (
                <div
                  key={position.id}
                  className="flex flex-col gap-3 p-4 rounded-2xl"
                  style={{
                    background: "#0f172a",
                    border: "1px solid rgba(30, 41, 59, 0.5)",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: "rgba(74, 222, 128, 0.2)" }}
                      >
                        <TrendingUp className="w-5 h-5" style={{ color: "#4ade80" }} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-base font-bold" style={{ color: "#f8fafc" }}>
                          {position.amount.toFixed(2)} GFT
                        </span>
                        <span className="text-xs" style={{ color: "#94a3b8" }}>
                          {position.apy}% APY
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-bold" style={{ color: "#4ade80" }}>
                        +{position.earned.toFixed(2)} GFT
                      </span>
                      <span className="text-[10px]" style={{ color: "#94a3b8" }}>
                        earned
                      </span>
                    </div>
                  </div>

                  {/* Progress/Date Info */}
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" style={{ color: "#94a3b8" }} />
                    <span className="text-xs" style={{ color: "#94a3b8" }}>
                      {position.startDate} → {position.endDate}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(30, 41, 59, 0.5)" }}
                >
                  <TrendingUp className="w-8 h-8" style={{ color: "#94a3b8" }} />
                </div>
                <span className="text-base font-medium text-center" style={{ color: "#94a3b8" }}>
                  No active stakes
                </span>
                <span className="text-sm text-center max-w-[280px]" style={{ color: "#64748b" }}>
                  Stake your GFT tokens to earn rewards with up to {estimatedApy}% APY
                </span>
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: "rgba(30, 41, 59, 0.5)" }}
            >
              <Clock className="w-8 h-8" style={{ color: "#94a3b8" }} />
            </div>
            <span className="text-base font-medium text-center" style={{ color: "#94a3b8" }}>
              No staking history
            </span>
            <span className="text-sm text-center max-w-[280px]" style={{ color: "#64748b" }}>
              Your completed stakes and rewards will appear here
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
