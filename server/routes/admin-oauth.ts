import { Router, Request, Response } from 'express';
import { db } from '../db';
import { oauthClients, oauthAccessTokens, users } from '@shared/schema';
import { eq, and, isNull, gt, sql } from 'drizzle-orm';
import { adminMiddleware } from '../middleware/admin';
import { revokeAllTokensForClient } from '../services/oauth-service';

const router = Router();
router.use(adminMiddleware);

/**
 * GET /api/admin/oauth/clients
 * Platform-wide view of every registered OAuth app (not scoped to a single
 * developer, unlike /api/developer/apps), with live usage stats so admins can
 * see who's actually using the developer platform.
 */
router.get('/clients', async (req: Request, res: Response) => {
  try {
    const clients = await db.select({
      id: oauthClients.id,
      clientId: oauthClients.clientId,
      name: oauthClients.name,
      description: oauthClients.description,
      logoUrl: oauthClients.logoUrl,
      isActive: oauthClients.isActive,
      createdAt: oauthClients.createdAt,
      ownerUserId: oauthClients.ownerUserId,
      ownerUsername: users.username,
    })
      .from(oauthClients)
      .leftJoin(users, eq(oauthClients.ownerUserId, users.id))
      .orderBy(oauthClients.createdAt);

    const now = new Date();
    const stats = await db.select({
      clientId: oauthAccessTokens.clientId,
      activeTokenCount: sql<number>`count(*)`,
      activeUserCount: sql<number>`count(distinct ${oauthAccessTokens.userId})`,
      lastUsedAt: sql<string | null>`max(${oauthAccessTokens.lastUsedAt})`,
    })
      .from(oauthAccessTokens)
      .where(and(isNull(oauthAccessTokens.revokedAt), gt(oauthAccessTokens.expiresAt, now)))
      .groupBy(oauthAccessTokens.clientId);

    const statsByClientId = new Map(stats.map(s => [s.clientId, s]));

    const result = clients.map(c => {
      const s = statsByClientId.get(c.id);
      return {
        ...c,
        activeTokenCount: Number(s?.activeTokenCount ?? 0),
        activeUserCount: Number(s?.activeUserCount ?? 0),
        lastUsedAt: s?.lastUsedAt ?? null,
      };
    });

    return res.json({ clients: result });
  } catch (error) {
    console.error('[Admin OAuth] list clients error:', error);
    return res.status(500).json({ error: 'server_error' });
  }
});

/**
 * GET /api/admin/oauth/clients/:id
 * Detail view: the app itself, plus every user currently authorizing it.
 */
router.get('/clients/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    const [client] = await db.select({
      id: oauthClients.id,
      clientId: oauthClients.clientId,
      name: oauthClients.name,
      description: oauthClients.description,
      logoUrl: oauthClients.logoUrl,
      isActive: oauthClients.isActive,
      redirectUris: oauthClients.redirectUris,
      createdAt: oauthClients.createdAt,
      ownerUserId: oauthClients.ownerUserId,
      ownerUsername: users.username,
    })
      .from(oauthClients)
      .leftJoin(users, eq(oauthClients.ownerUserId, users.id))
      .where(eq(oauthClients.id, id));

    if (!client) return res.status(404).json({ error: 'not_found' });

    const now = new Date();
    const activeTokens = await db.select({
      userId: oauthAccessTokens.userId,
      username: users.username,
      scope: oauthAccessTokens.scope,
      lastUsedAt: oauthAccessTokens.lastUsedAt,
      createdAt: oauthAccessTokens.createdAt,
    })
      .from(oauthAccessTokens)
      .leftJoin(users, eq(oauthAccessTokens.userId, users.id))
      .where(and(
        eq(oauthAccessTokens.clientId, id),
        isNull(oauthAccessTokens.revokedAt),
        gt(oauthAccessTokens.expiresAt, now),
      ));

    return res.json({ client, authorizedUsers: activeTokens });
  } catch (error) {
    console.error('[Admin OAuth] get client detail error:', error);
    return res.status(500).json({ error: 'server_error' });
  }
});

/**
 * PATCH /api/admin/oauth/clients/:id/deactivate
 * Platform-wide kill-switch — unlike the developer's own self-service
 * deactivate, this works on any client regardless of ownership. Also revokes
 * every live token immediately (see revokeAllTokensForClient).
 */
router.patch('/clients/:id/deactivate', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const [updated] = await db.update(oauthClients)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(oauthClients.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: 'not_found' });

    await revokeAllTokensForClient(id);

    return res.json({ success: true });
  } catch (error) {
    console.error('[Admin OAuth] deactivate client error:', error);
    return res.status(500).json({ error: 'server_error' });
  }
});

/**
 * PATCH /api/admin/oauth/clients/:id/reactivate
 */
router.patch('/clients/:id/reactivate', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const [updated] = await db.update(oauthClients)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(oauthClients.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: 'not_found' });

    return res.json({ success: true });
  } catch (error) {
    console.error('[Admin OAuth] reactivate client error:', error);
    return res.status(500).json({ error: 'server_error' });
  }
});

/**
 * POST /api/admin/oauth/clients/:id/revoke-all
 * Kills every live session for a client without deactivating the app itself —
 * for when an admin wants to force everyone to re-consent without blocking
 * new authorizations going forward.
 */
router.post('/clients/:id/revoke-all', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await revokeAllTokensForClient(id);
    return res.json({ success: true });
  } catch (error) {
    console.error('[Admin OAuth] revoke-all error:', error);
    return res.status(500).json({ error: 'server_error' });
  }
});

export default router;
