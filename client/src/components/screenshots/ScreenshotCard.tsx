import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Heart, MessageSquare, Share2, Eye, Flag, X } from 'lucide-react';
import { Card, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FireButton } from '@/components/engagement/FireButton';
import { ScreenshotShareDialog } from '@/components/screenshot/ScreenshotShareDialog';
import { ReportButton } from '@/components/reporting/ReportButton';
import { ReportDialog } from '@/components/content/ReportDialog';
import { useLikeScreenshot } from '@/hooks/use-clips';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

interface ScreenshotCardProps {
  screenshot: any;
  isHighlighted?: boolean;
  isOwnProfile?: boolean;
  profile: any;
  onDelete?: (id: number) => void;
  onSelect?: (screenshot: any) => void;
}

export function ScreenshotCard({ 
  screenshot, 
  isHighlighted, 
  isOwnProfile, 
  profile, 
  onDelete, 
  onSelect 
}: ScreenshotCardProps) {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  
  // Screenshot like functionality
  const likeMutation = useLikeScreenshot();
  const [isAnimating, setIsAnimating] = useState(false);
  const [likeCount, setLikeCount] = useState(() => {
    const screenshotAny = screenshot as any;
    const likeCountValue = typeof screenshotAny._count?.likes === 'string' ? parseInt(screenshotAny._count.likes) : screenshotAny._count?.likes || 0;
    return isNaN(likeCountValue) ? 0 : likeCountValue;
  });

  // Check if user has liked this screenshot
  const { data: likeStatus } = useQuery({
    queryKey: ['screenshotLikeStatus', screenshot.id],
    queryFn: async () => {
      if (!currentUser) return { hasLiked: false };
      const response = await fetch(`/api/screenshots/${screenshot.id}/likes/status`, {
        credentials: 'include'
      });
      if (!response.ok) return { hasLiked: false };
      return response.json();
    },
    enabled: !!currentUser,
  });

  const hasUserLiked = likeStatus?.hasLiked || false;

  // Handle like button click
  const handleLikeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!currentUser) {
      toast({
        title: "Not logged in",
        description: "You need to be logged in to like screenshots",
        variant: "default"
      });
      return;
    }
    
    // Prevent users from liking their own content
    if (currentUser?.id === screenshot.userId) {
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
      setTimeout(() => setIsAnimating(false), 2000);
    }
    
    likeMutation.mutate({
      screenshotId: screenshot.id,
      unlike: hasUserLiked
    });
    
    toast({
      title: hasUserLiked ? "Unliked" : "Liked!",
      description: hasUserLiked ? "Removed from your liked screenshots" : "Added to your liked screenshots ❤️",
      variant: "default"
    });
  };

  return (
    <Card 
      className={`relative overflow-hidden group cursor-pointer transition-all duration-300 hover:shadow-lg ${
        isHighlighted ? 'ring-4 ring-primary ring-offset-2' : ''
      }`}
      id={isHighlighted ? `screenshot-${screenshot.id}` : undefined}
    >
      <div 
        className="aspect-video rounded-lg overflow-hidden bg-black relative"
        onClick={() => onSelect?.(screenshot)}
      >
        <img 
          src={screenshot.imageUrl || undefined} 
          alt={screenshot.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Action buttons for screenshots */}
        {isOwnProfile ? (
          <Button
            size="sm"
            variant="destructive"
            className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 h-8 w-8 md:h-7 md:w-7"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (confirm(`Are you sure you want to delete "${screenshot.title}"? This action cannot be undone.`)) {
                onDelete?.(screenshot.id);
              }
            }}
            title="Delete screenshot"
            data-testid="button-delete-screenshot"
          >
            <X className="h-4 w-4 md:h-3 md:w-3" />
          </Button>
        ) : (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <ReportDialog
              contentType="screenshot"
              contentId={screenshot.id}
              contentTitle={screenshot.title}
              contentAuthor={profile.username}
              trigger={
                <Button
                  size="sm"
                  variant="secondary"
                  className="bg-black/50 hover:bg-black/70 text-white border-red-500 hover:border-red-400 p-1 h-7 w-7"
                  onClick={(e) => e.stopPropagation()}
                  title="Report screenshot"
                >
                  <Flag size={12} />
                </Button>
              }
            />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
          <div className="absolute bottom-2 left-2 right-2 pointer-events-none">
            <h4 className="text-white text-xs font-medium truncate">{screenshot.title}</h4>
            <p className="text-white/80 text-xs truncate">{profile.displayName || profile.username}</p>
          </div>
        </div>
      </div>

      {/* Engagement Footer - Match clip layout exactly */}
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
            {hasUserLiked && <span className="text-green-500 text-xs ml-1">✓</span>}
          </button>
          
          <FireButton 
            contentId={screenshot.id}
            contentType="screenshot"
            contentOwnerId={screenshot.userId}
            initialFired={false}
            initialCount={(screenshot as any)._count?.reactions || 0}
            size="sm"
          />
          
          <div className="flex items-center text-[9px] text-muted-foreground">
            <MessageSquare className="h-2.5 w-2.5" />
            <span className="ml-0.5">{(screenshot as any)._count?.comments || 0}</span>
          </div>
          
          <ScreenshotShareDialog 
            screenshotId={screenshot.id.toString()} 
            isOwnContent={currentUser?.id === screenshot.userId}
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
            contentType="screenshot"
            contentId={screenshot.id}
            contentTitle={screenshot.title}
            variant="minimal"
            size="sm"
            className="text-[9px]"
          />
        </div>
        
        <div className="flex items-center text-[9px] text-muted-foreground">
          <Eye className="h-2.5 w-2.5" />
          <span className="ml-0.5">{screenshot.views?.toLocaleString() || 0}</span>
        </div>
      </CardFooter>
    </Card>
  );
}