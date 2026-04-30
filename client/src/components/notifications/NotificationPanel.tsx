import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, User, MessageCircle, Video, X, Flame } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CustomAvatar } from "@/components/ui/custom-avatar";

interface NotificationData {
  id: number;
  type: 'clip_mention' | 'comment_mention' | 'like' | 'follow' | 'comment';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  fromUserId?: number;
  clipId?: number;
  commentId?: number;
  actionUrl?: string;
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
  metadata?: {
    mentionType?: string;
    clipTitle?: string;
    mentionedBy?: {
      id: number;
      username: string;
      displayName: string;
    };
  };
}

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onNotificationClick?: (notification: NotificationData) => void;
  className?: string;
}

export function NotificationPanel({ 
  isOpen, 
  onClose, 
  onNotificationClick,
  className 
}: NotificationPanelProps) {
  const [notifications, setNotifications] = React.useState<NotificationData[]>([]);
  const { user } = useAuth();

  // Fetch notifications
  const { data: fetchedNotifications = [], isLoading, refetch } = useQuery<NotificationData[]>({
    queryKey: ["/api/notifications"],
    enabled: isOpen,
    staleTime: 30000,
  });

  // Update notifications when data changes
  React.useEffect(() => {
    if (fetchedNotifications) {
      setNotifications(fetchedNotifications);
    }
  }, [fetchedNotifications]);

  // WebSocket for real-time notifications
  React.useEffect(() => {
    if (!isOpen || !user?.id) return;

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.host;
    const wsUrl = `${wsProtocol}//${wsHost}/api/ws/notifications?userId=${user.id}`;

    console.log('🔗 Connecting to WebSocket notifications:', wsUrl);
    
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('✅ WebSocket notifications connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📢 Received notification:', data);
        
        if (data.type === 'mention_notification') {
          // Add new notification to the list and refresh
          refetch();
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('👋 WebSocket notifications disconnected');
    };

    // Cleanup function
    return () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }, [isOpen, user?.id, refetch]);

  // Get notification icon based on type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'clip_mention':
        return <Video className="h-4 w-4 text-[#B7FF1A]" />;
      case 'comment_mention':
        return <MessageCircle className="h-4 w-4 text-primary" />;
      case 'like':
        return <span className="text-red-500">❤️</span>;
      case 'follow':
        return <User className="h-4 w-4 text-purple-500" />;
      case 'comment':
        return <MessageCircle className="h-4 w-4 text-gray-500" />;
      case 'streak':
        return <Flame className="h-4 w-4 text-orange-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return date.toLocaleDateString();
  };

  // Handle notification click
  const handleNotificationClick = (notification: NotificationData) => {
    // Mark as read logic could go here
    onNotificationClick?.(notification);
    
    // Navigate to the notification's action URL
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  };

  // Handle mark all as read
  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        credentials: 'include',
      });
      refetch();
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className={cn(
        "fixed inset-0 z-50 bg-black/80",
        className
      )}
      data-testid="notification-panel-overlay"
    >
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-gray-900 shadow-xl">
        <Card className="h-full rounded-none border-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="space-y-1">
              <CardTitle className="text-xl">Notifications</CardTitle>
              <CardDescription>
                {notifications.filter(n => !n.isRead).length} unread
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              {notifications.some(n => !n.isRead) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllRead}
                  data-testid="button-mark-all-read"
                >
                  Mark all read
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                data-testid="button-close-notifications"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-100px)]">
              {isLoading ? (
                <div className="p-4 text-center text-gray-500" data-testid="loading-notifications">
                  Loading notifications...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500" data-testid="no-notifications">
                  <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No notifications yet</p>
                  <p className="text-sm mt-1">We'll notify you when someone mentions you!</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        "p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors",
                        !notification.isRead && "bg-[#B7FF1A]/5 dark:bg-[#B7FF1A]/5"
                      )}
                      onClick={() => handleNotificationClick(notification)}
                      data-testid={`notification-${notification.id}`}
                    >
                      <div className="flex items-start space-x-3">
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
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                              {notification.title}
                            </p>
                            {!notification.isRead && (
                              <Badge variant="secondary" className="ml-2 bg-[#B7FF1A] text-black">
                                New
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {notification.message}
                          </p>
                          {notification.metadata?.clipTitle && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 italic">
                              "{notification.metadata.clipTitle}"
                            </p>
                          )}
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                            {formatRelativeTime(notification.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export type { NotificationData, NotificationPanelProps };