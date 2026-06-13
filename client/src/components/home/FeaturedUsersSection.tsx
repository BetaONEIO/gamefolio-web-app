import { useState } from "react";
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

const STYLES = `
  /* ── Carousel ─────────────────────────────── */
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

  /* ── Border fire spin ──────────────────────── */
  @keyframes border-fire-spin {
    0%   { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* flicker: the conic arc shifts opacity */
  @keyframes fire-flicker {
    0%,100% { opacity: 1; }
    20%      { opacity: 0.82; }
    45%      { opacity: 0.95; }
    65%      { opacity: 0.75; }
    80%      { opacity: 0.92; }
  }

  /* card glow pulses green */
  @keyframes green-glow-pulse {
    0%,100% {
      box-shadow:
        0 0 0 2px rgba(183,255,26,0.0),
        0 0 14px 3px rgba(183,255,26,0.25),
        0 0 40px 8px rgba(183,255,26,0.10),
        0 4px 32px rgba(0,0,0,0.7);
    }
    50% {
      box-shadow:
        0 0 0 2px rgba(183,255,26,0.0),
        0 0 24px 6px rgba(183,255,26,0.50),
        0 0 60px 16px rgba(183,255,26,0.20),
        0 4px 32px rgba(0,0,0,0.7);
    }
  }

  /* ── ember particles ─────────────────────── */
  @keyframes ember-1 {
    0%   { transform: translate(0,0) scale(1); opacity: 0.9; }
    100% { transform: translate(-10px,-55px) scale(0); opacity: 0; }
  }
  @keyframes ember-2 {
    0%   { transform: translate(0,0) scale(1); opacity: 0.8; }
    100% { transform: translate(8px,-65px) scale(0); opacity: 0; }
  }
  @keyframes ember-3 {
    0%   { transform: translate(0,0) scale(1); opacity: 0.7; }
    100% { transform: translate(4px,-50px) scale(0); opacity: 0; }
  }
  @keyframes ember-4 {
    0%   { transform: translate(0,0) scale(1); opacity: 0.85; }
    100% { transform: translate(-6px,-60px) scale(0); opacity: 0; }
  }

  /* ── assembled fire-card ─────────────────── */
  .fire-card {
    position: relative;
    animation: green-glow-pulse 2.6s ease-in-out infinite;
  }

  /* spinning conic that forms the fire border */
  .fire-card-border {
    position: absolute;
    inset: -3px;
    border-radius: 19px;
    background: conic-gradient(
      from 0deg,
      transparent        0deg,
      transparent        40deg,
      #1a3d00           50deg,
      #4aff00           62deg,
      #B7FF1A           72deg,
      #e8ffaa           80deg,
      #ffffff           84deg,
      #B7FF1A           88deg,
      #4aff00           96deg,
      #1a3d00           108deg,
      transparent        125deg,
      transparent        175deg,
      #1a3d00           185deg,
      #4aff00           195deg,
      #B7FF1A           204deg,
      #e8ffaa           210deg,
      #ffffff           213deg,
      #B7FF1A           216deg,
      #4aff00           224deg,
      #1a3d00           234deg,
      transparent        250deg,
      transparent        360deg
    );
    animation: border-fire-spin 2.4s linear infinite, fire-flicker 1.8s ease-in-out infinite;
    z-index: 0;
    pointer-events: none;
    filter: blur(0.6px);
  }

  /* second, slower arc for depth */
  .fire-card-border-2 {
    position: absolute;
    inset: -5px;
    border-radius: 21px;
    background: conic-gradient(
      from 180deg,
      transparent  0deg,
      transparent  55deg,
      #0d2200      65deg,
      #33cc00      80deg,
      #B7FF1A      90deg,
      #33cc00      100deg,
      #0d2200      115deg,
      transparent  135deg,
      transparent  360deg
    );
    animation: border-fire-spin 3.8s linear infinite reverse, fire-flicker 2.2s ease-in-out infinite 0.5s;
    z-index: 0;
    pointer-events: none;
    filter: blur(2.5px);
    opacity: 0.6;
  }

  /* inner mask so border shows only as a ring */
  .fire-card-inner {
    position: absolute;
    inset: 2px;
    border-radius: 14px;
    background: rgba(11,19,25,0.96);
    z-index: 1;
    pointer-events: none;
  }

  /* ember dots */
  .fire-ember {
    position: absolute;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: #B7FF1A;
    box-shadow: 0 0 6px 2px rgba(183,255,26,0.8);
    pointer-events: none;
    z-index: 8;
  }
  .fire-ember-1 { bottom: 12%; left: 15%; animation: ember-1 1.9s ease-out infinite 0.1s; }
  .fire-ember-2 { bottom: 18%; right: 14%; animation: ember-2 2.3s ease-out infinite 0.7s; }
  .fire-ember-3 { bottom: 8%;  left: 48%; animation: ember-3 1.6s ease-out infinite 1.3s; }
  .fire-ember-4 { bottom: 15%; right: 35%; animation: ember-4 2.0s ease-out infinite 1.9s; }
`;

function CreatorCard({ entry, period }: { entry: TrendingEntry; period: Period }) {
  const { user } = entry;
  const borderColor = user.avatarBorderColor || user.accentColor || '#B7FF1A';
  const hasBanner = !!user.bannerUrl;

  return (
    <Link href={`/profile/${user.username}`}>
      <div
        className="flex-shrink-0 cursor-pointer transition-transform duration-200 hover:scale-[1.03] hover:-translate-y-2 fire-card"
        style={{
          width: 190,
          height: 340,
          borderRadius: 16,
        }}
      >
        {/* Fire border layers */}
        <div className="fire-card-border-2" />
        <div className="fire-card-border" />
        <div className="fire-card-inner" />

        {/* Ember particles */}
        <div className="fire-ember fire-ember-1" />
        <div className="fire-ember fire-ember-2" />
        <div className="fire-ember fire-ember-3" />
        <div className="fire-ember fire-ember-4" />

        {/* Card content — sits above the border layers */}
        <div
          className="absolute inset-[3px] rounded-[13px] overflow-hidden flex flex-col"
          style={{ zIndex: 2, background: 'rgba(11,19,25,0.95)', backdropFilter: 'blur(8px)' }}
        >
          {/* Banner */}
          <div className="relative flex-shrink-0" style={{ height: 90, borderRadius: '13px 13px 0 0', overflow: 'hidden' }}>
            {hasBanner ? (
              <img src={user.bannerUrl!} alt="" className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full"
                style={{ background: `linear-gradient(135deg, #0B1319 0%, ${borderColor}22 50%, #0B1319 100%)` }}
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
              style={{ background: 'rgba(0,0,0,0.65)', color: '#B7FF1A', border: '1px solid rgba(183,255,26,0.3)', backdropFilter: 'blur(4px)' }}
            >
              <Zap className="w-3 h-3" />
              {fmt(entry.totalPoints)}
            </div>
          </div>

          {/* Avatar */}
          <div className="flex justify-center" style={{ marginTop: -28, zIndex: 3, flexShrink: 0 }}>
            <div
              className="rounded-full overflow-hidden"
              style={{ width: 56, height: 56, border: `2.5px solid ${borderColor}`, boxShadow: `0 0 14px ${borderColor}88`, flexShrink: 0 }}
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
              { icon: Film,  label: 'REELS', value: entry.reelsCount },
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

          <div className="flex-1" />

          {/* CTA Button */}
          <div className="px-3 pb-3 flex-shrink-0">
            <div
              className="w-full rounded-xl py-2.5 flex items-center justify-center gap-1.5 text-xs font-bold"
              style={{ background: '#B7FF1A', color: '#0B1319', boxShadow: '0 0 12px rgba(183,255,26,0.4)', letterSpacing: '0.01em' }}
            >
              <Upload className="w-3 h-3" />
              {ctaLabel(entry, period)}
            </div>
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
      <style>{STYLES}</style>

      {/* Section header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <GamefolioTrendingIcon className="w-5 h-5 text-primary" />
          <h2
            className="text-xl font-bold tracking-wide uppercase"
            style={{ color: '#B7FF1A', fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '0.05em', textShadow: '0 0 16px rgba(183,255,26,0.5)' }}
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
                  ? { background: '#B7FF1A', color: '#0B1319' }
                  : { color: 'rgba(255,255,255,0.45)' }
                }
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

      {/* Carousel */}
      <div
        className="relative overflow-hidden rounded-2xl"
        style={{ background: 'rgba(8,14,8,0.6)', border: '1px solid rgba(183,255,26,0.08)', padding: '20px 0' }}
      >
        {/* Edge fades */}
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
