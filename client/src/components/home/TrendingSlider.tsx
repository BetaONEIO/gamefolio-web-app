import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  Flame, ChevronLeft, ChevronRight, Play, Pause,
  Volume2, VolumeX, Upload, Clapperboard, Video, Camera,
  Gamepad2,
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

/* ── Right panel: game info for one clip ── */
function GameSidebar({
  clip,
  onPrev,
  onNext,
}: {
  clip: Clip;
  onPrev: () => void;
  onNext: () => void;
}) {
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
    { icon: Clapperboard, label: "Clips",    value: counts?.clips    ?? "—" },
    { icon: Video,        label: "Reels",    value: counts?.reels    ?? "—" },
    { icon: Camera,       label: "Shots",    value: counts?.screenshots ?? "—" },
    { icon: null,         label: "Bounties", value: counts?.bounties ?? "—" },
  ];

  return (
    <div
      className="flex-shrink-0 flex flex-col overflow-hidden"
      style={{ width: "clamp(160px, 22%, 240px)" }}
    >
      {/* Game thumbnail — fixed 120px, never expands */}
      <div className="relative flex-shrink-0 overflow-hidden" style={{ height: 120 }}>
        {clip.game?.imageUrl ? (
          <img
            src={clip.game.imageUrl}
            alt={clip.game?.name ?? "Game"}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-[#0A1117] flex items-center justify-center">
            <Gamepad2 className="w-8 h-8 text-white/15" />
          </div>
        )}
        {/* Game name overlay */}
        <div
          className="absolute bottom-0 inset-x-0 px-2 py-1.5"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.80) 0%, transparent 100%)" }}
        >
          {clip.game?.name && (
            <p className="text-[9px] font-black uppercase tracking-wide text-white line-clamp-1">
              {clip.game.name}
            </p>
          )}
        </div>
        {/* Prev/next arrows */}
        <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 z-10">
          <button
            onClick={(e) => { e.stopPropagation(); onPrev(); }}
            className="w-5 h-5 rounded-sm bg-black/60 hover:bg-black/85 flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="w-3 h-3 text-white" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onNext(); }}
            className="w-5 h-5 rounded-sm bg-black/60 hover:bg-black/85 flex items-center justify-center transition-colors"
          >
            <ChevronRight className="w-3 h-3 text-white" />
          </button>
        </div>
      </div>

      {/* Stats — vertical, full white, no background */}
      <div className="flex-1 px-3 pt-3 pb-2 flex flex-col justify-center gap-2">
        {stats.map(({ icon: Icon, label, value }, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {Icon && <Icon className="w-3 h-3 text-white" />}
              <span className="text-[11px] text-white">{label}</span>
            </div>
            <span className="text-[11px] font-bold text-white">
              {typeof value === "number" ? formatNumber(value) : value}
            </span>
          </div>
        ))}
      </div>

      {/* Upload button — pinned to bottom */}
      <div className="flex-shrink-0 px-3 pb-3">
        <Link href="/upload">
          <button
            className="w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform"
            style={{ background: NEON, color: "#03080A" }}
          >
            <Upload className="w-3.5 h-3.5" />
            Upload Content
          </button>
        </Link>
      </div>
    </div>
  );
}

/* ── Main TrendingSlider ── */
export default function TrendingSlider() {
  const [contentType, setContentType] = useState<"clips" | "reels">("clips");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isInteracting = useRef(false);
  const [, setLocation] = useLocation();

  /* ── Fetch trending clips ── */
  const { data: clips = [] } = useQuery<Clip[]>({
    queryKey: ["/api/clips/trending", contentType],
    queryFn: async () => {
      const type = contentType === "reels" ? "reel" : "clip";
      const res = await fetch(`/api/clips/trending?limit=8&videoType=${type}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 30_000,
  });

  const total = clips.length;
  const clip = clips[currentIndex] ?? null;

  /* ── Reset index when clips list changes ── */
  useEffect(() => {
    setCurrentIndex(0);
    setIsPlaying(false);
    setProgress(0);
  }, [contentType]);

  /* ── Auto-advance ── */
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

  /* ── Autoplay (muted) when clip changes ── */
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.pause();
    vid.load();
    setProgress(0);
    isInteracting.current = false;
    vid.muted = true;
    setIsMuted(true);
    vid.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
  }, [currentIndex]);

  const goTo = useCallback((idx: number) => {
    setCurrentIndex(idx);
    startTimer();
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

  /* ── Video controls ── */
  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    const vid = videoRef.current;
    if (!vid) {
      // No video URL — navigate to clip
      if (clip) setLocation(`/clips/${clip.id}`);
      return;
    }
    if (isPlaying) {
      vid.pause();
      setIsPlaying(false);
      isInteracting.current = false;
    } else {
      vid.play().catch(() => {});
      setIsPlaying(true);
      isInteracting.current = true;
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
    // Auto-advance after clip ends
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

  if (!clip && clips.length === 0) return null;

  return (
    <section className="-mx-4 md:-mx-6">
      <div
        className="flex overflow-hidden bg-[#03080A]"
        style={{ height: "clamp(300px, 38vw, 480px)" }}
      >
        {/* ── LEFT: Video Player ── */}
        <div className="relative flex-1 min-w-0 flex flex-col bg-black overflow-hidden">
          {/* Header bar */}
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
                  onClick={() => setContentType(type)}
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
              <video
                ref={videoRef}
                key={clip.id}
                src={clip.videoUrl}
                poster={clip.thumbnailUrl || undefined}
                className="absolute inset-0 w-full h-full object-cover"
                muted
                autoPlay
                playsInline
                onCanPlay={(e) => {
                  const v = e.currentTarget;
                  v.muted = true;
                  v.play().then(() => setIsPlaying(true)).catch(() => {});
                }}
                onEnded={handleVideoEnded}
                onTimeUpdate={handleTimeUpdate}
              />
            ) : clip.thumbnailUrl ? (
              <img
                key={clip.id}
                src={clip.thumbnailUrl}
                alt={clip.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-[#060D12] flex items-center justify-center">
                <Gamepad2 className="w-16 h-16 text-white/10" />
              </div>
            )
          ) : (
            <div className="absolute inset-0 bg-[#060D12] animate-pulse" />
          )}

          {/* Bottom gradient */}
          <div
            className="absolute inset-x-0 bottom-0 pointer-events-none"
            style={{ height: "45%", background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, transparent 100%)" }}
          />

          {/* Play/Pause overlay */}
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
                : <Play className="w-8 h-8 text-white fill-white" />
              }
            </div>
          </button>

          {/* Left arrow */}
          <button
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/55 hover:bg-black/80 flex items-center justify-center text-white transition-colors"
            aria-label="Previous"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Bottom controls */}
          <div className="absolute bottom-0 inset-x-0 z-20 px-4 pb-3">
            <div className="flex items-end justify-between gap-2 mb-2">
              <div className="min-w-0">
                {clip && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); setLocation(`/clips/${clip.id}`); }}
                      className="block text-left"
                    >
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
              <button
                onClick={handleMute}
                className="flex-shrink-0 w-7 h-7 rounded-full bg-black/60 hover:bg-black/85 flex items-center justify-center text-white transition-colors"
                aria-label={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Dot indicators */}
            <div className="flex items-center gap-1.5 mb-2">
              {clips.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => { e.stopPropagation(); goTo(idx); }}
                  className="rounded-full transition-all duration-300"
                  style={{
                    height: 5,
                    width: idx === currentIndex ? 18 : 5,
                    background: idx === currentIndex ? NEON : "rgba(255,255,255,0.32)",
                  }}
                  aria-label={`Go to clip ${idx + 1}`}
                />
              ))}
            </div>

            {/* Progress bar */}
            <div
              className="h-[2px] w-full rounded-full overflow-hidden"
              style={{ background: "rgba(255,255,255,0.15)" }}
            >
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
        </div>

        {/* ── RIGHT: Game Sidebar ── */}
        {clip && (
          <GameSidebar clip={clip} onPrev={goPrev} onNext={goNext} />
        )}
      </div>
    </section>
  );
}
