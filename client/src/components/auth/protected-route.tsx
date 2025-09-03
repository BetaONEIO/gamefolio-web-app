import { useAuth } from "@/hooks/use-auth";
import { Redirect, Route } from "wouter";
import { FullScreenLoader } from "@/components/ui/game-loader";

// Modified to avoid type issues with wouter's RouteProps
export function ProtectedRoute({ 
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

  if (!user) {
    return (
      <Route path={path}>
        {() => <Redirect to="/auth" />}
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