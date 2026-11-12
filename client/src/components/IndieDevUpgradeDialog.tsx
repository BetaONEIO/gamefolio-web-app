import { useState, useEffect, useMemo, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Rocket, Loader2, ArrowLeft, Trophy, KeyRound, Megaphone, Users, Eye, BadgeCheck, X, Calendar, CreditCard, AlertTriangle } from "lucide-react";
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
import { isNative, openExternal } from "@/lib/platform";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import gameDeveloperVideo from "@assets/game-developer-pro-preview.mp4";
import { GAME_DEVELOPER_PRO_PURCHASES_ENABLED } from "@/lib/feature-flags";
import { INDIE_DEV_PRO_DISCOUNT_PERCENT } from "@shared/indie-dev-pro-offer";

interface IndieDevUpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const perks = [
  {
    title: "One Starter Bounty every month",
    description: "Launch a focused creator campaign in each subscription billing month. Unused Starter Bounties do not roll over.",
    icon: <Trophy className="w-4 h-4 text-[#B7FF18]" />,
  },
  {
    title: "Share game keys with creators",
    description: "Help selected players create clips, reels, streams and more.",
    icon: <KeyRound className="w-4 h-4 text-[#B7FF18]" />,
  },
  {
    title: "Scale with paid campaigns from £10",
    description: "Choose a budget and see estimated creator reach, content and key requirements before launch.",
    icon: <Megaphone className="w-4 h-4 text-[#B7FF18]" />,
  },
  {
    title: "Reach gamers & streamers",
    description: "Put your game in front of creators who can discover and play it.",
    icon: <Users className="w-4 h-4 text-[#B7FF18]" />,
  },
  {
    title: "Stand out across Gamefolio",
    description: "Get additional opportunities for visibility and discovery.",
    icon: <Eye className="w-4 h-4 text-[#B7FF18]" />,
  },
  {
    title: "Developer Pro badge",
    description: "Show your Developer Pro status on your Indie Game profile.",
    icon: <BadgeCheck className="w-4 h-4 text-[#B7FF18]" />,
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
  developerOffer?: { monthly: number; yearly: number };
}

interface DeveloperSubscriptionStatus {
  isActive: boolean;
  isCancelled: boolean;
  canCancel: boolean;
  provider: "stripe" | "mobile" | "complimentary";
  subscriptionType: string | null;
  subscriptionEndDate: string | null;
  subscriptionCurrency: string | null;
  subscriptionAmount: number | null;
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
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[#B7FF1833] bg-[#14532d66] px-2.5 py-1">
          <Rocket className="h-3.5 w-3.5 text-[#B7FF18]" />
          <span className="text-[10px] font-bold uppercase tracking-[1px] text-[#B7FF18]">
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
  const { isInitialized, isLoading, isIndieDevSubscriber, getIndieDevOffering, purchaseIndieDevPackage, customerInfo } = useRevenueCat();
  const { user } = useAuth();
  const { toast } = useToast();
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("yearly");
  const [purchasing, setPurchasing] = useState(false);
  const [step, setStep] = useState<"plans" | "checkout" | "success">("plans");
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [checkoutClientSecret, setCheckoutClientSecret] = useState<string | null>(null);
  const [checkoutSessionId, setCheckoutSessionId] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [webPricing, setWebPricing] = useState<WebPricing | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const { data: developerStatus, isLoading: statusLoading } = useQuery<DeveloperSubscriptionStatus>({
    queryKey: ["/api/indie-dev/subscription/status"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/indie-dev/subscription/status");
      return response.json();
    },
    enabled: open && isIndieDevSubscriber,
  });

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

  const developerPersonas = typeof user?.userType === "string"
    ? user.userType.split(",").map((value) => value.trim().toLowerCase())
    : [];
  const hasDeveloperPersona = developerPersonas.some((persona) =>
    ["indie_developer", "game_developer", "developer", "indie"].includes(persona)
  ) || ["developer", "indie_developer"].includes(String(user?.role || "").toLowerCase())
    || user?.partnerType === "indie";
  const hasDeveloperOffer = !isNative && hasDeveloperPersona && !user?.indieDevSubscriptionStartDate;
  const pricingCurrency = webPricing?.localCurrency ?? webPricing?.currency;
  const monthlyAmount = webPricing ? webPricing.localMonthly ?? webPricing.monthly : null;
  const yearlyAmount = webPricing ? webPricing.localYearly ?? webPricing.yearly : null;
  const monthlyPrice = monthlyAmount != null && pricingCurrency
    ? formatCurrency(monthlyAmount, pricingCurrency)
    : null;
  const yearlyPrice = yearlyAmount != null && pricingCurrency
    ? formatCurrency(yearlyAmount, pricingCurrency)
    : null;
  const monthlyIntroPrice = hasDeveloperOffer && monthlyAmount != null && pricingCurrency
    ? formatCurrency(monthlyAmount * (1 - INDIE_DEV_PRO_DISCOUNT_PERCENT.monthly / 100), pricingCurrency)
    : null;
  const yearlyIntroPrice = hasDeveloperOffer && yearlyAmount != null && pricingCurrency
    ? formatCurrency(yearlyAmount * (1 - INDIE_DEV_PRO_DISCOUNT_PERCENT.yearly / 100), pricingCurrency)
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
      setShowCancelConfirm(false);
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
            developerOffer: data.developerOffer,
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

  const cancelDeveloperSubscription = async () => {
    setCancelling(true);
    try {
      const response = await apiRequest("POST", "/api/indie-dev/subscription/cancel");
      const data = await response.json();
      await queryClient.invalidateQueries({ queryKey: ["/api/indie-dev/subscription/status"] });
      toast({
        title: "Subscription cancelled",
        description: data.message || "Your Developer Pro subscription will end after the current billing period.",
        variant: "gamefolioSuccess",
      });
      setShowCancelConfirm(false);
    } catch (error: any) {
      toast({ title: "Unable to cancel", description: parseApiErrorMessage(error, "Please try again."), variant: "destructive" });
    } finally {
      setCancelling(false);
    }
  };

  if (isIndieDevSubscriber && step !== "success") {
    const endDate = developerStatus?.subscriptionEndDate
      ? new Date(developerStatus.subscriptionEndDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
      : "—";
    const isYearly = (developerStatus?.subscriptionType || user?.indieDevSubscriptionType) === "yearly";
    const amount = developerStatus?.subscriptionAmount;
    const currency = developerStatus?.subscriptionCurrency;
    const price = amount != null && currency
      ? `${formatCurrency(amount, currency)} / ${isYearly ? "year" : "month"}`
      : developerStatus?.provider === "complimentary" ? "Complimentary" : "—";
    const providerLabel = developerStatus?.provider === "stripe"
      ? "Stripe"
      : developerStatus?.provider === "mobile" ? "App Store / Google Play" : "Complimentary access";

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent aria-describedby={undefined} className="max-w-[430px] md:max-w-[840px] w-full h-[100dvh] md:h-auto md:max-h-[90vh] bg-popover border-none p-0 overflow-hidden [&>button]:hidden top-0 translate-y-0 md:top-[50%] md:translate-y-[-50%]">
          <DialogTitle className="sr-only">Game Developer Pro</DialogTitle>
          <div className="flex h-full max-h-[100dvh] flex-col md:grid md:max-h-[90vh] md:grid-cols-2">
            <DeveloperVideoPanel onClose={() => onOpenChange(false)} />
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6 md:p-8">
              <div className="mb-5 text-center">
                <div className={`mx-auto mb-3 w-fit rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${developerStatus?.isCancelled ? "bg-amber-500/10 text-amber-300" : "bg-[#B7FF18]/10 text-[#B7FF18]"}`}>
                  {developerStatus?.isCancelled ? "Cancelling" : "Active"}
                </div>
                <h2 className="mb-2 text-2xl font-bold text-white">Developer Pro is active</h2>
                <p className="text-sm text-[#B8C0AE]">Manage your plan and billing details.</p>
              </div>

              {statusLoading ? (
                <Loader2 className="mx-auto my-10 h-6 w-6 animate-spin text-[#B7FF18]" />
              ) : showCancelConfirm ? (
                <div className="space-y-4 rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-300" />
                    <div>
                      <h3 className="font-bold text-white">Cancel Developer Pro?</h3>
                      <p className="mt-1 text-xs leading-relaxed text-[#B8C0AE]">Your access will continue until {endDate}. You will not be charged again.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button type="button" disabled={cancelling} onClick={() => setShowCancelConfirm(false)} className="flex-1 rounded-xl bg-white/5 py-3 text-sm font-bold text-white">Go back</button>
                    <button type="button" disabled={cancelling} onClick={cancelDeveloperSubscription} className="flex-1 rounded-xl border border-red-500/25 bg-red-500/10 py-3 text-sm font-bold text-red-300 disabled:opacity-50">
                      {cancelling ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Confirm cancellation"}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-5 space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                    <div className="flex items-center gap-3"><Calendar className="h-5 w-5 text-[#B7FF18]" /><div><p className="text-[10px] font-bold uppercase tracking-wider text-[#B8C0AE]">{developerStatus?.isCancelled ? "Access until" : "Renewal date"}</p><p className="text-sm font-semibold text-white">{endDate}</p></div></div>
                    <div className="h-px bg-white/10" />
                    <div className="flex items-center gap-3"><CreditCard className="h-5 w-5 text-[#B7FF18]" /><div><p className="text-[10px] font-bold uppercase tracking-wider text-[#B8C0AE]">Billing</p><p className="text-sm font-semibold text-white">{price} · {providerLabel}</p></div></div>
                  </div>
                  {developerStatus?.provider === "stripe" && developerStatus.canCancel && (
                    <button onClick={() => setShowCancelConfirm(true)} className="mb-3 w-full rounded-2xl border border-red-500/20 bg-red-500/10 py-3.5 text-sm font-bold text-red-300 hover:bg-red-500/15">Cancel subscription</button>
                  )}
                  {developerStatus?.provider === "mobile" && !developerStatus.isCancelled && customerInfo?.managementURL && (
                    <button onClick={() => openExternal(customerInfo.managementURL!)} className="mb-3 w-full rounded-2xl border border-white/10 bg-white/5 py-3.5 text-sm font-bold text-white">Manage app-store subscription</button>
                  )}
                  {developerStatus?.provider === "complimentary" && (
                    <p className="mb-3 rounded-xl border border-[#B7FF18]/15 bg-[#B7FF18]/5 px-4 py-3 text-center text-xs text-[#B8C0AE]">This is complimentary access, so there is no paid subscription to cancel.</p>
                  )}
                  {developerStatus?.isCancelled && (
                    <p className="mb-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-center text-xs text-amber-200">Cancellation is scheduled. Your benefits remain active until {endDate}.</p>
                  )}
                  <button onClick={() => onOpenChange(false)} className="w-full rounded-2xl bg-[#B7FF18] py-3.5 text-base font-bold text-[#0A0A10] transition-colors hover:bg-[#A2F000]">Close</button>
                </>
              )}
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
    <div className="flex h-full max-h-[100dvh] flex-col overflow-hidden bg-[#0A0A10] md:grid md:max-h-[90vh] md:grid-cols-2">
      <DeveloperVideoPanel onClose={() => onOpenChange(false)} />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[#0A0A10] p-6 md:p-7" style={{ scrollbarWidth: "none" }}>
        <div className="mb-5">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[1.5px] text-[#B7FF18]">Game Developer Pro</p>
          <h2 className="mb-2 text-3xl font-bold leading-tight text-white">Turn players into creators.</h2>
          <p className="text-sm leading-relaxed text-[#B8C0AE]">
            Run creator campaigns, distribute game keys and get the Gamefolio community making content around your game.
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
                billingPeriod === "yearly" ? "border-[#B7FF18] bg-[#B7FF180d]" : "border-[#1B2A33] bg-[#0A0A10] hover:border-[#22313A]"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">Yearly</span>
                  {!GAME_DEVELOPER_PRO_PURCHASES_ENABLED && (
                    <span className="rounded-full bg-[#B7FF181a] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#B7FF18]">
                      Coming soon
                    </span>
                  )}
                  {hasDeveloperOffer && GAME_DEVELOPER_PRO_PURCHASES_ENABLED && (
                    <span className="rounded-full bg-[#B7FF18] px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-[#0A0A10]">
                      {INDIE_DEV_PRO_DISCOUNT_PERCENT.yearly}% off first year
                    </span>
                  )}
                </div>
                <span className="text-right font-bold text-white">
                  {isNative ? yearlyPkg?.priceFormatted ?? "—" : yearlyIntroPrice ? (
                    <><span className="mr-2 text-xs font-medium text-white/40 line-through">{yearlyPrice}</span>{yearlyIntroPrice}</>
                  ) : yearlyPrice ?? "—"}
                </span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setBillingPeriod("monthly")}
              disabled={!GAME_DEVELOPER_PRO_PURCHASES_ENABLED}
              className={`relative w-full rounded-xl border-2 p-3 text-left transition-all ${
                billingPeriod === "monthly" ? "border-[#B7FF18] bg-[#B7FF180d]" : "border-[#1B2A33] bg-[#0A0A10] hover:border-[#22313A]"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">Monthly</span>
                  {!GAME_DEVELOPER_PRO_PURCHASES_ENABLED && (
                    <span className="rounded-full bg-[#B7FF181a] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#B7FF18]">
                      Coming soon
                    </span>
                  )}
                  {hasDeveloperOffer && GAME_DEVELOPER_PRO_PURCHASES_ENABLED && (
                    <span className="rounded-full bg-[#B7FF18] px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-[#0A0A10]">
                      66% off first month
                    </span>
                  )}
                </div>
                <span className="text-right font-bold text-white">
                  {isNative ? monthlyPkg?.priceFormatted ?? "—" : monthlyIntroPrice ? (
                    <><span className="mr-2 text-xs font-medium text-white/40 line-through">{monthlyPrice}</span>{monthlyIntroPrice}</>
                  ) : monthlyPrice ?? "—"}
                </span>
              </div>
            </button>
            {hasDeveloperOffer && (
              <p className="mt-1 text-[10px] leading-4 text-[#B8C0AE]">
                Introductory discount applies once. Renewals are charged at the full Game Developer Pro price.
              </p>
            )}
          </div>
        )}

        {checkoutError && <p className="mb-3 text-center text-sm text-red-400">{checkoutError}</p>}

        {showPurchaseUI ? (
          <button
            onClick={handleUpgrade}
            disabled={buttonDisabled}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#B7FF18] py-4 text-lg font-bold text-[#0A0A10] transition-colors hover:bg-[#A2F000] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {(purchasing || checkoutLoading) && <Loader2 className="h-5 w-5 animate-spin" />}
            {GAME_DEVELOPER_PRO_PURCHASES_ENABLED ? "Upgrade to Developer Pro" : "Developer Pro coming soon"}
          </button>
        ) : (
          <button
            onClick={() => onOpenChange(false)}
            className="flex w-full items-center justify-center rounded-2xl bg-[#B7FF18] py-3 transition-all hover:bg-[#A2F000]"
          >
            <span className="text-base font-bold text-[#0A0A10]">Got it</span>
          </button>
        )}
      </div>
    </div>
  );

  const checkoutScreen = (
    <div className="flex flex-col h-full bg-[#0A0A10]">
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
            <Loader2 className="w-8 h-8 animate-spin text-[#B7FF18]" />
          </div>
        )}
      </div>
    </div>
  );

  const successScreen = (
    <div className="flex flex-col items-center justify-center h-full bg-[#0A0A10] p-8 text-center">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-[#B7FF18] to-[#6FA800] mb-6">
        <Rocket className="w-10 h-10 text-white" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">Welcome to Game Developer Pro!</h2>
      <p className="text-[#B8C0AE] mb-6">Your developer benefits are now active.</p>
      <button
        onClick={() => onOpenChange(false)}
        className="w-full py-4 bg-[#B7FF18] hover:bg-[#A2F000] text-[#0A0A10] font-bold text-lg rounded-2xl transition-colors"
      >
        Done
      </button>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className="max-w-[430px] md:max-w-[840px] w-full h-[100dvh] md:h-auto md:max-h-[90vh] bg-[#0A0A10] border-none p-0 overflow-hidden [&>button]:hidden top-0 translate-y-0 md:top-[50%] md:translate-y-[-50%]"
        data-testid="dialog-developer-pro-upgrade"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <DialogTitle className="sr-only">Game Developer Pro</DialogTitle>
        <AnimatePresence mode="wait" initial={false}>
          {step === "plans" && (
            <motion.div key="plans" className="h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {plansScreen}
            </motion.div>
          )}
          {step === "checkout" && (
            <motion.div key="checkout" className="h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {checkoutScreen}
            </motion.div>
          )}
          {step === "success" && (
            <motion.div key="success" className="h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {successScreen}
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
