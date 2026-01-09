import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  Home,
  Compass,
  Flame,
  MessageSquare,
  ShieldAlert,
  Trophy,
  Palette,
  Plus,
  Search,
  X,
  Check,
  Trash2,
  HelpCircle,
  ShoppingBag,
  Wallet
} from "lucide-react";
import { GamefolioProfileIcon } from "@/components/icons/GamefolioProfileIcon";
import { GamefolioMessagesIcon } from "@/components/icons/GamefolioMessagesIcon";
import { GamefolioLeaderboardIcon } from "@/components/icons/GamefolioLeaderboardIcon";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Game } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";

interface TwitchGame {
  id: string;
  name: string;
  box_art_url: string;
}

const Sidebar = () => {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const [showAddGames, setShowAddGames] = useState(false);
  const [gameSearchQuery, setGameSearchQuery] = useState("");
  const [selectedGames, setSelectedGames] = useState<TwitchGame[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [hoveredGameId, setHoveredGameId] = useState<number | null>(null);
  const [gameToRemove, setGameToRemove] = useState<{ id: number; name: string } | null>(null);

  // Maximum number of games a user can have
  const MAX_GAMES = 25;

  // Get user's favorite games for the sidebar
  const { data: favoriteGames, isLoading: isLoadingGames } = useQuery<Game[]>({
    queryKey: [`/api/users/${user?.id}/favorites`],
    queryFn: async () => {
      if (!user?.id) return [];

      const response = await apiRequest("GET", `/api/users/${user.id}/favorites`);
      if (!response.ok) {
        throw new Error("Failed to fetch favorite games");
      }
      return response.json();
    },
    enabled: !!user?.id,
  });

  const { data: trendingGames } = useQuery<Game[]>({
    queryKey: ["/api/twitch/games/top"],
    queryFn: async () => {
      const response = await fetch("/api/twitch/games/top");
      if (!response.ok) {
        throw new Error('Failed to fetch trending games from Twitch');
      }
      return response.json();
    },
    enabled: !user, // Only fetch trending games if user is not authenticated
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  // Use favorite games if user is authenticated, otherwise use trending games
  const displayGames = user ? favoriteGames : trendingGames;

  // Search for games to add
  const { data: searchResults } = useQuery<TwitchGame[]>({
    queryKey: ["/api/twitch/games/search", gameSearchQuery],
    queryFn: async () => {
      if (!gameSearchQuery.trim()) return [];
      const response = await fetch(`/api/twitch/games/search?q=${encodeURIComponent(gameSearchQuery)}`);
      if (!response.ok) throw new Error("Failed to search games");
      return response.json();
    },
    enabled: gameSearchQuery.length > 2,
  });

  // Check if user can add more games
  const canAddMoreGames = (favoriteGames?.length || 0) < MAX_GAMES;
  const remainingSlots = MAX_GAMES - (favoriteGames?.length || 0);

  // Add multiple games to favorites mutation
  const addGamesMutation = useMutation({
    mutationFn: async (games: TwitchGame[]) => {
      // Check if adding these games would exceed the limit
      const currentCount = favoriteGames?.length || 0;
      if (currentCount + games.length > MAX_GAMES) {
        throw new Error(`Cannot add ${games.length} games. You can only have up to ${MAX_GAMES} games in your favorites. You have ${remainingSlots} slots remaining.`);
      }

      const results = [];

      for (const game of games) {
        // Use the existing endpoint to add Twitch game
        const addResponse = await apiRequest("POST", "/api/twitch/games/add", {
          gameId: game.id
        });

        if (!addResponse.ok) {
          throw new Error(`Failed to add ${game.name} to database`);
        }

        const gameData = await addResponse.json();

        // Add to user's favorites
        await apiRequest("POST", `/api/users/${user?.id}/favorites`, {
          gameId: gameData.id
        });

        results.push(gameData);
      }

      return results;
    },
    onSuccess: async (addedGames) => {
      // Force refetch to ensure UI updates immediately - using the correct query key
      if (user?.id) {
        await queryClient.invalidateQueries({ queryKey: [`/api/users/${user.id}/favorites`] });
      }

      // Reset state and close dialog
      setSelectedGames([]);
      setShowAddGames(false);
      setGameSearchQuery("");

      toast({
        title: `${addedGames.length} game${addedGames.length > 1 ? 's' : ''} added to favorites`,
        description: `Successfully added ${addedGames.map(g => g.name).join(', ')} to your favorites`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add games",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  // Remove game from favorites mutation
  const removeGameMutation = useMutation({
    mutationFn: async (gameId: number) => {
      await apiRequest("DELETE", `/api/users/${user?.id}/favorites/${gameId}`);
    },
    onSuccess: async () => {
      // Force refetch to ensure UI updates immediately - using the correct query key
      if (user?.id) {
        await queryClient.invalidateQueries({ queryKey: [`/api/users/${user.id}/favorites`] });
      }

      toast({
        title: "Game removed from favorites",
        description: "The game has been removed from your favorites list",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to remove game",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const handleSelectGame = (game: TwitchGame) => {
    setSelectedGames(prev => {
      const isAlreadySelected = prev.some(g => g.id === game.id);
      if (isAlreadySelected) {
        return prev.filter(g => g.id !== game.id);
      } else {
        // Check if adding this game would exceed the limit
        const currentCount = favoriteGames?.length || 0;
        const selectedCount = prev.length;
        if (currentCount + selectedCount + 1 > MAX_GAMES) {
          toast({
            title: "Game limit reached",
            description: `You can only have up to ${MAX_GAMES} games in your favorites. You have ${remainingSlots} slots remaining.`,
            variant: "destructive",
          });
          return prev;
        }
        return [...prev, game];
      }
    });
  };

  const handleAddSelectedGames = () => {
    if (selectedGames.length > 0) {
      addGamesMutation.mutate(selectedGames);
    }
  };

  const handleRemoveGame = (gameId: number, gameName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setGameToRemove({ id: gameId, name: gameName });
  };

  const confirmRemoveGame = () => {
    if (gameToRemove) {
      removeGameMutation.mutate(gameToRemove.id);
      setGameToRemove(null);
    }
  };

  const resetDialog = () => {
    setSelectedGames([]);
    setGameSearchQuery("");
    setShowAddGames(false);
  };

  const menuItems = [
    { icon: Home, label: "Home", href: "/" },
    { icon: Compass, label: "Explore", href: "/explore" },
    { icon: Flame, label: "Trending", href: "/trending" },
    { icon: GamefolioLeaderboardIcon, label: "Leaderboard", href: "/leaderboard" },
    // Hidden until ready to go live
    // { icon: ShoppingBag, label: "Store", href: "/store" },
    { icon: Wallet, label: "Wallet", href: "/wallet" },

    // Only show Messages link if user has messaging enabled - default to true for demo user
    ...(user && user.messagingEnabled !== false ? [{ icon: GamefolioMessagesIcon, label: "Messages", href: "/messages" }] : []),

    { icon: GamefolioProfileIcon, label: "My Gamefolio", href: user ? `/profile/${user.username}` : "/auth" },
    { icon: HelpCircle, label: "Help & Support", href: "/help" },

    // Only show admin panel link for users with admin role
    ...(user?.role === "admin" ? [{ icon: ShieldAlert, label: "Admin Panel", href: "/admin" }] : [])
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-64 bg-card fixed top-0 left-0 bottom-0 flex flex-col border-r border-border z-40">
        <nav className="px-4 pt-40 pb-4 space-y-1 flex-1">
          {menuItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "flex items-center p-3 rounded-lg transition-all cursor-pointer",
                  location === item.href
                    ? "text-white bg-primary"
                    : "text-muted-foreground hover:bg-primary hover:text-white"
                )}
              >
                <item.icon className="w-6 h-6" />
                <span className="ml-3 font-medium">{item.label}</span>
              </div>
            </Link>
          ))}

          <div className="pt-6 border-t border-border mt-6">
            <div className="flex items-center justify-between px-3 mb-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {user ? "Your Games" : "Top Games"}
              </h3>
              {user && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddGames(true)}
                  disabled={!canAddMoreGames}
                  className={cn(
                    "h-6 w-6 p-0 transition-colors",
                    canAddMoreGames
                      ? "text-muted-foreground hover:text-primary"
                      : "text-muted-foreground/50 cursor-not-allowed"
                  )}
                  title={
                    canAddMoreGames
                      ? `Add more games (${remainingSlots} slots remaining)`
                      : `Maximum ${MAX_GAMES} games reached`
                  }
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="mt-3 space-y-1 max-h-64 overflow-y-auto">
              {displayGames?.map((game) => (
                <div
                  key={`sidebar-${game.id}`}
                  className="relative flex items-center px-3 py-2 text-sm rounded-md text-muted-foreground hover:bg-secondary group cursor-pointer"
                  onClick={() => {
                    // Navigate to the game page using the game name slug
                    const gameSlug = game.name.toLowerCase().replace(/[^a-z0-9]/g, '');
                    setLocation(`/games/${gameSlug}`);
                  }}
                  onMouseEnter={() => setHoveredGameId(game.id)}
                  onMouseLeave={() => setHoveredGameId(null)}
                >
                  <div className="w-6 h-8 mr-3 flex-shrink-0 relative">
                    {(game.imageUrl || (game as any).box_art_url) ? (
                      <>
                        <img
                          src={(() => {
                            const imageUrl = (game as any).box_art_url || game.imageUrl;
                            if (imageUrl?.includes('{width}')) {
                              return imageUrl.replace('{width}', '40').replace('{height}', '53');
                            } else if (imageUrl?.includes('285x380')) {
                              return imageUrl.replace('285x380', '40x53');
                            }
                            return imageUrl;
                          })()}
                          alt={game.name}
                          className="w-full h-full rounded object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            // Show fallback dot
                            const fallbackDot = target.nextElementSibling as HTMLElement;
                            if (fallbackDot) fallbackDot.style.display = 'flex';
                          }}
                          onLoad={(e) => {
                            // Hide fallback when image loads successfully
                            const target = e.target as HTMLImageElement;
                            const fallbackDot = target.nextElementSibling as HTMLElement;
                            if (fallbackDot) fallbackDot.style.display = 'none';
                          }}
                        />
                        <div
                          className="w-full h-full rounded flex items-center justify-center hidden"
                          style={{ display: 'none' }}
                        >
                          <span
                            className={cn(
                              "w-3 h-3 rounded-full",
                              game.id % 5 === 0 ? "bg-red-500" :
                              game.id % 5 === 1 ? "bg-blue-500" :
                              game.id % 5 === 2 ? "bg-primary" :
                              game.id % 5 === 3 ? "bg-yellow-500" :
                              "bg-purple-500"
                            )}
                          ></span>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full rounded flex items-center justify-center">
                        <span
                          className={cn(
                            "w-3 h-3 rounded-full",
                            game.id % 5 === 0 ? "bg-red-500" :
                            game.id % 5 === 1 ? "bg-blue-500" :
                            game.id % 5 === 2 ? "bg-primary" :
                            game.id % 5 === 3 ? "bg-yellow-500" :
                            "bg-purple-500"
                          )}
                        ></span>
                      </div>
                    )}
                  </div>
                  <span className="truncate flex-1">{game.name}</span>

                  {/* Remove button for user's own games */}
                  {user && hoveredGameId === game.id && (
                    <button
                      onClick={(e) => handleRemoveGame(game.id, game.name, e)}
                      className="ml-2 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full transition-all"
                      title="Remove from favorites"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}

              {user && (!displayGames || displayGames.length === 0) && (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  <p className="mb-2">No games selected yet.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLocation("/explore")}
                    className="w-full text-xs"
                  >
                    <Search className="h-3 w-3 mr-1" />
                    Discover Games
                  </Button>
                </div>
              )}
            </div>
          </div>
        </nav>
      </div>

      {/* Mobile/Tablet Your Games Section */}
      {user && (
        <div className="lg:hidden px-4 py-6 bg-card border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Your Games</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAddGames(true)}
              disabled={!canAddMoreGames}
              className={cn(
                "h-8 w-8 p-0 transition-colors",
                canAddMoreGames
                  ? "text-muted-foreground hover:text-primary"
                  : "text-muted-foreground/50 cursor-not-allowed"
              )}
              title={
                canAddMoreGames
                  ? `Add more games (${remainingSlots} slots remaining)`
                  : `Maximum ${MAX_GAMES} games reached`
              }
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {favoriteGames && favoriteGames.length > 0 ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(70px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-4">
              {favoriteGames.map((game) => (
                <div
                  key={`mobile-${game.id}`}
                  className="group relative flex flex-col items-center cursor-pointer"
                  onClick={() => {
                    const gameSlug = game.name.toLowerCase().replace(/[^a-z0-9]/g, '');
                    setLocation(`/games/${gameSlug}`);
                  }}
                >
                  <div className="w-full aspect-[3/4] mb-2 relative">
                    {game.imageUrl ? (
                      <img
                        src={game.imageUrl.includes('{width}')
                          ? game.imageUrl.replace('{width}', '120').replace('{height}', '160')
                          : game.imageUrl.replace('285x380', '120x160')}
                        alt={game.name}
                        className="w-full h-full rounded-lg object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const fallback = target.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div
                      className="w-full h-full rounded-lg bg-muted flex items-center justify-center"
                      style={{ display: game.imageUrl ? 'none' : 'flex' }}
                    >
                      <span
                        className={cn(
                          "w-6 h-6 rounded-full",
                          game.id % 5 === 0 ? "bg-red-500" :
                          game.id % 5 === 1 ? "bg-blue-500" :
                          game.id % 5 === 2 ? "bg-primary" :
                          game.id % 5 === 3 ? "bg-yellow-500" :
                          "bg-purple-500"
                        )}
                      ></span>
                    </div>

                    {/* Mobile Remove Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveGame(game.id, game.name, e);
                      }}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      title="Remove from favorites"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  <span className="text-xs text-center text-muted-foreground line-clamp-2 w-full px-1">
                    {game.name}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm mb-3">No games selected yet.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddGames(true)}
                className="text-xs"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Games
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Add Games Dialog */}
      <Dialog open={showAddGames} onOpenChange={resetDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Add some more games!</DialogTitle>
            <p className={cn(
              "text-sm",
              (displayGames?.length || 0) >= 22
                ? "text-orange-500"
                : (displayGames?.length || 0) >= 25
                  ? "text-red-500"
                  : "text-muted-foreground"
            )}>
              {displayGames?.length || 0}/25 games in favorites
              {remainingSlots > 0 && ` (${remainingSlots} slots remaining)`}
              {(displayGames?.length || 0) >= 25 && " (limit reached)"}
            </p>
          </DialogHeader>

          <div className="space-y-4 flex-1 overflow-hidden">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search for games..."
                value={gameSearchQuery}
                onChange={(e) => setGameSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Selected Games Section */}
            {selectedGames.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-foreground">Selected Games ({selectedGames.length})</h4>
                <div className="flex flex-wrap gap-2 p-3 bg-secondary/50 rounded-lg max-h-24 overflow-y-auto">
                  {selectedGames.map((game) => (
                    <Badge
                      key={`selected-${game.id}`}
                      variant="secondary"
                      className="flex items-center gap-2 pr-1"
                    >
                      <span className="truncate max-w-24">{game.name}</span>
                      <button
                        onClick={() => handleSelectGame(game)}
                        className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Search Results */}
            <div className="flex-1 overflow-hidden">
              <div className="max-h-64 overflow-y-auto space-y-2">
                {gameSearchQuery.length > 2 && (
                  <>
                    {searchResults?.map((game) => {
                      const isSelected = selectedGames.some(g => g.id === game.id);
                      const isAlreadyInFavorites = favoriteGames?.some(g => g.name === game.name);

                      return (
                        <Card
                          key={`search-${game.id}`}
                          className={cn(
                            "cursor-pointer transition-all",
                            isSelected ? "bg-primary/20 border-primary" : "hover:bg-secondary/50",
                            isAlreadyInFavorites && "opacity-50 cursor-not-allowed"
                          )}
                          onClick={() => !isAlreadyInFavorites && handleSelectGame(game)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center gap-3">
                              <img
                                src={game.box_art_url?.replace('{width}x{height}', '60x80')}
                                alt={game.name}
                                className="w-8 h-10 rounded object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                }}
                              />
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-sm truncate">{game.name}</h4>
                                <p className="text-xs text-muted-foreground">
                                  {isAlreadyInFavorites ? "Already in favorites" : "Twitch Game"}
                                </p>
                              </div>
                              {isSelected && !isAlreadyInFavorites && (
                                <Check className="w-5 h-5 text-primary" />
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}

                    {searchResults?.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No games found</p>
                      </div>
                    )}
                  </>
                )}

                {gameSearchQuery.length <= 2 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>Type at least 3 characters to search</p>
                  </div>
                )}
              </div>
            </div>

            {/* Add Games Button */}
            <div className="flex justify-between items-center pt-4 border-t">
              <Button variant="outline" onClick={resetDialog}>
                Cancel
              </Button>
              <Button
                onClick={handleAddSelectedGames}
                disabled={selectedGames.length === 0 || addGamesMutation.isPending || (displayGames?.length || 0) >= 25}
                className="min-w-24"
              >
                {addGamesMutation.isPending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  `Add ${selectedGames.length} Game${selectedGames.length !== 1 ? 's' : ''}`
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Game Confirmation Dialog */}
      <AlertDialog open={!!gameToRemove} onOpenChange={() => setGameToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Game from Favorites</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{gameToRemove?.name}" from your favorites?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemoveGame}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Remove Game
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default Sidebar;