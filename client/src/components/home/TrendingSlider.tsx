import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  Flame, ChevronLeft, ChevronRight, Play, Pause,
  Volume2, VolumeX, Upload, Clapperboard, Video, Camera, Info, X,
} from "lucide-react";

const NEON = "#B7FF18";
const AUTO_ADVANCE_MS = 7000;

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return n.toString();
}

interface Clip {
  id: number;
  title: string;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  views: number;
  likes: number;
  gameId: number | null;
  user: { username: string; displayName: string | null; avatarUrl: string | null };
  game?: { id?: number; name: string; imageUrl: string | null } | null;
}

interface GameCounts {
  clips: number;
  reels: number;
  screenshots: number;
  bounties?: number;
}

/* ── Info overlay — shown when info button is active ── */
function GameInfoOverlay({ clip, onClose }: { clip: Clip; onClose: () => void }) {
  const gameId = clip.game?.id ?? clip.gameId;

  const { data: counts } = useQuery<GameCounts>({
    queryKey: ["/api/games", gameId, "content-counts"],
    queryFn: async () => {
      const res = await fetch(`/api/games/${gameId}/content-counts`);
      if (!res.ok) return { clips: 0, reels: 0, screenshots: 0 };
      return res.json();
    },
    enabled: !!gameId,
    staleTime: 60_000,
  });

  const stats = [
    { icon: Clapperboard, label: "Clips",    value: counts?.clips       ?? "—" },
    { icon: Video,        label: "Reels",    value: counts?.reels       ?? "—" },
    { icon: Camera,       label: "Shots",    value: counts?.screenshots ?? "—" },
    { icon: null,         label: "Bounties", value: counts?.bounties    ?? "—" },
  ];

  return (
    <div
      className="absolute inset-0 z-30 flex items-end justify-end pointer-events-none"
    >
      {/* Backdrop tap-to-close */}
      <div
        className="absolute inset-0 pointer-events-auto"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
      />

      {/* Info panel */}
      <div
        className="relative pointer-events-auto m-3 rounded-xl overflow-hidden flex flex-col"
        style={{
          width: "clamp(150px, 42%, 210px)",
          background: "rgba(3,8,10,0.88)",
          backdropFilter: "blur(14px)",
          border: "1px solid rgba(255,255,255,0.1)",
          animation: "fadeSlideUp 0.18s ease",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Game artwork header */}
        <div className="relative flex-shrink-0 overflow-hidden" style={{ height: 90 }}>
          {clip.game?.imageUrl ? (
            <img
              src={clip.game.imageUrl}
              alt={clip.game?.name ?? "Game"}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center" style={{ background: "#0A1117" }}>
              <Clapperboard className="w-7 h-7 text-white/15" />
            </div>
          )}
          <div
            className="absolute bottom-0 inset-x-0 px-2 py-1.5"
            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.82) 0%, transparent 100%)" }}
          >
            {clip.game?.name && (
              <p className="text-[10px] font-black uppercase tracking-wide text-white line-clamp-1">
                {clip.game.name}
              </p>
            )}
          </div>
          {/* Close button */}
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/60 hover:bg-black/85 flex items-center justify-center transition-colors"
          >
            <X className="w-3 h-3 text-white" />
          </button>
        </div>

        {/* Stats */}
        <div className="px-3 pt-2.5 pb-2 flex flex-col gap-1.5">
          {stats.map(({ icon: Icon, label, value }, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {Icon && <Icon className="w-3 h-3 text-white/60" />}
                <span className="text-[11px] text-white/70">{label}</span>
              </div>
              <span className="text-[11px] font-bold text-white">
                {typeof value === "number" ? formatNumber(value) : value}
              </span>
            </div>
          ))}
        </div>

        {/* Upload CTA */}
        <div className="px-3 pb-3">
          <Link href="/upload">
            <button
              className="w-full py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform"
              style={{ background: NEON, color: "#03080A" }}
              onClick={(e) => e.stopPropagation()}
            >
              <Upload className="w-3 h-3" />
              Upload
            </button>
          </Link>
        </div>
      </div>

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
      `}</style>
    </div>
  );
}

/* ── TrendingHeroSlide — renders as a hero carousel slide ── */
export default function TrendingHeroSlide({
  onPlayingChange,
}: {
  onPlayingChange?: (isPlaying: boolean) => void;
}) {
  const [contentType, setContentType] = useState<"clips" | "reels">("clips");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [videoReady, setVideoReady] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isInteracting = useRef(false);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, setLocation] = useLocation();

  const { data: clips = [] } = useQuery<Clip[]>({
    queryKey: contentType === "reels"
      ? ["/api/clips/reels/trending", "ever"]
      : ["/api/clips/trending", "all"],
    queryFn: async () => {
      if (contentType === "reels") {
        const res = await fetch(`/api/clips/reels/trending?limit=8&period=ever`, { credentials: "include" });
        if (!res.ok) return [];
        return res.json();
      }
      const res = await fetch(`/api/clips/trending?limit=8&period=all`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 60_000,
  });

  const total = clips.length;
  const clip = clips[currentIndex] ?? null;

  useEffect(() => {
    setCurrentIndex(0);
    setIsPlaying(false);
    setProgress(0);
    setShowInfo(false);
  }, [contentType]);

  // Close info panel when slide changes
  useEffect(() => { setShowInfo(false); }, [currentIndex]);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (total <= 1) return;
    timerRef.current = setInterval(() => {
      if (isInteracting.current) return;
      setCurrentIndex((prev) => (prev + 1) % total);
      setProgress(0);
    }, AUTO_ADVANCE_MS);
  }, [total]);

  useEffect(() => {
    startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [startTimer, currentIndex]);

  useEffect(() => {
    setProgress(0);
    isInteracting.current = false;
    setIsPlaying(false);
    onPlayingChange?.(false);
    setIsMuted(true);
    setVideoReady(false);

    const v = videoRef.current;
    if (!v || !clip?.videoUrl) return;

    v.muted = true;
    v.play()
      .then(() => { setIsPlaying(true); onPlayingChange?.(true); })
      .catch(() => {});

    const retry = setTimeout(() => {
      const vid = videoRef.current;
      if (!vid || !vid.paused) return;
      vid.muted = true;
      vid.play()
        .then(() => { setIsPlaying(true); onPlayingChange?.(true); })
        .catch(() => {});
    }, 500);

    return () => clearTimeout(retry);
  }, [clip?.id]);

  const goTo = useCallback((idx: number) => {
    setCurrentIndex(idx); startTimer();
  }, [startTimer]);

  const goPrev = useCallback(() => {
    if (!total) return;
    setCurrentIndex((prev) => (prev - 1 + total) % total);
    startTimer();
  }, [total, startTimer]);

  const goNext = useCallback(() => {
    if (!total) return;
    setCurrentIndex((prev) => (prev + 1) % total);
    startTimer();
  }, [total, startTimer]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    isScrollingRef.current = true;
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => { isScrollingRef.current = false; }, 500);
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) return;
    e.preventDefault();
  }, []);

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isScrollingRef.current) return;
    if (showInfo) { setShowInfo(false); return; }
    const vid = videoRef.current;
    if (!vid) {
      if (clip) setLocation(`/clips/${clip.id}`);
      return;
    }
    if (isPlaying) {
      vid.pause();
      setIsPlaying(false);
      isInteracting.current = false;
      onPlayingChange?.(false);
    } else {
      vid.play().catch(() => {});
      setIsPlaying(true);
      isInteracting.current = true;
      onPlayingChange?.(true);
    }
  };

  const handleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const vid = videoRef.current;
    if (!vid) return;
    vid.muted = !vid.muted;
    setIsMuted(vid.muted);
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    setProgress(100);
    isInteracting.current = false;
    onPlayingChange?.(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % total);
      setProgress(0);
      startTimer();
    }, 800);
  };

  const handleTimeUpdate = () => {
    const vid = videoRef.current;
    if (!vid || !vid.duration) return;
    setProgress((vid.currentTime / vid.duration) * 100);
  };

  return (
    <div className="absolute inset-0 bg-[#03080A]" onWheel={handleWheel}>
      {/* ── Full-width video ── */}
      <div className="relative w-full h-full overflow-hidden bg-black">
        {/* Header */}
        <div
          className="absolute top-0 inset-x-0 z-20 flex items-center gap-3 px-4 pt-3 pb-8"
          style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.80) 0%, transparent 100%)" }}
        >
          <div className="flex items-center gap-1.5">
            <Flame className="w-4 h-4" style={{ color: NEON }} />
            <span className="text-sm font-black text-white tracking-tight">Trending</span>
          </div>
          <div className="flex items-center gap-1">
            {(["clips", "reels"] as const).map((type) => (
              <button
                key={type}
                onClick={(e) => { e.stopPropagation(); setContentType(type); }}
                className="px-3 py-1 rounded-full text-xs font-bold transition-all capitalize"
                style={
                  contentType === type
                    ? { background: NEON, color: "#03080A" }
                    : { background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)" }
                }
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Media */}
        {clip ? (
          clip.videoUrl ? (
            <div className="absolute inset-0">
              {clip.thumbnailUrl && (
                <img
                  src={clip.thumbnailUrl}
                  alt=""
                  aria-hidden
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}
              <video
                ref={videoRef}
                key={clip.id}
                src={clip.videoUrl}
                poster={clip.thumbnailUrl ?? undefined}
                preload="auto"
                className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
                style={{ opacity: videoReady ? 1 : 0 }}
                muted
                autoPlay
                playsInline
                onCanPlay={(e) => {
                  const v = e.currentTarget;
                  v.muted = true;
                  setVideoReady(true);
                  v.play().then(() => { setIsPlaying(true); onPlayingChange?.(true); }).catch(() => {});
                }}
                onLoadedData={(e) => {
                  const v = e.currentTarget;
                  v.muted = true;
                  setVideoReady(true);
                  v.play().then(() => { setIsPlaying(true); onPlayingChange?.(true); }).catch(() => {});
                }}
                onEnded={handleVideoEnded}
                onTimeUpdate={handleTimeUpdate}
                onError={(e) => {
                  const el = e.currentTarget as HTMLVideoElement;
                  console.error('[TrendingSlider] video error', el.error, 'src:', el.src?.slice(0, 120));
                  setVideoReady(false);
                  setIsPlaying(false);
                  onPlayingChange?.(false);
                }}
              />
            </div>
          ) : clip.thumbnailUrl ? (
            <img
              key={clip.id}
              src={clip.thumbnailUrl}
              alt={clip.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-[#060D12] flex items-center justify-center">
              <Clapperboard className="w-16 h-16 text-white/10" />
            </div>
          )
        ) : (
          <div className="absolute inset-0 bg-[#060D12] animate-pulse" />
        )}

        {/* Dark bottom gradient */}
        <div
          className="absolute inset-x-0 bottom-0 pointer-events-none"
          style={{ height: "45%", background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, transparent 100%)" }}
        />

        {/* Play/Pause overlay (behind info panel) */}
        <button
          onClick={handlePlayPause}
          className="absolute inset-0 w-full h-full z-10 flex items-center justify-center group"
          style={{ background: "transparent" }}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          <div
            className={`rounded-full p-3.5 transition-all duration-200 ${
              isPlaying ? "opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100" : "opacity-100 scale-100"
            }`}
            style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
          >
            {isPlaying
              ? <Pause className="w-8 h-8 text-white fill-white" />
              : <Play className="w-8 h-8 text-white fill-white" />}
          </div>
        </button>

        {/* Left arrow */}
        <button
          onClick={(e) => { e.stopPropagation(); if (!isScrollingRef.current) goPrev(); }}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/60 hover:bg-black/85 backdrop-blur-sm flex items-center justify-center text-white transition-colors shadow-lg"
          aria-label="Previous clip"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* Right arrow */}
        <button
          onClick={(e) => { e.stopPropagation(); if (!isScrollingRef.current) goNext(); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/60 hover:bg-black/85 backdrop-blur-sm flex items-center justify-center text-white transition-colors shadow-lg"
          aria-label="Next clip"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* Bottom controls */}
        <div className="absolute bottom-0 inset-x-0 z-20 px-4 pb-3">
          <div className="flex items-end justify-between gap-2 mb-2">
            <div className="min-w-0">
              {clip && (
                <>
                  <button onClick={(e) => { e.stopPropagation(); setLocation(`/clips/${clip.id}`); }} className="block text-left">
                    <p className="text-white font-bold text-sm leading-snug line-clamp-1 drop-shadow hover:underline">
                      {clip.title}
                    </p>
                  </button>
                  <Link href={`/profile/${clip.user.username}`} onClick={(e) => e.stopPropagation()}>
                    <p className="text-white/55 text-xs hover:text-white/80 transition-colors">
                      @{clip.user.username}
                    </p>
                  </Link>
                </>
              )}
            </div>

            {/* Right-side controls: info button + mute */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {/* ⓘ Info button */}
              {clip && (
                <button
                  onClick={(e) => { e.stopPropagation(); setShowInfo((v) => !v); }}
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-all"
                  style={{
                    background: showInfo ? NEON : "rgba(0,0,0,0.60)",
                    backdropFilter: "blur(6px)",
                  }}
                  aria-label="Game info"
                >
                  <Info className="w-3.5 h-3.5" style={{ color: showInfo ? "#03080A" : "white" }} />
                </button>
              )}
              {/* Mute */}
              <button
                onClick={handleMute}
                className="w-7 h-7 rounded-full bg-black/60 hover:bg-black/85 flex items-center justify-center text-white transition-colors"
                style={{ backdropFilter: "blur(6px)" }}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-[2px] w-full rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.15)" }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${progress}%`,
                background: NEON,
                transition: isPlaying ? "none" : "width 0.3s ease",
              }}
            />
          </div>
        </div>

        {/* ── Info overlay (shown when showInfo is true) ── */}
        {showInfo && clip && (
          <GameInfoOverlay clip={clip} onClose={() => setShowInfo(false)} />
        )}
      </div>
    </div>
  );
}
