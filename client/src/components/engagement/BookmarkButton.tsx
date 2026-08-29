import { useState, useEffect } from "react";
import { Bookmark } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface BookmarkButtonProps {
  contentId: number;
  contentType: 'clip' | 'screenshot' | 'game';
  className?: string;
  iconClassName?: string;
  size?: number;
  activeColor?: string;
  inactiveColor?: string;
  onUnauthenticatedAction?: () => void;
}

export function BookmarkButton({
  contentId,
  contentType,
  className,
  iconClassName,
  size = 18,
  activeColor = '#B7FF1A',
  inactiveColor = '#7E887A',
  onUnauthenticatedAction,
}: BookmarkButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [bookmarked, setBookmarked] = useState(false);

  const { data: bookmarkStatus } = useQuery<{ isBookmarked: boolean }>({
    queryKey: [`/api/bookmarks/check/${contentType}/${contentId}`],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    enabled: !!user,
    staleTime: 30000,
  });

  useEffect(() => {
    if (bookmarkStatus && typeof bookmarkStatus.isBookmarked === 'boolean') {
      setBookmarked(bookmarkStatus.isBookmarked);
    }
  }, [bookmarkStatus]);

  const addMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/bookmarks', { contentType, contentId }),
    onError: (error: any) => {
      setBookmarked(false);
      toast({
        title: "Error",
        description: error?.message || "Failed to bookmark",
        variant: "gamefolioError",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookmarks/check/${contentType}/${contentId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/bookmarks'] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: () => apiRequest('DELETE', `/api/bookmarks/${contentType}/${contentId}`),
    onError: (error: any) => {
      setBookmarked(true);
      toast({
        title: "Error",
        description: error?.message || "Failed to remove bookmark",
        variant: "gamefolioError",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookmarks/check/${contentType}/${contentId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/bookmarks'] });
    },
  });

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      if (onUnauthenticatedAction) {
        onUnauthenticatedAction();
      } else {
        toast({ description: 'Sign in to save bookmarks' });
      }
      return;
    }

    const next = !bookmarked;
    setBookmarked(next);
    if (next) {
      addMutation.mutate();
    } else {
      removeMutation.mutate();
    }
  };

  return (
    <button
      onClick={handleClick}
      className={cn("flex items-center justify-center transition-colors", className)}
      style={{ color: bookmarked ? activeColor : inactiveColor }}
      data-testid={`button-bookmark-${contentType}-${contentId}`}
    >
      <Bookmark
        className={cn(iconClassName, bookmarked ? 'fill-current' : '')}
        style={{ width: size, height: size }}
      />
    </button>
  );
}
