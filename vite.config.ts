import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
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
  },
  optimizeDeps: {
    include: [
      "eventemitter2",
      "webextension-polyfill",
      "react-apple-signin-auth",
    ],
  },
});
