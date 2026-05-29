import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { ClipWithUser } from "@shared/schema";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useMobile } from "@/hooks/use-mobile";
import { useClipDialog } from "@/hooks/use-clip-dialog";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import VideoPlayer from "@/components/shared/VideoPlayer";
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
import { ArrowLeft, BadgeCheck, Bookmark, BarChart2, MessageCircle, Gamepad2, Play, ChevronDown } from "lucide-react";

export const ClipFeedCard: React.FC<{ clip: ClipWithUser; clips: ClipWithUser[]; isDesktop?: boolean }> = ({ clip, clips, isDesktop }) => {
  const { openClipDialog } = useClipDialog();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [localFollowing, setLocalFollowing] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [isNear, setIsNear] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const isMobile = useMobile();
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
    if (sheetDragY > 80 || velocity > 0.5) {
      setCommentsOpen(false);
    }
    setSheetDragY(0);
    sheetTouchStartY.current = null;
  };

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const viewObserver = new IntersectionObserver(
      ([entry]) => setIsInView(entry.intersectionRatio >= 0.5),
      { threshold: [0, 0.5, 1] }
    );
    const nearObserver = new IntersectionObserver(
      ([entry]) => setIsNear(entry.isIntersecting),
      { rootMargin: '100% 0px' }
    );
    viewObserver.observe(el);
    nearObserver.observe(el);
    return () => { viewObserver.disconnect(); nearObserver.disconnect(); };
  }, []);

  const fmt = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toString();
  };

  const likes    = (clip as any)._count?.likes    || 0;
  const fires    = (clip as any)._count?.fires    || (clip as any)._count?.reactions || 0;
  const comments = (clip as any)._count?.comments || 0;
  const views    = clip.views || 0;
  const isSelf   = user && user.id === clip.user.id;
  const isPro    = (clip.user as any).isPro;
  const gameSlug = clip.game?.name?.toLowerCase().replace(/[^a-z0-9]/g, '');

  const { data: followStatus } = useQuery<{ following?: boolean; requested?: boolean }>({
    queryKey: [`/api/users/${clip.user.username}/follow-status`],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    enabled: !!user && !isSelf,
    staleTime: 60_000,
  });
  const isAlreadyFollowing =
    localFollowing ||
    followStatus?.following === true ||
    followStatus?.requested === true;

  const followMutation = useMutation({
    mutationFn: () => apiRequest('POST', `/api/users/${clip.user.username}/follow`),
    onSuccess: () => {
      setLocalFollowing(true);
      queryClient.invalidateQueries({ queryKey: [`/api/users/${clip.user.username}/follow-status`] });
    },
  });

  const caption = [clip.title, clip.description].filter(Boolean).join(' — ');
  const captionTrimmed = caption.length > 120 && !showFullDesc;
  const canCollapse = caption.length > 120;
  const commentsOverlay = commentsOpen && isMobile;

  return (
    <div
      ref={cardRef}
      className={commentsOverlay ? "fixed inset-0 z-[75] flex flex-col overflow-hidden" : "w-full"}
      style={{ background: commentsOverlay ? '#000' : '#03080A' }}
    >
      {/* ── Video — shrinks to top 42% when mobile comments open ── */}
      <div
        className={commentsOverlay ? "flex-shrink-0 overflow-hidden" : ""}
        style={commentsOverlay ? {
          height: '42%',
          transform: sheetMounted ? 'scale(0.97) translateY(-6px)' : 'scale(1) translateY(0)',
          transition: 'transform 0.3s ease-out',
        } : {}}
      >
        {isNear ? (
          <VideoPlayer
            videoUrl={clip.videoUrl || ''}
            thumbnailUrl={clip.thumbnailUrl || undefined}
            autoPlay={isInView}
            clipId={clip.id}
            objectFit="contain"
            autoHideControls
            externalPaused={!isInView}
            className={commentsOverlay ? "w-full h-full" : "w-full"}
          />
        ) : (
          <div className={commentsOverlay ? "w-full h-full bg-black flex items-center justify-center" : "w-full aspect-video bg-black flex items-center justify-center relative overflow-hidden"}>
            {clip.thumbnailUrl ? (
              <img src={clip.thumbnailUrl} alt={clip.title} className="w-full h-full object-contain" loading="lazy" />
            ) : (
              <Play className="h-10 w-10 text-white/30" />
            )}
          </div>
        )}
      </div>

      {/* ── Header, caption, social — hidden when mobile comments overlay is open ── */}
      {!commentsOverlay && (<>
      <div className="px-4 pt-6 pb-2">
        <div className="flex items-start gap-3">
          <Link href={`/profile/${clip.user.username}`} className="flex-shrink-0">
            <CustomAvatar user={clip.user as any} size="sm" showBorder={true} />
          </Link>

          <ProfileHoverCard username={clip.user.username}>
          <div className="flex-1 min-w-0 cursor-default">
            <div className="flex items-center gap-1.5">
              <Link href={`/profile/${clip.user.username}`} className="no-underline min-w-0">
                <span className="font-bold text-[15px] leading-tight truncate block" style={{ color: '#F5F7F2' }}>
                  {clip.user.displayName || clip.user.username}
                </span>
              </Link>
              {isPro && <BadgeCheck className="h-4 w-4 flex-shrink-0" style={{ color: '#B7FF1A' }} />}
              <PartnerBadge isPartner={(clip.user as any).isPartner} size="sm" />
            </div>
            <Link href={`/profile/${clip.user.username}`} className="no-underline">
              <span className="text-[13px] block leading-tight mt-0.5" style={{ color: '#7E887A' }}>
                @{clip.user.username}
              </span>
            </Link>
            {clip.game?.name && gameSlug && (
              <Link href={`/games/${gameSlug}`} className="inline-flex items-center gap-1 mt-0.5 hover:opacity-80 transition-opacity">
                <Gamepad2 className="h-3 w-3 flex-shrink-0" style={{ color: '#B7FF1A' }} />
                <span className="text-[12px] font-medium" style={{ color: '#B7FF1A' }}>{clip.game.name}</span>
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
            <TrendingClipMenu clip={clip} />
          </div>
        </div>
      </div>

      <div className="px-4" style={{ background: '#03080A' }}>
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
              contentId={clip.id} contentType="clip" contentOwnerId={clip.user.id}
              initialFired={(clip as any).isFired ?? false} initialCount={fires}
              size="sm" variant="horizontal"
            />
          </div>

          <div className="flex-1 flex justify-center">
            <LikeButton
              contentId={clip.id} contentType="clip" contentOwnerId={clip.user.id}
              initialLiked={(clip as any).isLiked ?? false} initialCount={likes}
              size="sm" variant="horizontal"
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
            <CommentSection clipId={clip.id} currentUserId={user?.id} onUsernameClick={() => setCommentsOpen(false)} />
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
              <CommentSection clipId={clip.id} currentUserId={user?.id} onUsernameClick={() => setCommentsOpen(false)} />
            </div>
          </DialogContent>
        </Dialog>
      )}

      <ClipShareDialog
        clipId={clip.id}
        open={shareOpen}
        onOpenChange={setShareOpen}
        contentType={(clip as any).type === 'reel' ? 'reel' : 'clip'}
      />
    </div>
  );
};

export const MobileClipsViewer: React.FC<{ clips: ClipWithUser[]; onBack: () => void; viewAllHref?: string }> = ({ clips, onBack }) => {
  const isMobile = useMobile();

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: '#03080A' }}>
      {/* Top bar — back button */}
      <div
        className="flex-shrink-0 flex items-center px-4 pb-3"
        style={{
          background: '#03080A',
          paddingTop: isMobile
            ? 'calc(env(safe-area-inset-top, 0px) + 12px)'
            : '72px',
        }}
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
        {clips.map((clip) => (
          <div
            key={clip.id}
            className="flex flex-col justify-center"
            style={{ scrollSnapAlign: 'start', scrollSnapStop: 'always', minHeight: '100%' }}
          >
            <ClipFeedCard clip={clip} clips={clips} />
          </div>
        ))}
      </div>
    </div>
  );
};
