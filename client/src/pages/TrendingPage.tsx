import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLikeScreenshot } from '@/hooks/use-clips';
import { useToast } from '@/hooks/use-toast';
import { ClipWithUser } from '@shared/schema';
import { TrendingUp, Clock, Calendar, CalendarDays, Gamepad2, Eye, MessageSquare, Heart, Play, MessageCircle, AlertTriangle, Film, Video, Camera, ChevronDown, ChevronUp, Check, Search, ArrowLeft, Bookmark, BarChart2, BadgeCheck, Repeat2 } from 'lucide-react';
import { TrendingClipMenu } from '@/components/clips/TrendingClipMenu';
import ShareLaunchIcon from "@/components/ui/ShareIcon";
import { ZapIconSvg } from "@/components/ui/ZapReactionIcon";
import { PartnerBadge } from '@/components/ui/partner-badge';
import { formatDuration } from '@/lib/constants';
import { formatDistance } from 'date-fns';
import { useClipDialog } from '@/hooks/use-clip-dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import VideoClipGridItem from '@/components/clips/VideoClipGridItem';
import VideoPlayer from '@/components/shared/VideoPlayer';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import { useAuthModal } from '@/hooks/use-auth-modal';
import { useMobile } from '@/hooks/use-mobile';
import { useSignedUrl } from '@/hooks/use-signed-url';
import { LazyImage } from '@/components/ui/lazy-image';
import { LikeButton } from '@/components/engagement/LikeButton';
import { FireButton } from '@/components/engagement/FireButton';
import { ReportButton } from '@/components/reporting/ReportButton';
import { MobileTrendingViewer } from '@/components/clips/MobileTrendingViewer';
import { MobileScreenshotsViewer } from '@/components/screenshots/MobileScreenshotsViewer';
import { CustomAvatar } from '@/components/ui/custom-avatar';
import { ProfileHoverCard } from '@/components/ui/ProfileHoverCard';
import { Dialog, DialogContent, DialogClose, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import CommentSection from '@/components/clips/CommentSection';
import { UserIcon, X, Trash2, ChevronLeft, ChevronRight, Send } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { AgeRestrictionDialog } from '@/components/content/AgeRestrictionDialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest, getQueryFn } from '@/lib/queryClient';
import { ScreenshotCard } from '@/components/screenshots/ScreenshotCard';
import { ScreenshotLightbox } from '@/components/screenshots/ScreenshotLightbox';
import { ClipShareDialog } from '@/components/clip/ClipShareDialog';
import { ClipFeedCard, MobileClipsViewer } from '@/components/clips/MobileClipsViewer';

type ContentType = 'clips' | 'reels' | 'screenshots';
type FilterType = 'likes' | 'comments';
type TimePeriod = 'recent' | '1w' | '1m' | 'ever';

interface ScreenshotWithUser {
  id: number;
  title: string;
  description?: string;
  imageUrl: string;
  thumbnailUrl?: string;
  tags?: string[];
  views: number;
  ageRestricted?: boolean;
  createdAt: string;
  userId: number;
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
  _count?: {
    likes?: number;
    reactions?: number;
    comments?: number;
  };
}

// Reel card component - TikTok/YouTube Shorts style
const ReelCard: React.FC<{ reel: ClipWithUser; reelsList: ClipWithUser[]; onOpenViewer?: (index: number) => void }> = ({ reel, reelsList, onOpenViewer }) => {
  const { openClipDialog } = useClipDialog();

  const handleReelClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onOpenViewer) {
      const index = reelsList.findIndex(r => r.id === reel.id);
      onOpenViewer(index >= 0 ? index : 0);
    } else {
      openClipDialog(reel.id, reelsList, undefined, 'reel');
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="group flex flex-col gap-2">
      {/* Thumbnail */}
      <div
        onClick={handleReelClick}
        className="relative bg-black rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer aspect-[9/16]"
      >
        <div className="absolute inset-0 bg-gray-800" />
        <LazyImage
          src={reel.thumbnailUrl || `/api/clips/${reel.id}/thumbnail`}
          alt={reel.title}
          className="w-full h-full object-contain"
          placeholder="data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='100'%20height='100'%3e%3crect%20width='100'%20height='100'%20fill='%231f2937'/%3e%3c/svg%3e"
          showLoadingSpinner={true}
          rootMargin="50px"
          containerClassName="absolute inset-0"
          fallback={
            <div className="w-full h-full flex items-center justify-center bg-gray-800">
              <Play className="h-12 w-12 text-gray-500" />
            </div>
          }
        />

        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="bg-primary backdrop-blur-sm rounded-full p-3">
            <svg className="w-6 h-6 text-white fill-white" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </div>

        {/* Duration badge - top left */}
        <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded-md font-semibold">
          {(() => {
            const actualDuration = reel.trimEnd && reel.trimEnd > 0
              ? reel.trimEnd - (reel.trimStart || 0)
              : reel.duration || 0;
            return formatDuration(actualDuration);
          })()}
        </div>

        {/* View count - top right */}
        <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded-md font-semibold flex items-center gap-1">
          <BarChart2 className="h-3 w-3" />
          {formatNumber(reel.views || 0)}
        </div>
      </div>

      {/* Metadata below thumbnail */}
      <div className="px-0.5 space-y-0.5">
        <div className="flex items-start justify-between gap-1">
          <h3
            onClick={handleReelClick}
            className="text-sm font-semibold leading-tight line-clamp-2 cursor-pointer hover:text-primary transition-colors flex-1 min-w-0"
          >
            {reel.title}
          </h3>
          <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }} className="flex-shrink-0 -mt-0.5">
            <TrendingClipMenu clip={reel} />
          </div>
        </div>
        <ProfileHoverCard username={reel.user.username}>
          <p className="text-xs text-muted-foreground cursor-default hover:text-foreground transition-colors">
            @{reel.user.username}
          </p>
        </ProfileHoverCard>
        {reel.game && (
          <Link
            href={`/games/${reel.game.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`}
            className="inline-block bg-primary text-[#071013] text-[10px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap overflow-hidden text-ellipsis hover:opacity-80 transition-opacity"
          >
            {reel.game.name}
          </Link>
        )}
      </div>
    </div>
  );
};

// ── Desktop YouTube Shorts-style viewer ─────────────────────────────────────
const DesktopShortsViewer: React.FC<{
  clips: ClipWithUser[];
  initialIndex: number;
  onClose: () => void;
  onOpenGameFilter: () => void;
  selectedGameId: number | null;
  selectedGameName: string | null;
  isLandscape?: boolean;
  activeTab: ContentType;
  onTabChange: (tab: ContentType) => void;
  timePeriod: TimePeriod;
  onTimePeriodChange: (p: TimePeriod) => void;
}> = ({ clips, initialIndex, onClose, onOpenGameFilter, selectedGameId, selectedGameName, isLandscape = false, activeTab, onTabChange, timePeriod, onTimePeriodChange }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [slideDir, setSlideDir] = useState<'up' | 'down'>('up');
  const [showComments, setShowComments] = useState(false);
  const [showContentDropdown, setShowContentDropdown] = useState(false);
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [inlineComment, setInlineComment] = useState('');
  const wheelCooldown = useRef(false);
  const wheelAccum = useRef(0);
  const wheelIdleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { user } = useAuth();
  const { openModal } = useAuthModal();
  const queryClient = useQueryClient();
  const createCommentMutation = useMutation({
    mutationFn: async ({ clipId, text }: { clipId: number; text: string }) => {
      const res = await apiRequest('POST', `/api/clips/${clipId}/comments`, { content: text });
      return res.json();
    },
    onSuccess: (_, { clipId }) => {
      queryClient.invalidateQueries({ queryKey: [`/api/clips/${clipId}/comments`] });
      queryClient.invalidateQueries({ queryKey: ['/api/clips/trending'] });
      setInlineComment('');
    },
  });

  const contentMeta: Record<ContentType, { label: string; Icon: React.ElementType }> = {
    reels:       { label: 'Reels',       Icon: Film   },
    clips:       { label: 'Clips',       Icon: Video  },
    screenshots: { label: 'Screenshots', Icon: Camera },
  };
  const timeMeta: Record<TimePeriod, string> = {
    recent: 'Most Recent',
    '1w':   '1 Week',
    '1m':   '1 Month',
    ever:   'All Time',
  };
  const { label: activeLabel, Icon: ActiveIcon } = contentMeta[activeTab];
  const pillBase = (active: boolean) => ({
    background: active ? 'rgba(183,255,26,0.15)' : 'rgba(255,255,255,0.07)',
    border: `1px solid ${active ? '#B7FF1A' : 'rgba(255,255,255,0.12)'}`,
    color: active ? '#B7FF1A' : '#F5F7F2',
  });

  const clip = clips[currentIndex];

  const goNext = useCallback(() => {
    setSlideDir('up');
    setCurrentIndex(i => Math.min(i + 1, clips.length - 1));
  }, [clips.length]);

  const goPrev = useCallback(() => {
    setSlideDir('down');
    setCurrentIndex(i => Math.max(i - 1, 0));
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); goNext(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); goPrev(); }
      else if (e.key === 'Escape') { onClose(); }
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      // Reset accumulated delta after scroll gesture goes idle (150 ms of silence)
      if (wheelIdleTimer.current) clearTimeout(wheelIdleTimer.current);
      wheelIdleTimer.current = setTimeout(() => { wheelAccum.current = 0; }, 150);

      if (wheelCooldown.current) return;

      // Accumulate delta — Mac trackpads send many small events; mice send one large one
      wheelAccum.current += e.deltaY + e.deltaX;

      const THRESHOLD = 80; // px accumulated before triggering navigation

      if (wheelAccum.current > THRESHOLD) {
        wheelAccum.current = 0;
        wheelCooldown.current = true;
        goNext();
        setTimeout(() => { wheelCooldown.current = false; }, 700);
      } else if (wheelAccum.current < -THRESHOLD) {
        wheelAccum.current = 0;
        wheelCooldown.current = true;
        goPrev();
        setTimeout(() => { wheelCooldown.current = false; }, 700);
      }
    };

    window.addEventListener('keydown', handleKey);
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('wheel', handleWheel);
      if (wheelIdleTimer.current) clearTimeout(wheelIdleTimer.current);
    };
  }, [goNext, goPrev, onClose]);

  const fmt = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  };

  if (!clip) return null;

  const likes = (clip as any)._count?.likes || 0;
  const fires = (clip as any)._count?.fires || (clip as any)._count?.reactions || 0;
  const comments = (clip as any)._count?.comments || 0;
  const views = clip.views || 0;
  const gameSlug = clip.game?.name?.toLowerCase().replace(/[^a-z0-9]/g, '');

  return (
    <div
      className="fixed top-0 right-0 bottom-0 z-[45] flex flex-col lg:left-64 left-0"
      style={{ background: '#081017' }}
    >
      {/* Top bar — rendered above main content, below the sticky app header */}
      <div className="flex items-center justify-between px-5 pb-3 flex-shrink-0 pt-[128px] xl:pt-[152px]">
        <button
          onClick={onClose}
          className="group fixed left-5 lg:left-[276px] z-[50] top-[128px] xl:top-[152px]"
          aria-label="Back to Trending"
        >
          <ChevronLeft className="h-8 w-8 text-white/80 group-hover:text-white transition-colors" strokeWidth={2} />
        </button>
      </div>

      {/* Main area — fills remaining height */}
      <div className={`flex-1 relative min-h-0 overflow-hidden flex ${isLandscape ? 'flex-col items-center justify-center gap-0' : 'items-center justify-center'}`}>

      {/* ── Comment panel — slides in from the left ── */}
      <div
        className="absolute left-0 top-0 bottom-0 z-[55] flex flex-col"
        style={{
          width: '360px',
          background: '#0B1218',
          borderRight: '1px solid rgba(255,255,255,0.07)',
          transform: showComments ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: showComments ? '4px 0 24px rgba(0,0,0,0.5)' : 'none',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 pb-3 flex-shrink-0"
          style={{ paddingTop: '16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" style={{ color: '#B7FF1A' }} />
            <span className="text-white font-bold text-base">Comments</span>
          </div>
          <button
            onClick={() => setShowComments(false)}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
            aria-label="Close comments"
          >
            <X className="h-4 w-4 text-white/60" />
          </button>
        </div>

        {/* Scrollable comment list — form lives below, always visible */}
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2 min-h-0">
          {showComments && (
            <CommentSection clipId={clip.id} currentUserId={user?.id ?? null} hideForm={true} />
          )}
        </div>

        {/* Pinned comment input — always visible at the bottom of the panel */}
        <div
          className="flex-shrink-0 px-3 py-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.07)', background: '#0B1218' }}
        >
          {user ? (
            <div className="flex items-center gap-2">
              <CustomAvatar user={user} size="sm" showBorder={false} />
              <div
                className="flex-1 flex items-center gap-2 rounded-full px-3 py-1.5"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <input
                  type="text"
                  value={inlineComment}
                  onChange={(e) => setInlineComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && inlineComment.trim()) {
                      e.preventDefault();
                      createCommentMutation.mutate({ clipId: clip.id, text: inlineComment });
                    }
                  }}
                  placeholder="Add a comment…"
                  className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/35 min-w-0"
                />
                <button
                  onClick={() => {
                    if (!inlineComment.trim()) return;
                    createCommentMutation.mutate({ clipId: clip.id, text: inlineComment });
                  }}
                  disabled={!inlineComment.trim() || createCommentMutation.isPending}
                  className="flex-shrink-0 transition-opacity disabled:opacity-30"
                  style={{ color: '#B7FF1A' }}
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => openModal('login')}
              className="w-full text-center text-sm py-2 rounded-full"
              style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)' }}
            >
              <span style={{ color: '#B7FF1A' }}>Sign in</span> to comment
            </button>
          )}
        </div>
      </div>

      {isLandscape ? (
        /* ── LANDSCAPE layout: video stacked above engagement row ── */
        <div key={currentIndex} className={`flex flex-col w-full h-full items-center justify-center gap-0 ${slideDir === 'up' ? 'dsv-slide-up' : 'dsv-slide-down'}`}>
          {/* Up/Down nav arrows — right edge, vertically centred */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-3">
            <button
              onClick={goPrev}
              disabled={currentIndex === 0}
              className="w-12 h-12 rounded-full flex items-center justify-center transition-all disabled:opacity-20 hover:scale-105"
              style={{ background: '#0B1218', border: '1px solid #1B2A33' }}
              aria-label="Previous"
            >
              <ChevronUp className="h-6 w-6 text-white" />
            </button>
            <button
              onClick={goNext}
              disabled={currentIndex === clips.length - 1}
              className="w-12 h-12 rounded-full flex items-center justify-center transition-all disabled:opacity-20 hover:scale-105"
              style={{ background: '#0B1218', border: '1px solid #1B2A33' }}
              aria-label="Next"
            >
              <ChevronDown className="h-6 w-6 text-white" />
            </button>
          </div>

          {/* Video — 16:9, constrained by both width and height */}
          <div className="flex-1 flex items-center justify-center w-full min-h-0 px-16 pt-2">
            <div
              className="relative rounded-2xl overflow-hidden bg-black w-full"
              style={{ aspectRatio: '16/9', maxHeight: '100%', isolation: 'isolate' }}
            >
              <VideoPlayer
                key={clip.id}
                videoUrl={clip.videoUrl || ''}
                thumbnailUrl={clip.thumbnailUrl || undefined}
                autoPlay={true}
                disableAspectRatio={true}
                objectFit="contain"
                transparentBg={true}
                autoHideControls={true}
                className="w-full h-full"
                clipId={clip.id}
              />
            </div>
          </div>

          {/* Creator info — below the video, left-aligned */}
          <div className="flex items-center gap-3 flex-shrink-0 px-16 pt-2 pb-1">
            <div
              className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border-2"
              style={{ borderColor: 'rgba(183,255,26,0.5)' }}
            >
              {clip.user.avatarUrl ? (
                <img src={clip.user.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-[#1B2A33] flex items-center justify-center">
                  <UserIcon className="h-4 w-4 text-white/60" />
                </div>
              )}
            </div>
            <ProfileHoverCard username={clip.user.username}>
            <div className="min-w-0 flex-1 cursor-default">
              <div className="flex items-center gap-2 flex-wrap">
                <Link href={`/profile/${clip.user.username}`} onClick={onClose}>
                  <span className="text-white font-semibold text-sm hover:text-[#B7FF1A] transition-colors">
                    {clip.user.displayName || clip.user.username}
                  </span>
                </Link>
                <span className="text-white/45 text-xs">@{clip.user.username}</span>
                {clip.game && (
                  <Link
                    href={`/games/${gameSlug}`}
                    className="inline-block text-[#071013] text-[10px] px-2 py-0.5 rounded font-bold hover:opacity-80 transition-opacity"
                    style={{ background: '#B7FF1A' }}
                    onClick={onClose}
                  >
                    {clip.game.name}
                  </Link>
                )}
              </div>
              {clip.title && (
                <p className="text-white/55 text-xs mt-0.5 line-clamp-1">{clip.title}</p>
              )}
            </div>
            </ProfileHoverCard>
          </div>

          {/* Horizontal engagement row */}
          <div
            className="flex items-center justify-center gap-5 flex-shrink-0 px-4"
            style={{ paddingTop: '6px', paddingBottom: '14px' }}
          >
            <LikeButton
              contentId={clip.id}
              contentType="clip"
              contentOwnerId={clip.user.id}
              initialLiked={(clip as any).isLiked ?? false}
              initialCount={likes}
              size="sm"
              variant="horizontal"
              showCount={true}
            />
            <FireButton
              contentId={clip.id}
              contentType="clip"
              contentOwnerId={clip.user.id}
              initialFired={(clip as any).isFired ?? false}
              initialCount={fires}
              size="sm"
              variant="horizontal"
              showCount={true}
            />
            {/* Comments toggle */}
            <button
              className="flex items-center gap-2 group"
              onClick={() => setShowComments(v => !v)}
              aria-label="Toggle comments"
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all group-hover:scale-105"
                style={showComments
                  ? { background: 'rgba(183,255,26,0.15)', border: '1px solid #B7FF1A' }
                  : { background: '#0B1218', border: '1px solid #1B2A33' }
                }
              >
                <MessageCircle className="h-4 w-4" style={{ color: showComments ? '#B7FF1A' : 'rgba(255,255,255,0.7)' }} />
              </div>
              <span className="text-sm font-medium" style={{ color: showComments ? '#B7FF1A' : 'rgba(255,255,255,0.5)' }}>
                {fmt(comments)}
              </span>
            </button>
            {/* Views */}
            <div className="flex items-center gap-2">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: '#0B1218', border: '1px solid #1B2A33' }}
              >
                <BarChart2 className="h-4 w-4 text-white/70" />
              </div>
              <span className="text-sm font-medium text-white/50">{fmt(views)}</span>
            </div>
            {/* Share */}
            <button
              className="flex items-center gap-2 group"
              onClick={() => setShowShareDialog(true)}
              aria-label="Share"
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all group-hover:scale-105"
                style={{ background: '#0B1218', border: '1px solid #1B2A33' }}
              >
                <ShareLaunchIcon className="h-4 w-4 text-white/70" />
              </div>
            </button>
            {/* 3-dot menu */}
            <div onClick={(e) => e.stopPropagation()}>
              <TrendingClipMenu clip={clip} />
            </div>
            {/* Eye filter — sits inline with icons; flyout opens rightward */}
            <div className="relative" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => { setShowContentDropdown(false); setShowTimeDropdown(false); setControlsVisible(v => !v); }}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
                style={{
                  border: `2px solid ${controlsVisible ? '#B7FF1A' : 'rgba(100,116,139,0.5)'}`,
                  background: controlsVisible ? 'rgba(183,255,26,0.12)' : 'rgba(30,41,59,0.5)',
                }}
              >
                <Eye className="h-5 w-5" style={{ color: controlsVisible ? '#B7FF1A' : 'rgba(100,116,139,0.7)' }} />
              </button>

              {controlsVisible && (
                <div
                  className="absolute left-full ml-2 top-1/2 -translate-y-1/2 flex flex-row items-center gap-2"
                  style={{ pointerEvents: 'auto' }}
                >
                  {/* Gamepad */}
                  <button
                    onClick={() => { setControlsVisible(false); onOpenGameFilter(); }}
                    className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-105"
                    style={pillBase(!!selectedGameId)}
                    title={selectedGameId ? selectedGameName || 'Game filter' : 'Filter by game'}
                  >
                    <Gamepad2 className="h-5 w-5" />
                  </button>

                  {/* Clock */}
                  <div className="relative">
                    <button
                      onClick={() => { setShowTimeDropdown(v => !v); setShowContentDropdown(false); }}
                      className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-105"
                      style={pillBase(showTimeDropdown)}
                    >
                      <Clock className="h-5 w-5" />
                    </button>
                    {showTimeDropdown && (
                      <div
                        className="absolute bottom-full mb-1.5 right-0 rounded-xl overflow-hidden min-w-[148px] z-50"
                        style={{ background: 'rgba(19,31,42,0.97)', border: '1px solid rgba(183,255,26,0.25)' }}
                      >
                        <p className="px-3.5 py-2 text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.35)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>Time Period</p>
                        {(Object.entries(timeMeta) as [TimePeriod, string][]).map(([period, label]) => (
                          <button
                            key={period}
                            className="flex items-center gap-2.5 px-3.5 py-2.5 w-full text-left text-xs font-medium"
                            style={timePeriod === period ? { background: 'rgba(183,255,26,0.15)', color: '#B7FF1A' } : { color: '#B8C0AE' }}
                            onClick={() => { onTimePeriodChange(period); setShowTimeDropdown(false); setControlsVisible(false); }}
                          >
                            {label}
                            {timePeriod === period && <Check className="h-3 w-3 ml-auto" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Content type pill */}
                  <div className="relative">
                    <button
                      onClick={() => { setShowContentDropdown(v => !v); setShowTimeDropdown(false); }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold transition-all hover:scale-105"
                      style={pillBase(showContentDropdown)}
                    >
                      <ActiveIcon className="h-3.5 w-3.5 flex-shrink-0" />
                      {activeLabel}
                      <ChevronDown className="h-3 w-3 flex-shrink-0" />
                    </button>
                    {showContentDropdown && (
                      <div
                        className="absolute bottom-full mb-1.5 right-0 rounded-xl overflow-hidden min-w-[155px] z-50"
                        style={{ background: 'rgba(19,31,42,0.97)', border: '1px solid rgba(183,255,26,0.25)' }}
                      >
                        {(Object.entries(contentMeta) as [ContentType, { label: string; Icon: React.ElementType }][]).map(([type, { label, Icon }]) => (
                          <button
                            key={type}
                            className="flex items-center gap-3 px-3.5 py-2.5 w-full text-left text-xs font-medium"
                            style={activeTab === type ? { background: 'rgba(183,255,26,0.15)', color: '#B7FF1A' } : { color: '#B8C0AE' }}
                            onClick={() => { onTabChange(type); setShowContentDropdown(false); setControlsVisible(false); }}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            {label}
                            {activeTab === type && <Check className="h-3 w-3 ml-auto" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ── PORTRAIT layout (Reels): video | right floating column ── */
        <div key={currentIndex} className={`flex w-full h-full items-center justify-center ${slideDir === 'up' ? 'dsv-slide-up' : 'dsv-slide-down'}`}>
          {/* Outer row — video left, right column no background */}
          <div className="flex items-end gap-5 px-6" style={{ height: '100%', paddingBottom: '28px' }}>

            {/* Video — 9:16, fills available height */}
            <div
              className="relative rounded-2xl overflow-hidden bg-black flex-shrink-0"
              style={{ height: '100%', aspectRatio: '9/16', isolation: 'isolate' }}
            >
              <VideoPlayer
                key={clip.id}
                videoUrl={clip.videoUrl || ''}
                thumbnailUrl={clip.thumbnailUrl || undefined}
                autoPlay={true}
                disableAspectRatio={true}
                objectFit="contain"
                transparentBg={true}
                autoHideControls={true}
                className="w-full h-full"
                clipId={clip.id}
              />
            </div>

            {/* ── Right column — no background, floating ── */}
            <div className="flex flex-col items-center gap-4 flex-shrink-0 pb-1" style={{ minWidth: '56px' }}>

              {/* Eye — top of column, toggles horizontal filter bar */}
              <div className="relative" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => { setShowContentDropdown(false); setShowTimeDropdown(false); setControlsVisible(v => !v); }}
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
                  style={{
                    border: `2px solid ${controlsVisible ? '#B7FF1A' : 'rgba(100,116,139,0.5)'}`,
                    background: controlsVisible ? 'rgba(183,255,26,0.12)' : 'rgba(30,41,59,0.5)',
                  }}
                >
                  <Eye className="h-5 w-5" style={{ color: controlsVisible ? '#B7FF1A' : 'rgba(100,116,139,0.7)' }} />
                </button>

                {/* Horizontal flyout — expands to the RIGHT of Eye when open */}
                {controlsVisible && (
                  <div
                    className="absolute top-0 left-full ml-2 flex flex-row items-center gap-2"
                    style={{ pointerEvents: 'auto' }}
                  >
                    {/* Gamepad */}
                    <button
                      onClick={() => { setControlsVisible(false); onOpenGameFilter(); }}
                      className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-105"
                      style={pillBase(!!selectedGameId)}
                      title={selectedGameId ? selectedGameName || 'Game filter' : 'Filter by game'}
                    >
                      <Gamepad2 className="h-5 w-5" />
                    </button>

                    {/* Clock */}
                    <div className="relative">
                      <button
                        onClick={() => { setShowTimeDropdown(v => !v); setShowContentDropdown(false); }}
                        className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-105"
                        style={pillBase(showTimeDropdown)}
                      >
                        <Clock className="h-5 w-5" />
                      </button>
                      {showTimeDropdown && (
                        <div
                          className="absolute top-full mt-1.5 right-0 rounded-xl overflow-hidden min-w-[148px] z-50"
                          style={{ background: 'rgba(19,31,42,0.97)', border: '1px solid rgba(183,255,26,0.25)' }}
                        >
                          <p className="px-3.5 py-2 text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.35)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>Time Period</p>
                          {(Object.entries(timeMeta) as [TimePeriod, string][]).map(([period, label]) => (
                            <button
                              key={period}
                              className="flex items-center gap-2.5 px-3.5 py-2.5 w-full text-left text-xs font-medium"
                              style={timePeriod === period ? { background: 'rgba(183,255,26,0.15)', color: '#B7FF1A' } : { color: '#B8C0AE' }}
                              onClick={() => { onTimePeriodChange(period); setShowTimeDropdown(false); }}
                            >
                              {label}
                              {timePeriod === period && <Check className="h-3 w-3 ml-auto" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Content type pill */}
                    <div className="relative">
                      <button
                        onClick={() => { setShowContentDropdown(v => !v); setShowTimeDropdown(false); }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold transition-all hover:scale-105"
                        style={pillBase(showContentDropdown)}
                      >
                        <ActiveIcon className="h-3.5 w-3.5 flex-shrink-0" />
                        {activeLabel}
                        <ChevronDown className="h-3 w-3 flex-shrink-0" />
                      </button>
                      {showContentDropdown && (
                        <div
                          className="absolute top-full mt-1.5 right-0 rounded-xl overflow-hidden min-w-[155px] z-50"
                          style={{ background: 'rgba(19,31,42,0.97)', border: '1px solid rgba(183,255,26,0.25)' }}
                        >
                          {(Object.entries(contentMeta) as [ContentType, { label: string; Icon: React.ElementType }][]).map(([type, { label, Icon }]) => (
                            <button
                              key={type}
                              className="flex items-center gap-3 px-3.5 py-2.5 w-full text-left text-xs font-medium"
                              style={activeTab === type ? { background: 'rgba(183,255,26,0.15)', color: '#B7FF1A' } : { color: '#B8C0AE' }}
                              onClick={() => { onTabChange(type); setShowContentDropdown(false); setControlsVisible(false); }}
                            >
                              <Icon className="h-3.5 w-3.5" />
                              {label}
                              {activeTab === type && <Check className="h-3 w-3 ml-auto" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 3-dot menu — swapped up, directly below Eye */}
              <div onClick={(e) => e.stopPropagation()}>
                <TrendingClipMenu clip={clip} />
              </div>

              {/* Engagement icons */}
              <LikeButton
                contentId={clip.id}
                contentType="clip"
                contentOwnerId={clip.user.id}
                initialLiked={(clip as any).isLiked ?? false}
                initialCount={likes}
                size="sm"
                variant="vertical"
                showCount={true}
              />
              <FireButton
                contentId={clip.id}
                contentType="clip"
                contentOwnerId={clip.user.id}
                initialFired={(clip as any).isFired ?? false}
                initialCount={fires}
                size="sm"
                variant="vertical"
                showCount={true}
              />
              <button
                className="flex flex-col items-center gap-1 group"
                onClick={() => setShowComments(v => !v)}
                aria-label="Toggle comments"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-all group-hover:scale-105"
                  style={showComments
                    ? { background: 'rgba(183,255,26,0.15)', border: '1px solid #B7FF1A' }
                    : { background: '#0B1218', border: '1px solid #1B2A33' }
                  }
                >
                  <MessageCircle className="h-5 w-5" style={{ color: showComments ? '#B7FF1A' : 'rgba(255,255,255,0.7)' }} />
                </div>
                <span className="text-[11px] font-medium" style={{ color: showComments ? '#B7FF1A' : 'rgba(255,255,255,0.5)' }}>
                  {fmt(comments)}
                </span>
              </button>
              <div className="flex flex-col items-center gap-1">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: '#0B1218', border: '1px solid #1B2A33' }}
                >
                  <BarChart2 className="h-5 w-5 text-white/70" />
                </div>
                <span className="text-white/50 text-[11px] font-medium">{fmt(views)}</span>
              </div>

              {/* Share */}
              <button
                className="flex flex-col items-center gap-1 group"
                onClick={() => setShowShareDialog(true)}
                aria-label="Share"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-all group-hover:scale-105"
                  style={{ background: '#0B1218', border: '1px solid #1B2A33' }}
                >
                  <ShareLaunchIcon className="h-5 w-5 text-white/70" />
                </div>
              </button>

              {/* Creator info — fixed layout width (56px) so it doesn't widen the column; visual content overflows right */}
              <div
                className="flex flex-row items-center gap-3"
                style={{ alignSelf: 'flex-start', width: '56px', overflow: 'visible', whiteSpace: 'nowrap' }}
              >
                {/* Avatar — anchored in column on the left */}
                <Link href={`/profile/${clip.user.username}`} onClick={onClose}>
                  <div
                    className="w-11 h-11 rounded-full overflow-hidden border-2 flex-shrink-0 hover:scale-105 transition-transform"
                    style={{ borderColor: '#B7FF1A' }}
                  >
                    {clip.user.avatarUrl ? (
                      <img src={clip.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-[#1B2A33] flex items-center justify-center">
                        <UserIcon className="h-5 w-5 text-white/60" />
                      </div>
                    )}
                  </div>
                </Link>
                {/* Text flows to the right */}
                <ProfileHoverCard username={clip.user.username}>
                <div className="flex flex-col gap-1 items-start cursor-default">
                  <Link href={`/profile/${clip.user.username}`} onClick={onClose}>
                    <p className="text-white font-bold text-sm hover:text-[#B7FF1A] transition-colors leading-tight">
                      {clip.user.displayName || clip.user.username}
                    </p>
                  </Link>
                  {clip.title && (
                    <p className="text-white/60 text-xs leading-snug">{clip.title}</p>
                  )}
                  {clip.game && (
                    <Link
                      href={`/games/${gameSlug}`}
                      className="inline-block text-[#071013] text-[10px] px-2 py-0.5 rounded font-bold hover:opacity-80 transition-opacity"
                      style={{ background: '#B7FF1A' }}
                      onClick={onClose}
                    >
                      {clip.game.name}
                    </Link>
                  )}
                </div>
                </ProfileHoverCard>
              </div>
            </div>
          </div>

          {/* Nav arrows — restored to absolute right edge, vertically centred */}
          <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col items-center gap-3 z-20">
            <button
              onClick={goPrev}
              disabled={currentIndex === 0}
              className="w-12 h-12 rounded-full flex items-center justify-center transition-all disabled:opacity-20 hover:scale-105"
              style={{ background: '#0B1218', border: '1px solid #1B2A33' }}
              aria-label="Previous"
            >
              <ChevronUp className="h-6 w-6 text-white" />
            </button>
            <button
              onClick={goNext}
              disabled={currentIndex === clips.length - 1}
              className="w-12 h-12 rounded-full flex items-center justify-center transition-all disabled:opacity-20 hover:scale-105"
              style={{ background: '#0B1218', border: '1px solid #1B2A33' }}
              aria-label="Next"
            >
              <ChevronDown className="h-6 w-6 text-white" />
            </button>
          </div>
        </div>
      )}

      </div>

      <ClipShareDialog
        clipId={clip.id}
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
      />
    </div>
  );
};

const TrendingPage: React.FC = () => {
  const { user } = useAuth();
  const isMobile = useMobile();
  const { openClipDialog } = useClipDialog();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<ContentType>('reels');
  const [filter, setFilter] = useState<FilterType>('likes');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('recent');
  const [showMobileViewer, setShowMobileViewer] = useState(false);
  const [showContentDropdown, setShowContentDropdown] = useState(false);
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  const [showGameFilter, setShowGameFilter] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);
  const [selectedGameName, setSelectedGameName] = useState<string | null>(null);
  const [gameSearchQuery, setGameSearchQuery] = useState('');
  const [debouncedGameQuery, setDebouncedGameQuery] = useState('');
  const [selectedScreenshot, setSelectedScreenshot] = useState<ScreenshotWithUser | null>(null);
  const { signedUrl: screenshotSignedUrl } = useSignedUrl(selectedScreenshot?.imageUrl);
  const [ageRestrictionAccepted, setAgeRestrictionAccepted] = useState(false);
  const [showAgeRestrictionDialog, setShowAgeRestrictionDialog] = useState(false);
  const [isFollowingAuthor, setIsFollowingAuthor] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const isAcceptingRef = useRef(false);
  const screenshotsScrollRef = useRef<HTMLDivElement>(null);
  const [screenshotsDragging, setScreenshotsDragging] = useState(false);
  const [screenshotsDragStart, setScreenshotsDragStart] = useState(0);
  const [screenshotsScrollStart, setScreenshotsScrollStart] = useState(0);
  const [screenshotsTouchStart, setScreenshotsTouchStart] = useState(0);
  const [screenshotsTouchScrollStart, setScreenshotsTouchScrollStart] = useState(0);
  const [desktopShortsOpen, setDesktopShortsOpen] = useState(false);
  const [desktopShortsIndex, setDesktopShortsIndex] = useState(0);
  const [desktopShortsClips, setDesktopShortsClips] = useState<ClipWithUser[]>([]);
  const [desktopShortsLandscape, setDesktopShortsLandscape] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch follow status when screenshot is selected
  const { data: followStatus } = useQuery({
    queryKey: ['/api/users', selectedScreenshot?.user?.username, 'follow-status'],
    queryFn: async () => {
      const response = await fetch(`/api/users/${selectedScreenshot?.user?.username}/follow-status`, { credentials: 'include' });
      if (!response.ok) return { following: false, requested: false };
      return response.json();
    },
    enabled: !!selectedScreenshot?.user?.username && !!user && selectedScreenshot.user.id !== user.id,
  });

  // Sync follow status from server
  useEffect(() => {
    if (followStatus) {
      setIsFollowingAuthor(followStatus.following || followStatus.requested || false);
    }
  }, [followStatus]);

  // Debounce game search query for filter modal
  useEffect(() => {
    const t = setTimeout(() => setDebouncedGameQuery(gameSearchQuery), 300);
    return () => clearTimeout(t);
  }, [gameSearchQuery]);

  // Game search results for filter modal
  const { data: gameSearchResults, isLoading: isGameSearchLoading } = useQuery<{ id: number; name: string; imageUrl?: string }[]>({
    queryKey: ['/api/twitch/games/search', debouncedGameQuery],
    queryFn: async () => {
      if (debouncedGameQuery.length < 2) return [];
      const res = await fetch(`/api/twitch/games/search?q=${encodeURIComponent(debouncedGameQuery)}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.map((g: any) => ({ id: g.id, name: g.name, imageUrl: g.imageUrl || g.box_art_url }));
    },
    enabled: debouncedGameQuery.length >= 2,
    staleTime: 60000,
  });

  // Follow/unfollow mutation
  const followMutation = useMutation({
    mutationFn: async (targetUsername: string) => {
      if (isFollowingAuthor) {
        await apiRequest('DELETE', `/api/users/${targetUsername}/follow`);
        return { following: false };
      } else {
        const data = await apiRequest('POST', `/api/users/${targetUsername}/follow`);
        return { following: data.status === 'following' };
      }
    },
    onMutate: () => {
      // Optimistic update — flip immediately so UI feels instant
      setIsFollowingAuthor(prev => !prev);
    },
    onSuccess: (data) => {
      setIsFollowingAuthor(data.following);
      queryClient.invalidateQueries({ queryKey: ['/api/users', selectedScreenshot?.user?.username, 'follow-status'] });
    },
    onError: (error: Error) => {
      // Roll back on failure
      setIsFollowingAuthor(prev => !prev);
      toast({
        title: "Action failed",
        description: error.message || "Failed to update follow status",
        variant: "gamefolioError",
      });
    },
  });

  // Check for age restriction when screenshot is selected
  useEffect(() => {
    if (selectedScreenshot && (selectedScreenshot as any).ageRestricted && !ageRestrictionAccepted) {
      setShowAgeRestrictionDialog(true);
    }
  }, [selectedScreenshot, ageRestrictionAccepted]);

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

  // Reset age restriction and follow state when screenshot dialog is closed
  useEffect(() => {
    if (!selectedScreenshot) {
      setAgeRestrictionAccepted(false);
      setShowAgeRestrictionDialog(false);
      setIsFollowingAuthor(false);
      isAcceptingRef.current = false; // Reset accepting flag
    }
  }, [selectedScreenshot]);

  // Delete screenshot mutation
  const deleteScreenshotMutation = useMutation({
    mutationFn: async (screenshotId: number) => {
      const response = await apiRequest('DELETE', `/api/screenshots/${screenshotId}`);
      return response;
    },
    onSuccess: () => {
      // Invalidate trending screenshots to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['/api/trending/screenshots'] });
      setSelectedScreenshot(null); // Close the modal
      toast({
        title: "Screenshot deleted",
        description: "Your screenshot has been deleted successfully.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete screenshot. Please try again.",
        variant: "gamefolioError",
      });
    },
  });

  // Fetch trending clips using the working endpoint
  const { data: trendingClips, isLoading: isLoadingClips } = useQuery<ClipWithUser[]>({
    queryKey: ['/api/clips/trending', timePeriod, selectedGameId],
    queryFn: async () => {
      const params = new URLSearchParams({ period: timePeriod, limit: '20' });
      if (selectedGameId) params.set('gameId', String(selectedGameId));
      const response = await fetch(`/api/clips/trending?${params}`);
      if (!response.ok) throw new Error('Failed to fetch trending clips');
      return response.json();
    },
    enabled: activeTab === 'clips' || (isMobile && showMobileViewer),
  });

  // Fetch trending reels using the trending reels endpoint with period support
  const { data: trendingReels, isLoading: isLoadingReels } = useQuery<ClipWithUser[]>({
    queryKey: ['/api/reels/trending', timePeriod, selectedGameId],
    queryFn: async () => {
      const params = new URLSearchParams({ period: timePeriod, limit: '40' });
      if (selectedGameId) params.set('gameId', String(selectedGameId));
      const response = await fetch(`/api/reels/trending?${params}`);
      if (!response.ok) throw new Error('Failed to fetch trending reels');
      return response.json();
    },
    enabled: activeTab === 'reels' || (isMobile && showMobileViewer),
  });

  // Fetch trending screenshots using the working API endpoint
  const { data: trendingScreenshots, isLoading: isLoadingScreenshots } = useQuery<ScreenshotWithUser[]>({
    queryKey: ['/api/trending/screenshots', timePeriod, selectedGameId],
    queryFn: async () => {
      const params = new URLSearchParams({ period: timePeriod, limit: '40' });
      if (selectedGameId) params.set('gameId', String(selectedGameId));
      const response = await fetch(`/api/trending/screenshots?${params}`);
      if (!response.ok) throw new Error('Failed to fetch trending screenshots');
      return response.json();
    },
    enabled: activeTab === 'screenshots' || (isMobile && showMobileViewer),
  });

  // All games across every tab — collected from all three sources
  const [availableGames, setAvailableGames] = useState<{ id: number; name: string; imageUrl?: string }[]>([]);
  // Game IDs that have content in the currently active tab (others are greyed out)
  const [activeTabGameIds, setActiveTabGameIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    // Rebuild full cross-tab list only when no filter is active (so the picker persists while filtered)
    if (selectedGameId !== null) return;
    const allSeen = new Map<number, { id: number; name: string; imageUrl?: string }>();
    for (const item of [...(trendingClips || []), ...(trendingReels || []), ...(trendingScreenshots || [])]) {
      const g = (item as any).game;
      if (g?.id && g?.name) allSeen.set(g.id, { id: g.id, name: g.name, imageUrl: g.imageUrl ?? undefined });
    }
    const games = Array.from(allSeen.values());
    if (games.length > 0) setAvailableGames(games);
  }, [trendingClips, trendingReels, trendingScreenshots, selectedGameId]);

  useEffect(() => {
    // Always track which games are in the current tab so we can grey out the rest
    const currentSources =
      activeTab === 'clips'  ? (trendingClips      || []) :
      activeTab === 'reels'  ? (trendingReels       || []) :
                               (trendingScreenshots || []);
    const ids = new Set<number>();
    for (const item of currentSources) {
      const g = (item as any).game;
      if (g?.id) ids.add(g.id);
    }
    setActiveTabGameIds(ids);
  }, [activeTab, trendingClips, trendingReels, trendingScreenshots]);

  const handleTabChange = useCallback((value: string) => {
    const tab = value as ContentType;
    setActiveTab(tab);
    if (!isMobile) {
      if (tab === 'reels' && trendingReels?.length) {
        setDesktopShortsLandscape(false);
        setDesktopShortsClips(trendingReels);
        setDesktopShortsIndex(0);
        setDesktopShortsOpen(true);
      } else if (tab === 'clips' && trendingClips?.length) {
        setDesktopShortsLandscape(true);
        setDesktopShortsClips(trendingClips);
        setDesktopShortsIndex(0);
        setDesktopShortsOpen(true);
      } else if (tab === 'screenshots' && trendingScreenshots?.length) {
        setSelectedScreenshot(trendingScreenshots[0] as ScreenshotWithUser);
      }
    }
  }, [isMobile, trendingReels, trendingClips, trendingScreenshots]);

  const getPeriodIcon = (period: TimePeriod) => {
    switch (period) {
      case 'recent': return <Clock className="h-4 w-4" />;
      case '1w': return <Calendar className="h-4 w-4" />;
      case '1m': return <Calendar className="h-4 w-4" />;
      case 'ever': return <CalendarDays className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getPeriodLabel = (period: TimePeriod) => {
    switch (period) {
      case 'recent': return 'Most Recent';
      case '1w': return '1W';
      case '1m': return '1M';
      case 'ever': return 'Ever';
      default: return 'Most Recent';
    }
  };

  // Get content for active tab only
  const getActiveTabContent = (): (ClipWithUser | ScreenshotWithUser)[] => {
    switch (activeTab) {
      case 'clips':
        return trendingClips || [];
      case 'reels':
        return trendingReels || [];
      case 'screenshots':
        return trendingScreenshots || [];
      default:
        return [];
    }
  };

  const renderContent = () => {
    const isLoading = activeTab === 'clips' ? isLoadingClips : 
                     activeTab === 'reels' ? isLoadingReels : 
                     isLoadingScreenshots;

    if (isLoading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array(8).fill(0).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-video w-full rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      );
    }

    if (activeTab === 'screenshots') {
      if (!trendingScreenshots?.length) {
        return (
          <div className="text-center py-12">
            <Gamepad2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No trending screenshots</h3>
            <p className="text-muted-foreground">Check back later for trending screenshots!</p>
          </div>
        );
      }

      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pb-20">
          {trendingScreenshots.map((screenshot) => (
            <ScreenshotCard
              key={screenshot.id}
              screenshot={screenshot}
              isOwnProfile={user?.id === screenshot.userId}
              profile={screenshot.user}
              onDelete={(id) => deleteScreenshotMutation.mutate(id)}
              onSelect={setSelectedScreenshot}
              showUserInfo={true}
            />
          ))}
        </div>
      );
    }

    if (activeTab === 'reels') {
      if (!trendingReels?.length) {
        return (
          <div className="text-center py-12">
            <TrendingUp className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No trending reels</h3>
            <p className="text-muted-foreground">Check back later for trending reels!</p>
          </div>
        );
      }

      // Mobile: Instagram/TikTok style 2-column masonry grid - tapping opens fullscreen vertical swipe viewer
      if (isMobile) {
        const formatNumber = (num: number) => {
          if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
          if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
          return num.toString();
        };
        
        return (
          <>
            <div className="grid grid-cols-2 gap-1">
              {trendingReels.map((reel) => {
                return (
                  <div
                    key={reel.id}
                    onClick={() => openClipDialog(reel.id, trendingReels, undefined, 'reel')}
                    className="w-full"
                  >
                    <div className="relative aspect-[9/16] w-full rounded-sm overflow-hidden cursor-pointer group">
                      <div className="absolute inset-0 bg-gray-800" />
                      <LazyImage
                        src={reel.thumbnailUrl || `/api/clips/${reel.id}/thumbnail`}
                        alt={reel.title}
                        className="w-full h-full object-cover"
                        placeholder="data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='100'%20height='100'%3e%3crect%20width='100'%20height='100'%20fill='%231f2937'/%3e%3c/svg%3e"
                        showLoadingSpinner={true}
                        rootMargin="50px"
                        containerClassName="absolute inset-0"
                        fallback={
                          <div className="w-full h-full flex items-center justify-center bg-gray-800">
                            <Play className="h-8 w-8 text-gray-500" />
                          </div>
                        }
                      />
                      
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
                      
                      <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded font-semibold">
                        {(() => {
                          const actualDuration = reel.trimEnd && reel.trimEnd > 0 
                            ? reel.trimEnd - (reel.trimStart || 0)
                            : reel.duration || 0;
                          return formatDuration(actualDuration);
                        })()}
                      </div>
                      
                      <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded font-semibold flex items-center gap-1">
                        <BarChart2 className="h-3 w-3" />
                        {formatNumber(reel.views || 0)}
                      </div>
                      
                      <div className="absolute bottom-0 left-0 right-0 p-2">
                        <h3 className="text-white font-bold text-xs mb-0.5 drop-shadow-lg line-clamp-2">
                          {reel.title}
                        </h3>
                        <ProfileHoverCard username={reel.user.username}>
                          <p className="text-white text-[10px] mb-1 drop-shadow-lg cursor-default">
                            @{reel.user.username}
                          </p>
                        </ProfileHoverCard>
                        {reel.game && (
                          <Link
                            href={`/games/${reel.game.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-block bg-primary text-[#071013] text-[9px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap max-w-full overflow-hidden text-ellipsis hover:opacity-80 transition-opacity"
                          >
                            {reel.game.name}
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        );
      }

      // Desktop: multi-row grid — clicking opens the Shorts viewer
      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 w-full pb-20">
          {trendingReels.map((reel) => (
            <ReelCard
              key={reel.id}
              reel={reel}
              reelsList={trendingReels}
              onOpenViewer={(index) => {
                setDesktopShortsLandscape(false);
                setDesktopShortsClips(trendingReels);
                setDesktopShortsIndex(index);
                setDesktopShortsOpen(true);
              }}
            />
          ))}
        </div>
      );
    }

    // For clips
    if (!trendingClips?.length) {
      return (
        <div className="text-center py-12">
          <TrendingUp className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No trending clips</h3>
          <p className="text-muted-foreground">Check back later for trending content!</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pb-20">
        {trendingClips.map((clip) => (
          <VideoClipGridItem
            key={clip.id}
            clip={clip}
            userId={user?.id}
            clipsList={trendingClips}
            onCardClick={(clipId, clips) => {
              const idx = clips.findIndex(c => c.id === clipId);
              setDesktopShortsLandscape(true);
              setDesktopShortsClips(clips);
              setDesktopShortsIndex(idx >= 0 ? idx : 0);
              setDesktopShortsOpen(true);
            }}
          />
        ))}
      </div>
    );
  };

  const activeTabContent = getActiveTabContent();

  // Auto-open mobile viewer when on mobile and switching tabs with content
  useEffect(() => {
    if (isMobile && activeTabContent.length > 0) {
      setShowMobileViewer(true);
    }
  }, [isMobile, activeTab, activeTabContent.length]);

  // ── Mobile: full-screen immersive layout matching mobile app ─────────────
  if (isMobile) {
    const contentMeta: Record<ContentType, { label: string; Icon: React.ElementType }> = {
      reels:       { label: 'Reels',       Icon: Film   },
      clips:       { label: 'Clips',       Icon: Video  },
      screenshots: { label: 'Screenshots', Icon: Camera },
    };
    const timeMeta: Record<TimePeriod, string> = {
      recent: 'Most Recent',
      '1w':   '1 Week',
      '1m':   '1 Month',
      ever:   'All Time',
    };
    const activeContent: any[] =
      activeTab === 'clips'       ? (trendingClips       || []) :
      activeTab === 'reels'       ? (trendingReels        || []) :
                                    (trendingScreenshots  || []);
    const isLoadingContent =
      activeTab === 'clips' ? isLoadingClips :
      activeTab === 'reels' ? isLoadingReels : isLoadingScreenshots;

    const { label: activeLabel, Icon: ActiveIcon } = contentMeta[activeTab];

    return (
      <>
        {/* ── CLIPS: X/Twitter-style scrollable inline clip feed ───────── */}
        {activeTab === 'clips' && (
          <div style={{ background: '#000', minHeight: '100dvh' }}>
            {isLoadingClips ? (
              /* Skeleton */
              <div className="flex flex-col pb-24">
                {Array(2).fill(0).map((_, i) => (
                  <div key={i} className="border-b border-white/8">
                    <Skeleton className="w-full aspect-video rounded-none" style={{ background: '#111' }} />
                    <div className="px-4 pt-3 pb-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <Skeleton className="w-9 h-9 rounded-full flex-shrink-0" style={{ background: '#222' }} />
                        <div className="flex-1 space-y-1">
                          <Skeleton className="h-3.5 w-32" style={{ background: '#222' }} />
                          <Skeleton className="h-3 w-20" style={{ background: '#222' }} />
                        </div>
                      </div>
                      <Skeleton className="h-4 w-full" style={{ background: '#222' }} />
                      <Skeleton className="h-3 w-2/3" style={{ background: '#222' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : !trendingClips?.length ? (
              <div className="flex flex-col items-center justify-center py-24 px-8">
                <TrendingUp className="h-14 w-14 mb-4" style={{ color: '#B7FF1A' }} />
                <p className="text-white font-semibold mb-1">No trending clips</p>
                <p className="text-white/50 text-sm text-center">Check back later!</p>
              </div>
            ) : (
              <MobileClipsViewer clips={trendingClips} viewAllHref="/trending" onBack={() => setLocation('/')} />
            )}
          </div>
        )}

        {/* ── SCREENSHOTS: X/Twitter-style scrollable feed (mirrors clips) ── */}
        {activeTab === 'screenshots' && activeContent.length > 0 && !isLoadingContent && (
          <MobileScreenshotsViewer
            key={`screenshots-${selectedGameId ?? 'all'}`}
            screenshots={trendingScreenshots || []}
            onBack={() => setLocation('/')}
          />
        )}

        {/* ── REELS: full-screen immersive TikTok-style viewer ─────────── */}
        {activeTab === 'reels' && activeContent.length > 0 && !isLoadingContent && (
          <MobileTrendingViewer
            key={`reels-${selectedGameId ?? 'all'}`}
            content={activeContent}
            onClose={() => setLocation('/')}
            hideCloseButton={true}
            onCommentsVisibilityChange={setCommentsOpen}
          />
        )}

        {/* Loading — reels / screenshots only */}
        {activeTab !== 'clips' && isLoadingContent && (
          <div className="fixed inset-0 z-[65] flex items-center justify-center" style={{ background: '#0B1218' }}>
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-[#B7FF1A] border-t-transparent rounded-full animate-spin" />
              <p className="text-white/60 text-sm">Loading {activeLabel.toLowerCase()}…</p>
            </div>
          </div>
        )}

        {/* Empty state — reels / screenshots only */}
        {activeTab !== 'clips' && !isLoadingContent && activeContent.length === 0 && (
          <div className="fixed inset-0 z-[65] flex items-center justify-center" style={{ background: '#0B1218' }}>
            <div className="text-center px-8">
              <TrendingUp className="h-14 w-14 mx-auto mb-4" style={{ color: '#B7FF1A' }} />
              <p className="text-white font-semibold mb-1">No trending {activeLabel.toLowerCase()}</p>
              <p className="text-white/50 text-sm">Check back later!</p>
            </div>
          </div>
        )}

        {/* Floating controls — horizontal row that opens to the LEFT of the Eye on every tab */}
        {(() => {
          // Horizontal-left menu now used on every tab (clips, reels, screenshots).
          // Variable name kept for minimal diff; effectively means "use horizontal layout".
          const isClipsMode = true;
          // Slide-in transform direction depends on layout
          const hiddenTransform = isClipsMode ? 'translateX(20px)' : 'translateY(-8px)';
          const visibleTransform = 'translate(0, 0)';
          const itemTransition = 'opacity 0.22s ease, transform 0.25s ease';
          // CSS order — only matters in clips (horizontal) mode; arranges visual L→R as Gamepad, Clock, Clips ▼, Eye
          const orderEye         = isClipsMode ? 4 : 0;
          const orderContentPill = isClipsMode ? 3 : 0;
          const orderClock       = isClipsMode ? 2 : 0;
          const orderGamepad     = isClipsMode ? 1 : 0;

          // Pill / circle base styles for clips-mode hover glow
          const pillBaseStyle = (active: boolean) => ({
            background: active ? 'rgba(183,255,26,0.18)' : '#0B1218',
            border: `1px solid ${active ? '#B7FF1A' : '#1B2A33'}`,
            color: '#F5F7F2',
            boxShadow: active ? '0 0 0 1px rgba(183,255,26,0.25), 0 0 12px rgba(183,255,26,0.18)' : 'none',
          });

          return (
        <div
          className={`fixed z-[100002] flex gap-2 ${
            isClipsMode
              ? 'flex-row items-center flex-wrap-reverse justify-end max-w-[calc(100vw-24px)]'
              : 'flex-col items-end'
          }`}
          style={{
            top: 'max(calc(env(safe-area-inset-top, 0px) + 12px), 56px)',
            right: 12,
            opacity: (activeTab !== 'clips' && commentsOpen) ? 0 : 1,
            pointerEvents: (activeTab !== 'clips' && commentsOpen) ? 'none' : 'auto',
            transition: 'opacity 0.2s',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 1. Eye circle — hidden from default UI; filter functionality preserved */}
          <button
            onClick={() => {
              setControlsVisible((v) => !v);
              setShowContentDropdown(false);
              setShowTimeDropdown(false);
              setShowGameFilter(false);
            }}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0"
            style={{
              border: `2px solid ${controlsVisible ? '#B7FF1A' : 'rgba(100,116,139,0.5)'}`,
              background: 'rgba(30,41,59,0.7)',
              order: orderEye,
            }}
          >
            <Eye className="h-5 w-5" style={{ color: controlsVisible ? '#B7FF1A' : 'rgba(100,116,139,0.7)' }} />
          </button>

          {/* 2. Content-type pill (Clips ▼) */}
          <div
            className="relative flex items-center justify-end flex-shrink-0"
            style={{
              opacity: controlsVisible ? 1 : 0,
              transform: controlsVisible ? visibleTransform : hiddenTransform,
              pointerEvents: controlsVisible ? 'auto' : 'none',
              maxWidth: controlsVisible ? '200px' : '0',
              overflow: controlsVisible ? 'visible' : 'hidden',
              transition: controlsVisible && isClipsMode
                ? `${itemTransition}, max-width 0.25s ease 60ms`
                : `${itemTransition}, max-width 0.25s ease`,
              order: orderContentPill,
            }}
          >
            <button
              onClick={() => { setShowContentDropdown(!showContentDropdown); setShowTimeDropdown(false); setShowGameFilter(false); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all hover:shadow-[0_0_12px_rgba(183,255,26,0.35)]"
              style={{ background: '#0B1218', border: 'none', color: '#F5F7F2' }}
            >
              <ActiveIcon className="h-3.5 w-3.5" />
              {activeLabel}
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {showContentDropdown && (
              <div
                className="absolute top-full mt-1.5 right-0 rounded-xl overflow-hidden min-w-[155px]"
                style={{ background: 'rgba(19,31,42,0.97)', border: '1px solid rgba(183, 255, 26,0.25)', zIndex: 90 }}
              >
                {(Object.entries(contentMeta) as [ContentType, { label: string; Icon: React.ElementType }][]).map(([type, { label, Icon }]) => (
                  <button
                    key={type}
                    className="flex items-center gap-3 px-3.5 py-2.5 w-full text-left text-xs font-medium"
                    style={activeTab === type ? { background: 'rgba(183, 255, 26,0.15)', color: '#B7FF1A' } : { color: '#B8C0AE' }}
                    onClick={() => { setActiveTab(type); setShowContentDropdown(false); }}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                    {activeTab === type && <Check className="h-3 w-3 ml-auto" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 3. Gamepad circle — hidden behind Eye toggle */}
          <div
            className="flex items-center justify-end flex-shrink-0"
            style={{
              opacity: controlsVisible ? 1 : 0,
              transform: controlsVisible ? visibleTransform : hiddenTransform,
              pointerEvents: controlsVisible ? 'auto' : 'none',
              maxWidth: controlsVisible ? '50px' : '0',
              overflow: 'hidden',
              transition: controlsVisible && isClipsMode
                ? `${itemTransition}, max-width 0.25s ease 180ms`
                : `${itemTransition}, max-width 0.25s ease`,
              order: orderGamepad,
            }}
          >
            <button
              onClick={() => { setShowGameFilter(true); setShowContentDropdown(false); setShowTimeDropdown(false); }}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:shadow-[0_0_12px_rgba(183,255,26,0.35)] flex-shrink-0"
              style={pillBaseStyle(!!selectedGameId)}
            >
              <Gamepad2 className="h-5 w-5" style={{ color: selectedGameId ? '#B7FF1A' : '#F5F7F2' }} />
            </button>
          </div>

          {/* 4. Clock circle */}
          <div
            className="relative flex items-center justify-end flex-shrink-0"
            style={{
              opacity: controlsVisible ? 1 : 0,
              transform: controlsVisible ? visibleTransform : hiddenTransform,
              pointerEvents: controlsVisible ? 'auto' : 'none',
              maxWidth: controlsVisible ? '50px' : '0',
              overflow: controlsVisible ? 'visible' : 'hidden',
              transition: controlsVisible && isClipsMode
                ? `${itemTransition}, max-width 0.25s ease 120ms`
                : `${itemTransition}, max-width 0.25s ease`,
              order: orderClock,
            }}
          >
            <button
              onClick={() => { setShowTimeDropdown(!showTimeDropdown); setShowContentDropdown(false); setShowGameFilter(false); }}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:shadow-[0_0_12px_rgba(183,255,26,0.35)]"
              style={isClipsMode
                ? pillBaseStyle(showTimeDropdown)
                : {
                    background: showTimeDropdown ? 'rgba(183, 255, 26,0.18)' : 'rgba(30,41,59,0.88)',
                    border: showTimeDropdown ? '1px solid #B7FF1A' : '1px solid rgba(183, 255, 26,0.3)',
                  }}
            >
              <Clock className="h-5 w-5" style={{ color: showTimeDropdown ? '#B7FF1A' : (isClipsMode ? '#F5F7F2' : '#fff') }} />
            </button>
            {showTimeDropdown && (
              <div
                className="absolute top-full mt-1.5 right-0 rounded-xl overflow-hidden min-w-[148px]"
                style={{ background: 'rgba(19,31,42,0.97)', border: '1px solid rgba(183, 255, 26,0.25)', zIndex: 90 }}
              >
                <p className="px-3.5 py-2 text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.35)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>Time Period</p>
                {(Object.entries(timeMeta) as [TimePeriod, string][]).map(([period, label]) => (
                  <button
                    key={period}
                    className="flex items-center gap-2.5 px-3.5 py-2.5 w-full text-left text-xs font-medium"
                    style={timePeriod === period ? { background: 'rgba(183, 255, 26,0.15)', color: '#B7FF1A' } : { color: '#B8C0AE' }}
                    onClick={() => { setTimePeriod(period); setShowTimeDropdown(false); }}
                  >
                    {label}
                    {timePeriod === period && <Check className="h-3 w-3 ml-auto" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
          );
        })()}

        {/* Game filter bottom-sheet modal */}
        {showGameFilter && (
          <div
            className="fixed inset-0 z-[100003] flex items-end"
            style={{ background: 'rgba(0,0,0,0.65)' }}
            onClick={() => { setShowGameFilter(false); setGameSearchQuery(''); }}
          >
            <div
              className="w-full rounded-t-3xl flex flex-col"
              style={{ background: '#0B1218', maxHeight: '82vh' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-4">
                <div className="flex items-center gap-2.5">
                  <Gamepad2 className="h-6 w-6" style={{ color: '#B7FF1A' }} />
                  <span className="text-white font-bold text-lg">
                    Filter {activeLabel} by Game
                  </span>
                </div>
                <button
                  onClick={() => { setShowGameFilter(false); setGameSearchQuery(''); }}
                  className="text-white/70 hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Search input */}
              <div className="px-4 pb-4">
                <div
                  className="flex items-center gap-3 rounded-2xl px-4 py-3"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(183, 255, 26,0.35)' }}
                >
                  <Search className="h-4 w-4 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }} />
                  <input
                    autoFocus
                    value={gameSearchQuery}
                    onChange={(e) => setGameSearchQuery(e.target.value)}
                    placeholder="Search for games..."
                    className="flex-1 bg-transparent text-sm text-white outline-none"
                    style={{ color: '#fff' }}
                  />
                </div>
              </div>

              {/* Section label */}
              <p className="px-4 pb-3 text-white font-semibold text-base">Available Games</p>

              {/* 3-column game grid */}
              <div className="flex-1 overflow-y-auto px-3 pb-8">
                {isGameSearchLoading && (
                  <div className="flex items-center justify-center py-10">
                    <div className="w-6 h-6 border-2 border-[#B7FF1A] border-t-transparent rounded-full animate-spin" />
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2">
                  {/* "All Games" card — always first, 3:4 portrait to match game box art */}
                  <button
                    className="relative rounded-xl overflow-hidden flex flex-col items-center justify-center transition-all"
                    style={{
                      aspectRatio: '3/4',
                      background: '#101923',
                      border: !selectedGameId ? '2.5px solid #B7FF1A' : '2px solid rgba(255,255,255,0.08)',
                    }}
                    onClick={() => {
                      setSelectedGameId(null);
                      setSelectedGameName(null);
                      setShowGameFilter(false);
                      setGameSearchQuery('');
                      queryClient.invalidateQueries({ queryKey: ['/api/clips/trending'] });
                      queryClient.invalidateQueries({ queryKey: ['/api/reels/trending'] });
                      queryClient.invalidateQueries({ queryKey: ['/api/trending/screenshots'] });
                    }}
                  >
                    {!selectedGameId && (
                      <div
                        className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: '#B7FF1A' }}
                      >
                        <Check className="h-3 w-3 text-black" strokeWidth={3} />
                      </div>
                    )}
                    <Gamepad2 className="h-7 w-7 mb-1" style={{ color: '#B7FF1A' }} />
                    <span className="text-white text-[11px] font-bold text-center px-1 leading-tight">All Games</span>
                  </button>

                  {/* Empty state when no games and no search */}
                  {debouncedGameQuery.length < 2 && availableGames.length === 0 && !isGameSearchLoading && (
                    <div className="col-span-3 flex flex-col items-center justify-center py-10 gap-2">
                      <Gamepad2 className="h-8 w-8" style={{ color: 'rgba(183, 255, 26,0.3)' }} />
                      <p className="text-white/40 text-sm text-center">No games found in trending content</p>
                    </div>
                  )}

                  {/* Game cards */}
                  {(() => {
                    const gameList = debouncedGameQuery.length >= 2
                      ? (gameSearchResults || [])
                      : availableGames;
                    return gameList.map((game: { id: number; name: string; imageUrl?: string }) => {
                      const isSelected = selectedGameId === game.id;
                      const isInCurrentTab = activeTabGameIds.has(game.id);
                      const imgSrc = game.imageUrl
                        ? game.imageUrl.replace('{width}', '144').replace('{height}', '192')
                        : null;
                      return (
                        <button
                          key={game.id}
                          className="relative rounded-xl overflow-hidden flex flex-col justify-end transition-all"
                          style={{
                            aspectRatio: '3/4',
                            background: '#101923',
                            border: isSelected ? '2.5px solid #B7FF1A' : '2px solid rgba(255,255,255,0.08)',
                            opacity: isInCurrentTab ? 1 : 0.4,
                            filter: isInCurrentTab ? 'none' : 'grayscale(70%)',
                            cursor: isInCurrentTab ? 'pointer' : 'not-allowed',
                          }}
                          disabled={!isInCurrentTab}
                          onClick={() => {
                            if (!isInCurrentTab) return;
                            setSelectedGameId(game.id);
                            setSelectedGameName(game.name);
                            setShowGameFilter(false);
                            setGameSearchQuery('');
                            queryClient.invalidateQueries({ queryKey: ['/api/clips/trending'] });
                            queryClient.invalidateQueries({ queryKey: ['/api/reels/trending'] });
                            queryClient.invalidateQueries({ queryKey: ['/api/trending/screenshots'] });
                          }}
                        >
                          {/* Cover art */}
                          {imgSrc && (
                            <img
                              src={imgSrc}
                              alt={game.name}
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                          )}
                          {/* Gradient */}
                          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 55%, transparent 100%)' }} />
                          {/* Selected checkmark */}
                          {isSelected && (
                            <div
                              className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                              style={{ background: '#B7FF1A' }}
                            >
                              <Check className="h-3 w-3 text-black" strokeWidth={3} />
                            </div>
                          )}
                          {/* Name */}
                          <div className="relative z-10 px-1.5 pb-1.5">
                            <p className="text-white text-[11px] font-bold leading-tight line-clamp-2">{game.name}</p>
                          </div>
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }
  // ── End mobile layout ──────────────────────────────────────────────────────

  return (
    <div className="container mx-auto px-4 py-4 md:px-6 md:py-6 max-w-7xl">
      {/* Tabs at the top - Mobile responsive */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <div className="bg-card/50 dark:bg-card/30 backdrop-blur-sm border-b border-border mb-0 md:mb-6 md:rounded-xl md:border sticky top-0 z-30">
          <div className="px-4 py-3 md:py-4">
            <TabsList className="grid w-full grid-cols-3 bg-slate-800/90 dark:bg-slate-900/90 p-1 rounded-xl h-auto">
              <TabsTrigger
                value="clips"
                className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/70 rounded-lg px-4 py-2.5 md:py-3 text-sm md:text-base font-medium transition-all"
                data-testid="tab-clips"
              >
                Clips
              </TabsTrigger>
              <TabsTrigger
                value="reels"
                className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/70 rounded-lg px-4 py-2.5 md:py-3 text-sm md:text-base font-medium transition-all"
                data-testid="tab-reels"
              >
                Reels
              </TabsTrigger>
              <TabsTrigger
                value="screenshots"
                className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/70 rounded-lg px-4 py-2.5 md:py-3 text-sm md:text-base font-medium transition-all"
                data-testid="tab-screenshots"
              >
                Screenshots
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* Header - below tabs on mobile, visible on desktop */}
        <div className="px-4 mb-6 hidden md:flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <ZapIconSvg size={32} active={true} />
            <div>
              <h1 className="text-3xl font-bold">Trending</h1>
              <p className="text-muted-foreground">Discover the most popular gaming content</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-0 md:px-4">
          <TabsContent value="clips" className="mt-0 pt-4 px-4 md:px-0">
            {renderContent()}
          </TabsContent>

          <TabsContent value="reels" className="mt-0 pt-4 px-4 md:px-0">
            {renderContent()}
          </TabsContent>

          <TabsContent value="screenshots" className="mt-0 pt-4 px-4 md:px-0">
            {renderContent()}
          </TabsContent>
        </div>
      </Tabs>

      {/* Screenshot Lightbox */}
      <ScreenshotLightbox
        screenshot={selectedScreenshot}
        onClose={() => setSelectedScreenshot(null)}
        currentUserId={user?.id}
        screenshots={trendingScreenshots as any[]}
        onNavigate={(s: any) => setSelectedScreenshot(s)}
      />

      {/* Age Restriction Dialog for Screenshots */}
      {selectedScreenshot && (
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
              setSelectedScreenshot(null);
            }
          }}
          contentType="screenshot"
        />
      )}

      {/* Desktop Shorts-style viewer — clips & reels */}
      {desktopShortsOpen && !isMobile && desktopShortsClips.length > 0 && (
        <DesktopShortsViewer
          clips={desktopShortsClips}
          initialIndex={desktopShortsIndex}
          onClose={() => setDesktopShortsOpen(false)}
          onOpenGameFilter={() => setShowGameFilter(true)}
          selectedGameId={selectedGameId}
          selectedGameName={selectedGameName}
          isLandscape={desktopShortsLandscape}
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            if (tab === 'clips' && trendingClips?.length) {
              setDesktopShortsLandscape(true);
              setDesktopShortsClips(trendingClips);
              setDesktopShortsIndex(0);
            } else {
              setDesktopShortsOpen(false);
            }
          }}
          timePeriod={timePeriod}
          onTimePeriodChange={setTimePeriod}
        />
      )}

      {/* Game Filter Modal — desktop */}
      {showGameFilter && !isMobile && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.65)' }}
          onClick={() => { setShowGameFilter(false); setGameSearchQuery(''); }}
        >
          <div
            className="rounded-2xl flex flex-col"
            style={{ background: '#0B1218', maxHeight: '80vh', width: '480px', maxWidth: '90vw' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4">
              <div className="flex items-center gap-2.5">
                <Gamepad2 className="h-6 w-6" style={{ color: '#B7FF1A' }} />
                <span className="text-white font-bold text-lg">
                  Filter by Game
                </span>
              </div>
              <button
                onClick={() => { setShowGameFilter(false); setGameSearchQuery(''); }}
                className="text-white/70 hover:text-white transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Search input */}
            <div className="px-4 pb-4">
              <div
                className="flex items-center gap-3 rounded-2xl px-4 py-3"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(183, 255, 26,0.35)' }}
              >
                <Search className="h-4 w-4 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }} />
                <input
                  autoFocus
                  value={gameSearchQuery}
                  onChange={(e) => setGameSearchQuery(e.target.value)}
                  placeholder="Search for games..."
                  className="flex-1 bg-transparent text-sm text-white outline-none"
                  style={{ color: '#fff' }}
                />
              </div>
            </div>

            {/* Section label */}
            <p className="px-4 pb-3 text-white font-semibold text-base">Available Games</p>

            {/* 3-column game grid */}
            <div className="flex-1 overflow-y-auto px-3 pb-6">
              {isGameSearchLoading && (
                <div className="flex items-center justify-center py-10">
                  <div className="w-6 h-6 border-2 border-[#B7FF1A] border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                {/* "All Games" card */}
                <button
                  className="relative rounded-xl overflow-hidden flex flex-col items-center justify-center transition-all"
                  style={{
                    aspectRatio: '3/4',
                    background: '#101923',
                    border: !selectedGameId ? '2.5px solid #B7FF1A' : '2px solid rgba(255,255,255,0.08)',
                  }}
                  onClick={() => {
                    setSelectedGameId(null);
                    setSelectedGameName(null);
                    setShowGameFilter(false);
                    setGameSearchQuery('');
                    queryClient.invalidateQueries({ queryKey: ['/api/clips/trending'] });
                    queryClient.invalidateQueries({ queryKey: ['/api/reels/trending'] });
                    queryClient.invalidateQueries({ queryKey: ['/api/trending/screenshots'] });
                  }}
                >
                  {!selectedGameId && (
                    <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: '#B7FF1A' }}>
                      <Check className="h-3 w-3 text-black" strokeWidth={3} />
                    </div>
                  )}
                  <Gamepad2 className="h-7 w-7 mb-1" style={{ color: '#B7FF1A' }} />
                  <span className="text-white text-[11px] font-bold text-center px-1 leading-tight">All Games</span>
                </button>

                {debouncedGameQuery.length < 2 && availableGames.length === 0 && !isGameSearchLoading && (
                  <div className="col-span-2 flex flex-col items-center justify-center py-10 gap-2">
                    <p className="text-white/40 text-sm text-center">Search for a game above</p>
                  </div>
                )}

                {(() => {
                  const gameList = debouncedGameQuery.length >= 2 ? (gameSearchResults || []) : availableGames;
                  return gameList.map((game: { id: number; name: string; imageUrl?: string }) => {
                    const isSelected = selectedGameId === game.id;
                    const isInCurrentTab = activeTabGameIds.has(game.id);
                    const imgSrc = game.imageUrl ? game.imageUrl.replace('{width}', '144').replace('{height}', '192') : null;
                    return (
                      <button
                        key={game.id}
                        className="relative rounded-xl overflow-hidden flex flex-col justify-end transition-all"
                        style={{
                          aspectRatio: '3/4',
                          background: '#101923',
                          border: isSelected ? '2.5px solid #B7FF1A' : '2px solid rgba(255,255,255,0.08)',
                          opacity: isInCurrentTab ? 1 : 0.4,
                          filter: isInCurrentTab ? 'none' : 'grayscale(70%)',
                          cursor: isInCurrentTab ? 'pointer' : 'not-allowed',
                        }}
                        disabled={!isInCurrentTab}
                        onClick={() => {
                          if (!isInCurrentTab) return;
                          setSelectedGameId(game.id);
                          setSelectedGameName(game.name);
                          setShowGameFilter(false);
                          setGameSearchQuery('');
                          queryClient.invalidateQueries({ queryKey: ['/api/clips/trending'] });
                          queryClient.invalidateQueries({ queryKey: ['/api/reels/trending'] });
                          queryClient.invalidateQueries({ queryKey: ['/api/trending/screenshots'] });
                        }}
                      >
                        {imgSrc && <img src={imgSrc} alt={game.name} className="absolute inset-0 w-full h-full object-cover" />}
                        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 55%, transparent 100%)' }} />
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: '#B7FF1A' }}>
                            <Check className="h-3 w-3 text-black" strokeWidth={3} />
                          </div>
                        )}
                        <div className="relative z-10 px-1.5 pb-1.5">
                          <p className="text-white text-[11px] font-bold leading-tight line-clamp-2">{game.name}</p>
                        </div>
                      </button>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default TrendingPage;