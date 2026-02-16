import { Link } from "wouter";
import { Game } from "@shared/schema";
import { cn } from "@/lib/utils";

interface TrendingGameItemProps {
  game: Game & { box_art_url?: string }; // Support Twitch API box art
  className?: string;
}

const TrendingGameItem = ({ game, className }: TrendingGameItemProps) => {
  return (
    <Link href={`/games/${game.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`}>
      <div className={cn(
        "relative overflow-hidden rounded-lg cursor-pointer transition-all duration-300 hover:shadow-lg group h-32 md:h-40",
        className
      )}>
        <img
          src={game.box_art_url || game.imageUrl || `/attached_assets/game-controller-5619105_1920.jpg`}
          alt={game.name}
          onError={(e) => {
            e.currentTarget.src = `/attached_assets/game-controller-5619105_1920.jpg`;
          }}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full p-3">
          <h3 className="text-white text-base md:text-lg font-medium">{game.name}</h3>
        </div>
      </div>
    </Link>
  );
};

export default TrendingGameItem;