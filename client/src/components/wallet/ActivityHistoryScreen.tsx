import { useState } from "react";
import { ArrowLeft, Gift, TrendingUp, ShoppingCart, Award, Filter } from "lucide-react";

type ActivityType = "all" | "purchases" | "staking" | "rewards";

interface Activity {
  id: string;
  type: "reward" | "stake" | "purchase" | "unstake";
  title: string;
  status: "completed" | "pending" | "processing";
  time: string;
  amount: number;
  isPositive: boolean;
  date: string;
}

interface ActivityHistoryScreenProps {
  onBack: () => void;
}

const mockActivities: Activity[] = [
  {
    id: "1",
    type: "reward",
    title: "Claimed Reward",
    status: "completed",
    time: "4:5 AM",
    amount: 50,
    isPositive: true,
    date: "today",
  },
  {
    id: "2",
    type: "stake",
    title: "Stake GFT",
    status: "completed",
    time: "2:30 AM",
    amount: 250,
    isPositive: false,
    date: "today",
  },
  {
    id: "3",
    type: "purchase",
    title: "Purchase GFT",
    status: "completed",
    time: "12:15 AM",
    amount: 446.42,
    isPositive: true,
    date: "today",
  },
  {
    id: "4",
    type: "reward",
    title: "Daily Bonus",
    status: "completed",
    time: "11:30 PM",
    amount: 25,
    isPositive: true,
    date: "yesterday",
  },
  {
    id: "5",
    type: "stake",
    title: "Unstake GFT",
    status: "completed",
    time: "6:45 PM",
    amount: 100,
    isPositive: true,
    date: "yesterday",
  },
  {
    id: "6",
    type: "purchase",
    title: "Purchase GFT",
    status: "completed",
    time: "2:00 PM",
    amount: 178.57,
    isPositive: true,
    date: "yesterday",
  },
];

export default function ActivityHistoryScreen({ onBack }: ActivityHistoryScreenProps) {
  const [activeFilter, setActiveFilter] = useState<ActivityType>("all");

  const filters: { id: ActivityType; label: string }[] = [
    { id: "all", label: "All Activities" },
    { id: "purchases", label: "Purchases" },
    { id: "staking", label: "Staking" },
    { id: "rewards", label: "Rewards" },
  ];

  const filteredActivities = mockActivities.filter((activity) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "purchases") return activity.type === "purchase";
    if (activeFilter === "staking") return activity.type === "stake" || activity.type === "unstake";
    if (activeFilter === "rewards") return activity.type === "reward";
    return true;
  });

  const groupedActivities = filteredActivities.reduce((acc, activity) => {
    if (!acc[activity.date]) {
      acc[activity.date] = [];
    }
    acc[activity.date].push(activity);
    return acc;
  }, {} as Record<string, Activity[]>);

  const getActivityIcon = (type: Activity["type"]) => {
    switch (type) {
      case "reward":
        return <Gift className="w-6 h-6" style={{ color: '#f8fafc' }} />;
      case "stake":
      case "unstake":
        return <TrendingUp className="w-6 h-6" style={{ color: '#f8fafc' }} />;
      case "purchase":
        return <ShoppingCart className="w-6 h-6" style={{ color: '#f8fafc' }} />;
      default:
        return <Award className="w-6 h-6" style={{ color: '#f8fafc' }} />;
    }
  };

  const getStatusBadge = (status: Activity["status"]) => {
    const styles = {
      completed: {
        bg: 'rgba(20, 83, 45, 0.2)',
        border: 'rgba(74, 222, 128, 0.2)',
        color: '#4ade80',
        text: 'COMPLETED',
      },
      pending: {
        bg: 'rgba(234, 179, 8, 0.2)',
        border: 'rgba(234, 179, 8, 0.2)',
        color: '#eab308',
        text: 'PENDING',
      },
      processing: {
        bg: 'rgba(59, 130, 246, 0.2)',
        border: 'rgba(59, 130, 246, 0.2)',
        color: '#3b82f6',
        text: 'PROCESSING',
      },
    };

    const style = styles[status];

    return (
      <span
        className="text-[10px] font-bold uppercase px-1.5 py-1 rounded"
        style={{
          background: style.bg,
          border: `1px solid ${style.border}`,
          color: style.color,
        }}
      >
        {style.text}
      </span>
    );
  };

  const formatDateLabel = (date: string) => {
    if (date === "today") return "TODAY";
    if (date === "yesterday") return "YESTERDAY";
    return date.toUpperCase();
  };

  return (
    <div
      className="w-full min-h-screen flex flex-col font-['Plus_Jakarta_Sans']"
      style={{ background: '#020617' }}
    >
      {/* Header with gradient */}
      <div
        className="flex flex-col gap-4 px-6 pt-12 pb-6"
        style={{
          background: 'linear-gradient(180deg, rgba(20, 83, 45, 0.2) 0%, #020617 100%)',
          borderBottom: '1px solid rgba(30, 41, 59, 0.3)',
        }}
      >
        {/* Top row */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:bg-slate-700"
            style={{ background: '#1e293b', border: '1px solid #1e293b' }}
          >
            <ArrowLeft className="w-6 h-6" style={{ color: '#f8fafc' }} />
          </button>

          <span className="text-xl font-bold" style={{ color: '#f8fafc' }}>
            Activity History
          </span>

          <button
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:bg-slate-700"
            style={{ background: '#1e293b', border: '1px solid #1e293b' }}
          >
            <Filter className="w-5 h-5" style={{ color: '#f8fafc' }} />
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className="flex-shrink-0 px-4 py-3 rounded-full text-sm font-bold transition-all"
              style={{
                background: activeFilter === filter.id ? '#4ade80' : '#1e293b',
                border: `1px solid ${activeFilter === filter.id ? '#4ade80' : '#1e293b'}`,
                color: activeFilter === filter.id ? '#022c22' : '#94a3b8',
              }}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Activity List */}
      <div className="flex-1 px-6 py-6 max-w-[430px] mx-auto w-full">
        <div className="flex flex-col gap-8">
          {Object.entries(groupedActivities).map(([date, activities]) => (
            <div key={date} className="flex flex-col gap-4">
              {/* Date Label */}
              <span
                className="text-xs font-bold uppercase"
                style={{ color: '#94a3b8', letterSpacing: '1.2px' }}
              >
                {formatDateLabel(date)}
              </span>

              {/* Activities */}
              <div className="flex flex-col gap-3">
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center gap-4 p-3 rounded-2xl"
                    style={{
                      background: 'rgba(15, 23, 42, 0.4)',
                      border: '1px solid rgba(30, 41, 59, 0.2)',
                    }}
                  >
                    {/* Icon */}
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ background: '#1e293b', border: '1px solid #1e293b' }}
                    >
                      {getActivityIcon(activity.type)}
                    </div>

                    {/* Details */}
                    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                      <span
                        className="text-base font-normal truncate"
                        style={{ color: '#f8fafc' }}
                      >
                        {activity.title}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {getStatusBadge(activity.status)}
                        <span
                          className="text-[10px]"
                          style={{ color: '#94a3b8' }}
                        >
                          {activity.time}
                        </span>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                      <span
                        className="text-base font-bold"
                        style={{ color: activity.isPositive ? '#4ade80' : '#f8fafc' }}
                      >
                        {activity.isPositive ? '+' : '-'}{activity.amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                      </span>
                      <span
                        className="text-[10px]"
                        style={{ color: '#94a3b8' }}
                      >
                        GFT
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {Object.keys(groupedActivities).length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(30, 41, 59, 0.5)' }}
              >
                <Award className="w-8 h-8" style={{ color: '#94a3b8' }} />
              </div>
              <span
                className="text-base font-medium text-center"
                style={{ color: '#94a3b8' }}
              >
                No activities found
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
