import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Upload, ArrowLeft, Play, TrendingUp, Camera, Users, Clock, Calendar, CalendarDays } from "lucide-react";
import { Link, useLocation } from "wouter";
import { ClipWithUser, Game } from "@shared/schema";
import { formatDuration } from "@/lib/constants";
import VideoClipCard from "@/components/clips/VideoClipCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useMobile } from "@/hooks/use-mobile";

const GamePage = () => {
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/games/:gameSlug");
  const gameSlug = params?.gameSlug;
  const isMobile = useMobile();
  const [timePeriod, setTimePeriod] = useState<'day' | 'week' | 'month'>('day');
  const [contentType, setContentType] = useState<'clips' | 'reels' | 'screenshots'>('clips');
  const { user } = useAuth();

  // Get game data by slug (will create from Twitch if doesn't exist)
  const { data: game, isLoading: gameLoading } = useQuery<Game>({
    queryKey: [`/api/twitch/games/slug/${gameSlug}`],
    enabled: !!gameSlug,
  });

  // Get clips for this specific game
  const { data: clips, isLoading } = useQuery<ClipWithUser[]>({
    queryKey: [`/api/games/${game?.id}/clips`],
    enabled: !!game?.id,
  });

  // Fetch trending clips for this game
  const { data: trendingClips, isLoading: isLoadingClips } = useQuery<ClipWithUser[]>({
    queryKey: ['/api/clips/trending', timePeriod, game?.id],
    queryFn: async () => {
      const params = new URLSearchParams({
        period: timePeriod,
        limit: '20',
        gameId: game?.id?.toString() || '',
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
        gameId: game?.id?.toString() || '',
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
        gameId: game?.id?.toString() || '',
      });
      const response = await fetch(`/api/screenshots?${params}`);
      if (!response.ok) throw new Error('Failed to fetch screenshots');
      return response.json();
    },
    enabled: contentType === 'screenshots' && !!game?.id,
  });

  const handleUploadClick = () => {
    navigate("/upload");
  };

  // Helper functions for time period
  const getPeriodIcon = (period: 'day' | 'week' | 'month') => {
    switch (period) {
      case 'day': return <Clock className="h-3 w-3" />;
      case 'week': return <Calendar className="h-3 w-3" />;
      case 'month': return <CalendarDays className="h-3 w-3" />;
    }
  };

  const getPeriodLabel = (period: 'day' | 'week' | 'month') => {
    if (isMobile) {
      switch (period) {
        case 'day': return '1D';
        case 'week': return '1W';
        case 'month': return '1M';
      }
    }
    switch (period) {
      case 'day': return 'Today';
      case 'week': return 'This Week';
      case 'month': return 'This Month';
    }
  };

  // Data processing for display
  const currentData = contentType === 'clips' ? trendingClips : 
                     contentType === 'reels' ? trendingReels : screenshots;
  const isLoadingCurrent = contentType === 'clips' ? isLoadingClips : 
                          contentType === 'reels' ? isLoadingReels : isLoadingScreenshots;
  const fallbackData = contentType === 'screenshots' ? [] : clips;
  const displayData = currentData?.length ? currentData : fallbackData;

  if (!match || !gameSlug) {
    return <div>Game not found</div>;
  }

  if (gameLoading) {
    return (
      <div className="py-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/explore")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Explore
          </Button>
        </div>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Loading game...</h1>
          <p className="text-muted-foreground">Please wait while we load the game details.</p>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="py-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/explore")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Explore
          </Button>
        </div>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Game not found</h1>
          <p className="text-muted-foreground">The game you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/explore")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Explore
        </Button>
      </div>

      {/* Game Info */}
      <div className="flex items-center gap-6 mb-8">
        <div className={isMobile ? "w-36 h-36 rounded-lg overflow-hidden bg-card/50 backdrop-blur-sm border border-border/50" : "w-24 h-32 rounded-lg overflow-hidden bg-card/50 backdrop-blur-sm border border-border/50"}>
          <img
            src={game.imageUrl || `https://placehold.co/240x320/222/444?text=${encodeURIComponent(game.name)}`}
            alt={game.name}
            className={isMobile ? "w-full h-full object-contain" : "w-full h-full object-cover"}
          />
        </div>
        <div>
          <h1 className={isMobile ? "text-xl font-bold mb-2" : "text-3xl font-bold mb-2"}>{game.name}</h1>
          <p className="text-muted-foreground mb-4">
            Browse clips from the {game.name} community
          </p>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {displayData?.length || 0} {contentType} available
            </span>
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
              className={isMobile ? "flex items-center gap-1" : "flex items-center gap-2"}
            >
              {!isMobile && getPeriodIcon(period)}
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
        {isLoadingCurrent || isLoading ? (
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
              No {contentType} have been uploaded for {game.name} yet.
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
  );
};

export default GamePage;