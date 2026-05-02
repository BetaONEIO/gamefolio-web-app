import { Button } from "@/components/ui/button";
import { FaXbox } from "react-icons/fa";
import { signInWithXbox, isXboxConfigValid } from "@/lib/xbox";
import { exchangeMobileAuthCode } from "@/lib/mobile-auth";
import { isNative } from "@/lib/platform";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

interface XboxAuthButtonProps {
  disabled?: boolean;
}

export function XboxAuthButton({ disabled = false }: XboxAuthButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const handleXboxSignIn = async () => {
    try {
      setIsLoading(true);

      if (!isXboxConfigValid) {
        throw new Error('Xbox authentication is not properly configured.');
      }

      toast({
        title: "Connecting to Xbox",
        description: isNative
          ? "Opening Xbox / Microsoft authentication..."
          : "Redirecting to secure Microsoft authentication...",
        variant: "default",
      });

      const result = await signInWithXbox();

      if (result && result.kind === 'native') {
        const { user } = await exchangeMobileAuthCode(result.code);
        queryClient.setQueryData(["/api/user"], user);

        if (user?.needsOnboarding) {
          toast({
            title: user?.isNewUser ? "Welcome to Gamefolio!" : "Complete your profile",
            description: user?.isNewUser
              ? "Let's set up your gaming profile."
              : "Finish setting up your gaming profile to continue.",
            variant: "gamefolioSuccess",
          });
          setLocation("/onboarding");
        } else {
          toast({
            title: "Welcome back!",
            description: `You're signed in as ${user?.xboxUsername || user?.displayName || 'gamer'}.`,
            variant: "gamefolioSuccess",
          });
          setLocation("/");
        }
        setIsLoading(false);
        return;
      }
      // Web: redirect already happened; the XboxCallback page finishes login.
    } catch (error: any) {
      console.error('Xbox sign-in error:', error);
      setIsLoading(false);

      const message = error?.message ?? 'Xbox sign-in failed';
      if (message.includes('not properly configured')) {
        toast({
          title: "Configuration Error",
          description: "Xbox sign-in is not set up yet. Please use another login method.",
          variant: "destructive",
        });
      } else if (message.includes('cancelled') || message.includes('Cancelled')) {
        toast({
          title: "Sign-in cancelled",
          description: "Xbox sign-in was cancelled. Please try again.",
          variant: "destructive",
        });
      } else if (message.includes('network') || message.includes('fetch') || message.includes('timed out')) {
        toast({
          title: "Network Error",
          description: "Please check your internet connection and try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Authentication Error",
          description: message || "There was an error signing in with Xbox. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleXboxSignIn}
      disabled={disabled || isLoading}
      className="w-full"
      data-testid="button-xbox-signin"
    >
      <FaXbox className="mr-2 h-4 w-4 text-[#107C10]" />
      {isLoading ? "Connecting..." : "Continue with Xbox"}
    </Button>
  );
}
