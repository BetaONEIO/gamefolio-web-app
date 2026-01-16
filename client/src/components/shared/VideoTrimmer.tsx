import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';

const formatTime = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

interface VideoTrimmerProps {
  duration: number;
  videoRef: React.RefObject<HTMLVideoElement>;
  onTrimChange: (start: number, end: number) => void;
}

const VideoTrimmer: React.FC<VideoTrimmerProps> = ({ 
  duration, 
  videoRef,
  onTrimChange 
}) => {
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(duration);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEndTime(duration);
    onTrimChange(0, duration);
  }, [duration]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      
      if (video.currentTime >= endTime) {
        video.currentTime = startTime;
        if (!video.paused) {
          video.pause();
          setIsPlaying(false);
        }
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [videoRef, startTime, endTime]);

  const seekToPosition = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, [videoRef]);

  const handleTrimChange = (values: number[]) => {
    if (!duration || values.length !== 2) return;
    
    const start = (values[0] / 100) * duration;
    const end = (values[1] / 100) * duration;
    
    const minDuration = Math.min(1, duration * 0.05);
    if (end - start < minDuration) return;
    
    const startChanged = Math.abs(start - startTime) > 0.01;
    const endChanged = Math.abs(end - endTime) > 0.01;
    
    setStartTime(start);
    setEndTime(end);
    onTrimChange(start, end);
    
    if (startChanged) {
      seekToPosition(start);
    } else if (endChanged) {
      seekToPosition(Math.max(end - 0.1, start));
    }
  };

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      if (video.currentTime < startTime || video.currentTime >= endTime) {
        video.currentTime = startTime;
      }
      video.play();
    } else {
      video.pause();
    }
  };

  const handleSkipToStart = () => {
    seekToPosition(startTime);
  };

  const handleSkipToEnd = () => {
    seekToPosition(Math.max(endTime - 0.5, startTime));
  };

  const clipDuration = endTime - startTime;
  const startPercent = duration ? (startTime / duration) * 100 : 0;
  const endPercent = duration ? (endTime / duration) * 100 : 100;
  const currentPercent = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-full border-primary/30 hover:bg-primary/20 hover:border-primary"
            onClick={handleSkipToStart}
          >
            <SkipBack className="h-4 w-4" />
          </Button>
          
          <Button
            variant="default"
            size="icon"
            className="h-12 w-12 rounded-full bg-primary hover:bg-primary/80"
            onClick={handlePlayPause}
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5 ml-0.5" />
            )}
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-full border-primary/30 hover:bg-primary/20 hover:border-primary"
            onClick={handleSkipToEnd}
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <div className="flex flex-col items-center">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Start</span>
            <span className="font-mono text-lg font-bold text-primary">{formatTime(startTime)}</span>
          </div>
          <div className="h-8 w-px bg-border"></div>
          <div className="flex flex-col items-center">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Duration</span>
            <span className="font-mono text-lg font-bold text-foreground">{formatTime(clipDuration)}</span>
          </div>
          <div className="h-8 w-px bg-border"></div>
          <div className="flex flex-col items-center">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">End</span>
            <span className="font-mono text-lg font-bold text-primary">{formatTime(endTime)}</span>
          </div>
        </div>
      </div>

      <div ref={timelineRef} className="relative">
        <div className="absolute top-0 left-0 right-0 flex justify-between text-xs text-muted-foreground mb-2">
          <span>{formatTime(0)}</span>
          <span>{formatTime(duration / 4)}</span>
          <span>{formatTime(duration / 2)}</span>
          <span>{formatTime((duration * 3) / 4)}</span>
          <span>{formatTime(duration)}</span>
        </div>

        <div className="mt-6 relative h-16 bg-card rounded-lg overflow-hidden border border-border">
          <div className="absolute inset-0 bg-muted/50"></div>
          
          <div 
            className="absolute top-0 bottom-0 bg-primary/20 border-x-2 border-primary"
            style={{
              left: `${startPercent}%`,
              width: `${endPercent - startPercent}%`
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10"></div>
          </div>

          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)] z-20 transition-all duration-75"
            style={{ left: `${currentPercent}%` }}
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-lg"></div>
          </div>

          <div 
            className="absolute top-0 bottom-0 w-1 bg-primary cursor-ew-resize z-10 group"
            style={{ left: `${startPercent}%` }}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-8 bg-primary rounded-sm flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <div className="flex gap-0.5">
                <div className="w-0.5 h-4 bg-primary-foreground/50 rounded-full"></div>
                <div className="w-0.5 h-4 bg-primary-foreground/50 rounded-full"></div>
              </div>
            </div>
          </div>

          <div 
            className="absolute top-0 bottom-0 w-1 bg-primary cursor-ew-resize z-10 group"
            style={{ left: `${endPercent}%`, transform: 'translateX(-100%)' }}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-8 bg-primary rounded-sm flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <div className="flex gap-0.5">
                <div className="w-0.5 h-4 bg-primary-foreground/50 rounded-full"></div>
                <div className="w-0.5 h-4 bg-primary-foreground/50 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-2 px-1">
          <Slider
            value={[
              duration ? (startTime / duration) * 100 : 0,
              duration ? (endTime / duration) * 100 : 100
            ]}
            max={100}
            step={0.1}
            onValueChange={handleTrimChange}
            onPointerDown={() => setIsDragging(true)}
            onPointerUp={() => setIsDragging(false)}
            className="relative z-30 opacity-0 h-16 -mt-16 cursor-ew-resize"
          />
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-primary"></div>
          <span>Trim handles</span>
        </div>
        <span className="text-muted-foreground/50">|</span>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-white border border-muted-foreground/30"></div>
          <span>Playhead</span>
        </div>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Drag the green handles to set your clip's start and end points. The video preview updates as you trim.
      </p>
    </div>
  );
};

export default VideoTrimmer;
