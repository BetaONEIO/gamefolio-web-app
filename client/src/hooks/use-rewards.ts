import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";

export interface RewardRow {
  id: number;
  userId: number;
  cadence: "daily" | "weekly";
  period: string;
  xpAmount: number;
  gftAmount: number;
  expiresAt: string;
  claimedAt: string | null;
  claimedType: "xp" | "gft" | null;
  claimedAmount: number | null;
  txHash: string | null;
  createdAt: string;
}

export interface RewardStatus {
  daily: RewardRow | null;
  weekly: RewardRow | null;
}

export interface ClaimResponse {
  success: true;
  rewardId: number;
  cadence: "daily" | "weekly";
  claimType: "xp" | "gft";
  claimAmount: number;
  txHash?: string;
  newTotalXp?: number;
}

export type ClaimError =
  | "NOT_FOUND"
  | "ALREADY_CLAIMED"
  | "EXPIRED"
  | "WALLET_REQUIRED"
  | "TRANSFER_FAILED";

const REWARDS_QUERY_KEY = ["/api/rewards/status"] as const;

export function useRewards() {
  const queryClient = useQueryClient();

  const statusQuery = useQuery<RewardStatus>({
    queryKey: REWARDS_QUERY_KEY,
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const claimMutation = useMutation<
    ClaimResponse,
    { error: ClaimError } | Error,
    { rewardId: number; type: "xp" | "gft" }
  >({
    mutationFn: async ({ rewardId, type }) => {
      const res = await apiRequest("POST", "/api/rewards/claim", { rewardId, type });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const err: ClaimError = body?.error ?? "NOT_FOUND";
        throw { error: err };
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REWARDS_QUERY_KEY });
      // The XP claim path mutates totalXp; nudge anything keyed on the user.
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
  });

  const daily = statusQuery.data?.daily ?? null;
  const weekly = statusQuery.data?.weekly ?? null;
  const hasClaimable = Boolean(daily || weekly);

  return {
    daily,
    weekly,
    hasClaimable,
    isLoading: statusQuery.isLoading,
    refetch: statusQuery.refetch,
    claim: claimMutation.mutateAsync,
    isClaiming: claimMutation.isPending,
  };
}
