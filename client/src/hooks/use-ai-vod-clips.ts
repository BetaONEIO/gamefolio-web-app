import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { AiClipJob, AiClipCandidate } from "@shared/schema";

export interface TwitchVodOption {
  id: string;
  title: string;
  url: string;
  thumbnailUrl: string;
  durationSeconds: number;
  createdAt: string;
  viewCount: number;
  eligible: boolean;
}

const TERMINAL_STATUSES = new Set(["completed", "failed", "cancelled"]);

export function useAiClipsStatus() {
  return useQuery<{ enabled: boolean; disabledMessage: string | null }>({
    queryKey: ["/api/ai-vod-clips/status"],
  });
}

export function useTwitchVods() {
  return useQuery<{ vods: TwitchVodOption[]; maxDurationSeconds: number }>({
    queryKey: ["/api/ai-vod-clips/vods"],
  });
}

export function useCreateAiClipJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vodId: string) => {
      const res = await apiRequest("POST", "/api/ai-vod-clips/jobs", { vodId });
      return res.json() as Promise<{ job: AiClipJob }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-vod-clips/jobs"] });
    },
  });
}

export function useAiClipJob(jobId: number | null) {
  return useQuery<{ job: AiClipJob; candidates: AiClipCandidate[] }>({
    queryKey: [`/api/ai-vod-clips/jobs/${jobId}`],
    enabled: jobId != null,
    refetchInterval: (query) => {
      const status = query.state.data?.job?.status;
      return status && TERMINAL_STATUSES.has(status) ? false : 3000;
    },
  });
}

export function useRetryAiClipJob(jobId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/ai-vod-clips/jobs/${jobId}/retry`, {});
      return res.json() as Promise<{ job: AiClipJob }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/ai-vod-clips/jobs/${jobId}`] });
    },
  });
}

export function usePublishCandidate(jobId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { candidateId: number; title?: string; description?: string; gameId?: number; tags?: string[]; ageRestricted?: boolean }) => {
      const { candidateId, ...overrides } = params;
      const res = await apiRequest("POST", `/api/ai-vod-clips/candidates/${candidateId}/publish`, overrides);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/ai-vod-clips/jobs/${jobId}`] });
    },
  });
}

export function useDiscardCandidate(jobId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (candidateId: number) => {
      const res = await apiRequest("POST", `/api/ai-vod-clips/candidates/${candidateId}/discard`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/ai-vod-clips/jobs/${jobId}`] });
    },
  });
}
