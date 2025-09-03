import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "./use-toast";
import { useAuth } from "./use-auth";
import { UserWithStats } from "@shared/schema";

export function useProfile(username: string) {
  return useQuery<UserWithStats>({
    queryKey: [`/api/users/${username}`],
  });
}

export function useFollowProfile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ username, unfollow }: { username: string; unfollow: boolean }) => {
      if (unfollow) {
        return apiRequest("DELETE", `/api/users/${username}/follow`);
      } else {
        return apiRequest("POST", `/api/users/${username}/follow`);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${variables.username}`] });
      toast({
        title: variables.unfollow ? "Unfollowed" : "Following",
        description: variables.unfollow 
          ? `You have unfollowed ${variables.username}` 
          : `You are now following ${variables.username}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Action failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    },
  });
}

export function useAddFavoriteGame() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ gameId }: { gameId: number }) => {
      if (!user?.id) throw new Error("User not authenticated");
      return apiRequest("POST", `/api/users/${user.id}/favorites`, { gameId });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: [`/api/users/${user.id}/favorites`] });
      }
      toast({
        title: "Game added to favorites",
        description: "The game has been added to your favorite games.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to add game",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    },
  });
}

export function useRemoveFavoriteGame() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ gameId }: { gameId: number }) => {
      if (!user?.id) throw new Error("User not authenticated");
      return apiRequest("DELETE", `/api/users/${user.id}/favorites/${gameId}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: [`/api/users/${user.id}/favorites`] });
      }
      toast({
        title: "Game removed from favorites",
        description: "The game has been removed from your favorite games.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to remove game",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ userId, userData }: { userId: number; userData: Partial<UserWithStats> }) => {
      return apiRequest("PATCH", `/api/users/${userId}`, userData);
    },
    onSuccess: (data, variables) => {
      // For appearance changes, avoid triggering cache updates that cause component re-renders
      const isAppearanceChange = variables.userData.accentColor || variables.userData.backgroundColor || variables.userData.avatarBorderColor;
      
      if (isAppearanceChange) {
        // For appearance changes, update cache silently without triggering re-renders
        const user = queryClient.getQueryData(["/api/user"]) as any;
        if (user) {
          // Update cache data directly without triggering subscribers
          const updatedUser = { ...user, ...variables.userData };
          queryClient.getQueryCache().find({ queryKey: ["/api/user"] })?.setData(updatedUser);
          
          if (user.username) {
            queryClient.getQueryCache().find({ queryKey: [`/api/users/${user.username}`] })?.setData(updatedUser);
          }
        }
        
        // For demo user
        if (variables.userId === 999) {
          queryClient.getQueryCache().find({ queryKey: ["/api/users/demo"] })?.setData((old: any) => 
            old ? { ...old, ...variables.userData } : old
          );
        }
      } else {
        // For non-appearance changes, update normally
        queryClient.setQueriesData(
          { queryKey: ["/api/user"] }, 
          (old: any) => {
            if (!old) return old;
            return { ...old, ...variables.userData };
          }
        );
        
        const user = queryClient.getQueryData(["/api/user"]) as any;
        if (user?.username) {
          queryClient.setQueryData([`/api/users/${user.username}`], (old: any) => {
            if (!old) return old;
            return { ...old, ...variables.userData };
          });
        }
        
        if (variables.userId === 999) {
          queryClient.setQueryData(["/api/users/demo"], (old: any) => 
            old ? { ...old, ...variables.userData } : old
          );
        }
      }
      
      // Show success message
      toast({
        title: "Profile updated successfully",
        description: "Your profile changes have been saved.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update profile",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    },
  });
}
