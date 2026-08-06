import { useAuth } from "@/hooks/use-auth";
import { useRef, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { CheckCircle2, ChevronLeft, ChevronRight, Zap, Clock, Flame } from "lucide-react";
import { getQueryFn } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Keyframe animations injected once ───────────────────────────────────────
const STYLE_ID = "daily-xp-challenges-styles";
if (typeof document !== "undefined" && !document.getElementById(STYLE_ID)) {
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = `
    @keyframes xp-pulse {
      0%, 100% { opacity: 1; filter: drop-shadow(0 0 6px rgba(183,255,26,0.7)); }
      50% { opacity: 0.82; filter: drop-shadow(0 0 14px rgba(183,255,26,1)); }
    }
    @keyframes legendary-shimmer {
      0% { background-position: -200% center; }
      100% { background-position: 200% center; }
    }
    @keyframes progress-fill {
      from { width: 0%; }
    }
    @keyframes card-complete-sparkle {
      0% { opacity: 0; transform: scale(0.8); }
      50% { opacity: 1; transform: scale(1.1); }
      100% { opacity: 0; transform: scale(1.3); }
    }
    .xp-pulse { animation: xp-pulse 2.4s ease-in-out infinite; }
    .legendary-border-shimmer {
      background: linear-gradient(90deg,
        rgba(255,215,0,0.55) 0%,
        rgba(255,255,255,0.9) 30%,
        rgba(255,215,0,0.55) 60%,
        rgba(255,200,0,0.7) 100%);
      background-size: 200% auto;
      animation: legendary-shimmer 3s linear infinite;
      -webkit-background-clip: text;
      background-clip: text;
    }
    @media (prefers-reduced-motion: reduce) {
      .xp-pulse, .legendary-border-shimmer { animation: none !important; }
    }
  `;
  document.head.appendChild(el);
}

// ─── Icons ───────────────────────────────────────────────────────────────────
const ICONS = {
  login:   "/attached_assets/challenge-icons/daily-login.png",
  watch5:  "/attached_assets/challenge-icons/watch-5-clips.png",
  watch20: "/attached_assets/challenge-icons/watch-20-clips.png",
  comment: "/attached_assets/challenge-icons/comment-clip.png",
  like:    "/attached_assets/challenge-icons/like-clip.png",
  share:   "/attached_assets/challenge-icons/share-clip.png",
  upload:  "/attached_assets/challenge-icons/upload-today.png",
  lootbox: "/attached_assets/challenge-icons/open-lootbox.png",
} as const;

// ─── Rarity ──────────────────────────────────────────────────────────────────
type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

const RARITY = {
  common: {
    label: 'Common',
    labelColor: 'rgba(255,255,255,0.35)',
    idleBorder: 'rgba(255,255,255,0.08)',
    idleGlow: 'none',
    activeBorder: 'rgba(183,255,26,0.3)',
    activeGlow: '0 0 14px rgba(183,255,26,0.1)',
  },
  rare: {
    label: 'Rare',
    labelColor: 'rgba(96,165,250,0.9)',
    idleBorder: 'rgba(96,165,250,0.3)',
    idleGlow: '0 0 12px rgba(96,165,250,0.15)',
    activeBorder: 'rgba(96,165,250,0.65)',
    activeGlow: '0 0 18px rgba(96,165,250,0.28)',
  },
  epic: {
    label: 'Epic',
    labelColor: '#B7FF18',
    idleBorder: 'rgba(183,255,26,0.4)',
    idleGlow: '0 0 14px rgba(183,255,26,0.18)',
    activeBorder: 'rgba(183,255,26,0.75)',
    activeGlow: '0 0 20px rgba(183,255,26,0.32)',
  },
  legendary: {
    label: 'Legendary',
    labelColor: '#FFD700',
    idleBorder: 'rgba(255,215,0,0.5)',
    idleGlow: '0 0 18px rgba(255,215,0,0.22)',
    activeBorder: 'rgba(255,215,0,0.85)',
    activeGlow: '0 0 24px rgba(255,215,0,0.38)',
  },
} satisfies Record<Rarity, {
  label: string; labelColor: string;
  idleBorder: string; idleGlow: string;
  activeBorder: string; activeGlow: string;
}>;

// ─── Types ────────────────────────────────────────────────────────────────────
interface DailyActivity {
  clipsWatchedToday: number;
  watch5Done: boolean;
  watch20Done: boolean;
  commentedToday: boolean;
  likedToday: boolean;
  sharedToday: boolean;
  loginXPToday: number;
  lootboxOpenedToday: boolean;
  firstUploadOfDayDone: boolean;
  weeklyUploadsCount: number;
  weekly5Done: boolean;
  weekly10Done: boolean;
  isWeekend: boolean;
  streak?: { currentStreak: number; longestStreak?: number };
}

interface LevelProgress {
  level: number;
  currentPoints: number;
  pointsForNextLevel: number;
  pointsRemaining: number;
  progressPercent: number;
}

interface Challenge {
  id: string;
  icon: string;
  title: string;
  xp: number;
  progress: number;
  total: number;
  href: string;
  color: string;
  rarity: Rarity;
}

// ─── Build challenges ─────────────────────────────────────────────────────────
function buildChallenges(activity: DailyActivity | undefined, canOpenLootbox: boolean): Challenge[] {
  return [
    {
      id: 'login', icon: ICONS.login, title: 'Daily Login',
      xp: 25, progress: activity ? (activity.loginXPToday > 0 ? 1 : 0) : 0, total: 1,
      href: '/', color: '#B7FF1A', rarity: 'common',
    },
    {
      id: 'watch5', icon: ICONS.watch5, title: 'Watch 5 Clips',
      xp: 10, progress: activity ? Math.min(activity.clipsWatchedToday, 5) : 0, total: 5,
      href: '/explore', color: '#B7FF1A', rarity: 'common',
    },
    {
      id: 'watch20', icon: ICONS.watch20, title: 'Watch 20 Clips',
      xp: 30, progress: activity ? Math.min(activity.clipsWatchedToday, 20) : 0, total: 20,
      href: '/explore', color: '#B7FF1A', rarity: 'rare',
    },
    {
      id: 'comment', icon: ICONS.comment, title: 'Comment on a Clip',
      xp: 15, progress: activity ? (activity.commentedToday ? 1 : 0) : 0, total: 1,
      href: '/explore', color: '#B7FF1A', rarity: 'common',
    },
    {
      id: 'like', icon: ICONS.like, title: 'Like a Clip',
      xp: 5, progress: activity ? (activity.likedToday ? 1 : 0) : 0, total: 1,
      href: '/explore', color: '#B7FF1A', rarity: 'common',
    },
    {
      id: 'share', icon: ICONS.share, title: 'Share a Clip',
      xp: 20, progress: activity ? (activity.sharedToday ? 1 : 0) : 0, total: 1,
      href: '/explore', color: '#B7FF1A', rarity: 'rare',
    },
    {
      id: 'upload', icon: ICONS.upload, title: 'Upload Today',
      xp: 200, progress: activity ? (activity.firstUploadOfDayDone ? 1 : 0) : 0, total: 1,
      href: '/upload', color: '#B7FF1A', rarity: 'epic',
    },
    {
      id: 'lootbox', icon: ICONS.lootbox, title: 'Open Lootbox',
      xp: 50, progress: activity ? (activity.lootboxOpenedToday ? 1 : 0) : 0, total: 1,
      href: '/level-tracker', color: '#B7FF1A', rarity: 'legendary',
    },
  ];
}

// ─── Countdown badge ──────────────────────────────────────────────────────────
function CountdownBadge() {
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    const update = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const diff = midnight.getTime() - now.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setTimeLeft(`${h}h ${String(m).padStart(2, "0")}m`);
    };
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
      <Clock className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.45)' }} />
      <span className="text-[10px] text-white/50 font-medium">Resets in</span>
      <span className="text-[10px] text-white/75 font-bold font-mono">{timeLeft}</span>
    </div>
  );
}

// ─── Challenge card ───────────────────────────────────────────────────────────
function ChallengeCard({ challenge, isLoading }: { challenge: Challenge; isLoading: boolean }) {
  const pct = challenge.total > 0 ? Math.min((challenge.progress / challenge.total) * 100, 100) : 0;
  const done = challenge.progress >= challenge.total;
  const inProgress = !done && challenge.progress > 0;

  if (isLoading) {
    return (
      <div className="flex-shrink-0 rounded-2xl p-4"
        style={{ width: 188, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <Skeleton className="w-12 h-12 rounded-xl mb-3" />
        <Skeleton className="h-3 w-1/2 mb-2" />
        <Skeleton className="h-5 w-3/4 mb-3" />
        <Skeleton className="h-2 w-full mb-2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    );
  }

  // Uniform border — brightens slightly when in-progress
  const borderColor = done
    ? 'rgba(183,255,26,0.25)'
    : inProgress
      ? 'rgba(183,255,26,0.3)'
      : 'rgba(255,255,255,0.08)';

  const cardGlow = inProgress ? '0 0 14px rgba(183,255,26,0.1)' : 'none';

  const bgColor = done ? 'rgba(183,255,26,0.04)' : 'rgba(255,255,255,0.03)';

  const iconGlow = done
    ? 'drop-shadow(0 0 8px rgba(183,255,26,0.55))'
    : inProgress
      ? 'drop-shadow(0 0 6px rgba(183,255,26,0.4))'
      : 'drop-shadow(0 0 4px rgba(183,255,26,0.2))';

  // XP element styling
  const xpColor = done ? 'rgba(183,255,26,0.55)' : '#B7FF18';
  const xpGlow = done
    ? 'none'
    : inProgress
      ? 'drop-shadow(0 0 8px rgba(183,255,26,0.8))'
      : 'drop-shadow(0 0 5px rgba(183,255,26,0.5))';

  return (
    // No overflow-hidden — allows hover lift to not clip card content
    <div
      className="flex-shrink-0 relative rounded-2xl p-4 transition-transform duration-200 hover:-translate-y-[3px]"
      style={{
        width: 188,
        background: bgColor,
        border: `1px solid ${borderColor}`,
        boxShadow: cardGlow,
        opacity: done ? 0.45 : 1,
        willChange: 'transform',
      }}
    >
      {/* Completed checkmark */}
      {done && (
        <div className="absolute top-3 right-3">
          <CheckCircle2 className="w-4 h-4" style={{ color: '#B7FF18' }} />
        </div>
      )}

      {/* Icon — 10% larger than before */}
      <div
        className="mb-2.5 select-none"
        style={{ width: 70, height: 70, filter: iconGlow, opacity: done ? 0.65 : 1 }}
      >
        <img
          src={challenge.icon}
          alt={challenge.title}
          className="w-full h-full object-contain"
          draggable={false}
        />
      </div>

      {/* XP reward — primary visual element */}
      <div className="flex items-center gap-1 mb-2.5" style={{ filter: xpGlow }}>
        {done ? (
          <span className="text-[13px] font-bold" style={{ color: 'rgba(183,255,26,0.6)' }}>
            ✔ XP Claimed
          </span>
        ) : (
          <>
            <Zap className="w-4 h-4 flex-shrink-0" style={{ color: xpColor }} />
            <span className="text-xl font-extrabold leading-none" style={{ color: xpColor }}>
              +{challenge.xp}
            </span>
            <span className="text-xs font-bold" style={{ color: xpColor, opacity: 0.75 }}>XP</span>
          </>
        )}
      </div>

      {/* Title */}
      <h4
        className={`text-[13px] font-bold mb-3 pr-3 leading-snug ${done ? 'line-through' : ''}`}
        style={{ color: done ? 'rgba(255,255,255,0.35)' : '#F0F4EC' }}
      >
        {challenge.title}
      </h4>

      {/* Progress bar */}
      <div className="mb-1.5">
        <div
          className="h-2 rounded-full overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.08)' }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${pct}%`,
              background: done
                ? '#B7FF18'
                : inProgress
                  ? 'linear-gradient(90deg, #8BC51A, #B7FF18)'
                  : 'rgba(183,255,26,0.45)',
              boxShadow: done
                ? '0 0 8px rgba(183,255,26,0.7)'
                : inProgress
                  ? '0 0 6px rgba(183,255,26,0.5)'
                  : 'none',
              transition: 'width 0.7s cubic-bezier(0.4,0,0.2,1)',
            }}
          />
        </div>
        <div className="flex justify-between text-[10px] mt-1">
          <span style={{ color: inProgress ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.3)' }}>
            {challenge.progress}/{challenge.total}
          </span>
          <span style={{ color: inProgress ? 'rgba(183,255,26,0.8)' : 'rgba(255,255,255,0.3)' }}>
            {Math.round(pct)}%
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Streak indicator ─────────────────────────────────────────────────────────
function StreakIndicator({ streak }: { streak: number }) {
  if (streak < 1) return null;
  const bonusPct = streak >= 30 ? 50 : streak >= 14 ? 30 : streak >= 7 ? 20 : streak >= 3 ? 10 : 0;
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-xl"
      style={{ background: 'rgba(255,100,0,0.08)', border: '1px solid rgba(255,100,0,0.2)' }}
    >
      <Flame className="w-4 h-4 flex-shrink-0" style={{ color: '#FF6B1A' }} />
      <div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-extrabold text-white leading-none">{streak}</span>
          <span className="text-[10px] font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>day streak</span>
        </div>
        {bonusPct > 0 && (
          <div className="text-[10px] font-bold mt-0.5" style={{ color: '#FF8C42' }}>
            +{bonusPct}% XP bonus
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function DailyXPChallenges() {
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; startX: number; startScrollLeft: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const { data: dailyActivity, isLoading: activityLoading } = useQuery<DailyActivity>({
    queryKey: [`/api/user/${user?.id}/daily-activity`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user?.id,
  });

  const { data: progress } = useQuery<LevelProgress>({
    queryKey: [`/api/user/${user?.id}/level-progress`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user?.id,
  });

  const { data: lootboxStatus } = useQuery<{ canOpen: boolean; lastOpenedAt: string | null }>({
    queryKey: ["/api/lootbox/status"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user?.id,
  });

  const BONUS_XP = 1000;
  const challenges = buildChallenges(dailyActivity, lootboxStatus?.canOpen ?? true);
  const completedCount = challenges.filter(c => c.progress >= c.total).length;
  const allDone = completedCount === challenges.length;
  const totalXPAvailable = challenges.reduce((sum, c) => sum + c.xp, 0) + BONUS_XP;
  const earnedXP = challenges.filter(c => c.progress >= c.total).reduce((sum, c) => sum + c.xp, 0) + (allDone ? BONUS_XP : 0);
  const dailyPct = totalXPAvailable > 0 ? (earnedXP / totalXPAvailable) * 100 : 0;
  const streak = dailyActivity?.streak?.currentStreak ?? 0;

  const sortedChallenges = [...challenges].sort((a, b) => {
    const aDone = a.progress >= a.total ? 1 : 0;
    const bDone = b.progress >= b.total ? 1 : 0;
    return aDone - bDone;
  });

  const updateScrollButtons = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  useEffect(() => {
    updateScrollButtons();
    window.addEventListener('resize', updateScrollButtons);
    return () => window.removeEventListener('resize', updateScrollButtons);
  }, [sortedChallenges.length]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const el = scrollRef.current;
    if (!el) return;
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startScrollLeft: el.scrollLeft };
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const el = scrollRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !el) return;
    event.preventDefault();
    el.scrollLeft = drag.startScrollLeft - (event.clientX - drag.startX);
    updateScrollButtons();
  };

  const stopDragging = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
    setIsDragging(false);
  };

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -400 : 400, behavior: 'smooth' });
  };

  return (
    <section className="pt-6 sm:pt-8">
      {/* ── Header ── */}
      <div className="px-4 sm:px-6 md:px-8 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <img
              src="/attached_assets/XP-text_1779960376768.png"
              alt="XP"
              className="h-7 w-auto object-contain select-none"
              style={{ filter: 'drop-shadow(0 0 8px rgba(183,255,26,0.6))' }}
            />
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold leading-none text-white tracking-tight">
                Earn XP Today
              </h2>
              <p className="text-[11px] text-white/40 mt-0.5">
                {user
                  ? `${completedCount}/${challenges.length} complete · ${earnedXP.toLocaleString()} XP earned`
                  : 'Sign in to track your progress'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CountdownBadge />
            <Link
              href="/level-tracker"
              className="text-xs font-semibold hover:opacity-80 transition-opacity px-3 py-1.5 rounded-lg"
              style={{ background: 'rgba(183,255,26,0.12)', color: '#B7FF1A', border: '1px solid rgba(183,255,26,0.2)' }}
            >
              View All →
            </Link>
          </div>
        </div>

        {/* Summary bar + streak (authenticated users) */}
        {user && (
          <div
            className="rounded-xl px-4 py-3"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            {/* Top row: XP available + streak */}
            <div className="flex items-start justify-between gap-3 mb-3">
              {/* XP summary */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Zap className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#B7FF18' }} />
                  <span className="text-[11px] font-semibold text-white/55">Today's XP</span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-extrabold leading-none" style={{ color: '#B7FF18' }}>
                    {earnedXP.toLocaleString()}
                  </span>
                  <span className="text-xs text-white/40 font-medium">
                    / {totalXPAvailable.toLocaleString()} available
                  </span>
                </div>
                <div className="text-[10px] text-white/35 mt-0.5">
                  {completedCount} / {challenges.length} challenges completed
                </div>
              </div>

              {/* Streak */}
              {streak > 0 && <StreakIndicator streak={streak} />}
            </div>

            {/* Daily progress bar */}
            <div className="h-2 rounded-full overflow-hidden mb-2" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${dailyPct}%`,
                  background: 'linear-gradient(90deg, #8BC51A, #B7FF18)',
                  boxShadow: dailyPct > 0 ? '0 0 8px rgba(183,255,26,0.55)' : 'none',
                  transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
                }}
              />
            </div>

            {/* All-challenges bonus row */}
            <div
              className="flex items-center justify-between pt-2.5"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-sm" style={{ filter: allDone ? 'drop-shadow(0 0 6px rgba(183,255,26,0.7))' : 'none' }}>
                  🏆
                </span>
                <span className="text-[11px] font-semibold text-white/55">All Challenges Bonus</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5" style={{ color: allDone ? '#B7FF18' : 'rgba(183,255,26,0.45)' }} />
                  <span className="text-xs font-extrabold" style={{ color: allDone ? '#B7FF18' : 'rgba(183,255,26,0.45)' }}>
                    +1,000 XP
                  </span>
                </div>
                <span className="text-[10px] text-white/35">
                  {allDone ? 'Claimed! 🎉' : `${completedCount}/${challenges.length} done`}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Carousel ── */}
      <div className="relative">
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-1 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-colors hidden sm:flex"
            style={{ background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(4px)' }}
          >
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
        )}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-1 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-colors hidden sm:flex"
            style={{ background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(4px)' }}
          >
            <ChevronRight className="w-4 h-4 text-white" />
          </button>
        )}

        <div
          ref={scrollRef}
          onScroll={updateScrollButtons}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={stopDragging}
          onPointerCancel={stopDragging}
          onLostPointerCapture={stopDragging}
          className={`flex gap-3 overflow-x-auto pb-3 px-4 sm:px-6 md:px-8 select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', touchAction: 'pan-y' }}
        >
          {(activityLoading && user)
            ? Array.from({ length: 6 }).map((_, i) => (
                <ChallengeCard key={i} challenge={challenges[i] ?? challenges[0]} isLoading={true} />
              ))
            : sortedChallenges.map(c => (
                <ChallengeCard key={c.id} challenge={c} isLoading={false} />
              ))
          }
        </div>
      </div>
    </section>
  );
}
