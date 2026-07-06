import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useMobile } from "@/hooks/use-mobile";
import {
  ChevronLeft, ChevronRight, Eye, Heart, Video, Trophy,
  Zap, Radio, Star, Rocket, Compass, Gamepad2, Users,
  ArrowRight, Clapperboard, Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";

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
  game?: { name: string; imageUrl: string | null };
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
      {/* Background image */}
      {bgImage && (
        <img
          src={bgImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
        />
      )}
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0B1319]/95 via-[#0B1319]/70 to-[#0B1319]/40" />
      {/* Neon glow accents */}
      <div className="absolute top-0 right-0 w-80 h-80 rounded-full blur-[100px] pointer-events-none" style={{ background: "rgba(183,255,24,0.06)" }} />
      <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full blur-[80px] pointer-events-none" style={{ background: "rgba(120,40,200,0.05)" }} />

      {/* Content */}
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
      <span className="text-[10px] font-black uppercase tracking-[2.5px]" style={{ color: NEON }}>
        {text}
      </span>
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
   Slide 1: Trending Clip
   ────────────────────────────────────────────────────────────── */
function TrendingClipSlide({ clip, onClick }: { clip: ClipWithUser; onClick: () => void }) {
  return (
    <SlideWrapper bgImage={clip.thumbnailUrl}>
      <SlideTag icon={Flame} text="Trending Clip" />
      <h1 className="text-2xl md:text-4xl lg:text-5xl font-black text-white mb-2 leading-tight drop-shadow-lg">
        {clip.title || "Trending Right Now"}
      </h1>
      <div className="flex items-center gap-2 mb-4">
        <img src={clip.user.avatarUrl || "/attached_assets/gamefolio-logo-green.png"} alt="" className="w-7 h-7 rounded-full object-cover border border-white/20" />
        <span className="text-sm font-semibold text-white">{clip.user.displayName || clip.user.username}</span>
        {clip.game?.name && (
          <span className="text-xs text-white/50 px-2 py-0.5 rounded-full bg-white/10">{clip.game.name}</span>
        )}
      </div>
      <div className="flex items-center gap-4 mb-6">
        <MetricBadge icon={Eye} value={formatNumber(clip.views || 0)} label="views" />
        <MetricBadge icon={Heart} value={formatNumber(clip.likes || 0)} label="likes" />
      </div>
      <CtaButton onClick={onClick}>Watch Clip</CtaButton>
    </SlideWrapper>
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
    queryKey: ["/api/featured-users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/featured-users");
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 60000,
  });

  /* ── Build slides list ── */
  const slides = useMemo(() => {
    const list: { type: string; component: React.ReactNode; id: number }[] = [];
    let idCounter = 0;

    const add = (type: string, component: React.ReactNode) => {
      list.push({ type, component, id: idCounter++ });
    };

    if (clips && clips.length > 0) {
      add("trending-clip", (
        <TrendingClipSlide
          key="tc"
          clip={clips[0]}
          onClick={() => setLocation(`/clips/${clips[0].id}`)}
        />
      ));
    }

    if (leaderboard && leaderboard.length > 0) {
      add("top-gamefolios", (
        <TopGamefoliosSlide
          key="tg"
          entries={leaderboard}
          onClick={() => setLocation("/leaderboard")}
        />
      ));
    }

    if (trendingGames && trendingGames.length > 0) {
      add("trending-game", (
        <TrendingGameSlide
          key="tgame"
          game={trendingGames[0]}
          onClick={() => setLocation(`/games/${trendingGames[0].name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`)}
        />
      ));
    }

    add("live-now", (
      <LiveNowSlide key="ln" onClick={() => setLocation("/explore")} />
    ));

    if (featuredUsers && featuredUsers.length > 0) {
      const creator = featuredUsers[0];
      add("creator-spotlight", (
        <CreatorSpotlightSlide
          key="cs"
          creator={creator}
          onClick={() => setLocation(`/${creator.username}`)}
        />
      ));
    }

    add("community-milestone", (
      <CommunityMilestoneSlide
        key="cm"
        stats={{ clips: 500_000, creators: 10_000, streams: 1_000, profiles: 25_000 }}
        onClick={() => setLocation("/explore")}
      />
    ));

    if (clips && clips.length > 1) {
      add("discover", (
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
            {slides[currentSlide].component}
          </motion.div>
        </AnimatePresence>

        {/* Navigation arrows */}
        {slides.length > 1 && (
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

        {/* Dot indicators */}
        {slides.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => goTo(idx)}
                className={`rounded-full transition-all ${idx === currentSlide ? "bg-primary w-6" : "bg-white/50 hover:bg-white/80 w-2.5"}`}
                style={{ height: 10, background: idx === currentSlide ? NEON : undefined }}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}

        {/* Slide counter */}
        <div className="absolute top-4 right-4 z-20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider" style={{ background: "rgba(0,0,0,0.5)", color: NEON }}>
          {currentSlide + 1} / {slides.length}
        </div>
      </div>
    </section>
  );
}
