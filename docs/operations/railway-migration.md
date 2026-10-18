# Replit to Railway migration

This is a staged migration. Replit remains production until the Railway staging deployment has passed the checks below. Creating a Railway deployment does not move or delete any database or object-storage data.

## Current service ownership

| Concern | Current provider | Migration treatment |
| --- | --- | --- |
| Web/API process | Replit Reserved VM | Recreate on Railway from the repository Dockerfile |
| PostgreSQL | Supabase PostgreSQL | Keep Supabase; use the production pooler URL from the current `DATABASE_URL` |
| Authentication and remaining storage | Supabase | Keep Supabase |
| Public videos and thumbnails | Cloudflare R2 | Keep R2 |
| Web payments | Stripe | Keep Stripe; use test-mode credentials in staging |
| Mobile subscriptions | RevenueCat | Keep RevenueCat |

Production's `DATABASE_URL` now points to the Supabase pooler and is portable to Railway. The retired Replit-managed database is being kept temporarily as a rollback copy, but it is not used by the live application and must not be connected to the Railway service.

## Stage 1: build the same application in a container

The root `Dockerfile` builds the Vite client and Express server, then runs the server with Node 20. It also installs FFmpeg and Chromium, which are application runtime dependencies.

Railway reads `railway.json`, waits for `/api/health/ready`, and supplies its own `PORT`. The production Replit fallback remains port 5000.

## Stage 2: create an isolated Railway staging service

Connect the GitHub repository to a new Railway project and deploy `main`. Do not attach `app.gamefolio.com` yet.

Use an isolated staging database for tests that create or change data. The safest setup is a Supabase preview branch or a separate Supabase project. Set that pooler connection string as `DATABASE_URL`; do not use the dormant Replit database.

Use a separate R2 staging bucket if upload tests are required. Use Stripe test-mode keys and register the Railway staging webhook URL in Stripe test mode. OAuth providers also need explicit staging callback URLs.

Set this on staging:

```text
BACKGROUND_JOBS_DISABLED=true
```

That prevents staging from publishing scheduled posts, reconciling payments, paying rewards, processing queued VOD jobs, or running other recurring production work. It does not disable normal HTTP requests.

### Core server variables

Copy values deliberately rather than exporting every Replit secret:

- `NODE_ENV=production`
- `APP_BASE_URL` and `APP_URL`: the Railway staging URL
- `DATABASE_URL`: Supabase staging pooler connection
- `SESSION_SECRET` and `JWT_SECRET`: new staging-only random values
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_ENDPOINT`, `R2_PUBLIC_BASE_URL`
- `BACKGROUND_JOBS_DISABLED=true`

The following browser values are public and are embedded while the image builds:

- `VITE_APP_URL`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_MICROSOFT_CLIENT_ID`
- `VITE_SENTRY_DSN`

Add other provider credentials only when testing that integration. Treasury, payment, messaging, push, webhook and production OAuth secrets should not be placed in staging by default.

## Stage 3: acceptance checks

1. Confirm `/api/health/live` and `/api/health/ready` return success.
2. Load the homepage, a public profile, clips and thumbnails.
3. Sign up and sign in with staging accounts.
4. Upload a test clip and confirm its video and thumbnail use the staging R2 public domain.
5. Exercise Stripe with test cards and verify the staging webhook.
6. Confirm the logs contain `background jobs disabled for this deployment`.
7. Restart/redeploy the service and repeat the health, login and media checks.

Start with one Railway replica. TUS resumable-upload state and temporary transcode files currently live on the instance's ephemeral disk; a restart can interrupt an upload already in progress, and multiple replicas would not share that state.

## Stage 4: compare before switching

Run staging long enough to measure memory, CPU, deploy duration, request latency and projected monthly usage. Compare the projected Railway bill with the Replit Reserved VM bill before changing DNS.

## Stage 5: production cutover

1. Take a fresh inventory of production environment variables.
2. Put the production Supabase pooler URL in Railway.
3. Add production integrations and webhook URLs.
4. Initially keep one replica and ensure recurring jobs run on only one process.
5. Run the acceptance checks against the Railway domain.
6. Lower DNS TTL, attach `app.gamefolio.com`, and switch traffic.
7. Keep Replit available for rollback until Railway has been stable for several days.
8. Only then stop the Replit deployment. Keep its dormant database through the agreed rollback period, then remove it separately. Do not delete Supabase, R2, or their data as part of the hosting cutover.

## Known follow-up

Move TUS upload state and long-running background work out of the web process before adding multiple web replicas. Until then, a single Railway replica matches today's Replit process topology most closely.

## Replit dependency audit

The web/API runtime does not require Replit to start. It already accepts a provider-supplied `PORT`, binds to `0.0.0.0`, trusts one reverse proxy in production, exposes `/api/health/live` and `/api/health/ready`, and handles `SIGTERM` for a graceful deployment shutdown.

### Replit-specific code that can remain during staging

- The Vite runtime-error overlay and Cartographer plugin are development-only conveniences. Cartographer only loads when `REPL_ID` exists.
- Replit host detection in the email and social-preview helpers has non-Replit fallbacks, but production should set `APP_BASE_URL`, `APP_URL`, and `SITE_URL` explicitly so those fallbacks are never needed.
- `@replit/revenuecat-sdk` is used by maintenance scripts, not by the normal web-server startup path.

### Replit-specific code that must be replaced or configured

- Stripe webhook discovery falls back to Replit connector credentials. Railway must receive an explicit `STRIPE_WEBHOOK_SECRET`, and Stripe must be configured to send production events to the new domain.
- `stripe-replit-sync` is instantiated by application code. Verify its required tables and behaviour against Supabase during staging; replace it if it proves dependent on Replit's Stripe integration rather than only PostgreSQL and Stripe credentials.
- Replit's `.replit` file supplies the current production `APP_BASE_URL` and build/run commands. Railway must supply equivalent variables and uses `Dockerfile` plus `railway.json` instead.
- Replit deployment/domain variables (`REPLIT_DEPLOYMENT`, `REPLIT_DOMAINS`, `REPLIT_DEV_DOMAIN`, `REPL_OWNER`, and `REPL_SLUG`) must not be relied on. Set the canonical URL variables explicitly and test email links, OAuth callbacks, checkout return URLs, and social-preview URLs.

### Process-topology constraints

Start Railway with exactly one replica. The application currently runs recurring jobs inside the web process, including scheduled posts, campaign scheduling, payment/reward reconciliation, platform sync, AI VOD work, daily reporting, and stuck-upload recovery. Multiple replicas would run most of these loops more than once.

Staging must set `BACKGROUND_JOBS_DISABLED=true`. Production must omit it (or set it to `false`) so the recurring work continues after cutover. Before enabling a second replica, move recurring jobs to a dedicated worker or add database-backed leader election/claims to every job.

### Ephemeral filesystem constraints

Uploaded files, TUS state, transcoding inputs/outputs, support attachments, and AI VOD working files temporarily use local disk. Completed public media is persisted to R2 or Supabase, but a deploy/restart can interrupt work in progress. Railway therefore needs enough ephemeral disk and memory for the largest accepted upload plus FFmpeg/Chromium processing. Do not enable horizontal scaling until TUS state and long-running processing are moved to shared/durable infrastructure.

### External configuration inventory

Copy secrets deliberately by feature group; do not bulk-export Replit's environment. At minimum, production needs:

- Core: `NODE_ENV`, `DATABASE_URL`, `SESSION_SECRET`, `JWT_SECRET`, `APP_BASE_URL`, `APP_URL`, `SITE_URL`.
- Supabase: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- R2: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_ENDPOINT`, `R2_PUBLIC_BASE_URL`.
- Payments/subscriptions: Stripe keys, price IDs and webhook secret; RevenueCat keys and webhook secret.
- Identity: the enabled Google, Discord, Microsoft, Twitch, Kick, Xbox, YouTube, Twitter and Apple credentials, with the Railway staging and production callback URLs registered at each provider.
- Operations: Firebase service account, Brevo, Telegram, Sentry, and any enabled alerting credentials.
- Blockchain: RPC/contract configuration, wallet encryption key, and treasury key only where the production feature requires them.
- Browser build variables: every required `VITE_*` value must be available during the Docker build, not merely at runtime.

### Acceptance gate before DNS cutover

Do not move `app.gamefolio.com` until a Railway staging deployment has passed all of these:

1. Container build and cold start, followed by live/readiness health checks.
2. Public homepage, profile, clip, screenshot, thumbnail and social-preview routes.
3. Password login, session persistence across a restart, logout, password reset and each enabled OAuth provider.
4. A test upload through the standard and resumable paths, FFmpeg processing, R2 delivery, commenting, liking and deletion.
5. Email links and OAuth/checkout return URLs use the staging hostname rather than a Replit hostname.
6. Stripe test checkout plus a signed webhook; RevenueCat webhook validation if exercised in staging.
7. `BACKGROUND_JOBS_DISABLED=true` is visible in staging logs.
8. A restart during an in-progress upload is understood to interrupt that upload; a completed upload remains available afterward.
9. Memory, CPU, disk, response latency and projected Railway spend are acceptable under representative traffic.

After production cutover, keep Replit available but idle for rollback, monitor errors and database writes, and only cancel Replit after several stable days.
