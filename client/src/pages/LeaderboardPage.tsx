import { Trophy, Medal, Crown, TrendingUp, Upload, Heart, MessageCircle, Calendar, Clock, History } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";

interface LeaderboardEntry {
  user: {
    id: number;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
    bio?: string | null;
    role?: string;
  };
  likesReceived: number;
  commentsReceived: number;
  clipsUploaded: number;
  totalScore: number;
  rank: number;
}

interface PointsLeaderboardEntry {
  userId: number;
  uploadsCount: number;
  likesGivenCount: number;
  commentsCount: number;
  totalPoints: number;
  rank: number;
  user: {
    id: number;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
  };
}

interface TopContributor {
  userId: number;
  periodType: string;
  period: string;
  year: number;
  totalPoints: number;
  uploadsCount: number;
  likesGivenCount: number;
  commentsCount: number;
  achievedAt: string;
  user: {
    id: number;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
  };
}

interface XPLeaderboardEntry {
  id: number;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  totalXP: number;
}

const LeaderboardPage = () => {
  const { user } = useAuth();

  // Fetch all-time leaderboard data from API
  const { data: allTimeData, isLoading: allTimeLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/leaderboard"],
  });

  // Fetch weekly leaderboard
  const { data: weeklyData, isLoading: weeklyLoading } = useQuery<PointsLeaderboardEntry[]>({
    queryKey: ["/api/leaderboard/weekly/current"],
  });

  // Fetch monthly leaderboard
  const { data: monthlyData, isLoading: monthlyLoading } = useQuery<PointsLeaderboardEntry[]>({
    queryKey: ["/api/leaderboard/monthly/current"],
  });

  // Fetch historic monthly winners
  const { data: historicMonthlyData, isLoading: historicMonthlyLoading } = useQuery<TopContributor[]>({
    queryKey: ["/api/leaderboard/top-contributors/monthly"],
  });

  // Fetch historic weekly winners
  const { data: historicWeeklyData, isLoading: historicWeeklyLoading } = useQuery<TopContributor[]>({
    queryKey: ["/api/leaderboard/top-contributors/weekly"],
  });

  // Fetch XP leaderboard
  const { data: xpData, isLoading: xpLoading } = useQuery<XPLeaderboardEntry[]>({
    queryKey: ["/api/xp/leaderboard"],
  });

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return "bg-gradient-to-r from-yellow-400 to-yellow-600";
    if (rank === 2) return "bg-gradient-to-r from-gray-300 to-gray-500";
    if (rank === 3) return "bg-gradient-to-r from-amber-400 to-amber-600";
    return "bg-gradient-to-r from-blue-500 to-purple-600";
  };

  const AllTimeLeaderboardTable = ({ data, isLoading }: { data: LeaderboardEntry[] | undefined, isLoading: boolean }) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          All-Time Top Gamers
        </CardTitle>
        <CardDescription>
          Ranked by community engagement: likes received + comments received + clips uploaded
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3 sm:space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 sm:gap-4 p-3 sm:p-4">
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-muted rounded-lg animate-pulse" />
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-muted rounded-full animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 sm:h-4 bg-muted rounded animate-pulse" />
                  <div className="h-2 sm:h-3 bg-muted rounded w-1/2 animate-pulse" />
                </div>
                <div className="hidden sm:flex gap-3">
                  <div className="h-6 w-8 bg-muted rounded animate-pulse" />
                  <div className="h-6 w-8 bg-muted rounded animate-pulse" />
                  <div className="h-6 w-8 bg-muted rounded animate-pulse" />
                </div>
                <div className="h-5 w-12 sm:h-6 sm:w-16 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No leaderboard data available yet.</p>
            <p className="text-sm">Start uploading clips and engaging with content to appear here!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {data.map((entry) => (
              <div 
                key={entry.user.id}
                className={`flex items-center gap-2 sm:gap-4 p-3 sm:p-4 rounded-lg border transition-all hover:shadow-md cursor-pointer hover:scale-[1.02] ${
                  user?.id === entry.user.id ? 'bg-primary/5 border-primary/20' : 'bg-muted/30'
                }`}
                data-testid={`leaderboard-entry-${entry.user.id}`}
                onClick={() => window.location.href = `/profile/${entry.user.username}`}
              >
                <div className="flex items-center justify-center w-8 sm:w-12 h-8 sm:h-12">
                  {entry.rank === 1 ? <Crown className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500" /> :
                   entry.rank === 2 ? <Medal className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400" /> :
                   entry.rank === 3 ? <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600" /> :
                   <span className="text-sm sm:text-lg font-bold text-muted-foreground">#{entry.rank}</span>}
                </div>
                
                <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                  <AvatarImage src={entry.user.avatarUrl || undefined} />
                  <AvatarFallback className="text-xs sm:text-sm">{entry.user.displayName.charAt(0)}</AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-foreground text-sm sm:text-base truncate">{entry.user.displayName}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground truncate">@{entry.user.username}</div>
                </div>
                
                {/* Desktop stats layout */}
                <div className="hidden sm:flex items-center gap-3 text-sm">
                  <div className="flex items-center gap-1" title="Clips Uploaded">
                    <Upload className="h-4 w-4 text-blue-500" />
                    <span>{entry.clipsUploaded}</span>
                  </div>
                  <div className="flex items-center gap-1" title="Likes Received">
                    <Heart className="h-4 w-4 text-red-500" />
                    <span>{entry.likesReceived}</span>
                  </div>
                  <div className="flex items-center gap-1" title="Comments Received">
                    <MessageCircle className="h-4 w-4 text-green-500" />
                    <span>{entry.commentsReceived}</span>
                  </div>
                </div>
                
                {/* Mobile stats layout - condensed */}
                <div className="flex sm:hidden items-center gap-2 text-xs">
                  <span className="flex items-center gap-1 text-blue-500">
                    <Upload className="h-3 w-3" />
                    {entry.clipsUploaded}
                  </span>
                  <span className="flex items-center gap-1 text-red-500">
                    <Heart className="h-3 w-3" />
                    {entry.likesReceived}
                  </span>
                  <span className="flex items-center gap-1 text-green-500">
                    <MessageCircle className="h-3 w-3" />
                    {entry.commentsReceived}
                  </span>
                </div>
                
                <Badge 
                  className={`${getRankBadgeColor(entry.rank)} text-white font-bold px-2 sm:px-3 py-1 text-xs sm:text-sm flex-shrink-0`}
                  data-testid={`score-${entry.user.id}`}
                >
                  {entry.totalScore}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const PointsLeaderboardTable = ({ 
    data, 
    isLoading, 
    title, 
    description 
  }: { 
    data: PointsLeaderboardEntry[] | undefined, 
    isLoading: boolean,
    title: string,
    description: string
  }) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3 sm:space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 sm:gap-4 p-3 sm:p-4">
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-muted rounded-lg animate-pulse" />
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-muted rounded-full animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 sm:h-4 bg-muted rounded animate-pulse" />
                  <div className="h-2 sm:h-3 bg-muted rounded w-1/2 animate-pulse" />
                </div>
                <div className="hidden sm:flex gap-3">
                  <div className="h-6 w-8 bg-muted rounded animate-pulse" />
                  <div className="h-6 w-8 bg-muted rounded animate-pulse" />
                  <div className="h-6 w-8 bg-muted rounded animate-pulse" />
                </div>
                <div className="h-5 w-12 sm:h-6 sm:w-16 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No leaderboard data available yet.</p>
            <p className="text-sm">Start uploading clips and engaging with content to appear here!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {data.map((entry) => (
              <div 
                key={entry.userId}
                className={`flex items-center gap-2 sm:gap-4 p-3 sm:p-4 rounded-lg border transition-all hover:shadow-md cursor-pointer hover:scale-[1.02] ${
                  user?.id === entry.userId ? 'bg-primary/5 border-primary/20' : 'bg-muted/30'
                }`}
                data-testid={`leaderboard-entry-${entry.userId}`}
                onClick={() => window.location.href = `/profile/${entry.user.username}`}
              >
                <div className="flex items-center justify-center w-8 sm:w-12 h-8 sm:h-12">
                  {entry.rank === 1 ? <Crown className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500" /> :
                   entry.rank === 2 ? <Medal className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400" /> :
                   entry.rank === 3 ? <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600" /> :
                   <span className="text-sm sm:text-lg font-bold text-muted-foreground">#{entry.rank}</span>}
                </div>
                
                <Avatar className="h-8 w-8 sm:h-10 sm:h-10">
                  <AvatarImage src={entry.user.avatarUrl || undefined} />
                  <AvatarFallback className="text-xs sm:text-sm">{entry.user.displayName.charAt(0)}</AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-foreground text-sm sm:text-base truncate">{entry.user.displayName}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground truncate">@{entry.user.username}</div>
                </div>
                
                {/* Desktop stats layout */}
                <div className="hidden sm:flex items-center gap-3 text-sm">
                  <div className="flex items-center gap-1" title="Uploads (10pts each)">
                    <Upload className="h-4 w-4 text-blue-500" />
                    <span>{entry.uploadsCount}</span>
                  </div>
                  <div className="flex items-center gap-1" title="Likes Given (2pts each)">
                    <Heart className="h-4 w-4 text-red-500" />
                    <span>{entry.likesGivenCount}</span>
                  </div>
                  <div className="flex items-center gap-1" title="Comments (5pts each)">
                    <MessageCircle className="h-4 w-4 text-green-500" />
                    <span>{entry.commentsCount}</span>
                  </div>
                </div>
                
                {/* Mobile stats layout - condensed */}
                <div className="flex sm:hidden items-center gap-2 text-xs">
                  <span className="flex items-center gap-1 text-blue-500">
                    <Upload className="h-3 w-3" />
                    {entry.uploadsCount}
                  </span>
                  <span className="flex items-center gap-1 text-red-500">
                    <Heart className="h-3 w-3" />
                    {entry.likesGivenCount}
                  </span>
                  <span className="flex items-center gap-1 text-green-500">
                    <MessageCircle className="h-3 w-3" />
                    {entry.commentsCount}
                  </span>
                </div>
                
                <Badge 
                  className={`${getRankBadgeColor(entry.rank)} text-white font-bold px-2 sm:px-3 py-1 text-xs sm:text-sm flex-shrink-0`}
                  data-testid={`score-${entry.userId}`}
                >
                  {entry.totalPoints}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const XPLeaderboardTable = ({ data, isLoading }: { data: XPLeaderboardEntry[] | undefined, isLoading: boolean }) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          XP Leaderboard
        </CardTitle>
        <CardDescription>
          Earn 1 XP for every video view your clips receive
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3 sm:space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 sm:gap-4 p-3 sm:p-4">
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-muted rounded-lg animate-pulse" />
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-muted rounded-full animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 sm:h-4 bg-muted rounded animate-pulse" />
                  <div className="h-2 sm:h-3 bg-muted rounded w-1/2 animate-pulse" />
                </div>
                <div className="h-5 w-12 sm:h-6 sm:w-16 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No XP data available yet.</p>
            <p className="text-sm">Start uploading clips and getting views to earn XP!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {data.map((entry, index) => {
              const rank = index + 1;
              return (
                <div 
                  key={entry.id}
                  className={`flex items-center gap-2 sm:gap-4 p-3 sm:p-4 rounded-lg border transition-all hover:shadow-md cursor-pointer hover:scale-[1.02] ${
                    user?.id === entry.id ? 'bg-primary/5 border-primary/20' : 'bg-muted/30'
                  }`}
                  data-testid={`xp-leaderboard-entry-${entry.id}`}
                  onClick={() => window.location.href = `/profile/${entry.username}`}
                >
                  <div className="flex items-center justify-center w-8 sm:w-12 h-8 sm:h-12">
                    {rank === 1 ? <Crown className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500" /> :
                     rank === 2 ? <Medal className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400" /> :
                     rank === 3 ? <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600" /> :
                     <span className="text-sm sm:text-lg font-bold text-muted-foreground">#{rank}</span>}
                  </div>
                  
                  <Avatar className="h-8 w-8 sm:h-10 sm:h-10">
                    <AvatarImage src={entry.avatarUrl || undefined} />
                    <AvatarFallback className="text-xs sm:text-sm">{entry.displayName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-foreground text-sm sm:text-base truncate">{entry.displayName}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground truncate">@{entry.username}</div>
                  </div>
                  
                  <Badge 
                    className={`${getRankBadgeColor(rank)} text-white font-bold px-2 sm:px-3 py-1 text-xs sm:text-sm flex-shrink-0`}
                    data-testid={`xp-${entry.id}`}
                  >
                    {entry.totalXP} XP
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const HistoricLeaderboard = () => {
    const formatPeriod = (period: string, periodType: string) => {
      if (periodType === 'monthly') {
        const [year, month] = period.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      } else {
        return period.replace('W', 'Week ');
      }
    };

    return (
      <div className="space-y-6">
        {/* Monthly Winners */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Top Monthly Contributors
            </CardTitle>
            <CardDescription>Past monthly winners and their achievements</CardDescription>
          </CardHeader>
          <CardContent>
            {historicMonthlyLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-4">
                    <div className="w-10 h-10 bg-muted rounded-full animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded animate-pulse" />
                      <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
                    </div>
                    <div className="h-6 w-16 bg-muted rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : !historicMonthlyData || historicMonthlyData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No historic data available yet.</p>
                <p className="text-sm">Winners will appear here after each month ends!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {historicMonthlyData.map((contributor, index) => (
                  <div 
                    key={`${contributor.period}-${contributor.userId}`}
                    className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-all cursor-pointer hover:scale-[1.01]"
                    data-testid={`historic-monthly-${index}`}
                    onClick={() => window.location.href = `/profile/${contributor.user.username}`}
                  >
                    <div className="flex items-center justify-center w-10 h-10">
                      <Crown className="h-6 w-6 text-yellow-500" />
                    </div>
                    
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={contributor.user.avatarUrl || undefined} />
                      <AvatarFallback>{contributor.user.displayName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-foreground truncate">{contributor.user.displayName}</div>
                      <div className="text-xs sm:text-sm text-muted-foreground truncate">
                        {formatPeriod(contributor.period, contributor.periodType)} • {contributor.totalPoints} points
                      </div>
                    </div>

                    <div className="hidden sm:flex items-center gap-3 text-sm">
                      <div className="flex items-center gap-1" title="Uploads">
                        <Upload className="h-4 w-4 text-blue-500" />
                        <span>{contributor.uploadsCount}</span>
                      </div>
                      <div className="flex items-center gap-1" title="Likes Given">
                        <Heart className="h-4 w-4 text-red-500" />
                        <span>{contributor.likesGivenCount}</span>
                      </div>
                      <div className="flex items-center gap-1" title="Comments">
                        <MessageCircle className="h-4 w-4 text-green-500" />
                        <span>{contributor.commentsCount}</span>
                      </div>
                    </div>

                    <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white font-bold" data-testid={`historic-monthly-score-${index}`}>
                      {contributor.totalPoints}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Weekly Winners */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Top Weekly Contributors
            </CardTitle>
            <CardDescription>Past weekly winners and their achievements</CardDescription>
          </CardHeader>
          <CardContent>
            {historicWeeklyLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-4">
                    <div className="w-10 h-10 bg-muted rounded-full animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded animate-pulse" />
                      <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
                    </div>
                    <div className="h-6 w-16 bg-muted rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : !historicWeeklyData || historicWeeklyData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No historic data available yet.</p>
                <p className="text-sm">Winners will appear here after each week ends!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {historicWeeklyData.map((contributor, index) => (
                  <div 
                    key={`${contributor.period}-${contributor.userId}`}
                    className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-all cursor-pointer hover:scale-[1.01]"
                    data-testid={`historic-weekly-${index}`}
                    onClick={() => window.location.href = `/profile/${contributor.user.username}`}
                  >
                    <div className="flex items-center justify-center w-10 h-10">
                      <Medal className="h-6 w-6 text-gray-400" />
                    </div>
                    
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={contributor.user.avatarUrl || undefined} />
                      <AvatarFallback>{contributor.user.displayName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-foreground truncate">{contributor.user.displayName}</div>
                      <div className="text-xs sm:text-sm text-muted-foreground truncate">
                        {formatPeriod(contributor.period, contributor.periodType)} • {contributor.totalPoints} points
                      </div>
                    </div>

                    <div className="hidden sm:flex items-center gap-3 text-sm">
                      <div className="flex items-center gap-1" title="Uploads">
                        <Upload className="h-4 w-4 text-blue-500" />
                        <span>{contributor.uploadsCount}</span>
                      </div>
                      <div className="flex items-center gap-1" title="Likes Given">
                        <Heart className="h-4 w-4 text-red-500" />
                        <span>{contributor.likesGivenCount}</span>
                      </div>
                      <div className="flex items-center gap-1" title="Comments">
                        <MessageCircle className="h-4 w-4 text-green-500" />
                        <span>{contributor.commentsCount}</span>
                      </div>
                    </div>

                    <Badge className="bg-gradient-to-r from-gray-300 to-gray-500 text-white font-bold" data-testid={`historic-weekly-score-${index}`}>
                      {contributor.totalPoints}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="text-center space-y-3 sm:space-y-4">
          <div className="flex justify-center">
            <div className="p-3 sm:p-4 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600">
              <Trophy className="h-8 w-8 sm:h-12 sm:w-12 text-white" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold text-foreground">Community Leaderboard</h1>
          <p className="text-sm sm:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
            Top gamers ranked by community engagement and content contribution!
          </p>
        </div>

        {/* Scoring System Info */}
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="text-center">How Rankings Work</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              <div className="text-center space-y-2">
                <div className="p-2 sm:p-3 rounded-full bg-blue-500/10 w-fit mx-auto">
                  <Upload className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />
                </div>
                <h3 className="font-semibold text-sm sm:text-base">Clips Uploaded</h3>
                <p className="text-xl sm:text-2xl font-bold text-blue-500">+10 points</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Share your gaming moments</p>
              </div>
              <div className="text-center space-y-2">
                <div className="p-2 sm:p-3 rounded-full bg-red-500/10 w-fit mx-auto">
                  <Heart className="h-5 w-5 sm:h-6 sm:w-6 text-red-500" />
                </div>
                <h3 className="font-semibold text-sm sm:text-base">Likes Given</h3>
                <p className="text-xl sm:text-2xl font-bold text-red-500">+2 points</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Appreciate others' content</p>
              </div>
              <div className="text-center space-y-2">
                <div className="p-2 sm:p-3 rounded-full bg-green-500/10 w-fit mx-auto">
                  <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-500" />
                </div>
                <h3 className="font-semibold text-sm sm:text-base">Comments Made</h3>
                <p className="text-xl sm:text-2xl font-bold text-green-500">+5 points</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Engage with the community</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Leaderboard Tabs */}
        <Tabs defaultValue="month" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="week" data-testid="tab-week">This Week</TabsTrigger>
            <TabsTrigger value="month" data-testid="tab-month">This Month</TabsTrigger>
            <TabsTrigger value="historic" data-testid="tab-historic">Historic</TabsTrigger>
            <TabsTrigger value="xp" data-testid="tab-xp">XP</TabsTrigger>
            <TabsTrigger value="alltime" data-testid="tab-alltime">All Time</TabsTrigger>
          </TabsList>

          <TabsContent value="week" data-testid="content-week">
            <PointsLeaderboardTable 
              data={weeklyData} 
              isLoading={weeklyLoading}
              title="This Week's Top Contributors"
              description="Earn points by uploading clips (10pts), giving likes (2pts), and commenting (5pts)"
            />
          </TabsContent>

          <TabsContent value="month" data-testid="content-month">
            <PointsLeaderboardTable 
              data={monthlyData} 
              isLoading={monthlyLoading}
              title="This Month's Top Contributors"
              description="Earn points by uploading clips (10pts), giving likes (2pts), and commenting (5pts)"
            />
          </TabsContent>

          <TabsContent value="historic" data-testid="content-historic">
            <HistoricLeaderboard />
          </TabsContent>

          <TabsContent value="xp" data-testid="content-xp">
            <XPLeaderboardTable data={xpData} isLoading={xpLoading} />
          </TabsContent>

          <TabsContent value="alltime" data-testid="content-alltime">
            <AllTimeLeaderboardTable data={allTimeData} isLoading={allTimeLoading} />
          </TabsContent>
        </Tabs>

        {/* Call to Action */}
        <Card className="text-center bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
          <CardContent className="p-4 sm:p-8">
            <Trophy className="h-12 w-12 sm:h-16 sm:w-16 text-primary mx-auto mb-3 sm:mb-4" />
            <h3 className="text-xl sm:text-2xl font-bold mb-2">Ready to Climb the Rankings?</h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6 px-2">
              Start uploading clips, engaging with content, and building your gaming reputation!
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
              <Button asChild className="w-full sm:w-auto">
                <a href="/upload">Upload Your Clip</a>
              </Button>
              <Button variant="outline" asChild className="w-full sm:w-auto">
                <a href="/explore">Explore Content</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LeaderboardPage;
