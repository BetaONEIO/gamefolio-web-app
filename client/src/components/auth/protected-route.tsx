import { useAuth } from "@/hooks/use-auth";
import { Redirect, Route } from "wouter";
import { FullScreenLoader } from "@/components/ui/game-loader";
import { useAuthModal } from "@/hooks/use-auth-modal";
import { useEffect } from "react";

// Modified to avoid type issues with wouter's RouteProps
export function ProtectedRoute({ 
  path, 
  component: Component 
}: { 
  path: string; 
  component: React.ComponentType<any>; 
}) {
  const { user, isLoading } = useAuth();
  const { openModal } = useAuthModal();

  if (isLoading) {
    return (
      <Route path={path}>
        {() => <FullScreenLoader isLoading={true} />}
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        {() => {
          // Open auth modal and stay on current page
          useEffect(() => {
            openModal();
          }, []);
          
          return (
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-center">
                <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
                <p className="text-muted-foreground">Please log in to access this page.</p>
              </div>
            </div>
          );
        }}
      </Route>
    );
  }

  // Check if user needs to complete onboarding
  const needsOnboarding = !user.userType || !user.ageRange;
  if (needsOnboarding) {
    return (
      <Route path={path}>
        {() => <Redirect to="/onboarding" />}
      </Route>
    );
  }

  return (
    <Route path={path}>
      {(params) => <Component {...params} />}
    </Route>
  );
}