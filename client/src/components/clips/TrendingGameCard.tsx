import { useState } from "react";
import { Link } from "wouter";
import { Game } from "@shared/schema";

// Extended Game type to handle the Twitch API response
interface ExtendedGame extends Game {
  releaseDate?: string;
  rating?: number;
  ratingCount?: number;
  genres?: string;
  platforms?: string;
  slug?: string;
  box_art_url?: string; // Twitch API field for game box art
}
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface TrendingGameCardProps {
  game: ExtendedGame;
}

const TrendingGameCard = ({ game }: TrendingGameCardProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  // Use game ID or name for the URL depending on what's available
  const gameId = typeof game.id === 'number' ? game.id : 
                 typeof game.id === 'string' ? parseInt(game.id) : null;
  
  // Create a URL-safe slug from the game name for better SEO and UX
  const gameSlug = game.name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters but keep spaces
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  
  // Prepare the URL for the game using slug format
  const gameUrl = `/games/${gameSlug}`;
  
  // Default image as fallback
  const defaultImage = "/attached_assets/game-controller-5619105_1920.jpg";
  
  return (
    <Link href={gameUrl}>
      <Card className="group overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg">
        <div className="relative h-20 overflow-hidden bg-muted">
          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Skeleton className="w-full h-full" />
            </div>
          )}
          
          <img
            src={game.box_art_url || game.imageUrl || defaultImage}
            alt={game.name}
            className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${imageLoaded && !imageError ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImageLoaded(true)}
            onError={(e) => {
              setImageError(true);
              setImageLoaded(true);
              e.currentTarget.src = defaultImage;
            }}
          />
          
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          <div className="absolute bottom-0 left-0 w-full p-1 flex flex-col">
            <h3 className="text-xs font-medium text-white line-clamp-1">{game.name}</h3>
          </div>
        </div>
      </Card>
    </Link>
  );
};

export default TrendingGameCard;