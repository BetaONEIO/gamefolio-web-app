import { createContext, ReactNode, useContext, useCallback, useEffect, useRef, useState } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
  useQueryClient,
} from "@tanstack/react-query";
import * as Sentry from "@sentry/capacitor";
import { User } from "@shared/schema";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { auth, getGoogleRedirectResult } from "@/lib/firebase";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { useDailyStreak } from "@/hooks/use-daily-streak";
import { isNative } from "@/lib/platform";
import { clearTokens, getAccessTokenSync, setTokens } from "@/lib/auth-token";
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

// Set by OAuthAuthorizePage before bouncing an unauthenticated user to /auth, so
// they land back on the consent screen (with its original query params) instead
// of the default home/onboarding destination once they log in.
const PENDING_OAUTH_REDIRECT_KEY = 'oauth_pending_redirect';
function consumePendingOAuthRedirect(): string | null {
  try {
    const pending = sessionStorage.getItem(PENDING_OAUTH_REDIRECT_KEY);
    if (pending) sessionStorage.removeItem(PENDING_OAUTH_REDIRECT_KEY);
    return pending;
  } catch {
    return null;
  }
}

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
  const attemptIssueNativeTokens = async (): Promise<"ok" | "unauthorized" | "failed"> => {
    const res = await fetch("/api/auth/token/issue", {
      method: "POST",
      credentials: "include",
    });
    if (res.status === 401) return "unauthorized";
    if (!res.ok) return "failed";
    // Guard against SPA fallback returning index.html with status 200
    // when the route is missing on a stale deploy.
    if (!res.headers.get("content-type")?.includes("application/json")) return "failed";
    const data = (await res.json()) as {
      accessToken?: string;
      refreshToken?: string;
    };
    if (!data.accessToken || !data.refreshToken) return "failed";
    await setTokens(data.accessToken, data.refreshToken);
    return "ok";
  };

  const issueNativeTokens = async () => {
    if (!isNative) return;
    try {
      let result = await attemptIssueNativeTokens();
      // A 401 immediately after a successful login almost always means the
      // session cookie this exchange depends on hasn't finished propagating
      // through the native CapacitorCookies bridge yet, not a real auth
      // failure. One short-delay retry clears that race.
      if (result === "unauthorized") {
        Sentry.addBreadcrumb({
          category: "auth-token",
          message: "issueNativeTokens: 401 on first attempt, retrying",
          level: "warning",
        });
        await new Promise((resolve) => setTimeout(resolve, 400));
        result = await attemptIssueNativeTokens();
      }
      Sentry.addBreadcrumb({
        category: "auth-token",
        message: `issueNativeTokens: ${result}`,
        level: result === "ok" ? "info" : "warning",
      });
      if (result !== "ok") {
        Sentry.captureException(new Error(`issueNativeTokens failed: ${result}`), {
          tags: { module: "use-auth", op: "issueNativeTokens" },
        });
      }
    } catch (e) {
      console.warn("issueNativeTokens failed", e);
      Sentry.captureException(e, { tags: { module: "use-auth", op: "issueNativeTokens" } });
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

  // Handle Firebase authentication state changes (+ redirect sign-in results)
  useEffect(() => {
    if (!auth) {
      setFirebaseAuthChecked(true);
      return;
    }

    let mounted = true;

    // Dedup: track which Firebase UID we've already processed in this page
    // load so that rapid onAuthStateChanged fires don't double-call
    // /api/auth/google for the same user.
    const processedUid = { current: null as string | null };

    const handleFirebaseSignIn = async (firebaseUser: FirebaseUser) => {
      if (!firebaseUser.email) return;
      if (processedUid.current === firebaseUser.uid) return;
      processedUid.current = firebaseUser.uid;

      try {
        const idToken = await firebaseUser.getIdToken();
        const response = await apiRequest("POST", "/api/auth/google", {
          idToken
        });

        if (!mounted) return;

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Google authentication failed' }));
          if (errorData.code === 'DEV_PORTAL_NO_REGISTRATION') {
            toast({
              title: "Registration not available",
              description: "New registrations are not available on the developer portal. Please create an account on app.gamefolio.com first.",
              variant: "gamefolioError",
            });
            return;
          }
          throw new Error(errorData.message || `Server error: ${response.status}`);
        }

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

        const pendingOAuthRedirect = consumePendingOAuthRedirect();

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
          setLocation(pendingOAuthRedirect || "/onboarding");
        } else {
          setLocation(pendingOAuthRedirect || "/");
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
    };

    // A page load returning from signInWithRedirect looks identical to a
    // routine "Firebase restoring an existing session" load from
    // onAuthStateChanged's point of view (first fire, user present) — the
    // isInitialRestore skip below would otherwise silently eat a genuine
    // sign-in. getRedirectResult() is the only API that can tell the two
    // apart, so it's handled explicitly and independently here.
    // handleFirebaseSignIn's own processedUid dedup makes it safe for this
    // and the onAuthStateChanged fire below to both end up calling it for
    // the same user — whichever runs first wins, the other is a no-op.
    getGoogleRedirectResult().then((result) => {
      if (result?.user && mounted) {
        handleFirebaseSignIn(result.user);
      }
    }).catch((error) => {
      if (!mounted) return;
      console.error('Google redirect sign-in error:', error);
      toast({
        title: "Authentication failed",
        description: "There was an error signing you in. Please try again.",
        variant: "gamefolioError",
      });
    });

    // Diagnosed via Sentry: on native, the app's own /api/user check (which
    // works fine off a valid stored token, independent of Firebase) only
    // ever runs when firebaseAuthChecked flips true - and Firebase's own
    // onAuthStateChanged callback can apparently hang indefinitely on some
    // cold boots, permanently blocking that check and leaving a user with a
    // perfectly valid token stuck on the login screen. Firebase is only used
    // for Google sign-in here, not for native-token auth, so don't let it
    // gate the whole app's auth resolution forever.
    const firebaseCheckTimeout = setTimeout(() => {
      if (!mounted) return;
      Sentry.captureMessage("use-auth: Firebase auth check timed out, proceeding anyway", {
        level: "warning",
        tags: { module: "use-auth", op: "firebase-timeout" },
      });
      setFirebaseAuthChecked(true);
    }, 5000);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Firebase always emits one onAuthStateChanged on init to report the
      // restored session state. Consume the flag on that very first fire
      // regardless of whether a user is present.
      const isInitialRestore = isInitialAuthCheckRef.current;
      isInitialAuthCheckRef.current = false;

      if (firebaseUser && firebaseUser.email && !isInitialRestore) {
        if (mounted) await handleFirebaseSignIn(firebaseUser);
      }

      if (mounted) {
        clearTimeout(firebaseCheckTimeout);
        setFirebaseAuthChecked(true);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(firebaseCheckTimeout);
      unsubscribe();
    };
  }, [queryClient, toast, setLocation]);

  const dailyRewardShownRef = useRef(false);

  const {
    data: user,
    error,
    isLoading,
    isFetching,
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

  // Diagnostic for the "logged out after force-quit" investigation: report
  // the outcome of the very first /api/user resolution on this app launch,
  // together with whether a token was in memory at that moment. This is the
  // one thing hydrate()'s own logging can't show - whether the token that was
  // found actually resulted in a recognized session.
  //
  // Must gate on firebaseAuthChecked + !isFetching, not just !isLoading: a
  // disabled query (enabled: false, before firebaseAuthChecked flips true)
  // also reports isLoading: false with no fetch ever having run, so an
  // earlier version of this effect fired on that very first disabled render
  // and locked itself out before the real fetch ever completed - every
  // "userResolved: false" it ever reported was meaningless.
  const initialAuthCheckReported = useRef(false);
  useEffect(() => {
    if (!isNative || !firebaseAuthChecked || isFetching || initialAuthCheckReported.current) return;
    initialAuthCheckReported.current = true;
    Sentry.captureMessage("use-auth: initial /api/user resolution", {
      level: "info",
      tags: {
        module: "use-auth",
        op: "initial-user-check",
        hadTokenAtCheckTime: String(!!getAccessTokenSync()),
        userResolved: String(!!user),
        hadError: String(!!error),
        errorMessage: error?.message ?? "",
      },
    });
  }, [firebaseAuthChecked, isFetching, user, error]);

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

      // Check if user needs onboarding
      const needsOnboarding = !user.userType;
      const pendingOAuthRedirect = consumePendingOAuthRedirect();
      if (needsOnboarding) {
        toast({
          title: "Complete your profile",
          description: "Finish setting up your gaming profile to continue.",
          variant: "gamefolioSuccess",
        });
        setLocation(pendingOAuthRedirect || "/onboarding");
      } else {
        setLocation(pendingOAuthRedirect || "/");
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

      // Redirect based on email verification status. A pending OAuth consent
      // bounce-back is deliberately not restored here — a brand-new
      // registration still needs to clear email verification/onboarding first.
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