import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useRevenueCat } from "@/hooks/use-revenuecat";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { Crown, Check, Calendar, CreditCard, ExternalLink, AlertTriangle, Loader2, Clock } from "lucide-react";

interface ManageProDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ManageProDialog({ open, onOpenChange }: ManageProDialogProps) {
  const { user } = useAuth();
  const { customerInfo, refreshCustomerInfo } = useRevenueCat();
  const { toast } = useToast();
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const { data: subscriptionStatus } = useQuery<{
    isPro: boolean;
    isCancelled: boolean;
    proSubscriptionEndDate: string | null;
    proSubscriptionType: string | null;
  }>({
    queryKey: ["/api/subscription/status"],
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

  const handleCancelSubscription = async () => {
    setCancelling(true);
    try {
      const response = await apiRequest("POST", "/api/subscription/cancel");
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
        setShowCancelConfirm(false);
      } else if (data.useManagementUrl && managementUrl) {
        window.open(managementUrl, '_blank');
        toast({
          title: "Manage subscription",
          description: "Please cancel your subscription through the billing portal.",
        });
        setShowCancelConfirm(false);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel subscription. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCancelling(false);
    }
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
                onClick={() => setShowCancelConfirm(true)}
              >
                Cancel Subscription
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Cancel Pro Subscription?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>Are you sure you want to cancel your Gamefolio Pro subscription?</p>
                <p className="text-sm font-medium">You'll lose access to:</p>
                <ul className="text-sm list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Unlimited uploads</li>
                  <li>Higher file size limits</li>
                  <li>Exclusive avatar borders</li>
                  <li>Ad-free experience</li>
                  <li>Monthly bonus lootboxes</li>
                </ul>
                <p className="text-sm">
                  Your access will continue until the end of your current billing period.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Keep Pro</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleCancelSubscription();
              }}
              disabled={cancelling}
              className="bg-red-500 hover:bg-red-600"
            >
              {cancelling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                "Yes, Cancel"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
