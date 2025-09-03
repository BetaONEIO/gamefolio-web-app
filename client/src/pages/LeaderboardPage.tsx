import { Trophy, Medal, Crown, TrendingUp, Upload, Heart, MessageCircle, Calendar } from "lucide-react";
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

const LeaderboardPage = () => {
  const { user } = useAuth();

  // Fetch leaderboard data from API
  const { data: leaderboardData, isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/leaderboard"],
  });

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

  const LeaderboardTable = ({ data, isLoading }: { data: LeaderboardEntry[] | undefined, isLoading: boolean }) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Top Gamers
        </CardTitle>
        <CardDescription>
          Ranked by community engagement: likes received + comments received + clips uploaded
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                <div className="w-12 h-12 bg-muted rounded-lg animate-pulse" />
                <div className="w-10 h-10 bg-muted rounded-full animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-3 bg-muted rounded w-1/2 animate-pulse" />
                </div>
                <div className="flex gap-3">
                  <div className="h-6 w-8 bg-muted rounded animate-pulse" />
                  <div className="h-6 w-8 bg-muted rounded animate-pulse" />
                  <div className="h-6 w-8 bg-muted rounded animate-pulse" />
                </div>
                <div className="h-6 w-16 bg-muted rounded animate-pulse" />
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
                className={`flex items-center gap-4 p-4 rounded-lg border transition-all hover:shadow-md ${
                  user?.id === entry.user.id ? 'bg-primary/5 border-primary/20' : 'bg-muted/30'
                }`}
                data-testid={`leaderboard-entry-${entry.user.id}`}
              >
                <div className="flex items-center justify-center w-12 h-12">
                  {getRankIcon(entry.rank)}
                </div>
                
                <Avatar className="h-10 w-10">
                  <AvatarImage src={entry.user.avatarUrl || undefined} />
                  <AvatarFallback>{entry.user.displayName.charAt(0)}</AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <div className="font-semibold text-foreground">{entry.user.displayName}</div>
                  <div className="text-sm text-muted-foreground">@{entry.user.username}</div>
                </div>
                
                <div className="flex items-center gap-3 text-sm">
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
                
                <Badge 
                  className={`${getRankBadgeColor(entry.rank)} text-white font-bold px-3 py-1`}
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

  const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const previousMonth = new Date(new Date().setMonth(new Date().getMonth() - 1))
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600">
              <Trophy className="h-12 w-12 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-foreground">Community Leaderboard</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Top gamers ranked by community engagement and content contribution!
          </p>
        </div>

        {/* Scoring System Info */}
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="text-center">How Rankings Work</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center space-y-2">
                <div className="p-3 rounded-full bg-blue-500/10 w-fit mx-auto">
                  <Upload className="h-6 w-6 text-blue-500" />
                </div>
                <h3 className="font-semibold">Clips Uploaded</h3>
                <p className="text-2xl font-bold text-blue-500">+1 point</p>
                <p className="text-sm text-muted-foreground">Share your gaming moments</p>
              </div>
              <div className="text-center space-y-2">
                <div className="p-3 rounded-full bg-red-500/10 w-fit mx-auto">
                  <Heart className="h-6 w-6 text-red-500" />
                </div>
                <h3 className="font-semibold">Likes Received</h3>
                <p className="text-2xl font-bold text-red-500">+1 point</p>
                <p className="text-sm text-muted-foreground">Get appreciation from others</p>
              </div>
              <div className="text-center space-y-2">
                <div className="p-3 rounded-full bg-green-500/10 w-fit mx-auto">
                  <MessageCircle className="h-6 w-6 text-green-500" />
                </div>
                <h3 className="font-semibold">Comments Received</h3>
                <p className="text-2xl font-bold text-green-500">+1 point</p>
                <p className="text-sm text-muted-foreground">Foster community discussion</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Leaderboard */}
        <LeaderboardTable data={leaderboardData} isLoading={isLoading} />

        {/* Call to Action */}
        <Card className="text-center bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
          <CardContent className="p-8">
            <Trophy className="h-16 w-16 text-primary mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-2">Ready to Climb the Rankings?</h3>
            <p className="text-muted-foreground mb-6">
              Start uploading clips, engaging with content, and building your gaming reputation!
            </p>
            <div className="flex justify-center gap-4">
              <Button asChild>
                <a href="/upload">Upload Your Clip</a>
              </Button>
              <Button variant="outline" asChild>
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