import { Button } from "@/components/ui/button";
import { FaApple } from "react-icons/fa";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { nativeSignInWithApple } from "@/lib/mobile-auth";

interface AppleAuthButtonProps {
  disabled?: boolean;
}

/**
 * "Sign in with Apple" button — only rendered on iOS (Capacitor) builds.
 * Required by App Store Review Guideline 4.8 whenever the app offers
 * any other third-party sign-in option.
 */
export function AppleAuthButton({ disabled = false }: AppleAuthButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const handleAppleSignIn = async () => {
    try {
      setIsLoading(true);
      const { user } = await nativeSignInWithApple();
      queryClient.setQueryData(["/api/user"], user);

      if (user?.needsOnboarding) {
        toast({
          title: user?.isNewAppleUser ? "Welcome to Gamefolio!" : "Complete your profile",
          description: user?.isNewAppleUser
            ? "Let's set up your gaming profile."
            : "Finish setting up your gaming profile to continue.",
          variant: "gamefolioSuccess",
        });
        setLocation("/onboarding");
      } else {
        toast({
          title: "Welcome back!",
          description: "You're now signed in with Apple.",
          variant: "gamefolioSuccess",
        });
        setLocation("/");
      }
    } catch (error: any) {
      const message: string = error?.message ?? '';
      // User cancelled the system sheet — silent, no toast.
      if (/cancel/i.test(message) || error?.code === '1001') {
        return;
      }
      console.error('Apple sign-in error:', error);
      toast({
        title: "Apple sign-in failed",
        description: message || 'Please try again.',
        variant: "gamefolioError",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      type="button"
      onClick={handleAppleSignIn}
      disabled={disabled || isLoading}
      className="w-full bg-black text-white hover:bg-black/90 border border-white/10"
      data-testid="button-apple-signin"
    >
      <FaApple className="mr-2 h-4 w-4" />
      {isLoading ? "Signing in..." : "Continue with Apple"}
    </Button>
  );
}
