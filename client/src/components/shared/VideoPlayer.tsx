import { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Play, Pause, Volume2, VolumeX, Maximize } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/constants";
import { useVideoAudioPreference } from "@/hooks/use-video-audio-preference";


interface VideoPlayerProps {
  videoUrl: string;
  thumbnailUrl?: string;
  autoPlay?: boolean;
  onEnded?: () => void;
  initialTime?: number;
  filter?: string;
  className?: string;
  objectFit?: 'contain' | 'cover' | 'fill';
  clipId?: number;
  disableAspectRatio?: boolean;
  hideControls?: boolean;
  onPlayingChange?: (isPlaying: boolean) => void;
  onMutedChange?: (isMuted: boolean) => void;
}

const VideoPlayer = ({ 
  videoUrl, 
  thumbnailUrl, 
  autoPlay = false, 
  onEnded,
  initialTime = 0,
  filter = 'none',
  className,
  objectFit = 'contain',
  clipId,
  disableAspectRatio = false,
  hideControls = false,
  onPlayingChange,
  onMutedChange
}: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [currentTime, setCurrentTime] = useState(initialTime);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasSetInitialTime = useRef(false);
  const hasTrackedView = useRef(false);
  
  // Use shared audio preferences across all video players
  const { muted: isMuted, volume, setMuted, setVolume: setGlobalVolume, toggleMuted, isInitialized } = useVideoAudioPreference();
  
  // Reset view tracking when clipId changes
  useEffect(() => {
    hasTrackedView.current = false;
  }, [clipId]);
  
  // Cleanup: pause video and clear timers when component unmounts
  useEffect(() => {
    const video = videoRef.current;
    return () => {
      if (video) {
        video.pause();
        video.src = '';
        video.load();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  // Function to track video view
  const trackView = async () => {
    if (!clipId || hasTrackedView.current) return;
    
    // Set the flag immediately to prevent race conditions
    hasTrackedView.current = true;
    
    try {
      const response = await fetch(`/api/clips/${clipId}/views`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        console.log('Video view tracked for clip:', clipId);
      } else {
        // Reset flag if the request failed so it can be retried
        hasTrackedView.current = false;
      }
    } catch (error) {
      console.error('Failed to track video view:', error);
      // Reset flag on error so it can be retried
      hasTrackedView.current = false;
    }
  };
  
  // Notify parent of playing state changes
  useEffect(() => {
    onPlayingChange?.(isPlaying);
  }, [isPlaying, onPlayingChange]);
  
  // Notify parent of muted state changes
  useEffect(() => {
    onMutedChange?.(isMuted);
  }, [isMuted, onMutedChange]);
  
  const togglePlay = () => {
    if (videoRef.current && videoRef.current.isConnected) {
      if (isPlaying) {
        videoRef.current.pause();
        // Keep controls visible when paused
        setShowControls(true);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      } else {
        // When user actively starts playing, unmute if currently muted
        if (isMuted) {
          setMuted(false);
        }
        // Ensure volume is at least 0.5 when user starts playing
        if (volume === 0) {
          setGlobalVolume(0.5);
        }
        
        videoRef.current.play().catch(err => {
          console.error("Video play() was interrupted:", err);
          setIsPlaying(false);
        });
        // Start hide timer when playing
        hideControlsTimer();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleVolumeChange = (newVolume: number[]) => {
    if (videoRef.current) {
      const vol = newVolume[0];
      setGlobalVolume(vol);
    }
  };

  const toggleMute = () => {
    toggleMuted();
  };

  const handleSeek = (newTime: number[]) => {
    if (videoRef.current) {
      videoRef.current.currentTime = newTime[0];
      setCurrentTime(newTime[0]);
    }
  };

  const toggleFullscreen = () => {
    if (!videoRef.current) return;

    if (!isFullscreen) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen().catch(err => {
          console.error("Error attempting to enable fullscreen:", err);
        });
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(err => {
          console.error("Error attempting to exit fullscreen:", err);
        });
      }
    }
  };

  const hideControlsTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    setShowControls(true);
    console.log("Controls shown, isPlaying:", isPlaying);
    
    // Show controls longer when not playing, keep them visible when paused
    timeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        console.log("Hiding controls after timeout");
        setShowControls(false);
      } else {
        console.log("Keeping controls visible (not playing)");
      }
    }, isPlaying ? 6000 : 12000); // Much longer timeout, especially when paused
  };

  // Effect to sync volume and mute state to video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isInitialized) return;
    
    video.volume = volume;
    video.muted = isMuted;
  }, [volume, isMuted, isInitialized]);

  // Effect to handle autoPlay prop changes - pause video when not the active reel
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (autoPlay && video.paused) {
      video.play().catch(err => {
        console.error("Video autoplay failed:", err);
      });
      setIsPlaying(true);
    } else if (!autoPlay && !video.paused) {
      video.pause();
      setIsPlaying(false);
    }
  }, [autoPlay]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const onLoadedMetadata = () => {
      setDuration(video.duration);
      
      // Set initial playback position after video metadata is loaded
      if (initialTime > 0 && !hasSetInitialTime.current) {
        video.currentTime = initialTime;
        setCurrentTime(initialTime);
        hasSetInitialTime.current = true;
      }
    };

    const onVideoEnded = () => {
      setIsPlaying(false);
      setShowControls(true);
      // Keep controls visible when video ends
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (onEnded) onEnded();
    };

    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("ended", onVideoEnded);
    document.addEventListener("fullscreenchange", onFullscreenChange);

    hideControlsTimer();

    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("ended", onVideoEnded);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isPlaying, onEnded, initialTime]);

  return (
    <div 
      className={cn(
        "relative overflow-hidden bg-black flex items-center justify-center video-container",
        disableAspectRatio ? "w-full h-full" : "w-full aspect-video",
        className
      )}
      onMouseMove={hideControlsTimer}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={videoUrl}
        poster={thumbnailUrl || (videoUrl ? videoUrl.replace(/\.[^/.]+$/, ".jpg") : undefined)}
        className={cn(
          objectFit === 'contain' ? 'w-full h-full object-contain' : 
          objectFit === 'fill' ? 'w-full h-full object-fill' : 'w-full h-full object-cover',
          filter !== 'none' && `filter-${filter}`,
          'focus:outline-none focus:ring-0 outline-none border-none'
        )}
        onClick={togglePlay}
        autoPlay={autoPlay}
        muted={isMuted}
        playsInline
        preload="metadata"
        onError={(e) => {
          console.error("Video playback error:", e);
          console.error("Failed video URL:", videoUrl);
          console.error("Video element src:", videoRef.current?.src);
          console.error("Video readyState:", videoRef.current?.readyState);
          console.error("Video networkState:", videoRef.current?.networkState);
        }}
        onLoadStart={() => {
          console.log("Video loading started for:", videoUrl);
        }}
        onCanPlay={() => {
          console.log("Video can play:", videoUrl);
        }}
        onLoadedData={() => {
          console.log("Video data loaded successfully");
        }}
        onCanPlayThrough={() => {
          console.log("Video can play through without buffering");
        }}
        onLoadedMetadata={() => {
          console.log("Video metadata loaded - duration:", videoRef.current?.duration);
          console.log("Video ready to play:", videoUrl);
          console.log("ShowControls state:", showControls);
        }}
        onPlay={() => {
          console.log("Video started playing:", videoUrl);
          trackView();
        }}
        onPause={() => {
          console.log("Video paused:", videoUrl);
        }}
      />
      
      {!hideControls && !isPlaying && !duration && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        </div>
      )}
      
      {!hideControls && !isPlaying && duration > 0 && (
        <button
          className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50"
          onClick={togglePlay}
        >
          <div className="bg-primary bg-opacity-80 rounded-full p-4">
            <Play className="h-6 w-6 text-white" />
          </div>
        </button>
      )}
      
      {/* Video Controls - hidden when hideControls is true */}
      {!hideControls && (
      <div 
        className={cn(
          "absolute bottom-2 left-2 right-2 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2 md:p-3 transition-opacity rounded-lg",
          showControls ? "opacity-100" : "opacity-0"
        )}
        style={{ zIndex: 9999 }}
      >
        <div className="flex items-center mb-1 md:mb-2 px-2 py-1 rounded bg-black/60" style={{ color: 'white' }}>
          <Slider 
            value={[currentTime]} 
            max={duration || 100}
            step={0.1}
            onValueChange={handleSeek}
            className="flex-1 mr-2 md:mr-4"
          />
          <div className="text-white text-xs whitespace-nowrap">
            {formatDuration(Math.floor(currentTime))} / {formatDuration(Math.floor(duration))}
          </div>
        </div>
        
        <div className="flex items-center justify-between px-2 py-1 rounded bg-black/60" style={{ color: 'white' }}>
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-white p-1 md:p-2 h-6 md:h-8 w-6 md:w-8"
              onClick={togglePlay}
            >
              {isPlaying ? <Pause className="h-3 w-3 md:h-4 md:w-4" /> : <Play className="h-3 w-3 md:h-4 md:w-4" />}
            </Button>
            
            <div className="flex items-center ml-1 md:ml-2 w-20 md:w-32">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-white p-1 md:p-2 h-6 md:h-8 w-6 md:w-8"
                onClick={toggleMute}
              >
                {isMuted ? <VolumeX className="h-3 w-3 md:h-4 md:w-4" /> : <Volume2 className="h-3 w-3 md:h-4 md:w-4" />}
              </Button>
              <Slider 
                value={[isMuted ? 0 : volume]} 
                min={0}
                max={1}
                step={0.1}
                onValueChange={handleVolumeChange}
                className="w-12 md:w-20"
              />
            </div>
          </div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-white p-1 md:p-2 h-6 md:h-8 w-6 md:w-8"
            onClick={toggleFullscreen}
          >
            <Maximize className="h-3 w-3 md:h-4 md:w-4" />
          </Button>
        </div>
      </div>)}
    </div>
  );
};

export default VideoPlayer;
