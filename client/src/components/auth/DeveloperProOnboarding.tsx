import { useEffect, useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, MousePointer2 } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import IndieDevUpgradeDialog, { DeveloperProBenefits } from "@/components/IndieDevUpgradeDialog";
import { useAuth } from "@/hooks/use-auth";
import { formatIndieDevPrice, isIndieDevIntroEligible, useIndieDevWebPricing } from "@/hooks/use-indie-dev-web-pricing";
import { getIndieDevPlanPackages, useRevenueCat, type RcPackage } from "@/hooks/use-revenuecat";
import { GAME_DEVELOPER_PRO_PURCHASES_ENABLED } from "@/lib/feature-flags";
import { isAndroid, isIOS, isNative } from "@/lib/platform";
import { trackDeveloperProOnboarding as track } from "@/lib/sentry";
import gameDeveloperVideo from "@assets/game-developer-pro-preview.mp4";
import type { IndieDevProPlan } from "@shared/indie-dev-pro-offer";

type IntroPhase = { price: string; duration: string; free: boolean; charges?: number };
type PlanPricing = { price: string; amount: number; currency: string; intro: IntroPhase[] };

function durationLabel(amount: number, unit: string) {
  const name = unit.toLowerCase();
  return amount > 0 && ["day", "week", "month", "year"].includes(name)
    ? `${amount} ${name}${amount === 1 ? "" : "s"}`
    : null;
}

function nativePricing(pkg: RcPackage | null, iosEligible: boolean): PlanPricing | undefined {
  const product = pkg?._native?.product;
  if (!pkg?.priceFormatted || !product) return;
  const intro: IntroPhase[] = [];
  const androidOption = isAndroid ? product.defaultOption : null;
  const renewal = androidOption?.fullPricePhase?.price;

  if (androidOption && !androidOption.isBasePlan && !androidOption.isPrepaid && !androidOption.installmentsInfo) {
    for (const phase of androidOption.pricingPhases.slice(0, -1)) {
      const charges = phase.billingCycleCount || 1;
      const duration = durationLabel(phase.billingPeriod.value * charges, phase.billingPeriod.unit);
      if (duration) intro.push({ price: phase.price.formatted, duration, free: phase.price.amountMicros === 0, charges });
    }
  }
  if (iosEligible && product.introPrice) {
    const offer = product.introPrice;
    const duration = durationLabel(offer.periodNumberOfUnits * offer.cycles, offer.periodUnit);
    if (duration) intro.push({ price: offer.priceString, duration, free: offer.price === 0, charges: offer.cycles });
  }
  return {
    price: renewal?.formatted ?? pkg.priceFormatted,
    amount: renewal ? renewal.amountMicros / 1_000_000 : pkg.priceAmount,
    currency: renewal?.currencyCode ?? pkg.currency,
    intro,
  };
}

function describeIntro(phase: IntroPhase, first: boolean) {
  if (phase.free) return `${phase.duration} free`;
  if (phase.charges && phase.charges > 1) return `${phase.charges} payments of ${phase.price} over ${phase.duration}`;
  return `${phase.price} for ${first ? "your first " : ""}${phase.duration}`;
}

export default function DeveloperProOnboarding({
  artworkSrc, onContinue,
}: { artworkSrc: string; onContinue: () => void }) {
  const { user } = useAuth();
  const { getIndieDevOffering, isIndieDevSubscriber } = useRevenueCat();
  const canUpgrade = GAME_DEVELOPER_PRO_PURCHASES_ENABLED && !isIndieDevSubscriber;
  const { data: webPricing, isFetching } = useIndieDevWebPricing(canUpgrade);
  const { monthlyPkg, yearlyPkg } = getIndieDevPlanPackages(getIndieDevOffering());
  const [preferredPlan, setPreferredPlan] = useState<IndieDevProPlan>("yearly");
  const [checkoutPlan, setCheckoutPlan] = useState<IndieDevProPlan | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const planGroup = useId();
  const introProductIds = [monthlyPkg, yearlyPkg].flatMap((pkg) => {
    const product = pkg?._native?.product;
    return product?.introPrice ? [product.identifier] : [];
  });
  const { data: iosEligibility } = useQuery({
    queryKey: ["developer-pro-intro-eligibility", user?.id, introProductIds],
    enabled: canUpgrade && isIOS && introProductIds.length > 0,
    queryFn: async () => {
      const { Purchases, INTRO_ELIGIBILITY_STATUS } = await import("@revenuecat/purchases-capacitor");
      const result = await Purchases.checkTrialOrIntroductoryPriceEligibility({ productIdentifiers: introProductIds });
      return Object.fromEntries(Object.entries(result).map(([id, eligibility]) => [
        id, eligibility.status === INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE,
      ]));
    },
  });
  useEffect(() => { track("viewed"); }, []);

  function getPricing(plan: IndieDevProPlan): PlanPricing | undefined {
    if (!canUpgrade) return;
    if (isNative) {
      const pkg = plan === "monthly" ? monthlyPkg : yearlyPkg;
      const id = pkg?._native?.product.identifier;
      return nativePricing(pkg, !!id && iosEligibility?.[id] === true);
    }
    if (!webPricing) return;
    const currency = webPricing.localCurrency ?? webPricing.currency;
    const amount = plan === "monthly"
      ? webPricing.localMonthly ?? webPricing.monthly
      : webPricing.localYearly ?? webPricing.yearly;
    const discount = webPricing.developerOffer?.[plan] ?? 0;
    const intro = discount > 0 && isIndieDevIntroEligible(user)
      ? [{
        price: formatIndieDevPrice(amount * (1 - discount / 100), currency),
        duration: plan === "monthly" ? "month" : "year",
        free: false,
      }]
      : [];
    return { price: formatIndieDevPrice(amount, currency), amount, currency, intro };
  }

  const pricing = { monthly: getPricing("monthly"), yearly: getPricing("yearly") };
  const selectedPlan = pricing[preferredPlan] ? preferredPlan : pricing.yearly ? "yearly" : "monthly";
  const selected = pricing[selectedPlan];
  const interval = selectedPlan === "monthly" ? "month" : "year";
  const firstOffer = selected?.intro[0];
  const isLocalEstimate = !isNative && !!webPricing?.localCurrency;
  const monthly = pricing.monthly;
  const annual = pricing.yearly;
  const savings = monthly && annual && monthly.amount > 0 && monthly.currency === annual.currency
    ? Math.floor((1 - annual.amount / (monthly.amount * 12)) * 100)
    : 0;
  const cta = firstOffer?.free
    ? `Start ${firstOffer.duration} free`
    : firstOffer
      ? `Get ${describeIntro(firstOffer, true)}`
      : `Upgrade for ${selected?.price}/${interval}`;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto pb-2">
      <section aria-labelledby="developer-pro-title" className="grid min-h-full overflow-hidden rounded-xl border border-[#303448] bg-background md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-3 p-4 sm:px-5">
          <header>
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-primary">Game Developer Pro</p>
            <h2 id="developer-pro-title" className="text-2xl font-bold text-white">Turn players into creators.</h2>
            <p className="mt-1 text-sm text-gray-300">Run creator campaigns, share keys and help players discover your game.</p>
          </header>
          <DeveloperProBenefits className="space-y-2.5" />

          <div className="mt-auto space-y-2 text-left">
            {selected && (
              <>
                <fieldset className={`grid gap-3 ${monthly && annual ? "sm:grid-cols-2" : ""}`}>
                  <legend className="sr-only">Choose a Game Developer Pro plan</legend>
                  {(["monthly", "yearly"] as const).map((plan) => {
                    const option = pricing[plan];
                    if (!option) return null;
                    const checked = selectedPlan === plan;
                    return (
                      <label key={plan} className={`cursor-pointer rounded-lg border p-3 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary ${checked ? "border-primary bg-[#1a2415]" : "border-[#303448] hover:border-gray-400"}`}>
                        <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-white">
                          <input
                            type="radio" name={planGroup} value={plan} checked={checked}
                            className="h-4 w-4 accent-primary"
                            onChange={() => {
                              setPreferredPlan(plan);
                              track(plan === "monthly" ? "monthly_selected" : "annual_selected", plan);
                            }}
                          />
                          {plan === "monthly" ? "Monthly" : "Annual"}
                          {plan === "yearly" && savings > 0 && <span className="text-primary">Save {savings}%</span>}
                        </span>
                        <span className="mt-1 block text-sm text-gray-300">
                          <span className="text-2xl font-bold text-white">{option.price}</span> per {plan === "monthly" ? "month" : "year"}
                        </span>
                        {checked && option.intro[0] && (
                          <span className="mt-1 block text-sm font-semibold text-primary">{describeIntro(option.intro[0], true)}</span>
                        )}
                      </label>
                    );
                  })}
                </fieldset>
                {selected.intro.length > 0 && (
                  <div aria-live="polite" className="text-sm text-gray-300">
                    <p>{selected.intro.map((phase, index) => describeIntro(phase, index === 0)).join(", then ")}. Then {selected.price} per {interval}. {isNative ? "Store eligibility applies." : "For eligible developer accounts on their first subscription."}</p>
                  </div>
                )}
              </>
            )}
            {!selected && (
              <p className="text-sm text-gray-300" role="status">
                {isIndieDevSubscriber ? "Game Developer Pro is active." : !canUpgrade ? "Game Developer Pro is coming soon." : isFetching ? "Loading plans…" : "Pricing is currently unavailable."}
              </p>
            )}
            <div className="group relative grid auto-rows-fr gap-2">
              {selected && (
                <Button type="button" className="h-auto min-h-11 w-full whitespace-normal bg-primary px-10 text-[#0A0A10] hover:bg-primary/90" onClick={() => {
                  track("upgrade_selected", selectedPlan);
                  setCheckoutPlan(selectedPlan);
                }}>{cta}</Button>
              )}
              <Button variant="outline" type="button" className="h-auto min-h-11 w-full whitespace-normal border-[#303448] bg-background px-10 text-gray-300 hover:text-white" onClick={() => {
                if (!isIndieDevSubscriber) track("continue_free_selected");
                onContinue();
              }}>
                {isIndieDevSubscriber ? "Continue" : "Finish setup for free"} <ArrowRight aria-hidden="true" className="ml-2 h-4 w-4" />
              </Button>
              {selected && !prefersReducedMotion && (
                <motion.span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 right-3 flex items-center group-focus-within:invisible motion-reduce:hidden"
                  initial={{ y: "-25%", opacity: 0 }}
                  animate={{
                    y: ["-25%", "-25%", "-25%", "25%", "25%", "-25%", "-25%"],
                    opacity: [0, 1, 1, 1, 1, 1, 0],
                  }}
                  transition={{ duration: 4.6, times: [0, 0.08, 0.24, 0.39, 0.65, 0.82, 1], ease: "easeInOut" }}
                >
                  <MousePointer2 className="h-5 w-5 fill-[#0A0A10] text-white drop-shadow-sm" />
                </motion.span>
              )}
            </div>
            {selected && (
              <p aria-live="polite" className="text-[11px] leading-snug text-gray-400">
                {!isNative && (isLocalEstimate ? "Estimated local prices. Final price and taxes shown at checkout. " : "VAT and local taxes are confirmed at checkout. ")}
                Renews automatically{!firstOffer && !isLocalEstimate && ` at ${selected.price} per ${interval}`}. Cancel anytime.
              </p>
            )}
          </div>
        </div>
        <div className="relative min-h-44 overflow-hidden bg-[#121821] md:min-h-0">
          <video
            src={gameDeveloperVideo}
            poster={artworkSrc}
            autoPlay
            muted
            loop
            playsInline
            aria-label="Game Developer Pro preview"
            className="absolute inset-0 h-full w-full object-contain md:object-cover md:object-top"
          />
        </div>
      </section>

      {checkoutPlan && (
        <IndieDevUpgradeDialog
          open
          onOpenChange={(open) => { if (!open) setCheckoutPlan(null); }}
          onboardingPlan={checkoutPlan}
          onCheckoutOutcome={(outcome) => track(outcome === "completed" ? "checkout_completed" : "checkout_abandoned", checkoutPlan)}
          onSuccessClose={onContinue}
        />
      )}
    </div>
  );
}
