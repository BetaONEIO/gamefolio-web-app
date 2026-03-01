import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { handleXboxCallback, getXboxCallbackParams } from '@/lib/xbox';
import { useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export function XboxCallback() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    const processXboxCallback = async () => {
      try {
        const { code, state, error } = getXboxCallbackParams();

        console.log("Xbox callback URL params:", { code: code ? `${code.substring(0, 10)}...` : null, state, error, search: window.location.search.substring(0, 50) });

        if (error) {
          throw new Error(`Xbox OAuth error: ${error}`);
        }

        if (!code || !state) {
          throw new Error('Missing authorization code or state parameter');
        }

        const isConnectMode = localStorage.getItem('xbox_oauth_mode') === 'connect';
        localStorage.removeItem('xbox_oauth_mode');

        toast({
          title: isConnectMode ? "Linking your Xbox account..." : "Processing Xbox authentication...",
          description: isConnectMode ? "Verifying your Xbox identity" : "Setting up your account",
          variant: "default"
        });

        const xboxUser = await handleXboxCallback(code, state);

        if (isConnectMode) {
          const response = await apiRequest("POST", "/api/xbox/connect", {
            xuid: xboxUser.xuid,
            gamertag: xboxUser.gamertag,
            gamerpic: xboxUser.gamerpic
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.message || 'Failed to link Xbox account');
          }

          await queryClient.invalidateQueries({ queryKey: ["/api/user"] });

          toast({
            title: "Xbox connected!",
            description: `Your Xbox account (${xboxUser.gamertag}) has been linked to your profile.`,
            variant: "gamefolioSuccess"
          });

          setLocation("/settings");
        } else {
          const response = await apiRequest("POST", "/api/auth/xbox", {
            xuid: xboxUser.xuid,
            gamertag: xboxUser.gamertag,
            gamerpic: xboxUser.gamerpic
          });

          const userData = await response.json();
          queryClient.setQueryData(["/api/user"], userData);

          if (userData.needsOnboarding) {
            if (userData.isNewXboxUser) {
              toast({
                title: "Welcome to Gamefolio!",
                description: "Let's set up your gaming profile.",
                variant: "gamefolioSuccess"
              });
            } else {
              toast({
                title: "Complete your profile",
                description: "Finish setting up your gaming profile to continue.",
                variant: "gamefolioSuccess"
              });
            }
            setLocation("/onboarding");
          } else {
            toast({
              title: "Welcome back!",
              description: `You're signed in as ${userData.xboxUsername || userData.displayName}.`,
              variant: "gamefolioSuccess"
            });
            setLocation("/");
          }
        }
      } catch (error: any) {
        console.error('Xbox callback error:', error);
        const isConnectMode = localStorage.getItem('xbox_oauth_mode') === 'connect';
        localStorage.removeItem('xbox_oauth_mode');
        toast({
          title: isConnectMode ? "Connection failed" : "Authentication failed",
          description: error.message || "There was an error connecting your Xbox account. Please try again.",
          variant: "destructive"
        });
        setLocation(isConnectMode ? "/settings" : "/auth");
      }
    };

    processXboxCallback();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-4 border-[#107C10] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-white text-lg font-medium">Connecting your Xbox account...</p>
        <p className="text-white/60 text-sm">Please wait while we verify your identity.</p>
      </div>
    </div>
  );
}
