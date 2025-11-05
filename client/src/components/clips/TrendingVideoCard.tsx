import { Link } from "wouter";
import { ClipWithUser } from "@shared/schema";
import { formatDuration } from "@/lib/constants";
import { Eye, Play } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useClipDialog } from "@/hooks/use-clip-dialog";
import { useState } from "react";
import { LazyImage, LazyAvatar } from "@/components/ui/lazy-image";

interface TrendingVideoCardProps {
  clip: ClipWithUser;
  customAccentColor?: string; // Custom accent color from user profile
}

const TrendingVideoCard = ({ clip, customAccentColor }: TrendingVideoCardProps) => {
  const { openClipDialog } = useClipDialog();
  const [imageError, setImageError] = useState(false);

  const handleCardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    openClipDialog(clip.id);
  };

  // Format numbers for display
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div onClick={handleCardClick} className="cursor-pointer">
      <Card 
        className="overflow-hidden group transition-all duration-300 hover:-translate-y-1"
        style={{
          boxShadow: customAccentColor 
            ? `0 10px 25px -5px ${customAccentColor}40, 0 4px 6px -2px ${customAccentColor}20` 
            : '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
        }}
      >
        {/* Thumbnail with lazy loading */}
        <div className="relative overflow-hidden aspect-video bg-gray-900">
          {!imageError ? (
            <LazyImage
              src={clip.thumbnailUrl || `/api/clips/${clip.id}/thumbnail`}
              alt={clip.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              placeholder="data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='100'%20height='100'%3e%3crect%20width='100'%20height='100'%20fill='%23374151'/%3e%3c/svg%3e"
              showLoadingSpinner={true}
              rootMargin="50px"
              fallback={
                <div className="w-full h-full flex items-center justify-center bg-gray-800">
                  <Play className="h-12 w-12 text-gray-500" />
                </div>
              }
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-800">
              <Play className="h-12 w-12 text-gray-500" />
            </div>
          )}
          
          {/* Play overlay */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <div className="bg-primary/90 rounded-full p-3 transform scale-90 group-hover:scale-100 transition-transform duration-300">
              <Play className="h-6 w-6 text-white fill-white" />
            </div>
          </div>

          {/* Age Restriction badge */}
          {clip.ageRestricted && (
            <div className="absolute top-2 left-2 bg-red-600 text-white text-xs px-2 py-1 rounded font-bold shadow-lg">
              18+
            </div>
          )}

          {/* Duration badge */}
          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
            {(() => {
              const actualDuration = clip.trimEnd && clip.trimEnd > 0 
                ? clip.trimEnd - (clip.trimStart || 0)
                : clip.duration || 0;
              return formatDuration(actualDuration);
            })()}
          </div>

          {/* View count */}
          <div className="absolute top-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {formatNumber(clip.views ?? 0)}
          </div>
        </div>

        {/* Content */}
        <CardContent className="p-3">
          <h3 className="font-semibold text-sm line-clamp-2 mb-2 leading-tight">
            {clip.title}
          </h3>
          
          <div className="flex items-center justify-between">
            <Link href={`/profile/${clip.user.username}`} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <LazyAvatar
                  src={clip.user.avatarUrl}
                  alt={clip.user.displayName || clip.user.username}
                  size="sm"
                  className="h-6 w-6"
                  fallbackText={clip.user.displayName?.[0] || clip.user.username[0]}
                  showLoadingSpinner={false}
                />
                <span className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {clip.user.displayName || clip.user.username}
                </span>
              </div>
            </Link>
            
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>♥ {formatNumber(parseInt(clip._count?.likes?.toString() || '0'))}</span>
              <span>💬 {formatNumber(parseInt(clip._count?.comments?.toString() || '0'))}</span>
            </div>
          </div>
          
          {/* Game info */}
          {clip.game && (
            <div className="mt-2">
              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                {clip.game.name}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TrendingVideoCard;