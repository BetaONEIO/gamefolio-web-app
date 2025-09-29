import { useState, useRef, useEffect, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { EmailVerificationBanner } from "@/components/auth/EmailVerificationBanner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MentionInput } from "@/components/ui/mention-input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Game } from "@shared/schema";
import GameSelector from "@/components/clips/GameSelector";
import TagInput from "@/components/clips/TagInput";
import { formatDuration } from "@/lib/constants";
import { 
  Upload, 
  Video, 
  Camera,
  Image,
  AlertCircle, 
  Info,
  Plus,
  Check,
  Play,
  Square,
  SkipForward,
  StopCircle,
  Pause,
  RotateCcw
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import SimpleVideoPlayer from "@/components/shared/SimpleVideoPlayer";
import { ShareDialog } from "@/components/shared/ShareDialog";

// Define filter options
const FILTERS = [
  { id: 'none', name: 'None', className: '' },
  { id: 'grayscale', name: 'Grayscale', className: 'filter-grayscale' },
  { id: 'sepia', name: 'Sepia', className: 'filter-sepia' },
  { id: 'invert', name: 'Invert', className: 'filter-invert' },
  { id: 'saturate', name: 'Vibrant', className: 'filter-saturate' },
  { id: 'blur', name: 'Blur', className: 'filter-blur' },
  { id: 'brightness', name: 'Bright', className: 'filter-brightness' },
  { id: 'contrast', name: 'Contrast', className: 'filter-contrast' }
];

const UploadPage = () => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Content type selection
  const [contentType, setContentType] = useState<'clips' | 'reels' | 'screenshots'>('clips');
  
  // Screenshot-specific state
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string>("");
  const [screenshotError, setScreenshotError] = useState<string | null>(null);
  const [cropPosition, setCropPosition] = useState({ x: 0, y: 0 });
  const [cropSize, setCropSize] = useState({ width: 100, height: 100 });
  const [screenshotScale, setScreenshotScale] = useState(1);
  const [screenshotTitle, setScreenshotTitle] = useState("");
  const [screenshotDescription, setScreenshotDescription] = useState("");
  const [screenshotSelectedGame, setScreenshotSelectedGame] = useState<Game | null>(null);
  const [screenshotTags, setScreenshotTags] = useState<string[]>([]);
  
  // Use refs for form fields to prevent video rerendering on each keystroke
  const titleRef = useRef<string>("");
  const descriptionRef = useRef<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  
  // Video editing state
  const [showEditingTools, setShowEditingTools] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("none");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  
  // Thumbnail generation state
  const [generatedThumbnails, setGeneratedThumbnails] = useState<string[]>([]);
  const [selectedThumbnailIndex, setSelectedThumbnailIndex] = useState(0);
  const [customThumbnailUrl, setCustomThumbnailUrl] = useState("");
  
  // Share dialog state
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [uploadedClip, setUploadedClip] = useState<{
    id: number;
    title: string;
    description: string;
    qrCode: string;
    socialMediaLinks: any;
    clipUrl: string;
  } | null>(null);
  
  // Screenshot share dialog state
  const [showScreenshotShareDialog, setShowScreenshotShareDialog] = useState(false);
  const [uploadedScreenshot, setUploadedScreenshot] = useState<{
    id: number;
    title: string;
    description: string;
    qrCode: string;
    socialMediaLinks: any;
    screenshotUrl: string;
  } | null>(null);

  const userId = user?.id;

  // Reset form function
  const resetFormAndNavigate = () => {
    setFile(null);
    setTitle("");
    setDescription("");
    setSelectedGame(null);
    setTags([]);
    setShowEditingTools(false);
    setGeneratedThumbnails([]);
    setThumbnailUrl("");
    titleRef.current = "";
    descriptionRef.current = "";
    setShowShareDialog(false);
    setUploadedClip(null);
    // Note: Navigation is now handled separately in success callbacks
  };

  // Reset screenshot form function
  const resetScreenshotForm = () => {
    setScreenshotFile(null);
    setScreenshotPreview("");
    setScreenshotTitle("");
    setScreenshotDescription("");
    setScreenshotSelectedGame(null);
    setScreenshotTags([]);
    setShowScreenshotShareDialog(false);
    setUploadedScreenshot(null);
    navigate("/");
  };

  // Create stable video preview URL that doesn't change on re-renders
  const videoSrc = useMemo(() => {
    if (!file) return "";
    const url = URL.createObjectURL(file);
    console.log('Created stable blob URL for video preview:', url);
    return url;
  }, [file]);

  // Cleanup blob URL when component unmounts or file changes
  useEffect(() => {
    return () => {
      if (videoSrc && videoSrc.startsWith('blob:')) {
        console.log('Cleaning up blob URL:', videoSrc);
        URL.revokeObjectURL(videoSrc);
      }
    };
  }, [videoSrc]);

  const generateThumbnails = () => {
    if (!videoRef.current || videoDuration === 0) return;
    
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = 320;
    canvas.height = 180;
    
    const thumbnails: string[] = [];
    const numberOfThumbnails = 5;
    
    for (let i = 0; i < numberOfThumbnails; i++) {
      const time = (videoDuration / numberOfThumbnails) * i + (videoDuration / numberOfThumbnails) * 0.1;
      video.currentTime = time;
      
      video.addEventListener('seeked', function captureFrame() {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        thumbnails.push(canvas.toDataURL('image/jpeg', 0.8));
        
        if (thumbnails.length === numberOfThumbnails) {
          setGeneratedThumbnails(thumbnails);
          setThumbnailUrl(thumbnails[0]);
        }
        
        video.removeEventListener('seeked', captureFrame);
      }, { once: true });
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('=== FILE SELECTION EVENT ===');
    const selectedFile = e.target.files?.[0];
    console.log('Selected file details:', {
      name: selectedFile?.name,
      size: selectedFile?.size,
      type: selectedFile?.type,
      lastModified: selectedFile?.lastModified
    });
    
    if (!selectedFile) {
      console.log('No file selected');
      return;
    }

    setFileError(null);
    
    // Validate file type
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    if (!allowedTypes.includes(selectedFile.type)) {
      console.log('Invalid file type:', selectedFile.type);
      setFileError("Please upload a valid video file (MP4, WebM, or MOV)");
      return;
    }

    // Validate file size (500MB limit)
    const maxSize = 500 * 1024 * 1024; // 500MB in bytes
    if (selectedFile.size > maxSize) {
      console.log('File too large:', selectedFile.size, 'bytes');
      setFileError("File size must be less than 500MB");
      return;
    }
    
    console.log('File validation passed, setting file state');

    // Reset all video-related state first
    setShowEditingTools(false);
    setGeneratedThumbnails([]);
    setThumbnailUrl("");
    setVideoDuration(0);
    setTrimStart(0);
    setTrimEnd(0);
    
    // Then set the new file - this will trigger videoSrc recreation via useMemo
    setFile(selectedFile);
    
    console.log('File state updated successfully, video preview should be visible');
  };

  // Determine video type based on aspect ratio
  const getVideoType = (videoElement: HTMLVideoElement): 'clip' | 'reel' => {
    const aspectRatio = videoElement.videoWidth / videoElement.videoHeight;
    const targetRatio = 9 / 16; // 9:16 aspect ratio for reels
    const tolerance = 0.1; // Allow some tolerance
    
    return Math.abs(aspectRatio - targetRatio) <= tolerance ? 'reel' : 'clip';
  };

  // Screenshot file handling
  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    setScreenshotError(null);
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(selectedFile.type)) {
      setScreenshotError("Please upload a valid image file (JPEG, PNG, or JPG)");
      return;
    }
    
    // Validate file size (20MB limit for images)
    const maxSize = 20 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      setScreenshotError("Image size must be less than 20MB");
      return;
    }
    
    setScreenshotFile(selectedFile);
    const previewUrl = URL.createObjectURL(selectedFile);
    setScreenshotPreview(previewUrl);
  };

  // Screenshot upload mutation - Updated to use new upload API
  const screenshotUploadMutation = useMutation({
    mutationFn: async () => {
      if (!screenshotFile) throw new Error("No screenshot selected");
      if (!user) throw new Error("You must be logged in to upload screenshots");
      
      const formData = new FormData();
      formData.append("title", screenshotTitle.trim());
      formData.append("description", screenshotDescription.trim());
      if (screenshotSelectedGame) {
        formData.append("gameId", screenshotSelectedGame.id.toString());
      }
      formData.append("tags", JSON.stringify(screenshotTags));
      formData.append("screenshot", screenshotFile);
      
      const response = await fetch("/api/upload/screenshot", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to upload screenshot");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      console.log('Screenshot upload success data:', data);
      
      toast({
        title: "Success!",
        description: "Your screenshot has been uploaded successfully.",
      });
      
      // Invalidate all relevant queries to ensure the new screenshot appears everywhere
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/screenshots`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.username}/screenshots`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.username}`] });
      
      // Reset form first
      resetScreenshotForm();
      
      // Navigate to user's profile page with uploaded screenshot highlighted
      if (user?.username && data.screenshot?.id) {
        navigate(`/profile/${user.username}#screenshot-${data.screenshot.id}`);
      } else {
        // Fallback to upload success page if we don't have user data
        navigate(`/upload-success?type=screenshot&id=${data.screenshot.id}`);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "gamefolioError",
      });
    },
  });

  // Upload mutation for clips
  const uploadMutation = useMutation({
    mutationFn: async () => {
      console.log('=== MUTATION FUNCTION STARTED ===');
      if (!file) {
        throw new Error("No file selected");
      }
      if (!user) {
        console.error('No user found in upload mutation');
        throw new Error("You must be logged in to upload videos");
      }
      
      console.log('Starting upload with user:', user.username);

      // Determine video type based on content type and aspect ratio
      let videoType: 'clip' | 'reel' = contentType === 'clips' ? 'clip' : 'reel';
      
      if (videoRef.current) {
        const determinedType = getVideoType(videoRef.current);
        console.log('getVideoType returned:', determinedType);
        videoType = determinedType;
      }
      
      // Force video type to reel for reel uploads
      if (contentType === 'reels') {
        videoType = 'reel';
      }
      
      console.log('Final video type for upload:', videoType);

      // Two-step process: 1) TUS upload, 2) Process video
      setIsUploading(true);
      setUploadProgress(0);

      return new Promise((resolve, reject) => {
        // Step 1: Upload via direct upload endpoint
        const formData = new FormData();
        formData.append("file", file);
        formData.append("uploadType", videoType);
        formData.append("filename", file.name);
        formData.append("filetype", file.type);
        
        const xhr = new XMLHttpRequest();
        
        // Track upload progress
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 50); // 50% for upload
            console.log('Upload progress:', percentComplete + '%');
            setUploadProgress(percentComplete);
          }
        });
        
        xhr.addEventListener('load', async () => {
          console.log('Direct Upload complete - Status:', xhr.status);
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const uploadResult = JSON.parse(xhr.responseText);
              console.log('Direct Upload successful:', uploadResult);
              
              // Step 2: Process the uploaded video
              setUploadProgress(75); // 75% after upload complete
              
              const processData = {
                uploadResult: uploadResult.result,
                title: titleRef.current || title,
                description: descriptionRef.current || description,
                gameId: selectedGame ? parseInt(selectedGame.id.toString()) : null,
                tags,
                videoType
              };
              
              const processResponse = await fetch('/api/upload/process-video', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(processData),
              });
              
              if (!processResponse.ok) {
                throw new Error('Video processing failed');
              }
              
              const processResult = await processResponse.json();
              setUploadProgress(100);
              console.log('Video processing successful:', processResult);
              
              resolve(processResult);
              
            } catch (error) {
              console.error('Processing error:', error);
              reject(error);
            }
          } else {
            console.error('Direct Upload failed:', xhr.status, xhr.responseText);
            try {
              const errorData = JSON.parse(xhr.responseText);
              reject(new Error(errorData.message || 'Upload failed'));
            } catch {
              reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.responseText}`));
            }
          }
        });
        
        xhr.addEventListener('error', () => {
          console.error('XHR error event triggered');
          reject(new Error('Network error during upload'));
        });
        
        console.log('Starting direct upload to /api/upload/video-direct');
        xhr.open('POST', '/api/upload/video-direct');
        xhr.withCredentials = true;
        xhr.send(formData);
      });
    },
    onSuccess: (data: any) => {
      
      toast({
        title: "Success!",
        description: "Your clip has been uploaded successfully.",
      });
      
      // Invalidate all relevant queries to ensure the new clip appears everywhere
      queryClient.invalidateQueries({ queryKey: ["/api/clips"] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.username}/clips`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.username}`] });
      
      setIsUploading(false);
      setUploadProgress(0);
      
      // Reset form first
      resetFormAndNavigate();
      
      // Navigate to user's profile page with uploaded content highlighted
      const uploadedContentType = contentType === 'reels' ? 'reel' : 'clip';
      const contentId = data.clip?.id || data.id;
      
      if (user?.username && contentId) {
        navigate(`/profile/${user.username}#${uploadedContentType}-${contentId}`);
      } else {
        // Fallback to upload success page if we don't have user data
        navigate(`/upload-success/${uploadedContentType}/${contentId}`);
      }
    },
    onError: (error: Error) => {
      console.error('Upload mutation error:', error);
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "gamefolioError",
      });
      setIsUploading(false);
      setUploadProgress(0);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    console.log('🚀 HANDLESUBMIT FUNCTION CALLED - START');
    e.preventDefault();
    setHasAttemptedSubmit(true);
    
    console.log('=== UPLOAD FORM SUBMIT ===');
    console.log('handleSubmit function called!');
    console.log('Submit button clicked');
    console.log('Current form state:', {
      file: !!file,
      fileName: file?.name,
      fileSize: file?.size,
      title,
      description,
      selectedGame: selectedGame?.name,
      tags,
      user: user?.username,
      contentType
    });
    
    // Force log to ensure it appears
    console.warn(`Form submitted! File: ${file?.name || 'NO FILE'}, Title: ${title || 'NO TITLE'}, Game: ${selectedGame?.name || 'NO GAME'}`);
    console.error('HANDLESUBMIT WAS CALLED - THIS SHOULD APPEAR IN RED!');
    
    console.log('Content type for validation:', contentType);
    
    // Validate video duration for clips (5 minutes max)
    if (contentType === 'clips' && videoDuration > 300) {
      toast({
        title: "Video too long",
        description: `Your video is ${Math.round(videoDuration / 60 * 10) / 10} minutes long. Clips must be 5 minutes or less.`,
        variant: "gamefolioError",
      });
      return;
    }
    
    // For reel uploads, backend will automatically crop to 9:16 format
    if (contentType === 'reels') {
      if (!videoRef.current) {
        toast({
          title: "Video processing error",
          description: "Please wait for the video to fully load before uploading.",
          variant: "gamefolioError",
        });
        return;
      }
      
      // No strict validation - backend will automatically crop to 9:16 format
      console.log('Reel upload: Backend will auto-crop to 9:16 format');
    }
    
    // Make sure we use the latest values from refs before submitting
    const currentTitle = titleRef.current || title;
    const currentDescription = descriptionRef.current || description;
    
    // Update state one final time to ensure consistency
    if (currentTitle !== title) setTitle(currentTitle);
    if (currentDescription !== description) setDescription(currentDescription);
    
    // Skip email verification check for demo user
    if (!user?.emailVerified && user?.username !== "demo") {
      toast({
        title: "Email verification required",
        description: "Please verify your email address before uploading clips. Check your inbox for a verification link.",
        variant: "gamefolioError",
      });
      return;
    }

    // Validate required fields
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a video file to upload.",
        variant: "gamefolioError",
      });
      return;
    }
    
    if (!currentTitle.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for your video.",
        variant: "gamefolioError",
      });
      return;
    }
    
    if (!selectedGame) {
      toast({
        title: "Game required",
        description: "Please select a game for your video.",
        variant: "gamefolioError",
      });
      return;
    }
    
    if (tags.length < 2) {
      toast({
        title: "Tags required",
        description: "Please add at least 2 tags for your video.",
        variant: "gamefolioError",
      });
      return;
    }
    

    
    // Show progress bar immediately when starting upload
    setIsUploading(true);
    setUploadProgress(0);
    
    console.log('About to call uploadMutation.mutate()');
    console.log('Final validation before upload:', {
      fileExists: !!file,
      titleExists: !!currentTitle?.trim(),
      gameExists: !!selectedGame,
      tagsCount: tags.length,
      userAuthenticated: !!user,
      emailVerified: user?.emailVerified || user?.username === 'demo'
    });
    console.log('=== TRIGGERING UPLOAD MUTATION ===');
    uploadMutation.mutate();
  };

  return (
    <div className="py-6">
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">Upload Content</h1>
      </div>
      
      <EmailVerificationBanner />

      <Tabs value={contentType} onValueChange={(value) => setContentType(value as 'clips' | 'reels' | 'screenshots')} className="w-full mb-6">
        <TabsList className="grid w-fit grid-cols-3">
          <TabsTrigger value="clips" className="flex items-center gap-2">
            <Video className="h-4 w-4" />
            Clips
          </TabsTrigger>
          <TabsTrigger value="reels" className="flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Reels
          </TabsTrigger>
          <TabsTrigger value="screenshots" className="flex items-center gap-2">
            <Image className="h-4 w-4" />
            Screenshots
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clips" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Share your gaming moment</CardTitle>
              <CardDescription>
                Upload a video clip to share with the Gamefolio community
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="video">Video File</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Info className="h-3 w-3 mr-1" />
                            <span>Maximum 500MB</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Supports MP4, WebM, or MOV formats</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  
                  <div 
                    className={`border-2 border-dashed ${fileError ? 'border-destructive' : 'border-muted'} rounded-lg p-8 text-center ${!file ? 'cursor-pointer hover:border-primary transition-colors' : ''}`}
                    onClick={!file ? triggerFileInput : undefined}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      id="video"
                      accept="video/mp4,video/webm,video/quicktime"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    
                    {file ? (
                      <div className="space-y-4">
                        {/* Video Preview */}
                        <div className="w-full max-w-5xl mx-auto mb-6">
                          <div className="relative bg-black rounded-lg overflow-hidden">
                            <video
                              ref={videoRef}
                              key={videoSrc} // Force remount when src changes
                              src={videoSrc}
                              controls
                              preload="auto"
                              muted
                              playsInline
                              className="w-full h-auto"
                              style={{ maxHeight: '70vh' }}
                              onLoadedMetadata={() => {
                                console.log('Video metadata loaded - preventing duplicate processing');
                                if (videoRef.current && videoDuration === 0) {
                                  const duration = videoRef.current.duration;
                                  console.log('Setting video duration:', duration, 'seconds');
                                  
                                  // Validate video duration - 5 minutes (300 seconds) max for clips
                                  if (contentType === 'clips' && duration > 300) {
                                    setFileError(`Video duration is ${Math.round(duration / 60 * 10) / 10} minutes. Clips must be 5 minutes or less.`);
                                    setFile(null);
                                    return;
                                  }
                                  
                                  setVideoDuration(duration);
                                  setTrimEnd(duration);
                                  setShowEditingTools(true);
                                  
                                  // Log video dimensions for debugging
                                  console.log('Video dimensions:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
                                  const aspectRatio = videoRef.current.videoWidth / videoRef.current.videoHeight;
                                  const videoType = getVideoType(videoRef.current);
                                  console.log('Aspect ratio:', aspectRatio, 'Auto-detected type:', videoType);
                                  
                                  // Generate thumbnails after video loads
                                  setTimeout(() => {
                                    generateThumbnails();
                                  }, 1000);
                                } else if (videoDuration > 0) {
                                  console.log('Metadata loaded but video already processed, duration:', videoDuration);
                                }
                              }}
                              onTimeUpdate={() => {
                                if (videoRef.current) {
                                  const currentTime = videoRef.current.currentTime;
                                  const duration = videoRef.current.duration;
                                  setCurrentTime(currentTime);
                                  
                                  // Only log every 0.5 seconds to reduce console spam
                                  if (Math.floor(currentTime * 2) !== Math.floor((currentTime - 0.1) * 2)) {
                                    console.log('Video playing at:', currentTime.toFixed(2), '/', duration?.toFixed(2));
                                  }
                                }
                              }}
                              onError={(e) => {
                                console.error('Video preview error:', e);
                                console.error('Video src:', videoSrc);
                                console.error('File type:', file?.type);
                                console.error('Video readyState:', videoRef.current?.readyState);
                                console.error('Video networkState:', videoRef.current?.networkState);
                                setFileError("Failed to load video preview");
                              }}
                              onEnded={() => {
                                console.log('Video preview ended');
                              }}
                              onPause={() => {
                                console.log('Video preview paused at:', videoRef.current?.currentTime);
                              }}
                              onPlay={() => {
                                console.log('Video preview started playing');
                              }}
                              onStalled={() => {
                                console.log('Video preview stalled');
                              }}
                              onWaiting={() => {
                                console.log('Video preview waiting for data');
                              }}
                              onCanPlay={() => {
                                console.log('Video preview can play');
                              }}
                              onCanPlayThrough={() => {
                                console.log('Video preview can play through without buffering');
                              }}
                            >
                              Your browser does not support the video tag.
                            </video>
                          </div>
                        </div>

                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium text-foreground mb-1">{file.name}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {(file.size / (1024 * 1024)).toFixed(2)} MB • 
                              {videoDuration > 0 && ` ${formatDuration(videoDuration)} •`}
                              {" " + file.type}
                            </p>
                          </div>
                        </div>
                        
                        {/* Video Editing Tools */}
                        {showEditingTools && videoDuration > 0 && (
                          <div className="space-y-4 mt-4 p-4 bg-muted/50 rounded-lg">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium">Trim Video</h4>
                              <div className="text-sm text-muted-foreground bg-green-500/20 text-green-400 px-2 py-1 rounded">
                                {formatDuration(trimEnd - trimStart)}
                              </div>
                            </div>
                            
                            {/* Mobile-First Custom Trimmer */}
                            <div className="space-y-4">
                              {/* Time Display */}
                              <div className="grid grid-cols-2 gap-4">
                                <div className="bg-background/50 rounded-lg p-3 text-center">
                                  <div className="text-xs text-muted-foreground mb-1">Start</div>
                                  <div className="font-mono text-sm text-green-400">
                                    {formatDuration(trimStart)}
                                  </div>
                                </div>
                                <div className="bg-background/50 rounded-lg p-3 text-center">
                                  <div className="text-xs text-muted-foreground mb-1">End</div>
                                  <div className="font-mono text-sm text-red-400">
                                    {formatDuration(trimEnd)}
                                  </div>
                                </div>
                              </div>

                              {/* Custom Timeline */}
                              <div className="relative bg-background/30 rounded-lg p-4">
                                <div className="relative h-8 bg-muted/50 rounded-full overflow-hidden">
                                  {/* Timeline Track */}
                                  <div 
                                    className="absolute top-0 h-full bg-gradient-to-r from-green-500/60 to-red-500/60 rounded-full transition-all duration-200"
                                    style={{
                                      left: `${(trimStart / videoDuration) * 100}%`,
                                      width: `${((trimEnd - trimStart) / videoDuration) * 100}%`
                                    }}
                                  />
                                  
                                  {/* Start Handle */}
                                  <div 
                                    className="absolute top-0 h-full w-4 bg-green-500 rounded-full cursor-grab active:cursor-grabbing transition-all duration-200 hover:bg-green-400 shadow-lg"
                                    style={{
                                      left: `${(trimStart / videoDuration) * 100}%`,
                                      transform: 'translateX(-50%)'
                                    }}
                                    onMouseDown={(e) => {
                                      const rect = e.currentTarget.parentElement!.getBoundingClientRect();
                                      const startX = e.clientX;
                                      const startTime = trimStart;
                                      
                                      const handleMouseMove = (e: MouseEvent) => {
                                        const deltaX = e.clientX - startX;
                                        const deltaTime = (deltaX / rect.width) * videoDuration;
                                        const newStart = Math.max(0, Math.min(trimEnd - 0.5, startTime + deltaTime));
                                        setTrimStart(newStart);
                                      };
                                      
                                      const handleMouseUp = () => {
                                        document.removeEventListener('mousemove', handleMouseMove);
                                        document.removeEventListener('mouseup', handleMouseUp);
                                      };
                                      
                                      document.addEventListener('mousemove', handleMouseMove);
                                      document.addEventListener('mouseup', handleMouseUp);
                                    }}
                                    onTouchStart={(e) => {
                                      const rect = e.currentTarget.parentElement!.getBoundingClientRect();
                                      const startX = e.touches[0].clientX;
                                      const startTime = trimStart;
                                      
                                      const handleTouchMove = (e: TouchEvent) => {
                                        e.preventDefault();
                                        const deltaX = e.touches[0].clientX - startX;
                                        const deltaTime = (deltaX / rect.width) * videoDuration;
                                        const newStart = Math.max(0, Math.min(trimEnd - 0.5, startTime + deltaTime));
                                        setTrimStart(newStart);
                                      };
                                      
                                      const handleTouchEnd = () => {
                                        document.removeEventListener('touchmove', handleTouchMove);
                                        document.removeEventListener('touchend', handleTouchEnd);
                                      };
                                      
                                      document.addEventListener('touchmove', handleTouchMove);
                                      document.addEventListener('touchend', handleTouchEnd);
                                    }}
                                  >
                                    <div className="absolute -top-1 -bottom-1 -left-1 -right-1 bg-green-500/20 rounded-full animate-pulse" />
                                  </div>
                                  
                                  {/* End Handle */}
                                  <div 
                                    className="absolute top-0 h-full w-4 bg-red-500 rounded-full cursor-grab active:cursor-grabbing transition-all duration-200 hover:bg-red-400 shadow-lg"
                                    style={{
                                      left: `${(trimEnd / videoDuration) * 100}%`,
                                      transform: 'translateX(-50%)'
                                    }}
                                    onMouseDown={(e) => {
                                      const rect = e.currentTarget.parentElement!.getBoundingClientRect();
                                      const startX = e.clientX;
                                      const startTime = trimEnd;
                                      
                                      const handleMouseMove = (e: MouseEvent) => {
                                        const deltaX = e.clientX - startX;
                                        const deltaTime = (deltaX / rect.width) * videoDuration;
                                        const newEnd = Math.max(trimStart + 0.5, Math.min(videoDuration, startTime + deltaTime));
                                        setTrimEnd(newEnd);
                                      };
                                      
                                      const handleMouseUp = () => {
                                        document.removeEventListener('mousemove', handleMouseMove);
                                        document.removeEventListener('mouseup', handleMouseUp);
                                      };
                                      
                                      document.addEventListener('mousemove', handleMouseMove);
                                      document.addEventListener('mouseup', handleMouseUp);
                                    }}
                                    onTouchStart={(e) => {
                                      const rect = e.currentTarget.parentElement!.getBoundingClientRect();
                                      const startX = e.touches[0].clientX;
                                      const startTime = trimEnd;
                                      
                                      const handleTouchMove = (e: TouchEvent) => {
                                        e.preventDefault();
                                        const deltaX = e.touches[0].clientX - startX;
                                        const deltaTime = (deltaX / rect.width) * videoDuration;
                                        const newEnd = Math.max(trimStart + 0.5, Math.min(videoDuration, startTime + deltaTime));
                                        setTrimEnd(newEnd);
                                      };
                                      
                                      const handleTouchEnd = () => {
                                        document.removeEventListener('touchmove', handleTouchMove);
                                        document.removeEventListener('touchend', handleTouchEnd);
                                      };
                                      
                                      document.addEventListener('touchmove', handleTouchMove);
                                      document.addEventListener('touchend', handleTouchEnd);
                                    }}
                                  >
                                    <div className="absolute -top-1 -bottom-1 -left-1 -right-1 bg-red-500/20 rounded-full animate-pulse" />
                                  </div>
                                </div>
                                
                                {/* Timeline Markers */}
                                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                                  <span>0:00</span>
                                  <span>{formatDuration(videoDuration)}</span>
                                </div>
                              </div>

                              {/* Quick Actions */}
                              <div className="grid grid-cols-2 gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setTrimStart(0);
                                    setTrimEnd(videoDuration);
                                  }}
                                  className="flex items-center gap-2"
                                >
                                  <RotateCcw className="h-3 w-3" />
                                  Reset
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    if (videoRef.current) {
                                      videoRef.current.currentTime = trimStart;
                                      videoRef.current.play();
                                    }
                                  }}
                                  className="flex items-center gap-2"
                                >
                                  <Play className="h-3 w-3" />
                                  Preview
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}

                      </div>
                    ) : (
                      <div>
                        <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                        <p className="font-medium">Drag and drop your video or click to browse</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          MP4, WebM, or MOV up to 500MB
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {fileError && (
                    <Alert variant="gamefolioError" className="mt-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>{fileError}</AlertDescription>
                    </Alert>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="title" className="flex items-center gap-1">
                    Title 
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      titleRef.current = e.target.value;
                    }}
                    placeholder="Give your clip a catchy title"
                    maxLength={100}
                    required
                    className={hasAttemptedSubmit && !title.trim() ? 'border-destructive/50' : ''}
                  />
                  {hasAttemptedSubmit && !title.trim() && (
                    <p className="text-xs text-destructive">A title is required</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description (use @username to mention users)</Label>
                  <MentionInput
                    value={description}
                    onChange={(value) => {
                      setDescription(value);
                      descriptionRef.current = value;
                    }}
                    placeholder="Describe what's happening in your clip. Use @username to mention other users!"
                    className="min-h-24"
                    data-testid="input-description"
                  />
                </div>
                
                <div className="space-y-3 sm:space-y-2">
                  <Label htmlFor="game" className="flex items-center gap-1 text-base sm:text-sm font-medium">
                    Game 
                    <span className="text-destructive">*</span>
                  </Label>
                  <GameSelector 
                    games={[]}
                    selectedGame={selectedGame} 
                    onSelect={setSelectedGame} 
                  />
                  {!selectedGame && hasAttemptedSubmit && (
                    <p className="text-sm sm:text-xs text-destructive">Please select a game</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="tags" className="flex items-center gap-1">
                    Tags (minimum 2, up to 5)
                    <span className="text-destructive">*</span>
                  </Label>
                  <TagInput
                    tags={tags}
                    setTags={setTags}
                    maxTags={5}
                    placeholder="Add at least 2 tags and press Enter"
                  />
                  {hasAttemptedSubmit && tags.length < 2 && (
                    <p className="text-xs text-destructive">
                      Please add at least 2 tags to describe your clip ({tags.length}/2)
                    </p>
                  )}
                  {tags.length >= 2 && (
                    <p className="text-xs text-primary">
                      Great! You have {tags.length} tag{tags.length > 1 ? 's' : ''} added
                    </p>
                  )}
                </div>

                {/* Enhanced Upload Progress Visualization */}
                {isUploading && (
                  <div className="space-y-4 p-6 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border border-primary/30 rounded-lg shadow-lg">
                    {/* Header with animated icon */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                          </div>
                        </div>
                        <Label className="text-base font-semibold text-primary">
                          {uploadProgress < 100 ? "Uploading" : "Processing"}
                        </Label>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">{uploadProgress}%</div>
                        <div className="text-xs text-muted-foreground">
                          {uploadProgress < 100 ? "Upload in progress" : "Almost done!"}
                        </div>
                      </div>
                    </div>

                    {/* Enhanced Progress Bar */}
                    <div className="relative">
                      <div className="w-full h-3 bg-primary/20 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-300 ease-out relative"
                          style={{ width: `${uploadProgress}%` }}
                        >
                          {/* Animated shimmer effect */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
                          {/* Moving highlight */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-slide-right"></div>
                        </div>
                      </div>
                      {/* Progress markers */}
                      <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                        <span className={uploadProgress >= 25 ? "text-primary" : ""}>25%</span>
                        <span className={uploadProgress >= 50 ? "text-primary" : ""}>50%</span>
                        <span className={uploadProgress >= 75 ? "text-primary" : ""}>75%</span>
                        <span className={uploadProgress >= 100 ? "text-primary" : ""}>100%</span>
                      </div>
                    </div>

                    {/* Dynamic status messages */}
                    <div className="text-center space-y-2">
                      <div className="text-sm font-medium text-foreground">
                        {uploadProgress < 20 && "Preparing your video..."}
                        {uploadProgress >= 20 && uploadProgress < 60 && "Uploading to server..."}
                        {uploadProgress >= 60 && uploadProgress < 100 && "Almost there..."}
                        {uploadProgress >= 100 && "Processing video"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {uploadProgress < 100 ? (
                          <>
                            Uploading {file?.name} ({(file?.size ? file.size / (1024 * 1024) : 0).toFixed(1)} MB)
                          </>
                        ) : (
                          "Processing video"
                        )}
                      </div>
                    </div>

                    {/* Estimated time remaining */}
                    {uploadProgress < 100 && uploadProgress > 0 && (
                      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                        <div className="w-1 h-1 bg-primary rounded-full animate-pulse"></div>
                        <span>Please keep this tab open while uploading</span>
                        <div className="w-1 h-1 bg-primary rounded-full animate-pulse"></div>
                      </div>
                    )}
                  </div>
                )}
              </form>
            </CardContent>
            
            <CardFooter className="flex justify-between border-t pt-6">
              <div className="flex items-center space-x-2">
                <Video className="text-muted-foreground h-5 w-5" />
                <span className="text-sm text-muted-foreground">This clip will be shared publicly</span>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => navigate("/")}
                  disabled={isUploading}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={!file || !title.trim() || !selectedGame || tags.length < 2 || isUploading}
                  onClick={(e) => {
                    console.log('🚀 UPLOAD BUTTON CLICKED!');
                    console.log('Button type: button');
                    console.log('Calling handleSubmit directly');
                    handleSubmit(e);
                  }}
                >
                  {isUploading ? (
                    <div className="flex items-center">
                      <div className="w-4 h-4 rounded-full border-2 border-t-transparent border-white animate-spin mr-2"></div>
                      <span>
                        {uploadProgress < 100 ? `Uploading ${uploadProgress}%` : "Processing..."}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <polyline points="7,10 12,15 17,10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      Upload
                    </div>
                  )}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="reels" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Share your gaming reel</CardTitle>
              <CardDescription>
                Upload any video to create a reel! Videos will be automatically converted to vertical 9:16 format for optimal viewing.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="reel-video">Video File</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Info className="h-3 w-3 mr-1" />
                            <span>Maximum 500MB • Auto-converted to 9:16</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Supports MP4, WebM, or MOV formats. Videos will be automatically cropped and converted to 9:16 vertical format.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  
                  <div 
                    className={`border-2 border-dashed ${fileError ? 'border-destructive' : 'border-muted'} rounded-lg p-8 text-center ${!file ? 'cursor-pointer hover:border-primary transition-colors' : ''}`}
                    onClick={!file ? triggerFileInput : undefined}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      id="reel-video"
                      accept="video/mp4,video/webm,video/quicktime"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    
                    {file ? (
                      <div className="space-y-4">
                        {/* Video Preview */}
                        <div className="w-full max-w-md mx-auto mb-6">
                          <div className="relative bg-black rounded-lg overflow-hidden aspect-[9/16]">
                            <video
                              ref={videoRef}
                              src={videoSrc}
                              controls
                              preload="auto"
                              muted
                              playsInline
                              className="w-full h-full object-cover"
                              onLoadedMetadata={() => {
                                if (videoRef.current && videoDuration === 0) {
                                  const duration = videoRef.current.duration;
                                  setVideoDuration(duration);
                                  setTrimEnd(duration);
                                  setShowEditingTools(true);
                                  
                                  // Check if it's actually a reel (9:16 aspect ratio)
                                  const aspectRatio = videoRef.current.videoWidth / videoRef.current.videoHeight;
                                  const targetRatio = 9 / 16;
                                  if (Math.abs(aspectRatio - targetRatio) > 0.1) {
                                    toast({
                                      title: "Reel format warning",
                                      description: `Your video has a ${Math.round(aspectRatio * 100) / 100}:1 aspect ratio. Reels require vertical 9:16 format for upload.`,
                                      variant: "default",
                                    });
                                  }
                                  
                                  setTimeout(() => {
                                    generateThumbnails();
                                  }, 1000);
                                }
                              }}
                            />
                          </div>
                        </div>

                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium text-foreground mb-1">{file.name}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {(file.size / (1024 * 1024)).toFixed(2)} MB • 
                              {videoDuration > 0 && ` ${formatDuration(videoDuration)} •`}
                              {" " + file.type}
                            </p>
                          </div>
                        </div>
                        
                        {/* Video Editing Tools for Reels */}
                        {showEditingTools && videoDuration > 0 && (
                          <div className="space-y-4 mt-4 p-4 bg-muted/50 rounded-lg">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium">Trim Reel</h4>
                              <div className="text-sm text-muted-foreground bg-green-500/20 text-green-400 px-2 py-1 rounded">
                                {formatDuration(trimEnd - trimStart)}
                              </div>
                            </div>
                            
                            {/* Mobile-First Custom Trimmer */}
                            <div className="space-y-4">
                              {/* Time Display */}
                              <div className="grid grid-cols-2 gap-4">
                                <div className="bg-background/50 rounded-lg p-3 text-center">
                                  <div className="text-xs text-muted-foreground mb-1">Start</div>
                                  <div className="font-mono text-sm text-green-400">
                                    {formatDuration(trimStart)}
                                  </div>
                                </div>
                                <div className="bg-background/50 rounded-lg p-3 text-center">
                                  <div className="text-xs text-muted-foreground mb-1">End</div>
                                  <div className="font-mono text-sm text-red-400">
                                    {formatDuration(trimEnd)}
                                  </div>
                                </div>
                              </div>

                              {/* Custom Timeline */}
                              <div className="relative bg-background/30 rounded-lg p-4">
                                <div className="relative h-8 bg-muted/50 rounded-full overflow-hidden">
                                  {/* Timeline Track */}
                                  <div 
                                    className="absolute top-0 h-full bg-gradient-to-r from-green-500/60 to-red-500/60 rounded-full transition-all duration-200"
                                    style={{
                                      left: `${(trimStart / videoDuration) * 100}%`,
                                      width: `${((trimEnd - trimStart) / videoDuration) * 100}%`
                                    }}
                                  />
                                  
                                  {/* Start Handle */}
                                  <div 
                                    className="absolute top-0 h-full w-4 bg-green-500 rounded-full cursor-grab active:cursor-grabbing transition-all duration-200 hover:bg-green-400 shadow-lg"
                                    style={{
                                      left: `${(trimStart / videoDuration) * 100}%`,
                                      transform: 'translateX(-50%)'
                                    }}
                                    onMouseDown={(e) => {
                                      const rect = e.currentTarget.parentElement!.getBoundingClientRect();
                                      const startX = e.clientX;
                                      const startTime = trimStart;
                                      
                                      const handleMouseMove = (e: MouseEvent) => {
                                        const deltaX = e.clientX - startX;
                                        const deltaTime = (deltaX / rect.width) * videoDuration;
                                        const newStart = Math.max(0, Math.min(trimEnd - 0.5, startTime + deltaTime));
                                        setTrimStart(newStart);
                                      };
                                      
                                      const handleMouseUp = () => {
                                        document.removeEventListener('mousemove', handleMouseMove);
                                        document.removeEventListener('mouseup', handleMouseUp);
                                      };
                                      
                                      document.addEventListener('mousemove', handleMouseMove);
                                      document.addEventListener('mouseup', handleMouseUp);
                                    }}
                                    onTouchStart={(e) => {
                                      const rect = e.currentTarget.parentElement!.getBoundingClientRect();
                                      const startX = e.touches[0].clientX;
                                      const startTime = trimStart;
                                      
                                      const handleTouchMove = (e: TouchEvent) => {
                                        e.preventDefault();
                                        const deltaX = e.touches[0].clientX - startX;
                                        const deltaTime = (deltaX / rect.width) * videoDuration;
                                        const newStart = Math.max(0, Math.min(trimEnd - 0.5, startTime + deltaTime));
                                        setTrimStart(newStart);
                                      };
                                      
                                      const handleTouchEnd = () => {
                                        document.removeEventListener('touchmove', handleTouchMove);
                                        document.removeEventListener('touchend', handleTouchEnd);
                                      };
                                      
                                      document.addEventListener('touchmove', handleTouchMove);
                                      document.addEventListener('touchend', handleTouchEnd);
                                    }}
                                  >
                                    <div className="absolute -top-1 -bottom-1 -left-1 -right-1 bg-green-500/20 rounded-full animate-pulse" />
                                  </div>
                                  
                                  {/* End Handle */}
                                  <div 
                                    className="absolute top-0 h-full w-4 bg-red-500 rounded-full cursor-grab active:cursor-grabbing transition-all duration-200 hover:bg-red-400 shadow-lg"
                                    style={{
                                      left: `${(trimEnd / videoDuration) * 100}%`,
                                      transform: 'translateX(-50%)'
                                    }}
                                    onMouseDown={(e) => {
                                      const rect = e.currentTarget.parentElement!.getBoundingClientRect();
                                      const startX = e.clientX;
                                      const startTime = trimEnd;
                                      
                                      const handleMouseMove = (e: MouseEvent) => {
                                        const deltaX = e.clientX - startX;
                                        const deltaTime = (deltaX / rect.width) * videoDuration;
                                        const newEnd = Math.max(trimStart + 0.5, Math.min(videoDuration, startTime + deltaTime));
                                        setTrimEnd(newEnd);
                                      };
                                      
                                      const handleMouseUp = () => {
                                        document.removeEventListener('mousemove', handleMouseMove);
                                        document.removeEventListener('mouseup', handleMouseUp);
                                      };
                                      
                                      document.addEventListener('mousemove', handleMouseMove);
                                      document.addEventListener('mouseup', handleMouseUp);
                                    }}
                                    onTouchStart={(e) => {
                                      const rect = e.currentTarget.parentElement!.getBoundingClientRect();
                                      const startX = e.touches[0].clientX;
                                      const startTime = trimEnd;
                                      
                                      const handleTouchMove = (e: TouchEvent) => {
                                        e.preventDefault();
                                        const deltaX = e.touches[0].clientX - startX;
                                        const deltaTime = (deltaX / rect.width) * videoDuration;
                                        const newEnd = Math.max(trimStart + 0.5, Math.min(videoDuration, startTime + deltaTime));
                                        setTrimEnd(newEnd);
                                      };
                                      
                                      const handleTouchEnd = () => {
                                        document.removeEventListener('touchmove', handleTouchMove);
                                        document.removeEventListener('touchend', handleTouchEnd);
                                      };
                                      
                                      document.addEventListener('touchmove', handleTouchMove);
                                      document.addEventListener('touchend', handleTouchEnd);
                                    }}
                                  >
                                    <div className="absolute -top-1 -bottom-1 -left-1 -right-1 bg-red-500/20 rounded-full animate-pulse" />
                                  </div>
                                </div>
                                
                                {/* Timeline Markers */}
                                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                                  <span>0:00</span>
                                  <span>{formatDuration(videoDuration)}</span>
                                </div>
                              </div>

                              {/* Quick Actions */}
                              <div className="grid grid-cols-2 gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setTrimStart(0);
                                    setTrimEnd(videoDuration);
                                  }}
                                  className="flex items-center gap-2"
                                >
                                  <RotateCcw className="h-3 w-3" />
                                  Reset
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    if (videoRef.current) {
                                      videoRef.current.currentTime = trimStart;
                                      videoRef.current.play();
                                    }
                                  }}
                                  className="flex items-center gap-2"
                                >
                                  <Play className="h-3 w-3" />
                                  Preview
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <Camera className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                        <p className="font-medium">Drag and drop your video or click to browse</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          MP4, WebM, or MOV up to 500MB • Videos automatically converted to 9:16 reel format
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {fileError && (
                    <Alert variant="gamefolioError" className="mt-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>{fileError}</AlertDescription>
                    </Alert>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="reel-title" className="flex items-center gap-1">
                    Title 
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="reel-title"
                    defaultValue={title}
                    onChange={(e) => titleRef.current = e.target.value}
                    onBlur={(e) => setTitle(e.target.value)}
                    placeholder="Give your reel a catchy title"
                    maxLength={100}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="reel-description">Description (use @username to mention users)</Label>
                  <MentionInput
                    value={description}
                    onChange={(value) => {
                      setDescription(value);
                      descriptionRef.current = value;
                    }}
                    placeholder="Describe what's happening in your reel. Use @username to mention other users!"
                    className="min-h-24"
                    data-testid="input-reel-description"
                  />
                </div>
                
                <div className="space-y-3 sm:space-y-2">
                  <Label htmlFor="reel-game" className="flex items-center gap-1 text-base sm:text-sm font-medium">
                    Game 
                    <span className="text-destructive">*</span>
                  </Label>
                  <GameSelector 
                    games={[]}
                    selectedGame={selectedGame} 
                    onSelect={setSelectedGame} 
                  />
                  {!selectedGame && hasAttemptedSubmit && (
                    <p className="text-sm sm:text-xs text-destructive">Please select a game</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="reel-tags" className="flex items-center gap-1">
                    Tags (minimum 2, up to 5)
                    <span className="text-destructive">*</span>
                  </Label>
                  <TagInput
                    tags={tags}
                    setTags={setTags}
                    maxTags={5}
                    placeholder="Add at least 2 tags and press Enter"
                  />
                </div>

                {/* Enhanced Upload Progress Visualization for Reels */}
                {isUploading && (
                  <div className="space-y-4 p-6 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border border-primary/30 rounded-lg shadow-lg">
                    {/* Header with animated icon */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                          </div>
                        </div>
                        <Label className="text-base font-semibold text-primary">
                          {uploadProgress < 100 ? "Uploading" : "Processing"}
                        </Label>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">{uploadProgress}%</div>
                        <div className="text-xs text-muted-foreground">
                          {uploadProgress < 100 ? "Upload in progress" : "Converting to 9:16 format..."}
                        </div>
                      </div>
                    </div>

                    {/* Enhanced Progress Bar */}
                    <div className="relative">
                      <div className="w-full h-3 bg-primary/20 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-300 ease-out relative"
                          style={{ width: `${uploadProgress}%` }}
                        >
                          {/* Animated shimmer effect */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
                          {/* Moving highlight */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-slide-right"></div>
                        </div>
                      </div>
                      {/* Progress markers */}
                      <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                        <span className={uploadProgress >= 25 ? "text-primary" : ""}>25%</span>
                        <span className={uploadProgress >= 50 ? "text-primary" : ""}>50%</span>
                        <span className={uploadProgress >= 75 ? "text-primary" : ""}>75%</span>
                        <span className={uploadProgress >= 100 ? "text-primary" : ""}>100%</span>
                      </div>
                    </div>

                    {/* Dynamic status messages for reels */}
                    <div className="text-center space-y-2">
                      <div className="text-sm font-medium text-foreground">
                        {uploadProgress < 20 && "Preparing your reel..."}
                        {uploadProgress >= 20 && uploadProgress < 60 && "Uploading to server..."}
                        {uploadProgress >= 60 && uploadProgress < 100 && "Almost there..."}
                        {uploadProgress >= 100 && "Converting to 9:16 reel format"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {uploadProgress < 100 ? (
                          <>
                            Uploading {file?.name} ({(file?.size ? file.size / (1024 * 1024) : 0).toFixed(1)} MB)
                          </>
                        ) : (
                          "Processing and cropping video to vertical format"
                        )}
                      </div>
                    </div>

                    {/* Estimated time remaining */}
                    {uploadProgress < 100 && uploadProgress > 0 && (
                      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                        <div className="w-1 h-1 bg-primary rounded-full animate-pulse"></div>
                        <span>Please keep this tab open while uploading</span>
                        <div className="w-1 h-1 bg-primary rounded-full animate-pulse"></div>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => navigate("/")}
                    disabled={isUploading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    disabled={!file || !title.trim() || !selectedGame || tags.length < 2 || isUploading}
                    onClick={(e) => {
                      console.log('🚀 REEL UPLOAD BUTTON CLICKED!');
                      console.log('Button type: button');
                      console.log('Calling handleSubmit directly');
                      handleSubmit(e);
                    }}
                  >
                    {isUploading ? (
                      <div className="flex items-center">
                        <div className="w-4 h-4 rounded-full border-2 border-t-transparent border-white animate-spin mr-2"></div>
                        <span>
                          {uploadProgress < 100 ? `Uploading ${uploadProgress}%` : "Processing..."}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Camera className="h-4 w-4" />
                        Upload Reel
                      </div>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="screenshots" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Share your gaming screenshot</CardTitle>
              <CardDescription>
                Upload a screenshot to share with the Gamefolio community
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => {
                e.preventDefault();
                
                if (!screenshotFile) {
                  toast({
                    title: "No screenshot selected",
                    description: "Please select a screenshot to upload.",
                    variant: "gamefolioError",
                  });
                  return;
                }
                
                if (!screenshotTitle.trim()) {
                  toast({
                    title: "Title required",
                    description: "Please enter a title for your screenshot.",
                    variant: "gamefolioError",
                  });
                  return;
                }
                
                if (!screenshotSelectedGame) {
                  toast({
                    title: "Game required",
                    description: "Please select a game for your screenshot.",
                    variant: "gamefolioError",
                  });
                  return;
                }
                
                if (screenshotTags.length < 2) {
                  toast({
                    title: "Tags required",
                    description: "Please add at least 2 tags for your screenshot.",
                    variant: "gamefolioError",
                  });
                  return;
                }
                
                screenshotUploadMutation.mutate();
              }} className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="screenshot">Screenshot File</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Info className="h-3 w-3 mr-1" />
                            <span>Maximum 20MB</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Supports JPEG, PNG, or JPG formats</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  
                  <div 
                    className={`border-2 border-dashed ${screenshotError ? 'border-destructive' : 'border-muted'} rounded-lg p-8 text-center ${!screenshotFile ? 'cursor-pointer hover:border-primary transition-colors' : ''}`}
                    onClick={!screenshotFile ? () => document.getElementById('screenshot')?.click() : undefined}
                  >
                    <input
                      type="file"
                      id="screenshot"
                      accept="image/jpeg,image/png,image/jpg"
                      onChange={handleScreenshotChange}
                      className="hidden"
                    />
                    
                    {screenshotFile && screenshotPreview ? (
                      <div className="space-y-4">
                        {/* Screenshot Preview */}
                        <div className="w-full max-w-2xl mx-auto mb-6">
                          <div className="relative bg-black rounded-lg overflow-hidden">
                            <img
                              src={screenshotPreview}
                              alt="Screenshot preview"
                              className="w-full h-auto max-h-96 object-contain"
                            />
                          </div>
                        </div>

                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium text-foreground mb-1">{screenshotFile.name}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {(screenshotFile.size / (1024 * 1024)).toFixed(2)} MB • {screenshotFile.type}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setScreenshotFile(null);
                              setScreenshotPreview("");
                              URL.revokeObjectURL(screenshotPreview);
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <Image className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                        <p className="font-medium">Drag and drop your screenshot or click to browse</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          JPEG, PNG, or JPG up to 20MB
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {screenshotError && (
                    <Alert variant="gamefolioError" className="mt-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>{screenshotError}</AlertDescription>
                    </Alert>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="screenshot-title" className="flex items-center gap-1">
                    Title 
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="screenshot-title"
                    value={screenshotTitle}
                    onChange={(e) => setScreenshotTitle(e.target.value)}
                    placeholder="Give your screenshot a descriptive title"
                    maxLength={100}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="screenshot-description">Description (use @username to mention users)</Label>
                  <MentionInput
                    value={screenshotDescription}
                    onChange={setScreenshotDescription}
                    placeholder="Describe what's happening in your screenshot. Use @username to mention other users!"
                    className="min-h-24"
                    data-testid="input-screenshot-description"
                  />
                </div>
                
                <div className="space-y-3 sm:space-y-2">
                  <Label htmlFor="screenshot-game" className="flex items-center gap-1 text-base sm:text-sm font-medium">
                    Game 
                    <span className="text-destructive">*</span>
                  </Label>
                  <GameSelector 
                    games={[]}
                    selectedGame={screenshotSelectedGame} 
                    onSelect={setScreenshotSelectedGame} 
                  />
                  {!screenshotSelectedGame && hasAttemptedSubmit && (
                    <p className="text-sm sm:text-xs text-destructive">Please select a game</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="screenshot-tags" className="flex items-center gap-1">
                    Tags (minimum 2, up to 5)
                    <span className="text-destructive">*</span>
                  </Label>
                  <TagInput
                    tags={screenshotTags}
                    setTags={setScreenshotTags}
                    maxTags={5}
                    placeholder="Add at least 2 tags and press Enter"
                  />
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => navigate("/")}
                    disabled={screenshotUploadMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={!screenshotFile || !screenshotTitle.trim() || !screenshotSelectedGame || screenshotTags.length < 2 || screenshotUploadMutation.isPending}
                  >
                    {screenshotUploadMutation.isPending ? (
                      <div className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Uploading...
                      </div>
                    ) : "Upload Screenshot"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Share Dialog for uploaded content */}
      <ShareDialog
        isOpen={showShareDialog}
        onClose={() => {
          setShowShareDialog(false);
          setUploadedClip(null);
        }}
        contentTitle={uploadedClip?.title || ''}
        shareUrl={uploadedClip?.clipUrl || ''}
        qrCode={uploadedClip?.qrCode || ''}
        socialMediaLinks={uploadedClip?.socialMediaLinks || {}}
        contentType="clip"
      />
      
      <ShareDialog
        isOpen={showScreenshotShareDialog}
        onClose={() => {
          setShowScreenshotShareDialog(false);
          setUploadedScreenshot(null);
        }}
        contentTitle={uploadedScreenshot?.title || ''}
        shareUrl={uploadedScreenshot?.screenshotUrl || ''}
        qrCode={uploadedScreenshot?.qrCode || ''}
        socialMediaLinks={uploadedScreenshot?.socialMediaLinks || {}}
        contentType="screenshot"
        previewUrl={uploadedScreenshot?.screenshotUrl || ''}
      />
    </div>
  );
};

export default UploadPage;