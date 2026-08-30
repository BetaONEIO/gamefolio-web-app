// Sentry crash/error reporting for the Capacitor (WebView) + native shell.
//
// Captures uncaught errors, unhandled promise rejections, and React render
// crashes (forwarded from ErrorBoundary) and ships them to Sentry so issues
// hit by QA on the Play Console internal track land in one dashboard.
//
// Disabled by design when VITE_SENTRY_DSN is unset — same no-op pattern as the
// Firebase service account (see CLAUDE.md). Every Sentry.* call elsewhere is
// safe to make even when init() was never run; it just does nothing.
import { Capacitor } from "@capacitor/core";
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
      // The same bundle ships to the Replit web deploy and to both native
      // shells, and every event lands as Sentry platform "javascript" — so
      // without a tag there is no way to tell a browser error from an Android
      // one. The `release` doesn't help either: vite.config.ts derives it from
      // android/app/build.gradle, so web deploys get stamped with whatever
      // Android versionCode was last committed. getPlatform() returns
      // "web" | "ios" | "android", which joins the server's `runtime: server`
      // (server/sentry.ts) to make one tag that separates all four.
      initialScope: { tags: { runtime: Capacitor.getPlatform() } },
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

export type BulkUploadTelemetry = {
  batchId: string;
  itemIndex: number;
  itemKind: "video" | "screenshot" | "batch";
  videoType?: "clip" | "reel";
  mimeType?: string;
  fileSizeBytes?: number;
  durationSeconds?: number | null;
  stage:
    | "selection"
    | "validation"
    | "storage-credentials"
    | "storage-transfer"
    | "processing"
    | "reconciliation"
    | "complete";
  outcome: "started" | "rejected" | "failed" | "recovered" | "succeeded";
  errorCategory?: string;
  httpStatus?: number;
};

export type BulkUploadTelemetryDetails = Omit<
  BulkUploadTelemetry,
  "batchId" | "itemIndex" | "itemKind" | "videoType" | "mimeType" | "fileSizeBytes" | "durationSeconds"
>;

// Bulk upload diagnostics intentionally accept only a closed set of fields.
// Never add filenames, titles, descriptions, tags, URLs, request bodies, or
// provider credentials here: this event is meant to be useful without copying
// user-generated content into Sentry.
export function captureBulkUploadEvent(
  event: BulkUploadTelemetry,
): void {
  Sentry.captureMessage(`bulk_upload.${event.stage}.${event.outcome}`, {
    level: event.outcome === "failed" || event.outcome === "rejected" ? "warning" : "info",
    tags: {
      feature: "bulk_upload",
      batch_id: event.batchId,
      item_index: String(event.itemIndex),
      item_kind: event.itemKind,
      stage: event.stage,
      outcome: event.outcome,
      ...(event.videoType ? { video_type: event.videoType } : {}),
      ...(event.errorCategory ? { error_category: event.errorCategory } : {}),
      ...(event.httpStatus !== undefined ? { http_status: String(event.httpStatus) } : {}),
    },
    extra: {
      ...(event.mimeType ? { mime_type: event.mimeType } : {}),
      ...(event.fileSizeBytes !== undefined ? { file_size_bytes: event.fileSizeBytes } : {}),
      ...(event.durationSeconds !== undefined ? { duration_seconds: event.durationSeconds } : {}),
    },
  });
}
