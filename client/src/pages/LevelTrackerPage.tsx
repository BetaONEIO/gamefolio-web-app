import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { ArrowLeft, Zap, Gift, Eye, Heart, Flame, Upload, LogIn, Star, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import badgeIcon from "@assets/yellow_circle_transparent_1771658854718.png";
import { formatDistanceToNow } from "date-fns";

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

export default function LevelTrackerPage() {
  const { user } = useAuth();

  const { data: progress, isLoading: progressLoading } = useQuery<LevelProgress>({
    queryKey: [`/api/user/${user?.id}/level-progress`],
    enabled: !!user?.id,
  });

  const { data: xpHistory, isLoading: historyLoading } = useQuery<XPHistoryItem[]>({
    queryKey: [`/api/user/${user?.id}/xp-history`],
    enabled: !!user?.id,
  });

  const svgSize = 200;
  const radius = 80;
  const strokeWidth = 12;
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
    <div className="max-w-2xl mx-auto pb-8">
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
                    <div className="relative w-[170px] h-[170px] md:w-[185px] md:h-[185px] mx-auto">
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
                <p className="text-2xl font-bold text-yellow-500">
                  {Math.round(progress.currentPoints).toLocaleString()} XP
                </p>
                <p className="text-sm text-muted-foreground">
                  {Math.round(progress.pointsRemaining).toLocaleString()} XP to Level {progress.level + 1}
                </p>
                <div className="flex items-center gap-2 justify-center text-xs text-muted-foreground">
                  <span>{Math.round(progress.pointsForCurrentLevel).toLocaleString()}</span>
                  <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-yellow-500 rounded-full transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span>{Math.round(progress.pointsForNextLevel).toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-background/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            XP History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : xpHistory && xpHistory.length > 0 ? (
            <div className="space-y-3">
              {xpHistory.map((item: XPHistoryItem) => {
                const Icon = sourceIcons[item.source] || Zap;
                const label = sourceLabels[item.source] || item.source;
                const colorClass = sourceColors[item.source] || "text-primary";
                
                return (
                  <div 
                    key={item.id}
                    className="flex items-center gap-4 p-3 rounded-lg bg-card/50 border border-border/30 hover:border-border/50 transition-colors"
                  >
                    <div className={`p-2 rounded-full bg-background ${colorClass}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{label}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {item.description}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-yellow-500">+{item.xpAmount} XP</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Zap className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No XP history yet.</p>
              <p className="text-sm">Start earning XP by watching videos, opening lootboxes, and more!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
