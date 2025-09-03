import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Scissors, Image } from 'lucide-react';
import VideoTrimmer from './VideoTrimmer';

interface SimpleVideoPlayerProps {
  file: File;
  onTrimChange?: (start: number, end: number) => void;
  onFilterChange?: (filter: string) => void;
}

// Define available filters
const FILTERS = [
  { id: 'none', name: 'None' },
  { id: 'grayscale', name: 'Grayscale' },
  { id: 'sepia', name: 'Sepia' },
  { id: 'invert', name: 'Invert' },
  { id: 'saturate', name: 'Vibrant' },
  { id: 'blur', name: 'Blur' },
  { id: 'brightness', name: 'Bright' },
  { id: 'contrast', name: 'Contrast' }
];

const SimpleVideoPlayer: React.FC<SimpleVideoPlayerProps> = ({ 
  file, 
  onTrimChange, 
  onFilterChange 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [selectedFilter, setSelectedFilter] = useState('none');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [duration, setDuration] = useState(0);

  // Create object URL for the video file
  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      
      // Clean up the URL when component unmounts
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [file]);
  
  // Handle metadata loading and generate thumbnail
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    const handleMetadataLoaded = () => {
      // Set duration
      setDuration(video.duration);
      
      // Create thumbnail for filter preview
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 120;
        canvas.height = 120;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
        const thumbnail = canvas.toDataURL('image/jpeg');
        setThumbnailUrl(thumbnail);
      } catch (e) {
        console.error("Could not generate thumbnail", e);
      }
    };
    
    video.addEventListener('loadedmetadata', handleMetadataLoaded);
    
    return () => {
      video.removeEventListener('loadedmetadata', handleMetadataLoaded);
    };
  }, [videoRef.current]);
  
  // Handle filter changes
  useEffect(() => {
    if (onFilterChange) {
      onFilterChange(selectedFilter);
    }
  }, [selectedFilter, onFilterChange]);

  // Handler for trim changes from VideoTrimmer component
  const handleTrimChangeInternal = (start: number, end: number) => {
    if (onTrimChange) {
      onTrimChange(start, end);
    }
  };

  return (
    <div className="space-y-4">
      {/* Video Player - responsive with proper containment */}
      <div className="w-full max-w-full mx-auto aspect-video rounded-md overflow-hidden bg-black shadow-xl">
        <video 
          ref={videoRef}
          src={videoUrl}
          className={cn(
            "w-full h-full object-contain",
            selectedFilter === 'grayscale' && 'filter-grayscale',
            selectedFilter === 'sepia' && 'filter-sepia',
            selectedFilter === 'invert' && 'filter-invert',
            selectedFilter === 'saturate' && 'filter-saturate',
            selectedFilter === 'blur' && 'filter-blur',
            selectedFilter === 'brightness' && 'filter-brightness',
            selectedFilter === 'contrast' && 'filter-contrast'
          )}
          controls
          controlsList="nodownload"
          playsInline
        />
      </div>
      
      {/* Edit controls with tabs - responsive editing controls */}
      <Card className="bg-card/90 backdrop-blur-sm w-full max-w-full mx-auto">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl">Edit Your Clip</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="trim">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="trim" className="flex items-center gap-2">
                <Scissors className="h-5 w-5" />
                <span className="text-base">Trim</span>
              </TabsTrigger>
              <TabsTrigger value="filters" className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                <span className="text-base">Filters</span>
              </TabsTrigger>
            </TabsList>
            
            {/* Trim tab with VideoTrimmer component */}
            <TabsContent value="trim" className="space-y-4">
              {duration > 0 && (
                <VideoTrimmer 
                  duration={duration} 
                  videoRef={videoRef}
                  onTrimChange={handleTrimChangeInternal}
                />
              )}
            </TabsContent>
            
            {/* Filters tab - 50% larger filter options */}
            <TabsContent value="filters">
              <div className="grid grid-cols-4 gap-4">
                {FILTERS.map((filter) => (
                  <div
                    key={filter.id}
                    className={`
                      cursor-pointer text-center rounded-md p-3 transition-all
                      ${selectedFilter === filter.id ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-secondary'}
                    `}
                    onClick={() => setSelectedFilter(filter.id)}
                  >
                    <div 
                      className={cn(
                        'mx-auto w-16 h-16 mb-2 rounded overflow-hidden',
                        filter.id === 'grayscale' && 'filter-grayscale',
                        filter.id === 'sepia' && 'filter-sepia',
                        filter.id === 'invert' && 'filter-invert',
                        filter.id === 'saturate' && 'filter-saturate',
                        filter.id === 'blur' && 'filter-blur',
                        filter.id === 'brightness' && 'filter-brightness',
                        filter.id === 'contrast' && 'filter-contrast'
                      )}
                      style={{
                        backgroundImage: `url(${thumbnailUrl || '/assets/video-placeholder.svg'})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      }}
                    />
                    <span className="text-sm font-medium block truncate">{filter.name}</span>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default SimpleVideoPlayer;