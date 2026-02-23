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
            src={game.isUserAdded ? '/favicon.png' : (game.box_art_url || game.imageUrl || defaultImage)}
            alt={game.name}
            className={`w-full h-full transition-transform duration-300 group-hover:scale-105 ${game.isUserAdded ? 'object-contain p-3 bg-muted' : 'object-cover'} ${imageLoaded && !imageError ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImageLoaded(true)}
            onError={(e) => {
              setImageError(true);
              setImageLoaded(true);
              e.currentTarget.src = '/favicon.png';
            }}
          />
          
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          <div className="absolute bottom-0 left-0 w-full p-1 flex flex-col">
            <h3 className="text-xs font-medium text-white line-clamp-1">{game.name}</h3>
            
            <div className="flex items-center gap-x-1">
              {game.releaseDate && (
                <span className="text-[9px] text-white/70">
                  {new Date(game.releaseDate).getFullYear()}
                </span>
              )}
              
              {game.rating && game.rating > 0 && (
                <div className="flex items-center">
                  <svg className="w-2 h-2 text-yellow-400 mr-0.5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                  </svg>
                  <span className="text-[9px] text-white/70">{game.rating.toFixed(1)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
};

export default TrendingGameCard;