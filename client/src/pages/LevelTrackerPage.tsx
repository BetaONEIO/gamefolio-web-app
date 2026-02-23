import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { getQueryFn } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { ArrowLeft, Zap, Gift, Eye, Heart, Flame, Upload, LogIn, Star, Award, Camera, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import badgeIcon from "@assets/yellow_circle_transparent_1771659993513.png";
import { isToday, isYesterday, format } from "date-fns";

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
  other: Award,
};

const sourceLabels: Record<string, string> = {
  view: "Video Views",
  lootbox: "Daily Lootbox",
  like_received: "Like Received",
  fire_received: "Fire Received",
  upload: "Content Upload",
  daily_login: "Daily Login",
  welcome_bonus: "Welcome Bonus",
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
  other: "text-gray-400",
};

const INITIAL_DISPLAY_COUNT = 10;

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

  return (
    <div className="max-w-2xl mx-auto pb-24 pt-6 px-4">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/@${user.username}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Level Tracker</h1>
      </div>

      <Card className="mb-6 bg-gradient-to-br from-background to-background/80 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4">
            {progressLoading ? (
              <Skeleton className="w-[200px] h-[200px] rounded-full" />
            ) : (
              <div className="relative">
                <svg
                  className="-rotate-90"
                  width={svgSize}
                  height={svgSize}
                >
                  <circle
                    cx={svgSize / 2}
                    cy={svgSize / 2}
                    r={radius}
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.1)"
                    strokeWidth={strokeWidth}
                  />
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
                    style={{
                      transition: "stroke-dashoffset 0.5s ease",
                    }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="relative w-[185px] h-[185px] md:w-[200px] md:h-[200px] mx-auto">
                      <img 
                        src={badgeIcon} 
                        alt="Level Badge"
                        className="w-full h-full object-contain"
                      />
                      <span 
                        className="absolute inset-0 flex items-center justify-center font-bold text-black text-4xl md:text-5xl"
                        style={{ textShadow: "0 1px 2px rgba(0, 0, 0, 0.3)" }}
                      >
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
                    <div 
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span>Lvl {progress.level + 1}</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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
            <span className="text-2xl font-bold text-[#4ade80] mb-1">+5 XP</span>
            <span className="text-slate-400 text-xs mb-1">Upload a Clip</span>
            <span className="text-slate-400 text-[10px]">Share your best gaming moments</span>
          </div>

          <div className="bg-[#0f172a] border border-[#1e293b]/50 rounded-2xl p-4 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-[#00a6f4]/10 flex items-center justify-center mb-3">
              <Eye className="w-6 h-6 text-[#00bcff]" />
            </div>
            <span className="text-2xl font-bold text-[#00bcff] mb-1">+1 XP</span>
            <span className="text-slate-400 text-xs mb-1">Per View</span>
            <span className="text-slate-400 text-[10px]">Earn XP when others watch</span>
          </div>

          <div className="bg-[#0f172a] border border-[#1e293b]/50 rounded-2xl p-4 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-[#eab308]/10 flex items-center justify-center mb-3">
              <LogIn className="w-6 h-6 text-[#eab308]" />
            </div>
            <span className="text-2xl font-bold text-[#eab308] mb-1">+10 XP</span>
            <span className="text-slate-400 text-xs mb-1">Daily Login</span>
            <span className="text-slate-400 text-[10px]">Log in every day for streaks</span>
          </div>

          <div className="bg-[#0f172a] border border-[#1e293b]/50 rounded-2xl p-4 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-[#a855f7]/10 flex items-center justify-center mb-3">
              <Gift className="w-6 h-6 text-[#a855f7]" />
            </div>
            <span className="text-2xl font-bold text-[#a855f7] mb-1">Bonus XP</span>
            <span className="text-slate-400 text-xs mb-1">Daily Lootbox</span>
            <span className="text-slate-400 text-[10px]">Open your daily lootbox reward</span>
          </div>

          <div className="bg-[#0f172a] border border-[#1e293b]/50 rounded-2xl p-4 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-[#ff2056]/10 flex items-center justify-center mb-3">
              <Heart className="w-6 h-6 text-[#ff2056]" />
            </div>
            <span className="text-2xl font-bold text-[#ff2056] mb-1">+1 XP</span>
            <span className="text-slate-400 text-xs mb-1">Like Received</span>
            <span className="text-slate-400 text-[10px]">Get likes on your content</span>
          </div>

          <div className="bg-[#0f172a] border border-[#1e293b]/50 rounded-2xl p-4 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-[#ff6900]/10 flex items-center justify-center mb-3">
              <Flame className="w-6 h-6 text-[#ff6900]" />
            </div>
            <span className="text-2xl font-bold text-[#ff6900] mb-1">+2 XP</span>
            <span className="text-slate-400 text-xs mb-1">Fire Received</span>
            <span className="text-slate-400 text-[10px]">Get fire reactions on clips</span>
          </div>

          <div className="bg-[#0f172a] border border-[#1e293b]/50 rounded-2xl p-4 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-[#06b6d4]/10 flex items-center justify-center mb-3">
              <Camera className="w-6 h-6 text-[#06b6d4]" />
            </div>
            <span className="text-2xl font-bold text-[#06b6d4] mb-1">+2 XP</span>
            <span className="text-slate-400 text-xs mb-1">Screenshot Upload</span>
            <span className="text-slate-400 text-[10px]">Share your favourite moments</span>
          </div>

          <div className="bg-[#0f172a] border border-[#1e293b]/50 rounded-2xl p-4 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-[#f59e0b]/10 flex items-center justify-center mb-3">
              <Star className="w-6 h-6 text-[#f59e0b]" />
            </div>
            <span className="text-2xl font-bold text-[#f59e0b] mb-1">+25 XP</span>
            <span className="text-slate-400 text-xs mb-1">Streak Milestones</span>
            <span className="text-slate-400 text-[10px]">Hit login streak milestones</span>
          </div>
        </div>
      </div>

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
              <p className="text-sm">Start earning XP by watching videos, opening lootboxes, and more!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
