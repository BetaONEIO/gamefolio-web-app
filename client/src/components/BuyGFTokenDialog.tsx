import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Check, CreditCard, Wallet, Loader2, AlertCircle, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
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
    amount: 10,
    price: 0.50,
    bonus: 0,
  },
  {
    id: "popular",
    amount: 25,
    price: 1.00,
    bonus: 5,
    popular: true,
  },
  {
    id: "premium",
    amount: 50,
    price: 2.00,
    bonus: 10,
  },
  {
    id: "ultimate",
    amount: 100,
    price: 3.50,
    bonus: 25,
  },
];

export default function BuyGFTokenDialog({ open, onOpenChange }: BuyGFTokenDialogProps) {
  const [selectedPackage, setSelectedPackage] = useState<TokenPackage | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<"select" | "payment">("select");
  const [walletError, setWalletError] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) {
      setSelectedPackage(null);
      setOrderId(null);
      setClientSecret(null);
      setCheckoutStep("select");
      setWalletError(false);
    }
  }, [open]);

  useEffect(() => {
    if (orderId && checkoutStep === "payment") {
      const pollInterval = setInterval(async () => {
        try {
          const response = await fetch("/api/token/complete-order", {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ orderId }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              clearInterval(pollInterval);
              
              await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
              
              toast({
                title: "Purchase successful! 🎉",
                description: `You received ${data.amount} GF tokens`,
              });

              onOpenChange(false);
            }
          }
        } catch (error) {
          console.error("Error polling order status:", error);
        }
      }, 5000);

      return () => clearInterval(pollInterval);
    }
  }, [orderId, checkoutStep, onOpenChange, toast]);

  const handleInitiatePayment = async () => {
    if (!selectedPackage) return;

    setIsProcessing(true);
    setWalletError(false);

    try {
      const response = await fetch("/api/token/create-order", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          packageId: selectedPackage.id,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setOrderId(data.orderId);
        setClientSecret(data.clientSecret);
        setCheckoutStep("payment");
      } else {
        if (data.code === "WALLET_REQUIRED") {
          setWalletError(true);
          toast({
            title: "Wallet Required",
            description: "Please create a wallet before purchasing GF tokens.",
            variant: "destructive",
          });
        } else {
          throw new Error(data.message || "Order creation failed");
        }
      }
    } catch (error) {
      toast({
        title: "Order creation failed",
        description: "Unable to create payment order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBackToSelection = () => {
    setCheckoutStep("select");
    setOrderId(null);
    setClientSecret(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <img src={gfTokenLogo} alt="GF Token" className="w-10 h-10" />
            <DialogTitle className="text-2xl">
              {checkoutStep === "select" ? "Buy GF Tokens" : "Complete Payment"}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {checkoutStep === "select" ? (
            <>
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
                    <span className="bg-gradient-to-r from-[#B7FF1A] to-[#A2F000] text-[#071013] text-xs font-bold px-3 py-1 rounded-full">
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
                      <span className="bg-primary/20 text-primary dark:text-primary text-xs font-semibold px-2 py-0.5 rounded-full">
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
                    <span className="font-medium text-primary dark:text-primary">
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

              {/* Wallet Error Warning */}
              {walletError && (
                <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
                        Wallet Required
                      </h4>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">
                        You need to create a wallet before purchasing GF tokens. Visit your wallet page to create one.
                      </p>
                    </div>
                  </div>
                </div>
              )}

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
                  onClick={handleInitiatePayment}
                  disabled={!selectedPackage || isProcessing}
                  data-testid="button-confirm-purchase"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating Order...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Continue to Payment
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Crossmint Checkout via iframe */}
              {orderId && clientSecret ? (
                <div className="space-y-4">
                  <div className="bg-muted/50 rounded-xl p-6 space-y-3">
                    <h3 className="font-semibold text-lg">Order Summary</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Package</span>
                        <span className="font-medium">{selectedPackage?.amount.toLocaleString()} GF</span>
                      </div>
                      {selectedPackage && selectedPackage.bonus > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Bonus</span>
                          <span className="font-medium text-primary dark:text-primary">
                            +{selectedPackage.bonus.toLocaleString()} GF
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between pt-2 border-t">
                        <span className="font-semibold">Total</span>
                        <span className="font-bold text-lg">${selectedPackage?.price.toFixed(2)} USD</span>
                      </div>
                    </div>
                  </div>

                  {/* Crossmint Checkout iframe */}
                  <div className="border rounded-xl overflow-hidden bg-white dark:bg-gray-900">
                    <iframe
                      src={`https://www.crossmint.com/checkout/${orderId}?clientSecret=${clientSecret}`}
                      className="w-full h-[500px] border-0"
                      allow="payment"
                      title="Crossmint Checkout"
                    />
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 animate-spin" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                          Waiting for Payment
                        </h4>
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          Complete your payment in the checkout above. Your GF tokens will be delivered automatically.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={handleBackToSelection}
                    >
                      Back to Selection
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading checkout...</p>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
