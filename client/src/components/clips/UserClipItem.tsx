import { ClipWithUser } from "@shared/schema";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import { formatDuration } from "@/lib/constants";
import { Play, Eye } from "lucide-react";
import { useClipDialog } from "@/hooks/use-clip-dialog";
import QuickShareButton from "@/components/clips/QuickShareButton";
import { Link, useLocation } from "wouter";
import { LikeButton } from "@/components/engagement/LikeButton";
import { FireButton } from "@/components/engagement/FireButton";

interface UserClipItemProps {
  clip: ClipWithUser;
}

const UserClipItem = ({ clip }: UserClipItemProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { openClipDialog } = useClipDialog();
  const [, setLocation] = useLocation();
  
  // Initialize or update video on hover
  useEffect(() => {
    if (isHovered && videoRef.current && videoRef.current.isConnected) {
      // Play the video when hovered
      videoRef.current.play().catch(e => {
        console.log("Auto-play prevented:", e);
      });
    } else if (!isHovered && videoRef.current) {
      // When not hovering, pause video
      videoRef.current.pause();
    }
  }, [isHovered]);

  // Handle click on clip
  const handleClipClick = () => {
    openClipDialog(clip.id);
  };
  
  // Handle comment click - opens clip dialog
  const handleCommentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    openClipDialog(clip.id);
  };
  
  // Handle click on game
  const handleGameClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening the clip dialog
    if (clip.game) {
      setLocation(`/explore?game=${clip.game.id}`);
    }
  };

  return (
    <div 
      className="overflow-hidden relative group bg-[#1E2327] rounded-sm cursor-pointer aspect-square"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClipClick}
    >
      <div className="relative overflow-hidden w-full h-full"> 
        {/* Video element for hover playback */}
        <video 
          ref={videoRef}
          src={clip.videoUrl || ""}
          {...(clip.thumbnailUrl ? { poster: clip.thumbnailUrl } : {})}
          preload="metadata"
          muted
          loop
          className={cn(
            "w-full h-full object-cover object-center transition-opacity duration-200",
            isHovered ? "opacity-100" : "opacity-0"
          )}
        />
        
        {/* Static thumbnail (shown when not hovering) */}
        <img 
          src={clip.thumbnailUrl || "/assets/video-placeholder.svg"} 
          alt={clip.title} 
          className={cn(
            "w-full h-full object-cover object-center absolute inset-0 transition-opacity duration-200",
            isHovered ? "opacity-0" : "opacity-100"
          )}
        />
        
        {/* Username removed from thumbnail as requested */}
        
        {/* Play overlay on hover */}
        <div className={cn(
          "absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 transition-opacity duration-200",
          isHovered ? "opacity-100" : "opacity-0"
        )}>
          <div className="bg-emerald-500 bg-opacity-90 rounded-full p-3">
            <Play className="h-7 w-7 text-white" fill="white" />
          </div>
        </div>
        
        {/* Metadata overlay that appears on hover */}
        <div className={cn(
          "absolute inset-0 bg-black bg-opacity-70 p-3 flex flex-col justify-end transition-opacity duration-200",
          isHovered ? "opacity-100" : "opacity-0"
        )}>
          <h3 className="font-medium text-emerald-400 truncate">{clip.title}</h3>
          
          {/* Game name - clickable */}
          {clip.game && (
            <div 
              className="text-sm text-primary-500 mt-1 truncate hover:underline cursor-pointer inline-block"
              onClick={handleGameClick}
            >
              {clip.game.name}
            </div>
          )}
          
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center">
              <img 
                src={clip.user.avatarUrl || `https://ui-avatars.com/api/?name=${clip.user.displayName}`} 
                alt={clip.user.displayName} 
                className="w-5 h-5 rounded-full mr-2"
              />
              <span className="text-sm text-white">{clip.user.displayName}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div onClick={(e) => e.stopPropagation()}>
                <LikeButton 
                  contentId={clip.id} 
                  contentType="clip" 
                  contentOwnerId={clip.userId}
                  initialCount={parseInt(clip._count?.likes?.toString() || '0')} 
                  size="sm"
                />
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                <FireButton 
                  contentId={clip.id} 
                  contentType="clip" 
                  contentOwnerId={clip.userId}
                  initialCount={0}
                  size="sm"
                />
              </div>
              <div className="flex items-center cursor-pointer hover:text-blue-400 transition-colors" onClick={handleCommentClick}>
                <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                </svg>
                <span className="text-xs">{clip._count?.comments || 0}</span>
              </div>
              <span onClick={(e) => e.stopPropagation()}>
                <QuickShareButton clipId={clip.id} clipTitle={clip.title} size="sm" />
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Top right badges: duration and views - same structure as VideoClipGridItem */}
      <div className="absolute top-2 right-2 flex items-center gap-1">
        {/* Duration badge - use actual duration from database */}
        {clip.duration && clip.duration > 0 && (
          <div className="bg-black/70 backdrop-blur-sm text-white px-2 py-1 text-xs rounded-md font-medium">
            {formatDuration(clip.duration)}
          </div>
        )}
        {/* View count badge */}
        <div className="bg-black/70 backdrop-blur-sm text-white px-2 py-1 text-xs rounded-md font-medium flex items-center gap-1">
          <Eye className="h-3 w-3" />
          {(clip.views ?? 0) > 1000 ? `${((clip.views ?? 0) / 1000).toFixed(1)}K` : (clip.views ?? 0)}
        </div>
      </div>
    </div>
  );
};

export default UserClipItem;