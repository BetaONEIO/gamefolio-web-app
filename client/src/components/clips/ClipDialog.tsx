import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ClipWithUser } from "@shared/schema";
import VideoPlayer from "@/components/shared/VideoPlayer";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose
} from "@/components/ui/dialog";
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
  ChevronRight
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
import { VerificationBadge } from "@/components/ui/verification-badge";
import { LikeButton } from "@/components/engagement/LikeButton";
import { FireButton } from "@/components/engagement/FireButton";
import { FullscreenReelsViewer } from "./FullscreenReelsViewer";
import { useClipDialog } from "@/hooks/use-clip-dialog";
import { ReportDialog } from "@/components/content/ReportDialog";

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
  const [showComments, setShowComments] = useState(true); // Set to true to show comments by default
  const dialogRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [previousClipId, setPreviousClipId] = useState<number | null>(null);

  // Access closeClipDialog from useClipDialog
  const { closeClipDialog } = useClipDialog();

  // Reset state when dialog is closed
  useEffect(() => {
    if (!isOpen) {
      // Don't reset showComments as we want to keep it visible by default
    }
  }, [isOpen]);

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
      // Only handle navigation if dialog is open and we have navigation functions
      if (!isOpen || !showNavigation || isTransitioning) return;
      
      // Don't interfere with form inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
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
  }, [isOpen, showNavigation, onNext, onPrevious, onClose, isTransitioning]);

  // Only fetch if dialog is open and we have a clipId
  const { data: clip, isLoading } = useQuery<ClipWithUser>({
    queryKey: [`/api/clips/${clipId}`],
    enabled: isOpen && clipId !== null,
  });

  // Share functionality replaced by ShareMenu component

  // Record view when dialog opens
  useEffect(() => {
    if (isOpen && clipId) {
      // Record view
      fetch(`/api/clips/${clipId}/views`, {
        method: 'POST',
        credentials: 'include',
      }).catch(console.error);
    }
  }, [isOpen, clipId]);


  // Touch navigation for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!showNavigation) return;
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
    setTouchEnd(null);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!showNavigation || !touchStart) return;
    const touch = e.touches[0];
    setTouchEnd({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchEnd = () => {
    if (!showNavigation || !touchStart || !touchEnd) return;

    const deltaX = touchEnd.x - touchStart.x;
    const deltaY = touchEnd.y - touchStart.y;
    const minSwipeDistance = 50;

    // Check if it's a horizontal or vertical swipe
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

    setTouchStart(null);
    setTouchEnd(null);
  };

  if (!isOpen) return null;

  // Note: FullscreenReelsViewer is handled separately via the ClipDialogProvider

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        ref={dialogRef}
        className="max-w-[95vw] w-[95vw] p-0 bg-background text-foreground max-h-[95vh] h-[95vh] overflow-hidden clip-dialog-content"
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
        <DialogClose className="absolute right-4 top-4 z-10 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
          <X className="h-6 w-6" />
          <span className="sr-only">Close</span>
        </DialogClose>

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
        ) : (
          <div className={cn(
            "flex flex-col lg:flex-row h-full transition-opacity duration-300",
            isTransitioning ? "opacity-60" : "opacity-100"
          )}>
            {/* Left side - Video player */}
            <div className={cn(
              "bg-black flex items-center justify-center transition-transform duration-200",
              clip.videoType === 'reel' 
                ? "w-full lg:w-[65%] h-[60vh] lg:h-full" // Larger area for reels
                : "w-full lg:w-[75%] h-[60vh] lg:h-full",  // Full width for clips
              isTransitioning ? "scale-95" : "scale-100"
            )}>
              {clip.videoType === 'reel' ? (
                // For reels: Force 9:16 aspect ratio display with proper contain fit
                <div className="h-full flex items-center justify-center bg-black relative max-h-[calc(100vh-120px)]">
                  <div className="h-full max-h-full aspect-[9/16] bg-black relative">
                    <VideoPlayer 
                      videoUrl={clip.videoUrl} 
                      thumbnailUrl={clip.thumbnailUrl || (clip.videoUrl ? clip.videoUrl.replace(/\.[^/.]+$/, ".jpg") : undefined)} 
                      autoPlay={true}
                      className="w-full h-full"
                      objectFit="contain"
                      clipId={clip.id}
                    />
                    {/* Reel-specific overlay to ensure controls visibility */}
                    <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-md pointer-events-none z-50">
                      Reel
                    </div>
                  </div>
                </div>
              ) : (
                // For clips: Use full container
                <VideoPlayer 
                  videoUrl={clip.videoUrl} 
                  thumbnailUrl={clip.thumbnailUrl || (clip.videoUrl ? clip.videoUrl.replace(/\.[^/.]+$/, ".jpg") : undefined)} 
                  autoPlay={true}
                  className="w-full h-full"
                  objectFit="contain"
                  clipId={clip.id}
                />
              )}
            </div>

            {/* Right side - Info and comments */}
            <div className={cn(
              "h-full flex flex-col",
              clip.videoType === 'reel' 
                ? "w-full lg:w-[35%]" // Adjusted sidebar for reels
                : "w-full lg:w-[25%]"  // Standard sidebar for clips
            )}>
              {/* Header with username */}
              <div className="border-b border-border p-4 flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center overflow-hidden mr-3">
                    {clip.user?.avatarUrl ? (
                      <img 
                        src={clip.user.avatarUrl} 
                        alt={clip.user?.displayName || clip.user?.username || 'User'} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <UserIcon className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  {clip.user?.username ? (
                    <Link href={`/profile/${clip.user.username}`} onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      onClose(); // Close the dialog when navigating to profile
                    }}>
                      <div className="font-medium flex items-center hover:text-primary transition-colors cursor-pointer">
                        @{clip.user.username}
                        <VerificationBadge 
                          isVerified={!!clip.user?.emailVerified} 
                          size="sm" 
                        />
                      </div>
                    </Link>
                  ) : (
                    <div className="font-medium text-muted-foreground">
                      Unknown user
                    </div>
                  )}
                </div>

                <div className="text-sm">
                  {/* Game name moved to description area */}
                </div>
              </div>

              {/* Comments and content section - scrollable */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {/* Title and description */}
                <div>
                  <h1 className="text-xl font-semibold">{clip.title}</h1>
                  {clip.description && (
                    <p className="text-base text-foreground mt-1">{clip.description}</p>
                  )}

                  {/* Game name above views/time */}
                  {clip.game && (
                    <div className="mt-2">
                      <Link href={`/games/${clip.game.id}/clips`} onClick={(e) => {
                        e.stopPropagation();
                        onClose(); // Close the dialog when navigating to game clips
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
                          initialFired={false}
                          initialCount={0}
                          size="lg"
                          onUnauthenticatedAction={() => openDialog('general')}
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <ClipShareDialog 
                          clipId={clip.id} 
                          isOwnContent={user?.id === clip.userId}
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
                <div className="pt-2">
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
      </DialogContent>
      
      <JoinGamefolioDialog 
        open={joinDialogOpen} 
        onOpenChange={closeDialog} 
        actionType={actionType} 
      />
    </Dialog>
  );
};

export { ClipDialog };