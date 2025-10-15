import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { Link } from "wouter";
import { ClipWithUser } from "@shared/schema";
import VideoClipGridItem from "@/components/clips/VideoClipGridItem";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useRef } from "react";

interface RecommendedForYouProps {
  userId?: number;
}

const RecommendedForYou = ({ userId }: RecommendedForYouProps) => {
  const { user } = useAuth();
  const actualUserId = userId || user?.id;
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch recommended clips based on user's favorite games
  const { data: recommendedClips, isLoading } = useQuery<ClipWithUser[]>({
    queryKey: [`/api/recommended-clips`],
    enabled: !!actualUserId,
  });

  // Grab scroll behavior for recommended clips
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let isDown = false;
    let startX: number;
    let scrollLeft: number;

    const handleMouseDown = (e: MouseEvent) => {
      // Only enable drag if clicking on the container itself, not on video items
      if ((e.target as HTMLElement).closest('[data-testid*="clip-recommended-"]')) {
        return;
      }
      isDown = true;
      startX = e.pageX - container.offsetLeft;
      scrollLeft = container.scrollLeft;
      container.style.cursor = 'grabbing';
      container.style.userSelect = 'none';
    };

    const handleMouseLeave = () => {
      isDown = false;
      container.style.cursor = 'grab';
      container.style.userSelect = 'auto';
    };

    const handleMouseUp = () => {
      isDown = false;
      container.style.cursor = 'grab';
      container.style.userSelect = 'auto';
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - container.offsetLeft;
      const walk = (x - startX) * 2; // Scroll speed
      container.scrollLeft = scrollLeft - walk;
    };

    container.style.cursor = 'grab';
    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('mouseleave', handleMouseLeave);
    container.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('mousemove', handleMouseMove);

    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('mouseleave', handleMouseLeave);
      container.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // Don't render if loading or no clips
  if (isLoading) {
    return (
      <section className="px-2 sm:px-4 md:px-6 mb-6 sm:mb-8">
        <div className="flex items-center gap-2 mb-4 sm:mb-6 md:mb-8">
          <Star className="h-5 w-5 text-primary" />
          <h2 className="text-xl sm:text-2xl font-bold">Recommended for You</h2>
        </div>
        
        <div className="overflow-x-auto pb-2 -mx-2 sm:-mx-4 md:-mx-6 px-2 sm:px-4 md:px-6" style={{ scrollbarWidth: 'thin' }}>
          <div className="flex gap-3 sm:gap-4" style={{ minWidth: "100%", width: "max-content" }}>
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="w-[180px] sm:w-[220px] md:w-[260px] flex-shrink-0">
                <Skeleton className="aspect-video rounded-lg" />
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
      <div className="flex items-center gap-2 mb-4 sm:mb-6 md:mb-8">
        <Star className="h-5 w-5 text-primary" />
        <h2 className="text-xl sm:text-2xl font-bold">Recommended for You</h2>
      </div>

      <div className="overflow-x-auto pb-2 -mx-2 sm:-mx-4 md:-mx-6 px-2 sm:px-4 md:px-6" ref={containerRef} style={{ scrollbarWidth: 'thin' }}>
        <div className="flex gap-3 sm:gap-4" style={{ minWidth: "100%", width: "max-content" }}>
          {recommendedClips.map((clip) => (
            <div key={`recommended-clip-${clip.id}`} className="w-[180px] sm:w-[220px] md:w-[260px] flex-shrink-0">
              <VideoClipGridItem 
                clip={clip}
                userId={actualUserId}
                data-testid={`clip-recommended-${clip.id}`}
                compact={true}
              />
            </div>
          ))}
        </div>
      </div>

      {recommendedClips.length === 0 && (
        <div className="text-center py-8 sm:py-12 bg-card/50 rounded-xl border border-border/50 mx-2">
          <Star className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
          <h3 className="text-base sm:text-lg font-semibold mb-2">No recommendations yet</h3>
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