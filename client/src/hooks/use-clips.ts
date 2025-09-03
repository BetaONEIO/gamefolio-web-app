import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipWithUser, CommentWithUser, Game, User } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export function useClip(clipId: string | number) {
  return useQuery<ClipWithUser>({
    queryKey: [`/api/clips/${clipId}`],
    enabled: !!clipId,
  });
}

export function useFeedClips(period: 'day' | 'week' | 'month' = 'day', limit?: number) {
  const queryParams = new URLSearchParams();
  queryParams.append('period', period);
  if (limit) queryParams.append('limit', limit.toString());
  
  return useQuery<ClipWithUser[]>({
    queryKey: [`/api/clips?${queryParams.toString()}`],
  });
}

export function useUserClips(username: string) {
  return useQuery<ClipWithUser[]>({
    queryKey: [`/api/users/${username}/clips`],
    enabled: !!username,
  });
}

export function useClipComments(clipId: string | number) {
  return useQuery<CommentWithUser[]>({
    queryKey: [`/api/clips/${clipId}/comments`],
    enabled: !!clipId,
  });
}

export function useCreateComment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { clipId: number; text: string }) => {
      const response = await apiRequest("POST", `/api/clips/${data.clipId}/comments`, {
        content: data.text,
      });
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/clips/${variables.clipId}/comments`] });
      queryClient.invalidateQueries({ queryKey: [`/api/clips/${variables.clipId}`] });
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { clipId: number; commentId: number }) => {
      await apiRequest("DELETE", `/api/clips/${data.clipId}/comments/${data.commentId}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/clips/${variables.clipId}/comments`] });
      queryClient.invalidateQueries({ queryKey: [`/api/clips/${variables.clipId}`] });
    },
  });
}

export function useLikeClip() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { clipId: number; unlike: boolean }) => {
      if (data.unlike) {
        await apiRequest("DELETE", `/api/clips/${data.clipId}/likes`);
      } else {
        await apiRequest("POST", `/api/clips/${data.clipId}/likes`);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/clips/${variables.clipId}`] });
      queryClient.invalidateQueries({ queryKey: ['clipLikeStatus', variables.clipId] });
      queryClient.invalidateQueries({ queryKey: [`/api/clips/${variables.clipId}/likes`] });
      // Also invalidate feed clips and user clips
      queryClient.invalidateQueries({ queryKey: ['/api/clips'] });
    },
  });
}

export function useLikeScreenshot() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { screenshotId: number; unlike: boolean }) => {
      if (data.unlike) {
        await apiRequest("DELETE", `/api/screenshots/${data.screenshotId}/likes`);
      } else {
        await apiRequest("POST", `/api/screenshots/${data.screenshotId}/likes`);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/screenshots/${variables.screenshotId}`] });
      queryClient.invalidateQueries({ queryKey: ['screenshotLikeStatus', variables.screenshotId] });
      queryClient.invalidateQueries({ queryKey: [`/api/screenshots/${variables.screenshotId}/likes`] });
      // Also invalidate feed screenshots
      queryClient.invalidateQueries({ queryKey: ['/api/screenshots'] });
    },
  });
}