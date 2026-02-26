import { useState, useEffect } from "react";
import { Bell, User as UserIcon, Heart, MessageCircle, Upload, UserPlus, X, UserCheck, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Notification } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
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

  // Fetch notifications (with fallback for demo)
  const { data: notifications = [] } = useQuery<NotificationWithUser[]>({
    queryKey: ['/api/notifications'],
    queryFn: async () => {
      const response = await fetch('/api/notifications', { credentials: 'include' });
      if (!response.ok) throw new Error("Failed to fetch notifications");
      return await response.json();
    },
  });

  // Fetch unread count (with fallback for demo)
  const { data: unreadCount = 0 } = useQuery<number>({
    queryKey: ['/api/notifications/unread-count'],
    queryFn: async () => {
      const response = await fetch('/api/notifications/unread-count', { credentials: 'include' });
      if (!response.ok) throw new Error("Failed to fetch unread count");
      return await response.json();
    },
  });

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
  });

  // Delete all notifications
  const deleteAllNotificationsMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/notifications/delete-all");
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['/api/notifications'] });
      const previous = queryClient.getQueryData(['/api/notifications']);
      queryClient.setQueryData(['/api/notifications'], []);
      queryClient.setQueryData(['/api/notifications/unread-count'], 0);
      return { previous };
    },
    onError: (_err, _vars, context: any) => {
      queryClient.setQueryData(['/api/notifications'], context?.previous);
      queryClient.setQueryData(['/api/notifications/unread-count'], (context?.previous as any[])?.filter((n: any) => !n.isRead).length ?? 0);
      toast({ title: "Failed to clear notifications", variant: "destructive" });
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
        return <Heart className="h-4 w-4 text-red-500" />;
      case 'comment':
      case 'reply':
        return <MessageCircle className="h-4 w-4 text-[#4ade80]" />;
      case 'follow':
        return <UserPlus className="h-4 w-4 text-green-500" />;
      case 'follow_request':
        return <UserPlus className="h-4 w-4 text-orange-500" />;
      case 'upload':
        return <Upload className="h-4 w-4 text-purple-500" />;
      case 'message':
        return <MessageCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const handleNotificationClick = (notification: NotificationWithUser) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }
    setIsOpen(false);
    
    // Navigate to action URL if provided using client-side routing
    if (notification.actionUrl) {
      setLocation(notification.actionUrl);
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
      {/* Green popup notification */}
      {showGreenPopup && (
        <div className="absolute -top-16 -right-2 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg animate-bounce z-50">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="text-sm font-medium">New notification!</span>
          </div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-green-500"></div>
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
              <>
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-6 w-6 flex items-center justify-center font-semibold animate-pulse">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
                <span className="absolute -top-1 -right-1 bg-primary rounded-full h-6 w-6 animate-ping opacity-75"></span>
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          className="w-80 max-h-96 overflow-hidden p-0" 
          align="end"
          sideOffset={2}
        >
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllAsReadMutation.mutate()}
                className="text-xs text-primary hover:text-primary/80"
              >
                Mark Read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteAllNotificationsMutation.mutate()}
                className="text-xs text-red-600 hover:text-red-700"
                disabled={deleteAllNotificationsMutation.isPending}
              >
                {deleteAllNotificationsMutation.isPending ? "Clearing..." : "Clear All"}
              </Button>
            )}
          </div>
        </div>
        
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No notifications yet</p>
              <p className="text-sm">You'll see notifications for likes, comments, and follows here</p>
            </div>
          ) : (
            <div className="space-y-0">
              {notifications.slice(0, 10).map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    "w-full p-4 text-left hover:bg-secondary transition-colors border-b border-border/50 last:border-b-0 cursor-pointer",
                    !notification.isRead && "bg-primary/5 border-l-4 border-l-primary"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5 relative">
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
                        getNotificationIcon(notification.type)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm truncate">
                          {notification.title}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {notification.message}
                      </p>
                      
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
                            className="h-7 px-3 text-xs bg-green-600 hover:bg-green-700"
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
                      
                      <p className="text-xs text-muted-foreground">
                        {formatTimeAgo(typeof notification.createdAt === 'string' ? notification.createdAt : notification.createdAt.toISOString())}
                      </p>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      {!notification.isRead && (
                        <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleDismissNotification(e, notification.id)}
                        className="h-6 w-6 p-0 hover:bg-red-500/10 hover:text-red-500 opacity-50 hover:opacity-100 transition-all"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {notifications.length > 10 && (
                <div className="p-4 text-center border-t">
                  <Link href="/notifications">
                    <Button variant="ghost" size="sm" className="text-primary">
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