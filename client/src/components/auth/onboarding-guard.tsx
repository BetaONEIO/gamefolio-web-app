import { ReactNode, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { FullScreenLoader } from "@/components/ui/game-loader";

interface OnboardingGuardProps {
  children: ReactNode;
}

export function OnboardingGuard({ children }: OnboardingGuardProps) {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  // Check if user needs onboarding
  const needsOnboarding = user && (!user.userType || !user.ageRange);

  // Routes that should bypass onboarding checks
  const bypassRoutes = [
    '/auth', 
    '/onboarding', 
    '/verify-email', 
    '/verify-code',
    '/reset-password', 
    '/terms', 
    '/privacy', 
    '/contact', 
    '/help',
    '/view/',  // Prefix for view routes
    '/admin'   // Prefix for admin routes - admins can access without completing onboarding
  ];
  
  const shouldBypass = bypassRoutes.some(route => 
    route.endsWith('/') ? location.startsWith(route) : location === route
  );

  useEffect(() => {
    if (!isLoading && user && needsOnboarding && !shouldBypass) {
      // Redirect to onboarding if user hasn't completed it
      if (location !== "/onboarding") {
        // Replace history entry to prevent back navigation
        window.history.replaceState(null, "", "/onboarding");
        setLocation("/onboarding");
      }
    }
  }, [user, isLoading, needsOnboarding, shouldBypass, location, setLocation]);

  // Show loading while auth is checking
  if (isLoading) {
    return <FullScreenLoader isLoading={true} />;
  }

  // If user needs onboarding and we're not on a bypass route, redirect
  if (needsOnboarding && !shouldBypass) {
    return <FullScreenLoader isLoading={true} />;
  }

  return <>{children}</>;
}