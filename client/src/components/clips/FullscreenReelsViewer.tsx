
import { useState, useEffect, useCallback, useRef } from "react";
import { ClipWithUser } from "@shared/schema";
import VideoPlayer from "@/components/shared/VideoPlayer";
import { MessageCircle, MoreVertical, Play, Pause, Volume2, VolumeX, Trash2, X, ChevronDown } from "lucide-react";
import ShareLaunchIcon from "@/components/ui/ShareIcon";
import { Button } from "@/components/ui/button";
import { CustomAvatar } from "@/components/ui/custom-avatar";
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const isAcceptingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const { isOpen: isJoinDialogOpen, actionType, openDialog, closeDialog } = useJoinDialog();

  const { showAd, isPro, onReelChange, onAdFinished } = useReelAdTracker();

  const currentReel = reels[currentIndex];

  // Follow status for current user
  const { data: followStatus } = useQuery<{ following: boolean; requested: boolean }>({
    queryKey: [`/api/users/${currentReel?.user?.username}/follow-status`],
    enabled: !!currentReel?.user?.username && !!user,
  });

  const isFollowing = followStatus?.following || followStatus?.requested || false;

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
      toast({ title: "Error", description: error.message || "Failed to update follow status", variant: "destructive" });
    },
  });

  const handleFollow = () => {
    if (!user) {
      toast({ title: "Authentication Required", description: "Please log in to follow users", variant: "destructive" });
      return;
    }
    if (user.id === currentReel.user.id) return;
    followMutation.mutate();
  };

  const deleteReelMutation = useMutation({
    mutationFn: async (reelId: number) => {
      await apiRequest("DELETE", `/api/clips/${reelId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reels/latest'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reels/trending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reels'] });
      queryClient.invalidateQueries({ queryKey: ['/api/clips/reels/trending'] });
      if (currentReel?.user?.username) {
        queryClient.invalidateQueries({ queryKey: [`/api/users/${currentReel.user.username}/clips`] });
        queryClient.invalidateQueries({ queryKey: [`/api/users/${currentReel.user.username}`] });
      }
      toast({ description: "Reel deleted successfully.", variant: "gamefolioSuccess" as any });
      onClose();
    },
    onError: (error: any) => {
      toast({ title: "Delete failed", description: error.message || "Failed to delete reel.", variant: "destructive" });
    },
  });

  // Scroll to initial reel on mount
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = initialIndex * containerRef.current.clientHeight;
    }
  }, []);

  // Track current reel based on scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const newIndex = Math.round(container.scrollTop / container.clientHeight);
      if (newIndex !== currentIndex && newIndex >= 0 && newIndex < reels.length) {
        setCurrentIndex(newIndex);
        if (!isPro) onReelChange(newIndex);
      }
    };
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [currentIndex, reels.length, isPro, onReelChange]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const container = containerRef.current;
    if (!container) return;
    const h = container.clientHeight;
    if (e.key === 'ArrowUp' && currentIndex > 0) {
      e.preventDefault();
      container.scrollTo({ top: (currentIndex - 1) * h, behavior: 'smooth' });
    } else if (e.key === 'ArrowDown' && currentIndex < reels.length - 1) {
      e.preventDefault();
      container.scrollTo({ top: (currentIndex + 1) * h, behavior: 'smooth' });
    } else if (e.key === 'Escape') {
      if (showComments) setShowComments(false);
      else onClose();
    }
  }, [currentIndex, reels.length, onClose, showComments]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Age restriction check
  useEffect(() => {
    if (currentReel && currentReel.ageRestricted && !ageRestrictionAccepted[currentReel.id]) {
      setShowAgeRestrictionDialog(true);
    }
  }, [currentReel, ageRestrictionAccepted]);

  useEffect(() => {
    if (currentReel && ageRestrictionAccepted[currentReel.id] && showAgeRestrictionDialog) {
      const t = setTimeout(() => {
        setShowAgeRestrictionDialog(false);
        setTimeout(() => { isAcceptingRef.current = false; }, 100);
      }, 100);
      return () => clearTimeout(t);
    }
  }, [ageRestrictionAccepted, showAgeRestrictionDialog, currentReel]);

  // Reset on reel change
  useEffect(() => {
    setShowComments(false);
    setShowShare(false);
    setIsPaused(false);
  }, [currentIndex]);

  if (!currentReel) return null;

  return (
    <div className="fixed inset-0 bg-black z-[60] flex flex-col">

      {/* ── Ad overlay ── */}
      {showAd && (
        <div className="fixed inset-0 bg-black z-[70] flex items-center justify-center">
          <VideoAdPlayer
            onAdComplete={onAdFinished}
            onAdError={onAdFinished}
            onAdSkipped={onAdFinished}
            skipAfterSeconds={5}
            className="w-full h-full max-w-2xl"
          />
        </div>
      )}

      {/* ── Video area — shrinks to 38% when comments open ── */}
      <div
        className="relative flex-shrink-0 overflow-hidden transition-[height] duration-300 ease-in-out"
        style={{ height: showComments ? '38%' : '100%', flex: showComments ? 'none' : '1' }}
      >
        {/* Scrollable video stack */}
        <div
          ref={containerRef}
          className="absolute inset-0 overflow-y-scroll overflow-x-hidden snap-y snap-mandatory [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y', overscrollBehavior: 'contain', pointerEvents: showComments ? 'none' : 'auto' }}
        >
          {reels.map((reel, index) => (
            <div
              key={reel.id}
              className="snap-start snap-always h-full w-full relative"
              style={{ scrollSnapStop: 'always' }}
            >
              {/* Video */}
              <div className="absolute inset-0 pointer-events-none">
                {(!reel.ageRestricted || ageRestrictionAccepted[reel.id]) ? (
                  <VideoPlayer
                    videoUrl={reel.videoUrl}
                    thumbnailUrl={reel.thumbnailUrl || undefined}
                    autoPlay={index === currentIndex}
                    className="w-full h-full"
                    objectFit="cover"
                    clipId={reel.id}
                    disableAspectRatio={true}
                    hideControls={true}
                    externalPaused={index === currentIndex ? isPaused : true}
                    externalMuted={index === currentIndex ? isMuted : undefined}
                    onPlayingChange={index === currentIndex ? (playing) => setIsPaused(!playing) : undefined}
                    onMutedChange={index === currentIndex ? (muted) => setIsMuted(muted) : undefined}
                    onEnded={() => {
                      if (index < reels.length - 1 && containerRef.current) {
                        const h = containerRef.current.clientHeight;
                        containerRef.current.scrollTo({ top: (index + 1) * h, behavior: 'smooth' });
                      }
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-black/80">
                    <p className="text-white text-lg font-semibold">Age-Restricted Content</p>
                  </div>
                )}
              </div>

              {/* Tap zone for play/pause — only for current reel */}
              {index === currentIndex && (
                <div
                  className="absolute inset-0 z-[2]"
                  style={{ pointerEvents: 'auto' }}
                  onClick={() => setIsPaused(p => !p)}
                />
              )}
            </div>
          ))}
        </div>

        {/* Top header (absolute within video area) */}
        <div className="absolute top-0 left-0 right-0 z-[3] flex items-center justify-between p-3 md:p-4" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost" size="sm"
              className="text-white bg-black/60 backdrop-blur-sm hover:bg-black/80 w-10 h-10 p-0 rounded-full"
              onClick={() => setIsPaused(p => !p)}
            >
              {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
            </Button>
            <Button
              variant="ghost" size="sm"
              className="text-white bg-black/60 backdrop-blur-sm hover:bg-black/80 w-10 h-10 p-0 rounded-full"
              onClick={() => setIsMuted(m => !m)}
            >
              {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {user && currentReel && user.id === currentReel.userId && (
              <Button
                variant="ghost" size="sm"
                className="text-white bg-black/60 backdrop-blur-sm hover:bg-red-600/80 w-10 h-10 p-0 rounded-full"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={deleteReelMutation.isPending}
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            )}
            <Button
              variant="ghost" size="sm"
              className="text-white bg-black/60 backdrop-blur-sm hover:bg-black/80 w-10 h-10 p-0 rounded-full"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Engagement + user info overlay */}
        {currentReel && (
          <div className="absolute inset-0 z-[3] pointer-events-none">

            {/* Right side engagement buttons */}
            <div
              className="absolute right-3 md:right-4 flex flex-col items-center gap-5 pointer-events-auto"
              style={{ bottom: showComments ? '0.75rem' : 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}
            >
              <FireButton
                contentId={currentReel.id}
                contentType="clip"
                contentOwnerId={currentReel.userId}
                initialCount={parseInt(currentReel._count?.reactions?.toString() || '0')}
                size="lg"
                showCount={true}
                variant="vertical"
              />
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
              <div className="flex flex-col items-center">
                <button
                  className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white active:bg-black/70 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!user) { openDialog('comment'); }
                    else { setShowComments(true); setIsPaused(true); }
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <MessageCircle className="h-7 w-7" />
                </button>
                <span className="text-white text-xs mt-1 font-medium drop-shadow-lg">
                  {currentReel._count?.comments || 0}
                </span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white active:bg-black/70 transition-colors">
                  <ShareLaunchIcon
                    size={24}
                    className="text-white"
                    onClick={(e) => { e.stopPropagation(); setShowShare(true); }}
                  />
                </div>
                <span className="text-white text-xs mt-1 font-medium drop-shadow-lg">Share</span>
              </div>
            </div>

            {/* Bottom left - user info (hidden when comments open) */}
            {!showComments && (
              <div
                className="absolute left-3 md:left-4 right-20 md:right-24 pointer-events-auto"
                style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Link href={`/profile/${currentReel.user.username}`} onClick={onClose} className="flex-shrink-0 hover:opacity-80 transition-opacity">
                    <CustomAvatar user={currentReel.user as any} size="sm" showBorder={true} />
                  </Link>
                  <Link href={`/profile/${currentReel.user.username}`} onClick={onClose}>
                    <span className="text-white font-semibold text-sm drop-shadow-lg">@{currentReel.user.username}</span>
                  </Link>
                  {user && user.id !== currentReel.user.id && (
                    <Button
                      onClick={handleFollow}
                      disabled={followMutation.isPending}
                      size="sm"
                      className={cn(
                        "h-7 px-3 text-xs font-semibold rounded-md ml-1",
                        isFollowing
                          ? "bg-transparent border border-white/50 text-white hover:bg-white/10"
                          : "bg-[#B7FF1A] text-black hover:bg-[#A2F000]"
                      )}
                    >
                      {isFollowing ? "Following" : "Follow"}
                    </Button>
                  )}
                </div>
                <h3 className="text-white font-semibold text-base mb-1 leading-tight line-clamp-1 drop-shadow-lg">
                  {currentReel.title}
                </h3>
                {currentReel.description && (
                  <p className="text-white/90 text-sm mb-1.5 line-clamp-1 drop-shadow-md">{currentReel.description}</p>
                )}
                {currentReel.game && (
                  <div className="mb-1.5">
                    <Link
                      href={`/games/${currentReel.game.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`}
                      onClick={onClose}
                      className="text-[#B7FF1A] text-sm font-medium drop-shadow-lg hover:underline"
                    >
                      {currentReel.game.name}
                    </Link>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-white/80 text-xs drop-shadow-md">
                  <span>Original audio</span>
                  <span>•</span>
                  <span>{currentReel.user.displayName || currentReel.user.username}</span>
                </div>
              </div>
            )}

            {/* Report button (hidden when comments open) */}
            {!showComments && (
              <div
                className="absolute right-3 md:right-4 pointer-events-auto"
                style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
              >
                <ReportDialog
                  contentType="clip"
                  contentId={currentReel.id}
                  contentTitle={currentReel.title}
                  contentAuthor={currentReel.user.username}
                  trigger={
                    <button className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  }
                />
              </div>
            )}
          </div>
        )}

        {/* Desktop hint */}
        {!showComments && (
          <p className="absolute bottom-3 left-1/2 -translate-x-1/2 text-white/30 text-xs z-[3] hidden md:block">
            Scroll or arrow keys to navigate · ESC to close
          </p>
        )}
      </div>

      {/* ── Comments panel — flex-1, pushes video up ── */}
      {showComments && currentReel && (
        <div
          className="flex-1 flex flex-col overflow-hidden"
          style={{ background: '#0F1923', borderRadius: '20px 20px 0 0', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
            <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.18)' }} />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <h3 className="text-white font-bold text-base">
              Comments{' '}
              <span className="text-white/45 font-normal text-sm">{currentReel._count?.comments || 0}</span>
            </h3>
            <button
              onClick={() => { setShowComments(false); setIsPaused(false); }}
              className="w-8 h-8 flex items-center justify-center rounded-full"
              style={{ background: 'rgba(255,255,255,0.08)' }}
            >
              <ChevronDown className="h-5 w-5 text-white/70" />
            </button>
          </div>

          {/* Scrollable comments */}
          <div className="flex-1 overflow-y-auto">
            <CommentSection
              clipId={currentReel.id}
              currentUserId={user?.id}
            />
          </div>
        </div>
      )}

      {/* ── Share overlay ── */}
      {showShare && (
        <div className="fixed inset-0 z-[4] bg-black/70 flex items-end justify-center p-0" onClick={() => setShowShare(false)}>
          <div
            className="bg-background rounded-t-2xl p-5 w-full max-w-lg"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.25rem)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="font-semibold text-base">Share Reel</span>
              <button onClick={() => setShowShare(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <ShareMenu clipId={currentReel.id} clipTitle={currentReel.title} />
          </div>
        </div>
      )}

      {/* Age Restriction Dialog */}
      {currentReel && (
        <AgeRestrictionDialog
          isOpen={showAgeRestrictionDialog}
          onAccept={() => {
            isAcceptingRef.current = true;
            setAgeRestrictionAccepted(prev => ({ ...prev, [currentReel.id]: true }));
          }}
          onDecline={() => {
            if (!isAcceptingRef.current) { setShowAgeRestrictionDialog(false); onClose(); }
          }}
          contentType="reel"
        />
      )}

      <JoinGamefolioDialog
        open={isJoinDialogOpen}
        onOpenChange={(open) => !open && closeDialog()}
        actionType={actionType}
      />

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete reel?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{currentReel?.title}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteReelMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => deleteReelMutation.mutate(currentReel.id)}
              disabled={deleteReelMutation.isPending}
            >
              {deleteReelMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
