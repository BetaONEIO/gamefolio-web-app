import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Game, User } from "@shared/schema";
import { CheckCircle2 } from "lucide-react";
import { CustomAvatar } from "@/components/ui/custom-avatar";

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
        '--avatar-border-color': user.avatarBorderColor || '#4ADE80' 
      } as any}
    >
      <div className="flex flex-col items-center text-center">
        {/* Avatar and Username */}
        <Link href={`/profile/${user.username}`} className="block">
          <CustomAvatar 
            user={user}
            size="xl"
            className="mb-3 hover:scale-105"
            borderIntensity="normal"
          />
        </Link>
        
        <div className="mb-3">
          <Link href={`/profile/${user.username}`} className="inline-flex items-center">
            <h3 className="text-lg font-semibold text-foreground hover:text-primary transition-colors duration-300">
              {user.username}
            </h3>
            {/* Show verified icon for specific users - in a real app this would be based on a DB field */}
            {(user.id === 1 || user.id === 2 || user.id === 4) && (
              <CheckCircle2 className="h-4 w-4 ml-1 text-primary fill-primary" />
            )}
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