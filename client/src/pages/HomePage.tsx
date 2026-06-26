import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import VideoClipGridItem from "@/components/clips/VideoClipGridItem";
import { MobileTrendingViewer } from "@/components/clips/MobileTrendingViewer";
import TrendingGameCard from "@/components/clips/TrendingGameCard";
import GameClipsSection from "@/components/clips/GameClipsSection";
import { LazyImage } from "@/components/ui/lazy-image";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipWithUser, Game } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useBlockedUsers } from "@/hooks/use-blocked-users";
import { ChevronRight, ChevronLeft, Video, Plus, Camera, Image, Eye } from "lucide-react";
import BannerImage from "@assets/Untitled (1920 x 1080 px).png";
import ForzaGif from "@assets/video-720-ezgif.com-optimize_1756741905949.gif";
import { useLocation, Link } from "wouter";
import FeaturedUsersSection from "@/components/home/FeaturedUsersSection";
import RecommendedForYou from "@/components/home/RecommendedForYou";
import TrendingHeroSlide from "@/components/home/TrendingSlider";
import { EcosystemActivityRail } from "@/components/home/EcosystemActivityRail";
import { DailyXPChallenges } from "@/components/home/DailyXPChallenges";
import { LiveStreamsSection } from "@/components/home/LiveStreamsSection";
import FeaturedGamefolioBanner from "@/components/home/FeaturedGamefolioBanner";
import { ProfileHoverCard } from "@/components/ui/ProfileHoverCard";
import { useClipDialog } from "@/hooks/use-clip-dialog";
import { useMobile } from "@/hooks/use-mobile";
import { apiRequest, queryClient as globalQueryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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

interface HeroSlide {
  id: number;
  title: string;
  subtitle: string | null;
  buttonText: string | null;
  buttonLink: string | null;
  imageUrl: string;
  displayOrder: number;
  isActive: boolean;
}

const HomePage = () => {
  const [feedPeriod, setFeedPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [selectedGameFilter, setSelectedGameFilter] = useState<string | null>(null);
  const [activeContentTab, setActiveContentTab] = useState<'clips' | 'reels' | 'screenshots'>('clips');
  const [reelsViewer, setReelsViewer] = useState<number | null>(null);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  // Hero carousel state
  const [currentSlide, setCurrentSlide] = useState(0);
  const slideTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  
  // Refs for grab scroll behavior
  const trendingGamesRef = useRef<HTMLDivElement>(null);
  const reelsContainerRef = useRef<HTMLDivElement>(null);
  
  // Get current user from auth context
  const { user } = useAuth();
  const userId = user?.id;
  const { blockedUserIds } = useBlockedUsers();
  const { openClipDialog } = useClipDialog();
  const isMobile = useMobile();
  const { toast } = useToast();

  const { data: heroSlides } = useQuery<HeroSlide[]>({
    queryKey: ["/api/hero-slides"],
    staleTime: 10000,
    refetchOnWindowFocus: true,
  });

  const { data: heroSettings } = useQuery<{ intervalSeconds: number }>({
    queryKey: ["/api/hero-slides/settings"],
    staleTime: 30000,
  });

  const slideIntervalMs = (heroSettings?.intervalSeconds || 6) * 1000;

  const activeSlides = useMemo(() => {
    if (!heroSlides || heroSlides.length === 0) return null;
    return heroSlides;
  }, [heroSlides]);

  // Trending slide is always prepended as slide 0
  const allSlides = useMemo(() => {
    const heroSlideItems = activeSlides ?? [];
    return [{ id: '__trending__', type: 'trending' as const }, ...heroSlideItems] as Array<
      { id: string; type: 'trending' } | (typeof heroSlideItems[number])
    >;
  }, [activeSlides]);

  const resetSlideTimer = useCallback(() => {
    if (slideTimerRef.current) clearInterval(slideTimerRef.current);
    if (isVideoPlaying) return; // pause while clip is playing
    if (allSlides.length > 1) {
      slideTimerRef.current = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % allSlides.length);
      }, slideIntervalMs);
    }
  }, [allSlides, slideIntervalMs, isVideoPlaying]);

  useEffect(() => {
    resetSlideTimer();
    return () => { if (slideTimerRef.current) clearInterval(slideTimerRef.current); };
  }, [resetSlideTimer]);

  useEffect(() => {
    if (currentSlide >= allSlides.length) setCurrentSlide(0);
  }, [allSlides, currentSlide]);

  // Re-run timer when video playing state changes
  useEffect(() => { resetSlideTimer(); }, [isVideoPlaying]);

  const goToSlide = useCallback((idx: number) => {
    setCurrentSlide(idx);
    resetSlideTimer();
  }, [resetSlideTimer]);

  const nextSlide = useCallback(() => {
    goToSlide((currentSlide + 1) % allSlides.length);
  }, [allSlides, currentSlide, goToSlide]);

  const prevSlide = useCallback(() => {
    goToSlide((currentSlide - 1 + allSlides.length) % allSlides.length);
  }, [allSlides, currentSlide, goToSlide]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const proPayment = params.get("pro_payment");
    const sessionId = params.get("session_id");
    const plan = params.get("plan");

    if (proPayment === "success" && sessionId && plan) {
      apiRequest("POST", "/api/stripe/confirm-pro-subscription", { sessionId, plan })
        .then(() => {
          globalQueryClient.invalidateQueries({ queryKey: ["/api/user"] });
          toast({
            title: "Welcome to Pro!",
            description: "Your Gamefolio Pro subscription is now active.",
            variant: "gamefolioSuccess",
          });
        })
        .catch(() => {});
      window.history.replaceState({}, "", "/");
    }
  }, [toast]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Aggressively clear all old game cache
  useEffect(() => {
    // Clear all old game API cache
    queryClient.clear();
    queryClient.invalidateQueries();
  }, [queryClient]);

  // Function to refresh all like statuses
  const refreshAllLikeStatuses = () => {
    queryClient.invalidateQueries({ queryKey: ['clipLikeStatus'] });
  };

  // Add keyboard shortcut to refresh all likes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'L' && e.ctrlKey) {
        e.preventDefault();
        refreshAllLikeStatuses();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Automatically refresh all like statuses when component mounts
  useEffect(() => {
    // Small delay to ensure all clips are loaded first
    const timer = setTimeout(() => {
      refreshAllLikeStatuses();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  // Keyboard navigation for clips and reels
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't interfere with form inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        // Find the currently focused content grid
        const activeContent = document.querySelector(`[data-content-tab="${activeContentTab}"]`);
        if (activeContent) {
          const items = activeContent.querySelectorAll('[data-testid*="clip-"], [data-testid*="reel-"], [data-testid*="screenshot-"]');
          const currentFocused = document.activeElement;
          const currentIndex = Array.from(items).findIndex(item => item === currentFocused || item.contains(currentFocused));
          
          if (currentIndex !== -1) {
            e.preventDefault();
            let nextIndex;
            if (e.key === 'ArrowLeft') {
              nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
            } else {
              nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
            }
            (items[nextIndex] as HTMLElement)?.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeContentTab]);

  // Grab scroll behavior for trending games
  useEffect(() => {
    const container = trendingGamesRef.current;
    if (!container) return;

    let isDown = false;
    let startX: number;
    let scrollLeft: number;

    const handleMouseDown = (e: MouseEvent) => {
      isDown = true;
      startX = e.pageX - container.offsetLeft;
      scrollLeft = container.scrollLeft;
      container.style.cursor = 'grabbing';
      container.style.userSelect = 'none';
    };

    const handleMouseLeave = () => {
      isDown = false;
      container.style.cursor = 'grab';
      container.style.userSelect = 'auto';
    };

    const handleMouseUp = () => {
      isDown = false;
      container.style.cursor = 'grab';
      container.style.userSelect = 'auto';
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - container.offsetLeft;
      const walk = (x - startX) * 2; // Scroll speed
      container.scrollLeft = scrollLeft - walk;
    };

    container.style.cursor = 'grab';
    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('mouseleave', handleMouseLeave);
    container.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('mousemove', handleMouseMove);

    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('mouseleave', handleMouseLeave);
      container.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // Grab scroll behavior for reels
  useEffect(() => {
    const container = reelsContainerRef.current;
    if (!container) return;

    let isDown = false;
    let startX: number;
    let scrollLeft: number;

    const handleMouseDown = (e: MouseEvent) => {
      // Only enable drag if clicking on the container itself, not on video items
      if ((e.target as HTMLElement).closest('[data-testid*="reel-"]')) {
        return;
      }
      isDown = true;
      startX = e.pageX - container.offsetLeft;
      scrollLeft = container.scrollLeft;
      container.style.cursor = 'grabbing';
      container.style.userSelect = 'none';
    };

    const handleMouseLeave = () => {
      isDown = false;
      container.style.cursor = 'grab';
      container.style.userSelect = 'auto';
    };

    const handleMouseUp = () => {
      isDown = false;
      container.style.cursor = 'grab';
      container.style.userSelect = 'auto';
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - container.offsetLeft;
      const walk = (x - startX) * 2; // Scroll speed
      container.scrollLeft = scrollLeft - walk;
    };

    container.style.cursor = 'grab';
    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('mouseleave', handleMouseLeave);
    container.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('mousemove', handleMouseMove);

    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('mouseleave', handleMouseLeave);
      container.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // Query all clips (used for popular clips section)
  const { data: userClips, isLoading: isLoadingUserClips } = useQuery<ClipWithUser[]>({
    queryKey: [`/api/clips`, Date.now()], // Force new query every time
    staleTime: 0,
    gcTime: 0, // Don't cache at all
  });

  // Latest screenshots — sorted newest first
  const { data: latestScreenshotsRaw, isLoading: isLoadingLatestScreenshots } = useQuery<any[]>({
    queryKey: ['/api/screenshots/latest'],
    queryFn: async () => {
      const response = await fetch('/api/screenshots/latest?limit=20', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch latest screenshots');
      return response.json();
    },
    staleTime: 0,
    gcTime: 0,
  });

  // Latest clips — dedicated endpoint sorted purely by upload date, newest first
  const { data: latestClipsRaw, isLoading: isLoadingLatestClips } = useQuery<ClipWithUser[]>({
    queryKey: ['/api/clips/latest'],
    queryFn: async () => {
      const response = await fetch('/api/clips/latest?limit=20', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch latest clips');
      return response.json();
    },
    staleTime: 0,
    gcTime: 0,
  });

  // Latest reels — sorted newest first
  const { data: latestReelsRaw, isLoading: isLoadingLatestReels } = useQuery<ClipWithUser[]>({
    queryKey: ['/api/reels/latest'],
    queryFn: async () => {
      const response = await fetch('/api/reels/latest?limit=20', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch latest reels');
      return response.json();
    },
    staleTime: 0,
    gcTime: 0,
  });

  // Filter screenshots from blocked users
  const latestScreenshots = useMemo(() =>
    (latestScreenshotsRaw ?? []).filter((s: any) => !blockedUserIds.has(s.userId)),
    [latestScreenshotsRaw, blockedUserIds]
  );

  // Latest clips (already sorted newest first by the backend), with blocked users filtered out
  const latestClips = useMemo(() =>
    (latestClipsRaw ?? []).filter(c => !blockedUserIds.has(c.userId)),
    [latestClipsRaw, blockedUserIds]
  );

  // Latest reels (already sorted newest first by the backend), with blocked users filtered out
  const latestReels = useMemo(() =>
    (latestReelsRaw ?? []).filter(c => !blockedUserIds.has(c.userId)),
    [latestReelsRaw, blockedUserIds]
  );

  // Filter user clips by game name instead of ID
  const filteredClips = useMemo(() => {
    if (!userClips) return [];
    const nonBlocked = userClips.filter(clip => !blockedUserIds.has(clip.userId));
    
    if (selectedGameFilter && selectedGameFilter !== 'all') {
      return nonBlocked.filter(clip => {
        const gameName = clip.game?.name || '';
        const gameSlug = gameName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        return gameSlug.includes(selectedGameFilter) || 
               selectedGameFilter.includes(gameSlug) ||
               (selectedGameFilter === 'minecraft' && 
                (gameName.toLowerCase().includes('minecraft') || 
                 clip.gameId === 7 || 
                 clip.gameId === 6252));
      });
    }
    
    return nonBlocked;
  }, [userClips, selectedGameFilter, blockedUserIds]);

  const popularClips = useMemo(() => {
    if (!userClips) return [];
    return [...userClips]
      .filter(c => !blockedUserIds.has(c.userId))
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, 4);
  }, [userClips, blockedUserIds]);
  
  const isLoadingClips = isLoadingLatestClips || isLoadingLatestReels;

  // Apply game filter to latestClips for the "Latest Clips" section (same order as dedicated page)
  const filteredLatestClips = useMemo(() => {
    if (!latestClips.length) return [];
    if (selectedGameFilter && selectedGameFilter !== 'all') {
      return latestClips.filter(clip => {
        const gameName = clip.game?.name || '';
        const gameSlug = gameName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        return gameSlug.includes(selectedGameFilter) ||
               selectedGameFilter.includes(gameSlug) ||
               (selectedGameFilter === 'minecraft' &&
                (gameName.toLowerCase().includes('minecraft') ||
                 clip.gameId === 7 || clip.gameId === 6252));
      });
    }
    return latestClips;
  }, [latestClips, selectedGameFilter]);

  // Use filtered latest clips for the main display (newest first, same as dedicated page)
  const topClips = filteredLatestClips;

  // Get trending games from Twitch API (same as explore page)
  const { 
    data: twitchTrendingGames, 
    isLoading: isLoadingTwitchGames,
  } = useQuery<Game[]>({
    queryKey: ["/api/twitch/games/top"],
    queryFn: async () => {
      const response = await fetch("/api/twitch/games/top");
      if (!response.ok) {
        throw new Error('Failed to fetch trending games from Twitch');
      }
      return response.json();
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  // Remove fallback - only use Twitch API data

  // Always use Twitch trending games - no fallback to local games  
  const displayedTrendingGames = twitchTrendingGames;
  const isLoadingGames = isLoadingTwitchGames;

  return (
    <>
    <div className="space-y-16 max-w-none px-4 md:px-6 py-4 md:py-6">
      {/* Hero Banner Carousel — trending slide is always index 0 */}
      <section className="mb-10 -mx-4 md:-mx-6 -mt-4 md:-mt-6">
        <div className="relative w-full min-h-[350px] md:min-h-[450px] lg:min-h-[500px] xl:min-h-[550px] bg-black overflow-hidden border-b-2 border-primary">
          {allSlides.map((slide, idx) => (
            <div
              key={slide.id}
              className="absolute inset-0 transition-opacity duration-700 ease-in-out"
              style={{ opacity: idx === currentSlide ? 1 : 0, zIndex: idx === currentSlide ? 1 : 0 }}
            >
              {'type' in slide && slide.type === 'trending' ? (
                <TrendingHeroSlide onPlayingChange={setIsVideoPlaying} />
              ) : (
                <>
                  <img
                    src={(slide as any).imageUrl}
                    alt={(slide as any).title}
                    className="w-full h-full object-cover absolute inset-0"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent">
                    <div className="flex flex-col items-start justify-center h-full max-w-3xl p-8 md:p-12">
                      <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight drop-shadow-md">
                        {(slide as any).title}
                      </h1>
                      {(slide as any).subtitle && (
                        <h2 className="text-2xl md:text-3xl font-semibold text-primary mb-6 leading-tight drop-shadow-lg">
                          {(slide as any).subtitle}
                        </h2>
                      )}
                      {(slide as any).buttonText && (
                        <Button
                          className="w-fit px-6 py-5 h-auto text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground mt-4"
                          onClick={() => {
                            const link = ((slide as any).buttonLink || '').toLowerCase();
                            if (link === '#pro' || link === '/pro' || link.includes('pro')) {
                              window.dispatchEvent(new CustomEvent('open-pro-upgrade'));
                            } else {
                              setLocation((slide as any).buttonLink);
                            }
                          }}
                        >
                          {(slide as any).buttonText}
                        </Button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}

          {/* Carousel nav — always shown (trending + hero slides) */}
          {allSlides.length > 1 && (
            <>
              <button
                onClick={prevSlide}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-30 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
                aria-label="Previous slide"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-30 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
                aria-label="Next slide"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex gap-2">
                {allSlides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => goToSlide(idx)}
                    className={`h-2.5 rounded-full transition-all ${idx === currentSlide ? 'bg-primary w-6' : 'w-2.5 bg-white/50 hover:bg-white/80'}`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Featured Gamefolio — Official Profile */}
      <section className="px-0">
        <FeaturedGamefolioBanner />
      </section>

      {/* Ecosystem Activity Rail */}
      <EcosystemActivityRail />
      
      {/* Latest Clips Section */}
      <section className="px-0">
        <Tabs value={activeContentTab} onValueChange={(value) => setActiveContentTab(value as 'clips' | 'reels' | 'screenshots')} className="w-full">
          <div className="flex justify-between items-center mb-8">
            <TabsList className="grid w-fit grid-cols-3">
              <TabsTrigger value="clips" className="flex items-center gap-2">
                <Video className="h-4 w-4" />
                Clips
              </TabsTrigger>
              <TabsTrigger value="reels" className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Reels
              </TabsTrigger>
              <TabsTrigger value="screenshots" className="flex items-center gap-2">
                <Image className="h-4 w-4" />
                Screenshots
              </TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-4">
              <Button 
                className="flex items-center gap-2"
                onClick={() => setLocation('/upload')}
              >
                <Plus className="h-4 w-4" />
                Upload {activeContentTab === 'clips' ? 'Clip' : activeContentTab === 'reels' ? 'Reel' : 'Screenshot'}
              </Button>
              <a href="/explore" className="text-primary text-sm font-medium hover:underline flex items-center">
                View all <ChevronRight className="h-4 w-4 ml-1" />
              </a>
            </div>
          </div>

          {/* Clips Tab Content */}
          <TabsContent value="clips" className="space-y-6" data-content-tab="clips">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 md:gap-4">
              {isLoadingClips ? (
                Array(6).fill(0).map((_, i) => (
                  <div key={`clips-skeleton-${i}`} className="aspect-video rounded-lg overflow-hidden">
                    <Skeleton className="w-full h-full" />
                  </div>
                ))
              ) : (
                latestClips?.slice(0, 6).map((clip: ClipWithUser) => (
                  <VideoClipGridItem 
                    key={`clip-${clip.id}`}
                    clip={clip}
                    userId={userId}
                    compact={true}
                    clipsList={latestClips ?? undefined}
                  />
                ))
              )}
            </div>
            {!isLoadingClips && (!latestClips || latestClips.length === 0) && (
              <div className="text-center py-12">
                <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No clips yet</h3>
                <p className="text-muted-foreground mb-4">Upload your first gaming clip to get started!</p>
                <Button onClick={() => {
                  sessionStorage.setItem('uploadContentType', 'clips');
                  setLocation('/upload');
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Upload
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Reels Tab Content */}
          <TabsContent value="reels" className="space-y-6" data-content-tab="reels">
            {isLoadingLatestReels ? (
              <div className={isMobile ? "columns-2 gap-1" : "grid grid-cols-4 gap-4"}>
                {Array(8).fill(0).map((_, i) => (
                  <div key={`reels-skeleton-${i}`} className={isMobile ? "break-inside-avoid mb-1 aspect-[9/16]" : "aspect-[9/16]"}>
                    <Skeleton className="w-full h-full rounded-xl" />
                  </div>
                ))}
              </div>
            ) : latestReels.length > 0 ? (
              isMobile ? (
                // Mobile: Masonry grid with 2 columns
                <div className="columns-2 gap-1">
                  {latestReels.map((reel, index) => {
                    const aspectRatios = ['aspect-[9/14]', 'aspect-[9/16]', 'aspect-[9/18]'];
                    const aspectRatio = aspectRatios[index % aspectRatios.length];

                    return (
                      <div 
                        key={`reel-${reel.id}`}
                        onClick={() => setReelsViewer(index)}
                        className="break-inside-avoid mb-1"
                      >
                        <div className={`relative ${aspectRatio} w-full rounded-sm overflow-hidden cursor-pointer group`}>
                          {/* Thumbnail */}
                          <LazyImage
                            src={reel.thumbnailUrl || `/api/clips/${reel.id}/thumbnail`}
                            alt={reel.title}
                            className="w-full h-full object-cover"
                            showLoadingSpinner={true}
                            rootMargin="100px"
                            threshold={0.1}
                          />
                          
                          {/* Subtle gradient overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
                          
                          {/* Username - top left */}
                          <div className="absolute top-2 left-2 flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded-full overflow-hidden border border-white/50">
                              <img
                                src={reel.user.avatarUrl || '/uploaded_assets/gamefolio-logo-green.png'}
                                alt={reel.user.displayName}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <ProfileHoverCard username={reel.user.username}>
                              <span className="text-white text-xs font-medium drop-shadow-lg cursor-default">
                                {reel.user.displayName || reel.user.username}
                              </span>
                            </ProfileHoverCard>
                          </div>
                          
                          {/* View count and game - bottom left */}
                          <div className="absolute bottom-2 left-2 flex items-center gap-2 text-white text-xs font-medium drop-shadow-lg">
                            <div className="flex items-center gap-1">
                              <Eye className="h-4 w-4" />
                              <span>{formatNumber(reel.views || 0)}</span>
                            </div>
                            {reel.game && (
                              <div className="bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-full">
                                {reel.game.name}
                              </div>
                            )}
                          </div>
                          
                          {/* Title overlay - some reels show title */}
                          {index % 3 === 0 && (
                            <div className="absolute bottom-8 left-2 right-2">
                              <p className="text-white text-sm font-medium line-clamp-2 drop-shadow-lg">
                                {reel.title}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                // Desktop: Grid with 4 columns
                <div className="grid grid-cols-4 gap-4 w-full">
                  {latestReels.map((reel, index) => (
                    <div 
                      key={`reel-${reel.id}`}
                      onClick={() => setReelsViewer(index)}
                      className="group relative bg-black rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer aspect-[9/16]"
                    >
                      {/* Thumbnail/Video */}
                      <div className="relative w-full h-full">
                        <LazyImage
                          src={reel.thumbnailUrl || `/api/clips/${reel.id}/thumbnail`}
                          alt={reel.title}
                          className="w-full h-full object-cover"
                          showLoadingSpinner={true}
                          rootMargin="100px"
                          threshold={0.1}
                        />

                        {/* Gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

                        {/* Play button overlay */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
                            <svg className="w-8 h-8 text-white fill-white" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z"/>
                            </svg>
                          </div>
                        </div>

                        {/* Content overlay */}
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          {/* User info */}
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white/50">
                              <img
                                src={reel.user.avatarUrl || '/uploaded_assets/gamefolio-logo-green.png'}
                                alt={reel.user.displayName}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <ProfileHoverCard username={reel.user.username}>
                              <span className="text-white text-sm font-medium cursor-default">
                                {reel.user.displayName || reel.user.username}
                              </span>
                            </ProfileHoverCard>
                          </div>

                          {/* Title */}
                          <h3 className="text-white font-semibold text-sm mb-2 line-clamp-2 leading-tight">
                            {reel.title}
                          </h3>

                          {/* Stats and game */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 text-white/80 text-xs">
                              <span className="flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                {formatNumber(reel.views || 0)}
                              </span>
                              <span className="flex items-center gap-1">
                                ♥ {formatNumber(parseInt(reel._count?.likes?.toString() || '0'))}
                              </span>
                              <span className="flex items-center gap-1">
                                💬 {formatNumber(parseInt(reel._count?.comments?.toString() || '0'))}
                              </span>
                            </div>

                            {/* Game badge */}
                            {reel.game && (
                              <div className="bg-primary text-[#071013] text-xs px-2 py-1 rounded-full">
                                {reel.game.name}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className="text-center py-12">
                <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No reels yet</h3>
                <p className="text-muted-foreground mb-4">Upload your first vertical gaming reel!</p>
                <Button onClick={() => {
                  sessionStorage.setItem('uploadContentType', 'reels');
                  setLocation('/upload');
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Upload Reel
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Screenshots Tab Content */}
          <TabsContent value="screenshots" className="space-y-6" data-content-tab="screenshots">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 md:gap-6">
              {latestScreenshots?.slice(0, 12).map((screenshot) => (
                <div 
                  key={`screenshot-${screenshot.id}`} 
                  className="relative overflow-hidden rounded-xl cursor-pointer group shadow-lg transition-all duration-500 aspect-video"
                  onClick={() => setLocation(`/view/screenshot/${screenshot.id}`)}
                >
                  <img 
                    src={screenshot.imageUrl || screenshot.thumbnailUrl || undefined} 
                    alt={screenshot.title}
                    className="w-full h-full object-cover"
                  />
                  {/* View count overlay on hover */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <div className="flex items-center gap-2 text-white">
                      <Eye size={20} />
                      <span className="text-lg font-semibold">{screenshot.views || 0}</span>
                    </div>
                  </div>
                  
                  {/* Bottom overlay for title */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3">
                    <div className="space-y-1">
                      <h4 className="text-white text-sm font-medium line-clamp-2 leading-tight">{screenshot.title}</h4>
                      {screenshot.user && (
                        <ProfileHoverCard username={screenshot.user.username}>
                          <Link href={`/profile/${screenshot.user.username}`} onClick={(e) => e.stopPropagation()}>
                            <p className="text-white/80 hover:text-white text-xs cursor-pointer transition-colors">
                              {screenshot.user.displayName || screenshot.user.username}
                            </p>
                          </Link>
                        </ProfileHoverCard>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {(!latestScreenshots || latestScreenshots.length === 0) && !isLoadingLatestScreenshots && (
              <div className="text-center py-12">
                <Image className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No screenshots yet</h3>
                <p className="text-muted-foreground mb-4">Capture and share your best gaming moments!</p>
                <Button onClick={() => setLocation('/upload')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Upload Screenshot
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </section>

      {/* Daily XP Challenges */}
      {/* <DailyXPChallenges /> */}

      {/* Live Streams Section */}
      {/* <LiveStreamsSection /> */}

      {/* Recommended for You Section - Only show for authenticated users */}
      {user && <RecommendedForYou userId={user.id} />}
      
      {/* Trending Gamefolios Section */}
      <section className="mt-16 px-0">
        <FeaturedUsersSection />
      </section>

      {/* Trending Games Section */}
      <section className="mt-16 px-0">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-medium text-foreground">Trending Games</h2>
          <Link 
            href="/explore" 
            className="text-primary text-sm font-medium hover:underline flex items-center"
          >
            View all <ChevronRight className="h-4 w-4 ml-1" />
          </Link>
        </div>

        <div className="overflow-x-auto pb-2 -mx-4 px-4" ref={trendingGamesRef} style={{ scrollbarWidth: 'thin' }}>
          <div className="flex gap-2" style={{ minWidth: "100%", width: "max-content" }}>
            {isLoadingTwitchGames ? (
              Array(10).fill(0).map((_, i) => (
                <div key={i} className="relative overflow-hidden rounded-lg shadow w-[140px] flex-shrink-0">
                  <Skeleton className="w-full h-20" />
                  <div className="absolute bottom-0 left-0 w-full p-2">
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))
            ) : (
              twitchTrendingGames?.slice(0, 10).map((game) => (
                <div className="w-[140px] flex-shrink-0" key={game.id}>
                  <TrendingGameCard game={game} />
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="mt-1 text-[9px] text-muted-foreground flex justify-end">
          <span>Data: Twitch API</span>
        </div>
      </section>
      
      {/* Latest Clips Section */}
      <section className="mt-16 px-0">
        <div className="flex justify-between items-center mb-8">
          <div className="flex flex-col">
            <h2 className="text-3xl font-bold text-foreground border-b-4 border-primary pb-2 inline-block mb-3">Latest Clips</h2>
            <div className="flex flex-wrap gap-2 py-1">
              {POPULAR_GAMES.map((game) => (
                <Button 
                  key={game.id}
                  variant={selectedGameFilter === game.id || (game.id === 'all' && selectedGameFilter === null) ? "default" : "outline"} 
                  size="sm" 
                  className="rounded-full text-xs h-7 px-3"
                  onClick={() => {
                    setSelectedGameFilter(game.id === 'all' ? null : game.id);
                    // This will trigger a refetch of the clips filtered by game
                  }}
                >
                  {game.name}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex bg-secondary rounded-lg p-1">
            <Button
              variant={feedPeriod === 'day' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFeedPeriod('day')}
              className={feedPeriod === 'day' ? 'text-primary-foreground' : 'text-muted-foreground'}
            >
              Today
            </Button>
            <Button
              variant={feedPeriod === 'week' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFeedPeriod('week')}
              className={feedPeriod === 'week' ? 'text-primary-foreground' : 'text-muted-foreground'}
            >
              Week
            </Button>
            <Button
              variant={feedPeriod === 'month' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFeedPeriod('month')}
              className={feedPeriod === 'month' ? 'text-primary-foreground' : 'text-muted-foreground'}
            >
              Month
            </Button>
          </div>
        </div>

        {/* Clips Grid - Optimized for larger screens */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 md:gap-8">
          {isLoadingClips ? (
            // Skeleton loaders for grid items
            Array(2).fill(0).map((_, i) => (
              <div key={`clip-skeleton-${i}`} className="aspect-video rounded-lg overflow-hidden">
                <Skeleton className="w-full h-full" />
              </div>
            ))
          ) : (
            // Show just 2 clips but much larger
            topClips?.slice(0, 2).map((clip) => (
              <VideoClipGridItem 
                key={clip.id} 
                clip={clip} 
                userId={userId}
                clipsList={topClips ?? undefined}
              />
            ))
          )}
        </div>
      </section>
      
      {/* Top-Rated Clips Section (Most Liked) */}
      <section className="mt-16 px-0">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-foreground border-b-4 border-primary pb-2 inline-block">Top-Rated Clips</h2>
          <a href="/explore?sort=popular" className="text-primary text-sm font-medium hover:underline flex items-center">
            View all <ChevronRight className="h-4 w-4 ml-1" />
          </a>
        </div>

        {/* Popular Clips Grid - Optimized for larger screens */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 md:gap-6">
          {isLoadingClips ? (
            // Skeleton loaders for grid items
            Array(4).fill(0).map((_, i) => (
              <div key={`popular-skeleton-${i}`} className="aspect-video rounded-lg overflow-hidden">
                <Skeleton className="w-full h-full" />
              </div>
            ))
          ) : (
            // Show popular clips
            popularClips?.slice(0, 4).map((clip: ClipWithUser) => (
              <VideoClipGridItem 
                key={clip.id} 
                clip={clip} 
                userId={userId}
                compact={true}
                clipsList={popularClips ?? undefined}
              />
            ))
          )}
        </div>
      </section>


    </div>

    {reelsViewer !== null && latestReels.length > 0 && (
      <MobileTrendingViewer
        content={latestReels}
        initialIndex={reelsViewer}
        onClose={() => setReelsViewer(null)}
        hideCloseButton={false}
      />
    )}

    </>
  );
};

export default HomePage;
