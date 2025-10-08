import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import VideoClipGridItem from "@/components/clips/VideoClipGridItem";
import TrendingGameCard from "@/components/clips/TrendingGameCard";
import GameClipsSection from "@/components/clips/GameClipsSection";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipWithUser, Game } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { ChevronRight, Video, Plus, Camera, Image, Eye } from "lucide-react";
import BannerImage from "@assets/Untitled (1920 x 1080 px).png";
import ForzaGif from "@assets/video-720-ezgif.com-optimize_1756741905949.gif";
import { useLocation, Link } from "wouter";
import FeaturedUsersSection from "@/components/home/FeaturedUsersSection";
import RecommendedForYou from "@/components/home/RecommendedForYou";
import { useClipDialog } from "@/hooks/use-clip-dialog";
import { useMobile } from "@/hooks/use-mobile";

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
  const [activeContentTab, setActiveContentTab] = useState<'clips' | 'reels' | 'screenshots'>('clips');
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  // Refs for grab scroll behavior
  const trendingGamesRef = useRef<HTMLDivElement>(null);
  const reelsContainerRef = useRef<HTMLDivElement>(null);
  
  // Get current user from auth context
  const { user } = useAuth();
  const userId = user?.id;
  const { openClipDialog } = useClipDialog();
  const isMobile = useMobile();

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

  // Query all clips to show in latest clips section
  const { data: userClips, isLoading: isLoadingUserClips } = useQuery<ClipWithUser[]>({
    queryKey: [`/api/clips`, Date.now()], // Force new query every time
    staleTime: 0,
    gcTime: 0, // Don't cache at all
  });
  
  // Filter user clips by game name instead of ID
  const filteredClips = useMemo(() => {
    if (!userClips) return [];
    
    if (selectedGameFilter && selectedGameFilter !== 'all') {
      // Filter by game name - convert both to lowercase and slugified format for comparison
      return userClips.filter(clip => {
        // Get the game name from clip data
        const gameName = clip.game?.name || '';
        
        // Convert to lowercase slug format (replace spaces and special chars with dashes)
        const gameSlug = gameName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        
        // Compare with selected filter
        return gameSlug.includes(selectedGameFilter) || 
               selectedGameFilter.includes(gameSlug) ||
               // Special case for Minecraft
               (selectedGameFilter === 'minecraft' && 
                (gameName.toLowerCase().includes('minecraft') || 
                 clip.gameId === 7 || 
                 clip.gameId === 6252));
      });
    }
    
    return userClips;
  }, [userClips, selectedGameFilter]);
  
  // Process user clips for different sections
  const latestClips = useMemo(() => {
    if (!userClips) {
      return [];
    }
    // Sort by newest first, handle null dates
    const sorted = [...userClips].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    }).slice(0, 20); // Increase to 20 clips to have more content
    return sorted;
  }, [userClips]);
  
  const popularClips = useMemo(() => {
    if (!userClips) return [];
    // Sort by most views
    return [...userClips].sort((a, b) => 
      (b.views || 0) - (a.views || 0)
    ).slice(0, 4);
  }, [userClips]);
  
  const isLoadingClips = isLoadingUserClips;

  // Use filtered clips for the main display
  const topClips = filteredClips;

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
    <div className="space-y-16 max-w-none">
      {/* Hero Banner - Full width with negative margin to compensate for parent padding */}
      <section className="mb-10 -mx-4 md:-mx-6 -mt-4 md:-mt-6">
        <div className="relative overflow-hidden">
          {/* Forza Racing GIF Background */}
          <div className="w-full bg-black relative min-h-[350px] md:min-h-[450px] lg:min-h-[500px] xl:min-h-[550px] border-b-2 border-primary">
            <img 
              src={ForzaGif} 
              alt="Epic racing gameplay - Build your Gamefolio" 
              className="w-full h-full object-cover"
            />
          </div>
          
          {/* Darker overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/70">
            <div className="flex flex-col items-start justify-center h-full max-w-3xl p-8 md:p-12">
              <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight drop-shadow-md">
                Build Your Gamefolio
              </h1>
              <h2 className="text-2xl md:text-3xl font-semibold text-primary mb-6 leading-tight drop-shadow-lg">
                With Your Best Gaming Clips
              </h2>
              <p className="text-gray-200 mb-8 max-w-lg text-base md:text-lg leading-relaxed">
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
        </div>
      </section>
      
      {/* Latest Clips Section */}
      <section className="px-4 md:px-6">
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
                  />
                ))
              )}
            </div>
            {!isLoadingClips && (!latestClips || latestClips.length === 0) && (
              <div className="text-center py-12">
                <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No clips yet</h3>
                <p className="text-muted-foreground mb-4">Upload your first gaming clip to get started!</p>
                <Button onClick={() => window.location.href = '/upload?type=clips'}>
                  <Plus className="h-4 w-4 mr-2" />
                  Upload
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Reels Tab Content */}
          <TabsContent value="reels" className="space-y-6" data-content-tab="reels">
            {isLoadingClips ? (
              <div className={isMobile ? "columns-2 gap-1" : "grid grid-cols-4 gap-4"}>
                {Array(8).fill(0).map((_, i) => (
                  <div key={`reels-skeleton-${i}`} className={isMobile ? "break-inside-avoid mb-1 aspect-[9/16]" : "aspect-[9/16]"}>
                    <Skeleton className="w-full h-full rounded-xl" />
                  </div>
                ))}
              </div>
            ) : latestClips?.filter(clip => clip.videoType === 'reel').length > 0 ? (
              isMobile ? (
                // Mobile: Masonry grid with 2 columns
                <div className="columns-2 gap-1">
                  {latestClips.filter(clip => clip.videoType === 'reel').map((reel, index) => {
                    const aspectRatios = ['aspect-[9/14]', 'aspect-[9/16]', 'aspect-[9/18]'];
                    const aspectRatio = aspectRatios[index % aspectRatios.length];

                    return (
                      <div 
                        key={`reel-${reel.id}`}
                        onClick={() => openClipDialog(reel.id, latestClips.filter(c => c.videoType === 'reel'))}
                        className="break-inside-avoid mb-1"
                      >
                        <div className={`relative ${aspectRatio} w-full rounded-sm overflow-hidden cursor-pointer group`}>
                          {/* Thumbnail */}
                          <img
                            src={reel.thumbnailUrl || `/api/clips/${reel.id}/thumbnail`}
                            alt={reel.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = "/placeholder-game.png";
                            }}
                          />
                          
                          {/* Subtle gradient overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
                          
                          {/* Username - top left */}
                          <div className="absolute top-2 left-2 flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded-full overflow-hidden border border-white/50">
                              <img
                                src={reel.user.avatarUrl || '/uploaded_assets/gamefolio social logo 3d circle web.png'}
                                alt={reel.user.displayName}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <span className="text-white text-xs font-medium drop-shadow-lg">
                              {reel.user.displayName || reel.user.username}
                            </span>
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
                  {latestClips.filter(clip => clip.videoType === 'reel').map((reel) => (
                    <div 
                      key={`reel-${reel.id}`}
                      onClick={() => openClipDialog(reel.id, latestClips.filter(c => c.videoType === 'reel'))}
                      className="group relative bg-black rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer aspect-[9/16]"
                    >
                      {/* Thumbnail/Video */}
                      <div className="relative w-full h-full">
                        <img
                          src={reel.thumbnailUrl || `/api/clips/${reel.id}/thumbnail`}
                          alt={reel.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = "/placeholder-game.png";
                          }}
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
                                src={reel.user.avatarUrl || '/uploaded_assets/gamefolio social logo 3d circle web.png'}
                                alt={reel.user.displayName}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <span className="text-white text-sm font-medium">
                              {reel.user.displayName || reel.user.username}
                            </span>
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
                              <div className="bg-primary/80 text-white text-xs px-2 py-1 rounded-full">
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
                <Button onClick={() => window.location.href = '/upload?type=reels'}>
                  <Plus className="h-4 w-4 mr-2" />
                  Upload Reel
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Screenshots Tab Content */}
          <TabsContent value="screenshots" className="space-y-6" data-content-tab="screenshots">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 md:gap-6">
              {latestClips?.filter(clip => clip.thumbnailUrl && !clip.videoUrl)?.slice(0, 12).map((screenshot, i) => (
                <div 
                  key={`screenshot-${screenshot.id}`} 
                  className="relative overflow-hidden rounded-xl cursor-pointer group shadow-lg transition-all duration-500 border aspect-video"
                  style={{ borderColor: 'rgba(255,255,255,0.05)' }}
                  onClick={() => window.open(`/view/screenshot/${screenshot.id}`, '_blank')}
                >
                  <img 
                    src={screenshot.thumbnailUrl || undefined} 
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
                      <Link href={`/profile/${screenshot.user.username}`} onClick={(e) => e.stopPropagation()}>
                        <p className="text-white/80 hover:text-white text-xs cursor-pointer transition-colors">
                          {screenshot.user.displayName || screenshot.user.username}
                        </p>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {(!latestClips || latestClips.filter(clip => clip.thumbnailUrl && !clip.videoUrl).length === 0) && (
              <div className="text-center py-12">
                <Image className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No screenshots yet</h3>
                <p className="text-muted-foreground mb-4">Capture and share your best gaming moments!</p>
                <Button onClick={() => window.location.href = '/upload'}>
                  <Plus className="h-4 w-4 mr-2" />
                  Upload Screenshot
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </section>

      {/* Recommended for You Section - Only show for authenticated users */}
      {user && <RecommendedForYou userId={user.id} />}
      
      {/* Featured Gamers Section */}
      <section className="mt-16 px-4 md:px-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-medium text-foreground">Featured Gamers</h2>
          <Link 
            href="/explore" 
            className="text-primary text-sm font-medium hover:underline flex items-center"
          >
            View all <ChevronRight className="h-4 w-4 ml-1" />
          </Link>
        </div>
        
        <FeaturedUsersSection />
      </section>

      {/* Trending Games Section */}
      <section className="mt-16 px-4 md:px-6">
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
      <section className="mt-16 px-4 md:px-6">
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
              />
            ))
          )}
        </div>
      </section>
      
      {/* Top-Rated Clips Section (Most Liked) */}
      <section className="mt-16 px-4 md:px-6">
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
              />
            ))
          )}
        </div>
      </section>


    </div>
  );
};

export default HomePage;
