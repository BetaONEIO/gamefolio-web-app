import { useQuery } from "@tanstack/react-query";
import VideoClipGridItem from "@/components/clips/VideoClipGridItem";
import { ClipWithUser } from "@shared/schema";
import { ChevronLeft } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function LatestReelsPage() {
  const { data: latestReels, isLoading } = useQuery<ClipWithUser[]>({
    queryKey: ['/api/reels/latest?limit=50'],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="w-full">
          <div className="flex items-center gap-4 mb-8">
            <Link href="/">
              <Button variant="ghost" size="sm" className="flex items-center gap-2">
                <ChevronLeft size={20} />
                Back to Home
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-white">Latest Reels</h1>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 md:gap-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-[9/16] bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="w-full">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm" className="flex items-center gap-2">
              <ChevronLeft size={20} />
              Back to Home
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-white">Latest Reels</h1>
          <span className="text-muted-foreground">
            {latestReels?.length || 0} reels
          </span>
        </div>

        {latestReels && latestReels.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 md:gap-6">
            {latestReels.map((reel) => (
              <VideoClipGridItem
                key={reel.id}
                clip={reel}
                compact={true}
                reelsList={latestReels}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📱</div>
            <h2 className="text-2xl font-semibold text-white mb-2">No Reels Yet</h2>
            <p className="text-muted-foreground mb-6">
              Be the first to share a reel on Gamefolio!
            </p>
            <Link href="/upload">
              <Button>Upload Your First Reel</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}