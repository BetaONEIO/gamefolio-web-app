import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { ArrowLeft, Play, Eye, Heart, MessageSquare, Users, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useLocation, Link } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Clip {
  id: number;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  duration: number | null;
  trimStart: number | null;
  trimEnd: number | null;
  views: number;
  videoType?: 'clip' | 'reel';
  user: {
    id: number;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

interface Screenshot {
  id: number;
  title: string;
  description: string | null;
  imageUrl: string | null;
  views: number;
  user: {
    id: number;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

interface Game {
  id: number;
  name: string;
  imageUrl: string | null;
  totalViews?: number;
  totalFollowers?: number;
  tags?: string[];
}

export default function GameClipsPage() {
  const [, params] = useRoute("/games/:gameId/clips");
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("clips");
  const gameId = parseInt(params?.gameId || "0");

  // Fetch game details
  const { data: game, isLoading: gameLoading } = useQuery<Game>({
    queryKey: [`/api/games/${gameId}`],
    enabled: !!gameId,
  });

  // Fetch clips for this game
  const { data: clips, isLoading: clipsLoading } = useQuery<Clip[]>({
    queryKey: [`/api/games/${gameId}/clips`],
    enabled: !!gameId,
  });

  // Fetch reels for this game (using clips API with filter)
  const { data: allClips, isLoading: allClipsLoading } = useQuery<Clip[]>({
    queryKey: [`/api/games/${gameId}/clips-all`],
    enabled: !!gameId,
  });

  // Fetch screenshots for this game
  const { data: screenshots, isLoading: screenshotsLoading } = useQuery<Screenshot[]>({
    queryKey: [`/api/games/${gameId}/screenshots`],
    enabled: !!gameId,
  });

  // Filter clips and reels from all clips
  const reels = allClips?.filter(clip => clip.videoType === 'reel') || [];
  const normalClips = allClips?.filter(clip => clip.videoType === 'clip' || !clip.videoType) || clips || [];

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatViews = (views: number) => {
    if (views >= 1000000) {
      return `${(views / 1000000).toFixed(1)}M`;
    }
    if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}K`;
    }
    return views.toString();
  };

  const handleClipClick = (clipId: number) => {
    setLocation(`/clips/${clipId}`);
  };

  const handleBackClick = () => {
    setLocation("/explore");
  };

  // Helper components
  const ClipGridItem = ({ clip, onClipClick }: { clip: Clip; onClipClick: (id: number) => void }) => (
    <Card
      className="group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/30"
      onClick={() => onClipClick(clip.id)}
      data-testid={`clip-card-${clip.id}`}
    >
      <CardContent className="p-0">
        <div className="aspect-video relative overflow-hidden rounded-t-lg bg-gray-900">
          {clip.thumbnailUrl ? (
            <img
              src={clip.thumbnailUrl}
              alt={clip.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "/api/placeholder/320x180?text=No+Thumbnail";
              }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <Play className="h-12 w-12 text-primary/50" />
            </div>
          )}
          
          {(clip.trimEnd || clip.duration) && (
            <Badge className="absolute bottom-2 right-2 bg-black/80 text-white text-xs">
              {formatDuration(
                clip.trimEnd && clip.trimEnd > 0 
                  ? clip.trimEnd - (clip.trimStart || 0)
                  : clip.duration || 0
              )}
            </Badge>
          )}

          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <div className="bg-primary rounded-full p-3">
              <Play className="h-6 w-6 text-primary-foreground fill-current" />
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-start gap-3 mb-3">
            {clip.user.avatarUrl ? (
              <img
                src={clip.user.avatarUrl}
                alt={clip.user.displayName}
                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-primary">
                  {clip.user.displayName.charAt(0)}
                </span>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-sm mb-1 line-clamp-2 text-foreground group-hover:text-primary transition-colors">
                {clip.title}
              </h3>
              <p className="text-xs text-muted-foreground">
                <Link href={`/profile/${clip.user.username}`} onClick={(e) => e.stopPropagation()}>
                  <span className="hover:text-foreground transition-colors cursor-pointer">{clip.user.displayName}</span>
                </Link>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {formatViews(clip.views)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const ReelGridItem = ({ reel, onReelClick }: { reel: Clip; onReelClick: (id: number) => void }) => (
    <Card
      className="group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/30"
      onClick={() => onReelClick(reel.id)}
      data-testid={`reel-card-${reel.id}`}
    >
      <CardContent className="p-0">
        <div className="aspect-[9/16] relative overflow-hidden rounded-t-lg bg-gray-900">
          {reel.thumbnailUrl ? (
            <img
              src={reel.thumbnailUrl}
              alt={reel.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "/api/placeholder/180x320?text=No+Thumbnail";
              }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <Play className="h-8 w-8 text-primary/50" />
            </div>
          )}
          
          {(reel.trimEnd || reel.duration) && (
            <Badge className="absolute bottom-2 right-2 bg-black/80 text-white text-xs">
              {formatDuration(
                reel.trimEnd && reel.trimEnd > 0 
                  ? reel.trimEnd - (reel.trimStart || 0)
                  : reel.duration || 0
              )}
            </Badge>
          )}

          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <div className="bg-primary rounded-full p-2">
              <Play className="h-4 w-4 text-primary-foreground fill-current" />
            </div>
          </div>
        </div>

        <div className="p-2">
          <h3 className="font-semibold text-xs mb-1 line-clamp-1 text-foreground group-hover:text-primary transition-colors">
            {reel.title}
          </h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Eye className="h-2 w-2" />
              {formatViews(reel.views)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const ScreenshotGridItem = ({ screenshot, onScreenshotClick }: { screenshot: Screenshot; onScreenshotClick: (id: number) => void }) => (
    <Card
      className="group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/30"
      onClick={() => onScreenshotClick(screenshot.id)}
      data-testid={`screenshot-card-${screenshot.id}`}
    >
      <CardContent className="p-0">
        <div className="aspect-video relative overflow-hidden rounded-t-lg bg-gray-900">
          {screenshot.imageUrl ? (
            <img
              src={screenshot.imageUrl}
              alt={screenshot.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "/api/placeholder/320x180?text=No+Image";
              }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <Eye className="h-12 w-12 text-primary/50" />
            </div>
          )}

          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <div className="bg-primary rounded-full p-3">
              <Eye className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-start gap-3 mb-3">
            {screenshot.user.avatarUrl ? (
              <img
                src={screenshot.user.avatarUrl}
                alt={screenshot.user.displayName}
                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-primary">
                  {screenshot.user.displayName.charAt(0)}
                </span>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-sm mb-1 line-clamp-2 text-foreground group-hover:text-primary transition-colors">
                {screenshot.title}
              </h3>
              <p className="text-xs text-muted-foreground">
                <Link href={`/profile/${screenshot.user.username}`} onClick={(e) => e.stopPropagation()}>
                  <span className="hover:text-foreground transition-colors cursor-pointer">{screenshot.user.displayName}</span>
                </Link>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {formatViews(screenshot.views)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const EmptyState = ({ 
    icon: Icon, 
    title, 
    description, 
    actionText, 
    onAction 
  }: { 
    icon: any; 
    title: string; 
    description: string; 
    actionText: string; 
    onAction: () => void; 
  }) => (
    <div className="text-center py-16">
      <div className="mb-4">
        <Icon className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6">{description}</p>
      <Button onClick={onAction} className="bg-primary hover:bg-primary/90">
        {actionText}
      </Button>
    </div>
  );

  if (gameLoading || clipsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading clips...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackClick}
            className="mb-6 flex items-center gap-2 hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Explore
          </Button>
          
          {/* Game Info Section */}
          <div className="flex items-start gap-8 mb-8">
            {/* Large Game Image */}
            <div className="flex-shrink-0">
              {game?.imageUrl ? (
                <img
                  src={game.imageUrl}
                  alt={game.name}
                  className="w-40 h-56 rounded-lg object-cover shadow-lg"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-40 h-56 rounded-lg bg-muted flex items-center justify-center">
                  <Play className="h-16 w-16 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Game Details */}
            <div className="flex-1 space-y-4">
              <div>
                <h1 className="text-4xl font-bold mb-2">{game?.name || 'Game'}</h1>
                <div className="flex items-center gap-4 text-muted-foreground mb-4">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{game?.totalViews ? `${formatViews(game.totalViews)} watching` : '0 watching'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Heart className="h-4 w-4" />
                    <span>{game?.totalFollowers ? `${formatViews(game.totalFollowers)} followers` : '0 followers'}</span>
                  </div>
                </div>
              </div>

              {/* Genre Tags */}
              <div className="flex items-center gap-2">
                {game?.tags?.length ? (
                  game.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="bg-muted hover:bg-muted/80">
                      {tag}
                    </Badge>
                  ))
                ) : (
                  <>
                    <Badge variant="secondary" className="bg-muted">Action</Badge>
                    <Badge variant="secondary" className="bg-muted">Adventure</Badge>
                  </>
                )}
              </div>

              {/* Favorite Button */}
              <div className="pt-2">
                <Button className="flex items-center gap-2 bg-primary hover:bg-primary/90">
                  <Heart className="h-4 w-4" />
                  Favorite
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="h-auto p-0 bg-transparent border-b border-border mb-8">
            <div className="flex gap-8">
              <TabsTrigger 
                value="clips" 
                className="bg-transparent px-0 pb-4 pt-0 data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none font-semibold relative data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-1/2 data-[state=active]:after:-translate-x-1/2 data-[state=active]:after:w-8 data-[state=active]:after:h-px data-[state=active]:after:bg-primary"
              >
                Clips
              </TabsTrigger>
              <TabsTrigger 
                value="reels" 
                className="bg-transparent px-0 pb-4 pt-0 data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none font-semibold relative data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-1/2 data-[state=active]:after:-translate-x-1/2 data-[state=active]:after:w-8 data-[state=active]:after:h-px data-[state=active]:after:bg-primary"
              >
                Reels
              </TabsTrigger>
              <TabsTrigger 
                value="screenshots" 
                className="bg-transparent px-0 pb-4 pt-0 data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none font-semibold relative data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-1/2 data-[state=active]:after:-translate-x-1/2 data-[state=active]:after:w-12 data-[state=active]:after:h-px data-[state=active]:after:bg-primary"
              >
                Screenshots
              </TabsTrigger>
            </div>
          </TabsList>

          {/* Clips Tab */}
          <TabsContent value="clips" className="mt-0">
            {normalClips && normalClips.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {normalClips.map((clip) => (
                  <ClipGridItem key={clip.id} clip={clip} onClipClick={handleClipClick} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Play}
                title="No clips found"
                description={`Be the first to upload a clip for ${game?.name || 'this game'}!`}
                actionText="Upload First Clip"
                onAction={() => setLocation("/upload")}
              />
            )}
          </TabsContent>

          {/* Reels Tab */}
          <TabsContent value="reels" className="mt-0">
            {reels && reels.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {reels.map((reel) => (
                  <ReelGridItem key={reel.id} reel={reel} onReelClick={handleClipClick} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Play}
                title="No reels found"
                description={`Be the first to upload a reel for ${game?.name || 'this game'}!`}
                actionText="Upload First Reel"
                onAction={() => setLocation("/upload")}
              />
            )}
          </TabsContent>

          {/* Screenshots Tab */}
          <TabsContent value="screenshots" className="mt-0">
            {screenshots && screenshots.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {screenshots.map((screenshot) => (
                  <ScreenshotGridItem key={screenshot.id} screenshot={screenshot} onScreenshotClick={(id) => setLocation(`/screenshots/${id}`)} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Eye}
                title="No screenshots found"
                description={`Be the first to upload a screenshot for ${game?.name || 'this game'}!`}
                actionText="Upload First Screenshot"
                onAction={() => setLocation("/upload")}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}