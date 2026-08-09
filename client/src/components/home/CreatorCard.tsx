import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Zap, Upload, Users, Gamepad2, Clock } from "lucide-react";
import Lottie from "lottie-react";
import onFireData from "@/assets/on-fire.json";
import { TrendingEntry, fmt, getCardTheme, CREATOR_CARD_STYLES } from "./creator-card-utils";

interface CreatorCardProps {
  entry: TrendingEntry;
  period?: 'week' | 'month' | 'alltime' | 'season';
  className?: string;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  if (isNaN(then)) return '';
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} ${mins === 1 ? 'minute' : 'minutes'} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ${hrs === 1 ? 'hour' : 'hours'} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} ${days === 1 ? 'day' : 'days'} ago`;
}

export function CreatorCard({ entry, period = 'alltime', className = '' }: CreatorCardProps) {
  const { user } = entry;
  const [bannerError, setBannerError] = useState(false);
  const [, setLocation] = useLocation();
  const borderColor = user.avatarBorderColor || user.accentColor || '#B7FF1A';
  const hasBanner = !!user.bannerUrl && !bannerError;
  const theme = getCardTheme(user);

  const xpLabel = period === 'alltime' ? 'XP total' : period === 'season' ? 'XP this season' : period === 'month' ? 'XP this month' : 'XP this week';
  const ctaText = `${fmt(entry.totalPoints)} ${xpLabel}`;

  const recentTitle = entry.recentUpload
    ? (() => {
        const { title, gameTitle, contentType } = entry.recentUpload!;
        if (title?.trim()) return title.trim();
        const typeLabel = contentType === 'screenshot' ? 'Screenshot' : contentType === 'reel' ? 'Reel' : 'Clip';
        return gameTitle?.trim() ? `${typeLabel} · ${gameTitle.trim()}` : typeLabel;
      })()
    : null;
  const recentTime = entry.recentUpload ? timeAgo(entry.recentUpload.createdAt) : null;

  return (
    <Link href={`/profile/${user.username}`} className={className}>
      <div
        className="flex-shrink-0 cursor-pointer transition-transform duration-200 hover:scale-[1.03] hover:-translate-y-2 fire-card"
        style={{ width: 228, height: 480, borderRadius: 16, position: 'relative' }}
      >
        {/* ── Floating badge row (outside overflow-hidden background) ── */}
        <div
          className="absolute top-0 left-0 right-0 flex items-start justify-between px-2 pt-1"
          style={{ zIndex: 5 }}
        >
          <div
            className="flex items-center gap-1 text-[11px] font-bold px-2 py-0 rounded-full"
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

        <div
          className="absolute inset-0 rounded-[inherit] overflow-hidden"
          style={{ zIndex: 2, ...theme.style }}
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

          <div className="relative flex flex-col h-full pt-7" style={{ zIndex: 3 }}>
            {/* Banner */}
            <div className="relative flex-shrink-0 mx-2 rounded-lg overflow-hidden" style={{ height: 66 }}>
              {hasBanner ? (
                <>
                  <img src={user.bannerUrl!} alt="" className="w-full h-full object-cover" onError={() => setBannerError(true)} />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(11,19,25,0.2) 0%, rgba(11,19,25,0.55) 100%)' }} />
                </>
              ) : (
                <div className="w-full h-full" style={{ background: 'rgba(255,255,255,0.03)' }} />
              )}
            </div>

            {/* Avatar */}
            <div className="flex justify-center flex-shrink-0" style={{ marginTop: -20, position: 'relative', zIndex: 2 }}>
              <div style={{ position: 'relative' }}>
                {entry.rank === 1 && (
                  <Lottie
                    animationData={onFireData}
                    loop
                    autoplay
                    style={{
                      position: 'absolute',
                      width: 112,
                      height: 123,
                      left: '50%',
                      top: '50%',
                      transform: 'translate(-50%, -48%)',
                      zIndex: 0,
                      pointerEvents: 'none',
                    }}
                  />
                )}
                <div
                  className="rounded-full overflow-hidden flex-shrink-0"
                  style={{ width: 56, height: 56, border: `2.5px solid ${borderColor}`, boxShadow: `0 0 14px ${borderColor}88`, position: 'relative', zIndex: 1 }}
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
            </div>

            {/* Name / username */}
            <div className="text-center px-3 mt-2 flex-shrink-0">
              <p className="text-white text-sm font-bold truncate leading-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {user.displayName || user.username}
              </p>
              <p className="text-white/40 text-[11px] truncate mt-0.5">@{user.username}</p>
            </div>

            {/* Stats box */}
            <div
              className="mx-3 mt-3 flex-shrink-0 grid grid-cols-3 gap-1 rounded-xl py-2"
              style={{ background: '#0B1319', border: '1px solid rgba(255,255,255,0.06)' }}
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

            {/* ── Most Played ── */}
            <div className="mx-3 mt-2.5 flex-shrink-0" style={{ height: 46 }}>
              <div
                className="flex items-center gap-2.5 px-2.5 h-full rounded-xl"
                style={{ background: '#0B1319', border: '1px solid rgba(255,255,255,0.055)' }}
              >
                <Gamepad2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.38)' }} />
                <div className="flex flex-col justify-center gap-[3px] min-w-0 flex-1">
                  <span className="text-[9px] font-medium tracking-[0.08em] leading-none uppercase" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    Most Played
                  </span>
                  <div className="flex items-center gap-1.5 min-w-0">
                    {entry.mostPlayedGame?.imageUrl && (
                      <img
                        src={entry.mostPlayedGame.imageUrl}
                        alt=""
                        className="rounded object-cover flex-shrink-0"
                        style={{ width: 20, height: 20 }}
                      />
                    )}
                    <span
                      className="text-[13px] font-semibold truncate leading-none"
                      style={{ color: entry.mostPlayedGame ? 'white' : 'rgba(255,255,255,0.28)' }}
                      title={entry.mostPlayedGame?.name ?? undefined}
                    >
                      {entry.mostPlayedGame ? entry.mostPlayedGame.name : 'No game uploads yet'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Recently Uploaded ── */}
            <div className="mx-3 mt-1.5 flex-shrink-0" style={{ height: 46 }}>
              <div
                className="flex items-center gap-2.5 px-2.5 h-full rounded-xl transition-colors"
                style={{ background: '#0B1319', border: '1px solid rgba(255,255,255,0.055)', cursor: entry.recentUpload ? 'pointer' : 'default' }}
                onClick={(e) => {
                  if (!entry.recentUpload) return;
                  e.preventDefault();
                  e.stopPropagation();
                  const { id, contentType } = entry.recentUpload;
                  setLocation(
                    contentType === 'screenshot' ? `/view/screenshot/${id}`
                    : contentType === 'reel'     ? `/reel/${id}`
                    :                              `/clip/${id}`
                  );
                }}
              >
                <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: entry.recentUpload ? '#B7FF1A' : 'rgba(255,255,255,0.28)', opacity: entry.recentUpload ? 0.75 : 1 }} />
                <div className="flex flex-col justify-center gap-[2px] min-w-0 flex-1">
                  <span className="text-[9px] font-medium tracking-[0.08em] leading-none uppercase" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    Recently Uploaded
                  </span>
                  <span
                    className="text-[13px] font-semibold truncate leading-none"
                    style={{ color: entry.recentUpload ? 'white' : 'rgba(255,255,255,0.28)' }}
                  >
                    {recentTitle ?? 'No uploads yet'}
                  </span>
                  {recentTime && (
                    <span className="text-[10px] font-medium leading-none" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      {recentTime}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1" />

            {/* XP button */}
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
