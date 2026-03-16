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
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${proto}://${host}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Twitter / X  OAuth 2.0  (PKCE)
// ─────────────────────────────────────────────────────────────────────────────
//
// Required env vars:
//   TWITTER_CLIENT_ID      – from developer.twitter.com
//   TWITTER_CLIENT_SECRET  – from developer.twitter.com
//
// Redirect URI to register in your Twitter app:
//   https://<your-domain>/api/auth/twitter/callback
// ─────────────────────────────────────────────────────────────────────────────

router.get('/auth/twitter/connect', (req: Request, res: Response) => {
  if (!(req.user as any)?.id) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  const clientId = process.env.TWITTER_CLIENT_ID;
  if (!clientId) {
    return res.status(503).json({ message: 'Twitter OAuth is not configured.' });
  }

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = crypto.randomBytes(16).toString('hex');

  (req.session as any).twitterOAuthState = state;
  (req.session as any).twitterOAuthVerifier = codeVerifier;
  (req.session as any).twitterOAuthUserId = (req.user as any).id;

  req.session.save(() => {
    const callbackUrl = `${getBaseUrl(req)}/api/auth/twitter/callback`;
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: callbackUrl,
      scope: 'tweet.read users.read',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    res.redirect(`https://twitter.com/i/oauth2/authorize?${params.toString()}`);
  });
});

router.get('/auth/twitter/callback', async (req: Request, res: Response) => {
  const { code, state, error } = req.query;

  const storedState = (req.session as any).twitterOAuthState;
  const codeVerifier = (req.session as any).twitterOAuthVerifier;
  const userId = (req.session as any).twitterOAuthUserId;

  // Clear session values
  delete (req.session as any).twitterOAuthState;
  delete (req.session as any).twitterOAuthVerifier;
  delete (req.session as any).twitterOAuthUserId;

  if (error) {
    return res.redirect('/settings?tab=platforms&twitter_error=access_denied');
  }

  if (!code || !state || state !== storedState || !userId) {
    return res.redirect('/settings?tab=platforms&twitter_error=invalid_state');
  }

  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.redirect('/settings?tab=platforms&twitter_error=not_configured');
  }

  try {
    const callbackUrl = `${getBaseUrl(req)}/api/auth/twitter/callback`;

    // Exchange code for access token
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const tokenRes = await axios.post(
      'https://api.twitter.com/2/oauth2/token',
      new URLSearchParams({
        code: code as string,
        grant_type: 'authorization_code',
        redirect_uri: callbackUrl,
        code_verifier: codeVerifier,
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${credentials}`,
        },
      }
    );

    const accessToken = tokenRes.data.access_token;

    // Fetch user profile
    const profileRes = await axios.get('https://api.twitter.com/2/users/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { 'user.fields': 'id,name,username' },
    });

    const twitterId = profileRes.data.data.id;
    const twitterUsername = profileRes.data.data.username;

    // Save to DB
    await db.update(users).set({
      twitterUsername,
      twitterId,
      twitterVerified: true,
    }).where(eq(users.id, userId));

    return res.redirect('/settings?tab=platforms&twitter_connected=true');
  } catch (err: any) {
    console.error('Twitter OAuth callback error:', err?.response?.data || err.message);
    return res.redirect('/settings?tab=platforms&twitter_error=auth_failed');
  }
});

router.post('/auth/twitter/disconnect', async (req: Request, res: Response) => {
  if (!(req.user as any)?.id) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  try {
    await db.update(users).set({
      twitterUsername: null,
      twitterId: null,
      twitterVerified: false,
    }).where(eq(users.id, (req.user as any).id));

    res.json({ success: true });
  } catch (err) {
    console.error('Twitter disconnect error:', err);
    res.status(500).json({ message: 'Failed to disconnect Twitter' });
  }
});

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
    return res.redirect('/settings?tab=streamer&kick_error=access_denied');
  }

  if (!code || !state || state !== storedState || !userId) {
    return res.redirect('/settings?tab=streamer&kick_error=invalid_state');
  }

  const clientId = process.env.KICK_CLIENT_ID;
  const clientSecret = process.env.KICK_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.redirect('/settings?tab=streamer&kick_error=not_configured');
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
      return res.redirect('/settings?tab=streamer&kick_error=no_channel');
    }

    // Save to DB – also set platform to kick
    await db.update(users).set({
      streamPlatform: 'kick',
      streamChannelName: channelName,
      kickId,
      kickVerified: true,
    }).where(eq(users.id, userId));

    return res.redirect('/settings?tab=streamer&kick_connected=true');
  } catch (err: any) {
    console.error('Kick OAuth callback error:', err?.response?.data || err.message);
    return res.redirect('/settings?tab=streamer&kick_error=auth_failed');
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
// Config check endpoint – lets the frontend know which OAuth providers are set up
// ─────────────────────────────────────────────────────────────────────────────

router.get('/auth/social-oauth/config', (_req: Request, res: Response) => {
  res.json({
    twitter: !!process.env.TWITTER_CLIENT_ID,
    kick: !!process.env.KICK_CLIENT_ID,
  });
});

export default router;
