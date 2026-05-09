import { useState } from "react";
import { Link } from "wouter";
import { ClipWithUser } from "@shared/schema";
import { formatDuration } from "@/lib/constants";
import { Eye, Play } from "lucide-react";
import { useClipDialog } from "@/hooks/use-clip-dialog";
import { LazyImage } from "@/components/ui/lazy-image";
import { TrendingClipMenu } from "@/components/clips/TrendingClipMenu";

interface TrendingVideoCardProps {
  clip: ClipWithUser;
  customAccentColor?: string;
}

const TrendingVideoCard = ({ clip }: TrendingVideoCardProps) => {
  const { openClipDialog } = useClipDialog();
  const [hidden, setHidden] = useState(false);

  if (hidden) return null;

  const handleCardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    openClipDialog(clip.id);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const actualDuration =
    clip.trimEnd && clip.trimEnd > 0
      ? clip.trimEnd - (clip.trimStart || 0)
      : clip.duration || 0;

  const isNew =
    clip.createdAt &&
    Date.now() - new Date(clip.createdAt).getTime() < 86400000 * 3;

  return (
    <div onClick={handleCardClick} className="cursor-pointer group">
      {/* 16:9 Thumbnail */}
      <div className="relative aspect-video overflow-hidden rounded-xl bg-[#0B1218] border border-[#1B2A33]">
        <div className="absolute inset-0 flex items-center justify-center z-0">
          <Play className="h-10 w-10 text-gray-600" />
        </div>

        {/* Blurred background — always shown so portrait thumbnails get filled bars;
            invisible for landscape clips (image fills the 16:9 container exactly). */}
        {(clip.thumbnailUrl) && (
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
          className={`w-full h-full group-hover:scale-105 transition-transform duration-300 object-contain ${
            clip.ageRestricted ? "blur-2xl" : ""
          }`}
          placeholder="data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='100'%20height='100'%3e%3crect%20width='100'%20height='100'%20fill='%230B1218'/%3e%3c/svg%3e"
          showLoadingSpinner={false}
          rootMargin="50px"
          containerClassName="absolute inset-0 z-10"
          fallback={
            <div className="w-full h-full flex items-center justify-center bg-[#0B1218]">
              <Play className="h-10 w-10 text-gray-600" />
            </div>
          }
        />

        {/* Age restricted overlay */}
        {clip.ageRestricted && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20 pointer-events-none">
            <div className="text-red-500 text-3xl mb-2">⚠️</div>
            <div className="text-white font-bold text-sm mb-1">Age Restricted</div>
            <div className="text-white/70 text-xs">18+ Content</div>
          </div>
        )}

        {/* Hover play */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-20 pointer-events-none">
          <div className="bg-primary/90 rounded-full p-3 transform scale-90 group-hover:scale-100 transition-transform duration-300">
            <Play className="h-6 w-6 text-white fill-white" />
          </div>
        </div>

        {/* Top-left: 18+ + NEW badges */}
        <div className="absolute top-2 left-2 z-30 flex items-center gap-1">
          {clip.ageRestricted && (
            <div className="bg-red-600 text-white text-xs px-2 py-0.5 rounded font-bold shadow-md">
              18+
            </div>
          )}
          {isNew && (
            <div className="bg-gray-600 text-white text-xs font-bold px-2 py-0.5 rounded shadow-md">
              NEW
            </div>
          )}
        </div>

        {/* Top-right: duration + views */}
        <div className="absolute top-2 right-2 z-30 flex items-center gap-1">
          {actualDuration > 0 && (
            <div className="bg-black/80 backdrop-blur-sm text-white text-xs px-2 py-0.5 rounded font-semibold">
              {formatDuration(actualDuration)}
            </div>
          )}
          <div className="bg-black/80 backdrop-blur-sm text-white text-xs px-2 py-0.5 rounded font-semibold flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {formatNumber(clip.views ?? 0)}
          </div>
        </div>
      </div>

      {/* Meta below thumbnail */}
      <div className="pt-2 px-0.5 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-[#F5F7F2] font-bold text-sm line-clamp-2 leading-tight">
            {clip.title}
          </h3>
          <Link
            href={`/profile/${clip.user.username}`}
            onClick={(e) => e.stopPropagation()}
          >
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

        {/* Three-dot menu */}
        <div
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="mt-0.5 flex-shrink-0"
        >
          <TrendingClipMenu clip={clip} onHide={() => setHidden(true)} />
        </div>
      </div>
    </div>
  );
};

export default TrendingVideoCard;
