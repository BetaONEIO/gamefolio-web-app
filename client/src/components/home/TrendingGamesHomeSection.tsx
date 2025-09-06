import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";
import { useLocation } from "wouter";

interface TwitchGame {
  id: string;
  name: string;
  box_art_url: string;
  igdb_id?: string;
}

const TrendingGamesHomeSection = () => {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  // Get trending games from Twitch API - same as explore page
  const { 
    data: twitchTrendingGames, 
    isLoading: isLoadingGames
  } = useQuery<TwitchGame[]>({
    queryKey: ["/api/twitch/games/top"],
    queryFn: async () => {
      const response = await fetch("/api/twitch/games/top");
      if (!response.ok) {
        throw new Error('Failed to fetch trending games from Twitch');
      }
      return response.json();
    }
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const isHashtag = searchQuery.startsWith('#');
      if (isHashtag) {
        setLocation(`/hashtag/${encodeURIComponent(searchQuery.slice(1))}`);
      } else {
        setLocation(`/explore?q=${encodeURIComponent(searchQuery)}`);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h3 className="text-3xl font-bold text-foreground">Explore Games</h3>
        <p className="text-muted-foreground">Browse trending games and discover amazing clips from the community</p>
      </div>
      
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text" 
            placeholder="Search for a game..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 text-sm bg-card border-border"
          />
        </div>
      </form>



      {/* Large game cards section matching explore page */}
      <div className="mt-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {isLoadingGames ? (
            Array(10).fill(0).map((_, i) => (
              <div key={i} className="group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl bg-card/50 backdrop-blur-sm border border-border/50 hover:border-primary/30 rounded-lg overflow-hidden">
                <div className="p-0">
                  <div className="aspect-[3/4] relative overflow-hidden rounded-t-lg">
                    <Skeleton className="w-full h-full" />
                  </div>
                  <div className="p-4">
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              </div>
            ))
          ) : (
            twitchTrendingGames?.slice(0, 10).map((game) => (
              <div 
                key={game.id} 
                className="group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl bg-card/50 backdrop-blur-sm border border-border/50 hover:border-primary/30 rounded-lg overflow-hidden"
                onClick={() => {
                  // Convert game name to slug format (same as game-page.tsx)
                  const gameSlug = game.name.toLowerCase().replace(/[^a-z0-9]/g, '');
                  setLocation(`/games/${gameSlug}`);
                }}
              >
                <div className="p-0">
                  {/* Game Image */}
                  <div className="aspect-[3/4] relative overflow-hidden rounded-t-lg">
                    {game.box_art_url ? (
                      <img
                        src={game.box_art_url.replace('{width}', '285').replace('{height}', '380')}
                        alt={game.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "/api/placeholder/300x400?text=" + encodeURIComponent(game.name);
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        <span className="text-primary text-4xl font-bold">
                          {game.name.charAt(0)}
                        </span>
                      </div>
                    )}
                    
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <div className="bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-md">
                        View Clips
                      </div>
                    </div>
                  </div>

                  {/* Game Info */}
                  <div className="p-4">
                    <h3 className="font-semibold text-sm mb-2 line-clamp-2 min-h-[2.5rem] text-foreground group-hover:text-primary transition-colors">
                      {game.name}
                    </h3>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      Clips
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default TrendingGamesHomeSection;