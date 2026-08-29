import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { oauthAccessTokens } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { hashToken, parseScopes, isScopeSubset } from '../services/oauth-service';

// Populated on req by requireOAuthScope for downstream public-API handlers.
export interface OAuthContext {
  userId: number;
  clientId: number;
  scopes: string[];
}

declare global {
  namespace Express {
    interface Request {
      oauthContext?: OAuthContext;
    }
  }
}

/**
 * Guards the public OAuth API (server/routes/public-api-v1.ts) — deliberately
 * separate from hybridAuth, which guards first-party app screens. First-party
 * session/native-JWT auth and third-party OAuth tokens must never be
 * interchangeable.
 */
export function requireOAuthScope(...requiredScopes: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'invalid_request', message: 'Missing bearer token' });
    }

    const rawToken = authHeader.substring(7);
    const tokenHash = hashToken(rawToken);

    const [tokenRow] = await db.select().from(oauthAccessTokens).where(eq(oauthAccessTokens.tokenHash, tokenHash));
    if (!tokenRow || tokenRow.revokedAt || tokenRow.expiresAt < new Date()) {
      return res.status(401).json({ error: 'invalid_token' });
    }

    const grantedScopes = parseScopes(tokenRow.scope);
    if (!isScopeSubset(requiredScopes, grantedScopes)) {
      return res.status(403).json({ error: 'insufficient_scope', requiredScopes });
    }

    req.oauthContext = { userId: tokenRow.userId, clientId: tokenRow.clientId, scopes: grantedScopes };

    // Fire-and-forget — don't block the request on this bookkeeping write.
    db.update(oauthAccessTokens).set({ lastUsedAt: new Date() })
      .where(eq(oauthAccessTokens.id, tokenRow.id))
      .catch(err => console.error('[OAuth] Failed to update lastUsedAt:', err));

    next();
  };
}
