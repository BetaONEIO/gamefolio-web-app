import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CustomAvatar } from "@/components/ui/custom-avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { User } from "@shared/schema";
import { UserPlus, UserCheck } from "lucide-react";

interface FollowListModalProps {
  open: boolean;
  onClose: () => void;
  type: "followers" | "following";
  userId: number;
  profileUsername?: string;
}

interface FollowUser extends User {
  isFollowing?: boolean;
}

function FollowUserRow({ user, onClose }: { user: FollowUser; onClose: () => void }) {
  const { user: currentUser } = useAuth();
  const [, setLocation] = useLocation();
  const isSelf = currentUser?.id === user.id;

  const { data: followStatus } = useQuery<{ following: boolean }>({
    queryKey: [`/api/users/${user.username}/follow-status`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!currentUser && !isSelf,
    staleTime: 30000,
  });

  const isFollowing = followStatus?.following ?? false;

  const followMutation = useMutation({
    mutationFn: () =>
      isFollowing
        ? apiRequest("DELETE", `/api/users/${user.username}/follow`)
        : apiRequest("POST", `/api/users/${user.username}/follow`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user.username}/follow-status`] });
    },
  });

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors">
      <button
        className="flex-shrink-0"
        onClick={() => { onClose(); setLocation(`/profile/${user.username}`); }}
      >
        <CustomAvatar user={user} size="sm" borderIntensity="subtle" />
      </button>
      <button
        className="flex-1 min-w-0 text-left"
        onClick={() => { onClose(); setLocation(`/profile/${user.username}`); }}
      >
        <p className="font-semibold text-sm truncate">{user.displayName || user.username}</p>
        <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
      </button>
      {currentUser && !isSelf && (
        <Button
          size="sm"
          variant={isFollowing ? "outline" : "default"}
          className="flex-shrink-0 h-8 px-3 text-xs"
          onClick={() => followMutation.mutate()}
          disabled={followMutation.isPending}
        >
          {isFollowing ? (
            <><UserCheck className="h-3 w-3 mr-1" />Following</>
          ) : (
            <><UserPlus className="h-3 w-3 mr-1" />Follow</>
          )}
        </Button>
      )}
    </div>
  );
}

export function FollowListModal({ open, onClose, type, userId, profileUsername }: FollowListModalProps) {
  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: [`/api/users/${userId}/${type}`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: open && !!userId,
    staleTime: 30000,
  });

  const title = type === "followers" ? "Followers" : "Following";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm w-full p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b">
          <DialogTitle className="text-base">
            {profileUsername ? `@${profileUsername}'s ` : ""}{title}
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              {type === "followers" ? "No followers yet" : "Not following anyone yet"}
            </div>
          ) : (
            users.map((user) => (
              <FollowUserRow key={user.id} user={user} onClose={onClose} />
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
