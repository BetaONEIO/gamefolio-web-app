import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { ClipWithUser } from "@shared/schema";
import { useClipDialog } from "@/hooks/use-clip-dialog";
import { Play, ChevronLeft, ChevronRight, Eye, Flame } from "lucide-react";
import { Link } from "wouter";

const NEON = "#B7FF1A";

export default function LatestContentSlider() {
  const [mode, setMode] = useState<"clips" | "reels">("clips");
  const [activeIndex, setActiveIndex] = useState(0);
  const [gameKey, setGameKey] = useState(0);
  const { openClipDialog } = useClipDialog();

  const { data: clipsData, isLoading: clipsLoading } = useQuery<ClipWithUser[]>({
    queryKey: ["/api/clips/trending", "slider"],
    queryFn: async () => {
      const r = await fetch("/api/clips/trending?limit=10&period=week", { credentials: "include" });
      if (!r.ok) throw new Error("Failed");
      const data = await r.json();
      return Array.isArray(data) ? data.filter((c: ClipWithUser) => c.videoType !== "reel") : [];
    },
    staleTime: 120_000,
  });

  const { data: reelsData, isLoading: reelsLoading } = useQuery<ClipWithUser[]>({
    queryKey: ["/api/reels/trending", "slider"],
    queryFn: async () => {
      const r = await fetch("/api/reels/trending?limit=10&period=week", { credentials: "include" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    staleTime: 120_000,
  });

  const items = mode === "clips"
    ? (Array.isArray(clipsData) ? clipsData.slice(0, 10) : [])
    : (Array.isArray(reelsData) ? reelsData.slice(0, 10) : []);

  const isLoading = mode === "clips" ? clipsLoading : reelsLoading;

  const navigate = useCallback((dir: 1 | -1) => {
    setActiveIndex(i => {
      const next = (i + dir + items.length) % items.length;
      return next;
    });
    setGameKey(k => k + 1);
  }, [items.length]);

  const goPrev = useCallback(() => navigate(-1), [navigate]);
  const goNext = useCallback(() => navigate(1), [navigate]);

  const goTo = useCallback((i: number) => {
    setActiveIndex(i);
    setGameKey(k => k + 1);
  }, []);

  // Reset index when switching modes
  useEffect(() => {
    setActiveIndex(0);
    setGameKey(k => k + 1);
  }, [mode]);

  // Touch swipe
  const touchStartX = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) diff > 0 ? goNext() : goPrev();
    touchStartX.current = null;
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="flex gap-4 w-full max-w-4xl px-4">
          <div className="w-2/5 h-64 rounded-2xl bg-white/5 animate-pulse" />
          <div className="w-3/5 h-64 rounded-2xl bg-white/5 animate-pulse" />
        </div>
      </div>
    );
  }

  if (items.length === 0) return null;

  const current = items[activeIndex];
  const gameName = current.game?.name || current.gameName || "Unknown Game";
  const gameImage = current.game?.imageUrl || current.gameImageUrl || null;
  const tags = current.tags?.filter(Boolean).slice(0, 3) ?? [];
  const views = current.views ?? 0;
  const isReel = current.videoType === "reel";

  return (
    <div
      className="w-full h-full flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4" style={{ color: NEON }} />
          <span className="text-base font-black text-white">Trending</span>
          <div
            className="flex items-center gap-0.5 p-0.5 rounded-full ml-1"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <button
              onClick={() => setMode("clips")}
              className="px-3 py-1 rounded-full text-[11px] font-black transition-all"
              style={mode === "clips" ? { background: NEON, color: "#071013" } : { color: "rgba(255,255,255,0.5)" }}
            >
              Clips
            </button>
            <button
              onClick={() => setMode("reels")}
              className="px-3 py-1 rounded-full text-[11px] font-black transition-all"
              style={mode === "reels" ? { background: NEON, color: "#071013" } : { color: "rgba(255,255,255,0.5)" }}
            >
              Reels
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={goPrev}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <ChevronLeft className="w-3.5 h-3.5 text-white" />
          </button>
          <button
            onClick={goNext}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <ChevronRight className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
      </div>

      {/* Main split layout */}
      <div className="flex gap-4 flex-1 min-h-0">

        {/* LEFT — Game info panel */}
        <div
          key={`game-${gameKey}`}
          className="flex-shrink-0 flex flex-col rounded-2xl overflow-hidden relative"
          style={{
            width: "38%",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
            animation: "fadeSlideIn 0.4s ease-out",
          }}
        >
          {/* Game box art */}
          <div className="relative flex-1 min-h-0 overflow-hidden">
            {gameImage ? (
              <>
                {/* Blurred bg */}
                <img
                  src={gameImage}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ filter: "blur(18px)", opacity: 0.3, transform: "scale(1.1)" }}
                />
                {/* Main art - box art style */}
                <div className="absolute inset-0 flex items-center justify-center p-4">
                  <img
                    src={gameImage}
                    alt={gameName}
                    className="rounded-xl shadow-2xl object-cover"
                    style={{
                      maxHeight: "100%",
                      maxWidth: "100%",
                      aspectRatio: "3/4",
                      objectFit: "cover",
                      boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)`,
                    }}
                  />
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-28 rounded-xl bg-white/10 flex items-center justify-center">
                  <span className="text-white/30 text-2xl font-black">{gameName[0]}</span>
                </div>
              </div>
            )}
            {/* Dark gradient at bottom */}
            <div className="absolute inset-x-0 bottom-0 h-2/3"
              style={{ background: "linear-gradient(to top, rgba(5,10,15,0.95) 0%, transparent 100%)" }}
            />
          </div>

          {/* Game text info */}
          <div className="flex-shrink-0 p-3 pt-0 relative z-10" style={{ marginTop: "-48px" }}>
            <div
              className="text-[10px] font-black uppercase tracking-widest mb-1"
              style={{ color: NEON }}
            >
              Now Playing
            </div>
            <h3 className="text-sm font-black text-white leading-tight mb-2 line-clamp-2">
              {gameName}
            </h3>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {tags.map((tag, i) => (
                  <span
                    key={i}
                    className="text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wide"
                    style={{ background: "rgba(183,255,26,0.15)", color: NEON }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-center gap-1 text-[10px] text-white/40">
              <Eye className="w-2.5 h-2.5" />
              <span>{fmtViews(views)} views</span>
            </div>
          </div>
        </div>

        {/* RIGHT — Featured clip/reel */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div
            className="relative rounded-2xl overflow-hidden flex-1 cursor-pointer group"
            style={{
              background: "#0B1218",
              aspectRatio: isReel ? "9/16" : undefined,
            }}
            onClick={() => openClipDialog(current.id, items, undefined, isReel ? "reel" : "clip")}
          >
            {/* Blurred bg */}
            {current.thumbnailUrl && (
              <img
                src={current.thumbnailUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                style={{ filter: "blur(16px)", opacity: 0.25, transform: "scale(1.08)" }}
              />
            )}

            {/* Thumbnail */}
            <img
              src={current.thumbnailUrl || `/api/clips/${current.id}/thumbnail`}
              alt={current.title}
              className="absolute inset-0 w-full h-full object-contain z-10"
            />

            {/* Play overlay */}
            <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/25">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center shadow-xl"
                style={{ background: "rgba(183,255,26,0.95)" }}
              >
                <Play className="w-8 h-8 text-[#071013] fill-[#071013] ml-0.5" />
              </div>
            </div>

            {/* Duration badge */}
            <div
              className="absolute bottom-3 right-3 z-30 px-2 py-0.5 rounded text-[10px] font-black text-white"
              style={{ background: "rgba(0,0,0,0.75)" }}
            >
              {formatDuration(current.duration || 0)}
            </div>

            {/* Views badge */}
            <div
              className="absolute bottom-3 left-3 z-30 flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold text-white"
              style={{ background: "rgba(0,0,0,0.75)" }}
            >
              <Eye className="w-2.5 h-2.5" />
              {fmtViews(views)}
            </div>
          </div>

          {/* Clip info below */}
          <div className="mt-2.5 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-sm font-black text-white leading-tight truncate">
                {current.title}
              </h3>
              <Link
                href={`/profile/${current.user.username}`}
                className="text-xs text-white/40 hover:text-white/70 transition-colors"
                onClick={e => e.stopPropagation()}
              >
                @{current.user.username}
              </Link>
            </div>
            {/* Dots */}
            <div className="flex items-center gap-1 flex-shrink-0 pt-1">
              {items.slice(0, 8).map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: i === activeIndex ? 16 : 5,
                    height: 5,
                    background: i === activeIndex ? NEON : "rgba(255,255,255,0.2)",
                  }}
                />
              ))}
            </div>
          </div>
        </div>

      </div>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateX(-8px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

function fmtViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
