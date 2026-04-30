import { useState } from "react";
import { ArrowLeft, Gift, TrendingUp, ShoppingCart, Award, Filter, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import ActivityDetailScreen from "./ActivityDetailScreen";

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
  gbpAmount?: number;
  stripePaymentIntentId?: string;
  txHash?: string;
  walletAddress?: string;
  orderStatus?: string;
}

interface ActivityHistoryScreenProps {
  onBack: () => void;
}

export default function ActivityHistoryScreen({ onBack }: ActivityHistoryScreenProps) {
  const [activeFilter, setActiveFilter] = useState<ActivityType>("all");
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  const { data: activityData, isLoading } = useQuery<{ activities: any[] }>({
    queryKey: ['/api/wallet/activity'],
    queryFn: async () => {
      const res = await fetch('/api/wallet/activity', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch activity');
      return res.json();
    },
  });

  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);
    const activityDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    if (activityDate.getTime() === today.getTime()) return "today";
    if (activityDate.getTime() === yesterday.getTime()) return "yesterday";
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const activities: Activity[] = (activityData?.activities || []).map((a: any) => ({
    id: a.id,
    type: 'purchase' as const,
    title: a.title || 'GFT Purchase',
    status: a.status as Activity['status'],
    time: a.time,
    amount: a.amount,
    isPositive: true,
    date: getDateLabel(a.date),
    gbpAmount: a.gbpAmount,
    stripePaymentIntentId: a.stripePaymentIntentId,
    txHash: a.txHash,
    walletAddress: a.walletAddress,
    orderStatus: a.orderStatus,
  }));

  if (selectedActivity) {
    return (
      <ActivityDetailScreen
        onBack={() => setSelectedActivity(null)}
        activity={{
          id: selectedActivity.id,
          type: selectedActivity.type,
          title: selectedActivity.title,
          status: selectedActivity.status,
          amount: selectedActivity.amount,
          isPositive: selectedActivity.isPositive,
          date: selectedActivity.date === "today" ? "Today" : selectedActivity.date === "yesterday" ? "Yesterday" : selectedActivity.date,
          time: selectedActivity.time,
          transactionHash: selectedActivity.txHash || undefined,
          toAddress: selectedActivity.walletAddress || undefined,
          networkFee: "Free",
          paymentMethod: selectedActivity.type === "purchase" ? `£${selectedActivity.gbpAmount?.toFixed(2)} Card` : undefined,
        }}
      />
    );
  }

  const filters: { id: ActivityType; label: string }[] = [
    { id: "all", label: "All Activities" },
    { id: "purchases", label: "Purchases" },
    { id: "staking", label: "Staking" },
    { id: "rewards", label: "Rewards" },
  ];

  const filteredActivities = activities.filter((activity) => {
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
        border: 'rgba(183, 255, 26, 0.2)',
        color: '#B7FF1A',
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
      style={{ background: '#101D27' }}
    >
      {/* Header with gradient */}
      <div
        className="flex flex-col gap-4 px-6 pt-12 pb-6"
        style={{
          background: 'linear-gradient(180deg, rgba(20, 83, 45, 0.2) 0%, #101D27 100%)',
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
                background: activeFilter === filter.id ? '#B7FF1A' : '#1e293b',
                border: `1px solid ${activeFilter === filter.id ? '#B7FF1A' : '#1e293b'}`,
                color: activeFilter === filter.id ? '#071013' : '#94a3b8',
              }}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Activity List */}
      <div className="flex-1 px-6 py-6 max-w-[430px] mx-auto w-full">
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#B7FF1A' }} />
          </div>
        )}
        {!isLoading && <div className="flex flex-col gap-8">
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
                  <button
                    key={activity.id}
                    onClick={() => setSelectedActivity(activity)}
                    className="flex items-center gap-4 p-3 rounded-2xl w-full text-left transition-all hover:bg-slate-800/50"
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
                        style={{ color: activity.isPositive ? '#B7FF1A' : '#f8fafc' }}
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
                  </button>
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
        </div>}
      </div>
    </div>
  );
}
