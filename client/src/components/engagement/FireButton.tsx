import { useState, useEffect, useRef } from "react";
import type React from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { ZapIconSvg, useZapFly, ZapFlyOverlay } from "@/components/ui/ZapReactionIcon";
import { cn } from "@/lib/utils";

import { useJoinDialog } from "@/hooks/use-join-dialog";
import { requireEmailVerified, isEmailVerificationError } from "@/lib/email-verification";

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
  clipRef?: React.RefObject<Element>;
  iconSize?: number;
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
  variant = 'horizontal',
  clipRef,
  iconSize: iconSizeProp,
}: FireButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isOpen, actionType, openDialog, closeDialog } = useJoinDialog();
  const [fired, setFired] = useState(initialFired);
  const [count, setCount] = useState(Number(initialCount) || 0);
  const iconRef = useRef<HTMLSpanElement>(null);
  const { zapFlyState, triggerZapFly, dismissZapFly } = useZapFly();
  const [flyMode, setFlyMode] = useState<'success' | 'fail' | null>(null);
  const [sourceRect, setSourceRect] = useState<DOMRect | undefined>(undefined);

  // Track how many times this user has seen the +50 XP popup (across sessions, per device)
  // Only show for the first 3 successful zaps
  const XP_POPUP_KEY = 'gf_zap_xp_shown';
  const getXpShownCount = () => parseInt(localStorage.getItem(XP_POPUP_KEY) || '0', 10);
  const shouldShowXpPopup = () => getXpShownCount() < 3;
  const markXpPopupShown = () => {
    const next = Math.min(getXpShownCount() + 1, 3);
    localStorage.setItem(XP_POPUP_KEY, String(next));
  };

  const { data: fireStatus } = useQuery({
    queryKey: [`/api/${contentType}s/${contentId}/reactions/status`],
    queryFn: async () => {
      const res = await fetch(`/api/${contentType}s/${contentId}/reactions/status`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch fire status");
      return res.json();
    },
    enabled: !!user,
    staleTime: 30000,
  });

  useEffect(() => {
    if (fireStatus && typeof fireStatus === 'object' && 'hasFired' in fireStatus && typeof fireStatus.hasFired === 'boolean') {
      setFired(fireStatus.hasFired);
    }
  }, [fireStatus]);

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
      setFlyMode(null);
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
      setFlyMode('success');
      if (data.reacted !== undefined) {
        setFired(data.reacted);
      }
      if (data.count !== undefined) {
        setCount(data.count);
      }
      queryClient.invalidateQueries({ 
        queryKey: [`/api/${contentType}s/${contentId}/reactions`] 
      });
      queryClient.invalidateQueries({ 
        queryKey: [`/api/${contentType}s/${contentId}/reactions/status`] 
      });
      queryClient.invalidateQueries({ 
        queryKey: [`/api/${contentType}s/${contentId}`] 
      });
    },
    onError: (error: Error, _, context) => {
      setFlyMode('fail');
      if (context) {
        setFired(context.previousFired);
        setCount(context.previousCount);
      }
      if (isEmailVerificationError(error)) {
        toast({
          title: "Email verification required",
          description: "Please verify your email address to react to content.",
          variant: "gamefolioError",
        });
      } else {
        toast({
          title: "Cannot zap",
          description: error.message,
          variant: "gamefolioError",
        });
      }
    },
  });

  const handleFire = () => {
    if (!user) {
      if (onUnauthenticatedAction) {
        onUnauthenticatedAction();
      } else {
        openDialog('like');
      }
      return;
    }

    if (!requireEmailVerified(user, toast)) return;

    // Prevent users from firing their own content
    if (contentOwnerId && user.id === contentOwnerId) {
      toast({
        title: "Cannot zap own content",
        description: "You cannot zap your own content, casual!",
        variant: "default"
      });
      return;
    }

    // Fire reactions are permanent - once fired, cannot be removed
    if (fired) {
      toast({
        title: "Already zapped",
        description: "Zaps are permanent and cannot be removed",
        variant: "default"
      });
      return;
    }

    // Capture source position from clip element (if provided) for animation origin
    setSourceRect(clipRef?.current?.getBoundingClientRect() ?? undefined);
    // Trigger fly animation before the mutation
    triggerZapFly(iconRef.current);
    fireMutation.mutate();
  };

  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm", 
    lg: "h-12 w-12 text-base"
  };

  const iconSizes = {
    sm: 18,
    md: 24,
    lg: 28
  };
  const resolvedIconSize = iconSizeProp ?? iconSizes[size];

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
            <span ref={iconRef} className="flex items-center justify-center">
              <ZapIconSvg size={resolvedIconSize} active={fired} />
            </span>
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

        {zapFlyState && (
          <ZapFlyOverlay
            targetRect={zapFlyState}
            sourceRect={sourceRect}
            onDone={() => {
              if (flyMode === 'success') markXpPopupShown();
              dismissZapFly();
            }}
            mode={flyMode}
            showXpPopup={shouldShowXpPopup()}
          />
        )}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleFire}
        disabled={isLoading}
        className={cn(
          "flex items-center gap-1 bg-transparent border-0 p-0 cursor-pointer transition-colors text-muted-foreground",
          isLoading && "opacity-50 pointer-events-none"
        )}
      >
        <span ref={iconRef} className="flex items-center justify-center">
          <ZapIconSvg size={resolvedIconSize} active={fired} />
        </span>
        {showCount && (
          <span className={cn(
            "font-medium min-w-[1rem] text-center transition-colors",
            size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm',
            fired ? 'text-[#B7FF1A]' : '',
          )}>
            {count}
          </span>
        )}
      </button>

      {zapFlyState && (
        <ZapFlyOverlay
          targetRect={zapFlyState}
          sourceRect={sourceRect}
          onDone={() => {
            if (flyMode === 'success') markXpPopupShown();
            dismissZapFly();
          }}
          mode={flyMode}
          showXpPopup={shouldShowXpPopup()}
        />
      )}
    </>
  );
}