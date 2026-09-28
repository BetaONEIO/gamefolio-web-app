import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import OnboardingFlow from "@/components/auth/onboarding-flow";
import { FullScreenLoader } from "@/components/ui/game-loader";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";
import type { User } from "@shared/schema";

export default function OnboardingPage() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isLoading, authResolved } = useAuth();
  const [isCompleting, setIsCompleting] = useState(false);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (user && !user.userType) {
        const message = "You haven't completed your profile setup. Are you sure you want to leave?";
        event.returnValue = message;
        return message;
      }
    };

    if (authResolved && user && !user.userType) {
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
  }, [authResolved, user]);

  useEffect(() => {
    if (!isLoading && authResolved && !isCompleting && !user) {
      toast({
        title: "Session expired",
        description: "Please log in again to complete your profile setup",
        variant: "destructive",
      });
      setLocation("/auth");
    }
  }, [user, isLoading, authResolved, isCompleting, setLocation, toast]);

  const handleOnboardingComplete = async () => {
    setIsCompleting(true);
    try {
      await queryClient.invalidateQueries({
        queryKey: ["/api/user"],
        exact: true,
        refetchType: "none",
      });
      await queryClient.refetchQueries({
        queryKey: ["/api/user"],
        exact: true,
        type: "active",
      });
      const refreshedUser = queryClient.getQueryData<User | null>(["/api/user"]);
      if (!refreshedUser?.userType) {
        throw new Error("The updated profile could not be confirmed.");
      }

      toast({
        title: "Profile created!",
        description: "Your Gamefolio is ready.",
        variant: "gamefolioSuccess",
      });
      setLocation("/");
    } catch (error) {
      setIsCompleting(false);
      throw error;
    }
  };

  if (isLoading || !authResolved) {
    return (
      <FullScreenLoader
        isLoading
        variant="auth"
        loadingText="LOADING YOUR GAMEFOLIO"
        loadingSubtext="Checking your account..."
      />
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="relative min-h-screen flex flex-col sm:items-center sm:justify-center p-0 sm:p-4 bg-background">
      <div className="relative z-10 w-full min-h-screen sm:min-h-0 max-w-full sm:max-w-lg md:max-w-[1400px]">
        <OnboardingFlow
          userId={user.id}
          username={user.username}
          onComplete={handleOnboardingComplete}
        />
      </div>
      {isCompleting && (
        <div className="fixed inset-0 z-[10000]">
          <FullScreenLoader
            isLoading
            variant="auth"
            loadingText="SETTING UP YOUR GAMEFOLIO"
            loadingSubtext="Getting everything ready..."
          />
        </div>
      )}
    </div>
  );
}
