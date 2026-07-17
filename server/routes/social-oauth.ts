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
      kickShowOnProfile: true,
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
// VPZONE  OAuth 2.0
// ─────────────────────────────────────────────────────────────────────────────
//
// Required env vars:
//   VPZONE_CLIENT_ID      – from vpzone.tv/developers
//   VPZONE_CLIENT_SECRET  – from vpzone.tv/developers
//
// Redirect URI to register in your VPZONE app:
//   https://<your-domain>/api/auth/vpzone/callback
//
// Confirmed against the real vpzone.tv/developers/oauth page + live probing
// of the authorize endpoint with our actual registered client_id:
//   - authorize: GET https://vpzone.tv/oauth/authorize (OAuth 2.1 + PKCE, required)
//   - token:     POST https://vpzone.tv/api/oauth/token
//   - all other calls: Authorization: Bearer vpz_at_... against /api/v1/*
//   - scopes are resource:action pairs registered per-app in the dashboard
//     (e.g. channel:read, channel:write, chat:read...), NOT OIDC scopes -
//     "channel:read" confirmed to pass the authorize step's scope check.
//
// STILL UNVERIFIED: the exact /api/v1/* path for "get my own channel" (used
// below as /api/v1/me) and its response field names - the docs page only
// shows the generic /api/v1/* pattern, not a full endpoint reference. Check
// server logs on the first real connect attempt and correct the path/field
// mapping below if it 404s or the parsed channel name comes back empty.
// ─────────────────────────────────────────────────────────────────────────────

router.get('/auth/vpzone/connect', (req: Request, res: Response) => {
  if (!(req.user as any)?.id) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  const clientId = process.env.VPZONE_CLIENT_ID;
  if (!clientId) {
    return res.status(503).json({ message: 'VPZone OAuth is not configured.' });
  }

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = crypto.randomBytes(16).toString('hex');

  (req.session as any).vpzoneOAuthState = state;
  (req.session as any).vpzoneOAuthVerifier = codeVerifier;
  (req.session as any).vpzoneOAuthUserId = (req.user as any).id;

  req.session.save(() => {
    const callbackUrl = `${getBaseUrl(req)}/api/auth/vpzone/callback`;
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: callbackUrl,
      scope: 'channel:read',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    res.redirect(`https://vpzone.tv/oauth/authorize?${params.toString()}`);
  });
});

router.get('/auth/vpzone/callback', async (req: Request, res: Response) => {
  const { code, state, error } = req.query;

  const storedState = (req.session as any).vpzoneOAuthState;
  const codeVerifier = (req.session as any).vpzoneOAuthVerifier;
  const userId = (req.session as any).vpzoneOAuthUserId;

  delete (req.session as any).vpzoneOAuthState;
  delete (req.session as any).vpzoneOAuthVerifier;
  delete (req.session as any).vpzoneOAuthUserId;

  if (error) {
    const errorStr = String(error).toLowerCase();
    if (errorStr.includes('redirect') || errorStr.includes('redirect_uri')) {
      return res.redirect('/settings/profile?tab=streamer&vpzone_error=redirect_uri_mismatch');
    }
    return res.redirect('/settings/profile?tab=streamer&vpzone_error=access_denied');
  }

  if (!code || !state || state !== storedState || !userId) {
    return res.redirect('/settings/profile?tab=streamer&vpzone_error=invalid_state');
  }

  const clientId = process.env.VPZONE_CLIENT_ID;
  const clientSecret = process.env.VPZONE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.redirect('/settings/profile?tab=streamer&vpzone_error=not_configured');
  }

  // ── Step 1: Exchange code for token ────────────────────────────────────────
  let accessToken: string;
  try {
    const callbackUrl = `${getBaseUrl(req)}/api/auth/vpzone/callback`;
    const tokenRes = await axios.post(
      'https://vpzone.tv/api/oauth/token',
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
    console.error('VPZone token exchange error:', err?.response?.status, err?.response?.data);
    return res.redirect('/settings/profile?tab=streamer&vpzone_error=auth_failed');
  }

  // ── Step 2: Fetch user profile ──────────────────────────────────────────────
  try {
    const profileRes = await axios.get('https://vpzone.tv/api/v1/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const raw = profileRes.data?.data ?? profileRes.data;
    const vpzoneUser = Array.isArray(raw) ? raw[0] : raw;

    if (!vpzoneUser) {
      return res.redirect('/settings/profile?tab=streamer&vpzone_error=no_channel');
    }

    const vpzoneId = String(vpzoneUser.sub ?? vpzoneUser.id ?? vpzoneUser.user_id ?? '');
    const channelName = vpzoneUser.preferred_username ?? vpzoneUser.username ?? vpzoneUser.slug ?? vpzoneUser.name ?? '';

    if (!channelName) {
      return res.redirect('/settings/profile?tab=streamer&vpzone_error=no_channel');
    }

    await db.update(users).set({
      vpzoneChannelName: channelName,
      vpzoneId,
      vpzoneVerified: true,
      vpzoneShowOnProfile: true,
    }).where(eq(users.id, userId));

    return res.redirect('/settings/profile?tab=streamer&vpzone_connected=true');
  } catch (err: any) {
    console.error('VPZone profile fetch error:', err?.response?.status, err?.response?.data);
    return res.redirect('/settings/profile?tab=streamer&vpzone_error=auth_failed');
  }
});

router.post('/auth/vpzone/disconnect', async (req: Request, res: Response) => {
  if (!(req.user as any)?.id) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  try {
    await db.update(users).set({
      vpzoneChannelName: null,
      vpzoneId: null,
      vpzoneVerified: false,
    }).where(eq(users.id, (req.user as any).id));

    res.json({ success: true });
  } catch (err) {
    console.error('VPZone disconnect error:', err);
    res.status(500).json({ message: 'Failed to disconnect VPZone' });
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
      twitchShowOnProfile: true,
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
// YouTube  OAuth 2.0  (via Google Identity Platform)
// ─────────────────────────────────────────────────────────────────────────────
//
// Required env vars:
//   GOOGLE_CLIENT_ID     – from Google Cloud Console
//   GOOGLE_CLIENT_SECRET – from Google Cloud Console
//
// Redirect URI to register in your Google OAuth app:
//   https://<your-domain>/api/auth/youtube/callback
//
// Scopes required: https://www.googleapis.com/auth/youtube.readonly
// ─────────────────────────────────────────────────────────────────────────────

router.get('/auth/youtube/connect', (req: Request, res: Response) => {
  if (!(req.user as any)?.id) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return res.status(503).json({ message: 'YouTube OAuth is not configured.' });
  }

  const state = crypto.randomBytes(16).toString('hex');
  (req.session as any).youtubeOAuthState = state;
  (req.session as any).youtubeOAuthUserId = (req.user as any).id;

  req.session.save(() => {
    const callbackUrl = `${getBaseUrl(req)}/api/auth/youtube/callback`;
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: callbackUrl,
      scope: 'https://www.googleapis.com/auth/youtube.readonly',
      state,
      access_type: 'offline',
      prompt: 'consent',
    });

    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  });
});

router.get('/auth/youtube/callback', async (req: Request, res: Response) => {
  const { code, state, error } = req.query;

  const storedState = (req.session as any).youtubeOAuthState;
  const userId = (req.session as any).youtubeOAuthUserId;

  delete (req.session as any).youtubeOAuthState;
  delete (req.session as any).youtubeOAuthUserId;

  if (error) {
    return res.redirect('/settings/profile?tab=streamer&youtube_error=access_denied');
  }

  if (!code || !state || state !== storedState || !userId) {
    return res.redirect('/settings/profile?tab=streamer&youtube_error=invalid_state');
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.redirect('/settings/profile?tab=streamer&youtube_error=not_configured');
  }

  try {
    const callbackUrl = `${getBaseUrl(req)}/api/auth/youtube/callback`;

    // Exchange code for access token
    const tokenRes = await axios.post(
      'https://oauth2.googleapis.com/token',
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

    // Fetch the user's YouTube channel
    const channelRes = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
      params: { part: 'snippet', mine: true },
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const channel = channelRes.data.items?.[0];
    if (!channel) {
      return res.redirect('/settings/profile?tab=streamer&youtube_error=no_channel');
    }

    const youtubeChannelId = channel.id as string;
    const youtubeChannelName = (channel.snippet?.customUrl || channel.snippet?.title || youtubeChannelId) as string;

    await db.update(users).set({
      youtubeChannelId,
      youtubeChannelName,
      youtubeVerified: true,
      youtubeShowOnProfile: true,
    }).where(eq(users.id, userId));

    return res.redirect('/settings/profile?tab=streamer&youtube_connected=true');
  } catch (err: any) {
    console.error('YouTube OAuth callback error:', err?.response?.data || err.message);
    return res.redirect('/settings/profile?tab=streamer&youtube_error=auth_failed');
  }
});

router.post('/auth/youtube/disconnect', async (req: Request, res: Response) => {
  if (!(req.user as any)?.id) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  try {
    await db.update(users).set({
      youtubeChannelId: null,
      youtubeChannelName: null,
      youtubeVerified: false,
    }).where(eq(users.id, (req.user as any).id));

    res.json({ success: true });
  } catch (err) {
    console.error('YouTube disconnect error:', err);
    res.status(500).json({ message: 'Failed to disconnect YouTube' });
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
    youtube: !!process.env.GOOGLE_CLIENT_ID,
    vpzone: !!process.env.VPZONE_CLIENT_ID,
  });
});

export default router;
