import { useQuery } from "@tanstack/react-query";
import { ClipWithUser } from "@shared/schema";
import { ChevronLeft, Eye } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useClipDialog } from "@/hooks/use-clip-dialog";
import { useMobile } from "@/hooks/use-mobile";
import { formatDuration } from "@/lib/constants";
import { useState } from "react";
import { GameFilter } from "@/components/filters/GameFilter";

export default function LatestReelsPage() {
  const [timePeriod, setTimePeriod] = useState<string>("recent");
  const { data: latestReels, isLoading } = useQuery<ClipWithUser[]>({
    queryKey: ['/api/reels/trending', timePeriod],
    queryFn: async () => {
      const response = await fetch(`/api/reels/trending?period=${timePeriod}&limit=50`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch reels');
      return response.json();
    },
  });
  const { openClipDialog } = useClipDialog();
  const isMobile = useMobile();
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);

  const filteredReels = latestReels
    ? selectedGameId
      ? latestReels.filter((reel) => reel.game?.id === selectedGameId)
      : latestReels
    : [];

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen bg-background p-4 md:p-6 ${isMobile ? 'pb-24' : ''}`}>
        <div className="w-full">
          <div className="flex flex-col gap-3 mb-6 md:flex-row md:items-center md:gap-4 md:mb-8">
            <Link href="/">
              <Button variant="ghost" size="sm" className="flex items-center gap-2 w-fit" data-testid="button-back-home">
                <ChevronLeft size={20} />
                Back to Home
              </Button>
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold text-white" data-testid="text-page-title">Latest Reels</h1>
          </div>
          
          <div className={isMobile ? "columns-2 gap-1" : "grid grid-cols-4 gap-4"}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className={isMobile ? "break-inside-avoid mb-1 aspect-[9/16]" : "aspect-[9/16]"}>
                <div className="w-full h-full bg-muted rounded-xl animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-background p-4 md:p-6 ${isMobile ? 'pb-24' : ''}`}>
      <div className="w-full">
        <div className="space-y-4 mb-6 md:mb-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="flex items-center gap-2 w-fit" data-testid="button-back-home">
                <ChevronLeft size={20} />
                Back to Home
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-bold text-white" data-testid="text-page-title">Latest Reels</h1>
              <span className="text-muted-foreground text-sm md:text-base" data-testid="text-reels-count">
                {filteredReels.length} reels
              </span>
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

            {latestReels && latestReels.length > 0 && (
              <GameFilter
                clips={latestReels}
                selectedGameId={selectedGameId}
                onGameSelect={setSelectedGameId}
              />
            )}
          </div>
        </div>

        {filteredReels.length > 0 ? (
          isMobile ? (
            <div className="columns-2 gap-1 space-y-1">
              {filteredReels.map((reel) => {
                return (
                  <div 
                    key={reel.id}
                    onClick={() => openClipDialog(reel.id, filteredReels)}
                    className="break-inside-avoid mb-1"
                  >
                    <div className="relative aspect-[9/16] w-full rounded-sm overflow-hidden cursor-pointer group">
                      <img
                        src={reel.thumbnailUrl || `/api/clips/${reel.id}/thumbnail`}
                        alt={reel.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "/placeholder-game.png";
                        }}
                      />
                      
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
                      
                      <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded font-semibold">
                        {(() => {
                          const actualDuration = reel.trimEnd && reel.trimEnd > 0 
                            ? reel.trimEnd - (reel.trimStart || 0)
                            : reel.duration || 0;
                          return formatDuration(actualDuration);
                        })()}
                      </div>
                      
                      <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded font-semibold flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {formatNumber(reel.views || 0)}
                      </div>
                      
                      <div className="absolute bottom-0 left-0 right-0 p-2">
                        <h3 className="text-white font-bold text-xs mb-0.5 drop-shadow-lg line-clamp-2">
                          {reel.title}
                        </h3>

                        <p className="text-white text-[10px] mb-1 drop-shadow-lg">
                          @{reel.user.username}
                        </p>

                        {reel.game && (
                          <div className="inline-block bg-primary text-white text-[9px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap max-w-full overflow-hidden text-ellipsis">
                            {reel.game.name}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-4 w-full">
              {filteredReels.map((reel) => (
                <div 
                  key={reel.id}
                  onClick={() => openClipDialog(reel.id, filteredReels)}
                  className="group relative bg-black rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer aspect-[9/16]"
                >
                  <div className="relative w-full h-full">
                    <img
                      src={reel.thumbnailUrl || `/api/clips/${reel.id}/thumbnail`}
                      alt={reel.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/placeholder-game.png";
                      }}
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="bg-primary backdrop-blur-sm rounded-full p-3">
                        <svg className="w-6 h-6 text-white fill-white" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      </div>
                    </div>

                    <div className="absolute top-3 left-3 bg-black/70 text-white text-xs px-2 py-1 rounded-md font-semibold">
                      {(() => {
                        const actualDuration = reel.trimEnd && reel.trimEnd > 0 
                          ? reel.trimEnd - (reel.trimStart || 0)
                          : reel.duration || 0;
                        return formatDuration(actualDuration);
                      })()}
                    </div>

                    <div className="absolute top-3 right-3 bg-black/70 text-white text-xs px-2 py-1 rounded-md font-semibold flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {formatNumber(reel.views || 0)}
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <h3 className="text-white font-bold text-sm mb-0.5 drop-shadow-lg line-clamp-2">
                        {reel.title}
                      </h3>

                      <p className="text-white text-xs mb-1.5 drop-shadow-lg">
                        @{reel.user.username}
                      </p>

                      {reel.game && (
                        <div className="inline-block bg-primary text-white text-[10px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap max-w-full overflow-hidden text-ellipsis">
                          {reel.game.name}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : latestReels && latestReels.length > 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎮</div>
            <h2 className="text-2xl font-semibold text-white mb-2" data-testid="text-no-reels-filtered">No reels found for this game</h2>
            <p className="text-muted-foreground mb-6">
              Try selecting a different game or view all reels
            </p>
            <Button onClick={() => setSelectedGameId(null)} data-testid="button-clear-filter">
              Clear Filter
            </Button>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📱</div>
            <h2 className="text-2xl font-semibold text-white mb-2">
              {timePeriod === '1d' ? 'No reels from today' : timePeriod === '1w' ? 'No reels from this week' : timePeriod === 'ever' ? 'No reels yet' : 'No Reels Yet'}
            </h2>
            <p className="text-muted-foreground mb-6">
              {timePeriod !== 'recent' ? 'Try selecting a different time period' : 'Be the first to share a reel on Gamefolio!'}
            </p>
            {timePeriod !== 'recent' ? (
              <Button onClick={() => setTimePeriod('recent')} data-testid="button-show-all">
                Show All Reels
              </Button>
            ) : (
              <Link href="/upload">
                <Button data-testid="button-upload-first-reel">Upload Your First Reel</Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
