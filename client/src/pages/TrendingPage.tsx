import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLikeScreenshot } from '@/hooks/use-clips';
import { useToast } from '@/hooks/use-toast';
import { ClipWithUser } from '@shared/schema';
import { TrendingUp, Clock, Calendar, CalendarDays, Gamepad2, Eye, MessageSquare, Share2, Heart, Play, MessageCircle, AlertTriangle, Film, Video, Camera, ChevronDown, Check } from 'lucide-react';
import { formatDuration } from '@/lib/constants';
import { formatDistance } from 'date-fns';
import { useClipDialog } from '@/hooks/use-clip-dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import VideoClipGridItem from '@/components/clips/VideoClipGridItem';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import { useMobile } from '@/hooks/use-mobile';
import { useSignedUrl } from '@/hooks/use-signed-url';
import { LazyImage } from '@/components/ui/lazy-image';
import { LikeButton } from '@/components/engagement/LikeButton';
import { FireButton } from '@/components/engagement/FireButton';
import { ReportButton } from '@/components/reporting/ReportButton';
import { MobileTrendingViewer } from '@/components/clips/MobileTrendingViewer';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';
import { UserIcon, X, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'wouter';
import { AgeRestrictionDialog } from '@/components/content/AgeRestrictionDialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { ScreenshotCard } from '@/components/screenshots/ScreenshotCard';
import { ScreenshotLightbox } from '@/components/screenshots/ScreenshotLightbox';

type ContentType = 'clips' | 'reels' | 'screenshots';
type FilterType = 'likes' | 'comments';
type TimePeriod = 'recent' | '1w' | '1m' | 'ever';

interface ScreenshotWithUser {
  id: number;
  title: string;
  description?: string;
  imageUrl: string;
  thumbnailUrl?: string;
  tags?: string[];
  views: number;
  ageRestricted?: boolean;
  createdAt: string;
  userId: number;
  user: {
    id: number;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  game?: {
    id: number;
    name: string;
    imageUrl?: string;
  };
  _count?: {
    likes?: number;
    reactions?: number;
    comments?: number;
  };
}

// Reel card component - TikTok/YouTube Shorts style
const ReelCard: React.FC<{ reel: ClipWithUser; reelsList: ClipWithUser[] }> = ({ reel, reelsList }) => {
  const { openClipDialog } = useClipDialog();

  const handleReelClick = (e: React.MouseEvent) => {
    e.preventDefault();
    openClipDialog(reel.id, reelsList); // Enable fullscreen mode for reels
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div 
      onClick={handleReelClick}
      className="group relative bg-black rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer aspect-[9/16]"
    >
      {/* Thumbnail/Video */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gray-800" />
        <LazyImage
          src={reel.thumbnailUrl || `/api/clips/${reel.id}/thumbnail`}
          alt={reel.title}
          className="w-full h-full object-cover"
          placeholder="data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='100'%20height='100'%3e%3crect%20width='100'%20height='100'%20fill='%231f2937'/%3e%3c/svg%3e"
          showLoadingSpinner={true}
          rootMargin="50px"
          containerClassName="absolute inset-0"
          fallback={
            <div className="w-full h-full flex items-center justify-center bg-gray-800">
              <Play className="h-12 w-12 text-gray-500" />
            </div>
          }
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="bg-primary backdrop-blur-sm rounded-full p-3">
            <svg className="w-6 h-6 text-white fill-white" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </div>

        {/* Duration badge - top left */}
        <div className="absolute top-3 left-3 bg-black/70 text-white text-xs px-2 py-1 rounded-md font-semibold">
          {(() => {
            const actualDuration = reel.trimEnd && reel.trimEnd > 0 
              ? reel.trimEnd - (reel.trimStart || 0)
              : reel.duration || 0;
            return formatDuration(actualDuration);
          })()}
        </div>

        {/* View count - top right */}
        <div className="absolute top-3 right-3 bg-black/70 text-white text-xs px-2 py-1 rounded-md font-semibold flex items-center gap-1">
          <Eye className="h-3 w-3" />
          {formatNumber(reel.views || 0)}
        </div>

        {/* Content overlay - left aligned bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          {/* Title */}
          <h3 className="text-white font-bold text-sm mb-0.5 drop-shadow-lg line-clamp-2">
            {reel.title}
          </h3>

          {/* Username */}
          <p className="text-white text-xs mb-1.5 drop-shadow-lg">
            @{reel.user.username}
          </p>

          {/* Game badge underneath username */}
          {reel.game && (
            <div className="inline-block bg-green-600 text-white text-[10px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap max-w-full overflow-hidden text-ellipsis">
              {reel.game.name}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const TrendingPage: React.FC = () => {
  const { user } = useAuth();
  const isMobile = useMobile();
  const { openClipDialog } = useClipDialog();
  const [activeTab, setActiveTab] = useState<ContentType>('clips');
  const [filter, setFilter] = useState<FilterType>('likes');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('recent');
  const [showMobileViewer, setShowMobileViewer] = useState(false);
  const [showContentDropdown, setShowContentDropdown] = useState(false);
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  const [selectedScreenshot, setSelectedScreenshot] = useState<ScreenshotWithUser | null>(null);
  const { signedUrl: screenshotSignedUrl } = useSignedUrl(selectedScreenshot?.imageUrl);
  const [ageRestrictionAccepted, setAgeRestrictionAccepted] = useState(false);
  const [showAgeRestrictionDialog, setShowAgeRestrictionDialog] = useState(false);
  const [isFollowingAuthor, setIsFollowingAuthor] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const isAcceptingRef = useRef(false);
  const screenshotsScrollRef = useRef<HTMLDivElement>(null);
  const [screenshotsDragging, setScreenshotsDragging] = useState(false);
  const [screenshotsDragStart, setScreenshotsDragStart] = useState(0);
  const [screenshotsScrollStart, setScreenshotsScrollStart] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch follow status when screenshot is selected
  const { data: followStatus } = useQuery({
    queryKey: ['/api/follow/status', selectedScreenshot?.user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/follow/status/${selectedScreenshot?.user?.id}`);
      if (!response.ok) return { following: false };
      return response.json();
    },
    enabled: !!selectedScreenshot && !!user && selectedScreenshot.user.id !== user.id,
  });

  // Sync follow status from server
  useEffect(() => {
    if (followStatus) {
      setIsFollowingAuthor(followStatus.following);
    }
  }, [followStatus]);

  // Follow/unfollow mutation
  const followMutation = useMutation({
    mutationFn: async (targetUserId: number) => {
      const response = await apiRequest('POST', `/api/follow/${targetUserId}`);
      return response;
    },
    onSuccess: (data) => {
      setIsFollowingAuthor(data.following);
      queryClient.invalidateQueries({ queryKey: ['/api/follow/status', selectedScreenshot?.user?.id] });
    },
    onError: (error: Error) => {
      toast({
        title: "Action failed",
        description: error.message || "Failed to update follow status",
        variant: "gamefolioError",
      });
    },
  });

  // Check for age restriction when screenshot is selected
  useEffect(() => {
    if (selectedScreenshot && (selectedScreenshot as any).ageRestricted && !ageRestrictionAccepted) {
      setShowAgeRestrictionDialog(true);
    }
  }, [selectedScreenshot, ageRestrictionAccepted]);

  // Auto-close age restriction dialog after acceptance
  useEffect(() => {
    if (ageRestrictionAccepted && showAgeRestrictionDialog) {
      const timer = setTimeout(() => {
        setShowAgeRestrictionDialog(false);
        // Reset accepting flag after dialog closes
        setTimeout(() => {
          isAcceptingRef.current = false;
        }, 50);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [ageRestrictionAccepted, showAgeRestrictionDialog]);

  // Reset age restriction and follow state when screenshot dialog is closed
  useEffect(() => {
    if (!selectedScreenshot) {
      setAgeRestrictionAccepted(false);
      setShowAgeRestrictionDialog(false);
      setIsFollowingAuthor(false);
      isAcceptingRef.current = false; // Reset accepting flag
    }
  }, [selectedScreenshot]);

  // Delete screenshot mutation
  const deleteScreenshotMutation = useMutation({
    mutationFn: async (screenshotId: number) => {
      const response = await apiRequest('DELETE', `/api/screenshots/${screenshotId}`);
      return response;
    },
    onSuccess: () => {
      // Invalidate trending screenshots to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['/api/trending/screenshots'] });
      setSelectedScreenshot(null); // Close the modal
      toast({
        title: "Screenshot deleted",
        description: "Your screenshot has been deleted successfully.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete screenshot. Please try again.",
        variant: "gamefolioError",
      });
    },
  });

  // Fetch trending clips using the working endpoint
  const { data: trendingClips, isLoading: isLoadingClips } = useQuery<ClipWithUser[]>({
    queryKey: ['/api/clips/trending', timePeriod],
    queryFn: async () => {
      const params = new URLSearchParams({
        period: timePeriod,
        limit: '20',
      });
      const response = await fetch(`/api/clips/trending?${params}`);
      if (!response.ok) throw new Error('Failed to fetch trending clips');
      return response.json();
    },
    enabled: activeTab === 'clips' || (isMobile && showMobileViewer),
  });

  // Fetch trending reels using the trending reels endpoint with period support
  const { data: trendingReels, isLoading: isLoadingReels } = useQuery<ClipWithUser[]>({
    queryKey: ['/api/reels/trending', timePeriod],
    queryFn: async () => {
      const params = new URLSearchParams({
        period: timePeriod,
        limit: '20',
      });
      const response = await fetch(`/api/reels/trending?${params}`);
      if (!response.ok) throw new Error('Failed to fetch trending reels');
      return response.json();
    },
    enabled: activeTab === 'reels' || (isMobile && showMobileViewer),
  });

  // Fetch trending screenshots using the working API endpoint
  const { data: trendingScreenshots, isLoading: isLoadingScreenshots } = useQuery<ScreenshotWithUser[]>({
    queryKey: ['/api/trending/screenshots', timePeriod],
    queryFn: async () => {
      const params = new URLSearchParams({
        period: timePeriod,
        limit: '20',
      });
      const response = await fetch(`/api/trending/screenshots?${params}`);
      if (!response.ok) throw new Error('Failed to fetch trending screenshots');
      return response.json();
    },
    enabled: activeTab === 'screenshots' || (isMobile && showMobileViewer),
  });

  const getPeriodIcon = (period: TimePeriod) => {
    switch (period) {
      case 'recent': return <Clock className="h-4 w-4" />;
      case '1w': return <Calendar className="h-4 w-4" />;
      case '1m': return <Calendar className="h-4 w-4" />;
      case 'ever': return <CalendarDays className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getPeriodLabel = (period: TimePeriod) => {
    switch (period) {
      case 'recent': return 'Most Recent';
      case '1w': return '1W';
      case '1m': return '1M';
      case 'ever': return 'Ever';
      default: return 'Most Recent';
    }
  };

  // Get content for active tab only
  const getActiveTabContent = (): (ClipWithUser | ScreenshotWithUser)[] => {
    switch (activeTab) {
      case 'clips':
        return trendingClips || [];
      case 'reels':
        return trendingReels || [];
      case 'screenshots':
        return trendingScreenshots || [];
      default:
        return [];
    }
  };

  const renderContent = () => {
    const isLoading = activeTab === 'clips' ? isLoadingClips : 
                     activeTab === 'reels' ? isLoadingReels : 
                     isLoadingScreenshots;

    if (isLoading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array(8).fill(0).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-video w-full rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      );
    }

    if (activeTab === 'screenshots') {
      if (!trendingScreenshots?.length) {
        return (
          <div className="text-center py-12">
            <Gamepad2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No trending screenshots</h3>
            <p className="text-muted-foreground">Check back later for trending screenshots!</p>
          </div>
        );
      }

      return (
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
              screenshotsScrollRef.current.scrollLeft = screenshotsScrollStart - (e.clientX - screenshotsDragStart);
            }}
            onMouseUp={() => setScreenshotsDragging(false)}
            onMouseLeave={() => setScreenshotsDragging(false)}
          >
            {trendingScreenshots.map((screenshot) => (
              <div key={screenshot.id} className="flex-shrink-0 w-[320px] sm:w-[380px] md:w-[420px] lg:w-[460px]">
                <ScreenshotCard
                  screenshot={screenshot}
                  isOwnProfile={user?.id === screenshot.userId}
                  profile={screenshot.user}
                  onDelete={(id) => deleteScreenshotMutation.mutate(id)}
                  onSelect={setSelectedScreenshot}
                  showUserInfo={true}
                />
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (activeTab === 'reels') {
      if (!trendingReels?.length) {
        return (
          <div className="text-center py-12">
            <TrendingUp className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No trending reels</h3>
            <p className="text-muted-foreground">Check back later for trending reels!</p>
          </div>
        );
      }

      // Mobile: Instagram/TikTok style 2-column masonry grid - tapping opens fullscreen vertical swipe viewer
      if (isMobile) {
        const formatNumber = (num: number) => {
          if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
          if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
          return num.toString();
        };
        
        return (
          <>
            <div className="grid grid-cols-2 gap-1">
              {trendingReels.map((reel) => {
                return (
                  <div
                    key={reel.id}
                    onClick={() => openClipDialog(reel.id, trendingReels)}
                    className="w-full"
                  >
                    <div className="relative aspect-[9/16] w-full rounded-sm overflow-hidden cursor-pointer group">
                      <div className="absolute inset-0 bg-gray-800" />
                      <LazyImage
                        src={reel.thumbnailUrl || `/api/clips/${reel.id}/thumbnail`}
                        alt={reel.title}
                        className="w-full h-full object-cover"
                        placeholder="data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='100'%20height='100'%3e%3crect%20width='100'%20height='100'%20fill='%231f2937'/%3e%3c/svg%3e"
                        showLoadingSpinner={true}
                        rootMargin="50px"
                        containerClassName="absolute inset-0"
                        fallback={
                          <div className="w-full h-full flex items-center justify-center bg-gray-800">
                            <Play className="h-8 w-8 text-gray-500" />
                          </div>
                        }
                      />
                      
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
                      
                      <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded font-semibold">
                        {(() => {
                          const actualDuration = reel.trimEnd && reel.trimEnd > 0 
                            ? reel.trimEnd - (reel.trimStart || 0)
                            : reel.duration || 0;
                          return formatDuration(actualDuration);
                        })()}
                      </div>
                      
                      <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded font-semibold flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {formatNumber(reel.views || 0)}
                      </div>
                      
                      <div className="absolute bottom-0 left-0 right-0 p-2">
                        <h3 className="text-white font-bold text-xs mb-0.5 drop-shadow-lg line-clamp-2">
                          {reel.title}
                        </h3>
                        <p className="text-white text-[10px] mb-1 drop-shadow-lg">
                          @{reel.user.username}
                        </p>
                        {reel.game && (
                          <div className="inline-block bg-green-600 text-white text-[9px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap max-w-full overflow-hidden text-ellipsis">
                            {reel.game.name}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        );
      }

      // Desktop: 1 row with 4 columns filling the page
      return (
        <div className="grid grid-cols-4 gap-4 w-full">
          {trendingReels.slice(0, 4).map((reel) => (
            <ReelCard
              key={reel.id}
              reel={reel}
              reelsList={trendingReels}
            />
          ))}
        </div>
      );
    }

    // For clips
    if (!trendingClips?.length) {
      return (
        <div className="text-center py-12">
          <TrendingUp className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No trending clips</h3>
          <p className="text-muted-foreground">Check back later for trending content!</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {trendingClips.map((clip) => (
          <VideoClipGridItem
            key={clip.id}
            clip={clip}
            userId={user?.id}
            clipsList={trendingClips}
          />
        ))}
      </div>
    );
  };

  const activeTabContent = getActiveTabContent();

  // Auto-open mobile viewer when on mobile and switching tabs with content
  useEffect(() => {
    if (isMobile && activeTabContent.length > 0) {
      setShowMobileViewer(true);
    }
  }, [isMobile, activeTab, activeTabContent.length]);

  // ── Mobile: full-screen immersive layout matching mobile app ─────────────
  if (isMobile) {
    const contentMeta: Record<ContentType, { label: string; Icon: React.ElementType }> = {
      reels:       { label: 'Reels',       Icon: Film   },
      clips:       { label: 'Clips',       Icon: Video  },
      screenshots: { label: 'Screenshots', Icon: Camera },
    };
    const timeMeta: Record<TimePeriod, string> = {
      recent: 'Most Recent',
      '1w':   '1 Week',
      '1m':   '1 Month',
      ever:   'All Time',
    };
    const activeContent: any[] =
      activeTab === 'clips'       ? (trendingClips       || []) :
      activeTab === 'reels'       ? (trendingReels        || []) :
                                    (trendingScreenshots  || []);
    const isLoadingContent =
      activeTab === 'clips' ? isLoadingClips :
      activeTab === 'reels' ? isLoadingReels : isLoadingScreenshots;

    const { label: activeLabel, Icon: ActiveIcon } = contentMeta[activeTab];

    return (
      <>
        {/* Full-screen viewer */}
        {activeContent.length > 0 && !isLoadingContent && (
          <MobileTrendingViewer
            key={activeTab}
            content={activeContent}
            onClose={() => {}}
            hideCloseButton={true}
          />
        )}

        {/* Loading */}
        {isLoadingContent && (
          <div className="fixed inset-0 z-[65] flex items-center justify-center" style={{ background: '#131F2A' }}>
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-[#4ADE80] border-t-transparent rounded-full animate-spin" />
              <p className="text-white/60 text-sm">Loading {activeLabel.toLowerCase()}…</p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!isLoadingContent && activeContent.length === 0 && (
          <div className="fixed inset-0 z-[65] flex items-center justify-center" style={{ background: '#131F2A' }}>
            <div className="text-center px-8">
              <TrendingUp className="h-14 w-14 mx-auto mb-4" style={{ color: '#4ADE80' }} />
              <p className="text-white font-semibold mb-1">No trending {activeLabel.toLowerCase()}</p>
              <p className="text-white/50 text-sm">Check back later!</p>
            </div>
          </div>
        )}

        {/* Floating content-type + time-filter controls */}
        <div
          className="fixed right-0 z-[70] pt-4 pr-4 flex flex-col items-end gap-2"
          style={{ top: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Content-type pill */}
          <button
            onClick={() => { setShowContentDropdown(!showContentDropdown); setShowTimeDropdown(false); }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-full text-white text-sm font-semibold"
            style={{ background: 'rgba(30,41,59,0.9)', border: '1px solid rgba(74,222,128,0.3)' }}
          >
            <ActiveIcon className="h-4 w-4" />
            {activeLabel}
            <ChevronDown className="h-4 w-4" />
          </button>

          {/* Content-type dropdown */}
          {showContentDropdown && (
            <div className="rounded-xl overflow-hidden min-w-[165px]" style={{ background: 'rgba(30,41,59,0.97)', border: '1px solid rgba(74,222,128,0.2)' }}>
              {(Object.entries(contentMeta) as [ContentType, { label: string; Icon: React.ElementType }][]).map(([type, { label, Icon }]) => (
                <button
                  key={type}
                  className="flex items-center gap-3 px-4 py-3 w-full text-left text-sm font-medium"
                  style={activeTab === type ? { background: 'rgba(74,222,128,0.15)', color: '#4ADE80' } : { color: '#94A3B8' }}
                  onClick={() => { setActiveTab(type); setShowContentDropdown(false); }}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                  {activeTab === type && <Check className="h-3.5 w-3.5 ml-auto" />}
                </button>
              ))}
            </div>
          )}

          {/* Time-filter pill */}
          <button
            onClick={() => { setShowTimeDropdown(!showTimeDropdown); setShowContentDropdown(false); }}
            className="p-2 rounded-full"
            style={{
              background: showTimeDropdown ? 'rgba(74,222,128,0.15)' : 'rgba(30,41,59,0.9)',
              border: showTimeDropdown ? '1px solid #4ADE80' : '1px solid rgba(74,222,128,0.3)',
            }}
          >
            <Clock className="h-5 w-5" style={{ color: showTimeDropdown ? '#4ADE80' : '#fff' }} />
          </button>

          {/* Time dropdown */}
          {showTimeDropdown && (
            <div className="rounded-xl overflow-hidden min-w-[150px]" style={{ background: 'rgba(30,41,59,0.97)', border: '1px solid rgba(74,222,128,0.2)' }}>
              <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.4)', borderBottom: '1px solid #1E293B' }}>Time Period</p>
              {(Object.entries(timeMeta) as [TimePeriod, string][]).map(([period, label]) => (
                <button
                  key={period}
                  className="flex items-center gap-3 px-4 py-3 w-full text-left text-sm font-medium"
                  style={timePeriod === period ? { background: 'rgba(74,222,128,0.15)', color: '#4ADE80' } : { color: '#94A3B8' }}
                  onClick={() => { setTimePeriod(period); setShowTimeDropdown(false); }}
                >
                  <Clock className="h-4 w-4" />
                  {label}
                  {timePeriod === period && <Check className="h-3.5 w-3.5 ml-auto" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </>
    );
  }
  // ── End mobile layout ──────────────────────────────────────────────────────

  return (
    <div className="container mx-auto px-4 py-4 md:px-6 md:py-6 max-w-7xl">
      {/* Tabs at the top - Mobile responsive */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ContentType)} className="w-full">
        <div className="bg-card/50 dark:bg-card/30 backdrop-blur-sm border-b border-border mb-0 md:mb-6 md:rounded-xl md:border sticky top-0 z-30">
          <div className="px-4 py-3 md:py-4">
            <TabsList className="grid w-full grid-cols-3 bg-slate-800/90 dark:bg-slate-900/90 p-1 rounded-xl h-auto">
              <TabsTrigger 
                value="clips" 
                className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/70 rounded-lg px-4 py-2.5 md:py-3 text-sm md:text-base font-medium transition-all"
                data-testid="tab-clips"
              >
                Clips
              </TabsTrigger>
              <TabsTrigger 
                value="reels" 
                className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/70 rounded-lg px-4 py-2.5 md:py-3 text-sm md:text-base font-medium transition-all"
                data-testid="tab-reels"
              >
                Reels
              </TabsTrigger>
              <TabsTrigger 
                value="screenshots" 
                className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/70 rounded-lg px-4 py-2.5 md:py-3 text-sm md:text-base font-medium transition-all"
                data-testid="tab-screenshots"
              >
                Screenshots
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* Header - below tabs on mobile, visible on desktop */}
        <div className="px-4 mb-6 hidden md:flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Trending</h1>
              <p className="text-muted-foreground">Discover the most popular gaming content</p>
            </div>
          </div>

        </div>

        {/* Content */}
        <div className="px-0 md:px-4">
          <TabsContent value="clips" className="mt-0 pt-4 px-4 md:px-0">
            {renderContent()}
          </TabsContent>

          <TabsContent value="reels" className="mt-0 pt-4 px-4 md:px-0">
            {renderContent()}
          </TabsContent>

          <TabsContent value="screenshots" className="mt-0 pt-4 px-4 md:px-0">
            {renderContent()}
          </TabsContent>
        </div>
      </Tabs>

      {/* Screenshot Lightbox */}
      <ScreenshotLightbox
        screenshot={selectedScreenshot}
        onClose={() => setSelectedScreenshot(null)}
        currentUserId={user?.id}
        screenshots={trendingScreenshots as any[]}
        onNavigate={(s: any) => setSelectedScreenshot(s)}
      />

      {/* Age Restriction Dialog for Screenshots */}
      {selectedScreenshot && (
        <AgeRestrictionDialog
          isOpen={showAgeRestrictionDialog}
          onAccept={() => {
            isAcceptingRef.current = true;
            setAgeRestrictionAccepted(true);
            // Dialog will auto-close via useEffect
          }}
          onDecline={() => {
            // Only close if we're not in the middle of accepting
            if (!isAcceptingRef.current) {
              setShowAgeRestrictionDialog(false);
              setSelectedScreenshot(null);
            }
          }}
          contentType="screenshot"
        />
      )}

    </div>
  );
};

export default TrendingPage;