import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useRevenueCat } from "@/hooks/use-revenuecat";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { Crown, Check, Calendar, CreditCard, ExternalLink, AlertTriangle, Loader2, Clock, Lock } from "lucide-react";

interface ManageProDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ManageProDialog({ open, onOpenChange }: ManageProDialogProps) {
  const { user } = useAuth();
  const { customerInfo, refreshCustomerInfo } = useRevenueCat();
  const { toast } = useToast();
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelStep, setCancelStep] = useState<'password' | 'reason'>('password');
  const [cancelPassword, setCancelPassword] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [cancelReasonOther, setCancelReasonOther] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const { data: subscriptionStatus } = useQuery<{
    isPro: boolean;
    isCancelled: boolean;
    proSubscriptionEndDate: string | null;
    proSubscriptionType: string | null;
  }>({
    queryKey: ["/api/subscription/status"],
    queryFn: async () => {
      const res = await fetch("/api/subscription/status", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch subscription status");
      return res.json();
    },
    enabled: open && !!user?.isPro,
  });

  const isCancelled = subscriptionStatus?.isCancelled || false;

  const proEntitlement = customerInfo?.entitlements?.active?.["pro"];
  const subscriptionType = user?.proSubscriptionType || "Pro";
  const startDate = user?.proSubscriptionStartDate 
    ? new Date(user.proSubscriptionStartDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;
  
  const expirationDate = proEntitlement?.expirationDate
    ? new Date(proEntitlement.expirationDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : user?.proSubscriptionEndDate
    ? new Date(user.proSubscriptionEndDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  const managementUrl = customerInfo?.managementURL;

  const handleManageSubscription = () => {
    if (managementUrl) {
      window.open(managementUrl, '_blank');
    }
  };

  const handleVerifyPassword = async () => {
    setPasswordError('');
    setCancelling(true);
    try {
      const response = await apiRequest("POST", "/api/auth/verify-password", { password: cancelPassword });
      const data = await response.json();
      if (data.verified) {
        setCancelStep('reason');
      } else {
        setPasswordError('Incorrect password. Please try again.');
      }
    } catch (error: any) {
      setPasswordError(error.message || 'Failed to verify password. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  const handleCancelSubscription = async () => {
    const reason = cancelReason === 'other' ? cancelReasonOther : cancelReason;
    if (!reason) return;

    setCancelling(true);
    try {
      const response = await apiRequest("POST", "/api/subscription/cancel", { reason });
      const data = await response.json();
      
      if (data.success) {
        await refreshCustomerInfo();
        await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        await queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
        
        toast({
          title: "Subscription cancelled",
          description: data.message || "Your Pro subscription has been cancelled.",
          variant: "gamefolioSuccess",
        });
        resetCancelState();
      } else if (data.useManagementUrl && managementUrl) {
        window.open(managementUrl, '_blank');
        toast({
          title: "Manage subscription",
          description: "Please cancel your subscription through the billing portal.",
        });
        resetCancelState();
      }
    } catch (error: any) {
      const message = error.message || "Failed to cancel subscription. Please try again.";
      if (message.includes("already cancelled")) {
        await queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
        toast({
          title: "Already cancelled",
          description: message,
        });
        resetCancelState();
      } else {
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
      }
    } finally {
      setCancelling(false);
    }
  };

  const resetCancelState = () => {
    setShowCancelConfirm(false);
    setCancelStep('password');
    setCancelPassword('');
    setCancelReason('');
    setCancelReasonOther('');
    setPasswordError('');
  };

  const proFeatures = [
    "Unlimited video and screenshot uploads",
    "500MB video file size limit",
    "100MB image file size limit",
    "Access to all avatar borders",
    "No video ads",
    "Monthly bonus lootboxes",
    "Priority support",
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              Manage Pro Subscription
            </DialogTitle>
            <DialogDescription>
              View and manage your Gamefolio Pro subscription
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Card className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Crown className="h-6 w-6 text-yellow-500" />
                    <span className="font-semibold text-lg">Gamefolio Pro</span>
                  </div>
                  <Badge className="bg-yellow-500 text-black hover:bg-yellow-600">
                    {subscriptionType}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm text-muted-foreground">
                  {startDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Member since: {startDate}</span>
                    </div>
                  )}
                  {isCancelled && expirationDate ? (
                    <div className="flex items-center gap-2 text-yellow-500">
                      <Clock className="h-4 w-4" />
                      <span>Pro access ends: {expirationDate}</span>
                    </div>
                  ) : expirationDate ? (
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      <span>Next billing: {expirationDate}</span>
                    </div>
                  ) : null}
                </div>
                {isCancelled && (
                  <div className="mt-3 p-2 rounded-md bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-xs text-center">
                    Your subscription has been cancelled. You'll retain Pro access until the date above.
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-2">
              <h4 className="font-medium text-sm">Your Pro benefits:</h4>
              <ul className="space-y-1.5">
                {proFeatures.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            {managementUrl && (
              <Button
                variant="ghost"
                className="w-full text-muted-foreground hover:text-foreground"
                onClick={handleManageSubscription}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Billing Portal
              </Button>
            )}
            {!isCancelled && (
              <Button
                variant="ghost"
                className="w-full text-red-500 hover:text-red-600 hover:bg-red-500/10"
                onClick={() => {
                  resetCancelState();
                  setShowCancelConfirm(true);
                }}
              >
                Cancel Subscription
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCancelConfirm} onOpenChange={(open) => { if (!open) resetCancelState(); }}>
        <DialogContent className="sm:max-w-md">
          {cancelStep === 'password' ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-red-500" />
                  Confirm Your Identity
                </DialogTitle>
                <DialogDescription>
                  Please enter your password to proceed with cancelling your Pro subscription.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <label htmlFor="cancel-password" className="text-sm font-medium text-foreground">Password</label>
                  <input
                    id="cancel-password"
                    type="password"
                    placeholder="Enter your password"
                    value={cancelPassword}
                    onChange={(e) => { setCancelPassword(e.target.value); setPasswordError(''); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' && cancelPassword) handleVerifyPassword(); }}
                    className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  {passwordError && (
                    <p className="text-sm text-red-500">{passwordError}</p>
                  )}
                </div>
              </div>
              <DialogFooter className="flex-col gap-2 sm:flex-row">
                <Button variant="outline" onClick={resetCancelState} disabled={cancelling}>
                  Go Back
                </Button>
                <Button
                  onClick={handleVerifyPassword}
                  disabled={cancelling || !cancelPassword}
                  className="bg-red-500 hover:bg-red-600"
                >
                  {cancelling ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Continue"
                  )}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  Why are you cancelling?
                </DialogTitle>
                <DialogDescription>
                  We'd love to know why you're leaving so we can improve. Your feedback helps us make Gamefolio better for everyone.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  {[
                    "Too expensive",
                    "Not using it enough",
                    "Missing features I need",
                    "Found an alternative",
                    "Technical issues",
                    "Other",
                  ].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setCancelReason(option === "Other" ? "other" : option)}
                      className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors ${
                        cancelReason === (option === "Other" ? "other" : option)
                          ? "border-red-500 bg-red-500/10 text-foreground"
                          : "border-border hover:border-muted-foreground/30 hover:bg-muted/50 text-muted-foreground"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>

                {cancelReason === 'other' && (
                  <textarea
                    placeholder="Please tell us more..."
                    value={cancelReasonOther}
                    onChange={(e) => setCancelReasonOther(e.target.value)}
                    className="w-full min-h-[80px] px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
                )}

                <div className="p-3 rounded-md bg-yellow-500/10 border border-yellow-500/20 text-sm text-muted-foreground">
                  <p>Your access will continue until the end of your current billing period.</p>
                </div>
              </div>
              <DialogFooter className="flex-col gap-2 sm:flex-row">
                <Button variant="outline" onClick={() => setCancelStep('password')} disabled={cancelling}>
                  Go Back
                </Button>
                <Button
                  onClick={handleCancelSubscription}
                  disabled={cancelling || !cancelReason || (cancelReason === 'other' && !cancelReasonOther.trim())}
                  className="bg-red-500 hover:bg-red-600"
                >
                  {cancelling ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    "Confirm Cancellation"
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
