import React, { useState, useEffect } from 'react';
import { Slider } from '@/components/ui/slider';

// Helper function to format time in MM:SS format
const formatTime = (seconds: number): string => {
  if (isNaN(seconds)) return '00:00';
  
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
  const [activeHandle, setActiveHandle] = useState<'start' | 'end' | null>(null);

  // Update end time when duration changes (video loaded)
  useEffect(() => {
    setEndTime(duration);
    onTrimChange(0, duration);
  }, [duration, onTrimChange]);

  // Handler for trim slider changes
  const handleTrimChange = (values: number[]) => {
    if (!duration || values.length !== 2) return;
    
    // Convert percentage values to seconds
    const start = (values[0] / 100) * duration;
    const end = (values[1] / 100) * duration;
    
    // Ensure minimum clip duration (1 second or 5% of video, whichever is smaller)
    const minDuration = Math.min(1, duration * 0.05);
    if (end - start < minDuration) {
      return; // Prevent handles from getting too close
    }
    
    // Update local state
    setStartTime(start);
    setEndTime(end);
    
    // Notify parent component
    onTrimChange(start, end);
    
    // Update video playhead to reflect trim position
    if (videoRef.current) {
      const video = videoRef.current;
      
      // Move playhead based on which handle is being dragged
      if (activeHandle === 'start') {
        video.currentTime = start;
      } else if (activeHandle === 'end') {
        video.currentTime = Math.max(end - 0.5, start); // Show frame just before end
      } else if (video.currentTime < start || video.currentTime > end) {
        // If not dragging but playhead is outside bounds, reset to start
        video.currentTime = start;
      }
      
      // Create custom trim preview behavior for playback
      video.ontimeupdate = () => {
        // If video plays past end time, loop back to start time
        if (video.currentTime >= end) {
          video.currentTime = start;
        }
      };
    }
  };

  // Handle the start of dragging to identify which handle is being moved
  const handleDragStart = (handle: 'start' | 'end') => {
    setActiveHandle(handle);
    
    // Pause video during trimming for better UX
    if (videoRef.current) {
      videoRef.current.pause();
    }
  };
  
  // Handle end of dragging
  const handleDragEnd = () => {
    setActiveHandle(null);
  };

  return (
    <div className="space-y-4">
      {/* Improved start/end time display */}
      <div className="flex justify-between mb-2 font-medium">
        <div className="flex flex-col items-center">
          <span className="text-sm text-muted-foreground">Start Time</span>
          <span className="text-base bg-muted px-2 py-1 rounded mt-1">{formatTime(startTime)}</span>
        </div>
        
        <div className="flex flex-col items-center">
          <span className="text-sm text-muted-foreground">Duration</span>
          <span className="text-base text-primary font-bold">{formatTime(endTime - startTime)}</span>
        </div>
        
        <div className="flex flex-col items-center">
          <span className="text-sm text-muted-foreground">End Time</span>
          <span className="text-base bg-muted px-2 py-1 rounded mt-1">{formatTime(endTime)}</span>
        </div>
      </div>
      
      {/* Timeline with trim controls */}
      <div className="relative py-6 mt-4 border-t border-b border-muted pt-8 mx-2 sm:mx-4">
        {/* Timeline ticks */}
        <div className="absolute top-0 left-0 right-0 h-2 flex justify-between px-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-2 w-px bg-muted-foreground/30"></div>
          ))}
        </div>
        
        {/* Track background */}
        <div className="absolute top-8 left-2 right-2 h-3 bg-gray-700 rounded-full overflow-hidden">
          {/* Selected portion */}
          <div 
            className="absolute top-0 h-full bg-primary" 
            style={{
              left: `${(startTime / duration) * 100}%`,
              width: `${((endTime - startTime) / duration) * 100}%`
            }}
          />
        </div>
        
        {/* Dual-handle slider */}
        <div className="px-2">
          <Slider
            defaultValue={[0, 100]}
            value={[
              duration ? (startTime / duration) * 100 : 0,
              duration ? (endTime / duration) * 100 : 100
            ]}
            max={100}
            step={0.1}
            onValueChange={handleTrimChange}
            className="relative z-10 w-full cursor-ew-resize"
          />
        </div>
        
        {/* Custom drag handles with visual feedback */}
        <div className="absolute top-8 left-2 right-2 pointer-events-none">
          {/* Start handle */}
          <div 
            className={`absolute h-4 w-4 rounded-full border-2 ${activeHandle === 'start' ? 'border-white scale-125' : 'border-primary/70'} bg-primary shadow-md transform -translate-x-1/2 -translate-y-1/4 cursor-ew-resize z-20 transition-all duration-150 pointer-events-auto`}
            style={{ left: `${(startTime / duration) * 100}%` }}
            onMouseDown={() => handleDragStart('start')}
            onMouseUp={handleDragEnd}
            onTouchStart={() => handleDragStart('start')}
            onTouchEnd={handleDragEnd}
          >
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1">
              <div className="h-4 w-1 bg-primary rounded-full"></div>
            </div>
            <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 -translate-y-1 text-xs bg-background/90 px-1 rounded text-primary font-medium whitespace-nowrap">
              {formatTime(startTime)}
            </span>
          </div>
          
          {/* End handle */}
          <div 
            className={`absolute h-4 w-4 rounded-full border-2 ${activeHandle === 'end' ? 'border-white scale-125' : 'border-primary/70'} bg-primary shadow-md transform -translate-x-1/2 -translate-y-1/4 cursor-ew-resize z-20 transition-all duration-150 pointer-events-auto`}
            style={{ left: `${(endTime / duration) * 100}%` }}
            onMouseDown={() => handleDragStart('end')}
            onMouseUp={handleDragEnd}
            onTouchStart={() => handleDragStart('end')}
            onTouchEnd={handleDragEnd}
          >
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1">
              <div className="h-4 w-1 bg-primary rounded-full"></div>
            </div>
            <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 -translate-y-1 text-xs bg-background/90 px-1 rounded text-primary font-medium whitespace-nowrap">
              {formatTime(endTime)}
            </span>
          </div>
        </div>
      </div>
      
      <p className="text-sm text-muted-foreground mt-3">
        Drag the handles to trim your clip from both the start and end.
      </p>
    </div>
  );
};

export default VideoTrimmer;