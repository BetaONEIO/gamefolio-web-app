import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import VideoClipCard from "@/components/clips/VideoClipCard";
import TrendingGameCard from "@/components/clips/TrendingGameCard";
import ClipCardSkeleton from "@/components/clips/ClipCardSkeleton";
import SearchResults from "@/components/explore/SearchResults";
import GameCategoryTags from "@/components/explore/GameCategoryTags";
import { ClipWithUser, Game, User } from "@shared/schema";

// Extended Game type to include RAWG API properties
interface ExtendedGame extends Game {
  releaseDate?: string;
  rating?: number;
  ratingCount?: number;
  genres?: string;
  platforms?: string;
  slug?: string;
}
import { Skeleton } from "@/components/ui/skeleton";
import { Search, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

const ExplorePage = () => {
  const [location, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [timeRange, setTimeRange] = useState("year");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [queryParams, setQueryParams] = useState<{ q?: string; hashtag?: string; game?: string; category?: string }>({});
  const [displayedGamesCount, setDisplayedGamesCount] = useState(20);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const { toast } = useToast();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Current user ID for like functionality
  const { user } = useAuth();
  const userId = user?.id;

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

  // Get trending games from Twitch API with pagination support
  const { 
    data: twitchTrendingGames, 
    isLoading: isLoadingTwitchGames,
    refetch: refetchTwitchGames,
    isRefetching: isRefetchingTwitchGames 
  } = useQuery<Game[]>({
    queryKey: ["/api/twitch/games/top", 100], // Request more games for infinite scroll
    queryFn: async () => {
      const response = await fetch("/api/twitch/games/top?limit=100"); // Fetch 100 games
      if (!response.ok) {
        throw new Error('Failed to fetch trending games from Twitch');
      }
      return response.json();
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  // Remove fallback - only use Twitch API data

  // Get trending clips
  const { 
    data: trendingClips, 
    isLoading: isLoadingClips 
  } = useQuery<ClipWithUser[]>({
    queryKey: ["/api/clips?period=week", 8],
  });
  
  // Always use Twitch trending games - no fallback to local games
  const displayedTrendingGames = twitchTrendingGames?.slice(0, displayedGamesCount);
  const isLoadingGames = isLoadingTwitchGames;
  
  // Load more games function
  const loadMoreGames = useCallback(() => {
    if (isLoadingMore || !twitchTrendingGames) return;
    
    const totalGames = twitchTrendingGames.length;
    if (displayedGamesCount >= totalGames) return;
    
    setIsLoadingMore(true);
    
    // Simulate loading delay for better UX
    setTimeout(() => {
      setDisplayedGamesCount(prev => Math.min(prev + 20, totalGames));
      setIsLoadingMore(false);
    }, 500);
  }, [isLoadingMore, twitchTrendingGames, displayedGamesCount]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMore && twitchTrendingGames) {
          const totalGames = twitchTrendingGames.length;
          if (displayedGamesCount < totalGames) {
            loadMoreGames();
          }
        }
      },
      { 
        threshold: 0.1,
        rootMargin: '100px' // Trigger loading when element is 100px from viewport
      }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [loadMoreGames, isLoadingMore, twitchTrendingGames, displayedGamesCount]);
  
  // Function to manually refresh trending games
  const handleRefreshTrendingGames = () => {
    refetchTwitchGames()
      .then(() => toast({
        title: "Success",
        description: "Trending games refreshed with the latest data",
      }))
      .catch(() => toast({
        title: "Error",
        description: "Failed to refresh trending games",
        variant: "destructive",
      }));
  };

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
  
  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    if (category) {
      setLocation(`/browse/games/${category}`);
    }
  };

  if (queryParams.q || queryParams.hashtag) {
    return (
      <div className="py-6 max-w-full w-full">
        <form onSubmit={handleSearch} className="mb-8 max-w-4xl mx-auto">
          <div className="flex gap-2">
            <Input
              type="text" 
              placeholder="Search for #hashtags, users, or games"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="submit">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>
        </form>
        
        <div className="max-w-full">
          <SearchResults query={queryParams.q || `#${queryParams.hashtag}`} />
        </div>
      </div>
    );
  }

  return (
    <div className="py-3 max-w-full w-full">
      <div className="mb-4 max-w-4xl mx-auto">
        <div className="flex gap-2">
          {/* Game Search Component */}
          <div className="flex-1">
            <div className="relative">
              <Input
                type="text" 
                placeholder="Search for games to explore clips..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 h-8 text-sm pr-10"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearch(e);
                  }
                }}
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </div>
          </div>
        </div>
        {/* Show search suggestions when user types */}
        {searchQuery.length > 2 && (
          <div className="mt-2 text-xs text-muted-foreground">
            Press Enter to search for "{searchQuery}" or click trending games below
          </div>
        )}
      </div>

      <Tabs defaultValue="all" className="mb-3" onValueChange={setActiveTab}>
        <div className="flex justify-between items-center mb-2">
          <TabsList className="mb-0 h-8">
            <TabsTrigger value="all" className="h-7 px-3 text-sm">Featured</TabsTrigger>
            <TabsTrigger value="popular" className="h-7 px-3 text-sm">Popular</TabsTrigger>
            <TabsTrigger value="new" className="h-7 px-3 text-sm">New</TabsTrigger>
            <TabsTrigger value="category" className="h-7 px-3 text-sm">Category</TabsTrigger>
            <TabsTrigger value="games" className="h-7 px-3 text-sm">Games</TabsTrigger>
          </TabsList>
        </div>
        
        <GameCategoryTags onCategorySelect={handleCategorySelect} />
        
        <TabsContent value="all">
          <div className="space-y-4">
            <section className="mb-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-3">
                <h2 className="text-xl font-medium text-foreground">Trending Games</h2>
                <div className="flex flex-wrap gap-1 items-center">
                  <div className="flex items-center bg-card rounded border border-border overflow-hidden h-7">
                    <button 
                      onClick={() => setTimeRange("month")}
                      className={`px-2 py-0.5 text-xs transition-colors ${timeRange === 'month' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                    >
                      Month
                    </button>
                    <div className="w-px h-4 bg-border"></div>
                    <button 
                      onClick={() => setTimeRange("year")}
                      className={`px-2 py-0.5 text-xs transition-colors ${timeRange === 'year' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                    >
                      Year
                    </button>
                    <div className="w-px h-4 bg-border"></div>
                    <button 
                      onClick={() => setTimeRange("all")}
                      className={`px-2 py-0.5 text-xs transition-colors ${timeRange === 'all' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                    >
                      All
                    </button>
                  </div>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={handleRefreshTrendingGames}
                    disabled={isRefetchingTwitchGames}
                    className="h-7 w-7"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isRefetchingTwitchGames ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>
              
              <div className="overflow-x-auto pb-2 -mx-4 px-4">
                <div className="flex gap-2" style={{ minWidth: "100%", width: "max-content" }}>
                  {isLoadingGames ? (
                    Array(10).fill(0).map((_, i) => (
                      <div key={i} className="relative overflow-hidden rounded-lg shadow w-[140px] flex-shrink-0">
                        <Skeleton className="w-full h-20" />
                        <div className="absolute bottom-0 left-0 w-full p-2">
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </div>
                    ))
                  ) : (
                    displayedTrendingGames?.slice(0, Math.min(10, displayedGamesCount)).map((game) => (
                      <div className="w-[140px] flex-shrink-0" key={game.id}>
                        <div 
                          className="cursor-pointer"
                          onClick={() => {
                            // Create a URL-safe slug from the game name that's more readable
                            const gameSlug = game.name
                              .toLowerCase()
                              .replace(/[^a-z0-9\s]/g, '') // Remove special characters but keep spaces
                              .replace(/\s+/g, '-') // Replace spaces with hyphens
                              .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
                            setLocation(`/games/${gameSlug}`);
                          }}
                        >
                          <TrendingGameCard game={game} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              
              {twitchTrendingGames && (
                <div className="mt-1 text-[9px] text-muted-foreground flex justify-end">
                  <span>Data: Twitch API</span>
                </div>
              )}
            </section>
            
            <section>
              <h2 className="text-xl font-medium text-foreground mb-3">Featured Clips</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {isLoadingClips ? (
                  Array(10).fill(0).map((_, i) => (
                    <ClipCardSkeleton key={i} />
                  ))
                ) : (
                  trendingClips?.slice(0, 10).map((clip) => (
                    <VideoClipCard key={clip.id} clip={clip} userId={userId} clipsList={trendingClips} />
                  ))
                )}
              </div>
            </section>
          </div>
        </TabsContent>
        
        <TabsContent value="games">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-6">
            <h2 className="text-2xl font-bold text-foreground">Explore Games</h2>
            <div className="flex flex-wrap gap-2 items-center">
              <div className="flex items-center bg-card rounded-md border border-border overflow-hidden">
                <button 
                  onClick={() => setTimeRange("month")}
                  className={`px-3 py-1.5 text-sm transition-colors ${timeRange === 'month' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                >
                  Month
                </button>
                <div className="w-px h-5 bg-border"></div>
                <button 
                  onClick={() => setTimeRange("year")}
                  className={`px-3 py-1.5 text-sm transition-colors ${timeRange === 'year' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                >
                  Year
                </button>
                <div className="w-px h-5 bg-border"></div>
                <button 
                  onClick={() => setTimeRange("all")}
                  className={`px-3 py-1.5 text-sm transition-colors ${timeRange === 'all' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                >
                  All Time
                </button>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefreshTrendingGames}
                disabled={isRefetchingTwitchGames}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isRefetchingTwitchGames ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {isLoadingGames ? (
              Array(12).fill(0).map((_, i) => (
                <div key={i} className="relative overflow-hidden rounded-lg shadow-lg w-full">
                  <Skeleton className="w-full h-28" />
                  <div className="absolute bottom-0 left-0 w-full p-2">
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              ))
            ) : (
              displayedTrendingGames?.map((game) => (
                <div 
                  key={game.id} 
                  className="cursor-pointer"
                  onClick={() => {
                    // Create a URL-safe slug from the game name
                    const gameSlug = game.name.toLowerCase().replace(/[^a-z0-9]/g, '');
                    setLocation(`/games/${gameSlug}`);
                  }}
                >
                  <TrendingGameCard game={game} />
                </div>
              ))
            )}
          </div>
          
          {/* Load More Games Progress */}
          {twitchTrendingGames && displayedGamesCount < twitchTrendingGames.length && (
            <div className="mt-6 text-center space-y-4">
              {isLoadingMore ? (
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Loading more games...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-muted-foreground text-sm">
                    Showing {displayedGamesCount} of {twitchTrendingGames.length} games
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={loadMoreGames}
                    disabled={isLoadingMore}
                    className="mx-auto"
                  >
                    Load More Games
                  </Button>
                </div>
              )}
            </div>
          )}
          
          {/* Infinite scroll trigger - positioned at bottom */}
          {twitchTrendingGames && displayedGamesCount < twitchTrendingGames.length && (
            <div ref={loadMoreRef} className="h-20 w-full flex items-center justify-center mt-8">
              <div className="text-xs text-muted-foreground">
                Scroll for more games...
              </div>
            </div>
          )}
          
          {twitchTrendingGames && (
            <div className="mt-4 text-xs text-muted-foreground flex justify-end">
              <span>Data: Twitch API</span>
            </div>
          )}
        </TabsContent>
        
        {/* Popular Clips Tab */}
        <TabsContent value="popular">
          <h2 className="text-2xl font-bold text-foreground mb-4">Most Popular Clips</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {isLoadingClips ? (
              Array(8).fill(0).map((_, i) => (
                <div key={i} className="bg-card rounded-xl overflow-hidden shadow-lg">
                  <Skeleton className="w-full h-36" />
                  <div className="p-2">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center">
                        <Skeleton className="w-6 h-6 rounded-full mr-2" />
                        <div>
                          <Skeleton className="h-3 w-24" />
                          <Skeleton className="h-2 w-16 mt-1" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              trendingClips?.sort((a, b) => 
                ((b._count?.likes || 0) + (b.views || 0)) - 
                ((a._count?.likes || 0) + (a.views || 0))
              ).slice(0, 8).map((clip) => (
                <VideoClipCard key={clip.id} clip={clip} userId={userId} clipsList={trendingClips} />
              ))
            )}
          </div>
        </TabsContent>
        
        {/* New Clips Tab */}
        <TabsContent value="new">
          <h2 className="text-2xl font-bold text-foreground mb-4">New Clips</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {isLoadingClips ? (
              Array(8).fill(0).map((_, i) => (
                <div key={i} className="bg-card rounded-xl overflow-hidden shadow-lg">
                  <Skeleton className="w-full h-36" />
                  <div className="p-2">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center">
                        <Skeleton className="w-6 h-6 rounded-full mr-2" />
                        <div>
                          <Skeleton className="h-3 w-24" />
                          <Skeleton className="h-2 w-16 mt-1" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              trendingClips?.slice().sort((a, b) => {
                const dateA = new Date(a.createdAt || 0);
                const dateB = new Date(b.createdAt || 0);
                return dateB.getTime() - dateA.getTime();
              }).slice(0, 8).map((clip) => (
                <VideoClipCard key={clip.id} clip={clip} userId={userId} clipsList={trendingClips} />
              ))
            )}
          </div>
        </TabsContent>
        
        {/* Category Tab with Game Filter */}
        <TabsContent value="category">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground mb-4">Game Categories</h2>
            
            {/* Game Category Filter */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 mb-6">
              {isLoadingGames ? (
                Array(8).fill(0).map((_, i) => (
                  <div key={i} className="relative overflow-hidden rounded-lg">
                    <Skeleton className="w-full h-16" />
                  </div>
                ))
              ) : (
                displayedTrendingGames?.slice(0, 8).map((game) => (
                  <div 
                    key={game.id} 
                    className="relative h-16 rounded-lg overflow-hidden cursor-pointer border hover:border-primary transition-colors"
                    onClick={() => setLocation(`/explore?game=${game.id}`)}
                  >
                    <img
                      src={game.imageUrl || "/attached_assets/game-controller-5619105_1920.jpg"}
                      alt={game.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
                    <div className="absolute bottom-0 left-0 w-full p-1.5">
                      <h3 className="text-xs font-medium text-white line-clamp-1">{game.name}</h3>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {/* Clips for Selected Category */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {isLoadingClips ? (
                Array(8).fill(0).map((_, i) => (
                  <div key={i} className="bg-card rounded-xl overflow-hidden shadow-lg">
                    <Skeleton className="w-full h-36" />
                    <div className="p-2">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center">
                          <Skeleton className="w-6 h-6 rounded-full mr-2" />
                          <div>
                            <Skeleton className="h-3 w-24" />
                            <Skeleton className="h-2 w-16 mt-1" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                trendingClips?.slice(0, 8).map((clip) => (
                  <VideoClipCard key={clip.id} clip={clip} userId={userId} clipsList={trendingClips} />
                ))
              )}
            </div>
          </div>
        </TabsContent>
        
        {/* Original Clips Tab - Now hidden because we reorganized content */}
        <TabsContent value="clips" className="hidden">
          <h2 className="text-2xl font-bold text-foreground mb-4">Explore Clips</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {isLoadingClips ? (
              Array(8).fill(0).map((_, i) => (
                <div key={`explore-clip-skeleton-${i}`}>
                  <ClipCardSkeleton />
                </div>
              ))
            ) : (
              trendingClips?.map((clip) => (
                <VideoClipCard key={clip.id} clip={clip} userId={userId} clipsList={trendingClips} />
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ExplorePage;
