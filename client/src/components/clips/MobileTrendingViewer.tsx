import { useState, useEffect, useCallback, useRef } from "react";
import { ClipWithUser } from "@shared/schema";
import VideoPlayer from "@/components/shared/VideoPlayer";
import { ChevronLeft, Heart, MessageCircle, Share2, User, Play, Pause, Flag, Eye, Gamepad2, Music } from "lucide-react";
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
import { LazyImage } from "@/components/ui/lazy-image";

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
}

export function MobileTrendingViewer({ content, initialIndex = 0, onClose, hideCloseButton = false, embedded = false }: MobileTrendingViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [showComments, setShowComments] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);

  // Reset overlay states when switching between content items
  useEffect(() => {
    setShowComments(false);
    setShowShare(false);
    setIsPlaying(true);
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
  const { isOpen: isJoinDialogOpen, actionType, openDialog, closeDialog } = useJoinDialog();

  const currentItem = content[currentIndex];

  // Early return if no content or invalid index
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

  // Touch handling for mobile
  const [touchStartY, setTouchStartY] = useState(0);
  const [touchStartTime, setTouchStartTime] = useState(0);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    setTouchStartY(e.touches[0].clientY);
    setTouchStartTime(Date.now());
  }, []);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    const touchEndY = e.changedTouches[0].clientY;
    const touchEndTime = Date.now();
    const deltaY = touchStartY - touchEndY;
    const deltaTime = touchEndTime - touchStartTime;
    
    // Only trigger swipe if it's a quick gesture (< 500ms) and significant distance (> 50px)
    if (deltaTime < 500 && Math.abs(deltaY) > 50) {
      if (deltaY > 0 && currentIndex < content.length - 1) {
        // Swipe up - next content
        setCurrentIndex(prev => prev + 1);
      } else if (deltaY < 0 && currentIndex > 0) {
        // Swipe down - previous content
        setCurrentIndex(prev => prev - 1);
      }
    }
  }, [currentIndex, content.length, touchStartY, touchStartTime]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (currentIndex < content.length - 1) setCurrentIndex(prev => prev + 1);
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
  }, [currentIndex, content.length, onClose, currentItem]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleTouchStart, handleTouchEnd, handleKeyDown]);

  // Type guard to check if content is video (clip/reel) or screenshot
  const isVideoContent = (item: ContentItem): item is ClipWithUser => {
    return 'videoUrl' in item;
  };


  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const renderContent = () => {
    if (isVideoContent(currentItem)) {
      // Render video content (clips/reels) - Force full screen for mobile
      return (
        <div className="absolute inset-0 w-full h-full">
          <VideoPlayer
            videoUrl={currentItem.videoUrl || ''}
            thumbnailUrl={currentItem.thumbnailUrl || undefined}
            autoPlay={isPlaying}
            className="w-full h-full"
            clipId={currentItem.id}
            objectFit="cover"
            data-testid={`video-player-${currentItem.id}`}
          />
        </div>
      );
    } else {
      // Render screenshot content with signed URL support
      return (
        <LazyImage
          src={currentItem.imageUrl}
          alt={currentItem.title}
          className="w-full h-full object-cover"
          data-testid={`screenshot-${currentItem.id}`}
        />
      );
    }
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
      className={embedded ? "relative w-full h-full" : "fixed inset-0 z-[60] flex items-center justify-center"}
      style={{ background: '#131F2A' }}
      data-testid="mobile-trending-viewer"
    >
      {/* Content - Full mobile screen 9:16 format */}
      <div className="relative w-full h-full">
        {renderContent()}

        {/* Top overlay with close button */}
        {!hideCloseButton && (
          <div className="absolute top-0 left-0 right-0 flex justify-between items-center p-4 bg-gradient-to-b from-black/60 to-transparent z-10">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/20"
              data-testid="button-close"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            
            {/* Content type indicator */}
            <div className="bg-black/40 text-white text-xs px-2 py-1 rounded-full">
              {isVideoContent(currentItem) 
                ? 'Video'
                : 'Screenshot'
              }
            </div>
          </div>
        )}

        {/* ── Right edge action column ────────────────────────────────────── */}
        <div className="absolute right-3 z-10 flex flex-col items-center gap-5" style={{ bottom: 120 }}>
          {/* Views */}
          <div className="flex flex-col items-center gap-0.5">
            <Eye className="h-7 w-7 text-white drop-shadow" />
            <span className="text-white text-[11px] font-semibold drop-shadow">{formatNumber(stats.views)}</span>
          </div>

          {/* Likes */}
          <div className="flex flex-col items-center gap-0.5">
            <LikeButton
              contentId={currentItem.id}
              contentType={isVideoContent(currentItem) ? "clip" : "screenshot"}
              contentOwnerId={currentItem.user.id}
              initialLiked={false}
              initialCount={stats.likes}
              size="lg"
            />
          </div>

          {/* Fires */}
          <div className="flex flex-col items-center gap-0.5">
            <FireButton
              contentId={currentItem.id}
              contentType={isVideoContent(currentItem) ? "clip" : "screenshot"}
              contentOwnerId={currentItem.user.id}
              initialFired={false}
              initialCount={(currentItem as any)._count?.reactions || 0}
              size="lg"
            />
          </div>

          {/* Comments */}
          <button
            onClick={() => { if (!user) { openDialog('comment'); } else { setShowComments(true); } }}
            className="flex flex-col items-center gap-0.5"
            data-testid="button-comments"
          >
            <MessageCircle className="h-7 w-7 text-white drop-shadow" />
            <span className="text-white text-[11px] font-semibold drop-shadow">{formatNumber(stats.comments)}</span>
          </button>

          {/* Share */}
          <button
            onClick={() => setShowShare(true)}
            className="flex flex-col items-center gap-0.5"
            data-testid="button-share"
          >
            <Share2 className="h-7 w-7 text-white drop-shadow" />
          </button>
        </div>

        {/* ── Bottom-left info overlay ─────────────────────────────────────── */}
        <div className="absolute bottom-0 left-0 z-10 px-4 pb-6 pt-16 bg-gradient-to-t from-black/85 via-black/30 to-transparent" style={{ right: 60 }}>
          {/* User row: avatar + @username + Follow */}
          <Link
            href={`/profile/${currentItem.user.username}`}
            className="flex items-center gap-2 mb-2 no-underline"
            data-testid={`link-user-${currentItem.user.username}`}
          >
            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0" style={{ border: '2px solid #fff' }}>
              <img
                src={currentItem.user.avatarUrl || '/uploaded_assets/gamefolio social logo 3d circle web.png'}
                alt={currentItem.user.displayName}
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-white font-bold text-sm drop-shadow leading-tight">
              @{currentItem.user.username}
            </span>
            <span
              className="text-black text-xs font-bold px-2.5 py-0.5 rounded-md flex-shrink-0"
              style={{ background: '#4ADE80' }}
            >
              Follow
            </span>
          </Link>

          {/* Title */}
          <p className="text-white font-bold text-sm drop-shadow mb-0.5 leading-snug">
            {currentItem.title}
          </p>

          {/* Description (if any) */}
          {(currentItem as any).description && (
            <p className="text-white/75 text-xs drop-shadow mb-1 line-clamp-1">
              {(currentItem as any).description}
            </p>
          )}

          {/* Game */}
          {currentItem.game?.name && (
            <div className="flex items-center gap-1 mb-1">
              <Gamepad2 className="h-3 w-3 flex-shrink-0" style={{ color: '#4ADE80' }} />
              <span className="text-xs font-semibold" style={{ color: '#4ADE80' }}>
                {currentItem.game.name}
              </span>
            </div>
          )}

          {/* Original audio */}
          <div className="flex items-center gap-1">
            <Music className="h-3 w-3 text-white/65 flex-shrink-0" />
            <span className="text-white/65 text-xs truncate">
              Original audio · {currentItem.user.displayName || currentItem.user.username}
            </span>
          </div>
        </div>

        {/* Video play/pause overlay for video content */}
        {isVideoContent(currentItem) && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Button
              variant="ghost"
              size="lg"
              onClick={() => setIsPlaying(!isPlaying)}
              className="text-white hover:bg-white/20 opacity-0 hover:opacity-100 transition-opacity"
              data-testid="button-play-pause"
            >
              {isPlaying ? <Pause className="h-12 w-12" /> : <Play className="h-12 w-12" />}
            </Button>
          </div>
        )}
      </div>

      {/* Comments overlay */}
      {showComments && isVideoContent(currentItem) && (
        <div className="absolute inset-0 bg-black/90 z-20 flex flex-col">
          <div className="flex justify-between items-center p-4 border-b border-white/20">
            <h3 className="text-white text-lg font-semibold">Comments</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowComments(false)}
              className="text-white hover:bg-white/20"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </div>
          <CommentSection clipId={currentItem.id} />
        </div>
      )}

      {/* Share overlay */}
      {showShare && isVideoContent(currentItem) && (
        <div className="absolute inset-0 bg-black/90 z-20 flex flex-col">
          <div className="flex justify-between items-center p-4 border-b border-white/20">
            <h3 className="text-white text-lg font-semibold">Share</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowShare(false)}
              className="text-white hover:bg-white/20"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </div>
          <ShareMenu clipId={currentItem.id} clipTitle={currentItem.title} />
        </div>
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