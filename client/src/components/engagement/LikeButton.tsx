import { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { JoinGamefolioDialog } from "@/components/auth/JoinGamefolioDialog";
import { useJoinDialog } from "@/hooks/use-join-dialog";

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
      toast({
        title: "Error",
        description: error.message || "Failed to toggle like",
        variant: "gamefolioError",
      });
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
          <Button
            variant="ghost"
            size="icon" // Use "icon" size for consistent button dimensions
            onClick={handleLike}
            disabled={likeMutation.isPending}
            className={cn(
              "transition-colors rounded-full", // Fixed size for vertical
              liked 
                ? "text-red-500 hover:text-red-600" 
                : "text-white hover:text-red-500",
              "bg-black/50 hover:bg-black/70", // Darker background for better contrast
              size === "sm" && "w-8 h-8",
              size === "lg" && "w-10 h-10 md:w-12 md:h-12"
            )}
          >
            <Heart 
              size={iconSizes[size]} 
              className={cn(
                "transition-all duration-200",
                liked ? 'fill-current scale-110' : 'hover:scale-105',
                size === "sm" && "h-4 w-4",
                size === "lg" && "h-5 w-5 md:h-6 md:w-6"
              )} 
            />
          </Button>
          {showCount && (
            <span className={cn(
              "text-white transition-colors text-center",
              countTextSizes[size] // Apply text size based on 'size' prop
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

  // Horizontal layout (original)
  return (
    <>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "p-1.5 h-auto transition-colors hover:bg-red-50 dark:hover:bg-red-900/20",
            liked ? 'text-red-500 hover:text-red-600' : 'text-gray-500 hover:text-red-500'
          )}
          onClick={handleLike}
          disabled={likeMutation.isPending}
        >
          <Heart 
            size={iconSizes[size]} 
            className={cn(
              "transition-all duration-200",
              liked ? 'fill-current scale-110' : 'hover:scale-105'
            )}
          />
        </Button>
        {showCount && (
          <span className={cn(
            "font-medium min-w-[1rem] text-center transition-colors",
            countTextSizes[size],
            liked ? 'text-red-500' : 'text-muted-foreground'
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