import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { apiRequest, queryClient, IMPERSONATION_TOKEN_KEY } from "@/lib/queryClient";
import {
  getImpersonationTokenFromLocation,
  isConfirmedImpersonationUser,
} from "./impersonation-handoff";

/**
 * One-time hand-off page opened in a fresh tab by an admin's "Impersonate"
 * action (see AdminPage.tsx). sessionStorage isn't copied into a tab opened
 * via window.open() after the fact, so the token travels here via a URL param
 * instead, gets stashed into *this* tab's sessionStorage, then the URL is
 * scrubbed so the token never lingers in the address bar or browser history.
 */
export default function ImpersonateSessionPage() {
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const startSession = async () => {
      try {
        const token = getImpersonationTokenFromLocation(
          window.location.search,
          window.location.hash,
        );
        if (!token) throw new Error("Missing impersonation token");

        // Scrub the bearer token before touching storage or starting any async
        // work. This still protects browser history/referrers when storage is
        // disabled and the hand-off has to stop with an error.
        window.history.replaceState(null, "", "/impersonate-session");

        try {
          sessionStorage.setItem(IMPERSONATION_TOKEN_KEY, token);
        } catch {
          throw new Error("Impersonation storage is unavailable");
        }

        // App-level auth may fetch /api/user before this effect stores the
        // tab-scoped token. Cancel that stale request, then fetch explicitly with
        // the new token and replace the cached administrator so every consumer
        // sees the target user before the hand-off navigates away.
        await queryClient.cancelQueries({ queryKey: ["/api/user"], exact: true });
        const response = await apiRequest("GET", "/api/user");
        const impersonatedUser = await response.json();
        if (!isConfirmedImpersonationUser(impersonatedUser)) {
          throw new Error("Server did not confirm impersonation");
        }
        queryClient.setQueryData(["/api/user"], impersonatedUser);

        if (!cancelled) setLocation("/");
      } catch {
        try {
          sessionStorage.removeItem(IMPERSONATION_TOKEN_KEY);
        } catch {
          // Storage is unavailable; the failed hand-off is still kept in place.
        }
        if (!cancelled) {
          setError("Could not start the impersonation session. Close this tab and try again.");
        }
      }
    };

    void startSession();

    return () => {
      cancelled = true;
    };
  }, [setLocation]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className={error ? "text-destructive" : "text-foreground"} role={error ? "alert" : undefined}>
        {error ?? "Starting impersonation session…"}
      </div>
    </div>
  );
}
