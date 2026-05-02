import { Button } from "@/components/ui/button";
import { FaDiscord } from "react-icons/fa";
import { signInWithDiscord, isDiscordConfigValid } from "@/lib/discord";
import { exchangeMobileAuthCode } from "@/lib/mobile-auth";
import { isNative } from "@/lib/platform";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

interface DiscordAuthButtonProps {
  disabled?: boolean;
}

export function DiscordAuthButton({ disabled = false }: DiscordAuthButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const handleDiscordSignIn = async () => {
    try {
      setIsLoading(true);

      if (!isDiscordConfigValid) {
        throw new Error('Discord authentication is not properly configured. Missing required environment variables.');
      }

      toast({
        title: "Connecting to Gamefolio",
        description: isNative
          ? "Opening Discord authentication..."
          : "Redirecting to secure Discord authentication...",
        variant: "default",
      });

      const result = await signInWithDiscord();

      // Native: signInWithDiscord returned a one-time auth code via deep link
      if (result && result.kind === 'native') {
        const { user } = await exchangeMobileAuthCode(result.code);
        queryClient.setQueryData(["/api/user"], user);

        if (user?.needsOnboarding) {
          toast({
            title: user?.isNewDiscordUser || user?.isNewUser ? "Welcome to Gamefolio!" : "Complete your profile",
            description: user?.isNewDiscordUser || user?.isNewUser
              ? "Let's set up your gaming profile."
              : "Finish setting up your gaming profile to continue.",
            variant: "gamefolioSuccess",
          });
          setLocation("/onboarding");
        } else {
          toast({
            title: "Welcome back!",
            description: "You're now signed in with Discord.",
            variant: "gamefolioSuccess",
          });
          setLocation("/");
        }
        setIsLoading(false);
        return;
      }
      // Web: full-page redirect to Discord just happened, nothing more to do.
    } catch (error: any) {
      console.error('Discord sign-in error details:', {
        message: error?.message,
        fullError: error,
      });
      setIsLoading(false);

      const message = error?.message ?? 'Discord sign-in failed';
      if (message.includes('not properly configured') || message.includes('OAuth not properly configured')) {
        toast({
          title: "Configuration Error",
          description: "Discord sign-in is not properly configured. Please use username/password to log in.",
          variant: "destructive",
        });
      } else if (message.includes('cancelled') || message.includes('Cancelled')) {
        toast({
          title: "Sign-in cancelled",
          description: "Discord sign-in was cancelled. Please try again.",
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
          description: `Discord sign-in error: ${message}.`,
          variant: "destructive",
        });
      }
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleDiscordSignIn}
      disabled={disabled || isLoading}
      className="w-full"
      data-testid="button-discord-signin"
    >
      <FaDiscord className="mr-2 h-4 w-4 text-[#5865F2]" />
      {isLoading ? "Connecting..." : "Continue with Discord"}
    </Button>
  );
}
