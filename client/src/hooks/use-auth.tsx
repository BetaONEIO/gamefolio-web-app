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

  // Handle Firebase authentication state changes
  useEffect(() => {
    if (!auth) {
      setFirebaseAuthChecked(true);
      return;
    }

    let mounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser && firebaseUser.email) {
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
    staleTime: 60000,
    refetchInterval: 60000,
  });

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
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
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