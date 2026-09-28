import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, Loader2, Search, X } from "lucide-react";
import type { Game } from "@shared/schema";

export interface GameCatalogResult {
  id: string;
  name: string;
  box_art_url?: string | null;
  igdb_id?: string;
}

export interface OnboardingGamePickerProps {
  selectedGames: Game[];
  maxGames: number;
  minGames: number;
  onToggleGame: (result: GameCatalogResult) => void;
  onRemoveGame: (game: Game) => void;
  onNext: () => void;
  onSkip: () => void;
}

const panelClass =
  "rounded-xl border border-[#252938] bg-[#11131b]";
const focusClass =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B7FF18] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A10]";

function isCatalogResult(value: unknown): value is GameCatalogResult {
  if (!value || typeof value !== "object") return false;
  const result = value as Partial<GameCatalogResult>;
  const hasValidArtwork =
    result.box_art_url === undefined ||
    result.box_art_url === null ||
    typeof result.box_art_url === "string";
  return (
    typeof result.id === "string" &&
    typeof result.name === "string" &&
    hasValidArtwork
  );
}

async function readCatalogResponse(response: Response): Promise<GameCatalogResult[]> {
  if (!response.ok) {
    throw new Error("We couldn't load games right now.");
  }

  const payload: unknown = await response.json();
  if (!Array.isArray(payload)) {
    throw new Error("The game catalogue returned an unexpected response.");
  }
  return payload.filter(isCatalogResult);
}

function GameArtwork({
  src,
  name,
  className,
}: {
  src: string | null | undefined;
  name: string;
  className: string;
}) {
  const [failed, setFailed] = useState(false);
  const resolvedSrc = src
    ?.replace("{width}", "285")
    .replace("{height}", "380");

  useEffect(() => setFailed(false), [src]);

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-md bg-[#202431] ${className}`}
      aria-hidden="true"
    >
      {!failed && resolvedSrc ? (
        <img
          src={resolvedSrc}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center px-1 text-center text-[10px] font-semibold leading-tight text-[#8993a2]">
          {name.slice(0, 2).toUpperCase()}
        </span>
      )}
    </div>
  );
}

function SkeletonResults() {
  return (
    <div
      className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3"
      aria-label="Loading games"
      aria-hidden="true"
    >
      {Array.from({ length: 9 }, (_, index) => (
        <div
          key={index}
          className="flex min-h-[72px] items-center gap-3 rounded-lg border border-[#252938] bg-[#151821] p-2.5"
        >
          <div className="h-12 w-10 shrink-0 animate-pulse rounded-md bg-[#252938]" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-[#252938]" />
        </div>
      ))}
    </div>
  );
}

export function OnboardingGamePicker({
  selectedGames,
  maxGames,
  minGames,
  onToggleGame,
  onRemoveGame,
  onNext,
  onSkip,
}: OnboardingGamePickerProps) {
  const [searchText, setSearchText] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const trimmedSearch = searchText.trim();
  const isSearchActive = trimmedSearch.length > 0;
  const waitingForDebounce = isSearchActive && trimmedSearch !== debouncedQuery;
  const remaining = Math.max(0, maxGames - selectedGames.length);
  const canContinue = selectedGames.length >= minGames;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(searchText.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchText]);

  const topQuery = useQuery<GameCatalogResult[], Error>({
    queryKey: ["/api/game-catalog/top", { limit: 50 }],
    queryFn: async ({ signal }) => {
      const response = await fetch("/api/game-catalog/top?limit=50", { signal });
      return readCatalogResponse(response);
    },
    enabled: !isSearchActive,
  });

  const searchQuery = useQuery<GameCatalogResult[], Error>({
    queryKey: ["/api/game-catalog/search", debouncedQuery],
    queryFn: async ({ signal }) => {
      const response = await fetch(
        `/api/game-catalog/search?q=${encodeURIComponent(debouncedQuery)}`,
        { signal },
      );
      return readCatalogResponse(response);
    },
    enabled: isSearchActive && debouncedQuery.length > 0,
  });

  const currentQuery = isSearchActive ? searchQuery : topQuery;
  const results = currentQuery.data ?? [];
  const isLoading = waitingForDebounce || currentQuery.isLoading;

  const isSelected = (result: GameCatalogResult) =>
    selectedGames.some(
      (game) => game.twitchId === result.id || String(game.id) === result.id,
    );

  return (
    <section className="flex min-h-0 w-full flex-1 flex-col gap-4 overflow-hidden text-white">
      <header className="shrink-0 space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#B7FF18]">
          Make it yours
        </p>
        <h2 className="text-2xl font-bold tracking-tight sm:text-[28px]">
          Choose Your Favourite Games
        </h2>
        <p className="max-w-2xl text-sm leading-6 text-[#A9B4BE]">
          Choose at least {minGames} and up to {maxGames} games to personalize
          your profile and recommendations.
        </p>
      </header>

      <div className="grid min-h-0 min-w-0 flex-1 grid-rows-[auto_minmax(0,1fr)] gap-4 md:grid-cols-[minmax(230px,0.72fr)_minmax(0,1.8fr)] md:grid-rows-1">
        <aside
          className={`${panelClass} order-1 h-fit p-4 md:sticky md:top-0 md:self-start`}
          aria-labelledby="selected-games-heading"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3
              id="selected-games-heading"
              className="text-sm font-semibold text-white"
            >
              Your selected games
            </h3>
            <span
              className="rounded-md border border-[#343a48] bg-[#191d27] px-2 py-1 font-mono text-xs tabular-nums text-[#c4ccd6]"
              aria-live="polite"
              aria-label={`${selectedGames.length} of ${maxGames} games selected`}
            >
              {selectedGames.length}/{maxGames}
            </span>
          </div>

          {selectedGames.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#343a48] bg-[#0d0f16] px-4 py-6 text-center">
              <p className="mt-1 text-sm font-medium text-white">
                No games selected
              </p>
              <p className="mt-1 text-xs leading-5 text-[#8993a2]">
                Search or choose a game to add it here.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {selectedGames.map((game) => (
                <li
                  key={game.id}
                  className="flex min-w-0 items-center gap-2.5 rounded-lg border border-[#B7FF18]/55 bg-[#171b18] p-2"
                >
                  <GameArtwork
                    src={game.imageUrl}
                    name={game.name}
                    className="h-11 w-9"
                  />
                  <span className="min-w-0 flex-1 text-sm font-medium leading-5 text-[#f3f5f7]">
                    {game.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemoveGame(game)}
                    aria-label={`Remove ${game.name}`}
                    title={`Remove ${game.name}`}
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#a9b4be] hover:bg-white/10 hover:text-white ${focusClass}`}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {selectedGames.length >= maxGames && maxGames > 0 ? (
            <p className="mt-3 rounded-md border border-[#343a48] bg-[#0d0f16] px-3 py-2 text-xs leading-5 text-[#c4ccd6]">
              You’ve reached the {maxGames}-game limit. Remove a game to make
              room for another.
            </p>
          ) : (
            <p className="mt-3 text-xs leading-5 text-[#8993a2]">
              {remaining} {remaining === 1 ? "spot" : "spots"} remaining.
            </p>
          )}
        </aside>

        <div className="order-2 flex min-h-0 min-w-0 flex-col gap-4">
          <div className="relative shrink-0">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8993a2]"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search games"
              aria-label="Search the game catalogue"
              aria-controls="game-catalogue-results"
              className={`h-12 w-full rounded-lg border border-[#343a48] bg-[#11131b] pl-10 pr-11 text-base text-white placeholder:text-[#73808b] hover:border-[#4a5262] ${focusClass}`}
            />
            {searchText.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSearchText("");
                  setDebouncedQuery("");
                }}
                aria-label="Clear search and show trending games"
                title="Clear search"
                className={`absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[#a9b4be] hover:bg-white/10 hover:text-white ${focusClass}`}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-white">
                {isSearchActive ? "Search results" : "Trending games"}
              </h3>
              <p className="mt-0.5 text-xs text-[#8993a2]">
                {isSearchActive
                  ? `Matches for “${trimmedSearch}”`
                  : "Popular picks from the catalogue"}
              </p>
            </div>
            <span className="text-xs text-[#8993a2]">
              {maxGames} max
            </span>
          </div>

          <div
            id="game-catalogue-results"
            className="min-h-[180px] min-w-0 flex-1 overflow-y-auto overscroll-contain pr-1"
            aria-live="polite"
            aria-busy={isLoading}
          >
            {isLoading ? (
              <SkeletonResults />
            ) : currentQuery.isError ? (
              <div className={`${panelClass} px-5 py-8 text-center`}>
                <p className="text-sm font-medium text-white">
                  Games didn’t load
                </p>
                <p className="mt-1 text-sm text-[#8993a2]">
                  Check your connection and try again.
                </p>
                <button
                  type="button"
                  onClick={() => void currentQuery.refetch()}
                  className={`mt-4 inline-flex min-h-10 items-center justify-center rounded-lg border border-[#4a5262] px-4 text-sm font-semibold text-white hover:border-[#B7FF18] hover:text-[#B7FF18] ${focusClass}`}
                >
                  <Loader2
                    className={`mr-2 h-4 w-4 ${currentQuery.isFetching ? "animate-spin" : "hidden"}`}
                    aria-hidden="true"
                  />
                  Retry
                </button>
              </div>
            ) : results.length === 0 ? (
              <div className={`${panelClass} px-5 py-8 text-center`}>
                <p className="text-sm font-medium text-white">
                  {isSearchActive ? "No games found" : "No trending games yet"}
                </p>
                <p className="mt-1 text-sm text-[#8993a2]">
                  {isSearchActive
                    ? "Try another title or clear your search to browse trending games."
                    : "Try searching the catalogue for a game you play."}
                </p>
                  {isSearchActive && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchText("");
                        setDebouncedQuery("");
                      }}
                      className={`mt-4 min-h-10 rounded-lg border border-[#4a5262] px-4 text-sm font-semibold text-white hover:border-[#B7FF18] hover:text-[#B7FF18] ${focusClass}`}
                    >
                      Clear search
                    </button>
                  )}
              </div>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {results.map((result) => {
                  const selected = isSelected(result);
                  return (
                    <li key={result.id} className="min-w-0">
                      <button
                        type="button"
                        aria-pressed={selected}
                        aria-label={`${selected ? "Remove" : "Select"} ${result.name}`}
                        onClick={() => onToggleGame(result)}
                        className={`group flex min-h-[72px] w-full min-w-0 items-center gap-3 rounded-lg border p-2.5 text-left ${focusClass} ${
                          selected
                            ? "border-[#B7FF18] bg-[#151a17]"
                            : "border-[#252938] bg-[#11131b] hover:border-[#596171] hover:bg-[#171b25]"
                        }`}
                      >
                        <GameArtwork
                          src={result.box_art_url}
                          name={result.name}
                          className="h-12 w-10"
                        />
                        <span className="min-w-0 flex-1 text-sm font-medium leading-5 text-[#e8edf2]">
                          {result.name}
                        </span>
                        {selected ? (
                          <span className="flex shrink-0 items-center gap-1.5 text-[#B7FF18]" aria-hidden="true">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[#B7FF18]">
                              <Check className="h-3.5 w-3.5" />
                            </span>
                            <span className="text-[11px] font-semibold">Selected</span>
                          </span>
                        ) : (
                          <span
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#4a5262] text-sm leading-none text-transparent group-hover:text-[#8993a2]"
                            aria-hidden="true"
                          >
                            +
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      <footer className="flex shrink-0 flex-col gap-2 border-t border-[#252938] pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="min-h-5 text-xs leading-5 text-[#8993a2]" aria-live="polite">
          {!canContinue
            ? `Choose at least ${minGames} ${minGames === 1 ? "game" : "games"} to continue, or skip this step.`
            : `${selectedGames.length} ${selectedGames.length === 1 ? "game" : "games"} selected.`}
        </p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onSkip}
            className={`min-h-11 rounded-lg px-4 text-sm font-semibold text-[#c4ccd6] hover:bg-white/5 hover:text-white ${focusClass}`}
          >
            Skip for now
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!canContinue}
            aria-describedby={!canContinue ? "game-picker-next-reason" : undefined}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-bold ${
              canContinue
                ? "bg-[#B7FF18] text-[#10130b] hover:bg-[#c8ff4d]"
                : "cursor-not-allowed border border-[#343a48] bg-[#1a1d26] text-[#73808b]"
            } ${focusClass}`}
          >
            Next
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        {!canContinue && (
          <span id="game-picker-next-reason" className="sr-only">
            Choose at least {minGames} {minGames === 1 ? "game" : "games"} to
            enable Next.
          </span>
        )}
      </footer>
    </section>
  );
}

export default OnboardingGamePicker;