import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { ClipWithUser } from "@shared/schema";
import { useClipDialog } from "@/hooks/use-clip-dialog";
import { LazyImage } from "@/components/ui/lazy-image";
import { Play, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "wouter";

const NEON = "#B7FF1A";

export default function LatestContentSlider() {
  const [mode, setMode] = useState<"clips" | "reels">("clips");
  const [activeIndex, setActiveIndex] = useState(0);
  const { openClipDialog } = useClipDialog();

  const { data: clipsData, isLoading: clipsLoading } = useQuery<ClipWithUser[]>({
    queryKey: ["/api/clips/latest", "slider"],
    queryFn: async () => {
      const r = await fetch("/api/clips/latest?limit=10", { credentials: "include" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    staleTime: 60_000,
  });

  const { data: reelsData, isLoading: reelsLoading } = useQuery<ClipWithUser[]>({
    queryKey: ["/api/reels/latest", "slider"],
    queryFn: async () => {
      const r = await fetch("/api/reels/latest?limit=10");
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    staleTime: 60_000,
  });

  const items = mode === "clips"
    ? (Array.isArray(clipsData) ? clipsData.filter(c => c.videoType !== "reel").slice(0, 10) : [])
    : (Array.isArray(reelsData) ? reelsData.slice(0, 10) : []);

  const isLoading = mode === "clips" ? clipsLoading : reelsLoading;

  const goPrev = useCallback(() => {
    setActiveIndex(i => (i === 0 ? items.length - 1 : i - 1));
  }, [items.length]);

  const goNext = useCallback(() => {
    setActiveIndex(i => (i === items.length - 1 ? 0 : i + 1));
  }, [items.length]);

  // Touch swipe
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX);
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) diff > 0 ? goNext() : goPrev();
    setTouchStart(null);
  };

  const getRelative = (offset: number) => {
    const idx = activeIndex + offset;
    if (idx < 0) return items.length + idx;
    if (idx >= items.length) return idx - items.length;
    return idx;
  };

  const handleCardClick = (item: ClipWithUser, idx: number) => {
    if (idx === activeIndex) {
      openClipDialog(item.id, items, undefined, mode === "reels" ? "reel" : "clip");
    } else {
      setActiveIndex(idx);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full py-8">
        <div className="flex justify-center gap-2 mb-6">
          <div className="h-9 w-20 rounded-full bg-white/5 animate-pulse" />
          <div className="h-9 w-20 rounded-full bg-white/5 animate-pulse" />
        </div>
        <div className="flex justify-center gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="w-72 h-44 rounded-2xl bg-white/5 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return null;
  }

  const centerItem = items[getRelative(0)];
  const leftItem = items[getRelative(-1)];
  const rightItem = items[getRelative(1)];

  return (
    <div className="w-full py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <span className="text-xl font-black text-white">Latest</span>
          <div className="flex items-center gap-1 p-0.5 rounded-full"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <button
              onClick={() => { setMode("clips"); setActiveIndex(0); }}
              className="px-4 py-1.5 rounded-full text-xs font-black transition-all"
              style={mode === "clips" ? { background: NEON, color: "#071013" } : { color: "rgba(255,255,255,0.5)" }}
            >
              Clips
            </button>
            <button
              onClick={() => { setMode("reels"); setActiveIndex(0); }}
              className="px-4 py-1.5 rounded-full text-xs font-black transition-all"
              style={mode === "reels" ? { background: NEON, color: "#071013" } : { color: "rgba(255,255,255,0.5)" }}
            >
              Reels
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={goPrev}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={goNext}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <ChevronRight className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Slider - 3D perspective style */}
      <div
        className="relative mx-auto"
        style={{ width: "min(880px, 100%)", height: mode === "reels" ? "480px" : "320px" }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Left card */}
        <div
          className="absolute cursor-pointer transition-all duration-500 ease-out"
          style={{
            left: 0,
            top: "50%",
            transform: "translateY(-50%) scale(0.78)",
            width: "38%",
            opacity: 0.5,
            filter: "brightness(0.6)",
            zIndex: 10,
          }}
          onClick={() => handleCardClick(leftItem, getRelative(-1))}
        >
          <SlideCard item={leftItem} mode={mode} isCenter={false} />
        </div>

        {/* Center card */}
        <div
          className="absolute cursor-pointer transition-all duration-500 ease-out"
          style={{
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%) scale(1)",
            width: "42%",
            opacity: 1,
            zIndex: 20,
          }}
          onClick={() => handleCardClick(centerItem, getRelative(0))}
        >
          <SlideCard item={centerItem} mode={mode} isCenter={true} />
        </div>

        {/* Right card */}
        <div
          className="absolute cursor-pointer transition-all duration-500 ease-out"
          style={{
            right: 0,
            top: "50%",
            transform: "translateY(-50%) scale(0.78)",
            width: "38%",
            opacity: 0.5,
            filter: "brightness(0.6)",
            zIndex: 10,
          }}
          onClick={() => handleCardClick(rightItem, getRelative(1))}
        >
          <SlideCard item={rightItem} mode={mode} isCenter={false} />
        </div>
      </div>

      {/* Dots */}
      <div className="flex items-center justify-center gap-1.5 mt-5">
        {items.map((_, i) => (
          <button
            key={i}
            onClick={() => setActiveIndex(i)}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === activeIndex ? 24 : 6,
              height: 6,
              background: i === activeIndex ? NEON : "rgba(255,255,255,0.2)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function SlideCard({ item, mode, isCenter }: { item: ClipWithUser; mode: "clips" | "reels"; isCenter: boolean }) {
  return (
    <div>
      <div
        className="relative overflow-hidden rounded-2xl bg-[#0B1218]"
        style={{ aspectRatio: mode === "reels" ? "9/16" : "16/9" }}
      >
        {item.thumbnailUrl && (
          <div className="absolute inset-0 overflow-hidden">
            <img
              src={item.thumbnailUrl || `/api/clips/${item.id}/thumbnail`}
              alt=""
              className="w-full h-full object-cover"
              style={{ filter: "blur(20px)", opacity: 0.35, transform: "scale(1.08)" }}
            />
          </div>
        )}

        <LazyImage
          src={item.thumbnailUrl || `/api/clips/${item.id}/thumbnail`}
          alt={item.title}
          className="w-full h-full object-contain"
          placeholder="data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='100'%20height='100'%3e%3crect%20width='100'%20height='100'%20fill='%230B1218'/%3e%3c/svg%3e"
          showLoadingSpinner={false}
          rootMargin="200px"
          containerClassName="absolute inset-0 z-10"
          fallback={
            <div className="absolute inset-0 flex items-center justify-center">
              <Play className="w-10 h-10 text-gray-600" />
            </div>
          }
        />

        {isCenter && (
          <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-300 bg-black/30">
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "rgba(183,255,26,0.9)" }}>
              <Play className="w-7 h-7 text-[#071013] fill-[#071013] ml-0.5" />
            </div>
          </div>
        )}

        <div className="absolute bottom-3 right-3 z-30 px-2 py-0.5 rounded text-[10px] font-black text-white"
          style={{ background: "rgba(0,0,0,0.7)" }}>
          {formatDuration(item.duration || 0)}
        </div>
      </div>

      <div className="mt-3 px-1">
        <h3 className={`font-bold text-white leading-tight truncate ${isCenter ? "text-base" : "text-sm"}`}>
          {item.title}
        </h3>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <Link href={`/profile/${item.user.username}`}
            className="text-xs text-gray-400 hover:text-white transition-colors"
            onClick={e => e.stopPropagation()}>
            @{item.user.username}
          </Link>
          {item.game && (
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded"
              style={{ background: "rgba(183,255,26,0.2)", color: NEON }}>
              {item.game.name}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
