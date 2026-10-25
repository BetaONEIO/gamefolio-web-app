import { useEffect } from "react";
import { useLocation } from "wouter";
import { queryClient, IMPERSONATION_TOKEN_KEY } from "@/lib/queryClient";

/**
 * One-time hand-off page opened in a fresh tab by an admin's "Impersonate"
 * action (see AdminPage.tsx). sessionStorage isn't copied into a tab opened
 * via window.open() after the fact, so the token travels here via a URL param
 * instead, gets stashed into *this* tab's sessionStorage, then the URL is
 * scrubbed so the token never lingers in the address bar or browser history.
 */
export default function ImpersonateSessionPage() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    let cancelled = false;

    const startSession = async () => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");
      if (token) {
        try {
          sessionStorage.setItem(IMPERSONATION_TOKEN_KEY, token);
        } catch {
          // sessionStorage unavailable (private browsing edge case) — nothing we
          // can do, the impersonated view just won't authenticate.
        }
      }

      window.history.replaceState(null, "", "/impersonate-session");

      // App-level auth can fetch /api/user before this page's effect stores the
      // tab-scoped token, leaving the admin session cached in the new tab. Wait
      // for an authenticated refetch before navigating so every consumer sees
      // the impersonated user, subscription and developer game immediately.
      await queryClient.resetQueries({
        queryKey: ["/api/user"],
        exact: true,
      });

      if (!cancelled) setLocation("/");
    };

    void startSession();

    return () => {
      cancelled = true;
    };
  }, [setLocation]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-foreground">Starting impersonation session…</div>
    </div>
  );
}
