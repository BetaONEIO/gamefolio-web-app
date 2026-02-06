import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Crown, Loader2, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useRevenueCat } from "@/hooks/use-revenuecat";
import { Package } from "@revenuecat/purchases-js";
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

export default function ProUpgradeDialog({ open, onOpenChange }: ProUpgradeDialogProps) {
  const { isInitialized, isLoading, isPro, getCurrentOffering, purchasePackage } = useRevenueCat();
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("yearly");
  const [purchasing, setPurchasing] = useState(false);

  const packages = getCurrentOffering();

  useEffect(() => {
    if (!open) {
      setSelectedPackage(null);
      setBillingPeriod("yearly");
      setPurchasing(false);
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

  const handleJoinPro = async () => {
    if (!selectedPackage || purchasing) return;
    setPurchasing(true);
    try {
      console.log("Starting purchase for package:", selectedPackage.identifier);
      const success = await purchasePackage(selectedPackage);
      console.log("Purchase result:", success);
      if (success) {
        onOpenChange(false);
      }
    } catch (err) {
      console.error("Purchase error:", err);
    } finally {
      setPurchasing(false);
    }
  };

  const getMonthlyEquivalent = () => {
    const yearly = packages?.find(p => {
      const id = p.identifier.toLowerCase();
      return id.includes("annual") || id.includes("yearly") || id.includes("year");
    });
    if (yearly) {
      const price = (yearly.rcBillingProduct?.currentPrice?.amountMicros || 0) / 1000000;
      const monthly = price / 12;
      const currency = yearly.rcBillingProduct?.currentPrice?.currency || "USD";
      return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(monthly);
    }
    return "$4.99";
  };

  const calculateSavings = () => {
    const monthly = packages?.find(p => {
      const id = p.identifier.toLowerCase();
      return id.includes("monthly") || id.includes("month");
    });
    const yearly = packages?.find(p => {
      const id = p.identifier.toLowerCase();
      return id.includes("annual") || id.includes("yearly") || id.includes("year");
    });
    if (!monthly || !yearly) return 50;
    const monthlyPrice = (monthly.rcBillingProduct?.currentPrice?.amountMicros || 0) / 1000000;
    const yearlyPrice = (yearly.rcBillingProduct?.currentPrice?.amountMicros || 0) / 1000000;
    const yearlyMonthly = yearlyPrice / 12;
    if (monthlyPrice > 0) {
      const savings = Math.round((1 - yearlyMonthly / monthlyPrice) * 100);
      return savings > 0 ? savings : 50;
    }
    return 50;
  };

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

  const savings = calculateSavings();
  const buttonDisabled = !isInitialized || isLoading || purchasing || !selectedPackage;

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
      <div className="flex flex-col gap-6 mb-8">
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
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[#94a3b8] text-xs font-bold uppercase tracking-[1.2px]">
              Annual Plan
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-white text-2xl font-bold">
                {getMonthlyEquivalent()}
              </span>
              <span className="text-[#94a3b8] text-base">/mo</span>
            </div>
          </div>
          <div className="bg-[#4ade801a] border border-[#4ade8033] rounded-xl px-3 py-2">
            <span className="text-[#4ade80] text-xs font-bold">
              Save {savings}%
            </span>
          </div>
        </div>

        <button
          onClick={handleJoinPro}
          disabled={buttonDisabled}
          className="w-full py-4 bg-[#4ade80] hover:bg-[#3bce71] rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ boxShadow: '0 0 30px -5px #4ade80' }}
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[430px] md:max-w-[860px] w-full bg-[#020617] border-none text-white p-0 overflow-hidden [&>button]:hidden"
        data-testid="dialog-pro-upgrade"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key="plans"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex flex-col md:hidden max-h-[85vh] overflow-y-auto rounded-2xl" style={{ scrollbarWidth: 'none' }}>
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

                <div className="flex flex-col gap-4 mb-6">
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

                <div className="flex items-center justify-between mb-4">
                  <div className="flex flex-col">
                    <span className="text-[#94a3b8] text-[10px] font-bold uppercase tracking-[1px]">
                      Annual Plan
                    </span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-white text-xl font-bold">
                        {getMonthlyEquivalent()}
                      </span>
                      <span className="text-[#94a3b8] text-sm">/mo</span>
                    </div>
                  </div>
                  <div className="bg-[#4ade801a] border border-[#4ade8033] rounded-lg px-2.5 py-1.5">
                    <span className="text-[#4ade80] text-[11px] font-bold">
                      Save {savings}%
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleJoinPro}
                  disabled={buttonDisabled}
                  className="w-full py-3.5 bg-[#4ade80] hover:bg-[#3bce71] rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ boxShadow: '0 0 30px -5px #4ade80' }}
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
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
