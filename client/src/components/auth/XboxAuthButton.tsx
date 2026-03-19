import { Button } from "@/components/ui/button";
import { FaXbox } from "react-icons/fa";
import { signInWithXbox, isXboxConfigValid } from "@/lib/xbox";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface XboxAuthButtonProps {
  disabled?: boolean;
}

export function XboxAuthButton({ disabled = false }: XboxAuthButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleXboxSignIn = async () => {
    try {
      setIsLoading(true);

      if (!isXboxConfigValid) {
        throw new Error('Xbox authentication is not properly configured.');
      }

      toast({
        title: "Connecting to Xbox",
        description: "Redirecting to secure Microsoft authentication...",
        variant: "default"
      });

      await signInWithXbox();
    } catch (error: any) {
      console.error('Xbox sign-in error:', error);
      setIsLoading(false);

      if (error.message.includes('not properly configured')) {
        toast({
          title: "Configuration Error",
          description: "Xbox sign-in is not set up yet. Please use another login method.",
          variant: "destructive"
        });
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        toast({
          title: "Network Error",
          description: "Please check your internet connection and try again.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Authentication Error",
          description: error.message || "There was an error signing in with Xbox. Please try again.",
          variant: "destructive"
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
