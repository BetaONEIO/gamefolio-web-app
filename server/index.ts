import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import { eq } from 'drizzle-orm';
import { initServerSentry } from './sentry';
import * as Sentry from '@sentry/node';
import { db } from './db';
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
import adminRoutes from './routes/admin';
import uploadRoutes from './routes/upload';
import twitchGamesRoutes from './routes/twitch-games';
import gfCheckoutRoutes from './routes/gf-checkout';
import proSubscriptionRoutes from './routes/pro-subscription';
import gfWebhookRoutes from './routes/gf-webhook';
import gfStakingRoutes from './routes/gf-staking';
import { blockCryptoOnNative } from './middleware/block-crypto-on-native';
import { requestContextMiddleware } from './request-context';
import storeRoutes from './routes/store';
import gamefolioPurchaseRoutes from './routes/gamefolio-purchases';
import revenuecatRoutes from './routes/revenuecat';
import oauthProviderRoutes from './routes/oauth-provider';
import developerPortalRoutes from './routes/developer-portal';
import publicApiV1Routes from './routes/public-api-v1';
import oauthUserApiRoutes from './routes/oauth-user-api';
import adminOAuthRoutes from './routes/admin-oauth';
import { createOGMetaMiddleware } from './og-meta';
import { storage } from './storage';
import { LeaderboardService, loadXpSettingsFromDB } from './leaderboard-service';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

initServerSentry();

const app = express();

// Trust proxy for production deployment
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
}));

// CORS configuration for production and mobile apps
function isOriginAllowed(origin: string, allowedOrigins: string[]): boolean {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  const hostname = url.hostname; // e.g. "app.gamefolio.com" (no port)
  const host = url.host;         // e.g. "localhost:8081" (with port)

  return allowedOrigins.some(allowed => {
    if (allowed === 'localhost') {
      return hostname === 'localhost';
    }
    if (allowed.startsWith('localhost:')) {
      return host === allowed;
    }
    if (allowed.startsWith('.')) {
      const domain = allowed.slice(1); // ".gamefolio.com" → "gamefolio.com"
      return hostname === domain || hostname.endsWith(allowed);
    }
    return hostname === allowed;
  });
}

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    '.replit.app',
    '.repl.co',
    'localhost',        // also matches capacitor://localhost and https://localhost (Capacitor iOS/Android webview)
    'localhost:8081',   // Expo local development
    'localhost:19006',  // Expo web development
    '.gamefolio.com',
    'gamefolio.com',
    '.exp.direct',      // Expo development
    'exp.direct',       // Expo development
    '.expo.dev',        // Expo development
    'expo.dev',         // Expo development
  ];

  if (origin && isOriginAllowed(origin, allowedOrigins)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With, Upload-Type, Upload-Length, Upload-Offset, Upload-Metadata, Tus-Resumable, Upload-Defer-Length, Upload-Checksum');
  res.setHeader('Access-Control-Expose-Headers', 'Upload-Offset, Upload-Length, Tus-Resumable, Upload-Metadata, Upload-Result');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }

  next();
});

// IMPORTANT: Register webhook routes BEFORE express.json() middleware
// Webhooks need raw body for signature verification
app.use(gfWebhookRoutes);

// Configure body parser with larger limits to support file uploads
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: false, limit: '500mb' }));

// Expose the request's platform header + user-agent to deep call sites via
// AsyncLocalStorage (e.g. signup-source detection in notifyNewSignup). Must run
// before the route handlers so the context wraps async handlers.
app.use(requestContextMiddleware);

// Refuse crypto/wallet/NFT/staking endpoints for native (Capacitor) clients —
// the mobile apps ship without crypto features for App Store / Play financial
// compliance. Web requests (no X-GF-Platform header) pass through untouched.
app.use(blockCryptoOnNative);

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
const wellKnownDir = path.resolve(process.cwd(), 'client/public/.well-known');
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

(async () => {
  try {
    const server = await registerRoutes(app);

    // Load XP settings from DB and sync into POINT_VALUES
    await loadXpSettingsFromDB();

    // Ensure special accounts exist in whichever DB this environment uses
    await ensureBabyTomlinsonAccount();

    // Serve static email assets
    app.use('/static/email-assets', express.static(path.join(__dirname, 'static/email-assets')));

    app.use('/api', authRoutes);
    app.use('/api', socialOAuthRoutes);
    app.use('/api/admin', adminRoutes);
    app.use('/api', uploadRoutes);
    app.use('/api/twitch', twitchGamesRoutes);
    app.use(gfCheckoutRoutes);
    app.use(proSubscriptionRoutes);
    app.use(gfStakingRoutes);
    app.use(storeRoutes);
    app.use(gamefolioPurchaseRoutes);
    app.use(revenuecatRoutes);
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
          streamer: 'Streamer', gamer: 'Gamer', professional_gamer: 'Pro Gamer',
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

    // ALWAYS serve the app on port 5000
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = process.env.NODE_ENV === "development" && process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: process.env.NODE_ENV !== "development",
    }, () => {
      log(`serving on port ${port}`);

      LeaderboardService.processPeriodicLeaderboardClosures()
        .then(() => log('Leaderboard periodic closures check completed'))
        .catch((err) => console.error('Leaderboard closures check failed:', err));

      setInterval(() => {
        LeaderboardService.processPeriodicLeaderboardClosures()
          .catch((err) => console.error('Leaderboard closures check failed:', err));
      }, 6 * 60 * 60 * 1000);

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
    });
  } catch (error) {
    console.error("Fatal server error:", error);
    process.exit(1);
  }
})();