import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { UserX, UserCheck, MessageSquare, MessageSquareOff, Lock, Unlock } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface BlockedUser {
  id: number;
  username: string;
  displayName: string;
  avatarUrl?: string;
}

export function BlockedUsersSection() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch blocked users
  const { data: blockedUsers = [], isLoading } = useQuery<BlockedUser[]>({
    queryKey: ["/api/users/blocked"],
  });

  // Unblock user mutation
  const unblockUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiRequest("POST", "/api/users/unblock", { userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/blocked"] });
      toast({
        title: "Success",
        description: "User unblocked successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to unblock user",
        variant: "destructive",
      });
    },
  });

  // Update messaging preferences mutation
  const updateMessagingMutation = useMutation({
    mutationFn: async (messagingEnabled: boolean) => {
      const response = await apiRequest("POST", "/api/users/messaging-preferences", { messagingEnabled });
      return response.json();
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(["/api/user"], updatedUser);
      toast({
        title: "Success",
        description: `Messaging ${updatedUser.messagingEnabled ? "enabled" : "disabled"} successfully`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update messaging preferences",
        variant: "destructive",
      });
    },
  });

  // Update privacy preferences mutation
  const updatePrivacyMutation = useMutation({
    mutationFn: async (isPrivate: boolean) => {
      const response = await apiRequest("POST", "/api/users/privacy-preferences", { isPrivate });
      return response.json();
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(["/api/user"], updatedUser);
      toast({
        title: "Success",
        description: `Profile is now ${updatedUser.isPrivate ? "private" : "public"}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update privacy preferences",
        variant: "destructive",
      });
    },
  });

  const handleUnblockUser = (userId: number) => {
    unblockUserMutation.mutate(userId);
  };

  const handleToggleMessaging = (enabled: boolean) => {
    updateMessagingMutation.mutate(enabled);
  };

  const handleTogglePrivacy = (isPrivate: boolean) => {
    updatePrivacyMutation.mutate(isPrivate);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserX className="w-5 h-5" />
            Blocked Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                </div>
                <div className="w-20 h-8 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Privacy Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Privacy Settings
          </CardTitle>
          <p className="text-sm text-gray-600">
            Control who can view your profile and content.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {user?.isPrivate ? (
                <Lock className="w-5 h-5 text-orange-600" />
              ) : (
                <Unlock className="w-5 h-5 text-green-600" />
              )}
              <div>
                <Label htmlFor="profile-private" className="text-sm font-medium">
                  Private Profile
                </Label>
                <p className="text-sm text-gray-600">
                  {user?.isPrivate
                    ? "Your profile is private - only approved followers can see your content"
                    : "Your profile is public - anyone can see your content"}
                </p>
              </div>
            </div>
            <Switch
              id="profile-private"
              checked={user?.isPrivate ?? false}
              onCheckedChange={handleTogglePrivacy}
              disabled={updatePrivacyMutation.isPending}
            />
          </div>
        </CardContent>
      </Card>

      {/* Messaging Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Messaging Preferences
          </CardTitle>
          <p className="text-sm text-gray-600">
            Control who can send you messages and how messaging works for your account.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {user?.messagingEnabled ? (
                <MessageSquare className="w-5 h-5 text-green-600" />
              ) : (
                <MessageSquareOff className="w-5 h-5 text-gray-400" />
              )}
              <div>
                <Label htmlFor="messaging-enabled" className="text-sm font-medium">
                  Enable Messaging
                </Label>
                <p className="text-sm text-gray-600">
                  {user?.messagingEnabled
                    ? "Other users can send you messages"
                    : "Messaging is disabled - no one can send you messages"}
                </p>
              </div>
            </div>
            <Switch
              id="messaging-enabled"
              checked={user?.messagingEnabled ?? true}
              onCheckedChange={handleToggleMessaging}
              disabled={updateMessagingMutation.isPending}
            />
          </div>
        </CardContent>
      </Card>

      {/* Blocked Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserX className="w-5 h-5" />
            Blocked Users
          </CardTitle>
          <p className="text-sm text-gray-600">
            Users you've blocked cannot send you messages or interact with your content.
          </p>
        </CardHeader>
      <CardContent>
        {blockedUsers.length === 0 ? (
          <div className="text-center py-8">
            <UserCheck className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500 mb-2">No blocked users</p>
            <p className="text-sm text-gray-400">
              Users you block will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {blockedUsers.map((user) => (
              <div key={user.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={user.avatarUrl} />
                  <AvatarFallback>
                    {user.displayName[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{user.displayName}</p>
                    <Badge variant="secondary" className="text-xs">
                      Blocked
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500">@{user.username}</p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <UserCheck className="w-4 h-4 mr-2" />
                      Unblock
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Unblock User</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to unblock @{user.username}?
                        They will be able to send you messages and interact with your content again.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleUnblockUser(user.id)}
                      >
                        Unblock User
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      </Card>
    </div>
  );
}