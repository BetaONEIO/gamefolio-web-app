import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import VideoClipGridItem from "@/components/clips/VideoClipGridItem";
import { ArrowLeft, Video } from "lucide-react";
import { useLocation } from "wouter";
import { ClipWithUser } from "@shared/schema";
import { useEffect, useState } from "react";
import { GameFilterSheet } from "@/components/filters/GameFilterSheet";
import { useClipDialog } from "@/hooks/use-clip-dialog";

const LatestClipsPage = () => {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);
  const [selectedGameName, setSelectedGameName] = useState<string | null>(null);
  const [timePeriod, setTimePeriod] = useState<string>("recent");
  const { openClipDialog } = useClipDialog();

  useEffect(() => {
    window.scrollTo(0, 0);
    sessionStorage.setItem('clipNavContext', 'latest');
  }, []);

  const { data: clipsData, isLoading: isLoadingClips } = useQuery<ClipWithUser[]>({
    queryKey: ['/api/clips/latest', timePeriod],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '100' });
      if (timePeriod !== 'recent') params.set('period', timePeriod);
      const response = await fetch(`/api/clips/latest?${params}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch clips');
      return response.json();
    },
  });

  const filteredClips = clipsData
    ? selectedGameId
      ? clipsData.filter((clip) => clip.game?.id === selectedGameId)
      : clipsData
    : [];

  return (
    <div className="min-h-screen bg-background px-3 py-4 sm:px-4 sm:py-6 md:container md:mx-auto md:px-4 md:py-6">
      <div className="space-y-3 mb-5 sm:space-y-4 sm:mb-8">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation('/')}
            className="flex items-center gap-2 shrink-0"
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-xl sm:text-3xl font-bold" data-testid="text-page-title">Latest Clips</h1>
            <p className="text-muted-foreground text-xs sm:text-sm hidden sm:block">
              Discover the newest gaming clips from the community
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
            {[
              { value: 'recent', label: 'Recent' },
              { value: '1d', label: '1D' },
              { value: '1w', label: '1W' },
              { value: 'ever', label: 'Ever' },
            ].map((period) => (
              <button
                key={period.value}
                onClick={() => setTimePeriod(period.value)}
                className={`px-2.5 py-1 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                  timePeriod === period.value
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>

          {clipsData && clipsData.length > 0 && (
            <GameFilterSheet
              clips={clipsData}
              selectedGameId={selectedGameId}
              selectedGameName={selectedGameName}
              onGameSelect={(id, name) => { setSelectedGameId(id); setSelectedGameName(name); }}
              label="Clips"
            />
          )}
        </div>
      </div>

      {isLoadingClips ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 w-full">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-video bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredClips.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 w-full">
          {filteredClips.map((clip) => (
            <div
              key={clip.id}
              onClick={() => openClipDialog(clip.id, filteredClips)}
              className="cursor-pointer"
            >
              <VideoClipGridItem
                clip={clip}
                userId={user?.id}
                compact={false}
                clipsList={filteredClips}
              />
            </div>
          ))}
        </div>
      ) : clipsData && clipsData.length > 0 ? (
        <div className="text-center py-12">
          <Video className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2" data-testid="text-no-clips-filtered">No clips found for this game</h3>
          <p className="text-muted-foreground mb-4">Try selecting a different game or view all clips</p>
          <Button onClick={() => setSelectedGameId(null)} data-testid="button-clear-filter">Clear Filter</Button>
        </div>
      ) : (
        <div className="text-center py-12">
          <Video className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">
            {timePeriod === '1d' ? 'No clips from today' : timePeriod === '1w' ? 'No clips from this week' : timePeriod === 'ever' ? 'No clips yet' : 'No clips yet'}
          </h3>
          <p className="text-muted-foreground mb-4">
            {timePeriod !== 'recent' ? 'Try selecting a different time period' : 'Be the first to upload a gaming clip!'}
          </p>
          {timePeriod !== 'recent' ? (
            <Button onClick={() => setTimePeriod('recent')} data-testid="button-show-all">Show All Clips</Button>
          ) : (
            <Button onClick={() => setLocation('/upload')} data-testid="button-upload-first-clip">
              Upload Your First Clip
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default LatestClipsPage;
