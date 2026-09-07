import { useAuth } from "@/hooks/use-auth";
import { Lock } from "lucide-react";
import { Redirect, Route } from "wouter";
import { Button } from "@/components/ui/button";
import { FullScreenLoader } from "@/components/ui/game-loader";
import { hasIndieDeveloperAccess, isPartnerType, type PartnerType } from "@shared/partner-access";
import { GAME_DEVELOPER_FEATURES_ENABLED } from "@/lib/feature-flags";

const LABELS: Record<PartnerType, string> = {
  streamer: "Streamer Partner",
  indie: "Indie Developer Partner",
};

/**
 * Route guard for partner dashboards. Indie game management is also available
 * to authenticated Indie Developer persona users, who receive the free-game
 * quota; paid Indie partners receive their subscriber quota.
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
  const { user, isLoading, authResolved } = useAuth();

  // Wait for auth to genuinely resolve, not merely for isLoading to drop.
  // Before the Firebase check completes the /api/user query is disabled, which
  // reports isLoading:false with no user — treating that as "logged out" sent
  // signed-in users to /auth, whose AuthRedirect rewrites the URL to "/", so
  // every deep link into a guarded route bounced to the home page.
  if (isLoading || !authResolved) {
    return (
      <Route path={path}>{() => <FullScreenLoader isLoading={true} />}</Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>{() => <Redirect to="/auth" />}</Route>
    );
  }

  if (partnerType === "indie" && !GAME_DEVELOPER_FEATURES_ENABLED) {
    return (
      <Route path={path}>
        {() => <Redirect to="/" />}
      </Route>
    );
  }

  const allowed = partnerType === "indie"
    ? hasIndieDeveloperAccess(user)
    : user.role === "admin" || isPartnerType(user, partnerType);
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
