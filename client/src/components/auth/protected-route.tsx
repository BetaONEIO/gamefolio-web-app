import { useAuth } from "@/hooks/use-auth";
import { Redirect, Route } from "wouter";
import { FullScreenLoader } from "@/components/ui/game-loader";
import { useAuthModal } from "@/hooks/use-auth-modal";
import { useEffect, useRef } from "react";

// Signed-out prompt for a matched protected route. This has to be its own
// component: wouter calls function `children` during Route's render, so a
// hook inside that callback is a hook of Route itself and only runs on the
// signed-out branch. Leaving that branch (login, or /api/user resolving)
// then renders fewer hooks and React throws.
function AuthenticationRequired() {
  const { openModal } = useAuthModal();
  const openModalRef = useRef(openModal);
  openModalRef.current = openModal;

  useEffect(() => {
    openModalRef.current();
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
        <p className="text-muted-foreground">Please log in to access this page.</p>
      </div>
    </div>
  );
}

// Modified to avoid type issues with wouter's RouteProps
export function ProtectedRoute({ 
  path, 
  component: Component 
}: { 
  path: string; 
  component: React.ComponentType<any>; 
}) {
  const { user, isLoading, authResolved } = useAuth();

  // Wait for auth to genuinely resolve, not merely for isLoading to drop.
  // Before the Firebase check completes the /api/user query is disabled, which
  // reports isLoading:false with no user — treating that as "logged out" sent
  // signed-in users away from deep links into guarded routes.
  if (isLoading || !authResolved) {
    return (
      <Route path={path}>
        {() => <FullScreenLoader isLoading={true} />}
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        {() => <AuthenticationRequired />}
      </Route>
    );
  }

  // Check if user needs to complete onboarding
  const needsOnboarding = !user.userType;
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
