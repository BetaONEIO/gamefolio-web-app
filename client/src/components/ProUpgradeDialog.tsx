import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Crown, Loader2, X, Check, ArrowLeft, ChevronDown } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useRevenueCat } from "@/hooks/use-revenuecat";
import { Package } from "@revenuecat/purchases-js";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import proHeroImage from "@assets/gamefolio_pro_banner_1770379359049.png";

interface ProUpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const premiumBenefits = [
  {
    title: "Unlimited upload space",
    description: "Share clips without limits or storage restrictions",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 16V8M12 8L9 11M12 8L15 11" stroke="#4ADE80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M22 12C22 17.523 17.523 22 12 22C6.477 22 2 17.523 2 12C2 6.477 6.477 2 12 2C17.523 2 22 6.477 22 12Z" stroke="#4ADE80" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    title: "Animated profile customization",
    description: "Custom banners, borders & neon effects",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M9 3.5V2M15 3.5V2M9 21.5V20M15 21.5V20M20.5 9H22M20.5 15H22M3.5 9H2M3.5 15H2M12 8L13.5 11H16L14 13.5L15 17L12 15L9 17L10 13.5L8 11H10.5L12 8Z" stroke="#4ADE80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    title: "100s of exclusive assets",
    description: "Premium stickers, badges & unique themes",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 21C12 21 3 13.5 3 8.5C3 5.42 5.42 3 8.5 3C10.24 3 11.91 3.81 12 5C12.09 3.81 13.76 3 15.5 3C18.58 3 21 5.42 21 8.5C21 13.5 12 21 12 21Z" stroke="#4ADE80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    title: "Store discounts",
    description: "Save up to 20% on games and merchandise",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M9 15L15 9M21.41 11.41L12.58 2.58C12.21 2.21 11.7 2 11.17 2H4C2.9 2 2 2.9 2 4V11.17C2 11.7 2.21 12.21 2.59 12.58L11.41 21.41C12.19 22.2 13.45 22.2 14.24 21.41L21.41 14.24C22.2 13.45 22.2 12.19 21.41 11.41Z" stroke="#4ADE80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="7" cy="7" r="1.5" fill="#4ADE80"/>
      </svg>
    ),
  },
  {
    title: "Ad-free experience",
    description: "Pro subscribers are exempt from all video ads",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 22C17.523 22 22 17.523 22 12C22 6.477 17.523 2 12 2C6.477 2 2 6.477 2 12C2 17.523 6.477 22 12 22Z" stroke="#4ADE80" strokeWidth="1.5"/>
        <path d="M4 4L20 20" stroke="#4ADE80" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M10 9V15L15 12L10 9Z" stroke="#4ADE80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
];

const COUNTRIES = [
  { code: "GB", name: "United Kingdom" },
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "NL", name: "Netherlands" },
  { code: "BE", name: "Belgium" },
  { code: "AT", name: "Austria" },
  { code: "CH", name: "Switzerland" },
  { code: "SE", name: "Sweden" },
  { code: "NO", name: "Norway" },
  { code: "DK", name: "Denmark" },
  { code: "FI", name: "Finland" },
  { code: "IE", name: "Ireland" },
  { code: "PT", name: "Portugal" },
  { code: "PL", name: "Poland" },
  { code: "CZ", name: "Czech Republic" },
  { code: "JP", name: "Japan" },
  { code: "KR", name: "South Korea" },
  { code: "SG", name: "Singapore" },
  { code: "HK", name: "Hong Kong" },
  { code: "IN", name: "India" },
  { code: "BR", name: "Brazil" },
  { code: "MX", name: "Mexico" },
];

const stripeElementStyle = {
  base: {
    color: "#f8fafc",
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif",
    fontSize: "16px",
    "::placeholder": { color: "#475569" },
  },
  invalid: { color: "#ef4444" },
};

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
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

interface CheckoutFormProps {
  plan: "monthly" | "yearly";
  planLabel: string;
  priceFormatted: string;
  periodLabel: string;
  onBack: () => void;
  onSuccess: () => void;
}

function CheckoutForm({ plan, planLabel, priceFormatted, periodLabel, onBack, onSuccess }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [processing, setProcessing] = useState(false);
  const [country, setCountry] = useState("GB");
  const [postalCode, setPostalCode] = useState("");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const createSubscription = async () => {
      setLoadingSubscription(true);
      setError(null);
      try {
        const res = await apiRequest("POST", "/api/stripe/create-pro-subscription", { plan });
        const data = await res.json();
        if (!cancelled) {
          setClientSecret(data.clientSecret);
          setSubscriptionId(data.subscriptionId);
        }
      } catch (err: any) {
        if (!cancelled) {
          const msg = err?.message || "Failed to create subscription";
          setError(msg);
          toast({ title: "Error", description: msg, variant: "destructive" });
        }
      } finally {
        if (!cancelled) setLoadingSubscription(false);
      }
    };
    createSubscription();
    return () => { cancelled = true; };
  }, [plan]);

  const handlePay = async () => {
    if (!stripe || !elements || !clientSecret || !subscriptionId || processing) return;

    const cardNumber = elements.getElement(CardNumberElement);
    if (!cardNumber) return;

    setProcessing(true);
    setError(null);

    try {
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardNumber,
          billing_details: {
            address: { country, postal_code: postalCode },
          },
        },
      });

      if (result.error) {
        setError(result.error.message || "Payment failed");
        toast({ title: "Payment failed", description: result.error.message || "Please try again.", variant: "destructive" });
      } else if (result.paymentIntent?.status === "succeeded") {
        try {
          await apiRequest("POST", "/api/stripe/confirm-pro-subscription", { subscriptionId, plan });
        } catch {
          // non-critical
        }
        await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        onSuccess();
      }
    } catch (err: any) {
      const msg = err?.message || "Payment failed";
      setError(msg);
      toast({ title: "Payment failed", description: msg, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#020617]">
      <div className="flex items-center py-[25px] px-6 border-b border-[#1e293b80]">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-2xl bg-[#1e293b] flex items-center justify-center flex-shrink-0"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <span className="flex-1 text-center text-white text-lg font-bold pr-10">Gamefolio</span>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pt-6 pb-8" style={{ scrollbarWidth: "none" }}>
        <div className="max-w-[382px] mx-auto flex flex-col gap-8">
          <div className="bg-[#0f172a66] backdrop-blur-[12px] border border-[#1e293b80] rounded-2xl p-6">
            <p className="text-[#f8fafc] text-lg font-bold leading-7">
              Subscribe to {planLabel} Pro Subscription
            </p>
            <div className="flex items-end gap-2 mt-2">
              <span className="text-[#f8fafc] text-[30px] font-black leading-9">{priceFormatted}</span>
              <span className="text-[#94a3b8] text-sm pb-1">{periodLabel}</span>
            </div>
            <div className="border-t border-[#1e293b80] pt-4 mt-4 flex items-center justify-between">
              <span className="text-[#94a3b8] text-sm font-medium">Total due today</span>
              <span className="text-[#4ade80] text-2xl font-black">{priceFormatted}</span>
            </div>
          </div>

          {loadingSubscription ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#4ade80]" />
            </div>
          ) : error && !clientSecret ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <p className="text-red-400 text-sm text-center">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-[#1e293b] text-white rounded-2xl text-sm font-medium"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-[3px]">
                <label className="text-[#94a3b8cc] text-xs font-bold uppercase tracking-[1.2px] px-1 mb-1">
                  Card number
                </label>
                <div className="bg-[#1e293b] border border-[#1e293b80] rounded-2xl h-14 px-4 flex items-center">
                  <CardNumberElement
                    options={{ style: stripeElementStyle, showIcon: true }}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-1 flex flex-col gap-[3px]">
                  <label className="text-[#94a3b8cc] text-xs font-bold uppercase tracking-[1.2px] px-1 mb-1">
                    Expiration (MM/YY)
                  </label>
                  <div className="bg-[#1e293b] border border-[#1e293b80] rounded-2xl h-14 px-4 flex items-center">
                    <CardExpiryElement options={{ style: stripeElementStyle }} className="w-full" />
                  </div>
                </div>
                <div className="flex-1 flex flex-col gap-[3px]">
                  <label className="text-[#94a3b8cc] text-xs font-bold uppercase tracking-[1.2px] px-1 mb-1">
                    Security code
                  </label>
                  <div className="bg-[#1e293b] border border-[#1e293b80] rounded-2xl h-14 px-4 flex items-center">
                    <CardCvcElement options={{ style: stripeElementStyle }} className="w-full" />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-[3px]">
                <label className="text-[#94a3b8cc] text-xs font-bold uppercase tracking-[1.2px] px-1 mb-1">
                  Country
                </label>
                <div className="bg-[#1e293b] border border-[#1e293b80] rounded-2xl h-14 px-4 flex items-center relative">
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full h-full bg-transparent text-[#f8fafc] text-base appearance-none outline-none cursor-pointer"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code} className="bg-[#1e293b] text-[#f8fafc]">
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-5 h-5 text-[#94a3b8] absolute right-4 pointer-events-none" />
                </div>
              </div>

              <div className="flex flex-col gap-[3px]">
                <label className="text-[#94a3b8cc] text-xs font-bold uppercase tracking-[1.2px] px-1 mb-1">
                  Postal code
                </label>
                <div className="bg-[#1e293b] border border-[#1e293b80] rounded-2xl h-14 px-4 flex items-center">
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="Enter postal code"
                    className="w-full h-full bg-transparent text-[#f8fafc] text-base outline-none placeholder:text-[#475569]"
                  />
                </div>
              </div>

              {error && (
                <p className="text-red-400 text-sm text-center">{error}</p>
              )}

              <button
                onClick={handlePay}
                disabled={processing || !stripe || !clientSecret}
                className="w-full bg-[#4ade80] hover:bg-[#3bce71] rounded-2xl h-[60px] flex items-center justify-center transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ boxShadow: "0 12px 40px -10px #4ade8080" }}
              >
                {processing ? (
                  <Loader2 className="w-6 h-6 animate-spin text-[#022c22]" />
                ) : (
                  <span className="text-[#022c22] text-lg font-black">Pay now</span>
                )}
              </button>

              <p className="text-[#94a3b8] text-xs text-center leading-[19.5px]">
                By subscribing, you agree to allow Gamefolio to charge you according to their terms until you cancel. Subscription renews automatically. Cancel anytime. Secure checkout by Gamefolio
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProUpgradeDialog({ open, onOpenChange }: ProUpgradeDialogProps) {
  const { isInitialized, isLoading, isPro, getCurrentOffering, purchasePackage } = useRevenueCat();
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("yearly");
  const [purchasing, setPurchasing] = useState(false);
  const [step, setStep] = useState<"plans" | "checkout" | "success">("plans");
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);

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

  const savings = useMemo(() => {
    if (!monthlyPkg || !yearlyPkg) return 0;
    const monthlyPrice = getPriceAmount(monthlyPkg);
    const yearlyMonthly = getPriceAmount(yearlyPkg) / 12;
    if (monthlyPrice > 0) {
      const s = Math.round((1 - yearlyMonthly / monthlyPrice) * 100);
      return s > 0 ? s : 0;
    }
    return 0;
  }, [monthlyPkg, yearlyPkg]);

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
    }
  }, [open]);

  useEffect(() => {
    if (step === "checkout") {
      loadStripeInstance();
    }
  }, [step, loadStripeInstance]);

  const handleJoinPro = () => {
    if (!selectedPackage || purchasing) return;
    setStep("checkout");
  };

  const checkoutPlanLabel = billingPeriod === "yearly" ? "Yearly" : "Monthly";
  const checkoutPriceFormatted = selectedPackage ? formatPrice(selectedPackage) : "";
  const checkoutPeriodLabel = billingPeriod === "yearly" ? "per year" : "per month";

  if (isPro) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[430px] w-full bg-[#020617] border-none p-0 overflow-hidden [&>button]:hidden">
          <div className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 mb-6">
              <Crown className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">You're already Pro!</h2>
            <p className="text-[#94a3b8] mb-6">
              You have full access to all Gamefolio Pro features. Thank you for your support!
            </p>
            <button
              onClick={() => onOpenChange(false)}
              className="w-full py-4 bg-[#4ade80] hover:bg-[#3bce71] text-[#022c22] font-bold text-lg rounded-2xl transition-colors"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const buttonDisabled = !isInitialized || isLoading || purchasing || !selectedPackage;

  const planSelector = (compact: boolean = false) => {
    const yearlyPerMonth = yearlyPkg ? formatCurrency(getPriceAmount(yearlyPkg) / 12, getCurrency(yearlyPkg)) : null;
    const yearlyTotal = yearlyPkg ? formatPrice(yearlyPkg) : null;
    const monthlyPrice = monthlyPkg ? formatPrice(monthlyPkg) : null;

    return (
      <div className="flex flex-col gap-3">
        {yearlyPkg && (
          <button
            type="button"
            onClick={() => setBillingPeriod("yearly")}
            className={`relative w-full rounded-2xl border-2 transition-all p-4 text-left ${
              billingPeriod === "yearly"
                ? "border-[#4ade80] bg-[#4ade800d]"
                : "border-[#1e293b] bg-[#0f172a] hover:border-[#334155]"
            }`}
          >
            {savings > 0 && (
              <div className="absolute -top-2.5 right-4 bg-[#4ade80] text-[#022c22] text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                Save {savings}%
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  billingPeriod === "yearly" ? "border-[#4ade80] bg-[#4ade80]" : "border-[#475569]"
                }`}>
                  {billingPeriod === "yearly" && <Check className="w-3 h-3 text-[#022c22]" strokeWidth={3} />}
                </div>
                <div>
                  <div className="text-white font-semibold text-[15px]">Yearly</div>
                  <div className="text-[#94a3b8] text-xs mt-0.5">
                    {yearlyTotal} billed annually
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-white font-bold text-lg">{yearlyPerMonth}</div>
                <div className="text-[#94a3b8] text-xs">/month</div>
              </div>
            </div>
          </button>
        )}

        {monthlyPkg && (
          <button
            type="button"
            onClick={() => setBillingPeriod("monthly")}
            className={`w-full rounded-2xl border-2 transition-all p-4 text-left ${
              billingPeriod === "monthly"
                ? "border-[#4ade80] bg-[#4ade800d]"
                : "border-[#1e293b] bg-[#0f172a] hover:border-[#334155]"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  billingPeriod === "monthly" ? "border-[#4ade80] bg-[#4ade80]" : "border-[#475569]"
                }`}>
                  {billingPeriod === "monthly" && <Check className="w-3 h-3 text-[#022c22]" strokeWidth={3} />}
                </div>
                <div>
                  <div className="text-white font-semibold text-[15px]">Monthly</div>
                  <div className="text-[#94a3b8] text-xs mt-0.5">
                    Billed monthly, cancel anytime
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-white font-bold text-lg">{monthlyPrice}</div>
                <div className="text-[#94a3b8] text-xs">/month</div>
              </div>
            </div>
          </button>
        )}

        {!monthlyPkg && !yearlyPkg && packages && packages.length > 0 && (
          <div className="w-full rounded-2xl border-2 border-[#4ade80] bg-[#4ade800d] p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full border-2 border-[#4ade80] bg-[#4ade80] flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-[#022c22]" strokeWidth={3} />
                </div>
                <div>
                  <div className="text-white font-semibold text-[15px]">{packages[0].rcBillingProduct?.displayName || "Pro"}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-white font-bold text-lg">{formatPrice(packages[0])}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const leftPanel = (
    <div className="relative w-full h-full min-h-[500px] md:min-h-0 flex flex-col bg-[#020617]">
      <div className="relative flex-1 min-h-[350px] md:min-h-[400px]">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${proHeroImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#02061733] to-[#020617]" />

        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 md:top-4 md:left-4 md:right-auto w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center transition-colors hover:bg-black/60 z-10"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      <div className="relative z-10 px-6 pb-6 -mt-32">
        <div className="flex justify-center mb-4 md:justify-start">
          <div className="inline-flex items-center gap-2 bg-[#14532d4d] border border-[#4ade8033] rounded-full px-4 py-1.5">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M13.3953 9.55057L13.524 8.28791C13.5926 7.61391 13.6373 7.16924 13.602 6.88858H13.6153C14.196 6.88858 14.6673 6.39124 14.6673 5.77791C14.6673 5.16458 14.196 4.66658 13.6146 4.66658C13.0333 4.66658 12.562 5.16391 12.562 5.77791C12.562 6.05524 12.6586 6.30924 12.818 6.50391C12.5893 6.65258 12.29 6.96724 11.8393 7.44058C11.4926 7.80524 11.3193 7.98724 11.126 8.01591C11.0186 8.03123 10.909 8.01502 10.8106 7.96924C10.632 7.88658 10.5126 7.66124 10.2746 7.20991L9.01864 4.83325C8.87197 4.55525 8.74864 4.32258 8.63731 4.13525C9.09264 3.88991 9.40397 3.39058 9.40397 2.81525C9.40397 1.99592 8.77597 1.33325 8.00064 1.33325C7.22531 1.33325 6.59731 1.99658 6.59731 2.81458C6.59731 3.39058 6.90864 3.88991 7.36398 4.13458C7.25264 4.32258 7.12998 4.55525 6.98264 4.83325L5.72731 7.21058C5.48864 7.66124 5.36931 7.88658 5.19065 7.96991C5.09227 8.01568 4.98272 8.0319 4.87531 8.01657C4.68198 7.98791 4.50865 7.80524 4.16198 7.44058C3.71131 6.96724 3.41198 6.65258 3.18331 6.50391C3.34331 6.30924 3.43931 6.05524 3.43931 5.77725C3.43931 5.16458 2.96732 4.66658 2.38598 4.66658C1.80598 4.66658 1.33398 5.16391 1.33398 5.77791C1.33398 6.39124 1.80532 6.88858 2.38665 6.88858H2.39932C2.36332 7.16858 2.40865 7.61391 2.47732 8.28791L2.60598 9.55057C2.67732 10.2512 2.73665 10.9179 2.80998 11.5186H13.1913C13.2646 10.9186 13.324 10.2512 13.3953 9.55057Z" fill="#4ADE80" />
              <path fillRule="evenodd" clipRule="evenodd" d="M7.23731 14.6666H8.76397C10.754 14.6666 11.7493 14.6666 12.4133 14.0399C12.7026 13.7652 12.8866 13.2719 13.0186 12.6292H2.98265C3.11465 13.2719 3.29798 13.7652 3.58798 14.0392C4.25198 14.6666 5.24731 14.6666 7.23731 14.6666Z" fill="#4ADE80" />
            </svg>
            <span className="text-[#4ade80] text-xs font-bold uppercase tracking-[0.6px]">
              Exclusive Offer
            </span>
          </div>
        </div>

        <div className="text-center md:text-left mb-2">
          <h2 className="text-2xl font-bold leading-tight whitespace-nowrap">
            <span className="text-white">Unlock </span>
            <span className="text-[#4ade80]">Gamefolio Pro</span>
          </h2>
        </div>

        <p className="text-[#94a3b8] text-base text-center md:text-left leading-relaxed hidden md:block max-w-[325px]">
          Elevate your gaming identity with premium features designed for elite creators
        </p>
      </div>
    </div>
  );

  const rightPanel = (
    <div className="flex flex-col justify-between h-full px-6 py-8 bg-[#020617]">
      <div className="flex flex-col gap-6 mb-6">
        {premiumBenefits.map((benefit, index) => (
          <motion.div
            key={benefit.title}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.08 }}
            className="flex items-start gap-4"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#1e293b] border border-[#1e293b] flex items-center justify-center flex-shrink-0">
              {benefit.icon}
            </div>
            <div className="flex flex-col justify-center min-h-[48px]">
              <span className="text-[#f8fafc] text-lg font-semibold leading-7">
                {benefit.title}
              </span>
              <span className="text-[#94a3b8] text-sm leading-5">
                {benefit.description}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex flex-col gap-4 mt-auto">
        <div className="mb-1">
          <span className="text-[#94a3b8] text-xs font-bold uppercase tracking-[1.2px]">
            Choose your plan
          </span>
        </div>

        {planSelector()}

        <button
          onClick={handleJoinPro}
          disabled={buttonDisabled}
          className="w-full py-4 bg-[#4ade80] hover:bg-[#3bce71] rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-1"
          style={{ boxShadow: "0 0 30px -5px #4ade80" }}
          data-testid="button-upgrade-pro"
        >
          {purchasing || isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-[#022c22]" />
          ) : (
            <>
              <span className="text-[#022c22] text-lg font-bold">Join Gamefolio Pro</span>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 12H20M20 12L14 6M20 12L14 18" stroke="#022C22" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </>
          )}
        </button>

        <span className="text-[#94a3b8] text-xs text-center">
          Cancel anytime. Terms and conditions apply.
        </span>
      </div>
    </div>
  );

  const successScreen = (
    <div className="flex flex-col items-center justify-center min-h-[500px] bg-[#020617] p-8 text-center">
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", duration: 0.8 }}
        className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-[#4ade80] to-[#22c55e] mb-8"
      >
        <Crown className="w-12 h-12 text-white" />
      </motion.div>
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-3xl font-bold text-white mb-3"
      >
        Welcome to Gamefolio Pro!
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-[#94a3b8] text-base mb-8 max-w-[320px]"
      >
        You now have access to all premium features. Elevate your gaming identity and stand out from the crowd!
      </motion.p>
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        onClick={() => onOpenChange(false)}
        className="w-full max-w-[320px] py-4 bg-[#4ade80] hover:bg-[#3bce71] text-[#022c22] font-black text-lg rounded-2xl transition-colors"
        style={{ boxShadow: "0 12px 40px -10px #4ade8080" }}
      >
        Continue
      </motion.button>
    </div>
  );

  const checkoutScreen = stripePromise ? (
    <Elements stripe={stripePromise} options={{ appearance: { theme: "night" } }}>
      <CheckoutForm
        plan={billingPeriod}
        planLabel={checkoutPlanLabel}
        priceFormatted={checkoutPriceFormatted}
        periodLabel={checkoutPeriodLabel}
        onBack={() => setStep("plans")}
        onSuccess={() => setStep("success")}
      />
    </Elements>
  ) : (
    <div className="flex items-center justify-center min-h-[400px] bg-[#020617]">
      <Loader2 className="w-8 h-8 animate-spin text-[#4ade80]" />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[430px] md:max-w-[860px] w-full bg-[#020617] border-none text-white p-0 overflow-hidden [&>button]:hidden"
        data-testid="dialog-pro-upgrade"
      >
        <AnimatePresence mode="wait">
          {step === "plans" && (
            <motion.div
              key="plans"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="flex flex-col md:hidden max-h-[85vh] overflow-y-auto rounded-2xl" style={{ scrollbarWidth: "none" }}>
                <div className="relative w-full h-[200px] flex-shrink-0">
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${proHeroImage})` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#02061733] to-[#020617]" />
                  <button
                    onClick={() => onOpenChange(false)}
                    className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center transition-colors hover:bg-black/60 z-10"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>

                <div className="px-5 pb-6 -mt-10 relative z-10">
                  <div className="flex justify-center mb-3">
                    <div className="inline-flex items-center gap-1.5 bg-[#14532d4d] border border-[#4ade8033] rounded-full px-3 py-1">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" clipRule="evenodd" d="M13.3953 9.55057L13.524 8.28791C13.5926 7.61391 13.6373 7.16924 13.602 6.88858H13.6153C14.196 6.88858 14.6673 6.39124 14.6673 5.77791C14.6673 5.16458 14.196 4.66658 13.6146 4.66658C13.0333 4.66658 12.562 5.16391 12.562 5.77791C12.562 6.05524 12.6586 6.30924 12.818 6.50391C12.5893 6.65258 12.29 6.96724 11.8393 7.44058C11.4926 7.80524 11.3193 7.98724 11.126 8.01591C11.0186 8.03123 10.909 8.01502 10.8106 7.96924C10.632 7.88658 10.5126 7.66124 10.2746 7.20991L9.01864 4.83325C8.87197 4.55525 8.74864 4.32258 8.63731 4.13525C9.09264 3.88991 9.40397 3.39058 9.40397 2.81525C9.40397 1.99592 8.77597 1.33325 8.00064 1.33325C7.22531 1.33325 6.59731 1.99658 6.59731 2.81458C6.59731 3.39058 6.90864 3.88991 7.36398 4.13458C7.25264 4.32258 7.12998 4.55525 6.98264 4.83325L5.72731 7.21058C5.48864 7.66124 5.36931 7.88658 5.19065 7.96991C5.09227 8.01568 4.98272 8.0319 4.87531 8.01657C4.68198 7.98791 4.50865 7.80524 4.16198 7.44058C3.71131 6.96724 3.41198 6.65258 3.18331 6.50391C3.34331 6.30924 3.43931 6.05524 3.43931 5.77725C3.43931 5.16458 2.96732 4.66658 2.38598 4.66658C1.80598 4.66658 1.33398 5.16391 1.33398 5.77791C1.33398 6.39124 1.80532 6.88858 2.38665 6.88858H2.39932C2.36332 7.16858 2.40865 7.61391 2.47732 8.28791L2.60598 9.55057C2.67732 10.2512 2.73665 10.9179 2.80998 11.5186H13.1913C13.2646 10.9186 13.324 10.2512 13.3953 9.55057Z" fill="#4ADE80" />
                        <path fillRule="evenodd" clipRule="evenodd" d="M7.23731 14.6666H8.76397C10.754 14.6666 11.7493 14.6666 12.4133 14.0399C12.7026 13.7652 12.8866 13.2719 13.0186 12.6292H2.98265C3.11465 13.2719 3.29798 13.7652 3.58798 14.0392C4.25198 14.6666 5.24731 14.6666 7.23731 14.6666Z" fill="#4ADE80" />
                      </svg>
                      <span className="text-[#4ade80] text-[11px] font-bold uppercase tracking-[0.5px]">
                        Exclusive Offer
                      </span>
                    </div>
                  </div>

                  <h2 className="text-center text-2xl font-bold leading-tight mb-1">
                    <span className="text-white">Unlock </span>
                    <span className="text-[#4ade80]">Gamefolio Pro</span>
                  </h2>

                  <p className="text-[#94a3b8] text-sm text-center leading-relaxed mb-5 max-w-[280px] mx-auto">
                    Elevate your gaming identity with premium features designed for elite creators
                  </p>

                  <div className="flex flex-col gap-4 mb-5">
                    {premiumBenefits.map((benefit, index) => (
                      <motion.div
                        key={benefit.title}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center gap-3"
                      >
                        <div className="w-10 h-10 rounded-xl bg-[#1e293b] border border-[#1e293b] flex items-center justify-center flex-shrink-0">
                          {benefit.icon}
                        </div>
                        <div className="flex flex-col justify-center">
                          <span className="text-[#f8fafc] text-[15px] font-semibold leading-5">
                            {benefit.title}
                          </span>
                          <span className="text-[#94a3b8] text-xs leading-4">
                            {benefit.description}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="mb-3">
                    <span className="text-[#94a3b8] text-[10px] font-bold uppercase tracking-[1px]">
                      Choose your plan
                    </span>
                  </div>

                  {planSelector(true)}

                  <button
                    onClick={handleJoinPro}
                    disabled={buttonDisabled}
                    className="w-full py-3.5 bg-[#4ade80] hover:bg-[#3bce71] rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-4"
                    style={{ boxShadow: "0 0 30px -5px #4ade80" }}
                    data-testid="button-upgrade-pro-mobile"
                  >
                    {purchasing || isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin text-[#022c22]" />
                    ) : (
                      <>
                        <span className="text-[#022c22] text-base font-bold">Join Gamefolio Pro</span>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M4 12H20M20 12L14 6M20 12L14 18" stroke="#022C22" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </>
                    )}
                  </button>

                  <span className="text-[#94a3b8] text-[11px] text-center block mt-3">
                    Cancel anytime. Terms and conditions apply.
                  </span>
                </div>
              </div>

              <div className="hidden md:grid md:grid-cols-2 min-h-[600px]">
                {leftPanel}
                {rightPanel}
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
            >
              {successScreen}
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
