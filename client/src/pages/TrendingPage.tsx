import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLikeScreenshot } from '@/hooks/use-clips';
import { useToast } from '@/hooks/use-toast';
import { ClipWithUser } from '@shared/schema';
import { TrendingUp, Clock, Calendar, CalendarDays, Gamepad2, Eye, MessageSquare, Share2, Heart, Play } from 'lucide-react';
import { formatDuration } from '@/lib/constants';
import { useClipDialog } from '@/hooks/use-clip-dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import TrendingVideoCard from '@/components/clips/TrendingVideoCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import { useMobile } from '@/hooks/use-mobile';
import { LikeButton } from '@/components/engagement/LikeButton';
import { FireButton } from '@/components/engagement/FireButton';
import { ReportButton } from '@/components/reporting/ReportButton';
import { MobileTrendingViewer } from '@/components/clips/MobileTrendingViewer';

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
  createdAt: string;
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
}

// Screenshot card component
const ScreenshotCard: React.FC<{ screenshot: ScreenshotWithUser }> = ({ screenshot }) => {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  
  // Screenshot like functionality
  const likeMutation = useLikeScreenshot();
  const [isAnimating, setIsAnimating] = useState(false);
  const [likeCount, setLikeCount] = useState(() => {
    const screenshotAny = screenshot as any;
    const likeCountValue = typeof screenshotAny._count?.likes === 'string' ? parseInt(screenshotAny._count.likes) : screenshotAny._count?.likes || 0;
    return isNaN(likeCountValue) ? 0 : likeCountValue;
  });

  // Check if user has liked this screenshot
  const { data: likeStatus } = useQuery({
    queryKey: ['screenshotLikeStatus', screenshot.id],
    queryFn: async () => {
      if (!currentUser) return { hasLiked: false };
      const response = await fetch(`/api/screenshots/${screenshot.id}/likes/status`, {
        credentials: 'include'
      });
      if (!response.ok) return { hasLiked: false };
      return response.json();
    },
    enabled: !!currentUser,
  });

  const hasUserLiked = likeStatus?.hasLiked || false;

  // Handle like button click
  const handleLikeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!currentUser) {
      toast({
        title: "Not logged in",
        description: "You need to be logged in to like screenshots",
        variant: "default"
      });
      return;
    }
    
    // Trigger animation when liking (not unliking)
    if (!hasUserLiked) {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 2000);
    }
    
    likeMutation.mutate({
      screenshotId: screenshot.id,
      unlike: hasUserLiked
    });
    
    toast({
      title: hasUserLiked ? "Unliked" : "Liked!",
      description: hasUserLiked ? "Removed from your liked screenshots" : "Added to your liked screenshots ❤️",
      variant: "default"
    });
  };
  
  return (
    <Card className="group relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:scale-105">
      <div className="aspect-video relative overflow-hidden">
        <img 
          src={screenshot.imageUrl} 
          alt={screenshot.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        <div className="absolute bottom-2 left-2 right-2 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <h4 className="font-medium text-sm truncate">{screenshot.title}</h4>
          <p className="text-xs text-white/80">{screenshot.views} views</p>
        </div>
      </div>
      <CardContent className="p-3">
        <h3 className="font-medium text-sm mb-1 line-clamp-2">{screenshot.title}</h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{screenshot.user.displayName || screenshot.user.username}</span>
          {screenshot.game && (
            <>
              <span>•</span>
              <span>{screenshot.game.name}</span>
            </>
          )}
        </div>
      </CardContent>
      
      {/* Engagement Footer - Match clip layout exactly */}
      <CardFooter className="px-3 py-2 border-t flex justify-between">
        <div className="flex items-center space-x-1.5">
          <button 
            onClick={handleLikeClick}
            className={`flex items-center text-[9px] transition-colors ${hasUserLiked ? 'text-green-500' : 'text-muted-foreground hover:text-green-500'}`}
          >
            <Heart 
              className={`h-2.5 w-2.5 transition-all duration-300 ${
                hasUserLiked 
                  ? `fill-green-500 stroke-green-500 text-green-500 ${isAnimating ? 'animate-bounce scale-125' : 'scale-110'}` 
                  : 'stroke-muted-foreground hover:stroke-green-500 fill-transparent hover:scale-105'
              }`} 
              style={{
                animation: isAnimating ? 'heartGrow 2s ease-out' : undefined
              }}
            />
            <span className="ml-0.5">{likeCount}</span>
            {hasUserLiked && <span className="text-green-500 text-xs ml-1">✓</span>}
          </button>
          
          <FireButton 
            contentId={screenshot.id}
            contentType="screenshot"
            initialFired={false}
            initialCount={(screenshot as any)._count?.reactions || 0}
            size="sm"
          />
          
          <div className="flex items-center text-[9px] text-muted-foreground">
            <MessageSquare className="h-2.5 w-2.5" />
            <span className="ml-0.5">{(screenshot as any)._count?.comments || 0}</span>
          </div>
          
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            className="flex items-center text-[9px] text-muted-foreground hover:text-primary"
          >
            <Share2 className="h-2.5 w-2.5" />
          </button>
          
          <ReportButton
            contentType="screenshot"
            contentId={screenshot.id}
            contentTitle={screenshot.title}
            variant="minimal"
            size="sm"
            className="text-[9px]"
          />
        </div>
        
        <div className="flex items-center text-[9px] text-muted-foreground">
          <Eye className="h-2.5 w-2.5" />
          <span className="ml-0.5">{screenshot.views?.toLocaleString() || '0'}</span>
        </div>
      </CardFooter>
    </Card>
  );
};

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
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
            <svg className="w-8 h-8 text-white fill-white" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </div>

        {/* Duration badge */}
        <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
          {(() => {
            const actualDuration = reel.trimEnd && reel.trimEnd > 0 
              ? reel.trimEnd - (reel.trimStart || 0)
              : reel.duration || 0;
            return formatDuration(actualDuration);
          })()}
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
  );
};

const TrendingPage: React.FC = () => {
  const { user } = useAuth();
  const isMobile = useMobile();
  const [activeTab, setActiveTab] = useState<ContentType>('clips');
  const [filter, setFilter] = useState<FilterType>('likes');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('today');
  const [showMobileViewer, setShowMobileViewer] = useState(false);

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {trendingScreenshots.map((screenshot) => (
            <ScreenshotCard key={screenshot.id} screenshot={screenshot} />
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

      return (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 md:gap-6">
          {trendingReels.map((reel) => (
            <ReelCard key={reel.id} reel={reel} reelsList={trendingReels} />
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
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Mobile trigger button when viewer is closed */}
      {isMobile && !showMobileViewer && activeTabContent.length > 0 && (
        <div className="fixed bottom-20 right-4 z-40">
          <Button
            onClick={() => setShowMobileViewer(true)}
            className="rounded-full w-14 h-14 bg-primary hover:bg-primary/90 text-white shadow-lg"
            data-testid="button-open-mobile-viewer"
          >
            <Play className="h-6 w-6" />
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
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

      {/* Tabs and Filters */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ContentType)} className="w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <TabsList className="grid w-full sm:w-auto grid-cols-3">
            <TabsTrigger value="clips">Clips</TabsTrigger>
            <TabsTrigger value="reels">Reels</TabsTrigger>
            <TabsTrigger value="screenshots">Screenshots</TabsTrigger>
          </TabsList>

          {/* Note: Filter dropdown temporarily disabled while fixing database queries */}
        </div>

        {/* Mobile viewer or regular content */}
        {isMobile && showMobileViewer && activeTabContent.length > 0 ? (
          <div className="mt-0">
            <MobileTrendingViewer
              content={activeTabContent}
              initialIndex={0}
              onClose={() => setShowMobileViewer(false)}
            />
          </div>
        ) : (
          <>
            {/* Content */}
            <TabsContent value="clips" className="mt-0">
              {renderContent()}
            </TabsContent>

            <TabsContent value="reels" className="mt-0">
              {renderContent()}
            </TabsContent>

            <TabsContent value="screenshots" className="mt-0">
              {renderContent()}
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
};

export default TrendingPage;