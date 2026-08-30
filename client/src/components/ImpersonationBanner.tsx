import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Eye, X } from "lucide-react";
import { apiRequest, IMPERSONATION_TOKEN_KEY } from "@/lib/queryClient";

// GET /api/user includes this when the request was authenticated via an
// impersonation token (see server/middleware/impersonation-auth.ts) — it's
// synthetic, not a real column on the users table, so it isn't part of the
// shared User schema type.
interface ImpersonatedUser {
  impersonatedBy?: { adminId: number; adminUsername: string };
}

export function ImpersonationBanner() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [exiting, setExiting] = useState(false);

  const impersonatedBy = (user as (typeof user & ImpersonatedUser) | null)?.impersonatedBy;
  if (!impersonatedBy || !user) {
    return null;
  }

  const handleExit = async () => {
    setExiting(true);
    try {
      await apiRequest("POST", "/api/impersonation/end");
    } catch {
      // Best-effort — the audit row will still show as "expired" via the
      // token's own expiry even if this call fails.
    }
    try {
      sessionStorage.removeItem(IMPERSONATION_TOKEN_KEY);
    } catch {
      // ignore
    }
    // We only ever get here in a tab opened via window.open() from the admin
    // panel, so this should succeed; fall back to the sign-in page if the
    // browser refuses to close a script-opened tab.
    window.close();
    setLocation("/auth");
  };

  return (
    <div className="bg-amber-500/15 border border-amber-500/40 text-amber-200 px-4 py-2 flex items-center justify-between gap-3 relative z-30">
      <div className="flex items-center gap-2 min-w-0">
        <Eye className="h-4 w-4 flex-shrink-0" />
        <span className="text-sm truncate">
          Viewing as <strong>@{user.username}</strong> — impersonated by{" "}
          <strong>{impersonatedBy.adminUsername}</strong>
        </span>
      </div>
      <Button
        onClick={handleExit}
        disabled={exiting}
        variant="outline"
        size="sm"
        className="flex-shrink-0 h-7 border-amber-500/50 text-amber-100 hover:bg-amber-500/20 hover:text-amber-50"
      >
        <X className="h-3.5 w-3.5 mr-1" />
        {exiting ? "Exiting…" : "Exit Impersonation"}
      </Button>
    </div>
  );
}
