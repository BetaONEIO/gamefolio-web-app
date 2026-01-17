import { useState, useMemo, useRef } from "react";
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
import { useLocation, Link } from "wouter";
import { EmailVerificationBanner } from "@/components/auth/EmailVerificationBanner";
import { LatestReelsCarousel } from "@/components/clips/LatestReelsCarousel";
import RecommendedForYou from "@/components/home/RecommendedForYou";

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

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    
    const container = scrollRef.current;
    const itemWidth = window.innerWidth < 640 ? 280 : 480; // Responsive item width
    const scrollAmount = itemWidth * (window.innerWidth < 640 ? 1 : 2); // Scroll by 1 item on mobile, 2 on desktop
    
    if (direction === 'left') {
      container.scrollLeft -= scrollAmount;
    } else {
      container.scrollLeft += scrollAmount;
    }
  };

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

const HomePage = () => {
  const [feedPeriod, setFeedPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [selectedGameFilter, setSelectedGameFilter] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  
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
      const response = await fetch('/api/reels/latest?limit=6');
      if (!response.ok) {
        throw new Error('Failed to fetch latest reels');
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
    <div className="space-y-4 sm:space-y-6 md:space-y-8 pb-16 md:pb-8">
      {/* Email Verification Banner - Only for authenticated users */}
      {user && (
        <div className="mx-2 sm:mx-4 md:mx-6">
          <EmailVerificationBanner />
        </div>
      )}
      
      {/* Hero Section */}
      <section className="relative overflow-hidden -mx-2 md:-mx-6 -mt-2 md:-mt-4">
        <div className="relative">
          <div 
            className="h-[300px] sm:h-[350px] md:h-[500px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center bg-cover bg-center"
            style={{
              backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.8)), url(${ForzaGif})`,
            }}
          >
            <div className="text-center text-white px-4 sm:px-6 max-w-4xl">
              {heroText ? (
                <>
                  <h1 className="text-2xl sm:text-3xl md:text-6xl font-bold mb-3 sm:mb-4 leading-tight">
                    {heroText.title.split('\n').map((line, index) => (
                      <span key={index}>
                        {index > 0 && <span className="block text-primary">{line}</span>}
                        {index === 0 && line}
                      </span>
                    ))}
                  </h1>
                  <p className="text-sm sm:text-base md:text-xl text-gray-200 mb-6 sm:mb-8 max-w-2xl mx-auto leading-relaxed px-2">
                    {heroText.subtitle}
                  </p>
                  {/* Show custom button if provided, otherwise show default buttons */}
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
                      className="w-full sm:w-fit px-6 py-3 sm:py-5 h-auto text-sm sm:text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
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
                /* Loading state to prevent text swap */
                <div className="space-y-4">
                  <Skeleton className="h-12 sm:h-16 md:h-24 w-full max-w-2xl mx-auto bg-white/10" />
                  <Skeleton className="h-6 sm:h-8 w-3/4 max-w-xl mx-auto bg-white/10" />
                  <Skeleton className="h-12 w-40 mx-auto bg-white/10" />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
      
      {/* Recommended for You Section */}
      <RecommendedForYou userId={userId} />
      
      {/* Latest Clips Section */}
      <section className="px-2 sm:px-4 md:px-6">
        <div className="flex justify-between items-center mb-4 sm:mb-6 md:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold">Latest Clips</h2>
          <Link href="/latest-clips" className="text-primary text-sm font-medium hover:underline flex items-center">
            View all <ChevronRight className="h-4 w-4 ml-1" />
          </Link>
        </div>

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

      {/* Latest Reels Section (9:16 aspect ratio) */}
      <section className="px-2 sm:px-4 md:px-6 pt-6 sm:pt-8">
        <div className="flex justify-between items-center mb-4 sm:mb-6 md:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold">Latest Reels</h2>
          <Link href="/latest-reels" className="text-primary text-sm font-medium hover:underline flex items-center">
            View all <ChevronRight className="h-4 w-4 ml-1" />
          </Link>
        </div>

        <LatestReelsCarousel 
          reels={latestReels}
          isLoading={isLoadingReels}
          userId={userId}
        />
      </section>



    </div>
  );
};

export default HomePage;