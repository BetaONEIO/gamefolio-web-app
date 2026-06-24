import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Crown, Loader2, X, Check, ArrowLeft } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useRevenueCat } from "@/hooks/use-revenuecat";
import { useAuth } from "@/hooks/use-auth";
import { Package } from "@revenuecat/purchases-js";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isNative } from "@/lib/platform";
import proHeroImage from "@assets/gamefoliopromo_1771795835901.png";
import ProOnboardingScreen from "@/components/pro/ProOnboardingScreen";

interface StripePricing {
  currency: string;
  monthly: number;
  yearly: number;
  formattedMonthly: string;
  formattedYearly: string;
  country: string;
}

interface ProUpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subtitle?: string;
  onAuthRequired?: () => void;
}

const premiumBenefits = [
  {
    title: "Unlimited upload space",
    description: "Share clips without limits or storage restrictions",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 16V8M12 8L9 11M12 8L15 11" stroke="#B7FF1A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M22 12C22 17.523 17.523 22 12 22C6.477 22 2 17.523 2 12C2 6.477 6.477 2 12 2C17.523 2 22 6.477 22 12Z" stroke="#B7FF1A" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    title: "Animated profile customization",
    description: "Custom banners, borders & neon effects",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M9 3.5V2M15 3.5V2M9 21.5V20M15 21.5V20M20.5 9H22M20.5 15H22M3.5 9H2M3.5 15H2M12 8L13.5 11H16L14 13.5L15 17L12 15L9 17L10 13.5L8 11H10.5L12 8Z" stroke="#B7FF1A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    title: "100s of exclusive assets",
    description: "Premium stickers, badges & unique themes",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 21C12 21 3 13.5 3 8.5C3 5.42 5.42 3 8.5 3C10.24 3 11.91 3.81 12 5C12.09 3.81 13.76 3 15.5 3C18.58 3 21 5.42 21 8.5C21 13.5 12 21 12 21Z" stroke="#B7FF1A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    title: "Store discounts",
    description: "Save up to 20% on games and merchandise",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M9 15L15 9M21.41 11.41L12.58 2.58C12.21 2.21 11.7 2 11.17 2H4C2.9 2 2 2.9 2 4V11.17C2 11.7 2.21 12.21 2.59 12.58L11.41 21.41C12.19 22.2 13.45 22.2 14.24 21.41L21.41 14.24C22.2 13.45 22.2 12.19 21.41 11.41Z" stroke="#B7FF1A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="7" cy="7" r="1.5" fill="#B7FF1A"/>
      </svg>
    ),
  },
  {
    title: "Ad-free experience",
    description: "Pro subscribers are exempt from all video ads",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 22C17.523 22 22 17.523 22 12C22 6.477 17.523 2 12 2C6.477 2 2 6.477 2 12C2 17.523 6.477 22 12 22Z" stroke="#B7FF1A" strokeWidth="1.5"/>
        <path d="M4 4L20 20" stroke="#B7FF1A" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M10 9V15L15 12L10 9Z" stroke="#B7FF1A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
];


function isYearlyPackage(pkg: Package): boolean {
  const id = pkg.identifier.toLowerCase();
  return id.includes("annual") || id.includes("yearly") || id.includes("year");
}

function isMonthlyPackage(pkg: Package): boolean {
  const id = pkg.identifier.toLowerCase();
  return id.includes("monthly") || id.includes("month");
}

function formatPrice(pkg: Package): string {
  return pkg.rcBillingProduct?.currentPrice?.formattedPrice || "";
}

function getPriceAmount(pkg: Package): number {
  return (pkg.rcBillingProduct?.currentPrice?.amountMicros || 0) / 1000000;
}

function getCurrency(pkg: Package): string {
  return pkg.rcBillingProduct?.currentPrice?.currency || "USD";
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(amount);
}

// Pricing returned by /api/stripe/pro-pricing.
// `currency` / `monthly` / `yearly` are always present (GBP base).
// When the server can detect the visitor's country via the Cloudflare
// cf-ipcountry header it also returns an approximate local-currency conversion
// (`localCurrency`, `localMonthly`, `localYearly`).  The paywall shows the
// local price (with a "~" prefix) so international users aren't put off by £.
// The exact amount is always confirmed inside Stripe's embedded checkout.
interface WebPricing {
  currency: string;
  monthly: number;
  yearly: number;
  localCurrency?: string;
  localMonthly?: number;
  localYearly?: number;
}

interface PlanView {
  amount: number;
  formatted: string;
  perMonthFormatted: string;
}

interface LootboxReward {
  reward: { name: string; rarity: string; assetType: string; imageUrl?: string | null };
  isDuplicate: boolean;
}

export default function ProUpgradeDialog({ open, onOpenChange, subtitle, onAuthRequired }: ProUpgradeDialogProps) {
  const { isInitialized, isLoading, isPro, getCurrentOffering, purchasePackage } = useRevenueCat();
  const { user } = useAuth();
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("yearly");
  const [purchasing, setPurchasing] = useState(false);
  const [step, setStep] = useState<"plans" | "checkout" | "success">("plans");
  const [purchaseInProgress, setPurchaseInProgress] = useState(false);
  const [proLootboxReward, setProLootboxReward] = useState<LootboxReward | null>(null);
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [checkoutClientSecret, setCheckoutClientSecret] = useState<string | null>(null);
  const [checkoutSessionId, setCheckoutSessionId] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [webPricing, setWebPricing] = useState<WebPricing | null>(null);
  const scrollContainerRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      node.scrollTop = 0;
    }
  }, [step, open]);

  const packages = getCurrentOffering();

  const { monthlyPkg, yearlyPkg } = useMemo(() => {
    if (!packages) return { monthlyPkg: null, yearlyPkg: null };
    return {
      monthlyPkg: packages.find(isMonthlyPackage) || null,
      yearlyPkg: packages.find(isYearlyPackage) || null,
    };
  }, [packages]);

  const hasMultiplePlans = !!monthlyPkg && !!yearlyPkg;

  const selectedPackage = useMemo(() => {
    if (billingPeriod === "yearly" && yearlyPkg) return yearlyPkg;
    if (billingPeriod === "monthly" && monthlyPkg) return monthlyPkg;
    return yearlyPkg || monthlyPkg || (packages?.[0] ?? null);
  }, [billingPeriod, monthlyPkg, yearlyPkg, packages]);

  // Normalised plan views: native reads RevenueCat packages (store-localised),
  // web reads the server price book (region-localised). Everything below
  // renders from these, so display always matches what will be charged.
  const { monthlyView, yearlyView } = useMemo<{ monthlyView: PlanView | null; yearlyView: PlanView | null }>(() => {
    if (isNative) {
      return {
        monthlyView: monthlyPkg
          ? {
              amount: getPriceAmount(monthlyPkg),
              formatted: formatPrice(monthlyPkg),
              perMonthFormatted: formatCurrency(getPriceAmount(monthlyPkg), getCurrency(monthlyPkg)),
            }
          : null,
        yearlyView: yearlyPkg
          ? {
              amount: getPriceAmount(yearlyPkg),
              formatted: formatPrice(yearlyPkg),
              perMonthFormatted: formatCurrency(getPriceAmount(yearlyPkg) / 12, getCurrency(yearlyPkg)),
            }
          : null,
      };
    }
    if (!webPricing) return { monthlyView: null, yearlyView: null };

    // If the server detected the visitor's country and provided a local-currency
    // approximation, show that instead of GBP. Use a "~" prefix so users know
    // the paywall price is an estimate; the exact amount is shown at checkout.
    const hasLocal = !!(webPricing.localCurrency && webPricing.localMonthly != null && webPricing.localYearly != null);
    const displayCurrency = hasLocal ? webPricing.localCurrency! : webPricing.currency;
    const displayMonthly  = hasLocal ? webPricing.localMonthly!  : webPricing.monthly;
    const displayYearly   = hasLocal ? webPricing.localYearly!   : webPricing.yearly;
    return {
      monthlyView: {
        amount: displayMonthly,
        formatted: formatCurrency(displayMonthly, displayCurrency),
        perMonthFormatted: formatCurrency(displayMonthly, displayCurrency),
      },
      yearlyView: {
        amount: displayYearly,
        formatted: formatCurrency(displayYearly, displayCurrency),
        perMonthFormatted: formatCurrency(displayYearly / 12, displayCurrency),
      },
    };
  }, [monthlyPkg, yearlyPkg, webPricing]);

  const savings = useMemo(() => {
    if (!monthlyView || !yearlyView) return 0;
    const monthlyPrice = monthlyView.amount;
    const yearlyMonthly = yearlyView.amount / 12;
    if (monthlyPrice > 0) {
      const s = Math.round((1 - yearlyMonthly / monthlyPrice) * 100);
      return s > 0 ? s : 0;
    }
    return 0;
  }, [monthlyView, yearlyView]);

  const loadStripeInstance = useCallback(async () => {
    if (stripePromise) return;
    try {
      const res = await fetch("/api/stripe/config", { credentials: "include" });
      const data = await res.json();
      if (data.publishableKey) {
        setStripePromise(loadStripe(data.publishableKey));
      }
    } catch (err) {
      console.error("Failed to load Stripe config:", err);
    }
  }, [stripePromise]);

  useEffect(() => {
    if (!open) {
      setStep("plans");
      setBillingPeriod("yearly");
      setPurchasing(false);
      setPurchaseInProgress(false);
      setCheckoutClientSecret(null);
      setCheckoutSessionId(null);
      setCheckoutError(null);
      setProLootboxReward(null);
    }
  }, [open]);

  // Fetch localized Stripe pricing when dialog opens on web
  useEffect(() => {
    if (step === "checkout") {
      loadStripeInstance();
    }
  }, [step, loadStripeInstance]);

  // On web, fetch the base (GBP) price for the paywall. The local converted
  // amount is shown inside Stripe's embedded checkout via Adaptive Pricing.
  // Native uses RevenueCat store prices instead.
  useEffect(() => {
    if (!open || isNative) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/stripe/pro-pricing", { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data?.currency) {
          setWebPricing({
            currency: data.currency,
            monthly: data.monthly,
            yearly: data.yearly,
            localCurrency: data.localCurrency,
            localMonthly: data.localMonthly,
            localYearly: data.localYearly,
          });
        }
      } catch {
        // Non-fatal: button stays disabled until pricing resolves.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleJoinPro = async () => {
    if (!user) {
      onAuthRequired?.();
      return;
    }

    if (purchasing) return;

    // On native (iOS/Android) Apple/Google require all digital subscription
    // purchases to flow through the platform's IAP. RevenueCat handles that;
    // we never present Stripe on a native build.
    if (isNative) {
      if (!selectedPackage) return;
      setCheckoutError(null);
      setPurchasing(true);
      setPurchaseInProgress(true);
      try {
        const success = await purchasePackage(selectedPackage);
        if (success) {
          setStep("success");
        }
      } catch (err: any) {
        setCheckoutError(err?.message || "Purchase failed");
      } finally {
        setPurchasing(false);
      }
      return;
    }

    // Web (Stripe) path — open an embedded Checkout Session. Stripe Adaptive
    // Pricing (enabled in the Dashboard) converts £2.99 to the buyer's local
    // currency inside the checkout; the server only sends the base GBP price.
    if (!webPricing) return;
    setCheckoutLoading(true);
    setCheckoutError(null);
    setCheckoutClientSecret(null);
    setCheckoutSessionId(null);
    setPurchaseInProgress(true);
    try {
      await loadStripeInstance();
      const res = await apiRequest("POST", "/api/stripe/create-pro-subscription", {
        plan: billingPeriod,
      });
      const data = await res.json();
      setCheckoutClientSecret(data.clientSecret);
      setCheckoutSessionId(data.sessionId);
      setStep("checkout");
    } catch (err: any) {
      setCheckoutError(err?.message || "Failed to start checkout");
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Called by the embedded checkout when payment completes (redirect_on_
  // completion is 'never'). Confirm with the server to provision Pro + lootbox,
  // then show the success screen.
  const handleCheckoutComplete = useCallback(async () => {
    let lootboxReward: LootboxReward | null = null;
    try {
      if (checkoutSessionId) {
        const res = await apiRequest("POST", "/api/stripe/confirm-pro-subscription", {
          sessionId: checkoutSessionId,
          plan: billingPeriod,
        });
        const data = await res.json();
        lootboxReward = data.lootboxReward || null;
      }
    } catch {
      // The webhook backstop will still provision Pro server-side.
    }
    await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    setProLootboxReward(lootboxReward);
    setStep("success");
  }, [checkoutSessionId, billingPeriod]);

  if (isPro && step !== "success" && !purchaseInProgress) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[430px] w-full bg-[#0B1218] border-none p-0 overflow-hidden [&>button]:hidden">
          <div className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-[#B7FF1A] to-[#6FA800] mb-6">
              <Crown className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">You're already Pro!</h2>
            <p className="text-[#B8C0AE] mb-6">
              You have full access to all Gamefolio Pro features. Thank you for your support!
            </p>
            <button
              onClick={() => onOpenChange(false)}
              className="w-full py-4 bg-[#B7FF1A] hover:bg-[#A2F000] text-[#071013] font-bold text-lg rounded-2xl transition-colors"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const canPurchase = isNative ? !!selectedPackage : !!webPricing;
  const buttonDisabled = !onAuthRequired && (isLoading || purchasing || checkoutLoading || !canPurchase || (isNative && !isInitialized));

  const planSelector = (compact: boolean = false) => {
    const yearlyPerMonth = yearlyView?.perMonthFormatted ?? null;
    const yearlyTotal = yearlyView?.formatted ?? null;
    const monthlyPrice = monthlyView?.formatted ?? null;

    return (
      <div className="flex flex-col gap-2">
        {yearlyView && (
          <button
            type="button"
            onClick={() => setBillingPeriod("yearly")}
            className={`relative w-full rounded-xl border-2 transition-all p-3 text-left ${
              billingPeriod === "yearly"
                ? "border-[#B7FF1A] bg-[#B7FF1A0d]"
                : "border-[#1B2A33] bg-[#0B1218] hover:border-[#22313A]"
            }`}
          >
            {savings > 0 && (
              <div className="absolute -top-2.5 right-3 bg-[#B7FF1A] text-[#071013] text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                Save {savings}%
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  billingPeriod === "yearly" ? "border-[#B7FF1A] bg-[#B7FF1A]" : "border-[#475569]"
                }`}>
                  {billingPeriod === "yearly" && <Check className="w-2.5 h-2.5 text-[#071013]" strokeWidth={3} />}
                </div>
                <div>
                  <div className="text-white font-semibold text-sm">Yearly</div>
                  <div className="text-[#B8C0AE] text-[11px]">
                    {yearlyTotal} billed annually
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-white font-bold text-base">{yearlyPerMonth}</div>
                <div className="text-[#B8C0AE] text-[11px]">/month</div>
              </div>
            </div>
          </button>
        )}

        {monthlyView && (
          <button
            type="button"
            onClick={() => setBillingPeriod("monthly")}
            className={`w-full rounded-xl border-2 transition-all p-3 text-left ${
              billingPeriod === "monthly"
                ? "border-[#B7FF1A] bg-[#B7FF1A0d]"
                : "border-[#1B2A33] bg-[#0B1218] hover:border-[#22313A]"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  billingPeriod === "monthly" ? "border-[#B7FF1A] bg-[#B7FF1A]" : "border-[#475569]"
                }`}>
                  {billingPeriod === "monthly" && <Check className="w-2.5 h-2.5 text-[#071013]" strokeWidth={3} />}
                </div>
                <div>
                  <div className="text-white font-semibold text-sm">Monthly</div>
                  <div className="text-[#B8C0AE] text-[11px]">
                    Billed monthly, cancel anytime
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-white font-bold text-base">{monthlyPrice}</div>
                <div className="text-[#B8C0AE] text-[11px]">/month</div>
              </div>
            </div>
          </button>
        )}

        {!monthlyView && !yearlyView && packages && packages.length > 0 && (
          <div className="w-full rounded-xl border-2 border-[#B7FF1A] bg-[#B7FF1A0d] p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full border-2 border-[#B7FF1A] bg-[#B7FF1A] flex items-center justify-center flex-shrink-0">
                  <Check className="w-2.5 h-2.5 text-[#071013]" strokeWidth={3} />
                </div>
                <div>
                  <div className="text-white font-semibold text-sm">{packages[0].rcBillingProduct?.displayName || "Pro"}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-white font-bold text-base">{formatPrice(packages[0])}</div>
              </div>
            </div>
          </div>
        )}

        {!isNative && (monthlyView || yearlyView) && (
          <p className="text-[#B8C0AE] text-[10px] text-center mt-0.5">
            {webPricing?.localCurrency
              ? "Approximate local price · Exact amount confirmed at checkout"
              : "Shown in GBP · Your local currency shown at checkout"}
          </p>
        )}
      </div>
    );
  };

  const leftPanel = (
    <div className="relative w-full h-full min-h-0">
      <div className="absolute inset-0">
        <img
          src={proHeroImage}
          alt="Gamefolio Pro"
          className="w-full h-full object-cover"
          style={{ objectPosition: "center 70%" }}
        />
        {/* Top vignette for depth */}
        <div className="absolute inset-x-0 top-0 h-1/4" style={{ background: 'linear-gradient(to bottom, rgba(8,16,23,0.5) 0%, transparent 100%)' }} />
        {/* Bottom fade into page background */}
        <div className="absolute inset-x-0 bottom-0 h-[75%]" style={{ background: 'linear-gradient(to top, #081017 0%, #081017 8%, rgba(8,16,23,0.85) 35%, rgba(8,16,23,0.4) 65%, transparent 100%)' }} />
      </div>

      <button
        onClick={() => onOpenChange(false)}
        className="absolute top-3 right-3 md:top-3 md:left-3 md:right-auto w-8 h-8 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center transition-colors hover:bg-black/60 z-10"
      >
        <X className="w-4 h-4 text-white" />
      </button>

      <div className="absolute bottom-0 left-0 right-0 z-10 px-5 pb-4">
        <div className="flex justify-center mb-3 md:justify-start">
          <div className="inline-flex items-center gap-1.5 bg-[#14532d4d] border border-[#B7FF1A33] rounded-full px-3 py-1">
            <svg width="24" height="24" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M13.3953 9.55057L13.524 8.28791C13.5926 7.61391 13.6373 7.16924 13.602 6.88858H13.6153C14.196 6.88858 14.6673 6.39124 14.6673 5.77791C14.6673 5.16458 14.196 4.66658 13.6146 4.66658C13.0333 4.66658 12.562 5.16391 12.562 5.77791C12.562 6.05524 12.6586 6.30924 12.818 6.50391C12.5893 6.65258 12.29 6.96724 11.8393 7.44058C11.4926 7.80524 11.3193 7.98724 11.126 8.01591C11.0186 8.03123 10.909 8.01502 10.8106 7.96924C10.632 7.88658 10.5126 7.66124 10.2746 7.20991L9.01864 4.83325C8.87197 4.55525 8.74864 4.32258 8.63731 4.13525C9.09264 3.88991 9.40397 3.39058 9.40397 2.81525C9.40397 1.99592 8.77597 1.33325 8.00064 1.33325C7.22531 1.33325 6.59731 1.99658 6.59731 2.81458C6.59731 3.39058 6.90864 3.88991 7.36398 4.13458C7.25264 4.32258 7.12998 4.55525 6.98264 4.83325L5.72731 7.21058C5.48864 7.66124 5.36931 7.88658 5.19065 7.96991C5.09227 8.01568 4.98272 8.0319 4.87531 8.01657C4.68198 7.98791 4.50865 7.80524 4.16198 7.44058C3.71131 6.96724 3.41198 6.65258 3.18331 6.50391C3.34331 6.30924 3.43931 6.05524 3.43931 5.77725C3.43931 5.16458 2.96732 4.66658 2.38598 4.66658C1.80598 4.66658 1.33398 5.16391 1.33398 5.77791C1.33398 6.39124 1.80532 6.88858 2.38665 6.88858H2.39932C2.36332 7.16858 2.40865 7.61391 2.47732 8.28791L2.60598 9.55057C2.67732 10.2512 2.73665 10.9179 2.80998 11.5186H13.1913C13.2646 10.9186 13.324 10.2512 13.3953 9.55057Z" fill="#B7FF1A" />
              <path fillRule="evenodd" clipRule="evenodd" d="M7.23731 14.6666H8.76397C10.754 14.6666 11.7493 14.6666 12.4133 14.0399C12.7026 13.7652 12.8866 13.2719 13.0186 12.6292H2.98265C3.11465 13.2719 3.29798 13.7652 3.58798 14.0392C4.25198 14.6666 5.24731 14.6666 7.23731 14.6666Z" fill="#B7FF1A" />
            </svg>
            <span className="text-[#B7FF1A] text-xs font-bold uppercase tracking-[0.6px]">
              Exclusive Offer
            </span>
          </div>
        </div>

        <div className="text-center md:text-left mb-1">
          <h2 className="text-xl font-bold leading-tight whitespace-nowrap">
            <span className="text-white">Unlock </span>
            <span className="text-[#B7FF1A]">Gamefolio Pro</span>
          </h2>
        </div>

        <p className="text-[#B8C0AE] text-sm text-center md:text-left leading-relaxed hidden md:block max-w-[280px]">
          {subtitle || "Elevate your gaming identity with premium features designed for elite creators"}
        </p>
      </div>
    </div>
  );

  const rightPanel = (
    <div className="flex flex-col justify-between h-full px-5 py-5 bg-[#0B1218]">
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-4">
        {premiumBenefits.map((benefit, index) => (
          <motion.div
            key={benefit.title}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.08 }}
            className="flex items-start gap-2"
          >
            <div className="w-8 h-8 rounded-lg bg-[#1B2A33] border border-[#1B2A33] flex items-center justify-center flex-shrink-0">
              {benefit.icon}
            </div>
            <div className="flex flex-col justify-center min-h-[32px]">
              <span className="text-[#F5F7F2] text-xs font-semibold leading-4">
                {benefit.title}
              </span>
              <span className="text-[#B8C0AE] text-[11px] leading-3.5">
                {benefit.description}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex flex-col gap-3 mt-auto">
        <div className="mb-0.5">
          <span className="text-[#B8C0AE] text-[10px] font-bold uppercase tracking-[1.2px]">
            Choose your plan
          </span>
        </div>

        {planSelector()}

        <button
          onClick={handleJoinPro}
          disabled={buttonDisabled}
          className="w-full py-3 bg-[#B7FF1A] hover:bg-[#A2F000] rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-1"
          style={{ boxShadow: "0 0 30px -5px #B7FF1A" }}
          data-testid="button-upgrade-pro"
        >
          {purchasing || isLoading || checkoutLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-[#071013]" />
          ) : (
            <>
              <span className="text-[#071013] text-base font-bold">Join Gamefolio Pro</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 12H20M20 12L14 6M20 12L14 18" stroke="#022C22" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </>
          )}
        </button>

        {checkoutError && (
          <p className="text-red-400 text-xs text-center">{checkoutError}</p>
        )}

        <span className="text-[#B8C0AE] text-[11px] text-center">
          Cancel anytime. Terms and conditions apply.
        </span>
      </div>
    </div>
  );

  const successScreen = (
    <ProOnboardingScreen onComplete={() => onOpenChange(false)} lootboxReward={proLootboxReward} />
  );

  const checkoutScreen = (
    <div className="flex flex-col h-full bg-[#0B1218]">
      <div className="flex items-center py-[25px] px-6 border-b border-[#1B2A3380]">
        <button
          onClick={() => setStep("plans")}
          className="w-10 h-10 rounded-2xl bg-[#1B2A33] flex items-center justify-center flex-shrink-0"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <span className="flex-1 text-center text-white text-lg font-bold pr-10">Gamefolio</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8" style={{ scrollbarWidth: "none" }}>
        {stripePromise && checkoutClientSecret ? (
          <EmbeddedCheckoutProvider
            stripe={stripePromise}
            options={{
              clientSecret: checkoutClientSecret,
              onComplete: handleCheckoutComplete,
            }}
          >
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        ) : (
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="w-8 h-8 animate-spin text-[#B7FF1A]" />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[430px] md:max-w-[780px] w-full bg-[#0B1218] border-none text-white p-0 overflow-hidden [&>button]:hidden max-h-[100dvh] h-[100dvh] md:h-auto md:max-h-[90vh] gap-0 rounded-none sm:rounded-none top-0 translate-y-0 md:top-[50%] md:translate-y-[-50%]"
        data-testid="dialog-pro-upgrade"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <AnimatePresence mode="wait">
          {step === "plans" && (
            <motion.div
              key="plans"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div ref={scrollContainerRef} className="flex flex-col md:hidden h-[100dvh] overflow-y-auto" style={{ scrollbarWidth: "none", backgroundColor: "#081017" }}>
                <div className="relative w-full flex-shrink-0" style={{ height: "56vh" }}>
                  <img
                    src={proHeroImage}
                    alt="Gamefolio Pro"
                    className="w-full h-full object-cover"
                    style={{ objectPosition: "center 70%" }}
                  />
                  {/* Top vignette for depth */}
                  <div className="absolute inset-x-0 top-0 h-1/4" style={{ background: "linear-gradient(to bottom, rgba(8,16,23,0.55) 0%, transparent 100%)" }} />
                  {/* Bottom fade — tall, strong, bleeds past image boundary */}
                  <div className="absolute inset-x-0 bottom-0" style={{ height: "240px", background: "linear-gradient(to bottom, rgba(8,16,23,0) 0%, rgba(8,16,23,0.45) 45%, rgba(8,16,23,0.85) 75%, #081017 100%)" }} />
                  <button
                    onClick={() => onOpenChange(false)}
                    className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center transition-colors hover:bg-black/60 z-10"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>

                <div className="px-5 pb-5 relative z-10" style={{ marginTop: "-72px", backgroundColor: "transparent" }}>
                  <div className="flex justify-center mb-2">
                    <div className="inline-flex items-center gap-1.5 bg-[#14532d4d] border border-[#B7FF1A33] rounded-full px-3 py-1">
                      <svg width="21" height="21" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" clipRule="evenodd" d="M13.3953 9.55057L13.524 8.28791C13.5926 7.61391 13.6373 7.16924 13.602 6.88858H13.6153C14.196 6.88858 14.6673 6.39124 14.6673 5.77791C14.6673 5.16458 14.196 4.66658 13.6146 4.66658C13.0333 4.66658 12.562 5.16391 12.562 5.77791C12.562 6.05524 12.6586 6.30924 12.818 6.50391C12.5893 6.65258 12.29 6.96724 11.8393 7.44058C11.4926 7.80524 11.3193 7.98724 11.126 8.01591C11.0186 8.03123 10.909 8.01502 10.8106 7.96924C10.632 7.88658 10.5126 7.66124 10.2746 7.20991L9.01864 4.83325C8.87197 4.55525 8.74864 4.32258 8.63731 4.13525C9.09264 3.88991 9.40397 3.39058 9.40397 2.81525C9.40397 1.99592 8.77597 1.33325 8.00064 1.33325C7.22531 1.33325 6.59731 1.99658 6.59731 2.81458C6.59731 3.39058 6.90864 3.88991 7.36398 4.13458C7.25264 4.32258 7.12998 4.55525 6.98264 4.83325L5.72731 7.21058C5.48864 7.66124 5.36931 7.88658 5.19065 7.96991C5.09227 8.01568 4.98272 8.0319 4.87531 8.01657C4.68198 7.98791 4.50865 7.80524 4.16198 7.44058C3.71131 6.96724 3.41198 6.65258 3.18331 6.50391C3.34331 6.30924 3.43931 6.05524 3.43931 5.77725C3.43931 5.16458 2.96732 4.66658 2.38598 4.66658C1.80598 4.66658 1.33398 5.16391 1.33398 5.77791C1.33398 6.39124 1.80532 6.88858 2.38665 6.88858H2.39932C2.36332 7.16858 2.40865 7.61391 2.47732 8.28791L2.60598 9.55057C2.67732 10.2512 2.73665 10.9179 2.80998 11.5186H13.1913C13.2646 10.9186 13.324 10.2512 13.3953 9.55057Z" fill="#B7FF1A" />
                        <path fillRule="evenodd" clipRule="evenodd" d="M7.23731 14.6666H8.76397C10.754 14.6666 11.7493 14.6666 12.4133 14.0399C12.7026 13.7652 12.8866 13.2719 13.0186 12.6292H2.98265C3.11465 13.2719 3.29798 13.7652 3.58798 14.0392C4.25198 14.6666 5.24731 14.6666 7.23731 14.6666Z" fill="#B7FF1A" />
                      </svg>
                      <span className="text-[#B7FF1A] text-[11px] font-bold uppercase tracking-[0.5px]">
                        Exclusive Offer
                      </span>
                    </div>
                  </div>

                  <h2 className="text-center text-xl font-bold leading-tight mb-0.5">
                    <span className="text-white">Unlock </span>
                    <span className="text-[#B7FF1A]">Gamefolio Pro</span>
                  </h2>

                  <p className="text-[#B8C0AE] text-xs text-center leading-relaxed mb-3 max-w-[260px] mx-auto">
                    Elevate your gaming identity with premium features
                  </p>

                  <div className="flex flex-col gap-3 mb-4 pt-1">
                    {premiumBenefits.map((benefit, index) => (
                      <motion.div
                        key={benefit.title}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center gap-3"
                      >
                        <div className="w-9 h-9 rounded-xl bg-[#1B2A33] border border-[#1B2A33] flex items-center justify-center flex-shrink-0">
                          {benefit.icon}
                        </div>
                        <div className="flex flex-col justify-center">
                          <span className="text-[#F5F7F2] text-sm font-semibold leading-5">
                            {benefit.title}
                          </span>
                          <span className="text-[#B8C0AE] text-[11px] leading-3.5">
                            {benefit.description}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="mb-2">
                    <span className="text-[#B8C0AE] text-[10px] font-bold uppercase tracking-[1px]">
                      Choose your plan
                    </span>
                  </div>

                  {planSelector(true)}

                  <button
                    onClick={handleJoinPro}
                    disabled={buttonDisabled}
                    className="w-full py-3 bg-[#B7FF1A] hover:bg-[#A2F000] rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-3"
                    style={{ boxShadow: "0 0 30px -5px #B7FF1A" }}
                    data-testid="button-upgrade-pro-mobile"
                  >
                    {purchasing || isLoading || checkoutLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin text-[#071013]" />
                    ) : (
                      <>
                        <span className="text-[#071013] text-base font-bold">Join Gamefolio Pro</span>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M4 12H20M20 12L14 6M20 12L14 18" stroke="#022C22" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </>
                    )}
                  </button>

                  <span className="text-[#B8C0AE] text-[11px] text-center block mt-2">
                    Cancel anytime. Terms and conditions apply.
                  </span>
                </div>
              </div>

              <div className="hidden md:grid md:grid-cols-2 max-h-[90vh]">
                {leftPanel}
                <div className="overflow-y-auto" style={{ scrollbarWidth: "none" }}>
                  {rightPanel}
                </div>
              </div>
            </motion.div>
          )}

          {step === "checkout" && (
            <motion.div
              key="checkout"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="max-h-[90vh] overflow-hidden"
            >
              {checkoutScreen}
            </motion.div>
          )}

          {step === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="max-w-[500px] mx-auto w-full"
            >
              {successScreen}
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
