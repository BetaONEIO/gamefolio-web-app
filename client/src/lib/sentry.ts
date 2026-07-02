// Sentry crash/error reporting for the Capacitor (WebView) + native shell.
//
// Captures uncaught errors, unhandled promise rejections, and React render
// crashes (forwarded from ErrorBoundary) and ships them to Sentry so issues
// hit by QA on the Play Console internal track land in one dashboard.
//
// Disabled by design when VITE_SENTRY_DSN is unset — same no-op pattern as the
// Firebase service account (see CLAUDE.md). Every Sentry.* call elsewhere is
// safe to make even when init() was never run; it just does nothing.
import * as Sentry from "@sentry/capacitor";
import { init as reactInit } from "@sentry/react";

// Injected by Vite `define` from android/app/build.gradle, e.g.
// "gamefolio@1.3.3+39" (versionName + versionCode) so every captured event
// says exactly which build it came from. Falls back gracefully off-Vite.
declare const __APP_RELEASE__: string;

// Browser-extension / wallet / video-autoplay noise the app already swallows
// in main.tsx — we don't want it cluttering the Sentry dashboard either.
const NOISE = [
  /MetaMask/i,
  /chrome-extension/i,
  /web3/i,
  /ethereum/i,
  /AbortError/i,
  /NotAllowedError/i,
  /play\(\)/i,
];

export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN?.trim();
  if (!dsn) {
    // No DSN configured → Sentry stays off (local dev, PR previews, etc.).
    return;
  }

  Sentry.init(
    {
      dsn,
      release:
        typeof __APP_RELEASE__ !== "undefined" ? __APP_RELEASE__ : undefined,
      // NB: do NOT use import.meta.env.PROD here. `.env` sets NODE_ENV=development
      // (needed for local server dev), and Vite leaks that into `vite build`,
      // forcing PROD=false in the shipped AAB — which mis-tagged every production
      // crash as "development" and made prod/dev indistinguishable in Sentry.
      // MODE reflects the actual build command ("production" for `vite build`) and
      // is not affected by the NODE_ENV leak. Set VITE_SENTRY_ENVIRONMENT to
      // override (e.g. "staging").
      environment:
        import.meta.env.VITE_SENTRY_ENVIRONMENT?.trim() ||
        (import.meta.env.MODE === "production" ? "production" : "development"),
      // Crash-capture focus for QA: errors on, performance tracing off (it
      // burns quota fast and isn't what we're after). Raise later if wanted.
      tracesSampleRate: 0,
      beforeSend(event) {
        const msg =
          event.exception?.values?.[0]?.value ?? event.message ?? "";
        if (NOISE.some((re) => re.test(msg))) return null;
        return event;
      },
    },
    reactInit,
  );
}

// Call on sign-in / sign-out so crashes are attributable to a user. Safe to
// call when Sentry is disabled (no-op).
export function setSentryUser(
  user: { id: string; username?: string | null } | null,
): void {
  Sentry.setUser(
    user ? { id: user.id, username: user.username ?? undefined } : null,
  );
}
