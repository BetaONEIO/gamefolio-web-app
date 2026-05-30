import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useMobile } from "@/hooks/use-mobile";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { CustomAvatar } from "@/components/ui/custom-avatar";
import { ProfileHoverCard } from "@/components/ui/ProfileHoverCard";
import { TrendingClipMenu } from "@/components/clips/TrendingClipMenu";
import { LikeButton } from "@/components/engagement/LikeButton";
import { FireButton } from "@/components/engagement/FireButton";
import CommentSection from "@/components/clips/CommentSection";
import { ClipShareDialog } from "@/components/clip/ClipShareDialog";
import ShareLaunchIcon from "@/components/ui/ShareIcon";
import { PartnerBadge } from "@/components/ui/partner-badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ArrowLeft, BadgeCheck, Bookmark, BarChart2, MessageCircle,
  Gamepad2, ChevronDown, ImageOff, Maximize2, X, ChevronLeft, ChevronRight,
} from "lucide-react";
import { useSignedUrl } from "@/hooks/use-signed-url";

interface ScreenshotWithUser {
  id: number;
  title: string;
  description?: string;
  imageUrl: string;
  thumbnailUrl?: string;
  views: number;
  ageRestricted?: boolean;
  userId: number;
  user: {
    id: number;
    username: string;
    displayName: string;
    avatarUrl?: string;
    isPro?: boolean;
    isPartner?: boolean;
  };
  game?: { id: number; name: string };
  _count?: { likes?: number; reactions?: number; comments?: number };
  isLiked?: boolean;
  isFired?: boolean;
}

/* ─── Fullscreen single image ─────────────────────────────────────────────── */
function FullscreenImage({ imageUrl, title }: { imageUrl: string; title: string }) {
  const { signedUrl } = useSignedUrl(imageUrl);
  const [failed, setFailed] = useState(false);
  return failed ? (
    <div className="flex items-center justify-center w-full h-full">
      <ImageOff className="h-14 w-14 text-white/20" />
    </div>
  ) : (
    <img
      src={signedUrl || imageUrl}
      alt={title}
      className="w-full h-full object-contain select-none"
      draggable={false}
      onError={() => setFailed(true)}
    />
  );
}

/* ─── Fullscreen gallery overlay ─────────────────────────────────────────── */
function FullscreenGallery({
  screenshots,
  startIndex,
  onClose,
}: {
  screenshots: ScreenshotWithUser[];
  startIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const prev = useCallback(() => setIndex(i => Math.max(0, i - 1)), []);
  const next = useCallback(() => setIndex(i => Math.min(screenshots.length - 1, i + 1)), [screenshots.length]);

  /* keyboard nav */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft')  prev();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'Escape')     onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [prev, next, onClose]);

  /* swipe nav */
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      if (dx < 0) next(); else prev();
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const current = screenshots[index];

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col"
      style={{ background: '#000' }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Top bar */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-4 py-2"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 8px)', background: 'rgba(0,0,0,0.6)' }}
      >
        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-full"
          style={{ background: 'rgba(255,255,255,0.12)' }}
          aria-label="Close fullscreen"
        >
          <X className="h-5 w-5 text-white" />
        </button>
        <span className="text-white/60 text-sm font-medium">
          {index + 1} / {screenshots.length}
        </span>
        <div className="w-9" />
      </div>

      {/* Image */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        <FullscreenImage imageUrl={current.imageUrl} title={current.title} />

        {/* Prev arrow */}
        {index > 0 && (
          <button
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full transition-opacity"
            style={{ background: 'rgba(0,0,0,0.55)' }}
            aria-label="Previous"
          >
            <ChevronLeft className="h-6 w-6 text-white" />
          </button>
        )}
        {/* Next arrow */}
        {index < screenshots.length - 1 && (
          <button
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full transition-opacity"
            style={{ background: 'rgba(0,0,0,0.55)' }}
            aria-label="Next"
          >
            <ChevronRight className="h-6 w-6 text-white" />
          </button>
        )}
      </div>

      {/* Caption bar */}
      {(current.title || current.game?.name) && (
        <div
          className="flex-shrink-0 px-5 py-3"
          style={{
            background: 'rgba(0,0,0,0.7)',
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
          }}
        >
          {current.title && (
            <p className="text-white font-semibold text-sm leading-snug">{current.title}</p>
          )}
          {current.game?.name && (
            <p className="text-[12px] mt-0.5" style={{ color: '#B7FF1A' }}>{current.game.name}</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Thumbnail image in feed card ───────────────────────────────────────── */
function FeedImage({
  imageUrl,
  title,
  ageRestricted,
  onExpand,
}: {
  imageUrl: string;
  title: string;
  ageRestricted?: boolean;
  onExpand: () => void;
}) {
  const { signedUrl, isLoading } = useSignedUrl(imageUrl);
  const [failed, setFailed] = useState(false);

  useEffect(() => { setFailed(false); }, [signedUrl]);

  return (
    <div className="relative w-full aspect-video bg-[#0B1218] flex items-center justify-center overflow-hidden">
      {failed ? (
        <ImageOff className="h-10 w-10 text-white/20" />
      ) : isLoading || !signedUrl ? (
        <div className="w-full h-full animate-pulse" style={{ background: '#111' }} />
      ) : (
        <img
          src={signedUrl}
          alt={title}
          className={`w-full h-full object-contain${ageRestricted ? ' blur-2xl' : ''}`}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      )}
      {/* Permanent fullscreen expand button */}
      <button
        onClick={(e) => { e.stopPropagation(); onExpand(); }}
        className="absolute bottom-2 right-2 w-8 h-8 flex items-center justify-center rounded-full transition-opacity hover:opacity-100"
        style={{ background: 'rgba(0,0,0,0.55)', opacity: 0.85 }}
        aria-label="View fullscreen"
      >
        <Maximize2 className="h-[15px] w-[15px] text-white" />
      </button>
    </div>
  );
}

const fmt = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
};

/* ─── Feed card ──────────────────────────────────────────────────────────── */
export const ScreenshotFeedCard: React.FC<{
  screenshot: ScreenshotWithUser;
  onFullscreen: () => void;
}> = ({ screenshot, onFullscreen }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isMobile = useMobile();
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [localFollowing, setLocalFollowing] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [sheetMounted, setSheetMounted] = useState(false);
  const [sheetDragY, setSheetDragY] = useState(0);
  const sheetTouchStartY = useRef<number | null>(null);
  const sheetTouchStartTime = useRef<number>(0);

  useEffect(() => {
    if (!commentsOpen || !isMobile) { setSheetMounted(false); setSheetDragY(0); return; }
    const id = requestAnimationFrame(() => setSheetMounted(true));
    return () => cancelAnimationFrame(id);
  }, [commentsOpen, isMobile]);

  const handleSheetTouchStart = (e: React.TouchEvent) => {
    sheetTouchStartY.current = e.touches[0].clientY;
    sheetTouchStartTime.current = Date.now();
  };
  const handleSheetTouchMove = (e: React.TouchEvent) => {
    if (sheetTouchStartY.current === null) return;
    const delta = e.touches[0].clientY - sheetTouchStartY.current;
    if (delta > 0) setSheetDragY(delta);
  };
  const handleSheetTouchEnd = () => {
    if (sheetTouchStartY.current === null) return;
    const elapsed = Date.now() - sheetTouchStartTime.current;
    const velocity = sheetDragY / Math.max(elapsed, 1);
    if (sheetDragY > 80 || velocity > 0.5) setCommentsOpen(false);
    setSheetDragY(0);
    sheetTouchStartY.current = null;
  };

  const isSelf   = user && user.id === screenshot.user.id;
  const isPro    = screenshot.user.isPro;
  const gameSlug = screenshot.game?.name?.toLowerCase().replace(/[^a-z0-9]/g, '');
  const likes    = screenshot._count?.likes    || 0;
  const fires    = screenshot._count?.reactions || 0;
  const comments = screenshot._count?.comments || 0;
  const views    = screenshot.views || 0;

  const caption        = [screenshot.title, screenshot.description].filter(Boolean).join(' — ');
  const captionTrimmed = caption.length > 120 && !showFullDesc;
  const canCollapse    = caption.length > 120;
  const commentsOverlay = commentsOpen && isMobile;

  const { data: followStatus } = useQuery<{ following?: boolean; requested?: boolean }>({
    queryKey: [`/api/users/${screenshot.user.username}/follow-status`],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    enabled: !!user && !isSelf,
    staleTime: 60_000,
  });
  const isAlreadyFollowing =
    localFollowing ||
    followStatus?.following === true ||
    followStatus?.requested === true;

  const followMutation = useMutation({
    mutationFn: () => apiRequest('POST', `/api/users/${screenshot.user.username}/follow`),
    onSuccess: () => {
      setLocalFollowing(true);
      queryClient.invalidateQueries({ queryKey: [`/api/users/${screenshot.user.username}/follow-status`] });
    },
  });

  return (
    <div
      ref={cardRef}
      className={commentsOverlay ? "fixed inset-0 z-[75] flex flex-col overflow-hidden" : "w-full"}
      style={{ background: commentsOverlay ? '#000' : '#081017' }}
    >
      {/* ── Image ── */}
      <div
        className={commentsOverlay ? "flex-shrink-0 overflow-hidden" : ""}
        style={commentsOverlay ? {
          height: '42%',
          transform: sheetMounted ? 'scale(0.97) translateY(-6px)' : 'scale(1) translateY(0)',
          transition: 'transform 0.3s ease-out',
        } : {}}
      >
        <FeedImage
          imageUrl={screenshot.imageUrl}
          title={screenshot.title}
          ageRestricted={screenshot.ageRestricted}
          onExpand={onFullscreen}
        />
      </div>

      {/* ── Header, caption, social ── */}
      {!commentsOverlay && (<>
      <div className="px-4 pt-6 pb-2">
        <div className="flex items-start gap-3">
          <Link href={`/profile/${screenshot.user.username}`} className="flex-shrink-0">
            <CustomAvatar user={screenshot.user as any} size="sm" showBorder={true} />
          </Link>

          <ProfileHoverCard username={screenshot.user.username}>
            <div className="flex-1 min-w-0 cursor-default">
              <div className="flex items-center gap-1.5">
                <Link href={`/profile/${screenshot.user.username}`} className="no-underline min-w-0">
                  <span className="font-bold text-[15px] leading-tight truncate block" style={{ color: '#F5F7F2' }}>
                    {screenshot.user.displayName || screenshot.user.username}
                  </span>
                </Link>
                {isPro && <BadgeCheck className="h-4 w-4 flex-shrink-0" style={{ color: '#B7FF1A' }} />}
                <PartnerBadge isPartner={(screenshot.user as any).isPartner} size="sm" />
              </div>
              <Link href={`/profile/${screenshot.user.username}`} className="no-underline">
                <span className="text-[13px] block leading-tight mt-0.5" style={{ color: '#7E887A' }}>
                  @{screenshot.user.username}
                </span>
              </Link>
              {screenshot.game?.name && gameSlug && (
                <Link href={`/games/${gameSlug}`} className="inline-flex items-center gap-1 mt-0.5 hover:opacity-80 transition-opacity">
                  <Gamepad2 className="h-3 w-3 flex-shrink-0" style={{ color: '#B7FF1A' }} />
                  <span className="text-[12px] font-medium" style={{ color: '#B7FF1A' }}>{screenshot.game.name}</span>
                </Link>
              )}
            </div>
          </ProfileHoverCard>

          <div className="flex items-center gap-2 flex-shrink-0">
            {!isSelf && !isAlreadyFollowing && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!user) { toast({ description: 'Sign in to follow creators' }); return; }
                  followMutation.mutate();
                }}
                disabled={followMutation.isPending}
                className="text-xs font-bold px-3 py-1 rounded-full"
                style={{ background: '#B7FF1A', color: '#071013' }}
              >
                {followMutation.isPending ? '…' : 'Follow'}
              </button>
            )}
            <TrendingClipMenu
              clip={screenshot as any}
              contentType="screenshot"
              screenshotImageUrl={screenshot.imageUrl}
            />
          </div>
        </div>
      </div>

      <div className="px-4" style={{ background: '#081017' }}>
        {caption && (
          <div className="pb-3">
            <p className="text-[14px] leading-relaxed" style={{ color: '#B8C0AE' }}>
              {captionTrimmed ? caption.slice(0, 120) : caption}
              {captionTrimmed && (
                <button onClick={() => setShowFullDesc(true)} className="font-semibold ml-0.5" style={{ color: '#B7FF1A' }}>
                  … more
                </button>
              )}
              {!captionTrimmed && canCollapse && (
                <button onClick={() => setShowFullDesc(false)} className="font-semibold ml-1" style={{ color: '#B7FF1A' }}>
                  See less
                </button>
              )}
            </p>
          </div>
        )}

        <div className="flex items-center py-2.5" style={{ borderTop: '1px solid #1B2A33' }}>
          <button
            onClick={(e) => { e.stopPropagation(); setCommentsOpen(true); }}
            className="flex items-center gap-1.5 flex-1 justify-center transition-colors"
            style={{ color: commentsOpen ? '#B7FF1A' : '#7E887A' }}
          >
            <MessageCircle className="h-[18px] w-[18px]" />
            <span className="text-[13px]">{fmt(comments)}</span>
          </button>

          <div className="flex-1 flex justify-center">
            <FireButton
              contentId={screenshot.id}
              contentType="screenshot"
              contentOwnerId={screenshot.user.id}
              initialFired={(screenshot as any).isFired ?? false}
              initialCount={fires}
              size="sm"
              variant="horizontal"
            />
          </div>

          <div className="flex-1 flex justify-center">
            <LikeButton
              contentId={screenshot.id}
              contentType="screenshot"
              contentOwnerId={screenshot.user.id}
              initialLiked={(screenshot as any).isLiked ?? false}
              initialCount={likes}
              size="sm"
              variant="horizontal"
            />
          </div>

          <button className="flex items-center gap-1.5 flex-1 justify-center" style={{ color: '#7E887A' }}>
            <BarChart2 className="h-[18px] w-[18px]" />
            <span className="text-[13px]">{fmt(views)}</span>
          </button>

          <button
            onClick={() => setBookmarked(v => !v)}
            className="flex items-center justify-center flex-1 transition-colors"
            style={{ color: bookmarked ? '#B7FF1A' : '#7E887A' }}
          >
            <Bookmark className={`h-[18px] w-[18px] ${bookmarked ? 'fill-current' : ''}`} />
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); setShareOpen(true); }}
            className="flex items-center justify-center flex-1 transition-colors"
            style={{ color: '#7E887A' }}
          >
            <ShareLaunchIcon size={18} />
          </button>
        </div>
      </div>
      </>)}

      {/* Mobile: comments bottom sheet */}
      {commentsOverlay && (
        <div
          className="flex-1 flex flex-col overflow-hidden"
          style={{
            background: '#0B1218',
            borderRadius: '20px 20px 0 0',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            transform: sheetMounted ? `translateY(${sheetDragY}px)` : 'translateY(100%)',
            transition: sheetDragY > 0 ? 'none' : 'transform 0.3s ease-out',
          }}
          onTouchStart={handleSheetTouchStart}
          onTouchMove={handleSheetTouchMove}
          onTouchEnd={handleSheetTouchEnd}
        >
          <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
            <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.18)' }} />
          </div>
          <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <h3 className="text-white font-bold text-base">
              Comments <span className="text-white/45 font-normal text-sm">{comments}</span>
            </h3>
            <button
              onClick={() => setCommentsOpen(false)}
              className="w-8 h-8 flex items-center justify-center rounded-full"
              style={{ background: 'rgba(255,255,255,0.08)' }}
            >
              <ChevronDown className="h-5 w-5 text-white/70" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3 pb-5">
            <CommentSection screenshotId={screenshot.id} currentUserId={user?.id} onUsernameClick={() => setCommentsOpen(false)} />
          </div>
        </div>
      )}

      {/* Desktop: modal dialog */}
      {!isMobile && (
        <Dialog open={commentsOpen} onOpenChange={setCommentsOpen}>
          <DialogContent
            className="p-0 max-w-lg w-[95vw] max-h-[85vh] flex flex-col gap-0 overflow-hidden border"
            style={{ background: '#0B1218', borderColor: '#1B2A33' }}
          >
            <DialogHeader className="px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid #1B2A33' }}>
              <DialogTitle className="text-base font-semibold text-left" style={{ color: '#F5F7F2' }}>Comments</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-4 py-3">
              <CommentSection screenshotId={screenshot.id} currentUserId={user?.id} onUsernameClick={() => setCommentsOpen(false)} />
            </div>
          </DialogContent>
        </Dialog>
      )}

      <ClipShareDialog
        clipId={screenshot.id}
        open={shareOpen}
        onOpenChange={setShareOpen}
        contentType="screenshot"
      />
    </div>
  );
};

/* ─── Main viewer ─────────────────────────────────────────────────────────── */
export const MobileScreenshotsViewer: React.FC<{
  screenshots: ScreenshotWithUser[];
  onBack: () => void;
}> = ({ screenshots, onBack }) => {
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <>
      <div className="fixed inset-0 z-[9999] flex flex-col" style={{ background: '#081017' }}>
        {/* Top bar — back button */}
        <div
          className="flex-shrink-0 flex items-center px-4 pb-3"
          style={{ background: '#081017', paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
        >
          <button
            onClick={onBack}
            className="w-9 h-9 flex items-center justify-center rounded-full transition-colors"
            style={{ color: '#F5F7F2' }}
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        </div>

        {/* Snap-scrolling feed */}
        <div
          className="flex-1 overflow-y-auto"
          style={{ scrollSnapType: 'y mandatory', WebkitOverflowScrolling: 'touch' }}
        >
          {screenshots.map((screenshot, idx) => (
            <div
              key={screenshot.id}
              className="flex flex-col justify-center"
              style={{ scrollSnapAlign: 'start', scrollSnapStop: 'always', minHeight: '100%' }}
            >
              <ScreenshotFeedCard
                screenshot={screenshot}
                onFullscreen={() => setFullscreenIndex(idx)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Fullscreen gallery — rendered above everything */}
      {fullscreenIndex !== null && (
        <FullscreenGallery
          screenshots={screenshots}
          startIndex={fullscreenIndex}
          onClose={() => setFullscreenIndex(null)}
        />
      )}
    </>
  );
};
