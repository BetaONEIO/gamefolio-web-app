import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import OnboardingFlow from "@/components/auth/onboarding-flow";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { VerificationGuard } from "@/components/auth/verification-guard";

export default function OnboardingPage() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isLoading } = useAuth();

  // Prevent browser navigation away from onboarding
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Check if user still needs onboarding
      if (user && (!user.userType || !user.ageRange)) {
        const message = "You haven't completed your profile setup. Are you sure you want to leave?";
        event.returnValue = message;
        return message;
      }
    };

    const handlePopState = (event: PopStateEvent) => {
      // Check if user still needs onboarding
      if (user && (!user.userType || !user.ageRange)) {
        // Prevent navigation by pushing the current state back
        window.history.pushState(null, '', '/onboarding');
        toast({
          title: "Complete your profile",
          description: "Please finish setting up your profile before continuing",
          variant: "gamefolioError",
        });
      }
    };

    if (user && (!user.userType || !user.ageRange)) {
      window.addEventListener('beforeunload', handleBeforeUnload);
      window.addEventListener('popstate', handlePopState);
      
      // Push current state to prevent back navigation
      window.history.pushState(null, '', '/onboarding');
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [user, toast]);

  useEffect(() => {
    if (!isLoading && !user) {
      // No authenticated user, redirect to auth
      toast({
        title: "Session expired",
        description: "Please log in again to complete your profile setup",
        variant: "destructive",
      });
      setLocation("/auth");
    }
  }, [user, isLoading, setLocation, toast]);

  const handleOnboardingComplete = () => {
    // Navigate to home page after onboarding completion
    setLocation("/");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to auth in useEffect
  }

  return (
    <VerificationGuard requireEmailVerification={true} requireOnboarding={false}>
      <div className="relative min-h-screen flex items-center justify-center p-4">
        {/* Blurred background preview of the app */}
        <div 
          className="absolute inset-0 bg-cover bg-center z-0 bg-no-repeat"
          style={{ 
            backgroundImage: `url(/uploads/background-preview.jpg)`,
            filter: 'blur(8px) brightness(0.3)'
          }}
        ></div>
        
        {/* Content overlay */}
        <div className="relative z-10 w-full max-w-lg md:max-w-5xl">
          <OnboardingFlow
            userId={user.id}
            username={user.username}
            onComplete={handleOnboardingComplete}
          />
        </div>
      </div>
    </VerificationGuard>
  );
}