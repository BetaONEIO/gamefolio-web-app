import { performanceMiddleware, startRuntimeMetrics, timedMiddleware } from "./performance";
import { reportSlowRequest } from "./sentry";
import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import { eq } from 'drizzle-orm';
import { initServerSentry } from './sentry';
import * as Sentry from '@sentry/node';
import { db } from './db';
import creatorAnalyticsRoutes from './routes/creator-analytics';
import { users } from '../shared/schema';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

async function ensureBabyTomlinsonAccount() {
  try {
    const username = 'baby_tomlinson';
    const [existing] = await db.select().from(users).where(eq(users.username, username));
    if (existing) return;

    const salt = randomBytes(16).toString('hex');
    const buf = (await scryptAsync('BabyT2026!', salt, 64)) as Buffer;
    const hashed = `${buf.toString('hex')}.${salt}`;

    await db.insert(users).values({
      username,
      displayName: 'Baby Tomlinson 👶🎮',
      password: hashed,
      bio: 'Level 1 gamer. Expert at drooling on controllers. Respawn speed: 9 months. Currently mastering the art of not falling asleep mid-match. 👶🍼🎮',
      email: null,
      emailVerified: true,
      role: 'user',
      status: 'active',
      isPro: false,
      isPartner: false,
      isAmbassador: false,
      level: 1,
      totalXP: 0,
      messagingEnabled: true,
      isPrivate: false,
      authProvider: 'local',
      userType: 'Casual Gamer',
      showUserType: true,
      backgroundColor: '#1a0a2e',
      cardColor: '#2d1b4e',
      accentColor: '#ff6eb4',
      primaryColor: '#1a0a2e',
      avatarBorderColor: '#ff6eb4',
      layoutStyle: 'grid',
    } as any);
    log('baby_tomlinson account created');
  } catch (err) {
    console.error('Failed to ensure baby_tomlinson account:', err);
  }
}

async function ensureOnboardingTestAccount() {
  try {
    const email = 'onboarding@gamefolio.com';
    const username = 'onboardingtest';

    const [existing] = await db.select().from(users).where(eq(users.email, email));
    if (existing) return;

    const [byUsername] = await db.select().from(users).where(eq(users.username, username));
    const salt = randomBytes(16).toString('hex');
    const buf = (await scryptAsync('Helloworld1!', salt, 64)) as Buffer;
    const hashed = `${buf.toString('hex')}.${salt}`;

    if (byUsername) {
      await db.update(users).set({ email, password: hashed, emailVerified: true, userType: null }).where(eq(users.id, byUsername.id));
    } else {
      await db.insert(users).values({ username, email, password: hashed, displayName: 'Onboarding Test', emailVerified: true, userType: null, authProvider: 'local', role: 'user', status: 'active' });
    }
    log('Onboarding test account ready');
  } catch (err) {
    console.error('Failed to ensure onboarding test account:', err);
  }
}
import { setupVite, serveStatic, log } from './vite';
import { registerRoutes } from './routes';
import { runMigration } from './migrate-to-supabase';
import authRoutes from './routes/auth-routes';
import socialOAuthRoutes from './routes/social-oauth';
import vpzonePulseRoutes from './routes/vpzone-pulse';
import internalReportRoutes from './routes/internal-reports';
import adminRoutes from './routes/admin';
import uploadRoutes from './routes/upload';
import twitchGamesRoutes from './routes/twitch-games';
import gfCheckoutRoutes from './routes/gf-checkout';
import proSubscriptionRoutes from './routes/pro-subscription';
import indieDevSubscriptionRoutes from './routes/indie-dev-subscription';
import gfWebhookRoutes from './routes/gf-webhook';
import gfStakingRoutes from './routes/gf-staking';
import { blockCryptoOnNative } from './middleware/block-crypto-on-native';
import { requestContextMiddleware } from './request-context';
import storeRoutes from './routes/store';
import gamefolioPurchaseRoutes from './routes/gamefolio-purchases';
import revenuecatRoutes from './routes/revenuecat';
import { ambassadorRouter } from './routes/ambassador';
import oauthProviderRoutes from './routes/oauth-provider';
import developerPortalRoutes from './routes/developer-portal';
import publicApiV1Routes from './routes/public-api-v1';
import oauthUserApiRoutes from './routes/oauth-user-api';
import adminOAuthRoutes from './routes/admin-oauth';
import { createOGMetaMiddleware } from './og-meta';
import { storage } from './storage';
import { syncExistingStreamersToMarketing } from './marketing-sync';
import { LeaderboardService, loadXpSettingsFromDB } from './leaderboard-service';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { firebaseAuthProxy } from './firebase-auth-proxy';
import { createRateLimiter, normalizedIp } from './middleware/rate-limit';
import { corsMiddleware } from './cors';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

initServerSentry();

const app = express();
app.use(performanceMiddleware({ onSlow: reportSlowRequest }));
if (process.env.NODE_ENV === 'production') startRuntimeMetrics();

// Trust proxy for production deployment
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// Keep the public app on one canonical hostname. Railway terminates TLS for
// the legacy nested hostname, then Express preserves the requested path and
// query string while redirecting users and crawlers to app.gamefolio.com.
app.use((req, res, next) => {
  if (req.hostname.toLowerCase() === "www.app.gamefolio.com") {
    return res.redirect(308, `https://app.gamefolio.com${req.originalUrl}`);
  }

  next();
});

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'self'"],
      scriptSrc: [
        "'self'",
        'https://js.stripe.com',
        'https://static.cloudflareinsights.com',
        'https://accounts.google.com',
      ],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      mediaSrc: ["'self'", 'blob:', 'https:'],
      connectSrc: ["'self'", 'https:', 'wss:'],
      frameSrc: ["'self'", 'https://js.stripe.com', 'https://hooks.stripe.com', 'https://accounts.google.com', 'https:'],
      formAction: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
}));

// Keep Firebase's redirect helper on the same origin as the web app. This
// must be registered before body parsing and the SPA fallback.
app.use('/__/auth', firebaseAuthProxy);

// Liveness remains independent of sessions and database availability, but is
// registered after Helmet so monitoring responses receive the same baseline
// browser-security headers as the rest of the service.
app.get('/api/health/live', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ status: 'ok' });
});

// CORS for the web app and Capacitor WebViews. Android's origin is
// https://localhost (see server/cors.ts); the browser blocks the tus POST
// unless this middleware echoes that origin on the preflight.
app.use(corsMiddleware);

// Prevent browsers from caching HTML responses in development so Vite HMR
// changes are always visible without manual cache clearing.
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/@') && !req.path.includes('.')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
    }
    next();
  });
}

// IMPORTANT: Register webhook routes BEFORE express.json() middleware
// Webhooks need raw body for signature verification
app.use(gfWebhookRoutes);

// Configure body parser with larger limits to support file uploads
app.use(timedMiddleware('http.body.json', express.json({ limit: '10mb' })));
app.use(timedMiddleware('http.body.urlencoded', express.urlencoded({ extended: false, limit: '2mb' })));

// Authentication endpoints are intentionally throttled before route
// registration. Key by both source IP and account identifier so distributed
// guessing against one account and broad attacks from one client are bounded.
const authIpRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  keyFn: normalizedIp,
  message: 'Too many authentication attempts. Please try again in 15 minutes.',
});
const authAccountRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyFn: (req) => {
    const identifier = req.body?.username ?? req.body?.email ?? req.body?.userId;
    return identifier === undefined || identifier === null
      ? null
      : String(identifier).trim().toLowerCase();
  },
  message: 'Too many attempts for this account. Please try again in 15 minutes.',
});
const rateLimitedAuthPaths = new Set([
  '/api/login',
  '/api/register',
  '/api/2fa/verify',
  '/api/auth/token/login',
  '/api/auth/verify-password',
  '/api/auth/forgot-password',
  '/api/auth/verify-reset-code',
  '/api/auth/reset-password',
  '/api/auth/verify-code',
  '/api/auth/discord/init',
  '/api/auth/discord/token',
]);
app.use((req, res, next) => {
  if (req.method !== 'POST' || !rateLimitedAuthPaths.has(req.path)) return next();
  return authIpRateLimiter(req, res, (ipError?: unknown) => {
    if (ipError) return next(ipError);
    return authAccountRateLimiter(req, res, next);
  });
});

// Expose the request's platform header + user-agent to deep call sites via
// AsyncLocalStorage (e.g. signup-source detection in notifyNewSignup). Must run
// before the route handlers so the context wraps async handlers.
app.use(requestContextMiddleware);

// Refuse crypto/wallet/NFT/staking endpoints for native (Capacitor) clients —
// the mobile apps ship without crypto features for App Store / Play financial
// compliance. Web requests (no X-GF-Platform header) pass through untouched.
app.use(blockCryptoOnNative);
app.use('/api/internal/reports', internalReportRoutes);
app.use('/api/internal/creator-analytics', creatorAnalyticsRoutes);

// All referenced /attached_assets/* files live under client/public/
// attached_assets/ and ship via the SPA build to dist/public/attached_assets/,
// where serveStatic picks them up. The previous public route over the
// repo-root attached_assets/ directory has been removed to avoid exposing
// dev/agent scratch content.

// Universal Links (iOS) + App Links (Android) domain-association files.
// Served explicitly, before the SPA catch-all, with an application/json
// content type: the AASA file has no extension so express.static would
// mislabel it, and a miss would otherwise fall through to index.html and
// break link verification.
const wellKnownDir = path.resolve(
  process.cwd(),
  process.env.NODE_ENV === 'production'
    ? 'dist/public/.well-known'
    : 'client/public/.well-known',
);
app.get('/.well-known/apple-app-site-association', (_req, res) => {
  res.type('application/json').sendFile(path.join(wellKnownDir, 'apple-app-site-association'));
});
app.get('/.well-known/assetlinks.json', (_req, res) => {
  res.type('application/json').sendFile(path.join(wellKnownDir, 'assetlinks.json'));
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

export async function startApplication(server: import('node:http').Server) {
  try {
    const startupStage = async (stage: string, task: () => Promise<unknown>) => {
      const started = performance.now();
      await task();
      console.log(JSON.stringify({ event: 'startup_stage', stage, durationMs: Math.round(performance.now() - started) }));
    };
    await startupStage('routes', () => registerRoutes(app, server));

    // Load XP settings from DB and sync into POINT_VALUES
    await startupStage('xp_settings', loadXpSettingsFromDB);

    // Ensure special accounts exist in whichever DB this environment uses
    await startupStage('special_accounts', ensureBabyTomlinsonAccount);

    // Serve static email assets
    app.use('/static/email-assets', express.static(path.join(__dirname, 'static/email-assets')));

    app.use('/api', authRoutes);
    app.use('/api', socialOAuthRoutes);
    app.use('/api/integrations/vpzone', vpzonePulseRoutes);
    app.use('/api/admin', adminRoutes);
    app.use('/api', uploadRoutes);
    app.use('/api/twitch', twitchGamesRoutes);
    app.use(gfCheckoutRoutes);
    app.use(proSubscriptionRoutes);
    app.use(indieDevSubscriptionRoutes);
    app.use(gfStakingRoutes);
    app.use(storeRoutes);
    app.use(gamefolioPurchaseRoutes);
    app.use(revenuecatRoutes);
    app.use(ambassadorRouter);
    app.use(oauthProviderRoutes); // /oauth/authorize, /oauth/token, /oauth/revoke — unprefixed, standard OAuth issuer paths
    app.use('/api/developer', developerPortalRoutes);
    app.use('/api/public/v1', publicApiV1Routes);
    app.use('/api/oauth', oauthUserApiRoutes);
    app.use('/api/admin/oauth', adminOAuthRoutes);

    // Social media preview route - must be before Vite middleware
    app.get('/profile/:username', async (req, res, next) => {
      const userAgent = req.headers['user-agent'] || '';
      
      // Detect social media crawlers
      const isSocialBot = /facebookexternalhit|twitterbot|LinkedInBot|WhatsApp|TelegramBot|discordbot|Slackbot|redditbot|SkypeUriPreview|GoogleBot|bingbot/i.test(userAgent);
      
      if (!isSocialBot) {
        // Not a social media bot, continue to regular SPA routing
        return next();
      }

      try {
        const { username } = req.params;
        
        // Fetch user data
        const user = await db.select().from(users).where(eq(users.username, username)).limit(1);
        
        if (!user.length) {
          return res.status(404).send('<html><head><title>Profile Not Found</title></head><body>Profile not found</body></html>');
        }

        const profile = user[0];
        
        // Generate preview image URL - handle both local dev and production
        const getBaseUrl = () => {
          // In production/Replit, always use HTTPS
          if (process.env.REPLIT_DEPLOYMENT || process.env.REPL_OWNER) {
            const host = req.get('host');
            return `https://${host}`;
          }
          // Local development
          return `${req.protocol}://${req.get('host')}`;
        };
        
        const baseUrl = getBaseUrl();
        const previewImageUrl = `${baseUrl}/api/social-preview/${username}`;
        const profileUrl = `${baseUrl}/profile/${username}`;

        // Build rich description from user data
        const userTypesArr = (profile.userType || '').split(',').map((t: string) => t.trim()).filter(Boolean);
        const typeLabels: Record<string, string> = {
          streamer: 'Streamer', gamer: 'Gamer', speedrunner: 'Speedrunner', professional_gamer: 'Pro Gamer',
          content_creator: 'Creator', viewer: 'Viewer',
          filthy_casual: 'Casual', doom_scroller: 'Doom Scroller'
        };
        const typePart = userTypesArr.map((t: string) => typeLabels[t] || t).slice(0, 2).join(' · ');
        const ogDescription = profile.bio 
          ? profile.bio 
          : `${typePart ? typePart + ' · ' : ''}Check out ${profile.displayName || profile.username}'s gaming portfolio on Gamefolio!`;
        
        // Create HTML with Open Graph meta tags
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${profile.displayName || profile.username} - Gamefolio</title>
    
    <!-- Open Graph meta tags for social media -->
    <meta property="og:type" content="profile">
    <meta property="og:title" content="${profile.displayName || profile.username} - Gamefolio">
    <meta property="og:description" content="${ogDescription}">
    <meta property="og:url" content="${profileUrl}">
    <meta property="og:image" content="${previewImageUrl}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:site_name" content="Gamefolio">
    
    <!-- Twitter Card meta tags -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${profile.displayName || profile.username} - Gamefolio">
    <meta name="twitter:description" content="${ogDescription}">
    <meta name="twitter:image" content="${previewImageUrl}">
    
    <!-- LinkedIn meta tags -->
    <meta property="linkedin:title" content="${profile.displayName || profile.username} - Gamefolio">
    <meta property="linkedin:description" content="${ogDescription}">
    <meta property="linkedin:image" content="${previewImageUrl}">
    
    <!-- Redirect to the actual app after a moment -->
    <meta http-equiv="refresh" content="0;url=${profileUrl}">
    <script>
      // Immediate redirect for users (not bots)
      if (!/bot|crawler|spider/i.test(navigator.userAgent)) {
        window.location.href = '${profileUrl}';
      }
    </script>
</head>
<body>
    <h1>${profile.displayName || profile.username}'s Gamefolio</h1>
    <p>${profile.bio || 'Gaming portfolio on Gamefolio'}</p>
    <p><a href="${profileUrl}">View Profile</a></p>
</body>
</html>`;

        res.setHeader('Content-Type', 'text/html');
        res.send(html);
        
      } catch (error) {
        console.error('Error generating social preview:', error);
        return next();
      }
    });

    // Open Graph meta tags middleware for clips, reels, and screenshots
    // In development, only serves OG meta HTML to social bots
    // Regular users get the normal Vite-served app
    app.use(createOGMetaMiddleware(storage));

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      console.error("Server error:", err);
      Sentry.captureException(err);
      res.status(status).json({ message });
    });

    // Unmatched /api/* routes must return JSON 404, otherwise they fall
    // through to the SPA wildcard below and the client gets index.html
    // with status 200 — which then crashes any res.json() caller.
    app.use("/api", (_req, res) => {
      res.status(404).json({ error: "Not found" });
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    {
      log('application initialisation complete');

      if (process.env.BACKGROUND_JOBS_DISABLED === 'true') {
        log('background jobs disabled for this deployment');
      } else {

      void syncExistingStreamersToMarketing()
        .catch((err) => console.error('[MarketingSync] streamer backfill failed:', err));

      LeaderboardService.processPeriodicLeaderboardClosures()
        .then(() => log('Leaderboard periodic closures check completed'))
        .catch((err) => console.error('Leaderboard closures check failed:', err));

      setInterval(() => {
        LeaderboardService.processPeriodicLeaderboardClosures()
          .catch((err) => console.error('Leaderboard closures check failed:', err));
      }, 6 * 60 * 60 * 1000);

      // Reconcile and retry durable Towerdog milestone GFT rewards. Submitted
      // transactions are checked by hash and are never blindly re-sent.
      import('./services/towerdog-milestone-rewards').then(({
        backfillTowerdogMilestoneRewards,
        processDueTowerdogRewardPayouts,
      }) => {
        const RECONCILE_INTERVAL_MS = 5 * 60 * 1000;
        const BACKFILL_INTERVAL_MS = 6 * 60 * 60 * 1000;
        const tick = () => {
          processDueTowerdogRewardPayouts()
            .catch((err) => console.error('towerdog-reward-reconcile failed:', err));
        };
        const backfill = () => {
          backfillTowerdogMilestoneRewards()
            .catch((err) => console.error('towerdog-reward-backfill failed:', err));
        };
        setTimeout(tick, 75 * 1000);
        setTimeout(backfill, 90 * 1000);
        setInterval(tick, RECONCILE_INTERVAL_MS);
        setInterval(backfill, BACKFILL_INTERVAL_MS);
      }).catch((err) => console.error('Failed to schedule Towerdog reward reconciler:', err));

      // Auto-recover stuck NFT mint payments. Runs every 5 minutes; the
      // reconciler itself only touches rows that have been pending past a
      // grace window, so this short interval just lets us catch up quickly
      // after a crash without thrashing.
      import('./routes/mint-nft').then(({ reconcileStuckMintPayments }) => {
        const RECONCILE_INTERVAL_MS = 5 * 60 * 1000;
        const tick = () => {
          reconcileStuckMintPayments()
            .then((r) => {
              if (r.scanned > 0 || r.errors.length > 0) {
                log(`mint-reconcile: scanned=${r.scanned} consumed=${r.consumed} refunded=${r.refunded} refundFailed=${r.refundFailed} skipped=${r.skipped} errors=${r.errors.length}`);
              }
            })
            .catch((err) => console.error('mint-reconcile failed:', err));
        };
        // Delay first run so the app is fully warm.
        setTimeout(tick, 60 * 1000);
        setInterval(tick, RECONCILE_INTERVAL_MS);
      }).catch((err) => console.error('Failed to schedule mint reconciler:', err));

      // Same idea for Gamefolio (custodial) purchases — store items, name
      // tags, borders, marketplace NFTs. Refunds GFT if the on-chain transfer
      // succeeded but the DB unlock failed.
      import('./routes/gamefolio-purchases').then(({ reconcileStuckGamefolioPurchases }) => {
        const RECONCILE_INTERVAL_MS = 5 * 60 * 1000;
        const tick = () => {
          reconcileStuckGamefolioPurchases()
            .then((r) => {
              if (r.scanned > 0 || r.errors.length > 0) {
                log(`gamefolio-reconcile: scanned=${r.scanned} consumed=${r.consumed} refunded=${r.refunded} refundFailed=${r.refundFailed} skipped=${r.skipped} errors=${r.errors.length}`);
              }
            })
            .catch((err) => console.error('gamefolio-reconcile failed:', err));
        };
        setTimeout(tick, 90 * 1000);
        setInterval(tick, RECONCILE_INTERVAL_MS);
      }).catch((err) => console.error('Failed to schedule gamefolio reconciler:', err));

      // Auto-refresh connected Xbox/PSN profiles. The runner only touches
      // profiles whose last sync is stale (~23h), so a 6h interval keeps every
      // connected profile fresh roughly daily while spreading API load across
      // runs rather than one big nightly batch. Set PLATFORM_AUTOSYNC_DISABLED
      // to "true" to turn it off.
      import('./platform-sync').then(({ runScheduledPlatformSync }) => {
        const SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000;
        const tick = () => {
          runScheduledPlatformSync()
            .catch((err) => console.error('platform-sync failed:', err));
        };
        // Delay first run so the app is fully warm.
        setTimeout(tick, 2 * 60 * 1000);
        setInterval(tick, SYNC_INTERVAL_MS);
      }).catch((err) => console.error('Failed to schedule platform sync:', err));

      // AI VOD-clip generation (POC): single sequential in-process worker,
      // picks up one queued job per tick. No queue system — matches the
      // app's existing "one long-lived Node process + polling timers"
      // pattern, since job volume is expected to be low at POC scale.
      import('./services/ai-vod-clip-jobs').then(({ processNextQueuedJob, expireStaleCandidates }) => {
        const POLL_INTERVAL_MS = 20 * 1000;
        const tick = () => {
          processNextQueuedJob().catch((err) => console.error('ai-vod-clip-jobs poll failed:', err));
        };
        setTimeout(tick, 30 * 1000);
        setInterval(tick, POLL_INTERVAL_MS);

        // Draft clip storage is temporary, not permanent — sweep expired
        // (unpublished, past-TTL) candidates every 6h so abandoned
        // generations don't accumulate in Supabase storage indefinitely.
        const EXPIRY_SWEEP_INTERVAL_MS = 6 * 60 * 60 * 1000;
        const expiryTick = () => {
          expireStaleCandidates()
            .then((r) => { if (r.expired > 0) log(`ai-vod-clips expiry sweep: expired=${r.expired}`); })
            .catch((err) => console.error('ai-vod-clips expiry sweep failed:', err));
        };
        setTimeout(expiryTick, 3 * 60 * 1000);
        setInterval(expiryTick, EXPIRY_SWEEP_INTERVAL_MS);
      }).catch((err) => console.error('Failed to schedule AI VOD clip job poller:', err));

      // Publish scheduled posts whose time has come. Video bytes are accepted
      // immediately and transcoded in the background; this tick inserts the
      // real clip/screenshot once that media is ready. 60s cadence keeps
      // publish latency low; each tick only touches due rows.
      import('./scheduled-posts-service').then(({ publishDueScheduledPosts }) => {
        const SCHEDULE_INTERVAL_MS = 60 * 1000;
        const tick = () => {
          publishDueScheduledPosts()
            .catch((err: any) => {
              // Suppress noisy "relation does not exist" error when the
              // scheduled_posts table hasn't been migrated yet.
              const msg: string = err?.cause?.message ?? err?.message ?? '';
              if (!msg.includes('relation "scheduled_posts" does not exist')) {
                console.error('scheduled-posts publish failed:', err);
              }
            });
        };
        setTimeout(tick, 30 * 1000);
        setInterval(tick, SCHEDULE_INTERVAL_MS);
      }).catch((err) => console.error('Failed to schedule scheduled-posts worker:', err));

      // Generate one community poll every fortnight with Claude. The worker
      // checks for an existing live/upcoming poll before calling the API, so
      // manual admin polls always take precedence. Disabled unless explicitly
      // enabled with AI_POLL_GENERATION_ENABLED=true.
      import('./services/ai-poll-generator').then(({ runFortnightlyPollGenerator }) => {
        const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
        const tick = () => {
          runFortnightlyPollGenerator()
            .then((result) => {
              if (result.status === 'created') log(`AI poll scheduled: #${result.pollId} ${result.title}`);
            })
            .catch((err) => console.error('ai-poll-generator failed:', err));
        };
        setTimeout(tick, 3 * 60 * 1000);
        setInterval(tick, CHECK_INTERVAL_MS);
      }).catch((err) => console.error('Failed to schedule AI poll generator:', err));

      // Safety net for clips left stuck in "processing" — normally
      // finishClipProcessing runs immediately in-process right after upload
      // and this never finds anything; it only matters if the server
      // restarted mid-job. Grace period (10 min, in the worker itself) keeps
      // this from racing a legitimately still-running in-process attempt.
      import('./clip-processing-worker').then(({ reconcileStuckClipProcessing, reconcileStuckScheduledMedia }) => {
        const RECONCILE_INTERVAL_MS = 5 * 60 * 1000;
        const tick = () => {
          reconcileStuckClipProcessing()
            .catch((err) => console.error('clip-processing-reconcile failed:', err));
          reconcileStuckScheduledMedia()
            .catch((err) => console.error('scheduled-media-reconcile failed:', err));
        };
        setTimeout(tick, 2 * 60 * 1000);
        setInterval(tick, RECONCILE_INTERVAL_MS);
      }).catch((err) => console.error('Failed to schedule clip-processing reconciler:', err));

      // Treasury sFUEL funds gas top-ups. Alert (rate-limited) when it drops
      // under STAKING_WALLET_LOW_BALANCE_SFUEL, including while nobody is staking.
      import('./skale-pow').then(({ checkStakingTreasuryBalance }) => {
        const TREASURY_SFUEL_CHECK_MS = 15 * 60 * 1000;
        const tick = () => {
          checkStakingTreasuryBalance().catch(() => {
            console.error('[sFUEL] periodic treasury check failed');
          });
        };
        setTimeout(tick, 60 * 1000);
        setInterval(tick, TREASURY_SFUEL_CHECK_MS);
      }).catch((err) => console.error('Failed to schedule treasury sFUEL check:', err));
      }
    }

    // Reserved VM deploys stop the old process before the new one boots —
    // there's no second instance to keep serving traffic in the meantime —
    // so without this, the SIGTERM Replit sends kills every in-flight
    // request immediately. A request that had already written its result
    // (e.g. a clip finishing processing) but hadn't sent its response yet
    // would leave the client seeing a hard failure for work the server
    // actually completed, with no way to tell the two apart. Draining lets
    // in-flight requests finish and respond normally; the timeout is a
    // safety net so one stuck request can't block a deploy forever.
    const gracefulShutdown = (signal: string) => {
      log(`${signal} received, draining in-flight requests before exit`);
      server.close(() => {
        log('all connections drained, exiting');
        process.exit(0);
      });
      setTimeout(() => {
        console.warn('Graceful shutdown timed out after 25s, forcing exit');
        process.exit(1);
      }, 25_000);
    };
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    console.error("Fatal server error:", error);
    throw error;
  }
  return app;
}
