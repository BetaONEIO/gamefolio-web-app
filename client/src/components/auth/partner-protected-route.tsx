import { useAuth } from "@/hooks/use-auth";
import { Lock } from "lucide-react";
import { Redirect, Route } from "wouter";
import { Button } from "@/components/ui/button";
import { FullScreenLoader } from "@/components/ui/game-loader";
import { isPartnerType, type PartnerType } from "@shared/partner-access";

const LABELS: Record<PartnerType, string> = {
  streamer: "Streamer Partner",
  indie: "Indie Developer Partner",
};

/**
 * Route guard for the paid partner dashboards. Requires an authenticated user
 * holding the given partner subscription (isPartner + partnerType). Admins
 * bypass so the pages stay reviewable/testable.
 *
 * Gates on the PAID entitlement, not the self-selected `userType` persona tags.
 */
export function PartnerProtectedRoute({
  path,
  partnerType,
  component: Component,
}: {
  path: string;
  partnerType: PartnerType;
  component: React.ComponentType<any>;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>{() => <FullScreenLoader isLoading={true} />}</Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>{() => <Redirect to="/auth" />}</Route>
    );
  }

  const allowed = user.role === "admin" || isPartnerType(user, partnerType);
  if (!allowed) {
    return (
      <Route path={path}>
        {() => (
          <div className="container mx-auto p-6 text-center">
            <div className="max-w-md mx-auto">
              <Lock className="h-16 w-16 text-primary mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-4">
                {LABELS[partnerType]} Only
              </h1>
              <p className="text-muted-foreground mb-6">
                This dashboard is available to {LABELS[partnerType]} members.
                Upgrade your subscription to unlock it.
              </p>
              <Button onClick={() => window.history.back()}>Go Back</Button>
            </div>
          </div>
        )}
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}
