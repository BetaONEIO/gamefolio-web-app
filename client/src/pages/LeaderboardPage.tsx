import { Trophy, Upload, Heart, MessageCircle, Filter } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

interface PointsLeaderboardEntry {
  userId: number;
  uploadsCount: number;
  likesGivenCount: number;
  commentsCount: number;
  firesGivenCount: number;
  totalPoints: number;
  rank: number;
  user: {
    id: number;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
  };
}

type TabType = "global" | "weekly" | "monthly";

const LeaderboardPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("global");

  // Fetch all-time leaderboard data from API
  const { data: allTimeData, isLoading: allTimeLoading } = useQuery<PointsLeaderboardEntry[]>({
    queryKey: ["/api/leaderboard"],
    queryFn: async () => {
      const res = await fetch("/api/leaderboard");
      if (!res.ok) throw new Error("Failed to fetch leaderboard");
      return res.json();
    },
  });

  // Fetch weekly leaderboard
  const { data: weeklyData, isLoading: weeklyLoading } = useQuery<PointsLeaderboardEntry[]>({
    queryKey: ["/api/leaderboard/weekly/current"],
    queryFn: async () => {
      const res = await fetch("/api/leaderboard/weekly/current");
      if (!res.ok) throw new Error("Failed to fetch weekly leaderboard");
      return res.json();
    },
  });

  // Fetch monthly leaderboard
  const { data: monthlyData, isLoading: monthlyLoading } = useQuery<PointsLeaderboardEntry[]>({
    queryKey: ["/api/leaderboard/monthly/current"],
    queryFn: async () => {
      const res = await fetch("/api/leaderboard/monthly/current");
      if (!res.ok) throw new Error("Failed to fetch monthly leaderboard");
      return res.json();
    },
  });

  const getCurrentData = () => {
    switch (activeTab) {
      case "weekly":
        return { data: weeklyData, isLoading: weeklyLoading };
      case "monthly":
        return { data: monthlyData, isLoading: monthlyLoading };
      default:
        return { data: allTimeData, isLoading: allTimeLoading };
    }
  };

  const { data: currentData, isLoading } = getCurrentData();

  const getRankStyles = (rank: number) => {
    if (rank === 1) {
      return {
        cardBg: "bg-[#f0b100]/5",
        cardBorder: "border-[#f0b100]/20",
        avatarBorder: "border-[#f0b100]/30",
        scoreBg: "bg-gradient-to-b from-[#fdc700] to-[#d08700]",
        scoreText: "text-black",
        scoreShadow: "shadow-[0_4px_6px_-4px_#f0b10033,0_10px_15px_-3px_#f0b10033]",
      };
    }
    if (rank === 2) {
      return {
        cardBg: "bg-[#90a1b9]/5",
        cardBorder: "border-[#90a1b9]/20",
        avatarBorder: "border-[#90a1b9]/30",
        scoreBg: "bg-gradient-to-b from-[#cad5e2] to-[#62748e]",
        scoreText: "text-black",
        scoreShadow: "shadow-[0_4px_6px_-4px_#62748e33,0_10px_15px_-3px_#62748e33]",
      };
    }
    if (rank === 3) {
      return {
        cardBg: "bg-[#f54900]/5",
        cardBorder: "border-[#f54900]/20",
        avatarBorder: "border-[#f54900]/30",
        scoreBg: "bg-gradient-to-b from-[#ff6900] to-[#ca3500]",
        scoreText: "text-white",
        scoreShadow: "shadow-[0_4px_6px_-4px_#ca350033,0_10px_15px_-3px_#ca350033]",
      };
    }
    return {
      cardBg: "bg-[#0f172a]",
      cardBorder: "border-[#1e293b]/50",
      avatarBorder: "border-[#1e293b]/50",
      scoreBg: "bg-[#1e293b]",
      scoreText: "text-white",
      scoreShadow: "",
    };
  };

  const RankIcon = ({ rank }: { rank: number }) => {
    if (rank === 1) {
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path fillRule="evenodd" clipRule="evenodd" d="M20.0858 14.3219L20.2787 12.4285C20.3817 11.4178 20.4487 10.751 20.3957 10.3301H20.4157C21.2864 10.3301 21.9932 9.58431 21.9932 8.66458C21.9932 7.74485 21.2864 6.99806 20.4147 6.99806C19.5429 6.99806 18.8361 7.74385 18.8361 8.66458C18.8361 9.08046 18.9811 9.46135 19.22 9.75326C18.8771 9.9762 18.4283 10.4481 17.7525 11.1579C17.2326 11.7047 16.9727 11.9776 16.6828 12.0206C16.5217 12.0436 16.3574 12.0193 16.2099 11.9506C15.942 11.8267 15.763 11.4888 15.4061 10.812L13.5227 7.24799C13.3027 6.83111 13.1178 6.48221 12.9508 6.20129C13.6336 5.8334 14.1005 5.08462 14.1005 4.22187C14.1005 2.99322 13.1588 1.99951 11.9961 1.99951C10.8335 1.99951 9.89173 2.99422 9.89173 4.22087C9.89173 5.08462 10.3586 5.8334 11.0414 6.20029C10.8744 6.48221 10.6905 6.83111 10.4696 7.24799L8.58711 10.813C8.22922 11.4888 8.05027 11.8267 7.78235 11.9516C7.63483 12.0203 7.47056 12.0446 7.30948 12.0216C7.01957 11.9786 6.75964 11.7047 6.23979 11.1579C5.56399 10.4481 5.11512 9.9762 4.77222 9.75326C5.01215 9.46135 5.15611 9.08046 5.15611 8.66358C5.15611 7.74485 4.44831 6.99806 3.57657 6.99806C2.70682 6.99806 1.99902 7.74385 1.99902 8.66458C1.99902 9.58431 2.70582 10.3301 3.57757 10.3301H3.59656C3.54258 10.75 3.61056 11.4178 3.71353 12.4285L3.90647 14.3219C4.01344 15.3726 4.10241 16.3723 4.21238 17.2731H19.7799C19.8898 16.3733 19.9788 15.3726 20.0858 14.3219Z" fill="#F0B100" />
          <path fillRule="evenodd" clipRule="evenodd" d="M10.8515 21.9937H13.1408C16.1249 21.9937 17.6175 21.9937 18.6132 21.054C19.0471 20.6421 19.323 19.9023 19.5209 18.9386H4.47131C4.66925 19.9023 4.94417 20.6421 5.37904 21.053C6.37475 21.9937 7.86732 21.9937 10.8515 21.9937Z" fill="#F0B100" />
        </svg>
      );
    }
    if (rank === 2) {
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path fillRule="evenodd" clipRule="evenodd" d="M13.4324 5.41528C12.5375 4.92741 11.4561 4.92741 10.5612 5.41528L5.76763 8.02853C4.8042 8.55424 4.20487 9.56423 4.20508 10.6618V15.5983C4.20487 16.6959 4.8042 17.7059 5.76763 18.2316L10.5612 20.8448C11.4561 21.3327 12.5375 21.3327 13.4324 20.8448L18.225 18.2316C19.1888 17.7061 19.7886 16.6961 19.7886 15.5983V10.6608C19.7886 9.56302 19.1888 8.55298 18.225 8.02753L13.4324 5.41528ZM11.9968 10.1309C11.7129 10.1309 11.523 10.4708 11.1431 11.1536L11.0451 11.3296C10.9371 11.5235 10.8831 11.6195 10.7992 11.6835C10.7142 11.7474 10.6092 11.7714 10.3993 11.8184L10.2093 11.8624C9.47155 12.0294 9.10266 12.1123 9.01469 12.3943C8.92671 12.6762 9.17864 12.9711 9.68149 13.5589L9.81146 13.7109C9.95441 13.8778 10.0264 13.9608 10.0584 14.0648C10.0904 14.1687 10.0794 14.2797 10.0584 14.5027L10.0384 14.7056C9.96241 15.4904 9.92442 15.8833 10.1534 16.0572C10.3833 16.2312 10.7292 16.0722 11.42 15.7543L11.5979 15.6723C11.7949 15.5823 11.8929 15.5374 11.9968 15.5374C12.1008 15.5374 12.1988 15.5823 12.3957 15.6723L12.5737 15.7543C13.2645 16.0732 13.6104 16.2312 13.8403 16.0572C14.0702 15.8833 14.0312 15.4904 13.9553 14.7056L13.9353 14.5027C13.9143 14.2797 13.9033 14.1687 13.9353 14.0648C13.9673 13.9608 14.0392 13.8778 14.1822 13.7109L14.3122 13.5589C14.815 12.9711 15.0669 12.6772 14.979 12.3943C14.891 12.1123 14.5221 12.0294 13.7843 11.8624L13.5944 11.8184C13.3844 11.7714 13.2795 11.7484 13.1945 11.6835C13.1105 11.6195 13.0565 11.5235 12.9485 11.3296L12.8506 11.1536C12.4707 10.4718 12.2807 10.1309 11.9968 10.1309Z" fill="#90A1B9" />
          <path fillRule="evenodd" clipRule="evenodd" d="M10.9969 1.99927H12.9963C14.8818 1.99927 15.8235 1.99927 16.4093 2.5851C16.9952 3.17093 16.9952 4.11266 16.9952 5.99811V6.0161L14.15 4.46455C12.8077 3.73275 11.1855 3.73275 9.84322 4.46455L6.99805 6.0161V5.99811C6.99805 4.11266 6.99805 3.17093 7.58388 2.5851C8.16971 1.99927 9.11144 1.99927 10.9969 1.99927Z" fill="#90A1B9" />
        </svg>
      );
    }
    if (rank === 3) {
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path fillRule="evenodd" clipRule="evenodd" d="M21.9932 8.15968V8.23266C21.9932 9.09241 21.9932 9.52329 21.7863 9.87519C21.5794 10.2271 21.2025 10.436 20.4507 10.8549L19.6579 11.2948C20.2038 9.44731 20.3867 7.46188 20.4537 5.76438L20.4637 5.54344L20.4657 5.49146C21.1165 5.71739 21.4824 5.88634 21.7103 6.20225C21.9932 6.59514 21.9932 7.11698 21.9932 8.15968Z" fill="#F54900" />
          <path fillRule="evenodd" clipRule="evenodd" d="M1.99902 8.15968V8.23266C1.99902 9.09241 1.99902 9.52329 2.20596 9.87519C2.4129 10.2271 2.78979 10.436 3.54158 10.8549L4.33535 11.2948C3.78851 9.44731 3.60556 7.46188 3.53858 5.76438L3.52858 5.54344L3.52758 5.49146C2.87577 5.71739 2.50988 5.88634 2.28194 6.20225C1.99902 6.59514 1.99902 7.11798 1.99902 8.15968Z" fill="#F54900" />
          <path fillRule="evenodd" clipRule="evenodd" d="M16.3466 2.34617C14.9001 2.10923 13.4365 1.9932 11.9708 1.99927C10.1883 1.99927 8.71869 2.15622 7.595 2.34617C6.45632 2.53812 5.88747 2.63409 5.41161 3.21993C4.93674 3.80576 4.96173 4.43859 5.01172 5.70424C5.18467 10.051 6.12241 15.4815 11.221 15.9614V19.4944H9.79139C9.31502 19.4947 8.90503 19.831 8.81166 20.2982L8.62171 21.2439H5.97245C5.55835 21.2439 5.22266 21.5796 5.22266 21.9937C5.22266 22.4078 5.55835 22.7435 5.97245 22.7435H17.9691C18.3832 22.7435 18.7189 22.4078 18.7189 21.9937C18.7189 21.5796 18.3832 21.2439 17.9691 21.2439H15.3198L15.1299 20.2982C15.0365 19.831 14.6265 19.4947 14.1502 19.4944H12.7206V15.9614C17.8192 15.4815 18.7579 10.052 18.9298 5.70424C18.9798 4.43859 19.0058 3.80476 18.53 3.21993C18.0541 2.63409 17.4852 2.53812 16.3466 2.34617Z" fill="#F54900" />
        </svg>
      );
    }
    return (
      <span className="text-sm font-semibold text-slate-400">#{rank}</span>
    );
  };

  const LeaderboardCard = ({ entry }: { entry: PointsLeaderboardEntry }) => {
    const styles = getRankStyles(entry.rank);
    
    return (
      <Link href={`/profile/${entry.user.username}`}>
        <div
          className={`flex items-center gap-4 p-4 rounded-2xl border ${styles.cardBg} ${styles.cardBorder} transition-all hover:scale-[1.02] cursor-pointer`}
          data-testid={`leaderboard-entry-${entry.userId}`}
        >
          {/* Rank Icon */}
          <div className="w-8 flex items-center justify-center">
            <RankIcon rank={entry.rank} />
          </div>

          {/* Avatar */}
          <div className={`w-12 h-12 rounded-2xl border ${styles.avatarBorder} bg-[#0f172a] overflow-hidden flex-shrink-0`}>
            <Avatar className="w-full h-full rounded-none">
              <AvatarImage src={entry.user.avatarUrl || undefined} className="object-cover" />
              <AvatarFallback className="bg-[#0f172a] text-slate-400 rounded-none">
                {entry.user.displayName.charAt(0)}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* User Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col gap-0.5">
              <span className="font-bold text-slate-50 text-base truncate">
                {entry.user.displayName}
              </span>
              <span className="text-slate-400 text-xs truncate">
                @{entry.user.username}
              </span>
            </div>
            
            {/* Stats Row */}
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-1">
                <Upload className="w-3 h-3 text-[#00bcff]" />
                <span className="text-[10px] font-bold text-[#00bcff]">{entry.uploadsCount}</span>
              </div>
              <div className="flex items-center gap-1">
                <Heart className="w-3 h-3 text-[#ff2056] fill-[#ff2056]" />
                <span className="text-[10px] font-bold text-[#ff2056]">{entry.likesGivenCount}</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageCircle className="w-3 h-3 text-[#00d492] fill-[#00d492]" />
                <span className="text-[10px] font-bold text-[#00d492]">{entry.commentsCount}</span>
              </div>
              <div className="flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" clipRule="evenodd" d="M6.41458 10.8356C7.97713 10.5227 9.99755 9.39853 9.99755 6.49186C9.99755 3.84713 8.06161 2.08563 6.66951 1.27637C6.3601 1.09642 5.9987 1.33285 5.9987 1.69025V2.60398C5.9987 3.32478 5.69579 4.6404 4.85403 5.18774C4.42416 5.46716 3.95929 5.04878 3.90731 4.53893L3.86432 4.12005C3.81433 3.63319 3.31848 3.33777 2.92959 3.63469C2.23029 4.16703 1.5 5.10177 1.5 6.49136C1.5 10.0458 4.14374 10.9351 5.46536 10.9351C5.54267 10.9351 5.62331 10.9326 5.70729 10.9276C5.05448 10.8721 3.99928 10.4672 3.99928 9.1576C3.99928 8.13289 4.74656 7.44059 5.3144 7.10319C5.46736 7.01321 5.64581 7.13068 5.64581 7.30813V7.60304C5.64581 7.82798 5.73328 8.18038 5.94072 8.42131C6.17565 8.69423 6.52005 8.40831 6.54755 8.04942C6.55654 7.93645 6.67051 7.86447 6.76848 7.92145C7.08889 8.1089 7.49827 8.50878 7.49827 9.1576C7.49827 10.1813 6.93393 10.6522 6.41458 10.8356Z" fill="#FF6900" />
                </svg>
                <span className="text-[10px] font-bold text-[#ff6900]">{entry.firesGivenCount}</span>
              </div>
            </div>
          </div>

          {/* Score Badge */}
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${styles.scoreBg} ${styles.scoreShadow}`}>
            <span className={`text-sm font-medium ${styles.scoreText}`}>
              {Math.round(entry.totalPoints)}
            </span>
          </div>
        </div>
      </Link>
    );
  };

  const LoadingSkeleton = () => (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 rounded-2xl border border-[#1e293b]/50 bg-[#0f172a]">
          <Skeleton className="w-8 h-6 bg-slate-700" />
          <Skeleton className="w-12 h-12 rounded-2xl bg-slate-700" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-24 bg-slate-700" />
            <Skeleton className="h-3 w-16 bg-slate-700" />
            <div className="flex gap-3">
              <Skeleton className="h-3 w-8 bg-slate-700" />
              <Skeleton className="h-3 w-8 bg-slate-700" />
              <Skeleton className="h-3 w-8 bg-slate-700" />
              <Skeleton className="h-3 w-8 bg-slate-700" />
            </div>
          </div>
          <Skeleton className="w-10 h-10 rounded-full bg-slate-700" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617]">
      <div className="max-w-md mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-[30px] font-bold text-slate-50 leading-9">
            Leaderboard
          </h1>
          <button className="w-10 h-10 rounded-full bg-[#0f172a] border border-[#1e293b] flex items-center justify-center">
            <Filter className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Tab Pills */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab("global")}
            className={`px-5 py-2 rounded-full text-sm font-bold transition-colors ${
              activeTab === "global"
                ? "bg-[#4ade80] text-[#022c22]"
                : "bg-[#1e293b] text-slate-50"
            }`}
            data-testid="tab-global"
          >
            Global
          </button>
          <button
            onClick={() => setActiveTab("weekly")}
            className={`px-5 py-2 rounded-full text-sm font-bold transition-colors ${
              activeTab === "weekly"
                ? "bg-[#4ade80] text-[#022c22]"
                : "bg-[#1e293b] text-slate-50"
            }`}
            data-testid="tab-weekly"
          >
            Weekly
          </button>
          <button
            onClick={() => setActiveTab("monthly")}
            className={`px-5 py-2 rounded-full text-sm font-bold transition-colors ${
              activeTab === "monthly"
                ? "bg-[#4ade80] text-[#022c22]"
                : "bg-[#1e293b] text-slate-50"
            }`}
            data-testid="tab-monthly"
          >
            Monthly
          </button>
        </div>

        {/* Leaderboard List */}
        <div className="space-y-4">
          {isLoading ? (
            <LoadingSkeleton />
          ) : !currentData || currentData.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="h-16 w-16 mx-auto mb-4 text-slate-600" />
              <h3 className="text-lg font-semibold text-slate-50 mb-2">No Rankings Yet</h3>
              <p className="text-sm text-slate-400">
                Start uploading clips and engaging with content to appear here!
              </p>
            </div>
          ) : (
            currentData.map((entry: PointsLeaderboardEntry) => (
              <LeaderboardCard key={entry.userId} entry={entry} />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default LeaderboardPage;
