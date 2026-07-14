import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ClipWithUser } from "@shared/schema";
import VideoPlayer from "@/components/shared/VideoPlayer";
import { ArrowLeft, Heart, MessageCircle, User, Play, Pause, Flag, BarChart2, Gamepad2, X, MoreHorizontal } from "lucide-react";
import { TrendingClipMenu } from "@/components/clips/TrendingClipMenu";
import ShareLaunchIcon from "@/components/ui/ShareIcon";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { LikeButton } from "@/components/engagement/LikeButton";
import { FireButton } from "@/components/engagement/FireButton";
import CommentSection from "@/components/clips/CommentSection";
import { ClipShareDialog } from "@/components/clip/ClipShareDialog";
import { useAuth } from "@/hooks/use-auth";
import { useAuthModal } from "@/hooks/use-auth-modal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { ReportDialog } from "@/components/content/ReportDialog";
import { LazyImage } from "@/components/ui/lazy-image";
import { ProfileHoverCard } from "@/components/ui/ProfileHoverCard";
import { CustomAvatar } from "@/components/ui/custom-avatar";
import { useSignedUrl } from "@/hooks/use-signed-url";
import { useBlockedUsers } from "@/hooks/use-blocked-users";

interface ScreenshotWithUser {
  id: number;
  title: string;
  description?: string;
  imageUrl: string;
  thumbnailUrl?: string;
  tags?: string[];
  views: number;
  createdAt: string;
  user: {
    id: number;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  game?: {
    id: number;
    name: string;
    imageUrl?: string;
  };
}

type ContentItem = ClipWithUser | ScreenshotWithUser;

interface MobileTrendingViewerProps {
  content: ContentItem[];
  initialIndex?: number;
  onClose: () => void;
  hideCloseButton?: boolean;
  embedded?: boolean;
  onCommentsVisibilityChange?: (open: boolean) => void;
}

// ── Per-row author avatar — own signed-URL hook ──────────────────────────
function AuthorAvatar({ avatarUrl, displayName }: { avatarUrl?: string | null; displayName: string }) {
  const { signedUrl } = useSignedUrl(avatarUrl ?? null);
  return (
    <img
      src={signedUrl || avatarUrl || '/uploaded_assets/gamefolio-logo-green.png'}
      alt={displayName}
      className="w-full h-full object-cover"
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).src = '/uploaded_assets/gamefolio-logo-green.png';
      }}
    />
  );
}

// ── Helper: slugify a game name to match explore-page navigateToGame ─────
function gameNameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ── Per-screenshot scroll item — own signed-URL hook ─────────────────────
function ScreenshotScrollItem({ item }: { item: ScreenshotWithUser }) {
  const { signedUrl } = useSignedUrl(item.imageUrl);
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black">
      {signedUrl ? (
        <img
          src={signedUrl}
          alt={item.title}
          className="w-full h-full object-contain"
          style={{ maxHeight: '100%', maxWidth: '100%' }}
        />
      ) : (
        <div className="w-full h-full bg-black flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#B7FF1A] border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

export function MobileTrendingViewer({ content: rawContent, initialIndex = 0, onClose, hideCloseButton = false, embedded = false, onCommentsVisibilityChange }: MobileTrendingViewerProps) {
  const { blockedUserIds } = useBlockedUsers();

  // Drop blocked authors' content from the viewer. Blocking invalidates
  // /api/users/blocked, so this recomputes instantly — the blocked clip is
  // removed and the scroll-snap advances to the next one.
  const content = rawContent.filter((item: any) => !blockedUserIds.has(item.userId));

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [showComments, setShowComments] = useState(false);
  const [commentsExpanded, setCommentsExpanded] = useState(false);

  // Swipe-to-dismiss state for the comments bottom sheet
  const [sheetY, setSheetY] = useState(0);
  const sheetDragStartY = useRef(0);
  const sheetIsDragging = useRef(false);

  // Track software keyboard height via visualViewport
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const kh = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardHeight(kh);
    };
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => { vv.removeEventListener('resize', update); vv.removeEventListener('scroll', update); };
  }, []);

  useEffect(() => {
    onCommentsVisibilityChange?.(showComments);
  }, [showComments]);

  const [showShare, setShowShare] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showFullDescription, setShowFullDescription] = useState(false);
  // Brief play/pause icon flash on tap (TikTok-style)
  const [playFlash, setPlayFlash] = useState<'play' | 'pause' | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Scroll-snap refs
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track index without re-renders during scroll
  const committedIndexRef = useRef(initialIndex);

  // Scroll to initialIndex on mount so the clicked reel is shown first
  useEffect(() => {
    if (!scrollContainerRef.current || initialIndex <= 0) return;
    scrollContainerRef.current.scrollTop =
      initialIndex * scrollContainerRef.current.clientHeight;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset overlay states when switching between content items
  useEffect(() => {
    setShowComments(false);
    setCommentsExpanded(false);
    setShowShare(false);
    setIsPlaying(true);
    setShowFullDescription(false);
    setPlayFlash(null);
  }, [currentIndex]);

  // Prevent body scroll when mobile viewer is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { openModal } = useAuthModal();

  // Declare currentItem here so it's available to hooks below
  const currentItem = content[currentIndex];

  // ── Signed URL for the current item's author avatar ────────────────────
  const { signedUrl: signedAvatarUrl } = useSignedUrl(currentItem?.user?.avatarUrl ?? null);

  // ── Signed URL for current screenshot image (used by download in menu) ─
  const currentScreenshotImageUrl = currentItem && !('videoUrl' in currentItem) ? (currentItem as ScreenshotWithUser).imageUrl : null;
  const { signedUrl: signedCurrentImageUrl } = useSignedUrl(currentScreenshotImageUrl);

  // ── Follow state for current content item's author ─────────────────────
  const currentAuthorUsername = currentItem?.user?.username;
  const currentAuthorId = currentItem?.user?.id;
  const isSelf = user && currentAuthorId && user.id === currentAuthorId;

  const { data: followStatusData } = useQuery({
    queryKey: ['/api/users/follow-status', currentAuthorUsername],
    queryFn: async () => {
      const res = await fetch(`/api/users/${currentAuthorUsername}/follow-status`, { credentials: 'include' });
      if (!res.ok) return { isFollowing: false };
      return res.json();
    },
    enabled: !!user && !!currentAuthorUsername && !isSelf,
    staleTime: 30000,
  });

  const isFollowing = followStatusData?.following ?? false;

  const followMutation = useMutation({
    mutationFn: async () => {
      const method = isFollowing ? 'DELETE' : 'POST';
      return apiRequest(method, `/api/users/${currentAuthorUsername}/follow`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/follow-status', currentAuthorUsername] });
    },
    onError: () => {},
  });

  const handleFollowPress = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { openModal('login'); return; }
    if (isSelf) return;
    followMutation.mutate();
  };

  // ── Scroll-snap navigation ──────────────────────────────────────────────
  // Debounced scroll handler: updates currentIndex after scroll settles
  // NOTE: All hooks must be declared before any early return.
  const handleScrollEvent = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    if (scrollTimer.current) clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => {
      const newIndex = Math.round(container.scrollTop / container.clientHeight);
      if (newIndex !== committedIndexRef.current && newIndex >= 0 && newIndex < content.length) {
        committedIndexRef.current = newIndex;
        setCurrentIndex(newIndex);
      }
    }, 80);
  }, [content.length]);

  // Programmatic navigation (keyboard) — scroll the container, state updates via scroll handler
  const scrollToIndex = useCallback((index: number) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const clamped = Math.max(0, Math.min(index, content.length - 1));
    committedIndexRef.current = clamped;
    setCurrentIndex(clamped);
    container.scrollTo({ top: clamped * container.clientHeight, behavior: 'smooth' });
  }, [content.length]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        if (currentIndex > 0) scrollToIndex(currentIndex - 1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (currentIndex < content.length - 1) scrollToIndex(currentIndex + 1);
        break;
      case 'Escape':
        onClose();
        break;
      case ' ':
        e.preventDefault();
        if (isVideoContent(currentItem)) {
          setIsPlaying(prev => !prev);
        }
        break;
    }
  }, [currentIndex, content.length, onClose, currentItem, scrollToIndex]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
    };
  }, [handleKeyDown]);

  // Tap the video area to toggle play/pause with a brief icon flash
  const handleVideoTap = useCallback(() => {
    if (!isVideoContent(currentItem)) return;
    setIsPlaying(prev => {
      const next = !prev;
      setPlayFlash(next ? 'play' : 'pause');
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      flashTimerRef.current = setTimeout(() => setPlayFlash(null), 650);
      return next;
    });
  }, [currentItem]);

  // Type guard to check if content is video (clip/reel) or screenshot
  const isVideoContent = (item: ContentItem): item is ClipWithUser => {
    return 'videoUrl' in item;
  };

  // Early return if no content or invalid index — placed after all hooks.
  if (!currentItem || currentIndex < 0 || currentIndex >= content.length) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <p className="text-lg">No content available</p>
          <Button
            onClick={onClose}
            variant="outline"
            className="mt-4 text-white border-white hover:bg-white/20"
          >
            Close
          </Button>
        </div>
      </div>
    );
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getContentStats = () => {
    const views = currentItem.views || 0;
    const likes = parseInt((currentItem as any)._count?.likes?.toString() || '0');
    const comments = parseInt((currentItem as any)._count?.comments?.toString() || '0');
    return { views, likes, comments };
  };

  const stats = getContentStats();

  return (
    <div
      ref={containerRef}
      className={embedded ? "relative w-full h-full overflow-hidden" : "fixed top-0 left-0 right-0 z-[9999] overflow-hidden"}
      style={{ background: '#0B1218', bottom: embedded ? undefined : 'var(--mobile-nav-height, 4rem)' }}
      data-testid="mobile-trending-viewer"
    >
      {/* ── Scroll-snap content stack ─────────────────────────────────────── */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScrollEvent}
        style={{
          position: 'absolute',
          inset: 0,
          overflowY: 'scroll',
          scrollSnapType: 'y mandatory',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {content.map((item, index) => (
          <div
            key={item.id}
            ref={el => { itemRefs.current[index] = el; }}
            className="relative w-full bg-black"
            style={{
              height: embedded ? '100%' : 'calc(100dvh - var(--mobile-nav-height, 4rem))',
              flexShrink: 0,
              scrollSnapAlign: 'start',
              scrollSnapStop: 'always',
            }}
            onClick={handleVideoTap}
          >
            {/* Only render video/image for current + adjacent items (performance) */}
            {Math.abs(index - currentIndex) <= 1 && (
              isVideoContent(item) ? (
                <div
                  className="absolute inset-0 flex items-center justify-center bg-black"
                  style={item.videoType !== 'reel' ? { paddingTop: 'calc(env(safe-area-inset-top, 0px) + 52px)' } : undefined}
                >
                  <VideoPlayer
                    key={item.id}
                    videoUrl={item.videoUrl || ''}
                    thumbnailUrl={item.thumbnailUrl || undefined}
                    autoPlay={isPlaying && index === currentIndex}
                    externalPaused={!isPlaying || index !== currentIndex}
                    hideControls={true}
                    className="w-full h-full"
                    clipId={item.id}
                    objectFit="cover"
                    disableAspectRatio={true}
                    data-testid={`video-player-${item.id}`}
                  />
                </div>
              ) : (
                <ScreenshotScrollItem item={item as ScreenshotWithUser} />
              )
            )}
            {!showComments && (
              <div
                className="absolute left-0 right-0 z-10 px-4 pt-20 bg-gradient-to-t from-black/90 via-black/40 to-transparent"
                style={{
                  bottom: '0',
                  paddingBottom: '20px',
                  pointerEvents: 'none',
                }}
                onClick={e => e.stopPropagation()}
              >
                <div className="pr-14" style={{ pointerEvents: 'auto' }}>
                  <div className="mb-1.5">
                    {/* Avatar — sits above the username row */}
                    <Link
                      href={`/profile/${item.user.username}`}
                      className="flex-shrink-0 no-underline inline-block mb-1"
                      data-testid={`link-user-${item.user.username}`}
                    >
                      <div className="w-8 h-8 rounded-full overflow-hidden" style={{ border: '2px solid #B7FF1A' }}>
                        <AuthorAvatar
                          avatarUrl={item.user.avatarUrl}
                          displayName={item.user.displayName}
                        />
                      </div>
                    </Link>
                    {/* Username + follow — below avatar */}
                    <div className="flex items-center gap-2">
                      <ProfileHoverCard username={item.user.username}>
                        <Link
                          href={`/profile/${item.user.username}`}
                          className="no-underline flex-shrink-0"
                        >
                          <span className="text-white font-bold text-[11px] drop-shadow leading-tight">
                            @{item.user.username}
                          </span>
                        </Link>
                      </ProfileHoverCard>
                      {!isSelf && !isFollowing && (
                        <button
                          onClick={handleFollowPress}
                          disabled={followMutation.isPending}
                          className="text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 transition-all"
                          style={{ background: '#B7FF1A', color: '#000', border: '1px solid transparent' }}
                        >
                          {followMutation.isPending ? '…' : 'Follow'}
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-white font-bold text-[13px] drop-shadow mb-0.5 leading-snug">
                    {(() => {
                      const titleText = item.title ?? '';
                      const titleTruncated = !showFullDescription && titleText.length > 50;
                      return titleTruncated ? titleText.slice(0, 50) + '…' : titleText;
                    })()}
                  </p>

                  {(() => {
                    const desc = (item as any).description ?? '';
                    const titleText = item.title ?? '';
                    const needsExpand = titleText.length > 50 || desc.length > 80;
                    return needsExpand || desc ? (
                      <div className="mb-1">
                        {desc ? (
                          <p className={`text-white/75 text-[11px] drop-shadow leading-snug pr-8 ${showFullDescription ? '' : 'line-clamp-2'}`}>
                            {desc}
                          </p>
                        ) : null}
                        {needsExpand && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setShowFullDescription(v => !v); }}
                            className="text-white/50 text-[11px] mt-0.5"
                          >
                            {showFullDescription ? 'see less' : 'see more'}
                          </button>
                        )}
                      </div>
                    ) : null;
                  })()}

                  {item.game?.name && (
                    <Link
                      href={`/games/${gameNameToSlug(item.game.name)}`}
                      className="inline-flex items-center gap-1 mb-2 no-underline"
                      data-testid={`link-game-${item.game.id ?? item.game.name}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Gamepad2 className="h-3 w-3 flex-shrink-0" style={{ color: '#B7FF1A' }} />
                      <span className="text-[11px] font-semibold underline-offset-2 hover:underline" style={{ color: '#B7FF1A' }}>
                        {item.game.name}
                      </span>
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Overlay UI — absolute above scroll stack ──────────────────────── */}

      {/* Close button — top left */}
      {!hideCloseButton && !showComments && (
        <div
          className="absolute top-0 left-0 right-0 flex items-center px-4 pb-3 z-20"
          style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 12px)', pointerEvents: 'none' }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="w-9 h-9 flex items-center justify-center rounded-full transition-colors"
            style={{ color: '#F5F7F2', pointerEvents: 'auto' }}
            aria-label="Back"
            data-testid="button-close"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* ── Right edge action column ── */}
      {!showComments && (
        <div
          className="absolute right-3 z-20 flex flex-col items-center gap-3"
          style={{
            bottom: '44px',
            pointerEvents: 'none',
          }}
        >
          {/* Views */}
          <div
            className="flex flex-col items-center gap-0.5"
            style={{ pointerEvents: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <BarChart2 className="h-6 w-6 text-white drop-shadow" />
            <span className="text-white text-[10px] font-semibold drop-shadow">{formatNumber(stats.views)}</span>
          </div>

          {/* Likes */}
          <div style={{ pointerEvents: 'auto' }} onClick={e => e.stopPropagation()}>
            <LikeButton
              contentId={currentItem.id}
              contentType={isVideoContent(currentItem) ? "clip" : "screenshot"}
              contentOwnerId={currentItem.user.id}
              initialLiked={(currentItem as any).isLiked ?? false}
              initialCount={stats.likes}
              size="sm"
              variant="vertical"
            />
          </div>

          {/* Fires */}
          <div style={{ pointerEvents: 'auto' }} onClick={e => e.stopPropagation()}>
            <FireButton
              contentId={currentItem.id}
              contentType={isVideoContent(currentItem) ? "clip" : "screenshot"}
              contentOwnerId={currentItem.user.id}
              initialFired={(currentItem as any).isFired ?? false}
              initialCount={(currentItem as any)._count?.fires || (currentItem as any)._count?.reactions || 0}
              size="sm"
              variant="vertical"
              clipRef={containerRef}
            />
          </div>

          {/* Comments */}
          <button
            onClick={(e) => { e.stopPropagation(); if (!user) { openModal('login'); } else { setCommentsExpanded(true); setShowComments(true); } }}
            className="flex flex-col items-center gap-0.5"
            style={{ pointerEvents: 'auto' }}
            data-testid="button-comments"
          >
            <MessageCircle className="h-6 w-6 text-white drop-shadow" />
            <span className="text-white text-[10px] font-semibold drop-shadow">{formatNumber(stats.comments)}</span>
          </button>

          {/* Share */}
          <div style={{ pointerEvents: 'auto' }} onClick={e => e.stopPropagation()}>
            <ShareLaunchIcon
              size={24}
              className="text-white drop-shadow"
              onClick={(e) => { e.stopPropagation(); setShowShare(true); }}
            />
          </div>

          {/* 3-dot menu — clips, reels, and screenshots */}
          <div style={{ pointerEvents: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <TrendingClipMenu
              clip={currentItem as ClipWithUser}
              contentType={isVideoContent(currentItem) ? 'clip' : 'screenshot'}
              screenshotImageUrl={signedCurrentImageUrl}
            />
          </div>
        </div>
      )}

      {/* Tap-to-play flash indicator — shown briefly on each tap */}
      {!showComments && isVideoContent(currentItem) && (
        <AnimatePresence>
          {playFlash && (
            <motion.div
              key={playFlash}
              initial={{ scale: 0.6, opacity: 0.9 }}
              animate={{ scale: 1.1, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              style={{ zIndex: 15 }}
            >
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: 'rgba(0,0,0,0.45)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {playFlash === 'play'
                  ? <Play className="h-9 w-9 text-white" style={{ marginLeft: 4 }} />
                  : <Pause className="h-9 w-9 text-white" />}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Comments bottom sheet — slides up from bottom */}
      <AnimatePresence onExitComplete={() => { setCommentsExpanded(false); setSheetY(0); }}>
        {showComments && !embedded && (
          <motion.div
            key="comments-sheet"
            initial={{ y: "100%" }}
            animate={{ y: sheetY > 0 ? sheetY : 0 }}
            exit={{ y: "100%" }}
            transition={sheetY > 0 ? { duration: 0 } : { type: "tween", duration: 0.42, ease: [0.32, 0, 0.67, 0] }}
            className="absolute left-0 right-0 z-[55]"
            style={{
              bottom: keyboardHeight,
              height: '70%',
              background: '#0B1218',
              borderRadius: '20px 20px 0 0',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Drag handle — touch this to swipe sheet down and dismiss */}
            <div
              className="flex justify-center pt-3 pb-2 flex-shrink-0 cursor-grab active:cursor-grabbing"
              onTouchStart={(e) => {
                sheetDragStartY.current = e.touches[0].clientY;
                sheetIsDragging.current = true;
              }}
              onTouchMove={(e) => {
                if (!sheetIsDragging.current) return;
                const delta = e.touches[0].clientY - sheetDragStartY.current;
                if (delta > 0) setSheetY(delta);
              }}
              onTouchEnd={() => {
                sheetIsDragging.current = false;
                if (sheetY > 100) {
                  setShowComments(false);
                } else {
                  setSheetY(0);
                }
              }}
            >
              <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.3)' }} />
            </div>

            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-2 flex-shrink-0"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
            >
              <h3 className="text-white font-bold text-base">
                Comments{' '}
                <span className="text-white/45 font-normal text-sm">{stats.comments}</span>
              </h3>
              <button
                onClick={() => setShowComments(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full"
                style={{ background: 'rgba(255,255,255,0.08)' }}
              >
                <X className="h-4 w-4 text-white/70" />
              </button>
            </div>

            {/* Scrollable comment list with built-in form — same as clips viewer */}
            <div className="flex-1 overflow-y-auto px-4 py-3 pb-5" style={{ minHeight: 0 }}>
              {isVideoContent(currentItem) ? (
                <CommentSection clipId={currentItem.id} currentUserId={user?.id} />
              ) : (
                <CommentSection screenshotId={currentItem.id} currentUserId={user?.id} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share dialog */}
      <ClipShareDialog
        clipId={currentItem.id}
        contentType={isVideoContent(currentItem) ? (currentItem.videoType === 'reel' ? 'reel' : 'clip') : 'screenshot'}
        open={showShare}
        onOpenChange={setShowShare}
      />


    </div>
  );
}
