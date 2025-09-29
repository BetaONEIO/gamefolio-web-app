import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ClipWithUser, User } from "@shared/schema";
import VideoPlayer from "@/components/shared/VideoPlayer";
import CommentSection from "@/components/clips/CommentSection";
import ClipSkeleton from "@/components/clips/ClipSkeleton";
import { Button } from "@/components/ui/button";
import ShareMenu from "@/components/clips/ShareMenu";
import {
  Heart,
  MessageSquare,
  Bookmark,
  Eye,
  ArrowLeft,
  User as UserIcon,
  Clock
} from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import { formatDistance } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const ClipPage = () => {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const params = useParams<{ id?: string; username?: string; clipId?: string; reelId?: string }>();

  // Determine the clip ID from various possible URL patterns
  const clipId = useMemo(() => {
    if (params.id) return params.id;
    if (params.clipId) return params.clipId;
    if (params.reelId) return params.reelId;
    return null;
  }, [params.id, params.clipId, params.reelId]);

  // Determine if we're viewing a reel or clip based on URL parameters only
  const isReelRoute = useMemo(() => {
    // Check if we have reelId parameter - this is the most reliable method
    return !!params.reelId;
  }, [params.reelId]);

  useEffect(() => {
    // Only redirect if clipId is completely invalid (null/undefined)
    if (!clipId) {
      console.log("No clip ID found, redirecting to trending");
      navigate("/trending");
    }
  }, [clipId, navigate]);

  
  // Determine if clipId is numeric (traditional ID) or alphanumeric (shareCode)
  // A numeric ID should be ONLY digits, not starting with digits followed by letters
  const isNumericId = clipId && /^\d+$/.test(clipId);
  const apiEndpoint = useMemo(() => {
    if (isReelRoute) {
      return isNumericId ? `/api/reels/${clipId}` : `/api/reels/share/${clipId}`;
    }
    return isNumericId ? `/api/clips/${clipId}` : `/api/clips/share/${clipId}`;
  }, [isReelRoute, clipId, isNumericId]);
  const { toast } = useToast();
  const [hasLiked, setHasLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [highlightCommentId, setHighlightCommentId] = useState<number | null>(null);
  
  // Navigation state for mobile swipe
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Check for openComments parameter and auto-open comments section
  useEffect(() => {
    if (!clipId) return;
    
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('openComments') === 'true') {
        setShowComments(true);
        const commentId = urlParams.get('highlightComment');
        if (commentId && !isNaN(parseInt(commentId, 10))) {
          setHighlightCommentId(parseInt(commentId, 10));
        }
        // Scroll to comments section or highlighted comment after a brief delay
        const timeoutId = setTimeout(() => {
          if (commentId) {
            // If we have a comment to highlight, scroll directly to it
            const highlightedComment = document.querySelector(`#comment-${commentId}`);
            if (highlightedComment) {
              highlightedComment.scrollIntoView({ behavior: 'smooth', block: 'center' });
              return;
            }
          }
          // Otherwise scroll to the comments section
          const commentsSection = document.querySelector('[data-comments-section]');
          if (commentsSection) {
            commentsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 1000);
        
        return () => clearTimeout(timeoutId);
      }
    } catch (error) {
      console.warn('Error processing URL parameters:', error);
    }
  }, [clipId]); // Include clipId as dependency

  // Navigation functions
  const navigateToClip = (newClipId: number) => {
    navigate(`/clips/${newClipId}`);
  };

  const navigateToPrevious = () => {
    if (!navigationClips.length || !clipId) return;
    
    const currentIndex = navigationClips.findIndex(c => c.id === parseInt(clipId) || c.shareCode === clipId);
    if (currentIndex > 0) {
      const previousClip = navigationClips[currentIndex - 1];
      // Store navigation context for the next page
      sessionStorage.setItem('clipNavContext', isFromLatestClips ? 'latest' : 'mixed');
      navigateToClip(previousClip.id);
    }
  };

  const navigateToNext = () => {
    if (!navigationClips.length || !clipId) return;
    
    const currentIndex = navigationClips.findIndex(c => c.id === parseInt(clipId) || c.shareCode === clipId);
    if (currentIndex !== -1 && currentIndex < navigationClips.length - 1) {
      const nextClip = navigationClips[currentIndex + 1];
      // Store navigation context for the next page
      sessionStorage.setItem('clipNavContext', isFromLatestClips ? 'latest' : 'mixed');
      navigateToClip(nextClip.id);
    }
  };


  // Mobile swipe navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isSignificantSwipe = Math.abs(distance) > 50;
    
    if (isSignificantSwipe) {
      if (distance > 0) {
        // Swiped up - next clip
        navigateToNext();
      } else {
        // Swiped down - previous clip
        navigateToPrevious();
      }
    }
    
    setTouchStart(0);
    setTouchEnd(0);
  };

  // In a real app, currentUserId would come from auth context
  const currentUserId = 1;

  // Detect navigation context from referrer or URL
  const isFromLatestClips = useMemo(() => {
    if (typeof window !== 'undefined') {
      const referrer = document.referrer;
      return referrer.includes('/latest-clips') || 
             window.location.pathname.includes('/latest-clips') ||
             sessionStorage.getItem('clipNavContext') === 'latest';
    }
    return false;
  }, []);

  // Fetch clips based on context
  const { data: trendingClips } = useQuery<ClipWithUser[]>({
    queryKey: ['/api/clips/trending'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !isFromLatestClips, // Don't fetch if we know we're from latest clips
  });

  const { data: latestClips } = useQuery<ClipWithUser[]>({
    queryKey: ['/api/clips'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Use the appropriate navigation source based on context
  const navigationClips = useMemo(() => {
    if (isFromLatestClips) {
      // Prioritize latest clips for navigation when coming from latest clips page
      return latestClips || [];
    } else {
      // Default behavior: combine trending + latest for broader coverage
      const combinedClips = [
        ...(trendingClips || []),
        ...(latestClips || [])
      ];
      // Remove duplicates by ID
      return combinedClips.filter((clip, index, self) => 
        self.findIndex(c => c.id === clip.id) === index
      );
    }
  }, [isFromLatestClips, trendingClips, latestClips]);

  const { data: clip, isLoading, error } = useQuery<ClipWithUser>({
    queryKey: [apiEndpoint],
    enabled: !!clipId && clipId.toString().length > 0,
    retry: 2,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Log errors when they occur
  useEffect(() => {
    if (error) {
      console.error(`Query error for ${isReelRoute ? 'reel' : 'clip'}:`, clipId, error);
    }
  }, [error, isReelRoute, clipId]);

  const likeMutation = useMutation({
    mutationFn: async () => {
      // Use the actual numeric clip ID from the loaded clip data, not the URL parameter
      const actualClipId = clip?.id;
      if (!actualClipId) {
        throw new Error("Clip data not loaded");
      }
      
      const likeEndpoint = isReelRoute ? `/api/reels/${actualClipId}/likes` : `/api/clips/${actualClipId}/likes`;
      if (hasLiked) {
        await apiRequest("DELETE", likeEndpoint);
        return false;
      } else {
        await apiRequest("POST", likeEndpoint);
        return true;
      }
    },
    onSuccess: (liked) => {
      setHasLiked(liked);
      setLikeCount(prev => liked ? prev + 1 : prev - 1);
      queryClient.invalidateQueries({ queryKey: [apiEndpoint] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to like the clip. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleLike = () => {
    if (!currentUserId) {
      toast({
        title: "Login required",
        description: "Please log in to like clips",
        variant: "default"
      });
      navigate("/auth");
      return;
    }
    likeMutation.mutate();
  };

  // Share functionality moved to ShareMenu component

  // Set initial like state when data loads
  useEffect(() => {
    if (clip) {
      setHasLiked((clip as any).likedByCurrentUser || false);
      setLikeCount((clip as any)._count?.likes || 0);
    }
  }, [clip]);

  // Keyboard navigation - moved after navigationClips is defined
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't interfere with form inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      // Allow navigation from anywhere on the page, including when video is focused
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          e.stopPropagation();
          navigateToPrevious();
          break;
        case 'ArrowRight':
          e.preventDefault();
          e.stopPropagation();
          navigateToNext();
          break;
      }
    };

    // Use capture phase to ensure we get the event before other handlers
    document.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => document.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [navigationClips, clipId]);

  if (isLoading) {
    return (
      <div className="space-y-4 py-4">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        {/* Video skeleton */}
        <div className="w-full aspect-video rounded-lg bg-card overflow-hidden">
          <Skeleton className="w-full h-full" />
        </div>

        {/* Use a modified version of our ClipSkeleton for clip details */}
        <div className="space-y-3">
          <div className="bg-card rounded-lg p-4">
            <Skeleton className="h-8 w-3/4 mb-4" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div>
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32 mt-1" />
                </div>
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-8 w-8 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            </div>
          </div>

          {/* Comments skeleton */}
          <div className="bg-card rounded-lg p-4">
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={`comment-skeleton-${i}`} className="flex gap-3">
                  <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-24 mb-1" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    console.error('Clip loading error:', error);
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <h2 className="text-2xl font-bold mb-2">Error loading clip</h2>
        <p className="text-muted-foreground mb-4">
          {error instanceof Error ? error.message : 'There was a problem loading this clip. Please try again.'}
        </p>
        <div className="flex gap-2">
          <Button onClick={() => window.location.reload()}>
            Try again
          </Button>
          <Button variant="outline" onClick={() => navigate("/")}>
            Go back to home
          </Button>
        </div>
      </div>
    );
  }

  if (!clip) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <h2 className="text-2xl font-bold mb-2">Clip not found</h2>
        <p className="text-muted-foreground mb-4">
          The clip you're looking for doesn't exist or has been removed.
        </p>
        <Button onClick={() => navigate("/")}>
          Go back to home
        </Button>
      </div>
    );
  }

  // Convert hex colors to RGB for opacity support
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  const bgRgb = (clip as any)?.user?.backgroundColor ? hexToRgb((clip as any).user.backgroundColor) : null;
  const accentRgb = (clip as any)?.user?.accentColor ? hexToRgb((clip as any).user.accentColor) : null;

  return (
    <div
      ref={containerRef}
      className="min-h-screen py-4 space-y-4"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      data-testid="clip-page-container"
    >
      <Button
        variant="ghost"
        size="sm"
        className="mb-4"
        onClick={() => navigate("/")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <VideoPlayer
        videoUrl={(clip as any).videoUrl}
        thumbnailUrl={(clip as any).thumbnailUrl === null ? undefined : (clip as any).thumbnailUrl}
        autoPlay={true}
        clipId={(clip as any).id}
      />

      <div className="flex flex-col space-y-4">
        <div className="bg-card rounded-lg p-4">
          <h1 className="text-xl md:text-2xl font-bold mb-4">{(clip as any).title}</h1>

          <div className="flex flex-wrap justify-between items-center mb-4">
            <Link href={`/profile/${(clip as any).user?.username || 'unknown'}`} className="flex items-center group">
              <img
                src={(clip as any).user?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent((clip as any).user?.displayName || 'Unknown User')}`}
                alt={(clip as any).user?.displayName || 'Unknown User'}
                className="w-10 h-10 rounded-full mr-3"
              />
              <div>
                <h3 className="font-semibold group-hover:text-primary transition-colors">
                  {(clip as any).user?.displayName || 'Unknown User'}
                </h3>
                <p className="text-muted-foreground text-sm">
                  @{(clip as any).user?.username || 'unknown'}
                </p>
              </div>
            </Link>

            <div className="flex items-center text-muted-foreground mt-2 sm:mt-0">
              <Eye className="h-4 w-4 mr-1" />
              <span className="mr-3">{(clip as any).views} views</span>
              <Clock className="h-4 w-4 mr-1" />
              <span>
                {formatDistance(new Date((clip as any).createdAt), new Date(), { addSuffix: true })}
              </span>
            </div>
          </div>

          {(clip as any).description && (
            <p className="text-card-foreground mb-4 whitespace-pre-line">
              {(clip as any).description}
            </p>
          )}

          {(clip as any).game && (
            <Link href={`/games/${(clip as any).game.id}/clips`} className="inline-block bg-green-600 text-white px-3 py-1 rounded-full text-sm font-bold hover:bg-green-500 transition-colors">
              {(clip as any).game.name}
            </Link>
          )}
        </div>

        <div className="bg-card rounded-lg p-4">
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1"
              onClick={handleLike}
            >
              <Heart
                className={cn(
                  "mr-2 h-4 w-4",
                  hasLiked ? "fill-destructive text-destructive" : ""
                )}
              />
              {likeCount} {likeCount === 1 ? "Like" : "Likes"}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="flex-1"
              onClick={() => setShowComments(!showComments)}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              {(clip as any)._count?.comments || 0} {(clip as any)._count?.comments === 1 ? "Comment" : "Comments"}
            </Button>

            {/* Social Media Share Menu */}
            <div className="flex-1 flex justify-center">
              <ShareMenu clipId={(clip as any).id} clipTitle={(clip as any).title} />
            </div>

            <Button variant="ghost" size="sm" className="flex-1">
              <Bookmark className="mr-2 h-4 w-4" />
              Save
            </Button>
          </div>
        </div>

        {showComments && (
          <div data-comments-section>
            <CommentSection
              clipId={(clip as any).id}
              currentUserId={currentUserId}
              highlightCommentId={highlightCommentId}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ClipPage;