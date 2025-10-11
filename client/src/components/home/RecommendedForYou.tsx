import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { Link } from "wouter";
import { ClipWithUser } from "@shared/schema";
import VideoClipGridItem from "@/components/clips/VideoClipGridItem";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";

interface RecommendedForYouProps {
  userId?: number;
}

const RecommendedForYou = ({ userId }: RecommendedForYouProps) => {
  const { user } = useAuth();
  const actualUserId = userId || user?.id;

  // Fetch recommended clips based on user's favorite games
  const { data: recommendedClips, isLoading } = useQuery<ClipWithUser[]>({
    queryKey: [`/api/recommended-clips`],
    enabled: !!actualUserId,
  });

  // Don't render if loading or no clips
  if (isLoading) {
    return (
      <section className="px-2 sm:px-4 md:px-6 mb-6 sm:mb-8">
        <div className="flex items-center gap-2 mb-4 sm:mb-6 md:mb-8">
          <Star className="h-5 w-5 text-primary" />
          <h2 className="text-xl sm:text-2xl font-bold">Recommended for You</h2>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array(4).fill(0).map((_, i) => (
            <Skeleton key={i} className="aspect-video rounded-lg" />
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
      <div className="flex items-center gap-2 mb-4 sm:mb-6 md:mb-8">
        <Star className="h-5 w-5 text-primary" />
        <h2 className="text-xl sm:text-2xl font-bold">Recommended for You</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {recommendedClips.slice(0, 4).map((clip) => (
          <VideoClipGridItem 
            key={`recommended-clip-${clip.id}`}
            clip={clip}
            userId={actualUserId}
            data-testid={`clip-recommended-${clip.id}`}
          />
        ))}
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