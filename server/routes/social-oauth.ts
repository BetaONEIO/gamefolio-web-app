import { Router, Request, Response } from 'express';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import axios from 'axios';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function base64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function generateCodeVerifier(): string {
  return base64url(crypto.randomBytes(32));
}

function generateCodeChallenge(verifier: string): string {
  return base64url(crypto.createHash('sha256').update(verifier).digest());
}

function getBaseUrl(req: Request): string {
  // Explicit override wins — set APP_BASE_URL in Replit secrets for dev/prod
  if (process.env.APP_BASE_URL) {
    return process.env.APP_BASE_URL.replace(/\/$/, '');
  }
  // Fallback: use forwarded headers (may still be localhost behind some proxies)
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${proto}://${host}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Kick  OAuth 2.0
// ─────────────────────────────────────────────────────────────────────────────
//
// Required env vars:
//   KICK_CLIENT_ID      – from kick.com/developer  (or dash.kick.com)
//   KICK_CLIENT_SECRET  – from kick.com/developer
//
// Redirect URI to register in your Kick app:
//   https://<your-domain>/api/auth/kick/callback
// ─────────────────────────────────────────────────────────────────────────────

router.get('/auth/kick/connect', (req: Request, res: Response) => {
  if (!(req.user as any)?.id) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  const clientId = process.env.KICK_CLIENT_ID;
  if (!clientId) {
    return res.status(503).json({ message: 'Kick OAuth is not configured.' });
  }

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = crypto.randomBytes(16).toString('hex');

  (req.session as any).kickOAuthState = state;
  (req.session as any).kickOAuthVerifier = codeVerifier;
  (req.session as any).kickOAuthUserId = (req.user as any).id;

  req.session.save(() => {
    const callbackUrl = `${getBaseUrl(req)}/api/auth/kick/callback`;
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: callbackUrl,
      scope: 'user:read',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    res.redirect(`https://id.kick.com/oauth/authorize?${params.toString()}`);
  });
});

router.get('/auth/kick/callback', async (req: Request, res: Response) => {
  const { code, state, error } = req.query;

  const storedState = (req.session as any).kickOAuthState;
  const codeVerifier = (req.session as any).kickOAuthVerifier;
  const userId = (req.session as any).kickOAuthUserId;

  delete (req.session as any).kickOAuthState;
  delete (req.session as any).kickOAuthVerifier;
  delete (req.session as any).kickOAuthUserId;

  if (error) {
    return res.redirect('/settings/profile?tab=streamer&kick_error=access_denied');
  }

  if (!code || !state || state !== storedState || !userId) {
    return res.redirect('/settings/profile?tab=streamer&kick_error=invalid_state');
  }

  const clientId = process.env.KICK_CLIENT_ID;
  const clientSecret = process.env.KICK_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.redirect('/settings/profile?tab=streamer&kick_error=not_configured');
  }

  try {
    const callbackUrl = `${getBaseUrl(req)}/api/auth/kick/callback`;

    // Exchange code for token
    const tokenRes = await axios.post(
      'https://id.kick.com/oauth/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: callbackUrl,
        code: code as string,
        code_verifier: codeVerifier,
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const accessToken = tokenRes.data.access_token;

    // Fetch user profile from Kick API
    const profileRes = await axios.get('https://api.kick.com/public/v1/user', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const kickUser = profileRes.data.data ?? profileRes.data;
    const kickId = String(kickUser.id ?? kickUser.user_id ?? '');
    const channelName = kickUser.slug ?? kickUser.username ?? kickUser.channel?.slug ?? '';

    if (!channelName) {
      return res.redirect('/settings/profile?tab=streamer&kick_error=no_channel');
    }

    // Save to DB – also set platform to kick
    await db.update(users).set({
      streamPlatform: 'kick',
      streamChannelName: channelName,
      kickId,
      kickVerified: true,
    }).where(eq(users.id, userId));

    return res.redirect('/settings/profile?tab=streamer&kick_connected=true');
  } catch (err: any) {
    console.error('Kick OAuth callback error:', err?.response?.data || err.message);
    return res.redirect('/settings/profile?tab=streamer&kick_error=auth_failed');
  }
});

router.post('/auth/kick/disconnect', async (req: Request, res: Response) => {
  if (!(req.user as any)?.id) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  try {
    await db.update(users).set({
      streamChannelName: null,
      kickId: null,
      kickVerified: false,
    }).where(eq(users.id, (req.user as any).id));

    res.json({ success: true });
  } catch (err) {
    console.error('Kick disconnect error:', err);
    res.status(500).json({ message: 'Failed to disconnect Kick' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Twitch  OAuth 2.0  (Authorization Code flow)
// ─────────────────────────────────────────────────────────────────────────────
//
// Required env vars:
//   TWITCH_CLIENT_ID      – from dev.twitch.tv
//   TWITCH_CLIENT_SECRET  – from dev.twitch.tv
//
// Redirect URI to add in your Twitch app:
//   https://<your-domain>/api/auth/twitch-stream/callback
//
// (Note: using /twitch-stream/ to avoid collision with existing Twitch Games API routes)
// ─────────────────────────────────────────────────────────────────────────────

router.get('/auth/twitch-stream/connect', (req: Request, res: Response) => {
  if (!(req.user as any)?.id) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  const clientId = process.env.TWITCH_CLIENT_ID;
  if (!clientId) {
    return res.status(503).json({ message: 'Twitch OAuth is not configured.' });
  }

  const state = crypto.randomBytes(16).toString('hex');
  (req.session as any).twitchOAuthState = state;
  (req.session as any).twitchOAuthUserId = (req.user as any).id;

  req.session.save(() => {
    const callbackUrl = `${getBaseUrl(req)}/api/auth/twitch-stream/callback`;
    console.log('[Twitch OAuth] REPLIT_DOMAINS:', process.env.REPLIT_DOMAINS);
    console.log('[Twitch OAuth] x-forwarded-proto:', req.headers['x-forwarded-proto']);
    console.log('[Twitch OAuth] x-forwarded-host:', req.headers['x-forwarded-host']);
    console.log('[Twitch OAuth] host:', req.get('host'));
    console.log('[Twitch OAuth] callbackUrl:', callbackUrl);
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: callbackUrl,
      scope: 'user:read:email',
      state,
    });

    res.redirect(`https://id.twitch.tv/oauth2/authorize?${params.toString()}`);
  });
});

router.get('/auth/twitch-stream/callback', async (req: Request, res: Response) => {
  const { code, state, error } = req.query;

  const storedState = (req.session as any).twitchOAuthState;
  const userId = (req.session as any).twitchOAuthUserId;

  delete (req.session as any).twitchOAuthState;
  delete (req.session as any).twitchOAuthUserId;

  if (error) {
    return res.redirect('/settings/profile?tab=streamer&twitch_error=access_denied');
  }

  if (!code || !state || state !== storedState || !userId) {
    return res.redirect('/settings/profile?tab=streamer&twitch_error=invalid_state');
  }

  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.redirect('/settings/profile?tab=streamer&twitch_error=not_configured');
  }

  try {
    const callbackUrl = `${getBaseUrl(req)}/api/auth/twitch-stream/callback`;

    // Exchange code for access token
    const tokenRes = await axios.post(
      'https://id.twitch.tv/oauth2/token',
      new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code as string,
        grant_type: 'authorization_code',
        redirect_uri: callbackUrl,
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const accessToken = tokenRes.data.access_token;

    // Fetch user profile from Twitch
    const profileRes = await axios.get('https://api.twitch.tv/helix/users', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Client-Id': clientId,
      },
    });

    const twitchUser = profileRes.data.data?.[0];
    if (!twitchUser) {
      return res.redirect('/settings/profile?tab=streamer&twitch_error=no_user');
    }

    const twitchUserId = twitchUser.id;
    const channelName = twitchUser.login; // Twitch login = channel name (lowercase)

    // Save to DB
    await db.update(users).set({
      streamPlatform: 'twitch',
      streamChannelName: channelName,
      twitchUserId,
      twitchVerified: true,
    }).where(eq(users.id, userId));

    return res.redirect('/settings/profile?tab=streamer&twitch_connected=true');
  } catch (err: any) {
    console.error('Twitch OAuth callback error:', err?.response?.data || err.message);
    return res.redirect('/settings/profile?tab=streamer&twitch_error=auth_failed');
  }
});

router.post('/auth/twitch-stream/disconnect', async (req: Request, res: Response) => {
  if (!(req.user as any)?.id) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  try {
    await db.update(users).set({
      streamChannelName: null,
      twitchUserId: null,
      twitchVerified: false,
    }).where(eq(users.id, (req.user as any).id));

    res.json({ success: true });
  } catch (err) {
    console.error('Twitch disconnect error:', err);
    res.status(500).json({ message: 'Failed to disconnect Twitch' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Config check endpoint – lets the frontend know which OAuth providers are set up
// ─────────────────────────────────────────────────────────────────────────────

router.get('/auth/social-oauth/config', (_req: Request, res: Response) => {
  res.json({
    kick: !!process.env.KICK_CLIENT_ID,
    twitch: !!process.env.TWITCH_CLIENT_ID,
  });
});

export default router;
