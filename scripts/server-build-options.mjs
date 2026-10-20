export function serverBuildOptions() {
  return {
    entryPoints: ['server/bootstrap.ts'], platform: 'node', target: 'node20',
    bundle: true, format: 'esm', splitting: true, outdir: 'dist', entryNames: 'index',
    // These packages load native binaries, assets, instrumentation hooks or
    // development-only tooling relative to their installed package directory.
    external: [
      'sharp', '@huggingface/transformers', 'fluent-ffmpeg', 'ffmpeg-static',
      '@sentry/node', 'firebase-admin', 'stripe-replit-sync',
      'vite', '@vitejs/*', '@replit/vite-plugin-*', '@sentry/vite-plugin',
      'playwright', '@playwright/test', 'bufferutil', 'utf-8-validate', 'pg-native',
    ],
    // Bundled CommonJS dependencies still need Node's require for built-ins
    // and deliberately external packages. Do not create a public/global shim.
    banner: { js: 'import { createRequire as __createRequire } from "node:module"; const require = __createRequire(import.meta.url);' },
  };
}
