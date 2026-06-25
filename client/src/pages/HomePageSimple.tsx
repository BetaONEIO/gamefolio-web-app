import { useState, useMemo, useRef, useEffect, useCallback } from "react";

import { useQuery } from "@tanstack/react-query";
import VideoClipCard from "@/components/clips/VideoClipCard";

import { Button } from "@/components/ui/button";
import { ClipWithUser, Game } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { ChevronRight, Video, Plus, ChevronLeft } from "lucide-react";
import { useLocation, Link } from "wouter";
import { EmailVerificationBanner } from "@/components/auth/EmailVerificationBanner";
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
import { CreatorCard, CREATOR_CARD_STYLES, TrendingEntry } from "@/components/home/CreatorCard";

import { Trophy } from "lucide-react";
import ForzaGif from "@assets/video-720-ezgif.com-optimize_1756741905949.gif";

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

type AnySlide = DbHeroSlide | { type: 'featured'; id: 'featured' } | { type: 'leaderboard'; id: 'leaderboard' };

interface LeaderboardWinner {
  userId: number;
  rank: number;
  uploadsCount: number;
  totalPoints: number;
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
`;

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
  const slideTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const { data: heroSlideSettings } = useQuery<{ intervalSeconds: number }>({
    queryKey: ["/api/hero-slides/settings"],
    queryFn: async () => {
      const response = await fetch('/api/hero-slides/settings');
      if (!response.ok) {
        throw new Error('Failed to fetch hero slide settings');
      }
      return response.json();
    },
    staleTime: 30000,
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

  const { data: weeklyTop3 } = useQuery<LeaderboardWinner[]>({
    queryKey: ["/api/leaderboard/weekly/current", 3],
    queryFn: async () => {
      const r = await fetch("/api/leaderboard/weekly/current?limit=3");
      if (!r.ok) throw new Error("Failed to fetch");
      return r.json();
    },
    staleTime: 120_000,
  });

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

  const slideIntervalMs = (heroSlideSettings?.intervalSeconds || 6) * 1000;

  const activeSlides = useMemo<AnySlide[] | null>(() => {
    const base: AnySlide[] = dbHeroSlides && dbHeroSlides.length > 0 ? [...dbHeroSlides] : [];
    const leaderboardSlide: AnySlide = { type: 'leaderboard', id: 'leaderboard' };
    const featuredSlide: AnySlide = { type: 'featured', id: 'featured' };
    return [...base, leaderboardSlide, featuredSlide];
  }, [dbHeroSlides]);

  const resetSlideTimer = useCallback(() => {
    if (slideTimerRef.current) clearInterval(slideTimerRef.current);
    if (activeSlides && activeSlides.length > 1) {
      slideTimerRef.current = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % activeSlides.length);
      }, slideIntervalMs);
    }
  }, [activeSlides, slideIntervalMs]);

  useEffect(() => {
    resetSlideTimer();
    return () => { if (slideTimerRef.current) clearInterval(slideTimerRef.current); };
  }, [resetSlideTimer]);

  const prevSlide = useCallback(() => {
    if (!activeSlides) return;
    setCurrentSlide((prev) => (prev - 1 + activeSlides.length) % activeSlides.length);
    resetSlideTimer();
  }, [activeSlides, resetSlideTimer]);

  const nextSlide = useCallback(() => {
    if (!activeSlides) return;
    setCurrentSlide((prev) => (prev + 1) % activeSlides.length);
    resetSlideTimer();
  }, [activeSlides, resetSlideTimer]);

  const goToSlide = useCallback((idx: number) => {
    setCurrentSlide(idx);
    resetSlideTimer();
  }, [resetSlideTimer]);

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
      {/* Email Verification Banner - Only for authenticated users */}
      {user && (
        <div className="mx-2 sm:mx-4 md:mx-6 mb-0">
          <EmailVerificationBanner />
        </div>
      )}
      
      {/* Hero Banner Carousel */}
      <section className="mb-0 -mx-0">
        <div className="relative overflow-hidden">
          <div className="w-full bg-black relative min-h-[300px] sm:min-h-[380px] md:min-h-[450px] border-b-2 border-primary">
            {activeSlides && activeSlides.length > 0 ? (
              <div className="relative w-full h-full min-h-[300px] sm:min-h-[380px] md:min-h-[450px]">
                {activeSlides.map((slide, idx) => {
                  const isFeaturedSlide = 'type' in slide && slide.type === 'featured';
                  const isLeaderboardSlide = 'type' in slide && slide.type === 'leaderboard';
                  const fg = featuredGamefolio;
                  const accent = fg?.user.accentColor || "#B7FF1A";
                  const types = (fg?.user.userType || "").split(",").map((t: string) => t.trim()).filter(Boolean);
                  const fgGames = fg?.gamesPlayed ?? [];
                  const isStreamer = types.some((t: string) => t.toLowerCase() === "streamer");

                  const fgEntry: TrendingEntry | null = fg ? {
                    userId: fg.user.id,
                    rank: 1,
                    uploadsCount: fg.weeklyUploadsCount ?? fg.clipCount,
                    totalPoints: fg.totalPoints ?? 0,
                    clipsCount: fg.clipsCount ?? 0,
                    reelsCount: fg.reelsCount ?? 0,
                    screenshotsCount: fg.screenshotsCount ?? 0,
                    followersCount: fg.followersCount ?? 0,
                    followingCount: fg.followingCount ?? 0,
                    user: {
                      id: fg.user.id,
                      username: fg.user.username,
                      displayName: fg.user.displayName,
                      avatarUrl: fg.user.avatarUrl,
                      bannerUrl: fg.user.bannerUrl,
                      avatarBorderColor: fg.user.avatarBorderColor,
                      accentColor: fg.user.accentColor,
                      level: fg.user.level,
                      backgroundColor: fg.user.backgroundColor,
                      primaryColor: fg.user.primaryColor,
                      profileBackgroundGradient: fg.user.profileBackgroundGradient,
                      profileBackgroundImageUrl: fg.user.profileBackgroundImageUrl,
                    },
                  } : null;

                  const lc = fg?.latestClip;
                  const fmtDuration = (s: number) => s > 0 ? `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}` : null;
                  const fmtViews = (n: number) => n >= 1000 ? `${(n/1000).toFixed(1)}K` : String(n);
                  const fmtTimeAgo = (d: string | null) => {
                    if (!d) return '';
                    const diff = Date.now() - new Date(d).getTime();
                    const h = Math.floor(diff / 3600000);
                    if (h < 1) return 'just now';
                    if (h < 24) return `${h}h ago`;
                    const days = Math.floor(h / 24);
                    return days < 7 ? `${days}d ago` : `${Math.floor(days/7)}w ago`;
                  };
                  const isReel = lc?.videoType === 'reel';
                  const contentLabel = isReel ? 'LATEST REEL' : 'LATEST CLIP';
                  const watchLabel = isReel ? '📱 Watch Reel' : '▶ Watch Clip';
                  const trendingReason = (fg?.weeklyUploadsCount ?? 0) > 0
                    ? `Uploaded ${fg!.weeklyUploadsCount} clip${fg!.weeklyUploadsCount !== 1 ? 's' : ''} this week`
                    : (fg?.followersCount ?? 0) > 20 ? `${fg!.followersCount} followers` : 'Rising creator';

                  return (
                  <div
                    key={slide.id}
                    className="absolute inset-0 transition-opacity duration-700 ease-in-out"
                    style={{ opacity: idx === currentSlide ? 1 : 0, zIndex: idx === currentSlide ? 1 : 0 }}
                  >
                    {isLeaderboardSlide ? (
                      /* ── Leaderboard Winners podium slide ── */
                      <div className="absolute inset-0 overflow-hidden" style={{ background: "linear-gradient(160deg,#080e18 0%,#0B1319 55%,#080e18 100%)" }}>
                        <style>{LEADERBOARD_STYLES}</style>
                        {/* Grid overlay */}
                        <div className="absolute inset-0 opacity-[0.02] pointer-events-none"
                          style={{ backgroundImage:"linear-gradient(rgba(183,255,26,0.6) 1px,transparent 1px),linear-gradient(90deg,rgba(183,255,26,0.6) 1px,transparent 1px)",backgroundSize:"48px 48px" }} />
                        {/* Glow floor */}
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 pointer-events-none"
                          style={{ width:"60%",height:"160px",background:"radial-gradient(ellipse at 50% 100%,rgba(183,255,26,0.08) 0%,transparent 70%)" }} />

                        <div className="relative h-full flex flex-col items-center justify-center px-4 sm:px-6 py-3 gap-2">
                          {/* Header */}
                          <div className="text-center flex-shrink-0">
                            <div className="flex items-center justify-center gap-2 mb-0.5">
                              <span className="text-base sm:text-lg">🏆</span>
                              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.22em]" style={{ color:"#B7FF18" }}>This Week's Leaderboard</span>
                            </div>
                            <p className="text-[10px] text-white/35 max-w-xs mx-auto hidden sm:block leading-relaxed">
                              Compete, earn XP, climb the leaderboard and become this week's champion.
                            </p>
                            <div className="flex items-center justify-center gap-1.5 mt-0.5">
                              <span className="text-[10px] text-white/40">⏱ Resets in:</span>
                              <span className="text-[10px] font-bold text-white/70">{resetCountdown.days}d {resetCountdown.hours}h</span>
                            </div>
                          </div>

                          {/* Podium — order: 2nd · 1st · 3rd */}
                          <div className="flex items-end justify-center gap-4 sm:gap-8 w-full flex-1 pb-1">
                            {(() => {
                              const top3 = weeklyTop3 ?? [];

                              const renderCard = (winner: LeaderboardWinner | undefined, rank: 1 | 2 | 3) => {
                                const isFirst = rank === 1;
                                const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉';
                                const accentClr = rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : '#CD7F32';
                                const podH = rank === 1 ? 36 : rank === 2 ? 22 : 14;
                                const cardClass = `lb-card-${rank}`;
                                const scaleClass = isFirst ? 'scale-[1.0] sm:scale-[1.08]' : 'scale-[0.82] sm:scale-[0.88]';
                                const elevate = isFirst ? '-translate-y-3 sm:-translate-y-5' : '';

                                if (!winner) {
                                  return (
                                    <div key={rank} className={`flex flex-col items-center transform ${elevate} ${scaleClass} origin-bottom`}>
                                      <div className={`${cardClass}`}>
                                        <div className="fire-card flex flex-col items-center justify-center"
                                          style={{ width:190, height:340, borderRadius:16 }}>
                                          <div className="absolute inset-[3px] rounded-[13px] flex flex-col items-center justify-center gap-2"
                                            style={{ background:'rgba(11,19,25,0.95)' }}>
                                            <div className="text-4xl">{medal}</div>
                                            <div className="text-white/30 text-xs font-bold">Could be you!</div>
                                            <div className="text-white/20 text-[10px] text-center px-4">Upload clips this week to compete</div>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex items-center justify-center rounded-b-xl mt-0"
                                        style={{ height:podH, width:190, background:`linear-gradient(180deg,${accentClr}30 0%,${accentClr}12 100%)`, borderLeft:`1px solid ${accentClr}35`, borderRight:`1px solid ${accentClr}35`, borderBottom:`1px solid ${accentClr}35` }}>
                                        <span style={{ fontSize:14 }}>{medal}</span>
                                      </div>
                                    </div>
                                  );
                                }

                                const entry: TrendingEntry = {
                                  userId: winner.userId,
                                  rank: winner.rank,
                                  uploadsCount: winner.uploadsCount,
                                  totalPoints: winner.totalPoints,
                                  clipsCount: winner.uploadsCount,
                                  reelsCount: 0,
                                  screenshotsCount: 0,
                                  followersCount: 0,
                                  followingCount: 0,
                                  user: {
                                    id: winner.user.id,
                                    username: winner.user.username,
                                    displayName: winner.user.displayName,
                                    avatarUrl: winner.user.avatarUrl,
                                    bannerUrl: winner.user.bannerUrl,
                                    avatarBorderColor: accentClr,
                                    accentColor: accentClr,
                                    level: winner.user.level,
                                    backgroundColor: winner.user.backgroundColor,
                                    primaryColor: null,
                                    profileBackgroundGradient: false,
                                    profileBackgroundImageUrl: null,
                                  },
                                };

                                return (
                                  <div key={rank} className={`flex flex-col items-center transform ${elevate} ${scaleClass} origin-bottom`}>
                                    <div className={`relative ${cardClass}`}>
                                      {isFirst && (
                                        <div className="absolute pointer-events-none" style={{ inset: '-10px', zIndex: 10 }}>
                                          {[1,2,3,4,5,6].map(i => <span key={i} className="lb-spark" />)}
                                        </div>
                                      )}
                                      <CreatorCard entry={entry} period="week" />
                                    </div>
                                    {/* Podium slab */}
                                    <div className="flex items-center justify-center rounded-b-xl"
                                      style={{ height:podH, width:190, background:`linear-gradient(180deg,${accentClr}35 0%,${accentClr}14 100%)`, borderLeft:`1px solid ${accentClr}40`, borderRight:`1px solid ${accentClr}40`, borderBottom:`1px solid ${accentClr}40` }}>
                                      <span style={{ fontSize: isFirst ? 16 : 13 }}>{medal}</span>
                                    </div>
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

                          {/* CTA */}
                          <button
                            onClick={() => setLocation('/leaderboard')}
                            className="flex-shrink-0 inline-flex items-center gap-1.5 text-xs font-black px-5 py-2 rounded-xl transition-all hover:opacity-90 active:scale-95"
                            style={{ background:'#B7FF18', color:'#0B1319', boxShadow:'0 4px 18px rgba(183,255,26,0.35)' }}>
                            View Full Leaderboard →
                          </button>
                        </div>
                      </div>
                    ) : isFeaturedSlide ? (
                      /* ── Featured Gamefolio slide ── */
                      <div className="absolute inset-0 overflow-hidden"
                        style={{ background: "#0B1319" }}>
                        <style>{CREATOR_CARD_STYLES}</style>
                        {/* Subtle background banner */}
                        {fg?.user.bannerUrl && (
                          <div className="absolute inset-0">
                            <img src={fg.user.bannerUrl} alt="" className="w-full h-full object-cover opacity-10" />
                            <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(11,19,25,0.97) 0%, rgba(11,19,25,0.90) 100%)" }} />
                          </div>
                        )}
                        {/* Grid pattern */}
                        <div className="absolute inset-0 opacity-[0.02] pointer-events-none"
                          style={{ backgroundImage: "linear-gradient(rgba(183,255,26,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(183,255,26,0.6) 1px, transparent 1px)", backgroundSize: "48px 48px" }} />

                        <div className="relative h-full flex items-center px-4 sm:px-6 md:px-8 py-4">
                          <div className="w-full flex flex-col sm:flex-row gap-4 sm:gap-6 items-center sm:items-stretch max-w-6xl mx-auto">

                            {/* ── LEFT: Profile mini-card ── */}
                            <div className="flex-shrink-0 flex items-center justify-center sm:w-[37%]">
                              {fgEntry ? (
                                <CreatorCard entry={fgEntry} period="alltime" />
                              ) : (
                                <div className="w-[190px] h-[320px] rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} />
                              )}
                            </div>

                            {/* ── RIGHT: Content showcase ── */}
                            <div className="flex-1 flex flex-col justify-center min-w-0 sm:w-[63%]">
                              {/* Header row */}
                              <div className="flex items-center gap-3 mb-2">
                                <div className="flex items-center gap-1.5">
                                  <div className="w-1 h-3 rounded-full" style={{ background: accent }} />
                                  <span className="text-[10px] font-black uppercase tracking-[0.22em] text-white/60">Trending Gamefolio</span>
                                </div>
                                <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide"
                                  style={{ background: `${accent}18`, color: accent, border: `1px solid ${accent}30` }}>
                                  🔥 Trending Now
                                </div>
                              </div>
                              <div className="text-white font-black text-lg sm:text-xl md:text-2xl leading-tight mb-3 tracking-tight">
                                Featured Creator
                              </div>

                              {/* Media thumbnail */}
                              {lc?.thumbnailUrl ? (
                                <div
                                  className="relative rounded-xl overflow-hidden cursor-pointer group mb-3"
                                  style={{ aspectRatio: isReel ? '9/5' : '16/7', background: '#0a0f1c', border: '1px solid rgba(255,255,255,0.08)', maxHeight: 180 }}
                                  onClick={() => setLocation(`/clips/${lc.id}`)}
                                >
                                  <img
                                    src={lc.thumbnailUrl}
                                    alt={lc.title}
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                  />
                                  {/* Dark overlay */}
                                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                                  {/* Play button */}
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-11 h-11 rounded-full flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
                                      style={{ background: 'rgba(0,0,0,0.65)', border: `2px solid ${accent}`, boxShadow: `0 0 18px ${accent}50` }}>
                                      <svg className="w-5 h-5 ml-0.5" fill={accent} viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                    </div>
                                  </div>
                                  {/* Duration badge */}
                                  {lc.duration > 0 && (
                                    <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-bold text-white"
                                      style={{ background: 'rgba(0,0,0,0.75)' }}>
                                      {fmtDuration(lc.duration)}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="relative rounded-xl mb-3 flex items-center justify-center"
                                  style={{ aspectRatio: '16/7', maxHeight: 180, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                  <span className="text-white/20 text-sm">No preview</span>
                                </div>
                              )}

                              {/* Content metadata */}
                              {lc && (
                                <div className="mb-2">
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <span className="text-[9px] font-black uppercase tracking-[0.18em]" style={{ color: accent }}>🎬 {contentLabel}</span>
                                  </div>
                                  <div className="text-white font-bold text-sm leading-snug truncate mb-1.5">{lc.title}</div>
                                  <div className="flex items-center gap-3 text-[11px] text-white/50 flex-wrap">
                                    <span>👁 {fmtViews(lc.views)} views</span>
                                    <span>♥ {lc.likesCount} likes</span>
                                    <span>· {fmtTimeAgo(lc.createdAt)}</span>
                                    {lc.gameName && <span>🎮 {lc.gameName}</span>}
                                  </div>
                                </div>
                              )}

                              {/* Trending because chip */}
                              <div className="flex items-center gap-1.5 mb-3 px-2.5 py-1.5 rounded-lg w-fit"
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <span className="text-[11px] text-white/50">📈</span>
                                <span className="text-[11px] text-white/70"><span className="text-white/40">Trending because:</span> <span className="text-white font-semibold">{trendingReason}</span></span>
                              </div>

                              {/* Action buttons */}
                              <div className="flex items-center gap-2 flex-wrap">
                                {lc && (
                                  <button
                                    onClick={() => setLocation(`/clips/${lc.id}`)}
                                    className="inline-flex items-center gap-1.5 text-xs font-black px-4 py-2 rounded-lg transition-all hover:opacity-90 active:scale-95"
                                    style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)' }}>
                                    {watchLabel}
                                  </button>
                                )}
                                <button
                                  onClick={() => setLocation(`/profile/${fg?.user.username}`)}
                                  className="inline-flex items-center gap-1.5 text-xs font-black px-4 py-2 rounded-lg transition-all hover:opacity-90 active:scale-95"
                                  style={{ background: accent, color: '#0B1319', boxShadow: `0 4px 16px ${accent}40` }}>
                                  View Gamefolio →
                                </button>
                              </div>
                            </div>

                          </div>
                        </div>
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
                      className="absolute left-3 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
                      aria-label="Previous slide"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      onClick={nextSlide}
                      className="absolute right-3 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
                      aria-label="Next slide"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2">
                      {activeSlides.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => goToSlide(idx)}
                          className={`w-2.5 h-2.5 rounded-full transition-all ${idx === currentSlide ? 'bg-primary w-6' : 'bg-white/50 hover:bg-white/80'}`}
                          aria-label={`Go to slide ${idx + 1}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                <img
                  src={ForzaGif}
                  alt="Epic racing gameplay - Build your Gamefolio"
                  className="w-full h-full object-cover absolute inset-0"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent">
                  <div className="flex flex-col items-start justify-center h-full max-w-3xl p-6 sm:p-8 md:p-12">
                    <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold text-white mb-3 md:mb-4 leading-tight drop-shadow-md">
                      Build Your Gamefolio
                    </h1>
                    <h2 className="text-lg sm:text-2xl md:text-3xl font-semibold text-primary mb-4 md:mb-6 leading-tight drop-shadow-lg">
                      With Your Best Gaming Clips
                    </h2>
                    <p className="text-gray-200 mb-6 sm:mb-8 max-w-lg text-sm sm:text-base md:text-lg leading-relaxed">
                      Showcase your most epic gaming moments, connect with other gamers, and build your personal gaming portfolio.
                    </p>
                    <Button
                      className="w-fit px-6 py-5 h-auto text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
                      onClick={() => setLocation('/upload')}
                    >
                      Start Building Now
                    </Button>
                  </div>
                </div>
              </>
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

      {/* Daily XP Challenges */}
      {/* <LazySection minHeight="280px" rootMargin="200px">
        <div className="px-4 sm:px-6 md:px-8">
          <DailyXPChallenges />
        </div>
      </LazySection> */}

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