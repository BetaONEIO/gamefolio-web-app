import React, { useState, useCallback, useEffect, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useSignedUrl } from "@/hooks/use-signed-url";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { LikeButton } from "@/components/engagement/LikeButton";
import { FireButton } from "@/components/engagement/FireButton";
import { ReportButton } from "@/components/reporting/ReportButton";
import { formatDistance } from "date-fns";
import { Link } from "wouter";
import { Eye, Clock, MessageSquare, Share2, User as UserIcon, UserPlus, UserCheck, ChevronLeft, ChevronRight, X, Maximize2, Minimize2 } from "lucide-react";
import type { Game, Screenshot } from "@shared/schema";

const ScreenshotShareDialog = React.lazy(() => import("@/components/screenshot/ScreenshotShareDialog").then(m => ({ default: m.ScreenshotShareDialog })));
const ScreenshotCommentSection = React.lazy(() => import("@/components/screenshots/ScreenshotCommentSection").then(m => ({ default: m.ScreenshotCommentSection })));

interface ScreenshotLightboxProps {
  screenshot: any | null;
  onClose: () => void;
  currentUserId?: number;
  screenshots?: any[];
  onNavigate?: (screenshot: any) => void;
}

export function ScreenshotLightbox({ screenshot, onClose, currentUserId, screenshots, onNavigate }: ScreenshotLightboxProps) {
  const { signedUrl } = useSignedUrl(screenshot?.imageUrl);
  const avatarUrl = screenshot?.user?.avatarUrl;
  const { signedUrl: avatarSignedUrl } = useSignedUrl(avatarUrl);
  const queryClient = useQueryClient();

  const [isMobile, setIsMobile] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; time: number } | null>(null);
  const hasDraggedRef = useRef(false);
  const commentSectionRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const { data: games = [] } = useQuery<Game[]>({
    queryKey: ['/api/games'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!screenshot,
  });

  const screenshotUser = screenshot?.user;
  const isOwnContent = currentUserId === screenshot?.userId;

  const currentIndex = screenshots && screenshot ? screenshots.findIndex((s: any) => s.id === screenshot.id) : -1;
  const hasNavigation = screenshots && screenshots.length > 1 && onNavigate;
  const hasPrevious = hasNavigation && currentIndex > 0;
  const hasNext = hasNavigation && currentIndex < (screenshots?.length || 0) - 1;
  const totalSlides = screenshots?.length || 1;

  const handlePrevious = useCallback(() => {
    if (!screenshots || !onNavigate || currentIndex <= 0) return;
    onNavigate(screenshots[currentIndex - 1]);
  }, [screenshots, onNavigate, currentIndex]);

  const handleNext = useCallback(() => {
    if (!screenshots || !onNavigate || currentIndex >= screenshots.length - 1) return;
    onNavigate(screenshots[currentIndex + 1]);
  }, [screenshots, onNavigate, currentIndex]);

  useEffect(() => {
    if (!screenshot || !hasNavigation) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && hasPrevious) {
        e.preventDefault();
        handlePrevious();
      } else if (e.key === 'ArrowRight' && hasNext) {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [screenshot, hasNavigation, hasPrevious, hasNext, handlePrevious, handleNext]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (!hasNavigation) return;
    dragStartRef.current = { x: e.clientX, time: Date.now() };
    hasDraggedRef.current = false;
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [hasNavigation]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragStartRef.current || !hasNavigation) return;
    const diff = e.clientX - dragStartRef.current.x;
    if (Math.abs(diff) > 5) hasDraggedRef.current = true;
    setDragX(diff);
  }, [hasNavigation]);

  const onPointerUp = useCallback(() => {
    if (!dragStartRef.current) return;
    const threshold = 80;
    const elapsed = Date.now() - dragStartRef.current.time;
    const velocity = elapsed > 0 ? Math.abs(dragX) / elapsed * 1000 : 0;
    const shouldSwipe = Math.abs(dragX) > threshold || velocity > 400;

    if (shouldSwipe && dragX < 0 && hasNext) {
      handleNext();
    } else if (shouldSwipe && dragX > 0 && hasPrevious) {
      handlePrevious();
    }

    setDragX(0);
    setIsDragging(false);
    dragStartRef.current = null;
  }, [dragX, hasNext, hasPrevious, handleNext, handlePrevious]);

  const { data: followStatus } = useQuery({
    queryKey: ['/api/follow/status', screenshotUser?.id],
    queryFn: async () => {
      const response = await fetch(`/api/follow/status/${screenshotUser?.id}`, { credentials: 'include' });
      if (!response.ok) return { isFollowing: false };
      return response.json();
    },
    enabled: !!currentUserId && !!screenshotUser?.id && currentUserId !== screenshotUser?.id,
  });

  const followMutation = useMutation({
    mutationFn: async (targetUserId: number) => {
      const response = await apiRequest('POST', `/api/follow/${targetUserId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/follow/status', screenshotUser?.id] });
    },
  });

  const scrollToComments = useCallback(() => {
    if (commentSectionRef.current && scrollContainerRef.current) {
      commentSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  if (!screenshot) return null;

  if (isMobile && isFullscreen) {
    return (
      <div className="fixed inset-0 z-[60] bg-black flex flex-col">
        <div className="absolute top-3 right-3 z-50 flex items-center gap-2">
          {hasNavigation && (
            <span className="text-white/70 text-xs font-medium bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full">
              {currentIndex + 1} / {totalSlides}
            </span>
          )}
          <button
            onClick={() => { setIsFullscreen(false); onClose(); }}
            className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/70 transition-colors flex items-center justify-center"
          >
            <X className="h-5 w-5 text-white" />
          </button>
        </div>

        <div
          className="flex-1 relative overflow-hidden"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              transform: `translateX(${dragX}px)`,
              opacity: Math.max(0.3, 1 - Math.abs(dragX) / 300),
              transition: isDragging ? "none" : "transform 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.35s ease",
            }}
          >
            <img
              src={signedUrl || screenshot.imageUrl}
              alt={screenshot.title}
              className="max-w-full max-h-full object-contain pointer-events-none"
              draggable={false}
            />
          </div>

          {hasNavigation && hasPrevious && (
            <button
              onClick={(e) => { e.stopPropagation(); handlePrevious(); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/70 transition-colors flex items-center justify-center"
            >
              <ChevronLeft className="h-6 w-6 text-white" />
            </button>
          )}
          {hasNavigation && hasNext && (
            <button
              onClick={(e) => { e.stopPropagation(); handleNext(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/70 transition-colors flex items-center justify-center"
            >
              <ChevronRight className="h-6 w-6 text-white" />
            </button>
          )}
        </div>

        {hasNavigation && totalSlides > 1 && (
          <div className="absolute bottom-4 left-0 right-0 z-30 flex justify-center">
            <div className="flex items-center gap-1.5">
              {screenshots!.map((_, i) => (
                <div
                  key={i}
                  className={`rounded-full transition-all duration-300 ${
                    i === currentIndex
                      ? "w-5 h-1.5 bg-white"
                      : "w-1.5 h-1.5 bg-white/30"
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        <div className="flex items-center justify-between px-3 py-2 flex-shrink-0 border-b border-border">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Link href={`/profile/${screenshot.user?.username}`} onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onClose();
            }}>
              {screenshotUser?.nftProfileTokenId && screenshotUser?.nftProfileImageUrl ? (
                <div className="w-8 h-8 rounded-lg overflow-hidden border border-[#4ade80]/40 flex-shrink-0">
                  <img src={screenshotUser.nftProfileImageUrl} alt={screenshotUser.displayName || ''} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0 border border-white/20">
                  {(avatarSignedUrl || avatarUrl) ? (
                    <img src={avatarSignedUrl || avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              )}
            </Link>
            <div className="flex flex-col min-w-0">
              <Link href={`/profile/${screenshot.user?.username}`} onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                onClose();
              }}>
                <span className="text-foreground font-semibold text-sm truncate">
                  {screenshot.user?.displayName || screenshot.user?.username || 'Unknown'}
                </span>
              </Link>
              <span className="text-muted-foreground text-xs truncate">
                @{screenshot.user?.username || 'unknown'}
              </span>
            </div>
            {currentUserId && screenshotUser?.id && currentUserId !== screenshotUser.id && (
              <Button
                size="sm"
                variant={followStatus?.isFollowing ? "secondary" : "default"}
                className="h-7 text-xs px-2 flex-shrink-0 ml-1"
                onClick={(e) => { e.stopPropagation(); followMutation.mutate(screenshotUser.id); }}
                disabled={followMutation.isPending}
              >
                {followStatus?.isFollowing ? (
                  <>
                    <UserCheck className="h-3 w-3 mr-1" />
                    Following
                  </>
                ) : (
                  <>
                    <UserPlus className="h-3 w-3 mr-1" />
                    Follow
                  </>
                )}
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {hasNavigation && (
              <span className="text-muted-foreground text-xs font-medium">
                {currentIndex + 1} / {totalSlides}
              </span>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-muted hover:bg-muted/80 transition-colors flex items-center justify-center"
            >
              <X className="h-4 w-4 text-foreground" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto" ref={scrollContainerRef}>
          <div
            className="relative bg-black overflow-hidden"
            style={{ height: '45vh', minHeight: '200px' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <div
              className="w-full h-full flex items-center justify-center"
              style={{
                transform: `translateX(${dragX}px)`,
                opacity: Math.max(0.3, 1 - Math.abs(dragX) / 300),
                transition: isDragging ? "none" : "transform 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.35s ease",
              }}
            >
              <img
                src={signedUrl || screenshot.imageUrl}
                alt={screenshot.title}
                className="max-w-full max-h-full object-contain pointer-events-none"
                draggable={false}
              />
            </div>

            <button
              onClick={() => setIsFullscreen(true)}
              className="absolute bottom-2 right-2 z-10 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/70 transition-colors flex items-center justify-center"
            >
              <Maximize2 className="h-4 w-4 text-white" />
            </button>

            {hasNavigation && hasPrevious && (
              <button
                onClick={(e) => { e.stopPropagation(); handlePrevious(); }}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/70 transition-colors flex items-center justify-center"
              >
                <ChevronLeft className="h-5 w-5 text-white" />
              </button>
            )}
            {hasNavigation && hasNext && (
              <button
                onClick={(e) => { e.stopPropagation(); handleNext(); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/70 transition-colors flex items-center justify-center"
              >
                <ChevronRight className="h-5 w-5 text-white" />
              </button>
            )}
          </div>

          {hasNavigation && totalSlides > 1 && (
            <div className="flex justify-center py-2 bg-background">
              <div className="flex items-center gap-1.5">
                {screenshots!.map((_, i) => (
                  <div
                    key={i}
                    className={`rounded-full transition-all duration-300 ${
                      i === currentIndex
                        ? "w-5 h-1.5 bg-primary"
                        : "w-1.5 h-1.5 bg-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="px-4 py-3 space-y-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">{screenshot.title}</h2>
              {screenshot.description && (
                <p className="text-sm text-muted-foreground mt-1">{screenshot.description}</p>
              )}

              {screenshot.gameId && games?.find((g: Game) => g.id === screenshot.gameId) && (
                <div className="mt-2">
                  <Link href={`/games/${(games.find((g: Game) => g.id === screenshot.gameId)?.name || '').toLowerCase().replace(/[^a-z0-9]/g, '')}`} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                    <span className="bg-green-600 text-white px-2 py-1 rounded text-xs font-bold hover:bg-green-500 cursor-pointer transition-colors">
                      {games.find((g: Game) => g.id === screenshot.gameId)?.name}
                    </span>
                  </Link>
                </div>
              )}

              <div className="flex items-center mt-2 text-sm text-muted-foreground">
                <Eye className="h-4 w-4 mr-1" />
                <span className="mr-3">{screenshot.views || 0} views</span>
                <Clock className="h-4 w-4 mr-1" />
                <span>{screenshot.createdAt ? formatDistance(new Date(screenshot.createdAt), new Date(), { addSuffix: true }) : 'Unknown time'}</span>
              </div>

              <div className="border-t border-b border-border py-3 mt-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <LikeButton
                      contentId={screenshot.id}
                      contentType="screenshot"
                      contentOwnerId={screenshot.userId}
                      initialLiked={false}
                      initialCount={(screenshot as any)._count?.likes || 0}
                      size="lg"
                    />
                    <FireButton
                      contentId={screenshot.id}
                      contentType="screenshot"
                      contentOwnerId={screenshot.userId}
                      initialFired={false}
                      initialCount={(screenshot as any)._count?.reactions || 0}
                      size="lg"
                    />
                    <button
                      onClick={scrollToComments}
                      className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span className="text-sm">{(screenshot as any)._count?.comments || 0}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <React.Suspense fallback={null}>
                      <ScreenshotShareDialog
                        screenshotId={screenshot.id.toString()}
                        isOwnContent={isOwnContent}
                        trigger={
                          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                            <Share2 className="h-4 w-4" />
                          </Button>
                        }
                      />
                    </React.Suspense>
                    <ReportButton
                      contentType="screenshot"
                      contentId={screenshot.id}
                      contentTitle={screenshot.title}
                      variant="ghost"
                      size="sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div ref={commentSectionRef}>
              <React.Suspense fallback={null}>
                <ScreenshotCommentSection screenshotId={screenshot.id} />
              </React.Suspense>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Dialog open={!!screenshot} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-[80%] w-[80%] p-0 bg-background text-foreground max-h-[76vh] h-[76vh] overflow-hidden screenshot-lightbox-close">
        <style>{`
          .screenshot-lightbox-close > button[type="button"] {
            background: rgba(0,0,0,0.4) !important;
            color: white !important;
            border-radius: 0.5rem !important;
            padding: 0 !important;
            opacity: 1 !important;
            right: 12px !important;
            top: 12px !important;
            width: 32px !important;
            height: 32px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            z-index: 100 !important;
          }
          .screenshot-lightbox-close > button[type="button"]:hover {
            background: rgba(0,0,0,0.6) !important;
          }
          .screenshot-lightbox-close > button[type="button"] svg {
            width: 16px !important;
            height: 16px !important;
          }
        `}</style>

        <div className="flex flex-row h-full">
          <div className="bg-black flex items-center justify-center w-[75%] h-full flex-shrink-0">
            <img
              src={signedUrl || screenshot.imageUrl}
              alt={screenshot.title}
              className="max-w-full max-h-full object-contain"
            />
          </div>

          <div className="flex flex-col w-[25%] h-full">
            <div className="border-b border-border p-4 pr-12">
              <div className="flex items-center justify-between">
                <div className="flex items-center min-w-0">
                  {screenshotUser?.nftProfileTokenId && screenshotUser?.nftProfileImageUrl ? (
                    <div className="w-8 h-8 rounded-lg overflow-hidden border border-[#4ade80]/40 mr-3 flex-shrink-0">
                      <img src={screenshotUser.nftProfileImageUrl} alt={screenshotUser.displayName || ''} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center overflow-hidden mr-3 flex-shrink-0">
                      {(avatarSignedUrl || avatarUrl) ? (
                        <img
                          src={avatarSignedUrl || avatarUrl}
                          alt={screenshot.user?.displayName || ''}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <UserIcon className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  )}
                  <Link href={`/profile/${screenshot.user?.username}`} onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    onClose();
                  }}>
                    <div className="text-white flex items-center hover:text-primary transition-colors cursor-pointer font-medium">
                      {screenshot.user?.displayName || screenshot.user?.username}
                    </div>
                  </Link>
                </div>
                {currentUserId && screenshotUser?.id && currentUserId !== screenshotUser.id && (
                  <Button
                    size="sm"
                    variant={followStatus?.isFollowing ? "secondary" : "default"}
                    className="h-7 text-xs px-3 flex-shrink-0 ml-2"
                    onClick={(e) => { e.stopPropagation(); followMutation.mutate(screenshotUser.id); }}
                    disabled={followMutation.isPending}
                  >
                    {followStatus?.isFollowing ? (
                      <>
                        <UserCheck className="h-3 w-3 mr-1" />
                        Following
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-3 w-3 mr-1" />
                        Follow
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              <div>
                <h1 className="text-lg font-semibold">{screenshot.title}</h1>
                {screenshot.description && (
                  <p className="text-sm text-foreground mt-1">{screenshot.description}</p>
                )}

                {screenshot.gameId && games?.find((g: Game) => g.id === screenshot.gameId) && (
                  <div className="mt-2">
                    <Link href={`/games/${(games.find((g: Game) => g.id === screenshot.gameId)?.name || '').toLowerCase().replace(/[^a-z0-9]/g, '')}`} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                      <span className="bg-green-600 text-white px-2 py-1 rounded text-xs font-bold hover:bg-green-500 cursor-pointer transition-colors">
                        {games.find((g: Game) => g.id === screenshot.gameId)?.name}
                      </span>
                    </Link>
                  </div>
                )}

                <div className="flex items-center mt-2 text-sm text-muted-foreground">
                  <Eye className="h-4 w-4 mr-1" />
                  <span className="mr-3">{screenshot.views || 0} views</span>
                  <Clock className="h-4 w-4 mr-1" />
                  <span>{screenshot.createdAt ? formatDistance(new Date(screenshot.createdAt), new Date(), { addSuffix: true }) : 'Unknown time'}</span>
                </div>

                <div className="border-t border-b border-border py-3 mt-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <LikeButton
                        contentId={screenshot.id}
                        contentType="screenshot"
                        contentOwnerId={screenshot.userId}
                        initialLiked={false}
                        initialCount={(screenshot as any)._count?.likes || 0}
                        size="lg"
                      />
                      <FireButton
                        contentId={screenshot.id}
                        contentType="screenshot"
                        contentOwnerId={screenshot.userId}
                        initialFired={false}
                        initialCount={(screenshot as any)._count?.reactions || 0}
                        size="lg"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-foreground flex items-center gap-1"
                      >
                        <MessageSquare className="h-4 w-4" />
                        <span>{(screenshot as any)._count?.comments || 0}</span>
                      </Button>
                    </div>

                    <div className="flex items-center gap-2">
                      <React.Suspense fallback={null}>
                        <ScreenshotShareDialog
                          screenshotId={screenshot.id.toString()}
                          isOwnContent={isOwnContent}
                          trigger={
                            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                              <Share2 className="h-4 w-4" />
                            </Button>
                          }
                        />
                      </React.Suspense>

                      <ReportButton
                        contentType="screenshot"
                        contentId={screenshot.id}
                        contentTitle={screenshot.title}
                        variant="ghost"
                        size="sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <React.Suspense fallback={null}>
                <ScreenshotCommentSection
                  screenshotId={screenshot.id}
                />
              </React.Suspense>
            </div>
          </div>
        </div>

        {hasPrevious && (
          <button
            onClick={(e) => { e.stopPropagation(); handlePrevious(); }}
            className="fixed left-[calc(10%-80px)] top-1/2 -translate-y-1/2 z-[60] bg-black/80 hover:bg-black/90 text-white p-3 rounded-full transition-colors"
            aria-label="Previous screenshot"
          >
            <ChevronLeft className="h-7 w-7" />
          </button>
        )}
        {hasNext && (
          <button
            onClick={(e) => { e.stopPropagation(); handleNext(); }}
            className="fixed right-[calc(10%-80px)] top-1/2 -translate-y-1/2 z-[60] bg-black/80 hover:bg-black/90 text-white p-3 rounded-full transition-colors"
            aria-label="Next screenshot"
          >
            <ChevronRight className="h-7 w-7" />
          </button>
        )}
      </DialogContent>
    </Dialog>
  );
}
