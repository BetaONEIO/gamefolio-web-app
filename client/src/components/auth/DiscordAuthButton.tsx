import { Button } from "@/components/ui/button";
import { FaDiscord } from "react-icons/fa";
import { signInWithDiscord, isDiscordConfigValid } from "@/lib/discord";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface DiscordAuthButtonProps {
  disabled?: boolean;
}

export function DiscordAuthButton({ disabled = false }: DiscordAuthButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleDiscordSignIn = async () => {
    try {
      setIsLoading(true);
      
      // Check if Discord is properly configured
      if (!isDiscordConfigValid) {
        throw new Error('Discord authentication is not properly configured. Missing required environment variables.');
      }
      
      console.log('Starting Discord sign-in...');
      
      // Show user-friendly branding message before authentication
      toast({
        title: "Connecting to Gamefolio",
        description: "Redirecting to secure Discord authentication...",
        variant: "default",
      });
      
      // Initiate Discord OAuth flow (will redirect to Discord)
      await signInWithDiscord();
      
    } catch (error: any) {
      console.error('Discord sign-in error details:', {
        message: error.message,
        fullError: error
      });
      setIsLoading(false);
      
      // More specific error messages
      if (error.message.includes('Discord authentication is not properly configured') || error.message.includes('Discord OAuth not properly configured')) {
        toast({
          title: "Configuration Error",
          description: "Discord sign-in is not properly configured. Please use username/password to log in.",
          variant: "destructive",
        });
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        toast({
          title: "Network Error",
          description: "Please check your internet connection and try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Authentication Error",
          description: `Discord sign-in error: ${error.message}. Please try logging in with username/password.`,
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