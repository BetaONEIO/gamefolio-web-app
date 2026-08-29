import { Router, Request, Response } from 'express';
import { db } from '../db';
import { oauthClients, insertOauthClientSchema } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { hybridAuth } from '../middleware/hybrid-auth';
import { createRateLimiter } from '../middleware/rate-limit';
import { generateOpaqueToken, hashClientSecret, revokeAllTokensForClient } from '../services/oauth-service';
import { z } from 'zod';
import { captureRouteError } from "../sentry";

const router = Router();

// Per-user: mounted after hybridAuth so req.user is populated. Caps app
// creation rather than every /apps route — legit users may poll GET /apps
// far more often than they ever create a new app.
const createAppRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyFn: (req) => {
    const userId = (req.user as any)?.id;
    return userId ? `user:${userId}` : null;
  },
  message: 'Too many apps created recently. Please try again later.',
});

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

router.post('/apps', hybridAuth, createAppRateLimiter, async (req: Request, res: Response) => {
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

    // Public clients (RFC 8252 §8.5) never get a secret — there's nothing to
    // hash or hand back, PKCE alone authenticates them at /oauth/token.
    const isPublic = parsed.data.clientType === 'public';
    const rawSecret = isPublic ? null : generateOpaqueToken();
    const clientSecretHash = rawSecret ? await hashClientSecret(rawSecret) : null;

    const [client] = await db.insert(oauthClients).values({
      ...parsed.data,
      ownerUserId,
      clientSecretHash,
    }).returning();

    return res.status(201).json({
      ...toPublicClient(client),
      // Returned once — never retrievable again. Omitted entirely for
      // public clients rather than sent as null, so callers can't confuse
      // "no secret because public" with "secret fetch failed".
      ...(rawSecret ? { clientSecret: rawSecret } : {}),
    });
  } catch (error) {
    captureRouteError(error);
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
    captureRouteError(error);
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
    captureRouteError(error);
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
    captureRouteError(error);
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
    if (existing.clientType === 'public') {
      return res.status(400).json({ error: 'invalid_request', message: 'Public clients do not use a client secret.' });
    }

    const rawSecret = generateOpaqueToken();
    const clientSecretHash = await hashClientSecret(rawSecret);

    await db.update(oauthClients).set({ clientSecretHash, updatedAt: new Date() }).where(eq(oauthClients.id, id));

    // Secret compromise is exactly when you want to force re-auth — revoke
    // everything issued under the old secret.
    await revokeAllTokensForClient(id);

    return res.json({ clientSecret: rawSecret });
  } catch (error) {
    captureRouteError(error);
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

    // Deactivating means "kill it now" — don't let already-issued tokens
    // keep working until they naturally expire.
    await revokeAllTokensForClient(id);

    return res.json(toPublicClient(updated));
  } catch (error) {
    captureRouteError(error);
    console.error('[Developer Portal] deactivate app error:', error);
    return res.status(500).json({ error: 'server_error' });
  }
});

export default router;
