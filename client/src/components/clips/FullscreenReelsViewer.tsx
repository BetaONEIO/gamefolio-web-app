
import { useState, useEffect, useCallback, useRef } from "react";
import { ClipWithUser } from "@shared/schema";
import VideoPlayer from "@/components/shared/VideoPlayer";
import { ChevronLeft, Heart, MessageCircle, Share2, MoreVertical, User, Play, Pause, Flag, Check, Volume2, VolumeX, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { LikeButton } from "@/components/engagement/LikeButton";
import { FireButton } from "@/components/engagement/FireButton";
import CommentSection from "@/components/clips/CommentSection";
import ShareMenu from "@/components/clips/ShareMenu";
import { useAuth } from "@/hooks/use-auth";
import { useJoinDialog } from "@/hooks/use-join-dialog";
import { JoinGamefolioDialog } from "@/components/auth/JoinGamefolioDialog";
import { cn } from "@/lib/utils";
import { ReportDialog } from "@/components/content/ReportDialog";
import { AgeRestrictionDialog } from "@/components/content/AgeRestrictionDialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { VideoAdPlayer } from "@/components/ads/VideoAdPlayer";
import { useReelAdTracker } from "@/hooks/use-ad-manager";

interface FullscreenReelsViewerProps {
  reels: ClipWithUser[];
  initialIndex: number;
  onClose: () => void;
}

export function FullscreenReelsViewer({ reels, initialIndex, onClose }: FullscreenReelsViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [showComments, setShowComments] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [ageRestrictionAccepted, setAgeRestrictionAccepted] = useState<Record<number, boolean>>({});
  const [showAgeRestrictionDialog, setShowAgeRestrictionDialog] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const isAcceptingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const { isOpen: isJoinDialogOpen, actionType, openDialog, closeDialog } = useJoinDialog();
  
  const { showAd, isPro, onReelChange, onAdFinished, reset: resetAdTracker } = useReelAdTracker();

  const currentReel = reels[currentIndex];

  // Follow status for current user
  const { data: followStatus } = useQuery<{ following: boolean; requested: boolean }>({
    queryKey: [`/api/users/${currentReel?.user?.username}/follow-status`],
    enabled: !!currentReel?.user?.username && !!user,
  });

  const isFollowing = followStatus?.following || followStatus?.requested || false;

  // Follow/unfollow mutation
  const followMutation = useMutation({
    mutationFn: async () => {
      if (isFollowing) {
        await apiRequest("DELETE", `/api/users/${currentReel.user.username}/follow`);
      } else {
        await apiRequest("POST", `/api/users/${currentReel.user.username}/follow`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${currentReel.user.username}/follow-status`] });
      toast({
        description: isFollowing ? `Unfollowed ${currentReel.user.displayName}` : `Following ${currentReel.user.displayName}`,
        variant: "gamefolioSuccess",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update follow status",
        variant: "destructive",
      });
    },
  });

  const handleFollow = () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to follow users",
        variant: "destructive",
      });
      return;
    }
    if (user.id === currentReel.user.id) {
      return; // Don't allow following yourself
    }
    followMutation.mutate();
  };

  // Scroll to initial reel on mount
  useEffect(() => {
    if (containerRef.current) {
      const scrollPosition = initialIndex * window.innerHeight;
      containerRef.current.scrollTop = scrollPosition;
    }
  }, []);

  // Track current reel based on scroll position and trigger ads every 5 reels
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const newIndex = Math.round(scrollTop / window.innerHeight);
      if (newIndex !== currentIndex && newIndex >= 0 && newIndex < reels.length) {
        setCurrentIndex(newIndex);
        if (!isPro) {
          onReelChange(newIndex);
        }
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [currentIndex, reels.length, isPro, onReelChange]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const container = containerRef.current;
    if (!container) return;

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        if (currentIndex > 0) {
          container.scrollTo({ top: (currentIndex - 1) * window.innerHeight, behavior: 'smooth' });
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (currentIndex < reels.length - 1) {
          container.scrollTo({ top: (currentIndex + 1) * window.innerHeight, behavior: 'smooth' });
        }
        break;
      case 'Escape':
        onClose();
        break;
    }
  }, [currentIndex, reels.length, onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Check for age restriction when reel changes
  useEffect(() => {
    if (currentReel && currentReel.ageRestricted && !ageRestrictionAccepted[currentReel.id]) {
      setShowAgeRestrictionDialog(true);
    }
  }, [currentReel, ageRestrictionAccepted]);

  // Auto-close age restriction dialog after acceptance
  useEffect(() => {
    if (currentReel && ageRestrictionAccepted[currentReel.id] && showAgeRestrictionDialog) {
      const timer = setTimeout(() => {
        setShowAgeRestrictionDialog(false);
        setTimeout(() => {
          isAcceptingRef.current = false;
        }, 100);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [ageRestrictionAccepted, showAgeRestrictionDialog, currentReel]);

  // Reset comments when switching reels
  useEffect(() => {
    setShowComments(false);
    setShowShare(false);
  }, [currentIndex]);

  if (!currentReel) return null;

  return (
    <div className="fixed inset-0 bg-black z-50">
      {/* Ad overlay - shows every 5 reels for non-Pro users */}
      {showAd && (
        <div className="fixed inset-0 bg-black z-[60] flex items-center justify-center">
          <VideoAdPlayer 
            onAdComplete={onAdFinished}
            onAdError={onAdFinished}
            onAdSkipped={onAdFinished}
            skipAfterSeconds={5}
            className="w-full h-full max-w-2xl"
          />
        </div>
      )}
      
      {/* Top header bar - TikTok style */}
      <div className="fixed top-0 left-0 right-0 z-20 flex items-center justify-between p-3 md:p-4">
        {/* Left controls - Pause/Play and Volume */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-white bg-black/40 hover:bg-black/60 w-10 h-10 p-0 rounded-lg"
            onClick={() => setIsPaused(!isPaused)}
          >
            {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-white bg-black/40 hover:bg-black/60 w-10 h-10 p-0 rounded-lg"
            onClick={() => setIsMuted(!isMuted)}
          >
            {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </Button>
        </div>

        {/* Right controls - Delete (for owner) and Close */}
        <div className="flex items-center gap-2">
          {user && currentReel && user.id === currentReel.userId && (
            <Button
              variant="ghost"
              size="sm"
              className="text-white bg-black/40 hover:bg-black/60 w-10 h-10 p-0 rounded-lg"
              onClick={() => {
                toast({
                  description: "Delete functionality available in clip settings",
                  variant: "default",
                });
              }}
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-white bg-black/40 hover:bg-black/60 w-10 h-10 p-0 rounded-lg"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Scrollable reels container */}
      <div 
        ref={containerRef}
        className="h-screen w-full overflow-y-scroll overflow-x-hidden snap-y snap-mandatory [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y', overscrollBehavior: 'contain' }}
      >
        {reels.map((reel, index) => (
          <div 
            key={reel.id}
            className="snap-start snap-always h-screen w-full flex items-center justify-center relative"
            style={{ scrollSnapStop: 'always' }}
          >
            {/* Video player - full screen on mobile */}
            <div className="relative w-full h-full md:max-w-lg lg:max-w-xl mx-auto pointer-events-none">
              <div className="w-full h-full pointer-events-auto flex items-center justify-center">
                {(!reel.ageRestricted || ageRestrictionAccepted[reel.id]) ? (
                  <VideoPlayer
                    videoUrl={reel.videoUrl}
                    thumbnailUrl={reel.thumbnailUrl || undefined}
                    autoPlay={index === currentIndex}
                    className="w-full h-full"
                    objectFit="cover"
                    clipId={reel.id}
                    disableAspectRatio={true}
                    onEnded={() => {
                      if (index < reels.length - 1 && containerRef.current) {
                        containerRef.current.scrollTo({ top: (index + 1) * window.innerHeight, behavior: 'smooth' });
                      }
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-black/80">
                    <div className="text-center text-white p-6">
                      <p className="text-lg font-semibold mb-2">Age-Restricted Content</p>
                      <p className="text-sm text-white/70">This reel has been marked as age-restricted</p>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        ))}
      </div>

      {/* Fixed overlay content - positioned outside scroll container to prevent overlap during transitions */}
      {currentReel && (
        <div className="fixed inset-0 pointer-events-none z-30">
          {/* Right side - Engagement buttons (TikTok-style) */}
          <div className="absolute right-3 md:right-4 bottom-28 md:bottom-24 flex flex-col items-center gap-5 pointer-events-auto">
            {/* Fire/Reactions */}
            <div className="flex flex-col items-center">
              <FireButton
                contentId={currentReel.id}
                contentType="clip"
                contentOwnerId={currentReel.userId}
                initialCount={parseInt(currentReel._count?.reactions?.toString() || '0')}
                size="lg"
                showCount={false}
                variant="vertical"
              />
            </div>

            {/* Like/Heart */}
            <div className="flex flex-col items-center">
              <LikeButton
                contentId={currentReel.id}
                contentType="clip"
                contentOwnerId={currentReel.userId}
                initialLiked={false}
                initialCount={parseInt(currentReel._count?.likes?.toString() || '0')}
                size="lg"
                showCount={true}
                variant="vertical"
              />
            </div>

            {/* Comments */}
            <div className="flex flex-col items-center">
              <button
                className="w-12 h-12 rounded-full bg-black/30 flex items-center justify-center text-white hover:bg-black/50 transition-colors"
                onClick={() => {
                  if (!user) {
                    openDialog('comment');
                  } else {
                    setShowComments(true);
                  }
                }}
              >
                <MessageCircle className="h-7 w-7" />
              </button>
              <span className="text-white text-xs mt-1 font-medium">
                {currentReel._count?.comments || 0}
              </span>
            </div>

            {/* Share */}
            <div className="flex flex-col items-center">
              <button
                className="w-12 h-12 rounded-full bg-black/30 flex items-center justify-center text-white hover:bg-black/50 transition-colors"
                onClick={() => setShowShare(true)}
              >
                <Share2 className="h-6 w-6" />
              </button>
              <span className="text-white text-xs mt-1 font-medium">Share</span>
            </div>
          </div>

          {/* Bottom left - User info and title */}
          <div className="absolute bottom-20 md:bottom-16 left-3 md:left-4 right-20 md:right-24 pointer-events-auto">
            {/* User row with avatar and username */}
            <div className="flex items-center gap-2 mb-2">
              <Link href={`/profile/${currentReel.user.username}`} onClick={onClose}>
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden border-2 border-white/40 cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0">
                  <img
                    src={currentReel.user.avatarUrl || '/uploaded_assets/gamefolio social logo 3d circle web.png'}
                    alt={currentReel.user.displayName}
                    className="w-full h-full object-cover"
                  />
                </div>
              </Link>
              <Link href={`/profile/${currentReel.user.username}`} onClick={onClose}>
                <span className="text-white font-semibold text-sm cursor-pointer hover:opacity-80">
                  @{currentReel.user.username}
                </span>
              </Link>
              {/* Inline Follow button */}
              {user && user.id !== currentReel.user.id && (
                <Button
                  onClick={handleFollow}
                  disabled={followMutation.isPending}
                  size="sm"
                  className={cn(
                    "h-7 px-3 text-xs font-semibold rounded-md transition-colors ml-1",
                    isFollowing 
                      ? "bg-transparent border border-white/50 text-white hover:bg-white/10" 
                      : "bg-[#00E676] text-black hover:bg-[#00C853]"
                  )}
                  data-testid="button-follow"
                >
                  {isFollowing ? "Following" : "Follow"}
                </Button>
              )}
            </div>

            {/* Title */}
            <h3 className="text-white font-semibold text-base mb-1 leading-tight line-clamp-1 drop-shadow-lg">
              {currentReel.title}
            </h3>

            {/* Description if available */}
            {currentReel.description && (
              <p className="text-white/90 text-sm mb-1.5 line-clamp-1 drop-shadow-md">
                {currentReel.description}
              </p>
            )}

            {/* Game badge */}
            {currentReel.game && (
              <div className="mb-1.5">
                <span className="text-[#00E676] text-sm font-medium drop-shadow-lg">{currentReel.game.name}</span>
              </div>
            )}

            {/* Audio/Original info */}
            <div className="flex items-center gap-1.5 text-white/80 text-xs drop-shadow-md">
              <span>Original audio</span>
              <span>•</span>
              <span>{currentReel.user.displayName || currentReel.user.username}</span>
            </div>
          </div>

          {/* Report button - subtle, bottom right corner */}
          <div className="absolute bottom-20 md:bottom-16 right-3 md:right-4 pointer-events-auto">
            <ReportDialog
              contentType="clip"
              contentId={currentReel.id}
              contentTitle={currentReel.title}
              contentAuthor={currentReel.user.username}
              trigger={
                <button className="w-8 h-8 rounded-full bg-transparent flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors">
                  <MoreVertical className="h-4 w-4" />
                </button>
              }
            />
          </div>
        </div>
      )}

      {/* Navigation hints - desktop only */}
      <div className="fixed bottom-2 md:bottom-4 left-1/2 transform -translate-x-1/2 text-white/30 text-xs text-center px-4 z-20 hidden md:block">
        <p>Scroll or use arrow keys to navigate • ESC to close</p>
      </div>

      {/* Comments overlay */}
      {showComments && (
        <div className="absolute inset-0 bg-black/80 z-10">
          <div className="absolute bottom-0 left-0 right-0 bg-background rounded-t-2xl max-h-[80vh] md:max-h-[70vh] overflow-hidden">
            <div className="p-3 md:p-4 border-b flex justify-between items-center">
              <h3 className="font-semibold text-sm md:text-base">Comments</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowComments(false)}
                className="h-8 w-8 p-0"
              >
                ✕
              </Button>
            </div>
            <div className="overflow-y-auto max-h-[calc(80vh-60px)] md:max-h-[calc(70vh-80px)]">
              <CommentSection
                clipId={currentReel.id}
                currentUserId={user?.id}
              />
            </div>
          </div>
        </div>
      )}

      {/* Share overlay */}
      {showShare && (
        <div className="absolute inset-0 bg-black/80 z-10 flex items-center justify-center p-4">
          <div className="bg-background rounded-2xl p-4 md:p-6 max-w-sm w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-sm md:text-base">Share Reel</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowShare(false)}
                className="h-8 w-8 p-0"
              >
                ✕
              </Button>
            </div>
            <ShareMenu
              clipId={currentReel.id}
              clipTitle={currentReel.title}
            />
          </div>
        </div>
      )}

      {/* Age Restriction Dialog */}
      {currentReel && (
        <AgeRestrictionDialog
          isOpen={showAgeRestrictionDialog}
          onAccept={() => {
            isAcceptingRef.current = true;
            setAgeRestrictionAccepted(prev => ({
              ...prev,
              [currentReel.id]: true
            }));
          }}
          onDecline={() => {
            if (!isAcceptingRef.current) {
              setShowAgeRestrictionDialog(false);
              onClose();
            }
          }}
          contentType="reel"
        />
      )}

      {/* Join Dialog for unauthenticated users */}
      <JoinGamefolioDialog
        open={isJoinDialogOpen}
        onOpenChange={(open) => !open && closeDialog()}
        actionType={actionType}
      />
    </div>
  );
}
