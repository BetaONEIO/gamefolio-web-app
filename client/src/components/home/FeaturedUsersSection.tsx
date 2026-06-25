import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { GamefolioTrendingIcon } from "@/components/icons/GamefolioTrendingIcon";
import { CreatorCard, TrendingEntry, CREATOR_CARD_STYLES } from "@/components/home/CreatorCard";

type Period = 'week' | 'month' | 'alltime';

const PERIOD_LABELS: Record<Period, string> = {
  week: 'This Week',
  month: 'This Month',
  alltime: 'All Time',
};

const STYLES = `
  @keyframes fire-scroll {
    0%   { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  .fire-carousel-track {
    display: flex;
    gap: 16px;
    animation: fire-scroll 60s linear infinite;
    width: max-content;
  }
  .fire-carousel-track:hover {
    animation-play-state: paused;
  }
  ${CREATOR_CARD_STYLES}
`;

function CardSkeleton() {
  return (
    <div
      className="flex-shrink-0 rounded-2xl overflow-hidden"
      style={{ width: 190, height: 340, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <Skeleton className="w-full h-[90px]" />
      <div className="flex justify-center -mt-7 mb-2">
        <Skeleton className="w-14 h-14 rounded-full" />
      </div>
      <Skeleton className="h-4 w-28 mx-auto mb-1" />
      <Skeleton className="h-3 w-20 mx-auto mb-3" />
      <Skeleton className="h-14 mx-3 rounded-xl mb-2" />
      <Skeleton className="h-3 w-24 mx-auto mb-auto" />
      <Skeleton className="h-9 mx-3 rounded-xl mt-4" />
    </div>
  );
}

const FeaturedUsersSection = () => {
  const [period, setPeriod] = useState<Period>('week');

  const { data: entries = [], isLoading } = useQuery<TrendingEntry[]>({
    queryKey: ["/api/trending-gamefolios", period],
    queryFn: async () => {
      const res = await fetch(`/api/trending-gamefolios?period=${period}&limit=10`);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });

  const validEntries = entries.filter(e => e.user);
  const displayEntries = validEntries.length > 0 ? [...validEntries, ...validEntries] : [];

  return (
    <div>
      <style>{STYLES}</style>

      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <GamefolioTrendingIcon className="w-5 h-5 text-primary" />
          <h2 className="text-xl sm:text-2xl font-bold">Trending Gamefolios</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg p-1" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className="px-3 py-1 rounded-md text-xs font-semibold transition-all duration-150"
                style={period === p ? { background: '#B7FF1A', color: '#0B1319' } : { color: 'rgba(255,255,255,0.45)' }}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
          <Link href="/explore" className="text-sm font-medium hover:underline flex items-center gap-1" style={{ color: '#B7FF1A' }}>
            View all <span>›</span>
          </Link>
        </div>
      </div>

      <div
        className="relative overflow-hidden rounded-2xl"
        style={{ background: 'rgba(8,14,8,0.6)', border: '1px solid rgba(183,255,26,0.08)', padding: '20px 0' }}
      >
        <div className="absolute left-0 top-0 bottom-0 w-16 pointer-events-none" style={{ background: 'linear-gradient(to right, rgba(8,14,8,0.95), transparent)', zIndex: 10 }} />
        <div className="absolute right-0 top-0 bottom-0 w-16 pointer-events-none" style={{ background: 'linear-gradient(to left, rgba(8,14,8,0.95), transparent)', zIndex: 10 }} />

        {isLoading ? (
          <div className="flex gap-4 px-5">
            {Array(6).fill(0).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : validEntries.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-white/30 text-sm">
            No data for this period yet.
          </div>
        ) : (
          <div className="fire-carousel-track px-5">
            {displayEntries.map((entry, idx) => (
              <CreatorCard key={`${entry.userId}-${idx}`} entry={entry} period={period} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FeaturedUsersSection;
