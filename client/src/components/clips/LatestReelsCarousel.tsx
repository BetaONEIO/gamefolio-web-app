import { useState, useRef } from "react";
import { useLazyVideo } from "@/hooks/use-lazy-video";
import { Link } from "wouter";
import { ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { ClipWithUser } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { LazyImage } from "@/components/ui/lazy-image";
import { useClipDialog } from "@/hooks/use-clip-dialog";
import { formatNumber } from "@/lib/format";
import { ProfileHoverCard } from "@/components/ui/ProfileHoverCard";
import { formatDuration } from "@/lib/constants";

function LazyReelVideoThumbnail({ src, className }: { src: string | undefined; className: string }) {
  const { ref, visible } = useLazyVideo({ autoPlay: false });
  return (
    <video
      ref={ref}
      src={visible ? src : undefined}
      className={className}
      preload="none"
      muted
      playsInline
    />
  );
}

interface LatestReelsCarouselProps {
  reels: ClipWithUser[] | undefined;
  isLoading: boolean;
  userId?: number;
}

export function LatestReelsCarousel({ reels, isLoading, userId }: LatestReelsCarouselProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [scrollStart, setScrollStart] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { openClipDialog } = useClipDialog();

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;

    const container = scrollRef.current;
    const firstChild = container.firstElementChild as HTMLElement | null;
    const itemWidth = firstChild ? firstChild.offsetWidth + 16 : 240;
    const scrollAmount = itemWidth * 3;

    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setDragStart(e.clientX);
    setScrollStart(scrollRef.current.scrollLeft);
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const dragDistance = e.clientX - dragStart;
    scrollRef.current.scrollLeft = scrollStart - dragDistance;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  if (isLoading) {
    return (
      <div className="flex gap-3 md:gap-4 overflow-x-auto scrollbar-hide pb-4 px-2 sm:px-8">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="w-44 sm:w-52 lg:w-56 xl:w-60 flex-shrink-0">
            <Skeleton className="aspect-[9/16] rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  const reelsArray = Array.isArray(reels) ? reels : [];

  if (reelsArray.length === 0) {
    return (
      <div className="text-center py-8 sm:py-12 bg-card/50 rounded-xl border border-border/50 mx-2">
        <div className="text-3xl sm:text-4xl mb-3">📱</div>
        <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">No Reels Yet</h3>
        <p className="text-muted-foreground text-sm px-4">
          Be the first to share a reel!
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => scroll('left')}
        className="absolute -left-5 top-1/2 -translate-y-1/2 z-10 bg-black/70 hover:bg-black/90 text-white p-2.5 rounded-full transition-colors hidden sm:flex items-center justify-center shadow-lg"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <button
        onClick={() => scroll('right')}
        className="absolute -right-5 top-1/2 -translate-y-1/2 z-10 bg-black/70 hover:bg-black/90 text-white p-2.5 rounded-full transition-colors hidden sm:flex items-center justify-center shadow-lg"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      <div
        ref={scrollRef}
        className={`flex gap-3 md:gap-4 overflow-x-auto scrollbar-hide pb-4 px-2 sm:px-8 py-2 select-none ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        data-testid="reels-carousel-container"
      >
        {reelsArray.map((reel) => {
          const actualDuration = reel.trimEnd && reel.trimEnd > 0
            ? reel.trimEnd - (reel.trimStart || 0)
            : reel.duration || 0;

          return (
            <div
              key={`latest-reel-${reel.id}`}
              onClick={() => openClipDialog(reel.id, reelsArray, undefined, 'reel')}
              className="w-44 sm:w-52 lg:w-56 xl:w-60 flex-shrink-0 cursor-pointer group"
              data-testid={`reel-card-${reel.id}`}
            >
              {/* 9:16 thumbnail with duration + view pills */}
              <div className="relative aspect-[9/16] w-full overflow-hidden rounded-xl bg-black border border-white/5">
                {reel.thumbnailUrl ? (
                  <LazyImage
                    src={reel.thumbnailUrl}
                    alt={reel.title || 'Reel thumbnail'}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    showLoadingSpinner={true}
                    rootMargin="400px"
                    threshold={0.1}
                  />
                ) : (
                  <LazyReelVideoThumbnail
                    src={reel.videoUrl ?? undefined}
                    className="w-full h-full object-cover"
                  />
                )}

                {/* Duration pill — top left */}
                <div className="absolute top-2 left-2 bg-black/70 text-white text-[11px] px-2 py-0.5 rounded-md font-semibold">
                  {formatDuration(actualDuration)}
                </div>

                {/* View count pill — top right */}
                <div className="absolute top-2 right-2 bg-black/70 text-white text-[11px] px-2 py-0.5 rounded-md font-semibold flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {formatNumber(reel.views || 0)}
                </div>
              </div>

              {/* Meta — title / username / game tag UNDER the thumbnail */}
              <div className="pt-2 px-0.5">
                <h3 className="text-white font-bold text-sm line-clamp-1">
                  {reel.title}
                </h3>
                <ProfileHoverCard username={reel.user.username}>
                  <p
                    className="text-white/60 text-xs mt-0.5 cursor-default"
                    onClick={(e) => e.stopPropagation()}
                  >
                    @{reel.user.username}
                  </p>
                </ProfileHoverCard>
                {reel.game?.name && (
                  <Link
                    href={`/games/${reel.game.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span
                      className="inline-block mt-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded hover:opacity-90 transition-opacity"
                      style={{ background: '#B7FF1A', color: '#071013' }}
                    >
                      {reel.game.name}
                    </span>
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
