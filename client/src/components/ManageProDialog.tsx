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
import { Crown, Check, Calendar, CreditCard, ExternalLink } from "lucide-react";

interface ManageProDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ManageProDialog({ open, onOpenChange }: ManageProDialogProps) {
  const { user } = useAuth();
  const { customerInfo } = useRevenueCat();

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
                  {expirationDate && (
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      <span>Next billing: {expirationDate}</span>
                    </div>
                  )}
                </div>
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
                Manage Subscription
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
  );
}
