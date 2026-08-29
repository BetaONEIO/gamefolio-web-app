import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Bell, MessageCircle, Upload, UserPlus, UserCheck, UserX,
  Flame, Video, Download, Share2, Trophy, X, CheckCheck, Trash2,
} from "lucide-react";
import { ZapIconFire } from "@/components/ui/ZapReactionIcon";
import { PixelHeartReaction } from "@/components/ui/PixelHeartReaction";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CustomAvatar } from "@/components/ui/custom-avatar";
import { Notification } from "@shared/schema";
import { apiRequest, getQueryFn, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

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

function getNotificationIcon(type: string) {
  switch (type) {
    case "like":
      return <PixelHeartReaction size={16} active={true} />;
    case "reaction":
      return <ZapIconFire className="h-4 w-4" style={{ width: 14, height: 14 }} />;
    case "comment":
    case "reply":
      return <MessageCircle className="h-4 w-4 text-[#B7FF1A]" />;
    case "comment_mention":
      return <MessageCircle className="h-4 w-4 text-primary" />;
    case "follow":
      return <UserPlus className="h-4 w-4 text-primary" />;
    case "follow_request":
      return <UserPlus className="h-4 w-4 text-orange-500" />;
    case "follow_request_accepted":
      return <UserCheck className="h-4 w-4 text-primary" />;
    case "upload":
      return <Upload className="h-4 w-4 text-primary" />;
    case "clip_mention":
      return <Video className="h-4 w-4 text-[#B7FF1A]" />;
    case "message":
      return <MessageCircle className="h-4 w-4 text-sky-400" />;
    case "streak":
      return <Flame className="h-4 w-4 text-orange-500" />;
    case "download":
      return <Download className="h-4 w-4 text-[#B7FF1A]" />;
    case "share":
      return <Share2 className="h-4 w-4 text-[#B7FF1A]" />;
    case "milestone":
      return <Trophy className="h-4 w-4 text-[#B7FF1A]" />;
    default:
      return <Bell className="h-4 w-4 text-gray-500" />;
  }
}

function formatTimeAgo(dateInput: string | Date) {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const diffInSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

function NotificationRow({
  notification,
  onNavigate,
}: {
  notification: NotificationWithUser;
  onNavigate: (url: string) => void;
}) {
  const { toast } = useToast();
  const [followedBack, setFollowedBack] = useState(false);

  const markReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/notifications/${notification.id}/mark-read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/notifications/${notification.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const followBackMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/users/${notification.fromUser!.username}/follow`);
    },
    onSuccess: () => setFollowedBack(true),
    onError: () => toast({ title: "Failed to follow back", variant: "destructive" }),
  });

  const approveRequestMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/notifications/${notification.id}/approve-follow`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      toast({ title: "Follow request approved" });
    },
    onError: () => toast({ title: "Failed to approve request", variant: "destructive" }),
  });

  const rejectRequestMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/notifications/${notification.id}/reject-follow`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      toast({ title: "Follow request rejected" });
    },
    onError: () => toast({ title: "Failed to reject request", variant: "destructive" }),
  });

  const handleRowClick = () => {
    if (!notification.isRead) markReadMutation.mutate();
    if (notification.actionUrl) onNavigate(notification.actionUrl);
  };

  const isZapReaction = notification.type === "reaction";

  return (
    <div
      onClick={handleRowClick}
      className={cn(
        "relative flex items-start gap-4 p-4 border-b border-border/50 last:border-b-0 cursor-pointer hover:bg-secondary/50 transition-colors overflow-hidden",
        !notification.isRead && "bg-primary/5 border-l-4 border-l-primary",
        isZapReaction && !notification.isRead && "border-l-[#B7FF1A]"
      )}
    >
      {/* Zap sweep animation */}
      {isZapReaction && !notification.isRead && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(183, 255, 26, 0.12)",
            animation: "notifZapSwipe 0.75s cubic-bezier(0.4,0,0.2,1) forwards",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
      )}

      {/* Avatar + icon overlay */}
      <div className="relative flex-shrink-0 mt-0.5" style={{ zIndex: 1 }}>
        {notification.fromUser ? (
          <div className="relative">
            <CustomAvatar user={notification.fromUser as any} size="md" borderIntensity="subtle" />
            <div className="absolute -bottom-1 -right-1">
              {getNotificationIcon(notification.type)}
            </div>
          </div>
        ) : (
          <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
            {getNotificationIcon(notification.type)}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0" style={{ zIndex: 1 }}>
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium text-sm leading-snug">{notification.title}</p>
          <div className="flex items-center gap-2 flex-shrink-0">
            {!notification.isRead && (
              <div className="w-2 h-2 bg-primary rounded-full" />
            )}
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatTimeAgo(notification.createdAt)}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(); }}
              className="h-6 w-6 p-0 hover:bg-red-500/10 hover:text-red-500 opacity-50 hover:opacity-100 transition-all"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{notification.message}</p>

        {/* Follow Back */}
        {notification.type === "follow" && notification.fromUser && (
          <div className="mt-2">
            {followedBack ? (
              <Button size="sm" variant="outline" disabled className="h-7 px-3 text-xs">
                <UserCheck className="h-3 w-3 mr-1" />
                Following
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={(e) => { e.stopPropagation(); followBackMutation.mutate(); }}
                disabled={followBackMutation.isPending}
                className="h-7 px-3 text-xs bg-primary hover:bg-primary/90"
              >
                <UserPlus className="h-3 w-3 mr-1" />
                Follow Back
              </Button>
            )}
          </div>
        )}

        {/* Follow request approve/reject */}
        {notification.type === "follow_request" && !notification.isRead && (
          <div className="flex gap-2 mt-2">
            <Button
              size="sm"
              onClick={(e) => { e.stopPropagation(); approveRequestMutation.mutate(); }}
              disabled={approveRequestMutation.isPending}
              className="h-7 px-3 text-xs bg-primary hover:bg-primary"
            >
              <UserCheck className="h-3 w-3 mr-1" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => { e.stopPropagation(); rejectRequestMutation.mutate(); }}
              disabled={rejectRequestMutation.isPending}
              className="h-7 px-3 text-xs border-red-200 text-red-600 hover:bg-red-50"
            >
              <UserX className="h-3 w-3 mr-1" />
              Reject
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: notificationsData, isLoading } = useQuery<NotificationWithUser[] | null>({
    queryKey: ["/api/notifications"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 0,
  });
  // `data` can be explicitly `null` on a 401 — a destructure default only
  // covers `undefined`, so guard here to avoid `.length`/`.filter` crashing.
  const notifications = notificationsData ?? [];

  const unreadNotifications = notifications.filter((n) => !n.isRead);
  const readNotifications = notifications.filter((n) => n.isRead);

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/notifications/mark-all-read");
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["/api/notifications"] });
      const previous = queryClient.getQueryData(["/api/notifications"]);
      queryClient.setQueryData(["/api/notifications"], (old: any[]) =>
        (old || []).map((n: any) => ({ ...n, isRead: true }))
      );
      queryClient.setQueryData(["/api/notifications/unread-count"], 0);
      return { previous };
    },
    onError: (_err: any, _vars: any, context: any) => {
      queryClient.setQueryData(["/api/notifications"], context?.previous);
      toast({ title: "Failed to mark all as read", variant: "destructive" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/notifications/delete-all");
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["/api/notifications"] });
      const previous = queryClient.getQueryData(["/api/notifications"]);
      queryClient.setQueryData(["/api/notifications"], []);
      queryClient.setQueryData(["/api/notifications/unread-count"], 0);
      return { previous };
    },
    onError: (_err: any, _vars: any, context: any) => {
      queryClient.setQueryData(["/api/notifications"], context?.previous);
      toast({ title: "Failed to clear notifications", variant: "destructive" });
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/notifications"], []);
      queryClient.setQueryData(["/api/notifications/unread-count"], 0);
    },
  });

  const handleNavigate = (url: string) => {
    if (/^https?:\/\//i.test(url)) {
      window.open(url, "_blank");
    } else {
      setLocation(url);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell className="h-6 w-6 text-primary" />
              Notifications
            </h1>
            {unreadNotifications.length > 0 && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {unreadNotifications.length} unread
              </p>
            )}
          </div>

          <div className="flex gap-2">
            {unreadNotifications.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                className="gap-1.5"
              >
                <CheckCheck className="h-4 w-4" />
                Mark all read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => deleteAllMutation.mutate()}
                disabled={deleteAllMutation.isPending}
                className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
              >
                <Trash2 className="h-4 w-4" />
                {deleteAllMutation.isPending ? "Clearing…" : "Clear all"}
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start gap-4 p-4 rounded-lg border border-border animate-pulse">
                <div className="h-10 w-10 rounded-full bg-secondary flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-secondary rounded w-3/4" />
                  <div className="h-3 bg-secondary rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground">
            <Bell className="h-16 w-16 mb-4 opacity-20" />
            <h3 className="text-lg font-medium mb-1">No notifications yet</h3>
            <p className="text-sm max-w-xs">
              You'll be notified here when someone likes, comments, follows you, or mentions you.
            </p>
          </div>
        ) : (
          <Tabs defaultValue="new">
            <TabsList className="mb-4">
              <TabsTrigger value="new" className="gap-1.5">
                New
                {unreadNotifications.length > 0 && (
                  <Badge className="bg-primary text-primary-foreground text-xs h-5 px-1.5">
                    {unreadNotifications.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="all">
                All ({notifications.length})
              </TabsTrigger>
            </TabsList>

            <div className="rounded-lg border border-border overflow-hidden">
              <TabsContent value="new" className="m-0">
                {unreadNotifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                    <CheckCheck className="h-10 w-10 mb-3 opacity-30" />
                    <p className="font-medium">All caught up!</p>
                    <p className="text-sm mt-1">No new notifications.</p>
                  </div>
                ) : (
                  <div>
                    {unreadNotifications.map((n) => (
                      <NotificationRow key={n.id} notification={n} onNavigate={handleNavigate} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="all" className="m-0">
                <div>
                  {notifications.map((n) => (
                    <NotificationRow key={n.id} notification={n} onNavigate={handleNavigate} />
                  ))}
                </div>
              </TabsContent>
            </div>
          </Tabs>
        )}
      </div>
    </div>
  );
}
