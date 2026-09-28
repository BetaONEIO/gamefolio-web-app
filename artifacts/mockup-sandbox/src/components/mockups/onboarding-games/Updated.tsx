import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  ArrowRight,
  Check,
  ExternalLink,
  Loader2,
  Search,
  X,
} from "lucide-react";
import "./_group.css";

interface GameCatalogResult {
  id: string;
  name: string;
  box_art_url?: string | null;
  released?: string | null;
  platforms?: string[];
  artwork_position?: string | null;
}

interface Game {
  id: number;
  name: string;
  imageUrl: string | null;
  twitchId: string;
}

const panelClass = "rounded-xl border border-[#303747] bg-[#171923]";
const focusClass =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B9FF1A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F101B]";
const maxGames: number = 5;
const minGames: number = 1;

const catalogue: GameCatalogResult[] = [
  { id: "elden-ring", name: "Elden Ring", box_art_url: "https://cdn.akamai.steamstatic.com/steam/apps/1245620/header.jpg", released: "2022-02-25", platforms: ["PC", "PlayStation 5", "Xbox Series X|S"] },
  { id: "valorant", name: "VALORANT", box_art_url: "https://images.igdb.com/igdb/image/upload/t_cover_big/co2mvt.jpg", released: "2020-06-02", platforms: ["PC", "PlayStation 5", "Xbox Series X|S"] },
  { id: "fortnite", name: "Fortnite", box_art_url: "https://cdn.akamai.steamstatic.com/steam/apps/578080/header.jpg", released: "2017-07-25", platforms: ["PC", "PlayStation 5", "Xbox Series X|S", "Nintendo Switch"] },
  { id: "minecraft", name: "Minecraft", box_art_url: "https://images.igdb.com/igdb/image/upload/t_cover_big/co49x5.jpg", released: "2011-11-18", platforms: ["PC", "PlayStation 5", "Xbox Series X|S", "Nintendo Switch"] },
  { id: "apex-legends", name: "Apex Legends", box_art_url: "https://cdn.akamai.steamstatic.com/steam/apps/1172470/header.jpg", released: "2019-02-04", platforms: ["PC", "PlayStation 5", "Xbox Series X|S"] },
  { id: "league-of-legends", name: "League of Legends", box_art_url: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1r7h.jpg", released: "2009-10-27", platforms: ["PC", "Mac"] },
  { id: "cyberpunk-2077", name: "Cyberpunk 2077", box_art_url: "https://cdn.akamai.steamstatic.com/steam/apps/1091500/header.jpg", released: "2020-12-10", platforms: ["PC", "PlayStation 5", "Xbox Series X|S"] },
  { id: "overwatch-2", name: "Overwatch 2", box_art_url: "https://images.igdb.com/igdb/image/upload/t_cover_big/co5s5v.jpg", released: "2022-10-04", platforms: ["PC", "PlayStation 5", "Xbox Series X|S", "Nintendo Switch"] },
  { id: "counter-strike-2", name: "Counter-Strike 2", box_art_url: "https://cdn.akamai.steamstatic.com/steam/apps/730/header.jpg", released: "2023-09-27", platforms: ["PC", "Linux"] },
  { id: "rocket-league", name: "Rocket League", box_art_url: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1wyy.jpg", released: "2015-07-07", platforms: ["PC", "PlayStation 5", "Xbox Series X|S", "Nintendo Switch"] },
  { id: "call-of-duty", name: "Call of Duty: Warzone", box_art_url: "https://images.igdb.com/igdb/image/upload/t_cover_big/co6u4b.jpg", released: "2020-03-10", platforms: ["PC", "PlayStation 5", "Xbox Series X|S"] },
  { id: "stardew-valley", name: "Stardew Valley", box_art_url: "https://cdn.akamai.steamstatic.com/steam/apps/413150/header.jpg", released: "2016-02-26", platforms: ["PC", "Mac", "PlayStation 5", "Xbox Series X|S", "Nintendo Switch"] },
];

const initialGames: Game[] = [
  {
    id: 1,
    name: "Elden Ring",
    imageUrl: catalogue[0].box_art_url ?? null,
    twitchId: catalogue[0].id,
  },
  {
    id: 2,
    name: "VALORANT",
    imageUrl: catalogue[1].box_art_url ?? null,
    twitchId: catalogue[1].id,
  },
];

const publicGamePath = (name: string) =>
  `/games/${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;

function GameArtwork({
  src,
  name,
  className,
  cover = false,
  objectPosition,
}: {
  src: string | null | undefined;
  name: string;
  className: string;
  cover?: boolean;
  objectPosition?: string | null;
}) {
  const [failed, setFailed] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const resolvedSrc = src
    ?.replace("{width}", "285")
    .replace("{height}", "380");

  useEffect(() => {
    setFailed(false);
    setIsLandscape(false);
  }, [src]);

  return (
    <div
      className={`overflow-hidden bg-[#202431] ${
        cover
          ? "absolute inset-0 h-full w-full"
          : `relative shrink-0 rounded-md ${className}`
      }`}
      aria-hidden="true"
    >
      {!failed && resolvedSrc ? (
        <>
          {cover && isLandscape && (
            <>
              <img
                src={resolvedSrc}
                alt=""
                aria-hidden="true"
                loading="lazy"
                className="absolute inset-0 h-full w-full scale-110 object-cover blur-xl"
              />
              <span
                className="absolute inset-0 bg-[#0F101B]/55"
                aria-hidden="true"
              />
            </>
          )}
          <img
            src={resolvedSrc}
            alt=""
            loading="lazy"
            className={`h-full w-full ${
              cover && isLandscape ? "relative object-contain p-2" : "object-cover"
            }`}
            style={{ objectPosition: objectPosition ?? "center" }}
            onLoad={(event) => {
              if (cover) {
                setIsLandscape(
                  event.currentTarget.naturalWidth > event.currentTarget.naturalHeight,
                );
              }
            }}
            onError={() => setFailed(true)}
          />
        </>
      ) : (
        <span
          className={`flex h-full w-full items-center justify-center text-center font-bold ${
            cover
              ? "flex-col gap-2 bg-gradient-to-br from-[#273047] via-[#171923] to-[#10121a] px-5 text-white"
              : "px-1 text-[10px] leading-tight text-[#8993a2]"
          }`}
        >
          <span className={cover ? "text-3xl text-[#B9FF1A]" : ""}>
            {name.slice(0, 2).toUpperCase()}
          </span>
          {cover && (
            <span className="line-clamp-2 text-sm font-semibold text-white/85">
              {name}
            </span>
          )}
        </span>
      )}
    </div>
  );
}

function GameMetadata({
  released,
  platforms,
  className,
}: Pick<GameCatalogResult, "released" | "platforms"> & { className?: string }) {
  const year = released?.match(/^\d{4}/)?.[0];
  const platformNames = platforms?.filter(Boolean) ?? [];
  if (!year && platformNames.length === 0) return null;

  return (
    <span className={className ?? "block text-xs leading-5 text-[#b9c4cf]"}>
      {[year, platformNames.length > 0 ? platformNames.slice(0, 3).join(", ") : null]
        .filter(Boolean)
        .join(" · ")}
      {platformNames.length > 3 ? ` +${platformNames.length - 3}` : ""}
    </span>
  );
}

function OnboardingProgress() {
  return (
    <div
      aria-label="Onboarding progress"
      className="ob-step-indicator w-full max-w-[840px] shrink-0"
    >
      <div className="flex items-center">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className={`flex items-center ${index < 5 ? "flex-1" : ""}`}
          >
            <div
              aria-label={`Step ${index + 1}`}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-medium ${
                index < 2
                  ? "border-[#B9FF1A] bg-[#B9FF1A]/15 text-[#B9FF1A]"
                  : index === 2
                    ? "border-[#B9FF1A] bg-[#B9FF1A] font-bold text-[#0A0A10]"
                    : "border-[#B9FF1A]/20 bg-[#171923] text-[#737b87]"
              }`}
            >
              {index < 2 ? (
                <Check className="h-4 w-4" aria-hidden="true" />
              ) : (
                index + 1
              )}
            </div>
            {index < 5 && (
              <div className="relative mx-2 h-0.5 flex-1 rounded-full bg-[#B9FF1A]/15">
                {index < 2 && (
                  <span className="absolute inset-0 rounded-full bg-[#B9FF1A]" />
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Updated() {
  const previewParams = new URLSearchParams(window.location.search);
  const previewSearch = previewParams.get("search") ?? "";
  const [searchText, setSearchText] = useState(previewSearch);
  const [debouncedQuery, setDebouncedQuery] = useState(previewSearch.trim());
  const [selectedGames, setSelectedGames] = useState<Game[]>(initialGames);
  const [isDropdownOpen, setIsDropdownOpen] = useState(previewParams.has("search"));
  const [activeIndex, setActiveIndex] = useState(-1);
  const [activeTab, setActiveTab] = useState<"discover" | "my-games">(
    previewParams.get("tab") === "my-games" ? "my-games" : "discover",
  );
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
  const canContinue = selectedGames.length >= minGames;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(searchText.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchText]);

  const results = useMemo(
    () =>
      isSearchActive
        ? catalogue.filter((game) =>
            game.name.toLowerCase().includes(debouncedQuery.toLowerCase()),
          )
        : [],
    [isSearchActive, debouncedQuery],
  );
  const trendingResults = catalogue;
  const suggestionResults = isSearchActive ? results : trendingResults;
  const suggestionLoading = waitingForDebounce;
  const metadataById = useMemo(
    () => new Map(catalogue.map((game) => [game.id, game])),
    [],
  );

  const isSelected = (result: GameCatalogResult) =>
    selectedGames.some(
      (game) => game.twitchId === result.id || String(game.id) === result.id,
    );
  const isUnavailable = (result: GameCatalogResult) =>
    isSelected(result) || selectedGames.length >= maxGames;

  useEffect(() => {
    if (!isDropdownOpen || suggestionLoading) {
      setActiveIndex(-1);
      return;
    }
    setActiveIndex(suggestionResults.findIndex((result) => !isUnavailable(result)));
  }, [isDropdownOpen, suggestionLoading, suggestionResults, selectedGames]);

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
    setSelectedGames((games) => [
      ...games,
      {
        id: games.reduce((highestId, game) => Math.max(highestId, game.id), 0) + 1,
        name: result.name,
        imageUrl: result.box_art_url ?? null,
        twitchId: result.id,
      },
    ]);
    inputRef.current?.focus();
  };

  const removeGame = (gameToRemove: Game) => {
    setSelectedGames((games) => games.filter((game) => game !== gameToRemove));
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
        .map((result, index) => (isUnavailable(result) ? -1 : index))
        .filter((index) => index !== -1);
      if (available.length === 0 || suggestionLoading) return;
      const position = available.indexOf(activeIndex);
      const nextPosition =
        event.key === "ArrowDown"
          ? (position + 1) % available.length
          : (position - 1 + available.length) % available.length;
      setActiveIndex(available[nextPosition]);
    } else if (
      event.key === "Enter" &&
      isDropdownOpen &&
      activeIndex >= 0 &&
      !suggestionLoading
    ) {
      event.preventDefault();
      selectResult(suggestionResults[activeIndex]);
    }
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const nextTab =
      event.key === "Home"
        ? "discover"
        : event.key === "End"
          ? "my-games"
          : activeTab === "discover"
            ? "my-games"
            : "discover";
    setActiveTab(nextTab);
    (nextTab === "discover" ? discoverTabRef : myGamesTabRef).current?.focus();
  };

  return (
    <main className="onboarding-games min-h-dvh bg-[#0F101B]">
      <div className="flex min-h-dvh w-full items-center justify-center sm:p-4">
        <div className="ob-game-step-shell relative flex h-dvh w-full flex-col overflow-hidden bg-[#0F101B] p-5 pt-6 shadow-lg sm:h-[calc(100dvh-2rem)] sm:max-w-lg sm:px-8 sm:pt-6 sm:pb-10 sm:rounded-xl sm:border sm:border-[#B9FF1A]/20 md:max-w-[1400px] md:p-12 2xl:p-16">
          <div className="mb-2 flex h-8 shrink-0 items-center md:hidden">
            <button
              type="button"
              className="-ml-2 rounded-lg px-2 py-1.5 text-sm text-[#8993a2]"
            >
              ‹ Back
            </button>
          </div>
          <div className="ob-game-step-progress mb-4 hidden h-8 shrink-0 items-center md:flex">
            <div className="flex w-14 shrink-0 items-center">
              <button
                type="button"
                className="-ml-2 rounded-lg px-2 py-1.5 text-sm text-[#8993a2]"
              >
                ‹ Back
              </button>
            </div>
            <div className="flex min-w-0 flex-1 justify-center">
              <OnboardingProgress />
            </div>
            <div className="w-14 shrink-0" aria-hidden="true" />
          </div>
          <div className="mb-2 md:hidden">
            <OnboardingProgress />
          </div>
          <section className="ob-game-picker-root flex min-h-0 w-full flex-1 flex-col gap-3 overflow-hidden bg-[#0F101B] text-white">
        <header className="shrink-0 space-y-1.5">
          <p className="ob-game-step-eyebrow text-xs font-semibold uppercase tracking-[0.18em] text-[#B9FF1A]">
            Make it yours
          </p>
          <h2 className="text-2xl font-bold tracking-tight sm:text-[28px]">
            Choose Your Favourite Games
          </h2>
          <p className="ob-game-step-description max-w-2xl text-sm leading-6 text-[#A9B4BE]">
            Choose up to {maxGames} games to personalise your profile and
            recommendations, or add them later.
          </p>
        </header>

        <div className="ob-game-picker-content flex min-h-0 min-w-0 flex-1 flex-col gap-3">
          <div
            ref={searchRef}
            className={`relative z-20 shrink-0 ${isDropdownOpen ? "z-30" : ""}`}
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
              className={`ob-game-search-field h-12 w-full rounded-lg border border-[#475263] bg-[#171923] pl-10 pr-11 text-base text-white placeholder:text-[#b9c4cf] hover:border-[#647184] ${focusClass}`}
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
                  {isSearchActive
                    ? `Results for “${trimmedSearch}”`
                    : "Popular games"}
                </p>
                {suggestionLoading ? (
                  <p
                    role="status"
                    className="flex items-center gap-2 px-3 py-4 text-sm text-[#a9b4be]"
                  >
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                    Searching games…
                  </p>
                ) : suggestionResults.length === 0 ? (
                  <p className="px-3 py-4 text-sm text-[#a9b4be]">
                    No games found. Try another title.
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
                          onMouseEnter={() =>
                            setActiveIndex(unavailable ? -1 : index)
                          }
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
                          <GameArtwork
                            src={result.box_art_url}
                            name={result.name}
                            className="h-[72px] w-12"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block font-semibold leading-5">
                              {result.name}
                            </span>
                            <GameMetadata
                              released={result.released}
                              platforms={result.platforms}
                            />
                          </span>
                          {selected ? (
                            <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[#B9FF1A]">
                              <Check className="h-4 w-4" aria-hidden="true" />
                              Added to My Games
                            </span>
                          ) : selectedGames.length >= maxGames ? (
                            <span className="shrink-0 text-xs text-[#b9c4cf]">
                              Limit reached
                            </span>
                          ) : (
                            <span className="shrink-0 text-xs font-semibold text-[#B9FF1A]">
                              Add
                            </span>
                          )}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          <div
            role="tablist"
            aria-label="Game selection"
            className="ob-game-tabs flex shrink-0 gap-1 border-b border-[#3b4353]"
          >
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
              className={`ob-game-tab-button min-h-12 border-b-2 px-3 text-sm font-semibold sm:px-5 sm:text-base ${focusClass} ${
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
              className={`ob-game-tab-button min-h-12 border-b-2 px-3 text-sm font-semibold sm:px-5 sm:text-base ${focusClass} ${
                activeTab === "my-games"
                  ? "border-[#B9FF1A] text-[#B9FF1A]"
                  : "border-transparent text-[#c5cfda] hover:text-white"
              }`}
            >
              My Games <span aria-live="polite">({selectedGames.length})</span>
            </button>
          </div>

          <div
            id="onboarding-discover-panel"
            role="tabpanel"
            aria-labelledby="onboarding-discover-tab"
            tabIndex={0}
            hidden={activeTab !== "discover"}
            className={`min-h-0 flex-1 flex-col gap-3 ${
              activeTab === "discover" ? "flex" : "hidden"
            }`}
          >
            <div className="ob-game-grid-heading flex shrink-0 flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold text-white">
                  Popular games
                </h3>
                <p className="ob-game-grid-heading-detail mt-0.5 text-xs text-[#8993a2]">
                  Browse the catalogue or search for a game above.
                </p>
              </div>
              <span
                className="rounded-full border border-[#3b4353] bg-[#171923] px-3 py-1.5 text-xs font-semibold text-[#dbe3eb]"
                aria-live="polite"
                aria-label={`${selectedGames.length} of ${maxGames} games selected`}
              >
                {selectedGames.length} of {maxGames} selected
              </span>
            </div>
            <div
              id="game-catalogue-results"
              className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain pb-8 pr-1"
              aria-live="polite"
            >
              <ul className="ob-game-card-grid grid gap-4">
                {trendingResults.map((result) => {
                  const selected = isSelected(result);
                  const unavailable =
                    selected || selectedGames.length >= maxGames;
                  return (
                    <li key={result.id} className="min-w-0">
                      <button
                        type="button"
                        aria-pressed={selected}
                        aria-label={
                          selected
                            ? `${result.name} already in My Games`
                            : `Add ${result.name} to My Games`
                        }
                        disabled={unavailable}
                        onClick={() => selectResult(result)}
                        className={`group flex w-full min-w-0 flex-col rounded-lg text-left transition-transform enabled:hover:-translate-y-0.5 disabled:cursor-not-allowed ${focusClass}`}
                      >
                        <span
                          className={`relative block aspect-[2/3] w-full overflow-hidden rounded-lg border bg-[#171923] transition-colors ${
                            selected
                              ? "border-2 border-[#B9FF1A]"
                              : "border-[#3b4353] group-hover:border-[#B9FF1A]/70"
                          }`}
                        >
                          <GameArtwork
                            src={result.box_art_url}
                            name={result.name}
                            className=""
                            cover
                            objectPosition={result.artwork_position}
                          />
                          {selected && (
                            <span
                              className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#B9FF1A] text-[#10130b] shadow-lg"
                              aria-hidden="true"
                            >
                              <Check className="h-4 w-4" />
                            </span>
                          )}
                        </span>
                        <span className="flex min-h-[100px] w-full flex-col gap-1 px-0.5 pt-2">
                          <span
                            className="line-clamp-2 min-h-8 text-sm font-bold leading-4 text-white"
                            title={result.name}
                          >
                            {result.name}
                          </span>
                          <span className="min-h-4">
                            <GameMetadata
                              released={result.released}
                              platforms={result.platforms}
                              className="line-clamp-1 text-[11px] leading-4 text-[#b9c4cf]"
                            />
                          </span>
                          <span
                            className={`mt-auto inline-flex min-h-8 w-full items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-bold ${
                              selected
                                ? "bg-[#B9FF1A] text-[#10130b]"
                                : selectedGames.length >= maxGames
                                  ? "border border-[#454b58] bg-[#1b1e27] text-[#a8b1bf]"
                                  : "bg-[#B9FF1A] text-[#10130b] group-hover:bg-[#d0ff6b]"
                            }`}
                            aria-hidden="true"
                          >
                            {selected ? (
                              <>
                                <Check className="h-3.5 w-3.5" />
                                Added
                              </>
                            ) : selectedGames.length >= maxGames ? (
                              "Limit reached"
                            ) : (
                              <>+ Add Game</>
                            )}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          <div
            id="onboarding-my-games-panel"
            role="tabpanel"
            aria-labelledby="onboarding-my-games-tab"
            tabIndex={0}
            hidden={activeTab !== "my-games"}
            className={`min-h-0 flex-1 flex-col gap-3 ${
              activeTab === "my-games" ? "flex" : "hidden"
            }`}
          >
            {selectedGames.length === 0 ? (
              <div
                className={`${panelClass} flex flex-col items-center px-5 py-10 text-center`}
              >
                <h3 className="text-lg font-semibold text-white">
                  Your games will appear here
                </h3>
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
                <ul className="ob-game-card-grid grid min-h-0 flex-1 gap-4 overflow-y-auto overscroll-contain pb-8 pr-1">
                  {selectedGames.map((game) => {
                    const metadata =
                      metadataById.get(game.twitchId) ??
                      metadataById.get(String(game.id));
                    return (
                      <li key={game.id} className="min-w-0">
                        <article className="flex min-w-0 flex-col">
                          <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg border-2 border-[#B9FF1A]/80 bg-[#171923]">
                            <GameArtwork
                              src={game.imageUrl}
                              name={game.name}
                              className=""
                              cover
                              objectPosition={metadata?.artwork_position}
                            />
                            <span
                              className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#B9FF1A] text-[#10130b] shadow-lg"
                              aria-hidden="true"
                            >
                              <Check className="h-4 w-4" />
                            </span>
                          </div>
                          <div className="flex min-h-[100px] flex-col gap-1 px-0.5 pt-2">
                            <h3 className="line-clamp-2 min-h-8 text-sm font-bold leading-4 text-white" title={game.name}>
                              {game.name}
                            </h3>
                            <span className="min-h-4">
                              <GameMetadata
                                released={metadata?.released}
                                platforms={metadata?.platforms}
                                className="line-clamp-1 text-[11px] leading-4 text-[#b9c4cf]"
                              />
                            </span>
                            <div className="mt-auto flex min-w-0 flex-wrap items-center justify-between gap-2">
                              <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[#B9FF1A]">
                                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                                Added
                              </span>
                              <div className="flex shrink-0 gap-1.5">
                                <a
                                  href={publicGamePath(game.name)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`inline-flex min-h-8 items-center gap-1 rounded-lg border border-[#647184] px-2 text-xs font-semibold text-white hover:border-[#B9FF1A] ${focusClass}`}
                                >
                                  View <ExternalLink className="h-3 w-3" aria-hidden="true" />
                                </a>
                                <button
                                  type="button"
                                  onClick={() => removeGame(game)}
                                  aria-label={`Remove ${game.name} from My Games`}
                                  className={`min-h-8 rounded-lg border border-[#647184] px-2 text-xs font-semibold text-white enabled:hover:border-red-300 ${focusClass}`}
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          </div>
                        </article>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>
        </div>

        <footer className="sticky bottom-0 z-10 flex min-h-[88px] shrink-0 flex-col gap-2 border-t border-white/15 bg-[#0F101B] py-3 shadow-[0_-16px_32px_rgba(0,0,0,0.45)] sm:flex-row sm:items-center sm:justify-between sm:py-5">
          <p
            className="min-h-5 text-sm font-medium leading-5 text-[#d0d9e2]"
            aria-live="polite"
          >
            Choose up to {maxGames} games, or skip this step and add them later.
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => undefined}
              className={`min-h-11 rounded-lg px-4 text-sm font-semibold text-[#c4ccd6] hover:bg-white/5 hover:text-white ${focusClass}`}
            >
              Skip for now
            </button>
            <button
              type="button"
              onClick={() => undefined}
              disabled={!canContinue}
              aria-describedby={
                selectedGames.length < minGames
                  ? "game-picker-next-reason"
                  : undefined
              }
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
        </div>
      </div>
    </main>
  );
}

export default Updated;