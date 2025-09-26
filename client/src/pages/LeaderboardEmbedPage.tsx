import { Trophy, Medal, Crown, Upload, Heart, MessageCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

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

const LeaderboardEmbedPage = () => {
  // Fetch leaderboard data from API with auto-refresh for live streaming
  const { data: leaderboardData, isLoading, refetch } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/leaderboard"],
    refetchInterval: 30000, // Refresh every 30 seconds for live updates
    refetchIntervalInBackground: true, // Keep refreshing even when tab is not active
  });

  // Force refresh on mount for immediate data
  useEffect(() => {
    refetch();
  }, [refetch]);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-6 w-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-6 w-6 text-gray-400" />;
    if (rank === 3) return <Trophy className="h-6 w-6 text-amber-600" />;
    return <span className="text-lg font-bold text-muted-foreground">#{rank}</span>;
  };

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return "bg-gradient-to-r from-yellow-400 to-yellow-600";
    if (rank === 2) return "bg-gradient-to-r from-gray-300 to-gray-500";
    if (rank === 3) return "bg-gradient-to-r from-amber-400 to-amber-600";
    return "bg-gradient-to-r from-blue-500 to-purple-600";
  };

  return (
    <div className="min-h-screen bg-background/95 backdrop-blur-sm p-4">
      <Card className="max-w-4xl mx-auto border-2 border-primary/20 shadow-xl">
        <CardHeader className="text-center pb-4">
          <CardTitle className="flex items-center justify-center gap-3 text-2xl">
            <div className="p-2 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600">
              <Trophy className="h-6 w-6 text-white" />
            </div>
            Gamefolio Leaderboard
          </CardTitle>
          <CardDescription className="text-base">
            Live rankings • Updates every 30 seconds
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-lg border">
                  <div className="w-10 h-10 bg-muted rounded-lg animate-pulse" />
                  <div className="w-10 h-10 bg-muted rounded-full animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded animate-pulse" />
                    <div className="h-3 bg-muted rounded w-1/2 animate-pulse" />
                  </div>
                  <div className="flex gap-2">
                    <div className="h-6 w-6 bg-muted rounded animate-pulse" />
                    <div className="h-6 w-6 bg-muted rounded animate-pulse" />
                    <div className="h-6 w-6 bg-muted rounded animate-pulse" />
                  </div>
                  <div className="h-6 w-12 bg-muted rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : !leaderboardData || leaderboardData.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Trophy className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No leaderboard data available yet.</p>
              <p className="text-sm">Check back soon for rankings!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {leaderboardData.slice(0, 15).map((entry) => (
                <div 
                  key={entry.user.id}
                  className={`flex items-center gap-4 p-3 rounded-lg border transition-all ${
                    entry.rank <= 3 ? 'bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/30' : 'bg-muted/30'
                  }`}
                  data-testid={`embed-leaderboard-entry-${entry.user.id}`}
                >
                  <div className="flex items-center justify-center w-10 h-10">
                    {getRankIcon(entry.rank)}
                  </div>
                  
                  <Avatar className="h-10 w-10 border-2 border-primary/20">
                    <AvatarImage src={entry.user.avatarUrl || undefined} />
                    <AvatarFallback className="text-sm font-bold">
                      {entry.user.displayName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-foreground truncate">
                      {entry.user.displayName}
                    </div>
                    <div className="text-sm text-muted-foreground truncate">
                      @{entry.user.username}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex items-center gap-1" title="Clips">
                      <Upload className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">{entry.clipsUploaded}</span>
                    </div>
                    <div className="flex items-center gap-1" title="Likes">
                      <Heart className="h-4 w-4 text-red-500" />
                      <span className="font-medium">{entry.likesReceived}</span>
                    </div>
                    <div className="flex items-center gap-1" title="Comments">
                      <MessageCircle className="h-4 w-4 text-green-500" />
                      <span className="font-medium">{entry.commentsReceived}</span>
                    </div>
                  </div>
                  
                  <Badge 
                    className={`${getRankBadgeColor(entry.rank)} text-white font-bold px-3 py-2 text-base`}
                    data-testid={`embed-score-${entry.user.id}`}
                  >
                    {entry.totalScore}
                  </Badge>
                </div>
              ))}
            </div>
          )}
          
          {/* Live indicator */}
          <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-muted-foreground">
              Live • Last updated: {new Date().toLocaleTimeString()}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LeaderboardEmbedPage;