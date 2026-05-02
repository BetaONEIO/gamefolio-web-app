import { Button } from "@/components/ui/button";
import { FaGoogle } from "react-icons/fa";
import { signInWithGoogle } from "@/lib/firebase";
import { nativeSignInWithGoogle } from "@/lib/mobile-auth";
import { isNative } from "@/lib/platform";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

interface GoogleAuthButtonProps {
  disabled?: boolean;
}

export function GoogleAuthButton({ disabled = false }: GoogleAuthButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);

      if (!import.meta.env.VITE_FIREBASE_API_KEY || !import.meta.env.VITE_FIREBASE_PROJECT_ID || !import.meta.env.VITE_FIREBASE_APP_ID) {
        throw new Error('Firebase configuration is incomplete. Missing required environment variables.');
      }

      toast({
        title: "Connecting to Gamefolio",
        description: "Opening secure Google authentication...",
        variant: "default",
      });

      if (isNative) {
        // Native flow: use the @capacitor-firebase/authentication plugin so
        // the system Google chooser appears, then exchange the profile for
        // JWT tokens via the backend mobile endpoint.
        const { user } = await nativeSignInWithGoogle();
        queryClient.setQueryData(["/api/user"], user);

        if (user?.needsOnboarding) {
          toast({
            title: user?.isNewGoogleUser ? "Welcome to Gamefolio!" : "Complete your profile",
            description: user?.isNewGoogleUser
              ? "Let's set up your gaming profile."
              : "Finish setting up your gaming profile to continue.",
            variant: "gamefolioSuccess",
          });
          setLocation("/onboarding");
        } else {
          toast({
            title: "Welcome back!",
            description: "You're now signed in with Google.",
            variant: "gamefolioSuccess",
          });
          setLocation("/");
        }
        setIsLoading(false);
        return;
      }

      // Web: Firebase popup. The auth-state listener in use-auth.tsx
      // handles user creation/login + navigation.
      const result = await signInWithGoogle();
      if (result?.user) {
        toast({
          title: "Welcome to Gamefolio!",
          description: "Successfully authenticated with Google",
          variant: "gamefolioSuccess",
        });
      }
    } catch (error: any) {
      console.error('Google sign-in error details:', {
        message: error?.message,
        code: error?.code,
        fullError: error,
      });
      setIsLoading(false);

      const code = error?.code as string | undefined;
      const message = error?.message ?? '';
      if (message.includes('Firebase configuration') || message.includes('Firebase not properly configured')) {
        toast({
          title: "Configuration Error",
          description: "Google sign-in is not properly configured. Please use username/password to log in.",
          variant: "gamefolioError",
        });
      } else if (code === 'auth/configuration-not-found') {
        toast({
          title: "Google Sign-in Unavailable",
          description: "Google sign-in needs to be enabled. Please use username/password to log in.",
          variant: "gamefolioError",
        });
      } else if (code === 'auth/popup-blocked') {
        toast({
          title: "Popup Blocked",
          description: "Please allow popups for this site and try again.",
          variant: "gamefolioError",
        });
      } else if (code === 'auth/popup-closed-by-user' || message.includes('cancel')) {
        toast({
          title: "Sign-in Cancelled",
          description: "Google sign-in was cancelled. Please try again.",
          variant: "gamefolioError",
        });
      } else if (code === 'auth/network-request-failed') {
        toast({
          title: "Network Error",
          description: "Please check your internet connection and try again.",
          variant: "gamefolioError",
        });
      } else {
        toast({
          title: "Authentication Error",
          description: `Google sign-in error: ${message || 'Unknown error'}.`,
          variant: "gamefolioError",
        });
      }
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleGoogleSignIn}
      disabled={disabled || isLoading}
      className="w-full"
    >
      <FaGoogle className="mr-2 h-4 w-4" />
      {isLoading ? "Signing in..." : "Continue with Google"}
    </Button>
  );
}
