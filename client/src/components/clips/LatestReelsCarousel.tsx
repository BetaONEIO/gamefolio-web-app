import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import VideoClipGridItem from "./VideoClipGridItem";
import { ClipWithUser } from "@shared/schema";
import { Button } from "@/components/ui/button";

interface LatestReelsCarouselProps {
  reels: ClipWithUser[] | undefined;
  isLoading: boolean;
  userId?: number;
}

export function LatestReelsCarousel({ reels, isLoading, userId }: LatestReelsCarouselProps) {
  if (isLoading) {
    return (
      <div className="space-y-4 pt-6">
        {/* First row skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 gap-4 md:gap-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="aspect-[9/16] bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
        {/* Second row skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 gap-4 md:gap-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={`row2-${i}`} className="aspect-[9/16] bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
        {/* Third row skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 gap-4 md:gap-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={`row3-${i}`} className="aspect-[9/16] bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Ensure reels is always an array to prevent slice errors
  const reelsArray = Array.isArray(reels) ? reels : [];

  if (reelsArray.length === 0) {
    return (
      <div className="text-center py-8 sm:py-12 bg-card/50 rounded-xl border border-border/50 mx-2">
        <div className="text-3xl sm:text-4xl mb-3">📱</div>
        <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">No Reels Yet</h3>
        <p className="text-muted-foreground text-sm px-4">
          Be the first to share a reel!
        </p>
      </div>
    );
  }

  // Simple approach: always show 3 rows with responsive columns - max 5 per row
  const getItemsPerRow = () => {
    if (typeof window !== 'undefined') {
      if (window.innerWidth >= 1536) return 5; // 2xl (changed from 6 to 5)
      if (window.innerWidth >= 1280) return 5; // xl
      if (window.innerWidth >= 1024) return 4; // lg
      if (window.innerWidth >= 640) return 3; // sm
      return 2; // default
    }
    return 3; // fallback for SSR
  };

  const itemsPerRow = getItemsPerRow();

  // Take first set of reels for display (3 rows total)
  const reelsToShow = reelsArray.slice(0, itemsPerRow * 3);

  // Split into three rows
  const firstRow = reelsToShow.slice(0, itemsPerRow);
  const secondRow = reelsToShow.slice(itemsPerRow, itemsPerRow * 2);
  const thirdRow = reelsToShow.slice(itemsPerRow * 2, itemsPerRow * 3);

  return (
    <div className="pt-4">
      <div className="space-y-4">
        {/* First Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 gap-4 md:gap-6">
          {firstRow.map((reel) => (
            <VideoClipGridItem
              key={reel.id}
              clip={reel}
              userId={userId}
              compact={false}
              reelsList={reelsArray}
            />
          ))}
        </div>

        {/* Second Row */}
        {secondRow.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 gap-4 md:gap-6">
            {secondRow.map((reel) => (
              <VideoClipGridItem
                key={reel.id}
                clip={reel}
                userId={userId}
                compact={false}
                reelsList={reelsArray}
              />
            ))}
          </div>
        )}

        {/* Third Row */}
        {thirdRow.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 gap-4 md:gap-6">
            {thirdRow.map((reel) => (
              <VideoClipGridItem
                key={reel.id}
                clip={reel}
                userId={userId}
                compact={false}
                reelsList={reelsArray}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}