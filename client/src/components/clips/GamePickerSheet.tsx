import { useState, useEffect } from "react";
import { Check, Gamepad2, Loader2, Plus, Search, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Game } from "@shared/schema";
import { TwitchGame } from "@/components/games/TwitchGameSearch";
import { useToast } from "@/hooks/use-toast";

interface GamePickerSheetProps {
  open: boolean;
  onClose: () => void;
  selectedGame: Game | null;
  onSelect: (game: Game | null) => void;
  title?: string;
}

export function GamePickerSheet({
  open,
  onClose,
  selectedGame,
  onSelect,
  title = "Select a Game",
}: GamePickerSheetProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Reset search when sheet opens
  useEffect(() => {
    if (open) setSearchQuery("");
  }, [open]);

  const isSearching = debouncedQuery.length >= 2;

  const { data: searchResults, isLoading: isSearchLoading } = useQuery<Game[]>({
    queryKey: ["/api/twitch/games/search", debouncedQuery],
    queryFn: async () => {
      if (!isSearching) return [];
      const res = await fetch(`/api/twitch/games/search?q=${encodeURIComponent(debouncedQuery)}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.map((g: TwitchGame) => ({
        id: parseInt(g.id),
        name: g.name,
        imageUrl: g.box_art_url?.replace("{width}", "144").replace("{height}", "192") || null,
        isUserAdded: false,
        createdAt: new Date(),
      }));
    },
    enabled: isSearching && open,
    staleTime: 60000,
  });

  const { data: trendingGames, isLoading: isTrendingLoading } = useQuery<Game[]>({
    // Use a unique cache key so we don't read raw Twitch objects cached by Sidebar/HomeSection
    queryKey: ["/api/twitch/games/top", "game-picker"],
    queryFn: async () => {
      const res = await fetch("/api/twitch/games/top?limit=30");
      if (!res.ok) return [];
      const data = await res.json();
      return data.map((g: any) => ({
        id: parseInt(g.id),
        name: g.name,
        // box_art_url is already resolved (600x800) by the server — use directly
        imageUrl: g.box_art_url || g.imageUrl || null,
        isUserAdded: false,
        createdAt: new Date(),
      }));
    },
    enabled: open && !isSearching,
    staleTime: 300000,
  });

  const displayGames = isSearching ? (searchResults || []) : (trendingGames || []);
  const isLoading = isSearching ? isSearchLoading : isTrendingLoading;

  const showCustomOption =
    isSearching &&
    !isLoading &&
    searchQuery.trim().length >= 2 &&
    (!searchResults ||
      searchResults.length === 0 ||
      !searchResults.some((g) => g.name.toLowerCase() === searchQuery.trim().toLowerCase()));

  const handleCreateCustomGame = async () => {
    if (!searchQuery.trim()) return;
    setIsCreatingCustom(true);
    try {
      const res = await fetch("/api/games/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: searchQuery.trim() }),
      });
      if (!res.ok) throw new Error("Failed to create game");
      const newGame: Game = await res.json();
      onSelect(newGame);
      onClose();
      toast({
        title: "Game added — pending approval",
        description: `"${newGame.name}" has been added and selected. Your content will be visible once an admin approves this game.`,
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to add custom game. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingCustom(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end"
      style={{ background: "rgba(0,0,0,0.65)" }}
      onClick={onClose}
    >
      <div
        className="w-full rounded-t-3xl flex flex-col"
        style={{ background: "#0F1923", maxHeight: "82vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <div className="flex items-center gap-2.5">
            <Gamepad2 className="h-6 w-6" style={{ color: "#B7FF1A" }} />
            <span className="text-white font-bold text-lg">{title}</span>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Search input */}
        <div className="px-4 pb-4">
          <div
            className="flex items-center gap-3 rounded-2xl px-4 py-3"
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1.5px solid rgba(183, 255, 26, 0.35)",
            }}
          >
            <Search className="h-4 w-4 flex-shrink-0" style={{ color: "rgba(255,255,255,0.4)" }} />
            <input
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for games..."
              className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/40"
            />
            {searchQuery.length > 0 && (
              <button onClick={() => setSearchQuery("")} className="text-white/40 hover:text-white/70">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Section label */}
        <p className="px-4 pb-3 text-white font-semibold text-base">
          {isSearching ? "Search Results" : "Trending Games"}
        </p>

        {/* Game grid */}
        <div className="flex-1 overflow-y-auto px-3 pb-8">
          {isLoading && (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 border-2 border-[#B7FF1A] border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!isLoading && (
            <div className="grid grid-cols-3 gap-2">
              {/* All Games card */}
              <button
                className="relative rounded-xl overflow-hidden flex flex-col items-center justify-center transition-all"
                style={{
                  aspectRatio: "3/4",
                  background: "#1A2736",
                  border: !selectedGame
                    ? "2.5px solid #B7FF1A"
                    : "2px solid rgba(255,255,255,0.08)",
                }}
                onClick={() => {
                  onSelect(null);
                  onClose();
                }}
              >
                {!selectedGame && (
                  <div
                    className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: "#B7FF1A" }}
                  >
                    <Check className="h-3 w-3 text-black" strokeWidth={3} />
                  </div>
                )}
                <Gamepad2 className="h-7 w-7 mb-1" style={{ color: "#B7FF1A" }} />
                <span className="text-white text-[11px] font-bold text-center px-1 leading-tight">
                  No Game
                </span>
              </button>

              {/* Add custom game card */}
              {showCustomOption && (
                <button
                  className="relative rounded-xl overflow-hidden flex flex-col items-center justify-center gap-1 transition-all"
                  style={{
                    aspectRatio: "3/4",
                    background: "#1A2736",
                    border: "2px dashed rgba(183,255,26,0.4)",
                  }}
                  onClick={handleCreateCustomGame}
                  disabled={isCreatingCustom}
                >
                  {isCreatingCustom ? (
                    <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#B7FF1A" }} />
                  ) : (
                    <Plus className="h-6 w-6" style={{ color: "#B7FF1A" }} />
                  )}
                  <span className="text-[10px] font-bold text-center px-1 leading-tight" style={{ color: "#B7FF1A" }}>
                    Add "{searchQuery.trim()}"
                  </span>
                </button>
              )}

              {/* Empty search state */}
              {isSearching && !isLoading && (searchResults || []).length === 0 && !showCustomOption && (
                <div className="col-span-2 flex flex-col items-center justify-center py-10 gap-2">
                  <p className="text-white/40 text-sm text-center">No games found</p>
                </div>
              )}

              {/* Game cards */}
              {displayGames.map((game) => {
                const isSelected = selectedGame?.id === game.id;
                const imgSrc = game.imageUrl || null;

                return (
                  <button
                    key={game.id}
                    className="relative rounded-xl overflow-hidden flex flex-col justify-end transition-all"
                    style={{
                      aspectRatio: "3/4",
                      background: "#1A2736",
                      border: isSelected
                        ? "2.5px solid #B7FF1A"
                        : "2px solid rgba(255,255,255,0.08)",
                    }}
                    onClick={() => {
                      onSelect(isSelected ? null : game);
                      onClose();
                    }}
                  >
                    {imgSrc && (
                      <img
                        src={imgSrc}
                        alt={game.name}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    )}
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 55%, transparent 100%)",
                      }}
                    />
                    {isSelected && (
                      <div
                        className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: "#B7FF1A" }}
                      >
                        <Check className="h-3 w-3 text-black" strokeWidth={3} />
                      </div>
                    )}
                    <div className="relative z-10 px-1.5 pb-1.5">
                      <p className="text-white text-[11px] font-bold leading-tight line-clamp-2">
                        {game.name}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
