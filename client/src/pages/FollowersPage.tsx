import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ArrowLeft, Search, UserPlus, UserCheck, Gift, Users, MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CustomAvatar } from "@/components/ui/custom-avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ProBadge } from "@/components/ui/pro-badge";
import { apiRequest, getQueryFn, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { GiftProSearchDialog } from "@/components/profile/GiftProSearchDialog";

interface FollowUser {
  id: number;
  username: string;
  displayName: string | null;
  avatarUrl?: string | null;
  nftProfileTokenId?: string | null;
  nftProfileImageUrl?: string | null;
  activeProfilePicType?: string | null;
  accentColor?: string | null;
  selectedBorderId?: number | null;
  selectedVerificationBadgeId?: number | null;
}

function FollowUserRow({ user }: { user: FollowUser }) {
  const { user: currentUser } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
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
    onError: () => {
      toast({ title: "Failed to update follow status", variant: "destructive" });
    },
  });

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/40 transition-colors border-b border-border/30 last:border-b-0">
        <button
          className="flex-shrink-0"
          onClick={() => setLocation(`/profile/${user.username}`)}
        >
          <CustomAvatar user={user as any} size="md" borderIntensity="subtle" />
        </button>

        <button
          className="flex-1 min-w-0 text-left"
          onClick={() => setLocation(`/profile/${user.username}`)}
        >
          <div className="flex items-center gap-1">
            <p className="font-semibold text-sm truncate">
              {user.displayName || user.username}
            </p>
            {user.selectedVerificationBadgeId && (
              <ProBadge selectedVerificationBadgeId={user.selectedVerificationBadgeId} size="sm" />
            )}
          </div>
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
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0 border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
              onClick={() => setLocation(`/messages?user=${user.username}`)}
              title={`Message @${user.username}`}
            >
              <MessageCircle className="h-3.5 w-3.5" />
            </Button>
            {!user.selectedVerificationBadgeId && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0 text-xs border-primary/40 text-primary hover:bg-primary/10"
                onClick={() => setGiftDialogOpen(true)}
                title={`Gift Pro to @${user.username}`}
              >
                <Gift className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>

      {giftDialogOpen && (
        <GiftProSearchDialog
          open={giftDialogOpen}
          onOpenChange={setGiftDialogOpen}
          initialUsername={user.username}
        />
      )}
    </>
  );
}

function UserList({
  userId,
  type,
}: {
  userId: number;
  type: "followers" | "following";
}) {
  const [search, setSearch] = useState("");

  const { data: users = [], isLoading } = useQuery<FollowUser[]>({
    queryKey: [`/api/users/${userId}/${type}`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!userId,
    staleTime: 30000,
  });

  const filtered = search.trim()
    ? users.filter((u) => {
        const q = search.toLowerCase();
        return (
          u.username.toLowerCase().includes(q) ||
          (u.displayName ?? "").toLowerCase().includes(q)
        );
      })
    : users;

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border/50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            className="w-full rounded-lg border border-border bg-secondary/50 pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder={`Search ${type}…`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-8 w-20 rounded-md" />
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
            <Users className="h-12 w-12 mb-3 opacity-20" />
            <p className="font-medium">
              {type === "followers" ? "No followers yet" : "Not following anyone yet"}
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
            <Search className="h-10 w-10 mb-3 opacity-20" />
            <p className="font-medium">No results for "{search}"</p>
          </div>
        ) : (
          <div>
            {filtered.map((user) => (
              <FollowUserRow key={user.id} user={user} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function FollowersPage() {
  const params = useParams<{ username: string }>();
  const [, setLocation] = useLocation();
  const username = params.username;

  // Read tab from ?tab=following query param only on first mount.
  // Never update URL when switching — avoids wouter seeing a path change and remounting.
  const [activeTab, setActiveTab] = useState<"followers" | "following">(() => {
    const p = new URLSearchParams(window.location.search);
    return p.get("tab") === "following" ? "following" : "followers";
  });

  const { data: profile, isLoading: profileLoading } = useQuery<{
    id: number;
    username: string;
    displayName: string | null;
    avatarUrl?: string | null;
    nftProfileTokenId?: string | null;
    nftProfileImageUrl?: string | null;
    activeProfilePicType?: string | null;
    accentColor?: string | null;
    selectedBorderId?: number | null;
    selectedVerificationBadgeId?: number | null;
    _count?: { followers: number; following: number };
  }>({
    queryKey: [`/api/users/${username}`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!username,
    staleTime: 60000,
  });

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as "followers" | "following");
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3 max-w-2xl mx-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation(`/profile/${username}`)}
            className="h-9 w-9 p-0 flex-shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-2.5 min-w-0">
            {profileLoading ? (
              <>
                <Skeleton className="w-8 h-8 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </>
            ) : profile ? (
              <>
                <CustomAvatar user={profile as any} size="sm" borderIntensity="subtle" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="font-semibold text-sm truncate">
                      {profile.displayName || profile.username}
                    </p>
                    {profile.selectedVerificationBadgeId && (
                      <ProBadge selectedVerificationBadgeId={profile.selectedVerificationBadgeId} size="sm" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">@{profile.username}</p>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col">
          <div className="border-b border-border px-4">
            <TabsList className="h-11 bg-transparent gap-6 p-0 w-auto">
              <TabsTrigger
                value="followers"
                className="h-11 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 text-sm font-medium"
              >
                Followers
                {profile?._count?.followers !== undefined && (
                  <span className="ml-1.5 text-muted-foreground font-normal text-xs">
                    {profile._count.followers.toLocaleString()}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="following"
                className="h-11 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 text-sm font-medium"
              >
                Following
                {profile?._count?.following !== undefined && (
                  <span className="ml-1.5 text-muted-foreground font-normal text-xs">
                    {profile._count.following.toLocaleString()}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="followers" className="flex-1 flex flex-col m-0">
            {profile?.id ? (
              <UserList userId={profile.id} type="followers" />
            ) : (
              <div className="flex items-center justify-center py-20 text-muted-foreground">
                {profileLoading ? "Loading…" : "User not found"}
              </div>
            )}
          </TabsContent>

          <TabsContent value="following" className="flex-1 flex flex-col m-0">
            {profile?.id ? (
              <UserList userId={profile.id} type="following" />
            ) : (
              <div className="flex items-center justify-center py-20 text-muted-foreground">
                {profileLoading ? "Loading…" : "User not found"}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
