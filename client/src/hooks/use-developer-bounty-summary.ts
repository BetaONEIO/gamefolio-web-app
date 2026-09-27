import { useQuery } from "@tanstack/react-query";
import { isPartnerType } from "@shared/partner-access";
import { useAuth } from "@/hooks/use-auth";
import { getQueryFn } from "@/lib/queryClient";

export type DeveloperBountySummary = {
  starterAllowance?: {
    eligible?: boolean;
    available?: boolean;
    used?: boolean;
    periodEnd?: string | null;
  };
  activeCampaigns?: number;
  scheduledCampaigns?: number;
  completedCampaigns?: number;
  draftCampaigns?: number;
};

export function useDeveloperBountySummary() {
  const { user } = useAuth();
  const personaTypes = user?.userType?.split(",").map((type) => type.trim()) ?? [];
  const isEligible = Boolean(
    user && (
      user.role === "admin" ||
      personaTypes.includes("indie_developer") ||
      isPartnerType(user, "indie")
    ),
  );

  const allowanceQuery = useQuery<any>({
    queryKey: ["/api/campaigns/commercial-model"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isEligible,
    staleTime: 60_000,
  });

  const overviewQuery = useQuery<any>({
    queryKey: ["/api/campaigns/overview"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isEligible,
    staleTime: 60_000,
  });

  return {
    isEligible,
    isLoading: allowanceQuery.isLoading || overviewQuery.isLoading,
    allowance: allowanceQuery.data?.starterAllowance as DeveloperBountySummary["starterAllowance"] | undefined,
    overview: overviewQuery.data as DeveloperBountySummary | null | undefined,
  };
}