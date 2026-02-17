import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { ClipWithUser, CommentWithUser } from "@shared/schema";
import VideoPlayer from "@/components/shared/VideoPlayer";
import { useSignedUrl } from "@/hooks/use-signed-url";
import { CustomAvatar } from "@/components/ui/custom-avatar";
import { 
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose
} from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { DialogOverlay, DialogPortal } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  MessageSquare, 
  X,
  Eye,
  User as UserIcon,
  Clock,
  Flame,
  Share2,
  ChevronLeft,
  ChevronRight,
  Heart,
  Send,
  ChevronDown,
  UserPlus,
  UserMinus,
  UserCheck,
  AlertTriangle,
  Maximize2,
  Minimize2,
  Trash2,
  Play,
  Pause,
  Volume2,
  VolumeX
} from "lucide-react";
import { formatDistance } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useJoinDialog } from "@/hooks/use-join-dialog";
import { JoinGamefolioDialog } from "@/components/auth/JoinGamefolioDialog";
import { cn } from "@/lib/utils";
import { ClipShareDialog } from "@/components/clip/ClipShareDialog";
import CommentSection from "@/components/clips/CommentSection";
import ShareMenu from "@/components/clips/ShareMenu";
import { LikeButton } from "@/components/engagement/LikeButton";
import { FireButton } from "@/components/engagement/FireButton";
import { FullscreenReelsViewer } from "./FullscreenReelsViewer";
import { useClipDialog } from "@/hooks/use-clip-dialog";
import { ReportDialog } from "@/components/content/ReportDialog";
import { AgeRestrictionDialog } from "@/components/content/AgeRestrictionDialog";
import { ModeratorBadge } from "@/components/ui/moderator-badge";
import { ProBadge } from "@/components/ui/pro-badge";
import { VideoAdPlayer } from "@/components/ads/VideoAdPlayer";
import { useClipAdDecision } from "@/hooks/use-ad-manager";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ClipDialogProps {
  clipId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  showNavigation?: boolean;
}

const ClipDialog = ({ clipId, isOpen, onClose, onNext, onPrevious, showNavigation = false }: ClipDialogProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { isOpen: joinDialogOpen, actionType, openDialog, closeDialog } = useJoinDialog();
  const [showComments, setShowComments] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [previousClipId, setPreviousClipId] = useState<number | null>(null);
  const [ageRestrictionAccepted, setAgeRestrictionAccepted] = useState(false);
  const [showAgeRestrictionDialog, setShowAgeRestrictionDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const isAcceptingRef = useRef(false);
  const [reelIsPlaying, setReelIsPlaying] = useState(true);
  const [reelIsMuted, setReelIsMuted] = useState(true);
  const reelVideoRef = useRef<HTMLVideoElement | null>(null);
  
  const { showAd, adCompleted, isPro, decideAd, onAdFinished, reset: resetAd } = useClipAdDecision();

  // Access closeClipDialog from useClipDialog
  const { closeClipDialog } = useClipDialog();

  // Only fetch if dialog is open and we have a clipId (MUST be before useEffects that use clip)
  const { data: clip, isLoading } = useQuery<ClipWithUser>({
    queryKey: [`/api/clips/${clipId}`],
    queryFn: async () => {
      const res = await fetch(`/api/clips/${clipId}`);
      if (!res.ok) throw new Error("Failed to fetch clip");
      return res.json();
    },
    enabled: isOpen && clipId !== null,
  });

  // Get signed URLs for private bucket assets
  const { signedUrl: signedThumbnailUrl } = useSignedUrl(clip?.thumbnailUrl);
  const { signedUrl: signedGameIconUrl } = useSignedUrl(clip?.game?.iconUrl);
  const { signedUrl: signedAvatarUrl } = useSignedUrl(clip?.user?.avatarUrl);

  // Fetch comments for mobile overlay
  const { data: comments } = useQuery<CommentWithUser[]>({
    queryKey: [`/api/clips/${clipId}/comments`],
    queryFn: async () => {
      const res = await fetch(`/api/clips/${clipId}/comments`);
      if (!res.ok) throw new Error("Failed to fetch comments");
      return res.json();
    },
    enabled: isOpen && clipId !== null,
  });

  // Detect mobile device - use same breakpoint as useMobile hook
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768); // mobile breakpoint, matching useMobile hook
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Reset state when dialog is closed
  useEffect(() => {
    if (!isOpen) {
      setShowComments(false);
      setIsFullscreen(false);
      setAgeRestrictionAccepted(false);
      setShowAgeRestrictionDialog(false);
      isAcceptingRef.current = false;
      resetAd();
    }
  }, [isOpen, resetAd]);
  
  // Decide whether to show an ad when a new clip loads
  useEffect(() => {
    if (isOpen && clipId !== null && clipId !== previousClipId && !isPro) {
      decideAd();
    }
  }, [isOpen, clipId, previousClipId, isPro, decideAd]);

  // Check for age restriction when clip loads
  useEffect(() => {
    if (clip && clip.ageRestricted && !ageRestrictionAccepted) {
      setShowAgeRestrictionDialog(true);
    }
  }, [clip, ageRestrictionAccepted]);

  // Auto-close age restriction dialog after acceptance
  useEffect(() => {
    if (ageRestrictionAccepted && showAgeRestrictionDialog) {
      const timer = setTimeout(() => {
        setShowAgeRestrictionDialog(false);
        // Reset accepting flag after dialog closes
        setTimeout(() => {
          isAcceptingRef.current = false;
        }, 50);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [ageRestrictionAccepted, showAgeRestrictionDialog]);

  // Reset age restriction state when clip changes
  useEffect(() => {
    if (clipId !== previousClipId) {
      setAgeRestrictionAccepted(false);
      setShowAgeRestrictionDialog(false);
    }
  }, [clipId, previousClipId]);

  // Handle clip transitions with fade effect
  useEffect(() => {
    if (clipId !== previousClipId && previousClipId !== null) {
      setIsTransitioning(true);
      const timer = setTimeout(() => setIsTransitioning(false), 200);
      return () => clearTimeout(timer);
    }
    setPreviousClipId(clipId);
  }, [clipId, previousClipId]);

  // Enhanced navigation functions with transition
  const handlePreviousWithTransition = () => {
    if (onPrevious && !isTransitioning) {
      setIsTransitioning(true);
      onPrevious();
    }
  };

  const handleNextWithTransition = () => {
    if (onNext && !isTransitioning) {
      setIsTransitioning(true);
      onNext();
    }
  };

  // Keyboard navigation for clip dialog
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't interfere with form inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      // Handle escape for fullscreen first
      if (e.key === 'Escape' && isFullscreen) {
        e.preventDefault();
        e.stopPropagation();
        setIsFullscreen(false);
        return;
      }
      
      // Only handle navigation if dialog is open and we have navigation functions
      if (!isOpen || !showNavigation || isTransitioning) return;
      
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          e.stopPropagation();
          handlePreviousWithTransition();
          break;
        case 'ArrowRight':
          e.preventDefault();
          e.stopPropagation();
          handleNextWithTransition();
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    if (isOpen) {
      // Use capture phase to ensure we get events before other handlers
      document.addEventListener('keydown', handleKeyDown, { capture: true });
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [isOpen, showNavigation, onNext, onPrevious, onClose, isTransitioning, isFullscreen]);

  // Follow functionality
  const queryClient = useQueryClient();
  const [followRequestStatus, setFollowRequestStatus] = useState<
    'following' | 'requested' | 'not_following'
  >('not_following');
  
  const isOwnClip = user?.id === clip?.user?.id;
  
  // Check if current user is following the clip author
  const { data: followStatus } = useQuery({
    queryKey: [`/api/users/${clip?.user?.username}/follow-status`],
    queryFn: async () => {
      const res = await fetch(`/api/users/${clip?.user?.username}/follow-status`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error("Failed to fetch follow status");
      return res.json();
    },
    enabled: !isOwnClip && !!user && !!clip?.user?.username,
    refetchOnWindowFocus: false,
  });

  // Sync followRequestStatus state with server data
  useEffect(() => {
    if (followStatus !== undefined && !isOwnClip && clip?.user?.username) {
      if (followStatus.following) {
        setFollowRequestStatus('following');
      } else if (followStatus.requested) {
        setFollowRequestStatus('requested');
      } else {
        setFollowRequestStatus('not_following');
      }
    }
  }, [followStatus, isOwnClip, clip?.user?.username]);

  // Follow mutation
  const followMutation = useMutation({
    mutationFn: async ({ currentFollowStatus }: { currentFollowStatus: 'following' | 'requested' | 'not_following' }) => {
      if (!clip?.user?.username) throw new Error('No username available');
      
      if (currentFollowStatus === 'following' || currentFollowStatus === 'requested') {
        const response = await fetch(`/api/users/${clip.user.username}/follow`, {
          method: 'DELETE',
          credentials: 'include'
        });
        if (!response.ok) throw new Error('Failed to unfollow');
        return { action: 'unfollowed' };
      } else {
        const response = await fetch(`/api/users/${clip.user.username}/follow`, {
          method: 'POST',
          credentials: 'include'
        });
        if (!response.ok) throw new Error('Failed to follow');
        const result = await response.json();
        return result;
      }
    },
    onMutate: async () => {
      if (!clip?.user?.username) return;
      
      await queryClient.cancelQueries({ queryKey: [`/api/users/${clip.user.username}/follow-status`] });
      
      const previousFollowStatus = followRequestStatus;
      
      if (followRequestStatus === 'following' || followRequestStatus === 'requested') {
        setFollowRequestStatus('not_following');
      } else {
        setFollowRequestStatus('requested'); // Optimistically assume it will be requested
      }
      
      return { previousFollowStatus };
    },
    onError: (err, variables, context) => {
      if (context?.previousFollowStatus) {
        setFollowRequestStatus(context.previousFollowStatus);
      }
      toast({
        title: "Error",
        description: "Failed to update follow status. Please try again.",
        variant: "destructive",
      });
    },
    onSuccess: (data) => {
      if (data.action === 'unfollowed') {
        setFollowRequestStatus('not_following');
        toast({
          title: "Unfollowed",
          description: `You are no longer following @${clip?.user?.username}`,
        });
      } else if (data.status === 'following') {
        setFollowRequestStatus('following');
        toast({
          title: "Following",
          description: `You are now following @${clip?.user?.username}`,
        });
      } else if (data.status === 'requested') {
        setFollowRequestStatus('requested');
        toast({
          title: "Follow request sent",
          description: `Follow request sent to @${clip?.user?.username}`,
        });
      }
    },
    onSettled: () => {
      if (clip?.user?.username) {
        queryClient.invalidateQueries({ queryKey: [`/api/users/${clip.user.username}/follow-status`] });
      }
    }
  });

  const handleFollowClick = () => {
    if (!user) {
      openDialog('follow');
      return;
    }
    
    followMutation.mutate({ currentFollowStatus: followRequestStatus });
  };

  // Share functionality replaced by ShareMenu component

  // Touch navigation for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!showNavigation || (clip?.videoType === 'reel' && isMobile && showComments)) return;
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
    setTouchEnd(null);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!showNavigation || !touchStart || (clip?.videoType === 'reel' && isMobile && showComments)) return;
    const touch = e.touches[0];
    setTouchEnd({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchEnd = () => {
    if (!showNavigation || !touchStart || !touchEnd || (clip?.videoType === 'reel' && isMobile && showComments)) return;

    const deltaX = touchEnd.x - touchStart.x;
    const deltaY = touchEnd.y - touchStart.y;
    const minSwipeDistance = 50;

    // For reels on mobile, prioritize vertical navigation (Instagram-like)
    if (clip?.videoType === 'reel' && isMobile) {
      // Vertical swipe for reels (Instagram-like behavior)
      if (Math.abs(deltaY) > minSwipeDistance) {
        if (deltaY < 0 && onNext) {
          handleNextWithTransition(); // Swipe up = next reel
        } else if (deltaY > 0 && onPrevious) {
          handlePreviousWithTransition(); // Swipe down = previous reel
        }
      }
    } else {
      // Check if it's a horizontal or vertical swipe for regular clips
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe
        if (Math.abs(deltaX) > minSwipeDistance) {
          if (deltaX > 0 && onPrevious) {
            handlePreviousWithTransition(); // Swipe right = previous
          } else if (deltaX < 0 && onNext) {
            handleNextWithTransition(); // Swipe left = next
          }
        }
      } else {
        // Vertical swipe
        if (Math.abs(deltaY) > minSwipeDistance) {
          if (deltaY < 0 && onNext) {
            handleNextWithTransition(); // Swipe up = next
          } else if (deltaY > 0 && onPrevious) {
            handlePreviousWithTransition(); // Swipe down = previous
          }
        }
      }
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  if (!isOpen) return null;

  // Note: FullscreenReelsViewer is handled separately via the ClipDialogProvider

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogPortal>
        {/* Custom overlay that leaves footer visible on mobile reels */}
        <DialogOverlay className={cn(
          isMobile && clip?.videoType === 'reel' && "h-[calc(100dvh-64px)] bottom-auto"
        )} />
        <DialogPrimitive.Content
          ref={dialogRef}
          className={cn(
            "fixed left-[50%] top-[50%] z-50 grid w-full translate-x-[-50%] translate-y-[-50%] border bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
            "p-0 bg-background text-foreground clip-dialog-content",
            isMobile && clip?.videoType === 'reel' 
              ? "w-screen h-[calc(100dvh-64px)] max-w-none max-h-none overflow-hidden top-0 translate-y-0" // Leave space for footer on mobile reels, use dvh for dynamic viewport
              : isMobile 
                ? "w-screen h-screen max-w-none max-h-none overflow-y-auto sm:max-w-[80%] sm:w-[80%] sm:max-h-[76vh] sm:h-[76vh] sm:overflow-hidden" // Allow scrolling on mobile, fixed on larger screens - 15% smaller
                : "max-w-[80%] w-[80%] max-h-[76vh] h-[76vh] overflow-hidden" // Desktop size - 15% smaller
          )}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
        <DialogTitle className="sr-only">
          {clip ? `Video: ${clip.title}` : 'Video Player'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {clip ? `Video by ${clip.user?.displayName || clip.user?.username || 'Unknown user'}` : 'Video content viewer'}
        </DialogDescription>
        {/* Top right action buttons */}
        <div className={cn(
          "absolute z-[60] flex items-center gap-2",
          isMobile ? "right-2 top-2" : "right-4 top-4"
        )}>
          {/* Delete button - only show for clip owner */}
          {isOwnClip && clip && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteConfirm(true);
              }}
              className={cn(
                "rounded-sm opacity-70 ring-offset-background transition-all hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 group/trash",
                isMobile 
                  ? "p-3 bg-black/30 backdrop-blur-sm hover:bg-black/50"
                  : "p-2"
              )}
              title="Delete clip"
            >
              <Trash2 className={cn("text-white group-hover/trash:text-red-500 transition-colors", isMobile ? "h-6 w-6" : "h-5 w-5")} />
              <span className="sr-only">Delete</span>
            </button>
          )}
          {/* Close button */}
          <DialogClose className={cn(
            "rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground",
            isMobile 
              ? "p-3 bg-black/30 backdrop-blur-sm hover:bg-black/50"
              : "p-2"
          )}>
            <X className={cn("text-white", isMobile ? "h-6 w-6" : "h-5 w-5")} />
            <span className="sr-only">Close</span>
          </DialogClose>
        </div>

        {isLoading || !clip ? (
          <div className="space-y-4 p-6">
            <Skeleton className="w-full aspect-video rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-3/4" />
              <div className="flex items-center space-x-2">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div>
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32 mt-1" />
                </div>
              </div>
            </div>
          </div>
        ) : showAd && !adCompleted ? (
          <div className="flex items-center justify-center w-full h-full bg-black">
            <VideoAdPlayer 
              onAdComplete={onAdFinished}
              onAdError={onAdFinished}
              onAdSkipped={onAdFinished}
              skipAfterSeconds={5}
              className="w-full h-full max-w-4xl"
            />
          </div>
        ) : (
          <div className={cn(
            "flex flex-col lg:flex-row h-full max-h-full transition-opacity duration-300",
            isTransitioning ? "opacity-60" : "opacity-100"
          )}>
            {/* Video player area - fixed size container, video fits inside */}
            <div className={cn(
              "bg-black flex items-center justify-center transition-transform duration-200 relative",
              clip.videoType === 'reel' ? "" : "overflow-hidden",
              clip.videoType === 'reel' && isMobile
                ? "w-full h-full"
                : isMobile
                  ? "w-full flex-[0_0_clamp(280px,50vh,60vh)]"
                  : clip.videoType === 'reel'
                    ? "w-full lg:w-[450px] h-full flex-shrink-0 mx-auto"
                    : "w-full lg:w-[65%] h-full flex-shrink-0",
              isTransitioning ? "scale-95" : "scale-100"
            )}>
              {(!clip.ageRestricted || ageRestrictionAccepted) ? (
              clip.videoType === 'reel' && isMobile ? (
                // TikTok-style mobile fullscreen layout for reels only
                <div className="w-full h-full flex items-center justify-center bg-black relative">
                  <VideoPlayer 
                    videoUrl={clip.videoUrl} 
                    thumbnailUrl={clip.thumbnailUrl || (clip.videoUrl ? clip.videoUrl.replace(/\.[^/.]+$/, ".jpg") : undefined)} 
                    autoPlay={true}
                    className="w-full h-full"
                    objectFit="cover"
                    clipId={clip.id}
                    disableAspectRatio={true}
                    hideControls={true}
                    onPlayingChange={setReelIsPlaying}
                    onMutedChange={setReelIsMuted}
                  />
                  {/* Top left play/volume controls - hide during transitions */}
                  <div className={cn(
                    "absolute top-4 left-4 flex items-center gap-3 z-50 transition-opacity duration-150",
                    isTransitioning ? "opacity-0" : "opacity-100"
                  )}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const video = document.querySelector('video');
                        if (video) {
                          if (reelIsPlaying) {
                            video.pause();
                          } else {
                            video.play();
                          }
                        }
                      }}
                      className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/70 transition-colors flex items-center justify-center"
                    >
                      {reelIsPlaying ? (
                        <Pause className="h-5 w-5 text-white" />
                      ) : (
                        <Play className="h-5 w-5 text-white ml-0.5" />
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const video = document.querySelector('video');
                        if (video) {
                          video.muted = !video.muted;
                          setReelIsMuted(!reelIsMuted);
                        }
                      }}
                      className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/70 transition-colors flex items-center justify-center"
                    >
                      {reelIsMuted ? (
                        <VolumeX className="h-5 w-5 text-white" />
                      ) : (
                        <Volume2 className="h-5 w-5 text-white" />
                      )}
                    </button>
                  </div>
                  {/* TikTok-style overlay - hide during transitions to prevent overlap */}
                  <div className={cn(
                    "absolute inset-0 pointer-events-none transition-opacity duration-150",
                    isTransitioning ? "opacity-0" : "opacity-100"
                  )}>
                    {/* Bottom left - User info with inline Follow button */}
                    <div className="absolute bottom-4 left-4 right-20 z-40 pointer-events-auto">
                      {/* User row with Follow button */}
                      <div className="flex items-center gap-2 mb-3">
                        <Link href={`/profile/${clip.user?.username}`} onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          onClose();
                        }}>
                          <div className="flex-shrink-0">
                            {clip?.user && (
                              <CustomAvatar 
                                user={clip.user} 
                                size="sm" 
                                showBorder={true}
                              />
                            )}
                          </div>
                        </Link>
                        <Link href={`/profile/${clip.user?.username}`} onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          onClose();
                        }}>
                          <span className="text-white font-semibold text-sm drop-shadow-lg">
                            @{clip.user?.username || 'unknown'}
                          </span>
                        </Link>
                        {/* Inline Follow button */}
                        {!isOwnClip && clip.user?.username && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={handleFollowClick}
                            disabled={followMutation.isPending}
                            className={cn(
                              "h-7 px-3 text-xs font-semibold rounded-md",
                              followRequestStatus === 'following' 
                                ? "bg-gray-600 hover:bg-gray-700 text-white" 
                                : followRequestStatus === 'requested'
                                  ? "bg-orange-500 hover:bg-orange-600 text-white"
                                  : "bg-green-500 hover:bg-green-600 text-white"
                            )}
                          >
                            {followRequestStatus === 'following' 
                              ? 'Following' 
                              : followRequestStatus === 'requested' 
                                ? 'Requested' 
                                : 'Follow'}
                          </Button>
                        )}
                      </div>
                      
                      {/* Title */}
                      <h2 className="text-white font-semibold text-base mb-1 leading-tight drop-shadow-lg">{clip.title}</h2>
                      
                      {/* Description */}
                      {clip.description && (
                        <p className="text-white/90 text-sm leading-relaxed line-clamp-2 drop-shadow-lg">{clip.description}</p>
                      )}
                      
                      {/* Game tag with icon */}
                      {clip.game && (
                        <div className="mt-2 flex items-center gap-1.5">
                          {signedGameIconUrl && (
                            <img src={signedGameIconUrl} alt="" loading="lazy" className="w-4 h-4 rounded" />
                          )}
                          <span className="text-green-400 text-sm font-medium drop-shadow-lg">
                            {clip.game.name}
                          </span>
                        </div>
                      )}
                      
                      {/* Original audio line */}
                      <div className="mt-2 flex items-center gap-1.5 text-white/70 text-xs">
                        <span>Original audio</span>
                        <span>•</span>
                        <span>{clip.user?.displayName || clip.user?.username || 'Unknown'}</span>
                      </div>
                    </div>
                    
                    {/* Right side action buttons */}
                    <div className="absolute right-3 bottom-8 flex flex-col items-center space-y-5 z-50 pointer-events-auto">
                      <div className="flex flex-col items-center mb-2">
                        {clip?.user && (
                          <CustomAvatar 
                            user={clip.user} 
                            size="md" 
                            showBorder={true}
                          />
                        )}
                      </div>
                      <FireButton 
                        contentId={clip.id}
                        contentType="clip"
                        contentOwnerId={clip.userId}
                        initialFired={false}
                        initialCount={clip._count?.reactions || 0}
                        size="lg"
                        variant="vertical"
                        onUnauthenticatedAction={() => openDialog('general')}
                      />
                      
                      <LikeButton 
                        contentId={clip.id}
                        contentType="clip"
                        contentOwnerId={clip.userId}
                        initialLiked={false}
                        initialCount={clip._count?.likes || 0}
                        size="lg"
                        variant="vertical"
                        onUnauthenticatedAction={() => openDialog('like')}
                      />
                      
                      <div className="flex flex-col items-center">
                        <button 
                          onClick={() => {
                            if (!user) {
                              openDialog('comment');
                            } else {
                              setShowComments(true);
                            }
                          }}
                          className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 transition-colors flex items-center justify-center"
                          data-testid="button-comments"
                        >
                          <MessageSquare className="h-6 w-6 text-white" />
                        </button>
                        <span className="text-white text-xs font-medium mt-1">{comments?.length || 0}</span>
                      </div>
                      
                      <div className="flex flex-col items-center">
                        <ClipShareDialog 
                          clipId={clip.id} 
                          isOwnContent={user?.id === clip.userId}
                          contentType={clip.videoType === 'reel' ? 'reel' : 'clip'}
                          trigger={
                            <button className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 transition-colors flex items-center justify-center">
                              <Share2 className="h-6 w-6 text-white" />
                            </button>
                          } 
                        />
                        <span className="text-white text-xs font-medium mt-1">Share</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : clip.videoType === 'reel' ? (
                // Desktop reels: full height container with video player
                <div className="h-full w-full flex items-center justify-center bg-black relative">
                  {!isFullscreen && (
                    <VideoPlayer 
                      videoUrl={clip.videoUrl} 
                      thumbnailUrl={clip.videoUrl ? clip.videoUrl.replace(/\.[^/.]+$/, ".jpg") : undefined} 
                      autoPlay={true}
                      className="h-full max-h-full"
                      objectFit="contain"
                      clipId={clip.id}
                    />
                  )}
                  {isFullscreen && (
                    <div className="w-full h-full flex items-center justify-center">
                      <img 
                        src={signedThumbnailUrl || "/assets/video-placeholder.svg"} 
                        alt={clip.title}
                        loading="lazy"
                        className="max-w-full max-h-full object-contain opacity-50"
                      />
                    </div>
                  )}
                  {/* Reel badge indicator */}
                  <div className="absolute top-4 right-4 z-50">
                    <span className="bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-bold">
                      Reel
                    </span>
                  </div>
                  {/* Fullscreen button */}
                  <button
                    onClick={() => setIsFullscreen(true)}
                    className="absolute bottom-16 right-4 z-50 p-2 rounded-full bg-black/60 hover:bg-black/80 transition-colors"
                    title="View fullscreen"
                  >
                    <Maximize2 className="h-5 w-5 text-white" />
                  </button>
                </div>
              ) : (
                // Clips: fixed container with video contained inside
                <VideoPlayer 
                  videoUrl={clip.videoUrl} 
                  thumbnailUrl={clip.videoUrl ? clip.videoUrl.replace(/\.[^/.]+$/, ".jpg") : undefined} 
                  autoPlay={true}
                  className="w-full h-full max-w-full max-h-full"
                  objectFit="contain"
                  clipId={clip.id}
                  disableAspectRatio={true}
                />
              )
              ) : (
                // Age-restricted content placeholder
                <div className="w-full h-full flex items-center justify-center text-white">
                  <div className="text-center p-8">
                    <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-yellow-500" />
                    <h3 className="text-xl font-semibold mb-2">Age-Restricted Content</h3>
                    <p className="text-gray-300">Please accept the age restriction warning to view this content.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Backdrop for mobile comments */}
            {clip.videoType === 'reel' && isMobile && showComments && (
              <div 
                className="fixed inset-0 bg-black/20 z-40" 
                onClick={() => setShowComments(false)}
                data-testid="backdrop-comments"
              />
            )}

            {/* Right side - Info and comments */}
            <div className={cn(
              "flex flex-col",
              clip.videoType === 'reel' && isMobile && !showComments
                ? "hidden" // Hide sidebar on mobile for reels when comments not shown
                : clip.videoType === 'reel' && isMobile && showComments
                  ? "absolute inset-x-0 bottom-0 top-[40%] bg-background rounded-t-xl z-50 shadow-lg transform transition-all duration-300 ease-in-out overflow-hidden" // Show comments as slide-up overlay on mobile for reels
                  : isMobile && clip.videoType !== 'reel'
                    ? "w-full flex-1 min-h-0 overflow-hidden" // Take remaining space on mobile for clips
                  : clip.videoType === 'reel'
                    ? "w-full lg:w-[35%] h-full overflow-hidden" // Reels: fixed 35% width for comments
                    : "w-full lg:flex-1 lg:min-w-0 overflow-hidden" // Clips: take remaining space, allow internal scroll
            )}
            style={{ maxHeight: '100%' }}>
              {/* Header with username (mobile comments header or regular header) - FIXED */}
              <div className={cn(
                "border-b border-border flex items-center justify-between flex-shrink-0",
                isMobile ? "p-3" : "p-4", // Better mobile padding
                clip.videoType === 'reel' && isMobile && showComments 
                  ? "relative" // Add relative positioning for mobile comments header
                  : ""
              )}>                
                {/* Close button for mobile comments - larger grab area */}
                {clip.videoType === 'reel' && isMobile && showComments && (
                  <div className="absolute -top-4 left-0 right-0 h-8 flex justify-center items-center">
                    <button 
                      onClick={() => setShowComments(false)}
                      className="p-3 bg-muted rounded-full hover:bg-muted/80 transition-colors"
                      data-testid="button-close-comments"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {clip?.user && (
                      <CustomAvatar 
                        user={clip.user} 
                        size="sm" 
                        showBorder={true}
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {clip.user?.username ? (
                      <Link href={`/profile/${clip.user.username}`} onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        onClose(); // Close the dialog when navigating to profile
                      }}>
                        <div className="font-medium flex items-center gap-1 hover:text-primary transition-colors cursor-pointer">
                          @{clip.user.username}
                          <ModeratorBadge isModerator={(clip.user as any).role === "moderator" || (clip.user as any).role === "admin"} size="sm" />
                          <ProBadge selectedVerificationBadgeId={(clip.user as any).selectedVerificationBadgeId} size="sm" isModerator={(clip.user as any).role === "moderator" || (clip.user as any).role === "admin"} />
                        </div>
                      </Link>
                    ) : (
                      <div className="font-medium text-muted-foreground">
                        Unknown user
                      </div>
                    )}
                    {/* Follow button - next to username */}
                    {!isOwnClip && user && clip.user?.username && (
                      <Button
                        variant={followRequestStatus === 'following' ? "secondary" : "default"}
                        size="sm"
                        onClick={handleFollowClick}
                        disabled={followMutation.isPending}
                        className={cn(
                          "transition-all duration-200 h-7 px-2 text-xs",
                          followRequestStatus === 'following' && "bg-secondary hover:bg-secondary/80",
                          followRequestStatus === 'requested' && "bg-orange-500 hover:bg-orange-600"
                        )}
                        data-testid={`button-follow-${clip.user.username}`}
                      >
                        {followMutation.isPending ? (
                          <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin mr-1" />
                        ) : followRequestStatus === 'following' ? (
                          <UserCheck className="w-3 h-3 mr-1" />
                        ) : followRequestStatus === 'requested' ? (
                          <UserMinus className="w-3 h-3 mr-1" />
                        ) : (
                          <UserPlus className="w-3 h-3 mr-1" />
                        )}
                        {followRequestStatus === 'following' 
                          ? 'Following' 
                          : followRequestStatus === 'requested' 
                            ? 'Requested' 
                            : 'Follow'
                        }
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Comments and content section - scrollable area */}
              <div 
                className={cn(
                  "overflow-y-auto space-y-3 scrollbar-hide",
                  isMobile ? "px-3 py-2" : "px-4 py-3" // Better mobile padding
                )}
                style={{ 
                  scrollbarWidth: 'none', 
                  msOverflowStyle: 'none',
                  flex: '1 1 0',
                  minHeight: 0,
                  maxHeight: 'calc(100% - 80px)' // Account for header height
                }}
                data-scroll-container
              >
                {/* Title and description */}
                <div className="flex-shrink-0">
                  <h1 className={cn("font-semibold", isMobile ? "text-lg" : "text-xl")}>{clip.title}</h1>
                  {clip.description && (
                    <p className={cn("text-foreground mt-1 leading-relaxed break-words max-h-24 overflow-y-auto", isMobile ? "text-sm" : "text-base")}>{clip.description}</p>
                  )}

                  {/* Game name above views/time */}
                  {clip.game && (
                    <div className="mt-2">
                      <Link href={`/games/${clip.game.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`} onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                      }}>
                        <span className="bg-green-600 text-white px-3 py-1.5 rounded text-sm font-bold hover:bg-green-500 cursor-pointer transition-colors">
                          {clip.game.name}
                        </span>
                      </Link>
                    </div>
                  )}

                  <div className="flex items-center mt-2 text-sm text-muted-foreground">
                    <Eye className="h-4 w-4 mr-1" />
                    <span className="mr-3">{clip.views} views</span>
                    <Clock className="h-4 w-4 mr-1" />
                    <span>{clip.createdAt ? formatDistance(new Date(clip.createdAt), new Date(), { addSuffix: true }) : 'Unknown'}</span>
                  </div>

                  {/* Action bar with reaction buttons - moved above comments */}
                  <div className="border-t border-b border-border py-3 mt-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <LikeButton 
                          contentId={clip.id}
                          contentType="clip"
                          initialLiked={false} // This would come from server in real implementation
                          initialCount={clip._count?.likes || 0}
                          size="lg"
                          onUnauthenticatedAction={() => openDialog('like')}
                        />

                        <FireButton 
                          contentId={clip.id}
                          contentType="clip"
                          contentOwnerId={clip.userId}
                          initialFired={false}
                          initialCount={clip._count?.reactions || 0}
                          size="lg"
                          onUnauthenticatedAction={() => openDialog('general')}
                        />

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              if (!user) {
                                openDialog('comment');
                              } else {
                                // Focus the comment input field within the scrollable container
                                const commentInput = document.querySelector('[data-testid="input-comment"]') as HTMLTextAreaElement;
                                const scrollContainer = document.querySelector('[data-scroll-container]');
                                if (commentInput && scrollContainer) {
                                  // Scroll the container to show the comment input
                                  const containerRect = scrollContainer.getBoundingClientRect();
                                  const inputRect = commentInput.getBoundingClientRect();
                                  const scrollTop = scrollContainer.scrollTop + (inputRect.top - containerRect.top) - 100;
                                  scrollContainer.scrollTo({ top: scrollTop, behavior: 'smooth' });
                                  setTimeout(() => commentInput.focus(), 300);
                                } else if (commentInput) {
                                  commentInput.focus();
                                }
                              }
                            }}
                            className="p-1.5 h-auto transition-colors hover:bg-primary/10 rounded-md text-gray-500 hover:text-primary"
                            data-testid="button-comments-action"
                          >
                            <MessageSquare className="h-5 w-5" />
                          </button>
                          <span className="font-medium min-w-[1rem] text-center text-base text-muted-foreground">
                            {comments?.length || 0}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <ClipShareDialog 
                          clipId={clip.id} 
                          isOwnContent={user?.id === clip.userId}
                          contentType={clip.videoType === 'reel' ? 'reel' : 'clip'}
                          trigger={
                            <button className="focus:outline-none">
                              <Share2 className="h-6 w-6" />
                            </button>
                          } 
                        />
                        
                        <ReportDialog
                          contentType="clip"
                          contentId={clip.id}
                          contentTitle={clip.title}
                          contentAuthor={clip.user.username}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Comments section */}
                <div className="pt-2 pb-4">
                  <CommentSection 
                    clipId={clip.id}
                    currentUserId={user?.id || null} 
                    onUsernameClick={() => onClose()}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
        </DialogPrimitive.Content>
      </DialogPortal>
      
      <JoinGamefolioDialog 
        open={joinDialogOpen} 
        onOpenChange={closeDialog} 
        actionType={actionType} 
      />
      
      {clip && (
        <AgeRestrictionDialog
          isOpen={showAgeRestrictionDialog}
          onAccept={() => {
            isAcceptingRef.current = true;
            setAgeRestrictionAccepted(true);
            // Dialog will auto-close via useEffect
          }}
          onDecline={() => {
            // Only close if we're not in the middle of accepting
            if (!isAcceptingRef.current) {
              setShowAgeRestrictionDialog(false);
              onClose();
            }
          }}
          contentType={clip.videoType === 'reel' ? 'reel' : 'clip'}
        />
      )}
      
      {/* Fullscreen video overlay */}
      {clip && isFullscreen && (
        <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-4 right-4 z-[110] p-3 rounded-full bg-black/60 hover:bg-black/80 transition-colors"
            title="Exit fullscreen"
          >
            <X className="h-6 w-6 text-white" />
          </button>
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-4 left-4 z-[110] p-3 rounded-full bg-black/60 hover:bg-black/80 transition-colors"
            title="Minimize"
          >
            <Minimize2 className="h-6 w-6 text-white" />
          </button>
          <div className="h-full max-h-full w-full flex items-center justify-center">
            <div className="h-full aspect-[9/16] max-w-full">
              <VideoPlayer 
                videoUrl={clip.videoUrl} 
                thumbnailUrl={clip.thumbnailUrl || undefined} 
                autoPlay={true}
                className="w-full h-full"
                objectFit="contain"
                clipId={clip.id}
                disableAspectRatio={true}
              />
            </div>
          </div>
          {/* Fullscreen overlay info */}
          <div className="absolute bottom-8 left-8 right-8 z-[110] text-white">
            <h2 className="text-xl font-semibold mb-2">{clip.title}</h2>
            {clip.game && (
              <span className="bg-green-600 text-white px-3 py-1.5 rounded text-sm font-bold">
                {clip.game.name}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="z-[200]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this clip?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{clip?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={async () => {
                if (!clip) return;
                try {
                  const response = await fetch(`/api/clips/${clip.id}`, { 
                    method: 'DELETE',
                    credentials: 'include'
                  });
                  if (response.ok) {
                    toast({ title: "Clip deleted successfully" });
                    queryClient.invalidateQueries({ queryKey: ['/api/clips'] });
                    if (clip.user?.username) {
                      queryClient.invalidateQueries({ queryKey: [`/api/users/${clip.user.username}/clips`] });
                      queryClient.invalidateQueries({ queryKey: [`/api/users/${clip.user.username}`] });
                    }
                    queryClient.invalidateQueries({ queryKey: ['/api/clips/trending'] });
                    queryClient.invalidateQueries({ queryKey: ['/api/clips/reels/trending'] });
                    queryClient.invalidateQueries({ queryKey: ['/api/reels/latest'] });
                    queryClient.invalidateQueries({ queryKey: ['/api/reels/trending'] });
                    queryClient.invalidateQueries({ queryKey: ['/api/reels'] });
                    setShowDeleteConfirm(false);
                    onClose();
                  } else {
                    toast({ title: "Failed to delete clip", variant: "destructive" });
                  }
                } catch (error) {
                  toast({ title: "Failed to delete clip", variant: "destructive" });
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};

export { ClipDialog };