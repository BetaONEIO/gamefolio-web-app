import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipWithUser, CommentWithUser, Game, User } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export function useClip(clipId: string | number) {
  return useQuery<ClipWithUser>({
    queryKey: [`/api/clips/${clipId}`],
    queryFn: async () => {
      const res = await fetch(`/api/clips/${clipId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch clip");
      return res.json();
    },
    enabled: !!clipId,
  });
}

export function useFeedClips(period: 'day' | 'week' | 'month' = 'day', limit?: number) {
  const queryParams = new URLSearchParams();
  queryParams.append('period', period);
  if (limit) queryParams.append('limit', limit.toString());
  const url = `/api/clips?${queryParams.toString()}`;
  
  return useQuery<ClipWithUser[]>({
    queryKey: [url],
    queryFn: async () => {
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch clips");
      return res.json();
    },
  });
}

export function useUserClips(username: string) {
  return useQuery<ClipWithUser[]>({
    queryKey: [`/api/users/${username}/clips`],
    queryFn: async () => {
      const res = await fetch(`/api/users/${username}/clips`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch user clips");
      return res.json();
    },
    enabled: !!username,
  });
}

export function useClipComments(clipId: string | number) {
  return useQuery<CommentWithUser[]>({
    queryKey: [`/api/clips/${clipId}/comments`],
    queryFn: async () => {
      const res = await fetch(`/api/clips/${clipId}/comments`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch comments");
      return res.json();
    },
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
    mutationFn: async (data: { clipId: number; unlike?: boolean }) => {
      // Always use POST for toggle behavior (backend handles like/unlike)
      await apiRequest("POST", `/api/clips/${data.clipId}/likes`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/clips/${variables.clipId}`] });
      queryClient.invalidateQueries({ queryKey: ['clipLikeStatus', variables.clipId] });
      queryClient.invalidateQueries({ queryKey: [`/api/clips/${variables.clipId}/likes`] });
      queryClient.invalidateQueries({ queryKey: [`/api/clips/${variables.clipId}/likes/status`] });
    },
  });
}

export function useLikeScreenshot() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { screenshotId: number; unlike?: boolean }) => {
      // Always use POST for toggle behavior (backend handles like/unlike)
      await apiRequest("POST", `/api/screenshots/${data.screenshotId}/likes`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/screenshots/${variables.screenshotId}`] });
      queryClient.invalidateQueries({ queryKey: ['screenshotLikeStatus', variables.screenshotId] });
      queryClient.invalidateQueries({ queryKey: [`/api/screenshots/${variables.screenshotId}/likes`] });
      queryClient.invalidateQueries({ queryKey: [`/api/screenshots/${variables.screenshotId}/likes/status`] });
    },
  });
}

export function useScreenshotComments(screenshotId: string | number) {
  return useQuery<CommentWithUser[]>({
    queryKey: [`/api/screenshots/${screenshotId}/comments`],
    queryFn: async () => {
      const res = await fetch(`/api/screenshots/${screenshotId}/comments`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch comments");
      return res.json();
    },
    enabled: !!screenshotId,
  });
}

export function useCreateScreenshotComment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { screenshotId: number; text: string }) => {
      const response = await apiRequest("POST", `/api/screenshots/${data.screenshotId}/comments`, {
        content: data.text,
      });
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/screenshots/${variables.screenshotId}/comments`] });
      queryClient.invalidateQueries({ queryKey: [`/api/screenshots/${variables.screenshotId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/trending/screenshots'] });
    },
  });
}

export function useDeleteScreenshotComment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { screenshotId: number; commentId: number }) => {
      await apiRequest("DELETE", `/api/screenshot-comments/${data.commentId}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/screenshots/${variables.screenshotId}/comments`] });
      queryClient.invalidateQueries({ queryKey: [`/api/screenshots/${variables.screenshotId}`] });
    },
  });
}