import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import VideoClipCard from "@/components/clips/VideoClipCard";
import { ArrowLeft, Video } from "lucide-react";
import { useLocation } from "wouter";
import { ClipWithUser } from "@shared/schema";
import { useEffect, useState } from "react";
import { GameFilter } from "@/components/filters/GameFilter";

const LatestClipsPage = () => {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);

  // Set navigation context when page loads
  useEffect(() => {
    sessionStorage.setItem('clipNavContext', 'latest');
  }, []);

  // Fetch latest clips
  const { data: clipsData, isLoading: isLoadingClips } = useQuery<ClipWithUser[]>({
    queryKey: ['/api/clips'],
    queryFn: async () => {
      const response = await fetch('/api/clips');
      if (!response.ok) throw new Error('Failed to fetch clips');
      return response.json();
    },
  });

  // Filter clips by selected game
  const filteredClips = clipsData
    ? selectedGameId
      ? clipsData.filter((clip) => clip.game?.id === selectedGameId)
      : clipsData
    : [];

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="space-y-4 mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation('/')}
            className="flex items-center gap-2"
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-page-title">Latest Clips</h1>
            <p className="text-muted-foreground">
              Discover the newest gaming clips from the community
            </p>
          </div>
        </div>
        
        {/* Game Filter */}
        {clipsData && clipsData.length > 0 && (
          <GameFilter
            clips={clipsData}
            selectedGameId={selectedGameId}
            onGameSelect={setSelectedGameId}
          />
        )}
      </div>

      {/* Clips Grid - 3 columns layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoadingClips ? (
          Array(9).fill(0).map((_, i) => (
            <div key={`skeleton-${i}`} className="space-y-3">
              <Skeleton className="aspect-video w-full rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))
        ) : filteredClips.length > 0 ? (
          filteredClips.map((clip) => (
            <VideoClipCard
              key={clip.id}
              clip={clip}
              userId={user?.id || undefined}
              clipsList={clipsData || []}
            />
          ))
        ) : clipsData && clipsData.length > 0 ? (
          <div className="col-span-full text-center py-12">
            <Video className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2" data-testid="text-no-clips-filtered">No clips found for this game</h3>
            <p className="text-muted-foreground mb-4">
              Try selecting a different game or view all clips
            </p>
            <Button onClick={() => setSelectedGameId(null)} data-testid="button-clear-filter">
              Clear Filter
            </Button>
          </div>
        ) : (
          <div className="col-span-full text-center py-12">
            <Video className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No clips yet</h3>
            <p className="text-muted-foreground mb-4">
              Be the first to upload a gaming clip!
            </p>
            <Button onClick={() => setLocation('/upload')} data-testid="button-upload-first-clip">
              Upload Your First Clip
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LatestClipsPage;