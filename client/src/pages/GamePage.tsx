import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Clock, Calendar, CalendarDays, Play, Users, TrendingUp, Camera } from "lucide-react";
import { Link } from "wouter";
import VideoClipCard from "@/components/clips/VideoClipCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Game, ClipWithUser } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

export default function GamePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [timePeriod, setTimePeriod] = useState<'day' | 'week' | 'month'>('day');
  const [contentType, setContentType] = useState<'clips' | 'reels' | 'screenshots'>('clips');
  
  const gameSlug = id || '';

  // Fetch game details using slug
  const { data: game, isLoading: isLoadingGame, error: gameError } = useQuery<Game>({
    queryKey: ['/api/twitch/games/slug', gameSlug],
    queryFn: async () => {
      const response = await fetch(`/api/twitch/games/slug/${gameSlug}`);
      if (!response.ok) throw new Error('Failed to fetch game');
      return response.json();
    },
  });

  // Fetch trending clips for this game
  const { data: trendingClips, isLoading: isLoadingClips } = useQuery<ClipWithUser[]>({
    queryKey: ['/api/clips/trending', timePeriod, game?.id],
    queryFn: async () => {
      const params = new URLSearchParams({
        period: timePeriod,
        limit: '20',
        gameId: game!.id.toString(),
      });
      const response = await fetch(`/api/clips/trending?${params}`);
      if (!response.ok) throw new Error('Failed to fetch trending clips');
      return response.json();
    },
    enabled: contentType === 'clips' && !!game?.id,
  });

  // Fetch trending reels for this game
  const { data: trendingReels, isLoading: isLoadingReels } = useQuery<ClipWithUser[]>({
    queryKey: ['/api/reels/trending', timePeriod, game?.id],
    queryFn: async () => {
      const params = new URLSearchParams({
        period: timePeriod,
        limit: '20',
        gameId: game!.id.toString(),
      });
      const response = await fetch(`/api/reels/trending?${params}`);
      if (!response.ok) throw new Error('Failed to fetch trending reels');
      return response.json();
    },
    enabled: contentType === 'reels' && !!game?.id,
  });

  // Fetch screenshots for this game
  const { data: screenshots, isLoading: isLoadingScreenshots } = useQuery<ClipWithUser[]>({
    queryKey: ['/api/screenshots', timePeriod, game?.id],
    queryFn: async () => {
      const params = new URLSearchParams({
        period: timePeriod,
        limit: '20',
        gameId: game!.id.toString(),
      });
      const response = await fetch(`/api/screenshots?${params}`);
      if (!response.ok) throw new Error('Failed to fetch screenshots');
      return response.json();
    },
    enabled: contentType === 'screenshots' && !!game?.id,
  });

  // Fetch all clips for this game (fallback)
  const { data: allClips, isLoading: isLoadingAllClips } = useQuery<ClipWithUser[]>({
    queryKey: [`/api/games/${game?.id}/clips`],
    enabled: !!game?.id && !trendingClips?.length && !trendingReels?.length && contentType !== 'screenshots',
  });

  const getPeriodIcon = (period: string) => {
    switch (period) {
      case 'day': return <Clock className="h-4 w-4" />;
      case 'week': return <Calendar className="h-4 w-4" />;
      case 'month': return <CalendarDays className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case 'day': return 'Today';
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      default: return 'Today';
    }
  };

  const currentData = contentType === 'clips' ? trendingClips : 
                    contentType === 'reels' ? trendingReels : screenshots;
  const isLoading = contentType === 'clips' ? isLoadingClips : 
                   contentType === 'reels' ? isLoadingReels : isLoadingScreenshots;
  const fallbackData = contentType === 'screenshots' ? [] : allClips;

  const displayData = currentData?.length ? currentData : fallbackData;

  // Create fallback game name from slug
  const fallbackGameName = gameSlug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // Use actual game data or fallback
  const gameDisplayName = game?.name || fallbackGameName;
  const gameDisplayImage = game?.imageUrl || "/attached_assets/game-controller-5619105_1920.jpg";

  if (isLoadingGame) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-8">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="aspect-video rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show content even if game details are not found, but we have content or are loading
  const hasAnyContent = displayData && displayData.length > 0;
  const isLoadingAnyContent = isLoading || isLoadingAllClips;
  
  if (!game && !hasAnyContent && !isLoadingAnyContent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">No content found for {gameDisplayName}</h1>
          <p className="text-muted-foreground mb-4">
            This game doesn't have any {contentType} yet.
          </p>
          <div className="flex gap-2 justify-center">
            <Link href="/explore">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Explore
              </Button>
            </Link>
            <Link href="/upload">
              <Button>
                Upload First {contentType === 'clips' ? 'Clip' : contentType === 'reels' ? 'Reel' : 'Screenshot'}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/explore">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          
          <div className="flex items-center gap-4">
            <img
              src={gameDisplayImage}
              alt={gameDisplayName}
              className="h-16 w-16 rounded-lg object-cover"
            />
            <div>
              <h1 className="text-3xl font-bold">{gameDisplayName}</h1>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{displayData?.length || 0} {contentType}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          {/* Time Period Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Time Period:</span>
            {(['day', 'week', 'month'] as const).map((period) => (
              <Button
                key={period}
                variant={timePeriod === period ? "default" : "outline"}
                size="sm"
                onClick={() => setTimePeriod(period)}
                className="flex items-center gap-2"
              >
                {getPeriodIcon(period)}
                {getPeriodLabel(period)}
              </Button>
            ))}
          </div>

          {/* Content Type Tabs */}
          <Tabs value={contentType} onValueChange={(value) => setContentType(value as 'clips' | 'reels' | 'screenshots')}>
            <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
              <TabsTrigger value="clips" className="flex items-center gap-2">
                <Play className="h-4 w-4" />
                Clips
              </TabsTrigger>
              <TabsTrigger value="reels" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Reels
              </TabsTrigger>
              <TabsTrigger value="screenshots" className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Screenshots
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {isLoading || isLoadingAllClips ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array(6).fill(0).map((_, i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className={
                    contentType === 'reels' ? "aspect-[9/16] rounded-lg" : 
                    contentType === 'screenshots' ? "aspect-video rounded-lg" : 
                    "aspect-video rounded-lg"
                  } />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : displayData && displayData.length > 0 ? (
            <>
              {/* Stats */}
              <div className="flex items-center gap-4 mb-6">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {displayData.length} {contentType} found
                </Badge>
                <Badge variant="outline">
                  {getPeriodLabel(timePeriod)}
                </Badge>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayData.map((clip) => (
                  <VideoClipCard
                    key={clip.id}
                    clip={clip}
                    userId={user?.id}
                    clipsList={displayData}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <div className="h-24 w-24 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                <Play className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No {contentType} found</h3>
              <p className="text-muted-foreground mb-4">
                No {contentType} have been uploaded for {gameDisplayName} yet.
              </p>
              <Link href="/upload">
                <Button>
                  Upload First {contentType === 'clips' ? 'Clip' : contentType === 'reels' ? 'Reel' : 'Screenshot'}
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}