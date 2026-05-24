import { createContext, useContext, useEffect, useState, useCallback, ReactNode, useRef } from "react";
import { Purchases, CustomerInfo, Offerings, Package, Offering } from "@revenuecat/purchases-js";
import { useAuth } from "./use-auth";
import { useToast } from "./use-toast";
import { queryClient } from "@/lib/queryClient";

type RevenueCatContextType = {
  isInitialized: boolean;
  isLoading: boolean;
  isPro: boolean;
  isPartner: boolean;
  customerInfo: CustomerInfo | null;
  offerings: Offerings | null;
  refreshCustomerInfo: () => Promise<void>;
  purchasePackage: (pkg: Package, containerElement?: HTMLElement) => Promise<boolean>;
  presentPaywall: (containerElement: HTMLElement) => Promise<boolean>;
  getCurrentOffering: () => Package[] | null;
  getPartnerOffering: () => Package[] | null;
  currentOffering: Offering | null;
};

const RevenueCatContext = createContext<RevenueCatContextType | null>(null);

const PRO_ENTITLEMENT_ID = "pro";
// Streamer Partner: paid tier above Pro. Entitlement + its own offering
// ("Gamefolio Streamer Partner", 2 packages). Partner implies Pro perks.
const PARTNER_ENTITLEMENT_ID = "streamer_partner";
const PARTNER_OFFERING_ID = "Gamefolio Streamer Partner";

function getRevenueCatApiKey(): string | null {
  const apiKey = import.meta.env.VITE_REVENUECAT_API_KEY;
  if (!apiKey || typeof apiKey !== "string" || apiKey.trim() === "") {
    return null;
  }
  return apiKey.trim();
}

export function RevenueCatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const purchasesRef = useRef<Purchases | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [offerings, setOfferings] = useState<Offerings | null>(null);

  const isPartner = customerInfo?.entitlements?.active?.[PARTNER_ENTITLEMENT_ID] !== undefined || user?.isPartner === true;
  const isPro = customerInfo?.entitlements?.active?.[PRO_ENTITLEMENT_ID] !== undefined || user?.isPro === true || isPartner;

  const syncSubscriptionWithBackend = useCallback(async (proStatus: boolean, partnerStatus?: boolean) => {
    try {
      await fetch("/api/subscription/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          isPro: proStatus,
          ...(partnerStatus !== undefined ? { isPartner: partnerStatus } : {}),
        }),
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    } catch (error) {
      console.error("Failed to sync subscription status:", error);
    }
  }, []);

  useEffect(() => {
    const apiKey = getRevenueCatApiKey();
    
    if (!user?.id) {
      purchasesRef.current = null;
      setIsInitialized(false);
      setCustomerInfo(null);
      setOfferings(null);
      return;
    }
    
    if (!apiKey) {
      console.warn("RevenueCat API key not configured. Subscription features will be limited.");
      setIsInitialized(true);
      return;
    }

    const initRevenueCat = async () => {
      try {
        Purchases.configure({
          apiKey: apiKey,
          appUserId: `gamefolio_${user.id}`,
        });

        const instance = Purchases.getSharedInstance();
        purchasesRef.current = instance;

        const [info, offers] = await Promise.all([
          instance.getCustomerInfo(),
          instance.getOfferings(),
        ]);

        setCustomerInfo(info);
        setOfferings(offers);
        setIsInitialized(true);

        const hasPartner = info.entitlements?.active?.[PARTNER_ENTITLEMENT_ID] !== undefined;
        const hasPro = info.entitlements?.active?.[PRO_ENTITLEMENT_ID] !== undefined || hasPartner;
        if ((hasPro && !user.isPro) || (hasPartner && !user.isPartner)) {
          await syncSubscriptionWithBackend(hasPro, hasPartner);
        }
      } catch (error) {
        console.error("Failed to initialize RevenueCat:", error);
        setIsInitialized(true);
      }
    };

    initRevenueCat();
  }, [user?.id, user?.isPro, user?.isPartner, syncSubscriptionWithBackend]);

  const refreshCustomerInfo = useCallback(async () => {
    const purchases = purchasesRef.current;
    if (!purchases) return;
    
    setIsLoading(true);
    try {
      const info = await purchases.getCustomerInfo();
      setCustomerInfo(info);

      const hasPartner = info.entitlements?.active?.[PARTNER_ENTITLEMENT_ID] !== undefined;
      const hasPro = info.entitlements?.active?.[PRO_ENTITLEMENT_ID] !== undefined || hasPartner;
      if (hasPro !== (user?.isPro ?? false) || hasPartner !== (user?.isPartner ?? false)) {
        await syncSubscriptionWithBackend(hasPro, hasPartner);
      }
    } catch (error) {
      console.error("Failed to refresh customer info:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.isPro, user?.isPartner, syncSubscriptionWithBackend]);

  const purchasePackage = useCallback(async (pkg: Package, containerElement?: HTMLElement): Promise<boolean> => {
    const purchases = purchasesRef.current;
    if (!purchases) {
      toast({
        title: "Not initialized",
        description: "Please wait while we set up the payment system.",
        variant: "destructive",
      });
      return false;
    }

    setIsLoading(true);
    try {
      const result = await purchases.purchase({
        rcPackage: pkg,
        customerEmail: user?.email || undefined,
      });
      
      setCustomerInfo(result.customerInfo);

      const hasPartner = result.customerInfo.entitlements?.active?.[PARTNER_ENTITLEMENT_ID] !== undefined;
      const hasPro = result.customerInfo.entitlements?.active?.[PRO_ENTITLEMENT_ID] !== undefined || hasPartner;
      if (hasPro || hasPartner) {
        await syncSubscriptionWithBackend(hasPro, hasPartner);
        toast({
          title: hasPartner ? "Welcome, Streamer Partner!" : "Welcome to Gamefolio Pro!",
          description: hasPartner
            ? "You now have all Pro perks plus Streamer Partner features."
            : "You now have access to all premium features.",
          variant: "gamefolioSuccess",
        });
        return true;
      }

      return false;
    } catch (error: any) {
      if (error?.errorCode === "UserCancelledError" || error?.message?.includes("cancelled")) {
        return false;
      }
      console.error("Purchase failed:", error);
      toast({
        title: "Purchase failed",
        description: error?.message || "There was an error processing your purchase. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user?.email, toast, syncSubscriptionWithBackend]);

  const getCurrentOffering = useCallback((): Package[] | null => {
    if (!offerings?.current) return null;
    return offerings.current.availablePackages;
  }, [offerings]);

  // The Streamer Partner tier lives in its own (non-default) offering.
  const getPartnerOffering = useCallback((): Package[] | null => {
    const offering = offerings?.all?.[PARTNER_OFFERING_ID];
    return offering?.availablePackages ?? null;
  }, [offerings]);

  const presentPaywall = useCallback(async (containerElement: HTMLElement): Promise<boolean> => {
    const purchases = purchasesRef.current;
    if (!purchases) {
      toast({
        title: "Not initialized",
        description: "Please wait while we set up the payment system.",
        variant: "destructive",
      });
      return false;
    }

    setIsLoading(true);
    try {
      const result = await purchases.presentPaywall({
        htmlTarget: containerElement,
        offering: offerings?.current || undefined,
      });
      
      setCustomerInfo(result.customerInfo);

      const hasPartner = result.customerInfo.entitlements?.active?.[PARTNER_ENTITLEMENT_ID] !== undefined;
      const hasPro = result.customerInfo.entitlements?.active?.[PRO_ENTITLEMENT_ID] !== undefined || hasPartner;
      if (hasPro || hasPartner) {
        await syncSubscriptionWithBackend(hasPro, hasPartner);
        toast({
          title: hasPartner ? "Welcome, Streamer Partner!" : "Welcome to Gamefolio Pro!",
          description: hasPartner
            ? "You now have all Pro perks plus Streamer Partner features."
            : "You now have access to all premium features.",
          variant: "gamefolioSuccess",
        });
        return true;
      }

      return false;
    } catch (error: any) {
      if (error?.errorCode === "UserCancelledError" || error?.message?.includes("cancelled")) {
        return false;
      }
      console.error("Paywall error:", error);
      toast({
        title: "Payment failed",
        description: error?.message || "There was an error processing your payment. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [offerings, toast, syncSubscriptionWithBackend]);

  return (
    <RevenueCatContext.Provider
      value={{
        isInitialized,
        isLoading,
        isPro,
        isPartner,
        customerInfo,
        offerings,
        refreshCustomerInfo,
        purchasePackage,
        presentPaywall,
        getCurrentOffering,
        getPartnerOffering,
        currentOffering: offerings?.current || null,
      }}
    >
      {children}
    </RevenueCatContext.Provider>
  );
}

export function useRevenueCat() {
  const context = useContext(RevenueCatContext);
  if (!context) {
    throw new Error("useRevenueCat must be used within a RevenueCatProvider");
  }
  return context;
}
