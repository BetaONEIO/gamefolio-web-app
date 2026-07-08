import { Router, Request, Response } from 'express';
import { db } from '../db';
import { oauthClients, oauthAccessTokens, oauthRefreshTokens } from '@shared/schema';
import { eq, and, isNull, inArray } from 'drizzle-orm';
import { hybridAuth } from '../middleware/hybrid-auth';
import { isValidUuid } from '../services/oauth-service';

const router = Router();

/**
 * GET /api/oauth/client-info?client_id=...
 * Unauthenticated, deliberately minimal — only what the consent screen needs to
 * render "MyApp wants to access your Gamefolio account." Never returns secrets.
 */
router.get('/client-info', async (req: Request, res: Response) => {
  const clientId = req.query.client_id;
  if (typeof clientId !== 'string' || !isValidUuid(clientId)) {
    return res.status(400).json({ error: 'invalid_request' });
  }

  try {
    const [client] = await db.select().from(oauthClients).where(eq(oauthClients.clientId, clientId));
    if (!client || !client.isActive) {
      return res.status(404).json({ error: 'not_found' });
    }

    return res.json({
      name: client.name,
      description: client.description,
      logoUrl: client.logoUrl,
    });
  } catch (error) {
    console.error('[OAuth] client-info error:', error);
    return res.status(500).json({ error: 'server_error' });
  }
});

/**
 * GET /api/oauth/my-authorizations
 * Apps the logged-in user has granted access to — the "Connected Apps" list.
 */
router.get('/my-authorizations', hybridAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;

    const activeTokens = await db.select().from(oauthAccessTokens)
      .where(and(eq(oauthAccessTokens.userId, userId), isNull(oauthAccessTokens.revokedAt)));

    if (activeTokens.length === 0) {
      return res.json({ authorizations: [] });
    }

    const clientIds = Array.from(new Set(activeTokens.map(t => t.clientId)));
    const clients = await db.select().from(oauthClients).where(inArray(oauthClients.id, clientIds));
    const clientById = new Map(clients.map(c => [c.id, c]));

    const byClient = new Map<number, { scopes: Set<string>; lastUsedAt: Date | null }>();
    for (const token of activeTokens) {
      const entry = byClient.get(token.clientId) || { scopes: new Set<string>(), lastUsedAt: null };
      token.scope.split(' ').filter(Boolean).forEach(s => entry.scopes.add(s));
      if (token.lastUsedAt && (!entry.lastUsedAt || token.lastUsedAt > entry.lastUsedAt)) {
        entry.lastUsedAt = token.lastUsedAt;
      }
      byClient.set(token.clientId, entry);
    }

    const authorizations = Array.from(byClient.entries())
      .map(([clientId, entry]) => {
        const client = clientById.get(clientId);
        if (!client) return null;
        return {
          clientId: client.id,
          name: client.name,
          logoUrl: client.logoUrl,
          scopes: Array.from(entry.scopes),
          lastUsedAt: entry.lastUsedAt,
        };
      })
      .filter(Boolean);

    return res.json({ authorizations });
  } catch (error) {
    console.error('[OAuth] my-authorizations error:', error);
    return res.status(500).json({ error: 'server_error' });
  }
});

/**
 * DELETE /api/oauth/my-authorizations/:clientId
 * Revoke every token this user granted to a given client.
 */
router.delete('/my-authorizations/:clientId', hybridAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    const clientId = Number(req.params.clientId);

    const now = new Date();
    await db.update(oauthAccessTokens).set({ revokedAt: now })
      .where(and(eq(oauthAccessTokens.userId, userId), eq(oauthAccessTokens.clientId, clientId), isNull(oauthAccessTokens.revokedAt)));
    await db.update(oauthRefreshTokens).set({ revokedAt: now })
      .where(and(eq(oauthRefreshTokens.userId, userId), eq(oauthRefreshTokens.clientId, clientId), isNull(oauthRefreshTokens.revokedAt)));

    return res.json({ success: true });
  } catch (error) {
    console.error('[OAuth] revoke my-authorization error:', error);
    return res.status(500).json({ error: 'server_error' });
  }
});

export default router;
