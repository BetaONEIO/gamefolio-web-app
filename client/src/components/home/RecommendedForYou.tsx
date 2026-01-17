import { useQuery } from "@tanstack/react-query";
import { Star, Video, Camera, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { ClipWithUser } from "@shared/schema";
import VideoClipGridItem from "@/components/clips/VideoClipGridItem";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useRef, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";

interface RecommendedForYouProps {
  userId?: number;
}

const RecommendedForYou = ({ userId }: RecommendedForYouProps) => {
  const { user } = useAuth();
  const actualUserId = userId || user?.id;
  const containerRef = useRef<HTMLDivElement>(null);
  const [contentType, setContentType] = useState<'clips' | 'reels'>('clips');
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Fetch recommended clips based on user's favorite games
  const { data: recommendedClips, isLoading } = useQuery<ClipWithUser[]>({
    queryKey: [`/api/recommended-clips`],
    enabled: !!actualUserId,
  });

  // Filter clips based on selected content type
  const filteredContent = useMemo(() => {
    if (!recommendedClips) return [];
    
    if (contentType === 'reels') {
      return recommendedClips.filter(clip => clip.videoType === 'reel');
    } else {
      return recommendedClips.filter(clip => clip.videoType !== 'reel');
    }
  }, [recommendedClips, contentType]);

  // Check scroll position and update arrow states
  const updateScrollState = () => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const isAtStart = container.scrollLeft <= 0;
    const isAtEnd = container.scrollLeft + container.clientWidth >= container.scrollWidth - 10;
    setCanScrollLeft(!isAtStart);
    setCanScrollRight(!isAtEnd);
  };

  // Update scroll state on mount and when content changes
  useEffect(() => {
    updateScrollState();
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', updateScrollState);
      return () => container.removeEventListener('scroll', updateScrollState);
    }
  }, [filteredContent]);

  // Scroll function for arrow navigation
  const scroll = (direction: 'left' | 'right') => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const itemWidth = contentType === 'reels' ? 180 : 420; // Width based on content type
    const scrollAmount = itemWidth * 2; // Scroll by 2 items
    
    if (direction === 'left') {
      container.scrollLeft -= scrollAmount;
    } else {
      container.scrollLeft += scrollAmount;
    }
  };

  // Don't render if loading or no clips
  if (isLoading) {
    return (
      <section className="px-2 sm:px-4 md:px-6 mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-2">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-primary flex-shrink-0" />
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold">Recommended for You</h2>
          </div>
          
          {/* Toggle between clips and reels */}
          <div className="flex gap-2">
            <Button
              variant={contentType === 'clips' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setContentType('clips')}
              className="flex items-center gap-1.5"
              data-testid="button-clips-toggle"
            >
              <Video className="h-4 w-4" />
              <span className="hidden xs:inline">Clips</span>
              <span className="xs:hidden">Clips</span>
            </Button>
            <Button
              variant={contentType === 'reels' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setContentType('reels')}
              className="flex items-center gap-1.5"
              data-testid="button-reels-toggle"
            >
              <Camera className="h-4 w-4" />
              <span className="hidden xs:inline">Reels</span>
              <span className="xs:hidden">Reels</span>
            </Button>
          </div>
        </div>
        <div className="border-b border-border/50 mb-4 sm:mb-6 md:mb-8" />
        
        <div className="relative">
          <div className="flex gap-3 md:gap-4 overflow-x-auto scrollbar-hide pb-4 px-2 sm:px-8">
            {Array(6).fill(0).map((_, i) => (
              <div 
                key={i}
                className={contentType === 'reels'
                  ? "w-36 sm:w-40 lg:w-44 xl:w-48 flex-shrink-0"
                  : "w-72 sm:w-80 lg:w-96 xl:w-[420px] 2xl:w-[480px] flex-shrink-0"
                }
              >
                <Skeleton className={contentType === 'reels' ? "aspect-[9/16] rounded-lg" : "aspect-video rounded-lg"} />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!recommendedClips || recommendedClips.length === 0) {
    return null;
  }

  return (
    <section className="px-2 sm:px-4 md:px-6 mb-6 sm:mb-8" data-testid="recommended-for-you-section">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-2">
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 text-primary flex-shrink-0" />
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold">Recommended for You</h2>
        </div>
        
        {/* Toggle between clips and reels */}
        <div className="flex gap-2">
          <Button
            variant={contentType === 'clips' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setContentType('clips')}
            className="flex items-center gap-1.5"
            data-testid="button-clips-toggle"
          >
            <Video className="h-4 w-4" />
            <span className="hidden xs:inline">Clips</span>
            <span className="xs:hidden">Clips</span>
          </Button>
          <Button
            variant={contentType === 'reels' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setContentType('reels')}
            className="flex items-center gap-1.5"
            data-testid="button-reels-toggle"
          >
            <Camera className="h-4 w-4" />
            <span className="hidden xs:inline">Reels</span>
            <span className="xs:hidden">Reels</span>
          </Button>
        </div>
      </div>
      <div className="border-b border-border/50 mb-4 sm:mb-6 md:mb-8" />

      {filteredContent.length > 0 ? (
        <div className="relative">
          {/* Navigation Arrows */}
          <button
            onClick={() => canScrollLeft && scroll('left')}
            className={`absolute left-2 top-1/2 -translate-y-1/2 z-10 text-white p-2 rounded-full transition-all hidden sm:block ${
              canScrollLeft 
                ? 'bg-black/50 hover:bg-black/70 cursor-pointer' 
                : 'bg-black/20 cursor-not-allowed opacity-40'
            }`}
            disabled={!canScrollLeft}
            data-testid="button-recommended-scroll-left"
          >
            <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          
          <button
            onClick={() => canScrollRight && scroll('right')}
            className={`absolute right-2 top-1/2 -translate-y-1/2 z-10 text-white p-2 rounded-full transition-all hidden sm:block ${
              canScrollRight 
                ? 'bg-black/50 hover:bg-black/70 cursor-pointer' 
                : 'bg-black/20 cursor-not-allowed opacity-40'
            }`}
            disabled={!canScrollRight}
            data-testid="button-recommended-scroll-right"
          >
            <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>

          {/* Carousel Container */}
          <div 
            ref={containerRef}
            className="flex gap-3 md:gap-4 overflow-x-auto scrollbar-hide pb-4 px-2 sm:px-8"
            style={{ scrollBehavior: 'smooth' }}
          >
            {filteredContent.map((clip) => (
              <div 
                key={`recommended-clip-${clip.id}`}
                className={contentType === 'reels'
                  ? "w-36 sm:w-40 lg:w-44 xl:w-48 flex-shrink-0"
                  : "w-72 sm:w-80 lg:w-96 xl:w-[420px] 2xl:w-[480px] flex-shrink-0"
                }
              >
                <VideoClipGridItem 
                  clip={clip}
                  userId={actualUserId}
                  data-testid={`clip-recommended-${clip.id}`}
                  compact={contentType === 'clips'}
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 sm:py-12 bg-card/50 rounded-xl border border-border/50 mx-2">
          <Star className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
          <h3 className="text-base sm:text-lg font-semibold mb-2">
            No {contentType} recommendations yet
          </h3>
          <p className="text-sm sm:text-base text-muted-foreground mb-4 px-4">
            Add some favorite games to your profile to get personalized recommendations!
          </p>
          <Link href="/profile" className="text-primary text-sm font-medium hover:underline">
            Manage favorite games
          </Link>
        </div>
      )}
    </section>
  );
};

export default RecommendedForYou;