import { useState, useEffect } from "react";
import { PixelHeartReaction } from "@/components/ui/PixelHeartReaction";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { JoinGamefolioDialog } from "@/components/auth/JoinGamefolioDialog";
import { useJoinDialog } from "@/hooks/use-join-dialog";
import { requireEmailVerified, isEmailVerificationError } from "@/lib/email-verification";

interface LikeButtonProps {
  contentId: number;
  contentType: 'clip' | 'screenshot';
  contentOwnerId?: number;
  initialLiked?: boolean;
  initialCount?: number;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
  variant?: 'horizontal' | 'vertical';
  onUnauthenticatedAction?: () => void;
}

export function LikeButton({ 
  contentId, 
  contentType, 
  contentOwnerId,
  initialLiked = false, 
  initialCount = 0,
  size = 'md',
  showCount = true,
  variant = 'horizontal',
  onUnauthenticatedAction
}: LikeButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isOpen, actionType, openDialog, closeDialog } = useJoinDialog();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(Number(initialCount) || 0);

  // Check current like status when user is authenticated
  const { data: likeStatus } = useQuery({
    queryKey: [`/api/${contentType}s/${contentId}/likes/status`],
    queryFn: async () => {
      const res = await fetch(`/api/${contentType}s/${contentId}/likes/status`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch like status");
      return res.json();
    },
    enabled: !!user,
    staleTime: 30000,
  });

  // Update local state when like status is fetched
  useEffect(() => {
    if (likeStatus && typeof likeStatus === 'object' && 'hasLiked' in likeStatus && typeof likeStatus.hasLiked === 'boolean') {
      setLiked(likeStatus.hasLiked);
    }
  }, [likeStatus]);

  const likeMutation = useMutation({
    mutationFn: async () => {
      const endpoint = contentType === 'clip' 
        ? `/api/clips/${contentId}/likes`
        : `/api/screenshots/${contentId}/likes`;

      const response = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to toggle like');
      }

      const result = await response.json();
      return result;
    },
    onMutate: async () => {
      const previousLiked = liked;
      const previousCount = count;
      setLiked(!liked);
      setCount(prev => !liked ? prev + 1 : Math.max(0, prev - 1));
      return { previousLiked, previousCount };
    },
    onSuccess: (result) => {
      if ('liked' in result && 'count' in result && typeof result.count === 'number') {
        setLiked(result.liked);
        setCount(result.count);
      }
      queryClient.invalidateQueries({ 
        queryKey: [`/api/${contentType}s/${contentId}/likes`] 
      });
      queryClient.invalidateQueries({ 
        queryKey: [`/api/${contentType}s/${contentId}/likes/status`] 
      });
    },
    onError: (error: Error, _, context) => {
      if (context) {
        setLiked(context.previousLiked);
        setCount(context.previousCount);
      }
      if (isEmailVerificationError(error)) {
        toast({
          title: "Email verification required",
          description: "Please verify your email address to like content.",
          variant: "gamefolioError",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to toggle like",
          variant: "gamefolioError",
        });
      }
    },
  });

  const handleLike = () => {
    if (!user) {
      if (onUnauthenticatedAction) {
        onUnauthenticatedAction();
      } else {
        openDialog('like');
      }
      return;
    }

    if (!requireEmailVerified(user, toast)) return;

    // Prevent users from liking their own content
    if (contentOwnerId && user.id === contentOwnerId) {
      toast({
        title: "Cannot like own content",
        description: "You cannot like your own content, casual!",
        variant: "gamefolioError"
      });
      return;
    }

    likeMutation.mutate();
  };

  // Define sizes for the button and icon based on the 'size' prop
  const buttonSizeClasses = {
    sm: "h-8 w-8 text-xs p-0", // Adjusted for smaller icon and count
    md: "h-10 w-10 text-sm p-0", // Default size
    lg: "h-12 w-12 text-base p-0" // Larger size
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 28
  };

  // Define text sizes for the count
  const countTextSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base"
  };

  if (variant === 'vertical') {
    return (
      <>
        <div className="flex flex-col items-center gap-1">
          <div className="bg-black/50 rounded-full p-1 hover:bg-black/70 transition-colors">
            <PixelHeartReaction
              active={liked}
              onClick={handleLike}
              size={iconSizes[size]}
              fillColour="#ff4d6d"
              className={cn(
                "text-white",
                likeMutation.isPending && "opacity-50 pointer-events-none"
              )}
            />
          </div>
          {showCount && (
            <span className={cn(
              "text-white transition-colors text-center",
              countTextSizes[size]
            )}>
              {count}
            </span>
          )}
        </div>
        
        <JoinGamefolioDialog 
          open={isOpen} 
          onOpenChange={closeDialog} 
          actionType={actionType} 
        />
      </>
    );
  }

  // Horizontal layout
  return (
    <>
      <div className="flex items-center gap-1">
        <PixelHeartReaction
          active={liked}
          onClick={handleLike}
          size={iconSizes[size]}
          fillColour="#ff4d6d"
          className={cn(
            "text-gray-500",
            likeMutation.isPending && "opacity-50 pointer-events-none"
          )}
        />
        {showCount && (
          <span className={cn(
            "font-medium min-w-[1rem] text-center transition-colors",
            countTextSizes[size],
            liked ? 'text-[#ff4d6d]' : 'text-muted-foreground'
          )}>
            {count}
          </span>
        )}
      </div>
      
      <JoinGamefolioDialog 
        open={isOpen} 
        onOpenChange={closeDialog} 
        actionType={actionType} 
      />
    </>
  );
}