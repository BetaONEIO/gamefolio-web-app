
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserCheck, UserX, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FollowRequest {
  id: number;
  requesterId: number;
  requester: {
    id: number;
    username: string;
    displayName: string;
    avatarUrl?: string;
    nftProfileTokenId?: string | null;
    nftProfileImageUrl?: string | null;
  };
  createdAt: string;
}

export function FollowRequestsSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get pending follow requests
  const { data: followRequests, isLoading } = useQuery<FollowRequest[]>({
    queryKey: ["/api/follow-requests"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Accept follow request mutation
  const acceptMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const response = await fetch(`/api/follow-requests/${requestId}/accept`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to accept follow request");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/follow-requests"] });
      toast({
        description: "Follow request accepted",
        variant: "gamefolioSuccess",
      });
    },
    onError: () => {
      toast({
        description: "Failed to accept follow request",
        variant: "destructive",
      });
    },
  });

  // Decline follow request mutation
  const declineMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const response = await fetch(`/api/follow-requests/${requestId}/decline`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to decline follow request");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/follow-requests"] });
      toast({
        description: "Follow request declined",
        variant: "gamefolioSuccess",
      });
    },
    onError: () => {
      toast({
        description: "Failed to decline follow request",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Follow Requests
          </CardTitle>
          <CardDescription>Loading follow requests...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!followRequests || followRequests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Follow Requests
          </CardTitle>
          <CardDescription>No pending follow requests</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Follow Requests ({followRequests.length})
        </CardTitle>
        <CardDescription>
          People who want to follow your private profile
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {followRequests.map((request) => (
          <div
            key={request.id}
            className="flex items-center justify-between p-4 border rounded-lg"
          >
            <div className="flex items-center gap-3">
              {request.requester.nftProfileTokenId && request.requester.nftProfileImageUrl ? (
                <div className="w-10 h-10 rounded-lg overflow-hidden border border-[#4ade80]/40">
                  <img src={request.requester.nftProfileImageUrl} alt={request.requester.displayName} className="w-full h-full object-cover" />
                </div>
              ) : (
                <Avatar className="h-10 w-10">
                  <AvatarImage src={request.requester.avatarUrl} />
                  <AvatarFallback>
                    {request.requester.displayName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              )}
              <div>
                <p className="font-semibold">{request.requester.displayName}</p>
                <p className="text-sm text-muted-foreground">
                  @{request.requester.username}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(request.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => acceptMutation.mutate(request.id)}
                disabled={acceptMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {acceptMutation.isPending ? (
                  <div className="w-4 h-4 rounded-full border-2 border-t-transparent border-current animate-spin" />
                ) : (
                  <UserCheck className="h-4 w-4" />
                )}
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => declineMutation.mutate(request.id)}
                disabled={declineMutation.isPending}
              >
                {declineMutation.isPending ? (
                  <div className="w-4 h-4 rounded-full border-2 border-t-transparent border-current animate-spin" />
                ) : (
                  <UserX className="h-4 w-4" />
                )}
                Decline
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
