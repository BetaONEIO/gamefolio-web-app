import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScreenshotCard } from "@/components/screenshots/ScreenshotCard";
import { ScreenshotLightbox } from "@/components/screenshots/ScreenshotLightbox";
import { ArrowLeft, Camera } from "lucide-react";
import { Gamepad2 } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { useMobile } from "@/hooks/use-mobile";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const LatestScreenshotsPage = () => {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);
  const [selectedScreenshot, setSelectedScreenshot] = useState<any>(null);
  const [timePeriod, setTimePeriod] = useState<string>("recent");
  const isMobile = useMobile();

  const { data: screenshotsData, isLoading } = useQuery<any[]>({
    queryKey: ['/api/screenshots', timePeriod, 50],
    queryFn: async () => {
      const response = await fetch(`/api/screenshots?period=${timePeriod}&limit=50`);
      if (!response.ok) throw new Error('Failed to fetch screenshots');
      return response.json();
    },
  });

  const uniqueGames = (screenshotsData || []).reduce<{ id: number; name: string }[]>((acc: { id: number; name: string }[], s: any) => {
    if (s.game && s.game.id && !acc.find((g: { id: number }) => g.id === s.game.id)) {
      acc.push({ id: s.game.id, name: s.game.name });
    }
    return acc;
  }, []).sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name));

  const filteredScreenshots = screenshotsData
    ? selectedGameId
      ? screenshotsData.filter((s: any) => s.game?.id === selectedGameId)
      : screenshotsData
    : [];

  return (
    <div className={`container mx-auto px-4 py-6 space-y-6 overflow-x-hidden ${isMobile ? 'pb-24' : ''}`}>
      <div className="space-y-4 mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation('/')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Latest Screenshots</h1>
            <p className="text-muted-foreground">
              Discover the newest gaming screenshots from the community
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
            {[
              { value: 'recent', label: 'Most Recent' },
              { value: '1d', label: '1D' },
              { value: '1w', label: '1W' },
              { value: 'ever', label: 'Ever' },
            ].map((period) => (
              <button
                key={period.value}
                onClick={() => setTimePeriod(period.value)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  timePeriod === period.value
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>

          {screenshotsData && screenshotsData.length > 0 && uniqueGames.length > 0 && (
            <div className="flex items-center gap-2">
              <Gamepad2 className="h-5 w-5 text-muted-foreground" />
              <Select
                value={selectedGameId?.toString() || "all"}
                onValueChange={(value) => {
                  if (value === "all") {
                    setSelectedGameId(null);
                  } else {
                    setSelectedGameId(parseInt(value));
                  }
                }}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Games" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    All Games ({screenshotsData.length})
                  </SelectItem>
                  {uniqueGames.map((game: any) => {
                    const count = screenshotsData.filter((s: any) => s.game?.id === game.id).length;
                    return (
                      <SelectItem key={game.id} value={game.id.toString()}>
                        {game.name} ({count})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array(9).fill(0).map((_, i) => (
            <div key={`skeleton-${i}`} className="space-y-3">
              <Skeleton className="aspect-video w-full rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))
        ) : filteredScreenshots.length > 0 ? (
          filteredScreenshots.map((screenshot: any) => (
            <ScreenshotCard
              key={screenshot.id}
              screenshot={screenshot}
              profile={screenshot.user || {}}
              showUserInfo={true}
              onSelect={(s: any) => setSelectedScreenshot(s)}
            />
          ))
        ) : screenshotsData && screenshotsData.length > 0 ? (
          <div className="col-span-full text-center py-12">
            <Camera className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No screenshots found for this game</h3>
            <p className="text-muted-foreground mb-4">
              Try selecting a different game or view all screenshots
            </p>
            <Button onClick={() => setSelectedGameId(null)}>
              Clear Filter
            </Button>
          </div>
        ) : (
          <div className="col-span-full text-center py-12">
            <Camera className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              {timePeriod === '1d' ? 'No screenshots from today' : timePeriod === '1w' ? 'No screenshots from this week' : timePeriod === 'ever' ? 'No screenshots yet' : 'No screenshots yet'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {timePeriod !== 'recent' ? 'Try selecting a different time period' : 'Be the first to upload a gaming screenshot!'}
            </p>
            {timePeriod !== 'recent' ? (
              <Button onClick={() => setTimePeriod('recent')}>
                Show All Screenshots
              </Button>
            ) : (
              <Button onClick={() => setLocation('/upload/screenshots')}>
                Upload Your First Screenshot
              </Button>
            )}
          </div>
        )}
      </div>

      <ScreenshotLightbox
        screenshot={selectedScreenshot}
        onClose={() => setSelectedScreenshot(null)}
        currentUserId={user?.id}
        screenshots={filteredScreenshots}
        onNavigate={(s: any) => setSelectedScreenshot(s)}
      />
    </div>
  );
};

export default LatestScreenshotsPage;
