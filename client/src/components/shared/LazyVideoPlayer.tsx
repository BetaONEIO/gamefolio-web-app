import React, { useState, useRef, useEffect } from 'react';
import { useLazyImageWithCallbacks } from '@/hooks/use-lazy-image';
import { cn } from '@/lib/utils';
import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Lazy-loaded VideoPlayer import
const VideoPlayer = React.lazy(() => import('./VideoPlayer'));

interface LazyVideoPlayerProps {
  videoUrl: string;
  thumbnailUrl?: string;
  autoPlay?: boolean;
  onEnded?: () => void;
  initialTime?: number;
  filter?: string;
  className?: string;
  objectFit?: 'contain' | 'cover' | 'fill';
  clipId?: number;
  loadOnIntersection?: boolean; // If true, loads video when in view, otherwise waits for user interaction
  showPlayButton?: boolean; // Show a play button overlay until video is loaded
}

export function LazyVideoPlayer({
  videoUrl,
  thumbnailUrl,
  autoPlay = false,
  onEnded,
  initialTime = 0,
  filter = 'none',
  className,
  objectFit = 'contain',
  clipId,
  loadOnIntersection = true,
  showPlayButton = true,
  ...props
}: LazyVideoPlayerProps) {
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [userRequestedPlay, setUserRequestedPlay] = useState(false);
  const [showLoadingSpinner, setShowLoadingSpinner] = useState(false);

  // Use intersection observer to detect when video container is in view
  const [containerRef, { isInView }] = useLazyImageWithCallbacks<HTMLDivElement>({
    src: videoUrl, // We use this just for the intersection logic
    rootMargin: '100px',
    threshold: 0.1,
    onInView: () => {
      if (loadOnIntersection) {
        loadVideo();
      }
    },
  });

  const loadVideo = () => {
    if (!isVideoLoaded) {
      setShowLoadingSpinner(true);
      setIsVideoLoaded(true);
    }
  };

  const handlePlayClick = () => {
    setUserRequestedPlay(true);
    loadVideo();
  };

  // Load video if user interaction is detected and video isn't loaded yet
  useEffect(() => {
    if (userRequestedPlay && !isVideoLoaded) {
      loadVideo();
    }
  }, [userRequestedPlay, isVideoLoaded]);

  // Show video player if loaded, or if intersection-based loading is enabled and element is in view
  const shouldShowVideoPlayer = isVideoLoaded && (loadOnIntersection ? isInView : userRequestedPlay);

  return (
    <div 
      ref={containerRef}
      className={cn('relative w-full h-full bg-black rounded-lg overflow-hidden', className)}
    >
      {/* Thumbnail placeholder */}
      {!shouldShowVideoPlayer && (
        <div className="relative w-full h-full">
          {thumbnailUrl && (
            <img
              src={thumbnailUrl}
              alt="Video thumbnail"
              className="w-full h-full object-cover"
            />
          )}
          
          {/* Play button overlay */}
          {showPlayButton && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <Button
                onClick={handlePlayClick}
                className="bg-primary/90 hover:bg-primary text-white rounded-full p-4 transform scale-100 hover:scale-110 transition-transform duration-200 shadow-lg"
                data-testid="button-play-video"
              >
                <Play className="h-8 w-8 fill-current" />
              </Button>
            </div>
          )}
          
          {/* Loading state */}
          {showLoadingSpinner && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="flex flex-col items-center space-y-2">
                <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span className="text-white text-sm">Loading video...</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lazy-loaded video player */}
      {shouldShowVideoPlayer && (
        <React.Suspense 
          fallback={
            <div className="w-full h-full flex items-center justify-center bg-black">
              <div className="flex flex-col items-center space-y-2">
                <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span className="text-white text-sm">Loading player...</span>
              </div>
            </div>
          }
        >
          <VideoPlayer
            videoUrl={videoUrl}
            thumbnailUrl={thumbnailUrl}
            autoPlay={autoPlay || userRequestedPlay}
            onEnded={onEnded}
            initialTime={initialTime}
            filter={filter}
            className="w-full h-full"
            objectFit={objectFit}
            clipId={clipId}
            {...props}
          />
        </React.Suspense>
      )}
    </div>
  );
}

export default LazyVideoPlayer;