import { useState, useEffect } from "react";
import { Check, ChevronsUpDown, Loader2, Gamepad2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Game } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { TwitchGame } from "@/components/games/TwitchGameSearch";
import { useToast } from "@/hooks/use-toast";

interface GameSelectorProps {
  games: Game[];
  selectedGame: Game | null;
  onSelect: (game: Game | null) => void;
}

const GameSelector = ({ games, selectedGame, onSelect }: GameSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);
  const { toast } = useToast();
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    
    return () => {
      clearTimeout(timer);
    };
  }, [searchQuery]);
  
  const enableSearch = debouncedQuery.length >= 2;
  
  const {
    data: searchResults,
    isLoading: isSearchLoading,
  } = useQuery<Game[]>({
    queryKey: ["/api/twitch/games/search", debouncedQuery],
    queryFn: async () => {
      if (!enableSearch) return [];
      
      const response = await fetch(`/api/twitch/games/search?q=${encodeURIComponent(debouncedQuery)}`);
      if (!response.ok) throw new Error("Failed to search games");
      
      const twitchGames = await response.json();
      
      return twitchGames.map((game: TwitchGame) => ({
        id: parseInt(game.id),
        name: game.name,
        imageUrl: game.box_art_url.replace('{width}', '285').replace('{height}', '380') || null,
        isUserAdded: false,
        createdAt: new Date()
      }));
    },
    enabled: enableSearch && open,
  });
  
  const {
    data: trendingGames,
    isLoading: isTrendingLoading,
  } = useQuery<Game[]>({
    queryKey: ["/api/twitch/games/top"],
    queryFn: async () => {
      const response = await fetch("/api/twitch/games/top");
      if (!response.ok) throw new Error("Failed to fetch trending games");
      
      const twitchGames = await response.json();
      
      return twitchGames.map((game: TwitchGame) => ({
        id: parseInt(game.id),
        name: game.name,
        imageUrl: game.box_art_url.replace('{width}', '285').replace('{height}', '380') || null,
        isUserAdded: false,
        createdAt: new Date()
      }));
    },
    enabled: open && !enableSearch,
  });

  const handleCreateCustomGame = async () => {
    if (!searchQuery.trim()) return;
    
    setIsCreatingCustom(true);
    try {
      const response = await fetch('/api/games/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: searchQuery.trim() }),
      });
      
      if (!response.ok) throw new Error('Failed to create game');
      
      const newGame: Game = await response.json();
      onSelect(newGame);
      setOpen(false);
      setSearchQuery("");
      toast({
        title: "Game added — pending approval",
        description: `"${newGame.name}" has been added and selected. Your content will be visible once an admin approves this game.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add custom game. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingCustom(false);
    }
  };
  
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };
  
  const displayGames = enableSearch ? (searchResults || []) : (trendingGames || games);
  const isLoading = enableSearch ? isSearchLoading : isTrendingLoading;
  const showCustomOption = enableSearch && !isLoading && searchQuery.trim().length >= 2 && 
    (!searchResults || searchResults.length === 0 || 
     !searchResults.some(g => g.name.toLowerCase() === searchQuery.trim().toLowerCase()));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-12 sm:h-10 text-base sm:text-sm"
          data-testid="button-select-game"
        >
          <div className="flex items-center gap-3 sm:gap-2 overflow-hidden">
            {selectedGame ? (
              <>
                {selectedGame.imageUrl ? (
                  <div className="h-7 w-7 sm:h-6 sm:w-6 shrink-0 overflow-hidden rounded">
                    <img 
                      src={selectedGame.imageUrl}
                      alt={selectedGame.name}
                      loading="lazy"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/favicon.png';
                      }}
                    />
                  </div>
                ) : (
                  <div className="h-7 w-7 sm:h-6 sm:w-6 shrink-0 overflow-hidden rounded bg-secondary flex items-center justify-center">
                    <Gamepad2 className="h-4 w-4 sm:h-3 sm:w-3 text-muted-foreground" />
                  </div>
                )}
                <span className="truncate font-medium">{selectedGame.name}</span>
              </>
            ) : (
              <span className="truncate text-muted-foreground">Select a game...</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-5 w-5 sm:h-4 sm:w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 max-h-[70vh] max-w-[95%] sm:max-w-[400px]">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Search for games..." 
            value={searchQuery}
            onValueChange={handleSearchChange}
            className="h-12 sm:h-9 text-base sm:text-sm"
          />
          
          {isLoading ? (
            <div className="flex items-center justify-center py-8 px-4">
              <Loader2 className="h-6 w-6 sm:h-5 sm:w-5 animate-spin text-primary" />
              <span className="ml-3 sm:ml-2 text-base sm:text-sm text-muted-foreground">
                {enableSearch ? "Searching games..." : "Loading trending games..."}
              </span>
            </div>
          ) : (
            <CommandList className="max-h-[50vh] overflow-y-auto">
              {!showCustomOption && (
                <CommandEmpty className="py-8 px-4 text-center text-base sm:text-sm">
                  {searchQuery.length < 2 
                    ? "Type at least 2 characters to search for games..." 
                    : "No games found. Try a different search term."}
                </CommandEmpty>
              )}
              
              {showCustomOption && (
                <CommandGroup heading="Can't find your game?">
                  <CommandItem
                    value={`custom-${searchQuery}`}
                    onSelect={handleCreateCustomGame}
                    className="p-3 sm:p-2 cursor-pointer min-h-[60px] sm:min-h-[48px]"
                    disabled={isCreatingCustom}
                  >
                    <div className="flex items-center gap-3 sm:gap-2 w-full">
                      <div className="h-12 w-12 sm:h-10 sm:w-10 flex items-center justify-center rounded bg-primary/10 border-2 border-dashed border-primary/30 flex-shrink-0">
                        {isCreatingCustom ? (
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        ) : (
                          <Plus className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="font-medium text-base sm:text-sm text-primary">
                          Add "{searchQuery.trim()}"
                        </span>
                        <span className="text-sm sm:text-xs text-muted-foreground">
                          Add as a custom game
                        </span>
                      </div>
                    </div>
                  </CommandItem>
                </CommandGroup>
              )}

              {displayGames.length > 0 && (
                <CommandGroup heading={enableSearch ? "Search Results" : "Trending Games"}>
                  {displayGames.map((game) => (
                    <CommandItem
                      key={game.id}
                      value={game.name}
                      onSelect={() => {
                        onSelect(game.id === selectedGame?.id ? null : game);
                        setOpen(false);
                      }}
                      className="p-3 sm:p-2 cursor-pointer min-h-[60px] sm:min-h-[48px]"
                      data-testid={`game-option-${game.id}`}
                    >
                      <div className="flex items-center gap-3 sm:gap-2 w-full">
                        {game.imageUrl ? (
                          <div className="h-12 w-12 sm:h-10 sm:w-10 overflow-hidden rounded flex-shrink-0">
                            <img 
                              src={game.imageUrl} 
                              alt={game.name}
                              loading="lazy"
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/favicon.png';
                              }}
                            />
                          </div>
                        ) : (
                          <div className="h-12 w-12 sm:h-10 sm:w-10 flex items-center justify-center rounded bg-secondary flex-shrink-0">
                            <Gamepad2 className="h-6 w-6 sm:h-5 sm:w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex flex-col flex-1 min-w-0">
                          <div className="flex items-center w-full">
                            <Check
                              className={cn(
                                "mr-2 h-5 w-5 sm:h-4 sm:w-4 flex-shrink-0",
                                selectedGame?.id === game.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <span className="font-medium text-base sm:text-sm truncate">{game.name}</span>
                          </div>
                          <span className="text-sm sm:text-xs text-muted-foreground pl-7 sm:pl-6">
                            {(game as any).isUserAdded ? "Community added" : `Twitch ID: ${game.id}`}
                          </span>
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default GameSelector;
