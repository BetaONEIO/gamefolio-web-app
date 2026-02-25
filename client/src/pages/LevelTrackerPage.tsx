import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { getQueryFn } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import { ArrowLeft, Zap, Gift, Eye, Heart, Flame, Upload, LogIn, Star, Award, Camera, MessageCircle, Sun, CheckCircle2, Circle, Share2, UserPlus, Trophy, Target, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import badgeIcon from "@assets/yellow_circle_transparent_1771659993513.png";
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
  fire_received: Flame,
  upload: Upload,
  daily_login: LogIn,
  welcome_bonus: Star,
  comment_received: MessageCircle,
  share_received: Share2,
  follow_received: UserPlus,
  comment: MessageCircle,
  like: Heart,
  share_given: Share2,
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
  other: "Other",
};

const sourceColors: Record<string, string> = {
  view: "text-[#4ade80]",
  lootbox: "text-purple-400",
  like_received: "text-pink-400",
  fire_received: "text-orange-400",
  upload: "text-[#4ade80]",
  daily_login: "text-yellow-400",
  welcome_bonus: "text-amber-400",
  comment_received: "text-sky-400",
  share_received: "text-teal-400",
  follow_received: "text-violet-400",
  comment: "text-sky-400",
  like: "text-pink-400",
  share_given: "text-teal-400",
  watch_5_clips: "text-[#4ade80]",
  watch_20_clips: "text-[#4ade80]",
  first_upload_of_day: "text-amber-400",
  weekly_uploads_5: "text-amber-400",
  weekly_uploads_10: "text-amber-400",
  first_100_views: "text-cyan-400",
  first_1000_views: "text-cyan-400",
  lootbox_bonus: "text-purple-400",
  consecutive_upload_bonus: "text-lime-400",
  weekend_upload_bonus: "text-rose-400",
  streak_milestone: "text-orange-400",
  other: "text-gray-400",
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
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Clock className="w-3 h-3" />
      <span>Resets in <span className="font-mono text-foreground font-semibold">{timeLeft}</span></span>
    </div>
  );
}

function ActivityItem({
  label,
  xp,
  done,
  progress,
  total,
  color = "text-[#4ade80]",
}: {
  label: string;
  xp: number;
  done: boolean;
  progress?: number;
  total?: number;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/50">
      <div className="shrink-0">
        {done ? (
          <CheckCircle2 className="w-5 h-5 text-[#4ade80]" />
        ) : (
          <Circle className="w-5 h-5 text-muted-foreground/50" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${done ? "text-muted-foreground line-through" : "text-foreground"}`}>{label}</p>
        {progress !== undefined && total !== undefined && !done && (
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-[#4ade80] rounded-full transition-all"
                style={{ width: `${Math.min((progress / total) * 100, 100)}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">{progress}/{total}</span>
          </div>
        )}
      </div>
      <span className={`text-sm font-bold shrink-0 ${done ? "text-muted-foreground" : color}`}>+{xp} XP</span>
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
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const progressPercent = progress?.progressPercent || 0;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Please log in to view your level progress.</p>
      </div>
    );
  }

  const streak = dailyActivity?.streak;
  const allMilestones = streak?.allMilestones || [];
  const currentStreak = streak?.currentStreak || 0;

  return (
    <div className="container mx-auto px-4 py-6 pb-24">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/@${user.username}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Level Tracker</h1>
      </div>

      {/* Header card — ring on left, XP stats on right */}
      <Card className="mb-6 border-primary/20">
        <CardContent className="flex flex-col sm:flex-row items-center gap-6 pt-6 pb-6">
          {/* Ring */}
          <div className="shrink-0">
            {progressLoading ? (
              <Skeleton className="w-[220px] h-[220px] rounded-full" />
            ) : (
              <div className="relative">
                <svg className="-rotate-90" width={svgSize} height={svgSize}>
                  <circle cx={svgSize / 2} cy={svgSize / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={strokeWidth} />
                  <circle
                    cx={svgSize / 2}
                    cy={svgSize / 2}
                    r={radius}
                    fill="none"
                    stroke="#EAB308"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    style={{ transition: "stroke-dashoffset 0.5s ease" }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative w-[185px] h-[185px]">
                    <img src={badgeIcon} alt="Level Badge" className="w-full h-full object-contain" />
                    <span className="absolute inset-0 flex items-center justify-center font-bold text-black text-5xl" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}>
                      {progress?.level || user.level || 1}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* XP Stats */}
          {!progressLoading && progress ? (
            <div className="flex-1 space-y-3 text-center sm:text-left">
              <p className="text-4xl font-bold text-primary">
                {Math.round(progress.currentPoints).toLocaleString()} XP
              </p>
              <p className="text-base text-muted-foreground">
                {Math.round(progress.pointsRemaining).toLocaleString()} XP to Level {progress.level + 1}
              </p>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="shrink-0">Lvl {progress.level}</span>
                <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
                </div>
                <span className="shrink-0">Lvl {progress.level + 1}</span>
              </div>
            </div>
          ) : progressLoading ? (
            <div className="flex-1 space-y-3">
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-5 w-64" />
              <Skeleton className="h-3 w-full" />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Tabs defaultValue="today">
        <TabsList className="w-full mb-4 flex overflow-x-auto h-auto flex-nowrap gap-0.5 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="today" className="flex-1 text-xs sm:text-sm whitespace-nowrap py-2">Today</TabsTrigger>
          <TabsTrigger value="streaks" className="flex-1 text-xs sm:text-sm whitespace-nowrap py-2">Streaks</TabsTrigger>
          <TabsTrigger value="milestones" className="flex-1 text-xs sm:text-sm whitespace-nowrap py-2">Milestones</TabsTrigger>
          <TabsTrigger value="earnxp" className="flex-1 text-xs sm:text-sm whitespace-nowrap py-2">Earn XP</TabsTrigger>
          <TabsTrigger value="history" className="flex-1 text-xs sm:text-sm whitespace-nowrap py-2">History</TabsTrigger>
        </TabsList>

        {/* TODAY — Daily Activity + Bonus Events */}
        <TabsContent value="today" className="space-y-4">
          <Card className="border-primary/20">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#4ade80]" />
                  <h2 className="font-bold text-base">Daily Activity</h2>
                </div>
                <CountdownClock />
              </div>

              {activityLoading ? (
                <div className="space-y-2">
                  {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : (
                <div className="space-y-2">
                  <ActivityItem
                    label="Daily Login"
                    xp={25}
                    done={!!(dailyActivity?.loginXPToday && dailyActivity.loginXPToday > 0)}
                    color="text-yellow-400"
                  />
                  <ActivityItem
                    label="Watch 5 Clips"
                    xp={10}
                    done={dailyActivity?.watch5Done || false}
                    progress={Math.min(dailyActivity?.clipsWatchedToday || 0, 5)}
                    total={5}
                    color="text-[#4ade80]"
                  />
                  <ActivityItem
                    label="Watch 20 Clips"
                    xp={30}
                    done={dailyActivity?.watch20Done || false}
                    progress={Math.min(dailyActivity?.clipsWatchedToday || 0, 20)}
                    total={20}
                    color="text-[#4ade80]"
                  />
                  <ActivityItem
                    label="Comment on a Clip"
                    xp={15}
                    done={dailyActivity?.commentedToday || false}
                    color="text-sky-400"
                  />
                  <ActivityItem
                    label="Like a Clip"
                    xp={5}
                    done={dailyActivity?.likedToday || false}
                    color="text-pink-400"
                  />
                  <ActivityItem
                    label="Share a Clip"
                    xp={20}
                    done={dailyActivity?.sharedToday || false}
                    color="text-teal-400"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bonus Events */}
          <Card className="border-amber-500/20">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-2 mb-4">
                <Star className="w-5 h-5 text-amber-400" />
                <h2 className="font-bold text-base">Bonus Events</h2>
              </div>
              <div className="space-y-2">
                <div className={`flex items-center justify-between px-3 py-3 rounded-xl border ${dailyActivity?.isWeekend ? "bg-amber-500/10 border-amber-500/30" : "bg-muted/40 border-border/50"}`}>
                  <div>
                    <p className={`text-sm font-medium ${dailyActivity?.isWeekend ? "text-amber-300" : "text-foreground"}`}>
                      Weekend Upload Bonus {dailyActivity?.isWeekend ? "🔥 Active!" : "(Sat & Sun)"}
                    </p>
                    <p className="text-xs text-muted-foreground">Get 50% extra XP on uploads</p>
                  </div>
                  <span className={`text-sm font-bold ${dailyActivity?.isWeekend ? "text-amber-400" : "text-muted-foreground"}`}>+50% XP</span>
                </div>
                <div className="flex items-center justify-between px-3 py-3 rounded-xl bg-muted/40 border border-border/50">
                  <div>
                    <p className="text-sm font-medium text-foreground">Featured Clip of the Day</p>
                    <p className="text-xs text-muted-foreground">Selected by our team — check your notifications</p>
                  </div>
                  <span className="text-sm font-bold text-purple-400">+500 XP</span>
                </div>
                <div className={`flex items-center justify-between px-3 py-3 rounded-xl border ${lootboxStatus?.canOpen === false ? "bg-purple-500/10 border-purple-500/20" : "bg-muted/40 border-border/50"}`}>
                  <div>
                    <p className={`text-sm font-medium ${lootboxStatus?.canOpen === false ? "text-muted-foreground line-through" : "text-foreground"}`}>
                      Daily Lootbox
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {lootboxStatus?.canOpen === false ? "Already opened today" : "Open your daily lootbox"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {lootboxStatus?.canOpen === false && <CheckCircle2 className="w-4 h-4 text-[#4ade80]" />}
                    <span className={`text-sm font-bold ${lootboxStatus?.canOpen === false ? "text-muted-foreground" : "text-purple-400"}`}>+100 XP</span>
                  </div>
                </div>
                <div className="flex items-center justify-between px-3 py-3 rounded-xl bg-muted/40 border border-border/50">
                  <div>
                    <p className="text-sm font-medium text-foreground">Upload Within 24h of Last Upload</p>
                    <p className="text-xs text-muted-foreground">Keep the momentum going</p>
                  </div>
                  <span className="text-sm font-bold text-lime-400">+75 XP</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* STREAKS */}
        <TabsContent value="streaks">
          <Card className="border-orange-500/20">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-2 mb-4">
                <Flame className="w-5 h-5 text-orange-500" />
                <h2 className="font-bold text-base">Login Streak</h2>
                {currentStreak > 0 && (
                  <span className="ml-auto text-orange-400 font-bold text-sm">{currentStreak} day{currentStreak !== 1 ? "s" : ""}</span>
                )}
              </div>

              {activityLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : (
                <>
                  {dailyActivity?.streakBonusToday ? (
                    <div className="mb-3 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-center">
                      <p className="text-orange-400 font-bold text-sm">Milestone Bonus Earned Today!</p>
                      <p className="text-2xl font-bold text-orange-300">+{dailyActivity.streakBonusToday} XP</p>
                    </div>
                  ) : null}

                  {streak?.nextMilestone && (
                    <div className="mb-3 p-3 rounded-xl bg-muted/40 border border-border/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground">Next milestone: Day {streak.nextMilestone}</span>
                        <span className="text-xs font-bold text-orange-400">+{streak.nextMilestoneBonus?.toLocaleString()} XP</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-orange-500 rounded-full transition-all"
                          style={{ width: `${Math.min((currentStreak / (streak.nextMilestone || 1)) * 100, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{currentStreak} / {streak.nextMilestone} days</p>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground font-medium mb-2">All Milestones</p>
                    {allMilestones.map((m) => (
                      <div
                        key={m.day}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                          currentStreak >= m.day
                            ? "bg-orange-500/10 border border-orange-500/20"
                            : "bg-muted/40 border border-border/40"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {currentStreak >= m.day ? (
                            <CheckCircle2 className="w-4 h-4 text-orange-400" />
                          ) : (
                            <Circle className="w-4 h-4 text-muted-foreground/50" />
                          )}
                          <span className={`text-sm ${currentStreak >= m.day ? "text-muted-foreground" : "text-foreground"}`}>
                            {m.day} Day Streak
                          </span>
                        </div>
                        <span className={`text-sm font-bold ${currentStreak >= m.day ? "text-orange-600" : "text-orange-400"}`}>
                          +{m.bonus.toLocaleString()} XP
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/40 border border-border/40">
                      <div className="flex items-center gap-2">
                        <Circle className="w-4 h-4 text-muted-foreground/50" />
                        <span className="text-sm text-muted-foreground">60+ Days</span>
                      </div>
                      <span className="text-sm font-bold text-orange-400">Scales up...</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* MILESTONES — Creator + Performance */}
        <TabsContent value="milestones" className="space-y-4">
          {/* Creator Milestones */}
          <Card className="border-purple-500/20">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-5 h-5 text-purple-400" />
                <h2 className="font-bold text-base">Creator Milestones</h2>
              </div>

              {activityLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : (
                <div className="space-y-2">
                  <ActivityItem
                    label="First Upload of the Day"
                    xp={100}
                    done={dailyActivity?.firstUploadOfDayDone || false}
                    color="text-amber-400"
                  />
                  <ActivityItem
                    label="5 Uploads This Week"
                    xp={300}
                    done={dailyActivity?.weekly5Done || false}
                    progress={Math.min(dailyActivity?.weeklyUploadsCount || 0, 5)}
                    total={5}
                    color="text-amber-400"
                  />
                  <ActivityItem
                    label="10 Uploads This Week"
                    xp={750}
                    done={dailyActivity?.weekly10Done || false}
                    progress={Math.min(dailyActivity?.weeklyUploadsCount || 0, 10)}
                    total={10}
                    color="text-amber-400"
                  />
                  <ActivityItem
                    label="First Clip to 100 Views"
                    xp={250}
                    done={dailyActivity?.first100ViewsDone || false}
                    color="text-cyan-400"
                  />
                  <ActivityItem
                    label="First Clip to 1,000 Views"
                    xp={1000}
                    done={dailyActivity?.first1000ViewsDone || false}
                    color="text-cyan-400"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Performance Milestones */}
          <Card className="border-cyan-500/20">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-cyan-400" />
                <h2 className="font-bold text-base">Per-Clip Performance Milestones</h2>
              </div>
              <div className="space-y-1.5">
                {[
                  { views: 50, xp: 50 },
                  { views: 100, xp: 100 },
                  { views: 250, xp: 200 },
                  { views: 500, xp: 400 },
                  { views: 1000, xp: 800 },
                  { views: 5000, xp: 1500 },
                  { views: 10000, xp: 3000 },
                ].map((m) => (
                  <div
                    key={m.views}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-muted/40 border border-border/40"
                  >
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-cyan-500" />
                      <span className="text-sm text-foreground">{m.views.toLocaleString()} Views</span>
                    </div>
                    <span className="text-sm font-bold text-cyan-400">+{m.xp.toLocaleString()} XP</span>
                  </div>
                ))}
                <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-muted/40 border border-border/40">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-cyan-500" />
                    <span className="text-sm text-muted-foreground">25K+ Views</span>
                  </div>
                  <span className="text-sm font-bold text-cyan-600">Scales up...</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* EARN XP — Reference grid */}
        <TabsContent value="earnxp">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-[#4ade80]" />
            <h2 className="text-lg font-bold">How to Earn XP</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {[
              { icon: Upload, color: "#4ade80", xp: "+200 XP", label: "Upload a Clip/Reel", sub: "Share your gaming moments" },
              { icon: Camera, color: "#06b6d4", xp: "+100 XP", label: "Screenshot Upload", sub: "Share your best moments" },
              { icon: Eye, color: "#4ade80", xp: "+2 XP", label: "Per View", sub: "Earn XP when others watch" },
              { icon: Heart, color: "#ff2056", xp: "+10 XP", label: "Like Received", sub: "Get likes on your content" },
              { icon: Flame, color: "#ff6900", xp: "+15 XP", label: "Fire Reaction", sub: "Get fire reactions on clips" },
              { icon: MessageCircle, color: "#38bdf8", xp: "+20 XP", label: "Comment Received", sub: "Get comments on your clips" },
              { icon: Share2, color: "#2dd4bf", xp: "+40 XP", label: "Share Received", sub: "When others share your clip" },
              { icon: UserPlus, color: "#a78bfa", xp: "+50 XP", label: "Follow Received", sub: "Gain a new follower" },
              { icon: LogIn, color: "#eab308", xp: "+25 XP", label: "Daily Login", sub: "Log in every day for streaks" },
              { icon: Gift, color: "#a855f7", xp: "+100 XP", label: "Daily Lootbox", sub: "Open your daily lootbox" },
              { icon: Star, color: "#f59e0b", xp: "+50 XP", label: "Streak Milestones", sub: "Hit login streak milestones" },
              { icon: Share2, color: "#4ade80", xp: "+20 XP", label: "Share Given", sub: "Share someone's clip" },
            ].map((item) => (
              <div key={item.label} className="bg-card border border-border/50 rounded-2xl p-4 flex flex-col items-center text-center">
                <div className="w-11 h-11 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: `${item.color}18` }}>
                  <item.icon className="w-5 h-5" style={{ color: item.color }} />
                </div>
                <span className="text-xl font-bold mb-1" style={{ color: item.color }}>{item.xp}</span>
                <span className="text-foreground text-xs font-medium mb-0.5">{item.label}</span>
                <span className="text-muted-foreground text-[10px]">{item.sub}</span>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* HISTORY */}
        <TabsContent value="history">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                <span className="text-primary">XP History</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : xpHistory && xpHistory.length > 0 ? (
                <div className="space-y-2">
                  {(showAll ? xpHistory : xpHistory.slice(0, INITIAL_DISPLAY_COUNT)).map((item: XPHistoryItem) => {
                    const Icon = sourceIcons[item.source] || Zap;
                    const label = sourceLabels[item.source] || item.source;
                    const colorClass = sourceColors[item.source] || "text-primary";

                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-card/50 border border-border/30 hover:border-border/50 transition-colors overflow-hidden"
                      >
                        <div className="p-2 rounded-full bg-background text-primary shrink-0">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="font-medium text-sm whitespace-nowrap shrink-0">{label}</span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {item.clip?.title && (
                            <span className="text-muted-foreground/70"> · {item.clip.title}</span>
                          )}
                        </span>
                        <div className="ml-auto flex flex-col items-end shrink-0 gap-0.5">
                          <span className={`text-sm font-bold whitespace-nowrap ${colorClass}`}>
                            +{item.xpAmount} XP
                          </span>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {formatSimpleDate(new Date(item.createdAt))}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {xpHistory.length > INITIAL_DISPLAY_COUNT && (
                    <button
                      onClick={() => setShowAll(!showAll)}
                      className="w-full text-center text-sm text-primary hover:text-primary/80 py-2 transition-colors"
                    >
                      {showAll ? "Show less" : `Show all ${xpHistory.length} entries`}
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No XP history yet. Start earning!</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
