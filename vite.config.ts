import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { sentryVitePlugin } from "@sentry/vite-plugin";

// Derive the Sentry "release" from the Android build version so every captured
// error maps to the exact build QA installed, e.g. "gamefolio@1.3.3+39".
function androidRelease(): string {
  try {
    const gradle = fs.readFileSync(
      path.resolve(import.meta.dirname, "android/app/build.gradle"),
      "utf8",
    );
    const name = gradle.match(/versionName\s+"([^"]+)"/)?.[1] ?? "0.0.0";
    const code = gradle.match(/versionCode\s+(\d+)/)?.[1] ?? "0";
    return `gamefolio@${name}+${code}`;
  } catch {
    return "gamefolio@unknown";
  }
}
const APP_RELEASE = androidRelease();

// Sourcemap upload only runs when SENTRY_AUTH_TOKEN is present (release/CI
// builds). Without it, builds are completely unaffected.
const sentryEnabled = Boolean(process.env.SENTRY_AUTH_TOKEN);

export default defineConfig({
  define: {
    __APP_RELEASE__: JSON.stringify(APP_RELEASE),
  },
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(sentryEnabled
      ? [
          sentryVitePlugin({
            org: process.env.SENTRY_ORG,
            project: process.env.SENTRY_PROJECT,
            authToken: process.env.SENTRY_AUTH_TOKEN,
            release: { name: APP_RELEASE },
            sourcemaps: { filesToDeleteAfterUpload: ["dist/public/**/*.map"] },
          }),
        ]
      : []),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "client", "public", "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  // Vite's envDir defaults to `root` (client/), but the project's .env lives at
  // the repo root. Without this, VITE_* keys (e.g. VITE_SEQUENCE_*) are NOT
  // embedded in local/mobile builds, so sequenceConfig is null → no WagmiProvider
  // → the wallet's wagmi hooks throw "useConfig must be used within WagmiProvider".
  // (Replit web builds are unaffected: their keys are real env vars.)
  envDir: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    // "hidden" emits sourcemaps for Sentry upload without referencing them in
    // the shipped bundle. Off entirely when not uploading.
    sourcemap: sentryEnabled ? "hidden" : false,
  },
  optimizeDeps: {
    include: [
      "eventemitter2",
      "webextension-polyfill",
      "react-apple-signin-auth",
    ],
  },
});
