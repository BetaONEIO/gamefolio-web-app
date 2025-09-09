import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "./use-toast";

export function useFollowRequests() {
  return useQuery({
    queryKey: ["/api/follow-requests"],
    staleTime: 30000, // Consider data fresh for 30 seconds
  });
}

export function useApproveFollowRequest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (requestId: number) => {
      return apiRequest("POST", `/api/follow-requests/${requestId}/approve`);
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
}

export function useRejectFollowRequest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (requestId: number) => {
      return apiRequest("POST", `/api/follow-requests/${requestId}/reject`);
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
}