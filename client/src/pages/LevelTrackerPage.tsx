import { useState, useEffect, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { getQueryFn } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import { ArrowLeft, Zap, Gift, Eye, Heart, Flame, Upload, LogIn, Star, Award, Camera, MessageCircle, Sun, CheckCircle2, Circle, UserPlus, Trophy, Target, Calendar, Clock } from "lucide-react";
import ShareLaunchIcon from "@/components/ui/ShareIcon";
import { ZapIconFire } from "@/components/ui/ZapReactionIcon";
import { Button } from "@/components/ui/button";
import { isToday, isYesterday, format } from "date-fns";

interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  nextMilestone: number | null;
  nextMilestoneBonus: number | null;
  allMilestones: { day: number; bonus: number }[];
}

interface DailyActivity {
  clipsWatchedToday: number;
  watch5Done: boolean;
  watch20Done: boolean;
  commentedToday: boolean;
  likedToday: boolean;
  sharedToday: boolean;
  loginXPToday: number;
  streakBonusToday: number;
  lootboxOpenedToday: boolean;
  firstUploadOfDayDone: boolean;
  weeklyUploadsCount: number;
  weekly5Done: boolean;
  weekly10Done: boolean;
  first100ViewsDone: boolean;
  first1000ViewsDone: boolean;
  streak: StreakInfo;
  isWeekend: boolean;
}

function formatSimpleDate(date: Date): string {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "dd MMM");
}

interface LevelProgress {
  level: number;
  currentXP: number;
  currentPoints: number;
  pointsForCurrentLevel: number;
  pointsForNextLevel: number;
  pointsRemaining: number;
  progressPercent: number;
}

interface XPHistoryItem {
  id: number;
  userId: number;
  clipId?: number | null;
  xpAmount: number;
  viewCount?: number | null;
  source: string;
  description?: string | null;
  createdAt: string;
  clip?: {
    id: number;
    title: string;
    thumbnailUrl?: string | null;
  } | null;
}

const sourceIcons: Record<string, typeof Zap> = {
  view: Eye,
  lootbox: Gift,
  like_received: Heart,
  fire_received: ZapIconFire as unknown as typeof Zap,
  upload: Upload,
  daily_login: LogIn,
  welcome_bonus: Star,
  comment_received: MessageCircle,
  share_received: ShareLaunchIcon,
  follow_received: UserPlus,
  comment: MessageCircle,
  like: Heart,
  share_given: ShareLaunchIcon,
  watch_5_clips: Eye,
  watch_20_clips: Eye,
  first_upload_of_day: Trophy,
  weekly_uploads_5: Trophy,
  weekly_uploads_10: Trophy,
  first_100_views: Target,
  first_1000_views: Target,
  lootbox_bonus: Gift,
  consecutive_upload_bonus: Zap,
  weekend_upload_bonus: Star,
  view_milestone_50: Award,
  view_milestone_100: Award,
  view_milestone_250: Award,
  view_milestone_500: Award,
  view_milestone_1000: Award,
  view_milestone_5000: Award,
  view_milestone_10000: Award,
  streak_milestone: Flame,
  referral: UserPlus,
  referral_bonus: Gift,
  other: Award,
};

const sourceLabels: Record<string, string> = {
  view: "View Earned",
  lootbox: "Daily Lootbox",
  like_received: "Like Received",
  fire_received: "Fire Received",
  upload: "Clip/Reel Upload",
  daily_login: "Daily Login",
  welcome_bonus: "Welcome Bonus",
  comment_received: "Comment Received",
  share_received: "Share Received",
  follow_received: "Follow Received",
  comment: "Commented",
  like: "Liked",
  share_given: "Shared a Clip",
  watch_5_clips: "Watched 5 Clips",
  watch_20_clips: "Watched 20 Clips",
  first_upload_of_day: "First Upload of Day",
  weekly_uploads_5: "5 Uploads This Week",
  weekly_uploads_10: "10 Uploads This Week",
  first_100_views: "First Clip to 100 Views",
  first_1000_views: "First Clip to 1,000 Views",
  lootbox_bonus: "Lootbox Opened",
  consecutive_upload_bonus: "Upload Within 24h Bonus",
  weekend_upload_bonus: "Weekend Upload Bonus",
  view_milestone_50: "50 Views Milestone",
  view_milestone_100: "100 Views Milestone",
  view_milestone_250: "250 Views Milestone",
  view_milestone_500: "500 Views Milestone",
  view_milestone_1000: "1K Views Milestone",
  view_milestone_5000: "5K Views Milestone",
  view_milestone_10000: "10K Views Milestone",
  streak_milestone: "Streak Milestone",
  referral: "Friend Referred",
  referral_bonus: "Referral Welcome Bonus",
  other: "Other",
};

const sourceColors: Record<string, string> = {
  view: "text-[#B7FF1A]",
  lootbox: "text-[#B7FF1A]",
  like_received: "text-pink-400",
  fire_received: "text-orange-400",
  upload: "text-[#B7FF1A]",
  daily_login: "text-[#B7FF1A]",
  welcome_bonus: "text-amber-400",
  comment_received: "text-sky-400",
  share_received: "text-teal-400",
  follow_received: "text-[#B7FF1A]",
  comment: "text-sky-400",
  like: "text-pink-400",
  share_given: "text-teal-400",
  watch_5_clips: "text-[#B7FF1A]",
  watch_20_clips: "text-[#B7FF1A]",
  first_upload_of_day: "text-amber-400",
  weekly_uploads_5: "text-amber-400",
  weekly_uploads_10: "text-amber-400",
  first_100_views: "text-cyan-400",
  first_1000_views: "text-cyan-400",
  lootbox_bonus: "text-[#B7FF1A]",
  consecutive_upload_bonus: "text-[#B7FF1A]",
  weekend_upload_bonus: "text-rose-400",
  streak_milestone: "text-orange-400",
  referral: "text-[#B7FF1A]",
  referral_bonus: "text-[#B7FF1A]",
  other: "text-[#B8C0AE]",
};

const INITIAL_DISPLAY_COUNT = 10;

function CountdownClock() {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const diff = midnight.getTime() - now.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center gap-1.5 text-xs" style={{ color: '#B8C0AE' }}>
      <Clock className="w-3 h-3" />
      <span>Resets in <span className="font-mono font-semibold" style={{ color: '#F5F7F2' }}>{timeLeft}</span></span>
    </div>
  );
}

function ActivityItem({
  label,
  xp,
  done,
  progress,
  total,
  color = "text-[#B7FF1A]",
}: {
  label: string;
  xp: number;
  done: boolean;
  progress?: number;
  total?: number;
  color?: string;
}) {
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-xl transition-colors`}
      style={{
        background: done ? 'rgba(183,255,26,0.05)' : 'rgba(255,255,255,0.03)',
        border: done ? '1px solid rgba(183,255,26,0.15)' : '1px solid #1B2A33',
        opacity: done ? 0.65 : 1,
      }}
    >
      <div className="shrink-0">
        {done ? (
          <CheckCircle2 className="w-5 h-5" style={{ color: '#B7FF1A' }} />
        ) : (
          <Circle className="w-5 h-5" style={{ color: '#B8C0AE', opacity: 0.4 }} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${done ? "line-through" : ""}`} style={{ color: done ? '#B8C0AE' : '#F5F7F2' }}>{label}</p>
        {progress !== undefined && total !== undefined && !done && (
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: '#1B2A33' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${Math.min((progress / total) * 100, 100)}%`, background: '#B7FF1A' }}
              />
            </div>
            <span className="text-xs" style={{ color: '#B8C0AE' }}>{progress}/{total}</span>
          </div>
        )}
      </div>
      <span className={`text-sm font-bold shrink-0 ${done ? "" : color}`} style={done ? { color: '#B8C0AE' } : {}}>+{xp} XP</span>
    </div>
  );
}

function SectionCard({ children, accentColor = '#B7FF1A' }: { children: ReactNode; accentColor?: string }) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: '#0B1218',
        border: `1px solid #1B2A33`,
        boxShadow: `0 0 0 0 transparent`,
      }}
    >
      {children}
    </div>
  );
}

export default function LevelTrackerPage() {
  const { user } = useAuth();
  const [showAll, setShowAll] = useState(false);

  const { data: progress, isLoading: progressLoading } = useQuery<LevelProgress>({
    queryKey: [`/api/user/${user?.id}/level-progress`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!user?.id,
  });

  const { data: xpHistory, isLoading: historyLoading } = useQuery<XPHistoryItem[]>({
    queryKey: [`/api/user/${user?.id}/xp-history`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!user?.id,
  });

  const { data: dailyActivity, isLoading: activityLoading } = useQuery<DailyActivity>({
    queryKey: [`/api/user/${user?.id}/daily-activity`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!user?.id,
  });

  const { data: lootboxStatus } = useQuery<{ canOpen: boolean; lastOpenedAt: string | null }>({
    queryKey: ["/api/lootbox/status"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!user?.id,
  });

  const svgSize = 220;
  const radius = 95;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const progressPercent = progress?.progressPercent || 0;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p style={{ color: '#B8C0AE' }}>Please log in to view your level progress.</p>
      </div>
    );
  }

  const streak = dailyActivity?.streak;
  const allMilestones = streak?.allMilestones || [];
  const currentStreak = streak?.currentStreak || 0;

  return (
    <div className="container mx-auto px-4 py-6 pb-24 max-w-2xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>

      {/* Header */}
      <div className="flex items-center gap-3 mb-7">
        <Link href={`/@${user.username}`}>
          <button
            className="flex items-center justify-center w-9 h-9 rounded-full transition-colors"
            style={{ background: '#0B1218', border: '1px solid #1B2A33', color: '#F5F7F2' }}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        </Link>
        <h1 className="text-xl font-bold tracking-tight" style={{ color: '#F5F7F2' }}>Level Tracker</h1>
      </div>

      {/* ── Hero card: ring + XP stats ── */}
      <div
        className="rounded-2xl mb-6 overflow-hidden"
        style={{
          background: '#0B1218',
          border: '1px solid #1B2A33',
          boxShadow: '0 0 40px rgba(183,255,26,0.05)',
        }}
      >
        <div className="flex flex-col sm:flex-row items-center gap-6 p-6">

          {/* Progress ring + level badge */}
          <div className="shrink-0">
            {progressLoading ? (
              <Skeleton className="w-[220px] h-[220px] rounded-full" />
            ) : (
              <div className="relative" style={{ width: svgSize, height: svgSize }}>
                {/* SVG ring */}
                <svg className="-rotate-90 absolute inset-0" width={svgSize} height={svgSize}>
                  {/* Track */}
                  <circle
                    cx={svgSize / 2}
                    cy={svgSize / 2}
                    r={radius}
                    fill="none"
                    stroke="#1B2A33"
                    strokeWidth={strokeWidth}
                  />
                  {/* Progress */}
                  <circle
                    cx={svgSize / 2}
                    cy={svgSize / 2}
                    r={radius}
                    fill="none"
                    stroke="#B7FF1A"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    style={{
                      transition: "stroke-dashoffset 0.6s ease",
                      filter: 'drop-shadow(0 0 6px rgba(183,255,26,0.6))',
                    }}
                  />
                </svg>

                {/* Centre: level badge */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className="flex flex-col items-center justify-center rounded-full"
                    style={{
                      width: 140,
                      height: 140,
                      background: '#03080A',
                      border: '2px solid #B7FF1A',
                      boxShadow: '0 0 24px rgba(183,255,26,0.35), inset 0 0 16px rgba(183,255,26,0.04)',
                    }}
                  >
                    <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#B7FF1A', opacity: 0.7 }}>LVL</span>
                    <span
                      className="font-bold leading-none"
                      style={{
                        color: '#B7FF1A',
                        fontSize: 54,
                        textShadow: '0 0 20px rgba(183,255,26,0.5)',
                      }}
                    >
                      {progress?.level || user.level || 1}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* XP stats */}
          {!progressLoading && progress ? (
            <div className="flex-1 space-y-4 text-center sm:text-left w-full">
              <div>
                <p
                  className="font-bold leading-none mb-1"
                  style={{ color: '#B7FF1A', fontSize: 38, textShadow: '0 0 20px rgba(183,255,26,0.4)' }}
                >
                  {Math.round(progress.currentPoints).toLocaleString()}
                  <span className="text-xl ml-1.5 font-semibold" style={{ color: '#B7FF1A', opacity: 0.7 }}>XP</span>
                </p>
                <p className="text-sm" style={{ color: '#B8C0AE' }}>
                  {Math.round(progress.pointsRemaining).toLocaleString()} XP to Level {progress.level + 1}
                </p>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-medium" style={{ color: '#B8C0AE' }}>
                  <span>Lvl {progress.level}</span>
                  <span style={{ color: '#B7FF1A' }}>{Math.round(progressPercent)}%</span>
                  <span>Lvl {progress.level + 1}</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: '#1B2A33' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${progressPercent}%`,
                      background: 'linear-gradient(90deg, #8BC51A, #B7FF1A)',
                      boxShadow: '0 0 8px rgba(183,255,26,0.6)',
                    }}
                  />
                </div>
              </div>

              {/* Streak */}
              <div className="flex items-center gap-3 pt-1">
                <div
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
                  style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.25)' }}
                >
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span className="text-sm font-bold text-orange-400">
                    {activityLoading ? '—' : (currentStreak)}
                  </span>
                  <span className="text-xs font-medium" style={{ color: '#B8C0AE' }}>day streak</span>
                </div>
                {!activityLoading && streak?.longestStreak != null && streak.longestStreak > 0 && (
                  <div className="text-xs" style={{ color: '#B8C0AE' }}>
                    Best: <span className="font-semibold" style={{ color: '#F5F7F2' }}>{streak.longestStreak}d</span>
                  </div>
                )}
              </div>
            </div>
          ) : progressLoading ? (
            <div className="flex-1 space-y-3">
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-5 w-64" />
              <Skeleton className="h-3 w-full" />
            </div>
          ) : null}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="today">
        <TabsList
          className="w-full mb-5 flex overflow-x-auto h-auto flex-nowrap gap-0.5 p-1 rounded-xl"
          style={{ background: '#0B1218', border: '1px solid #1B2A33' }}
        >
          {['today', 'streaks', 'milestones', 'earnxp', 'history'].map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="flex-1 text-xs whitespace-nowrap py-2 rounded-lg data-[state=active]:text-[#B7FF1A] font-semibold capitalize"
              style={{}}
            >
              {tab === 'earnxp' ? 'Earn XP' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* TODAY */}
        <TabsContent value="today" className="space-y-4">
          {/* Daily Activity */}
          <SectionCard>
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" style={{ color: '#B7FF1A' }} />
                  <h2 className="font-bold text-sm" style={{ color: '#F5F7F2' }}>Daily Activity</h2>
                </div>
                <CountdownClock />
              </div>
              {activityLoading ? (
                <div className="space-y-2">
                  {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : (
                <div className="space-y-2">
                  <ActivityItem label="Daily Login" xp={25} done={!!(dailyActivity?.loginXPToday && dailyActivity.loginXPToday > 0)} color="text-[#B7FF1A]" />
                  <ActivityItem label="Watch 5 Clips" xp={10} done={dailyActivity?.watch5Done || false} progress={Math.min(dailyActivity?.clipsWatchedToday || 0, 5)} total={5} color="text-[#B7FF1A]" />
                  <ActivityItem label="Watch 20 Clips" xp={30} done={dailyActivity?.watch20Done || false} progress={Math.min(dailyActivity?.clipsWatchedToday || 0, 20)} total={20} color="text-[#B7FF1A]" />
                  <ActivityItem label="Comment on a Clip" xp={15} done={dailyActivity?.commentedToday || false} color="text-sky-400" />
                  <ActivityItem label="Like a Clip" xp={5} done={dailyActivity?.likedToday || false} color="text-pink-400" />
                  <ActivityItem label="Share a Clip" xp={20} done={dailyActivity?.sharedToday || false} color="text-teal-400" />
                </div>
              )}
            </div>
          </SectionCard>

          {/* Bonus Events */}
          <SectionCard>
            <div className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Star className="w-4 h-4 text-amber-400" />
                <h2 className="font-bold text-sm" style={{ color: '#F5F7F2' }}>Bonus Events</h2>
              </div>
              <div className="space-y-2">
                {/* Weekend bonus */}
                <div
                  className="flex items-center justify-between px-3 py-3 rounded-xl"
                  style={{
                    background: dailyActivity?.isWeekend ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.03)',
                    border: dailyActivity?.isWeekend ? '1px solid rgba(245,158,11,0.3)' : '1px solid #1B2A33',
                  }}
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: dailyActivity?.isWeekend ? '#fbbf24' : '#F5F7F2' }}>
                      Weekend Upload Bonus {dailyActivity?.isWeekend ? "🔥 Active!" : "(Sat & Sun)"}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: '#B8C0AE' }}>Get 50% extra XP on uploads</p>
                  </div>
                  <span className="text-sm font-bold" style={{ color: dailyActivity?.isWeekend ? '#fbbf24' : '#B8C0AE' }}>+50% XP</span>
                </div>

                {/* Featured clip */}
                <div className="flex items-center justify-between px-3 py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #1B2A33' }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#F5F7F2' }}>Featured Clip of the Day</p>
                    <p className="text-xs mt-0.5" style={{ color: '#B8C0AE' }}>Selected by our team — check your notifications</p>
                  </div>
                  <span className="text-sm font-bold" style={{ color: '#B7FF1A' }}>+500 XP</span>
                </div>

                {/* Daily lootbox */}
                <div
                  className="flex items-center gap-3 px-3 py-3 rounded-xl"
                  style={{
                    background: lootboxStatus?.canOpen === false ? 'rgba(183,255,26,0.05)' : 'rgba(255,255,255,0.03)',
                    border: lootboxStatus?.canOpen === false ? '1px solid rgba(183,255,26,0.15)' : '1px solid #1B2A33',
                    opacity: lootboxStatus?.canOpen === false ? 0.65 : 1,
                  }}
                >
                  <div className="shrink-0">
                    {lootboxStatus?.canOpen === false ? (
                      <CheckCircle2 className="w-5 h-5" style={{ color: '#B7FF1A' }} />
                    ) : (
                      <Circle className="w-5 h-5" style={{ color: '#B8C0AE', opacity: 0.4 }} />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${lootboxStatus?.canOpen === false ? "line-through" : ""}`} style={{ color: lootboxStatus?.canOpen === false ? '#B8C0AE' : '#F5F7F2' }}>
                      Daily Lootbox
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: '#B8C0AE' }}>
                      {lootboxStatus?.canOpen === false ? "Already opened today" : "Open your daily lootbox"}
                    </p>
                  </div>
                  <span className="text-sm font-bold shrink-0" style={{ color: lootboxStatus?.canOpen === false ? '#B8C0AE' : '#B7FF1A' }}>+100 XP</span>
                </div>

                {/* Consecutive upload bonus */}
                {(() => {
                  const consecutiveDone = !!(xpHistory && xpHistory.some((h) => h.source === "consecutive_upload_bonus" && isToday(new Date(h.createdAt))));
                  return (
                    <div
                      className="flex items-center gap-3 px-3 py-3 rounded-xl"
                      style={{
                        background: consecutiveDone ? 'rgba(183,255,26,0.05)' : 'rgba(255,255,255,0.03)',
                        border: consecutiveDone ? '1px solid rgba(183,255,26,0.15)' : '1px solid #1B2A33',
                        opacity: consecutiveDone ? 0.65 : 1,
                      }}
                    >
                      <div className="shrink-0">
                        {consecutiveDone ? (
                          <CheckCircle2 className="w-5 h-5" style={{ color: '#B7FF1A' }} />
                        ) : (
                          <Circle className="w-5 h-5" style={{ color: '#B8C0AE', opacity: 0.4 }} />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${consecutiveDone ? "line-through" : ""}`} style={{ color: consecutiveDone ? '#B8C0AE' : '#F5F7F2' }}>Upload Within 24h of Last Upload</p>
                        <p className="text-xs mt-0.5" style={{ color: '#B8C0AE' }}>Keep the momentum going</p>
                      </div>
                      <span className="text-sm font-bold shrink-0" style={{ color: consecutiveDone ? '#B8C0AE' : '#B7FF1A' }}>+75 XP</span>
                    </div>
                  );
                })()}
              </div>
            </div>
          </SectionCard>
        </TabsContent>

        {/* STREAKS */}
        <TabsContent value="streaks">
          <SectionCard>
            <div className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Flame className="w-4 h-4 text-orange-400" />
                <h2 className="font-bold text-sm" style={{ color: '#F5F7F2' }}>Login Streak</h2>
                {currentStreak > 0 && (
                  <span className="ml-auto text-sm font-bold text-orange-400">{currentStreak} day{currentStreak !== 1 ? "s" : ""}</span>
                )}
              </div>

              {activityLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : (
                <>
                  {dailyActivity?.streakBonusToday ? (
                    <div className="mb-3 p-3 rounded-xl text-center" style={{ background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.2)' }}>
                      <p className="text-orange-400 font-bold text-sm">Milestone Bonus Earned Today!</p>
                      <p className="text-2xl font-bold text-orange-300">+{dailyActivity.streakBonusToday} XP</p>
                    </div>
                  ) : null}

                  {streak?.nextMilestone && (
                    <div className="mb-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #1B2A33' }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs" style={{ color: '#B8C0AE' }}>Next milestone: Day {streak.nextMilestone}</span>
                        <span className="text-xs font-bold text-orange-400">+{streak.nextMilestoneBonus?.toLocaleString()} XP</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#1B2A33' }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${Math.min((currentStreak / (streak.nextMilestone || 1)) * 100, 100)}%`, background: '#f97316' }}
                        />
                      </div>
                      <p className="text-xs mt-1" style={{ color: '#B8C0AE' }}>{currentStreak} / {streak.nextMilestone} days</p>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#B8C0AE' }}>All Milestones</p>
                    {allMilestones.map((m) => (
                      <div
                        key={m.day}
                        className="flex items-center justify-between px-3 py-2.5 rounded-lg"
                        style={{
                          background: currentStreak >= m.day ? 'rgba(251,146,60,0.08)' : 'rgba(255,255,255,0.03)',
                          border: currentStreak >= m.day ? '1px solid rgba(251,146,60,0.2)' : '1px solid #1B2A33',
                        }}
                      >
                        <div className="flex items-center gap-2">
                          {currentStreak >= m.day ? (
                            <CheckCircle2 className="w-4 h-4 text-orange-400" />
                          ) : (
                            <Circle className="w-4 h-4" style={{ color: '#B8C0AE', opacity: 0.4 }} />
                          )}
                          <span className="text-sm" style={{ color: currentStreak >= m.day ? '#B8C0AE' : '#F5F7F2' }}>
                            {m.day} Day Streak
                          </span>
                        </div>
                        <span className="text-sm font-bold" style={{ color: currentStreak >= m.day ? 'rgba(251,146,60,0.5)' : '#f97316' }}>
                          +{m.bonus.toLocaleString()} XP
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between px-3 py-2.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #1B2A33' }}>
                      <div className="flex items-center gap-2">
                        <Circle className="w-4 h-4" style={{ color: '#B8C0AE', opacity: 0.4 }} />
                        <span className="text-sm" style={{ color: '#B8C0AE' }}>60+ Days</span>
                      </div>
                      <span className="text-sm font-bold text-orange-400">Scales up...</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </SectionCard>
        </TabsContent>

        {/* MILESTONES */}
        <TabsContent value="milestones" className="space-y-4">
          {/* Creator Milestones */}
          <SectionCard>
            <div className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-4 h-4" style={{ color: '#B7FF1A' }} />
                <h2 className="font-bold text-sm" style={{ color: '#F5F7F2' }}>Creator Milestones</h2>
              </div>
              {activityLoading ? (
                <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : (
                <div className="space-y-2">
                  <ActivityItem label="First Upload of the Day" xp={100} done={dailyActivity?.firstUploadOfDayDone || false} color="text-amber-400" />
                  <ActivityItem label="5 Uploads This Week" xp={300} done={dailyActivity?.weekly5Done || false} progress={Math.min(dailyActivity?.weeklyUploadsCount || 0, 5)} total={5} color="text-amber-400" />
                  <ActivityItem label="10 Uploads This Week" xp={750} done={dailyActivity?.weekly10Done || false} progress={Math.min(dailyActivity?.weeklyUploadsCount || 0, 10)} total={10} color="text-amber-400" />
                  <ActivityItem label="First Clip to 100 Views" xp={250} done={dailyActivity?.first100ViewsDone || false} color="text-cyan-400" />
                  <ActivityItem label="First Clip to 1,000 Views" xp={1000} done={dailyActivity?.first1000ViewsDone || false} color="text-cyan-400" />
                </div>
              )}
            </div>
          </SectionCard>

          {/* Performance Milestones */}
          <SectionCard>
            <div className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-4 h-4 text-cyan-400" />
                <h2 className="font-bold text-sm" style={{ color: '#F5F7F2' }}>Per-Clip Performance Milestones</h2>
              </div>
              <div className="space-y-1.5">
                {[
                  { views: 50, xp: 50, source: "view_milestone_50" },
                  { views: 100, xp: 100, source: "view_milestone_100" },
                  { views: 250, xp: 200, source: "view_milestone_250" },
                  { views: 500, xp: 400, source: "view_milestone_500" },
                  { views: 1000, xp: 800, source: "view_milestone_1000" },
                  { views: 5000, xp: 1500, source: "view_milestone_5000" },
                  { views: 10000, xp: 3000, source: "view_milestone_10000" },
                ].map((m) => {
                  const earned = !!(xpHistory && xpHistory.some((h) => h.source === m.source));
                  return (
                    <div
                      key={m.views}
                      className="flex items-center justify-between px-3 py-2.5 rounded-lg"
                      style={{
                        background: earned ? 'rgba(34,211,238,0.06)' : 'rgba(255,255,255,0.03)',
                        border: earned ? '1px solid rgba(34,211,238,0.2)' : '1px solid #1B2A33',
                      }}
                    >
                      <div className="flex items-center gap-2">
                        {earned ? (
                          <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                        ) : (
                          <Eye className="w-4 h-4 text-cyan-500" />
                        )}
                        <span className={`text-sm ${earned ? "line-through" : ""}`} style={{ color: earned ? '#B8C0AE' : '#F5F7F2' }}>
                          {m.views.toLocaleString()} Views
                        </span>
                      </div>
                      <span className="text-sm font-bold" style={{ color: earned ? 'rgba(34,211,238,0.4)' : '#22d3ee' }}>+{m.xp.toLocaleString()} XP</span>
                    </div>
                  );
                })}
                <div className="flex items-center justify-between px-3 py-2.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #1B2A33' }}>
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-cyan-500" />
                    <span className="text-sm" style={{ color: '#B8C0AE' }}>25K+ Views</span>
                  </div>
                  <span className="text-sm font-bold text-cyan-600">Scales up...</span>
                </div>
              </div>
            </div>
          </SectionCard>
        </TabsContent>

        {/* EARN XP */}
        <TabsContent value="earnxp">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4" style={{ color: '#B7FF1A' }} />
            <h2 className="text-base font-bold" style={{ color: '#F5F7F2' }}>How to Earn XP</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { icon: Upload, color: "#B7FF1A", xp: "+200 XP", label: "Upload a Clip/Reel", sub: "Share your gaming moments" },
              { icon: Camera, color: "#06b6d4", xp: "+100 XP", label: "Screenshot Upload", sub: "Share your best moments" },
              { icon: Eye, color: "#B7FF1A", xp: "+2 XP", label: "Per View", sub: "Earn XP when others watch" },
              { icon: Heart, color: "#f43f5e", xp: "+10 XP", label: "Like Received", sub: "Get likes on your content" },
              { icon: ZapIconFire, color: "#B7FF1A", xp: "+15 XP", label: "Fire Reaction", sub: "Get fire reactions on clips" },
              { icon: MessageCircle, color: "#38bdf8", xp: "+20 XP", label: "Comment Received", sub: "Get comments on your clips" },
              { icon: ShareLaunchIcon, color: "#2dd4bf", xp: "+40 XP", label: "Share Received", sub: "When others share your clip" },
              { icon: UserPlus, color: "#a78bfa", xp: "+50 XP", label: "Follow Received", sub: "Gain a new follower" },
              { icon: LogIn, color: "#B7FF1A", xp: "+25 XP", label: "Daily Login", sub: "Log in every day for streaks" },
              { icon: Gift, color: "#B7FF1A", xp: "+100 XP", label: "Daily Lootbox", sub: "Open your daily lootbox" },
              { icon: Star, color: "#f59e0b", xp: "+50 XP", label: "Streak Milestones", sub: "Hit login streak milestones" },
              { icon: ShareLaunchIcon, color: "#B7FF1A", xp: "+20 XP", label: "Share Given", sub: "Share someone's clip" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl p-4 flex flex-col items-center text-center"
                style={{ background: '#0B1218', border: '1px solid #1B2A33' }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center mb-3"
                  style={{ background: `${item.color}14` }}
                >
                  <item.icon className="w-5 h-5" style={{ color: item.color }} />
                </div>
                <span className="text-lg font-bold mb-1" style={{ color: item.color }}>{item.xp}</span>
                <span className="text-xs font-semibold mb-0.5" style={{ color: '#F5F7F2' }}>{item.label}</span>
                <span className="text-[10px]" style={{ color: '#B8C0AE' }}>{item.sub}</span>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* HISTORY */}
        <TabsContent value="history">
          <SectionCard>
            <div className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-4 h-4" style={{ color: '#B7FF1A' }} />
                <h2 className="font-bold text-sm" style={{ color: '#B7FF1A' }}>XP History</h2>
              </div>
              {historyLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : xpHistory && xpHistory.length > 0 ? (
                <div className="space-y-1.5">
                  {(showAll ? xpHistory : xpHistory.slice(0, INITIAL_DISPLAY_COUNT)).map((item: XPHistoryItem) => {
                    const Icon = sourceIcons[item.source] || Zap;
                    const label = sourceLabels[item.source] || item.source;
                    const colorClass = sourceColors[item.source] || "text-[#B7FF1A]";
                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-3 rounded-xl overflow-hidden transition-colors"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #1B2A33' }}
                      >
                        <div
                          className="p-2 rounded-full shrink-0"
                          style={{ background: '#03080A' }}
                        >
                          <Icon className={`w-4 h-4 ${colorClass}`} />
                        </div>
                        <span className="font-medium text-sm whitespace-nowrap shrink-0" style={{ color: '#F5F7F2' }}>{label}</span>
                        {item.clip?.title && (
                          <span className="text-xs truncate" style={{ color: '#B8C0AE' }}>· {item.clip.title}</span>
                        )}
                        <div className="ml-auto flex flex-col items-end shrink-0 gap-0.5">
                          <span className={`text-sm font-bold whitespace-nowrap ${colorClass}`}>
                            +{item.xpAmount} XP
                          </span>
                          <span className="text-[10px] whitespace-nowrap" style={{ color: '#B8C0AE' }}>
                            {formatSimpleDate(new Date(item.createdAt))}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {xpHistory.length > INITIAL_DISPLAY_COUNT && (
                    <button
                      onClick={() => setShowAll(!showAll)}
                      className="w-full text-center text-sm py-2.5 rounded-xl transition-colors font-medium"
                      style={{ color: '#B7FF1A', background: 'rgba(183,255,26,0.06)', border: '1px solid rgba(183,255,26,0.15)' }}
                    >
                      {showAll ? "Show less" : `Show all ${xpHistory.length} entries`}
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-center py-8 text-sm" style={{ color: '#B8C0AE' }}>No XP history yet. Start earning!</p>
              )}
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
