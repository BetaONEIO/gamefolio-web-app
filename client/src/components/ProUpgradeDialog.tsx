import { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { Check, Crown, Zap, Palette, Shield, Star, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useRevenueCat } from "@/hooks/use-revenuecat";

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
  const { isInitialized, isLoading, isPro, presentPaywall } = useRevenueCat();
  const [showPayment, setShowPayment] = useState(false);
  const [paywallLoaded, setPaywallLoaded] = useState(false);
  const paymentContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setShowPayment(false);
      setPaywallLoaded(false);
    }
  }, [open]);

  useEffect(() => {
    if (showPayment && paymentContainerRef.current && !paywallLoaded && isInitialized) {
      setPaywallLoaded(true);
      presentPaywall(paymentContainerRef.current).then((success) => {
        if (success) {
          onOpenChange(false);
        }
      });
    }
  }, [showPayment, paywallLoaded, isInitialized, presentPaywall, onOpenChange]);

  const handleUpgradeClick = () => {
    setShowPayment(true);
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
            <div 
              ref={paymentContainerRef} 
              className="min-h-[500px] border rounded-xl bg-white dark:bg-gray-900 overflow-hidden"
              data-testid="payment-container"
            >
              {isLoading && (
                <div className="flex items-center justify-center h-[500px]">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>

            <Button 
              variant="outline" 
              onClick={() => {
                setShowPayment(false);
                setPaywallLoaded(false);
              }}
              className="w-full"
              data-testid="button-back-to-plans"
            >
              Back
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
                <span className="text-muted-foreground">Loading...</span>
              </div>
            ) : (
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
                  onClick={handleUpgradeClick}
                  disabled={isLoading}
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
            )}

            <p className="text-xs text-center text-muted-foreground">
              Cancel anytime. Secure payment powered by Stripe.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
