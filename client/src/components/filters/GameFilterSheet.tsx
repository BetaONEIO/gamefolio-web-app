import { useState, useMemo, useEffect, useRef } from "react";
import { Gamepad2, X, Search, Check, ChevronDown } from "lucide-react";
import { ClipWithUser } from "@shared/schema";

interface GameFilterSheetProps {
  clips: ClipWithUser[];
  selectedGameId: number | null;
  selectedGameName: string | null;
  onGameSelect: (gameId: number | null, gameName: string | null) => void;
  label?: string;
}

export function GameFilterSheet({
  clips,
  selectedGameId,
  selectedGameName,
  onGameSelect,
  label = "Content",
}: GameFilterSheetProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [isDesktop, setIsDesktop] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const availableGames = useMemo(() => {
    const seen = new Map<number, { id: number; name: string; imageUrl?: string }>();
    for (const clip of clips) {
      if (clip.game?.id && !seen.has(clip.game.id)) {
        seen.set(clip.game.id, {
          id: clip.game.id,
          name: clip.game.name,
          imageUrl: clip.game.imageUrl ?? undefined,
        });
      }
    }
    return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [clips]);

  const filteredGames = useMemo(() => {
    if (!searchQuery.trim()) return availableGames;
    const q = searchQuery.toLowerCase();
    return availableGames.filter((g) => g.name.toLowerCase().includes(q));
  }, [availableGames, searchQuery]);

  // Keyboard-aware: shift sheet up when virtual keyboard appears (mobile only)
  useEffect(() => {
    if (!open || isDesktop) {
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
  }, [open, isDesktop]);

  // Close dropdown on outside click (desktop)
  useEffect(() => {
    if (!open || !isDesktop) return;
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        close();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, isDesktop]);

  const close = () => {
    setOpen(false);
    setSearchQuery("");
  };

  const isActive = selectedGameId !== null;

  const triggerButton = (
    <button
      ref={triggerRef}
      onClick={() => setOpen((v) => !v)}
      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all"
      style={{
        background: isActive ? 'rgba(183,255,26,0.15)' : 'rgba(255,255,255,0.06)',
        border: isActive ? '1.5px solid #B7FF1A' : '1.5px solid rgba(255,255,255,0.15)',
        color: isActive ? '#B7FF1A' : 'rgba(255,255,255,0.8)',
      }}
    >
      <Gamepad2 className="h-3.5 w-3.5 shrink-0" style={{ color: isActive ? '#B7FF1A' : undefined }} />
      <span className="max-w-[120px] truncate">
        {selectedGameName ?? "All Games"}
      </span>
      {isDesktop && <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />}
    </button>
  );

  // ── Desktop: Popover dropdown ──────────────────────────────────────────────
  if (isDesktop) {
    return (
      <div className="relative">
        {triggerButton}

        {open && (
          <div
            ref={dropdownRef}
            className="absolute left-0 top-full mt-1.5 z-[9999] flex flex-col rounded-xl overflow-hidden shadow-2xl"
            style={{
              background: '#0F1923',
              border: '1px solid rgba(255,255,255,0.1)',
              width: '300px',
              maxHeight: '480px',
            }}
          >
            {/* Search */}
            <div className="px-3 pt-3 pb-2">
              <div
                className="flex items-center gap-2 rounded-lg px-3 py-2"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(183,255,26,0.3)' }}
              >
                <Search className="h-3.5 w-3.5 shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }} />
                <input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search games..."
                  autoFocus
                  style={{ fontSize: '13px', color: '#fff', background: 'transparent', outline: 'none', border: 'none', width: '100%' }}
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto pb-2" style={{ minHeight: 0 }}>
              {/* All Games row */}
              <button
                className="w-full flex items-center gap-3 px-3 py-2 transition-colors hover:bg-white/5"
                style={{ background: !selectedGameId ? 'rgba(183,255,26,0.08)' : undefined }}
                onClick={() => { onGameSelect(null, null); close(); }}
              >
                <div
                  className="flex-shrink-0 rounded overflow-hidden flex items-center justify-center"
                  style={{ width: '45px', height: '60px', background: '#1A2736', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <Gamepad2 className="h-4 w-4" style={{ color: '#B7FF1A' }} />
                </div>
                <span className="flex-1 text-left text-sm font-semibold text-white">All Games</span>
                {!selectedGameId && <Check className="h-3.5 w-3.5 shrink-0" style={{ color: '#B7FF1A' }} strokeWidth={3} />}
              </button>

              {/* Divider */}
              <div className="mx-3 my-1" style={{ height: '1px', background: 'rgba(255,255,255,0.07)' }} />

              {/* Empty state */}
              {filteredGames.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <Gamepad2 className="h-6 w-6" style={{ color: 'rgba(183,255,26,0.3)' }} />
                  <p className="text-white/40 text-xs">No matching games</p>
                </div>
              )}

              {/* Game rows */}
              {filteredGames.map((game) => {
                const isSelected = selectedGameId === game.id;
                const imgSrc = game.imageUrl
                  ? game.imageUrl.replace('{width}', '60').replace('{height}', '80')
                  : null;
                return (
                  <button
                    key={game.id}
                    className="w-full flex items-center gap-3 px-3 py-2 transition-colors hover:bg-white/5"
                    style={{ background: isSelected ? 'rgba(183,255,26,0.08)' : undefined }}
                    onClick={() => { onGameSelect(game.id, game.name); close(); }}
                  >
                    <div
                      className="flex-shrink-0 rounded overflow-hidden"
                      style={{ width: '45px', height: '60px', background: '#1A2736', border: isSelected ? '1.5px solid #B7FF1A' : '1px solid rgba(255,255,255,0.1)' }}
                    >
                      {imgSrc ? (
                        <img src={imgSrc} alt={game.name} className="w-full h-full object-contain" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Gamepad2 className="h-3 w-3" style={{ color: 'rgba(255,255,255,0.3)' }} />
                        </div>
                      )}
                    </div>
                    <span className="flex-1 text-left text-sm text-white/90 truncate">{game.name}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 shrink-0" style={{ color: '#B7FF1A' }} strokeWidth={3} />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Mobile: Full-screen sheet ──────────────────────────────────────────────
  return (
    <>
      {triggerButton}

      {open && (
        <div
          className="fixed inset-0 flex flex-col"
          style={{ zIndex: 99999, background: 'rgba(0,0,0,0.92)' }}
          onClick={close}
        >
          <div
            className="w-full flex flex-col"
            style={{
              background: '#0F1923',
              height: `calc(100% - ${keyboardOffset}px)`,
              transition: 'height 0.2s ease',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-12 pb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <Gamepad2 className="h-5 w-5 shrink-0" style={{ color: '#B7FF1A' }} />
                <span className="text-white font-bold text-base truncate">Filter {label} by Game</span>
              </div>
              <button onClick={close} className="text-white/70 hover:text-white transition-colors p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search */}
            <div className="px-4 pb-3">
              <div
                className="flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(183,255,26,0.35)' }}
              >
                <Search className="h-4 w-4 shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }} />
                <input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => {
                    setTimeout(() => {
                      searchInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }, 100);
                  }}
                  placeholder="Search games..."
                  style={{ fontSize: '16px', color: '#fff', background: 'transparent', outline: 'none', border: 'none', width: '100%' }}
                />
              </div>
            </div>

            <p className="px-4 pb-3 text-white font-semibold text-sm">Available Games</p>

            {/* 3-column grid with 3:4 portrait cards (mobile style) */}
            <div className="flex-1 overflow-y-auto px-3 pb-8">
              <div className="grid grid-cols-3 gap-2">
                {/* All Games card */}
                <button
                  className="relative rounded-xl overflow-hidden flex flex-col items-center justify-center transition-all"
                  style={{
                    aspectRatio: '3/4',
                    background: '#1A2736',
                    border: !selectedGameId ? '2.5px solid #B7FF1A' : '2px solid rgba(255,255,255,0.08)',
                  }}
                  onClick={() => { onGameSelect(null, null); close(); }}
                >
                  {!selectedGameId && (
                    <div
                      className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: '#B7FF1A' }}
                    >
                      <Check className="h-3 w-3 text-black" strokeWidth={3} />
                    </div>
                  )}
                  <Gamepad2 className="h-7 w-7 mb-1" style={{ color: '#B7FF1A' }} />
                  <span className="text-white text-[11px] font-bold text-center px-1 leading-tight">All Games</span>
                </button>

                {/* Empty state */}
                {filteredGames.length === 0 && (
                  <div className="col-span-3 flex flex-col items-center justify-center py-10 gap-2">
                    <Gamepad2 className="h-8 w-8" style={{ color: 'rgba(183,255,26,0.3)' }} />
                    <p className="text-white/40 text-sm text-center">No matching games found</p>
                  </div>
                )}

                {/* Game cards */}
                {filteredGames.map((game) => {
                  const isSelected = selectedGameId === game.id;
                  const imgSrc = game.imageUrl
                    ? game.imageUrl.replace('{width}', '144').replace('{height}', '192')
                    : null;
                  return (
                    <button
                      key={game.id}
                      className="relative rounded-xl overflow-hidden flex flex-col justify-end transition-all"
                      style={{
                        aspectRatio: '3/4',
                        background: '#1A2736',
                        border: isSelected ? '2.5px solid #B7FF1A' : '2px solid rgba(255,255,255,0.08)',
                      }}
                      onClick={() => { onGameSelect(game.id, game.name); close(); }}
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
                        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 55%, transparent 100%)' }}
                      />
                      {isSelected && (
                        <div
                          className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                          style={{ background: '#B7FF1A' }}
                        >
                          <Check className="h-3 w-3 text-black" strokeWidth={3} />
                        </div>
                      )}
                      <div className="relative z-10 px-1.5 pb-1.5">
                        <p className="text-white text-[11px] font-bold leading-tight line-clamp-2">{game.name}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
