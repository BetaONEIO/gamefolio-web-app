import { Link, useLocation } from "wouter";
import { ClipWithUser } from "@shared/schema";
import { formatDuration } from "@/lib/constants";
import { Flame, Heart, MessageSquare, Eye, Tag, Share2, Play } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { FireButton } from "@/components/engagement/FireButton";
import { useClipDialog } from "@/hooks/use-clip-dialog";
import QuickShareButton from "@/components/clips/QuickShareButton";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useJoinDialog } from "@/hooks/use-join-dialog";
import { JoinGamefolioDialog } from "@/components/auth/JoinGamefolioDialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipShareDialog } from "@/components/clip/ClipShareDialog";
import { useLikeClip } from "@/hooks/use-clips";
import { ReportButton } from "@/components/reporting/ReportButton";
import { LazyImage } from "@/components/ui/lazy-image";
import { useSignedUrl } from "@/hooks/use-signed-url";
import { AppealDialog } from "@/components/moderation/AppealDialog";
import { Button } from "@/components/ui/button";

interface VideoClipCardProps {
  clip: ClipWithUser;
  userId?: number;
  clipsList?: ClipWithUser[]; // Add clips list for navigation
  customAccentColor?: string; // Custom accent color from user profile
}

const VideoClipCard = ({ clip, userId, clipsList, customAccentColor }: VideoClipCardProps) => {
  const { openClipDialog } = useClipDialog();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { isOpen: joinDialogOpen, actionType, openDialog, closeDialog } = useJoinDialog();
  const likeMutation = useLikeClip();
  const { signedUrl: signedAvatarUrl } = useSignedUrl(clip.user?.avatarUrl);
  // Fire functionality now handled by FireButton component
  const [isAnimating, setIsAnimating] = useState(false);
  const [likeCount, setLikeCount] = useState(() => {
    const likeCountValue = typeof clip._count?.likes === 'string' ? parseInt(clip._count.likes) : clip._count?.likes || 0;
    return isNaN(likeCountValue) ? 0 : likeCountValue;
  });

  // Check if user has liked this clip
  const { data: likeStatus } = useQuery({
    queryKey: ['clipLikeStatus', clip.id],
    queryFn: async () => {
      if (!userId) return { hasLiked: false };
      const response = await fetch(`/api/clips/${clip.id}/likes/status`, {
        credentials: 'include'
      });
      if (!response.ok) return { hasLiked: false };
      return response.json();
    },
    enabled: !!userId,
  });

  const hasUserLiked = likeStatus?.hasLiked || false;

  useEffect(() => {
    const likeCountValue = typeof clip._count?.likes === 'string' ? parseInt(clip._count.likes) : clip._count?.likes || 0;
    setLikeCount(isNaN(likeCountValue) ? 0 : likeCountValue);
  }, [clip._count?.likes]);

  // Format the timestamp
  const formatDate = (date: Date) => {
    const daysDiff = Math.round((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 0) return 'Today';
    if (daysDiff === -1) return 'Yesterday';
    if (daysDiff < -1 && daysDiff > -7) return `${Math.abs(daysDiff)} days ago`;
    if (daysDiff < -7 && daysDiff > -30) return `${Math.floor(Math.abs(daysDiff) / 7)} weeks ago`;
    
    return date.toLocaleDateString();
  };

  // Handle like button click
  const handleLikeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!userId) {
      toast({
        title: "Not logged in",
        description: "You need to be logged in to like clips",
        variant: "default"
      });
      return;
    }
    
    // Prevent users from liking their own content
    if (user?.id === clip.userId) {
      toast({
        title: "Cannot like own content",
        description: "You cannot like your own content, casual!",
        variant: "destructive"
      });
      return;
    }
    
    // Trigger animation when liking (not unliking)
    if (!hasUserLiked) {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 2000); // 2 second animation
    }
    
    likeMutation.mutate({
      clipId: clip.id,
      unlike: hasUserLiked
    });
    
    toast({
      title: hasUserLiked ? "Unliked" : "Liked!",
      description: hasUserLiked ? "Removed from your liked clips" : "Added to your liked clips ❤️",
      variant: "default"
    });
  };
  
  // Fire button now handled by FireButton component with proper backend integration

  // Handle click on the clip card - open dialog instead of navigating
  const handleCardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // Open clip dialog with the clips list for navigation
    openClipDialog(clip.id, clipsList || [clip]);
  };

  return (
    <div
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      aria-label={`Play video: ${clip.title}`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleCardClick(e as any); } }}
    >
      <Card 
        className="relative overflow-hidden group cursor-pointer transition-all duration-300"
        style={{
          boxShadow: customAccentColor 
            ? `0 10px 25px -5px ${customAccentColor}40, 0 4px 6px -2px ${customAccentColor}20` 
            : '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
        }}
      >
        {/* Thumbnail with duration */}
        <div className="relative overflow-hidden bg-gray-800" style={{ aspectRatio: clip.videoType === 'reel' ? "9/16" : "16/9" }}>
          {/* Default fallback - always visible as background */}
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800 z-0">
            <Play className="h-12 w-12 text-gray-500" />
          </div>
          <LazyImage
            src={clip.thumbnailUrl || `/api/clips/${clip.id}/thumbnail`}
            alt={clip.title}
            className="relative z-10 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            placeholder="data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='100'%20height='100'%3e%3crect%20width='100'%20height='100'%20fill='%231f2937'/%3e%3c/svg%3e"
            showLoadingSpinner={false}
            containerClassName="absolute inset-0 z-10"
            fallback={
              <div className="w-full h-full flex items-center justify-center bg-gray-800">
                <Play className="h-12 w-12 text-gray-500" />
              </div>
            }
          />
          
          {/* Top right badges: duration and views */}
          <div className="absolute top-2 right-2 flex items-center gap-1">
            <div className="bg-black/70 backdrop-blur-sm text-white px-2 py-1 text-xs rounded-md font-medium">
              {formatDuration(
                clip.trimEnd && clip.trimEnd > 0
                  ? clip.trimEnd - (clip.trimStart || 0)
                  : clip.duration || 0
              )}
            </div>
            <div className="bg-black/70 backdrop-blur-sm text-white px-2 py-1 text-xs rounded-md font-medium flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {(clip.views ?? 0) > 1000 ? `${((clip.views ?? 0) / 1000).toFixed(1)}K` : (clip.views ?? 0)}
            </div>
          </div>

          {/* Moderation status badge — shown only to the owner on non-approved content.
              Rejected/flagged items get an inline Appeal button. */}
          {user?.id === clip.userId && (clip as any).moderationStatus && (clip as any).moderationStatus !== 'approved' && (
            <div className="absolute top-2 left-2 flex items-center gap-2 z-20" onClick={(e) => e.stopPropagation()}>
              <div
                className={`text-white text-xs px-2 py-1 rounded-md font-semibold shadow-lg ${
                  (clip as any).moderationStatus === 'rejected' ? 'bg-red-600' :
                  (clip as any).moderationStatus === 'pending' ? 'bg-blue-600' : 'bg-amber-600'
                }`}
                title={
                  (clip as any).moderationStatus === 'rejected'
                    ? 'Removed by content moderation'
                    : (clip as any).moderationStatus === 'pending'
                    ? 'Your video is being reviewed — it will go live once approved'
                    : 'Pending review — only visible to you until approved'
                }
              >
                {(clip as any).moderationStatus === 'rejected' ? 'Removed' :
                 (clip as any).moderationStatus === 'pending' ? 'Reviewing' : 'Pending review'}
              </div>
              {((clip as any).moderationStatus === 'rejected' || (clip as any).moderationStatus === 'flagged') && (
                <AppealDialog
                  contentType={clip.videoType === 'reel' ? 'reel' : 'clip'}
                  contentId={clip.id}
                  trigger={
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-6 px-2 text-xs bg-black/70 hover:bg-black/90 text-white border-white/20"
                    >
                      Appeal
                    </Button>
                  }
                />
              )}
            </div>
          )}
          
          {/* Bottom right badges container */}
          <div className="absolute bottom-2 right-2 flex items-center gap-1">
            {/* Game name badge - grey color, positioned next to NEW badge */}
            {clip.gameId && clip.game && (
              <Link 
                href={`/games/${clip.game.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`}
                onClick={(e) => e.stopPropagation()}
                className="bg-gray-600 text-white px-2 py-1 text-xs font-bold rounded-md hover:bg-gray-500 transition-colors"
              >
                {clip.game.name}
              </Link>
            )}
            
            {/* NEW badge for recent clips */}
            {clip.createdAt && Date.now() - new Date(clip.createdAt).getTime() < 86400000 * 3 && (
              <div className="bg-gray-600 text-white font-bold transform rotate-1 shadow-lg text-xs px-2 py-1 rounded-md">
                NEW
              </div>
            )}
          </div>
        </div>
        
        {/* Details */}
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <Link href={`/profile/${clip.user.username}`} onClick={(e) => e.stopPropagation()}>
                {clip.user.nftProfileTokenId && clip.user.nftProfileImageUrl && (clip.user as any).activeProfilePicType === 'nft' ? (
                  <div className="h-8 w-8 mr-3 rounded-lg overflow-hidden border border-[#4ade80]/40 hover:opacity-80 transition-opacity cursor-pointer">
                    <img src={clip.user.nftProfileImageUrl} alt={clip.user.displayName} loading="lazy" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <Avatar className="h-8 w-8 mr-3 hover:opacity-80 transition-opacity cursor-pointer">
                    <AvatarImage src={signedAvatarUrl || `/uploaded_assets/gamefolio social logo 3d circle web.png`} />
                    <AvatarFallback className="text-sm">{clip.user.displayName.charAt(0)}</AvatarFallback>
                  </Avatar>
                )}
              </Link>
              <div>
                <h3 className="font-semibold text-base text-foreground line-clamp-2 leading-tight">{clip.title}</h3>
                <div className="text-sm text-muted-foreground leading-tight flex items-center mt-1">
                  <Link href={`/profile/${clip.user.username}`} onClick={(e) => e.stopPropagation()}>
                    <span className="hover:text-foreground transition-colors cursor-pointer font-medium">{clip.user.displayName}</span>
                  </Link>
                  <span className="ml-1">• {clip.createdAt ? formatDate(new Date(clip.createdAt)) : 'Unknown'}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Tags - shown only when space allows */}
          {clip.tags && clip.tags.length > 0 && clip.tags.slice(0, 2).map((tag, index) => (
            <Badge key={index} variant="outline" className="text-xs mt-1 py-1 h-6 px-2">
              <Tag className="h-3 w-3 mr-1" /> {tag}
            </Badge>
          ))}
        </CardContent>
        
        {/* Interactions */}
        <CardFooter className="px-3 py-2 border-t flex justify-between">
          <div className="flex items-center space-x-1.5">
            <button 
              onClick={handleLikeClick}
              className={`flex items-center text-[9px] transition-colors ${hasUserLiked ? 'text-green-500' : 'text-muted-foreground hover:text-green-500'}`}
            >
              <Heart 
                className={`h-2.5 w-2.5 transition-all duration-300 ${
                  hasUserLiked 
                    ? `fill-green-500 stroke-green-500 text-green-500 ${isAnimating ? 'animate-bounce scale-125' : 'scale-110'}` 
                    : 'stroke-muted-foreground hover:stroke-green-500 fill-transparent hover:scale-105'
                }`} 
                style={{
                  animation: isAnimating ? 'heartGrow 2s ease-out' : undefined
                }}
              />
              <span className="ml-0.5">{likeCount}</span>
              {/* Debug indicator showing server state */}
              {hasUserLiked && <span className="text-green-500 text-xs ml-1">✓</span>}
            </button>
            
            <FireButton 
              contentId={clip.id}
              contentType="clip"
              contentOwnerId={clip.userId}
              initialFired={false}
              initialCount={clip._count?.reactions || 0}
              size="sm"
              onUnauthenticatedAction={() => openDialog('general')}
            />
            
            <div className="flex items-center text-[9px] text-muted-foreground">
              <MessageSquare className="h-2.5 w-2.5" />
              <span className="ml-0.5">{clip._count?.comments || 0}</span>
            </div>
            
            <ClipShareDialog 
              clipId={clip.id} 
              isOwnContent={user?.id === clip.userId}
              trigger={
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  className="flex items-center text-[9px] text-muted-foreground hover:text-primary"
                >
                  <Share2 className="h-2.5 w-2.5" />
                </button>
              } 
            />
            
            <ReportButton
              contentType="clip"
              contentId={clip.id}
              contentTitle={clip.title}
              variant="minimal"
              size="sm"
              className="text-[9px]"
            />
          </div>
        </CardFooter>
      </Card>
      
      <JoinGamefolioDialog 
        open={joinDialogOpen} 
        onOpenChange={closeDialog} 
        actionType={actionType} 
      />
    </div>
  );
};

export default VideoClipCard;