import { useAuth } from "@/hooks/use-auth";
import { ShieldAlert } from "lucide-react";
import { Redirect, Route } from "wouter";
import { Button } from "@/components/ui/button";
import { FullScreenLoader } from "@/components/ui/game-loader";

export function AdminProtectedRoute({ 
  path, 
  component: Component 
}: { 
  path: string; 
  component: React.ComponentType<any>; 
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        {() => <FullScreenLoader isLoading={true} />}
      </Route>
    );
  }

  // First check if user is authenticated
  if (!user) {
    return (
      <Route path={path}>
        {() => <Redirect to="/auth" />}
      </Route>
    );
  }

  // Then check if user has admin role
  if (user.role !== "admin") {
    return (
      <Route path={path}>
        {() => (
          <div className="container mx-auto p-6 text-center">
            <div className="max-w-md mx-auto">
              <ShieldAlert className="h-16 w-16 text-primary mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-4">Admin Access Required</h1>
              <p className="text-muted-foreground mb-6">
                You don't have permission to access the admin panel. Please contact a system administrator if you believe this is an error.
              </p>
              <Button onClick={() => window.history.back()}>Go Back</Button>
            </div>
          </div>
        )}
      </Route>
    );
  }

  // User is authenticated and has admin role
  return (
    <Route path={path} component={Component} />
  );
}