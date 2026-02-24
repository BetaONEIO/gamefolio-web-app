import React, { useState, useCallback, useEffect } from "react";
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
import { Eye, Clock, MessageSquare, Share2, User as UserIcon, UserPlus, UserCheck, ChevronLeft, ChevronRight } from "lucide-react";
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

  if (!screenshot) return null;

  return (
    <Dialog open={!!screenshot} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-[80%] w-[80%] p-0 bg-background text-foreground max-h-[76vh] h-[76vh] overflow-y-auto lg:overflow-hidden screenshot-lightbox-close">
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

        {hasPrevious && (
          <button
            onClick={(e) => { e.stopPropagation(); handlePrevious(); }}
            className="fixed left-4 top-1/2 -translate-y-1/2 z-[70] bg-black/60 hover:bg-black/80 text-white p-3 rounded-full transition-colors"
            aria-label="Previous screenshot"
          >
            <ChevronLeft className="h-7 w-7" />
          </button>
        )}
        {hasNext && (
          <button
            onClick={(e) => { e.stopPropagation(); handleNext(); }}
            className="fixed right-4 top-1/2 -translate-y-1/2 z-[70] bg-black/60 hover:bg-black/80 text-white p-3 rounded-full transition-colors"
            aria-label="Next screenshot"
          >
            <ChevronRight className="h-7 w-7" />
          </button>
        )}

        <div className="flex flex-col lg:flex-row h-auto lg:h-full min-h-full">
          <div className="bg-black flex items-center justify-center w-full lg:w-[75%] h-[50vh] lg:h-full flex-shrink-0">
            <img
              src={signedUrl || screenshot.imageUrl}
              alt={screenshot.title}
              className="max-w-full max-h-full object-contain"
            />
          </div>

          <div className="flex flex-col w-full lg:w-[25%] lg:h-full">
            <div className="border-b border-border p-4 pr-12">
              <div className="flex items-center justify-between">
                <div className="flex items-center min-w-0">
                  {screenshotUser?.nftProfileTokenId && screenshotUser?.nftProfileImageUrl ? (
                    <div className="w-8 h-8 rounded-lg overflow-hidden border border-[#4ade80]/40 mr-3 flex-shrink-0">
                      <img src={screenshotUser.nftProfileImageUrl} alt={screenshotUser.displayName || ''} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center overflow-hidden mr-3 flex-shrink-0">
                      {avatarSignedUrl ? (
                        <img
                          src={avatarSignedUrl}
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

            <div className="flex-1 lg:overflow-y-auto px-4 py-3 space-y-3">
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
      </DialogContent>
    </Dialog>
  );
}
