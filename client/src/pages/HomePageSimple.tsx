import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import VideoClipGridItem from "@/components/clips/VideoClipGridItem";
import { TrendingSection } from "@/components/trending/TrendingSection";

import { Button } from "@/components/ui/button";
import { ClipWithUser, Game } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { ChevronRight, Video, Plus, ChevronLeft } from "lucide-react";
import BannerImage from "@assets/Untitled (1920 x 1080 px).png";
import ForzaGif from "@assets/video-720-ezgif.com-optimize_1756741905949.gif";
import LootboxBanner from "@assets/lootbox-banner-1_1770362095039.png";
import { useLocation, Link } from "wouter";
import { EmailVerificationBanner } from "@/components/auth/EmailVerificationBanner";
import { LatestReelsCarousel } from "@/components/clips/LatestReelsCarousel";
import { ScreenshotCard } from "@/components/screenshots/ScreenshotCard";
import { ScreenshotLightbox } from "@/components/screenshots/ScreenshotLightbox";
import { Camera } from "lucide-react";
import RecommendedForYou from "@/components/home/RecommendedForYou";
import { ProUpgradeDialog } from "@/components/ProUpgradeDialog";
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
        className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors hidden sm:block"
      >
        <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
      </button>
      
      <button
        onClick={() => scroll('right')}
        className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors hidden sm:block"
      >
        <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
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
            <VideoClipGridItem 
              clip={clip}
              userId={userId}
              compact={false}
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

const HERO_SLIDES = [
  {
    type: 'overlay' as const,
    backgroundImage: ForzaGif,
    overlay: 'linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.8))',
    showContent: true,
  },
  {
    type: 'lootbox' as const,
    backgroundImage: LootboxBanner,
    overlay: 'linear-gradient(to right, rgba(0, 0, 0, 0.7) 0%, rgba(0, 0, 0, 0.3) 50%, transparent 100%)',
    showContent: true,
  },
  {
    type: 'overlay' as const,
    backgroundImage: BannerImage,
    overlay: 'linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7))',
    showContent: true,
  },
];

const SLIDE_INTERVAL = 5000;

interface DbHeroSlide {
  id: number;
  title: string;
  subtitle: string | null;
  buttonText: string | null;
  buttonLink: string | null;
  imageUrl: string;
  displayOrder: number;
  isActive: boolean;
  visibility: string;
  textAlign: string;
}

interface HeroBannerSlideshowProps {
  heroText: { title: string; subtitle: string; buttonText?: string; buttonUrl?: string } | null;
  user: any;
  userHasContent: boolean | undefined;
  setLocation: (path: string) => void;
  dbSlides?: DbHeroSlide[];
  slideIntervalMs?: number;
}

const HeroBannerSlideshow = ({ heroText, user, userHasContent, setLocation, dbSlides, slideIntervalMs }: HeroBannerSlideshowProps) => {
  const useDbSlides = dbSlides && dbSlides.length > 0;
  const slidesCount = useDbSlides ? dbSlides.length : HERO_SLIDES.length;
  const interval = slideIntervalMs || SLIDE_INTERVAL;

  const [currentSlide, setCurrentSlide] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const autoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sectionRef = useRef<HTMLElement>(null);

  const goToSlide = useCallback((index: number) => {
    setCurrentSlide(index);
    if (autoTimerRef.current) clearInterval(autoTimerRef.current);
    autoTimerRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slidesCount);
    }, interval);
  }, [slidesCount, interval]);

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
    }, interval);
    return () => { if (autoTimerRef.current) clearInterval(autoTimerRef.current); };
  }, [slidesCount, interval]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
    const minSwipeDistance = 50;
    if (Math.abs(diff) >= minSwipeDistance) {
      if (diff > 0) goNext();
      else goPrev();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden -mx-2 md:-mx-6 -mt-2 md:-mt-4"
      tabIndex={0}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="relative h-[300px] sm:h-[350px] md:h-[500px]">
        {useDbSlides ? (
          dbSlides.map((slide, index) => (
            <div
              key={slide.id}
              className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out"
              style={{
                backgroundImage: `url(${slide.imageUrl})`,
                opacity: currentSlide === index ? 1 : 0,
                zIndex: currentSlide === index ? 1 : 0,
              }}
            >
              <div className={`absolute inset-0 ${slide.textAlign === 'left' ? 'bg-gradient-to-r from-black/80 via-black/40 to-transparent' : slide.textAlign === 'right' ? 'bg-gradient-to-l from-black/80 via-black/40 to-transparent' : 'bg-gradient-to-t from-black/70 via-black/50 to-black/30'}`} />
              <div className={`relative flex ${slide.textAlign === 'right' ? 'items-center justify-end' : slide.textAlign === 'left' ? 'items-center justify-start' : 'items-center justify-center'} h-full`}>
                <div className={`${slide.textAlign === 'center' ? 'text-center' : slide.textAlign === 'right' ? 'text-right' : 'text-left'} text-white px-8 sm:px-14 md:px-24 ${slide.textAlign === 'center' ? 'max-w-4xl' : 'max-w-lg'}`}>
                  <h1 className="text-2xl sm:text-3xl md:text-6xl font-bold mb-3 sm:mb-4 leading-tight">
                    {slide.title.split('\n').map((line, idx) => (
                      <span key={idx}>
                        {idx > 0 && <span className="block text-primary">{line}</span>}
                        {idx === 0 && line}
                      </span>
                    ))}
                  </h1>
                  {slide.subtitle && (
                    <p className={`text-sm sm:text-base md:text-xl text-gray-200 mb-6 sm:mb-8 max-w-2xl ${slide.textAlign === 'center' ? 'mx-auto' : ''} leading-relaxed`}>
                      {slide.subtitle}
                    </p>
                  )}
                  {slide.buttonText && slide.buttonLink && (
                    <Button 
                      className="w-full sm:w-fit px-6 py-3 sm:py-5 h-auto text-sm sm:text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
                      onClick={() => {
                        if (slide.buttonLink === '/lootbox') {
                          window.dispatchEvent(new CustomEvent('open-lootbox'));
                        } else if (slide.buttonLink === '/pro') {
                          window.dispatchEvent(new CustomEvent('open-pro-upgrade'));
                        } else if (slide.buttonLink?.startsWith('http')) {
                          window.open(slide.buttonLink, '_blank');
                        } else {
                          setLocation(slide.buttonLink || '/');
                        }
                      }}
                    >
                      {slide.buttonText}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          HERO_SLIDES.map((slide, index) => (
            <div
              key={index}
              className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out"
              style={{
                backgroundImage: slide.overlay
                  ? `${slide.overlay}, url(${slide.backgroundImage})`
                  : `url(${slide.backgroundImage})`,
                opacity: currentSlide === index ? 1 : 0,
                zIndex: currentSlide === index ? 1 : 0,
              }}
            >
              {slide.type === 'lootbox' && (
                <div className="flex items-start justify-start h-full">
                  <div className="text-left text-white px-6 sm:px-10 md:px-16 flex flex-col justify-center h-full max-w-lg">
                    <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-4 sm:mb-6 leading-tight drop-shadow-lg">
                      Claim your<br />Daily Lootbox
                    </h2>
                    <Button 
                      className="w-fit px-8 py-3 sm:py-4 h-auto text-sm sm:text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg"
                      onClick={() => {
                        if (user) {
                          window.dispatchEvent(new CustomEvent('open-lootbox'));
                        } else {
                          setLocation('/auth');
                        }
                      }}
                    >
                      Claim
                    </Button>
                  </div>
                </div>
              )}
              {slide.showContent && slide.type !== 'lootbox' && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-white px-4 sm:px-6 max-w-4xl">
                    {heroText ? (
                      <>
                        <h1 className="text-2xl sm:text-3xl md:text-6xl font-bold mb-3 sm:mb-4 leading-tight">
                          {heroText.title.split('\n').map((line, idx) => (
                            <span key={idx}>
                              {idx > 0 && <span className="block text-primary">{line}</span>}
                              {idx === 0 && line}
                            </span>
                          ))}
                        </h1>
                        <p className="text-sm sm:text-base md:text-xl text-gray-200 mb-6 sm:mb-8 max-w-2xl mx-auto leading-relaxed px-2">
                          {heroText.subtitle}
                        </p>
                        {heroText.buttonText && heroText.buttonUrl ? (
                          <Button 
                            className="w-full sm:w-fit px-6 py-3 sm:py-5 h-auto text-sm sm:text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
                            onClick={() => {
                              if (heroText.buttonUrl?.startsWith('http')) {
                                window.open(heroText.buttonUrl, '_blank');
                              } else {
                                setLocation(heroText.buttonUrl || '/');
                              }
                            }}
                            data-testid="button-custom-hero"
                          >
                            {heroText.buttonText}
                          </Button>
                        ) : !user ? (
                          <Button 
                            className="w-fit px-8 py-3 sm:py-4 h-auto text-sm sm:text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg"
                            onClick={() => setLocation('/auth')}
                            data-testid="button-join-community"
                          >
                            Join Community
                          </Button>
                        ) : !userHasContent && (
                          <Button 
                            className="w-full sm:w-fit px-6 py-3 sm:py-5 h-auto text-sm sm:text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
                            onClick={() => setLocation('/upload')}
                            data-testid="button-start-building"
                          >
                            Start Building Now
                          </Button>
                        )}
                      </>
                    ) : (
                      <div className="space-y-4">
                        <Skeleton className="h-12 sm:h-16 md:h-24 w-full max-w-2xl mx-auto bg-white/10" />
                        <Skeleton className="h-6 sm:h-8 w-3/4 max-w-xl mx-auto bg-white/10" />
                        <Skeleton className="h-12 w-40 mx-auto bg-white/10" />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}

        {/* Slide Indicators */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {Array.from({ length: slidesCount }).map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                currentSlide === index
                  ? 'w-6 bg-primary'
                  : 'w-2 bg-white/40 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

const HomePage = () => {
  const [feedPeriod, setFeedPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [selectedGameFilter, setSelectedGameFilter] = useState<string | null>(null);
  const [selectedScreenshot, setSelectedScreenshot] = useState<any>(null);
  const [, setLocation] = useLocation();
  const screenshotsScrollRef = useRef<HTMLDivElement>(null);
  const [screenshotsDragging, setScreenshotsDragging] = useState(false);
  const [screenshotsDragStart, setScreenshotsDragStart] = useState(0);
  const [screenshotsScrollStart, setScreenshotsScrollStart] = useState(0);
  
  // Get current user from auth context
  const { user } = useAuth();
  const userId = user?.id;

  // Query trending clips for trending content section (excludes reels)
  const { data: trendingClipsData, isLoading: isLoadingTrendingClips } = useQuery<ClipWithUser[]>({
    queryKey: ['/api/clips/trending'],
    queryFn: async () => {
      const response = await fetch('/api/clips/trending');
      if (!response.ok) {
        throw new Error('Failed to fetch trending clips');
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

  const { data: latestScreenshots, isLoading: isLoadingScreenshots } = useQuery<ClipWithUser[]>({
    queryKey: ['/api/screenshots', 'recent'],
    queryFn: async () => {
      const response = await fetch('/api/screenshots?period=recent&limit=12');
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

  const { data: dbHeroSlides } = useQuery<DbHeroSlide[]>({
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

  const slideIntervalMs = (heroSlideSettings?.intervalSeconds || 6) * 1000;

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
    <div className="pb-16 md:pb-8">
      {/* Email Verification Banner - Only for authenticated users */}
      {user && (
        <div className="mx-2 sm:mx-4 md:mx-6 mb-0">
          <EmailVerificationBanner />
        </div>
      )}
      
      {/* Hero Slideshow Section - hidden when all DB slides are disabled */}
      {(!dbHeroSlides || dbHeroSlides.length > 0) && (
        <HeroBannerSlideshow 
          heroText={heroText}
          user={user}
          userHasContent={userHasContent}
          setLocation={setLocation}
          dbSlides={dbHeroSlides}
          slideIntervalMs={slideIntervalMs}
        />
      )}
      
      <div className="space-y-4 sm:space-y-6 md:space-y-8 mt-4 sm:mt-6 md:mt-8">
      {/* Recommended for You Section */}
      <LazySection minHeight="300px" rootMargin="300px">
        <RecommendedForYou userId={userId} />
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

      {/* Latest Screenshots Section */}
      <LazySection minHeight="400px" rootMargin="200px">
        <section className="px-4 sm:px-6 md:px-8 pt-6 sm:pt-8">
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
                className="absolute -left-5 top-[35%] -translate-y-1/2 z-10 bg-black/70 hover:bg-black/90 text-white p-2.5 rounded-full transition-colors hidden sm:flex items-center justify-center shadow-lg"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => { if (screenshotsScrollRef.current) { screenshotsScrollRef.current.scrollLeft += 480; } }}
                className="absolute -right-5 top-[35%] -translate-y-1/2 z-10 bg-black/70 hover:bg-black/90 text-white p-2.5 rounded-full transition-colors hidden sm:flex items-center justify-center shadow-lg"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <div
                ref={screenshotsScrollRef}
                className={`flex gap-5 overflow-x-auto scrollbar-hide pb-4 select-none ${screenshotsDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
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
            <div className="text-center py-8 sm:py-12 bg-card/50 rounded-xl border border-border/50 mx-2">
              <Camera className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">No Screenshots Yet</h3>
              <p className="text-muted-foreground text-sm px-4">
                Be the first to share a screenshot!
              </p>
            </div>
          )}
        </section>
      </LazySection>
      </div>

      <ScreenshotLightbox
        screenshot={selectedScreenshot}
        onClose={() => setSelectedScreenshot(null)}
        currentUserId={user?.id}
        screenshots={latestScreenshots || []}
        onNavigate={(s: any) => setSelectedScreenshot(s)}
      />
    </div>
  );
};

export default HomePage;