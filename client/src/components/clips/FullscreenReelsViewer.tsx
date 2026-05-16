
import { useState, useEffect, useCallback, useRef } from "react";
import { ClipWithUser } from "@shared/schema";
import VideoPlayer from "@/components/shared/VideoPlayer";
import { MessageCircle, Trash2, ChevronDown, ChevronLeft, BarChart2, Gamepad2, Music } from "lucide-react";
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
  const [isPlaying, setIsPlaying] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 1024);
  const isAcceptingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
      queryClient.invalidateQueries({ queryKey: ['/api/clips/latest'] });
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
    setIsPlaying(true);
  }, [currentIndex]);

  if (!currentReel) return null;

  return (
    <div
      className="fixed inset-0 bg-black z-[60] flex flex-col lg:flex-row"
      style={{ paddingBottom: 'calc(64px + env(safe-area-inset-bottom, 0px))' }}
    >

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
        ref={videoAreaRef}
        className="relative flex-shrink-0 overflow-hidden transition-[height,width] duration-300 ease-in-out lg:flex-shrink lg:h-full"
        style={{ height: showComments ? '38%' : '100%', flex: showComments ? 'none' : '1' }}
        onClick={() => { if (!showComments) setIsPlaying(p => !p); }}
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
                    autoPlay={index === currentIndex && isPlaying}
                    className="w-full h-full"
                    objectFit="contain"
                    clipId={reel.id}
                    disableAspectRatio={true}
                    hideControls={true}
                    videoStyle={{ pointerEvents: 'none' }}
                    externalPaused={!(index === currentIndex && isPlaying)}
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

            </div>
          ))}
        </div>

        {/* Top header (absolute within video area) */}
        {!showComments && (
          <div
            className="absolute top-0 left-0 right-0 z-[3] flex items-center justify-between px-4 pb-4 bg-gradient-to-b from-black/60 to-transparent"
            style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 16px)' }}
            onClick={e => e.stopPropagation()}
          >
            <Button
              variant="ghost" size="sm"
              className="text-white hover:bg-white/20"
              onClick={(e) => { e.stopPropagation(); onClose(); }}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            {user && currentReel && user.id === currentReel.userId && (
              <Button
                variant="ghost" size="sm"
                className="text-white hover:bg-red-600/80 w-10 h-10 p-0 rounded-full"
                onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }}
                disabled={deleteReelMutation.isPending}
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            )}
          </div>
        )}

        {/* Engagement + user info overlay */}
        {currentReel && (
          <div className="absolute inset-0 z-[3] pointer-events-none">

            {/* Right side engagement buttons — hidden when comments open, hidden on desktop (moved to right panel) */}
            {!showComments && !isDesktop && (
              <div
                className="absolute right-3 flex flex-col items-center gap-3 pointer-events-auto"
                style={{ bottom: 24 }}
                onClick={e => e.stopPropagation()}
              >
                {/* Views */}
                <div className="flex flex-col items-center gap-0.5">
                  <BarChart2 className="h-6 w-6 text-white drop-shadow" />
                  <span className="text-white text-[10px] font-semibold drop-shadow">
                    {(() => {
                      const v = currentReel.views || 0;
                      if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
                      if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
                      return v.toString();
                    })()}
                  </span>
                </div>

                <LikeButton
                  contentId={currentReel.id}
                  contentType="clip"
                  contentOwnerId={currentReel.userId}
                  initialLiked={false}
                  initialCount={parseInt(currentReel._count?.likes?.toString() || '0')}
                  size="sm"
                  showCount={true}
                  variant="vertical"
                />
                <FireButton
                  contentId={currentReel.id}
                  contentType="clip"
                  contentOwnerId={currentReel.userId}
                  initialCount={parseInt(currentReel._count?.reactions?.toString() || '0')}
                  size="sm"
                  showCount={true}
                  variant="vertical"
                  clipRef={videoAreaRef}
                />
                <button
                  className="flex flex-col items-center gap-0.5"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!user) { openDialog('comment'); }
                    else { setShowComments(true); setIsPlaying(false); }
                  }}
                >
                  <MessageCircle className="h-6 w-6 text-white drop-shadow" />
                  <span className="text-white text-[10px] font-semibold drop-shadow">
                    {currentReel._count?.comments || 0}
                  </span>
                </button>
                <ShareLaunchIcon
                  size={24}
                  className="text-white drop-shadow"
                  onClick={(e) => { e.stopPropagation(); setShowShare(true); }}
                />
              </div>
            )}

            {/* Bottom gradient overlay — hidden when comments open, hidden on desktop (moved to right panel) */}
            {!showComments && !isDesktop && (
              <div className="absolute bottom-0 left-0 right-0 z-[3] px-4 pb-8 pt-20 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none">
                <div className="pr-14">
                  {/* User row */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <Link
                      href={`/profile/${currentReel.user.username}`}
                      onClick={(e) => { e.stopPropagation(); onClose(); }}
                      className="flex items-center gap-1.5 no-underline flex-shrink-0 pointer-events-auto"
                    >
                      <CustomAvatar user={currentReel.user as any} size="sm" showBorder={true} />
                      <span className="text-white font-bold text-[13px] drop-shadow leading-tight">
                        @{currentReel.user.username}
                      </span>
                    </Link>
                    {user && user.id !== currentReel.user.id && !isFollowing && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleFollow(); }}
                        disabled={followMutation.isPending}
                        className="text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 transition-all pointer-events-auto"
                        style={{ background: '#B7FF1A', color: '#000', border: '1px solid transparent' }}
                      >
                        {followMutation.isPending ? '…' : 'Follow'}
                      </button>
                    )}
                  </div>

                  {/* Title */}
                  <p className="text-white font-bold text-[13px] drop-shadow mb-0.5 leading-snug line-clamp-1">
                    {currentReel.title}
                  </p>

                  {/* Description */}
                  {currentReel.description && (
                    <p className="text-white/75 text-[11px] drop-shadow leading-snug line-clamp-2 mb-1">
                      {currentReel.description}
                    </p>
                  )}

                  {/* Game */}
                  {currentReel.game?.name && (
                    <div className="flex items-center gap-1 mb-0.5">
                      <Gamepad2 className="h-3 w-3 flex-shrink-0" style={{ color: '#B7FF1A' }} />
                      <Link
                        href={`/games/${currentReel.game.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`}
                        onClick={onClose}
                        className="pointer-events-auto"
                      >
                        <span className="text-[11px] font-semibold" style={{ color: '#B7FF1A' }}>
                          {currentReel.game.name}
                        </span>
                      </Link>
                    </div>
                  )}

                  {/* Original audio */}
                  <div className="flex items-center gap-1">
                    <Music className="h-2.5 w-2.5 text-white/60 flex-shrink-0" />
                    <span className="text-white/60 text-[11px] truncate">
                      Original audio · {currentReel.user.displayName || currentReel.user.username}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Desktop right panel — shown only on desktop ── */}
      {currentReel && isDesktop && (
        <div
          className="flex flex-col justify-between w-[340px] flex-shrink-0 h-full border-l border-white/10"
          style={{ background: '#0a0f14', paddingBottom: 'calc(64px + env(safe-area-inset-bottom, 0px))' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Profile + info */}
          <div className="flex flex-col gap-5 p-6 overflow-y-auto flex-1">
            {/* Avatar + username + follow */}
            <div className="flex items-center gap-3">
              <Link
                href={`/profile/${currentReel.user.username}`}
                onClick={onClose}
                className="flex-shrink-0"
              >
                <CustomAvatar user={currentReel.user as any} size="lg" showBorder={true} />
              </Link>
              <div className="flex-1 min-w-0">
                <Link
                  href={`/profile/${currentReel.user.username}`}
                  onClick={onClose}
                  className="no-underline"
                >
                  <p className="text-white font-bold text-sm leading-tight truncate">
                    {currentReel.user.displayName || currentReel.user.username}
                  </p>
                  <p className="text-white/50 text-xs truncate">@{currentReel.user.username}</p>
                </Link>
              </div>
              {user && user.id !== currentReel.user.id && !isFollowing && (
                <button
                  onClick={handleFollow}
                  disabled={followMutation.isPending}
                  className="text-xs font-bold px-3 py-1.5 rounded-full flex-shrink-0 transition-all"
                  style={{ background: '#B7FF1A', color: '#000' }}
                >
                  {followMutation.isPending ? '…' : 'Follow'}
                </button>
              )}
            </div>

            {/* Divider */}
            <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.07)' }} />

            {/* Title */}
            <div>
              <p className="text-white font-bold text-base leading-snug mb-2">
                {currentReel.title}
              </p>
              {currentReel.description && (
                <p className="text-white/60 text-sm leading-relaxed">
                  {currentReel.description}
                </p>
              )}
            </div>

            {/* Game */}
            {currentReel.game?.name && (
              <div className="flex items-center gap-1.5">
                <Gamepad2 className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#B7FF1A' }} />
                <Link
                  href={`/games/${currentReel.game.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`}
                  onClick={onClose}
                >
                  <span className="text-sm font-semibold" style={{ color: '#B7FF1A' }}>
                    {currentReel.game.name}
                  </span>
                </Link>
              </div>
            )}

            {/* Original audio */}
            <div className="flex items-center gap-1.5">
              <Music className="h-3.5 w-3.5 text-white/40 flex-shrink-0" />
              <span className="text-white/40 text-xs truncate">
                Original audio · {currentReel.user.displayName || currentReel.user.username}
              </span>
            </div>
          </div>

          {/* Engagement buttons at bottom */}
          <div className="flex items-center justify-around px-6 py-5 border-t border-white/10">
            <div className="flex flex-col items-center gap-1">
              <BarChart2 className="h-6 w-6 text-white/60" />
              <span className="text-white/60 text-xs font-semibold">
                {(() => {
                  const v = currentReel.views || 0;
                  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
                  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
                  return v.toString();
                })()}
              </span>
            </div>
            <LikeButton
              contentId={currentReel.id}
              contentType="clip"
              contentOwnerId={currentReel.userId}
              initialLiked={false}
              initialCount={parseInt(currentReel._count?.likes?.toString() || '0')}
              size="sm"
              showCount={true}
              variant="vertical"
            />
            <FireButton
              contentId={currentReel.id}
              contentType="clip"
              contentOwnerId={currentReel.userId}
              initialCount={parseInt(currentReel._count?.reactions?.toString() || '0')}
              size="sm"
              showCount={true}
              variant="vertical"
              clipRef={videoAreaRef}
            />
            <button
              className="flex flex-col items-center gap-1"
              onClick={() => {
                if (!user) { openDialog('comment'); }
                else { setShowComments(true); setIsPlaying(false); }
              }}
            >
              <MessageCircle className="h-6 w-6 text-white/60" />
              <span className="text-white/60 text-xs font-semibold">{currentReel._count?.comments || 0}</span>
            </button>
            <ShareLaunchIcon
              size={24}
              className="text-white/60"
              onClick={() => setShowShare(true)}
            />
          </div>
        </div>
      )}

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
              onClick={() => { setShowComments(false); setIsPlaying(true); }}
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
