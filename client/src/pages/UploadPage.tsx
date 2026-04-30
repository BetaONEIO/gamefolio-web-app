import { useState, useRef, useEffect, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import { Checkbox } from "@/components/ui/checkbox";
import * as tus from "tus-js-client";
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
  RotateCcw,
  X
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { DualRangeSlider } from "@/components/ui/slider";
import SimpleVideoPlayer from "@/components/shared/SimpleVideoPlayer";
import { ShareDialog } from "@/components/shared/ShareDialog";
import ProUpgradeDialog from "@/components/ProUpgradeDialog";
import { XPGainedDialog } from "@/components/gamification/XPGainedDialog";
import { ToastAction } from "@/components/ui/toast";
import type { UploadLimits } from "@shared/schema";

// Shape of the structured payload the server returns from /api/upload/* and
// /api/screenshots/upload when an upload is rejected for a tier limit.
interface UploadErrorPayload {
  error?: string;
  message?: string;
  limits?: UploadLimits;
}

// Error thrown by upload mutations when the server returns the structured
// payload above. Carrying `limits` lets the onError handler surface a
// Pro-upgrade CTA when the rejection is a Free-user tier-limit failure
// (HTTP 403 / 413) rather than a generic transport error.
class UploadLimitError extends Error {
  limits?: UploadLimits;
  constructor(message: string, limits?: UploadLimits) {
    super(message);
    this.name = "UploadLimitError";
    this.limits = limits;
  }
}

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
  
  // Read the type and game from URL query parameter or sessionStorage and set it on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const typeParam = urlParams.get('type');
    const gameIdParam = urlParams.get('gameId');
    const gameNameParam = urlParams.get('gameName');
    const gameImageParam = urlParams.get('gameImage');
    
    const storedType = sessionStorage.getItem('uploadContentType');
    
    const finalType = typeParam || storedType;
    
    if (finalType === 'clips' || finalType === 'reels' || finalType === 'screenshots') {
      setContentType(finalType);
    }
    
    const storedGameId = sessionStorage.getItem('uploadGameId');
    const storedGameName = sessionStorage.getItem('uploadGameName');
    const storedGameImage = sessionStorage.getItem('uploadGameImage');

    const finalGameId = gameIdParam || storedGameId;
    const finalGameName = gameNameParam || storedGameName;
    const finalGameImage = gameImageParam || storedGameImage;

    if (finalGameId && finalGameName) {
      const gameFromUrl: Game = {
        id: parseInt(finalGameId),
        name: finalGameName,
        imageUrl: finalGameImage || null,
        twitchId: null,
        createdAt: new Date(),
      };
      setSelectedGame(gameFromUrl);
      setScreenshotSelectedGame(gameFromUrl);
    }
    
    if (storedType) {
      sessionStorage.removeItem('uploadContentType');
    }
    sessionStorage.removeItem('uploadGameId');
    sessionStorage.removeItem('uploadGameName');
    sessionStorage.removeItem('uploadGameImage');
  }, []);
  
  // Watch for upload type changes from the header dropdown when already on the upload page
  useEffect(() => {
    const handleTypeChange = (e: Event) => {
      const type = (e as CustomEvent).detail;
      if (type === 'clips' || type === 'reels' || type === 'screenshots') {
        setContentType(type);
      }
    };
    window.addEventListener('upload-type-change', handleTypeChange);
    return () => window.removeEventListener('upload-type-change', handleTypeChange);
  }, []);

  // Screenshot-specific state - supports multiple screenshots
  const [screenshotFiles, setScreenshotFiles] = useState<File[]>([]);
  const [screenshotPreviews, setScreenshotPreviews] = useState<string[]>([]);
  const [screenshotError, setScreenshotError] = useState<string | null>(null);
  const [cropPosition, setCropPosition] = useState({ x: 0, y: 0 });
  const [cropSize, setCropSize] = useState({ width: 100, height: 100 });
  const [screenshotScale, setScreenshotScale] = useState(1);
  const [screenshotTitle, setScreenshotTitle] = useState("");
  const [screenshotDescription, setScreenshotDescription] = useState("");
  const [screenshotSelectedGame, setScreenshotSelectedGame] = useState<Game | null>(null);
  const [screenshotTags, setScreenshotTags] = useState<string[]>([]);
  const [screenshotAgeRestricted, setScreenshotAgeRestricted] = useState(false);
  
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
  const [ageRestricted, setAgeRestricted] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const uploadAbortRef = useRef<AbortController | null>(null);
  
  // XP Dialog state
  const [showProUpgrade, setShowProUpgrade] = useState(false);
  const [xpDialogOpen, setXpDialogOpen] = useState(false);
  const [xpGained, setXpGained] = useState(0);
  const [userXP, setUserXP] = useState(0);
  const [userLevel, setUserLevel] = useState(1);
  const [uploadSuccessData, setUploadSuccessData] = useState<any>(null);
  
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
  
  // Reel zoom/crop state for non-9:16 videos
  const [reelZoom, setReelZoom] = useState(1);
  const [reelPanX, setReelPanX] = useState(0);
  const [reelPanY, setReelPanY] = useState(0);
  const [isReelAspectMismatch, setIsReelAspectMismatch] = useState(false);
  const [videoAspectRatio, setVideoAspectRatio] = useState(0);
  const [isDraggingReel, setIsDraggingReel] = useState(false);
  const reelDragStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const [isDraggingClip, setIsDraggingClip] = useState(false);
  const [isDraggingReelDrop, setIsDraggingReelDrop] = useState(false);
  const [isDraggingScreenshot, setIsDraggingScreenshot] = useState(false);
  
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

  // Fetch upload limits (size + duration only — no count caps)
  const { data: uploadLimits, isLoading: limitsLoading } = useQuery<{
    isPro: boolean;
    maxClipSizeMB: number;
    maxReelSizeMB: number;
    maxScreenshotSizeMB: number;
    maxClipDurationSeconds: number;
    maxReelDurationSeconds: number;
  }>({
    queryKey: ['/api/upload/limits'],
    enabled: !!userId,
  });

  // Reset form function
  const resetFormAndNavigate = () => {
    setFile(null);
    setTitle("");
    setDescription("");
    setSelectedGame(null);
    setTags([]);
    setAgeRestricted(false);
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
    // Revoke all blob URLs to free memory
    screenshotPreviews.forEach(url => URL.revokeObjectURL(url));
    
    setScreenshotFiles([]);
    setScreenshotPreviews([]);
    setScreenshotTitle("");
    setScreenshotDescription("");
    setScreenshotSelectedGame(null);
    setScreenshotTags([]);
    setScreenshotAgeRestricted(false);
    setShowScreenshotShareDialog(false);
    setUploadedScreenshot(null);
    // Note: Navigation is now handled in XP dialog onContinue callback
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
    
    // Use 9:16 aspect ratio for reels, 16:9 for clips
    const isReelVideo = contentType === 'reels';
    canvas.width = isReelVideo ? 180 : 320;
    canvas.height = isReelVideo ? 320 : 180;
    
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

    // Validate file size against the user's tier limit (clip vs reel).
    const isReelUpload = contentType === 'reels';
    const maxSizeMB = uploadLimits
      ? (isReelUpload ? uploadLimits.maxReelSizeMB : uploadLimits.maxClipSizeMB)
      : (isReelUpload ? 50 : 100);
    const maxSize = maxSizeMB * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      console.log('File too large:', selectedFile.size, 'bytes');
      setFileError(`File size must be less than ${maxSizeMB}MB${uploadLimits && !uploadLimits.isPro ? ' — upgrade to Pro for larger uploads.' : '.'}`);
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
    setReelZoom(1);
    setReelPanX(0);
    setReelPanY(0);
    setIsReelAspectMismatch(false);
    setVideoAspectRatio(0);
    
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

  // Screenshot file handling - supports adding multiple files
  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setScreenshotError(null);

    // Validate each file
    for (const file of files) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        setScreenshotError("Please upload valid image files (JPEG, PNG, or JPG)");
        return;
      }
      
      // Validate file size against the user's tier screenshot cap.
      const maxImageMB = uploadLimits?.maxScreenshotSizeMB ?? 10;
      const maxSize = maxImageMB * 1024 * 1024;
      if (file.size > maxSize) {
        setScreenshotError(`Each image must be less than ${maxImageMB}MB${uploadLimits && !uploadLimits.isPro ? ' — upgrade to Pro for larger uploads.' : '.'}`);
        return;
      }
    }
    
    // Add files and create previews synchronously to keep them in sync
    const newFiles = [...screenshotFiles, ...files];
    const newPreviews = [...screenshotPreviews, ...files.map(file => URL.createObjectURL(file))];
    
    setScreenshotFiles(newFiles);
    setScreenshotPreviews(newPreviews);
    
    // Clear the input so the same file can be selected again if needed
    e.target.value = '';
  };
  
  // Remove screenshot from array
  const removeScreenshot = (index: number) => {
    // Revoke the blob URL to free memory
    if (screenshotPreviews[index]) {
      URL.revokeObjectURL(screenshotPreviews[index]);
    }
    
    const newFiles = screenshotFiles.filter((_, i) => i !== index);
    const newPreviews = screenshotPreviews.filter((_, i) => i !== index);
    setScreenshotFiles(newFiles);
    setScreenshotPreviews(newPreviews);
  };

  // Screenshot upload mutation - Updated to handle multiple screenshots
  const screenshotUploadMutation = useMutation({
    mutationFn: async () => {
      if (screenshotFiles.length === 0) throw new Error("No screenshots selected");
      if (!user) throw new Error("You must be logged in to upload screenshots");
      
      // Upload each screenshot separately
      const uploadPromises = screenshotFiles.map(async (file) => {
        const formData = new FormData();
        formData.append("title", screenshotTitle.trim());
        formData.append("description", screenshotDescription.trim());
        if (screenshotSelectedGame) {
          formData.append("gameId", screenshotSelectedGame.id.toString());
          formData.append("gameName", screenshotSelectedGame.name);
          formData.append("gameImageUrl", screenshotSelectedGame.imageUrl || '');
        }
        formData.append("tags", JSON.stringify(screenshotTags));
        formData.append("ageRestricted", screenshotAgeRestricted.toString());
        formData.append("screenshot", file);
        
        const response = await fetch("/api/screenshots/upload", {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        
        if (!response.ok) {
          // Server returns the structured { error, message, limits } payload
          // for tier-limit rejections. Surface the friendly tier-aware
          // message and forward `limits` so the toast can render a
          // Pro-upgrade CTA for Free users.
          const errorData: UploadErrorPayload = await response.json().catch(
            (): UploadErrorPayload => ({}),
          );
          throw new UploadLimitError(
            errorData.message || errorData.error || "Failed to upload screenshot",
            errorData.limits,
          );
        }
        
        return response.json();
      });
      
      const results = await Promise.all(uploadPromises);
      return results[results.length - 1]; // Return the last result for consistency
    },
    onSuccess: async (data) => {
      console.log('Screenshot upload success data:', data);
      
      // Invalidate all relevant queries to ensure the new screenshot appears everywhere
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/screenshots`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.username}/screenshots`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.username}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/upload/limits'] });
      
      // Reset form first
      resetScreenshotForm();
      
      // Show XP dialog with navigation data stored for later
      setUploadSuccessData({
        type: 'screenshot',
        id: data.screenshot?.id
      });
      const gainedXP = data.xpGained || 5;
      const currentXP = (data.userXP || 0) + gainedXP;
      setXpGained(gainedXP);
      setUserXP(currentXP);
      setUserLevel(data.userLevel || 1);
      
      // Refetch user data for UI updates
      queryClient.refetchQueries({ queryKey: ['/api/user'] });
      
      // Open dialog with updated XP data from backend
      setXpDialogOpen(true);
    },
    onError: (error: Error) => {
      const limits = error instanceof UploadLimitError ? error.limits : undefined;
      const showUpgradeCta = limits ? limits.isPro === false : false;
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "gamefolioError",
        action: showUpgradeCta ? (
          <ToastAction
            altText="Upgrade to Pro"
            onClick={() => setShowProUpgrade(true)}
          >
            Upgrade to Pro
          </ToastAction>
        ) : undefined,
      });
    },
  });

  // Warn user before leaving page during active upload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isUploading) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (uploadAbortRef.current) {
        uploadAbortRef.current.abort();
        uploadAbortRef.current = null;
      }
    };
  }, [isUploading]);

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

      const videoType: 'clip' | 'reel' = contentType === 'clips' ? 'clip' : 'reel';
      
      console.log('Video type for upload (based on user selection):', videoType);

      setIsUploading(true);
      setUploadProgress(0);

      const abortController = new AbortController();
      uploadAbortRef.current = abortController;
      const { signal } = abortController;

      return new Promise(async (resolve, reject) => {
        try {
          console.log('Starting direct Supabase upload from client');
          
          const timestamp = Date.now();
          const randomId = Math.random().toString(36).substring(2, 15);
          const extension = file.name.split('.').pop();
          const prefix = videoType === 'reel' ? 'reels' : 'videos';
          const fileName = `${prefix}/${timestamp}-${randomId}.${extension}`;
          const filePath = `users/${user.id}/${fileName}`;
          
          setUploadProgress(5);
          
          const credsResponse = await fetch('/api/upload/supabase-creds', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filePath, contentType: file.type }),
            signal,
          });
          
          if (!credsResponse.ok) {
            throw new Error('Failed to get upload credentials');
          }
          
          const credsData = await credsResponse.json();
          const { uploadUrl, publicUrl } = credsData;
          console.log('Got upload URL for direct upload');
          setUploadProgress(15);
          
          await new Promise<void>((resolveUpload, rejectUpload) => {
            const xhr = new XMLHttpRequest();
            xhr.open('PUT', uploadUrl);
            xhr.setRequestHeader('Content-Type', file.type);
            xhr.setRequestHeader('x-upsert', 'false');
            
            xhr.upload.onprogress = (event) => {
              if (event.lengthComputable) {
                const uploadPercent = Math.round((event.loaded / event.total) * 100);
                setUploadProgress(20 + Math.round(uploadPercent * 0.65));
              }
            };
            
            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                console.log('Direct Supabase upload complete');
                setUploadProgress(85);
                resolveUpload();
              } else {
                console.error('Supabase upload error:', xhr.responseText);
                rejectUpload(new Error(`Direct upload to Supabase failed: ${xhr.status}`));
              }
            };
            
            xhr.onerror = () => {
              rejectUpload(new Error('Upload network error'));
            };
            
            signal.addEventListener('abort', () => {
              xhr.abort();
              rejectUpload(new Error('Upload cancelled'));
            });
            
            xhr.send(file);
          });
          
          const processData = {
            uploadResult: { url: publicUrl, path: filePath },
            title: titleRef.current || title,
            description: descriptionRef.current || description,
            gameId: selectedGame ? parseInt(selectedGame.id.toString()) : null,
            tags,
            videoType,
            ageRestricted,
            trimStart: Math.round(trimStart),
            trimEnd: Math.round(trimEnd),
          };
          
          console.log('🔞 Age Restriction Debug - Sending to backend:', {
            ageRestricted,
            ageRestrictedType: typeof ageRestricted,
            fullProcessData: processData
          });
          
          const processResponse = await fetch('/api/upload/process-video', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(processData),
            signal,
          });
          
          if (!processResponse.ok) {
            // /api/upload/process-video returns { error, message, limits }
            // for tier-limit rejections (HTTP 403). Use the friendly
            // tier-aware `message` and forward `limits` so the toast can
            // render an Upgrade-to-Pro CTA for Free users.
            const errorData: UploadErrorPayload = await processResponse.json().catch(
              (): UploadErrorPayload => ({}),
            );
            throw new UploadLimitError(
              errorData.message || errorData.error || 'Video processing failed',
              errorData.limits,
            );
          }
          
          const processResult = await processResponse.json();
          setUploadProgress(100);
          console.log('Video processing successful:', processResult);
          
          uploadAbortRef.current = null;
          resolve(processResult);
          
        } catch (error: any) {
          uploadAbortRef.current = null;
          if (error?.name === 'AbortError') {
            console.log('Upload was cancelled');
            reject(new Error('Upload cancelled'));
          } else {
            console.error('Upload error:', error);
            reject(error);
          }
        }
      });
    },
    onSuccess: async (data: any) => {
      // Invalidate all relevant queries to ensure the new clip appears everywhere
      queryClient.invalidateQueries({ queryKey: ["/api/clips"] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.username}/clips`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.username}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/upload/limits'] });
      
      setIsUploading(false);
      setUploadProgress(0);
      
      // Reset form first
      resetFormAndNavigate();
      
      // Store upload success data for navigation after XP dialog
      const uploadedContentType = contentType === 'reels' ? 'reel' : 'clip';
      const contentId = data.clip?.id || data.id;
      
      setUploadSuccessData({
        type: uploadedContentType,
        id: contentId
      });
      const gainedXP = data.xpGained || 5;
      const currentXP = (data.clip?.userXP || data.userXP || 0) + gainedXP;
      setXpGained(gainedXP);
      setUserXP(currentXP);
      setUserLevel(data.clip?.userLevel || data.userLevel || 1);
      
      // Refetch user data for UI updates
      queryClient.refetchQueries({ queryKey: ['/api/user'] });
      
      // Open dialog with updated XP data from backend
      setXpDialogOpen(true);
    },
    onError: (error: Error) => {
      console.error('Upload mutation error:', error);
      const limits = error instanceof UploadLimitError ? error.limits : undefined;
      const showUpgradeCta = limits ? limits.isPro === false : false;
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "gamefolioError",
        action: showUpgradeCta ? (
          <ToastAction
            altText="Upgrade to Pro"
            onClick={() => setShowProUpgrade(true)}
          >
            Upgrade to Pro
          </ToastAction>
        ) : undefined,
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
    
    // Validate video duration against the user's tier limit.
    const isReelSubmit = contentType === 'reels';
    const maxDurationSec = uploadLimits
      ? (isReelSubmit ? uploadLimits.maxReelDurationSeconds : uploadLimits.maxClipDurationSeconds)
      : (isReelSubmit ? 60 : 180);
    if (videoDuration > maxDurationSec) {
      const limitLabel = maxDurationSec >= 60
        ? `${Math.round(maxDurationSec / 60 * 10) / 10} minutes`
        : `${maxDurationSec} seconds`;
      toast({
        title: "Video too long",
        description: `Your video is ${Math.round(videoDuration / 60 * 10) / 10} minutes long. ${isReelSubmit ? 'Reels' : 'Clips'} must be ${limitLabel} or less${uploadLimits && !uploadLimits.isPro ? ' — upgrade to Pro for longer videos.' : '.'}`,
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
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">Upload Content</h1>
      </div>
      
      <EmailVerificationBanner />

      {/* Upload Limits Display — unlimited uploads, capped by file size & duration */}
      {!limitsLoading && uploadLimits && !uploadLimits.isPro && (
        <Alert className="mb-4">
          <Info className="h-4 w-4" />
          <AlertTitle>Upload Limits</AlertTitle>
          <AlertDescription>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm">
              <span>Clips: up to {uploadLimits.maxClipSizeMB}MB · {Math.round(uploadLimits.maxClipDurationSeconds / 60)} min</span>
              <span>Reels: up to {uploadLimits.maxReelSizeMB}MB · {uploadLimits.maxReelDurationSeconds}s</span>
              <span>Screenshots: up to {uploadLimits.maxScreenshotSizeMB}MB</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Upload as many as you like.
              <a href="/pro" className="text-primary ml-1 underline">Upgrade to Pro</a> for larger files and longer videos.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {uploadLimits?.isPro && (
        <Alert className="mb-4 border-primary/50 bg-primary/10">
          <Check className="h-4 w-4 text-primary" />
          <AlertTitle className="text-primary">Pro Member</AlertTitle>
          <AlertDescription>
            Clips up to {uploadLimits.maxClipSizeMB}MB / {Math.round(uploadLimits.maxClipDurationSeconds / 60)} min,
            Reels up to {uploadLimits.maxReelSizeMB}MB / {uploadLimits.maxReelDurationSeconds}s,
            Screenshots up to {uploadLimits.maxScreenshotSizeMB}MB.
          </AlertDescription>
        </Alert>
      )}

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
                            <span>Maximum {uploadLimits?.maxClipSizeMB ?? 100}MB · {Math.round((uploadLimits?.maxClipDurationSeconds ?? 180) / 60)} min</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Supports MP4, WebM, or MOV formats</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  
                  <div 
                    className={`border-2 border-dashed ${fileError ? 'border-destructive' : isDraggingClip ? 'border-primary bg-primary/5' : 'border-muted'} rounded-lg p-8 text-center transition-colors ${!file ? 'cursor-pointer hover:border-primary' : ''}`}
                    onClick={!file ? triggerFileInput : undefined}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!isDraggingClip) setIsDraggingClip(true);
                    }}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDraggingClip(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDraggingClip(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDraggingClip(false);
                      if (!file && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        const droppedFile = e.dataTransfer.files[0];
                        const fakeEvent = {
                          target: { files: [droppedFile] }
                        } as React.ChangeEvent<HTMLInputElement>;
                        handleFileChange(fakeEvent);
                      }
                    }}
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
                            <button
                              type="button"
                              onClick={() => {
                                setFile(null);
                                setVideoDuration(0);
                                setTrimStart(0);
                                setTrimEnd(0);
                                setShowEditingTools(false);
                                setGeneratedThumbnails([]);
                                setThumbnailUrl("");
                                if (fileInputRef.current) {
                                  fileInputRef.current.value = '';
                                }
                              }}
                              className="absolute top-2 right-2 z-10 p-1.5 bg-black/70 hover:bg-black/90 rounded-full transition-colors"
                              title="Remove video"
                            >
                              <X className="h-4 w-4 text-white" />
                            </button>
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
                                  
                                  // Validate duration against the user's tier limit.
                                  const isReelLoad = contentType === 'reels';
                                  const maxDurLoad = uploadLimits
                                    ? (isReelLoad ? uploadLimits.maxReelDurationSeconds : uploadLimits.maxClipDurationSeconds)
                                    : (isReelLoad ? 60 : 180);
                                  if (duration > maxDurLoad) {
                                    const label = maxDurLoad >= 60
                                      ? `${Math.round(maxDurLoad / 60 * 10) / 10} minutes`
                                      : `${maxDurLoad} seconds`;
                                    setFileError(`Video duration is ${Math.round(duration / 60 * 10) / 10} minutes. ${isReelLoad ? 'Reels' : 'Clips'} must be ${label} or less${uploadLimits && !uploadLimits.isPro ? ' — upgrade to Pro for longer videos.' : '.'}`);
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
                                  setCurrentTime(currentTime);

                                  if (trimEnd > 0 && trimEnd < videoDuration) {
                                    if (currentTime >= trimEnd) {
                                      videoRef.current.pause();
                                      videoRef.current.currentTime = trimStart;
                                    }
                                  }
                                  if (currentTime < trimStart - 0.1) {
                                    videoRef.current.currentTime = trimStart;
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
                                if (videoRef.current) {
                                  if (videoRef.current.currentTime < trimStart || videoRef.current.currentTime >= trimEnd) {
                                    videoRef.current.currentTime = trimStart;
                                  }
                                }
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
                        
                        {/* Video Trimmer */}
                        {showEditingTools && videoDuration > 0 && (
                          <div className="space-y-3 mt-4">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-sm">Trim Clip</h4>
                              <span className="text-xs text-muted-foreground font-mono">
                                {formatDuration(trimEnd - trimStart)} / {formatDuration(videoDuration)}
                              </span>
                            </div>

                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] text-muted-foreground font-mono px-0.5">
                                <span>{formatDuration(trimStart)}</span>
                                <span>{formatDuration(trimEnd)}</span>
                              </div>
                              <DualRangeSlider
                                value={[trimStart, trimEnd]}
                                min={0}
                                max={videoDuration}
                                step={0.1}
                                minGap={0.5}
                                onValueChange={([newStart, newEnd]) => {
                                  const startChanged = Math.abs(newStart - trimStart) > 0.05;
                                  const endChanged = Math.abs(newEnd - trimEnd) > 0.05;
                                  setTrimStart(newStart);
                                  setTrimEnd(newEnd);
                                  if (videoRef.current) {
                                    if (startChanged) {
                                      videoRef.current.currentTime = newStart;
                                    } else if (endChanged) {
                                      videoRef.current.currentTime = Math.max(newEnd - 0.1, newStart);
                                    }
                                  }
                                }}
                              />
                            </div>

                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setTrimStart(0);
                                  setTrimEnd(videoDuration);
                                  if (videoRef.current) videoRef.current.currentTime = 0;
                                }}
                                className="text-xs"
                              >
                                <RotateCcw className="h-3 w-3 mr-1" />
                                Reset
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (videoRef.current) {
                                    videoRef.current.currentTime = trimStart;
                                    videoRef.current.play();
                                  }
                                }}
                                className="text-xs"
                              >
                                <Play className="h-3 w-3 mr-1" />
                                Preview
                              </Button>
                            </div>
                          </div>
                        )}

                      </div>
                    ) : (
                      <div>
                        <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                        <p className="font-medium">Drag and drop your video or click to browse</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          MP4, WebM, or MOV up to {uploadLimits?.maxClipSizeMB ?? 100}MB · {Math.round((uploadLimits?.maxClipDurationSeconds ?? 180) / 60)} min
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
                    Tags (optional, up to 5)
                  </Label>
                  <TagInput
                    tags={tags}
                    setTags={setTags}
                    maxTags={5}
                    placeholder="Add tags and press Enter"
                  />
                </div>

                <div className="flex items-center space-x-2 p-3 rounded-lg border border-muted bg-muted/20">
                  <Checkbox
                    id="age-restricted"
                    checked={ageRestricted}
                    onCheckedChange={(checked) => setAgeRestricted(checked as boolean)}
                    data-testid="checkbox-age-restricted"
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="age-restricted"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Age-Restricted Content
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Mark this clip if it contains content that may not be suitable for all audiences
                    </p>
                  </div>
                </div>

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
                  disabled={!file || !title.trim() || !selectedGame || isUploading}
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
                      <span className="hidden sm:inline">
                        {uploadProgress < 100 ? `Uploading ${uploadProgress}%` : "Processing..."}
                      </span>
                      <span className="inline sm:hidden">
                        {uploadProgress < 100 ? `${uploadProgress}%` : "Processing..."}
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
                            <span>Maximum {uploadLimits?.maxReelSizeMB ?? 50}MB · {uploadLimits?.maxReelDurationSeconds ?? 60}s • Auto-converted to 9:16</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Supports MP4, WebM, or MOV formats. Videos will be automatically cropped and converted to 9:16 vertical format.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  
                  <div 
                    className={`border-2 border-dashed ${fileError ? 'border-destructive' : isDraggingReelDrop ? 'border-primary bg-primary/5' : 'border-muted'} rounded-lg text-center transition-colors ${!file ? 'cursor-pointer hover:border-primary aspect-[9/16] h-[500px] w-auto mx-auto flex items-center justify-center px-6' : 'p-8'}`}
                    onClick={!file ? triggerFileInput : undefined}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!isDraggingReelDrop) setIsDraggingReelDrop(true);
                    }}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDraggingReelDrop(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDraggingReelDrop(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDraggingReelDrop(false);
                      if (!file && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        const droppedFile = e.dataTransfer.files[0];
                        const fakeEvent = {
                          target: { files: [droppedFile] }
                        } as React.ChangeEvent<HTMLInputElement>;
                        handleFileChange(fakeEvent);
                      }
                    }}
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
                            <button
                              type="button"
                              onClick={() => {
                                setFile(null);
                                setVideoDuration(0);
                                setTrimStart(0);
                                setTrimEnd(0);
                                setShowEditingTools(false);
                                setGeneratedThumbnails([]);
                                setThumbnailUrl("");
                                setReelZoom(1);
                                setReelPanX(0);
                                setReelPanY(0);
                                setIsReelAspectMismatch(false);
                                setVideoAspectRatio(0);
                                if (fileInputRef.current) {
                                  fileInputRef.current.value = '';
                                }
                              }}
                              className="absolute top-2 right-2 z-10 p-1.5 bg-black/70 hover:bg-black/90 rounded-full transition-colors"
                              title="Remove video"
                            >
                              <X className="h-4 w-4 text-white" />
                            </button>
                            <video
                              ref={videoRef}
                              src={videoSrc}
                              controls
                              preload="auto"
                              muted
                              playsInline
                              className="w-full h-full"
                              style={{
                                objectFit: 'contain',
                                transform: isReelAspectMismatch ? `scale(${reelZoom}) translate(${reelPanX}%, ${reelPanY}%)` : 'none',
                                transformOrigin: 'center center',
                                cursor: isReelAspectMismatch && reelZoom > 1 ? (isDraggingReel ? 'grabbing' : 'grab') : 'default',
                                userSelect: 'none',
                              }}
                              onMouseDown={(e) => {
                                if (!isReelAspectMismatch || reelZoom <= 1) return;
                                e.preventDefault();
                                setIsDraggingReel(true);
                                reelDragStart.current = { x: e.clientX, y: e.clientY, panX: reelPanX, panY: reelPanY };
                                const handleMouseMove = (ev: MouseEvent) => {
                                  if (!reelDragStart.current) return;
                                  const dx = ev.clientX - reelDragStart.current.x;
                                  const dy = ev.clientY - reelDragStart.current.y;
                                  const maxPan = Math.round((reelZoom - 1) * 30);
                                  const newPanX = Math.max(-maxPan, Math.min(maxPan, reelDragStart.current.panX + (dx / 3)));
                                  const newPanY = Math.max(-maxPan, Math.min(maxPan, reelDragStart.current.panY + (dy / 3)));
                                  setReelPanX(Math.round(newPanX));
                                  setReelPanY(Math.round(newPanY));
                                };
                                const handleMouseUp = () => {
                                  setIsDraggingReel(false);
                                  reelDragStart.current = null;
                                  document.removeEventListener('mousemove', handleMouseMove);
                                  document.removeEventListener('mouseup', handleMouseUp);
                                };
                                document.addEventListener('mousemove', handleMouseMove);
                                document.addEventListener('mouseup', handleMouseUp);
                              }}
                              onTouchStart={(e) => {
                                if (!isReelAspectMismatch || reelZoom <= 1) return;
                                const touch = e.touches[0];
                                setIsDraggingReel(true);
                                reelDragStart.current = { x: touch.clientX, y: touch.clientY, panX: reelPanX, panY: reelPanY };
                              }}
                              onTouchMove={(e) => {
                                if (!reelDragStart.current || !isDraggingReel) return;
                                e.preventDefault();
                                const touch = e.touches[0];
                                const dx = touch.clientX - reelDragStart.current.x;
                                const dy = touch.clientY - reelDragStart.current.y;
                                const maxPan = Math.round((reelZoom - 1) * 30);
                                const newPanX = Math.max(-maxPan, Math.min(maxPan, reelDragStart.current.panX + (dx / 3)));
                                const newPanY = Math.max(-maxPan, Math.min(maxPan, reelDragStart.current.panY + (dy / 3)));
                                setReelPanX(Math.round(newPanX));
                                setReelPanY(Math.round(newPanY));
                              }}
                              onTouchEnd={() => {
                                setIsDraggingReel(false);
                                reelDragStart.current = null;
                              }}
                              onLoadedMetadata={() => {
                                if (videoRef.current && videoDuration === 0) {
                                  const duration = videoRef.current.duration;
                                  setVideoDuration(duration);
                                  setTrimEnd(duration);
                                  setShowEditingTools(true);
                                  
                                  const aspectRatio = videoRef.current.videoWidth / videoRef.current.videoHeight;
                                  const targetRatio = 9 / 16;
                                  setVideoAspectRatio(aspectRatio);
                                  
                                  if (Math.abs(aspectRatio - targetRatio) > 0.1) {
                                    setIsReelAspectMismatch(true);
                                    setReelZoom(1);
                                    setReelPanX(0);
                                    setReelPanY(0);
                                  } else {
                                    setIsReelAspectMismatch(false);
                                  }
                                  
                                  setTimeout(() => {
                                    generateThumbnails();
                                  }, 1000);
                                }
                              }}
                              onTimeUpdate={() => {
                                if (videoRef.current) {
                                  const currentTime = videoRef.current.currentTime;
                                  setCurrentTime(currentTime);

                                  if (trimEnd > 0 && trimEnd < videoDuration) {
                                    if (currentTime >= trimEnd) {
                                      videoRef.current.pause();
                                      videoRef.current.currentTime = trimStart;
                                    }
                                  }
                                  if (currentTime < trimStart - 0.1) {
                                    videoRef.current.currentTime = trimStart;
                                  }
                                }
                              }}
                              onPlay={() => {
                                if (videoRef.current) {
                                  if (videoRef.current.currentTime < trimStart || videoRef.current.currentTime >= trimEnd) {
                                    videoRef.current.currentTime = trimStart;
                                  }
                                }
                              }}
                            />
                          </div>
                          
                          {/* Zoom/Crop controls for non-9:16 videos */}
                          {isReelAspectMismatch && file && (
                            <div className="mt-4 space-y-3 p-4 bg-muted/30 rounded-lg">
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium text-sm flex items-center gap-2">
                                  <Info className="h-4 w-4 text-muted-foreground" />
                                  Adjust Crop
                                </h4>
                                <span className="text-xs text-muted-foreground">
                                  Video: {videoAspectRatio.toFixed(2)}:1 → 9:16
                                </span>
                              </div>
                              
                              <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                  <span className="text-xs text-muted-foreground w-12">Zoom</span>
                                  <input
                                    type="range"
                                    min="1"
                                    max={videoAspectRatio > (9/16) ? Math.ceil((videoAspectRatio / (9/16)) * 10) / 10 : Math.ceil(((9/16) / videoAspectRatio) * 10) / 10}
                                    step="0.05"
                                    value={reelZoom}
                                    onChange={(e) => setReelZoom(parseFloat(e.target.value))}
                                    className="flex-1 h-1 bg-muted rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:cursor-grab"
                                  />
                                  <span className="text-xs font-mono text-muted-foreground w-10 text-right">
                                    {Math.round(reelZoom * 100)}%
                                  </span>
                                </div>
                                
                                {reelZoom > 1 && (
                                  <div className="flex items-center gap-3">
                                    <span className="text-xs text-muted-foreground w-12">Pan X</span>
                                    <input
                                      type="range"
                                      min={-Math.round((reelZoom - 1) * 30)}
                                      max={Math.round((reelZoom - 1) * 30)}
                                      step="1"
                                      value={reelPanX}
                                      onChange={(e) => setReelPanX(parseFloat(e.target.value))}
                                      className="flex-1 h-1 bg-muted rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:cursor-grab"
                                    />
                                    <span className="text-xs font-mono text-muted-foreground w-10 text-right">
                                      {reelPanX > 0 ? '+' : ''}{reelPanX}%
                                    </span>
                                  </div>
                                )}
                                
                                {reelZoom > 1 && (
                                  <div className="flex items-center gap-3">
                                    <span className="text-xs text-muted-foreground w-12">Pan Y</span>
                                    <input
                                      type="range"
                                      min={-Math.round((reelZoom - 1) * 30)}
                                      max={Math.round((reelZoom - 1) * 30)}
                                      step="1"
                                      value={reelPanY}
                                      onChange={(e) => setReelPanY(parseFloat(e.target.value))}
                                      className="flex-1 h-1 bg-muted rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:cursor-grab"
                                    />
                                    <span className="text-xs font-mono text-muted-foreground w-10 text-right">
                                      {reelPanY > 0 ? '+' : ''}{reelPanY}%
                                    </span>
                                  </div>
                                )}
                              </div>
                              
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setReelZoom(1);
                                  setReelPanX(0);
                                  setReelPanY(0);
                                }}
                                className="text-xs"
                              >
                                <RotateCcw className="h-3 w-3 mr-1" />
                                Reset Crop
                              </Button>
                              
                              <p className="text-xs text-muted-foreground">
                                Zoom in to crop and fill the frame. Drag the video or use the sliders to position it.
                              </p>
                            </div>
                          )}
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
                        
                        {/* Video Trimmer for Reels */}
                        {showEditingTools && videoDuration > 0 && (
                          <div className="space-y-3 mt-4">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-sm">Trim Reel</h4>
                              <span className="text-xs text-muted-foreground font-mono">
                                {formatDuration(trimEnd - trimStart)} / {formatDuration(videoDuration)}
                              </span>
                            </div>

                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] text-muted-foreground font-mono px-0.5">
                                <span>{formatDuration(trimStart)}</span>
                                <span>{formatDuration(trimEnd)}</span>
                              </div>
                              <DualRangeSlider
                                value={[trimStart, trimEnd]}
                                min={0}
                                max={videoDuration}
                                step={0.1}
                                minGap={0.5}
                                onValueChange={([newStart, newEnd]) => {
                                  const startChanged = Math.abs(newStart - trimStart) > 0.05;
                                  const endChanged = Math.abs(newEnd - trimEnd) > 0.05;
                                  setTrimStart(newStart);
                                  setTrimEnd(newEnd);
                                  if (videoRef.current) {
                                    if (startChanged) {
                                      videoRef.current.currentTime = newStart;
                                    } else if (endChanged) {
                                      videoRef.current.currentTime = Math.max(newEnd - 0.1, newStart);
                                    }
                                  }
                                }}
                              />
                            </div>

                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setTrimStart(0);
                                  setTrimEnd(videoDuration);
                                  if (videoRef.current) videoRef.current.currentTime = 0;
                                }}
                                className="text-xs"
                              >
                                <RotateCcw className="h-3 w-3 mr-1" />
                                Reset
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (videoRef.current) {
                                    videoRef.current.currentTime = trimStart;
                                    videoRef.current.play();
                                  }
                                }}
                                className="text-xs"
                              >
                                <Play className="h-3 w-3 mr-1" />
                                Preview
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <Camera className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                        <p className="font-medium">Drag and drop your video or click to browse</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          MP4, WebM, or MOV up to {uploadLimits?.maxReelSizeMB ?? 50}MB · {uploadLimits?.maxReelDurationSeconds ?? 60}s • Videos automatically converted to 9:16 reel format
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
                    Tags (optional, up to 5)
                  </Label>
                  <TagInput
                    tags={tags}
                    setTags={setTags}
                    maxTags={5}
                    placeholder="Add tags and press Enter"
                  />
                </div>

                <div className="flex items-center space-x-2 p-3 rounded-lg border border-muted bg-muted/20">
                  <Checkbox
                    id="reel-age-restricted"
                    checked={ageRestricted}
                    onCheckedChange={(checked) => setAgeRestricted(checked as boolean)}
                    data-testid="checkbox-reel-age-restricted"
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="reel-age-restricted"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Age-Restricted Content
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Mark this reel if it contains content that may not be suitable for all audiences
                    </p>
                  </div>
                </div>

                
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
                    disabled={!file || !title.trim() || !selectedGame || isUploading}
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
                        <span className="hidden sm:inline">
                          {uploadProgress < 100 ? `Uploading ${uploadProgress}%` : "Processing..."}
                        </span>
                        <span className="inline sm:hidden">
                          {uploadProgress < 100 ? `${uploadProgress}%` : "Processing..."}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Camera className="h-4 w-4" />
                        <span className="hidden sm:inline">Upload Reel</span>
                        <span className="inline sm:hidden">Upload</span>
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
                
                if (screenshotFiles.length === 0) {
                  toast({
                    title: "No screenshot selected",
                    description: "Please select at least one screenshot to upload.",
                    variant: "gamefolioError",
                  });
                  return;
                }
                
                if (!screenshotTitle.trim()) {
                  toast({
                    title: "Title required",
                    description: "Please enter a title for your screenshots.",
                    variant: "gamefolioError",
                  });
                  return;
                }
                
                if (!screenshotSelectedGame) {
                  toast({
                    title: "Game required",
                    description: "Please select a game for your screenshots.",
                    variant: "gamefolioError",
                  });
                  return;
                }
                
                
                screenshotUploadMutation.mutate();
              }} className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="screenshot">Screenshot Files ({screenshotFiles.length}/3)</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Info className="h-3 w-3 mr-1" />
                            <span>Maximum {uploadLimits?.maxScreenshotSizeMB ?? 10}MB each</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Supports JPEG, PNG, or JPG formats</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  
                  {/* Hidden file input */}
                  <input
                    type="file"
                    id="screenshot"
                    accept="image/jpeg,image/png,image/jpg"
                    onChange={handleScreenshotChange}
                    className="hidden"
                    multiple
                    data-testid="input-screenshot"
                  />
                  
                  {screenshotFiles.length === 0 ? (
                    <label 
                      htmlFor="screenshot"
                      className={`border-2 border-dashed ${isDraggingScreenshot ? 'border-primary bg-primary/5' : 'border-muted'} rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors flex flex-col items-center`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!isDraggingScreenshot) setIsDraggingScreenshot(true);
                      }}
                      onDragEnter={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDraggingScreenshot(true);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDraggingScreenshot(false);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDraggingScreenshot(false);
                        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                          const fakeEvent = {
                            target: { files: e.dataTransfer.files }
                          } as React.ChangeEvent<HTMLInputElement>;
                          handleScreenshotChange(fakeEvent);
                        }
                      }}
                    >
                      <Image className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                      <p className="font-medium">Drag and drop your screenshots or click to browse</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        JPEG, PNG, or JPG up to {uploadLimits?.maxScreenshotSizeMB ?? 10}MB each
                      </p>
                    </label>
                  ) : (
                    <div className="space-y-4">
                      {/* Screenshot Previews Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {screenshotPreviews.map((preview, index) => (
                          <div key={index} className="relative group">
                            <div className="w-full rounded-lg border overflow-hidden bg-muted flex items-center justify-center">
                              <img
                                src={preview}
                                alt={`Preview ${index + 1}`}
                                className="w-full h-auto object-contain"
                                data-testid={`img-screenshot-preview-${index}`}
                              />
                            </div>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute -top-2 -right-2 h-7 w-7 rounded-full p-0 shadow-lg"
                              onClick={() => removeScreenshot(index)}
                              data-testid={`button-remove-screenshot-${index}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                            <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                              #{index + 1}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Add Another Button */}
                      {screenshotFiles.length < 3 && (
                        <label htmlFor="screenshot" className="block">
                          <Button
                            type="button"
                            variant="default"
                            size="lg"
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                            data-testid="button-add-another-screenshot"
                            asChild
                          >
                            <span className="cursor-pointer flex items-center justify-center gap-2">
                              <Upload className="h-5 w-5" />
                              Add Another Screenshot ({3 - screenshotFiles.length} remaining)
                            </span>
                          </Button>
                        </label>
                      )}
                    </div>
                  )}
                  
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
                    Tags (optional, up to 5)
                  </Label>
                  <TagInput
                    tags={screenshotTags}
                    setTags={setScreenshotTags}
                    maxTags={5}
                    placeholder="Add tags and press Enter"
                  />
                </div>

                <div className="flex items-center space-x-2 p-3 rounded-lg border border-muted bg-muted/20">
                  <Checkbox
                    id="screenshot-age-restricted"
                    checked={screenshotAgeRestricted}
                    onCheckedChange={(checked) => setScreenshotAgeRestricted(checked as boolean)}
                    data-testid="checkbox-screenshot-age-restricted"
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="screenshot-age-restricted"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Age-Restricted Content
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Mark this screenshot if it contains content that may not be suitable for all audiences
                    </p>
                  </div>
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
                    disabled={screenshotFiles.length === 0 || !screenshotTitle.trim() || !screenshotSelectedGame || screenshotUploadMutation.isPending}
                    data-testid="button-upload-screenshots"
                  >
                    {screenshotUploadMutation.isPending ? (
                      <div className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="hidden sm:inline">Uploading {screenshotFiles.length} screenshot{screenshotFiles.length > 1 ? 's' : ''}...</span>
                        <span className="inline sm:hidden">...</span>
                      </div>
                    ) : (
                      <>
                        <span className="hidden sm:inline">Upload {screenshotFiles.length > 0 ? `${screenshotFiles.length} Screenshot${screenshotFiles.length > 1 ? 's' : ''}` : 'Screenshots'}</span>
                        <span className="inline sm:hidden">Upload</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Upload Progress Modal */}
      {isUploading && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full sm:max-w-2xl bg-[#101D27] sm:rounded-2xl overflow-hidden shadow-2xl border border-[#1e3a4a]/50">
            <div className="flex flex-col items-center justify-center px-6 py-10 sm:px-10 sm:py-14 gap-6">
              <div className="flex items-center gap-1">
                <span className="text-6xl sm:text-8xl font-black text-white tracking-tighter leading-none" style={{ letterSpacing: '-4px' }}>
                  {uploadProgress}
                </span>
                <span className="text-2xl sm:text-3xl font-black text-white mt-2">%</span>
              </div>

              <span className="text-[#B7FF1A] text-xs font-bold tracking-[5px] uppercase">
                {uploadProgress < 100 ? "Upload in progress" : "Processing"}
              </span>

              <div className="w-full space-y-3 px-2 sm:px-4">
                <div className="w-full h-1.5 bg-[#1e3a4a]/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#B7FF1A] rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${uploadProgress}%`,
                      boxShadow: '0 0 20px rgba(183, 255, 26, 0.6)',
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-bold tracking-[1px] uppercase text-[#4a6a7a]">
                  <span className={uploadProgress >= 25 ? "text-[#B7FF1A]/60" : ""}>25%</span>
                  <span className={uploadProgress >= 50 ? "text-[#B7FF1A]/60" : ""}>50%</span>
                  <span className={uploadProgress >= 75 ? "text-[#B7FF1A]/60" : ""}>75%</span>
                  <span className={uploadProgress >= 100 ? "text-[#B7FF1A]/60" : ""}>100%</span>
                </div>
              </div>

              <div className="text-center space-y-1.5">
                <h3 className="text-white font-bold text-lg uppercase tracking-tight">
                  {uploadProgress < 85 ? "Uploading your content..." : uploadProgress < 100 ? "Processing..." : "Complete!"}
                </h3>
                <p className="text-[#8fa8b8] text-sm">
                  Uploading {file?.name || 'video'} ({(file?.size ? file.size / (1024 * 1024) : 0).toFixed(1)} MB)
                </p>
              </div>

              <div className="flex items-center gap-3 bg-[#B7FF1A]/5 border border-[#B7FF1A]/10 rounded-full px-6 py-2.5">
                <div className="w-2 h-2 bg-[#B7FF1A] rounded-full" style={{ boxShadow: '0 0 10px #B7FF1A' }} />
                <span className="text-[#B7FF1A] text-[10px] font-bold tracking-[2px] uppercase">
                  Please keep this tab open while uploading
                </span>
                <div className="w-2 h-2 bg-[#B7FF1A] rounded-full" style={{ boxShadow: '0 0 10px #B7FF1A' }} />
              </div>
            </div>

            <div className="flex items-center justify-center gap-4 px-8 py-6 bg-[#0b1820]/80 backdrop-blur-xl border-t border-[#1e3a4a]/10">
              <button
                type="button"
                onClick={() => {
                  if (uploadAbortRef.current) {
                    uploadAbortRef.current.abort();
                  }
                  setIsUploading(false);
                  setUploadProgress(0);
                }}
                className="text-[#8fa8b8] text-sm font-bold tracking-[1.4px] uppercase hover:text-white transition-colors px-6 py-3"
              >
                Cancel
              </button>
              <div className="flex items-center gap-2.5 bg-[#B7FF1A]/10 border border-[#B7FF1A]/20 rounded-full px-8 py-4 shadow-lg">
                <div className="w-5 h-5 border-2 border-[#B7FF1A]/30 border-t-[#B7FF1A] rounded-full animate-spin" />
                <span className="text-[#B7FF1A] text-sm font-bold tracking-[1.4px] uppercase">
                  Uploading {uploadProgress}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <ProUpgradeDialog
        open={showProUpgrade}
        onOpenChange={setShowProUpgrade}
        subtitle="Get unlimited uploads"
      />

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
      
      {/* XP Gained Dialog */}
      <XPGainedDialog
        open={xpDialogOpen}
        onOpenChange={setXpDialogOpen}
        xpGained={xpGained}
        currentXP={userXP}
        currentLevel={userLevel}
        onContinue={() => {
          // Navigate after XP dialog closes
          if (uploadSuccessData) {
            if (uploadSuccessData.type === 'screenshot') {
              if (user?.username && uploadSuccessData.id) {
                navigate(`/profile/${user.username}#screenshot-${uploadSuccessData.id}`);
              }
            } else {
              if (user?.username && uploadSuccessData.id) {
                navigate(`/profile/${user.username}#${uploadSuccessData.type}-${uploadSuccessData.id}`);
              }
            }
          }
          // Clear success data
          setUploadSuccessData(null);
        }}
      />
    </div>
  );
};

export default UploadPage;