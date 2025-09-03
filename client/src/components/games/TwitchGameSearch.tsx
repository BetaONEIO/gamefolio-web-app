import { useState, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

// Interface for Twitch game data
export interface TwitchGame {
  id: string;
  name: string;
  box_art_url: string;
}

interface TwitchGameSearchProps {
  onSelectGame: (game: TwitchGame) => void;
  selectedGame?: TwitchGame | null;
  placeholder?: string;
}

const TwitchGameSearch = ({ 
  onSelectGame, 
  selectedGame = null,
  placeholder = "Search for a game..."
}: TwitchGameSearchProps) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  // Fetch top games when no search query
  const { 
    data: topGames, 
    isLoading: isTopGamesLoading 
  } = useQuery<TwitchGame[]>({
    queryKey: ['/api/twitch/games/top'],
    queryFn: async () => {
      const response = await fetch('/api/twitch/games/top');
      if (!response.ok) throw new Error("Failed to fetch top games");
      return await response.json();
    },
    enabled: !debouncedQuery && open,
  });

  // Search games when there's a query
  const { 
    data: searchResults, 
    isLoading: isSearchLoading 
  } = useQuery<TwitchGame[]>({
    queryKey: ['/api/twitch/games/search', debouncedQuery],
    queryFn: async () => {
      const response = await fetch(`/api/twitch/games/search?q=${encodeURIComponent(debouncedQuery)}`);
      if (!response.ok) throw new Error("Failed to search games");
      return await response.json();
    },
    enabled: !!debouncedQuery && debouncedQuery.length > 2 && open,
  });

  // Games to display (either top games or search results)
  const games = debouncedQuery ? searchResults : topGames;
  const isLoading = debouncedQuery ? isSearchLoading : isTopGamesLoading;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between overflow-hidden"
        >
          {selectedGame ? (
            <div className="flex items-center gap-2 overflow-hidden">
              <img 
                src={selectedGame.box_art_url} 
                alt={selectedGame.name}
                className="h-6 w-6 rounded object-cover"
                onError={(e) => {
                  console.warn(`Failed to load thumbnail for ${selectedGame.name}:`, selectedGame.box_art_url);
                  e.currentTarget.style.display = 'none';
                }}
                loading="lazy"
              />
              <span className="truncate">{selectedGame.name}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search games..."
            value={searchQuery}
            onValueChange={setSearchQuery}
            className="h-9"
          />
          <CommandList>
            <CommandEmpty>
              {isLoading ? (
                <div className="flex items-center justify-center p-6">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                "No games found"
              )}
            </CommandEmpty>
            <CommandGroup>
              {!isLoading && games?.map((game) => (
                <CommandItem
                  key={game.id}
                  value={game.name}
                  onSelect={() => {
                    onSelectGame(game);
                    setOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <img 
                      src={game.box_art_url} 
                      alt={game.name}
                      className="h-8 w-8 rounded object-cover"
                      onError={(e) => {
                        console.warn(`Failed to load thumbnail for ${game.name}:`, game.box_art_url);
                        e.currentTarget.style.display = 'none';
                      }}
                      loading="lazy"
                    />
                    <span>{game.name}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          {!debouncedQuery && !isLoading && (
            <div className="p-2 text-xs text-muted-foreground text-center border-t">
              Showing top games. Type to search more games.
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default TwitchGameSearch;