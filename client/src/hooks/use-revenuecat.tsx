import { createContext, useContext, useEffect, useState, useCallback, ReactNode, useRef } from "react";
import { Purchases as WebPurchases } from "@revenuecat/purchases-js";
import type { Package as WebPackage } from "@revenuecat/purchases-js";
import type { PurchasesPackage as NativePackage } from "@revenuecat/purchases-capacitor";
import { isNative, platform } from "@/lib/platform";
import { useAuth } from "./use-auth";
import { useToast } from "./use-toast";
import { queryClient } from "@/lib/queryClient";

// Minimal CustomerInfo shape the app actually reads. Both the native
// StoreKit/Play SDK (@revenuecat/purchases-capacitor) and the web Billing SDK
// (@revenuecat/purchases-js) return objects that satisfy this.
export interface RcCustomerInfo {
  entitlements: { active: Record<string, { expirationDate?: string | null } | undefined> };
  managementURL: string | null;
}

// SDK-agnostic package the paywall renders and purchases. `_native` / `_web`
// hold the raw package needed to actually run the purchase on the right SDK.
export interface RcPackage {
  identifier: string;
  priceFormatted: string;
  priceAmount: number;
  currency: string;
  displayName: string;
  _native?: NativePackage;
  _web?: WebPackage;
}

type RevenueCatContextType = {
  isInitialized: boolean;
  isLoading: boolean;
  isPro: boolean;
  customerInfo: RcCustomerInfo | null;
  refreshCustomerInfo: () => Promise<void>;
  purchasePackage: (pkg: RcPackage) => Promise<boolean>;
  getCurrentOffering: () => RcPackage[] | null;
};

const RevenueCatContext = createContext<RevenueCatContextType | null>(null);

const PRO_ENTITLEMENT_ID = "pro";

function pickKey(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

// RevenueCat issues a SEPARATE public API key per store: Apple App Store
// (appl_…), Google Play (goog_…) and Web Billing (rcb_…). A native purchase
// only works with the matching store key, so we select by platform. Falls back
// to the legacy single VITE_REVENUECAT_API_KEY (web Billing) when a
// platform-specific key isn't set.
function getRevenueCatApiKey(): string | null {
  if (platform === "ios") {
    return pickKey(import.meta.env.VITE_REVENUECAT_API_KEY_IOS) ?? pickKey(import.meta.env.VITE_REVENUECAT_API_KEY);
  }
  if (platform === "android") {
    return pickKey(import.meta.env.VITE_REVENUECAT_API_KEY_ANDROID) ?? pickKey(import.meta.env.VITE_REVENUECAT_API_KEY);
  }
  return pickKey(import.meta.env.VITE_REVENUECAT_API_KEY_WEB) ?? pickKey(import.meta.env.VITE_REVENUECAT_API_KEY);
}

function normalizeNative(pkg: NativePackage): RcPackage {
  return {
    identifier: pkg.identifier,
    priceFormatted: pkg.product.priceString,
    priceAmount: pkg.product.price,
    currency: pkg.product.currencyCode,
    displayName: pkg.product.title,
    _native: pkg,
  };
}

function normalizeWeb(pkg: WebPackage): RcPackage {
  const price = pkg.rcBillingProduct?.currentPrice;
  return {
    identifier: pkg.identifier,
    priceFormatted: price?.formattedPrice ?? "",
    priceAmount: (price?.amountMicros ?? 0) / 1_000_000,
    currency: price?.currency ?? "USD",
    displayName: pkg.rcBillingProduct?.displayName ?? "Pro",
    _web: pkg,
  };
}

export function RevenueCatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const webInstanceRef = useRef<ReturnType<typeof WebPurchases.getSharedInstance> | null>(null);
  const nativeConfiguredRef = useRef(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<RcCustomerInfo | null>(null);
  const [hasProEntitlement, setHasProEntitlement] = useState(false);
  const [packages, setPackages] = useState<RcPackage[] | null>(null);

  const isPro = hasProEntitlement || user?.isPro === true;

  const syncProStatusWithBackend = useCallback(async (proStatus: boolean) => {
    try {
      await fetch("/api/subscription/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isPro: proStatus }),
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    } catch (error) {
      console.error("Failed to sync Pro status:", error);
    }
  }, []);

  useEffect(() => {
    if (!user?.id) {
      webInstanceRef.current = null;
      nativeConfiguredRef.current = false;
      setIsInitialized(false);
      setCustomerInfo(null);
      setHasProEntitlement(false);
      setPackages(null);
      return;
    }

    const apiKey = getRevenueCatApiKey();
    if (!apiKey) {
      console.warn(`RevenueCat API key not configured for "${platform}". Subscription purchases are disabled on this platform.`);
      setIsInitialized(true);
      return;
    }

    let cancelled = false;
    const appUserId = `gamefolio_${user.id}`;

    const finish = (info: RcCustomerInfo, pkgs: RcPackage[] | null) => {
      if (cancelled) return;
      setCustomerInfo(info);
      const pro = info.entitlements?.active?.[PRO_ENTITLEMENT_ID] !== undefined;
      setHasProEntitlement(pro);
      setPackages(pkgs);
      setIsInitialized(true);
      if (pro && !user.isPro) void syncProStatusWithBackend(true);
    };

    // Native (iOS/Android): real StoreKit / Play Billing via the Capacitor
    // plugin. Dynamically imported so its native bridge is never pulled into
    // the web bundle.
    const initNative = async () => {
      const { Purchases } = await import("@revenuecat/purchases-capacitor");
      await Purchases.configure({ apiKey, appUserID: appUserId });
      nativeConfiguredRef.current = true;
      const [{ customerInfo: info }, offerings] = await Promise.all([
        Purchases.getCustomerInfo(),
        Purchases.getOfferings(),
      ]);
      const current = offerings.current;
      finish(info as unknown as RcCustomerInfo, current ? current.availablePackages.map(normalizeNative) : null);
    };

    // Web: RevenueCat Web Billing SDK. NB the paywall itself purchases via
    // Stripe Checkout (see ProUpgradeDialog); here the SDK is used for the
    // entitlement/customer-info read on web.
    const initWeb = async () => {
      WebPurchases.configure({ apiKey, appUserId });
      const instance = WebPurchases.getSharedInstance();
      webInstanceRef.current = instance;
      const [info, offers] = await Promise.all([instance.getCustomerInfo(), instance.getOfferings()]);
      const current = offers.current;
      finish(info as unknown as RcCustomerInfo, current ? current.availablePackages.map(normalizeWeb) : null);
    };

    (isNative ? initNative() : initWeb()).catch((error) => {
      console.error("Failed to initialize RevenueCat:", error);
      if (!cancelled) setIsInitialized(true);
    });

    return () => {
      cancelled = true;
    };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshCustomerInfo = useCallback(async () => {
    setIsLoading(true);
    try {
      let info: RcCustomerInfo | null = null;
      if (isNative) {
        if (!nativeConfiguredRef.current) return;
        const { Purchases } = await import("@revenuecat/purchases-capacitor");
        const res = await Purchases.getCustomerInfo();
        info = res.customerInfo as unknown as RcCustomerInfo;
      } else {
        const instance = webInstanceRef.current;
        if (!instance) return;
        info = (await instance.getCustomerInfo()) as unknown as RcCustomerInfo;
      }
      setCustomerInfo(info);
      const pro = info.entitlements?.active?.[PRO_ENTITLEMENT_ID] !== undefined;
      setHasProEntitlement(pro);
      if (pro !== (user?.isPro === true)) await syncProStatusWithBackend(pro);
    } catch (error) {
      console.error("Failed to refresh customer info:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.isPro, syncProStatusWithBackend]);

  const purchasePackage = useCallback(async (pkg: RcPackage): Promise<boolean> => {
    const notReady = () =>
      toast({
        title: "Not ready",
        description: "Please wait while we set up the payment system.",
        variant: "destructive",
      });

    setIsLoading(true);
    try {
      let info: RcCustomerInfo;
      if (isNative) {
        if (!nativeConfiguredRef.current || !pkg._native) {
          notReady();
          return false;
        }
        const { Purchases } = await import("@revenuecat/purchases-capacitor");
        const result = await Purchases.purchasePackage({ aPackage: pkg._native });
        info = result.customerInfo as unknown as RcCustomerInfo;
      } else {
        const instance = webInstanceRef.current;
        if (!instance || !pkg._web) {
          notReady();
          return false;
        }
        const result = await instance.purchase({ rcPackage: pkg._web, customerEmail: user?.email || undefined });
        info = result.customerInfo as unknown as RcCustomerInfo;
      }

      setCustomerInfo(info);
      const pro = info.entitlements?.active?.[PRO_ENTITLEMENT_ID] !== undefined;
      if (pro) {
        setHasProEntitlement(true);
        await syncProStatusWithBackend(true);
        toast({
          title: "Welcome to Gamefolio Pro!",
          description: "You now have access to all premium features.",
          variant: "gamefolioSuccess",
        });
        return true;
      }
      return false;
    } catch (error: any) {
      // User dismissed the store sheet — not an error worth surfacing.
      if (error?.userCancelled || error?.errorCode === "UserCancelledError" || /cancel/i.test(error?.message || "")) {
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
  }, [user?.email, toast, syncProStatusWithBackend]);

  const getCurrentOffering = useCallback((): RcPackage[] | null => packages, [packages]);

  return (
    <RevenueCatContext.Provider
      value={{
        isInitialized,
        isLoading,
        isPro,
        customerInfo,
        refreshCustomerInfo,
        purchasePackage,
        getCurrentOffering,
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
