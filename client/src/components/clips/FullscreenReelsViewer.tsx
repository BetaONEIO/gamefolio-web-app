
import { useState, useEffect, useCallback, useRef } from "react";
import { ClipWithUser } from "@shared/schema";
import VideoPlayer from "@/components/shared/VideoPlayer";
import { ChevronLeft, Heart, MessageCircle, Share2, MoreVertical, User, Play, Pause, Flag, Check } from "lucide-react";
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
      
      {/* Close button - subtle on mobile */}
      <Button
        variant="ghost"
        size="sm"
        className="fixed top-3 left-3 md:top-4 md:left-4 z-20 text-white/80 hover:text-white bg-transparent hover:bg-white/10 w-8 h-8 p-0 rounded-full"
        onClick={onClose}
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>

      {/* Progress indicators - hidden on mobile for cleaner look */}
      <div className="fixed top-4 right-4 z-20 hidden md:flex gap-1">
        {reels.slice(0, 10).map((_, index) => (
          <div
            key={index}
            className={cn(
              "w-1 h-6 rounded-full transition-colors",
              index === currentIndex ? "bg-white" : "bg-white/20"
            )}
          />
        ))}
        {reels.length > 10 && (
          <span className="text-white/50 text-xs ml-1">+{reels.length - 10}</span>
        )}
      </div>

      {/* Scrollable reels container */}
      <div 
        ref={containerRef}
        className="h-screen w-full overflow-y-scroll snap-y snap-mandatory [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
      >
        {reels.map((reel, index) => (
          <div 
            key={reel.id}
            className="snap-start snap-always h-screen w-full flex items-center justify-center"
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

              {/* Video overlay content */}
              <div className="absolute inset-0 pointer-events-none z-10">
                {/* Left side - User info and title (TikTok-style) */}
                <div className="absolute bottom-8 md:bottom-12 left-3 md:left-4 right-16 md:right-20 pointer-events-auto z-10">
                  {/* User row with inline follow button */}
                  <div className="flex items-center gap-2 mb-2">
                    <Link href={`/profile/${reel.user.username}`} onClick={onClose}>
                      <div className="w-10 h-10 md:w-11 md:h-11 rounded-full overflow-hidden border-2 border-white/30 cursor-pointer hover:opacity-80 transition-opacity">
                        <img
                          src={reel.user.avatarUrl || '/uploaded_assets/gamefolio social logo 3d circle web.png'}
                          alt={reel.user.displayName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </Link>
                    <Link href={`/profile/${reel.user.username}`} onClick={onClose}>
                      <span className="text-white font-semibold text-sm cursor-pointer hover:opacity-80">
                        @{reel.user.username}
                      </span>
                    </Link>
                    {/* Inline Follow button */}
                    {user && user.id !== reel.user.id && index === currentIndex && (
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
                  <h3 className="text-white font-medium text-sm mb-1 leading-tight line-clamp-2">
                    {reel.title}
                  </h3>

                  {/* Description if available */}
                  {reel.description && (
                    <p className="text-white/80 text-xs mb-2 line-clamp-1">
                      {reel.description}
                    </p>
                  )}

                  {/* Game badge with icon */}
                  {reel.game && (
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className="w-4 h-4 rounded overflow-hidden bg-primary/20">
                        {reel.game.imageUrl ? (
                          <img src={reel.game.imageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-primary/40" />
                        )}
                      </div>
                      <span className="text-[#00E676] text-xs font-medium">{reel.game.name}</span>
                    </div>
                  )}

                  {/* Audio/Original info */}
                  <div className="flex items-center gap-1.5 text-white/70 text-xs">
                    <span>♪</span>
                    <span>Original audio • {reel.user.displayName || reel.user.username}</span>
                  </div>
                </div>

                {/* Right side - Engagement buttons (TikTok-style) - Always show for consistent layout */}
                <div className={cn(
                  "absolute bottom-8 md:bottom-12 right-2 md:right-3 flex flex-col items-center gap-4",
                  index === currentIndex ? "pointer-events-auto" : "pointer-events-none opacity-70"
                )}>
                    {/* Fire/Reactions */}
                    <div className="flex flex-col items-center">
                      <FireButton
                        contentId={reel.id}
                        contentType="clip"
                        contentOwnerId={reel.userId}
                        initialCount={parseInt(reel._count?.reactions?.toString() || '0')}
                        size="lg"
                        showCount={true}
                        variant="vertical"
                      />
                    </div>

                    {/* Like */}
                    <div className="flex flex-col items-center">
                      <LikeButton
                        contentId={reel.id}
                        contentType="clip"
                        contentOwnerId={reel.userId}
                        initialLiked={false}
                        initialCount={parseInt(reel._count?.likes?.toString() || '0')}
                        size="lg"
                        showCount={true}
                        variant="vertical"
                      />
                    </div>

                    {/* Comments */}
                    <div className="flex flex-col items-center">
                      <button
                        className="w-11 h-11 rounded-full bg-transparent flex items-center justify-center text-white hover:bg-white/10 transition-colors"
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
                      <span className="text-white text-xs mt-0.5">
                        {reel._count?.comments || 0}
                      </span>
                    </div>

                    {/* Share */}
                    <div className="flex flex-col items-center">
                      <button
                        className="w-11 h-11 rounded-full bg-transparent flex items-center justify-center text-white hover:bg-white/10 transition-colors"
                        onClick={() => setShowShare(true)}
                      >
                        <Share2 className="h-6 w-6" />
                      </button>
                      <span className="text-white text-xs mt-0.5">Share</span>
                    </div>

                    {/* More options (Report) */}
                    <ReportDialog
                      contentType="clip"
                      contentId={reel.id}
                      contentTitle={reel.title}
                      contentAuthor={reel.user.username}
                      trigger={
                        <button className="w-11 h-11 rounded-full bg-transparent flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors">
                          <MoreVertical className="h-5 w-5" />
                        </button>
                      }
                    />
                  </div>
              </div>
            </div>
          </div>
        ))}
      </div>

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
        isOpen={isJoinDialogOpen}
        onClose={closeDialog}
        actionType={actionType}
      />
    </div>
  );
}
