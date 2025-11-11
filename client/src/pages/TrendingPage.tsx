import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLikeScreenshot } from '@/hooks/use-clips';
import { useToast } from '@/hooks/use-toast';
import { ClipWithUser } from '@shared/schema';
import { TrendingUp, Clock, Calendar, CalendarDays, Gamepad2, Eye, MessageSquare, Share2, Heart, Play, MessageCircle, AlertTriangle } from 'lucide-react';
import { formatDuration } from '@/lib/constants';
import { formatDistance } from 'date-fns';
import { useClipDialog } from '@/hooks/use-clip-dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import TrendingVideoCard from '@/components/clips/TrendingVideoCard';
import VideoClipGridItem from '@/components/clips/VideoClipGridItem';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import { useMobile } from '@/hooks/use-mobile';
import { LikeButton } from '@/components/engagement/LikeButton';
import { FireButton } from '@/components/engagement/FireButton';
import { ReportButton } from '@/components/reporting/ReportButton';
import { MobileTrendingViewer } from '@/components/clips/MobileTrendingViewer';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';
import { UserIcon, X, Trash2 } from 'lucide-react';
import { Link } from 'wouter';
import { AgeRestrictionDialog } from '@/components/content/AgeRestrictionDialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { ScreenshotCard } from '@/components/screenshots/ScreenshotCard';
import { ScreenshotCommentSection } from '@/components/screenshots/ScreenshotCommentSection';

type ContentType = 'clips' | 'reels' | 'screenshots';
type FilterType = 'likes' | 'comments';
type TimePeriod = 'today' | 'week' | 'ever';

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

        {/* Content overlay - centered bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 text-center">
          {/* Title (game name style) */}
          <h3 className="text-white font-bold text-lg mb-1 drop-shadow-lg">
            {reel.title}
          </h3>

          {/* Username */}
          <p className="text-white text-sm mb-2 drop-shadow-lg">
            @{reel.user.username}
          </p>

          {/* Game badge */}
          {reel.game && (
            <div className="inline-block bg-green-600 text-white text-xs px-3 py-1 rounded-md font-bold">
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
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('today');
  const [showMobileViewer, setShowMobileViewer] = useState(false);
  const [selectedScreenshot, setSelectedScreenshot] = useState<ScreenshotWithUser | null>(null);
  const [ageRestrictionAccepted, setAgeRestrictionAccepted] = useState(false);
  const [showAgeRestrictionDialog, setShowAgeRestrictionDialog] = useState(false);
  const isAcceptingRef = useRef(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  // Reset age restriction state when screenshot dialog is closed
  useEffect(() => {
    if (!selectedScreenshot) {
      setAgeRestrictionAccepted(false);
      setShowAgeRestrictionDialog(false);
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

  // Fetch trending reels using the latest reels endpoint (working)
  const { data: trendingReels, isLoading: isLoadingReels } = useQuery<ClipWithUser[]>({
    queryKey: ['/api/reels/latest', timePeriod],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: '20',
      });
      const response = await fetch(`/api/reels/latest?${params}`);
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
      case 'today': return <Clock className="h-4 w-4" />;
      case 'week': return <Calendar className="h-4 w-4" />;
      case 'ever': return <CalendarDays className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getPeriodLabel = (period: TimePeriod) => {
    switch (period) {
      case 'today': return 'Today';
      case 'week': return 'This Week';
      case 'ever': return 'Ever';
      default: return 'Today';
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trendingScreenshots.map((screenshot) => (
            <ScreenshotCard 
              key={screenshot.id} 
              screenshot={screenshot}
              isOwnProfile={user?.id === screenshot.userId}
              profile={screenshot.user}
              onDelete={(id) => deleteScreenshotMutation.mutate(id)}
              onSelect={setSelectedScreenshot}
            />
          ))}
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

      // Mobile: Instagram/TikTok style 2-column masonry grid using CSS columns
      if (isMobile) {
        // Create varying aspect ratios for masonry effect
        const aspectRatios = ['aspect-[9/16]', 'aspect-[3/4]', 'aspect-[2/3]', 'aspect-[9/14]', 'aspect-[3/5]', 'aspect-[4/5]'];
        
        const formatNumber = (num: number) => {
          if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
          if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
          return num.toString();
        };
        
        return (
          <div className="columns-2 gap-1 space-y-1">
            {trendingReels.map((reel, index) => {
              const aspectRatio = aspectRatios[index % aspectRatios.length];
              
              return (
                <div
                  key={reel.id}
                  onClick={() => openClipDialog(reel.id, trendingReels)}
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
          <TrendingVideoCard
            key={clip.id}
            clip={clip}
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

  return (
    <div className="container mx-auto px-0 md:px-4 py-0 md:py-8 max-w-7xl">
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

          {/* Time Period Filter */}
          <div className="flex items-center gap-2">
            {(['today', 'week', 'ever'] as const).map((period) => (
              <Button
                key={period}
                variant={timePeriod === period ? "default" : "outline"}
                size="sm"
                onClick={() => setTimePeriod(period)}
                className="flex items-center gap-2"
              >
                {getPeriodIcon(period)}
                {getPeriodLabel(period)}
              </Button>
            ))}
          </div>
        </div>

        {/* Mobile time period filter - compact */}
        <div className="px-4 mb-4 flex md:hidden items-center justify-between">
          <h2 className="text-lg font-semibold">Trending</h2>
          <div className="flex items-center gap-1">
            {(['today', 'week', 'ever'] as const).map((period) => (
              <Button
                key={period}
                variant={timePeriod === period ? "default" : "ghost"}
                size="sm"
                onClick={() => setTimePeriod(period)}
                className="h-8 px-2 text-xs"
              >
                {getPeriodLabel(period)}
              </Button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-0 md:px-4">
          <TabsContent value="clips" className="mt-0 px-4 md:px-0">
            {renderContent()}
          </TabsContent>

          <TabsContent value="reels" className="mt-0 px-4 md:px-0">
            {renderContent()}
          </TabsContent>

          <TabsContent value="screenshots" className="mt-0 px-4 md:px-0">
            {renderContent()}
          </TabsContent>
        </div>
      </Tabs>

      {/* Screenshot Modal Dialog */}
      <Dialog open={!!selectedScreenshot} onOpenChange={() => setSelectedScreenshot(null)}>
        <DialogContent className="max-w-[95%] w-[95%] p-0 bg-background text-foreground max-h-[95vh] h-[95vh] overflow-hidden">

          {selectedScreenshot && (
            <div className="flex flex-col lg:flex-row h-full">
              {/* Left side - Image display */}
              <div className="bg-black flex items-center justify-center w-full lg:w-[75%] h-[60vh] lg:h-full">
                {(!selectedScreenshot.ageRestricted || ageRestrictionAccepted) ? (
                  <img
                    src={selectedScreenshot.imageUrl}
                    alt={selectedScreenshot.title}
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white">
                    <div className="text-center p-8">
                      <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-yellow-500" />
                      <h3 className="text-xl font-semibold mb-2">Age-Restricted Content</h3>
                      <p className="text-gray-300">Please accept the age restriction warning to view this content.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Right side - Info and engagement */}
              <div className="h-full flex flex-col w-full lg:w-[25%]">
                {/* Header with username and Follow button */}
                <div className="border-b border-border p-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center overflow-hidden mr-3">
                      {selectedScreenshot.user.avatarUrl ? (
                        <img 
                          src={selectedScreenshot.user.avatarUrl} 
                          alt={selectedScreenshot.user.displayName} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <UserIcon className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <Link href={`/profile/${selectedScreenshot.user.username}`}>
                      <div className="font-medium flex items-center hover:text-primary transition-colors cursor-pointer">
                        @{selectedScreenshot.user.username}
                      </div>
                    </Link>
                  </div>
                  
                  {/* Follow button or delete button */}
                  {user && selectedScreenshot.user.id === user.id ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete "${selectedScreenshot.title}"? This action cannot be undone.`)) {
                          deleteScreenshotMutation.mutate(selectedScreenshot.id);
                        }
                      }}
                      disabled={deleteScreenshotMutation.isPending}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                      data-testid="button-delete-screenshot"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      size="sm"
                      data-testid="button-follow"
                    >
                      Follow
                    </Button>
                  )}
                </div>

                {/* Screenshot Details - scrollable */}
                <div className="flex-1 p-4 pb-8 lg:pb-4 overflow-y-auto space-y-3">
                  {/* Title and description */}
                  <div>
                    <h1 className="font-semibold text-xl">{selectedScreenshot.title}</h1>
                    {selectedScreenshot.description && (
                      <p className="text-foreground mt-1 leading-relaxed break-words text-base">{selectedScreenshot.description}</p>
                    )}

                    {/* Game badge */}
                    {selectedScreenshot.game && (
                      <div className="mt-2">
                        <span className="bg-green-600 text-white px-3 py-1.5 rounded text-sm font-bold">
                          {selectedScreenshot.game.name}
                        </span>
                      </div>
                    )}

                    {/* Views and time */}
                    <div className="flex items-center mt-2 text-sm text-muted-foreground">
                      <Eye className="h-4 w-4 mr-1" />
                      <span className="mr-3">{selectedScreenshot.views?.toLocaleString() || '0'} views</span>
                      <Clock className="h-4 w-4 mr-1" />
                      <span>{selectedScreenshot.createdAt ? formatDistance(new Date(selectedScreenshot.createdAt), new Date(), { addSuffix: true }) : 'Unknown'}</span>
                    </div>

                    {/* Action bar with engagement buttons */}
                    <div className="border-t border-b border-border py-3 mt-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <LikeButton
                            contentId={selectedScreenshot.id}
                            contentType="screenshot"
                            contentOwnerId={selectedScreenshot.userId}
                            initialLiked={false}
                            initialCount={selectedScreenshot._count?.likes || 0}
                            size="lg"
                          />
                          <FireButton
                            contentId={selectedScreenshot.id}
                            contentType="screenshot"
                            contentOwnerId={selectedScreenshot.userId}
                            initialFired={false}
                            initialCount={selectedScreenshot._count?.reactions || 0}
                            size="lg"
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <button className="focus:outline-none">
                            <Share2 className="h-6 w-6" />
                          </button>
                          <ReportButton
                            contentType="screenshot"
                            contentId={selectedScreenshot.id}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Comments Section */}
                  <div className="pt-2 pb-6">
                    <ScreenshotCommentSection screenshotId={selectedScreenshot.id} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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