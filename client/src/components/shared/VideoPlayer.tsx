import { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Play, Pause, Volume2, VolumeX, Maximize } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/constants";


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
  disableAspectRatio = false
}: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [currentTime, setCurrentTime] = useState(initialTime);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(true); // Start muted to comply with browser autoplay policies
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasSetInitialTime = useRef(false);
  const hasTrackedView = useRef(false);
  
  // Function to track video view
  const trackView = async () => {
    if (!clipId || hasTrackedView.current) return;
    
    try {
      const response = await fetch(`/api/clips/${clipId}/views`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        hasTrackedView.current = true;
        console.log('Video view tracked for clip:', clipId);
      }
    } catch (error) {
      console.error('Failed to track video view:', error);
    }
  };
  
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
        // When user actively starts playing, unmute and set to full volume
        if (isMuted) {
          videoRef.current.muted = false;
          videoRef.current.volume = 1;
          setVolume(1);
          setIsMuted(false);
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
      videoRef.current.volume = vol;
      videoRef.current.muted = vol === 0;
      setVolume(vol);
      setIsMuted(vol === 0);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      if (isMuted) {
        videoRef.current.muted = false;
        videoRef.current.volume = volume;
      } else {
        videoRef.current.muted = true;
        videoRef.current.volume = 0;
      }
      setIsMuted(!isMuted);
    }
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
        playsInline
        preload="metadata"
        muted={isMuted}
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
      
      {!isPlaying && !duration && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        </div>
      )}
      
      {!isPlaying && duration > 0 && (
        <button
          className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50"
          onClick={togglePlay}
        >
          <div className="bg-primary bg-opacity-80 rounded-full p-4">
            <Play className="h-6 w-6 text-white" />
          </div>
        </button>
      )}
      
      {/* Video Controls */}
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
      </div>
    </div>
  );
};

export default VideoPlayer;
