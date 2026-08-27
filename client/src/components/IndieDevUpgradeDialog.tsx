import { useState, useEffect, useMemo, useCallback } from "react";
import { Rocket, Loader2, ArrowLeft, Trophy, KeyRound, Megaphone, Users, Eye, BadgeCheck, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
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
import gameDeveloperVideo from "@assets/game-developer-pro-preview.mp4";
import { GAME_DEVELOPER_PRO_PURCHASES_ENABLED } from "@/lib/feature-flags";

interface IndieDevUpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const perks = [
  {
    title: "Create & manage bounties",
    description: "Give gamers and streamers challenges to complete using your game.",
    icon: <Trophy className="w-4 h-4 text-[#B7FF1A]" />,
  },
  {
    title: "Share game keys with creators",
    description: "Help selected players create clips, reels, streams and more.",
    icon: <KeyRound className="w-4 h-4 text-[#B7FF1A]" />,
  },
  {
    title: "Get your game promoted",
    description: "Eligible games can receive exposure across Gamefolio and featured placements.",
    icon: <Megaphone className="w-4 h-4 text-[#B7FF1A]" />,
  },
  {
    title: "Reach gamers & streamers",
    description: "Put your game in front of creators who can discover and play it.",
    icon: <Users className="w-4 h-4 text-[#B7FF1A]" />,
  },
  {
    title: "Stand out across Gamefolio",
    description: "Get additional opportunities for visibility and discovery.",
    icon: <Eye className="w-4 h-4 text-[#B7FF1A]" />,
  },
  {
    title: "Developer Pro badge",
    description: "Show your Developer Pro status on your Indie Game profile.",
    icon: <BadgeCheck className="w-4 h-4 text-[#B7FF1A]" />,
  },
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

function DeveloperVideoPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="relative min-h-[230px] h-[34vh] md:h-full md:min-h-[580px] overflow-hidden bg-[#05090c]">
      <video
        src={gameDeveloperVideo}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        aria-label="Game Developer Pro preview"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-[#081017]" />
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#081017] via-[#081017]/45 to-transparent" />
      <button
        type="button"
        onClick={onClose}
        aria-label="Close upgrade dialog"
        className="absolute top-3 right-3 md:left-3 md:right-auto z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/45 text-white backdrop-blur-md transition-colors hover:bg-black/70"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="absolute inset-x-0 bottom-0 z-10 p-5">
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[#B7FF1A33] bg-[#14532d66] px-2.5 py-1">
          <Rocket className="h-3.5 w-3.5 text-[#B7FF1A]" />
          <span className="text-[10px] font-bold uppercase tracking-[1px] text-[#B7FF1A]">
            Developer Pro
          </span>
        </div>
        <p className="max-w-[220px] text-sm font-medium leading-snug text-white/80">
          Bounties. Keys. Creators. Content.
        </p>
      </div>
    </div>
  );
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
    if (!GAME_DEVELOPER_PRO_PURCHASES_ENABLED || !user || purchasing) return;

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
        <DialogContent aria-describedby={undefined} className="max-w-[430px] md:max-w-[840px] w-full h-[100dvh] md:h-auto md:max-h-[90vh] bg-[#0B1218] border-none p-0 overflow-hidden [&>button]:hidden top-0 translate-y-0 md:top-[50%] md:translate-y-[-50%]">
          <DialogTitle className="sr-only">Game Developer Pro</DialogTitle>
          <div className="flex h-full max-h-[100dvh] flex-col md:grid md:max-h-[90vh] md:grid-cols-2">
            <DeveloperVideoPanel onClose={() => onOpenChange(false)} />
            <div className="flex min-h-0 flex-1 flex-col justify-center overflow-y-auto p-6 text-center md:p-8">
              <h2 className="mb-2 text-2xl font-bold text-white">Developer Pro is active</h2>
              <p className="mb-6 text-[#B8C0AE]">Your developer benefits are active. Thanks for supporting the Gamefolio creator community.</p>
              <button
                onClick={() => onOpenChange(false)}
                className="w-full rounded-2xl bg-[#B7FF1A] py-4 text-lg font-bold text-[#071013] transition-colors hover:bg-[#A2F000]"
              >
                Close
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const canPurchase = GAME_DEVELOPER_PRO_PURCHASES_ENABLED &&
    (isNative ? !!selectedPackage : !!webPricing);
  const buttonDisabled = !GAME_DEVELOPER_PRO_PURCHASES_ENABLED ||
    isLoading || purchasing || checkoutLoading || !canPurchase || (isNative && !isInitialized);
  const hasNativePackages = !!packages && packages.length > 0;
  const showPurchaseUI = isNative ? hasNativePackages : true;

  const plansScreen = (
    <div className="flex h-full max-h-[100dvh] flex-col overflow-hidden bg-[#0B1218] md:grid md:max-h-[90vh] md:grid-cols-2">
      <DeveloperVideoPanel onClose={() => onOpenChange(false)} />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[#0B1218] p-6 md:p-7" style={{ scrollbarWidth: "none" }}>
        <div className="mb-5">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[1.5px] text-[#B7FF1A]">Game Developer Pro</p>
          <h2 className="mb-2 text-3xl font-bold leading-tight text-white">Turn players into creators.</h2>
          <p className="text-sm leading-relaxed text-[#B8C0AE]">
            Create bounties, distribute game keys and get the Gamefolio community creating content around your game.
          </p>
        </div>

        <div className="mb-5 flex flex-col gap-3">
          {perks.map((perk) => (
            <div key={perk.title} className="flex items-start gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-[#1B2A33] bg-[#1B2A33]">
                {perk.icon}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold leading-5 text-white">{perk.title}</div>
                <div className="text-[11px] leading-4 text-[#B8C0AE]">{perk.description}</div>
              </div>
            </div>
          ))}
        </div>

        {showPurchaseUI && (
          <div className="mb-4 flex flex-col gap-2">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-[1.2px] text-[#B8C0AE]">Choose your plan</div>
            <button
              type="button"
              onClick={() => setBillingPeriod("yearly")}
              disabled={!GAME_DEVELOPER_PRO_PURCHASES_ENABLED}
              className={`relative w-full rounded-xl border-2 p-3 text-left transition-all ${
                billingPeriod === "yearly" ? "border-[#B7FF1A] bg-[#B7FF1A0d]" : "border-[#1B2A33] bg-[#0B1218] hover:border-[#22313A]"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">Yearly</span>
                  {!GAME_DEVELOPER_PRO_PURCHASES_ENABLED && (
                    <span className="rounded-full bg-[#B7FF1A1a] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#B7FF1A]">
                      Coming soon
                    </span>
                  )}
                </div>
                <span className="font-bold text-white">{isNative ? yearlyPkg?.priceFormatted ?? "—" : yearlyPrice ?? "—"}</span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setBillingPeriod("monthly")}
              disabled={!GAME_DEVELOPER_PRO_PURCHASES_ENABLED}
              className={`relative w-full rounded-xl border-2 p-3 text-left transition-all ${
                billingPeriod === "monthly" ? "border-[#B7FF1A] bg-[#B7FF1A0d]" : "border-[#1B2A33] bg-[#0B1218] hover:border-[#22313A]"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">Monthly</span>
                  {!GAME_DEVELOPER_PRO_PURCHASES_ENABLED && (
                    <span className="rounded-full bg-[#B7FF1A1a] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#B7FF1A]">
                      Coming soon
                    </span>
                  )}
                </div>
                <span className="font-bold text-white">{isNative ? monthlyPkg?.priceFormatted ?? "—" : monthlyPrice ?? "—"}</span>
              </div>
            </button>
          </div>
        )}

        {checkoutError && <p className="mb-3 text-center text-sm text-red-400">{checkoutError}</p>}

        {showPurchaseUI ? (
          <button
            onClick={handleUpgrade}
            disabled={buttonDisabled}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#B7FF1A] py-4 text-lg font-bold text-[#071013] transition-colors hover:bg-[#A2F000] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {(purchasing || checkoutLoading) && <Loader2 className="h-5 w-5 animate-spin" />}
            {GAME_DEVELOPER_PRO_PURCHASES_ENABLED ? "Upgrade to Developer Pro" : "Developer Pro coming soon"}
          </button>
        ) : (
          <button
            onClick={() => onOpenChange(false)}
            className="flex w-full items-center justify-center rounded-2xl bg-[#B7FF1A] py-3 transition-all hover:bg-[#A2F000]"
          >
            <span className="text-base font-bold text-[#071013]">Got it</span>
          </button>
        )}
      </div>
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
      <h2 className="text-2xl font-bold text-white mb-2">Welcome to Game Developer Pro!</h2>
      <p className="text-[#B8C0AE] mb-6">Your developer benefits are now active.</p>
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
      <DialogContent aria-describedby={undefined} className="max-w-[430px] md:max-w-[840px] w-full h-[100dvh] md:h-auto md:max-h-[90vh] bg-[#0B1218] border-none p-0 overflow-hidden [&>button]:hidden top-0 translate-y-0 md:top-[50%] md:translate-y-[-50%]">
        <DialogTitle className="sr-only">Game Developer Pro</DialogTitle>
        {step === "plans" && plansScreen}
        {step === "checkout" && checkoutScreen}
        {step === "success" && successScreen}
      </DialogContent>
    </Dialog>
  );
}
