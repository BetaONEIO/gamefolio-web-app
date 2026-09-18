import { useAuth } from "@/hooks/use-auth";
import { ShieldAlert } from "lucide-react";
import { Redirect, Route } from "wouter";
import { Button } from "@/components/ui/button";
import { FullScreenLoader } from "@/components/ui/game-loader";

export function AdminOrAmbassadorProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: React.ComponentType<any>;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        {() => <FullScreenLoader isLoading />}
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        {() => <Redirect to="/auth" />}
      </Route>
    );
  }

  if (user.role !== "admin" && !user.isAmbassador) {
    return (
      <Route path={path}>
        {() => (
          <div className="container mx-auto p-6 text-center">
            <div className="mx-auto max-w-md">
              <ShieldAlert className="mx-auto mb-4 h-16 w-16 text-primary" />
              <h1 className="mb-4 text-2xl font-bold">Private Feature</h1>
              <p className="mb-6 text-muted-foreground">
                AI clipping is currently available only to Gamefolio Admins and Ambassadors.
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