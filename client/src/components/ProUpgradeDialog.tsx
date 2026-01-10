import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Crown, Upload, Sparkles, Gift, Tag, Loader2, ArrowRight, ArrowLeft } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useRevenueCat } from "@/hooks/use-revenuecat";
import { Package } from "@revenuecat/purchases-js";
import { cn } from "@/lib/utils";

interface ProUpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const premiumBenefits = [
  {
    icon: Upload,
    title: "Unlimited upload space",
    description: "Share your clips without limits",
  },
  {
    icon: Sparkles,
    title: "Animated profile customization",
    description: "Custom banners, borders & effects",
  },
  {
    icon: Gift,
    title: "100s of exclusive assets",
    description: "Premium stickers, badges & themes",
  },
  {
    icon: Tag,
    title: "Store discounts",
    description: "Save on games and merchandise",
  },
];

export default function ProUpgradeDialog({ open, onOpenChange }: ProUpgradeDialogProps) {
  const { isInitialized, isLoading, isPro, getCurrentOffering, presentPaywall } = useRevenueCat();
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutLoaded, setCheckoutLoaded] = useState(false);
  const checkoutContainerRef = useRef<HTMLDivElement>(null);
  
  const packages = getCurrentOffering();

  useEffect(() => {
    if (!open) {
      setSelectedPackage(null);
      setBillingPeriod("monthly");
      setShowCheckout(false);
      setCheckoutLoaded(false);
    }
  }, [open]);

  useEffect(() => {
    if (packages && packages.length > 0) {
      const targetPkg = packages.find(p => {
        const id = p.identifier.toLowerCase();
        if (billingPeriod === "yearly") {
          return id.includes("annual") || id.includes("yearly") || id.includes("year");
        }
        return id.includes("monthly") || id.includes("month");
      });
      setSelectedPackage(targetPkg || packages[0]);
    }
  }, [packages, billingPeriod]);

  useEffect(() => {
    if (showCheckout && checkoutContainerRef.current && !checkoutLoaded && isInitialized) {
      setCheckoutLoaded(true);
      presentPaywall(checkoutContainerRef.current).then((success) => {
        if (success) {
          onOpenChange(false);
        } else {
          setShowCheckout(false);
          setCheckoutLoaded(false);
        }
      });
    }
  }, [showCheckout, checkoutLoaded, isInitialized, presentPaywall, onOpenChange]);

  const handleProceedToCheckout = () => {
    setShowCheckout(true);
  };

  const handleBackToPlans = () => {
    setShowCheckout(false);
    setCheckoutLoaded(false);
  };

  const formatPrice = (pkg: Package) => {
    const price = pkg.rcBillingProduct?.currentPrice?.amountMicros;
    const currency = pkg.rcBillingProduct?.currentPrice?.currency;
    
    if (price && currency) {
      const amount = price / 1000000;
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
      }).format(amount);
    }
    
    return pkg.rcBillingProduct?.currentPrice?.formattedPrice || "$4.99";
  };

  const getMonthlyPackage = () => packages?.find(p => {
    const id = p.identifier.toLowerCase();
    return id.includes("monthly") || id.includes("month");
  });

  const getYearlyPackage = () => packages?.find(p => {
    const id = p.identifier.toLowerCase();
    return id.includes("annual") || id.includes("yearly") || id.includes("year");
  });

  const calculateSavings = () => {
    const monthly = getMonthlyPackage();
    const yearly = getYearlyPackage();
    if (!monthly || !yearly) return null;
    
    const monthlyPrice = (monthly.rcBillingProduct?.currentPrice?.amountMicros || 0) / 1000000;
    const yearlyPrice = (yearly.rcBillingProduct?.currentPrice?.amountMicros || 0) / 1000000;
    const yearlyMonthly = yearlyPrice / 12;
    
    if (monthlyPrice > 0) {
      const savings = Math.round((1 - yearlyMonthly / monthlyPrice) * 100);
      return savings > 0 ? savings : null;
    }
    return null;
  };

  if (isPro) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md bg-gradient-to-b from-[#1a1a2e] to-[#0f0f1a] border-[#2a2a4a] p-0 overflow-hidden">
          <div className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 mb-6">
              <Crown className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">You're already Pro!</h2>
            <p className="text-gray-400 mb-6">
              You have full access to all Gamefolio Pro features. Thank you for your support!
            </p>
            <Button 
              onClick={() => onOpenChange(false)} 
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const savings = calculateSavings();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-gradient-to-b from-[#1a1a2e] to-[#0f0f1a] border-[#2a2a4a] p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        <AnimatePresence mode="wait">
          {showCheckout ? (
            <motion.div
              key="checkout"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="relative"
            >
              <div className="px-6 pt-6 pb-4">
                <button
                  onClick={handleBackToPlans}
                  className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to plans
                </button>
              </div>

              <div className="px-6 pb-4 text-center">
                <h2 className="text-xl font-bold text-white mb-1">Complete Your Purchase</h2>
                <p className="text-gray-400 text-sm">
                  {billingPeriod === "yearly" ? "Yearly" : "Monthly"} subscription - {selectedPackage ? formatPrice(selectedPackage) : ""}
                </p>
              </div>

              <div 
                ref={checkoutContainerRef}
                className="min-h-[400px] mx-4 mb-4 rounded-xl overflow-hidden bg-white"
                data-testid="checkout-container"
              >
                {(isLoading || !checkoutLoaded) && (
                  <div className="flex items-center justify-center h-[400px] bg-[#1e1e35]">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="plans"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 to-transparent pointer-events-none" />
              
              <div className="relative px-6 pt-8 pb-6 text-center">
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="inline-flex flex-col items-center"
                >
                  <div className="relative mb-4">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                      <Crown className="w-10 h-10 text-white" />
                    </div>
                    <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-emerald-500 rounded text-[10px] font-bold text-white uppercase tracking-wider">
                      Pro
                    </div>
                  </div>
                  
                  <h1 className="text-3xl font-bold mb-2">
                    <span className="text-white">Gamefolio </span>
                    <span className="text-emerald-400">Pro</span>
                  </h1>
                  <p className="text-gray-400 text-sm max-w-xs">
                    Unlock the ultimate experience and level up your gaming profile today.
                  </p>
                </motion.div>
              </div>

              <div className="px-6 pb-6">
                <div className="bg-[#1e1e35]/80 rounded-2xl p-5 backdrop-blur-sm border border-[#2a2a4a]">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                    Premium Benefits
                  </h3>
                  
                  <div className="space-y-4">
                    {premiumBenefits.map((benefit, index) => (
                      <motion.div
                        key={benefit.title}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-start gap-3"
                      >
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                          <benefit.icon className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-white font-medium text-sm">{benefit.title}</p>
                          <p className="text-gray-500 text-xs">{benefit.description}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>

              {!isInitialized ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                </div>
              ) : packages && packages.length > 0 ? (
                <div className="px-6 pb-6">
                  {packages.length > 1 && (
                    <div className="flex gap-2 mb-4 p-1 bg-[#1e1e35] rounded-xl">
                      <button
                        onClick={() => setBillingPeriod("monthly")}
                        className={cn(
                          "flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all",
                          billingPeriod === "monthly"
                            ? "bg-emerald-500 text-white shadow-lg"
                            : "text-gray-400 hover:text-white"
                        )}
                      >
                        Monthly
                      </button>
                      <button
                        onClick={() => setBillingPeriod("yearly")}
                        className={cn(
                          "flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all relative",
                          billingPeriod === "yearly"
                            ? "bg-emerald-500 text-white shadow-lg"
                            : "text-gray-400 hover:text-white"
                        )}
                      >
                        Yearly
                        {savings && (
                          <span className="absolute -top-2 -right-1 px-1.5 py-0.5 bg-orange-500 rounded text-[10px] font-bold text-white">
                            -{savings}%
                          </span>
                        )}
                      </button>
                    </div>
                  )}

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={billingPeriod}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-center mb-6"
                    >
                      <div className="inline-block px-3 py-1 bg-emerald-500/20 rounded-full mb-3">
                        <span className="text-emerald-400 text-xs font-semibold uppercase tracking-wider">
                          {billingPeriod === "yearly" ? "Best Value" : "Special Intro Offer"}
                        </span>
                      </div>
                      
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-5xl font-bold text-white">
                          {selectedPackage ? formatPrice(selectedPackage) : "$4.99"}
                        </span>
                        <span className="text-gray-400 text-lg">
                          /{billingPeriod === "yearly" ? "year" : "month"}
                        </span>
                      </div>
                      
                      {billingPeriod === "yearly" && getYearlyPackage() && (
                        <p className="text-gray-500 text-sm mt-2">
                          Just {formatPrice(getYearlyPackage()!).replace(/[\d.]+/, (match) => (parseFloat(match) / 12).toFixed(2))}/month billed annually
                        </p>
                      )}
                      
                      <p className="text-gray-500 text-sm mt-1">
                        Cancel anytime.
                      </p>
                    </motion.div>
                  </AnimatePresence>

                  <Button
                    onClick={handleProceedToCheckout}
                    disabled={!selectedPackage || isLoading}
                    className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 text-white text-lg font-semibold rounded-xl shadow-lg shadow-emerald-500/30 transition-all hover:shadow-emerald-500/40"
                    data-testid="button-upgrade-pro"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Upgrade to Pro
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="px-6 pb-6 text-center">
                  <p className="text-gray-400">
                    No subscription plans available at the moment.
                  </p>
                </div>
              )}

              <div className="px-6 pb-6">
                <button
                  onClick={() => onOpenChange(false)}
                  className="w-full text-center text-gray-400 hover:text-white transition-colors py-2 text-sm"
                  data-testid="button-cancel-upgrade"
                >
                  Maybe Later
                </button>
              </div>

              <div className="px-6 pb-6 flex items-center justify-center gap-4 text-xs text-gray-500">
                <a href="/terms" className="hover:text-gray-300 transition-colors">Terms of Service</a>
                <span>•</span>
                <a href="/privacy" className="hover:text-gray-300 transition-colors">Privacy Policy</a>
                <span>•</span>
                <button className="hover:text-gray-300 transition-colors">Restore Purchase</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
