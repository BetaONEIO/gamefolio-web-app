import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Zap } from "lucide-react";

interface LeaderboardEntry {
  userId: number;
  totalPoints: number;
  uploadsCount: number;
  rank: number;
  user: {
    id: number;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    avatarBorderColor: string | null;
    accentColor: string | null;
    bio: string | null;
    level?: number | null;
  };
}

const RANK_COLORS: Record<number, string> = {
  1: '#FFD700',
  2: '#C0C0C0',
  3: '#CD7F32',
};

function CreatorCard({ entry }: { entry: LeaderboardEntry }) {
  const { user, rank, totalPoints, uploadsCount } = entry;
  const borderColor = user.avatarBorderColor || user.accentColor || '#B7FF1A';
  const rankColor = RANK_COLORS[rank] || 'rgba(255,255,255,0.3)';

  return (
    <Link href={`/profile/${user.username}`}>
      <div
        className="flex-shrink-0 p-4 rounded-2xl cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-xl"
        style={{
          width: 180,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        {/* Rank badge */}
        <div className="flex justify-between items-start mb-3">
          <div
            className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full"
            style={{
              background: `${rankColor}20`,
              color: rankColor,
              border: `1px solid ${rankColor}40`,
            }}
          >
            <Trophy className="w-3 h-3" />
            #{rank}
          </div>
          <div
            className="flex items-center gap-0.5 text-[10px] font-semibold"
            style={{ color: '#B7FF1A' }}
          >
            <Zap className="w-3 h-3" />
            {totalPoints >= 1000 ? `${(totalPoints / 1000).toFixed(1)}K` : totalPoints}
          </div>
        </div>

        {/* Avatar */}
        <div className="flex justify-center mb-3">
          <div
            className="w-16 h-16 rounded-full overflow-hidden"
            style={{ border: `2px solid ${borderColor}66` }}
          >
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.displayName || user.username}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-2xl font-bold"
                style={{ background: `${borderColor}22`, color: borderColor }}
              >
                {(user.displayName || user.username).charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* Name */}
        <div className="text-center">
          <p className="text-white text-sm font-semibold truncate">
            {user.displayName || user.username}
          </p>
          <p className="text-white/40 text-xs truncate">@{user.username}</p>
          {user.bio && (
            <p className="text-white/30 text-[10px] mt-1 line-clamp-2 leading-relaxed">
              {user.bio}
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="mt-3 pt-3 border-t border-white/5 flex justify-center">
          <span className="text-white/40 text-xs">{uploadsCount} clips</span>
        </div>
      </div>
    </Link>
  );
}

function CreatorCardSkeleton() {
  return (
    <div
      className="flex-shrink-0 p-4 rounded-2xl"
      style={{ width: 180, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <Skeleton className="h-4 w-12 rounded-full mb-3" />
      <div className="flex justify-center mb-3">
        <Skeleton className="w-16 h-16 rounded-full" />
      </div>
      <Skeleton className="h-4 w-24 mx-auto mb-1" />
      <Skeleton className="h-3 w-16 mx-auto" />
    </div>
  );
}

const FeaturedUsersSection = () => {
  const { data: leaderboard, isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/leaderboard"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 1000 * 60 * 5,
  });

  const entries = leaderboard?.slice(0, 10) || [];

  if (!isLoading && entries.length === 0) return null;

  return (
    <div
      className="flex gap-4 overflow-x-auto pb-3"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {isLoading
        ? Array(6).fill(0).map((_, i) => <CreatorCardSkeleton key={i} />)
        : entries.filter(e => e.user).map(entry => (
            <CreatorCard key={entry.userId} entry={entry} />
          ))
      }
    </div>
  );
};

export default FeaturedUsersSection;
