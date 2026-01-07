import { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { Check, Crown, Zap, Palette, Shield, Star, Loader2, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useRevenueCat } from "@/hooks/use-revenuecat";
import { Package } from "@revenuecat/purchases-js";
import { cn } from "@/lib/utils";

interface ProUpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const proFeatures = [
  {
    icon: Palette,
    title: "Custom Themes",
    description: "Unlock unlimited color customization for your profile",
  },
  {
    icon: Crown,
    title: "Pro Badge",
    description: "Show off your Pro status with an exclusive profile badge",
  },
  {
    icon: Zap,
    title: "Priority Uploads",
    description: "Faster video and image processing for your content",
  },
  {
    icon: Shield,
    title: "Ad-Free Experience",
    description: "Enjoy Gamefolio without any advertisements",
  },
  {
    icon: Star,
    title: "Exclusive Features",
    description: "Early access to new features and tools",
  },
];

export default function ProUpgradeDialog({ open, onOpenChange }: ProUpgradeDialogProps) {
  const { isInitialized, isLoading, isPro, getCurrentOffering, purchasePackage } = useRevenueCat();
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const paymentContainerRef = useRef<HTMLDivElement>(null);
  
  const packages = getCurrentOffering();

  useEffect(() => {
    if (!open) {
      setSelectedPackage(null);
      setShowPayment(false);
    }
  }, [open]);

  useEffect(() => {
    if (packages && packages.length > 0 && !selectedPackage) {
      const monthlyPkg = packages.find(p => 
        p.identifier.toLowerCase().includes("monthly") || 
        p.packageType === "$rc_monthly"
      );
      setSelectedPackage(monthlyPkg || packages[0]);
    }
  }, [packages, selectedPackage]);

  const handlePurchase = async () => {
    if (!selectedPackage) return;
    
    setShowPayment(true);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const success = await purchasePackage(
      selectedPackage, 
      paymentContainerRef.current || undefined
    );
    
    if (success) {
      onOpenChange(false);
    } else {
      setShowPayment(false);
    }
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

  const getPeriod = (pkg: Package): string => {
    const identifier = pkg.identifier.toLowerCase();
    if (identifier.includes("annual") || identifier.includes("yearly")) return "/year";
    if (identifier.includes("weekly")) return "/week";
    return "/month";
  };

  if (isPro) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <Crown className="w-8 h-8 text-yellow-500" />
              <DialogTitle className="text-2xl">You're already Pro!</DialogTitle>
            </div>
          </DialogHeader>
          <div className="py-6 text-center">
            <p className="text-muted-foreground">
              You have full access to all Gamefolio Pro features. Thank you for your support!
            </p>
          </div>
          <Button onClick={() => onOpenChange(false)} className="w-full" data-testid="button-close-pro-dialog">
            Close
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl">
              <Crown className="w-6 h-6 text-white" />
            </div>
            <DialogTitle className="text-2xl">
              {showPayment ? "Complete Your Purchase" : "Upgrade to Gamefolio Pro"}
            </DialogTitle>
          </div>
        </DialogHeader>

        {showPayment ? (
          <div className="space-y-4 py-4">
            <div className="bg-muted/50 rounded-xl p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold">Gamefolio Pro</p>
                  <p className="text-sm text-muted-foreground">{selectedPackage?.identifier}</p>
                </div>
                <p className="text-xl font-bold">
                  {selectedPackage && formatPrice(selectedPackage)}
                  <span className="text-sm font-normal text-muted-foreground">
                    {selectedPackage && getPeriod(selectedPackage)}
                  </span>
                </p>
              </div>
            </div>

            <div 
              ref={paymentContainerRef} 
              className="min-h-[400px] border rounded-xl bg-white dark:bg-gray-900"
              data-testid="payment-container"
            >
              {isLoading && (
                <div className="flex items-center justify-center h-[400px]">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>

            <Button 
              variant="outline" 
              onClick={() => setShowPayment(false)}
              className="w-full"
              data-testid="button-back-to-plans"
            >
              Back to Plans
            </Button>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            <div className="grid gap-3">
              {proFeatures.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/30"
                >
                  <div className="p-2 rounded-lg bg-primary/10">
                    <feature.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{feature.title}</p>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {!isInitialized ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                <span className="text-muted-foreground">Loading plans...</span>
              </div>
            ) : packages && packages.length > 0 ? (
              <div className="space-y-3">
                <p className="font-semibold">Choose your plan:</p>
                <div className="grid gap-3">
                  {packages.map((pkg, index) => {
                    const isSelected = selectedPackage?.identifier === pkg.identifier;
                    const isPopular = pkg.identifier.toLowerCase().includes("annual") || 
                                     pkg.identifier.toLowerCase().includes("yearly");
                    
                    return (
                      <motion.div
                        key={pkg.identifier}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        onClick={() => setSelectedPackage(pkg)}
                        className={cn(
                          "relative p-4 rounded-xl border-2 cursor-pointer transition-all",
                          isSelected 
                            ? "border-primary bg-primary/5" 
                            : "border-border hover:border-primary/50"
                        )}
                        data-testid={`package-${pkg.identifier}`}
                      >
                        {isPopular && (
                          <div className="absolute -top-2.5 left-4">
                            <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                              BEST VALUE
                            </span>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                              isSelected ? "border-primary bg-primary" : "border-muted-foreground"
                            )}>
                              {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                            </div>
                            <div>
                              <p className="font-semibold capitalize">
                                {pkg.identifier.replace(/_/g, " ").replace("$rc", "").trim() || "Pro Plan"}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {pkg.rcBillingProduct?.displayName || "Full access to all features"}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold">{formatPrice(pkg)}</p>
                            <p className="text-sm text-muted-foreground">{getPeriod(pkg)}</p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  No subscription plans available at the moment. Please check back later.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-upgrade"
              >
                Maybe Later
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                onClick={handlePurchase}
                disabled={!selectedPackage || isLoading}
                data-testid="button-upgrade-pro"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Crown className="w-4 h-4 mr-2" />
                    Upgrade Now
                  </>
                )}
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Cancel anytime. Secure payment powered by Stripe.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
