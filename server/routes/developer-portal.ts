import { Router, Request, Response } from 'express';
import { db } from '../db';
import { oauthClients, insertOauthClientSchema, oauthAccessTokens, oauthRefreshTokens } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { hybridAuth } from '../middleware/hybrid-auth';
import { generateOpaqueToken, hashClientSecret } from '../services/oauth-service';
import { z } from 'zod';

const router = Router();

function isValidRedirectUri(uri: string): boolean {
  try {
    const parsed = new URL(uri);
    if (parsed.protocol === 'https:') return true;
    if (parsed.protocol === 'http:' && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')) return true;
    return false;
  } catch {
    return false;
  }
}

function toPublicClient(client: typeof oauthClients.$inferSelect) {
  const { clientSecretHash, ...publicFields } = client;
  return publicFields;
}

async function getOwnedClient(id: number, ownerUserId: number) {
  const [client] = await db.select().from(oauthClients)
    .where(and(eq(oauthClients.id, id), eq(oauthClients.ownerUserId, ownerUserId)));
  return client ?? null;
}

router.post('/apps', hybridAuth, async (req: Request, res: Response) => {
  try {
    const ownerUserId = (req.user as any).id;
    const parsed = insertOauthClientSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'invalid_request', issues: parsed.error.issues });
    }

    const { redirectUris } = parsed.data;
    if (!redirectUris.every(isValidRedirectUri)) {
      return res.status(400).json({ error: 'invalid_request', message: 'redirectUris must be https:// (or http://localhost for dev)' });
    }

    const rawSecret = generateOpaqueToken();
    const clientSecretHash = await hashClientSecret(rawSecret);

    const [client] = await db.insert(oauthClients).values({
      ...parsed.data,
      ownerUserId,
      clientSecretHash,
    }).returning();

    return res.status(201).json({
      ...toPublicClient(client),
      clientSecret: rawSecret, // returned once — never retrievable again
    });
  } catch (error) {
    console.error('[Developer Portal] create app error:', error);
    return res.status(500).json({ error: 'server_error' });
  }
});

router.get('/apps', hybridAuth, async (req: Request, res: Response) => {
  try {
    const ownerUserId = (req.user as any).id;
    const apps = await db.select().from(oauthClients).where(eq(oauthClients.ownerUserId, ownerUserId));
    return res.json(apps.map(toPublicClient));
  } catch (error) {
    console.error('[Developer Portal] list apps error:', error);
    return res.status(500).json({ error: 'server_error' });
  }
});

router.get('/apps/:id', hybridAuth, async (req: Request, res: Response) => {
  try {
    const ownerUserId = (req.user as any).id;
    const id = Number(req.params.id);
    const client = await getOwnedClient(id, ownerUserId);
    if (!client) return res.status(404).json({ error: 'not_found' });
    return res.json(toPublicClient(client));
  } catch (error) {
    console.error('[Developer Portal] get app error:', error);
    return res.status(500).json({ error: 'server_error' });
  }
});

const updateAppSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  logoUrl: z.string().url().optional().nullable(),
  redirectUris: z.array(z.string().url()).min(1).optional(),
});

router.patch('/apps/:id', hybridAuth, async (req: Request, res: Response) => {
  try {
    const ownerUserId = (req.user as any).id;
    const id = Number(req.params.id);
    const existing = await getOwnedClient(id, ownerUserId);
    if (!existing) return res.status(404).json({ error: 'not_found' });

    const parsed = updateAppSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'invalid_request', issues: parsed.error.issues });
    }
    if (parsed.data.redirectUris && !parsed.data.redirectUris.every(isValidRedirectUri)) {
      return res.status(400).json({ error: 'invalid_request', message: 'redirectUris must be https:// (or http://localhost for dev)' });
    }

    const [updated] = await db.update(oauthClients)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(oauthClients.id, id))
      .returning();

    return res.json(toPublicClient(updated));
  } catch (error) {
    console.error('[Developer Portal] update app error:', error);
    return res.status(500).json({ error: 'server_error' });
  }
});

router.post('/apps/:id/regenerate-secret', hybridAuth, async (req: Request, res: Response) => {
  try {
    const ownerUserId = (req.user as any).id;
    const id = Number(req.params.id);
    const existing = await getOwnedClient(id, ownerUserId);
    if (!existing) return res.status(404).json({ error: 'not_found' });

    const rawSecret = generateOpaqueToken();
    const clientSecretHash = await hashClientSecret(rawSecret);

    await db.update(oauthClients).set({ clientSecretHash, updatedAt: new Date() }).where(eq(oauthClients.id, id));

    // Secret compromise is exactly when you want to force re-auth — revoke
    // everything issued under the old secret.
    const now = new Date();
    await db.update(oauthAccessTokens).set({ revokedAt: now }).where(eq(oauthAccessTokens.clientId, id));
    await db.update(oauthRefreshTokens).set({ revokedAt: now }).where(eq(oauthRefreshTokens.clientId, id));

    return res.json({ clientSecret: rawSecret });
  } catch (error) {
    console.error('[Developer Portal] regenerate secret error:', error);
    return res.status(500).json({ error: 'server_error' });
  }
});

router.patch('/apps/:id/deactivate', hybridAuth, async (req: Request, res: Response) => {
  try {
    const ownerUserId = (req.user as any).id;
    const id = Number(req.params.id);
    const existing = await getOwnedClient(id, ownerUserId);
    if (!existing) return res.status(404).json({ error: 'not_found' });

    const [updated] = await db.update(oauthClients)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(oauthClients.id, id))
      .returning();

    return res.json(toPublicClient(updated));
  } catch (error) {
    console.error('[Developer Portal] deactivate app error:', error);
    return res.status(500).json({ error: 'server_error' });
  }
});

export default router;
