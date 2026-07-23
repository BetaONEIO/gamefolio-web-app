import { createContext, useContext, useEffect, useState, useCallback, ReactNode, useRef } from "react";
import { Purchases as WebPurchases } from "@revenuecat/purchases-js";
import type { Package as WebPackage } from "@revenuecat/purchases-js";
import type { PurchasesPackage as NativePackage } from "@revenuecat/purchases-capacitor";
import { isNative, platform } from "@/lib/platform";
import { AuthContext } from "./use-auth";
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
  isIndieDevSubscriber: boolean;
  customerInfo: RcCustomerInfo | null;
  refreshCustomerInfo: () => Promise<void>;
  purchasePackage: (pkg: RcPackage) => Promise<boolean>;
  getCurrentOffering: () => RcPackage[] | null;
  getIndieDevOffering: () => RcPackage[] | null;
  purchaseIndieDevPackage: (pkg: RcPackage) => Promise<boolean>;
};

const RevenueCatContext = createContext<RevenueCatContextType | null>(null);

const PRO_ENTITLEMENT_ID = "pro";
const INDIE_DEV_ENTITLEMENT_ID = "indie_dev";
const INDIE_DEV_OFFERING_ID = "Gamefolio Indie Developer";

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
  // Read AuthContext directly rather than useAuth() so the provider doesn't
  // throw during hot module reloads when it briefly renders outside AuthProvider.
  const auth = useContext(AuthContext);
  const user = auth?.user ?? null;
  const { toast } = useToast();
  const webInstanceRef = useRef<ReturnType<typeof WebPurchases.getSharedInstance> | null>(null);
  const nativeConfiguredRef = useRef(false);
  // Raw offerings object (native or web), kept around so a NAMED offering
  // (Indie Developer) can be looked up without a second network round-trip —
  // the initial fetch already retrieves every offering, we just only mapped
  // `current` (Pro) into `packages` below.
  const offeringsRef = useRef<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<RcCustomerInfo | null>(null);
  const [hasProEntitlement, setHasProEntitlement] = useState(false);
  const [hasIndieDevEntitlement, setHasIndieDevEntitlement] = useState(false);
  const [packages, setPackages] = useState<RcPackage[] | null>(null);
  const [indieDevPackages, setIndieDevPackages] = useState<RcPackage[] | null>(null);

  const isPro = hasProEntitlement || user?.isPro === true;
  const isIndieDevSubscriber = hasIndieDevEntitlement || user?.isIndieDevSubscriber === true;

  const syncProStatusWithBackend = useCallback(async (proStatus: boolean) => {
    try {
      await fetch("/api/subscription/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isPro: proStatus }),
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/upload/limits"] });
    } catch (error) {
      console.error("Failed to sync Pro status:", error);
    }
  }, []);

  // After a native (StoreKit/Play) purchase, confirm with the server-verified
  // activate endpoint. Unlike the trust-client /api/subscription/sync path, this
  // re-checks the entitlement with RevenueCat and persists revenuecatUserId +
  // the subscription end date. The webhook is the backstop if this call fails.
  const activateProOnBackend = useCallback(async (appUserId: string) => {
    try {
      await fetch("/api/pro/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ appUserId, platform }),
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/upload/limits"] });
    } catch (error) {
      console.error("Failed to activate Pro on backend:", error);
    }
  }, []);

  // Same server-verified activation as Pro, but for the Indie Developer
  // entitlement — see /api/indie-dev/activate in server/routes/revenuecat.ts.
  const activateIndieDevOnBackend = useCallback(async (appUserId: string) => {
    try {
      await fetch("/api/indie-dev/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ appUserId, platform }),
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    } catch (error) {
      console.error("Failed to activate Indie Developer subscription on backend:", error);
    }
  }, []);

  useEffect(() => {
    if (!user?.id) {
      webInstanceRef.current = null;
      nativeConfiguredRef.current = false;
      setIsInitialized(false);
      setCustomerInfo(null);
      setHasProEntitlement(false);
      setHasIndieDevEntitlement(false);
      setPackages(null);
      setIndieDevPackages(null);
      offeringsRef.current = null;
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

    const finish = (
      info: RcCustomerInfo,
      pkgs: RcPackage[] | null,
      rawOfferings: any,
      normalize: (pkg: any) => RcPackage,
    ) => {
      if (cancelled) return;
      setCustomerInfo(info);
      const pro = info.entitlements?.active?.[PRO_ENTITLEMENT_ID] !== undefined;
      const indieDev = info.entitlements?.active?.[INDIE_DEV_ENTITLEMENT_ID] !== undefined;
      setHasProEntitlement(pro);
      setHasIndieDevEntitlement(indieDev);
      setPackages(pkgs);
      offeringsRef.current = rawOfferings;
      const indieDevOffering = rawOfferings?.all?.[INDIE_DEV_OFFERING_ID];
      setIndieDevPackages(indieDevOffering ? indieDevOffering.availablePackages.map(normalize) : null);
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
      finish(
        info as unknown as RcCustomerInfo,
        current ? current.availablePackages.map(normalizeNative) : null,
        offerings,
        normalizeNative as (pkg: any) => RcPackage,
      );
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
      finish(
        info as unknown as RcCustomerInfo,
        current ? current.availablePackages.map(normalizeWeb) : null,
        offers,
        normalizeWeb as (pkg: any) => RcPackage,
      );
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
      const indieDev = info.entitlements?.active?.[INDIE_DEV_ENTITLEMENT_ID] !== undefined;
      setHasProEntitlement(pro);
      setHasIndieDevEntitlement(indieDev);
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
        // Native purchases are server-verified via /api/pro/activate; web
        // (non-Stripe) purchases fall back to the sync endpoint.
        if (isNative && user?.id) {
          await activateProOnBackend(`gamefolio_${user.id}`);
        } else {
          await syncProStatusWithBackend(true);
        }
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
  }, [user?.id, user?.email, toast, syncProStatusWithBackend, activateProOnBackend]);

  // Same purchase flow as purchasePackage, but for the Indie Developer
  // offering/entitlement — kept separate rather than parameterizing
  // purchasePackage, since the two tiers have different backend activation
  // endpoints and success copy.
  const purchaseIndieDevPackage = useCallback(async (pkg: RcPackage): Promise<boolean> => {
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
      const indieDev = info.entitlements?.active?.[INDIE_DEV_ENTITLEMENT_ID] !== undefined;
      if (indieDev) {
        setHasIndieDevEntitlement(true);
        if (isNative && user?.id) {
          await activateIndieDevOnBackend(`gamefolio_${user.id}`);
        } else {
          await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        }
        toast({
          title: "Welcome to Indie Developer!",
          description: "You can now run up to 5 active bounties at once.",
          variant: "gamefolioSuccess",
        });
        return true;
      }
      return false;
    } catch (error: any) {
      if (error?.userCancelled || error?.errorCode === "UserCancelledError" || /cancel/i.test(error?.message || "")) {
        return false;
      }
      console.error("Indie Developer purchase failed:", error);
      toast({
        title: "Purchase failed",
        description: error?.message || "There was an error processing your purchase. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, user?.email, toast, activateIndieDevOnBackend]);

  const getCurrentOffering = useCallback((): RcPackage[] | null => packages, [packages]);
  const getIndieDevOffering = useCallback((): RcPackage[] | null => indieDevPackages, [indieDevPackages]);

  return (
    <RevenueCatContext.Provider
      value={{
        isInitialized,
        isLoading,
        isPro,
        isIndieDevSubscriber,
        customerInfo,
        refreshCustomerInfo,
        purchasePackage,
        getCurrentOffering,
        getIndieDevOffering,
        purchaseIndieDevPackage,
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
