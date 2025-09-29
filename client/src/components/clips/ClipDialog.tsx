import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ClipWithUser, CommentWithUser } from "@shared/schema";
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
  ChevronRight,
  Heart,
  Send,
  ChevronDown
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
  const [showComments, setShowComments] = useState(false); // Start with comments hidden for Instagram-like behavior
  const [isMobile, setIsMobile] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [previousClipId, setPreviousClipId] = useState<number | null>(null);

  // Access closeClipDialog from useClipDialog
  const { closeClipDialog } = useClipDialog();

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
      setShowComments(false); // Reset comments visibility when dialog closes
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

  // Fetch comments for mobile overlay
  const { data: comments } = useQuery<CommentWithUser[]>({
    queryKey: [`/api/clips/${clipId}/comments`],
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
        className={cn(
          "p-0 bg-background text-foreground overflow-hidden clip-dialog-content",
          isMobile && clip?.videoType === 'reel' 
            ? "w-screen h-screen max-w-none max-h-none" // Full screen on mobile for reels
            : "max-w-[85vw] w-[85vw] max-h-[85vh] h-[85vh]" // Smaller dialog size for better desktop experience
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
            {/* Video player area */}
            <div className={cn(
              "bg-black flex items-center justify-center transition-transform duration-200 relative",
              // Mobile Instagram-like behavior for reels only
              clip.videoType === 'reel' && isMobile
                ? "w-full h-full" // Full screen on mobile for reels
                : "w-full lg:w-[75%] h-[60vh] lg:h-full", // Same size for both clips and reels on desktop
              isTransitioning ? "scale-95" : "scale-100"
            )}>
              {clip.videoType === 'reel' && isMobile ? (
                // Special mobile fullscreen layout for reels only
                <div className="h-full flex items-center justify-center bg-black relative">
                  <div className="h-full max-h-full aspect-[9/16] bg-black relative">
                    <VideoPlayer 
                      videoUrl={clip.videoUrl} 
                      thumbnailUrl={clip.thumbnailUrl || (clip.videoUrl ? clip.videoUrl.replace(/\.[^/.]+$/, ".jpg") : undefined)} 
                      autoPlay={true}
                      className="w-full h-full"
                      objectFit="contain"
                      clipId={clip.id}
                    />
                    {/* Mobile Instagram-like overlay for reels */}
                    <div className="absolute inset-0 pointer-events-none">
                      {/* Top overlay with user info */}
                      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-50 pointer-events-auto">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden mr-3">
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
                          {clip.user?.username && (
                            <div className="text-white font-medium text-sm">
                              @{clip.user.username}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Right side action buttons */}
                      <div className="absolute right-6 bottom-32 flex flex-col items-center space-y-4 z-50 pointer-events-auto">
                        <FireButton 
                          contentId={clip.id}
                          contentType="clip"
                          initialFired={false}
                          initialCount={0}
                          size="lg"
                          variant="vertical"
                          onUnauthenticatedAction={() => openDialog('general')}
                        />
                        
                        <LikeButton 
                          contentId={clip.id}
                          contentType="clip"
                          initialLiked={false}
                          initialCount={clip._count?.likes || 0}
                          size="lg"
                          variant="vertical"
                          onUnauthenticatedAction={() => openDialog('like')}
                        />
                        
                        <div className="flex flex-col items-center">
                          <button 
                            onClick={() => setShowComments(true)}
                            className="p-3 rounded-full bg-black/30 backdrop-blur-sm"
                            data-testid="button-comments"
                          >
                            <MessageSquare className="h-6 w-6 text-white" />
                          </button>
                          <span className="text-white text-xs mt-1">{comments?.length || 0}</span>
                        </div>
                        
                        <div className="flex flex-col items-center">
                          <ClipShareDialog 
                            clipId={clip.id} 
                            isOwnContent={user?.id === clip.userId}
                            trigger={
                              <button className="p-3 rounded-full bg-black/30 backdrop-blur-sm">
                                <Send className="h-6 w-6 text-white" />
                              </button>
                            } 
                          />
                        </div>
                      </div>
                      
                      {/* Bottom overlay with title and description */}
                      <div className="absolute bottom-4 left-4 right-24 z-40">
                        <h2 className="text-white font-semibold text-lg mb-1">{clip.title}</h2>
                        {clip.description && (
                          <p className="text-white/80 text-sm">{clip.description}</p>
                        )}
                        {clip.game && (
                          <div className="mt-2">
                            <span className="bg-green-600 text-white px-2 py-1 rounded text-xs font-bold">
                              {clip.game.name}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // Same layout for both clips and reels on desktop, and clips on mobile
                <VideoPlayer 
                  videoUrl={clip.videoUrl} 
                  thumbnailUrl={clip.videoUrl ? clip.videoUrl.replace(/\.[^/.]+$/, ".jpg") : undefined} 
                  autoPlay={true}
                  className="w-full h-full"
                  objectFit="contain"
                  clipId={clip.id}
                />
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

            {/* Right side - Info and comments (hidden on mobile for reels when comments not shown) */}
            <div className={cn(
              "h-full flex flex-col",
              clip.videoType === 'reel' && isMobile && !showComments
                ? "hidden" // Hide sidebar on mobile for reels when comments not shown
                : "w-full lg:w-[25%]", // Same sidebar width for both clips and reels on desktop
              // Show comments as slide-up overlay on mobile for reels
              clip.videoType === 'reel' && isMobile && showComments
                ? "absolute inset-x-0 bottom-0 top-[40%] bg-background rounded-t-xl z-50 shadow-lg transform transition-all duration-300 ease-in-out" 
                : ""
            )}>
              {/* Header with username (mobile comments header or regular header) */}
              <div className={cn(
                "border-b border-border p-4 flex items-center justify-between",
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