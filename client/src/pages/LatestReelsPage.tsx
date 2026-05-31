import { useQuery } from "@tanstack/react-query";
import { ClipWithUser } from "@shared/schema";
import { BarChart2, ChevronLeft, Play } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useClipDialog } from "@/hooks/use-clip-dialog";
import { formatDuration } from "@/lib/constants";
import { useState, useEffect } from "react";
import { GameFilterSheet } from "@/components/filters/GameFilterSheet";
import { LazyImage } from "@/components/ui/lazy-image";

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
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);
  const [selectedGameName, setSelectedGameName] = useState<string | null>(null);

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

  return (
    <div className="min-h-screen bg-background px-3 py-4 sm:p-4 md:p-6">
      <div className="w-full">
        {/* Header */}
        <div className="space-y-3 mb-5 sm:space-y-4 sm:mb-8">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="sm" className="flex items-center gap-2 w-fit shrink-0" data-testid="button-back-home">
                <ChevronLeft size={18} />
                Back
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-3xl font-bold text-white" data-testid="text-page-title">Latest Reels</h1>
              {!isLoading && (
                <span className="text-muted-foreground text-xs sm:text-sm" data-testid="text-reels-count">
                  {filteredReels.length} reels
                </span>
              )}
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

            {latestReels && latestReels.length > 0 && (
              <GameFilterSheet
                clips={latestReels}
                selectedGameId={selectedGameId}
                selectedGameName={selectedGameName}
                onGameSelect={(id, name) => { setSelectedGameId(id); setSelectedGameName(name); }}
                label="Reels"
              />
            )}
          </div>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-[9/16]">
                <div className="w-full h-full bg-muted rounded-xl animate-pulse" />
              </div>
            ))}
          </div>
        ) : filteredReels.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 w-full">
            {filteredReels.map((reel) => (
              <div key={reel.id} className="flex flex-col gap-1.5">
                {/* Thumbnail card */}
                <div
                  onClick={() => openClipDialog(reel.id, filteredReels)}
                  className="group relative bg-black rounded-xl sm:rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer aspect-[9/16]"
                >
                  <div className="absolute inset-0 bg-gray-800" />
                  <LazyImage
                    src={reel.thumbnailUrl || `/api/clips/${reel.id}/thumbnail`}
                    alt={reel.title}
                    className="w-full h-full object-contain"
                    placeholder="data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='100'%20height='100'%3e%3crect%20width='100'%20height='100'%20fill='%231f2937'/%3e%3c/svg%3e"
                    showLoadingSpinner={true}
                    rootMargin="50px"
                    containerClassName="absolute inset-0"
                    fallback={
                      <div className="w-full h-full flex items-center justify-center bg-gray-800">
                        <Play className="h-8 w-8 sm:h-12 sm:w-12 text-gray-500" />
                      </div>
                    }
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/20" />

                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="bg-primary backdrop-blur-sm rounded-full p-2 sm:p-3">
                      <svg className="w-4 h-4 sm:w-6 sm:h-6 text-white fill-white" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                  </div>

                  <div className="absolute top-2 left-2 bg-black/70 text-white text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-md font-semibold">
                    {(() => {
                      const actualDuration = reel.trimEnd && reel.trimEnd > 0
                        ? reel.trimEnd - (reel.trimStart || 0)
                        : reel.duration || 0;
                      return formatDuration(actualDuration);
                    })()}
                  </div>

                  <div className="absolute top-2 right-2 bg-black/70 text-white text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-md font-semibold flex items-center gap-1">
                    <BarChart2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    {formatNumber(reel.views || 0)}
                  </div>
                </div>

                {/* Info below card */}
                <div className="px-0.5" onClick={(e) => e.stopPropagation()}>
                  <h3
                    className="text-white font-semibold text-xs sm:text-sm leading-tight line-clamp-2 cursor-pointer hover:text-primary transition-colors"
                    onClick={() => openClipDialog(reel.id, filteredReels)}
                  >
                    {reel.title}
                  </h3>
                  <p className="text-muted-foreground text-[10px] sm:text-xs mt-0.5">
                    @{reel.user.username}
                  </p>
                  {reel.game && (
                    <Link
                      href={`/games/${reel.game.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-block mt-1 bg-primary text-[#071013] text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap max-w-full overflow-hidden text-ellipsis hover:opacity-80 transition-opacity"
                    >
                      {reel.game.name}
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : latestReels && latestReels.length > 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">🎮</div>
            <h2 className="text-xl sm:text-2xl font-semibold text-white mb-2" data-testid="text-no-reels-filtered">No reels found for this game</h2>
            <p className="text-muted-foreground mb-6">Try selecting a different game or view all reels</p>
            <Button onClick={() => setSelectedGameId(null)} data-testid="button-clear-filter">Clear Filter</Button>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">📱</div>
            <h2 className="text-xl sm:text-2xl font-semibold text-white mb-2">
              {timePeriod === '1d' ? 'No reels from today' : timePeriod === '1w' ? 'No reels from this week' : timePeriod === 'ever' ? 'No reels yet' : 'No Reels Yet'}
            </h2>
            <p className="text-muted-foreground mb-6">
              {timePeriod !== 'recent' ? 'Try selecting a different time period' : 'Be the first to share a reel on Gamefolio!'}
            </p>
            {timePeriod !== 'recent' ? (
              <Button onClick={() => setTimePeriod('recent')} data-testid="button-show-all">Show All Reels</Button>
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
