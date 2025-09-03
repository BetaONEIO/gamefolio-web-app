import { createContext, ReactNode, useContext, useEffect, useState } from "react";
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
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Remove localStorage dependency - rely on session only
  const [firebaseAuthChecked, setFirebaseAuthChecked] = useState(false);

  // Handle Firebase authentication state changes
  useEffect(() => {
    if (!auth) {
      setFirebaseAuthChecked(true);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser && firebaseUser.email) {
        // User signed in with Google, register/login them in our system
        try {
          const response = await apiRequest("POST", "/api/auth/google", {
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || firebaseUser.email.split('@')[0],
            photoURL: firebaseUser.photoURL,
            uid: firebaseUser.uid
          });

          const userData = await response.json();
          queryClient.setQueryData(["/api/user"], userData);

          // Handle routing based on user status
          if (userData.needsOnboarding) {
            // New Google user or existing user that needs onboarding
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
            // Existing user with completed onboarding
            toast({
              title: "Welcome back!",
              description: `You're now signed in with Google.`,
              variant: "gamefolioSuccess",
            });
            setLocation("/");
          }
        } catch (error) {
          console.error('Google auth error:', error);
          toast({
            title: "Authentication failed",
            description: "There was an error signing you in. Please try again.",
            variant: "destructive",
          });
        }
      }
      setFirebaseAuthChecked(true);
    });

    return () => unsubscribe();
  }, [queryClient, toast]);

  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: firebaseAuthChecked,
  });



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
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/user"], user);

      toast({
        title: "Welcome back!",
        description: `You are now logged in as ${user.displayName || user.username}`,
        variant: "gamefolioSuccess",
      });

      // Check if user needs onboarding
      const needsOnboarding = !user.userType || !user.ageRange;
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
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/user"], user);

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

      setLocation("/auth");
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
        refreshUser: async () => {
          try {
            const userData = await apiRequest("GET", "/api/user");
            queryClient.setQueryData(["/api/user"], userData);
          } catch (error) {
            console.error("Failed to refresh user data:", error);
            queryClient.setQueryData(["/api/user"], null);
          }
        },
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