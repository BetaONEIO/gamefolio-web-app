import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CustomAvatar } from "@/components/ui/custom-avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { User } from "@shared/schema";
import { UserPlus, UserCheck, Gift, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

function GiftProDialog({
  user,
  open,
  onClose,
}: {
  user: FollowUser;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [plan, setPlan] = useState<"monthly" | "yearly">("monthly");

  const giftMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/pro/gift-checkout", {
        recipientUsername: user.username,
        plan,
      });
      const data = await res.json();
      if (!data.url) throw new Error(data.error || "No checkout URL returned");
      return data.url as string;
    },
    onSuccess: (url) => {
      onClose();
      window.open(url, "_blank", "noopener,noreferrer");
    },
    onError: (err: any) => {
      toast({
        title: "Gift failed",
        description: err?.message || "Could not start gift checkout.",
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-4 w-4 text-primary" />
            Gift Pro to @{user.username}
          </DialogTitle>
          <DialogDescription>
            Pick a plan — you'll be taken to Stripe to complete the gift.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 mt-2">
          <button
            onClick={() => setPlan("monthly")}
            className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-colors text-sm ${
              plan === "monthly"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:bg-secondary"
            }`}
          >
            <span className="font-semibold">1 month</span>
            <span className="font-bold">£2.99</span>
          </button>
          <button
            onClick={() => setPlan("yearly")}
            className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-colors text-sm ${
              plan === "yearly"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:bg-secondary"
            }`}
          >
            <span className="font-semibold">1 year</span>
            <span className="font-bold">£30.00</span>
          </button>
        </div>
        <Button
          className="mt-4 w-full"
          onClick={() => giftMutation.mutate()}
          disabled={giftMutation.isPending}
        >
          {giftMutation.isPending ? "Redirecting..." : `Gift ${plan === "monthly" ? "1 month" : "1 year"} of Pro`}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function FollowUserRow({ user, onClose }: { user: FollowUser; onClose: () => void }) {
  const { user: currentUser } = useAuth();
  const [, setLocation] = useLocation();
  const [giftDialogOpen, setGiftDialogOpen] = useState(false);
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
    <>
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
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Button
              size="sm"
              variant={isFollowing ? "outline" : "default"}
              className="h-8 px-3 text-xs"
              onClick={() => followMutation.mutate()}
              disabled={followMutation.isPending}
            >
              {isFollowing ? (
                <><UserCheck className="h-3 w-3 mr-1" />Following</>
              ) : (
                <><UserPlus className="h-3 w-3 mr-1" />Follow</>
              )}
            </Button>
            {!(user as any).isPro && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-2 text-xs border-primary/40 text-primary hover:bg-primary/10"
                onClick={() => setGiftDialogOpen(true)}
                title={`Gift Pro to @${user.username}`}
              >
                <Gift className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </div>
      {giftDialogOpen && (
        <GiftProDialog
          user={user}
          open={giftDialogOpen}
          onClose={() => setGiftDialogOpen(false)}
        />
      )}
    </>
  );
}

export function FollowListModal({ open, onClose, type, userId, profileUsername }: FollowListModalProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: [`/api/users/${userId}/${type}`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: open && !!userId,
    staleTime: 30000,
  });

  const filteredUsers = searchQuery.trim()
    ? users.filter((u) => {
        const q = searchQuery.toLowerCase();
        return (
          u.username.toLowerCase().includes(q) ||
          (u.displayName ?? "").toLowerCase().includes(q)
        );
      })
    : users;

  const title = type === "followers" ? "Followers" : "Following";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose(); setSearchQuery(""); } }}>
      <DialogContent className="max-w-sm w-full p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b">
          <DialogTitle className="text-base">
            {profileUsername ? `@${profileUsername}'s ` : ""}{title}
            {users.length > 0 && (
              <span className="ml-1.5 text-sm font-normal text-muted-foreground">({users.length})</span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Search bar */}
        {!isLoading && users.length > 0 && (
          <div className="px-3 py-2 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                className="w-full rounded-md border border-border bg-background pl-8 pr-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder={`Search ${title.toLowerCase()}…`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="max-h-[55vh] overflow-y-auto">
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
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No results for "{searchQuery}"
            </div>
          ) : (
            filteredUsers.map((user) => (
              <FollowUserRow key={user.id} user={user} onClose={onClose} />
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
