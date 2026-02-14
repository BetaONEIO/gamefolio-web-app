import { useState } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useRevenueCat } from "@/hooks/use-revenuecat";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Lock, AlertTriangle, Calendar, Tag, Wallet, CheckCircle2, X } from "lucide-react";

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
  const subscriptionType = user?.proSubscriptionType || "monthly";
  const isYearly = subscriptionType?.toLowerCase().includes("year");
  const planLabel = isYearly ? "Pro Annual Plan" : "Pro Monthly Plan";
  const priceLabel = isYearly ? "£30.00 / year" : "£2.99 / month";

  const rawEndDate = subscriptionStatus?.proSubscriptionEndDate
    || proEntitlement?.expirationDate
    || user?.proSubscriptionEndDate;

  const renewalDate = rawEndDate
    ? new Date(rawEndDate).toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

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
        queryClient.setQueryData(["/api/subscription/status"], (old: any) => ({
          ...old,
          isCancelled: true,
          proSubscriptionEndDate: data.endDate || old?.proSubscriptionEndDate,
        }));

        refreshCustomerInfo().catch(() => {});
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });

        toast({
          title: "Subscription cancelled",
          description: data.message || "Your Pro subscription has been cancelled.",
          variant: "gamefolioSuccess",
        });
        resetCancelState();
      } else if (data.useManagementUrl) {
        const managementUrl = customerInfo?.managementURL;
        if (managementUrl) window.open(managementUrl, '_blank');
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
        toast({ title: "Already cancelled", description: message });
        resetCancelState();
      } else {
        toast({ title: "Error", description: message, variant: "destructive" });
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

  const benefits = [
    "Unlimited Cloud Storage",
    "No Advertisements",
    "Premium Asset Library",
    "Animated Profile Pictures",
    "Exclusive Avatar Borders",
    "Monthly Bonus Lootboxes",
  ];

  if (showCancelConfirm) {
    return (
      <>
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="p-0 border-0 bg-transparent shadow-none max-w-md md:max-w-lg [&>button]:hidden">
            <div className="bg-[#020617] rounded-2xl overflow-hidden border border-slate-800/50 flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between px-4 py-4 border-b border-slate-800/50 backdrop-blur-md bg-[#020617]/80 shrink-0">
                <button onClick={resetCancelState} className="p-2 rounded-full hover:bg-slate-800 transition-colors">
                  <ArrowLeft className="h-5 w-5 text-slate-50" />
                </button>
                <span className="text-slate-50 font-bold text-lg">Cancel Subscription</span>
                <button onClick={() => { resetCancelState(); onOpenChange(false); }} className="p-2 rounded-full hover:bg-slate-800 transition-colors">
                  <X className="h-5 w-5 text-slate-50" />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 p-6">
                {cancelStep === 'password' ? (
                  <div className="space-y-5">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="bg-red-500/20 rounded-full p-3">
                        <Lock className="h-6 w-6 text-red-400" />
                      </div>
                      <div>
                        <h3 className="text-slate-50 font-bold text-lg">Confirm Your Identity</h3>
                        <p className="text-slate-400 text-sm">Enter your password to continue</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="cancel-password" className="text-xs font-bold text-slate-400 uppercase tracking-wider">Password</label>
                      <input
                        id="cancel-password"
                        type="password"
                        placeholder="Enter your password"
                        value={cancelPassword}
                        onChange={(e) => { setCancelPassword(e.target.value); setPasswordError(''); }}
                        onKeyDown={(e) => { if (e.key === 'Enter' && cancelPassword) handleVerifyPassword(); }}
                        className="w-full px-4 py-3 rounded-2xl border border-slate-700/50 bg-[#0f172a] text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                      />
                      {passwordError && (
                        <p className="text-sm text-red-400">{passwordError}</p>
                      )}
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={resetCancelState}
                        disabled={cancelling}
                        className="flex-1 py-4 rounded-2xl bg-[#1e293b] text-slate-50 font-bold text-base hover:bg-slate-700 transition-colors"
                      >
                        Go Back
                      </button>
                      <button
                        onClick={handleVerifyPassword}
                        disabled={cancelling || !cancelPassword}
                        className="flex-1 py-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 font-bold text-base hover:bg-red-500/20 transition-colors disabled:opacity-50"
                      >
                        {cancelling ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : "Continue"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="bg-yellow-500/20 rounded-full p-3">
                        <AlertTriangle className="h-6 w-6 text-yellow-400" />
                      </div>
                      <div>
                        <h3 className="text-slate-50 font-bold text-lg">Why are you leaving?</h3>
                        <p className="text-slate-400 text-sm">Your feedback helps us improve</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {[
                        "Too expensive",
                        "Not using it enough",
                        "Missing features I need",
                        "Found an alternative",
                        "Technical issues",
                        "Other",
                      ].map((option) => {
                        const val = option === "Other" ? "other" : option;
                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() => setCancelReason(val)}
                            className={`w-full text-left px-4 py-3.5 rounded-2xl border text-sm transition-colors ${
                              cancelReason === val
                                ? "border-red-500/50 bg-red-500/10 text-slate-50"
                                : "border-slate-700/30 bg-[#1e293b]/30 hover:border-slate-600 text-slate-400"
                            }`}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>

                    {cancelReason === 'other' && (
                      <textarea
                        placeholder="Please tell us more..."
                        value={cancelReasonOther}
                        onChange={(e) => setCancelReasonOther(e.target.value)}
                        className="w-full min-h-[80px] px-4 py-3 rounded-2xl border border-slate-700/50 bg-[#0f172a] text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 resize-none"
                      />
                    )}

                    <div className="p-4 rounded-2xl bg-yellow-500/5 border border-yellow-500/20 text-sm text-slate-400 text-center">
                      {renewalDate
                        ? `If you cancel now, you will still have access to Pro features until ${renewalDate}.`
                        : "Your access will continue until the end of your current billing period."}
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => setCancelStep('password')}
                        disabled={cancelling}
                        className="flex-1 py-4 rounded-2xl bg-[#1e293b] text-slate-50 font-bold text-base hover:bg-slate-700 transition-colors"
                      >
                        Go Back
                      </button>
                      <button
                        onClick={handleCancelSubscription}
                        disabled={cancelling || !cancelReason || (cancelReason === 'other' && !cancelReasonOther.trim())}
                        className="flex-1 py-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 font-bold text-base hover:bg-red-500/20 transition-colors disabled:opacity-50"
                      >
                        {cancelling ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : "Confirm Cancel"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 border-0 bg-transparent shadow-none max-w-md md:max-w-lg [&>button]:hidden">
        <div className="bg-[#020617] rounded-2xl overflow-hidden border border-slate-800/50 flex flex-col max-h-[90vh]">
          <div className="flex items-center justify-between px-4 py-4 border-b border-slate-800/50 backdrop-blur-md bg-[#020617]/80 shrink-0">
            <div className="w-10 h-10" />
            <span className="text-slate-50 font-bold text-lg">Manage Subscription</span>
            <button onClick={() => onOpenChange(false)} className="p-2 rounded-full hover:bg-slate-800 transition-colors">
              <X className="h-5 w-5 text-slate-50" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1">
            <div className="bg-gradient-to-b from-green-900/20 to-transparent px-6 pt-8 pb-6 flex flex-col items-center text-center gap-3">
              <div className="bg-green-900/30 rounded-full p-4 shadow-[0_0_0_4px_rgba(20,83,45,0.1)]">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" clipRule="evenodd" d="M26.7887 19.1012L27.046 16.5758C27.1833 15.2278 27.2727 14.3385 27.202 13.7772H27.2287C28.39 13.7772 29.3327 12.7825 29.3327 11.5558C29.3327 10.3292 28.39 9.33317 27.2273 9.33317C26.0647 9.33317 25.122 10.3278 25.122 11.5558C25.122 12.1105 25.3153 12.6185 25.634 13.0078C25.1767 13.3052 24.578 13.9345 23.6767 14.8812C22.9833 15.6105 22.6367 15.9745 22.25 16.0318C22.0352 16.0625 21.8161 16.03 21.6193 15.9385C21.262 15.7732 21.0233 15.3225 20.5473 14.4198L18.0353 9.6665C17.742 9.1105 17.4953 8.64517 17.2727 8.2705C18.1833 7.77984 18.806 6.78117 18.806 5.6305C18.806 3.99184 17.55 2.6665 15.9993 2.6665C14.4487 2.6665 13.1927 3.99317 13.1927 5.62917C13.1927 6.78117 13.8153 7.77984 14.726 8.26917C14.5033 8.64517 14.258 9.1105 13.9633 9.6665L11.4527 14.4212C10.9753 15.3225 10.7367 15.7732 10.3793 15.9398C10.1826 16.0314 9.9635 16.0638 9.74868 16.0332C9.36201 15.9758 9.01535 15.6105 8.32201 14.8812C7.42068 13.9345 6.82201 13.3052 6.36468 13.0078C6.68468 12.6185 6.87668 12.1105 6.87668 11.5545C6.87668 10.3292 5.93268 9.33317 4.77001 9.33317C3.61002 9.33317 2.66602 10.3278 2.66602 11.5558C2.66602 12.7825 3.60868 13.7772 4.77135 13.7772H4.79668C4.72468 14.3372 4.81535 15.2278 4.95268 16.5758L5.21001 19.1012C5.35268 20.5025 5.47135 21.8358 5.61801 23.0372H26.3807C26.5273 21.8372 26.646 20.5025 26.7887 19.1012Z" fill="#4ADE80" />
                  <path fillRule="evenodd" clipRule="evenodd" d="M14.4727 29.3332H17.526C21.506 29.3332 23.4967 29.3332 24.8247 28.0798C25.4033 27.5305 25.7713 26.5438 26.0353 25.2585H5.96335C6.22735 26.5438 6.59401 27.5305 7.17401 28.0785C8.50201 29.3332 10.4927 29.3332 14.4727 29.3332Z" fill="#4ADE80" />
                </svg>
              </div>

              <div className="flex items-center gap-1.5 bg-green-400/10 rounded-full px-3 py-1">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" clipRule="evenodd" d="M11 6C11 8.7615 8.7615 11 6 11C3.2385 11 1 8.7615 1 6C1 3.2385 3.2385 1 6 1C8.7615 1 11 3.2385 11 6ZM8.015 4.485C8.16123 4.63141 8.16123 4.86859 8.015 5.015L5.515 7.515C5.36859 7.66123 5.13141 7.66123 4.985 7.515L3.985 6.515C3.88467 6.42151 3.84338 6.28072 3.87731 6.14786C3.91124 6.01499 4.01499 5.91124 4.14786 5.87731C4.28072 5.84338 4.42151 5.88467 4.515 5.985L5.25 6.72L6.3675 5.6025L7.485 4.485C7.63141 4.33877 7.86859 4.33877 8.015 4.485Z" fill="#4ADE80" />
                </svg>
                {isCancelled ? (
                  <span className="text-yellow-400 text-xs font-bold uppercase tracking-wider">Cancelling</span>
                ) : (
                  <span className="text-green-400 text-xs font-bold uppercase tracking-wider">Active</span>
                )}
              </div>

              <h2 className="text-slate-50 text-2xl font-bold">{planLabel}</h2>
              <p className="text-slate-400 text-sm">Full access to all premium features</p>
            </div>

            <div className="px-6 pb-4">
              <div className="bg-[#0f172a] border border-slate-800/50 rounded-2xl p-5 space-y-5 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="bg-[#1e293b] rounded-2xl p-2.5 shrink-0">
                    <Calendar className="h-5 w-5 text-green-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{isCancelled ? 'Access Until' : 'Renewal Date'}</p>
                    <p className="text-slate-50 text-base">{renewalDate || "—"}</p>
                  </div>
                </div>

                <div className="h-px bg-slate-700/50" />

                <div className="flex items-center gap-3">
                  <div className="bg-[#1e293b] rounded-2xl p-2.5 shrink-0">
                    <Tag className="h-5 w-5 text-green-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Price</p>
                    <p className="text-slate-50 text-base">{priceLabel}</p>
                  </div>
                </div>

                <div className="h-px bg-slate-700/50" />

                <div className="flex items-center gap-3">
                  <div className="bg-[#1e293b] rounded-2xl p-2.5 shrink-0">
                    <Wallet className="h-5 w-5 text-green-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Payment Method</p>
                    <p className="text-slate-50 text-base">Stripe</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 pb-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.1em] mb-4">Included Benefits</p>
              <div className="space-y-2">
                {benefits.map((benefit) => (
                  <div key={benefit} className="flex items-center gap-3 bg-[#1e293b]/30 border border-slate-800/20 rounded-2xl px-3.5 py-3">
                    <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" />
                    <span className="text-slate-50 text-sm font-medium">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-800 px-6 py-6 space-y-3">
              {!isCancelled && (
                <>
                  <button
                    onClick={() => onOpenChange(false)}
                    className="w-full py-4 rounded-2xl bg-[#1e293b] text-slate-50 font-bold text-lg hover:bg-slate-700 transition-colors"
                  >
                    Change Billing Cycle
                  </button>
                  <button
                    onClick={() => {
                      resetCancelState();
                      setShowCancelConfirm(true);
                    }}
                    className="w-full py-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 font-bold text-lg hover:bg-red-500/20 transition-colors"
                  >
                    Cancel Subscription
                  </button>
                  <p className="text-slate-400 text-xs text-center pt-1 leading-relaxed">
                    {renewalDate
                      ? `If you cancel now, you will still have access to Pro features until ${renewalDate}.`
                      : "If you cancel, you will retain access until the end of your current billing period."}
                  </p>
                </>
              )}
              {isCancelled && (
                <div className="p-4 rounded-2xl bg-yellow-500/5 border border-yellow-500/20 text-center">
                  <p className="text-yellow-400 text-sm font-medium mb-1">Subscription Cancelled</p>
                  <p className="text-slate-400 text-xs">
                    {renewalDate
                      ? `You'll retain Pro access until ${renewalDate}.`
                      : "You'll retain Pro access until the end of your billing period."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
