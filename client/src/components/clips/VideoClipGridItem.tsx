import { useState } from "react";
import { useLazyVideo } from "@/hooks/use-lazy-video";
import { useClipDialog } from "@/hooks/use-clip-dialog";
import { ClipWithUser } from "@shared/schema";
import { Play, Eye, Loader2, AlertTriangle } from "lucide-react";
import { Link } from "wouter";
import { LazyImage } from "@/components/ui/lazy-image";
import { TrendingClipMenu } from "@/components/clips/TrendingClipMenu";

interface VideoClipGridItemProps {
  clip: ClipWithUser;
  userId?: number;
  compact?: boolean;
  customCardColor?: string;
  customAccentColor?: string;
  canDelete?: boolean;
  onDelete?: () => void;
  reelsList?: ClipWithUser[];
  clipsList?: ClipWithUser[];
  onCardClick?: (clipId: number, clips: ClipWithUser[]) => void;
  bottomPadding?: boolean;
  viewAllHref?: string;
}

const VideoClipGridItem = ({
  clip,
  compact = false,
  customAccentColor,
  canDelete = false,
  onDelete,
  reelsList,
  clipsList,
  onCardClick,
  bottomPadding = false,
  viewAllHref,
}: VideoClipGridItemProps) => {
  const { openClipDialog } = useClipDialog();
  const lazyVideo = useLazyVideo({ autoPlay: false });
  const [isPortraitThumbnail, setIsPortraitThumbnail] = useState(false);

  const handleThumbnailLoad = (e: { currentTarget: HTMLImageElement }) => {
    const img = e.currentTarget;
    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      setIsPortraitThumbnail(img.naturalHeight > img.naturalWidth);
    }
  };

  const isProcessing = clip.status === "processing";
  const isFailed = clip.status === "failed";
  const uploadSource = (clip as ClipWithUser & { uploadSource?: "publisher" | "community" }).uploadSource;

  const handleOpenClip = () => {
    // Not ready to watch yet — nothing to open.
    if (isProcessing || isFailed) return;
    const contextList = reelsList || clipsList || [];
    if (onCardClick) {
      onCardClick(clip.id, contextList);
    } else {
      // If opened from a clips context (clipsList provided, no reelsList), force the clip viewer
      // so that clips with videoType==='reel' in the DB still open in the clip-style UI.
      const forceViewerType = clipsList && !reelsList ? 'clip' : undefined;
      openClipDialog(clip.id, contextList.length ? contextList : undefined, viewAllHref, forceViewerType as 'clip' | 'reel' | undefined);
    }
  };

  // Treat as a reel only when in a reels context (reelsList provided).
  // A clip with videoType==='reel' that appears in a clips section should render as a clip.
  const isReel = clip.videoType === "reel" && !!reelsList && !clipsList;
  const aspectRatioClass = isReel ? "aspect-[9/16]" : "aspect-video";
  const thumbnailUrl = clip.thumbnailUrl;
  const hasNoThumbnail = !thumbnailUrl;
  const isNew =
    clip.createdAt &&
    Date.now() - new Date(clip.createdAt).getTime() < 86400000 * 3;

  const showBlur = isPortraitThumbnail && !isReel;

  const isInteractive = !isProcessing && !isFailed;

  return (
    <div className={`${isInteractive ? "cursor-pointer" : "cursor-default"} group`} onClick={handleOpenClip}>
      <div
        className={`relative overflow-hidden rounded-xl ${aspectRatioClass} border transition-transform duration-300 ${isInteractive ? "group-hover:-translate-y-1.5 group-hover:shadow-[0_8px_24px_rgba(0,0,0,0.55)]" : ""}`}
        style={{
          borderColor: customAccentColor
            ? `${customAccentColor}30`
            : "rgba(255,255,255,0.05)",
        }}
      >
        {(isProcessing || isFailed) && hasNoThumbnail ? (
          // No preview thumbnail available (generation timed out/failed) —
          // fall back to a plain placeholder instead of trying to play the
          // raw, not-yet-processed video.
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-[#0B1218]">
            {isFailed ? (
              <AlertTriangle size={compact ? 18 : 24} className="text-red-400" />
            ) : (
              <Loader2 size={compact ? 18 : 24} className="text-white/40 animate-spin" />
            )}
          </div>
        ) : hasNoThumbnail ? (
          <video
            ref={lazyVideo.ref}
            src={lazyVideo.visible ? (clip.videoUrl ?? undefined) : undefined}
            className={`w-full h-full ${isReel ? "object-contain" : "object-cover"}`}
            preload="none"
            muted
            playsInline
            onContextMenu={(e) => e.preventDefault()}
            controlsList="nodownload noremoteplayback noplaybackrate"
            disablePictureInPicture
          />
        ) : (
          <>
            {showBlur && (
              <div className="absolute inset-0 z-[1] overflow-hidden">
                <img
                  src={thumbnailUrl}
                  alt=""
                  aria-hidden="true"
                  className="w-full h-full object-cover"
                  style={{ filter: 'blur(20px)', opacity: 0.65, transform: 'scale(1.1)' }}
                />
              </div>
            )}
            <LazyImage
              src={thumbnailUrl}
              alt={clip.title || "Video clip thumbnail"}
              className={`w-full h-full relative z-[2] ${
                isReel ? "object-contain" : showBlur ? "object-contain" : "object-cover"
              }`}
              placeholder="data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='100'%20height='100'%3e%3crect%20width='100'%20height='100'%20fill='%230B1218'/%3e%3c/svg%3e"
              showLoadingSpinner={true}
              rootMargin="100px"
              threshold={0.1}
              onLoad={handleThumbnailLoad}
            />
          </>
        )}

        {isProcessing || isFailed ? (
          // Content isn't watchable yet — always-on dim + status icon
          // instead of the hover-to-play affordance below.
          <div className="absolute inset-0 bg-black/55 flex items-center justify-center z-10 pointer-events-none">
            {isFailed ? (
              <AlertTriangle size={compact ? 20 : 28} className="text-red-400" />
            ) : (
              <Loader2 size={compact ? 20 : 28} className="text-white/80 animate-spin" />
            )}
          </div>
        ) : (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-10 pointer-events-none">
            <div
              className={`bg-primary/90 rounded-full shadow-xl backdrop-blur-sm transform scale-90 group-hover:scale-100 transition-transform duration-500 ${
                compact ? "p-2" : "p-3"
              }`}
            >
              <Play
                size={compact ? 20 : 28}
                className="text-white fill-white"
              />
            </div>
          </div>
        )}

        <div className="absolute top-1.5 left-1.5 flex items-center gap-1 z-20">
          {uploadSource && (
            <div className={`rounded-md border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] shadow-md backdrop-blur-sm ${
              uploadSource === "publisher"
                ? "border-[#B7FF18]/35 bg-[#B7FF18]/85 text-[#07100A]"
                : "border-white/20 bg-black/70 text-white/80"
            }`}>
              {uploadSource === "publisher" ? "Publisher" : "Community"}
            </div>
          )}
          {isProcessing && (
            <div className="bg-black/70 backdrop-blur-sm text-white/90 font-bold text-[9px] px-1.5 py-0.5 rounded shadow-md flex items-center gap-1">
              <Loader2 size={9} className="animate-spin" /> PROCESSING
            </div>
          )}
          {isFailed && (
            <div className="bg-red-500/80 backdrop-blur-sm text-white font-bold text-[9px] px-1.5 py-0.5 rounded shadow-md">
              FAILED
            </div>
          )}
          {!isProcessing && !isFailed && isNew && (
            <div className="bg-gray-600 text-white font-bold text-[9px] px-1.5 py-0.5 rounded shadow-md">
              NEW
            </div>
          )}
        </div>

        <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 z-20">
          {clip.duration && clip.duration > 0 && (
            <div className="bg-black/70 backdrop-blur-sm text-white px-1.5 py-0.5 text-[9px] rounded font-semibold">
              {`${Math.floor(clip.duration / 60)}:${(clip.duration % 60)
                .toString()
                .padStart(2, "0")}`}
            </div>
          )}
          <div className="bg-black/70 backdrop-blur-sm text-white px-1.5 py-0.5 text-[9px] rounded font-semibold flex items-center gap-0.5">
            <Eye className="h-2.5 w-2.5" />
            {(clip.views ?? 0) >= 1000
              ? `${((clip.views ?? 0) / 1000).toFixed(1)}K`
              : (clip.views ?? 0)}
          </div>
        </div>
      </div>

      <div className={`pt-1.5 px-0.5 ${bottomPadding ? 'pb-10' : 'pb-2'}`}>
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0 flex-1">
            <h3
              className={`text-[#F5F7F2] font-bold line-clamp-1 leading-tight ${
                compact ? "text-xs" : "text-sm"
              }`}
            >
              {clip.title}
            </h3>
            <Link
              href={`/profile/${clip.user.username}`}
              onClick={(e) => e.stopPropagation()}
            >
              <p
                className={`text-[#B8C0AE] mt-0.5 hover:text-[#F5F7F2] transition-colors ${
                  compact ? "text-[10px]" : "text-xs"
                }`}
              >
                @{clip.user.username}
              </p>
            </Link>
            {clip.game?.name && (
              <Link
                href={`/games/${clip.game.name.toLowerCase().replace(/[^a-z0-9]/g, "")}`}
                onClick={(e) => e.stopPropagation()}
              >
                <span
                  className="inline-block mt-1 font-bold rounded hover:opacity-90 transition-opacity"
                  style={{
                    background: "#B7FF1A",
                    color: "#03080A",
                    fontSize: compact ? "8px" : "10px",
                    padding: compact ? "1px 5px" : "2px 6px",
                    marginBottom: "10px",
                  }}
                >
                  {clip.game.name}
                </span>
              </Link>
            )}
          </div>
          <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }} className="flex-shrink-0 -mt-0.5">
            <TrendingClipMenu clip={clip} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoClipGridItem;