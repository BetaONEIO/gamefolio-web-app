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
        throw new Error(error.message || 'Failed to toggle fire reaction');
      }

      return response.json();
    },
    onSuccess: (data) => {
      const newFired = data.reacted !== undefined ? data.reacted : !fired;
      setFired(newFired);
      setCount(prev => newFired ? prev + 1 : prev - 1);

      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ 
        queryKey: [`/api/${contentType}s/${contentId}/reactions`] 
      });
      queryClient.invalidateQueries({ 
        queryKey: [`/api/${contentType}s/${contentId}`] 
      });
      queryClient.invalidateQueries({ 
        queryKey: [`/api/${contentType}s`] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['trending'] 
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
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

    fireMutation.mutate();
  };

  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm", 
    lg: "h-12 w-12 text-base"
  };

  const emojiSizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg"
  };

  const isLoading = fireMutation.isPending;

  if (variant === 'vertical') {
    return (
      <>
        <div className="flex flex-col items-center gap-1">
          <Button
            variant="ghost"
            size={size}
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
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size={size}
          onClick={handleFire}
          disabled={isLoading}
          className={cn(
            "transition-colors",
            fired 
              ? "text-orange-500 hover:text-orange-600" 
              : "text-muted-foreground hover:text-orange-500"
          )}
        >
          <Flame 
            className={cn(
              size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5',
              fired && "fill-current"
            )} 
          />
        </Button>
        {showCount && (
          <span className={cn(
            "text-muted-foreground transition-colors",
            size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'
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