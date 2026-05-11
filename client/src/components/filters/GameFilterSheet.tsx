import { useState, useMemo } from "react";
import { Gamepad2, X, Search, Check } from "lucide-react";
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

  const close = () => {
    setOpen(false);
    setSearchQuery("");
  };

  const isActive = selectedGameId !== null;

  return (
    <>
      {/* Pill trigger */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm font-medium transition-all"
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
      </button>

      {/* Bottom-sheet overlay */}
      {open && (
        <div
          className="fixed inset-0 z-[90] flex items-end"
          style={{ background: 'rgba(0,0,0,0.65)' }}
          onClick={close}
        >
          <div
            className="w-full rounded-t-3xl flex flex-col"
            style={{ background: '#0F1923', maxHeight: '82vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4">
              <div className="flex items-center gap-2.5">
                <Gamepad2 className="h-6 w-6" style={{ color: '#B7FF1A' }} />
                <span className="text-white font-bold text-lg">Filter {label} by Game</span>
              </div>
              <button onClick={close} className="text-white/70 hover:text-white transition-colors">
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Search */}
            <div className="px-4 pb-4">
              <div
                className="flex items-center gap-3 rounded-2xl px-4 py-3"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(183,255,26,0.35)' }}
              >
                <Search className="h-4 w-4 shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }} />
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search games..."
                  className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/40"
                />
              </div>
            </div>

            <p className="px-4 pb-3 text-white font-semibold text-base">Available Games</p>

            {/* 3-column grid */}
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
