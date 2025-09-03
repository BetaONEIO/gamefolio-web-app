import { useClipDialog } from "@/hooks/use-clip-dialog";
import { ClipWithUser } from "@shared/schema";
import { Play, Gamepad2, Trash2, MoreVertical, Eye } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleOpenClip = () => {
    // Pass reels list if this is a reel and we have the list
    if (clip.videoType === 'reel' && reelsList) {
      openClipDialog(clip.id, reelsList, true); // Enable fullscreen mode for reels
    } else if (clipsList) {
      // Pass clips list for regular clips navigation
      openClipDialog(clip.id, clipsList);
    } else {
      openClipDialog(clip.id);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      if (confirm(`Are you sure you want to delete "${clip.title}"? This action cannot be undone.`)) {
        onDelete();
      }
    }
  };

  // Use the actual thumbnail URL from the clip data (user-selected or auto-generated)
  // Fall back to dynamic generation only if no thumbnail is stored
  const thumbnailUrl = clip.thumbnailUrl || `/api/clips/${clip.id}/thumbnail`;

  // Determine aspect ratio based on video type
  const isReel = clip.videoType === 'reel';
  const aspectRatioClass = isReel ? 'aspect-[9/16]' : 'aspect-video';

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
      {/* Thumbnail with enhanced visual appearance */}
      <img
        src={thumbnailUrl}
        alt={clip.title || "Video clip thumbnail"}
        className="w-full h-full object-cover"
      />

      {/* View count overlay on hover */}
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
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
      </div>

      {/* Enhanced play button with pulse effect */}
      <div className="play-icon absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className={`bg-primary/90 rounded-full shadow-xl play-pulse backdrop-blur-sm transform scale-90 group-hover:scale-100 transition-transform duration-500 ${
          compact ? 'p-2' : 'p-3 md:p-4'
        }`}>
          <Play size={compact ? 24 : 32} className="text-white fill-white" />
        </div>
      </div>

      {/* Top right section with stats and delete button */}
      <div className={`absolute top-2 right-2 flex items-center gap-1 ${
        compact ? 'opacity-0 group-hover:opacity-100 transition-opacity duration-300' : ''
      }`}>
        {/* Duration badge */}
        <div className="bg-black/60 backdrop-blur-sm text-white text-xs px-1.5 py-0.5 rounded-md font-medium flex items-center gap-1 border border-white/10">
          {(() => {
            const actualDuration = clip.trimEnd && clip.trimEnd > 0 
              ? clip.trimEnd - (clip.trimStart || 0)
              : clip.duration || 0;
            return `${Math.floor(actualDuration / 60)}:${(actualDuration % 60).toString().padStart(2, '0')}`;
          })()}
        </div>

        {/* Delete button for clip owner */}
        {canDelete && (
          <Button
            size="sm"
            variant="destructive"
            className="bg-red-600 hover:bg-red-700 text-white p-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            onClick={handleDeleteClick}
            title="Delete clip"
          >
            <Trash2 size={12} />
          </Button>
        )}

        {/* View count with icon - show only in non-compact mode */}
        {!compact && (
          <div className="bg-black/60 backdrop-blur-sm text-white text-xs px-1.5 py-0.5 rounded-md font-medium flex items-center gap-1 border border-white/10">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            {(clip.views ?? 0) > 1000 ? `${((clip.views ?? 0) / 1000).toFixed(1)}K` : (clip.views ?? 0)}
          </div>
        )}
      </div>

      {/* Bottom right badges container */}
      <div className="absolute bottom-2 right-2 flex items-center gap-1">
        {/* Game name badge - green color, positioned next to NEW badge */}
        {clip.gameId && clip.game && (
          <Link 
            href={`/games/${clip.gameId}/clips`}
            onClick={(e) => e.stopPropagation()}
            className={`bg-green-600 text-white px-2 py-1 rounded-md font-bold hover:bg-green-500 transition-all duration-300 ${
              compact ? 'text-[10px]' : 'text-xs'
            }`}
          >
            {clip.game.name}
          </Link>
        )}

        {/* Latest clip indicator - smaller for compact mode */}
        {clip.createdAt && Date.now() - new Date(clip.createdAt).getTime() < 86400000 * 3 && (
          <div className={`bg-gray-600 text-white font-bold transform rotate-1 shadow-lg ${
            compact ? 'text-[10px] px-1.5 py-0.5 rounded' : 'text-xs px-2 py-1 rounded-md'
          }`}>
            NEW
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoClipGridItem;