import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Search, Plus, Loader2, Heart, X, Check } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// TwitchGame interface
interface TwitchGame {
  id: string;
  name: string;
  box_art_url: string;
}

interface GameSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  username?: string;
  existingFavorites?: { id: number; name: string }[];
}

// Component to display trending games in a grid
function TrendingGamesGrid({ onSelectGame, existingFavorites }: { 
  onSelectGame: (game: TwitchGame) => void;
  existingFavorites: { id: number; name: string }[];
}) {
  const { data: trendingGames, isLoading } = useQuery<TwitchGame[]>({
    queryKey: ["/api/twitch/games/top"],
    queryFn: async () => {
      const response = await fetch("/api/twitch/games/top?limit=20");
      if (!response.ok) throw new Error("Failed to fetch trending games");
      return await response.json();
    }
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array(20).fill(0).map((_, index) => (
          <div key={index} className="flex flex-col items-center">
            <Skeleton className="h-24 w-24 rounded-lg mb-2" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (!trendingGames || trendingGames.length === 0) {
    return (
      <div className="text-center py-6 border border-dashed border-gray-700 rounded-md">
        <p className="text-gray-400">Could not load trending games</p>
        <p className="text-sm text-gray-500 mt-1">Please try searching for games instead</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {trendingGames.map((game) => {
        const isAlreadyFavorite = existingFavorites.some(fav => fav.name === game.name);
        return (
          <button
            key={game.id}
            onClick={() => onSelectGame(game)}
            disabled={isAlreadyFavorite}
            className={`group flex flex-col items-center p-2 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 ${
              isAlreadyFavorite 
                ? "opacity-50 cursor-not-allowed" 
                : "hover:bg-primary/20"
            }`}
          >
            <div className="relative h-20 w-20 mb-2 overflow-hidden rounded-md">
              <img
                src={game.box_art_url}
                alt={game.name}
                className="h-full w-full object-cover transition-transform group-hover:scale-110"
                onError={(e) => {
                  console.warn(`Failed to load thumbnail for ${game.name}:`, game.box_art_url);
                  e.currentTarget.style.display = 'none';
                  // Create a fallback div with game name
                  const fallback = document.createElement('div');
                  fallback.className = 'h-full w-full bg-muted flex items-center justify-center text-xs text-muted-foreground';
                  fallback.textContent = game.name.substring(0, 3).toUpperCase();
                  e.currentTarget.parentNode?.appendChild(fallback);
                }}
                loading="lazy"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                {isAlreadyFavorite ? (
                  <Check className="h-8 w-8 text-primary" />
                ) : (
                  <Plus className="h-8 w-8 text-white" />
                )}
              </div>
            </div>
            <span className="text-xs text-center text-gray-300 line-clamp-2 group-hover:text-primary transition-colors">
              {game.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// Search results component
function SearchResults({ 
  searchQuery, 
  onSelectGame,
  existingFavorites 
}: { 
  searchQuery: string;
  onSelectGame: (game: TwitchGame) => void;
  existingFavorites: { id: number; name: string }[];
}) {
  const { data: searchResults, isLoading } = useQuery<TwitchGame[]>({
    queryKey: ["/api/twitch/games/search", searchQuery],
    queryFn: async () => {
      const response = await fetch(`/api/twitch/games/search?q=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) throw new Error("Failed to search games");
      return await response.json();
    },
    enabled: searchQuery.length > 2,
  });

  if (searchQuery.length <= 2) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array(8).fill(0).map((_, index) => (
          <div key={index} className="flex flex-col items-center">
            <Skeleton className="h-20 w-20 rounded-lg mb-2" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (!searchResults || searchResults.length === 0) {
    return (
      <div className="text-center py-6 border border-dashed border-gray-700 rounded-md">
        <p className="text-gray-400">No games found for "{searchQuery}"</p>
        <p className="text-sm text-gray-500 mt-1">Try a different search term</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {searchResults.map((game) => {
        const isAlreadyFavorite = existingFavorites.some(fav => fav.name === game.name);
        return (
          <button
            key={game.id}
            onClick={() => onSelectGame(game)}
            disabled={isAlreadyFavorite}
            className={`group flex flex-col items-center p-2 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 ${
              isAlreadyFavorite 
                ? "opacity-50 cursor-not-allowed" 
                : "hover:bg-primary/20"
            }`}
          >
          <div className="relative h-20 w-20 mb-2 overflow-hidden rounded-md">
            <img
              src={game.box_art_url ? game.box_art_url.replace('{width}', '200').replace('{height}', '200') : "https://placehold.co/80x80?text=Game"}
              alt={game.name}
              className="h-full w-full object-cover transition-transform group-hover:scale-110"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://placehold.co/80x80?text=Game";
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
              {isAlreadyFavorite ? (
                <Check className="h-8 w-8 text-primary" />
              ) : (
                <Plus className="h-8 w-8 text-white" />
              )}
            </div>
          </div>
          <span className="text-xs text-center text-gray-300 line-clamp-2 group-hover:text-primary transition-colors">
            {game.name}
          </span>
        </button>
        );
      })}
    </div>
  );
}

export default function GameSelectionDialog({ isOpen, onClose, userId, username, existingFavorites = [] }: GameSelectionDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  // Add game to favorites mutation
  const addGameMutation = useMutation({
    mutationFn: async (game: TwitchGame) => {
      // Use the existing endpoint to add Twitch game
      const addResponse = await apiRequest("POST", "/api/twitch/games/add", {
        gameId: game.id
      });
      
      if (!addResponse.ok) {
        throw new Error("Failed to add game to database");
      }
      
      const gameData = await addResponse.json();
      
      // Add to user's favorites
      await apiRequest("POST", `/api/users/${userId}/favorites`, {
        gameId: gameData.id
      });
      
      return gameData;
    },
    onSuccess: () => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/games/favorites`] });
      queryClient.invalidateQueries({ queryKey: ["/api/user-game-favorites"] });
      
      // Also invalidate the profile page favorites query if username is provided
      if (username) {
        queryClient.invalidateQueries({ queryKey: [`/api/users/${username}/games/favorites`] });
      }
      
      toast({
        title: "Game added to favorites",
        description: "The game has been added to your favorites list",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add game",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const handleSelectGame = (game: TwitchGame) => {
    // Check if game is already in favorites
    const isAlreadyFavorite = existingFavorites.some(fav => fav.name === game.name);
    
    if (isAlreadyFavorite) {
      toast({
        title: "Game already in favorites",
        description: `${game.name} is already in your favorites list`,
        variant: "destructive",
      });
      return;
    }
    
    addGameMutation.mutate(game);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" />
            Add Games to Favorites
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search for games..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Content */}
          <div className="space-y-4">
            {searchQuery.length > 2 ? (
              <div>
                <h3 className="text-lg font-semibold mb-3">Search Results</h3>
                <SearchResults 
                  searchQuery={searchQuery} 
                  onSelectGame={handleSelectGame}
                  existingFavorites={existingFavorites}
                />
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-semibold mb-3">Trending Games</h3>
                <TrendingGamesGrid 
                  onSelectGame={handleSelectGame} 
                  existingFavorites={existingFavorites}
                />
              </div>
            )}
          </div>

          {/* Loading State */}
          {addGameMutation.isPending && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-sm text-muted-foreground">Adding game to favorites...</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}