import { useClipDialog } from "@/hooks/use-clip-dialog";
import { ClipWithUser } from "@shared/schema";
import { Play, Gamepad2, Trash2, MoreVertical, Eye } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { LazyImage } from "@/components/ui/lazy-image";

interface VideoClipGridItemProps {
  clip: ClipWithUser;
  userId?: number;
  compact?: boolean; // Add compact prop for smaller grid items
  customCardColor?: string; // Custom card color from user profile
  customAccentColor?: string; // Custom accent color from user profile
  canDelete?: boolean; // Whether the user can delete this clip
  onDelete?: () => void; // Callback function for deleting the clip
  reelsList?: ClipWithUser[];
  clipsList?: ClipWithUser[]; // Add clips list for navigation
}

const VideoClipGridItem = ({ clip, userId, compact = false, customCardColor, customAccentColor, canDelete = false, onDelete, reelsList, clipsList }: VideoClipGridItemProps) => {
  const { openClipDialog } = useClipDialog();
  const [, navigate] = useLocation();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleOpenClip = () => {
    // If this is a reel and we have a reelsList, pass it for fullscreen navigation
    // Otherwise if we have a clipsList, pass that for clip navigation
    // This ensures the same pattern as LatestReelsPage and other pages
    const contextList = reelsList || clipsList;
    openClipDialog(clip.id, contextList);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      if (confirm(`Are you sure you want to delete "${clip.title}"? This action cannot be undone.`)) {
        onDelete();
      }
    }
  };

  // Determine aspect ratio based on video type
  const isReel = clip.videoType === 'reel';
  const aspectRatioClass = isReel ? 'aspect-[9/16]' : 'aspect-video';

  // Use the actual thumbnail URL from the clip data (user-selected or auto-generated)
  // For videos without thumbnails, use the video itself with poster frame
  const thumbnailUrl = clip.thumbnailUrl;
  const hasNoThumbnail = !thumbnailUrl;

  return (
    <div
      className={`relative overflow-hidden rounded-xl cursor-pointer group clip-hover clip-highlight transition-all duration-500 border ${aspectRatioClass} ${
        compact ? 'compact-clip' : ''
      }`}
      style={{ 
        borderColor: customAccentColor ? `${customAccentColor}30` : 'rgba(255,255,255,0.05)',
        boxShadow: customAccentColor 
          ? `0 10px 25px -5px ${customAccentColor}40, 0 4px 6px -2px ${customAccentColor}20` 
          : '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
      }}
      onClick={handleOpenClip}
    >
      {/* Thumbnail with enhanced visual appearance and lazy loading */}
      {hasNoThumbnail ? (
        <video
          src={clip.videoUrl}
          className={`w-full h-full object-cover ${clip.ageRestricted ? 'blur-2xl' : ''}`}
          preload="metadata"
          muted
          playsInline
        />
      ) : (
        <LazyImage
          src={thumbnailUrl}
          alt={clip.title || "Video clip thumbnail"}
          className={`w-full h-full object-cover ${clip.ageRestricted ? 'blur-2xl' : ''}`}
          placeholder="data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='100'%20height='100'%3e%3crect%20width='100'%20height='100'%20fill='%23f3f4f6'/%3e%3c/svg%3e"
          showLoadingSpinner={true}
          rootMargin="100px"
          threshold={0.1}
        />
      )}

      {/* Age Restricted Overlay */}
      {clip.ageRestricted && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-10 pointer-events-none">
          <div className="text-red-500 text-4xl mb-2">⚠️</div>
          <div className="text-white font-bold text-sm mb-1">Age Restricted</div>
          <div className="text-white/70 text-xs">18+ Content</div>
        </div>
      )}

      {/* View count overlay on hover */}
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-10 pointer-events-none">
        <div className="flex items-center gap-2 text-white">
          <Eye size={20} />
          <span className="text-lg font-semibold">{clip.views ?? 0}</span>
        </div>
      </div>

      {/* Bottom overlay for title */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3">
        <h3 className={`text-white font-semibold line-clamp-1 ${
          compact ? 'text-sm' : 'text-base'
        }`}>
          {clip.title}
        </h3>
        <Link href={`/profile/${clip.user.username}`} onClick={(e) => e.stopPropagation()}>
          <p className={`text-white/80 hover:text-white transition-colors cursor-pointer ${compact ? 'text-xs' : 'text-sm'}`}>
            @{clip.user.username}
          </p>
        </Link>
        {/* Game name below username */}
        {clip.gameId && clip.game && (
          <Link 
            href={`/games/${clip.gameId}/clips`}
            onClick={(e) => e.stopPropagation()}
            className={`inline-block mt-1 bg-green-600 text-white rounded font-bold hover:bg-green-500 transition-all duration-300 ${
              isReel ? 'text-[8px] px-1 py-0.5 md:text-[9px] md:px-1.5' : compact ? 'text-[9px] px-1.5 py-0.5 md:text-[10px] md:px-2' : 'text-[10px] px-1.5 py-0.5 md:text-xs md:px-2 md:py-1'
            }`}
          >
            {clip.game.name}
          </Link>
        )}
      </div>

      {/* Enhanced play button with pulse effect */}
      <div className="play-icon absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className={`bg-primary/90 rounded-full shadow-xl play-pulse backdrop-blur-sm transform scale-90 group-hover:scale-100 transition-transform duration-500 ${
          compact ? 'p-2' : 'p-3 md:p-4'
        }`}>
          <Play size={compact ? 24 : 32} className="text-white fill-white" />
        </div>
      </div>

      {/* Top left section */}
      <div className="absolute top-1.5 md:top-2 left-1.5 md:left-2 flex items-center gap-1 z-10">
        {/* Age Restriction badge */}
        {clip.ageRestricted && (
          <div className={`bg-red-600 text-white font-bold shadow-lg ${
            isReel ? 'text-[8px] px-1 py-0.5 rounded md:text-[9px] md:px-1.5' : compact ? 'text-[9px] px-1.5 py-0.5 rounded md:text-[10px] md:px-2' : 'text-[10px] px-1.5 py-0.5 rounded md:text-xs md:px-2 md:py-1 md:rounded-md'
          }`}>
            18+
          </div>
        )}
        {/* NEW badge - shows for clips created within last 3 days */}
        {clip.createdAt && Date.now() - new Date(clip.createdAt).getTime() < 86400000 * 3 && (
          <div className={`bg-gray-600 text-white font-bold transform rotate-1 shadow-lg ${
            isReel ? 'text-[8px] px-1 py-0.5 rounded md:text-[9px] md:px-1.5' : compact ? 'text-[9px] px-1.5 py-0.5 rounded md:text-[10px] md:px-2' : 'text-[10px] px-1.5 py-0.5 rounded md:text-xs md:px-2 md:py-1 md:rounded-md'
          }`}>
            NEW
          </div>
        )}
      </div>


      {/* Top right section with stats - matches VideoClipCard styling */}
      <div className="absolute top-1.5 md:top-2 right-1.5 md:right-2 flex items-center gap-0.5 md:gap-1 z-10">
        {/* Duration badge - use actual duration from database */}
        {clip.duration && clip.duration > 0 && (
          <div className="bg-black/70 backdrop-blur-sm text-white px-1 py-0.5 md:px-1.5 md:py-0.5 text-[9px] md:text-[10px] rounded font-medium">
            {`${Math.floor(clip.duration / 60)}:${(clip.duration % 60).toString().padStart(2, '0')}`}
          </div>
        )}

        {/* View count with icon */}
        <div className="bg-black/70 backdrop-blur-sm text-white px-1 py-0.5 md:px-1.5 md:py-0.5 text-[9px] md:text-[10px] rounded font-medium flex items-center gap-0.5">
          <Eye className="h-2.5 w-2.5 md:h-3 md:w-3" />
          {(clip.views ?? 0) > 1000 ? `${((clip.views ?? 0) / 1000).toFixed(1)}K` : (clip.views ?? 0)}
        </div>
      </div>

    </div>
  );
};

export default VideoClipGridItem;