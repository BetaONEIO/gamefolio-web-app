import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { useRoute } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, ArrowLeft, Play, TrendingUp, Camera, Users, Clock, Calendar, CalendarDays, X, Mail } from "lucide-react";
import { Link, useLocation } from "wouter";
import { ClipWithUser, Game } from "@shared/schema";
import VideoClipGridItem from "@/components/clips/VideoClipGridItem";
import { ScreenshotCard } from "@/components/screenshots/ScreenshotCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useMobile } from "@/hooks/use-mobile";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

const UploadPage = lazy(() => import("./UploadPage"));

const GamePage = () => {
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/games/:gameSlug");
  const gameSlug = params?.gameSlug;
  const isMobile = useMobile();
  const [timePeriod, setTimePeriod] = useState<'recent' | '1w' | '1m' | 'ever'>('recent');
  const [contentType, setContentType] = useState<'clips' | 'reels' | 'screenshots'>('clips');
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: game, isLoading: gameLoading } = useQuery<Game>({
    queryKey: ['/api/games/slug', gameSlug],
    queryFn: async () => {
      const response = await fetch(`/api/games/slug/${gameSlug}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch game');
      return response.json();
    },
    enabled: !!gameSlug,
  });

  const { data: clips, isLoading } = useQuery<ClipWithUser[]>({
    queryKey: ['/api/games', game?.id, 'clips'],
    queryFn: async () => {
      const response = await fetch(`/api/games/${game?.id}/clips`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch clips');
      return response.json();
    },
    enabled: !!game?.id,
  });

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
    if (game) {
      sessionStorage.setItem('uploadGameId', game.id.toString());
      sessionStorage.setItem('uploadGameName', game.name);
      if (game.imageUrl) {
        sessionStorage.setItem('uploadGameImage', game.imageUrl);
      }
    }
    setShowUploadDialog(true);
  };

  const handleUploadDialogClose = () => {
    setShowUploadDialog(false);
    if (game?.id) {
      queryClient.invalidateQueries({ queryKey: ['/api/games', game.id, 'clips'] });
      queryClient.invalidateQueries({ queryKey: ['/api/clips/trending', timePeriod, game.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/reels/trending', timePeriod, game.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/screenshots', timePeriod, game.id] });
    }
  };

  const getPeriodIcon = (period: 'recent' | '1w' | '1m' | 'ever') => {
    switch (period) {
      case 'recent': return <Clock className="h-3 w-3" />;
      case '1w': return <Calendar className="h-3 w-3" />;
      case '1m': return <Calendar className="h-3 w-3" />;
      case 'ever': return <CalendarDays className="h-3 w-3" />;
    }
  };

  const getPeriodLabel = (period: 'recent' | '1w' | '1m' | 'ever') => {
    if (isMobile) {
      switch (period) {
        case 'recent': return 'New';
        case '1w': return '1W';
        case '1m': return '1M';
        case 'ever': return 'All';
      }
    }
    switch (period) {
      case 'recent': return 'Most Recent';
      case '1w': return '1W';
      case '1m': return '1M';
      case 'ever': return 'Ever';
    }
  };

  const currentData = contentType === 'clips' ? trendingClips : 
                     contentType === 'reels' ? trendingReels : screenshots;
  const isLoadingCurrent = contentType === 'clips' ? isLoadingClips : 
                          contentType === 'reels' ? isLoadingReels : isLoadingScreenshots;
  const fallbackData = contentType === 'screenshots' ? [] : 
    clips?.filter((c: any) => {
      if (contentType === 'clips') return !c.videoType || c.videoType === 'clip';
      if (contentType === 'reels') return c.videoType === 'reel';
      return true;
    });
  const rawDisplayData = currentData?.length ? currentData : fallbackData;
  
  const uniqueUsers = useMemo(() => {
    if (!rawDisplayData) return [];
    const usersMap = new Map<number, { id: number; username: string; displayName?: string; avatarUrl?: string; nftProfileTokenId?: string; nftProfileImageUrl?: string }>();
    rawDisplayData.forEach((item: any) => {
      if (item.user && item.user.id) {
        usersMap.set(item.user.id, {
          id: item.user.id,
          username: item.user.username,
          displayName: item.user.displayName,
          avatarUrl: item.user.avatarUrl,
          nftProfileTokenId: item.user.nftProfileTokenId,
          nftProfileImageUrl: item.user.nftProfileImageUrl
        });
      }
    });
    return Array.from(usersMap.values()).sort((a, b) => a.username.localeCompare(b.username));
  }, [rawDisplayData]);
  
  const displayData = useMemo(() => {
    if (!rawDisplayData) return [];
    if (selectedUserId === 'all') return rawDisplayData;
    const userId = parseInt(selectedUserId);
    return rawDisplayData.filter((item: any) => item.user?.id === userId);
  }, [rawDisplayData, selectedUserId]);

  if (!match || !gameSlug) {
    return <div>Game not found</div>;
  }

  if (gameLoading) {
    return (
      <div className="py-6 px-4 sm:px-6">
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
      <div className="py-6 px-4 sm:px-6">
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

  const gridColsClass = contentType === 'reels' 
    ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
    : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6";

  return (
    <div className="py-6 px-4 sm:px-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/explore")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Explore
        </Button>
      </div>

      <div className={isMobile ? "flex items-center gap-4 mb-8" : "flex items-center gap-6 mb-8"}>
        <div className={isMobile ? "w-36 h-48 rounded-xl overflow-hidden bg-card/50 backdrop-blur-sm border border-border/50 flex-shrink-0" : "w-40 h-52 rounded-xl overflow-hidden bg-card/50 backdrop-blur-sm border border-border/50 flex-shrink-0"}>
          <img
            src={game.imageUrl || `https://placehold.co/240x320/222/444?text=${encodeURIComponent(game.name)}`}
            alt={game.name}
            className="w-full h-full object-cover"
          />
        </div>
        <div className={isMobile ? "flex-1 min-w-0" : ""}>
          <h1 className={isMobile ? "text-xl font-bold mb-1" : "text-3xl font-bold mb-2"}>{game.name}</h1>
          <p className={isMobile ? "text-muted-foreground mb-2 text-sm" : "text-muted-foreground mb-4"}>
            Browse clips from the {game.name} community
          </p>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {displayData?.length || 0} {contentType} available
            </span>
          </div>
          <Button 
            onClick={handleUploadClick}
            className="mt-3"
            size={isMobile ? "sm" : "default"}
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload content
          </Button>
        </div>
      </div>

      {game.isUserAdded && game.showContactBanner && (
        <div className="mb-6 rounded-lg border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
          <Mail className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium">Is this your game?</p>
            <p className="text-sm text-muted-foreground mt-1">
              Contact us so we can learn more about it!{" "}
              <a
                href={`mailto:support@gamefolio.com?subject=${encodeURIComponent(game.name)}&body=${encodeURIComponent(`Hi Gamefolio team,\n\nI'd like to tell you more about "${game.name}".\n\nGame page: ${window.location.href}\n\nThanks!`)}`}
                className="text-primary underline hover:text-primary/80"
              >
                Email us at support@gamefolio.com
              </a>
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">Time Period:</span>
          {(['recent', '1w', '1m', 'ever'] as const).map((period) => (
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

        {uniqueUsers.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              <Users className="h-4 w-4 inline mr-1" />
              Creator:
            </span>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="w-[180px]" data-testid="select-user-filter">
                <SelectValue placeholder="All Creators" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="select-user-all">
                  All Creators
                </SelectItem>
                {uniqueUsers.map((u) => (
                  <SelectItem key={u.id} value={u.id.toString()} data-testid={`select-user-${u.id}`}>
                    <div className="flex items-center gap-2">
                      {u.nftProfileTokenId && u.nftProfileImageUrl ? (
                        <div className="h-5 w-5 rounded-sm overflow-hidden border border-[#4ade80]/40"><img src={u.nftProfileImageUrl} alt={u.username} className="w-full h-full object-cover" /></div>
                      ) : (
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={u.avatarUrl || ''} alt={u.username} />
                          <AvatarFallback className="text-xs">
                            {u.username?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <span>{u.displayName || u.username}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedUserId !== 'all' && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedUserId('all')}
                className="h-8 w-8 p-0"
                data-testid="button-clear-user-filter"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

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

      <div className="space-y-6">
        {isLoadingCurrent || isLoading ? (
          <div className={gridColsClass}>
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className={
                  contentType === 'reels' ? "aspect-[9/16] rounded-xl" : "aspect-video rounded-xl"
                } />
              </div>
            ))}
          </div>
        ) : displayData && displayData.length > 0 ? (
          <div className={gridColsClass}>
            {contentType === 'screenshots' ? (
              displayData.map((screenshot: any) => (
                <ScreenshotCard
                  key={screenshot.id}
                  screenshot={screenshot}
                  isOwnProfile={user?.id === screenshot.userId}
                  profile={screenshot.user}
                  showUserInfo={true}
                />
              ))
            ) : contentType === 'reels' ? (
              displayData.map((reel: ClipWithUser) => (
                <VideoClipGridItem
                  key={reel.id}
                  clip={reel}
                  userId={user?.id}
                  compact={false}
                  reelsList={displayData}
                />
              ))
            ) : (
              displayData.map((clip: ClipWithUser) => (
                <VideoClipGridItem
                  key={clip.id}
                  clip={clip}
                  userId={user?.id}
                  compact={false}
                  clipsList={displayData}
                />
              ))
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="h-24 w-24 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
              {contentType === 'screenshots' ? (
                <Camera className="h-12 w-12 text-muted-foreground" />
              ) : (
                <Play className="h-12 w-12 text-muted-foreground" />
              )}
            </div>
            <h3 className="text-lg font-semibold mb-2">No {contentType} found</h3>
            <p className="text-muted-foreground mb-4">
              No {contentType} have been uploaded for {game.name} yet.
            </p>
            <Button onClick={handleUploadClick}>
              <Upload className="w-4 h-4 mr-2" />
              Upload content
            </Button>
          </div>
        )}
      </div>

      <Dialog open={showUploadDialog} onOpenChange={(open) => {
        if (!open) handleUploadDialogClose();
        else setShowUploadDialog(true);
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          <Suspense fallback={
            <div className="p-8 text-center">
              <Skeleton className="h-8 w-48 mx-auto mb-4" />
              <Skeleton className="h-4 w-64 mx-auto" />
            </div>
          }>
            <UploadPage />
          </Suspense>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GamePage;
