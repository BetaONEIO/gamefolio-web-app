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
      <div className="space-y-4 pt-4">
        {/* Optimized skeleton for 5 reels */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-5 gap-4 md:gap-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="aspect-[9/16] bg-muted rounded-xl animate-pulse" />
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

  // Optimize layout to fit 5 reels better with fewer rows
  const getItemsPerRow = () => {
    if (typeof window !== 'undefined') {
      if (window.innerWidth >= 1536) return 5; // 2xl: 5 items in 1 row
      if (window.innerWidth >= 1280) return 5; // xl: 5 items in 1 row  
      if (window.innerWidth >= 1024) return 3; // lg: 3+2 in 2 rows
      if (window.innerWidth >= 640) return 3; // sm: 3+2 in 2 rows
      return 2; // mobile: 2+2+1 in 3 rows
    }
    return 3; // fallback for SSR
  };

  const itemsPerRow = getItemsPerRow();
  
  // Limit to 5 reels and calculate optimal rows
  const reelsToShow = reelsArray.slice(0, 5);
  const totalReels = reelsToShow.length;
  
  // Calculate rows based on available reels and screen size
  const rows = [];
  if (itemsPerRow >= 5) {
    // Single row for larger screens
    rows.push(reelsToShow);
  } else if (itemsPerRow === 3) {
    // Two rows: 3 + 2
    rows.push(reelsToShow.slice(0, 3));
    if (totalReels > 3) rows.push(reelsToShow.slice(3, 5));
  } else {
    // Mobile: distribute across multiple rows
    for (let i = 0; i < totalReels; i += itemsPerRow) {
      rows.push(reelsToShow.slice(i, i + itemsPerRow));
    }
  }

  return (
    <div className="pt-4">
      <div className="space-y-4">
        {/* Dynamically render optimized rows */}
        {rows.map((row, rowIndex) => (
          <div 
            key={rowIndex}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-5 gap-4 md:gap-6"
          >
            {row.map((reel) => (
              <VideoClipGridItem
                key={reel.id}
                clip={reel}
                userId={userId}
                compact={false}
                reelsList={reelsArray}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}