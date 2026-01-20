import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Flame } from "lucide-react"; // Assuming Flame icon is available from lucide-react
import { cn } from "@/lib/utils"; // Assuming cn utility for class names
import { JoinGamefolioDialog } from "@/components/auth/JoinGamefolioDialog";
import { useJoinDialog } from "@/hooks/use-join-dialog";

interface FireButtonProps {
  contentId: number;
  contentType: 'clip' | 'screenshot';
  contentOwnerId?: number;
  initialFired?: boolean;
  initialCount?: number;
  size?: 'sm' | 'md' | 'lg';
  onUnauthenticatedAction?: () => void;
  showCount?: boolean;
  variant?: 'horizontal' | 'vertical';
}

export function FireButton({ 
  contentId, 
  contentType, 
  contentOwnerId,
  initialFired = false, 
  initialCount = 0,
  size = 'md',
  onUnauthenticatedAction,
  showCount = true,
  variant = 'horizontal'
}: FireButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isOpen, actionType, openDialog, closeDialog } = useJoinDialog();
  const [fired, setFired] = useState(initialFired);
  const [count, setCount] = useState(initialCount);

  const fireMutation = useMutation({
    mutationFn: async () => {
      const endpoint = contentType === 'clip' 
        ? `/api/clips/${contentId}/reactions`
        : `/api/screenshots/${contentId}/reactions`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emoji: '🔥' }),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to add fire reaction');
      }

      return response.json();
    },
    onMutate: async () => {
      // Only increment if not already fired (fire reactions are permanent)
      if (fired) {
        return { previousFired: true, previousCount: count };
      }
      const previousFired = fired;
      const previousCount = count;
      setFired(true);
      setCount(prev => prev + 1);
      return { previousFired, previousCount };
    },
    onSuccess: (data) => {
      if (data.reacted !== undefined) {
        setFired(data.reacted);
      }
      if (data.count !== undefined) {
        setCount(data.count);
      }
      // Show success message with fires remaining info
      if (data.firesRemaining !== undefined) {
        toast({
          title: "Fire sent!",
          description: `You have ${data.firesRemaining} fire${data.firesRemaining !== 1 ? 's' : ''} left today`,
          variant: "default",
        });
      }
      queryClient.invalidateQueries({ 
        queryKey: [`/api/${contentType}s/${contentId}/reactions`] 
      });
      queryClient.invalidateQueries({ 
        queryKey: [`/api/${contentType}s/${contentId}`] 
      });
    },
    onError: (error: Error, _, context) => {
      if (context) {
        setFired(context.previousFired);
        setCount(context.previousCount);
      }
      toast({
        title: "Cannot fire",
        description: error.message,
        variant: "gamefolioError",
      });
    },
  });

  const handleFire = () => {
    if (!user) {
      if (onUnauthenticatedAction) {
        onUnauthenticatedAction();
      } else {
        openDialog('like'); // Using 'like' as it's similar to fire reaction
      }
      return;
    }

    // Prevent users from firing their own content
    if (contentOwnerId && user.id === contentOwnerId) {
      toast({
        title: "Cannot fire own content",
        description: "You cannot fire your own content, casual!",
        variant: "default"
      });
      return;
    }

    // Fire reactions are permanent - once fired, cannot be removed
    if (fired) {
      toast({
        title: "Already fired",
        description: "Fire reactions are permanent and cannot be removed",
        variant: "default"
      });
      return;
    }

    fireMutation.mutate();
  };

  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm", 
    lg: "h-12 w-12 text-base"
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24
  };

  const countTextSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base"
  };

  const isLoading = fireMutation.isPending;

  if (variant === 'vertical') {
    return (
      <>
        <div className="flex flex-col items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleFire}
            disabled={isLoading}
            className={cn(
              "transition-colors rounded-full p-0 bg-black/50 hover:bg-black/70",
              size === "sm" && "w-8 h-8",
              size === "lg" && "w-10 h-10 md:w-12 md:h-12"
            )}
          >
            <Flame 
              className={cn(
                "text-orange-500",
                size === "sm" && "h-4 w-4",
                size === "lg" && "h-5 w-5 md:h-6 md:w-6"
              )} 
            />
          </Button>
          {showCount && (
            <span className={cn(
              "text-white transition-colors text-center",
              size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-sm' : 'text-xs'
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

  return (
    <>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleFire}
          disabled={isLoading}
          className={cn(
            "p-1.5 h-auto transition-colors hover:bg-orange-50 dark:hover:bg-orange-900/20",
            fired 
              ? "text-orange-500 hover:text-orange-600" 
              : "text-muted-foreground hover:text-orange-500"
          )}
        >
          <Flame 
            className={cn(
              size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5',
              "transition-all duration-200",
              fired ? "fill-current scale-110" : "hover:scale-105"
            )} 
          />
        </Button>
        {showCount && (
          <span className={cn(
            "font-medium min-w-[1rem] text-center transition-colors",
            size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm',
            fired ? 'text-orange-500' : 'text-muted-foreground'
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