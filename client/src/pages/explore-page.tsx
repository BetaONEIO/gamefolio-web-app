import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Upload, Plus } from "lucide-react";
import TwitchGameSearch, { TwitchGame } from "@/components/games/TwitchGameSearch";
import SearchResults from "@/components/explore/SearchResults";

interface Game {
  id: string;
  name: string;
  box_art_url: string;
}

export default function ExplorePage() {
  const [location, setLocation] = useLocation();
  const [selectedGame, setSelectedGame] = useState<TwitchGame | null>(null);
  const [showNoClipsMessage, setShowNoClipsMessage] = useState(false);
  const [isCheckingClips, setIsCheckingClips] = useState(false);
  const [page, setPage] = useState(0);
  const [gamesPerPage] = useState(12);
  const [allLoadedGames, setAllLoadedGames] = useState<Game[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const loadingRef = useRef<HTMLDivElement>(null);
  
  // Check for search query in URL
  const urlParams = new URLSearchParams(window.location.search);
  const searchQuery = urlParams.get('q');
  
  // If there's a search query, show search results instead of explore
  if (searchQuery) {
    return <SearchResults query={searchQuery} />;
  }



  // Fetch games with pagination
  const { data: games, isLoading: isLoadingGames, error } = useQuery<Game[]>({
    queryKey: ["/api/twitch/games/top", page],
    queryFn: async () => {
      const offset = page * gamesPerPage;
      const response = await fetch(`/api/twitch/games/top?limit=${gamesPerPage}&offset=${offset}`);
      if (!response.ok) {
        throw new Error("Failed to fetch trending games");
      }
      return response.json();
    },
    enabled: hasMore,
  });



  // Update displayed games when new data arrives
  useEffect(() => {
    if (games && games.length > 0) {
      setAllLoadedGames(prev => {
        // Avoid duplicates
        const existingIds = new Set(prev.map(g => g.id));
        const newGames = games.filter(g => !existingIds.has(g.id));
        return [...prev, ...newGames];
      });

      // Check if we have more games to load
      if (games.length < gamesPerPage) {
        setHasMore(false);
      }
    } else if (games && games.length === 0 && page === 0) {
      setHasMore(false);
    }
  }, [games, gamesPerPage, page]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const currentLoadingRef = loadingRef.current;
    if (!currentLoadingRef || !hasMore || isLoadingGames) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingGames) {
          setPage(prev => prev + 1);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(currentLoadingRef);

    return () => {
      if (currentLoadingRef) {
        observer.unobserve(currentLoadingRef);
      }
    };
  }, [hasMore, isLoadingGames]);

  const handleGameClick = (gameId: string, gameName: string) => {
    const gameSlug = gameName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .replace(/^-+|-+$/g, '');
    setLocation(`/games/${gameSlug}`);
  };

  const handleGameSelect = async (game: TwitchGame) => {
    setSelectedGame(game);
    setIsCheckingClips(true);
    setShowNoClipsMessage(false);

    try {
      // Check if this game has clips
      const clipsResponse = await fetch(`/api/games/${game.id}/clips`);

      if (clipsResponse.ok) {
        const clips = await clipsResponse.json();

        if (clips.length === 0) {
          setShowNoClipsMessage(true);
          // Add the searched game to the trending games list if not already present
          setAllLoadedGames(prev => {
            const existingIds = new Set(prev.map(g => g.id));
            if (!existingIds.has(game.id)) {
              const gameToAdd: Game = {
                id: game.id,
                name: game.name,
                box_art_url: game.box_art_url
              };
              return [gameToAdd, ...prev];
            }
            return prev;
          });
        } else {
          // Navigate to the game's clips page
          setLocation(`/games/${game.id}/clips`);
        }
      } else {
        // If the API returns 404, it means the game doesn't exist in our database yet
        setShowNoClipsMessage(true);
        // Add the searched game to the trending games list
        setAllLoadedGames(prev => {
          const existingIds = new Set(prev.map(g => g.id));
          if (!existingIds.has(game.id)) {
            const gameToAdd: Game = {
              id: game.id,
              name: game.name,
              box_art_url: game.box_art_url
            };
            return [gameToAdd, ...prev];
          }
          return prev;
        });
      }
    } catch (error) {
      console.error("Failed to check clips for game:", error);
      setShowNoClipsMessage(true);
      // Add the searched game to the trending games list even on error
      setAllLoadedGames(prev => {
        const existingIds = new Set(prev.map(g => g.id));
        if (!existingIds.has(game.id)) {
          const gameToAdd: Game = {
            id: game.id,
            name: game.name,
            box_art_url: game.box_art_url
          };
          return [gameToAdd, ...prev];
        }
        return prev;
      });
    } finally {
      setIsCheckingClips(false);
    }
  };

  const handleUploadClick = () => {
    setLocation("/upload");
  };

  if (isLoadingGames && page === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading trending games...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">Failed to load trending games</p>
          <p className="text-muted-foreground">Please try again later</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Explore Games</h1>
          <p className="text-muted-foreground text-lg mb-6">
            Browse trending games and discover amazing clips from the community
          </p>

          {/* Game Search Dropdown */}
          <div className="max-w-md">
            <TwitchGameSearch
              onSelectGame={handleGameSelect}
              selectedGame={selectedGame}
              placeholder="Search for any game..."
            />
            {isCheckingClips && (
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Checking for clips...</span>
              </div>
            )}
          </div>
        </div>

        {/* No Clips Message */}
        {showNoClipsMessage && selectedGame && (
          <div className="mb-8 p-6 bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">
                  No clips found for "{selectedGame.name}"
                </h3>
                <p className="text-muted-foreground mb-4">
                  Hey! There are currently no clips for this game, but why not add your own?
                </p>
                <Button 
                  onClick={handleUploadClick}
                  className="inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Upload
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Games Grid */}
        <div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 pb-8">
            {allLoadedGames.map((game) => (
              <Card
                key={game.id}
                className="group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/30"
                onClick={() => handleGameClick(game.id, game.name)}
              >
                <CardContent className="p-0">
                  {/* Game Image */}
                  <div className="aspect-[3/4] relative overflow-hidden rounded-t-lg">
                    {game.box_art_url ? (
                      <img
                        src={game.box_art_url.replace('{width}x{height}', '285x380')}
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
                      <Badge className="bg-primary text-primary-foreground font-semibold px-4 py-2">
                        View Clips
                      </Badge>
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
                </CardContent>
              </Card>
            ))}

            {/* Empty State */}
            {allLoadedGames.length === 0 && !isLoadingGames && (
              <div className="col-span-full text-center py-16">
                <p className="text-muted-foreground text-lg">No games found</p>
                <p className="text-muted-foreground">Try refreshing the page</p>
              </div>
            )}
          </div>

          {/* Loading trigger for infinite scroll */}
          {hasMore && (
            <div ref={loadingRef} className="flex justify-center py-8">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Loading more games...</span>
              </div>
            </div>
          )}

          {/* End of Results */}
          {!hasMore && allLoadedGames.length > 0 && (
            <div className="flex justify-center py-8">
              <div className="text-center">
                <p className="text-muted-foreground text-sm mb-2">You've reached the end of trending games</p>
                <p className="text-xs text-muted-foreground">Showing all {allLoadedGames.length} games</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}