import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import VideoClipCard from "@/components/clips/VideoClipCard";

import { Button } from "@/components/ui/button";
import { ClipWithUser } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { ChevronRight, Video, Plus, ChevronLeft, Trophy, Camera } from "lucide-react";
import { useLocation, Link } from "wouter";
import { EmailVerificationBanner } from "@/components/auth/EmailVerificationBanner";
import { LatestReelsCarousel } from "@/components/clips/LatestReelsCarousel";
import { ScreenshotCard } from "@/components/screenshots/ScreenshotCard";
import { ScreenshotLightbox } from "@/components/screenshots/ScreenshotLightbox";
import { MobileScreenshotsViewer } from "@/components/screenshots/MobileScreenshotsViewer";
import { useMobile } from "@/hooks/use-mobile";
import RecommendedForYou from "@/components/home/RecommendedForYou";
import { LazySection } from "@/components/ui/lazy-section";

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

interface CarouselSlide {
  type: 'trending_clip' | 'top_gamefolios' | 'trending_game' | 'live_now' | 'creator_spotlight' | 'community_milestone' | 'discover_new';
  [key: string]: any;
}

const CAROUSEL_INTERVAL = 6000;

const CommunityCarousel = ({ slides, isLoading }: { slides: CarouselSlide[]; isLoading: boolean }) => {
  const [, setLocation] = useLocation();
  const [currentSlide, setCurrentSlide] = useState(0);
  const autoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const count = slides.length;

  const goToSlide = useCallback((idx: number) => {
    setCurrentSlide(idx);
    if (autoTimerRef.current) clearInterval(autoTimerRef.current);
    if (count > 1) {
      autoTimerRef.current = setInterval(() => setCurrentSlide(p => (p + 1) % count), CAROUSEL_INTERVAL);
    }
  }, [count]);

  const goNext = useCallback(() => goToSlide((currentSlide + 1) % count), [currentSlide, goToSlide, count]);
  const goPrev = useCallback(() => goToSlide((currentSlide - 1 + count) % count), [currentSlide, goToSlide, count]);

  useEffect(() => {
    setCurrentSlide(0);
    if (autoTimerRef.current) clearInterval(autoTimerRef.current);
    if (count > 1) {
      autoTimerRef.current = setInterval(() => setCurrentSlide(p => (p + 1) % count), CAROUSEL_INTERVAL);
    }
    return () => { if (autoTimerRef.current) clearInterval(autoTimerRef.current); };
  }, [count]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goNext, goPrev]);

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; touchEndX.current = null; };
  const handleTouchMove = (e: React.TouchEvent) => { touchEndX.current = e.touches[0].clientX; };
  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) >= 50) diff > 0 ? goNext() : goPrev();
    touchStartX.current = null; touchEndX.current = null;
  };

  const formatViews = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : String(n);

  const renderSlide = (slide: CarouselSlide) => {
    switch (slide.type) {
      case 'trending_clip':
        return (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: slide.thumbnailUrl ? `url(${slide.thumbnailUrl})` : undefined, backgroundColor: '#0B1319' }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20" />
            <div className="relative h-full flex flex-col justify-end px-6 sm:px-12 md:px-16 pb-12 sm:pb-14">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#B7FF18' }}>
                <span className="w-2 h-2 rounded-full animate-pulse inline-block" style={{ background: '#B7FF18' }} />
                Trending Right Now
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold text-white mb-2 leading-tight line-clamp-2">{slide.title}</h2>
              <p className="text-white/70 text-sm mb-4">@{slide.username} · {(slide.views ?? 0).toLocaleString()} views{slide.gameName ? ` · ${slide.gameName}` : ''}</p>
              <Button className="w-fit px-6 py-2 h-auto font-semibold text-sm" style={{ background: '#B7FF18', color: '#071013' }} onClick={() => setLocation(`/clips/${slide.clipId}`)}>
                Watch Now
              </Button>
            </div>
          </div>
        );

      case 'top_gamefolios':
        return (
          <div className="absolute inset-0 flex flex-col" style={{ background: 'linear-gradient(135deg, #071013 0%, #0B2232 50%, #071013 100%)' }}>
            <div className="h-full flex flex-col justify-center px-6 sm:px-12 md:px-16 py-8">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-4 h-4" style={{ color: '#B7FF18' }} />
                <span className="font-bold uppercase tracking-widest text-xs" style={{ color: '#B7FF18' }}>Leaderboard</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-5">Top Gamefolios</h2>
              <div className="flex flex-col sm:flex-row gap-3">
                {(slide.entries as any[]).map((entry: any, idx: number) => (
                  <button
                    key={entry.username}
                    onClick={() => setLocation(`/profile/${entry.username}`)}
                    className="flex items-center gap-3 rounded-xl px-4 py-3 text-left flex-1 hover:opacity-90 transition-opacity"
                    style={{ background: 'rgba(183,255,24,0.08)', border: '1px solid rgba(183,255,24,0.2)' }}
                  >
                    <span className="text-2xl font-black w-8 flex-shrink-0" style={{ color: idx === 0 ? '#FFD700' : idx === 1 ? '#C0C0C0' : '#CD7F32' }}>#{idx + 1}</span>
                    {entry.avatarUrl ? (
                      <img src={entry.avatarUrl} alt={entry.username} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm" style={{ background: '#B7FF18', color: '#071013' }}>
                        {(entry.displayName || entry.username || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-white text-sm truncate">{entry.displayName || entry.username}</p>
                      <p className="text-xs" style={{ color: '#B7FF18' }}>{(entry.totalPoints ?? 0).toLocaleString()} XP</p>
                    </div>
                  </button>
                ))}
              </div>
              <button className="mt-5 text-sm font-medium hover:underline underline-offset-2 text-left" style={{ color: '#B7FF18' }} onClick={() => setLocation('/leaderboard')}>
                View full leaderboard →
              </button>
            </div>
          </div>
        );

      case 'trending_game':
        return (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: slide.gameImageUrl ? `url(${slide.gameImageUrl})` : undefined, backgroundColor: '#0B1319' }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-black/20" />
            <div className="relative h-full flex flex-col justify-center px-6 sm:px-12 md:px-16">
              <span className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#B7FF18' }}>🎮 Trending Game</span>
              <h2 className="text-3xl sm:text-4xl md:text-6xl font-black text-white mb-3 leading-tight">{slide.gameName}</h2>
              <p className="text-white/70 text-sm mb-5">{(slide.clipCount ?? 0).toLocaleString()} clips this month</p>
              <Button
                className="w-fit px-6 py-2 h-auto font-semibold text-sm"
                style={{ background: '#B7FF18', color: '#071013' }}
                onClick={() => setLocation(`/games/${String(slide.gameName).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`)}
              >
                Explore Game
              </Button>
            </div>
          </div>
        );

      case 'live_now':
        return (
          <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #1a0505 0%, #0B1319 70%)' }}>
            <div className="h-full flex flex-col justify-center px-6 sm:px-12 md:px-16 py-8">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-full animate-pulse flex-shrink-0" style={{ background: '#ff4444' }} />
                <span className="font-bold uppercase tracking-widest text-xs text-red-400">Live Right Now</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-5">Catch them live</h2>
              <div className="flex flex-wrap gap-3">
                {(slide.streamers as any[]).slice(0, 4).map((streamer: any) => (
                  <button
                    key={streamer.username}
                    onClick={() => setLocation(`/profile/${streamer.username}`)}
                    className="flex items-center gap-2 rounded-full px-3 py-2 hover:opacity-90 transition-opacity"
                    style={{ background: 'rgba(255,68,68,0.15)', border: '1px solid rgba(255,68,68,0.35)' }}
                  >
                    {streamer.avatarUrl ? (
                      <img src={streamer.avatarUrl} alt={streamer.username} className="w-8 h-8 rounded-full object-cover ring-2 ring-red-500" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-red-900 flex items-center justify-center text-white text-xs font-bold ring-2 ring-red-500">
                        {(streamer.displayName || streamer.username || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-white text-sm font-medium">@{streamer.username}</span>
                    {streamer.streamPlatform && (
                      <span className="text-xs font-bold text-red-400 uppercase">{streamer.streamPlatform}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 'creator_spotlight':
        return (
          <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #071013 0%, #0d1f2d 100%)' }}>
            <div className="h-full flex flex-col justify-center px-6 sm:px-12 md:px-16 py-8">
              <span className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#B7FF18' }}>⭐ Creator Spotlight</span>
              <div className="flex items-center gap-4 sm:gap-6">
                {slide.avatarUrl ? (
                  <img
                    src={slide.avatarUrl}
                    alt={slide.username}
                    className="w-20 h-20 sm:w-28 sm:h-28 rounded-full object-cover flex-shrink-0"
                    style={{ boxShadow: '0 0 0 4px #B7FF18' }}
                  />
                ) : (
                  <div
                    className="w-20 h-20 sm:w-28 sm:h-28 rounded-full flex items-center justify-center flex-shrink-0 text-3xl font-black"
                    style={{ background: '#B7FF18', color: '#071013', boxShadow: '0 0 0 4px rgba(183,255,24,0.3)' }}
                  >
                    {(slide.displayName || slide.username || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-1 leading-tight">{slide.displayName || slide.username}</h2>
                  <p className="text-white/60 text-sm mb-3">@{slide.username} · Level {slide.level}</p>
                  <div className="flex gap-5 mb-4">
                    <div>
                      <p className="text-xl font-bold" style={{ color: '#B7FF18' }}>{(slide.totalXP ?? 0).toLocaleString()}</p>
                      <p className="text-white/50 text-xs">Total XP</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-white">{slide.clipCount ?? 0}</p>
                      <p className="text-white/50 text-xs">Clips</p>
                    </div>
                  </div>
                  <Button
                    className="w-fit px-5 py-2 h-auto font-semibold text-sm"
                    style={{ background: '#B7FF18', color: '#071013' }}
                    onClick={() => setLocation(`/profile/${slide.username}`)}
                  >
                    View Profile
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'community_milestone':
        return (
          <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #071013 0%, #0B2232 50%, #071013 100%)' }}>
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #B7FF18 0%, transparent 50%), radial-gradient(circle at 80% 50%, #B7FF18 0%, transparent 50%)' }} />
            <div className="relative h-full flex flex-col justify-center px-6 sm:px-12 md:px-16">
              <span className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#B7FF18' }}>🏆 Community</span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6">The numbers don't lie</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Gamers', value: (slide.totalUsers ?? 0).toLocaleString() },
                  { label: 'Clips', value: (slide.totalClips ?? 0).toLocaleString() },
                  { label: 'Screenshots', value: (slide.totalScreenshots ?? 0).toLocaleString() },
                  { label: 'Views', value: formatViews(Number(slide.totalViews ?? 0)) },
                ].map(stat => (
                  <div key={stat.label} className="rounded-xl p-3 sm:p-4 text-center" style={{ background: 'rgba(183,255,24,0.08)', border: '1px solid rgba(183,255,24,0.2)' }}>
                    <p className="text-xl sm:text-3xl font-black" style={{ color: '#B7FF18' }}>{stat.value}</p>
                    <p className="text-white/60 text-xs mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'discover_new':
        return (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: slide.imageUrl ? `url(${slide.imageUrl})` : undefined, backgroundColor: '#0B1319' }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
            <div className="relative h-full flex flex-col justify-end px-6 sm:px-12 md:px-16 pb-12 sm:pb-14">
              <span className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#B7FF18' }}>✨ Discover Something New</span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 leading-tight line-clamp-2">{slide.title}</h2>
              <p className="text-white/60 text-sm mb-4">{(slide.views ?? 0).toLocaleString()} views</p>
              <Button
                className="w-fit px-6 py-2 h-auto font-semibold text-sm"
                style={{ background: '#B7FF18', color: '#071013' }}
                onClick={() => setLocation(slide.contentType === 'clip' ? `/clips/${slide.contentId}` : `/screenshots/${slide.contentId}`)}
              >
                Check It Out
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div
        className="relative -mx-2 md:-mx-6 -mt-2 md:-mt-4 h-[300px] sm:h-[360px] md:h-[480px] animate-pulse"
        style={{ background: 'linear-gradient(135deg, #071013 0%, #0B2232 100%)' }}
      />
    );
  }

  if (!slides.length) return null;

  return (
    <section
      className="relative overflow-hidden -mx-2 md:-mx-6 -mt-2 md:-mt-4"
      tabIndex={0}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="relative h-[300px] sm:h-[360px] md:h-[480px]">
        {slides.map((slide, index) => (
          <div
            key={`${slide.type}-${index}`}
            className="absolute inset-0 transition-opacity duration-700 ease-in-out"
            style={{ opacity: currentSlide === index ? 1 : 0, zIndex: currentSlide === index ? 1 : 0 }}
          >
            {renderSlide(slide)}
          </div>
        ))}

        {count > 1 && (
          <>
            <button
              onClick={goPrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/80 text-white p-2 rounded-full transition-colors hidden sm:flex items-center justify-center"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={goNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/80 text-white p-2 rounded-full transition-colors hidden sm:flex items-center justify-center"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {count > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className="h-1.5 rounded-full transition-all duration-300"
                style={currentSlide === index
                  ? { background: '#B7FF18', width: '24px' }
                  : { background: 'rgba(255,255,255,0.4)', width: '6px' }
                }
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

const HomePage = () => {
  const [selectedScreenshot, setSelectedScreenshot] = useState<any>(null);
  const isMobile = useMobile();
  const [, setLocation] = useLocation();
  const screenshotsScrollRef = useRef<HTMLDivElement>(null);
  const [screenshotsDragging, setScreenshotsDragging] = useState(false);
  const [screenshotsDragStart, setScreenshotsDragStart] = useState(0);
  const [screenshotsScrollStart, setScreenshotsScrollStart] = useState(0);

  const { user } = useAuth();
  const userId = user?.id;

  // Community carousel data
  const { data: carouselSlides = [], isLoading: isLoadingCarousel } = useQuery<CarouselSlide[]>({
    queryKey: ['/api/hero-carousel'],
    queryFn: async () => {
      const response = await fetch('/api/hero-carousel');
      if (!response.ok) throw new Error('Failed to fetch carousel data');
      return response.json();
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  // Query latest clips — newest uploaded first
  const { data: trendingClipsData, isLoading: isLoadingTrendingClips } = useQuery<ClipWithUser[]>({
    queryKey: ['/api/clips/latest'],
    queryFn: async () => {
      const response = await fetch('/api/clips/latest?limit=20', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch latest clips');
      return response.json();
    }
  });

  const trendingClips = Array.isArray(trendingClipsData)
    ? trendingClipsData.filter(clip => clip.videoType !== 'reel')
    : [];

  const { data: latestReels, isLoading: isLoadingReels } = useQuery<ClipWithUser[]>({
    queryKey: ['/api/reels/latest'],
    queryFn: async () => {
      const response = await fetch('/api/reels/latest?limit=12');
      if (!response.ok) throw new Error('Failed to fetch latest reels');
      return response.json();
    }
  });

  const { data: latestScreenshots, isLoading: isLoadingScreenshots } = useQuery<any[]>({
    queryKey: ['/api/screenshots/latest'],
    queryFn: async () => {
      const response = await fetch('/api/screenshots/latest?limit=12', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch latest screenshots');
      return response.json();
    }
  });

  return (
    <div className="pb-16 md:pb-8 hide-scrollbar">
      {/* Email Verification Banner */}
      {user && (
        <div className="mx-2 sm:mx-4 md:mx-6 mb-0">
          <EmailVerificationBanner />
        </div>
      )}

      {/* Community Carousel */}
      <CommunityCarousel slides={carouselSlides} isLoading={isLoadingCarousel} />

      {/* Ecosystem Activity Rail */}
      {/* <EcosystemActivityRail /> */}
      
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