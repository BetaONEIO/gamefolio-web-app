import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Game, ClipWithUser } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import VideoClipGridItem from "./VideoClipGridItem";
import { ChevronRight } from "lucide-react";

interface GameClipsSectionProps {
  game: Game & { box_art_url?: string }; // Support Twitch API box art
  userId?: number;
}

const GameClipsSection = ({ game, userId }: GameClipsSectionProps) => {
  // Query clips for this specific game
  const { data: gameClips, isLoading } = useQuery<ClipWithUser[]>({
    queryKey: [`/api/games/${game.id}/clips`],
  });

  // Don't render this section if there are no clips for this game
  if (!isLoading && (!gameClips || gameClips.length === 0)) {
    return null;
  }

  return (
    <section className="mt-10">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <img 
            src={(game.box_art_url || game.imageUrl || "/attached_assets/game-controller-5619105_1920.jpg") as string} 
            alt={game.name || "Game"}
            loading="lazy"
            className="w-12 h-12 rounded-md object-cover border-2 border-primary"
            onError={(e) => {
              e.currentTarget.src = "/attached_assets/game-controller-5619105_1920.jpg";
            }}
          />
          <h2 className="text-2xl font-bold text-foreground border-b-4 border-primary pb-2">Latest {game.name} Clips</h2>
        </div>
        <Link 
          href={`/explore?game=${game.id}`} 
          className="text-primary text-sm font-medium hover:underline flex items-center"
        >
          View all <ChevronRight className="h-4 w-4 ml-1" />
        </Link>
      </div>

      {/* Grid of clips for this game - Ultra large thumbnails */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {isLoading ? (
          // Skeleton loaders while loading
          Array(2).fill(0).map((_, i) => (
            <div key={i} className="aspect-video rounded-lg overflow-hidden">
              <Skeleton className="w-full h-full" />
            </div>
          ))
        ) : (
          // Display up to 2 clips for this game but much larger
          gameClips?.slice(0, 2).map((clip) => (
            <VideoClipGridItem 
              key={clip.id} 
              clip={clip}
              userId={userId}
            />
          ))
        )}
      </div>
    </section>
  );
};

export default GameClipsSection;