import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Play, Users } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Game, ClipWithUser } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

export default function GamePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
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
    queryKey: ['/api/clips/trending', game?.id],
    queryFn: async () => {
      const params = new URLSearchParams({
        period: 'week',
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
    queryKey: ['/api/reels/trending', game?.id],
    queryFn: async () => {
      const params = new URLSearchParams({
        period: 'week',
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
    queryKey: ['/api/screenshots', game?.id],
    queryFn: async () => {
      const params = new URLSearchParams({
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
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header - Kick.com style */}
        <div className="flex items-start gap-6 mb-8">
          <img
            src={gameDisplayImage}
            alt={gameDisplayName}
            className="w-40 h-40 rounded-xl object-cover flex-shrink-0 shadow-lg"
          />
          <div className="flex-1 pt-2">
            <h1 className="text-4xl font-bold mb-3">{gameDisplayName}</h1>
            <div className="flex items-center gap-6 text-muted-foreground mb-4">
              <div className="flex items-center gap-2">
                <Play className="h-4 w-4" />
                <span className="font-medium">{displayData?.length || 0} {contentType}</span>
              </div>
            </div>
            <Link href="/explore">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Games
              </Button>
            </Link>
          </div>
        </div>

        {/* Tabs - Kick.com style */}
        <div className="border-b border-border mb-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setContentType('clips')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                contentType === 'clips'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Clips
            </button>
            <button
              onClick={() => setContentType('reels')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                contentType === 'reels'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Reels
            </button>
            <button
              onClick={() => setContentType('screenshots')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                contentType === 'screenshots'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Screenshots
            </button>
          </div>
        </div>

        {/* Content Grid - Kick.com style with large thumbnails */}
        <div className="space-y-6">
          {isLoading || isLoadingAllClips ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {Array(8).fill(0).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className={
                    contentType === 'reels' ? "w-40 h-60 rounded-xl" : 
                    contentType === 'screenshots' ? "w-40 h-28 rounded-xl" : 
                    "w-40 h-28 rounded-xl"
                  } />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : displayData && displayData.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {displayData.map((item: ClipWithUser) => (
                <div key={item.id} className="group cursor-pointer">
                  <div className={`relative overflow-hidden rounded-xl shadow-md hover:shadow-lg transition-all duration-300 ${
                    contentType === 'reels' ? 'aspect-[9/16]' : 'aspect-video'
                  }`}>
                    <img
                      src={item.thumbnailUrl || `/api/clips/${item.id}/thumbnail`}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/placeholder-game.png";
                      }}
                    />
                    
                    {/* Duration overlay */}
                    <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                      {Math.floor((item.duration || 0) / 60)}:{String((item.duration || 0) % 60).padStart(2, '0')}
                    </div>
                    
                    {/* View count overlay */}
                    <div className="absolute bottom-2 left-2 bg-black/80 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {item.views || 0}
                    </div>
                  </div>
                  
                  <div className="mt-3 space-y-1">
                    <h4 className="font-medium text-sm line-clamp-2 leading-tight">{item.title}</h4>
                    <p className="text-xs text-muted-foreground">{item.user.displayName || item.user.username}</p>
                  </div>
                </div>
              ))}
            </div>
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