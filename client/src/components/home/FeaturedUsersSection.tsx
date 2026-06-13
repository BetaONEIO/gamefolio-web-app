import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Zap, Video, Film, Image, Users, Upload } from "lucide-react";
import { GamefolioTrendingIcon } from "@/components/icons/GamefolioTrendingIcon";

interface TrendingEntry {
  userId: number;
  rank: number;
  uploadsCount: number;
  totalPoints: number;
  clipsCount: number;
  reelsCount: number;
  screenshotsCount: number;
  followersCount: number;
  user: {
    id: number;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    bannerUrl: string | null;
    avatarBorderColor: string | null;
    accentColor: string | null;
    level?: number | null;
  };
}

type Period = 'week' | 'month' | 'alltime';

const PERIOD_LABELS: Record<Period, string> = {
  week: 'This Week',
  month: 'This Month',
  alltime: 'All Time',
};

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function ctaLabel(entry: TrendingEntry, period: Period): string {
  const count = entry.uploadsCount;
  if (count === 0) {
    const total = entry.clipsCount + entry.reelsCount + entry.screenshotsCount;
    return `${total} total uploads`;
  }
  const label = period === 'alltime' ? 'total' : period === 'month' ? 'this month' : 'this week';
  return `${count} upload${count !== 1 ? 's' : ''} ${label}`;
}

const FIRE_STYLES = `
  @keyframes fire-scroll {
    0%   { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }

  .fire-carousel-track {
    display: flex;
    gap: 16px;
    animation: fire-scroll 28s linear infinite;
    width: max-content;
  }
  .fire-carousel-track:hover {
    animation-play-state: paused;
  }

  @keyframes flame-a {
    0%,100% { transform: scaleX(1) scaleY(1) translateY(0); opacity: 0.9; }
    25%      { transform: scaleX(1.08) scaleY(1.12) translateY(-4px); opacity: 1; }
    50%      { transform: scaleX(0.94) scaleY(0.96) translateY(-2px); opacity: 0.85; }
    75%      { transform: scaleX(1.05) scaleY(1.08) translateY(-5px); opacity: 0.95; }
  }
  @keyframes flame-b {
    0%,100% { transform: scaleX(1) scaleY(1) translateY(0); opacity: 0.7; }
    33%      { transform: scaleX(0.9) scaleY(1.15) translateY(-6px); opacity: 0.9; }
    66%      { transform: scaleX(1.1) scaleY(0.9) translateY(-3px); opacity: 0.75; }
  }
  @keyframes flame-c {
    0%,100% { transform: scaleX(1) scaleY(1) translateY(0); opacity: 0.5; }
    40%      { transform: scaleX(1.12) scaleY(1.2) translateY(-8px); opacity: 0.8; }
    70%      { transform: scaleX(0.88) scaleY(0.95) translateY(-4px); opacity: 0.55; }
  }
  @keyframes ember-rise-1 {
    0%   { transform: translate(0, 0) scale(1); opacity: 0.9; }
    100% { transform: translate(-12px, -60px) scale(0); opacity: 0; }
  }
  @keyframes ember-rise-2 {
    0%   { transform: translate(0, 0) scale(1); opacity: 0.8; }
    100% { transform: translate(10px, -70px) scale(0); opacity: 0; }
  }
  @keyframes ember-rise-3 {
    0%   { transform: translate(0, 0) scale(1); opacity: 0.7; }
    100% { transform: translate(6px, -55px) scale(0); opacity: 0; }
  }
  @keyframes glow-pulse {
    0%,100% { box-shadow: 0 0 18px 4px rgba(255,80,0,0.35), 0 0 40px 8px rgba(255,140,0,0.18), 0 4px 32px rgba(0,0,0,0.7); }
    50%      { box-shadow: 0 0 28px 8px rgba(255,100,0,0.55), 0 0 60px 16px rgba(255,180,0,0.28), 0 4px 32px rgba(0,0,0,0.7); }
  }
  .fire-card {
    animation: glow-pulse 2.4s ease-in-out infinite;
    border: 1px solid rgba(255,100,0,0.35) !important;
  }
  .fire-card:hover {
    border-color: rgba(255,140,0,0.7) !important;
  }

  .flame-layer-a { animation: flame-a 1.6s ease-in-out infinite; transform-origin: bottom center; }
  .flame-layer-b { animation: flame-b 2.1s ease-in-out infinite 0.3s; transform-origin: bottom center; }
  .flame-layer-c { animation: flame-c 1.8s ease-in-out infinite 0.7s; transform-origin: bottom center; }

  .ember-1 { animation: ember-rise-1 1.8s ease-out infinite 0.2s; }
  .ember-2 { animation: ember-rise-2 2.2s ease-out infinite 0.8s; }
  .ember-3 { animation: ember-rise-3 1.5s ease-out infinite 1.4s; }
`;

function FireEffect() {
  return (
    <div
      className="absolute bottom-0 left-0 right-0 pointer-events-none overflow-visible"
      style={{ height: 72, zIndex: 5 }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 190 72"
        width="190"
        height="72"
        style={{ position: 'absolute', bottom: 0, left: 0, overflow: 'visible' }}
      >
        <defs>
          <radialGradient id="fc-glow" cx="50%" cy="100%" r="60%">
            <stop offset="0%" stopColor="#FF6A00" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#FF6A00" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* Glow base */}
        <ellipse cx="95" cy="72" rx="80" ry="28" fill="url(#fc-glow)" />

        {/* Outer flame - tallest, amber */}
        <g className="flame-layer-c">
          <path
            d="M60 72 Q55 50 70 35 Q80 22 95 18 Q110 22 120 35 Q135 50 130 72 Z"
            fill="rgba(255,160,0,0.55)"
            style={{ filter: 'blur(3px)' }}
          />
        </g>

        {/* Mid flame - orange */}
        <g className="flame-layer-b">
          <path
            d="M68 72 Q63 52 75 40 Q84 28 95 24 Q106 28 115 40 Q127 52 122 72 Z"
            fill="rgba(255,90,0,0.75)"
            style={{ filter: 'blur(2px)' }}
          />
        </g>

        {/* Core flame - bright yellow-white */}
        <g className="flame-layer-a">
          <path
            d="M76 72 Q73 58 80 48 Q87 36 95 32 Q103 36 110 48 Q117 58 114 72 Z"
            fill="rgba(255,220,60,0.9)"
            style={{ filter: 'blur(1px)' }}
          />
          {/* Inner white hot core */}
          <path
            d="M85 72 Q83 62 88 55 Q92 49 95 47 Q98 49 102 55 Q107 62 105 72 Z"
            fill="rgba(255,255,200,0.95)"
          />
        </g>

        {/* Ember particles */}
        <circle className="ember-1" cx="82" cy="34" r="2.5" fill="#FFB300" />
        <circle className="ember-2" cx="108" cy="38" r="2" fill="#FF6A00" />
        <circle className="ember-3" cx="95" cy="30" r="1.8" fill="#FFD700" />
      </svg>
    </div>
  );
}

function CreatorCard({ entry, period }: { entry: TrendingEntry; period: Period }) {
  const { user } = entry;
  const borderColor = user.avatarBorderColor || user.accentColor || '#FF8C00';
  const hasBanner = !!user.bannerUrl;

  return (
    <Link href={`/profile/${user.username}`}>
      <div
        className="flex-shrink-0 cursor-pointer transition-all duration-200 hover:scale-[1.03] hover:-translate-y-2 relative fire-card overflow-hidden"
        style={{
          width: 190,
          height: 340,
          borderRadius: 16,
          background: 'rgba(11,19,25,0.92)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Fire effect at bottom */}
        <FireEffect />

        {/* Subtle fire-tinted overlay at bottom */}
        <div
          className="absolute bottom-0 left-0 right-0 pointer-events-none"
          style={{
            height: 80,
            background: 'linear-gradient(to top, rgba(255,60,0,0.08) 0%, transparent 100%)',
            zIndex: 4,
            borderRadius: '0 0 16px 16px',
          }}
        />

        {/* Banner */}
        <div className="relative flex-shrink-0" style={{ height: 90, borderRadius: '16px 16px 0 0', overflow: 'hidden' }}>
          {hasBanner ? (
            <img src={user.bannerUrl!} alt="" className="w-full h-full object-cover" />
          ) : (
            <div
              className="w-full h-full"
              style={{ background: `linear-gradient(135deg, #1a0a00 0%, rgba(255,80,0,0.2) 50%, #0B1319 100%)` }}
            />
          )}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(11,19,25,0.3) 0%, rgba(11,19,25,0.6) 100%)' }} />

          {/* Rank badge */}
          <div
            className="absolute top-2 left-2 flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(0,0,0,0.65)', color: entry.rank <= 3 ? ['#FFD700','#C0C0C0','#CD7F32'][entry.rank - 1] : 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(4px)' }}
          >
            #{entry.rank}
          </div>

          {/* Points badge */}
          <div
            className="absolute top-2 right-2 flex items-center gap-0.5 text-[11px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(0,0,0,0.65)', color: '#FF9500', border: '1px solid rgba(255,149,0,0.35)', backdropFilter: 'blur(4px)' }}
          >
            <Zap className="w-3 h-3" />
            {fmt(entry.totalPoints)}
          </div>
        </div>

        {/* Avatar */}
        <div className="flex justify-center" style={{ marginTop: -28, zIndex: 6, flexShrink: 0, position: 'relative' }}>
          <div
            className="rounded-full overflow-hidden"
            style={{ width: 56, height: 56, border: `2.5px solid ${borderColor}`, boxShadow: `0 0 14px ${borderColor}88, 0 0 28px rgba(255,80,0,0.3)`, flexShrink: 0 }}
          >
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.displayName || user.username} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xl font-bold" style={{ background: `${borderColor}22`, color: borderColor }}>
                {(user.displayName || user.username).charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* Name */}
        <div className="text-center px-3 mt-2 flex-shrink-0" style={{ position: 'relative', zIndex: 6 }}>
          <p className="text-white text-sm font-bold truncate leading-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {user.displayName || user.username}
          </p>
          <p className="text-white/40 text-[11px] truncate mt-0.5">@{user.username}</p>
        </div>

        {/* Stats */}
        <div
          className="mx-3 mt-3 flex-shrink-0 grid grid-cols-3 gap-1 rounded-xl py-2"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', position: 'relative', zIndex: 6 }}
        >
          {[
            { icon: Video, label: 'CLIPS', value: entry.clipsCount },
            { icon: Film, label: 'REELS', value: entry.reelsCount },
            { icon: Image, label: 'SHOTS', value: entry.screenshotsCount },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex flex-col items-center gap-0.5">
              <Icon className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.5)' }} />
              <span className="text-white text-xs font-bold leading-tight">{fmt(value)}</span>
              <span className="text-white/30 text-[9px] font-semibold tracking-wide">{label}</span>
            </div>
          ))}
        </div>

        {/* Followers */}
        <div className="mx-3 mt-1.5 flex items-center justify-center gap-1.5 flex-shrink-0" style={{ position: 'relative', zIndex: 6 }}>
          <Users className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.4)' }} />
          <span className="text-white/50 text-xs font-medium">{fmt(entry.followersCount)} followers</span>
        </div>

        <div className="flex-1" />

        {/* CTA Button */}
        <div className="px-3 pb-3 flex-shrink-0" style={{ position: 'relative', zIndex: 6 }}>
          <div
            className="w-full rounded-xl py-2.5 flex items-center justify-center gap-1.5 text-xs font-bold"
            style={{
              background: 'linear-gradient(135deg, #FF6A00, #FF9500)',
              color: '#fff',
              boxShadow: '0 0 14px rgba(255,106,0,0.5)',
              letterSpacing: '0.01em',
            }}
          >
            <Upload className="w-3 h-3" />
            {ctaLabel(entry, period)}
          </div>
        </div>
      </div>
    </Link>
  );
}

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
  const displayEntries = validEntries.length > 0
    ? [...validEntries, ...validEntries]
    : [];

  return (
    <div>
      <style>{FIRE_STYLES}</style>

      {/* Section header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <GamefolioTrendingIcon className="w-5 h-5 text-primary" />
          <h2
            className="text-xl font-bold tracking-wide uppercase"
            style={{ color: '#FF8C00', fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '0.05em', textShadow: '0 0 18px rgba(255,140,0,0.6)' }}
          >
            Trending Gamefolios
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg p-1" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className="px-3 py-1 rounded-md text-xs font-semibold transition-all duration-150"
                style={period === p
                  ? { background: 'linear-gradient(135deg,#FF6A00,#FF9500)', color: '#fff' }
                  : { color: 'rgba(255,255,255,0.45)' }
                }
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
          <Link href="/explore" className="text-sm font-medium hover:underline flex items-center gap-1" style={{ color: '#FF9500' }}>
            View all <span>›</span>
          </Link>
        </div>
      </div>

      {/* Carousel wrapper — hides overflow and fades edges */}
      <div
        className="relative overflow-hidden rounded-2xl"
        style={{
          background: 'rgba(20,8,0,0.55)',
          border: '1px solid rgba(255,100,0,0.12)',
          padding: '20px 0',
        }}
      >
        {/* Left fade */}
        <div className="absolute left-0 top-0 bottom-0 w-16 pointer-events-none" style={{ background: 'linear-gradient(to right, rgba(20,8,0,0.9), transparent)', zIndex: 10 }} />
        {/* Right fade */}
        <div className="absolute right-0 top-0 bottom-0 w-16 pointer-events-none" style={{ background: 'linear-gradient(to left, rgba(20,8,0,0.9), transparent)', zIndex: 10 }} />

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
