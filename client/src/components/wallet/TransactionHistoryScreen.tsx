import { useState } from "react";
import { ArrowLeft, Filter, Plus, Sparkles } from "lucide-react";

interface Transaction {
  id: string;
  type: "sent" | "received" | "staking";
  title: string;
  subtitle: string;
  amount: number;
  time: string;
  hash?: string;
}

interface TransactionHistoryScreenProps {
  onBack: () => void;
  onStartTransaction?: () => void;
  onLearnEarning?: () => void;
  transactions?: Transaction[];
}

type FilterType = "all" | "sent" | "received" | "staking";

export default function TransactionHistoryScreen({
  onBack,
  onStartTransaction,
  onLearnEarning,
  transactions = [],
}: TransactionHistoryScreenProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  const filters: { key: FilterType; label: string }[] = [
    { key: "all", label: "All Activity" },
    { key: "sent", label: "Sent" },
    { key: "received", label: "Received" },
    { key: "staking", label: "Staking" },
  ];

  const filteredTransactions = transactions.filter((tx) => {
    if (activeFilter === "all") return true;
    return tx.type === activeFilter;
  });

  const hasTransactions = filteredTransactions.length > 0;

  return (
    <div
      className="flex flex-col min-h-screen w-full"
      style={{ background: "#101D27", fontFamily: "Plus Jakarta Sans, sans-serif" }}
    >
      {/* Header with Gradient */}
      <div
        className="flex flex-col items-center gap-4 px-6 pt-12 pb-6"
        style={{
          background: "linear-gradient(180deg, rgba(20, 83, 45, 0.2) 0%, #101D27 100%)",
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
            Transaction History
          </span>

          <button
            className="w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:bg-slate-700"
            style={{ background: "#1e293b", border: "1px solid #1e293b" }}
          >
            <Filter className="w-5 h-5" style={{ color: "#B7FF1A" }} />
          </button>
        </div>

        {/* Subtitle */}
        <p
          className="text-sm text-center max-w-[280px]"
          style={{ color: "#94a3b8", lineHeight: "20px" }}
        >
          Track and manage all your on-chain GFT movements in one place.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 px-6 py-6 overflow-x-auto scrollbar-hide max-w-[430px] md:max-w-[600px] lg:max-w-[800px] mx-auto w-full">
        {filters.map((filter) => (
          <button
            key={filter.key}
            onClick={() => setActiveFilter(filter.key)}
            className="flex-shrink-0 px-5 py-2 rounded-full text-xs font-bold transition-all"
            style={{
              background: activeFilter === filter.key ? "#B7FF1A" : "#1e293b",
              border: `1px solid ${activeFilter === filter.key ? "#B7FF1A" : "#1e293b"}`,
              color: activeFilter === filter.key ? "#071013" : "#94a3b8",
            }}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 max-w-[430px] md:max-w-[600px] lg:max-w-[800px] mx-auto w-full">
        {hasTransactions ? (
          /* Transaction List */
          <div className="w-full flex flex-col gap-3">
            {filteredTransactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center gap-4 p-4 rounded-2xl"
                style={{ background: "#1e293b" }}
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: tx.type === "received" ? "rgba(183, 255, 26, 0.1)" : "rgba(148, 163, 184, 0.1)",
                  }}
                >
                  {tx.type === "sent" && (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M12 5L12 19M12 5L6 11M12 5L18 11" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                  {tx.type === "received" && (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M12 19L12 5M12 19L6 13M12 19L18 13" stroke="#B7FF1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                  {tx.type === "staking" && (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2L12 22M12 2L6 8M12 2L18 8M12 22L6 16M12 22L18 16" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: "#f8fafc" }}>
                    {tx.title}
                  </p>
                  <p className="text-xs truncate" style={{ color: "#94a3b8" }}>
                    {tx.subtitle}
                  </p>
                </div>
                <div className="flex flex-col items-end">
                  <span
                    className="text-sm font-bold"
                    style={{ color: tx.amount > 0 ? "#B7FF1A" : "#f8fafc" }}
                  >
                    {tx.amount > 0 ? "+" : ""}{tx.amount.toLocaleString()} GFT
                  </span>
                  <span className="text-xs" style={{ color: "#64748b" }}>
                    {tx.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center gap-8">
            {/* Empty Icon with Glow */}
            <div className="relative">
              {/* Glow Effect */}
              <div
                className="absolute rounded-full blur-[32px]"
                style={{
                  background: "rgba(183, 255, 26, 0.05)",
                  width: "144px",
                  height: "144px",
                  top: "-24px",
                  left: "-24px",
                }}
              />
              {/* Main Icon Container */}
              <div
                className="relative w-24 h-24 rounded-[32px] flex items-center justify-center"
                style={{
                  background: "#0f172a",
                  border: "1px solid rgba(30, 41, 59, 0.5)",
                }}
              >
                {/* Receipt/Document Icon */}
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M14.49 4H33.51C35.828 4 36.986 4 37.922 4.326C39.71 4.96131 41.1005 6.39247 41.684 8.198C42 9.162 42 10.354 42 12.74V40.748C42 42.464 40.03 43.376 38.784 42.236C38.059 41.5661 36.941 41.5661 36.216 42.236L35.25 43.12C33.9799 44.2945 32.0201 44.2945 30.75 43.12C29.4799 41.9455 27.5201 41.9455 26.25 43.12C24.9799 44.2945 23.0201 44.2945 21.75 43.12C20.4799 41.9455 18.5201 41.9455 17.25 43.12C15.9799 44.2945 14.0201 44.2945 12.75 43.12L11.784 42.236C11.059 41.5661 9.94095 41.5661 9.216 42.236C7.97 43.376 6 42.464 6 40.748V12.74C6 10.354 6 9.16 6.316 8.2C6.916 6.374 8.306 4.942 10.078 4.326C11.014 4 12.172 4 14.49 4ZM14 13.5C13.1716 13.5 12.5 14.1716 12.5 15C12.5 15.8284 13.1716 16.5 14 16.5H15C15.8284 16.5 16.5 15.8284 16.5 15C16.5 14.1716 15.8284 13.5 15 13.5H14ZM21 13.5C20.1716 13.5 19.5 14.1716 19.5 15C19.5 15.8284 20.1716 16.5 21 16.5H34C34.8284 16.5 35.5 15.8284 35.5 15C35.5 14.1716 34.8284 13.5 34 13.5H21ZM14 20.5C13.1716 20.5 12.5 21.1716 12.5 22C12.5 22.8284 13.1716 23.5 14 23.5H15C15.8284 23.5 16.5 22.8284 16.5 22C16.5 21.1716 15.8284 20.5 15 20.5H14ZM21 20.5C20.1716 20.5 19.5 21.1716 19.5 22C19.5 22.8284 20.1716 23.5 21 23.5H34C34.8284 23.5 35.5 22.8284 35.5 22C35.5 21.1716 34.8284 20.5 34 20.5H21ZM14 27.5C13.1716 27.5 12.5 28.1716 12.5 29C12.5 29.8284 13.1716 30.5 14 30.5H15C15.8284 30.5 16.5 29.8284 16.5 29C16.5 28.1716 15.8284 27.5 15 27.5H14ZM21 27.5C20.1716 27.5 19.5 28.1716 19.5 29C19.5 29.8284 20.1716 30.5 21 30.5H34C34.8284 30.5 35.5 29.8284 35.5 29C35.5 28.1716 34.8284 27.5 34 27.5H21Z"
                    fill="#94A3B8"
                  />
                </svg>
              </div>
              {/* Search Badge */}
              <div
                className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{
                  background: "#1e293b",
                  border: "1px solid #1e293b",
                  boxShadow: "0 4px 6px -4px rgba(0, 0, 0, 0.1), 0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                }}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M0.833 8.75C0.833 4.378 4.378 0.833 8.75 0.833C13.122 0.833 16.667 4.378 16.667 8.75C16.667 13.122 13.122 16.667 8.75 16.667C4.378 16.667 0.833 13.122 0.833 8.75Z"
                    stroke="#B7FF1A"
                    strokeWidth="1.25"
                  />
                  <path
                    d="M14.583 14.583L18.333 18.333"
                    stroke="#B7FF1A"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>

            {/* Empty State Text */}
            <div className="flex flex-col items-center gap-3 text-center max-w-[350px]">
              <h2 className="text-2xl font-bold" style={{ color: "#f8fafc" }}>
                No Activity Yet
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: "#94a3b8" }}>
                Your transaction history is empty. Once you send, receive, or swap GFT, your activities will be securely recorded here.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 w-full max-w-[350px]">
              {/* Primary Button */}
              <button
                onClick={onStartTransaction}
                className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-bold transition-all hover:opacity-90 active:scale-[0.98]"
                style={{
                  background: "#B7FF1A",
                  boxShadow: "0 0 20px -5px #B7FF1A",
                  color: "#071013",
                }}
              >
                <Plus className="w-5 h-5" />
                <span>Start Your First Transaction</span>
              </button>

              {/* Secondary Button */}
              <button
                onClick={onLearnEarning}
                className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-bold transition-all hover:bg-slate-700"
                style={{
                  background: "#1e293b",
                  border: "1px solid #1e293b",
                  color: "#f8fafc",
                }}
              >
                <Sparkles className="w-5 h-5" style={{ color: "#B7FF1A" }} />
                <span>Learn how to earn GFT</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
