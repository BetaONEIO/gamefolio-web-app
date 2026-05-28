import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Gamepad2 } from "lucide-react";
import SearchResults from "@/components/explore/SearchResults";
import { GamePickerSheet } from "@/components/clips/GamePickerSheet";
import { Game } from "@shared/schema";

interface TwitchGame {
  id: string;
  name: string;
  box_art_url: string;
}

export default function ExplorePage() {
  const [location, setLocation] = useLocation();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [page, setPage] = useState(0);
  const [gamesPerPage] = useState(12);
  const [allLoadedGames, setAllLoadedGames] = useState<TwitchGame[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isMobileView, setIsMobileView] = useState(false);
  const loadingRef = useRef<HTMLDivElement>(null);

  // Reactively read search query from URL — re-read on location changes
  const searchQuery = (() => {
    try {
      return new URLSearchParams(window.location.search).get("q") ?? "";
    } catch {
      return "";
    }
  })();

  // Keep mobile detection in a side effect (not during render)
  useEffect(() => {
    const check = () => setIsMobileView(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Fetch games with pagination — disabled when in search mode
  const { data: games, isLoading: isLoadingGames, error } = useQuery<TwitchGame[]>({
    queryKey: ["/api/twitch/games/top", page],
    queryFn: async () => {
      const offset = page * gamesPerPage;
      const response = await fetch(`/api/twitch/games/top?limit=${gamesPerPage}&offset=${offset}`);
      if (!response.ok) throw new Error("Failed to fetch trending games");
      return response.json();
    },
    enabled: !searchQuery && hasMore,
  });

  useEffect(() => {
    if (!searchQuery && games && games.length > 0) {
      setAllLoadedGames(prev => {
        const existingIds = new Set(prev.map(g => g.id));
        const newGames = games.filter(g => !existingIds.has(g.id));
        return [...prev, ...newGames];
      });
      if (games.length < gamesPerPage) setHasMore(false);
    } else if (!searchQuery && games && games.length === 0 && page === 0) {
      setHasMore(false);
    }
  }, [games, gamesPerPage, page, searchQuery]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (searchQuery) return;
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
    return () => { if (currentLoadingRef) observer.unobserve(currentLoadingRef); };
  }, [hasMore, isLoadingGames, searchQuery]);

  const navigateToGame = (gameName: string) => {
    const gameSlug = (gameName ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "-")
      .replace(/^-+|-+$/g, "");
    if (gameSlug) setLocation(`/games/${gameSlug}`);
  };

  const handleGameClick = (gameName: string) => navigateToGame(gameName);

  const handleGameSelect = (game: Game | null) => {
    setSelectedGame(game);
    if (game) navigateToGame(game.name);
  };

  // Show search results overlay when URL has ?q=
  if (searchQuery) {
    return <SearchResults query={searchQuery} />;
  }

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
    <div className={`bg-background ${isMobileView ? "pb-24" : ""}`}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Explore Games</h1>
          <p className="text-muted-foreground text-lg mb-6">
            Browse trending games and discover amazing clips from the community
          </p>

          {/* Game Search — opens the full-screen GamePickerSheet */}
          <div className="max-w-md">
            <button
              onClick={() => setPickerOpen(true)}
              className="w-full flex items-center gap-3 rounded-full px-4 py-3 text-left transition-colors"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: selectedGame ? "1.5px solid #B7FF1A" : "1.5px solid rgba(255,255,255,0.15)",
              }}
            >
              {selectedGame ? (
                <>
                  <Gamepad2 className="h-5 w-5 shrink-0" style={{ color: "#B7FF1A" }} />
                  <span className="flex-1 truncate font-medium" style={{ color: "#B7FF1A" }}>
                    {selectedGame.name}
                  </span>
                </>
              ) : (
                <>
                  <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <span className="flex-1 text-muted-foreground">Search for any game...</span>
                </>
              )}
              <Search className="h-4 w-4 shrink-0 text-muted-foreground opacity-50" />
            </button>
          </div>
        </div>

        {/* Games Grid */}
        <div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 pb-8">
            {allLoadedGames.map((game) => (
              <Card
                key={game.id}
                className="group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/30"
                onClick={() => handleGameClick(game.name)}
              >
                <CardContent className="p-0">
                  <div className="aspect-[3/4] relative overflow-hidden rounded-t-lg">
                    {game.box_art_url ? (
                      <img
                        src={game.box_art_url
                          .replace("{width}x{height}", "285x380")
                          .replace("{width}", "285")
                          .replace("{height}", "380")}
                        alt={game.name ?? "Game"}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        <span className="text-primary text-4xl font-bold">
                          {(game.name ?? "?").charAt(0)}
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <Badge className="bg-primary text-primary-foreground font-semibold px-4 py-2">
                        View Content
                      </Badge>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-sm line-clamp-2 min-h-[2.5rem] text-foreground group-hover:text-primary transition-colors">
                      {game.name ?? ""}
                    </h3>
                  </div>
                </CardContent>
              </Card>
            ))}

            {allLoadedGames.length === 0 && !isLoadingGames && (
              <div className="col-span-full text-center py-16">
                <p className="text-muted-foreground text-lg">No games found</p>
                <p className="text-muted-foreground">Try refreshing the page</p>
              </div>
            )}
          </div>

          {hasMore && (
            <div ref={loadingRef} className="flex justify-center py-8">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Loading more games...</span>
              </div>
            </div>
          )}

          {!hasMore && allLoadedGames.length > 0 && (
            <div className="flex justify-center py-8">
              <div className="text-center">
                <p className="text-muted-foreground text-sm mb-2">
                  You've reached the end of trending games
                </p>
                <p className="text-xs text-muted-foreground">
                  Showing all {allLoadedGames.length} games
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Game Picker Sheet */}
      <GamePickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        selectedGame={selectedGame}
        onSelect={handleGameSelect}
        title="Find a Game"
      />
    </div>
  );
}
