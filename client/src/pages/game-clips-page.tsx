import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { ArrowLeft, Play, Eye, Heart, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useLocation, Link } from "wouter";

interface Clip {
  id: number;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  duration: number | null;
  trimStart: number | null;
  trimEnd: number | null;
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
}

export default function GameClipsPage() {
  const [, params] = useRoute("/games/:gameId/clips");
  const [, setLocation] = useLocation();
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
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackClick}
            className="mb-4 flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Explore
          </Button>
          
          <div className="flex items-center gap-4 mb-4">
            {game?.imageUrl && (
              <img
                src={game.imageUrl}
                alt={game.name}
                className="w-16 h-16 rounded-lg object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            )}
            <div>
              <h1 className="text-4xl font-bold">{game?.name || 'Game'}</h1>
              <p className="text-muted-foreground text-lg">
                {clips?.length || 0} clips available
              </p>
            </div>
          </div>
        </div>

        {/* Clips Grid */}
        {clips && clips.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {clips.map((clip) => (
              <Card
                key={clip.id}
                className="group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/30"
                onClick={() => handleClipClick(clip.id)}
              >
                <CardContent className="p-0">
                  {/* Clip Thumbnail */}
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
                    
                    {/* Duration Badge */}
                    {(clip.trimEnd || clip.duration) && (
                      <Badge className="absolute bottom-2 right-2 bg-black/80 text-white text-xs">
                        {formatDuration(
                          clip.trimEnd && clip.trimEnd > 0 
                            ? clip.trimEnd - (clip.trimStart || 0)
                            : clip.duration || 0
                        )}
                      </Badge>
                    )}

                    {/* Hover Play Button */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <div className="bg-primary rounded-full p-3">
                        <Play className="h-6 w-6 text-primary-foreground fill-current" />
                      </div>
                    </div>
                  </div>

                  {/* Clip Info */}
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

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {formatViews(clip.views)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-16">
            <div className="mb-4">
              <Play className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No clips found</h3>
            <p className="text-muted-foreground mb-6">
              Be the first to upload a clip for {game?.name || 'this game'}!
            </p>
            <Button onClick={() => setLocation("/upload")} className="bg-primary hover:bg-primary/90">
              Upload First Clip
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}