import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Flame, Trophy, Gamepad2, Radio, Star, Rocket, Eye, Heart,
  ArrowRight, ChevronLeft, ChevronRight, Zap, Users, Video,
  BarChart3, PlayCircle, CircleUser,
} from "lucide-react";
import { openExternal } from "@/lib/platform";

interface TrendingClip {
  id: number;
  title: string;
  thumbnailUrl: string | null;
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

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return n.toString();
}

export default function CommunityCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [, setLocation] = useLocation();
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const autoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
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

  const goToSlide = useCallback((index: number) => {
    setCurrentSlide(index);
    if (autoTimerRef.current) clearInterval(autoTimerRef.current);
    autoTimerRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slidesCount);
    }, SLIDE_INTERVAL);
  }, [slidesCount]);

  const goNext = useCallback(() => {
    goToSlide((currentSlide + 1) % slidesCount);
  }, [currentSlide, goToSlide, slidesCount]);

  const goPrev = useCallback(() => {
    goToSlide((currentSlide - 1 + slidesCount) % slidesCount);
  }, [currentSlide, goToSlide, slidesCount]);

  useEffect(() => {
    setCurrentSlide(0);
    if (autoTimerRef.current) clearInterval(autoTimerRef.current);
    autoTimerRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slidesCount);
    }, SLIDE_INTERVAL);
    return () => { if (autoTimerRef.current) clearInterval(autoTimerRef.current); };
  }, [slidesCount]);

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
          return (
            <div
              key={slide.key}
              className="absolute inset-0 transition-opacity duration-700 ease-in-out"
              style={{ opacity: isActive ? 1 : 0, zIndex: isActive ? 1 : 0 }}
            >
              {/* Slide background */}
              <div className="absolute inset-0 bg-[#0B1319]" />
              {/* Subtle grid pattern */}
              <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                  backgroundImage: `linear-gradient(rgba(193,255,0,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(193,255,0,0.3) 1px, transparent 1px)`,
                  backgroundSize: "60px 60px",
                }}
              />

              {/* Slide content */}
              <div className="relative h-full flex items-center justify-center px-4 sm:px-8 md:px-16">
                {slide.key === "trendingClip" && slide.data && (
                  <TrendingClipSlide clip={slide.data as TrendingClip} onNavigate={setLocation} />
                )}
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
            </div>
          );
        })}

        {/* Navigation Arrows */}
        {slidesCount > 1 && (
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

        {/* Slide Indicators */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {slides.map((slide, index) => (
            <button
              key={slide.key}
              onClick={() => goToSlide(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                currentSlide === index
                  ? "w-6 bg-[#B7FF18]"
                  : "w-2 bg-white/40 hover:bg-white/60"
              }`}
              title={slide.title}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── Slide Components ─────────────────────────── */

function TrendingClipSlide({ clip, onNavigate }: { clip: TrendingClip; onNavigate: (path: string) => void }) {
  return (
    <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8 max-w-5xl w-full">
      <div className="relative w-full md:w-[420px] lg:w-[520px] flex-shrink-0 rounded-xl overflow-hidden border border-white/10 shadow-2xl group cursor-pointer"
        onClick={() => onNavigate(`/clip/${clip.id}`)}>
        <img
          src={clip.thumbnailUrl || "/attached_assets/gamefolio-logo-green.png"}
          alt={clip.title}
          className="w-full aspect-video object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-3 left-3 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#B7FF18]/20 flex items-center justify-center">
            <PlayCircle className="w-4 h-4 text-[#B7FF18]" />
          </div>
          <span className="text-white text-xs font-medium">Watch Now</span>
        </div>
      </div>
      <div className="flex-1 text-center md:text-left">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#B7FF18]/10 text-[#B7FF18] text-xs font-semibold mb-3">
          <Flame className="w-3.5 h-3.5" /> Trending Clip
        </div>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2 leading-tight">{clip.title}</h2>
        <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
          {clip.creator && (
            <div className="flex items-center gap-2">
              <Avatar className="w-7 h-7 ring-1 ring-[#B7FF18]/30">
                <AvatarImage src={clip.creator.avatarUrl || undefined} />
                <AvatarFallback className="bg-[#B7FF18]/10 text-[#B7FF18] text-xs">{clip.creator.displayName?.charAt(0) || clip.creator.username.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="text-white/90 text-sm font-medium">{clip.creator.displayName || clip.creator.username}</span>
            </div>
          )}
          {clip.game && clip.game.name && (
            <span className="text-[#B7FF18] text-sm font-medium">{clip.game.name}</span>
          )}
        </div>
        <div className="flex items-center justify-center md:justify-start gap-4 mb-5">
          <div className="flex items-center gap-1.5 text-white/60 text-sm">
            <Eye className="w-4 h-4" /> {formatNumber(clip.views)} views
          </div>
          <div className="flex items-center gap-1.5 text-white/60 text-sm">
            <Heart className="w-4 h-4" /> {formatNumber(clip.likes)} likes
          </div>
        </div>
        <Button
          className="bg-[#B7FF18] hover:bg-[#B7FF18]/90 text-[#071013] font-semibold px-6 py-2 h-auto rounded-lg"
          onClick={() => onNavigate(`/clip/${clip.id}`)}
        >
          Watch Clip <ArrowRight className="w-4 h-4 ml-1.5" />
        </Button>
      </div>
    </div>
  );
}

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
