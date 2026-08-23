import { useEffect } from "react";
import { useLocation } from "wouter";
import OnboardingFlow from "@/components/auth/onboarding-flow";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export default function OnboardingPage() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (user && !user.userType) {
        const message = "You haven't completed your profile setup. Are you sure you want to leave?";
        event.returnValue = message;
        return message;
      }
    };

    if (user && !user.userType) {
      window.addEventListener('beforeunload', handleBeforeUnload);
      // Keep one sentinel entry behind the first onboarding screen. The flow
      // owns all subsequent entries, so browser/device Back can retrace the
      // actual path instead of being pushed into a loop.
      if (!window.history.state?.onboarding) {
        window.history.replaceState({ onboarding: true, onboardingIndex: 0 }, '', '/onboarding');
        window.history.pushState({ onboarding: true, onboardingIndex: 0, onboardingRoot: true }, '', '/onboarding');
      }
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user]);

  useEffect(() => {
    if (!isLoading && !user) {
      toast({
        title: "Session expired",
        description: "Please log in again to complete your profile setup",
        variant: "destructive",
      });
      setLocation("/auth");
    }
  }, [user, isLoading, setLocation, toast]);

  const handleOnboardingComplete = () => {
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
    return null;
  }

  return (
    <div className="relative min-h-screen flex flex-col sm:items-center sm:justify-center p-0 sm:p-4 bg-[#071013]">
      <div className="relative z-10 w-full min-h-screen sm:min-h-0 max-w-full sm:max-w-lg md:max-w-5xl">
        <OnboardingFlow
          userId={user.id}
          username={user.username}
          onComplete={handleOnboardingComplete}
        />
      </div>
    </div>
  );
}
