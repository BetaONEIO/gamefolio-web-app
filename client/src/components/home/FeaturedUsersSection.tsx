import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
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

function NeonBackground() {
  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
      style={{ zIndex: 0 }}
    >
      <style>{`
        @keyframes ng-float1 {
          0%,100% { transform: translate(0,0) scale(1); }
          50% { transform: translate(40px,-30px) scale(1.15); }
        }
        @keyframes ng-float2 {
          0%,100% { transform: translate(0,0) scale(1); }
          50% { transform: translate(-30px,40px) scale(1.1); }
        }
        @keyframes ng-float3 {
          0%,100% { transform: translate(0,0) scale(1); }
          33% { transform: translate(20px,20px) scale(1.05); }
          66% { transform: translate(-20px,-10px) scale(0.95); }
        }
        @keyframes ng-pulse {
          0%,100% { opacity: 0.18; }
          50% { opacity: 0.32; }
        }
        @keyframes ng-line {
          0% { transform: translateX(-100%); opacity: 0; }
          20% { opacity: 0.4; }
          80% { opacity: 0.4; }
          100% { transform: translateX(200%); opacity: 0; }
        }
        .ng-blob { animation: ng-pulse 4s ease-in-out infinite; border-radius: 50%; position: absolute; filter: blur(60px); }
        .ng-b1 { animation: ng-float1 8s ease-in-out infinite, ng-pulse 4s ease-in-out infinite; }
        .ng-b2 { animation: ng-float2 11s ease-in-out infinite, ng-pulse 6s ease-in-out infinite; }
        .ng-b3 { animation: ng-float3 14s ease-in-out infinite, ng-pulse 5s ease-in-out infinite; }
        .ng-line-el { position: absolute; height: 1px; width: 120px; animation: ng-line 7s linear infinite; }
      `}</style>
      <div className="ng-blob ng-b1" style={{ width:300, height:200, background:'rgba(183,255,26,0.12)', top:'10%', left:'5%' }} />
      <div className="ng-blob ng-b2" style={{ width:200, height:200, background:'rgba(183,255,26,0.08)', top:'40%', right:'10%', animationDelay:'2s' }} />
      <div className="ng-blob ng-b3" style={{ width:150, height:150, background:'rgba(183,255,26,0.06)', bottom:'10%', left:'40%', animationDelay:'4s' }} />
      {/* Electric lines */}
      {[15,35,55,75,90].map((top, i) => (
        <div
          key={i}
          className="ng-line-el"
          style={{
            top: `${top}%`,
            left: 0,
            background: 'linear-gradient(90deg, transparent, rgba(183,255,26,0.5), transparent)',
            animationDelay: `${i * 1.4}s`,
            animationDuration: `${6 + i * 0.8}s`,
          }}
        />
      ))}
      {/* Shark-like abstract fins */}
      <svg className="absolute bottom-0 left-0 w-full" height="60" viewBox="0 0 1200 60" preserveAspectRatio="none" style={{ opacity: 0.06 }}>
        <path d="M0 60 L80 20 L120 55 L200 10 L260 50 L340 15 L400 55 L500 5 L560 50 L650 20 L720 55 L820 8 L880 50 L980 18 L1040 52 L1120 12 L1200 55 L1200 60 Z" fill="#B7FF1A" />
      </svg>
    </div>
  );
}

function CreatorCard({ entry, period }: { entry: TrendingEntry; period: Period }) {
  const { user } = entry;
  const borderColor = user.avatarBorderColor || user.accentColor || '#B7FF1A';
  const hasBanner = !!user.bannerUrl;

  return (
    <Link href={`/profile/${user.username}`}>
      <div
        className="flex-shrink-0 cursor-pointer transition-all duration-200 hover:scale-[1.025] hover:-translate-y-1 hover:shadow-2xl relative overflow-hidden"
        style={{
          width: 190,
          height: 340,
          borderRadius: 16,
          background: 'rgba(11,19,25,0.85)',
          border: '1px solid rgba(183,255,26,0.12)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
        }}
      >
        {/* Banner */}
        <div className="relative flex-shrink-0" style={{ height: 90, borderRadius: '16px 16px 0 0', overflow: 'hidden' }}>
          {hasBanner ? (
            <img
              src={user.bannerUrl!}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className="w-full h-full"
              style={{
                background: `linear-gradient(135deg, #0B1319 0%, ${borderColor}22 50%, #0B1319 100%)`,
              }}
            />
          )}
          {/* Dark overlay */}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(11,19,25,0.3) 0%, rgba(11,19,25,0.6) 100%)' }} />

          {/* Rank badge */}
          <div
            className="absolute top-2 left-2 flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(0,0,0,0.65)', color: entry.rank <= 3 ? ['#FFD700','#C0C0C0','#CD7F32'][entry.rank-1] : 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(4px)' }}
          >
            #{entry.rank}
          </div>

          {/* Points badge */}
          <div
            className="absolute top-2 right-2 flex items-center gap-0.5 text-[11px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(0,0,0,0.65)', color: '#B7FF1A', border: '1px solid rgba(183,255,26,0.25)', backdropFilter: 'blur(4px)' }}
          >
            <Zap className="w-3 h-3" />
            {fmt(entry.totalPoints)}
          </div>
        </div>

        {/* Avatar — overlaps banner */}
        <div className="flex justify-center" style={{ marginTop: -28, zIndex: 2, flexShrink: 0 }}>
          <div
            className="rounded-full overflow-hidden"
            style={{ width: 56, height: 56, border: `2.5px solid ${borderColor}`, boxShadow: `0 0 12px ${borderColor}55`, flexShrink: 0 }}
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
        <div className="text-center px-3 mt-2 flex-shrink-0">
          <p className="text-white text-sm font-bold truncate leading-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {user.displayName || user.username}
          </p>
          <p className="text-white/40 text-[11px] truncate mt-0.5">@{user.username}</p>
        </div>

        {/* Stats */}
        <div
          className="mx-3 mt-3 flex-shrink-0 grid grid-cols-3 gap-1 rounded-xl py-2"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
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
        <div className="mx-3 mt-1.5 flex items-center justify-center gap-1.5 flex-shrink-0">
          <Users className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.4)' }} />
          <span className="text-white/50 text-xs font-medium">{fmt(entry.followersCount)} followers</span>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* CTA Button */}
        <div className="px-3 pb-3 flex-shrink-0">
          <div
            className="w-full rounded-xl py-2.5 flex items-center justify-center gap-1.5 text-xs font-bold"
            style={{
              background: '#B7FF18',
              color: '#0B1319',
              boxShadow: '0 0 12px rgba(183,255,24,0.35)',
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

  return (
    <div>
      {/* Section header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <GamefolioTrendingIcon className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold tracking-wide uppercase" style={{ color: '#B7FF18', fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '0.05em' }}>
            Trending Gamefolios
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {/* Period filter */}
          <div className="flex items-center gap-1 rounded-lg p-1" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className="px-3 py-1 rounded-md text-xs font-semibold transition-all duration-150"
                style={period === p
                  ? { background: '#B7FF18', color: '#0B1319' }
                  : { color: 'rgba(255,255,255,0.45)' }
                }
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
          <Link href="/explore" className="text-primary text-sm font-medium hover:underline flex items-center gap-1" style={{ color: '#B7FF18' }}>
            View all <span>›</span>
          </Link>
        </div>
      </div>

      {/* Animated background wrapper */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{ background: 'rgba(8,14,19,0.6)', border: '1px solid rgba(183,255,26,0.08)', padding: '20px' }}
      >
        <NeonBackground />

        {/* Grid layout */}
        <div
          className="relative grid gap-4"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', zIndex: 1 }}
        >
          {isLoading
            ? Array(7).fill(0).map((_, i) => <CardSkeleton key={i} />)
            : validEntries.map(entry => (
                <CreatorCard key={entry.userId} entry={entry} period={period} />
              ))
          }
          {!isLoading && validEntries.length === 0 && (
            <div className="col-span-full flex items-center justify-center py-12 text-white/30 text-sm">
              No data for this period yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeaturedUsersSection;
