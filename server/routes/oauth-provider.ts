import { Router, Request, Response } from 'express';
import { db } from '../db';
import { oauthClients, oauthAuthorizationCodes, oauthAccessTokens, oauthRefreshTokens } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { hybridAuth } from '../middleware/hybrid-auth';
import {
  generateOpaqueToken,
  hashToken,
  verifyClientSecret,
  parseScopes,
  areValidScopes,
  verifyPkce,
  revokeAllTokensForClient,
} from '../services/oauth-service';

const router = Router();

const AUTH_CODE_TTL_MS = 60 * 1000; // 60s
const ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000; // 1h
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30d

async function findActiveClientByClientId(clientId: string) {
  const [client] = await db.select().from(oauthClients).where(eq(oauthClients.clientId, clientId));
  if (!client || !client.isActive) return null;
  return client;
}

/**
 * GET /oauth/authorize
 * Entry point a third-party app redirects the user's browser to. Validates the
 * request server-side, then hands off to the SPA consent screen — Express never
 * renders the consent UI itself.
 */
router.get('/oauth/authorize', async (req: Request, res: Response) => {
  const { client_id, redirect_uri, response_type, scope, state, code_challenge, code_challenge_method } = req.query;

  if (typeof client_id !== 'string' || typeof redirect_uri !== 'string' || typeof scope !== 'string') {
    return res.status(400).send('Missing required OAuth parameters.');
  }
  if (response_type !== 'code') {
    return res.status(400).send('Only response_type=code is supported.');
  }
  if (typeof code_challenge !== 'string' || code_challenge_method !== 'S256') {
    return res.status(400).send('PKCE (code_challenge with S256) is required.');
  }

  const client = await findActiveClientByClientId(client_id);
  if (!client) {
    return res.status(400).send('Unknown or inactive client_id.');
  }
  if (!client.redirectUris.includes(redirect_uri)) {
    return res.status(400).send('redirect_uri does not match any registered URI for this client.');
  }

  const scopes = parseScopes(scope);
  if (!areValidScopes(scopes)) {
    return res.status(400).send('One or more requested scopes are invalid.');
  }

  // Express only validates; the SPA renders the actual consent UI at /oauth/consent.
  const query = new URLSearchParams({
    client_id,
    redirect_uri,
    scope,
    state: typeof state === 'string' ? state : '',
    code_challenge,
    code_challenge_method,
  });
  return res.redirect(`/oauth/consent?${query.toString()}`);
});

/**
 * POST /oauth/authorize/decision
 * Called by the consent page's Allow/Deny buttons. Requires the user to already
 * be logged in to Gamefolio. Re-validates everything server-side rather than
 * trusting what the SPA echoes back.
 */
router.post('/oauth/authorize/decision', hybridAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    const { clientId, redirectUri, scope, state, decision, codeChallenge, codeChallengeMethod } = req.body || {};

    if (!userId) {
      return res.status(401).json({ error: 'unauthorized' });
    }
    if (typeof clientId !== 'string' || typeof redirectUri !== 'string' || typeof scope !== 'string') {
      return res.status(400).json({ error: 'invalid_request' });
    }

    const client = await findActiveClientByClientId(clientId);
    if (!client || !client.redirectUris.includes(redirectUri)) {
      return res.status(400).json({ error: 'invalid_request' });
    }

    const scopes = parseScopes(scope);
    if (!areValidScopes(scopes)) {
      return res.status(400).json({ error: 'invalid_scope' });
    }

    const stateParam = typeof state === 'string' ? state : '';

    if (decision !== 'allow') {
      const redirectUrl = `${redirectUri}?error=access_denied&state=${encodeURIComponent(stateParam)}`;
      return res.json({ redirectUrl });
    }

    if (typeof codeChallenge !== 'string' || codeChallengeMethod !== 'S256') {
      return res.status(400).json({ error: 'invalid_request', message: 'PKCE required' });
    }

    const rawCode = generateOpaqueToken();
    await db.insert(oauthAuthorizationCodes).values({
      codeHash: hashToken(rawCode),
      clientId: client.id,
      userId,
      redirectUri,
      scope,
      codeChallenge,
      codeChallengeMethod,
      expiresAt: new Date(Date.now() + AUTH_CODE_TTL_MS),
    });

    const redirectUrl = `${redirectUri}?code=${encodeURIComponent(rawCode)}&state=${encodeURIComponent(stateParam)}`;
    return res.json({ redirectUrl });
  } catch (error) {
    console.error('[OAuth] authorize/decision error:', error);
    return res.status(500).json({ error: 'server_error' });
  }
});

/**
 * POST /oauth/token
 * Called by the developer's backend (not the browser). Supports
 * grant_type=authorization_code and grant_type=refresh_token.
 */
router.post('/oauth/token', async (req: Request, res: Response) => {
  try {
    const { grant_type } = req.body || {};

    // Client auth: HTTP Basic (client_id:client_secret) or POST body fields.
    let clientId = req.body?.client_id;
    let clientSecret = req.body?.client_secret;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Basic ')) {
      const decoded = Buffer.from(authHeader.substring(6), 'base64').toString('utf8');
      const separatorIndex = decoded.indexOf(':');
      if (separatorIndex !== -1) {
        clientId = decoded.slice(0, separatorIndex);
        clientSecret = decoded.slice(separatorIndex + 1);
      }
    }

    if (typeof clientId !== 'string' || typeof clientSecret !== 'string') {
      return res.status(401).json({ error: 'invalid_client' });
    }

    const client = await findActiveClientByClientId(clientId);
    if (!client || !(await verifyClientSecret(clientSecret, client.clientSecretHash))) {
      return res.status(401).json({ error: 'invalid_client' });
    }

    if (grant_type === 'authorization_code') {
      const { code, redirect_uri, code_verifier } = req.body || {};
      if (typeof code !== 'string' || typeof redirect_uri !== 'string' || typeof code_verifier !== 'string') {
        return res.status(400).json({ error: 'invalid_request' });
      }

      const [codeRow] = await db.select().from(oauthAuthorizationCodes)
        .where(eq(oauthAuthorizationCodes.codeHash, hashToken(code)));

      if (!codeRow || codeRow.clientId !== client.id || codeRow.redirectUri !== redirect_uri) {
        return res.status(400).json({ error: 'invalid_grant' });
      }
      if (codeRow.expiresAt < new Date()) {
        return res.status(400).json({ error: 'invalid_grant', message: 'Code expired' });
      }
      if (codeRow.usedAt) {
        // Replay of an already-redeemed code — treat as a compromise signal.
        await revokeAllTokensForClient(client.id);
        return res.status(400).json({ error: 'invalid_grant', message: 'Code already used' });
      }
      if (!verifyPkce(code_verifier, codeRow.codeChallenge)) {
        return res.status(400).json({ error: 'invalid_grant', message: 'PKCE verification failed' });
      }

      await db.update(oauthAuthorizationCodes).set({ usedAt: new Date() }).where(eq(oauthAuthorizationCodes.id, codeRow.id));

      const rawAccessToken = generateOpaqueToken();
      const [accessTokenRow] = await db.insert(oauthAccessTokens).values({
        tokenHash: hashToken(rawAccessToken),
        clientId: client.id,
        userId: codeRow.userId,
        scope: codeRow.scope,
        expiresAt: new Date(Date.now() + ACCESS_TOKEN_TTL_MS),
      }).returning();

      const rawRefreshToken = generateOpaqueToken();
      await db.insert(oauthRefreshTokens).values({
        tokenHash: hashToken(rawRefreshToken),
        accessTokenId: accessTokenRow.id,
        clientId: client.id,
        userId: codeRow.userId,
        scope: codeRow.scope,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      });

      return res.json({
        access_token: rawAccessToken,
        refresh_token: rawRefreshToken,
        token_type: 'Bearer',
        expires_in: ACCESS_TOKEN_TTL_MS / 1000,
        scope: codeRow.scope,
      });
    }

    if (grant_type === 'refresh_token') {
      const { refresh_token } = req.body || {};
      if (typeof refresh_token !== 'string') {
        return res.status(400).json({ error: 'invalid_request' });
      }

      const [refreshRow] = await db.select().from(oauthRefreshTokens)
        .where(eq(oauthRefreshTokens.tokenHash, hashToken(refresh_token)));

      if (!refreshRow || refreshRow.clientId !== client.id || refreshRow.revokedAt || refreshRow.expiresAt < new Date()) {
        return res.status(400).json({ error: 'invalid_grant' });
      }

      const rawAccessToken = generateOpaqueToken();
      const [accessTokenRow] = await db.insert(oauthAccessTokens).values({
        tokenHash: hashToken(rawAccessToken),
        clientId: client.id,
        userId: refreshRow.userId,
        scope: refreshRow.scope,
        expiresAt: new Date(Date.now() + ACCESS_TOKEN_TTL_MS),
      }).returning();

      const rawRefreshToken = generateOpaqueToken();
      const [newRefreshRow] = await db.insert(oauthRefreshTokens).values({
        tokenHash: hashToken(rawRefreshToken),
        accessTokenId: accessTokenRow.id,
        clientId: client.id,
        userId: refreshRow.userId,
        scope: refreshRow.scope,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      }).returning();

      await db.update(oauthRefreshTokens).set({ revokedAt: new Date(), rotatedToId: newRefreshRow.id })
        .where(eq(oauthRefreshTokens.id, refreshRow.id));

      return res.json({
        access_token: rawAccessToken,
        refresh_token: rawRefreshToken,
        token_type: 'Bearer',
        expires_in: ACCESS_TOKEN_TTL_MS / 1000,
        scope: refreshRow.scope,
      });
    }

    return res.status(400).json({ error: 'unsupported_grant_type' });
  } catch (error) {
    console.error('[OAuth] token error:', error);
    return res.status(500).json({ error: 'server_error' });
  }
});

/**
 * POST /oauth/revoke (RFC 7009)
 * Always returns 200 whether or not the token existed, to avoid leaking token
 * validity through response differences.
 */
router.post('/oauth/revoke', async (req: Request, res: Response) => {
  try {
    let clientId = req.body?.client_id;
    let clientSecret = req.body?.client_secret;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Basic ')) {
      const decoded = Buffer.from(authHeader.substring(6), 'base64').toString('utf8');
      const separatorIndex = decoded.indexOf(':');
      if (separatorIndex !== -1) {
        clientId = decoded.slice(0, separatorIndex);
        clientSecret = decoded.slice(separatorIndex + 1);
      }
    }

    const { token } = req.body || {};
    if (typeof clientId !== 'string' || typeof clientSecret !== 'string' || typeof token !== 'string') {
      return res.status(200).json({});
    }

    const client = await findActiveClientByClientId(clientId);
    if (!client || !(await verifyClientSecret(clientSecret, client.clientSecretHash))) {
      return res.status(200).json({});
    }

    const tokenHash = hashToken(token);
    await db.update(oauthAccessTokens).set({ revokedAt: new Date() })
      .where(and(eq(oauthAccessTokens.tokenHash, tokenHash), eq(oauthAccessTokens.clientId, client.id)));
    await db.update(oauthRefreshTokens).set({ revokedAt: new Date() })
      .where(and(eq(oauthRefreshTokens.tokenHash, tokenHash), eq(oauthRefreshTokens.clientId, client.id)));

    return res.status(200).json({});
  } catch (error) {
    console.error('[OAuth] revoke error:', error);
    return res.status(200).json({});
  }
});

export default router;
