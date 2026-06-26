import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Flame, Trophy, Gamepad2, Radio, Star, Rocket, Eye, Heart,
  ArrowRight, ChevronLeft, ChevronRight, Zap, Users, Video,
  BarChart3, PlayCircle, CircleUser, Play, Pause, Volume2, VolumeX,
  Upload, Clapperboard, Camera,
} from "lucide-react";
import { openExternal } from "@/lib/platform";

interface TrendingClip {
  id: number;
  title: string;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  gameId: number | null;
  views: number;
  likes: number;
  creator: { username: string; displayName: string | null; avatarUrl: string | null } | null;
  game: { name: string | null; imageUrl: string | null } | null;
}

interface TopGamefolioEntry {
  userId: number;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  level: number;
  xp: number;
  rank: number;
}

interface TrendingGame {
  id: number;
  name: string;
  slug: string;
  imageUrl: string | null;
  backgroundImageUrl: string | null;
  clips: number;
  creators: number;
  views: number;
}

interface LiveStream {
  userId: number;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  platform: string | null;
  channelUrl: string | null;
}

interface CreatorSpotlight {
  userId: number;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  level: number;
  clips: number;
  views: number;
}

interface CommunityMilestone {
  totalClips: number;
  totalCreators: number;
  totalProfiles: number;
}

interface DiscoverItem {
  id: number;
  title: string;
  thumbnailUrl: string | null;
  creator: { username: string; displayName: string | null } | null;
  game: { name: string | null } | null;
}

interface CarouselData {
  trendingClip: TrendingClip | null;
  topGamefolios: TopGamefolioEntry[];
  trendingGame: TrendingGame | null;
  liveStreams: LiveStream[];
  creatorSpotlight: CreatorSpotlight | null;
  communityMilestone: CommunityMilestone;
  discover: DiscoverItem | null;
}

const SLIDE_INTERVAL = 6000;
const NEON = "#B7FF18";

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return n.toString();
}

/* ──────────────────────────────────────────────────────────────
   Trending Clip Slide — new split layout
   ────────────────────────────────────────────────────────────── */
interface TrendingClipSlideProps {
  clip: TrendingClip;
  slideIndex: number;
  totalSlides: number;
  onPrev: () => void;
  onNext: () => void;
  onGoTo: (idx: number) => void;
  onInteractionStart: () => void;
  onInteractionEnd: () => void;
  onNavigate: (path: string) => void;
}

function TrendingClipSlide({
  clip,
  slideIndex,
  totalSlides,
  onPrev,
  onNext,
  onGoTo,
  onInteractionStart,
  onInteractionEnd,
  onNavigate,
}: TrendingClipSlideProps) {
  const [contentType, setContentType] = useState<"clips" | "reels">("clips");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const { data: gameStats } = useQuery<{ clips: number; reels: number; screenshots: number; bounties?: number }>({
    queryKey: ["/api/games", clip.gameId, "content-counts"],
    queryFn: async () => {
      const res = await fetch(`/api/games/${clip.gameId}/content-counts`);
      if (!res.ok) return { clips: 0, reels: 0, screenshots: 0 };
      return res.json();
    },
    enabled: !!clip.gameId,
    staleTime: 60000,
  });

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    const vid = videoRef.current;
    if (!vid) return;
    if (isPlaying) {
      vid.pause();
      setIsPlaying(false);
      onInteractionEnd();
    } else {
      vid.play().catch(() => {});
      setIsPlaying(true);
      onInteractionStart();
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
    setProgress(0);
    onInteractionEnd();
  };

  const handleTimeUpdate = () => {
    const vid = videoRef.current;
    if (!vid || !vid.duration) return;
    setProgress((vid.currentTime / vid.duration) * 100);
  };

  const statItems = [
    { icon: Clapperboard, label: "Clips", value: gameStats?.clips ?? "—" },
    { icon: Video, label: "Reels", value: gameStats?.reels ?? "—" },
    { icon: Camera, label: "Shots", value: gameStats?.screenshots ?? "—" },
    { icon: null, label: "Bounties", value: gameStats?.bounties ?? "—" },
  ];

  return (
    <div className="absolute inset-0 flex">
      {/* ── LEFT: Video Player ── */}
      <div className="relative flex-1 min-w-0 flex flex-col bg-black overflow-hidden">
        {/* Header bar */}
        <div className="absolute top-0 inset-x-0 z-20 flex items-center gap-3 px-4 pt-3 pb-2"
          style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.75), transparent)" }}>
          <div className="flex items-center gap-1.5">
            <Flame className="w-4 h-4" style={{ color: NEON }} />
            <span className="text-sm font-black text-white tracking-tight">Trending</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setContentType("clips")}
              className="px-3 py-1 rounded-full text-xs font-bold transition-all"
              style={contentType === "clips"
                ? { background: NEON, color: "#03080A" }
                : { background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)" }
              }
            >
              Clips
            </button>
            <button
              onClick={() => setContentType("reels")}
              className="px-3 py-1 rounded-full text-xs font-bold transition-all"
              style={contentType === "reels"
                ? { background: NEON, color: "#03080A" }
                : { background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)" }
              }
            >
              Reels
            </button>
          </div>
        </div>

        {/* Thumbnail / Video */}
        {clip.videoUrl ? (
          <video
            ref={videoRef}
            src={clip.videoUrl}
            poster={clip.thumbnailUrl || undefined}
            className="absolute inset-0 w-full h-full object-cover"
            muted={isMuted}
            playsInline
            onEnded={handleVideoEnded}
            onTimeUpdate={handleTimeUpdate}
          />
        ) : clip.thumbnailUrl ? (
          <img
            src={clip.thumbnailUrl}
            alt={clip.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-[#060D12] flex items-center justify-center">
            <Gamepad2 className="w-16 h-16 text-white/10" />
          </div>
        )}

        {/* Bottom dark gradient */}
        <div
          className="absolute inset-x-0 bottom-0 pointer-events-none"
          style={{ height: "40%", background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%)" }}
        />

        {/* Play/Pause center button */}
        <button
          onClick={handlePlayPause}
          className="absolute inset-0 w-full h-full z-10 flex items-center justify-center group"
          style={{ background: "transparent" }}
        >
          <div
            className={`rounded-full p-3.5 transition-all duration-200 ${isPlaying ? "opacity-0 group-hover:opacity-100 scale-90" : "opacity-100 scale-100"}`}
            style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
          >
            {isPlaying
              ? <Pause className="w-8 h-8 text-white fill-white" />
              : <Play className="w-8 h-8 text-white fill-white" />
            }
          </div>
        </button>

        {/* Left arrow inside video */}
        <button
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/55 hover:bg-black/80 flex items-center justify-center text-white transition-colors"
          aria-label="Previous slide"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Bottom info + controls */}
        <div className="absolute bottom-0 inset-x-0 z-20 px-4 pb-3">
          <div className="flex items-end justify-between gap-2 mb-2">
            {/* Title + username */}
            <div className="min-w-0">
              <button
                onClick={(e) => { e.stopPropagation(); onNavigate(`/clips/${clip.id}`); }}
                className="block text-left"
              >
                <p className="text-white font-bold text-sm leading-snug line-clamp-1 drop-shadow hover:underline">
                  {clip.title}
                </p>
              </button>
              {clip.creator && (
                <Link href={`/profile/${clip.creator.username}`} onClick={(e) => e.stopPropagation()}>
                  <p className="text-white/55 text-xs hover:text-white/80 transition-colors">
                    @{clip.creator.username}
                  </p>
                </Link>
              )}
            </div>
            {/* Mute button */}
            <button
              onClick={handleMute}
              className="flex-shrink-0 w-7 h-7 rounded-full bg-black/60 hover:bg-black/85 flex items-center justify-center text-white transition-colors"
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Dot indicators */}
          <div className="flex items-center gap-1.5 mb-2">
            {Array.from({ length: totalSlides }).map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => { e.stopPropagation(); onGoTo(idx); }}
                className="rounded-full transition-all duration-300"
                style={{
                  height: 5,
                  width: idx === slideIndex ? 18 : 5,
                  background: idx === slideIndex ? NEON : "rgba(255,255,255,0.35)",
                }}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>

          {/* Progress bar */}
          <div className="h-[2px] w-full rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.15)" }}>
            <div
              className="h-full rounded-full transition-none"
              style={{ width: `${progress}%`, background: NEON }}
            />
          </div>
        </div>
      </div>

      {/* ── RIGHT: Game Sidebar ── */}
      <div
        className="flex-shrink-0 flex flex-col bg-[#060D12] border-l border-white/5 overflow-hidden"
        style={{ width: "clamp(160px, 22%, 240px)" }}
      >
        {/* Game thumbnail — fills remaining height */}
        <div className="relative flex-1 bg-[#0A1117] overflow-hidden">
          {clip.game?.imageUrl ? (
            <img
              src={clip.game.imageUrl}
              alt={clip.game.name || "Game"}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Gamepad2 className="w-10 h-10 text-white/15" />
            </div>
          )}

          {/* Top gradient + game name */}
          <div className="absolute top-0 inset-x-0 px-2.5 pt-2 pb-6"
            style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, transparent 100%)" }}>
            {clip.game?.name && (
              <p className="text-[10px] font-black uppercase tracking-wide text-white/85 line-clamp-1">
                {clip.game.name}
              </p>
            )}
          </div>

          {/* Mini prev/next inside thumbnail */}
          <div className="absolute top-2 right-2 flex items-center gap-0.5 z-10">
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

        {/* Stats row */}
        <div className="px-2 py-2 border-t border-white/[0.06]">
          <div className="grid grid-cols-4 gap-0.5">
            {statItems.map(({ icon: Icon, label, value }, i) => (
              <div key={i} className="flex flex-col items-center py-1">
                <span className="text-white font-black text-xs leading-none mb-0.5">
                  {typeof value === "number" ? formatNumber(value) : value}
                </span>
                <div className="flex items-center gap-0.5 flex-wrap justify-center">
                  {Icon && <Icon className="w-2.5 h-2.5 text-white/35" />}
                  <span className="text-[9px] text-white/35 leading-none">{label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upload content button */}
        <div className="px-2.5 pb-3">
          <Link href="/upload">
            <button
              className="w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all hover:opacity-90 active:scale-[0.97]"
              style={{ background: NEON, color: "#03080A" }}
            >
              <Upload className="w-3.5 h-3.5" />
              Upload Content
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   Main Carousel
   ────────────────────────────────────────────────────────────── */
export default function CommunityCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [, setLocation] = useLocation();
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const autoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isUserInteracting = useRef(false);
  const sectionRef = useRef<HTMLElement>(null);

  const { data, isLoading } = useQuery<CarouselData>({
    queryKey: ["/api/hero-carousel"],
    queryFn: async () => {
      const res = await fetch("/api/hero-carousel");
      if (!res.ok) throw new Error("Failed to fetch carousel data");
      return res.json();
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const slides = [
    { key: "trendingClip", data: data?.trendingClip, title: "Trending Clip", icon: Flame },
    { key: "topGamefolios", data: data?.topGamefolios, title: "Top Gamefolios", icon: Trophy },
    { key: "trendingGame", data: data?.trendingGame, title: "Trending Game", icon: Gamepad2 },
    { key: "liveStreams", data: data?.liveStreams, title: "Live Right Now", icon: Radio },
    { key: "creatorSpotlight", data: data?.creatorSpotlight, title: "Creator Spotlight", icon: Star },
    { key: "communityMilestone", data: data?.communityMilestone, title: "Community Milestone", icon: Rocket },
    { key: "discover", data: data?.discover, title: "Discover Something New", icon: Zap },
  ].filter(s => {
    if (Array.isArray(s.data)) return s.data.length > 0;
    return s.data !== null && s.data !== undefined;
  });

  const slidesCount = slides.length;

  const startTimer = useCallback((count: number) => {
    if (autoTimerRef.current) clearInterval(autoTimerRef.current);
    if (count <= 1) return;
    autoTimerRef.current = setInterval(() => {
      if (isUserInteracting.current) return;
      setCurrentSlide((prev) => (prev + 1) % count);
    }, SLIDE_INTERVAL);
  }, []);

  const goToSlide = useCallback((index: number) => {
    setCurrentSlide(index);
    startTimer(slidesCount);
  }, [slidesCount, startTimer]);

  const goNext = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % slidesCount);
    startTimer(slidesCount);
  }, [slidesCount, startTimer]);

  const goPrev = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + slidesCount) % slidesCount);
    startTimer(slidesCount);
  }, [slidesCount, startTimer]);

  useEffect(() => {
    setCurrentSlide(0);
    startTimer(slidesCount);
    return () => { if (autoTimerRef.current) clearInterval(autoTimerRef.current); };
  }, [slidesCount, startTimer]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrev]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = null;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) >= 50) {
      if (diff > 0) goNext();
      else goPrev();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  if (isLoading) {
    return (
      <section className="relative overflow-hidden -mx-2 md:-mx-6 -mt-2 md:-mt-4">
        <div className="relative h-[300px] sm:h-[350px] md:h-[500px]">
          <Skeleton className="absolute inset-0 bg-[#0B1319]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="space-y-4 text-center w-full max-w-lg px-6">
              <Skeleton className="h-10 sm:h-14 md:h-16 w-3/4 mx-auto bg-white/10" />
              <Skeleton className="h-5 sm:h-6 w-1/2 mx-auto bg-white/10" />
              <Skeleton className="h-10 w-36 mx-auto bg-primary/20" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (slidesCount === 0) return null;

  const isTrendingSlide = slides[currentSlide]?.key === "trendingClip";

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden -mx-2 md:-mx-6 -mt-2 md:-mt-4"
      tabIndex={0}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="relative h-[320px] sm:h-[380px] md:h-[540px]">
        {slides.map((slide, index) => {
          const isActive = currentSlide === index;
          const isTrending = slide.key === "trendingClip";

          return (
            <div
              key={slide.key}
              className="absolute inset-0 transition-opacity duration-700 ease-in-out"
              style={{ opacity: isActive ? 1 : 0, zIndex: isActive ? 1 : 0 }}
            >
              {isTrending ? (
                /* Trending slide: full-bleed, no padding */
                <div className="absolute inset-0 bg-[#03080A]">
                  {slide.data && (
                    <TrendingClipSlide
                      clip={slide.data as TrendingClip}
                      slideIndex={index}
                      totalSlides={slidesCount}
                      onPrev={goPrev}
                      onNext={goNext}
                      onGoTo={goToSlide}
                      onInteractionStart={() => { isUserInteracting.current = true; }}
                      onInteractionEnd={() => { isUserInteracting.current = false; }}
                      onNavigate={setLocation}
                    />
                  )}
                </div>
              ) : (
                /* All other slides */
                <>
                  <div className="absolute inset-0 bg-[#0B1319]" />
                  <div
                    className="absolute inset-0 opacity-[0.03]"
                    style={{
                      backgroundImage: `linear-gradient(rgba(193,255,0,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(193,255,0,0.3) 1px, transparent 1px)`,
                      backgroundSize: "60px 60px",
                    }}
                  />
                  <div className="relative h-full flex items-center justify-center px-4 sm:px-8 md:px-16">
                    {slide.key === "topGamefolios" && slide.data && (
                      <TopGamefoliosSlide entries={slide.data as TopGamefolioEntry[]} onNavigate={setLocation} />
                    )}
                    {slide.key === "trendingGame" && slide.data && (
                      <TrendingGameSlide game={slide.data as TrendingGame} onNavigate={setLocation} />
                    )}
                    {slide.key === "liveStreams" && slide.data && (
                      <LiveStreamsSlide streams={slide.data as LiveStream[]} onNavigate={setLocation} />
                    )}
                    {slide.key === "creatorSpotlight" && slide.data && (
                      <CreatorSpotlightSlide creator={slide.data as CreatorSpotlight} onNavigate={setLocation} />
                    )}
                    {slide.key === "communityMilestone" && slide.data && (
                      <CommunityMilestoneSlide milestone={slide.data as CommunityMilestone} />
                    )}
                    {slide.key === "discover" && slide.data && (
                      <DiscoverSlide item={slide.data as DiscoverItem} onNavigate={setLocation} />
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}

        {/* Navigation Arrows — hidden for trending slide (has its own) */}
        {slidesCount > 1 && !isTrendingSlide && (
          <>
            <button
              onClick={goPrev}
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-sm flex items-center justify-center text-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={goNext}
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-sm flex items-center justify-center text-white transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Dot Indicators — hidden for trending slide (has its own) */}
        {!isTrendingSlide && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {slides.map((slide, index) => (
              <button
                key={slide.key}
                onClick={() => goToSlide(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  currentSlide === index ? "w-6 bg-[#B7FF18]" : "w-2 bg-white/40 hover:bg-white/60"
                }`}
                title={slide.title}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ─────────────────────────── Slide Components ─────────────────────────── */

function TopGamefoliosSlide({ entries, onNavigate }: { entries: TopGamefolioEntry[]; onNavigate: (path: string) => void }) {
  return (
    <div className="text-center max-w-4xl w-full">
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#B7FF18]/10 text-[#B7FF18] text-xs font-semibold mb-4">
        <Trophy className="w-3.5 h-3.5" /> Top Gamefolios
      </div>
      <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2">Leaderboard Leaders</h2>
      <p className="text-white/50 text-sm sm:text-base mb-6 max-w-lg mx-auto">The highest-ranked creators on Gamefolio right now</p>
      <div className="flex items-end justify-center gap-3 sm:gap-4 md:gap-6">
        {entries.map((entry, i) => (
          <div
            key={entry.userId}
            className={`flex flex-col items-center cursor-pointer group transition-transform duration-300 hover:scale-105 ${
              i === 0 ? "order-2" : i === 1 ? "order-1" : "order-3"
            }`}
            onClick={() => onNavigate(`/profile/${entry.username}`)}
          >
            <div className={`relative ${i === 0 ? "mb-3" : "mb-2"}`}>
              <Avatar className={`${i === 0 ? "w-20 h-20 sm:w-24 sm:h-24" : "w-14 h-14 sm:w-18 sm:h-18"} ring-2 ${i === 0 ? "ring-[#B7FF18]" : i === 1 ? "ring-yellow-400" : "ring-orange-400"}`}>
                <AvatarImage src={entry.avatarUrl || undefined} />
                <AvatarFallback className="bg-[#B7FF18]/10 text-[#B7FF18] font-bold text-lg">{entry.displayName?.charAt(0) || entry.username.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                i === 0 ? "bg-[#B7FF18] text-[#071013]" : i === 1 ? "bg-yellow-400 text-black" : "bg-orange-400 text-black"
              }`}>
                #{entry.rank}
              </div>
            </div>
            <span className="text-white font-semibold text-sm sm:text-base">{entry.displayName || entry.username}</span>
            <span className="text-[#B7FF18] text-xs font-medium">Lv. {entry.level} · {formatNumber(entry.xp)} XP</span>
          </div>
        ))}
      </div>
      <Button
        variant="ghost"
        className="mt-6 text-[#B7FF18] hover:text-[#B7FF18] hover:bg-[#B7FF18]/10 font-semibold"
        onClick={() => onNavigate("/leaderboard")}
      >
        View Leaderboard <ArrowRight className="w-4 h-4 ml-1.5" />
      </Button>
    </div>
  );
}

function TrendingGameSlide({ game, onNavigate }: { game: TrendingGame; onNavigate: (path: string) => void }) {
  return (
    <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8 max-w-5xl w-full">
      <div className="relative w-full md:w-[400px] lg:w-[480px] flex-shrink-0 rounded-xl overflow-hidden border border-white/10 shadow-2xl group cursor-pointer"
        onClick={() => onNavigate(`/game/${game.slug}`)}>
        <img
          src={game.backgroundImageUrl || game.imageUrl || "/attached_assets/gamefolio-logo-green.png"}
          alt={game.name}
          className="w-full aspect-video object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-3 left-3 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#B7FF18]/20 flex items-center justify-center">
            <Gamepad2 className="w-4 h-4 text-[#B7FF18]" />
          </div>
          <span className="text-white text-xs font-medium">Explore Game</span>
        </div>
      </div>
      <div className="flex-1 text-center md:text-left">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#B7FF18]/10 text-[#B7FF18] text-xs font-semibold mb-3">
          <Gamepad2 className="w-3.5 h-3.5" /> Trending Game
        </div>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-3 leading-tight">{game.name}</h2>
        <div className="flex items-center justify-center md:justify-start gap-4 sm:gap-6 mb-5">
          <div className="flex flex-col items-center md:items-start">
            <span className="text-[#B7FF18] text-lg sm:text-xl font-bold">{formatNumber(game.clips)}</span>
            <span className="text-white/50 text-xs">Clips</span>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="flex flex-col items-center md:items-start">
            <span className="text-[#B7FF18] text-lg sm:text-xl font-bold">{formatNumber(game.creators)}</span>
            <span className="text-white/50 text-xs">Creators</span>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="flex flex-col items-center md:items-start">
            <span className="text-[#B7FF18] text-lg sm:text-xl font-bold">{formatNumber(game.views)}</span>
            <span className="text-white/50 text-xs">Views</span>
          </div>
        </div>
        <Button
          className="bg-[#B7FF18] hover:bg-[#B7FF18]/90 text-[#071013] font-semibold px-6 py-2 h-auto rounded-lg"
          onClick={() => onNavigate(`/game/${game.slug}`)}
        >
          Explore Game <ArrowRight className="w-4 h-4 ml-1.5" />
        </Button>
      </div>
    </div>
  );
}

function LiveStreamsSlide({ streams, onNavigate }: { streams: LiveStream[]; onNavigate: (path: string) => void }) {
  return (
    <div className="text-center max-w-4xl w-full">
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 text-red-400 text-xs font-semibold mb-4 animate-pulse">
        <Radio className="w-3.5 h-3.5" /> Live Right Now
      </div>
      <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2">Live Streams</h2>
      <p className="text-white/50 text-sm sm:text-base mb-6">Watch creators streaming live</p>
      <div className="flex flex-wrap justify-center gap-4 md:gap-6">
        {streams.map((stream) => (
          <div
            key={stream.userId}
            className="flex flex-col items-center cursor-pointer group"
            onClick={() => stream.channelUrl ? openExternal(stream.channelUrl) : onNavigate(`/profile/${stream.username}`)}
          >
            <div className="relative mb-2">
              <Avatar className="w-16 h-16 sm:w-20 sm:h-20 ring-2 ring-red-500/60 group-hover:ring-red-500 transition-all">
                <AvatarImage src={stream.avatarUrl || undefined} />
                <AvatarFallback className="bg-red-500/20 text-red-400 font-bold text-lg">{stream.displayName?.charAt(0) || stream.username.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="absolute -top-1 -right-1 px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold uppercase tracking-wide">
                LIVE
              </div>
            </div>
            <span className="text-white font-semibold text-sm">{stream.displayName || stream.username}</span>
            <span className="text-white/40 text-xs capitalize">{stream.platform}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CreatorSpotlightSlide({ creator, onNavigate }: { creator: CreatorSpotlight; onNavigate: (path: string) => void }) {
  return (
    <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8 max-w-4xl w-full">
      <div className="flex flex-col items-center md:items-start flex-shrink-0">
        <div className="relative mb-3">
          <Avatar className="w-24 h-24 sm:w-32 sm:h-32 ring-2 ring-[#B7FF18] shadow-lg shadow-[#B7FF18]/10">
            <AvatarImage src={creator.avatarUrl || undefined} />
            <AvatarFallback className="bg-[#B7FF18]/10 text-[#B7FF18] font-bold text-3xl">{creator.displayName?.charAt(0) || creator.username.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-[#B7FF18] flex items-center justify-center">
            <Star className="w-4 h-4 text-[#071013]" />
          </div>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#B7FF18]/10 text-[#B7FF18] text-xs font-semibold mb-1">
          <Star className="w-3.5 h-3.5" /> Creator Spotlight
        </div>
      </div>
      <div className="text-center md:text-left flex-1">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1">{creator.displayName || creator.username}</h2>
        <p className="text-white/50 text-sm mb-4">Level {creator.level} Creator</p>
        <div className="flex items-center justify-center md:justify-start gap-4 sm:gap-6 mb-5">
          <div className="flex flex-col items-center md:items-start">
            <span className="text-[#B7FF18] text-lg font-bold">{formatNumber(creator.clips)}</span>
            <span className="text-white/50 text-xs">Clips</span>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="flex flex-col items-center md:items-start">
            <span className="text-[#B7FF18] text-lg font-bold">{formatNumber(creator.views)}</span>
            <span className="text-white/50 text-xs">Views</span>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="flex flex-col items-center md:items-start">
            <span className="text-[#B7FF18] text-lg font-bold">Lv. {creator.level}</span>
            <span className="text-white/50 text-xs">Level</span>
          </div>
        </div>
        <Button
          className="bg-[#B7FF18] hover:bg-[#B7FF18]/90 text-[#071013] font-semibold px-6 py-2 h-auto rounded-lg"
          onClick={() => onNavigate(`/profile/${creator.username}`)}
        >
          View Profile <ArrowRight className="w-4 h-4 ml-1.5" />
        </Button>
      </div>
    </div>
  );
}

function CommunityMilestoneSlide({ milestone }: { milestone: CommunityMilestone }) {
  return (
    <div className="text-center max-w-4xl w-full">
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#B7FF18]/10 text-[#B7FF18] text-xs font-semibold mb-4">
        <Rocket className="w-3.5 h-3.5" /> Community Milestone
      </div>
      <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2">The Gamefolio Community</h2>
      <p className="text-white/50 text-sm sm:text-base mb-8">Growing every day. Join the movement.</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white/[0.04] border border-white/10 rounded-xl p-5 sm:p-6 flex flex-col items-center">
          <Video className="w-7 h-7 text-[#B7FF18] mb-3" />
          <span className="text-2xl sm:text-3xl font-bold text-[#B7FF18] mb-1">{formatNumber(milestone.totalClips)}</span>
          <span className="text-white/50 text-xs sm:text-sm">Clips Uploaded</span>
        </div>
        <div className="bg-white/[0.04] border border-white/10 rounded-xl p-5 sm:p-6 flex flex-col items-center">
          <Users className="w-7 h-7 text-[#B7FF18] mb-3" />
          <span className="text-2xl sm:text-3xl font-bold text-[#B7FF18] mb-1">{formatNumber(milestone.totalCreators)}</span>
          <span className="text-white/50 text-xs sm:text-sm">Active Creators</span>
        </div>
        <div className="bg-white/[0.04] border border-white/10 rounded-xl p-5 sm:p-6 flex flex-col items-center">
          <CircleUser className="w-7 h-7 text-[#B7FF18] mb-3" />
          <span className="text-2xl sm:text-3xl font-bold text-[#B7FF18] mb-1">{formatNumber(milestone.totalProfiles)}</span>
          <span className="text-white/50 text-xs sm:text-sm">Profiles Created</span>
        </div>
      </div>
    </div>
  );
}

function DiscoverSlide({ item, onNavigate }: { item: DiscoverItem; onNavigate: (path: string) => void }) {
  return (
    <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8 max-w-5xl w-full">
      <div className="relative w-full md:w-[420px] lg:w-[520px] flex-shrink-0 rounded-xl overflow-hidden border border-white/10 shadow-2xl group cursor-pointer"
        onClick={() => onNavigate(`/clip/${item.id}`)}>
        <img
          src={item.thumbnailUrl || "/attached_assets/gamefolio-logo-green.png"}
          alt={item.title}
          className="w-full aspect-video object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-3 left-3 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#B7FF18]/20 flex items-center justify-center">
            <Zap className="w-4 h-4 text-[#B7FF18]" />
          </div>
          <span className="text-white text-xs font-medium">Discover</span>
        </div>
      </div>
      <div className="flex-1 text-center md:text-left">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#B7FF18]/10 text-[#B7FF18] text-xs font-semibold mb-3">
          <Zap className="w-3.5 h-3.5" /> Discover Something New
        </div>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2 leading-tight">{item.title}</h2>
        <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
          {item.creator && (
            <span className="text-white/70 text-sm">
              by <span className="text-[#B7FF18] font-medium">{item.creator.displayName || item.creator.username}</span>
            </span>
          )}
          {item.game && item.game.name && (
            <span className="text-white/40 text-sm">in {item.game.name}</span>
          )}
        </div>
        <p className="text-white/50 text-sm mb-5 max-w-md">
          Fresh content picked from the community. Watch, engage, and share your thoughts.
        </p>
        <Button
          className="bg-[#B7FF18] hover:bg-[#B7FF18]/90 text-[#071013] font-semibold px-6 py-2 h-auto rounded-lg"
          onClick={() => onNavigate(`/clip/${item.id}`)}
        >
          Discover More <ArrowRight className="w-4 h-4 ml-1.5" />
        </Button>
      </div>
    </div>
  );
}
