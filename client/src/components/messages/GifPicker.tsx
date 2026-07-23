import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search } from "lucide-react";

interface GifResult {
  id: string;
  url: string;
  previewUrl: string;
  width: number;
  height: number;
}

interface GifsResponse {
  results: GifResult[];
  next: string | null;
}

// apiRequest/getQueryFn throw Error(`${status}: ${bodyText}`) on non-2xx —
// pull the status back out so we can show a specific "not configured" state
// for 503 (missing GIPHY_API_KEY) instead of a generic error.
function getErrorStatus(error: unknown): number | null {
  if (error instanceof Error) {
    const match = error.message.match(/^(\d+):/);
    if (match) return Number(match[1]);
  }
  return null;
}

interface GifPickerProps {
  onSelectGif: (url: string) => void;
  disabled?: boolean;
}

export function GifPicker({ onSelectGif, disabled }: GifPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(handle);
  }, [query]);

  const endpoint = debouncedQuery ? "/api/gifs/search" : "/api/gifs/trending";
  const { data, isLoading, error } = useQuery<GifsResponse>({
    queryKey: [endpoint, debouncedQuery ? { q: debouncedQuery } : undefined],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: open,
  });

  const status = getErrorStatus(error);
  const notConfigured = status === 503;

  const handleSelect = (gif: GifResult) => {
    onSelectGif(gif.url);
    setOpen(false);
    setQuery("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className="h-11 px-3 rounded-full flex-shrink-0 text-xs font-bold"
        >
          GIF
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2" align="end">
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search GIFs..."
            className="h-8 pl-8 text-sm"
            autoFocus
          />
        </div>

        <div className="h-64 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : notConfigured ? (
            <div className="flex items-center justify-center h-full text-center px-4">
              <p className="text-xs text-muted-foreground">GIF search isn't set up yet.</p>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full text-center px-4">
              <p className="text-xs text-muted-foreground">Couldn't load GIFs. Try again.</p>
            </div>
          ) : !data?.results?.length ? (
            <div className="flex items-center justify-center h-full text-center px-4">
              <p className="text-xs text-muted-foreground">No GIFs found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {data.results.map((gif) => (
                <button
                  key={gif.id}
                  type="button"
                  onClick={() => handleSelect(gif)}
                  className="rounded-md overflow-hidden bg-muted hover:opacity-80 transition-opacity"
                >
                  <img
                    src={gif.previewUrl}
                    alt="GIF"
                    loading="lazy"
                    className="w-full h-24 object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default GifPicker;
