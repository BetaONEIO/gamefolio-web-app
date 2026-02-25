import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { getQueryFn } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
  view: "text-blue-400",
  lootbox: "text-purple-400",
  like_received: "text-pink-400",
  fire_received: "text-orange-400",
  upload: "text-green-400",
  daily_login: "text-yellow-400",
  welcome_bonus: "text-amber-400",
  comment_received: "text-sky-400",
  share_received: "text-teal-400",
  follow_received: "text-violet-400",
  comment: "text-sky-400",
  like: "text-pink-400",
  share_given: "text-teal-400",
  watch_5_clips: "text-blue-300",
  watch_20_clips: "text-blue-300",
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
    <div className="flex items-center gap-1.5 text-xs text-slate-400">
      <Clock className="w-3 h-3" />
      <span>Resets in <span className="font-mono text-slate-200 font-semibold">{timeLeft}</span></span>
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
    <div className="flex items-center gap-3 p-3 rounded-xl bg-[#0b1120] border border-[#1e293b]/60">
      <div className="shrink-0">
        {done ? (
          <CheckCircle2 className="w-5 h-5 text-[#4ade80]" />
        ) : (
          <Circle className="w-5 h-5 text-slate-600" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${done ? "text-slate-400 line-through" : "text-slate-200"}`}>{label}</p>
        {progress !== undefined && total !== undefined && !done && (
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#4ade80] rounded-full transition-all"
                style={{ width: `${Math.min((progress / total) * 100, 100)}%` }}
              />
            </div>
            <span className="text-xs text-slate-500">{progress}/{total}</span>
          </div>
        )}
      </div>
      <span className={`text-sm font-bold shrink-0 ${done ? "text-slate-500" : color}`}>+{xp} XP</span>
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
    <div className="w-full pb-24 pt-6 px-4">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/@${user.username}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Level Tracker</h1>
      </div>

      {/* Level Progress Ring */}
      <Card className="mb-6 bg-gradient-to-br from-background to-background/80 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4">
            {progressLoading ? (
              <Skeleton className="w-[200px] h-[200px] rounded-full" />
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
                  <div className="text-center">
                    <div className="relative w-[185px] h-[185px] md:w-[200px] md:h-[200px] mx-auto">
                      <img src={badgeIcon} alt="Level Badge" className="w-full h-full object-contain" />
                      <span className="absolute inset-0 flex items-center justify-center font-bold text-black text-4xl md:text-5xl" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}>
                        {progress?.level || user.level || 1}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!progressLoading && progress && (
              <div className="text-center space-y-2">
                <p className="text-2xl font-bold text-primary">
                  {Math.round(progress.currentPoints).toLocaleString()} XP
                </p>
                <p className="text-sm text-muted-foreground">
                  {Math.round(progress.pointsRemaining).toLocaleString()} XP to Level {progress.level + 1}
                </p>
                <div className="flex items-center gap-2 justify-center text-xs text-muted-foreground">
                  <span>Lvl {progress.level}</span>
                  <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
                  </div>
                  <span>Lvl {progress.level + 1}</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Daily Activity Tracker */}
      <Card className="mb-6 bg-gradient-to-br from-[#0f172a] to-[#1a2744] border-[#4ade80]/20 overflow-hidden">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#4ade80]" />
              <h2 className="font-bold text-white text-base">Daily Activity</h2>
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
                color="text-blue-400"
              />
              <ActivityItem
                label="Watch 20 Clips"
                xp={30}
                done={dailyActivity?.watch20Done || false}
                progress={Math.min(dailyActivity?.clipsWatchedToday || 0, 20)}
                total={20}
                color="text-blue-400"
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

      {/* Streak Tracker */}
      <Card className="mb-6 bg-gradient-to-br from-[#0f172a] to-[#1a2744] border-[#f97316]/20 overflow-hidden">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center gap-2 mb-4">
            <Flame className="w-5 h-5 text-orange-500" />
            <h2 className="font-bold text-white text-base">Login Streak</h2>
            {currentStreak > 0 && (
              <span className="ml-auto text-orange-400 font-bold text-sm">{currentStreak} day{currentStreak !== 1 ? "s" : ""}</span>
            )}
          </div>

          {activityLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <>
              {dailyActivity?.streakBonusToday ? (
                <div className="mb-3 p-3 rounded-xl bg-[#f97316]/10 border border-[#f97316]/20 text-center">
                  <p className="text-orange-400 font-bold text-sm">Milestone Bonus Earned Today!</p>
                  <p className="text-2xl font-bold text-orange-300">+{dailyActivity.streakBonusToday} XP</p>
                </div>
              ) : null}

              {streak?.nextMilestone && (
                <div className="mb-3 p-3 rounded-xl bg-[#0b1120] border border-[#1e293b]/60">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400">Next milestone: Day {streak.nextMilestone}</span>
                    <span className="text-xs font-bold text-orange-400">+{streak.nextMilestoneBonus?.toLocaleString()} XP</span>
                  </div>
                  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-500 rounded-full transition-all"
                      style={{
                        width: `${Math.min((currentStreak / (streak.nextMilestone || 1)) * 100, 100)}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{currentStreak} / {streak.nextMilestone} days</p>
                </div>
              )}

              <div className="space-y-1.5">
                <p className="text-xs text-slate-500 font-medium mb-2">All Milestones</p>
                {allMilestones.map((m) => (
                  <div
                    key={m.day}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                      currentStreak >= m.day
                        ? "bg-[#f97316]/10 border border-[#f97316]/20"
                        : "bg-[#0b1120] border border-[#1e293b]/40"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {currentStreak >= m.day ? (
                        <CheckCircle2 className="w-4 h-4 text-orange-400" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-600" />
                      )}
                      <span className={`text-sm ${currentStreak >= m.day ? "text-slate-400" : "text-slate-300"}`}>
                        {m.day} Day Streak
                      </span>
                    </div>
                    <span className={`text-sm font-bold ${currentStreak >= m.day ? "text-orange-600" : "text-orange-400"}`}>
                      +{m.bonus.toLocaleString()} XP
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#0b1120] border border-[#1e293b]/40">
                  <div className="flex items-center gap-2">
                    <Circle className="w-4 h-4 text-slate-600" />
                    <span className="text-sm text-slate-400">60+ Days</span>
                  </div>
                  <span className="text-sm font-bold text-orange-400">Scales up...</span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Creator Milestones */}
      <Card className="mb-6 bg-gradient-to-br from-[#0f172a] to-[#1a2744] border-[#a855f7]/20 overflow-hidden">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-purple-400" />
            <h2 className="font-bold text-white text-base">Creator Milestones</h2>
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
      <Card className="mb-6 bg-gradient-to-br from-[#0f172a] to-[#1a2744] border-[#06b6d4]/20 overflow-hidden">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-cyan-400" />
            <h2 className="font-bold text-white text-base">Per-Clip Performance Milestones</h2>
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
                className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-[#0b1120] border border-[#1e293b]/40"
              >
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-cyan-500" />
                  <span className="text-sm text-slate-300">{m.views.toLocaleString()} Views</span>
                </div>
                <span className="text-sm font-bold text-cyan-400">+{m.xp.toLocaleString()} XP</span>
              </div>
            ))}
            <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-[#0b1120] border border-[#1e293b]/40">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-cyan-500" />
                <span className="text-sm text-slate-400">25K+ Views</span>
              </div>
              <span className="text-sm font-bold text-cyan-600">Scales up...</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bonus Events */}
      <Card className="mb-6 bg-gradient-to-br from-[#0f172a] to-[#1a2744] border-[#f59e0b]/20 overflow-hidden">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-5 h-5 text-amber-400" />
            <h2 className="font-bold text-white text-base">Bonus Events</h2>
          </div>
          <div className="space-y-2">
            <div className={`flex items-center justify-between px-3 py-3 rounded-xl border ${dailyActivity?.isWeekend ? "bg-[#f59e0b]/10 border-[#f59e0b]/30" : "bg-[#0b1120] border-[#1e293b]/40"}`}>
              <div>
                <p className={`text-sm font-medium ${dailyActivity?.isWeekend ? "text-amber-300" : "text-slate-300"}`}>
                  Weekend Upload Bonus {dailyActivity?.isWeekend ? "🔥 Active!" : "(Sat & Sun)"}
                </p>
                <p className="text-xs text-slate-500">Get 50% extra XP on uploads</p>
              </div>
              <span className={`text-sm font-bold ${dailyActivity?.isWeekend ? "text-amber-400" : "text-slate-500"}`}>+50% XP</span>
            </div>
            <div className="flex items-center justify-between px-3 py-3 rounded-xl bg-[#0b1120] border border-[#1e293b]/40">
              <div>
                <p className="text-sm font-medium text-slate-300">Featured Clip of the Day</p>
                <p className="text-xs text-slate-500">Selected by our team — check your notifications</p>
              </div>
              <span className="text-sm font-bold text-purple-400">+500 XP</span>
            </div>
            <div className={`flex items-center justify-between px-3 py-3 rounded-xl border ${dailyActivity?.lootboxOpenedToday ? "bg-[#a855f7]/10 border-[#a855f7]/20" : "bg-[#0b1120] border-[#1e293b]/40"}`}>
              <div>
                <p className={`text-sm font-medium ${dailyActivity?.lootboxOpenedToday ? "text-slate-400 line-through" : "text-slate-300"}`}>
                  Daily Lootbox
                </p>
                <p className="text-xs text-slate-500">
                  {dailyActivity?.lootboxOpenedToday ? "Already opened today" : "Open your daily lootbox"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {dailyActivity?.lootboxOpenedToday && <CheckCircle2 className="w-4 h-4 text-[#4ade80]" />}
                <span className={`text-sm font-bold ${dailyActivity?.lootboxOpenedToday ? "text-slate-500" : "text-purple-400"}`}>+100 XP</span>
              </div>
            </div>
            <div className="flex items-center justify-between px-3 py-3 rounded-xl bg-[#0b1120] border border-[#1e293b]/40">
              <div>
                <p className="text-sm font-medium text-slate-300">Upload Within 24h of Last Upload</p>
                <p className="text-xs text-slate-500">Keep the momentum going</p>
              </div>
              <span className="text-sm font-bold text-lime-400">+75 XP</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Earn XP Quick Reference */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-[#4ade80]" />
          <h2 className="text-xl font-bold text-slate-50">Earn XP</h2>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <div className="bg-[#0f172a] border border-[#1e293b]/50 rounded-2xl p-4 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-[#4ade80]/10 flex items-center justify-center mb-3">
              <Upload className="w-6 h-6 text-[#4ade80]" />
            </div>
            <span className="text-2xl font-bold text-[#4ade80] mb-1">+200 XP</span>
            <span className="text-slate-400 text-xs mb-1">Upload a Clip/Reel</span>
            <span className="text-slate-400 text-[10px]">Share your gaming moments</span>
          </div>

          <div className="bg-[#0f172a] border border-[#1e293b]/50 rounded-2xl p-4 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-[#06b6d4]/10 flex items-center justify-center mb-3">
              <Camera className="w-6 h-6 text-[#06b6d4]" />
            </div>
            <span className="text-2xl font-bold text-[#06b6d4] mb-1">+100 XP</span>
            <span className="text-slate-400 text-xs mb-1">Screenshot Upload</span>
            <span className="text-slate-400 text-[10px]">Share your best moments</span>
          </div>

          <div className="bg-[#0f172a] border border-[#1e293b]/50 rounded-2xl p-4 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-[#00a6f4]/10 flex items-center justify-center mb-3">
              <Eye className="w-6 h-6 text-[#00bcff]" />
            </div>
            <span className="text-2xl font-bold text-[#00bcff] mb-1">+2 XP</span>
            <span className="text-slate-400 text-xs mb-1">Per View</span>
            <span className="text-slate-400 text-[10px]">Earn XP when others watch</span>
          </div>

          <div className="bg-[#0f172a] border border-[#1e293b]/50 rounded-2xl p-4 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-[#ff2056]/10 flex items-center justify-center mb-3">
              <Heart className="w-6 h-6 text-[#ff2056]" />
            </div>
            <span className="text-2xl font-bold text-[#ff2056] mb-1">+10 XP</span>
            <span className="text-slate-400 text-xs mb-1">Like Received</span>
            <span className="text-slate-400 text-[10px]">Get likes on your content</span>
          </div>

          <div className="bg-[#0f172a] border border-[#1e293b]/50 rounded-2xl p-4 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-[#ff6900]/10 flex items-center justify-center mb-3">
              <Flame className="w-6 h-6 text-[#ff6900]" />
            </div>
            <span className="text-2xl font-bold text-[#ff6900] mb-1">+15 XP</span>
            <span className="text-slate-400 text-xs mb-1">Fire Reaction</span>
            <span className="text-slate-400 text-[10px]">Get fire reactions on clips</span>
          </div>

          <div className="bg-[#0f172a] border border-[#1e293b]/50 rounded-2xl p-4 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-[#38bdf8]/10 flex items-center justify-center mb-3">
              <MessageCircle className="w-6 h-6 text-[#38bdf8]" />
            </div>
            <span className="text-2xl font-bold text-[#38bdf8] mb-1">+20 XP</span>
            <span className="text-slate-400 text-xs mb-1">Comment Received</span>
            <span className="text-slate-400 text-[10px]">Get comments on your clips</span>
          </div>

          <div className="bg-[#0f172a] border border-[#1e293b]/50 rounded-2xl p-4 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-[#2dd4bf]/10 flex items-center justify-center mb-3">
              <Share2 className="w-6 h-6 text-[#2dd4bf]" />
            </div>
            <span className="text-2xl font-bold text-[#2dd4bf] mb-1">+40 XP</span>
            <span className="text-slate-400 text-xs mb-1">Share Received</span>
            <span className="text-slate-400 text-[10px]">When others share your clip</span>
          </div>

          <div className="bg-[#0f172a] border border-[#1e293b]/50 rounded-2xl p-4 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-[#a78bfa]/10 flex items-center justify-center mb-3">
              <UserPlus className="w-6 h-6 text-[#a78bfa]" />
            </div>
            <span className="text-2xl font-bold text-[#a78bfa] mb-1">+50 XP</span>
            <span className="text-slate-400 text-xs mb-1">Follow Received</span>
            <span className="text-slate-400 text-[10px]">Gain a new follower</span>
          </div>

          <div className="bg-[#0f172a] border border-[#1e293b]/50 rounded-2xl p-4 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-[#eab308]/10 flex items-center justify-center mb-3">
              <LogIn className="w-6 h-6 text-[#eab308]" />
            </div>
            <span className="text-2xl font-bold text-[#eab308] mb-1">+25 XP</span>
            <span className="text-slate-400 text-xs mb-1">Daily Login</span>
            <span className="text-slate-400 text-[10px]">Log in every day for streaks</span>
          </div>

          <div className="bg-[#0f172a] border border-[#1e293b]/50 rounded-2xl p-4 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-[#a855f7]/10 flex items-center justify-center mb-3">
              <Gift className="w-6 h-6 text-[#a855f7]" />
            </div>
            <span className="text-2xl font-bold text-[#a855f7] mb-1">+100 XP</span>
            <span className="text-slate-400 text-xs mb-1">Daily Lootbox</span>
            <span className="text-slate-400 text-[10px]">Open your daily lootbox</span>
          </div>

          <div className="bg-[#0f172a] border border-[#1e293b]/50 rounded-2xl p-4 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-[#f59e0b]/10 flex items-center justify-center mb-3">
              <Star className="w-6 h-6 text-[#f59e0b]" />
            </div>
            <span className="text-2xl font-bold text-[#f59e0b] mb-1">+50 XP</span>
            <span className="text-slate-400 text-xs mb-1">Streak Milestones</span>
            <span className="text-slate-400 text-[10px]">Hit login streak milestones</span>
          </div>
        </div>
      </div>

      {/* XP History */}
      <Card className="bg-background/50 border-border/50">
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
                      {formatSimpleDate(new Date(item.createdAt))}
                    </span>
                    <span className="flex-1" />
                    <span className="font-bold text-primary whitespace-nowrap shrink-0">+{item.xpAmount} XP</span>
                  </div>
                );
              })}
              {!showAll && xpHistory.length > INITIAL_DISPLAY_COUNT && (
                <Button
                  variant="outline"
                  className="w-full mt-3 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
                  onClick={() => setShowAll(true)}
                >
                  See More
                </Button>
              )}
              {showAll && xpHistory.length > INITIAL_DISPLAY_COUNT && (
                <Button
                  variant="outline"
                  className="w-full mt-3 mb-4 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
                  onClick={() => setShowAll(false)}
                >
                  Show Less
                </Button>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Zap className="w-12 h-12 mx-auto mb-3 opacity-30 text-primary" />
              <p>No XP history yet.</p>
              <p className="text-sm">Start earning XP by uploading clips, getting engagement, and logging in daily!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
