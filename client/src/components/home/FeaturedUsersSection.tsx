import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { GamefolioTrendingIcon } from "@/components/icons/GamefolioTrendingIcon";
import { CreatorCard } from "@/components/home/CreatorCard";
import { TrendingEntry, CREATOR_CARD_STYLES } from "@/components/home/creator-card-utils";

type Period = 'week' | 'month' | 'alltime';

const PERIOD_LABELS: Record<Period, string> = {
  week: 'This Week',
  month: 'This Month',
  alltime: 'All Time',
};

// Fixed particle data – deterministic so no layout shifts on re-render
const PARTICLES = [
  { id:  1, x:  6, y: 82, size: 3, dur: 20, delay:  0, shape: 'circle'  },
  { id:  2, x: 14, y: 68, size: 4, dur: 25, delay:  4, shape: 'diamond' },
  { id:  3, x: 23, y: 88, size: 2, dur: 18, delay:  8, shape: 'circle'  },
  { id:  4, x: 31, y: 74, size: 3, dur: 23, delay:  2, shape: 'plus'    },
  { id:  5, x: 40, y: 85, size: 2, dur: 19, delay:  6, shape: 'circle'  },
  { id:  6, x: 49, y: 63, size: 4, dur: 26, delay: 11, shape: 'diamond' },
  { id:  7, x: 58, y: 80, size: 3, dur: 21, delay:  1, shape: 'circle'  },
  { id:  8, x: 66, y: 71, size: 2, dur: 28, delay:  5, shape: 'plus'    },
  { id:  9, x: 74, y: 87, size: 3, dur: 17, delay:  9, shape: 'circle'  },
  { id: 10, x: 82, y: 66, size: 4, dur: 24, delay:  3, shape: 'diamond' },
  { id: 11, x: 90, y: 78, size: 2, dur: 22, delay:  7, shape: 'circle'  },
  { id: 12, x: 11, y: 52, size: 3, dur: 27, delay: 13, shape: 'diamond' },
  { id: 13, x: 36, y: 57, size: 2, dur: 20, delay:  2, shape: 'circle'  },
  { id: 14, x: 62, y: 48, size: 3, dur: 23, delay:  6, shape: 'plus'    },
  { id: 15, x: 87, y: 54, size: 2, dur: 19, delay: 15, shape: 'circle'  },
] as const;

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

  /* Animated section background */
  @keyframes trending-bg-shift {
    0%   { background-position: 0% 0%; }
    50%  { background-position: 100% 100%; }
    100% { background-position: 0% 0%; }
  }
  .trending-bg-animated {
    background: linear-gradient(
      135deg,
      #0B1319 0%,
      #111A22 30%,
      #0E151C 55%,
      #0B1319 75%,
      #111A22 100%
    );
    background-size: 300% 300%;
    animation: trending-bg-shift 28s ease infinite;
  }

  /* XP Particles */
  @keyframes xp-particle {
    0%   { transform: translateY(0)      translateX(0);    opacity: 0; }
    18%  { opacity: 1; }
    82%  { opacity: 1; }
    100% { transform: translateY(-110px) translateX(14px); opacity: 0; }
  }
  @keyframes xp-particle-alt {
    0%   { transform: translateY(0)      translateX(0);     opacity: 0; }
    18%  { opacity: 1; }
    82%  { opacity: 1; }
    100% { transform: translateY(-90px)  translateX(-10px); opacity: 0; }
  }
  .xp-particle {
    position: absolute;
    background: #B7FF1A;
    pointer-events: none;
    will-change: transform, opacity;
    filter: blur(0.5px) drop-shadow(0 0 3px #B7FF1A);
  }
  .xp-particle.diamond {
    transform-origin: center;
    transform: rotate(45deg);
  }

  /* Respect reduced-motion */
  @media (prefers-reduced-motion: reduce) {
    .fire-carousel-track { animation: none; }
    .trending-bg-animated { animation: none; background: #0B1319; }
    .xp-particle { display: none; }
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

      {/* Section header */}
      <div className="flex justify-between items-center mb-4 px-4 sm:px-6 md:px-8">
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

      {/* Section body with animated background */}
      <div
        className="relative overflow-hidden rounded-2xl trending-bg-animated"
        style={{ border: '1px solid rgba(183,255,26,0.08)', padding: '20px 0' }}
      >
        {/* Floating XP particles (behind cards via z-index) */}
        {PARTICLES.map((p, i) => {
          const isAlt = i % 3 === 2;
          const baseOpacity = 0.15 + (i % 4) * 0.035; // 0.15 – 0.255
          return (
            <span
              key={p.id}
              className={`xp-particle${p.shape === 'diamond' ? ' diamond' : ''}`}
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: p.size,
                height: p.shape === 'plus' ? 1 : p.size,
                borderRadius: p.shape === 'circle' ? '50%' : p.shape === 'diamond' ? '1px' : 0,
                fontSize: p.shape === 'plus' ? p.size * 3 : undefined,
                lineHeight: p.shape === 'plus' ? 1 : undefined,
                background: p.shape === 'plus' ? 'transparent' : '#B7FF1A',
                color: p.shape === 'plus' ? '#B7FF1A' : undefined,
                content: p.shape === 'plus' ? '+' : undefined,
                opacity: baseOpacity,
                zIndex: 1,
                animationName: isAlt ? 'xp-particle-alt' : 'xp-particle',
                animationDuration: `${p.dur}s`,
                animationDelay: `${p.delay}s`,
                animationTimingFunction: 'ease-in-out',
                animationIterationCount: 'infinite',
              }}
            >
              {p.shape === 'plus' ? '+' : null}
            </span>
          );
        })}

        {/* Edge fade overlays (above particles, below cards) */}
        <div className="absolute left-0 top-0 bottom-0 w-16 pointer-events-none" style={{ background: 'linear-gradient(to right, #0B1319, transparent)', zIndex: 10 }} />
        <div className="absolute right-0 top-0 bottom-0 w-16 pointer-events-none" style={{ background: 'linear-gradient(to left, #0B1319, transparent)', zIndex: 10 }} />

        {isLoading ? (
          <div className="flex gap-4 px-5" style={{ zIndex: 11, position: 'relative' }}>
            {Array(6).fill(0).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : validEntries.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-white/30 text-sm" style={{ zIndex: 11, position: 'relative' }}>
            No data for this period yet.
          </div>
        ) : (
          <div className="fire-carousel-track px-5" style={{ zIndex: 11, position: 'relative' }}>
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
