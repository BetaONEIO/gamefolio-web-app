import { useState, useEffect } from "react";
import { Bell, Gift, MessageCircle, Upload, UserPlus, X, UserCheck, UserX, Flame, Video, Download, Share2, Trophy, Zap } from "lucide-react";
import { ZapIconFire } from "@/components/ui/ZapReactionIcon";
import { PixelHeartReaction } from "@/components/ui/PixelHeartReaction";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useQuery, useMutation } from "@tanstack/react-query";
import { Notification } from "@shared/schema";
import { apiRequest, getQueryFn, queryClient } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { CustomAvatar } from "@/components/ui/custom-avatar";

interface NotificationWithUser extends Notification {
  fromUser?: {
    id: number;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
    nftProfileTokenId?: string | null;
    nftProfileImageUrl?: string | null;
    activeProfilePicType?: string | null;
    accentColor?: string | null;
    selectedBorderId?: number | null;
    isPro?: boolean | null;
  } | null;
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [showGreenPopup, setShowGreenPopup] = useState(false);
  const [previousUnreadCount, setPreviousUnreadCount] = useState(0);
  const [followedBack, setFollowedBack] = useState<Set<number>>(new Set());
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Follow request mutations (for notifications)
  const approveRequestMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      return apiRequest("POST", `/api/notifications/${notificationId}/approve-follow`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/follow-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      toast({
        title: "Follow request approved",
        description: "You have a new follower!",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to approve request",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    },
  });

  const rejectRequestMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      return apiRequest("POST", `/api/notifications/${notificationId}/reject-follow`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/follow-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      toast({
        title: "Follow request rejected",
        description: "The follow request has been declined.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to reject request",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    },
  });

  // Fetch notifications
  const { data: notificationsData } = useQuery<NotificationWithUser[] | null>({
    queryKey: ['/api/notifications'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 0,
  });
  // `data` can be explicitly `null` (returned by getQueryFn on a 401), which a
  // destructure default (`= []`) does NOT catch — only `undefined` triggers it.
  // Without this guard, a transient 401 would set `notifications` to `null`
  // and every `.length`/`.slice()` call below would throw, breaking the whole
  // dropdown (including the Clear All button) until the page was reloaded.
  const notifications = notificationsData ?? [];

  // Fetch unread count
  const { data: unreadCountData } = useQuery<number | null>({
    queryKey: ['/api/notifications/unread-count'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 0,
    refetchInterval: 30000,
  });
  const unreadCount = unreadCountData ?? 0;

  // Trigger green popup animation when new notifications arrive
  useEffect(() => {
    if (unreadCount > previousUnreadCount && previousUnreadCount > 0) {
      setShowGreenPopup(true);
      setTimeout(() => setShowGreenPopup(false), 3000); // Hide after 3 seconds
    }
    setPreviousUnreadCount(unreadCount);
  }, [unreadCount, previousUnreadCount]);

  // Mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      await apiRequest("POST", `/api/notifications/${notificationId}/mark-read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
  });

  // Mark all as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/notifications/mark-all-read");
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['/api/notifications'] });
      await queryClient.cancelQueries({ queryKey: ['/api/notifications/unread-count'] });
      const previous = queryClient.getQueryData(['/api/notifications']);
      queryClient.setQueryData(['/api/notifications'], (old: any[]) =>
        (old || []).map((n: any) => ({ ...n, isRead: true }))
      );
      queryClient.setQueryData(['/api/notifications/unread-count'], 0);
      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
    onError: (_err, _vars, context: any) => {
      queryClient.setQueryData(['/api/notifications'], context?.previous);
      queryClient.setQueryData(['/api/notifications/unread-count'], (context?.previous as any[])?.filter((n: any) => !n.isRead).length ?? 0);
      toast({ title: "Failed to mark notifications as read", variant: "destructive" });
    },
  });

  // Delete all notifications
  const deleteAllNotificationsMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/notifications/delete-all");
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['/api/notifications'] });
      await queryClient.cancelQueries({ queryKey: ['/api/notifications/unread-count'] });
      const previous = queryClient.getQueryData(['/api/notifications']);
      queryClient.setQueryData(['/api/notifications'], []);
      queryClient.setQueryData(['/api/notifications/unread-count'], 0);
      return { previous };
    },
    onSuccess: () => {
      // Use setQueryData instead of invalidateQueries to avoid a refetch race
      // that would temporarily restore stale notifications.
      queryClient.setQueryData(['/api/notifications'], []);
      queryClient.setQueryData(['/api/notifications/unread-count'], 0);
    },
    onError: (_err, _vars, context: any) => {
      queryClient.setQueryData(['/api/notifications'], context?.previous);
      queryClient.setQueryData(['/api/notifications/unread-count'], (context?.previous as any[])?.filter((n: any) => !n.isRead).length ?? 0);
      toast({ title: "Failed to clear notifications", variant: "destructive" });
    },
  });

  // Follow back from a follow notification
  const followBackMutation = useMutation({
    mutationFn: async ({ username }: { username: string; notifId: number }) => {
      await apiRequest("POST", `/api/users/${username}/follow`);
    },
    onSuccess: (_data, { notifId }) => {
      setFollowedBack((prev) => new Set(prev).add(notifId));
    },
    onError: () => {
      toast({ title: "Failed to follow back", variant: "destructive" });
    },
  });

  // Delete notification
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      await apiRequest("DELETE", `/api/notifications/${notificationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
  });

  // Remove auto-mark all as read - only mark when user clicks notification or explicitly clicks "Mark all read"

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <PixelHeartReaction size={16} active={true} />;
      case 'reaction':
        return <ZapIconFire className="h-4 w-4" style={{ width: 14, height: 14 }} />;
      case 'comment':
      case 'reply':
        return <MessageCircle className="h-4 w-4 text-[#B7FF1A]" />;
      case 'comment_mention':
        return <MessageCircle className="h-4 w-4 text-primary" />;
      case 'follow':
        return <UserPlus className="h-4 w-4 text-primary" />;
      case 'follow_request':
        return <UserPlus className="h-4 w-4 text-orange-500" />;
      case 'follow_request_accepted':
        return <UserCheck className="h-4 w-4 text-primary" />;
      case 'upload':
        return <Upload className="h-4 w-4 text-primary" />;
      case 'clip_mention':
        return <Video className="h-4 w-4 text-[#B7FF1A]" />;
      case 'message':
        return <MessageCircle className="h-4 w-4 text-sky-400" />;
      case 'streak':
        return <Flame className="h-4 w-4 text-orange-500" />;
      case 'download':
        return <Download className="h-4 w-4 text-[#B7FF1A]" />;
      case 'share':
        return <Share2 className="h-4 w-4 text-[#B7FF1A]" />;
      case 'milestone':
        return <Trophy className="h-4 w-4 text-[#B7FF1A]" />;
      case 'xp':
        return <Zap className="h-4 w-4 text-[#B7FF1A]" />;
      case 'achievement':
      case 'reward':
      case 'game':
        return <Gift className="h-4 w-4 text-[#B7FF1A]" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatNotificationTitle = (notification: NotificationWithUser) => {
    if (notification.type !== 'streak') return notification.title;

    // Older streak notifications were persisted with a fire emoji and
    // exclamation mark. Keep those records readable without carrying the
    // decorative title treatment into the redesigned dropdown.
    return notification.title
      .replace(/^\s*🔥\s*/u, '')
      .replace(/[!！]+\s*$/u, '')
      .trim();
  };

  const handleNotificationClick = (notification: NotificationWithUser) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }
    setIsOpen(false);

    if (notification.actionUrl) {
      // developer.gamefolio.com only hosts the developer portal — send the
      // user to the main app for a notification's actual destination instead
      // of client-side routing them to a nonexistent page on this subdomain.
      if (window.location.hostname === 'developer.gamefolio.com') {
        window.location.href = `https://app.gamefolio.com${notification.actionUrl}`;
      } else {
        setLocation(notification.actionUrl);
      }
    }
  };

  const handleDismissNotification = (e: React.MouseEvent, notificationId: number) => {
    e.stopPropagation(); // Prevent triggering the click handler
    deleteNotificationMutation.mutate(notificationId);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative">
      {/* New-notification announcement */}
      {showGreenPopup && (
        <div className="absolute -top-14 -right-2 z-50 rounded-lg border border-[#2A2D3A] bg-[#171A27] px-3 py-2 text-white shadow-xl">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">New notification!</span>
          </div>
        </div>
      )}
      
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            className="relative h-auto w-auto"
            style={{ padding: '12px' }}
            aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
          >
            <Bell 
              className="text-gray-400 hover:text-gray-300 transition-colors w-5 h-5 sm:w-9 sm:h-9" 
            />
            {unreadCount > 0 && !isOpen && (
              <span className="absolute -right-0.5 -top-0.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold text-primary-foreground">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-[min(24rem,calc(100vw-1rem))] max-h-[min(560px,calc(100vh-1rem))] overflow-hidden rounded-xl border border-[#2A2D3A] bg-[#0F101B] p-0 text-white shadow-[0_16px_40px_rgba(0,0,0,0.45)]"
          align="end"
          sideOffset={8}
          collisionPadding={{ left: 12 }}
        >
        <div className="flex items-center justify-between gap-4 border-b border-[#2A2D3A] bg-[#0F101B] px-4 py-3">
          <h3 className="text-[15px] font-bold text-white">Notifications</h3>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllAsReadMutation.mutate()}
                className="h-auto rounded px-0 py-1 text-xs font-medium text-primary hover:bg-transparent hover:text-primary/80"
              >
                Mark all as read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteAllNotificationsMutation.mutate()}
                className="h-auto rounded px-0 py-1 text-xs font-medium text-[#8B8F9D] hover:bg-transparent hover:text-red-400"
                disabled={deleteAllNotificationsMutation.isPending}
              >
                {deleteAllNotificationsMutation.isPending ? "Clearing..." : "Clear all"}
              </Button>
            )}
          </div>
        </div>
        
        <div className="max-h-[min(480px,calc(100vh-5rem))] overflow-y-auto overscroll-contain">
          {notifications.length === 0 ? (
            <div className="px-6 py-12 text-center text-[#8B8F9D]">
              <Bell className="mx-auto mb-3 h-9 w-9 text-[#626675]" />
              <p className="text-sm font-medium text-white">No notifications yet</p>
              <p className="mt-1 text-xs leading-5">You'll see notifications for likes, comments, and follows here</p>
            </div>
          ) : (
            <div className="space-y-0">
              {notifications.slice(0, 10).map((notification) => {
                return (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                     "group relative w-full cursor-pointer overflow-hidden border-b border-[#2A2D3A] px-4 py-3.5 text-left transition-colors last:border-b-0 hover:bg-[#1A1D2B]",
                     !notification.isRead && "bg-[#171A27] hover:bg-[#1D202F]"
                  )}
                >
                   <div className="relative flex items-start gap-3">
                     <div className="relative mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center">
                      {notification.fromUser ? (
                        <div className="relative">
                          <CustomAvatar 
                            user={notification.fromUser as any}
                            size="sm"
                            borderIntensity="subtle"
                          />
                          <div className="absolute -bottom-1 -right-1">
                            {getNotificationIcon(notification.type)}
                          </div>
                        </div>
                      ) : (
                         <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1A1D2B]">
                           {getNotificationIcon(notification.type)}
                         </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                       <div className="flex items-start gap-2">
                         <p className="min-w-0 flex-1 truncate text-[15px] font-semibold leading-5 text-white">
                           {formatNotificationTitle(notification)}
                         </p>
                         <div className="flex flex-shrink-0 items-center gap-2">
                           {!notification.isRead && (
                             <div className="h-2 w-2 rounded-full bg-primary" aria-label="Unread" />
                           )}
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={(e) => handleDismissNotification(e, notification.id)}
                             aria-label="Dismiss notification"
                             className="h-5 w-5 rounded p-0 text-[#8B8F9D] opacity-0 transition-opacity hover:bg-red-500/10 hover:text-red-400 focus-visible:opacity-100 group-hover:opacity-100 max-sm:opacity-70"
                           >
                             <X className="h-3 w-3" />
                           </Button>
                         </div>
                      </div>
                       <p className="mt-1 line-clamp-2 text-sm leading-5 text-[#B2B5C2]">
                        {notification.message}
                      </p>
                      
                      {/* Show Follow Back button for follow notifications */}
                      {notification.type === 'follow' && notification.fromUser && (
                        <div className="mb-2">
                          {followedBack.has(notification.id) ? (
                            <Button size="sm" variant="outline" disabled className="h-7 px-3 text-xs">
                              <UserCheck className="h-3 w-3 mr-1" />
                              Following
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={(e) => {
                                e.stopPropagation();
                                followBackMutation.mutate({
                                  username: notification.fromUser!.username,
                                  notifId: notification.id,
                                });
                              }}
                              disabled={followBackMutation.isPending}
                              className="h-7 px-3 text-xs bg-primary hover:bg-primary/90"
                            >
                              <UserPlus className="h-3 w-3 mr-1" />
                              Follow Back
                            </Button>
                          )}
                        </div>
                      )}

                      {/* Show approve/reject buttons for unread follow requests only */}
                      {notification.type === 'follow_request' && !notification.isRead && (
                        <div className="flex gap-2 mb-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Extract request ID from actionUrl or use a different approach
                              // For now, we'll use the notification ID as a fallback
                              const requestId = notification.id; // This should be the follow request ID
                              approveRequestMutation.mutate(requestId);
                            }}
                            disabled={approveRequestMutation.isPending}
                            className="h-7 px-3 text-xs bg-primary hover:bg-primary"
                          >
                            <UserCheck className="h-3 w-3 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              const requestId = notification.id; // This should be the follow request ID
                              rejectRequestMutation.mutate(requestId);
                            }}
                            disabled={rejectRequestMutation.isPending}
                            className="h-7 px-3 text-xs border-red-200 text-red-600 hover:bg-red-50"
                          >
                            <UserX className="h-3 w-3 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                      
                       <p className="mt-2 text-xs text-[#777B8A]">
                        {formatTimeAgo(typeof notification.createdAt === 'string' ? notification.createdAt : notification.createdAt.toISOString())}
                      </p>
                    </div>
                  </div>
                </div>
                );
              })}
              {notifications.length > 10 && (
                <div className="border-t border-[#2A2D3A] p-3 text-center">
                  <Link href="/notifications">
                    <Button variant="ghost" size="sm" className="h-auto py-1 text-xs font-medium text-primary hover:bg-transparent hover:text-primary/80">
                      View all notifications
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}