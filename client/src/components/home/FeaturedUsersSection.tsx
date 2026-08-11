import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { GamefolioTrendingIcon } from "@/components/icons/GamefolioTrendingIcon";
import { CreatorCard } from "@/components/home/CreatorCard";
import { TrendingEntry, CREATOR_CARD_STYLES } from "@/components/home/creator-card-utils";

const STYLES = `
  @keyframes fire-scroll {
    0%   { transform: translateX(0); }
    100% { transform: translateX(-33.3333%); }
  }
  .fire-carousel-track {
    display: flex;
    animation: fire-scroll 90s linear infinite;
    width: max-content;
    will-change: transform;
  }
  .fire-carousel-track:hover {
    animation-play-state: paused;
  }

  .trending-bg-pattern {
    background-image:
      linear-gradient(rgba(4, 10, 2, 0.34), rgba(4, 10, 2, 0.34)),
      url("/attached_assets/background-trending_1785854153143.png");
    background-position: center;
    background-size: cover;
    background-repeat: repeat;
  }

  @media (prefers-reduced-motion: reduce) {
    .fire-carousel-track { animation: none; }
  }

  ${CREATOR_CARD_STYLES}
`;

function CardSkeleton() {
  return (
    <div
      className="flex-shrink-0 rounded-2xl overflow-hidden"
      style={{ width: 228, height: 480, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <Skeleton className="w-full h-[90px]" />
      <div className="flex justify-center -mt-7 mb-2">
        <Skeleton className="w-14 h-14 rounded-full" />
      </div>
      <Skeleton className="h-4 w-28 mx-auto mb-1" />
      <Skeleton className="h-3 w-20 mx-auto mb-3" />
      <Skeleton className="h-14 mx-3 rounded-xl mb-2" />
      <Skeleton className="h-10 mx-3 rounded-xl mb-2" />
      <Skeleton className="h-10 mx-3 rounded-xl mb-auto" />
      <Skeleton className="h-9 mx-3 rounded-xl mt-4" />
    </div>
  );
}

const FeaturedUsersSection = () => {
  const period = 'week' as const;

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
  const displayEntries = validEntries.length > 0
    ? [...validEntries, ...validEntries, ...validEntries]
    : [];

  return (
    <div>
      <style>{STYLES}</style>

      {/* Section header */}
      <div className="flex justify-between items-center mb-4 px-4 sm:px-6 md:px-8">
        <div className="flex items-center gap-2">
          <GamefolioTrendingIcon className="w-5 h-5 text-primary" />
          <h2 className="text-xl sm:text-2xl font-bold">Trending Gamefolios</h2>
        </div>
      </div>

      {/* Section body with lightning pattern background */}
      <div
        className="relative overflow-hidden rounded-2xl trending-bg-pattern"
        style={{ padding: '20px 0' }}
      >
        {/* Edge fade overlays */}
        <div className="absolute left-0 top-0 bottom-0 w-16 pointer-events-none" style={{ background: 'linear-gradient(to right, #0B1319, transparent)', zIndex: 10 }} />
        <div className="absolute right-0 top-0 bottom-0 w-16 pointer-events-none" style={{ background: 'linear-gradient(to left, #0B1319, transparent)', zIndex: 10 }} />

        {isLoading ? (
          <div className="flex gap-4 px-5" style={{ zIndex: 11, position: 'relative' }}>
            {Array(6).fill(0).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : validEntries.length === 0 ? (
           <div className="flex items-center justify-center py-12 text-white/30 text-sm" style={{ zIndex: 11, position: 'relative' }}>
             No trending data yet.
          </div>
        ) : (
          <div className="fire-carousel-track" style={{ zIndex: 11, position: 'relative' }}>
            {displayEntries.map((entry, idx) => (
              <div key={`${entry.userId}-${idx}`} style={{ paddingRight: 16, flexShrink: 0 }}>
                <CreatorCard entry={entry} period={period} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FeaturedUsersSection;
