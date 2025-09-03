import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { handleDiscordCallback, getDiscordCallbackParams } from '@/lib/discord';
import { useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export function DiscordCallback() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    const processDiscordCallback = async () => {
      try {
        const { code, state, error } = getDiscordCallbackParams();

        if (error) {
          throw new Error(`Discord OAuth error: ${error}`);
        }

        if (!code || !state) {
          throw new Error('Missing authorization code or state parameter');
        }

        toast({
          title: "Processing Discord authentication...",
          description: "Setting up your account",
          variant: "default",
        });

        // Handle Discord callback and get user data
        const discordUser = await handleDiscordCallback(code, state);

        // Send Discord user data to our backend for registration/login
        const response = await apiRequest("POST", "/api/auth/discord", {
          id: discordUser.id,
          username: discordUser.username,
          discriminator: discordUser.discriminator,
          email: discordUser.email,
          avatar: discordUser.avatar
        });

        const userData = await response.json();
        queryClient.setQueryData(["/api/user"], userData);

        // Handle routing based on user status
        if (userData.needsOnboarding) {
          // New Discord user or existing user that needs onboarding
          if (userData.isNewDiscordUser) {
            toast({
              title: "Welcome to Gamefolio!",
              description: "Let's set up your gaming profile.",
              variant: "gamefolioSuccess",
            });
          } else {
            toast({
              title: "Complete your profile",
              description: "Finish setting up your gaming profile to continue.",
              variant: "gamefolioSuccess",
            });
          }
          setLocation("/onboarding");
        } else {
          // Existing user with completed onboarding
          toast({
            title: "Welcome back!",
            description: `You're now signed in with Discord.`,
            variant: "gamefolioSuccess",
          });
          setLocation("/");
        }

      } catch (error: any) {
        console.error('Discord callback error:', error);
        toast({
          title: "Authentication failed",
          description: error.message || "There was an error signing you in with Discord. Please try again.",
          variant: "destructive",
        });
        setLocation("/auth");
      }
    };

    processDiscordCallback();
  }, [setLocation, toast, queryClient]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B2232] via-[#1E3A8A] to-[#4C51BF] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-white mb-2">Completing Discord sign-in...</h2>
        <p className="text-white/60">Please wait while we set up your account.</p>
      </div>
    </div>
  );
}