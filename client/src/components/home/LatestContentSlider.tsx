import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { ClipWithUser } from "@shared/schema";
import { Play, ChevronLeft, ChevronRight, Flame, Pause, Volume2, VolumeX } from "lucide-react";
import { Link } from "wouter";

const NEON = "#B7FF1A";

export default function LatestContentSlider() {
  const [mode, setMode] = useState<"clips" | "reels">("clips");
  const [activeIndex, setActiveIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const touchStartX = useRef<number | null>(null);

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

  const stopVideo = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = "";
    }
    setPlaying(false);
  }, []);

  const navigate = useCallback((dir: 1 | -1) => {
    stopVideo();
    setActiveIndex(i => (i + dir + items.length) % items.length);
  }, [items.length, stopVideo]);

  const goTo = useCallback((i: number) => {
    stopVideo();
    setActiveIndex(i);
  }, [stopVideo]);

  const goPrev = useCallback(() => navigate(-1), [navigate]);
  const goNext = useCallback(() => navigate(1), [navigate]);

  useEffect(() => {
    stopVideo();
    setActiveIndex(0);
  }, [mode]);

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) diff > 0 ? goNext() : goPrev();
    touchStartX.current = null;
  };

  const handlePlayClick = () => {
    if (!playing) {
      setPlaying(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.muted = muted;
          videoRef.current.play().catch(() => {});
        }
      }, 50);
    } else {
      if (videoRef.current?.paused) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current?.pause();
      }
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !muted;
    setMuted(next);
    if (videoRef.current) videoRef.current.muted = next;
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="flex gap-4 w-full">
          <div className="w-2/5 h-full rounded-2xl bg-white/5 animate-pulse" style={{ minHeight: 200 }} />
          <div className="w-3/5 h-full rounded-2xl bg-white/5 animate-pulse" style={{ minHeight: 200 }} />
        </div>
      </div>
    );
  }

  if (items.length === 0) return null;

  const current = items[activeIndex];
  const gameImage = current.game?.imageUrl || current.gameImageUrl || null;
  const gameName = current.game?.name || current.gameName || "";
  const isReel = current.videoType === "reel";

  return (
    <div
      className="w-full h-full flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
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
          <button onClick={goPrev} className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <ChevronLeft className="w-3.5 h-3.5 text-white" />
          </button>
          <button onClick={goNext} className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <ChevronRight className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
      </div>

      {/* Split layout */}
      <div className="flex gap-4 flex-1 min-h-0">

        {/* LEFT — Game thumbnail only */}
        <div
          key={`game-${activeIndex}-${mode}`}
          className="flex-shrink-0 rounded-2xl overflow-hidden relative"
          style={{
            width: "32%",
            background: "#0a0f14",
            animation: "gFadeIn 0.35s ease-out",
          }}
        >
          {gameImage ? (
            <>
              <img
                src={gameImage}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                style={{ filter: "blur(24px)", opacity: 0.25, transform: "scale(1.12)" }}
              />
              <div className="absolute inset-0 flex items-center justify-center p-5">
                <img
                  src={gameImage}
                  alt={gameName}
                  className="rounded-xl w-full h-full object-cover shadow-2xl"
                  style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.07)" }}
                />
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-28 rounded-xl bg-white/10 flex items-center justify-center">
                <span className="text-white/20 text-3xl font-black">{gameName?.[0] ?? "?"}</span>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — Clip/reel player */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Video/thumbnail area */}
          <div
            className="relative rounded-2xl overflow-hidden flex-1 min-h-0 cursor-pointer group"
            style={{ background: "#0B1218" }}
            onClick={handlePlayClick}
          >
            {/* Blurred bg */}
            {current.thumbnailUrl && !playing && (
              <img
                src={current.thumbnailUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                style={{ filter: "blur(18px)", opacity: 0.2, transform: "scale(1.08)" }}
              />
            )}

            {/* Thumbnail (shown until playing) */}
            {!playing && (
              <img
                src={current.thumbnailUrl || `/api/clips/${current.id}/thumbnail`}
                alt={current.title}
                className="absolute inset-0 w-full h-full object-contain z-10"
              />
            )}

            {/* Inline video */}
            {playing && current.videoUrl && (
              <video
                ref={videoRef}
                src={current.videoUrl}
                className="absolute inset-0 w-full h-full z-10"
                style={{ objectFit: isReel ? "contain" : "contain", background: "#000" }}
                autoPlay
                muted={muted}
                playsInline
                loop
                onEnded={() => setPlaying(false)}
              />
            )}

            {/* Play overlay (not playing) */}
            {!playing && (
              <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/20">
                <div className="w-16 h-16 rounded-full flex items-center justify-center shadow-xl"
                  style={{ background: "rgba(183,255,26,0.95)" }}>
                  <Play className="w-8 h-8 text-[#071013] fill-[#071013] ml-0.5" />
                </div>
              </div>
            )}

            {/* Controls overlay (while playing) */}
            {playing && (
              <div className="absolute inset-0 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center bg-black/20">
                <div className="w-14 h-14 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(0,0,0,0.6)" }}>
                  <Pause className="w-7 h-7 text-white fill-white" />
                </div>
              </div>
            )}

            {/* Mute toggle (while playing) */}
            {playing && (
              <button
                onClick={toggleMute}
                className="absolute bottom-3 right-3 z-40 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                style={{ background: "rgba(0,0,0,0.7)" }}
              >
                {muted
                  ? <VolumeX className="w-3.5 h-3.5 text-white" />
                  : <Volume2 className="w-3.5 h-3.5 text-white" />
                }
              </button>
            )}

            {/* Duration badge (not playing) */}
            {!playing && (
              <div className="absolute bottom-3 right-3 z-30 px-2 py-0.5 rounded text-[10px] font-black text-white"
                style={{ background: "rgba(0,0,0,0.75)" }}>
                {formatDuration(current.duration || 0)}
              </div>
            )}
          </div>

          {/* Info + dots row */}
          <div className="mt-2.5 flex items-start justify-between gap-2 flex-shrink-0">
            <div className="min-w-0">
              <h3 className="text-sm font-black text-white leading-tight truncate">{current.title}</h3>
              <Link
                href={`/profile/${current.user.username}`}
                className="text-xs text-white/40 hover:text-white/70 transition-colors"
                onClick={e => e.stopPropagation()}
              >
                @{current.user.username}
              </Link>
            </div>
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
        @keyframes gFadeIn {
          from { opacity: 0; transform: scale(0.97); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
