
import { useState, useEffect, useCallback, useRef } from "react";
import { ClipWithUser } from "@shared/schema";
import VideoPlayer from "@/components/shared/VideoPlayer";
import { ChevronLeft, Heart, MessageCircle, Share2, MoreVertical, User, Play, Pause, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { LikeButton } from "@/components/engagement/LikeButton";
import { FireButton } from "@/components/engagement/FireButton";
import CommentSection from "@/components/clips/CommentSection";
import ShareMenu from "@/components/clips/ShareMenu";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { ReportDialog } from "@/components/content/ReportDialog";

interface FullscreenReelsViewerProps {
  reels: ClipWithUser[];
  initialIndex: number;
  onClose: () => void;
}

export function FullscreenReelsViewer({ reels, initialIndex, onClose }: FullscreenReelsViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [showComments, setShowComments] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const currentReel = reels[currentIndex];

  // Scroll to initial reel on mount
  useEffect(() => {
    if (containerRef.current) {
      const scrollPosition = initialIndex * window.innerHeight;
      containerRef.current.scrollTop = scrollPosition;
    }
  }, []);

  // Track current reel based on scroll position
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const newIndex = Math.round(scrollTop / window.innerHeight);
      if (newIndex !== currentIndex && newIndex >= 0 && newIndex < reels.length) {
        setCurrentIndex(newIndex);
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [currentIndex, reels.length]);

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

  // Reset comments when switching reels
  useEffect(() => {
    setShowComments(false);
    setShowShare(false);
  }, [currentIndex]);

  if (!currentReel) return null;

  return (
    <div className="fixed inset-0 bg-black z-50">
      {/* Close button */}
      <Button
        variant="ghost"
        size="sm"
        className="fixed top-2 left-2 md:top-4 md:left-4 z-20 text-white bg-black/50 hover:bg-black/70 w-8 h-8 md:w-auto md:h-auto p-1 md:p-2"
        onClick={onClose}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* Progress indicators */}
      <div className="fixed top-2 right-2 md:top-4 md:right-4 z-20 flex gap-0.5 md:gap-1">
        {reels.map((_, index) => (
          <div
            key={index}
            className={cn(
              "w-0.5 h-4 md:w-1 md:h-8 rounded-full transition-colors",
              index === currentIndex ? "bg-white" : "bg-white/30"
            )}
          />
        ))}
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
            className="snap-start snap-always h-screen flex items-center justify-center py-4 md:py-6"
          >
            {/* Video player */}
            <div className="relative w-full h-full max-w-sm mx-auto md:max-w-md lg:max-w-lg px-4 md:px-0 pointer-events-none">
              <div className="w-full h-full pointer-events-auto">
                <VideoPlayer
                  videoUrl={reel.videoUrl}
                  thumbnailUrl={reel.thumbnailUrl || undefined}
                  autoPlay={index === currentIndex}
                  className="w-full h-full"
                  objectFit="cover"
                  clipId={reel.id}
                  onEnded={() => {
                    if (index < reels.length - 1 && containerRef.current) {
                      containerRef.current.scrollTo({ top: (index + 1) * window.innerHeight, behavior: 'smooth' });
                    }
                  }}
                />
              </div>

              {/* Video overlay content */}
              <div className="absolute inset-0 pointer-events-none z-10">
                {/* Left side - User info and title */}
                <div className="absolute bottom-12 md:bottom-16 left-2 md:left-4 right-16 md:right-20 pointer-events-auto z-10">
                  <Link href={`/profile/${reel.user.username}`}>
                    <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3 text-white">
                      <div className="w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden border-2 border-white/50">
                        <img
                          src={reel.user.avatarUrl || '/uploaded_assets/gamefolio social logo 3d circle web.png'}
                          alt={reel.user.displayName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <p className="font-semibold text-xs md:text-sm">
                          {reel.user.displayName || reel.user.username}
                        </p>
                        <p className="text-white/70 text-xs">@{reel.user.username}</p>
                      </div>
                    </div>
                  </Link>

                  <h3 className="text-white font-medium text-xs md:text-sm mb-1 md:mb-2 leading-tight line-clamp-2">
                    {reel.title}
                  </h3>

                  {/* Game badge */}
                  {reel.game && (
                    <div className="inline-block bg-primary/80 text-white text-xs px-2 py-1 rounded-full mb-1 md:mb-2">
                      {reel.game.name}
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex items-center gap-2 md:gap-4 text-white/80 text-xs">
                    <span>{reel.views || 0} views</span>
                    <span>{reel._count?.likes || 0} likes</span>
                    <span className="hidden md:inline">{reel._count?.comments || 0} comments</span>
                  </div>
                </div>

                {/* Right side - Engagement buttons */}
                {index === currentIndex && (
                  <div className="absolute bottom-12 md:bottom-16 right-2 md:right-4 flex flex-col gap-2 md:gap-4 pointer-events-auto">
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

                    <FireButton
                      contentId={reel.id}
                      contentType="clip"
                      contentOwnerId={reel.userId}
                      initialCount={0}
                      size="lg"
                      showCount={true}
                      variant="vertical"
                    />

                    <div className="flex flex-col items-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-white bg-black/50 hover:bg-black/70 w-10 h-10 md:w-12 md:h-12 rounded-full p-0"
                        onClick={() => setShowComments(true)}
                      >
                        <MessageCircle className="h-5 w-5 md:h-6 md:w-6" />
                      </Button>
                      <span className="text-white text-xs text-center mt-1">
                        {reel._count?.comments || 0}
                      </span>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white bg-black/50 hover:bg-black/70 w-10 h-10 md:w-12 md:h-12 rounded-full p-0"
                      onClick={() => setShowShare(true)}
                    >
                      <Share2 className="h-5 w-5 md:h-6 md:w-6" />
                    </Button>

                    <ReportDialog
                      contentType="clip"
                      contentId={reel.id}
                      contentTitle={reel.title}
                      contentAuthor={reel.user.username}
                      trigger={
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-white bg-black/50 hover:bg-black/70 w-10 h-10 md:w-12 md:h-12 rounded-full p-0"
                        >
                          <Flag className="h-5 w-5 md:h-6 md:w-6" />
                        </Button>
                      }
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation hints */}
      <div className="fixed bottom-2 md:bottom-4 left-1/2 transform -translate-x-1/2 text-white/50 text-xs text-center px-4 z-20">
        <p className="hidden md:block">Scroll or use arrow keys to navigate • ESC to close</p>
        <p className="md:hidden">Scroll to navigate</p>
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
    </div>
  );
}
