import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Calendar, CalendarDays, TrendingUp, Eye } from 'lucide-react';
import VideoClipCard from "@/components/clips/VideoClipCard";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useClipDialog } from '@/hooks/use-clip-dialog';
import { formatDuration } from '@/lib/constants';
import { TrendingCategories } from './TrendingCategories';

interface TrendingSectionProps {
  className?: string;
}

// Reel card component - TikTok/YouTube Shorts style
const ReelCard: React.FC<{ reel: any; reelsList?: any[] }> = ({ reel, reelsList }) => {
  const { openClipDialog } = useClipDialog();

  const handleReelClick = (e: React.MouseEvent) => {
    e.preventDefault();
    openClipDialog(reel.id, reelsList); // Open reel in dialog
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
                src={reel.user?.avatarUrl || '/uploaded_assets/gamefolio social logo 3d circle web.png'}
                alt={reel.user?.displayName || 'User'}
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-white text-sm font-medium">
              {reel.user?.displayName || reel.user?.username || 'Unknown User'}
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

export function TrendingSection({ className }: TrendingSectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [timePeriod, setTimePeriod] = useState<'day' | 'week' | 'month'>('day');
  const [contentType, setContentType] = useState<'clips' | 'reels'>('clips');

  // Get game ID from selected category
  const { data: games } = useQuery({
    queryKey: ['/api/games'],
    queryFn: async () => {
      const response = await fetch('/api/games');
      if (!response.ok) throw new Error('Failed to fetch games');
      return response.json();
    },
  });

  const selectedGameId = selectedCategory 
    ? games?.find((game: any) => game.name === selectedCategory)?.id 
    : undefined;

  // Fetch trending clips
  const { data: trendingClips, isLoading: isLoadingClips } = useQuery({
    queryKey: ['/api/clips/trending', timePeriod, selectedGameId],
    queryFn: async () => {
      const params = new URLSearchParams({
        period: timePeriod,
        limit: '12',
        ...(selectedGameId && { gameId: selectedGameId.toString() }),
      });
      const response = await fetch(`/api/clips/trending?${params}`);
      if (!response.ok) throw new Error('Failed to fetch trending clips');
      return response.json();
    },
    enabled: contentType === 'clips',
  });

  // Fetch trending reels
  const { data: trendingReels, isLoading: isLoadingReels } = useQuery({
    queryKey: ['/api/reels/trending', timePeriod, selectedGameId],
    queryFn: async () => {
      const params = new URLSearchParams({
        period: timePeriod,
        limit: '12',
        ...(selectedGameId && { gameId: selectedGameId.toString() }),
      });
      const response = await fetch(`/api/reels/trending?${params}`);
      if (!response.ok) throw new Error('Failed to fetch trending reels');
      return response.json();
    },
    enabled: contentType === 'reels',
  });

  const getPeriodIcon = (period: string) => {
    switch (period) {
      case 'day': return <Clock className="h-4 w-4" />;
      case 'week': return <Calendar className="h-4 w-4" />;
      case 'month': return <CalendarDays className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case 'day': return 'Today';
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      default: return 'Today';
    }
  };

  const currentData = contentType === 'clips' ? trendingClips : trendingReels;
  const isLoading = contentType === 'clips' ? isLoadingClips : isLoadingReels;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <TrendingUp className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Trending Content</h2>
        </div>

        {/* Time Period Filter */}
        <div className="flex items-center gap-2">
          {(['day', 'week', 'month'] as const).map((period) => (
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

      {/* Game Categories Filter */}
      <TrendingCategories
        selectedCategory={selectedCategory}
        onCategorySelect={setSelectedCategory}
      />

      {/* Content Type Tabs */}
      <Tabs value={contentType} onValueChange={(value) => setContentType(value as 'clips' | 'reels')}>
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="clips" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Trending Clips
          </TabsTrigger>
          <TabsTrigger value="reels" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Trending Reels
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clips" className="mt-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array(6).fill(0).map((_, i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className="aspect-video rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : currentData && currentData.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {currentData.map((clip: any) => (
                <VideoClipCard
                  key={clip.id}
                  clip={clip}
                  userId={undefined}
                  clipsList={currentData}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No trending clips found</h3>
              <p className="text-muted-foreground">
                {selectedCategory 
                  ? `No clips found for ${selectedCategory} in the selected time period.`
                  : 'No clips found in the selected time period.'}
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="reels" className="mt-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array(6).fill(0).map((_, i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className="aspect-[9/16] rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : currentData && currentData.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 md:gap-6">
              {currentData.map((reel: any) => (
                <ReelCard
                  key={reel.id}
                  reel={reel}
                  reelsList={currentData}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No trending reels found</h3>
              <p className="text-muted-foreground">
                {selectedCategory 
                  ? `No reels found for ${selectedCategory} in the selected time period.`
                  : 'No reels found in the selected time period.'}
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Selected Category Info */}
      {selectedCategory && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Showing results for:</span>
          <Badge variant="outline">{selectedCategory}</Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedCategory(null)}
            className="h-6 px-2 text-xs"
          >
            Clear filter
          </Button>
        </div>
      )}
    </div>
  );
}