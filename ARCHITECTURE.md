# Gamefolio Architecture

Last verified against the repository and live production: 2 October 2026.

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
          hosted on Railway (EU West)
          /             \
 Supabase PostgreSQL     Object storage
 via Drizzle + node-pg   - Cloudflare R2: public processed media
                         - Supabase Storage: legacy and selected image assets
                 |
        External integrations
  Stripe, RevenueCat, Firebase, OAuth providers,
        SKALE, Sequence, Twitch, Kick, etc.

External production canary
  GitHub Actions in BetaONEIO/yourl-uptime
  data-aware checks every five minutes + Telegram alerts
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
- Drizzle ORM's `node-postgres` adapter and a bounded `pg.Pool` provide
  application database access. The former `postgres.js` application driver was
  retired after connections could remain unresolved and queue all database API
  requests.
- `DATABASE_URL` is the only live server connection string. Production uses
  the Supabase shared session pooler with the TLS policy in
  `server/database-tls.ts`.
- Database-backed Express sessions use `connect-pg-simple`.
- The Railway web process currently limits its application pool to six
  connections. Keep the total connection budget in mind before adding workers
  or replicas.
- Schema changes should be represented in the Drizzle schema and migrations, not made only through dashboard edits.

Authoritative files:

- `shared/schema.ts` — primary Drizzle schema used by the application.
- `server/db.ts` — connection pool and Drizzle client.
- `server/database-tls.ts` — URL normalization and PostgreSQL TLS policy.
- `drizzle.config.ts` — migration tooling configuration.
- `migrations/` and `scripts/apply-migrations.ts` — migration history and runner.

### Media and object storage

Storage is deliberately split by access pattern:

- **Cloudflare R2** (`gamefolio-public-media`, served through
  `media.gamefolio.com`) is the required destination for new processed public
  videos and the preferred destination for public thumbnails and images. These
  objects use long-lived immutable cache headers to reduce origin egress.
- **Supabase Storage** remains readable for legacy media and still supports
  selected image/application-asset paths. Historical Supabase objects that were
  recoverable have been copied to R2 under `legacy-supabase/` paths.
- New video uploads never fall back to Supabase: they fail if R2 is unavailable.
  Image and thumbnail writes currently retain a Supabase fallback, as defined
  in `server/public-media-storage.ts`.
- Existing Supabase signed URLs are cached server-side for most of their lifetime to improve CDN reuse.

Authoritative files:

- `server/public-media-storage.ts` — public-media routing and fallback.
- `server/r2-storage.ts` — R2 S3-compatible client and object naming.
- `server/supabase-storage.ts` — Supabase buckets, signed URLs, and legacy storage.
- `server/video-processor.ts` — video/transcode/thumbnail output path.

Required R2 settings are `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
`R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_ENDPOINT`, and
`R2_PUBLIC_BASE_URL`. Production secret values belong in Railway Variables;
local values belong in a gitignored environment file. They must never be
committed.

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

Production is hosted by Railway in EU West as one Dockerized Node.js service.
Railway builds from `main` using `Dockerfile`, reads deployment settings from
`railway.json`, and gates new deployments on `/api/health/ready`. A production
build contains:

```text
dist/public/   compiled SPA and static assets
dist/index.js  bundled Express server
```

Pushing to `main` triggers a Railway deployment automatically. A successful
Git push still does not prove that the build passed, the new container became
active, or the application is healthy; verify the Railway deployment and live
health/data checks.

The service intentionally runs one replica. Upload/transcode working files,
TUS state, and several scheduled jobs remain local to or execute inside the web
process. Do not enable horizontal scaling until those responsibilities have
been moved to shared durable storage and singleton workers.

Authoritative deployment files:

- `Dockerfile` — production image and runtime dependencies.
- `railway.json` — Railway build, health check, and restart policy.
- `docs/operations/railway-migration.md` — migration decisions and operational constraints.

## Monitoring and observability

- `/api/health/live` verifies that the Node.js process and event loop can
  respond without touching PostgreSQL.
- `/api/health/ready` is Railway's deployment readiness check and verifies the
  full Express handler finished loading. It intentionally does not query
  PostgreSQL; the external canary and `/api/health` cover database readiness.
- `/api/health` is the public database-aware health probe.
- Sentry captures client/server errors and performance signals where configured.
- The separate `BetaONEIO/yourl-uptime` repository runs the **Gamefolio
  Production Canary** in GitHub Actions every five minutes. It checks database
  readiness, non-empty season and weekly leaderboards, rendered leaderboard
  content, a known production profile, recent clips plus media delivery, and
  the permanent logo asset. Failures use its Telegram alert integration.

Monitoring is deliberately external to the Railway service so a crashed or
blocked application cannot report itself as healthy merely because its static
SPA shell still returns HTTP 200.

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
6. Railway Variables define production credentials; local `.env*` files and
   retained Replit secrets are not production deployment configuration.
7. `Dockerfile` and `railway.json` define the production runtime and deployment
   health gate.
8. Generated `dist/` files and historical proposal documents are not architectural sources of truth.

## Keeping this document accurate

Update `ARCHITECTURE.md` in the same pull request or commit when changing any of the following:

- hosting provider or process topology;
- production monitoring or health-check ownership;
- frontend or backend framework;
- database provider/ORM or schema ownership;
- authentication/session strategy;
- media storage routing;
- payments/subscription ownership;
- blockchain network or wallet provider;
- native mobile framework or build pipeline.

For detailed operational procedures, use `AGENTS.md`. For product and historical implementation context, use `replit.md`, but confirm time-sensitive claims against the source files above.
