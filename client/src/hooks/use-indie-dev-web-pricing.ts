import { useQuery } from "@tanstack/react-query";
import { isNative } from "@/lib/platform";

interface IndieDevWebPricing {
  currency: string;
  monthly: number;
  yearly: number;
  localCurrency?: string;
  localMonthly?: number;
  localYearly?: number;
  developerOffer?: { monthly: number; yearly: number };
}

export function isIndieDevIntroEligible(user: {
  userType?: string | null;
  role?: string | null;
  partnerType?: string | null;
  indieDevSubscriptionStartDate?: unknown;
} | null | undefined): boolean {
  if (!user || user.indieDevSubscriptionStartDate) return false;
  const personas = user.userType?.split(",").map((value) => value.trim().toLowerCase()) ?? [];
  return personas.some((value) => ["indie_developer", "game_developer", "developer", "indie"].includes(value))
    || ["developer", "indie_developer"].includes(user.role?.toLowerCase() ?? "")
    || user.partnerType === "indie";
}

export function useIndieDevWebPricing(enabled: boolean) {
  return useQuery<IndieDevWebPricing>({
    queryKey: ["/api/stripe/indie-dev-pricing"],
    enabled: enabled && !isNative,
    staleTime: 60_000,
  });
}

export function formatIndieDevPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount);
}
