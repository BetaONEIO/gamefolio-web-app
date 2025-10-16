import { useQuery } from "@tanstack/react-query";
import { Star, Video, Camera } from "lucide-react";
import { Link } from "wouter";
import { ClipWithUser } from "@shared/schema";
import VideoClipGridItem from "@/components/clips/VideoClipGridItem";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";

interface RecommendedForYouProps {
  userId?: number;
}

const RecommendedForYou = ({ userId }: RecommendedForYouProps) => {
  const { user } = useAuth();
  const actualUserId = userId || user?.id;
  const [contentType, setContentType] = useState<'clips' | 'reels'>('clips');

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

  // Don't render if loading or no clips
  if (isLoading) {
    return (
      <section className="px-2 sm:px-4 md:px-6 mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4 sm:mb-6 md:mb-8">
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
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 md:gap-4">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className={contentType === 'reels' ? "aspect-[9/16] rounded-lg overflow-hidden" : "aspect-video rounded-lg overflow-hidden"}>
              <Skeleton className="w-full h-full" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!recommendedClips || recommendedClips.length === 0) {
    return null;
  }

  return (
    <section className="px-2 sm:px-4 md:px-6 mb-6 sm:mb-8" data-testid="recommended-for-you-section">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4 sm:mb-6 md:mb-8">
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

      {filteredContent.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 md:gap-4">
          {filteredContent.map((clip) => (
            <VideoClipGridItem 
              key={`recommended-clip-${clip.id}`}
              clip={clip}
              userId={actualUserId}
              data-testid={`clip-recommended-${clip.id}`}
              compact={contentType === 'clips'}
            />
          ))}
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