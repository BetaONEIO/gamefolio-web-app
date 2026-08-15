import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ClipWithUser, CommentWithUser } from "@shared/schema";
import VideoPlayer from "@/components/shared/VideoPlayer";
import CommentSection from "@/components/clips/CommentSection";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import ShareLaunchIcon from "@/components/ui/ShareIcon";
import { CustomAvatar } from "@/components/ui/custom-avatar";
import { ModeratorBadge } from "@/components/ui/moderator-badge";
import { ProBadge } from "@/components/ui/pro-badge";
import { AmbassadorBadge } from "@/components/ui/ambassador-badge";
import { LikeButton } from "@/components/engagement/LikeButton";
import { FireButton } from "@/components/engagement/FireButton";
import { ClipShareDialog } from "@/components/clip/ClipShareDialog";
import { ReportDialog } from "@/components/content/ReportDialog";
import { TrendingClipMenu } from "@/components/clips/TrendingClipMenu";
import { useSignedUrl } from "@/hooks/use-signed-url";
import { useAuth } from "@/hooks/use-auth";
import { useJoinDialog } from "@/hooks/use-join-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  MessageSquare,
  Eye,
  Clock,
  ChevronLeft,
  ChevronDown,
  UserPlus,
  UserMinus,
  UserCheck,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react";
import { formatDistance } from "date-fns";
import { useState, useEffect, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import { MobileTrendingViewer } from "@/components/clips/MobileTrendingViewer";

const ClipPage = () => {
  const [, navigate] = useLocation();
  const params = useParams<{ id?: string; username?: string; clipId?: string; reelId?: string }>();
  const { toast } = useToast();
  const { user } = useAuth();
  const { openDialog } = useJoinDialog();
  const queryClient = useQueryClient();

  // Resolve clip ID from any of the registered URL patterns
  const clipId = useMemo(() => {
    if (params.clipId) return params.clipId;
    if (params.reelId) return params.reelId;
    if (params.id) return params.id;
    return null;
  }, [params.clipId, params.reelId, params.id]);

  const isReelRoute = !!params.reelId;

  useEffect(() => {
    if (!clipId) navigate("/trending");
  }, [clipId, navigate]);

  const isNumericId = clipId && /^\d+$/.test(clipId);
  const apiEndpoint = useMemo(() => {
    if (isReelRoute) return isNumericId ? `/api/reels/${clipId}` : `/api/reels/share/${clipId}`;
    return isNumericId ? `/api/clips/${clipId}` : `/api/clips/share/${clipId}`;
  }, [isReelRoute, clipId, isNumericId]);

  // --- UI state ---
  const [showComments, setShowComments] = useState(false);
  const [isClosingComments, setIsClosingComments] = useState(false);
  const [commentSheetDragY, setCommentSheetDragY] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [isPortraitClip, setIsPortraitClip] = useState(false);
  const [followRequestStatus, setFollowRequestStatus] = useState<"following" | "requested" | "not_following">("not_following");
  const [clipIsMuted, setClipIsMuted] = useState(true);
  const [clipIsPlaying, setClipIsPlaying] = useState(true);
  const [reelIsMuted, setReelIsMuted] = useState(true);
  const [reelIsPlaying, setReelIsPlaying] = useState(true);
  const [highlightCommentId, setHighlightCommentId] = useState<number | undefined>(undefined);

  const commentSheetTouchStartY = useRef<number | null>(null);
  const commentSheetTouchStartTime = useRef<number>(0);

  // Detect mobile viewport
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Auto-open comments from URL params
  useEffect(() => {
    if (!clipId) return;
    try {
      const p = new URLSearchParams(window.location.search);
      if (p.get("openComments") === "true") {
        setShowComments(true);
        const cid = p.get("highlightComment");
        if (cid && !isNaN(parseInt(cid, 10))) setHighlightCommentId(parseInt(cid, 10));
      }
    } catch {}
  }, [clipId]);

  // --- Data fetching ---
  const { data: clip, isLoading, error } = useQuery<ClipWithUser>({
    queryKey: [apiEndpoint],
    queryFn: async () => {
      const res = await fetch(apiEndpoint, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch clip");
      return res.json();
    },
    enabled: !!clipId,
    retry: 2,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000,
  });

  const { data: comments } = useQuery<CommentWithUser[]>({
    queryKey: [`/api/clips/${clip?.id}/comments`],
    queryFn: async () => {
      const res = await fetch(`/api/clips/${clip?.id}/comments`);
      if (!res.ok) throw new Error("Failed to fetch comments");
      return res.json();
    },
    enabled: !!clip?.id,
  });

  // Signed URLs for private-bucket assets
  const { signedUrl: signedThumbnailUrl } = useSignedUrl(clip?.thumbnailUrl);
  const { signedUrl: signedGameIconUrl } = useSignedUrl(clip?.game?.iconUrl);

  // Detect portrait orientation from thumbnail
  useEffect(() => {
    const url = signedThumbnailUrl || clip?.thumbnailUrl;
    if (!url || clip?.videoType === "reel") return;
    const img = new Image();
    img.onload = () => { if (img.naturalHeight > img.naturalWidth) setIsPortraitClip(true); };
    img.src = url;
  }, [signedThumbnailUrl, clip?.thumbnailUrl, clip?.videoType]);

  const isOwnClip = user?.id === clip?.user?.id;
  const isReel = clip?.videoType === "reel";

  // Follow status
  const { data: followStatus } = useQuery({
    queryKey: [`/api/users/${clip?.user?.username}/follow-status`],
    queryFn: async () => {
      const res = await fetch(`/api/users/${clip?.user?.username}/follow-status`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch follow status");
      return res.json();
    },
    enabled: !isOwnClip && !!user && !!clip?.user?.username,
  });

  useEffect(() => {
    if (followStatus === undefined || isOwnClip) return;
    if (followStatus.following) setFollowRequestStatus("following");
    else if (followStatus.requested) setFollowRequestStatus("requested");
    else setFollowRequestStatus("not_following");
  }, [followStatus, isOwnClip]);

  const followMutation = useMutation({
    mutationFn: async ({ status }: { status: "following" | "requested" | "not_following" }) => {
      if (!clip?.user?.username) throw new Error("No username");
      if (status === "following" || status === "requested") {
        const res = await fetch(`/api/users/${clip.user.username}/follow`, { method: "DELETE", credentials: "include" });
        if (!res.ok) throw new Error("Failed to unfollow");
        return { action: "unfollowed" };
      }
      const res = await fetch(`/api/users/${clip.user.username}/follow`, { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error("Failed to follow");
      return res.json();
    },
    onMutate: async () => {
      if (!clip?.user?.username) return;
      await queryClient.cancelQueries({ queryKey: [`/api/users/${clip.user.username}/follow-status`] });
      const prev = followRequestStatus;
      setFollowRequestStatus(followRequestStatus === "not_following" ? "requested" : "not_following");
      return { prev };
    },
    onError: (_, __, context) => {
      if (context?.prev) setFollowRequestStatus(context.prev);
      toast({ title: "Error", description: "Failed to update follow status.", variant: "destructive" });
    },
    onSuccess: (data) => {
      if (data.action === "unfollowed") { setFollowRequestStatus("not_following"); return; }
      if (data.status === "following") setFollowRequestStatus("following");
      else setFollowRequestStatus("requested");
    },
    onSettled: () => {
      if (clip?.user?.username) queryClient.invalidateQueries({ queryKey: [`/api/users/${clip.user.username}/follow-status`] });
    },
  });

  const handleFollowClick = () => {
    if (!user) { openDialog("follow"); return; }
    followMutation.mutate({ status: followRequestStatus });
  };

  // Comment sheet drag-to-dismiss (mobile reel)
  const handleCommentSheetTouchStart = (e: React.TouchEvent) => {
    commentSheetTouchStartY.current = e.touches[0].clientY;
    commentSheetTouchStartTime.current = Date.now();
  };
  const handleCommentSheetTouchMove = (e: React.TouchEvent) => {
    if (commentSheetTouchStartY.current === null) return;
    const delta = e.touches[0].clientY - commentSheetTouchStartY.current;
    if (delta > 0) setCommentSheetDragY(delta);
  };
  const handleCommentSheetTouchEnd = () => {
    if (commentSheetTouchStartY.current === null) return;
    const elapsed = Date.now() - commentSheetTouchStartTime.current;
    const velocity = commentSheetDragY / Math.max(elapsed, 1);
    if (commentSheetDragY > 80 || velocity > 0.5) setShowComments(false);
    setCommentSheetDragY(0);
    commentSheetTouchStartY.current = null;
  };

  const closeComments = () => {
    setIsClosingComments(true);
    setTimeout(() => { setShowComments(false); setIsClosingComments(false); }, 420);
  };

  const goBack = () => {
    if (window.history.length > 1) window.history.back();
    else navigate("/trending");
  };

  // Focus comment input (desktop)
  const focusCommentInput = () => {
    if (!user) { openDialog("comment"); return; }
    const input = document.querySelector('[data-testid="input-comment"]') as HTMLTextAreaElement;
    const scroller = document.querySelector("[data-scroll-container]");
    if (input && scroller) {
      const scrollTop = scroller.scrollTop + (input.getBoundingClientRect().top - scroller.getBoundingClientRect().top) - 100;
      scroller.scrollTo({ top: scrollTop, behavior: "smooth" });
      setTimeout(() => input.focus(), 300);
    } else if (input) {
      input.focus();
    }
  };

  // ── Loading skeleton ──
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#071013]">
        <div className="flex items-center px-4 py-2 border-b border-white/10 bg-[#081017]">
          <button onClick={goBack} className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-full flex items-center justify-center transition-transform group-hover:scale-105" style={{ background: "rgba(183,255,26,0.18)", border: "1.5px solid rgba(183,255,26,0.65)" }}>
              <ChevronLeft className="h-4 w-4 text-[#B7FF1A]" />
            </div>
            <span className="text-sm font-semibold text-white group-hover:text-[#B7FF1A] transition-colors">Trending Clips</span>
          </button>
        </div>
        <div className="flex h-[calc(100vh-53px)]">
          <div className="flex-1 bg-black">
            <Skeleton className="w-full h-full rounded-none" />
          </div>
          <div className="hidden lg:flex lg:w-[35%] flex-col p-4 gap-4 border-l border-border">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-8 w-24 rounded" />
            <div className="mt-4 space-y-3">
              {[0, 1, 2].map(i => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-3 w-20" />
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

  // ── Error / not found ──
  if (error || !clip) {
    return (
      <div className="min-h-screen bg-[#071013] flex flex-col items-center justify-center p-8 text-center">
        <h2 className="text-2xl font-bold mb-2 text-white">{error ? "Error loading clip" : "Clip not found"}</h2>
        <p className="text-muted-foreground mb-4">
          {error instanceof Error ? error.message : "This clip doesn't exist or has been removed."}
        </p>
        <div className="flex gap-2">
          {error && <Button onClick={() => window.location.reload()}>Try again</Button>}
          <Button variant="outline" onClick={() => navigate("/")}>Go home</Button>
        </div>
      </div>
    );
  }

  // ── Mobile clip: use MobileTrendingViewer (clips only, not reels) ──
  if (isMobile && !isReel) {
    return (
      <MobileTrendingViewer
        content={[clip]}
        initialIndex={0}
        onClose={goBack}
      />
    );
  }

  // ── Follow button element (reused in multiple layouts) ──
  const FollowBtn = ({ small = false }: { small?: boolean }) =>
    !isOwnClip && clip.user?.username ? (
      user ? (
        <Button
          variant={followRequestStatus === "following" ? "secondary" : "default"}
          size="sm"
          onClick={handleFollowClick}
          disabled={followMutation.isPending}
          className={cn(
            "transition-all duration-200 text-xs",
            small ? "h-7 px-3" : "h-8 px-3",
            followRequestStatus === "following" && "bg-secondary hover:bg-secondary/80",
            followRequestStatus === "requested" && "bg-orange-500 hover:bg-orange-600 text-white"
          )}
        >
          {followMutation.isPending ? (
            <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin mr-1" />
          ) : followRequestStatus === "following" ? (
            <UserCheck className="w-3 h-3 mr-1" />
          ) : followRequestStatus === "requested" ? (
            <UserMinus className="w-3 h-3 mr-1" />
          ) : (
            <UserPlus className="w-3 h-3 mr-1" />
          )}
          {followRequestStatus === "following" ? "Following" : followRequestStatus === "requested" ? "Requested" : "Follow"}
        </Button>
      ) : (
        <Link href="/auth">
          <Button variant="default" size="sm" className={cn("text-xs", small ? "h-7 px-3" : "h-8 px-3")}>
            Follow
          </Button>
        </Link>
      )
    ) : null;

  // ── Shared right-action buttons (mobile vertical stack) ──
  const MobileActionButtons = () => (
    <div
      className="absolute right-3 flex flex-col items-center space-y-5 z-50 pointer-events-auto"
      style={{ bottom: showComments ? "0.75rem" : "2rem" }}
    >
      <FireButton
        contentId={clip.id}
        contentType="clip"
        contentOwnerId={clip.userId}
        initialFired={false}
        initialCount={clip._count?.reactions || 0}
        size="lg"
        variant="vertical"
        onUnauthenticatedAction={() => openDialog("general")}
      />
      <LikeButton
        contentId={clip.id}
        contentType="clip"
        contentOwnerId={clip.userId}
        initialLiked={false}
        initialCount={clip._count?.likes || 0}
        size="lg"
        variant="vertical"
        onUnauthenticatedAction={() => openDialog("like")}
      />
      <div className="flex flex-col items-center">
        <button
          onClick={(e) => { e.stopPropagation(); if (!user) openDialog("comment"); else setShowComments(true); }}
          className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 transition-colors flex items-center justify-center"
        >
          <MessageSquare className="h-6 w-6 text-white" />
        </button>
        <span className="text-white text-xs font-medium mt-1">{comments?.length || 0}</span>
      </div>
      <div className="flex flex-col items-center">
        <ClipShareDialog
          clipId={clip.id}
          isOwnContent={user?.id === clip.userId}
          contentType={isReel ? "reel" : "clip"}
          trigger={
            <button className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 transition-colors flex items-center justify-center">
              <ShareLaunchIcon size={24} className="text-white" />
            </button>
          }
        />
        <span className="text-white text-xs font-medium mt-1">Share</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#071013]" data-testid="clip-page-container">
      {/* ── Top nav bar ── */}
      <div className="flex items-center px-4 py-2 border-b border-white/10 bg-[#081017]">
        <button onClick={goBack} className="flex items-center gap-2 group" aria-label="Back">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center transition-transform group-hover:scale-105"
            style={{ background: "rgba(183,255,26,0.18)", border: "1.5px solid rgba(183,255,26,0.65)" }}
          >
            <ChevronLeft className="h-4 w-4 text-[#B7FF1A]" />
          </div>
          <span className="text-sm font-semibold text-white group-hover:text-[#B7FF1A] transition-colors">
            Trending Clips
          </span>
        </button>
      </div>

      {/* ── Main split layout ── */}
      <div className="flex flex-col lg:flex-row h-[calc(100vh-53px)] overflow-hidden">

        {/* ════ VIDEO PANEL ════ */}
        <div
          className={cn(
            "bg-black flex items-center justify-center relative flex-shrink-0",
            isReel && isMobile
              ? showComments ? "w-full" : "w-full h-full"
              : isMobile
                ? "w-full h-full"
                : isReel
                  ? "w-full lg:w-[450px] h-full"
                  : "w-full lg:w-[65%] h-full overflow-hidden"
          )}
          style={isReel && isMobile && showComments ? { height: "43%" } : undefined}
        >

          {/* ── Mobile reel (TikTok-style fullscreen) ── */}
          {isReel && isMobile ? (
            <div className="w-full h-full flex items-center justify-center bg-black relative">
              <VideoPlayer
                videoUrl={clip.videoUrl}
                thumbnailUrl={signedThumbnailUrl || clip.thumbnailUrl || undefined}
                autoPlay={true}
                className="w-full h-full"
                objectFit="contain"
                clipId={clip.id}
                disableAspectRatio={true}
                hideControls={true}
                externalPaused={!reelIsPlaying}
                externalMuted={reelIsMuted}
                onPlayingChange={setReelIsPlaying}
                onMutedChange={setReelIsMuted}
              />
              {/* Play / mute controls top-left */}
              <div className="absolute top-4 left-4 flex items-center gap-3 z-50">
                <button onClick={() => setReelIsPlaying(!reelIsPlaying)} className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/70 flex items-center justify-center">
                  {reelIsPlaying ? <Pause className="h-5 w-5 text-white" /> : <Play className="h-5 w-5 text-white ml-0.5" />}
                </button>
                <button onClick={() => setReelIsMuted(!reelIsMuted)} className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/70 flex items-center justify-center">
                  {reelIsMuted ? <VolumeX className="h-5 w-5 text-white" /> : <Volume2 className="h-5 w-5 text-white" />}
                </button>
              </div>
              {/* TikTok overlay */}
              <div className="absolute inset-0 pointer-events-none">
                {/* Bottom-left info */}
                <div className="absolute bottom-20 left-4 right-20 z-40 pointer-events-auto">
                  <div className="flex items-center gap-2 mb-3">
                    <Link href={`/profile/${clip.user?.username}`}>
                      {clip.user && <CustomAvatar user={clip.user} size="sm" showBorder />}
                    </Link>
                    <Link href={`/profile/${clip.user?.username}`}>
                      <span className="text-white font-semibold text-sm drop-shadow-lg">@{clip.user?.username || "unknown"}</span>
                    </Link>
                    <FollowBtn small />
                  </div>
                  <h2 className="text-white font-semibold text-base mb-1 leading-tight drop-shadow-lg">{clip.title}</h2>
                  {clip.description && <p className="text-white/90 text-sm line-clamp-2 drop-shadow-lg">{clip.description}</p>}
                  {clip.game && (
                    <div className="mt-2 flex items-center gap-1.5">
                      {signedGameIconUrl && <img src={signedGameIconUrl} alt="" className="w-4 h-4 rounded" loading="lazy" />}
                      <span className="text-[#B7FF1A] text-sm font-medium drop-shadow-lg">{clip.game.name}</span>
                    </div>
                  )}
                </div>
                {/* Right action buttons */}
                <div className="absolute right-3 bottom-20 flex flex-col items-center space-y-5 z-50 pointer-events-auto">
                  <FireButton contentId={clip.id} contentType="clip" contentOwnerId={clip.userId} initialFired={false} initialCount={clip._count?.reactions || 0} size="lg" variant="vertical" onUnauthenticatedAction={() => openDialog("general")} />
                  <LikeButton contentId={clip.id} contentType="clip" contentOwnerId={clip.userId} initialLiked={false} initialCount={clip._count?.likes || 0} size="lg" variant="vertical" onUnauthenticatedAction={() => openDialog("like")} />
                  <div className="flex flex-col items-center">
                    <button onClick={() => { if (!user) openDialog("comment"); else setShowComments(true); }} className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 transition-colors flex items-center justify-center">
                      <MessageSquare className="h-6 w-6 text-white" />
                    </button>
                    <span className="text-white text-xs font-medium mt-1">{comments?.length || 0}</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <ClipShareDialog clipId={clip.id} isOwnContent={user?.id === clip.userId} contentType="reel" trigger={
                      <button className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 transition-colors flex items-center justify-center">
                        <ShareLaunchIcon size={24} className="text-white" />
                      </button>
                    } />
                    <span className="text-white text-xs font-medium mt-1">Share</span>
                  </div>
                </div>
              </div>
            </div>

          /* ── Desktop reel ── */
          ) : isReel ? (
            <div className="h-full w-full flex items-center justify-center bg-black relative">
              <VideoPlayer
                videoUrl={clip.videoUrl}
                thumbnailUrl={signedThumbnailUrl || clip.thumbnailUrl || undefined}
                autoPlay={true}
                className="h-full max-h-full"
                objectFit="contain"
                clipId={clip.id}
              />
            </div>

          /* ── Mobile clip (flex-col so comments push video up) ── */
          ) : isMobile ? (
            <div className="absolute inset-0 flex flex-col bg-black overflow-hidden">
              {/* Video area */}
              <div
                className="relative flex-shrink-0 overflow-hidden transition-[height] duration-300 ease-in-out"
                style={{ height: showComments ? "38%" : "100%", flex: showComments ? "none" : "1" }}
              >
                {(signedThumbnailUrl || clip.thumbnailUrl) && (
                  <div className="absolute inset-0 z-0">
                    <img src={signedThumbnailUrl || clip.thumbnailUrl || ""} alt="" aria-hidden className="w-full h-full object-cover" style={{ filter: "blur(24px)", opacity: 0.35, transform: "scale(1.08)" }} />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 z-[1]" />
                <div className="absolute inset-0 z-10 flex items-center justify-center">
                  <div
                    className="relative flex-shrink-0"
                    style={isPortraitClip ? { height: "100%", aspectRatio: "9/16", overflow: "hidden" } : { width: "100%", height: "100%" }}
                  >
                    <VideoPlayer
                      videoUrl={clip.videoUrl}
                      thumbnailUrl={signedThumbnailUrl || clip.thumbnailUrl || undefined}
                      autoPlay={true}
                      className="w-full h-full"
                      objectFit="contain"
                      clipId={clip.id}
                      disableAspectRatio={true}
                      externalMuted={clipIsMuted}
                      externalPaused={!clipIsPlaying}
                      onMutedChange={setClipIsMuted}
                      onPlayingChange={setClipIsPlaying}
                      onAspectRatioDetected={setIsPortraitClip}
                      videoStyle={isPortraitClip ? { objectFit: "contain", width: "100%", height: "100%", maxHeight: "100%" } : undefined}
                    />
                  </div>
                </div>
                {/* Bottom-left info (hidden when comments open) */}
                {!showComments && (
                  <div className="absolute bottom-4 left-4 right-24 z-40 pointer-events-auto">
                    <div className="flex items-center gap-2 mb-2">
                      <Link href={`/profile/${clip.user?.username}`}>
                        {clip.user && <CustomAvatar user={clip.user} size="sm" showBorder />}
                      </Link>
                      <Link href={`/profile/${clip.user?.username}`}>
                        <span className="text-white font-semibold text-sm drop-shadow-lg">@{clip.user?.username || "unknown"}</span>
                      </Link>
                      <FollowBtn small />
                    </div>
                    <h2 className="text-white font-semibold text-base mb-1 leading-tight drop-shadow-lg line-clamp-2">{clip.title}</h2>
                    {clip.description && <p className="text-white/80 text-sm line-clamp-2 drop-shadow-lg">{clip.description}</p>}
                    {clip.game && (
                      <div className="mt-1 flex items-center gap-1.5">
                        {signedGameIconUrl && <img src={signedGameIconUrl} alt="" className="w-4 h-4 rounded" loading="lazy" />}
                        <span className="text-[#B7FF1A] text-sm font-medium drop-shadow-lg">{clip.game.name}</span>
                      </div>
                    )}
                  </div>
                )}
                <MobileActionButtons />
              </div>
              {/* Mobile comments panel */}
              {(showComments || isClosingComments) && (
                <div
                  className="flex-1 flex flex-col overflow-hidden"
                  style={{
                    background: "#0B1218",
                    borderRadius: "20px 20px 0 0",
                    paddingBottom: "env(safe-area-inset-bottom, 0px)",
                    transform: isClosingComments ? "translateY(100%)" : "translateY(0)",
                    transition: "transform 0.42s cubic-bezier(0.32, 0, 0.67, 0)",
                  }}
                >
                  <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                    <div className="w-10 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.18)" }} />
                  </div>
                  <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                    <h3 className="text-white font-bold text-base">
                      Comments <span className="text-white/45 font-normal text-sm">{comments?.length || 0}</span>
                    </h3>
                    <button onClick={closeComments} className="w-8 h-8 flex items-center justify-center rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                      <ChevronDown className="h-5 w-5 text-white/70" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    <CommentSection clipId={clip.id} currentUserId={user?.id} highlightCommentId={highlightCommentId} />
                  </div>
                </div>
              )}
            </div>

          /* ── Desktop clip — blurred bg + portrait/landscape aware ── */
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-black overflow-hidden">
              {(signedThumbnailUrl || clip.thumbnailUrl) && (
                <div className="absolute inset-0 z-0">
                  <img
                    src={signedThumbnailUrl || clip.thumbnailUrl || ""}
                    alt="" aria-hidden
                    className="w-full h-full object-cover"
                    style={{ filter: "blur(24px)", opacity: 0.35, transform: "scale(1.08)" }}
                  />
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 z-[1]" />
              <div
                className={cn("relative z-10 flex-shrink-0", !isPortraitClip && "w-full h-full")}
                style={isPortraitClip ? { height: "100%", aspectRatio: "9/16", maxWidth: "480px", overflow: "hidden" } : undefined}
              >
                <VideoPlayer
                  videoUrl={clip.videoUrl}
                  thumbnailUrl={signedThumbnailUrl || clip.thumbnailUrl || undefined}
                  autoPlay={true}
                  className="w-full h-full"
                  objectFit="contain"
                  clipId={clip.id}
                  disableAspectRatio={true}
                  persistControls={true}
                  transparentBg={true}
                  onAspectRatioDetected={setIsPortraitClip}
                  videoStyle={isPortraitClip ? { objectFit: "contain", width: "100%", height: "100%", maxHeight: "100%" } : undefined}
                />
              </div>
            </div>
          )}
        </div>

        {/* ════ INFO & COMMENTS PANEL ════ */}
        <div className={cn(
          "flex flex-col",
          // Mobile clips: info is in the overlay above — hide this panel
          isMobile && !isReel ? "hidden"
            : isReel && isMobile && !showComments ? "hidden"
            : isReel && isMobile && showComments ? "flex-1 min-h-0 flex flex-col overflow-hidden"
            : isReel ? "w-full lg:w-[35%] h-full overflow-hidden border-l border-border"
            : "w-full lg:flex-1 lg:min-w-0 min-h-0 h-full overflow-hidden border-l border-border"
        )}>

          {/* Mobile reel comments sheet */}
          {isReel && isMobile && (showComments || isClosingComments) ? (
            <div
              className="flex flex-col h-full overflow-hidden"
              style={isClosingComments
                ? { transform: "translateY(100%)", transition: "transform 0.42s cubic-bezier(0.32, 0, 0.67, 0)" }
                : { transform: `translateY(${commentSheetDragY}px)`, transition: commentSheetDragY > 0 ? "none" : "transform 0.3s ease-out" }
              }
              onTouchStart={handleCommentSheetTouchStart}
              onTouchMove={handleCommentSheetTouchMove}
              onTouchEnd={handleCommentSheetTouchEnd}
            >
              <div
                className="flex-shrink-0 px-4 pt-3 pb-3"
                style={{ background: "#0B1218", borderRadius: "20px 20px 0 0", borderBottom: "1px solid rgba(255,255,255,0.07)" }}
              >
                <div className="flex justify-center mb-3">
                  <div className="w-10 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.18)" }} />
                </div>
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-bold text-base">
                    Comments <span className="text-white/45 font-normal text-sm">{comments?.length || 0}</span>
                  </h3>
                  <button onClick={closeComments} className="w-8 h-8 flex items-center justify-center rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <ChevronDown className="h-5 w-5 text-white/70" />
                  </button>
                </div>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto" style={{ background: "#0B1218" }}>
                <CommentSection clipId={clip.id} currentUserId={user?.id || null} />
              </div>
            </div>

          ) : (
            /* Desktop / reel desktop right panel */
            <>
              {/* Fixed user header */}
              <div className="border-b border-border flex items-center justify-between flex-shrink-0 p-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex-shrink-0">
                    {clip.user && <CustomAvatar user={clip.user} size="md" showBorder />}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    {clip.user?.username ? (
                      <Link href={`/profile/${clip.user.username}`}>
                        <div className="font-medium flex items-center gap-1 hover:text-primary transition-colors cursor-pointer">
                          @{clip.user.username}
                          <ModeratorBadge
                            isModerator={
                              ((clip.user as any).role === "moderator" || (clip.user as any).role === "admin") &&
                              !(clip.user as any).selectedVerificationBadgeId
                            }
                            size="sm"
                          />
                          <ProBadge selectedVerificationBadgeId={(clip.user as any).selectedVerificationBadgeId} size="sm" />
                          <AmbassadorBadge isAmbassador={(clip.user as any).isAmbassador} size="sm" />
                        </div>
                      </Link>
                    ) : (
                      <div className="font-medium text-muted-foreground">Unknown user</div>
                    )}
                    <FollowBtn small />
                  </div>
                </div>
              </div>

              {/* Scrollable content: title + engagement + comments */}
              <div
                className="flex-1 min-h-0 overflow-y-auto space-y-3 px-4 py-3"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                data-scroll-container
              >
                <div className="flex-shrink-0">
                  <h1 className="font-semibold text-xl">{clip.title}</h1>
                  {clip.description && (
                    <p className="text-foreground mt-1 leading-relaxed break-words max-h-24 overflow-y-auto text-base">
                      {clip.description}
                    </p>
                  )}

                  {clip.game && (
                    <div className="mt-2">
                      <Link href={`/games/${clip.game.name.toLowerCase().replace(/[^a-z0-9]/g, "")}`}>
                        <span className="bg-primary text-[#071013] px-3 py-1.5 rounded text-sm font-bold hover:bg-primary/90 cursor-pointer transition-colors">
                          {clip.game.name}
                        </span>
                      </Link>
                    </div>
                  )}

                  <div className="flex items-center mt-2 text-sm text-muted-foreground">
                    <Eye className="h-4 w-4 mr-1" />
                    <span className="mr-3">{clip.views} views</span>
                    <Clock className="h-4 w-4 mr-1" />
                    <span>{clip.createdAt ? formatDistance(new Date(clip.createdAt), new Date(), { addSuffix: true }) : "Unknown"}</span>
                  </div>

                  {/* Action bar */}
                  <div className="border-t border-b border-border py-3 mt-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <LikeButton
                          contentId={clip.id}
                          contentType="clip"
                          initialLiked={false}
                          initialCount={clip._count?.likes || 0}
                          size="sm"
                          onUnauthenticatedAction={() => openDialog("like")}
                        />
                        <FireButton
                          contentId={clip.id}
                          contentType="clip"
                          contentOwnerId={clip.userId}
                          initialFired={false}
                          initialCount={clip._count?.reactions || 0}
                          size="sm"
                          onUnauthenticatedAction={() => openDialog("general")}
                        />
                        <div className="flex items-center gap-1">
                          <button
                            onClick={focusCommentInput}
                            className="p-0 h-auto transition-colors text-muted-foreground hover:text-white focus:outline-none"
                          >
                            <MessageSquare className="h-[18px] w-[18px]" />
                          </button>
                          <span className="font-medium min-w-[1rem] text-center text-base text-muted-foreground">
                            {comments?.length || 0}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <ClipShareDialog
                          clipId={clip.id}
                          isOwnContent={user?.id === clip.userId}
                          contentType={isReel ? "reel" : "clip"}
                          trigger={
                            <button className="focus:outline-none">
                              <ShareLaunchIcon size={24} className="text-white" />
                            </button>
                          }
                        />
                        <ReportDialog
                          contentType="clip"
                          contentId={clip.id}
                          contentTitle={clip.title}
                          contentAuthor={clip.user?.username || ""}
                        />
                        <TrendingClipMenu clip={clip} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Comments section */}
                <div className="pt-2 pb-4">
                  <CommentSection
                    clipId={clip.id}
                    currentUserId={user?.id || null}
                    highlightCommentId={highlightCommentId}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClipPage;
