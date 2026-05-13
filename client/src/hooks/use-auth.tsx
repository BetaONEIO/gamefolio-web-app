import { createContext, ReactNode, useContext, useCallback, useEffect, useRef, useState } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
  useQueryClient,
} from "@tanstack/react-query";
import { User } from "@shared/schema";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useDailyStreak } from "@/hooks/use-daily-streak";
import { isNative } from "@/lib/platform";
import { clearTokens, setTokens } from "@/lib/auth-token";
import { initPushNotifications, unregisterCurrentPushToken } from "@/lib/push-notifications";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<User, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<User, Error, RegisterData>;
  refreshUser: () => Promise<void>;
};

type LoginData = {
  username: string;
  password: string;
};

type RegisterData = {
  username: string;
  displayName: string;
  password: string;
  dateOfBirth: string;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { showDailyXp } = useDailyStreak();

  // Remove localStorage dependency - rely on session only
  const [firebaseAuthChecked, setFirebaseAuthChecked] = useState(false);

  const refreshUser = async () => {
    try {
      const response = await apiRequest("GET", "/api/user");
      const userData = await response.json();
      queryClient.setQueryData(["/api/user"], userData);
    } catch (error) {
      console.error("Failed to refresh user data:", error);
      queryClient.setQueryData(["/api/user"], null);
    }
  };

  // Native (Capacitor) WebViews don't reliably persist the cross-origin
  // session cookie, so after a successful session login we exchange the
  // session for a JWT pair and store it. The queryClient automatically
  // attaches it to subsequent requests and refreshes it on 401.
  const issueNativeTokens = async () => {
    if (!isNative) return;
    try {
      const res = await fetch("/api/auth/token/issue", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) return;
      // Guard against SPA fallback returning index.html with status 200
      // when the route is missing on a stale deploy.
      if (!res.headers.get("content-type")?.includes("application/json")) return;
      const data = (await res.json()) as {
        accessToken?: string;
        refreshToken?: string;
      };
      if (data.accessToken && data.refreshToken) {
        await setTokens(data.accessToken, data.refreshToken);
      }
    } catch (e) {
      console.warn("issueNativeTokens failed", e);
    }
  };

  // The first onAuthStateChanged after mount is always Firebase restoring the
  // existing session (or confirming there isn't one). Skip the server-side
  // re-auth POST entirely in that case — /api/auth/google is also the
  // daily-streak / welcome-toast trigger, so calling it on every refresh
  // re-awards XP and re-shows the daily reward. The persisted server session
  // (web cookie) or stored JWT (native) handles authentication; /api/user
  // will load the user normally. Subsequent fires are real sign-in events
  // and run the full flow.
  const isInitialAuthCheckRef = useRef(true);

  // Handle Firebase authentication state changes
  useEffect(() => {
    if (!auth) {
      setFirebaseAuthChecked(true);
      return;
    }

    let mounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser && firebaseUser.email) {
        const isInitialRestore = isInitialAuthCheckRef.current;
        isInitialAuthCheckRef.current = false;

        if (isInitialRestore) {
          if (mounted) setFirebaseAuthChecked(true);
          return;
        }

        try {
          const response = await apiRequest("POST", "/api/auth/google", {
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || firebaseUser.email.split('@')[0],
            photoURL: firebaseUser.photoURL,
            uid: firebaseUser.uid
          });

          if (!mounted) return;

          const userData = await response.json();

          if (!mounted) return;

          // On native, exchange the freshly-created session for a JWT pair.
          await issueNativeTokens();

          const streakInfo = userData.streakInfo;
          // Mark reward as shown so the session-restore useEffect doesn't double-fire
          if (streakInfo && (streakInfo.dailyXP > 0 || streakInfo.bonusAwarded > 0)) {
            dailyRewardShownRef.current = true;
          }
          queryClient.setQueryData(["/api/user"], userData);

          if (userData.needsOnboarding) {
            if (userData.isNewGoogleUser) {
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
            toast({
              title: "Welcome back!",
              description: `You're now signed in with Google.`,
              variant: "gamefolioSuccess",
            });

            setLocation("/");
          }
        } catch (error) {
          if (!mounted) return;
          console.error('Google auth error:', error);
          toast({
            title: "Authentication failed",
            description: "There was an error signing you in. Please try again.",
            variant: "gamefolioError",
          });
        }
      }
      if (mounted) {
        setFirebaseAuthChecked(true);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [queryClient, toast, setLocation]);

  const dailyRewardShownRef = useRef(false);

  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: firebaseAuthChecked,
    // Don't poll every 60s — that turned a single transient cookie/network
    // blip into an instant logout. Refetch on focus/reconnect and let the
    // user-driven mutations (login/logout/refreshUser) be the source of truth.
    staleTime: 5 * 60 * 1000,
    refetchInterval: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 1,
    retryDelay: 500,
  });

  // Once the user is authenticated, fire off the push-notification handshake
  // (request OS permission, fetch FCM token, POST to /api/push/register). Safe
  // to run multiple times — initPushNotifications is idempotent.
  const pushBoundForUserId = useRef<number | null>(null);
  useEffect(() => {
    if (!isNative || !user) return;
    if (pushBoundForUserId.current === user.id) return;
    pushBoundForUserId.current = user.id;
    void initPushNotifications();
  }, [user]);

  useEffect(() => {
    if (!user || dailyRewardShownRef.current) return;
    const userData = user as any;
    const streakInfo = userData.streakInfo;
    if (streakInfo && (streakInfo.dailyXP > 0 || streakInfo.bonusAwarded > 0)) {
      dailyRewardShownRef.current = true;
      setTimeout(() => {
        showDailyXp({
          dailyXP: streakInfo.dailyXP,
          bonusAwarded: streakInfo.bonusAwarded,
          currentStreak: streakInfo.currentStreak,
          longestStreak: streakInfo.longestStreak || userData.longestStreak || 0,
          isNewMilestone: streakInfo.isNewMilestone,
          message: streakInfo.message,
          nextMilestone: streakInfo.nextMilestone || 5,
        });
      }, 800);
    }
  }, [user, showDailyXp]);



  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
        credentials: "include",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Login failed");
      }

      return await res.json();
    },
    onSuccess: async (responseData: any) => {
      // Check if 2FA is required
      if (responseData.requires2FA) {
        sessionStorage.setItem('2fa_userId', responseData.userId.toString());
        setLocation('/2fa-verify');
        return;
      }

      const user = responseData as User;
      const streakInfo = responseData.streakInfo;

      // Mark reward as shown so the session-restore useEffect doesn't double-fire
      dailyRewardShownRef.current = true;

      // On native, grab JWT tokens before any further requests so the
      // queryClient can use them when the session cookie is unavailable.
      await issueNativeTokens();

      // Use centralized refreshUser to ensure cache consistency
      await refreshUser();

      // Show welcome back message
      toast({
        title: "Welcome back!",
        description: `You are now logged in as ${user.displayName || user.username}`,
        variant: "gamefolioSuccess",
      });

      // Check if user needs onboarding
      const needsOnboarding = !user.userType;
      if (needsOnboarding) {
        toast({
          title: "Complete your profile",
          description: "Finish setting up your gaming profile to continue.",
          variant: "gamefolioSuccess",
        });
        setLocation("/onboarding");
      } else {
        setLocation("/");
      }
    },
    // Error handling now done in the forms for contextual display
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: RegisterData) => {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
        credentials: "include",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Registration failed");
      }

      return await res.json();
    },
    onSuccess: async (user: User) => {
      // On native, grab JWT tokens before any further requests.
      await issueNativeTokens();

      // Use centralized refreshUser to ensure cache consistency
      await refreshUser();

      toast({
        title: "Account created!",
        description: user.emailVerified ? "Let's set up your profile now" : "Please verify your email to continue",
        variant: "gamefolioSuccess",
      });

      // Redirect based on email verification status
      if (user.emailVerified) {
        // User is already verified (e.g., OAuth users), go directly to onboarding
        setLocation("/onboarding");
      } else {
        // User needs email verification first
        setLocation("/verify-code");
      }
    },
    // Error handling now done in the forms for contextual display
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      // Best-effort: revoke the FCM token before tearing down the session so
      // the next user on this device gets a fresh registration.
      if (isNative) {
        await unregisterCurrentPushToken();
      }
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: async () => {
      pushBoundForUserId.current = null;
      await clearTokens();
      queryClient.setQueryData(["/api/user"], null);

      toast({
        title: "Logged out",
        description: "You have been logged out successfully",
        variant: "gamefolioSuccess",
      });

      // Navigate to home page after logout
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}