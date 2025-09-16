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

  // Routes that should bypass onboarding checks (including guest-accessible routes)
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

  // Guest-accessible routes (public routes that don't require authentication)
  const guestAccessibleRoutes = [
    '/', // Homepage
    '/clip/', '/clips/', '/reel/', '/reels/', // Content viewing
    '/screenshots/', 
    '/profile/', '/@', // Public profiles
  ];
  
  const shouldBypass = bypassRoutes.some(route => 
    route.endsWith('/') ? location.startsWith(route) : location === route
  );

  // Check if current location is a guest-accessible route
  const isGuestAccessible = guestAccessibleRoutes.some(route => {
    if (route === '/') return location === '/';
    return location.startsWith(route);
  }) || location.match(/^\/[^\/]+$/); // Match username routes like /username

  useEffect(() => {
    if (!isLoading && user && needsOnboarding && !shouldBypass && !isGuestAccessible) {
      // Redirect to onboarding if user hasn't completed it
      if (location !== "/onboarding") {
        // Replace history entry to prevent back navigation
        window.history.replaceState(null, "", "/onboarding");
        setLocation("/onboarding");
      }
    }
  }, [user, isLoading, needsOnboarding, shouldBypass, isGuestAccessible, location, setLocation]);

  // Show loading while auth is checking
  if (isLoading) {
    return <FullScreenLoader isLoading={true} />;
  }

  // If user needs onboarding and we're not on a bypass route or guest-accessible route, redirect
  if (needsOnboarding && !shouldBypass && !isGuestAccessible) {
    return <FullScreenLoader isLoading={true} />;
  }

  return <>{children}</>;
}