import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Clip } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDuration } from "@/lib/constants";
import { 
  Scissors, 
  Image, 
  Save, 
  Undo, 
  Play, 
  Pause,
  SkipBack,
  SkipForward
} from "lucide-react";

interface ClipEditorProps {
  clip: Clip;
  onSaved?: () => void;
  onCancel?: () => void;
}

type FilterOption = {
  id: string;
  name: string;
  className: string;
};

const FILTERS: FilterOption[] = [
  { id: "none", name: "Original", className: "" },
  { id: "grayscale", name: "Grayscale", className: "filter-grayscale" },
  { id: "sepia", name: "Sepia", className: "filter-sepia" },
  { id: "invert", name: "Invert", className: "filter-invert" },
  { id: "brightness", name: "Bright", className: "filter-brightness" },
  { id: "contrast", name: "Contrast", className: "filter-contrast" },
  { id: "saturate", name: "Vibrant", className: "filter-saturate" },
  { id: "blur", name: "Blur", className: "filter-blur" },
  { id: "hue-rotate", name: "Hue Shift", className: "filter-hue-rotate" },
];

const ClipEditor = ({ clip, onSaved, onCancel }: ClipEditorProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [filter, setFilter] = useState(clip.filter || "none");
  const [trimStart, setTrimStart] = useState(clip.trimStart || 0);
  const [trimEnd, setTrimEnd] = useState(clip.trimEnd || 0);
  const [trimRange, setTrimRange] = useState<[number, number]>([0, 100]);
  const { toast } = useToast();

  // Initialize video duration and trim values
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      const videoDuration = video.duration;
      setDuration(videoDuration);
      
      // Initialize trim values based on existing data or defaults
      if (clip.trimEnd && clip.trimEnd > 0) {
        setTrimRange([
          ((clip.trimStart || 0) / videoDuration) * 100,
          (clip.trimEnd / videoDuration) * 100
        ]);
      } else {
        setTrimRange([0, 100]);
        setTrimEnd(videoDuration);
      }
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    
    // Time update handler for playback position
    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      
      // Stop playback if we reach trim end
      if (video.currentTime >= trimEnd) {
        video.pause();
        video.currentTime = trimStart;
        setIsPlaying(false);
      }
    };
    
    video.addEventListener("timeupdate", handleTimeUpdate);
    
    // Play/pause handlers
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
    };
  }, [clip]);

  // Handle trim slider change
  const handleTrimChange = (values: number[]) => {
    if (values.length !== 2 || !duration) return;
    
    const start = (values[0] / 100) * duration;
    const end = (values[1] / 100) * duration;
    
    setTrimRange(values as [number, number]);
    setTrimStart(start);
    setTrimEnd(end);
    
    // Update video current time
    if (videoRef.current && videoRef.current.currentTime < start) {
      videoRef.current.currentTime = start;
    }
  };

  // Play button handler
  const handlePlayPause = () => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      // If at the end of the trim range, reset to start
      if (videoRef.current.currentTime >= trimEnd || videoRef.current.currentTime < trimStart) {
        videoRef.current.currentTime = trimStart;
      }
      videoRef.current.play().catch(err => {
        console.error("Video play() was interrupted:", err);
        setIsPlaying(false);
      });
    }
  };

  // Handle reset to beginning of the trim range
  const handleResetToStart = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = trimStart;
    setCurrentTime(trimStart);
  };

  // Skip forward 5 seconds
  const handleSkipForward = () => {
    if (!videoRef.current) return;
    const newTime = Math.min(currentTime + 5, trimEnd);
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Skip backward 5 seconds
  const handleSkipBackward = () => {
    if (!videoRef.current) return;
    const newTime = Math.max(currentTime - 5, trimStart);
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Reset to original settings
  const handleReset = () => {
    setFilter("none");
    setTrimRange([0, 100]);
    setTrimStart(0);
    setTrimEnd(duration);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  };

  // Update clip mutation
  const updateClipMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/clips/${clip.id}/edit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filter,
          trimStart,
          trimEnd,
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to update clip");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Clip updated",
        description: "Your changes have been saved successfully.",
        duration: 3000,
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({
        queryKey: [`/api/clips/${clip.id}`]
      });
      
      if (onSaved) {
        onSaved();
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update clip",
        variant: "destructive",
        duration: 3000,
      });
    },
  });

  const handleSave = () => {
    updateClipMutation.mutate();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Edit Your Clip</CardTitle>
        <CardDescription>Trim your clip and add filters to make it stand out</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Video preview with active filter */}
        <div className="relative rounded-md overflow-hidden bg-black">
          <video
            ref={videoRef}
            src={clip.videoUrl}
            className={`w-full ${filter !== "none" ? `filter-${filter}` : ""}`}
            controls={false}
          />
          
          {/* Custom playback controls */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white text-sm">
                {formatDuration(currentTime)} / {formatDuration(trimEnd - trimStart)}
              </span>
              <div className="flex items-center space-x-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleSkipBackward}
                  className="h-8 w-8 text-white"
                >
                  <SkipBack className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handlePlayPause}
                  className="h-8 w-8 text-white"
                >
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleSkipForward}
                  className="h-8 w-8 text-white"
                >
                  <SkipForward className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleResetToStart}
                  className="h-8 w-8 text-white"
                >
                  <SkipBack className="h-4 w-4 text-primary" />
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Editing tools */}
        <Tabs defaultValue="trim">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="trim" className="flex items-center">
              <Scissors className="mr-2 h-4 w-4" /> Trim
            </TabsTrigger>
            <TabsTrigger value="filters" className="flex items-center">
              <Image className="mr-2 h-4 w-4" /> Filters
            </TabsTrigger>
          </TabsList>
          
          {/* Trim tab */}
          <TabsContent value="trim" className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Trim Video</Label>
                <div className="flex space-x-2 text-sm font-medium">
                  <span>Start: {formatDuration(trimStart)}</span>
                  <span>End: {formatDuration(trimEnd)}</span>
                </div>
              </div>
              
              <Slider
                defaultValue={[0, 100]}
                value={trimRange}
                max={100}
                step={0.1}
                onValueChange={handleTrimChange}
                className="my-6"
              />
              
              <p className="text-sm text-muted-foreground mt-2">
                Drag the handles to select the portion of the video you want to keep.
              </p>
            </div>
          </TabsContent>
          
          {/* Filters tab */}
          <TabsContent value="filters" className="py-4">
            <Label className="mb-3 block">Select a filter</Label>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {FILTERS.map((filterOption) => (
                <div
                  key={filterOption.id}
                  className={`
                    cursor-pointer text-center rounded-md p-2 transition-all
                    ${filter === filterOption.id ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-secondary'}
                  `}
                  onClick={() => setFilter(filterOption.id)}
                >
                  <div 
                    className={`mx-auto w-12 h-12 mb-1 rounded overflow-hidden ${filterOption.className}`}
                    style={{
                      backgroundImage: `url(${clip.thumbnailUrl || '/assets/video-placeholder.svg'})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }}
                  />
                  <span className="text-xs font-medium block truncate">{filterOption.name}</span>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <div className="flex space-x-2">
          <Button 
            variant="ghost"
            onClick={handleReset}
            className="flex items-center"
          >
            <Undo className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button 
            onClick={handleSave}
            className="flex items-center"
            disabled={updateClipMutation.isPending}
          >
            {updateClipMutation.isPending ? (
              <div className="animate-spin h-4 w-4 mr-2 border-2 border-t-transparent rounded-full" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Changes
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default ClipEditor;