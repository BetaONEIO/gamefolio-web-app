# Gamefolio Architecture

Last verified against the repository: 27 September 2026.

This document describes the architecture that is running today. It is the source of truth for high-level system boundaries and tooling. When this document conflicts with an older proposal or export document, verify the implementation files linked below and update this document in the same change.

## System overview

Gamefolio is a TypeScript monorepo that builds one web application and two native mobile wrappers.

```text
Web browser                 iOS / Android
     |                    Capacitor WebView
     +-----------+-------------+
                 |
        React + Vite client
          relative /api calls
                 |
       Express / Node.js server
          hosted on Replit
          /             \
 Supabase PostgreSQL     Object storage
   via Drizzle ORM       - Cloudflare R2: new public processed media
                         - Supabase Storage: private, raw, and legacy media
                 |
        External integrations
  Stripe, RevenueCat, Firebase, OAuth providers,
        SKALE, Sequence, Twitch, Kick, etc.
```

The production server is a single Node.js process. Express serves the JSON API and the compiled React files from the same deployment and origin. It is not a Next.js application, a collection of serverless functions, or an Expo application.

## Runtime components

### Web client

- React 18 and TypeScript.
- Vite builds the SPA from `client/` into `dist/public/`.
- Wouter handles client-side routing.
- TanStack Query handles server state and API caching.
- Tailwind CSS and Radix/shadcn-style components provide the UI layer.
- The client normally calls the backend through relative `/api/*` URLs.

Authoritative files:

- `client/src/App.tsx` — top-level providers and routes.
- `client/src/` — pages, components, hooks, and client utilities.
- `vite.config.ts` — Vite root, aliases, output, and build plugins.
- `client/src/lib/platform.ts` — browser/native platform behavior.

### API and application server

- Node.js with Express 4 and TypeScript.
- `server/bootstrap.ts` opens the port and loads the application.
- `server/index.ts` configures middleware, security, route modules, static serving, and startup work.
- `server/routes.ts` contains the main API surface; focused route modules live in `server/routes/`.
- Development uses Vite middleware. Production serves the built files in `dist/public/`.
- The production build bundles the server to `dist/index.js` with esbuild.

Authoritative files:

- `server/bootstrap.ts`
- `server/index.ts`
- `server/routes.ts` and `server/routes/`
- `server/vite.ts`
- `scripts/build-server.mjs` and `scripts/server-build-options.mjs`

### Database

- PostgreSQL hosted by Supabase.
- Drizzle ORM and `postgres` provide database access.
- `DATABASE_URL` is the server connection string.
- Database-backed Express sessions use `connect-pg-simple`.
- Schema changes should be represented in the Drizzle schema and migrations, not made only through dashboard edits.

Authoritative files:

- `shared/schema.ts` — primary Drizzle schema used by the application.
- `server/db.ts` — connection pool and Drizzle client.
- `drizzle.config.ts` — migration tooling configuration.
- `migrations/` and `scripts/apply-migrations.ts` — migration history and runner.

### Media and object storage

Storage is deliberately split by access pattern:

- **Cloudflare R2** (`gamefolio-public-media`, served through `media.gamefolio.com`) receives new processed public videos and thumbnails. These objects use long-lived immutable cache headers to reduce origin egress.
- **Supabase Storage** remains the store for private uploads, raw media, application assets, and existing legacy URLs.
- If R2 is not configured or an R2 upload fails, the public-media adapter safely falls back to Supabase.
- Existing Supabase signed URLs are cached server-side for most of their lifetime to improve CDN reuse.

Authoritative files:

- `server/public-media-storage.ts` — public-media routing and fallback.
- `server/r2-storage.ts` — R2 S3-compatible client and object naming.
- `server/supabase-storage.ts` — Supabase buckets, signed URLs, and legacy storage.
- `server/video-processor.ts` — video/transcode/thumbnail output path.

Required R2 settings are `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_ENDPOINT`, and `R2_PUBLIC_BASE_URL`. Secret values belong in Replit Secrets or a gitignored local environment file and must never be committed.

### Native mobile apps

- The iOS and Android apps are **Capacitor wrappers around the built React DOM app**.
- The current package manifest uses Capacitor 7 packages.
- They are not React Native or Expo apps. `MOBILE_EXPORT.md` describes a hypothetical rewrite and is not the current architecture.
- `vite build` creates `dist/public`; `cap sync` copies that web build into the native projects.
- Firebase Cloud Messaging provides native push notifications.

Authoritative files:

- `capacitor.config.ts`
- `ios/`
- `android/`
- `client/src/lib/mobile-init.ts`
- `client/src/lib/native-auth-bridge.ts`
- `client/src/lib/push-notifications.ts`
- `server/push-service.ts`

Build and release procedures are documented in `AGENTS.md`.

## Authentication and identity

Authentication is hybrid because the same backend serves web, native, and public API clients:

- Web sessions use `express-session` with PostgreSQL-backed sessions.
- JWT/bearer-token middleware supports API and native flows where appropriate.
- Local credentials use Passport.
- Social identity integrations include Google/Firebase, Discord, Twitch, Kick, Xbox, and Apple/native flows.
- Native OAuth returns to the Capacitor app through registered deep links.

Authorization must remain server-side. Client role flags are presentation hints, not permission checks.

Authoritative files include `server/middleware/`, `server/routes/auth-routes.ts`, `server/routes/social-oauth.ts`, `server/services/firebase-admin.ts`, and the auth sections of `server/routes.ts`.

## Payments and subscriptions

- Stripe handles web payments and web subscription flows.
- RevenueCat handles native App Store and Play Store subscription entitlements.
- Server routes reconcile provider events into Gamefolio's database state.
- Stripe and RevenueCat secrets/webhook credentials are server-only.

Relevant files include `server/stripeClient.ts`, `server/routes/pro-subscription.ts`, `server/routes/indie-dev-subscription.ts`, `server/routes/revenuecat.ts`, and the corresponding client hooks/components.

## Blockchain and wallets

- GFT, staking, and NFT features run on SKALE Base Mainnet.
- Viem, Wagmi, ethers, and Sequence are all present, but serve different existing flows; do not assume one library owns every wallet action.
- Sequence provides embedded-wallet experiences where configured.
- Contract addresses, chain ID, RPC URL, and ABIs must be read from shared configuration rather than duplicated.
- `SKALE_NEBULA_TESTNET` currently aliases the mainnet configuration for backward compatibility; its name does not mean the application is operating on a testnet.

Authoritative files:

- `shared/contracts.ts`
- `config/web3.ts`
- `client/src/lib/sequence-config.ts`
- `client/src/hooks/use-wallet.tsx`
- `server/blockchain.ts`, `server/gf-token-service.ts`, and `server/gf-staking-service.ts`

## Build, deploy, and run

The package manager is Bun. Use the scripts in `package.json`:

```bash
bun install
bun run dev          # development server; requires configured services
bun run build        # Vite client + bundled Express server
bun run start        # production: node dist/index.js
bun run check        # TypeScript check
bun run db:migrate   # apply repository migrations
```

Production is hosted on Replit. A production build contains:

```text
dist/public/   compiled SPA and static assets
dist/index.js  bundled Express server
```

Publishing/re-publishing on Replit is a separate action from pushing to GitHub. A push to `main` does not by itself prove the live deployment has updated.

## Repository map

```text
client/        React web client shared by browser and Capacitor
server/        Express API, services, background work, media processing
shared/        Shared schemas, contracts, types, and constants
config/        Cross-runtime application configuration
migrations/    Database migrations
scripts/       Build, migration, release, and maintenance scripts
tests/         Node-based focused tests
ios/           Native iOS Capacitor project
android/       Native Android Capacitor project
dist/          Generated build output; never edit as source
```

## Source-of-truth rules

1. `package.json` and its lockfile define installed tooling and versions.
2. `shared/schema.ts` plus migrations define the database model.
3. `shared/contracts.ts` and `config/web3.ts` define blockchain configuration.
4. `capacitor.config.ts`, `ios/`, and `android/` define the current mobile implementation.
5. `server/public-media-storage.ts` defines the public-media storage decision.
6. Replit Secrets define deployed credentials; local `.env*` files are not deployment configuration.
7. Generated `dist/` files and historical proposal documents are not architectural sources of truth.

## Keeping this document accurate

Update `ARCHITECTURE.md` in the same pull request or commit when changing any of the following:

- hosting provider or process topology;
- frontend or backend framework;
- database provider/ORM or schema ownership;
- authentication/session strategy;
- media storage routing;
- payments/subscription ownership;
- blockchain network or wallet provider;
- native mobile framework or build pipeline.

For detailed operational procedures, use `AGENTS.md`. For product and historical implementation context, use `replit.md`, but confirm time-sensitive claims against the source files above.
