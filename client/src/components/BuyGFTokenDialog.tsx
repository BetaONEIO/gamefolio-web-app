import { useState } from "react";
import { motion } from "motion/react";
import { X, Check, CreditCard, Wallet, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import gfTokenLogo from "@assets/Gamefolio token_1762633908726.png";

interface BuyGFTokenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface TokenPackage {
  id: string;
  amount: number;
  price: number;
  bonus: number;
  popular?: boolean;
}

const tokenPackages: TokenPackage[] = [
  {
    id: "starter",
    amount: 500,
    price: 25,
    bonus: 0,
  },
  {
    id: "popular",
    amount: 1000,
    price: 45,
    bonus: 100,
    popular: true,
  },
  {
    id: "premium",
    amount: 2500,
    price: 100,
    bonus: 500,
  },
  {
    id: "ultimate",
    amount: 5000,
    price: 180,
    bonus: 1500,
  },
];

export default function BuyGFTokenDialog({ open, onOpenChange }: BuyGFTokenDialogProps) {
  const [selectedPackage, setSelectedPackage] = useState<TokenPackage | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handlePurchase = async () => {
    if (!selectedPackage) return;

    setIsProcessing(true);
    try {
      const response = await apiRequest("/api/token/purchase", {
        method: "POST",
        body: JSON.stringify({
          packageId: selectedPackage.id,
          amount: selectedPackage.amount + selectedPackage.bonus,
          price: selectedPackage.price,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        
        toast({
          title: "Purchase successful! 🎉",
          description: `You received ${selectedPackage.amount + selectedPackage.bonus} GF tokens`,
        });

        onOpenChange(false);
        setSelectedPackage(null);
      } else {
        throw new Error("Purchase failed");
      }
    } catch (error) {
      toast({
        title: "Purchase failed",
        description: "Unable to process your purchase. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <img src={gfTokenLogo} alt="GF Token" className="w-10 h-10" />
            <DialogTitle className="text-2xl">Buy GF Tokens</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Package Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tokenPackages.map((pkg, index) => (
              <motion.div
                key={pkg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedPackage(pkg)}
                className={`relative p-6 rounded-2xl border-2 cursor-pointer transition-all ${
                  selectedPackage?.id === pkg.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
                data-testid={`package-${pkg.id}`}
              >
                {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                      MOST POPULAR
                    </span>
                  </div>
                )}

                {selectedPackage?.id === pkg.id && (
                  <div className="absolute top-4 right-4">
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <img src={gfTokenLogo} alt="GF" className="w-8 h-8" />
                    <span className="text-3xl font-bold">{pkg.amount.toLocaleString()}</span>
                  </div>

                  {pkg.bonus > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">+ {pkg.bonus} bonus tokens</span>
                      <span className="bg-green-500/20 text-green-600 dark:text-green-400 text-xs font-semibold px-2 py-0.5 rounded-full">
                        FREE
                      </span>
                    </div>
                  )}

                  <div className="pt-3 border-t">
                    <div className="text-2xl font-bold">${pkg.price.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">
                      ${(pkg.price / (pkg.amount + pkg.bonus)).toFixed(3)} per token
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Selected Package Summary */}
          {selectedPackage && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-muted/50 rounded-xl p-6 space-y-4"
            >
              <h3 className="font-semibold text-lg">Order Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Base Amount</span>
                  <span className="font-medium">{selectedPackage.amount.toLocaleString()} GF</span>
                </div>
                {selectedPackage.bonus > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bonus Tokens</span>
                    <span className="font-medium text-green-600 dark:text-green-400">
                      +{selectedPackage.bonus.toLocaleString()} GF
                    </span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-semibold">Total Tokens</span>
                  <span className="font-bold text-lg">
                    {(selectedPackage.amount + selectedPackage.bonus).toLocaleString()} GF
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Total Price</span>
                  <span className="font-bold text-xl text-primary">
                    ${selectedPackage.price.toFixed(2)} USD
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Payment Methods Info */}
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  Secure Payment
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  All transactions are processed securely. We accept credit cards, debit cards, and cryptocurrency payments.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handlePurchase}
              disabled={!selectedPackage || isProcessing}
              data-testid="button-confirm-purchase"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Wallet className="w-4 h-4 mr-2" />
                  Complete Purchase
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
