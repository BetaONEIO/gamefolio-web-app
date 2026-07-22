import { useState, useMemo, useEffect, useCallback, useRef } from "react";

import { useQuery } from "@tanstack/react-query";
import VideoClipCard from "@/components/clips/VideoClipCard";

import { Button } from "@/components/ui/button";
import { ClipWithUser, Game } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { ChevronRight, Video, Plus, ChevronLeft } from "lucide-react";
import { useLocation, Link } from "wouter";
import { LatestReelsCarousel } from "@/components/clips/LatestReelsCarousel";
import { ScreenshotCard } from "@/components/screenshots/ScreenshotCard";
import { ScreenshotLightbox } from "@/components/screenshots/ScreenshotLightbox";
import { MobileScreenshotsViewer } from "@/components/screenshots/MobileScreenshotsViewer";
import { useMobile } from "@/hooks/use-mobile";
import { Camera } from "lucide-react";
import RecommendedForYou from "@/components/home/RecommendedForYou";
import ProUpgradeDialog from "@/components/ProUpgradeDialog";
import { LazySection } from "@/components/ui/lazy-section";
import { EcosystemActivityRail } from "@/components/home/EcosystemActivityRail";
import { DailyXPChallenges } from "@/components/home/DailyXPChallenges";
import { LiveStreamsSection } from "@/components/home/LiveStreamsSection";
import FeaturedUsersSection from "@/components/home/FeaturedUsersSection";
import { CreatorCard } from "@/components/home/CreatorCard";
import { CREATOR_CARD_STYLES, TrendingEntry } from "@/components/home/creator-card-utils";

import { Trophy } from "lucide-react";
import LatestContentSlider from "@/components/home/LatestContentSlider";
import TrendingHeroSlide from "@/components/home/TrendingSlider";

interface DbHeroSlide {
  id: number;
  title: string;
  subtitle: string | null;
  buttonText: string | null;
  buttonLink: string | null;
  imageUrl: string;
  displayOrder: number;
  isActive: boolean;
}

interface FeaturedGamefolioData {
  user: {
    id: number;
    username: string;
    displayName: string | null;
    bio: string | null;
    avatarUrl: string | null;
    bannerUrl: string | null;
    accentColor: string | null;
    primaryColor: string | null;
    backgroundColor: string | null;
    avatarBorderColor: string | null;
    level: number | null;
    userType: string | null;
    profileBackgroundGradient?: boolean | null;
    profileBackgroundImageUrl?: string | null;
    isVerified?: boolean | null;
  };
  gamesPlayed: { id: number; name: string }[];
  latestClip: {
    id: number;
    title: string;
    thumbnailUrl: string | null;
    videoUrl: string;
    views: number;
    createdAt: string | null;
    gameName: string | null;
    duration: number;
    videoType: string;
    likesCount: number;
  } | null;
  clipCount: number;
  clipsCount: number;
  reelsCount: number;
  screenshotsCount: number;
  followersCount: number;
  followingCount: number;
  totalPoints: number;
  weeklyUploadsCount: number;
  topGame: { id: number; name: string; imageUrl: string | null; uploadCount: number } | null;
}

type AnySlide = DbHeroSlide | { type: 'leaderboard'; id: 'leaderboard' } | { type: 'latestContent'; id: 'latestContent' } | { type: 'trending'; id: 'trending' };

interface LeaderboardWinner {
  userId: number;
  rank: number;
  uploadsCount: number;
  totalPoints: number;
  followersCount?: number;
  followingCount?: number;
  clipsCount?: number;
  reelsCount?: number;
  screenshotsCount?: number;
  user: {
    id: number;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    bannerUrl: string | null;
    accentColor: string | null;
    avatarBorderColor: string | null;
    level: number | null;
    emailVerified?: boolean | null;
    backgroundColor: string | null;
    primaryColor: string | null;
    profileBackgroundGradient: boolean | null;
    profileBackgroundGradientCss: string | null;
    profileBackgroundImageUrl: string | null;
  };
}

const LEADERBOARD_STYLES = `
@keyframes lb-sparkle {
  0%, 100% { transform: scale(1) translateY(0); opacity: 0.9; }
  50% { transform: scale(1.4) translateY(-5px); opacity: 0.4; }
}
@keyframes lb-orbit {
  from { transform: rotate(0deg) translateX(105px) rotate(0deg); }
  to   { transform: rotate(360deg) translateX(105px) rotate(-360deg); }
}
@keyframes lb-pulse-gold {
  0%, 100% { box-shadow: 0 0 24px 6px rgba(255,200,50,0.4); }
  50%       { box-shadow: 0 0 40px 12px rgba(255,200,50,0.65); }
}
@keyframes lb-glow-silver {
  0%, 100% { box-shadow: 0 0 18px 4px rgba(192,192,192,0.3); }
  50%       { box-shadow: 0 0 30px 8px rgba(192,192,192,0.5); }
}
@keyframes lb-glow-bronze {
  0%, 100% { box-shadow: 0 0 18px 4px rgba(205,127,50,0.3); }
  50%       { box-shadow: 0 0 30px 8px rgba(205,127,50,0.5); }
}
/* Medal-coloured fire-card borders */
.lb-card-1 .fire-card { border-color: rgba(255,215,0,0.75) !important; animation: lb-pulse-gold 2.4s ease-in-out infinite; }
.lb-card-2 .fire-card { border-color: rgba(192,192,192,0.65) !important; animation: lb-glow-silver 2.8s ease-in-out infinite; }
.lb-card-3 .fire-card { border-color: rgba(205,127,50,0.65) !important; animation: lb-glow-bronze 3.2s ease-in-out infinite; }
.lb-spark  { position:absolute; width:6px; height:6px; border-radius:50%; pointer-events:none; }
.lb-spark:nth-child(1) { animation: lb-orbit 4.5s linear infinite, lb-sparkle 1.2s ease-in-out infinite; background:#FFD700; top:50%; left:50%; margin:-3px; animation-delay:0s,0s; }
.lb-spark:nth-child(2) { animation: lb-orbit 4.5s linear infinite, lb-sparkle 1.2s ease-in-out infinite; background:#B7FF18; top:50%; left:50%; margin:-3px; animation-delay:-0.75s,-0.3s; }
.lb-spark:nth-child(3) { animation: lb-orbit 4.5s linear infinite, lb-sparkle 1.2s ease-in-out infinite; background:#fff; top:50%; left:50%; margin:-3px; animation-delay:-1.5s,-0.6s; }
.lb-spark:nth-child(4) { animation: lb-orbit 4.5s linear infinite, lb-sparkle 1.2s ease-in-out infinite; background:#FFD700; top:50%; left:50%; margin:-3px; animation-delay:-2.25s,-0.9s; }
.lb-spark:nth-child(5) { animation: lb-orbit 4.5s linear infinite, lb-sparkle 1.2s ease-in-out infinite; background:#B7FF18; top:50%; left:50%; margin:-3px; animation-delay:-3s,-1.1s; }
.lb-spark:nth-child(6) { animation: lb-orbit 6.5s linear infinite, lb-sparkle 1.8s ease-in-out infinite; background:#fff; top:50%; left:50%; margin:-3px; animation-delay:-3.75s,-1.4s; }
/* Mobile: horizontal scroll podium */
@media (max-width: 639px) {
  .lb-podium-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
  .lb-podium-scroll::-webkit-scrollbar { display: none; }
  .lb-divider { display: none !important; }
}
@media (min-width: 640px) {
  .lb-podium-scale { transform: scale(0.96); transform-origin: center center; }
}
`

interface TrendingContentCarouselProps {
  clips: ClipWithUser[] | undefined;
  isLoading: boolean;
  userId: number | undefined;
}

const TrendingContentCarousel = ({ clips, isLoading, userId }: TrendingContentCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [scrollStart, setScrollStart] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = useCallback((direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    
    const container = scrollRef.current;
    const itemWidth = window.innerWidth < 640 ? 280 : 480;
    const scrollAmount = itemWidth * (window.innerWidth < 640 ? 1 : 2);
    
    if (direction === 'left') {
      container.scrollLeft -= scrollAmount;
    } else {
      container.scrollLeft += scrollAmount;
    }
  }, []);

  // Handle mouse wheel horizontal scrolling
  const handleWheel = (e: React.WheelEvent) => {
    if (!scrollRef.current) return;
    
    // If already scrolling horizontally with trackpad, let it handle naturally
    if (Math.abs(e.deltaX) > 0) {
      return; // Don't interfere with trackpad horizontal scrolling
    }
    
    // Only convert vertical wheel to horizontal for mouse wheels (when deltaX is 0)
    if (Math.abs(e.deltaY) > 0 && e.deltaX === 0) {
      e.preventDefault();
      scrollRef.current.scrollLeft += e.deltaY;
    }
  };

  // Handle drag-to-scroll functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    
    setIsDragging(true);
    setDragStart(e.clientX);
    setScrollStart(scrollRef.current.scrollLeft);
    
    // Prevent text selection during drag
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    
    e.preventDefault();
    const dragDistance = e.clientX - dragStart;
    scrollRef.current.scrollLeft = scrollStart - dragDistance;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 px-2">
        {Array(6).fill(0).map((_, i) => (
          <div key={`trending-clips-skeleton-${i}`} className="aspect-video rounded-lg overflow-hidden">
            <Skeleton className="w-full h-full" />
          </div>
        ))}
      </div>
    );
  }

  if (!clips || clips.length === 0) {
    return null; // Return null if no clips to avoid showing empty carousel
  }

  return (
    <div className="relative">
      {/* Navigation Arrows - hidden on mobile, visible on larger screens */}
      <button
        onClick={() => scroll('left')}
        className="absolute -left-5 top-1/2 -translate-y-1/2 z-10 bg-black/70 hover:bg-black/90 text-white p-2.5 rounded-full transition-colors hidden sm:flex items-center justify-center shadow-lg"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      
      <button
        onClick={() => scroll('right')}
        className="absolute -right-5 top-1/2 -translate-y-1/2 z-10 bg-black/70 hover:bg-black/90 text-white p-2.5 rounded-full transition-colors hidden sm:flex items-center justify-center shadow-lg"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Carousel Container */}
      <div 
        ref={scrollRef}
        className={`flex gap-3 sm:gap-4 md:gap-6 overflow-x-auto scrollbar-hide pb-4 px-2 sm:px-4 md:px-8 py-2 select-none ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        style={{ scrollBehavior: isDragging ? 'auto' : 'smooth' }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        data-testid="clips-carousel-container"
      >
        {clips?.map((clip: ClipWithUser) => (
          <div 
            key={`trending-clip-${clip.id}`} 
            className="flex-shrink-0 w-[280px] sm:w-[320px] md:w-[400px] lg:w-[480px]"
          >
            <VideoClipCard
              clip={clip}
              userId={userId}
              clipsList={clips}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

// Popular games for filtering by name instead of using IDs
const POPULAR_GAMES = [
  { id: 'all', name: 'All Games' },
  { id: 'league-of-legends', name: 'League of Legends' },
  { id: 'fortnite', name: 'Fortnite' },
  { id: 'call-of-duty', name: 'Call of Duty' },
  { id: 'valorant', name: 'Valorant' },
  { id: 'csgo', name: 'CS:GO' },
  { id: 'minecraft', name: 'Minecraft' },
];

const HomePage = () => {
  const [feedPeriod, setFeedPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [selectedGameFilter, setSelectedGameFilter] = useState<string | null>(null);
  const [selectedScreenshot, setSelectedScreenshot] = useState<any>(null);
  const isMobile = useMobile();
  const [, setLocation] = useLocation();
  const screenshotsScrollRef = useRef<HTMLDivElement>(null);
  const [screenshotsDragging, setScreenshotsDragging] = useState(false);
  const [screenshotsDragStart, setScreenshotsDragStart] = useState(0);
  const [screenshotsScrollStart, setScreenshotsScrollStart] = useState(0);
  
  // Get current user from auth context
  const { user } = useAuth();
  const userId = user?.id;

  // Hero carousel state
  const [currentSlide, setCurrentSlide] = useState(0);

  // Query latest clips for the homepage section — newest uploaded first
  const { data: trendingClipsData, isLoading: isLoadingTrendingClips } = useQuery<ClipWithUser[]>({
    queryKey: ['/api/clips/latest'],
    queryFn: async () => {
      const response = await fetch('/api/clips/latest?limit=20', { credentials: 'include' });
      if (!response.ok) {
        throw new Error('Failed to fetch latest clips');
      }
      return response.json();
    }
  });

  // Ensure trendingClipsData is an array and filter out reels
  const trendingClips = Array.isArray(trendingClipsData) 
    ? trendingClipsData.filter(clip => clip.videoType !== 'reel')
    : [];

  // Query latest reels (9:16 aspect ratio) - newest uploaded reels
  const { data: latestReels, isLoading: isLoadingReels } = useQuery<ClipWithUser[]>({
    queryKey: ['/api/reels/latest'],
    queryFn: async () => {
      const response = await fetch('/api/reels/latest?limit=12');
      if (!response.ok) {
        throw new Error('Failed to fetch latest reels');
      }
      return response.json();
    }
  });

  const { data: latestScreenshots, isLoading: isLoadingScreenshots } = useQuery<any[]>({
    queryKey: ['/api/screenshots/latest'],
    queryFn: async () => {
      const response = await fetch('/api/screenshots/latest?limit=12', { credentials: 'include' });
      if (!response.ok) {
        throw new Error('Failed to fetch latest screenshots');
      }
      return response.json();
    }
  });

  // Query to check if user has uploaded any content (clips or screenshots)
  const { data: userHasContent, isLoading: isLoadingUserContent } = useQuery<boolean>({
    queryKey: ['/api/user/has-content', userId],
    queryFn: async () => {
      if (!userId) return false;
      const response = await fetch(`/api/user/${userId}/content-check`);
      if (!response.ok) {
        return false; // If endpoint doesn't exist or fails, assume no content
      }
      const data = await response.json();
      return data.hasContent || false;
    },
    enabled: !!userId, // Only run query if user is logged in
  });

  const { data: dbHeroSlides, isLoading: isLoadingDbSlides } = useQuery<DbHeroSlide[]>({
    queryKey: ["/api/hero-slides"],
    queryFn: async () => {
      const response = await fetch('/api/hero-slides');
      if (!response.ok) {
        throw new Error('Failed to fetch hero slides');
      }
      return response.json();
    },
    staleTime: 10000,
    refetchOnWindowFocus: true,
  });

  const { data: featuredGamefolio } = useQuery<FeaturedGamefolioData>({
    queryKey: ["/api/featured/gamefolio"],
    queryFn: async () => {
      const r = await fetch("/api/featured/gamefolio");
      if (!r.ok) throw new Error("Failed to fetch");
      return r.json();
    },
    staleTime: 60_000,
  });

  const { data: weeklyTop10 } = useQuery<LeaderboardWinner[]>({
    queryKey: ["/api/leaderboard/current-season/top"],
    queryFn: async () => {
      const r = await fetch("/api/leaderboard/current-season/top?limit=10");
      if (!r.ok) throw new Error("Failed to fetch");
      const data = await r.json();
      // Don't accept empty arrays — retry on next render instead of caching blank state
      if (!Array.isArray(data) || data.length === 0) throw new Error("No leaderboard data yet");
      return data;
    },
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
  });
  const weeklyTop3 = weeklyTop10?.slice(0, 3);

  // Countdown to next Monday midnight (weekly leaderboard reset)
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  const resetCountdown = useMemo(() => {
    const d = new Date(nowMs);
    const daysUntilMonday = (8 - d.getDay()) % 7 || 7;
    const next = new Date(d);
    next.setDate(d.getDate() + daysUntilMonday);
    next.setHours(0, 0, 0, 0);
    const diff = next.getTime() - nowMs;
    return { days: Math.floor(diff / 86400000), hours: Math.floor((diff % 86400000) / 3600000) };
  }, [nowMs]);

  const activeSlides = useMemo<AnySlide[] | null>(() => {
    const base: AnySlide[] = dbHeroSlides && dbHeroSlides.length > 0
      ? dbHeroSlides.filter((s) => {
          const t = (s.title || "").toLowerCase();
          return !t.includes("build your gamefolio") && !t.includes("featured creator");
        })
      : [];
    const leaderboardSlide: AnySlide = { type: 'leaderboard', id: 'leaderboard' };
    const latestContentSlide: AnySlide = { type: 'latestContent', id: 'latestContent' };
    const trendingSlide: AnySlide = { type: 'trending', id: 'trending' };
    return [latestContentSlide, trendingSlide, ...base, leaderboardSlide];
  }, [dbHeroSlides]);

  const prevSlide = useCallback(() => {
    if (!activeSlides) return;
    setCurrentSlide((prev) => (prev - 1 + activeSlides.length) % activeSlides.length);
  }, [activeSlides]);

  const nextSlide = useCallback(() => {
    if (!activeSlides) return;
    setCurrentSlide((prev) => (prev + 1) % activeSlides.length);
  }, [activeSlides]);

  const goToSlide = useCallback((idx: number) => {
    setCurrentSlide(idx);
  }, []);

  // Query to get custom hero text
  const { data: experiencedHeroText, isLoading: isLoadingExperiencedText } = useQuery<{ 
    title: string; 
    subtitle: string; 
    buttonText?: string; 
    buttonUrl?: string; 
    targetAudience?: string; 
  }>({
    queryKey: ['/api/hero-text/experienced'],
    queryFn: async () => {
      const response = await fetch('/api/hero-text/experienced');
      if (!response.ok) {
        throw new Error('Failed to fetch hero text');
      }
      return response.json();
    },
    enabled: !!userId || !user, // Always fetch to check target audience
  });

  // Determine which hero text to display based on user authentication status
  const guestHeroText = {
    title: "Discover Amazing\nGaming Moments",
    subtitle: "Join the gaming community to upload, discover, and share epic gaming clips. Connect with fellow gamers worldwide."
  };

  const defaultHeroText = {
    title: "Share Your Gaming\nMoments",
    subtitle: "Upload, discover, and share epic gaming clips with the community. Build your gaming portfolio and connect with fellow gamers."
  };

  // Handle hero text logic based on target audience
  const isStillLoading = isLoadingUserContent || isLoadingExperiencedText;
  
  const heroText = isStillLoading 
    ? null // Show loading state while determining user status or fetching text
    : experiencedHeroText && experiencedHeroText.targetAudience
    ? (() => {
        const target = experiencedHeroText.targetAudience;
        // Check if custom text matches current user state
        if (target === 'all_users') return experiencedHeroText;
        if (target === 'new_users' && user && !userHasContent) return experiencedHeroText;
        if (target === 'existing_users' && user) return experiencedHeroText;
        if (target === 'experienced_users' && user && userHasContent) return experiencedHeroText;
        // If custom text doesn't match, use default
        return !user ? guestHeroText : defaultHeroText;
      })()
    : !user
    ? guestHeroText 
    : defaultHeroText;


  return (
    <div className="pb-16 md:pb-8 hide-scrollbar">
      
      {/* Hero Banner Carousel */}
      <section className="mb-0 -mx-0">
        <div className="relative overflow-hidden">
          <div className="w-full bg-black relative min-h-[420px] sm:min-h-[560px] md:min-h-[640px] border-b-2 border-primary">
            {activeSlides && (
              <div className="relative w-full h-full min-h-[420px] sm:min-h-[560px] md:min-h-[640px]">
                {activeSlides.map((slide, idx) => {
                  const isLeaderboardSlide = 'type' in slide && slide.type === 'leaderboard';
                  const isLatestContentSlide = 'type' in slide && slide.type === 'latestContent';
                  const isTrendingSlide = 'type' in slide && slide.type === 'trending';

                  return (
                  <div
                    key={slide.id}
                    className="absolute inset-0 transition-opacity duration-700 ease-in-out"
                    style={{ opacity: idx === currentSlide ? 1 : 0, zIndex: idx === currentSlide ? 1 : 0 }}
                  >
                    {isLeaderboardSlide ? (
                      /* ── Leaderboard slide: podium left + top-10 list right ── */
                      <div className="absolute inset-0 overflow-hidden">
                        {/* Electrical background */}
                        <div className="absolute inset-0" style={{ backgroundImage:"url('/electrical-bg.webp')", backgroundSize:"cover", backgroundPosition:"center" }} />
                        {/* Dark overlay for readability */}
                        <div className="absolute inset-0" style={{ background:"linear-gradient(160deg,rgba(5,9,13,0.82) 0%,rgba(8,14,24,0.72) 55%,rgba(5,9,13,0.82) 100%)" }} />
                        <style>{LEADERBOARD_STYLES}{CREATOR_CARD_STYLES}</style>

                        <div className="relative h-full flex flex-col">

                          {/* ── HEADER — centred above both columns ── */}
                          <div className="flex-shrink-0 pt-2 pb-1 sm:pt-4 sm:pb-2 px-3 sm:px-4 flex items-center justify-between">
                            <h2 className="text-lg sm:text-2xl font-bold">Leaderboard</h2>
                            <div className="flex items-center gap-1.5 sm:gap-3">
                              <span className="text-[9px] sm:text-[10px] text-white/40">🏆 <span className="hidden sm:inline">Season: </span><span className="font-bold text-white/70">Summer Showdown</span></span>
                              <button
                                onClick={() => setLocation('/leaderboard')}
                                className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-black px-2 sm:px-3 py-1 rounded-lg transition-all hover:opacity-90 active:scale-95"
                                style={{ background:'#B7FF18', color:'#0B1319' }}>
                                View All →
                              </button>
                            </div>
                          </div>

                          {/* ── COLUMNS row ── */}
                          <div className="flex flex-col sm:flex-row flex-1 min-h-0">

                          {/* ── LEFT: podium ── */}
                          <div className="flex flex-col items-center py-2 px-3 sm:px-5 w-full sm:w-[63%]" style={{ flexShrink: 0 }}>
                            {/* Podium — 2nd · 1st · 3rd, vertically centred in column */}
                            <div className="lb-podium-scroll relative w-full flex items-center justify-start sm:justify-center" style={{ flex:'1 1 0', minHeight:0 }}>
                              <div className="lb-podium-scale flex items-end flex-shrink-0"
                                style={{ gap: '16px' }}>
                                {(() => {
                                  const top3 = weeklyTop3 ?? [];

                                  const PODIUM_IMG: Record<1|2|3, string> = {
                                    1: '/podium-1st.webp',
                                    2: '/podium-2nd.webp',
                                    3: '/podium-3rd.webp',
                                  };
                                  const PODIUM_W: Record<1|2|3, number> = { 1: 393, 2: 357, 3: 321 };
                                  const PODIUM_H: Record<1|2|3, number> = { 1: 123, 2: 105, 3: 90  };
                                  const PODIUM_GLOW: Record<1|2|3, string> = {
                                    1: 'drop-shadow(0 0 20px rgba(255,215,0,0.9)) drop-shadow(0 6px 14px rgba(255,190,0,0.55))',
                                    2: 'drop-shadow(0 0 16px rgba(210,210,210,0.85)) drop-shadow(0 5px 10px rgba(192,192,192,0.5))',
                                    3: 'drop-shadow(0 0 14px rgba(205,127,50,0.85)) drop-shadow(0 5px 10px rgba(180,100,30,0.5))',
                                  };

                                  const renderCard = (winner: LeaderboardWinner | undefined, rank: 1 | 2 | 3) => {
                                    const isFirst = rank === 1;
                                    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉';
                                    const accentClr = rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : '#CD7F32';
                                    const cardClass = `lb-card-${rank}`;
                                    const elevate = isFirst ? -28 : 0;
                                    const podW = PODIUM_W[rank];
                                    const podH = PODIUM_H[rank];

                                    if (!winner) {
                                      return (
                                        <div key={rank} style={{ display:'flex', flexDirection:'column', alignItems:'center', transform:`translateY(${elevate}px)` }}>
                                          <div className={cardClass}>
                                            <div className="fire-card flex flex-col items-center justify-center"
                                              style={{ width:228, height:408, borderRadius:16 }}>
                                              <div className="absolute inset-0 rounded-[inherit] flex flex-col items-center justify-center gap-2"
                                                style={{ background:'rgba(11,19,25,0.95)' }}>
                                                <div className="text-4xl">{medal}</div>
                                                <div className="text-white/30 text-xs font-bold">Could be you!</div>
                                                <div className="text-white/20 text-[10px] text-center px-4">Earn points this season to compete</div>
                                              </div>
                                            </div>
                                          </div>
                                          <img src={PODIUM_IMG[rank]} alt={`#${rank} podium`}
                                            style={{ width: podW, height: podH, objectFit:'contain', marginTop: -22, filter:`brightness(0.7) ${PODIUM_GLOW[rank]}`, position:'relative', zIndex:10 }} />
                                        </div>
                                      );
                                    }

                                    const entry: TrendingEntry = {
                                      userId: winner.userId, rank: winner.rank,
                                      uploadsCount: winner.uploadsCount, totalPoints: winner.totalPoints,
                                      clipsCount: winner.clipsCount ?? winner.uploadsCount, reelsCount: winner.reelsCount ?? 0, screenshotsCount: winner.screenshotsCount ?? 0,
                                      followersCount: winner.followersCount ?? 0, followingCount: winner.followingCount ?? 0,
                                      user: {
                                        id: winner.user.id, username: winner.user.username,
                                        displayName: winner.user.displayName, avatarUrl: winner.user.avatarUrl,
                                        bannerUrl: winner.user.bannerUrl,
                                        avatarBorderColor: accentClr,
                                        accentColor: winner.user.accentColor,
                                        level: winner.user.level,
                                        backgroundColor: winner.user.backgroundColor,
                                        primaryColor: winner.user.primaryColor,
                                        profileBackgroundGradient: winner.user.profileBackgroundGradient ?? false,
                                        profileBackgroundGradientCss: winner.user.profileBackgroundGradientCss,
                                        profileBackgroundImageUrl: winner.user.profileBackgroundImageUrl,
                                      },
                                    };

                                    return (
                                      <div key={rank} style={{ display:'flex', flexDirection:'column', alignItems:'center', transform:`translateY(${elevate}px)` }}>
                                        <div className={`relative ${cardClass}`}>
                                          {isFirst && (
                                            <div className="absolute pointer-events-none" style={{ inset:'-10px', zIndex:10 }}>
                                              {[1,2,3,4,5,6].map(i => <span key={i} className="lb-spark" />)}
                                            </div>
                                          )}
                                          <CreatorCard entry={entry} period="week" />
                                        </div>
                                        <img src={PODIUM_IMG[rank]} alt={`#${rank} podium`}
                                          style={{ width: podW, height: podH, objectFit:'contain', marginTop: -22, filter: PODIUM_GLOW[rank], position:'relative', zIndex:10 }} />
                                      </div>
                                    );
                                  };

                                  return (
                                    <>
                                      {renderCard(top3[1], 2)}
                                      {renderCard(top3[0], 1)}
                                      {renderCard(top3[2], 3)}
                                    </>
                                  );
                                })()}
                              </div>
                            </div>

                          </div>

                          {/* ── Divider ── */}
                          <div className="lb-divider self-stretch w-px my-6 flex-shrink-0" style={{ background:'rgba(183,255,26,0.08)' }} />

                          {/* ── RIGHT: Top 10 list ── */}
                          <div className="flex-1 flex flex-col py-4 px-4 sm:px-5 overflow-hidden rounded-xl mx-2 my-2" style={{ background:'rgb(11,19,25)', border:'1px solid rgba(183,255,26,0.10)' }}>
                            <div className="text-[9px] font-black uppercase tracking-[0.2em] mb-3" style={{ color:'#B7FF18' }}>
                              Top 10 This Season
                            </div>
                            <div className="flex flex-col gap-0 overflow-y-auto flex-1">
                              {(weeklyTop10 && weeklyTop10.length > 0 ? weeklyTop10 : Array.from({length:10}).map((_,i) => null)).map((winner, idx) => {
                                const rank = idx + 1;
                                const medalEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;
                                const accentClr = rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : rank === 3 ? '#CD7F32' : null;
                                const isTop3 = rank <= 3;
                                return (
                                  <div key={winner?.userId ?? idx}
                                    className="flex items-center gap-2.5 py-[6px] cursor-pointer rounded-lg px-2 transition-colors hover:bg-white/5"
                                    style={{ borderBottom:'1px solid rgba(255,255,255,0.05)', marginBottom:'1px' }}
                                    onClick={() => winner && setLocation(`/profile/${winner.user.username}`)}>
                                    {/* Rank */}
                                    <div className="flex-shrink-0 w-6 text-center">
                                      {medalEmoji ? (
                                        <span className="text-sm leading-none">{medalEmoji}</span>
                                      ) : (
                                        <span className="text-[11px] font-black" style={{ color:'rgba(255,255,255,0.25)' }}>#{rank}</span>
                                      )}
                                    </div>
                                    {/* Avatar */}
                                    {winner ? (
                                      <div className="flex-shrink-0 w-7 h-7 rounded-full overflow-hidden"
                                        style={{ border: isTop3 ? `1.5px solid ${accentClr}60` : '1.5px solid rgba(255,255,255,0.1)' }}>
                                        {winner.user.avatarUrl ? (
                                          <img src={winner.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center text-[10px] font-bold"
                                            style={{ background:'rgba(183,255,26,0.1)', color:'#B7FF18' }}>
                                            {(winner.user.displayName || winner.user.username || '?')[0].toUpperCase()}
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="flex-shrink-0 w-7 h-7 rounded-full" style={{ background:'rgba(255,255,255,0.05)' }} />
                                    )}
                                    {/* Name */}
                                    <div className="flex-1 min-w-0">
                                      {winner ? (
                                        <>
                                          <div className="text-[11px] font-semibold text-white/90 truncate leading-tight">
                                            {winner.user.displayName || winner.user.username}
                                          </div>
                                          <div className="text-[9px] text-white/35 truncate">@{winner.user.username}</div>
                                        </>
                                      ) : (
                                        <div className="h-3 w-20 rounded" style={{ background:'rgba(255,255,255,0.06)' }} />
                                      )}
                                    </div>
                                    {/* Points */}
                                    {winner ? (
                                      <div className="flex-shrink-0 flex items-center gap-1">
                                        <span className="text-[10px] font-black" style={{ color: isTop3 ? accentClr! : 'rgba(183,255,26,0.7)' }}>
                                          ⚡ {winner.totalPoints >= 1000 ? `${(winner.totalPoints/1000).toFixed(1)}K` : winner.totalPoints}
                                        </span>
                                      </div>
                                    ) : (
                                      <div className="h-3 w-10 rounded" style={{ background:'rgba(255,255,255,0.06)' }} />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                            <button
                              onClick={() => setLocation('/leaderboard')}
                              className="mt-3 w-full py-2 rounded-lg text-[11px] font-black tracking-wide transition-all hover:opacity-90 active:scale-95 flex-shrink-0"
                              style={{ background:'#B7FF18', color:'#0B1319' }}>
                              View Leaderboard →
                            </button>
                          </div>

                          </div>{/* end columns row */}
                        </div>{/* end flex-col outer */}
                      </div>
                    ) : isLatestContentSlide ? (
                      /* ── Latest Clips & Reels slider slide ── */
                      <div className="absolute inset-0 overflow-hidden bg-black flex flex-col">
                        <div className="flex-1 min-h-0 overflow-hidden px-2 sm:px-8 py-3 sm:py-4">
                          <LatestContentSlider />
                        </div>
                      </div>
                    ) : isTrendingSlide ? (
                      /* ── Trending clips/reels slide ── */
                      <div className="absolute inset-0 overflow-hidden bg-black">
                        <TrendingHeroSlide />
                      </div>
                    ) : (
                      /* ── Regular image slide ── */
                      <>
                        <img src={(slide as DbHeroSlide).imageUrl} alt={(slide as DbHeroSlide).title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent">
                          <div className="flex flex-col items-start justify-center h-full max-w-3xl p-6 sm:p-8 md:p-12">
                            <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold text-white mb-3 md:mb-4 leading-tight drop-shadow-md">
                              {(slide as DbHeroSlide).title}
                            </h1>
                            {(slide as DbHeroSlide).subtitle && (
                              <h2 className="text-lg sm:text-2xl md:text-3xl font-semibold text-primary mb-4 md:mb-6 leading-tight drop-shadow-lg">
                                {(slide as DbHeroSlide).subtitle}
                              </h2>
                            )}
                            {(slide as DbHeroSlide).buttonText && (
                              <Button
                                className="w-fit px-6 py-5 h-auto text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground mt-4"
                                onClick={() => {
                                  const link = ((slide as DbHeroSlide).buttonLink || "").toLowerCase();
                                  if (link === '#pro' || link === '/pro' || link.includes('pro')) {
                                    window.dispatchEvent(new CustomEvent('open-pro-upgrade'));
                                  } else {
                                    setLocation((slide as DbHeroSlide).buttonLink!);
                                  }
                                }}
                              >
                                {(slide as DbHeroSlide).buttonText}
                              </Button>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  );
                })}
                {activeSlides.length > 1 && (
                  <>
                    <button
                      onClick={prevSlide}
                      className="absolute left-3 top-1/2 -translate-y-1/2 z-10 bg-black/60 hover:bg-black/85 backdrop-blur-sm text-white rounded-full p-2.5 transition-colors shadow-lg"
                      aria-label="Previous slide"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                    <button
                      onClick={nextSlide}
                      className="absolute right-3 top-1/2 -translate-y-1/2 z-10 bg-black/60 hover:bg-black/85 backdrop-blur-sm text-white rounded-full p-2.5 transition-colors shadow-lg"
                      aria-label="Next slide"
                    >
                      <ChevronRight className="h-6 w-6" />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Ecosystem Activity Rail */}
      <EcosystemActivityRail />

      
      <div className="space-y-4 sm:space-y-6 md:space-y-8 mt-4 sm:mt-6 md:mt-8">
      {/* Recommended for You Section - only for logged-in users */}
      {user && (
        <LazySection minHeight="300px" rootMargin="300px">
          <RecommendedForYou userId={userId} />
        </LazySection>
      )}

      {/* Daily XP Challenges Carousel */}
      <LazySection minHeight="260px" rootMargin="300px">
        <DailyXPChallenges />
      </LazySection>

      {/* Latest Clips Section */}
      <LazySection minHeight="400px" rootMargin="200px">
        <section className="px-4 sm:px-6 md:px-8">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl sm:text-2xl font-bold">Latest Clips</h2>
            <Link href="/latest-clips" className="text-primary text-sm font-medium hover:underline flex items-center">
              View all <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
          <div className="border-b border-border/50 mb-4 sm:mb-6 md:mb-8" />

          <TrendingContentCarousel 
            clips={trendingClips} 
            isLoading={isLoadingTrendingClips}
            userId={userId}
          />
          
          {(!trendingClips || trendingClips.length === 0) && !isLoadingTrendingClips && (
            <div className="text-center py-8 sm:py-12 bg-card/50 rounded-xl border border-border/50 mx-2">
              <Video className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-semibold mb-2">No clips yet</h3>
              <p className="text-sm sm:text-base text-muted-foreground mb-4 px-4">Upload your first gaming clip to get started!</p>
              <Button 
                className="w-auto px-6"
                onClick={() => setLocation('/upload')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Upload Clip
              </Button>
            </div>
          )}
        </section>
      </LazySection>

      {/* Latest Reels Section (9:16 aspect ratio) */}
      <LazySection minHeight="500px" rootMargin="200px">
        <section className="px-4 sm:px-6 md:px-8 pt-6 sm:pt-8">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl sm:text-2xl font-bold">Latest Reels</h2>
            <Link href="/latest-reels" className="text-primary text-sm font-medium hover:underline flex items-center">
              View all <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
          <div className="border-b border-border/50 mb-4 sm:mb-6 md:mb-8" />

          <LatestReelsCarousel 
            reels={latestReels}
            isLoading={isLoadingReels}
            userId={userId}
          />
        </section>
      </LazySection>

      {/* Trending Gamefolios - between Latest Reels and Latest Screenshots */}
      <LazySection minHeight="260px" rootMargin="200px">
        <section className="px-4 sm:px-6 md:px-8 pt-6 sm:pt-8">
          <FeaturedUsersSection />
        </section>
      </LazySection>

      {/* Latest Screenshots Section */}
      <LazySection minHeight="400px" rootMargin="200px">
        <section className="px-4 sm:px-6 md:px-8 pt-8 sm:pt-10 mt-2 pb-24 sm:pb-10">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl sm:text-2xl font-bold">Latest Screenshots</h2>
            <Link href="/latest-screenshots" className="text-primary text-sm font-medium hover:underline flex items-center">
              View all <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
          <div className="border-b border-border/50 mb-4 sm:mb-6 md:mb-8" />

          {isLoadingScreenshots ? (
            <div className="flex gap-4 overflow-hidden pb-4 px-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex-shrink-0 w-[280px] sm:w-[320px] md:w-[360px]">
                  <Skeleton className="aspect-video rounded-xl" />
                </div>
              ))}
            </div>
          ) : latestScreenshots && latestScreenshots.length > 0 ? (
            <div className="relative">
              <button
                onClick={() => { if (screenshotsScrollRef.current) { screenshotsScrollRef.current.scrollLeft -= 480; } }}
                className="absolute -left-5 top-1/2 -translate-y-1/2 z-10 bg-black/70 hover:bg-black/90 text-white p-2.5 rounded-full transition-colors hidden sm:flex items-center justify-center shadow-lg"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => { if (screenshotsScrollRef.current) { screenshotsScrollRef.current.scrollLeft += 480; } }}
                className="absolute -right-5 top-1/2 -translate-y-1/2 z-10 bg-black/70 hover:bg-black/90 text-white p-2.5 rounded-full transition-colors hidden sm:flex items-center justify-center shadow-lg"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <div
                ref={screenshotsScrollRef}
                className={`flex gap-4 overflow-x-auto scrollbar-hide pb-4 px-2 sm:px-8 py-2 select-none ${screenshotsDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                style={{ scrollBehavior: screenshotsDragging ? 'auto' : 'smooth' }}
                onMouseDown={(e) => {
                  if (!screenshotsScrollRef.current) return;
                  setScreenshotsDragging(true);
                  setScreenshotsDragStart(e.clientX);
                  setScreenshotsScrollStart(screenshotsScrollRef.current.scrollLeft);
                  e.preventDefault();
                }}
                onMouseMove={(e) => {
                  if (!screenshotsDragging || !screenshotsScrollRef.current) return;
                  e.preventDefault();
                  const dragDistance = e.clientX - screenshotsDragStart;
                  screenshotsScrollRef.current.scrollLeft = screenshotsScrollStart - dragDistance;
                }}
                onMouseUp={() => setScreenshotsDragging(false)}
                onMouseLeave={() => setScreenshotsDragging(false)}
              >
                {latestScreenshots.map((screenshot: any) => (
                  <div key={screenshot.id} className="flex-shrink-0 w-[320px] sm:w-[380px] md:w-[420px] lg:w-[460px]">
                    <ScreenshotCard
                      screenshot={screenshot}
                      isOwnProfile={user?.id === screenshot.userId}
                      profile={screenshot.user}
                      showUserInfo={true}
                      onSelect={(s: any) => setSelectedScreenshot(s)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 sm:py-12 pb-16 sm:pb-20 bg-card/50 rounded-xl border border-border/50 mx-2">
              <Camera className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">No Screenshots Yet</h3>
              <p className="text-muted-foreground text-sm px-4">
                Be the first to share a screenshot!
              </p>
            </div>
          )}
        </section>
      </LazySection>


      {/* Live Streams Now */}
      {/* <LazySection minHeight="280px" rootMargin="200px">
        <div className="px-4 sm:px-6 md:px-8">
          <LiveStreamsSection />
        </div>
      </LazySection> */}

      {/* Trending Gamefolios */}
      {/* <LazySection minHeight="260px" rootMargin="200px">
        <section className="px-4 sm:px-6 md:px-8 pb-10">
          <div className="flex justify-between items-center mb-5">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5" style={{ color: '#B7FF1A' }} />
              <h2 className="text-xl font-semibold text-foreground">Trending Gamefolios</h2>
            </div>
            <Link href="/explore" className="text-primary text-sm font-medium hover:underline flex items-center">
              View all <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
          <FeaturedUsersSection />
        </section>
      </LazySection> */}

      </div>

      {selectedScreenshot && isMobile ? (
        <MobileScreenshotsViewer
          screenshots={latestScreenshots || []}
          startId={selectedScreenshot.id}
          onBack={() => setSelectedScreenshot(null)}
        />
      ) : (
        <ScreenshotLightbox
          screenshot={selectedScreenshot}
          onClose={() => setSelectedScreenshot(null)}
          currentUserId={user?.id}
          screenshots={latestScreenshots || []}
          onNavigate={(s: any) => setSelectedScreenshot(s)}
        />
      )}
    </div>
  );
};

export default HomePage;