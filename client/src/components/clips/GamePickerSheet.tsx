import { useState, useEffect, useRef } from "react";
import { Check, Gamepad2, Loader2, Plus, Search, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Game } from "@shared/schema";
import { TwitchGame } from "@/components/games/TwitchGameSearch";
import { useToast } from "@/hooks/use-toast";

function GameCard({
  game,
  selectedGame,
  onSelect,
  onClose,
}: {
  game: Game;
  selectedGame: Game | null;
  onSelect: (game: Game | null) => void;
  onClose: () => void;
}) {
  const isSelected = selectedGame?.id === game.id;
  return (
    <button
      className="relative rounded-xl overflow-hidden flex flex-col justify-end transition-all"
      style={{
        aspectRatio: "3/4",
        background: "#101923",
        border: isSelected ? "2.5px solid #B7FF1A" : "2px solid rgba(255,255,255,0.08)",
      }}
      onClick={() => {
        onSelect(isSelected ? null : game);
        onClose();
      }}
    >
      {game.imageUrl && (
        <img
          src={game.imageUrl}
          alt={game.name}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 55%, transparent 100%)" }}
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
        <p className="text-white text-[11px] font-bold leading-tight line-clamp-2">{game.name}</p>
      </div>
    </button>
  );
}

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
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    if (open) setSearchQuery("");
  }, [open]);

  // Keyboard-aware: shift sheet up when virtual keyboard appears
  useEffect(() => {
    if (!open) {
      setKeyboardOffset(0);
      return;
    }
    const vv = window.visualViewport;
    if (!vv) return;

    const handleResize = () => {
      const offset = window.innerHeight - vv.height - vv.offsetTop;
      setKeyboardOffset(offset > 0 ? offset : 0);
    };

    vv.addEventListener("resize", handleResize);
    vv.addEventListener("scroll", handleResize);
    handleResize();
    return () => {
      vv.removeEventListener("resize", handleResize);
      vv.removeEventListener("scroll", handleResize);
    };
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
        imageUrl: g.box_art_url?.replace("{width}", "285").replace("{height}", "380") || null,
        isUserAdded: false,
        createdAt: new Date(),
      }));
    },
    enabled: isSearching && open,
    staleTime: 60000,
  });

  const { data: trendingGames, isLoading: isTrendingLoading } = useQuery<Game[]>({
    queryKey: ["/api/twitch/games/top", "game-picker"],
    queryFn: async () => {
      const res = await fetch("/api/twitch/games/top?limit=30");
      if (!res.ok) return [];
      const data = await res.json();
      return data.map((g: any) => ({
        id: parseInt(g.id),
        name: g.name,
        imageUrl: (g.box_art_url || g.imageUrl || null)
          ?.replace("{width}", "285")
          .replace("{height}", "380") ?? null,
        isUserAdded: false,
        createdAt: new Date(),
      }));
    },
    enabled: open && !isSearching,
    staleTime: 300000,
  });

  const { data: myTopGames } = useQuery<Game[]>({
    queryKey: ["/api/user/top-games"],
    queryFn: async () => {
      const res = await fetch("/api/user/top-games");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open && !isSearching,
    staleTime: 120000,
  });

  const displayGames = isSearching ? (searchResults || []) : (trendingGames || []);
  const isLoading = isSearching ? isSearchLoading : isTrendingLoading;

  // Filter trending so games already shown in "Your Games" aren't duplicated
  const myTopGameIds = new Set((myTopGames || []).map((g) => g.id));
  const filteredTrendingGames = (trendingGames || []).filter((g) => !myTopGameIds.has(g.id));

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
      className="fixed inset-0 z-[80] flex items-end md:items-start md:justify-center md:pt-20"
      style={{ background: "rgba(0,0,0,0.65)" }}
      onClick={onClose}
    >
      <div
        className="w-full md:max-w-2xl rounded-t-3xl md:rounded-3xl flex flex-col"
        style={{
          background: "#0B1218",
          maxHeight: "82vh",
          marginBottom: keyboardOffset,
          transition: "margin-bottom 0.2s ease",
        }}
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
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                setTimeout(() => {
                  searchInputRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                }, 100);
              }}
              placeholder="Search for games..."
              style={{ fontSize: "16px", color: "#fff", background: "transparent", outline: "none", border: "none", width: "100%" }}
            />
            {searchQuery.length > 0 && (
              <button onClick={() => setSearchQuery("")} className="text-white/40 hover:text-white/70">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-3 pb-8 space-y-5">

          {/* ── Your Games section (only when not searching and user has uploads) ── */}
          {!isSearching && myTopGames && myTopGames.length > 0 && (
            <div>
              <p className="px-1 pb-3 text-white font-semibold text-base">Your Games</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {myTopGames.map((game) => <GameCard key={game.id} game={game} selectedGame={selectedGame} onSelect={onSelect} onClose={onClose} />)}
              </div>
            </div>
          )}

          {/* ── Search Results / Trending Games section ── */}
          <div>
            <p className="px-1 pb-3 text-white font-semibold text-base">
              {isSearching ? "Search Results" : "Trending Games"}
            </p>

            {isLoading && (
              <div className="flex items-center justify-center py-10">
                <div className="w-6 h-6 border-2 border-[#B7FF1A] border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!isLoading && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {/* Add custom game card — always first */}
                <button
                  className="relative rounded-xl overflow-hidden flex flex-col items-center justify-center gap-1 transition-all"
                  style={{
                    aspectRatio: "3/4",
                    background: "#101923",
                    border: "2px dashed rgba(183,255,26,0.4)",
                  }}
                  onClick={() => {
                    if (showCustomOption) {
                      handleCreateCustomGame();
                    } else {
                      searchInputRef.current?.focus();
                    }
                  }}
                  disabled={isCreatingCustom}
                >
                  {isCreatingCustom ? (
                    <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#B7FF1A" }} />
                  ) : (
                    <Plus className="h-6 w-6" style={{ color: "#B7FF1A" }} />
                  )}
                  <span className="text-[10px] font-bold text-center px-1 leading-tight" style={{ color: "#B7FF1A" }}>
                    {showCustomOption ? `Add "${searchQuery.trim()}"` : "Add Game"}
                  </span>
                </button>

                {/* Empty search state */}
                {isSearching && (searchResults || []).length === 0 && !showCustomOption && (
                  <div className="col-span-3 flex flex-col items-center justify-center py-10 gap-2">
                    <p className="text-white/40 text-sm text-center">No games found</p>
                  </div>
                )}

                {/* Game cards */}
                {(isSearching ? (searchResults || []) : filteredTrendingGames).map((game) => (
                  <GameCard key={game.id} game={game} selectedGame={selectedGame} onSelect={onSelect} onClose={onClose} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
