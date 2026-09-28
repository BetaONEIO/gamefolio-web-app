import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, ExternalLink, Loader2, Search, X } from "lucide-react";
import type { Game } from "@shared/schema";
import { publicGamePath } from "@/lib/game-routes";

export interface GameCatalogResult {
  id: string;
  name: string;
  box_art_url?: string | null;
  igdb_id?: string;
  released?: string | null;
  platforms?: string[];
}

export interface OnboardingGamePickerProps {
  selectedGames: Game[];
  maxGames: number;
  minGames: number;
  onToggleGame: (result: GameCatalogResult) => void;
  onRemoveGame: (game: Game) => void;
  onNext: () => void;
  onSkip: () => void;
  isHydrating?: boolean;
  isSaving?: boolean;
  selectionError?: string | null;
  onRetryLoad?: () => void;
}

const panelClass =
  "rounded-xl border border-[#303747] bg-[#171923]";
const focusClass =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B9FF1A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F101B]";

function isCatalogResult(value: unknown): value is GameCatalogResult {
  if (!value || typeof value !== "object") return false;
  const result = value as Partial<GameCatalogResult>;
  const hasValidArtwork =
    result.box_art_url === undefined ||
    result.box_art_url === null ||
    typeof result.box_art_url === "string";
  const hasValidRelease = result.released === undefined ||
    result.released === null || typeof result.released === "string";
  const hasValidPlatforms = result.platforms === undefined ||
    (Array.isArray(result.platforms) && result.platforms.every((platform) => typeof platform === "string"));
  return (
    typeof result.id === "string" &&
    typeof result.name === "string" &&
    hasValidArtwork &&
    hasValidRelease &&
    hasValidPlatforms
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

function GameMetadata({ released, platforms }: Pick<GameCatalogResult, "released" | "platforms">) {
  const year = released?.match(/^\d{4}/)?.[0];
  const platformNames = platforms?.filter(Boolean) ?? [];
  if (!year && platformNames.length === 0) return null;
  return (
    <span className="block text-xs leading-5 text-[#b9c4cf]">
      {[year, platformNames.length > 0 ? platformNames.slice(0, 3).join(", ") : null]
        .filter(Boolean).join(" · ")}
      {platformNames.length > 3 ? ` +${platformNames.length - 3}` : ""}
    </span>
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
  isHydrating = false,
  isSaving = false,
  selectionError,
  onRetryLoad,
}: OnboardingGamePickerProps) {
  const [searchText, setSearchText] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [activeTab, setActiveTab] = useState<"discover" | "my-games">("discover");
  const discoverTabRef = useRef<HTMLButtonElement>(null);
  const myGamesTabRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const dropdownId = useId();
  const trimmedSearch = searchText.trim();
  const isSearchActive = trimmedSearch.length > 0;
  const waitingForDebounce = isSearchActive && trimmedSearch !== debouncedQuery;
  const remaining = Math.max(0, maxGames - selectedGames.length);
  const canContinue =
    selectedGames.length >= minGames &&
    !isHydrating &&
    !isSaving &&
    !selectionError;

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

  const results = searchQuery.data ?? [];
  const trendingResults = topQuery.data ?? [];
  const isLoading = waitingForDebounce || searchQuery.isLoading;
  const suggestionResults = isSearchActive ? results : trendingResults;
  const suggestionLoading = isSearchActive ? isLoading : topQuery.isLoading;
  const suggestionError = isSearchActive ? searchQuery.isError : topQuery.isError;
  const savedMetadataQueries = useQueries({
    queries: selectedGames.map((game) => ({
      queryKey: ["/api/game-catalog/search", game.name],
      queryFn: async ({ signal }: { signal: AbortSignal }) => {
        const response = await fetch(
          `/api/game-catalog/search?q=${encodeURIComponent(game.name)}`,
          { signal },
        );
        return readCatalogResponse(response);
      },
      enabled: activeTab === "my-games" &&
        game.name.length >= 2 &&
        ![...trendingResults, ...results].some((result) => result.id === String(game.id)),
      staleTime: 30 * 60 * 1000,
    })),
  });
  const metadataById = new Map(
    [
      ...trendingResults,
      ...results,
      ...savedMetadataQueries.flatMap((query) => query.data ?? []),
    ].map((result) => [result.id, result]),
  );

  const isSelected = (result: GameCatalogResult) =>
    selectedGames.some(
      (game) => game.twitchId === result.id || String(game.id) === result.id,
    );
  const isUnavailable = (result: GameCatalogResult) =>
    isSelected(result) ||
    selectedGames.length >= maxGames ||
    isHydrating ||
    isSaving;

  useEffect(() => {
    if (!isDropdownOpen || suggestionLoading) {
      setActiveIndex(-1);
      return;
    }
    setActiveIndex(suggestionResults.findIndex((result) => !isUnavailable(result)));
  }, [isDropdownOpen, suggestionLoading, suggestionResults, selectedGames, maxGames, isHydrating, isSaving]);

  useEffect(() => {
    if (isDropdownOpen && activeIndex >= 0) {
      listboxRef.current
        ?.querySelector<HTMLElement>(`[id="${dropdownId}-option-${activeIndex}"]`)
        ?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex, dropdownId, isDropdownOpen]);

  useEffect(() => {
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!searchRef.current?.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, []);

  const clearSearch = () => {
    setSearchText("");
    setDebouncedQuery("");
    setIsDropdownOpen(true);
    setActiveIndex(-1);
  };

  const selectResult = (result: GameCatalogResult) => {
    if (isUnavailable(result)) return;
    onToggleGame(result);
    inputRef.current?.focus();
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      if (isDropdownOpen) {
        event.preventDefault();
        setIsDropdownOpen(false);
        setActiveIndex(-1);
      }
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setIsDropdownOpen(true);
      const available = suggestionResults
        .map((result, index) => isUnavailable(result) ? -1 : index)
        .filter((index) => index !== -1);
      if (available.length === 0 || suggestionLoading) return;
      const position = available.indexOf(activeIndex);
      const nextPosition = event.key === "ArrowDown"
        ? (position + 1) % available.length
        : (position - 1 + available.length) % available.length;
      setActiveIndex(available[nextPosition]);
    } else if (event.key === "Enter" && isDropdownOpen && activeIndex >= 0 && !suggestionLoading) {
      event.preventDefault();
      selectResult(suggestionResults[activeIndex]);
    }
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const nextTab = event.key === "Home" ? "discover"
      : event.key === "End" ? "my-games"
      : activeTab === "discover" ? "my-games" : "discover";
    setActiveTab(nextTab);
    (nextTab === "discover" ? discoverTabRef : myGamesTabRef).current?.focus();
  };

  return (
    <section className="flex min-h-0 w-full flex-1 flex-col gap-4 overflow-hidden bg-[#0F101B] text-white">
      <header className="shrink-0 space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#B9FF1A]">
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

      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
          <div
            ref={searchRef}
            className={`relative shrink-0 ${isDropdownOpen ? "z-20" : ""}`}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                setIsDropdownOpen(false);
              }
            }}
          >
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#b9c4cf]"
              aria-hidden="true"
            />
            <input
              ref={inputRef}
              type="search"
              value={searchText}
              onChange={(event) => {
                setSearchText(event.target.value);
                setIsDropdownOpen(true);
                setActiveIndex(-1);
              }}
              onFocus={() => setIsDropdownOpen(true)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search games"
              aria-label="Search the game catalogue"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={isDropdownOpen}
              aria-controls={isDropdownOpen ? dropdownId : undefined}
              aria-activedescendant={
                isDropdownOpen && !suggestionLoading && activeIndex >= 0
                  ? `${dropdownId}-option-${activeIndex}`
                  : undefined
              }
              className={`h-12 w-full rounded-lg border border-[#475263] bg-[#171923] pl-10 pr-11 text-base text-white placeholder:text-[#b9c4cf] hover:border-[#647184] ${focusClass}`}
            />
            {searchText.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  clearSearch();
                  inputRef.current?.focus();
                }}
                aria-label="Clear search and show trending games"
                title="Clear search"
                className={`absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[#a9b4be] hover:bg-white/10 hover:text-white ${focusClass}`}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
            {isDropdownOpen && (
              <div
                ref={listboxRef}
                id={dropdownId}
                role="listbox"
                aria-label="Game search suggestions"
                aria-busy={suggestionLoading}
                className="absolute inset-x-0 top-[calc(100%+6px)] max-h-[min(48vh,360px)] overflow-y-auto overscroll-contain rounded-xl border border-[#647184] bg-[#171923] p-1.5 shadow-2xl shadow-black/70"
              >
                <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[#b9c4cf]">
                  {isSearchActive ? `Results for “${trimmedSearch}”` : "Popular games"}
                </p>
                {suggestionLoading ? (
                  <p role="status" className="flex items-center gap-2 px-3 py-4 text-sm text-[#a9b4be]">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    {isSearchActive ? "Searching games…" : "Loading popular games…"}
                  </p>
                ) : suggestionError ? (
                  <div className="px-3 py-4 text-sm text-[#a9b4be]">
                    <p>Games didn’t load. Please try again.</p>
                    <button
                      type="button"
                      onClick={() => void (isSearchActive ? searchQuery.refetch() : topQuery.refetch())}
                      className={`mt-2 text-sm font-semibold text-[#B9FF1A] hover:underline ${focusClass}`}
                    >
                      Retry
                    </button>
                  </div>
                ) : suggestionResults.length === 0 ? (
                  <p className="px-3 py-4 text-sm text-[#a9b4be]">
                    {isSearchActive ? "No games found. Try another title." : "No popular games available right now."}
                  </p>
                ) : (
                  suggestionResults.map((result, index) => {
                    const selected = isSelected(result);
                    const unavailable = isUnavailable(result);
                    return (
                      <div key={result.id} role="presentation">
                        <button
                          id={`${dropdownId}-option-${index}`}
                          type="button"
                          role="option"
                          aria-selected={selected}
                          aria-disabled={unavailable}
                          disabled={unavailable}
                          onMouseDown={(event) => event.preventDefault()}
                          onMouseEnter={() => setActiveIndex(unavailable ? -1 : index)}
                          onClick={() => selectResult(result)}
                          className={`flex min-h-[108px] w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm ${focusClass} ${
                            selected
                              ? "cursor-not-allowed bg-[#1c2a1b] text-white"
                              : unavailable
                                ? "cursor-not-allowed text-[#b9c4cf]"
                                : activeIndex === index
                                  ? "bg-[#2a3525] text-white"
                                  : "text-white hover:bg-[#252a35]"
                          }`}
                        >
                          <GameArtwork src={result.box_art_url} name={result.name} className="h-24 w-20" />
                          <span className="min-w-0 flex-1">
                            <span className="block font-semibold leading-5">{result.name}</span>
                            <GameMetadata released={result.released} platforms={result.platforms} />
                          </span>
                          {selected ? (
                            <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[#B9FF1A]">
                              <Check className="h-4 w-4" aria-hidden="true" /> Added to My Games
                            </span>
                          ) : selectedGames.length >= maxGames ? (
                            <span className="shrink-0 text-xs text-[#b9c4cf]">Limit reached</span>
                          ) : (
                            <span className="shrink-0 text-xs font-semibold text-[#B9FF1A]">Add</span>
                          )}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          <div role="tablist" aria-label="Game selection" className="flex shrink-0 gap-1 border-b border-[#3b4353]">
            <button
              ref={discoverTabRef}
              id="onboarding-discover-tab"
              type="button"
              role="tab"
              aria-selected={activeTab === "discover"}
              aria-controls="onboarding-discover-panel"
              tabIndex={activeTab === "discover" ? 0 : -1}
              onClick={() => setActiveTab("discover")}
              onKeyDown={handleTabKeyDown}
              className={`min-h-11 border-b-2 px-4 text-sm font-semibold ${focusClass} ${
                activeTab === "discover"
                  ? "border-[#B9FF1A] text-[#B9FF1A]"
                  : "border-transparent text-[#c5cfda] hover:text-white"
              }`}
            >
              Discover Games
            </button>
            <button
              ref={myGamesTabRef}
              id="onboarding-my-games-tab"
              type="button"
              role="tab"
              aria-selected={activeTab === "my-games"}
              aria-controls="onboarding-my-games-panel"
              tabIndex={activeTab === "my-games" ? 0 : -1}
              onClick={() => setActiveTab("my-games")}
              onKeyDown={handleTabKeyDown}
              className={`min-h-11 border-b-2 px-4 text-sm font-semibold ${focusClass} ${
                activeTab === "my-games"
                  ? "border-[#B9FF1A] text-[#B9FF1A]"
                  : "border-transparent text-[#c5cfda] hover:text-white"
              }`}
            >
              My Games <span aria-live="polite">({selectedGames.length})</span>
            </button>
          </div>

          {selectionError && (
            <div role="alert" className="shrink-0 rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-100">
              {selectionError}
              {onRetryLoad && (
                <button
                  type="button"
                  onClick={onRetryLoad}
                  className={`ml-2 font-semibold underline hover:text-white ${focusClass}`}
                >
                  Retry
                </button>
              )}
            </div>
          )}
          {isSaving && (
            <p role="status" className="flex shrink-0 items-center gap-2 text-sm text-[#d0d9e2]">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Saving your games…
            </p>
          )}

          <div
            id="onboarding-discover-panel"
            role="tabpanel"
            aria-labelledby="onboarding-discover-tab"
            tabIndex={0}
            hidden={activeTab !== "discover"}
            className={`min-h-0 flex-1 flex-col gap-3 ${activeTab === "discover" ? "flex" : "hidden"}`}
          >
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-white">
                Popular games
              </h3>
              <p className="mt-0.5 text-xs text-[#8993a2]">
                Browse the catalogue or search for a game above.
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
            aria-busy={topQuery.isLoading}
          >
            {topQuery.isLoading ? (
              <SkeletonResults />
            ) : topQuery.isError ? (
              <div className={`${panelClass} px-5 py-8 text-center`}>
                <p className="text-sm font-medium text-white">
                  Games didn’t load
                </p>
                <p className="mt-1 text-sm text-[#8993a2]">
                  Check your connection and try again.
                </p>
                <button
                  type="button"
                  onClick={() => void topQuery.refetch()}
                  className={`mt-4 inline-flex min-h-10 items-center justify-center rounded-lg border border-[#4a5262] px-4 text-sm font-semibold text-white hover:border-[#B9FF1A] hover:text-[#B9FF1A] ${focusClass}`}
                >
                  <Loader2
                    className={`mr-2 h-4 w-4 ${topQuery.isFetching ? "animate-spin" : "hidden"}`}
                    aria-hidden="true"
                  />
                  Retry
                </button>
              </div>
            ) : trendingResults.length === 0 ? (
              <div className={`${panelClass} px-5 py-8 text-center`}>
                <p className="text-sm font-medium text-white">
                  No trending games yet
                </p>
                <p className="mt-1 text-sm text-[#8993a2]">
                  Try searching the catalogue for a game you play.
                </p>
              </div>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {trendingResults.map((result) => {
                  const selected = isSelected(result);
                  const unavailable = isUnavailable(result);
                  return (
                    <li key={result.id} className="min-w-0">
                      <button
                        type="button"
                        aria-pressed={selected}
                        aria-label={selected ? `${result.name} already selected` : `Select ${result.name}`}
                        disabled={unavailable}
                        onClick={() => selectResult(result)}
                        className={`group flex min-h-[72px] w-full min-w-0 items-center gap-3 rounded-lg border p-2.5 text-left disabled:cursor-not-allowed ${focusClass} ${
                          selected
                            ? "border-[#B9FF1A] bg-[#1c2a1b]"
                            : "border-[#3b4353] bg-[#171923] enabled:hover:border-[#647184] enabled:hover:bg-[#252a35] disabled:text-[#c5cfda]"
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
                          <span className="flex shrink-0 items-center gap-1.5 text-[#B9FF1A]" aria-hidden="true">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[#B9FF1A]">
                              <Check className="h-3.5 w-3.5" />
                            </span>
                            <span className="text-[11px] font-semibold">In My Games</span>
                          </span>
                        ) : selectedGames.length >= maxGames ? (
                          <span className="shrink-0 text-[11px] text-[#8993a2]">Limit reached</span>
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

          <div
            id="onboarding-my-games-panel"
            role="tabpanel"
            aria-labelledby="onboarding-my-games-tab"
            tabIndex={0}
            hidden={activeTab !== "my-games"}
            className={`min-h-0 flex-1 flex-col gap-3 ${activeTab === "my-games" ? "flex" : "hidden"}`}
          >
            {isHydrating ? (
              <p role="status" className={`${panelClass} flex items-center gap-2 px-5 py-8 text-sm text-[#d0d9e2]`}>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Loading your saved games…
              </p>
            ) : selectedGames.length === 0 ? (
              <div className={`${panelClass} flex flex-col items-center px-5 py-10 text-center`}>
                <h3 className="text-lg font-semibold text-white">Your games will appear here</h3>
                <p className="mt-2 text-sm text-[#c5cfda]">
                  Search for the games you play and add them to your Gamefolio.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("discover");
                    inputRef.current?.focus();
                    setIsDropdownOpen(true);
                  }}
                  className={`mt-5 min-h-11 rounded-lg bg-[#B9FF1A] px-5 text-sm font-bold text-[#10130b] hover:bg-[#d0ff6b] ${focusClass}`}
                >
                  Find Games
                </button>
              </div>
            ) : (
              <>
                <p className="shrink-0 text-sm text-[#c5cfda]">
                  {selectedGames.length >= maxGames
                    ? `You’ve reached the ${maxGames}-game limit. Remove a game to add another.`
                    : `${remaining} ${remaining === 1 ? "spot" : "spots"} remaining.`}
                </p>
                <ul className="grid min-h-0 grid-cols-1 gap-4 overflow-y-auto overscroll-contain pr-1 lg:grid-cols-2">
                  {selectedGames.map((game) => {
                    const metadata = metadataById.get(String(game.id)) ?? metadataById.get(game.twitchId ?? "");
                    return (
                      <li key={game.id} className={`${panelClass} min-w-0 overflow-hidden border-[#B9FF1A]/70`}>
                        <GameArtwork src={game.imageUrl} name={game.name} className="h-40 w-full rounded-none sm:h-48" />
                        <div className="space-y-3 p-4">
                          <div>
                            <h3 className="text-base font-bold leading-6 text-white">{game.name}</h3>
                            <GameMetadata released={metadata?.released} platforms={metadata?.platforms} />
                          </div>
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B9FF1A]">
                            <Check className="h-4 w-4" aria-hidden="true" /> In My Games
                          </span>
                          <div className="flex flex-wrap gap-2">
                            <a
                              href={publicGamePath(game.name)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[#647184] px-3 text-sm font-semibold text-white hover:border-[#B9FF1A] ${focusClass}`}
                            >
                              View Game <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                            </a>
                            <button
                              type="button"
                              onClick={() => onRemoveGame(game)}
                              disabled={isSaving || isHydrating}
                              aria-label={`Remove ${game.name} from My Games`}
                              className={`min-h-10 rounded-lg border border-[#647184] px-3 text-sm font-semibold text-white enabled:hover:border-red-300 disabled:cursor-not-allowed disabled:opacity-60 ${focusClass}`}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>
      </div>

      <footer className="flex shrink-0 flex-col gap-2 border-t border-[#3b4353] pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="min-h-5 text-xs leading-5 text-[#8993a2]" aria-live="polite">
          {isHydrating
            ? "Loading your saved games…"
            : isSaving
              ? "Saving your games…"
              : selectionError
                ? "Your last change was not saved. Please try again or skip this step."
                : selectedGames.length < minGames
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
            aria-describedby={selectedGames.length < minGames ? "game-picker-next-reason" : undefined}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-bold ${
              canContinue
                ? "bg-[#B9FF1A] text-[#10130b] hover:bg-[#d0ff6b]"
                : "cursor-not-allowed border border-[#343a48] bg-[#1a1d26] text-[#73808b]"
            } ${focusClass}`}
          >
            Next
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        {selectedGames.length < minGames && (
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