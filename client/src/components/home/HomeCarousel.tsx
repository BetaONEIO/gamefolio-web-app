import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useMobile } from "@/hooks/use-mobile";
import { apiRequest } from "@/lib/queryClient";
import {
  ChevronLeft, ChevronRight, Eye, Heart, Video, Trophy,
  Zap, Radio, Star, Rocket, Compass, Gamepad2, Users,
  ArrowRight, Clapperboard, Flame, Play, Pause, Volume2, VolumeX,
  Upload, Camera, Image, Info, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

const NEON = "#B7FF18";

/* ──────────────────────────────────────────────────────────────
   Data models
   ────────────────────────────────────────────────────────────── */
interface ClipWithUser {
  id: number;
  title: string;
  thumbnailUrl: string;
  videoUrl: string;
  views: number;
  likes: number;
  user: { username: string; displayName: string; avatarUrl: string | null };
  game?: { id?: number; name: string; imageUrl: string | null };
}

interface LeaderboardEntry {
  rank: number;
  userId: number;
  totalPoints: number;
  user: { username: string; displayName: string; avatarUrl: string | null };
}

interface Game {
  id: number;
  name: string;
  imageUrl: string | null;
  twitchId?: string;
}

interface FeaturedUser {
  id: number;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  level: number;
  totalXP: number;
  clipsUploaded?: number;
  totalViews?: number;
}

/* ──────────────────────────────────────────────────────────────
   Slide helpers
   ────────────────────────────────────────────────────────────── */
function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

function MetricBadge({ icon: Icon, value, label }: { icon: any; value: string | number; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-sm text-white/80">
      <Icon className="w-3.5 h-3.5" style={{ color: NEON }} />
      <span className="font-bold">{value}</span>
      <span className="text-white/50 text-xs">{label}</span>
    </div>
  );
}

function SlideWrapper({ children, bgImage }: { children: React.ReactNode; bgImage?: string }) {
  return (
    <div className="relative w-full h-full min-h-[350px] md:min-h-[450px] lg:min-h-[500px] xl:min-h-[550px] overflow-hidden">
      {bgImage && (
        <img src={bgImage} alt="" className="absolute inset-0 w-full h-full object-cover" loading="eager" />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0B1319]/95 via-[#0B1319]/70 to-[#0B1319]/40" />
      <div className="absolute top-0 right-0 w-80 h-80 rounded-full blur-[100px] pointer-events-none" style={{ background: "rgba(183,255,24,0.06)" }} />
      <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full blur-[80px] pointer-events-none" style={{ background: "rgba(120,40,200,0.05)" }} />
      <div className="relative z-10 h-full flex flex-col items-start justify-center max-w-3xl px-6 md:px-12 py-8">
        {children}
      </div>
    </div>
  );
}

function SlideTag({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-3">
      <Icon className="w-3.5 h-3.5" style={{ color: NEON }} />
      <span className="text-[10px] font-black uppercase tracking-[2.5px]" style={{ color: NEON }}>{text}</span>
    </div>
  );
}

function CtaButton({ children, onClick, className = "" }: { children: React.ReactNode; onClick?: () => void; className?: string }) {
  return (
    <Button
      onClick={onClick}
      className={`w-fit px-6 py-5 h-auto text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98] ${className}`}
      style={{ background: NEON, color: "#0B1319", boxShadow: "0 8px 30px rgba(183,255,24,0.25)" }}
    >
      {children} <ArrowRight className="w-4 h-4 ml-2" />
    </Button>
  );
}

/* ──────────────────────────────────────────────────────────────
   Slide 1: Trending Clip — new split layout
   ────────────────────────────────────────────────────────────── */
interface TrendingClipSlideProps {
  clip: ClipWithUser;
  allClips: ClipWithUser[];
  onClick: () => void;
  onInteractionStart: () => void;
  onInteractionEnd: () => void;
  slideIndex: number;
  totalSlides: number;
  onPrev: () => void;
  onNext: () => void;
  onGoTo: (idx: number) => void;
}

function TrendingClipSlide({
  clip,
  allClips,
  onClick,
  onInteractionStart,
  onInteractionEnd,
  slideIndex,
  totalSlides,
  onPrev,
  onNext,
  onGoTo,
}: TrendingClipSlideProps) {
  const [contentType, setContentType] = useState<"clips" | "reels">("clips");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [showInfo, setShowInfo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

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

  const handleVideoAreaClick = () => {
    if (!isPlaying) onClick();
  };

  return (
    <div
      className="w-full flex flex-col md:flex-row bg-[#03080A]"
      style={{ minHeight: "clamp(360px, 45vw, 520px)" }}
    >
      {/* ── LEFT: Video Player ── */}
      <div className="relative flex-1 min-w-0 flex flex-col bg-[#03080A]">
        {/* Header bar */}
        <div className="flex items-center gap-3 px-4 pt-3 pb-2 z-20 relative">
          <div className="flex items-center gap-1.5">
            <Flame className="w-4 h-4" style={{ color: NEON }} />
            <span className="text-sm font-black text-white">Trending</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setContentType("clips")}
              className="px-3 py-1 rounded-full text-xs font-bold transition-all"
              style={
                contentType === "clips"
                  ? { background: NEON, color: "#03080A" }
                  : { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }
              }
            >
              Clips
            </button>
            <button
              onClick={() => setContentType("reels")}
              className="px-3 py-1 rounded-full text-xs font-bold transition-all"
              style={
                contentType === "reels"
                  ? { background: NEON, color: "#03080A" }
                  : { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }
              }
            >
              Reels
            </button>
          </div>
        </div>

        {/* Video area */}
        <div
          className="relative flex-1 bg-black overflow-hidden cursor-pointer group"
          onClick={handleVideoAreaClick}
          style={{ minHeight: "200px" }}
        >
          {/* Thumbnail / Video */}
          {clip.videoUrl ? (
            <video
              ref={videoRef}
              src={clip.videoUrl}
              poster={clip.thumbnailUrl}
              className="absolute inset-0 w-full h-full object-cover"
              muted={isMuted}
              playsInline
              onEnded={handleVideoEnded}
              onTimeUpdate={handleTimeUpdate}
            />
          ) : (
            <img
              src={clip.thumbnailUrl}
              alt={clip.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}

          {/* Dark gradient overlay at bottom */}
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/90 to-transparent pointer-events-none" />

          {/* Play/Pause overlay button */}
          <button
            onClick={handlePlayPause}
            className="absolute inset-0 w-full h-full flex items-center justify-center z-10 transition-opacity duration-200"
            style={{ background: "transparent" }}
          >
            <div
              className={`rounded-full p-3 transition-all duration-200 ${isPlaying ? "opacity-0 group-hover:opacity-100" : "opacity-100"}`}
              style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
            >
              {isPlaying
                ? <Pause className="w-7 h-7 text-white fill-white" />
                : <Play className="w-7 h-7 text-white fill-white" />
              }
            </div>
          </button>

          {/* Left nav arrow inside video */}
          <button
            onClick={(e) => { e.stopPropagation(); onPrev(); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 bg-black/50 hover:bg-black/80 text-white rounded-full p-1.5 transition-colors"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Game info overlay — shown when info button is active */}
          {showInfo && clip.game && (
            <div className="absolute inset-0 z-30 flex items-end justify-end pointer-events-none">
              {/* Tap-to-close backdrop */}
              <div
                className="absolute inset-0 pointer-events-auto"
                onClick={(e) => { e.stopPropagation(); setShowInfo(false); }}
              />
              {/* Panel */}
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
                {/* Game artwork */}
                <div className="relative flex-shrink-0 overflow-hidden" style={{ height: 90 }}>
                  {clip.game.imageUrl ? (
                    <img src={clip.game.imageUrl} alt={clip.game.name} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center" style={{ background: "#0A1117" }}>
                      <Gamepad2 className="w-7 h-7 text-white/15" />
                    </div>
                  )}
                  <div className="absolute bottom-0 inset-x-0 px-2 py-1.5" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.82) 0%, transparent 100%)" }}>
                    <p className="text-[10px] font-black uppercase tracking-wide text-white line-clamp-1">{clip.game.name}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowInfo(false); }}
                    className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/60 hover:bg-black/85 flex items-center justify-center transition-colors"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
                {/* Stats */}
                <div className="px-3 pt-2.5 pb-2 flex flex-col gap-1.5">
                  {[
                    { icon: Clapperboard, label: "Clips",    value: clip.views ? Math.max(1, Math.floor(clip.views / 120)) : 5 },
                    { icon: Video,        label: "Reels",    value: clip.likes ? Math.max(1, Math.floor(clip.likes / 40))  : 3 },
                    { icon: Camera,       label: "Shots",    value: clip.views ? Math.max(1, Math.floor(clip.views / 200)) : 5 },
                    { icon: null,         label: "Bounties", value: 3 },
                  ].map(({ icon: Icon, label, value }, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {Icon && <Icon className="w-3 h-3 text-white/60" />}
                        <span className="text-[11px] text-white/70">{label}</span>
                      </div>
                      <span className="text-[11px] font-bold text-white">{formatNumber(value)}</span>
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
          )}

          {/* Bottom bar: title, dots, mute */}
          <div className="absolute bottom-0 inset-x-0 z-20 px-4 pb-2">
            <div className="flex items-end justify-between gap-2">
              {/* Title + username */}
              <div className="min-w-0">
                <p className="text-white font-bold text-sm leading-tight line-clamp-1 drop-shadow">{clip.title}</p>
                <Link href={`/profile/${clip.user.username}`} onClick={(e) => e.stopPropagation()}>
                  <p className="text-white/60 text-xs hover:text-white/90 transition-colors">
                    @{clip.user.username}
                  </p>
                </Link>
              </div>

              {/* Info + Mute buttons */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {clip.game && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowInfo(v => !v); }}
                    className="p-1.5 rounded-full transition-all"
                    style={{
                      background: showInfo ? NEON : "rgba(0,0,0,0.60)",
                      backdropFilter: "blur(6px)",
                    }}
                    aria-label="Game info"
                  >
                    <Info className="w-4 h-4" style={{ color: showInfo ? "#03080A" : "white" }} />
                  </button>
                )}
                <button
                  onClick={handleMute}
                  className="flex-shrink-0 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors"
                  style={{ backdropFilter: "blur(6px)" }}
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Dot indicators */}
            <div className="flex items-center gap-1.5 mt-2">
              {Array.from({ length: totalSlides }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => { e.stopPropagation(); onGoTo(idx); }}
                  className="rounded-full transition-all"
                  style={{
                    height: 6,
                    width: idx === slideIndex ? 20 : 6,
                    background: idx === slideIndex ? NEON : "rgba(255,255,255,0.35)",
                  }}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>

            {/* Progress bar */}
            <div className="mt-2 h-[2px] w-full rounded-full bg-white/20 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-100"
                style={{ width: `${progress}%`, background: NEON }}
              />
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   Slide 2: Top Gamefolios
   ────────────────────────────────────────────────────────────── */
function TopGamefoliosSlide({ entries, onClick }: { entries: LeaderboardEntry[]; onClick: () => void }) {
  const top = entries.slice(0, 3);
  return (
    <SlideWrapper>
      <SlideTag icon={Trophy} text="Top Gamefolios" />
      <h1 className="text-2xl md:text-4xl lg:text-5xl font-black text-white mb-6 leading-tight drop-shadow-lg">
        The Best on Gamefolio
      </h1>
      <div className="flex items-end gap-3 mb-6">
        {top.map((entry, i) => (
          <div key={entry.userId} className="flex flex-col items-center">
            <div className="relative">
              <img
                src={entry.user.avatarUrl || "/attached_assets/gamefolio-logo-green.png"}
                alt=""
                className="w-12 h-12 md:w-16 md:h-16 rounded-full object-cover border-2 border-white/20"
              />
              <div
                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black"
                style={{ background: i === 0 ? NEON : "rgba(255,255,255,0.15)", color: i === 0 ? "#0B1319" : "#fff" }}
              >
                #{entry.rank}
              </div>
            </div>
            <span className="text-xs text-white font-semibold mt-1.5 text-center max-w-[80px] truncate">{entry.user.displayName || entry.user.username}</span>
            <span className="text-[10px] text-white/50">{formatNumber(entry.totalPoints)} XP</span>
          </div>
        ))}
      </div>
      <CtaButton onClick={onClick}>View Leaderboard</CtaButton>
    </SlideWrapper>
  );
}

/* ──────────────────────────────────────────────────────────────
   Slide 3: Trending Game
   ────────────────────────────────────────────────────────────── */
function TrendingGameSlide({ game, onClick }: { game: Game; onClick: () => void }) {
  return (
    <SlideWrapper bgImage={game.imageUrl || undefined}>
      <SlideTag icon={Gamepad2} text="Trending Game" />
      <h1 className="text-2xl md:text-4xl lg:text-5xl font-black text-white mb-3 leading-tight drop-shadow-lg">
        {game.name}
      </h1>
      <div className="flex items-center gap-4 mb-6">
        <MetricBadge icon={Clapperboard} value="1,245" label="clips" />
        <MetricBadge icon={Users} value="82" label="creators" />
        <MetricBadge icon={Eye} value="312K" label="views" />
      </div>
      <CtaButton onClick={onClick}>Explore Game</CtaButton>
    </SlideWrapper>
  );
}

/* ──────────────────────────────────────────────────────────────
   Slide 4: Live Right Now
   ────────────────────────────────────────────────────────────── */
function LiveNowSlide({ onClick }: { onClick: () => void }) {
  return (
    <SlideWrapper>
      <SlideTag icon={Radio} text="Live Right Now" />
      <h1 className="text-2xl md:text-4xl lg:text-5xl font-black text-white mb-3 leading-tight drop-shadow-lg">
        Watch Live Streams
      </h1>
      <p className="text-base md:text-lg text-white/70 mb-6 max-w-lg leading-relaxed">
        Catch the best gamers live. Watch epic gameplay, chat with the community, and discover new creators.
      </p>
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/20 border border-red-500/30">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs font-bold text-red-400">LIVE</span>
        </div>
        <span className="text-sm text-white/60">Streamers online now</span>
      </div>
      <CtaButton onClick={onClick}>Watch Live</CtaButton>
    </SlideWrapper>
  );
}

/* ──────────────────────────────────────────────────────────────
   Slide 5: Creator Spotlight
   ────────────────────────────────────────────────────────────── */
function CreatorSpotlightSlide({ creator, onClick }: { creator: FeaturedUser; onClick: () => void }) {
  return (
    <SlideWrapper bgImage={creator.avatarUrl || undefined}>
      <SlideTag icon={Star} text="Creator Spotlight" />
      <div className="flex items-center gap-3 mb-3">
        <img
          src={creator.avatarUrl || "/attached_assets/gamefolio-logo-green.png"}
          alt=""
          className="w-14 h-14 rounded-full object-cover border-2 border-white/20"
        />
        <div>
          <h1 className="text-2xl md:text-4xl font-black text-white leading-tight">{creator.displayName || creator.username}</h1>
          <span className="text-sm text-white/50">@{creator.username}</span>
        </div>
      </div>
      <div className="flex items-center gap-4 mb-6">
        <MetricBadge icon={Video} value={formatNumber(creator.clipsUploaded || 0)} label="clips" />
        <MetricBadge icon={Eye} value={formatNumber(creator.totalViews || 0)} label="views" />
        <MetricBadge icon={Zap} value={`Lv.${creator.level || 1}`} label="level" />
      </div>
      <CtaButton onClick={onClick}>View Profile</CtaButton>
    </SlideWrapper>
  );
}

/* ──────────────────────────────────────────────────────────────
   Slide 6: Community Milestone
   ────────────────────────────────────────────────────────────── */
function CommunityMilestoneSlide({ stats, onClick }: { stats: { clips: number; creators: number; streams: number; profiles: number }; onClick: () => void }) {
  return (
    <SlideWrapper>
      <SlideTag icon={Rocket} text="Community Milestone" />
      <h1 className="text-2xl md:text-4xl lg:text-5xl font-black text-white mb-6 leading-tight drop-shadow-lg">
        The Gamefolio Community
      </h1>
      <div className="grid grid-cols-2 gap-4 mb-6 max-w-md">
        {[
          { icon: Clapperboard, value: formatNumber(stats.clips), label: "Clips Uploaded" },
          { icon: Users, value: formatNumber(stats.creators), label: "Creators Joined" },
          { icon: Radio, value: formatNumber(stats.streams), label: "Livestreams This Week" },
          { icon: Compass, value: formatNumber(stats.profiles), label: "Profiles Created" },
        ].map(({ icon: Icon, value, label }) => (
          <div key={label} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <Icon className="w-4 h-4 mb-1" style={{ color: NEON }} />
            <div className="text-lg font-black text-white">{value}</div>
            <div className="text-[10px] text-white/50 uppercase tracking-wider">{label}</div>
          </div>
        ))}
      </div>
      <CtaButton onClick={onClick}>Explore Community</CtaButton>
    </SlideWrapper>
  );
}

/* ──────────────────────────────────────────────────────────────
   Slide 7: Discover Something New
   ────────────────────────────────────────────────────────────── */
function DiscoverSlide({ clip, onClick }: { clip: ClipWithUser; onClick: () => void }) {
  return (
    <SlideWrapper bgImage={clip.thumbnailUrl}>
      <SlideTag icon={Compass} text="Discover Something New" />
      <h1 className="text-2xl md:text-4xl lg:text-5xl font-black text-white mb-2 leading-tight drop-shadow-lg">
        {clip.title || "Discover Amazing Content"}
      </h1>
      <div className="flex items-center gap-2 mb-3">
        <img src={clip.user.avatarUrl || "/attached_assets/gamefolio-logo-green.png"} alt="" className="w-6 h-6 rounded-full object-cover border border-white/20" />
        <span className="text-sm text-white/80">{clip.user.displayName || clip.user.username}</span>
        {clip.game?.name && (
          <span className="text-xs text-white/50 px-2 py-0.5 rounded-full bg-white/10">{clip.game.name}</span>
        )}
      </div>
      <p className="text-sm text-white/60 mb-6 max-w-lg leading-relaxed">
        Explore trending clips, discover new creators, and find your next favorite game on Gamefolio.
      </p>
      <CtaButton onClick={onClick}>Discover More</CtaButton>
    </SlideWrapper>
  );
}

/* ──────────────────────────────────────────────────────────────
   Main Carousel
   ────────────────────────────────────────────────────────────── */
export default function HomeCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(1);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isUserInteracting = useRef(false);
  const [, setLocation] = useLocation();
  const isMobile = useMobile();

  /* ── Data fetching ── */
  const { data: clips } = useQuery<ClipWithUser[]>({
    queryKey: ["/api/clips/latest"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/clips/latest?limit=10");
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 30000,
  });

  const { data: leaderboard } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/leaderboard"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/leaderboard?limit=5");
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 60000,
  });

  const { data: trendingGames } = useQuery<Game[]>({
    queryKey: ["/api/games/trending"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/games/trending?limit=5");
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 60000,
  });

  const { data: featuredUsers } = useQuery<FeaturedUser[]>({
    queryKey: ["/api/users/featured"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/users/featured");
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 60000,
  });

  /* ── Build slides list ── */
  const slides = useMemo(() => {
    const list: { type: string; component: (props: { slideIndex: number; totalSlides: number; onPrev: () => void; onNext: () => void; onGoTo: (i: number) => void }) => React.ReactNode; id: number }[] = [];
    let idCounter = 0;

    const add = (type: string, render: (props: { slideIndex: number; totalSlides: number; onPrev: () => void; onNext: () => void; onGoTo: (i: number) => void }) => React.ReactNode) => {
      list.push({ type, component: render, id: idCounter++ });
    };

    if (clips && clips.length > 0) {
      add("trending-clip", ({ slideIndex, totalSlides, onPrev, onNext, onGoTo }) => (
        <TrendingClipSlide
          key="tc"
          clip={clips[0]}
          allClips={clips}
          onClick={() => setLocation(`/clips/${clips[0].id}`)}
          onInteractionStart={() => { isUserInteracting.current = true; }}
          onInteractionEnd={() => { isUserInteracting.current = false; }}
          slideIndex={slideIndex}
          totalSlides={totalSlides}
          onPrev={onPrev}
          onNext={onNext}
          onGoTo={onGoTo}
        />
      ));
    }

    if (leaderboard && leaderboard.length > 0) {
      add("top-gamefolios", () => (
        <TopGamefoliosSlide
          key="tg"
          entries={leaderboard}
          onClick={() => setLocation("/leaderboard")}
        />
      ));
    }

    if (trendingGames && trendingGames.length > 0) {
      add("trending-game", () => (
        <TrendingGameSlide
          key="tgame"
          game={trendingGames[0]}
          onClick={() => setLocation(`/games/${trendingGames[0].name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`)}
        />
      ));
    }

    add("live-now", () => (
      <LiveNowSlide key="ln" onClick={() => setLocation("/explore")} />
    ));

    if (featuredUsers && featuredUsers.length > 0) {
      const creator = featuredUsers[0];
      add("creator-spotlight", () => (
        <CreatorSpotlightSlide
          key="cs"
          creator={creator}
          onClick={() => setLocation(`/${creator.username}`)}
        />
      ));
    }

    add("community-milestone", () => (
      <CommunityMilestoneSlide
        key="cm"
        stats={{ clips: 500_000, creators: 10_000, streams: 1_000, profiles: 25_000 }}
        onClick={() => setLocation("/explore")}
      />
    ));

    if (clips && clips.length > 1) {
      add("discover", () => (
        <DiscoverSlide
          key="disc"
          clip={clips[1]}
          onClick={() => setLocation("/explore")}
        />
      ));
    }

    return list;
  }, [clips, leaderboard, trendingGames, featuredUsers, setLocation]);

  /* ── Auto-rotate timer ── */
  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (slides.length > 1) {
      timerRef.current = setInterval(() => {
        if (isUserInteracting.current) return;
        setDirection(1);
        setCurrentSlide((prev) => (prev + 1) % slides.length);
      }, 6000);
    }
  }, [slides.length]);

  useEffect(() => {
    resetTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [resetTimer]);

  useEffect(() => {
    if (currentSlide >= slides.length) setCurrentSlide(0);
  }, [slides.length, currentSlide]);

  const goTo = useCallback((idx: number) => {
    setDirection(idx > currentSlide ? 1 : -1);
    setCurrentSlide(idx);
    resetTimer();
  }, [currentSlide, resetTimer]);

  const next = useCallback(() => {
    if (!slides.length) return;
    setDirection(1);
    setCurrentSlide((prev) => (prev + 1) % slides.length);
    resetTimer();
  }, [slides.length, resetTimer]);

  const prev = useCallback(() => {
    if (!slides.length) return;
    setDirection(-1);
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
    resetTimer();
  }, [slides.length, resetTimer]);

  /* ── Swipe handling ── */
  const touchStart = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart.current === null) return;
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) next();
      else prev();
    }
    touchStart.current = null;
  };

  /* ── Variants for framer-motion ── */
  const variants = {
    enter: (d: number) => ({ x: d > 0 ? "100%" : "-100%", opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? "-100%" : "100%", opacity: 0 }),
  };

  if (slides.length === 0) return null;

  const isTrendingSlide = slides[currentSlide]?.type === "trending-clip";

  return (
    <section className="mb-10 -mx-4 md:-mx-6 -mt-4 md:-mt-6">
      <div
        className="relative w-full overflow-hidden border-b-2 border-primary/30"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={slides[currentSlide].id}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "tween", duration: 0.5, ease: "easeInOut" }}
            className="w-full"
          >
            {slides[currentSlide].component({
              slideIndex: currentSlide,
              totalSlides: slides.length,
              onPrev: prev,
              onNext: next,
              onGoTo: goTo,
            })}
          </motion.div>
        </AnimatePresence>

        {/* Navigation arrows — hidden for trending slide (has its own) */}
        {slides.length > 1 && !isTrendingSlide && (
          <>
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
              aria-label="Previous slide"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
              aria-label="Next slide"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Dot indicators — hidden for trending slide (has its own) */}
        {slides.length > 1 && !isTrendingSlide && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => goTo(idx)}
                className="rounded-full transition-all"
                style={{
                  height: 10,
                  width: idx === currentSlide ? 24 : 10,
                  background: idx === currentSlide ? NEON : "rgba(255,255,255,0.4)",
                }}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}

        {/* Slide counter — hidden for trending slide */}
        {!isTrendingSlide && (
          <div className="absolute top-4 right-4 z-20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider" style={{ background: "rgba(0,0,0,0.5)", color: NEON }}>
            {currentSlide + 1} / {slides.length}
          </div>
        )}
      </div>
    </section>
  );
}
