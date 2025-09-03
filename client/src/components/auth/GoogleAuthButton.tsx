import { Button } from "@/components/ui/button";
import { FaGoogle } from "react-icons/fa";
import { signInWithGoogle } from "@/lib/firebase";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface GoogleAuthButtonProps {
  disabled?: boolean;
}

export function GoogleAuthButton({ disabled = false }: GoogleAuthButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      
      // Debug Firebase configuration
      console.log('Firebase config check:', {
        hasApiKey: !!import.meta.env.VITE_FIREBASE_API_KEY,
        hasProjectId: !!import.meta.env.VITE_FIREBASE_PROJECT_ID,
        hasAppId: !!import.meta.env.VITE_FIREBASE_APP_ID,
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY?.substring(0, 10) + '...', // Show first 10 chars for debugging
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID
      });
      
      // Check if Firebase is properly configured
      if (!import.meta.env.VITE_FIREBASE_API_KEY || !import.meta.env.VITE_FIREBASE_PROJECT_ID || !import.meta.env.VITE_FIREBASE_APP_ID) {
        throw new Error('Firebase configuration is incomplete. Missing required environment variables.');
      }
      
      console.log('Starting Google sign-in...');
      
      // Show user-friendly branding message before authentication
      toast({
        title: "Connecting to Gamefolio",
        description: "Opening secure Google authentication...",
        variant: "default",
      });
      
      const result = await signInWithGoogle();
      
      if (result?.user) {
        console.log('Google sign-in successful:', result.user.email);
        toast({
          title: "Welcome to Gamefolio!",
          description: "Successfully authenticated with Google",
          variant: "gamefolioSuccess",
        });
      }
    } catch (error: any) {
      console.error('Google sign-in error details:', {
        message: error.message,
        code: error.code,
        fullError: error
      });
      setIsLoading(false);
      
      // More specific error messages
      if (error.message.includes('Firebase configuration') || error.message.includes('Firebase not properly configured')) {
        toast({
          title: "Configuration Error",
          description: "Google sign-in is not properly configured. Please use username/password to log in.",
          variant: "destructive",
        });
      } else if (error.code === 'auth/configuration-not-found') {
        toast({
          title: "Google Sign-in Unavailable",
          description: "Google sign-in needs to be enabled. Please use username/password to log in. Demo account: demo@gamefolio.com / password",
          variant: "destructive",
        });
      } else if (error.code === 'auth/popup-blocked') {
        toast({
          title: "Popup Blocked",
          description: "Please allow popups for this site and try again.",
          variant: "destructive",
        });
      } else if (error.code === 'auth/popup-closed-by-user') {
        toast({
          title: "Sign-in Cancelled",
          description: "Google sign-in was cancelled. Please try again.",
          variant: "destructive",
        });
      } else if (error.code === 'auth/network-request-failed') {
        toast({
          title: "Network Error",
          description: "Please check your internet connection and try again.",
          variant: "destructive",
        });
      } else if (error.code === 'auth/invalid-api-key') {
        toast({
          title: "Configuration Error",
          description: "Invalid Firebase configuration. Please contact support.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Authentication Error",
          description: `Google sign-in error: ${error.message}. Please try logging in with username/password.`,
          variant: "destructive",
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