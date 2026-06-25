import { useState } from "react";
import { Link } from "wouter";
import { Zap, Upload, Users, TrendingUp } from "lucide-react";

export interface TrendingEntry {
  userId: number;
  rank: number;
  uploadsCount: number;
  totalPoints: number;
  clipsCount: number;
  reelsCount: number;
  screenshotsCount: number;
  followersCount: number;
  followingCount?: number;
  user: {
    id: number;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    bannerUrl: string | null;
    avatarBorderColor: string | null;
    accentColor: string | null;
    level?: number | null;
    backgroundColor?: string | null;
    primaryColor?: string | null;
    profileBackgroundType?: string | null;
    profileBackgroundTheme?: string | null;
    profileBackgroundGradient?: boolean | null;
    profileBackgroundImageUrl?: string | null;
  };
}

export function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function isLightHex(hex: string): boolean {
  const h = hex.replace('#', '');
  if (h.length !== 6) return false;
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) > 0.5;
}

export function getCardTheme(user: TrendingEntry['user']): { style: React.CSSProperties; isLight: boolean; hasCustomBg: boolean } {
  const bg = (user.backgroundColor || '#0B1319').toLowerCase();
  const accent = (user.accentColor || '#B7FF1A').toLowerCase();
  const primary = user.primaryColor || '#071013';
  const isLight = isLightHex(bg);

  const isNeo    = !isLight && accent === '#00ff41';
  const isBlocks = !isLight && accent === '#b7ff1a' && bg === '#1a1a1a';

  const isDefault = bg === '#0b1319' || bg === '#121f2b' || bg === '#000000';

  if (user.profileBackgroundImageUrl) {
    return {
      style: {
        backgroundImage: `url(${user.profileBackgroundImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: '50% 30%',
      },
      isLight: false,
      hasCustomBg: true,
    };
  }

  if (isBlocks) return { style: { background: '#87ceeb' }, isLight: true, hasCustomBg: true };
  if (isNeo)    return { style: { background: '#000800' }, isLight: false, hasCustomBg: true };
  if (isDefault) return { style: { background: 'rgba(11,19,25,0.95)' }, isLight: false, hasCustomBg: false };

  if (user.profileBackgroundGradient !== false && !isLight) {
    return {
      style: { background: `linear-gradient(180deg, ${primary} 0%, ${bg} 55%, ${bg} 100%)` },
      isLight: false,
      hasCustomBg: true,
    };
  }

  return { style: { backgroundColor: bg }, isLight, hasCustomBg: true };
}

export const CREATOR_CARD_STYLES = `
  .fire-card {
    position: relative;
    border: 2px solid rgba(183,255,26,0.55);
    border-radius: 16px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.5);
  }
`;

interface CreatorCardProps {
  entry: TrendingEntry;
  period?: 'week' | 'month' | 'alltime';
  className?: string;
}

export function CreatorCard({ entry, period = 'alltime', className = '' }: CreatorCardProps) {
  const { user } = entry;
  const [bannerError, setBannerError] = useState(false);
  const borderColor = user.avatarBorderColor || user.accentColor || '#B7FF1A';
  const hasBanner = !!user.bannerUrl && !bannerError;
  const theme = getCardTheme(user);

  const xpLabel = period === 'alltime' ? 'XP total' : period === 'month' ? 'XP this month' : 'XP this week';
  const ctaText = `${fmt(entry.totalPoints)} ${xpLabel}`;

  return (
    <Link href={`/profile/${user.username}`} className={className}>
      <div
        className="flex-shrink-0 cursor-pointer transition-transform duration-200 hover:scale-[1.03] hover:-translate-y-2 fire-card"
        style={{ width: 228, height: 408, borderRadius: 16 }}
      >
        <div
          className="absolute inset-[3px] rounded-[13px] overflow-hidden"
          style={{ zIndex: 2, ...theme.style, backdropFilter: theme.hasCustomBg ? undefined : 'blur(8px)' }}
        >
          {theme.hasCustomBg && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: theme.isLight
                  ? 'linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.45) 55%, rgba(0,0,0,0.72) 100%)'
                  : 'linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.50) 55%, rgba(0,0,0,0.80) 100%)',
                borderRadius: 'inherit',
              }}
            />
          )}

          <div className="relative flex flex-col h-full" style={{ zIndex: 3 }}>
            <div className="flex-shrink-0 flex items-center justify-between px-2 pt-2">
              <div
                className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(0,0,0,0.65)', color: entry.rank <= 3 ? (['#FFD700','#C0C0C0','#CD7F32'] as const)[entry.rank - 1] : 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(4px)' }}
              >
                #{entry.rank}
              </div>
              <div
                className="flex items-center gap-0.5 text-[11px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(0,0,0,0.65)', color: '#B7FF1A', border: '1px solid rgba(183,255,26,0.3)', backdropFilter: 'blur(4px)' }}
              >
                <Zap className="w-3 h-3" />
                {fmt(entry.totalPoints)}
              </div>
            </div>

            <div className="relative flex-shrink-0 mx-2 mt-1 rounded-lg overflow-hidden" style={{ height: 70 }}>
              {hasBanner && !user.profileBackgroundImageUrl ? (
                <>
                  <img src={user.bannerUrl!} alt="" className="w-full h-full object-cover" onError={() => setBannerError(true)} />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(11,19,25,0.2) 0%, rgba(11,19,25,0.55) 100%)' }} />
                </>
              ) : (
                <div className="w-full h-full" style={{ background: 'rgba(255,255,255,0.03)' }} />
              )}
            </div>

            <div className="flex justify-center flex-shrink-0" style={{ marginTop: -20, position: 'relative', zIndex: 2 }}>
              <div
                className="rounded-full overflow-hidden flex-shrink-0"
                style={{ width: 56, height: 56, border: `2.5px solid ${borderColor}`, boxShadow: `0 0 14px ${borderColor}88` }}
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

            <div className="text-center px-3 mt-2 flex-shrink-0">
              <p className="text-white text-sm font-bold truncate leading-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {user.displayName || user.username}
              </p>
              <p className="text-white/40 text-[11px] truncate mt-0.5">@{user.username}</p>
            </div>

            <div
              className="mx-3 mt-3 flex-shrink-0 grid grid-cols-3 gap-1 rounded-xl py-2"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              {[
                { icon: Zap,   label: 'XP',        value: entry.totalPoints },
                { icon: Users, label: 'FOLLOWERS',  value: entry.followersCount },
                { icon: Upload,label: 'FOLLOWING',  value: entry.followingCount ?? 0 },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex flex-col items-center gap-0.5">
                  <Icon className="w-2.5 h-2.5" style={{ color: label === 'XP' ? '#B7FF1A' : 'rgba(255,255,255,0.5)' }} />
                  <span className="text-[10px] font-bold leading-tight" style={{ color: label === 'XP' ? '#B7FF1A' : 'white' }}>{fmt(value)}</span>
                  <span className="text-white/30 text-[7px] font-semibold tracking-wide">{label}</span>
                </div>
              ))}
            </div>

            <div className="flex-1" />

            <div className="px-3 pb-3 flex-shrink-0">
              <div
                className="w-full rounded-xl py-2.5 flex items-center justify-center gap-1.5 text-xs font-bold"
                style={{ background: '#B7FF1A', color: '#0B1319', boxShadow: '0 0 12px rgba(183,255,26,0.4)', letterSpacing: '0.01em' }}
              >
                <Zap className="w-3 h-3" />
                {ctaText}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
