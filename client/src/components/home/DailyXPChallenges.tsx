import { useAuth } from "@/hooks/use-auth";
import { useRef, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { CheckCircle2, Circle, ChevronLeft, ChevronRight, Zap, Clock } from "lucide-react";
import { getQueryFn } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";

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
  emoji: string;
  title: string;
  xp: number;
  progress: number;
  total: number;
  href: string;
  color: string;
}

function buildChallenges(activity: DailyActivity | undefined, canOpenLootbox: boolean): Challenge[] {
  return [
    {
      id: 'login',
      emoji: '🎮',
      title: 'Daily Login',
      xp: 25,
      progress: activity ? (activity.loginXPToday > 0 ? 1 : 0) : 0,
      total: 1,
      href: '/',
      color: '#B7FF1A',
    },
    {
      id: 'watch5',
      emoji: '👁️',
      title: 'Watch 5 Clips',
      xp: 10,
      progress: activity ? Math.min(activity.clipsWatchedToday, 5) : 0,
      total: 5,
      href: '/explore',
      color: '#B7FF1A',
    },
    {
      id: 'watch20',
      emoji: '🎬',
      title: 'Watch 20 Clips',
      xp: 30,
      progress: activity ? Math.min(activity.clipsWatchedToday, 20) : 0,
      total: 20,
      href: '/explore',
      color: '#B7FF1A',
    },
    {
      id: 'comment',
      emoji: '💬',
      title: 'Comment on a Clip',
      xp: 15,
      progress: activity ? (activity.commentedToday ? 1 : 0) : 0,
      total: 1,
      href: '/explore',
      color: '#38bdf8',
    },
    {
      id: 'like',
      emoji: '❤️',
      title: 'Like a Clip',
      xp: 5,
      progress: activity ? (activity.likedToday ? 1 : 0) : 0,
      total: 1,
      href: '/explore',
      color: '#f472b6',
    },
    {
      id: 'share',
      emoji: '🔗',
      title: 'Share a Clip',
      xp: 20,
      progress: activity ? (activity.sharedToday ? 1 : 0) : 0,
      total: 1,
      href: '/explore',
      color: '#2dd4bf',
    },
    {
      id: 'upload',
      emoji: '📹',
      title: 'Upload Today',
      xp: 200,
      progress: activity ? (activity.firstUploadOfDayDone ? 1 : 0) : 0,
      total: 1,
      href: '/upload',
      color: '#fbbf24',
    },
    {
      id: 'lootbox',
      emoji: '🎁',
      title: 'Open Lootbox',
      xp: 50,
      progress: activity ? (activity.lootboxOpenedToday ? 1 : 0) : 0,
      total: 1,
      href: '/level-tracker',
      color: '#a78bfa',
    },
  ];
}

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
      setTimeLeft(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    };
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
      <Clock className="w-3 h-3 text-white/40" />
      <span className="text-[10px] text-white/40 font-mono">{timeLeft}</span>
    </div>
  );
}

function ChallengeCard({ challenge, isAuth, isLoading }: { challenge: Challenge; isAuth: boolean; isLoading: boolean }) {
  const pct = challenge.total > 0 ? Math.min((challenge.progress / challenge.total) * 100, 100) : 0;
  const done = challenge.progress >= challenge.total;

  if (isLoading) {
    return (
      <div className="flex-shrink-0 rounded-2xl p-4" style={{ width: 188, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <Skeleton className="w-8 h-8 rounded-full mb-3" />
        <Skeleton className="h-4 w-3/4 mb-2" />
        <Skeleton className="h-2 w-full mb-3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    );
  }

  return (
    <Link href={isAuth ? challenge.href : '/auth'}>
      <div
        className="flex-shrink-0 relative rounded-2xl p-4 cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] overflow-hidden"
        style={{
          width: 188,
          background: done
            ? `linear-gradient(135deg, ${challenge.color}18 0%, ${challenge.color}06 100%)`
            : 'rgba(255,255,255,0.04)',
          border: done
            ? `1px solid ${challenge.color}40`
            : '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* Done checkmark */}
        {done && (
          <div className="absolute top-3 right-3">
            <CheckCircle2 className="w-4 h-4" style={{ color: challenge.color }} />
          </div>
        )}
        {!done && !isAuth && (
          <div className="absolute top-3 right-3">
            <Circle className="w-3.5 h-3.5 text-white/15" />
          </div>
        )}

        {/* Subtle glow when done */}
        {done && (
          <div className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{ boxShadow: `inset 0 0 20px ${challenge.color}08` }} />
        )}

        <div className="text-2xl mb-2.5 select-none">{challenge.emoji}</div>

        <h4 className={`text-[13px] font-semibold mb-2.5 pr-5 leading-snug ${done ? 'line-through' : ''}`}
          style={{ color: done ? 'rgba(255,255,255,0.4)' : '#F5F7F2' }}>
          {challenge.title}
        </h4>

        {/* Progress bar */}
        <div className="mb-2.5">
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${pct}%`,
                background: done ? challenge.color : `${challenge.color}80`,
                boxShadow: done ? `0 0 6px ${challenge.color}60` : 'none',
              }}
            />
          </div>
          <div className="flex justify-between text-[10px] mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
            <span>{challenge.progress}/{challenge.total}</span>
            <span>{Math.round(pct)}%</span>
          </div>
        </div>

        {/* XP badge */}
        <div className="flex items-center gap-1">
          <Zap className="w-3 h-3" style={{ color: done ? challenge.color : `${challenge.color}70` }} />
          <span className="text-xs font-bold" style={{ color: done ? challenge.color : `${challenge.color}70` }}>
            +{challenge.xp} XP
          </span>
          {done && <span className="text-[10px] text-white/30 ml-1">Earned!</span>}
        </div>
      </div>
    </Link>
  );
}

export function DailyXPChallenges() {
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
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

  const challenges = buildChallenges(dailyActivity, lootboxStatus?.canOpen ?? true);
  const completedCount = challenges.filter(c => c.progress >= c.total).length;
  const totalXPAvailable = challenges.reduce((sum, c) => sum + c.xp, 0);
  const earnedXP = challenges.filter(c => c.progress >= c.total).reduce((sum, c) => sum + c.xp, 0);

  const updateScrollButtons = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -400 : 400, behavior: 'smooth' });
  };

  return (
    <section className="pt-6 sm:pt-8">
      {/* Header */}
      <div className="px-4 sm:px-6 md:px-8 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <img
              src="/attached_assets/Xp_text_1779960327029.png"
              alt="XP"
              className="h-7 w-auto object-contain select-none"
              style={{ filter: 'drop-shadow(0 0 6px rgba(183,255,26,0.5))' }}
            />
            <div>
              <h2 className="text-lg sm:text-xl font-bold leading-none text-white">Daily Challenges</h2>
              <p className="text-[11px] text-white/40 mt-0.5">
                {user
                  ? `${completedCount}/${challenges.length} complete · ${earnedXP} XP earned today`
                  : 'Sign in to track your progress'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CountdownBadge />
            <Link href="/level-tracker" className="text-xs font-semibold hover:opacity-80 transition-opacity px-3 py-1.5 rounded-lg"
              style={{ background: 'rgba(183,255,26,0.12)', color: '#B7FF1A', border: '1px solid rgba(183,255,26,0.2)' }}>
              View All →
            </Link>
          </div>
        </div>

        {/* XP progress bar (only for authenticated users) */}
        {user && (
          <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-white/60">Today's XP</span>
                <span className="text-sm font-bold" style={{ color: '#B7FF1A' }}>+{earnedXP} / {totalXPAvailable}</span>
              </div>
              {progress && (
                <span className="text-xs text-white/40">Lvl {progress.level} · {Math.round(progress.progressPercent)}% to next</span>
              )}
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${totalXPAvailable > 0 ? (earnedXP / totalXPAvailable) * 100 : 0}%`,
                  background: 'linear-gradient(90deg, #8BC51A, #B7FF1A)',
                  boxShadow: '0 0 8px rgba(183,255,26,0.5)',
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Carousel */}
      <div className="relative">
        {/* Left scroll button */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-1 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-colors hidden sm:flex"
            style={{ background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(4px)' }}
          >
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
        )}
        {/* Right scroll button */}
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
          className="flex gap-3 overflow-x-auto pb-3 px-4 sm:px-6 md:px-8"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {(activityLoading && user)
            ? Array.from({ length: 6 }).map((_, i) => (
                <ChallengeCard
                  key={i}
                  challenge={challenges[i] ?? challenges[0]}
                  isAuth={!!user}
                  isLoading={true}
                />
              ))
            : challenges.map(c => (
                <ChallengeCard key={c.id} challenge={c} isAuth={!!user} isLoading={false} />
              ))}
        </div>
      </div>
    </section>
  );
}
