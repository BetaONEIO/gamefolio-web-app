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
  const { data: latestReels, isLoading } = useQuery<ClipWithUser[]>({
    queryKey: ['/api/reels/latest?limit=50'],
  });
  const { openClipDialog } = useClipDialog();
  const isMobile = useMobile();
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);

  // Filter reels by selected game
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
      <div className="min-h-screen bg-background p-4 md:p-6">
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
    <div className="min-h-screen bg-background p-4 md:p-6">
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
          
          {/* Game Filter */}
          {latestReels && latestReels.length > 0 && (
            <GameFilter
              clips={latestReels}
              selectedGameId={selectedGameId}
              onGameSelect={setSelectedGameId}
            />
          )}
        </div>

        {filteredReels.length > 0 ? (
          isMobile ? (
            // Mobile: Instagram/TikTok style 2-column masonry grid using CSS columns
            <div className="columns-2 gap-1 space-y-1">
              {filteredReels.map((reel, index) => {
                const aspectRatios = ['aspect-[9/16]', 'aspect-[3/4]', 'aspect-[2/3]', 'aspect-[9/14]', 'aspect-[3/5]', 'aspect-[4/5]'];
                const aspectRatio = aspectRatios[index % aspectRatios.length];

                return (
                  <div 
                    key={reel.id}
                    onClick={() => openClipDialog(reel.id, filteredReels)}
                    className="break-inside-avoid mb-1"
                  >
                    <div className={`relative ${aspectRatio} w-full rounded-sm overflow-hidden cursor-pointer group`}>
                      {/* Thumbnail */}
                      <img
                        src={reel.thumbnailUrl || `/api/clips/${reel.id}/thumbnail`}
                        alt={reel.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "/placeholder-game.png";
                        }}
                      />
                      
                      {/* Subtle gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
                      
                      {/* Username - top left */}
                      <div className="absolute top-2 left-2 flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full overflow-hidden border border-white/50">
                          <img
                            src={reel.user.avatarUrl || '/uploaded_assets/gamefolio social logo 3d circle web.png'}
                            alt={reel.user.displayName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="text-white text-xs font-medium drop-shadow-lg">
                          {reel.user.displayName || reel.user.username}
                        </span>
                      </div>
                      
                      {/* View count and game - bottom left */}
                      <div className="absolute bottom-2 left-2 flex items-center gap-2 text-white text-xs font-medium drop-shadow-lg">
                        <div className="flex items-center gap-1">
                          <Eye className="h-4 w-4" />
                          <span>{formatNumber(reel.views || 0)}</span>
                        </div>
                        {reel.game && (
                          <div className="bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-full">
                            {reel.game.name}
                          </div>
                        )}
                      </div>
                      
                      {/* Title overlay - some reels show title */}
                      {index % 3 === 0 && (
                        <div className="absolute bottom-8 left-2 right-2">
                          <p className="text-white text-sm font-medium line-clamp-2 drop-shadow-lg">
                            {reel.title}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // Desktop: Grid with 4 columns
            <div className="grid grid-cols-4 gap-4 w-full">
              {filteredReels.map((reel) => (
                <div 
                  key={reel.id}
                  onClick={() => openClipDialog(reel.id, filteredReels)}
                  className="group relative bg-black rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer aspect-[9/16]"
                >
                  {/* Thumbnail/Video */}
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

                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

                    {/* Play button overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="bg-primary backdrop-blur-sm rounded-full p-3">
                        <svg className="w-6 h-6 text-white fill-white" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      </div>
                    </div>

                    {/* Duration badge */}
                    <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                      {(() => {
                        const actualDuration = reel.trimEnd && reel.trimEnd > 0 
                          ? reel.trimEnd - (reel.trimStart || 0)
                          : reel.duration || 0;
                        return formatDuration(actualDuration);
                      })()}
                    </div>

                    {/* Content overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      {/* User info */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white/50">
                          <img
                            src={reel.user.avatarUrl || '/uploaded_assets/gamefolio social logo 3d circle web.png'}
                            alt={reel.user.displayName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="text-white text-sm font-medium">
                          {reel.user.displayName || reel.user.username}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-white font-semibold text-sm mb-2 line-clamp-2 leading-tight">
                        {reel.title}
                      </h3>

                      {/* Stats and game */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-white/80 text-xs">
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {formatNumber(reel.views || 0)}
                          </span>
                          <span className="flex items-center gap-1">
                            ♥ {formatNumber(parseInt(reel._count?.likes?.toString() || '0'))}
                          </span>
                          <span className="flex items-center gap-1">
                            💬 {formatNumber(parseInt(reel._count?.comments?.toString() || '0'))}
                          </span>
                        </div>

                        {/* Game badge */}
                        {reel.game && (
                          <div className="bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">
                            {reel.game.name}
                          </div>
                        )}
                      </div>
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
            <h2 className="text-2xl font-semibold text-white mb-2">No Reels Yet</h2>
            <p className="text-muted-foreground mb-6">
              Be the first to share a reel on Gamefolio!
            </p>
            <Link href="/upload">
              <Button data-testid="button-upload-first-reel">Upload Your First Reel</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}