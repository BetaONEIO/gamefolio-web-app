import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Heart, MessageSquare, Share2, Eye, Flag, X, ImageOff } from 'lucide-react';
import { Card, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FireButton } from '@/components/engagement/FireButton';
import { ScreenshotShareDialog } from '@/components/screenshot/ScreenshotShareDialog';
import { ReportButton } from '@/components/reporting/ReportButton';
import { ReportDialog } from '@/components/content/ReportDialog';
import { useLikeScreenshot } from '@/hooks/use-clips';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { LazyImage } from '@/components/ui/lazy-image';

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
        variant: "default"
      });
      return;
    }
    
    // Store the current count for rollback if needed
    const previousCount = likeCount;
    
    // Optimistically update like count
    setLikeCount(hasUserLiked ? likeCount - 1 : likeCount + 1);
    
    // Trigger animation when liking (not unliking)
    if (!hasUserLiked) {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 2000);
    }
    
    likeMutation.mutate({
      screenshotId: screenshot.id,
      unlike: hasUserLiked
    }, {
      onSuccess: (data: any) => {
        // Update with actual count from server if provided
        if (data && typeof data.count === 'number') {
          setLikeCount(data.count);
        }
        toast({
          title: hasUserLiked ? "Unliked" : "Liked!",
          description: hasUserLiked ? "Removed from your liked screenshots" : "Added to your liked screenshots ❤️",
          variant: "default"
        });
      },
      onError: (error: any) => {
        // Rollback optimistic update on error
        setLikeCount(previousCount);
        toast({
          title: "Error",
          description: error.message || "Failed to toggle like",
          variant: "destructive"
        });
      }
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
        <LazyImage 
          src={screenshot.imageUrl || ''} 
          alt={screenshot.title}
          className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${screenshot.ageRestricted ? 'blur-2xl' : ''}`}
          placeholder="data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='100'%20height='100'%3e%3crect%20width='100'%20height='100'%20fill='%231f2937'/%3e%3c/svg%3e"
          showLoadingSpinner={true}
          containerClassName="absolute inset-0"
          fallback={
            <div className="w-full h-full flex items-center justify-center bg-gray-800">
              <ImageOff className="h-12 w-12 text-gray-500" />
            </div>
          }
        />

        {/* Age Restriction badge */}
        {screenshot.ageRestricted && (
          <div className="absolute top-2 left-2 bg-red-600 text-white text-xs px-2 py-1 rounded font-bold shadow-lg z-20">
            18+
          </div>
        )}

        {/* Age Restricted Overlay */}
        {screenshot.ageRestricted && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-10">
            <div className="text-red-500 text-4xl mb-2">⚠️</div>
            <div className="text-white font-bold text-sm mb-1">Age Restricted</div>
            <div className="text-white/70 text-xs">18+ Content</div>
          </div>
        )}

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
      </div>

      {/* Info Section - Title, Game, Stats */}
      <div className="p-3 space-y-1">
        {/* Title */}
        <h3 className="font-semibold text-sm line-clamp-1 leading-tight">{screenshot.title}</h3>
        
        {/* Game name with green background like clips/reels */}
        {(screenshot as any).game && (
          <div className="pt-1">
            <span className="inline-block bg-green-600 text-white text-xs px-2 py-0.5 rounded font-medium">
              {(screenshot as any).game.name}
            </span>
          </div>
        )}
        
        {/* Stats row */}
        <div className="flex items-center gap-4 text-xs sm:text-sm text-muted-foreground pt-1">
          <button 
            onClick={handleLikeClick}
            className={`flex items-center gap-1 transition-colors ${hasUserLiked ? 'text-green-500' : 'hover:text-green-500'}`}
          >
            <Heart 
              className={`h-4 w-4 transition-all duration-300 ${
                hasUserLiked 
                  ? `fill-green-500 stroke-green-500 ${isAnimating ? 'animate-bounce scale-125' : ''}` 
                  : 'fill-transparent'
              }`} 
              style={{
                animation: isAnimating ? 'heartGrow 2s ease-out' : undefined
              }}
            />
            <span>{likeCount}</span>
          </button>
          
          <FireButton 
            contentId={screenshot.id}
            contentType="screenshot"
            contentOwnerId={screenshot.userId}
            initialFired={false}
            initialCount={(screenshot as any)._count?.reactions || 0}
            size="sm"
            showCount={true}
          />
          
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSelect?.(screenshot);
            }}
            className="flex items-center gap-1 hover:text-primary transition-colors"
          >
            <MessageSquare className="h-4 w-4" />
            <span>{(screenshot as any)._count?.comments || 0}</span>
          </button>
        </div>
      </div>
    </Card>
  );
}