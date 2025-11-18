import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Calendar, CalendarDays, TrendingUp } from 'lucide-react';
import VideoClipCard from "@/components/clips/VideoClipCard";
import VideoClipGridItem from "@/components/clips/VideoClipGridItem";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { TrendingCategories } from './TrendingCategories';

interface TrendingSectionProps {
  className?: string;
}

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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 gap-4 md:gap-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="aspect-[9/16] bg-muted rounded-xl animate-pulse" />
              ))}
            </div>
          ) : currentData && currentData.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 gap-4 md:gap-6">
              {currentData.map((reel: any) => (
                <VideoClipGridItem
                  key={reel.id}
                  clip={reel}
                  userId={undefined}
                  compact={false}
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