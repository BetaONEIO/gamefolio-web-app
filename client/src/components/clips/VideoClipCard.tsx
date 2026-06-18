import { Link } from "wouter";
import { ClipWithUser } from "@shared/schema";
import { formatDuration } from "@/lib/constants";
import { Eye, Play } from "lucide-react";
import { LazyImage } from "@/components/ui/lazy-image";
import { TrendingClipMenu } from "@/components/clips/TrendingClipMenu";
import { useClipDialog } from "@/hooks/use-clip-dialog";

interface VideoClipCardProps {
  clip: ClipWithUser;
  userId?: number;
  clipsList?: ClipWithUser[];
  customAccentColor?: string;
}

const VideoClipCard = ({ clip, clipsList }: VideoClipCardProps) => {
  const { openClipDialog } = useClipDialog();
  const allClips = clipsList || [clip];

  const handleCardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    openClipDialog(clip.id, allClips, undefined, 'clip');
  };

  const isNew = clip.createdAt && Date.now() - new Date(clip.createdAt).getTime() < 86400000 * 3;
  const actualDuration =
    clip.trimEnd && clip.trimEnd > 0
      ? clip.trimEnd - (clip.trimStart || 0)
      : clip.duration || 0;
  const viewCount = clip.views ?? 0;
  const formattedViews =
    viewCount >= 1000000
      ? `${(viewCount / 1000000).toFixed(1)}M`
      : viewCount >= 1000
      ? `${(viewCount / 1000).toFixed(1)}K`
      : viewCount;

  return (
    <>
    <div
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      aria-label={`Play video: ${clip.title}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleCardClick(e as any);
        }
      }}
      className="cursor-pointer group"
    >
      {/* 16:9 Thumbnail */}
      <div className="relative aspect-video overflow-hidden rounded-xl bg-[#0B1218] transition-transform duration-300 group-hover:-translate-y-1.5 group-hover:shadow-[0_8px_24px_rgba(0,0,0,0.55)]">
        <div className="absolute inset-0 flex items-center justify-center bg-[#0B1218] z-0">
          <Play className="h-10 w-10 text-gray-600" />
        </div>

        {/* Blurred background — always shown; invisible for landscape (fills 16:9 container
            exactly with object-contain); visible as bars for portrait clips. */}
        {clip.thumbnailUrl && (
          <div className="absolute inset-0 z-[1] overflow-hidden">
            <img
              src={clip.thumbnailUrl || `/api/clips/${clip.id}/thumbnail`}
              alt=""
              aria-hidden="true"
              className="w-full h-full object-cover"
              style={{ filter: 'blur(24px)', opacity: 0.35, transform: 'scale(1.08)' }}
            />
          </div>
        )}

        <LazyImage
          src={clip.thumbnailUrl || `/api/clips/${clip.id}/thumbnail`}
          alt={clip.title}
          className="w-full h-full object-contain"
          placeholder="data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='100'%20height='100'%3e%3crect%20width='100'%20height='100'%20fill='%230B1218'/%3e%3c/svg%3e"
          showLoadingSpinner={false}
          rootMargin="400px"
          containerClassName="absolute inset-0 z-10"
          fallback={
            <div className="w-full h-full flex items-center justify-center bg-[#0B1218]">
              <Play className="h-10 w-10 text-gray-600" />
            </div>
          }
        />

        {/* Hover play overlay */}
        <div className="absolute inset-0 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none">
          <div className="bg-primary/90 rounded-full p-3 transform scale-90 group-hover:scale-100 transition-transform duration-300 backdrop-blur-sm">
            <Play className="h-6 w-6 text-white fill-white" />
          </div>
        </div>

        {/* Top-left: NEW badge */}
        <div className="absolute top-2 left-2 z-30 flex items-center gap-1">
          {isNew && (
            <div className="bg-gray-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-md">
              NEW
            </div>
          )}
        </div>

        {/* Top-right: duration + views */}
        <div className="absolute top-2 right-2 z-30 flex items-center gap-1">
          {actualDuration > 0 && (
            <div className="bg-black/70 backdrop-blur-sm text-white px-2 py-0.5 text-[10px] rounded-md font-semibold">
              {formatDuration(actualDuration)}
            </div>
          )}
          <div className="bg-black/70 backdrop-blur-sm text-white px-2 py-0.5 text-[10px] rounded-md font-semibold flex items-center gap-1">
            <Eye className="h-2.5 w-2.5" />
            {formattedViews}
          </div>
        </div>
      </div>

      {/* Meta below thumbnail */}
      <div className="pt-2 px-0.5">
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0 flex-1">
            <h3 className="text-[#F5F7F2] font-bold text-sm line-clamp-2 leading-tight">
              {clip.title}
            </h3>
            <Link href={`/profile/${clip.user.username}`} onClick={(e) => e.stopPropagation()}>
              <p className="text-[#B8C0AE] text-xs mt-0.5 hover:text-[#F5F7F2] transition-colors">
                @{clip.user.username}
              </p>
            </Link>
            {clip.game?.name && (
              <Link
                href={`/games/${clip.game.name.toLowerCase().replace(/[^a-z0-9]/g, "")}`}
                onClick={(e) => e.stopPropagation()}
              >
                <span
                  className="inline-block mt-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded hover:opacity-90 transition-opacity"
                  style={{ background: "#B7FF1A", color: "#03080A" }}
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
    </>
  );
};

export default VideoClipCard;
