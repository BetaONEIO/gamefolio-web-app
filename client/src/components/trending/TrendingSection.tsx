import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Calendar, CalendarDays, TrendingUp, BarChart2, Heart, MessageCircle, Play } from 'lucide-react';
import VideoClipCard from "@/components/clips/VideoClipCard";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { TrendingCategories } from './TrendingCategories';
import { useClipDialog } from '@/hooks/use-clip-dialog';
import { formatDuration } from '@/lib/constants';
import { LazyImage } from "@/components/ui/lazy-image";

interface TrendingSectionProps {
  className?: string;
}

// Reel card component - clean 9:16 thumbnail with meta below
const ReelCard: React.FC<{ reel: any; reelsList?: any[] }> = ({ reel, reelsList }) => {
  const { openClipDialog } = useClipDialog();

  const handleReelClick = (e: React.MouseEvent) => {
    e.preventDefault();
    openClipDialog(reel.id, reelsList, undefined, 'reel');
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div
      onClick={handleReelClick}
      className="group cursor-pointer"
    >
      {/* 9:16 Thumbnail */}
      <div className="relative aspect-[9/16] overflow-hidden rounded-xl bg-[#0B1218] border border-[#1B2A33]">
        <LazyImage
          src={reel.thumbnailUrl || `/api/clips/${reel.id}/thumbnail`}
          alt={reel.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          placeholder="data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='100'%20height='100'%3e%3crect%20width='100'%20height='100'%20fill='%230B1218'/%3e%3c/svg%3e"
          showLoadingSpinner={true}
          rootMargin="50px"
          containerClassName="absolute inset-0"
          fallback={
            <div className="w-full h-full flex items-center justify-center bg-[#0B1218]">
              <Play className="h-12 w-12 text-gray-600" />
            </div>
          }
        />

        {/* Hover play overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/50 pointer-events-none">
          <div className="bg-primary/90 rounded-full p-3 backdrop-blur-sm transform scale-90 group-hover:scale-100 transition-transform duration-500">
            <Play size={28} className="text-white fill-white" />
          </div>
        </div>

        {/* Top-left: duration */}
        {reel.duration && reel.duration > 0 && (
          <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm text-white px-1.5 py-0.5 text-[11px] rounded-md font-semibold">
            {`${Math.floor(reel.duration / 60)}:${(reel.duration % 60).toString().padStart(2, '0')}`}
          </div>
        )}

        {/* Top-right: view count */}
        <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm text-white px-1.5 py-0.5 text-[11px] rounded-md font-semibold flex items-center gap-1">
          <BarChart2 className="h-3 w-3" />
          {formatNumber(reel.views || 0)}
        </div>
      </div>

      {/* Meta below thumbnail */}
      <div className="pt-2 px-0.5">
        <h3 className="text-[#F5F7F2] font-bold text-sm line-clamp-1 leading-tight">
          {reel.title}
        </h3>
        <p className="text-[#B8C0AE] text-xs mt-0.5">
          @{reel.user?.username || 'unknown'}
        </p>
        {reel.game?.name && (
          <span
            className="inline-block mt-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded"
            style={{ background: '#B7FF1A', color: '#03080A' }}
          >
            {reel.game.name}
          </span>
        )}
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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 md:gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-[9/16] bg-muted rounded-xl animate-pulse" />
              ))}
            </div>
          ) : currentData && currentData.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 md:gap-4">
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