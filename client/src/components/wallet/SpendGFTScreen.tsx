import { ArrowLeft, Settings, ChevronRight, ShoppingBag, Image, Gamepad2, Trophy } from "lucide-react";

interface SpendGFTScreenProps {
  onBack: () => void;
  onGoToStore?: () => void;
  onViewNFTs?: () => void;
  availableBalance?: number;
}

const GFT_TO_GBP = 0.01;

interface FeaturedDeal {
  id: string;
  name: string;
  price: number;
  discount?: number;
  imageUrl?: string;
}

interface SpendingHistoryItem {
  id: string;
  title: string;
  subtitle: string;
  amount: number;
  time: string;
  icon: "booster" | "tournament";
}

const featuredDeals: FeaturedDeal[] = [
  { id: "1", name: "Elite Battle Pass", price: 45, discount: 20 },
  { id: "2", name: "Neon Sword Skin", price: 200 },
];

const spendingHistory: SpendingHistoryItem[] = [
  { id: "1", title: "In-Game Booster", subtitle: "Marketplace Purchase", amount: 50, time: "Today, 2:45 PM", icon: "booster" },
  { id: "2", title: "Tournament Entry", subtitle: "Apex Pro League", amount: 25, time: "Yesterday", icon: "tournament" },
];

export default function SpendGFTScreen({
  onBack,
  onGoToStore,
  onViewNFTs,
  availableBalance = 540.0,
}: SpendGFTScreenProps) {
  const gbpValue = (availableBalance * GFT_TO_GBP).toFixed(2);

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
            className="w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:bg-slate-700"
            style={{ background: "#1e293b", border: "1px solid #1e293b" }}
          >
            <ArrowLeft className="w-6 h-6" style={{ color: "#f8fafc" }} />
          </button>

          <span className="text-xl font-bold" style={{ color: "#f8fafc" }}>
            Spend GFT
          </span>

          <button
            className="w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:bg-slate-700"
            style={{ background: "#1e293b", border: "1px solid #1e293b" }}
          >
            <Settings className="w-6 h-6" style={{ color: "#f8fafc" }} />
          </button>
        </div>

        {/* Balance Display */}
        <div className="flex flex-col items-center gap-1">
          <span
            className="text-sm font-medium uppercase tracking-wider"
            style={{ color: "#94a3b8", letterSpacing: "0.7px" }}
          >
            Available to Spend
          </span>

          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold" style={{ color: "#fff" }}>
              {availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-xl font-bold pb-1" style={{ color: "#4ade80" }}>
              GFT
            </span>
          </div>

          <span className="text-lg" style={{ color: "#94a3b8" }}>
            ≈ £{gbpValue} GBP
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col px-6 py-6 gap-6 max-w-[430px] md:max-w-[600px] lg:max-w-[800px] mx-auto w-full overflow-y-auto">
        {/* Action Buttons */}
        <div className="flex flex-col gap-4">
          {/* Go to Store Button */}
          <button
            onClick={onGoToStore}
            className="flex items-center gap-4 p-5 rounded-2xl transition-all hover:opacity-90 active:scale-[0.98]"
            style={{
              background: "#4ade80",
              boxShadow: "0 0 25px -5px #4ade80",
            }}
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(2, 44, 34, 0.1)" }}
            >
              <ShoppingBag className="w-8 h-8" style={{ color: "#022c22" }} />
            </div>
            <div className="flex flex-col items-start gap-0.5 flex-1">
              <span className="text-lg font-bold" style={{ color: "#022c22" }}>
                Go to Store
              </span>
              <span className="text-sm font-medium" style={{ color: "#022c22" }}>
                Buy skins, boosters & items
              </span>
            </div>
            <ChevronRight className="w-6 h-6" style={{ color: "#022c22" }} />
          </button>

          {/* View NFTs Button */}
          <button
            onClick={onViewNFTs}
            className="flex items-center gap-4 p-5 rounded-2xl transition-all hover:bg-slate-700"
            style={{
              background: "#1e293b",
              border: "1px solid rgba(30, 41, 59, 0.5)",
            }}
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: "#020617", border: "1px solid #1e293b" }}
            >
              <Image className="w-8 h-8" style={{ color: "#f8fafc" }} />
            </div>
            <div className="flex flex-col items-start gap-0.5 flex-1">
              <span className="text-lg font-bold" style={{ color: "#f8fafc" }}>
                View NFTs
              </span>
              <span className="text-sm" style={{ color: "#94a3b8" }}>
                Manage your digital collectibles
              </span>
            </div>
            <ChevronRight className="w-6 h-6" style={{ color: "#94a3b8" }} />
          </button>
        </div>

        {/* Featured Deals Section */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold" style={{ color: "#fff" }}>
              Featured Deals
            </span>
            <button className="text-sm" style={{ color: "#4ade80" }}>
              See All
            </button>
          </div>

          <div className="flex gap-4">
            {featuredDeals.map((deal) => (
              <div
                key={deal.id}
                className="flex-1 flex flex-col rounded-2xl overflow-hidden"
                style={{ background: "#0f172a", border: "1px solid rgba(30, 41, 59, 0.5)" }}
              >
                {/* Product Image Placeholder */}
                <div
                  className="h-28 w-full relative"
                  style={{ background: "#1e293b" }}
                >
                  {deal.discount && (
                    <div
                      className="absolute top-2 left-2 px-2 py-1 rounded-full text-[10px] font-bold uppercase"
                      style={{ background: "#4ade80", color: "#022c22" }}
                    >
                      -{deal.discount}%
                    </div>
                  )}
                </div>
                
                {/* Product Info */}
                <div className="flex flex-col gap-1 p-3">
                  <span className="text-sm font-bold truncate" style={{ color: "#f8fafc" }}>
                    {deal.name}
                  </span>
                  <span className="text-base font-bold" style={{ color: "#4ade80" }}>
                    {deal.price} GFT
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Spending History Section */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold" style={{ color: "#fff" }}>
              Spending History
            </span>
            <button className="text-sm" style={{ color: "#4ade80" }}>
              History
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {spendingHistory.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 p-3 rounded-2xl"
                style={{ background: "#1e293b", border: "1px solid #1e293b" }}
              >
                {/* Icon */}
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "#1e293b" }}
                >
                  {item.icon === "booster" ? (
                    <Gamepad2 className="w-6 h-6" style={{ color: "#f8fafc" }} />
                  ) : (
                    <Trophy className="w-6 h-6" style={{ color: "#f8fafc" }} />
                  )}
                </div>

                {/* Details */}
                <div className="flex flex-col gap-0 flex-1 min-w-0">
                  <span className="text-base truncate" style={{ color: "#f8fafc" }}>
                    {item.title}
                  </span>
                  <span className="text-xs" style={{ color: "#94a3b8" }}>
                    {item.subtitle}
                  </span>
                </div>

                {/* Amount */}
                <div className="flex flex-col items-end gap-0 flex-shrink-0">
                  <span className="text-base font-bold" style={{ color: "#fff" }}>
                    -{item.amount.toFixed(2)}
                  </span>
                  <span className="text-[10px]" style={{ color: "#94a3b8" }}>
                    {item.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
