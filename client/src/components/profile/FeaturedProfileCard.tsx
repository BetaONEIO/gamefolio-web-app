import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Game, User } from "@shared/schema";
import { CustomAvatar } from "@/components/ui/custom-avatar";
import { Trophy } from "lucide-react";

interface FeaturedProfileCardProps {
  user: User & { 
    favoriteGames?: Game[]; 
  };
}

const FeaturedProfileCard = ({ user }: FeaturedProfileCardProps) => {
  // Get only first 3 games to display
  const displayGames = user.favoriteGames?.slice(0, 3) || [];
  
  return (
    <div 
      className="rounded-xl bg-gradient-to-br from-primary/10 to-primary/20 border border-primary/30 p-4 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20 hover:border-primary/50 group"
      style={{ 
        '--avatar-border-color': user.avatarBorderColor || '#B7FF1A' 
      } as any}
    >
      <div className="flex flex-col items-center text-center">
        {/* Avatar and Username */}
        <Link href={`/profile/${user.username}`} className="block relative mb-3">
          <CustomAvatar 
            user={user}
            size="xl"
            className="hover:scale-105"
            borderIntensity="normal"
          />
          {/* Level Badge */}
          <div 
            className="absolute -bottom-2 -right-2 z-10 flex items-center justify-center rounded-full bg-yellow-500 text-black font-bold shadow-lg w-8 h-8 border-2 border-background"
            data-testid="level-badge"
          >
            <Trophy className="w-3 h-3 absolute top-1 left-1 text-yellow-700 opacity-30" />
            <span className="relative z-10 text-sm">{user.level || 1}</span>
          </div>
        </Link>
        
        <div className="mb-3">
          <Link href={`/profile/${user.username}`} className="inline-flex items-center">
            <h3 className="text-lg font-semibold text-foreground hover:text-primary transition-colors duration-300">
              {user.username}
            </h3>
          </Link>
        </div>
        
        {/* Bio */}
        {user.bio && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {user.bio}
          </p>
        )}
        
        {/* Favorite Games */}
        {displayGames.length > 0 && (
          <div className="flex flex-wrap gap-1 justify-center mt-2">
            {displayGames.map((game) => (
              <Badge key={game.id} variant="outline" className="bg-primary/10 hover:bg-primary/20 text-xs">
                {game.name}
              </Badge>
            ))}
            {user.favoriteGames && user.favoriteGames.length > 3 && (
              <Badge variant="outline" className="bg-primary/5 hover:bg-primary/10 text-xs">
                +{user.favoriteGames.length - 3} more
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FeaturedProfileCard;