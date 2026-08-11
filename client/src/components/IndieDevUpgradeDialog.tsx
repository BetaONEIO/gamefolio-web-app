import { useState, useEffect, useMemo, useCallback } from "react";
import { Rocket, Loader2, Check, ArrowLeft } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useRevenueCat } from "@/hooks/use-revenuecat";
import type { RcPackage } from "@/hooks/use-revenuecat";
import { useAuth } from "@/hooks/use-auth";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isNative } from "@/lib/platform";

interface IndieDevUpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const perks = [
  { title: "Run more bounties", description: "Up to 5 active bounties at once, instead of 1" },
  { title: "Featured promotion", description: "Priority placement on gamefolio.com/games" },
  { title: "Social media spotlight", description: "Included in Gamefolio's social promotion" },
];

function isYearlyPackage(pkg: RcPackage): boolean {
  const id = pkg.identifier.toLowerCase();
  return id.includes("annual") || id.includes("yearly") || id.includes("year");
}

function isMonthlyPackage(pkg: RcPackage): boolean {
  const id = pkg.identifier.toLowerCase();
  return id.includes("monthly") || id.includes("month");
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(amount);
}

interface WebPricing {
  currency: string;
  monthly: number;
  yearly: number;
  localCurrency?: string;
  localMonthly?: number;
  localYearly?: number;
}

function parseApiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    const jsonStart = error.message.indexOf('{');
    if (jsonStart !== -1) {
      try {
        const parsed = JSON.parse(error.message.slice(jsonStart));
        if (parsed?.error) return parsed.error;
        if (parsed?.message) return parsed.message;
      } catch {
        // fall through
      }
    }
  }
  return fallback;
}

export default function IndieDevUpgradeDialog({ open, onOpenChange }: IndieDevUpgradeDialogProps) {
  const { isInitialized, isLoading, isIndieDevSubscriber, getIndieDevOffering, purchaseIndieDevPackage } = useRevenueCat();
  const { user } = useAuth();
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("yearly");
  const [purchasing, setPurchasing] = useState(false);
  const [step, setStep] = useState<"plans" | "checkout" | "success">("plans");
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [checkoutClientSecret, setCheckoutClientSecret] = useState<string | null>(null);
  const [checkoutSessionId, setCheckoutSessionId] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [webPricing, setWebPricing] = useState<WebPricing | null>(null);

  const packages = getIndieDevOffering();

  const { monthlyPkg, yearlyPkg } = useMemo(() => {
    if (!packages) return { monthlyPkg: null, yearlyPkg: null };
    return {
      monthlyPkg: packages.find(isMonthlyPackage) || null,
      yearlyPkg: packages.find(isYearlyPackage) || null,
    };
  }, [packages]);

  const selectedPackage = useMemo(() => {
    if (billingPeriod === "yearly" && yearlyPkg) return yearlyPkg;
    if (billingPeriod === "monthly" && monthlyPkg) return monthlyPkg;
    return yearlyPkg || monthlyPkg || (packages?.[0] ?? null);
  }, [billingPeriod, monthlyPkg, yearlyPkg, packages]);

  const monthlyPrice = webPricing
    ? formatCurrency(webPricing.localMonthly ?? webPricing.monthly, webPricing.localCurrency ?? webPricing.currency)
    : null;
  const yearlyPrice = webPricing
    ? formatCurrency(webPricing.localYearly ?? webPricing.yearly, webPricing.localCurrency ?? webPricing.currency)
    : null;

  const loadStripeInstance = useCallback(async () => {
    if (stripePromise) return;
    try {
      const res = await apiRequest("GET", "/api/stripe/config");
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
      setCheckoutClientSecret(null);
      setCheckoutSessionId(null);
      setCheckoutError(null);
    }
  }, [open]);

  useEffect(() => {
    if (step === "checkout") loadStripeInstance();
  }, [step, loadStripeInstance]);

  useEffect(() => {
    if (!open || isNative) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await apiRequest("GET", "/api/stripe/indie-dev-pricing");
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

  const handleUpgrade = async () => {
    if (!user || purchasing) return;

    if (isNative) {
      if (!selectedPackage) return;
      setCheckoutError(null);
      setPurchasing(true);
      try {
        const success = await purchaseIndieDevPackage(selectedPackage);
        if (success) setStep("success");
      } catch (err: any) {
        setCheckoutError(err?.message || "Purchase failed");
      } finally {
        setPurchasing(false);
      }
      return;
    }

    if (!webPricing) return;
    setCheckoutLoading(true);
    setCheckoutError(null);
    setCheckoutClientSecret(null);
    setCheckoutSessionId(null);
    try {
      await loadStripeInstance();
      const res = await apiRequest("POST", "/api/stripe/create-indie-dev-subscription", { plan: billingPeriod });
      const data = await res.json();
      setCheckoutClientSecret(data.clientSecret);
      setCheckoutSessionId(data.sessionId);
      setStep("checkout");
    } catch (err: any) {
      setCheckoutError(parseApiErrorMessage(err, "Failed to start checkout"));
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleCheckoutComplete = useCallback(async () => {
    try {
      if (checkoutSessionId) {
        await apiRequest("POST", "/api/stripe/confirm-indie-dev-subscription", {
          sessionId: checkoutSessionId,
          plan: billingPeriod,
        });
      }
    } catch {
      // The webhook backstop will still provision the subscription server-side.
    }
    await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    setStep("success");
  }, [checkoutSessionId, billingPeriod]);

  if (isIndieDevSubscriber && step !== "success") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[430px] w-full bg-[#0B1218] border-none p-0 overflow-hidden [&>button]:hidden">
          <div className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-[#B7FF1A] to-[#6FA800] mb-6">
              <Rocket className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">You're already an Indie Developer subscriber!</h2>
            <p className="text-[#B8C0AE] mb-6">You can run up to 5 active bounties at once. Thanks for your support!</p>
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
  const buttonDisabled = isLoading || purchasing || checkoutLoading || !canPurchase || (isNative && !isInitialized);
  const hasNativePackages = !!packages && packages.length > 0;
  const showPurchaseUI = isNative ? hasNativePackages : true;

  const plansScreen = (
    <div className="flex flex-col h-full bg-[#0B1218] p-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#B7FF1A] to-[#6FA800] mb-4">
          <Rocket className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-1">Indie Developer</h2>
        <p className="text-[#B8C0AE] text-sm">Run more bounties and get promoted across Gamefolio</p>
      </div>

      <div className="flex flex-col gap-3 mb-6">
        {perks.map((perk) => (
          <div key={perk.title} className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-[#B7FF1A1a] flex items-center justify-center flex-shrink-0 mt-0.5">
              <Check className="w-4 h-4 text-[#B7FF1A]" />
            </div>
            <div>
              <div className="text-white font-semibold text-sm">{perk.title}</div>
              <div className="text-[#B8C0AE] text-xs">{perk.description}</div>
            </div>
          </div>
        ))}
      </div>

      {showPurchaseUI && (
        <div className="flex flex-col gap-2 mb-4">
          <button
            type="button"
            onClick={() => setBillingPeriod("yearly")}
            className={`relative w-full rounded-xl border-2 transition-all p-3 text-left ${
              billingPeriod === "yearly" ? "border-[#B7FF1A] bg-[#B7FF1A0d]" : "border-[#1B2A33] bg-[#0B1218] hover:border-[#22313A]"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-white font-semibold">Yearly</span>
              <span className="text-white font-bold">
                {isNative
                  ? yearlyPkg?.priceFormatted ?? "—"
                  : yearlyPrice ?? "—"}
              </span>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setBillingPeriod("monthly")}
            className={`relative w-full rounded-xl border-2 transition-all p-3 text-left ${
              billingPeriod === "monthly" ? "border-[#B7FF1A] bg-[#B7FF1A0d]" : "border-[#1B2A33] bg-[#0B1218] hover:border-[#22313A]"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-white font-semibold">Monthly</span>
              <span className="text-white font-bold">
                {isNative
                  ? monthlyPkg?.priceFormatted ?? "—"
                  : monthlyPrice ?? "—"}
              </span>
            </div>
          </button>
        </div>
      )}

      {checkoutError && (
        <p className="text-red-400 text-sm mb-3 text-center">{checkoutError}</p>
      )}

      {showPurchaseUI ? (
        <button
          onClick={handleUpgrade}
          disabled={buttonDisabled}
          className="w-full py-4 bg-[#B7FF1A] hover:bg-[#A2F000] disabled:opacity-50 text-[#071013] font-bold text-lg rounded-2xl transition-colors flex items-center justify-center gap-2"
        >
          {(purchasing || checkoutLoading) && <Loader2 className="w-5 h-5 animate-spin" />}
          Upgrade to Indie Developer
        </button>
      ) : (
        <button
          onClick={() => onOpenChange(false)}
          className="w-full py-3 bg-[#B7FF1A] hover:bg-[#A2F000] rounded-2xl flex items-center justify-center transition-all"
        >
          <span className="text-[#071013] text-base font-bold">Got it</span>
        </button>
      )}
    </div>
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
            options={{ clientSecret: checkoutClientSecret, onComplete: handleCheckoutComplete }}
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

  const successScreen = (
    <div className="flex flex-col items-center justify-center h-full bg-[#0B1218] p-8 text-center">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-[#B7FF1A] to-[#6FA800] mb-6">
        <Rocket className="w-10 h-10 text-white" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">Welcome to Indie Developer!</h2>
      <p className="text-[#B8C0AE] mb-6">You can now run up to 5 active bounties at once.</p>
      <button
        onClick={() => onOpenChange(false)}
        className="w-full py-4 bg-[#B7FF1A] hover:bg-[#A2F000] text-[#071013] font-bold text-lg rounded-2xl transition-colors"
      >
        Done
      </button>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[430px] w-full h-[600px] bg-[#0B1218] border-none p-0 overflow-hidden">
        {step === "plans" && plansScreen}
        {step === "checkout" && checkoutScreen}
        {step === "success" && successScreen}
      </DialogContent>
    </Dialog>
  );
}
