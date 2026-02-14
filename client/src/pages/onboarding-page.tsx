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
      if (user && (!user.userType || !user.ageRange)) {
        const message = "You haven't completed your profile setup. Are you sure you want to leave?";
        event.returnValue = message;
        return message;
      }
    };

    const handlePopState = (event: PopStateEvent) => {
      if (user && (!user.userType || !user.ageRange)) {
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
      window.history.pushState(null, '', '/onboarding');
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [user, toast]);

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
    <div className="relative min-h-screen flex items-center justify-center p-4 bg-gray-950">
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-gray-950 to-purple-900/10" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-lg md:max-w-5xl">
        <OnboardingFlow
          userId={user.id}
          username={user.username}
          onComplete={handleOnboardingComplete}
        />
      </div>
    </div>
  );
}
