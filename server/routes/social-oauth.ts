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
    const errorStr = String(error).toLowerCase();
    if (errorStr.includes('redirect') || errorStr.includes('redirect_uri')) {
      return res.redirect('/settings/profile?tab=streamer&kick_error=redirect_uri_mismatch');
    }
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

  // ── Step 1: Exchange code for token ────────────────────────────────────────
  let accessToken: string;
  try {
    const callbackUrl = `${getBaseUrl(req)}/api/auth/kick/callback`;
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
    accessToken = tokenRes.data.access_token;
  } catch (err: any) {
    console.error('Kick token exchange error:', err?.response?.status, err?.response?.data);
    return res.redirect('/settings/profile?tab=streamer&kick_error=auth_failed');
  }

  // ── Step 2: Fetch user profile ──────────────────────────────────────────────
  try {
    const profileRes = await axios.get('https://api.kick.com/public/v1/users', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    // Response may be { data: {...} } or { data: [{...}] } or the object directly
    const raw = profileRes.data?.data ?? profileRes.data;
    const kickUser = Array.isArray(raw) ? raw[0] : raw;

    if (!kickUser) {
      return res.redirect('/settings/profile?tab=streamer&kick_error=no_channel');
    }

    const kickId = String(kickUser.id ?? kickUser.user_id ?? '');
    const channelName = kickUser.slug ?? kickUser.username ?? kickUser.name ?? kickUser.channel?.slug ?? '';

    if (!channelName) {
      return res.redirect('/settings/profile?tab=streamer&kick_error=no_channel');
    }

    // Save to DB – also set platform to kick
    await db.update(users).set({
      streamPlatform: 'kick',
      streamChannelName: channelName,
      kickChannelName: channelName,
      kickId,
      kickVerified: true,
    }).where(eq(users.id, userId));

    return res.redirect('/settings/profile?tab=streamer&kick_connected=true');
  } catch (err: any) {
    console.error('Kick profile fetch error:', err?.response?.status, err?.response?.data);
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
      kickChannelName: null,
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
      twitchChannelName: channelName,
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
      twitchChannelName: null,
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
// Rumble  OAuth 2.0  (Authorization Code flow)
// ─────────────────────────────────────────────────────────────────────────────
//
// Required env vars:
//   RUMBLE_CLIENT_ID      – from rumble.com developer portal
//   RUMBLE_CLIENT_SECRET  – from rumble.com developer portal
//
// Redirect URI to register in your Rumble app:
//   https://<your-domain>/api/auth/rumble/callback
// ─────────────────────────────────────────────────────────────────────────────

router.get('/auth/rumble/connect', (req: Request, res: Response) => {
  if (!(req.user as any)?.id) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  const clientId = process.env.RUMBLE_CLIENT_ID;
  if (!clientId) {
    return res.status(503).json({ message: 'Rumble OAuth is not configured.' });
  }

  const state = crypto.randomBytes(16).toString('hex');
  (req.session as any).rumbleOAuthState = state;
  (req.session as any).rumbleOAuthUserId = (req.user as any).id;

  req.session.save(() => {
    const callbackUrl = `${getBaseUrl(req)}/api/auth/rumble/callback`;
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: callbackUrl,
      scope: 'openid',
      state,
    });

    res.redirect(`https://rumble.com/api/oauth2/authorize?${params.toString()}`);
  });
});

router.get('/auth/rumble/callback', async (req: Request, res: Response) => {
  const { code, state, error } = req.query;

  const storedState = (req.session as any).rumbleOAuthState;
  const userId = (req.session as any).rumbleOAuthUserId;

  delete (req.session as any).rumbleOAuthState;
  delete (req.session as any).rumbleOAuthUserId;

  if (error) {
    return res.redirect('/settings/profile?tab=streamer&rumble_error=access_denied');
  }

  if (!code || !state || state !== storedState || !userId) {
    return res.redirect('/settings/profile?tab=streamer&rumble_error=invalid_state');
  }

  const clientId = process.env.RUMBLE_CLIENT_ID;
  const clientSecret = process.env.RUMBLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.redirect('/settings/profile?tab=streamer&rumble_error=not_configured');
  }

  try {
    const callbackUrl = `${getBaseUrl(req)}/api/auth/rumble/callback`;

    // Exchange code for access token
    const tokenRes = await axios.post(
      'https://rumble.com/api/oauth2/token',
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

    // Fetch user profile from Rumble
    const profileRes = await axios.get('https://rumble.com/api/User.Info', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const rumbleUser = profileRes.data?.data ?? profileRes.data;
    if (!rumbleUser) {
      return res.redirect('/settings/profile?tab=streamer&rumble_error=no_user');
    }

    const rumbleId = String(rumbleUser.id ?? rumbleUser.user_id ?? '');
    const channelName = rumbleUser.username ?? rumbleUser.slug ?? rumbleUser.name ?? '';

    if (!channelName) {
      return res.redirect('/settings/profile?tab=streamer&rumble_error=no_user');
    }

    // Save to DB
    await db.update(users).set({
      streamPlatform: 'rumble',
      streamChannelName: channelName,
      rumbleChannelName: channelName,
      rumbleId,
      rumbleVerified: true,
    }).where(eq(users.id, userId));

    return res.redirect('/settings/profile?tab=streamer&rumble_connected=true');
  } catch (err: any) {
    console.error('Rumble OAuth callback error:', err?.response?.data || err.message);
    return res.redirect('/settings/profile?tab=streamer&rumble_error=auth_failed');
  }
});

router.post('/auth/rumble/disconnect', async (req: Request, res: Response) => {
  if (!(req.user as any)?.id) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  try {
    await db.update(users).set({
      streamChannelName: null,
      rumbleChannelName: null,
      rumbleId: null,
      rumbleVerified: false,
    }).where(eq(users.id, (req.user as any).id));

    res.json({ success: true });
  } catch (err) {
    console.error('Rumble disconnect error:', err);
    res.status(500).json({ message: 'Failed to disconnect Rumble' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Config check endpoint – lets the frontend know which OAuth providers are set up
// ─────────────────────────────────────────────────────────────────────────────

router.get('/auth/social-oauth/config', (_req: Request, res: Response) => {
  res.json({
    kick: !!process.env.KICK_CLIENT_ID,
    twitch: !!process.env.TWITCH_CLIENT_ID,
    rumble: !!process.env.RUMBLE_CLIENT_ID,
  });
});

export default router;
