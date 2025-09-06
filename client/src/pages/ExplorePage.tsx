import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import SearchResults from "@/components/explore/SearchResults";
import { Game } from "@shared/schema";
import { Search } from "lucide-react";

const ExplorePage = () => {
  const [location, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [queryParams, setQueryParams] = useState<{ q?: string; hashtag?: string; game?: string }>({});

  // Parse query parameters
  useEffect(() => {
    const params = new URLSearchParams(location.split("?")[1]);
    const q = params.get("q");
    const hashtag = params.get("hashtag");
    const game = params.get("game");
    
    if (q) {
      setSearchQuery(q);
      setQueryParams({ q });
    } else if (hashtag) {
      setSearchQuery(`#${hashtag}`);
      setQueryParams({ hashtag });
    } else if (game) {
      setQueryParams({ game });
    } else {
      setQueryParams({});
    }
  }, [location]);

  // Get trending games from Twitch API
  const { 
    data: trendingGames, 
    isLoading: isLoadingGames
  } = useQuery<Game[]>({
    queryKey: ["/api/twitch/games/top"],
    queryFn: async () => {
      const response = await fetch("/api/twitch/games/top?limit=20");
      if (!response.ok) {
        throw new Error('Failed to fetch trending games');
      }
      return response.json();
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const isHashtag = searchQuery.startsWith('#');
      if (isHashtag) {
        // Navigate directly to hashtag page
        const hashtag = searchQuery.slice(1); // Remove the # symbol
        setLocation(`/hashtag/${encodeURIComponent(hashtag)}`);
      } else {
        // Check if it's a game search first
        try {
          const response = await fetch(`/api/twitch/games/search?q=${encodeURIComponent(searchQuery)}`);
          if (response.ok) {
            const games = await response.json();
            if (games.length > 0) {
              // Navigate to the first matching game
              const game = games[0];
              const gameSlug = game.name.toLowerCase().replace(/[^a-z0-9]/g, '');
              setLocation(`/games/${gameSlug}`);
              return;
            }
          }
        } catch (error) {
          console.error('Game search error:', error);
        }
        
        // Fallback to general search
        setLocation(`/explore?q=${encodeURIComponent(searchQuery)}`);
      }
    }
  };

  // If we have search results, show them
  if (queryParams.q || queryParams.hashtag) {
    return (
      <div className="py-6 max-w-full w-full">
        <form onSubmit={handleSearch} className="mb-8 max-w-4xl mx-auto">
          <div className="flex gap-2">
            <Input
              type="text" 
              placeholder="Search #hashtags, users, or games"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
              <Search className="h-4 w-4" />
            </button>
          </div>
        </form>
        
        <div className="max-w-full">
          <SearchResults query={queryParams.q || `#${queryParams.hashtag}`} />
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 max-w-full w-full">
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Explore Games</h1>
        <p className="text-muted-foreground">Browse trending games and discover amazing clips from the community.</p>
      </div>

      {/* Search Bar */}
      <div className="mb-8 max-w-md">
        <form onSubmit={handleSearch} className="relative">
          <Input
            type="text"
            placeholder="Search for any game..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
            <Search className="h-4 w-4 text-muted-foreground" />
          </div>
        </form>
      </div>

      {/* Games Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {isLoadingGames ? (
          // Loading skeletons
          Array(10).fill(0).map((_, i) => (
            <div key={i} className="relative overflow-hidden rounded-lg bg-muted animate-pulse">
              <div className="aspect-[4/3] bg-muted-foreground/20" />
              <div className="absolute bottom-0 left-0 w-full p-3 bg-gradient-to-t from-black/80 to-transparent">
                <div className="h-4 bg-white/20 rounded mb-1" />
                <div className="h-3 bg-white/20 rounded w-12" />
              </div>
            </div>
          ))
        ) : (
          // Game cards
          trendingGames?.map((game) => (
            <div 
              key={game.id}
              className="relative overflow-hidden rounded-lg cursor-pointer hover:scale-105 transition-transform duration-200 group"
              onClick={() => {
                const gameSlug = game.name.toLowerCase().replace(/[^a-z0-9]/g, '');
                setLocation(`/games/${gameSlug}`);
              }}
            >
              <div className="aspect-[4/3] relative">
                <img
                  src={game.imageUrl || "/attached_assets/game-controller-5619105_1920.jpg"}
                  alt={game.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 w-full p-3">
                  <h3 className="text-white font-semibold text-sm mb-1 line-clamp-1">{game.name}</h3>
                  <p className="text-white/80 text-xs uppercase tracking-wide">CLIPS</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ExplorePage;