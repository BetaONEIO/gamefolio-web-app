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
  developerOfferEligible: boolean;
}

export function useIndieDevWebPricing(
  enabled: boolean,
  onboardingPath?: "indie",
  userId?: number | string | null,
) {
  const endpoint = onboardingPath === "indie"
    ? "/api/stripe/indie-dev-pricing?onboardingPath=indie"
    : "/api/stripe/indie-dev-pricing";

  return useQuery<IndieDevWebPricing>({
    // Eligibility is personalized. Scope the cache to the signed-in account so
    // a logout/login within staleTime cannot display another user's offer.
    // Slot 2 is reserved for URL parameters by the shared query function. Keep
    // the account identity in slot 3 so it scopes the cache without changing
    // the request URL.
    queryKey: [endpoint, undefined, userId ?? null],
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
