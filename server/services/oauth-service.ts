import { randomBytes, scrypt, timingSafeEqual, createHash } from 'crypto';
import { promisify } from 'util';
import { VALID_OAUTH_SCOPES, type OAuthScope, oauthAccessTokens, oauthRefreshTokens } from '@shared/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../db';

const scryptAsync = promisify(scrypt);

// Opaque bearer tokens/codes — random, hashed at rest (SHA-256), never stored in
// plaintext. This is deliberately separate from JWT_SECRET (used for first-party
// session/native auth) so first-party and third-party auth can never be confused.
export function generateOpaqueToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

// Client secrets use the exact same scrypt + timingSafeEqual scheme as user
// passwords (server/routes.ts hashPassword/comparePasswords) rather than adding a
// new hashing dependency.
export async function hashClientSecret(secret: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(secret, salt, 64)) as Buffer;
  return `${buf.toString('hex')}.${salt}`;
}

export async function verifyClientSecret(secret: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) return false;
  const [hash, salt] = stored.split('.');
  if (!hash || !salt) return false;
  try {
    const buf = (await scryptAsync(secret, salt, 64)) as Buffer;
    const storedHash = Buffer.from(hash, 'hex');
    if (storedHash.length !== buf.length) return false;
    return timingSafeEqual(storedHash, buf);
  } catch {
    return false;
  }
}

export function parseScopes(scope: string): string[] {
  return scope.split(' ').map(s => s.trim()).filter(Boolean);
}

export function isValidScope(scope: string): scope is OAuthScope {
  return (VALID_OAUTH_SCOPES as readonly string[]).includes(scope);
}

export function areValidScopes(scopes: string[]): boolean {
  return scopes.length > 0 && scopes.every(isValidScope);
}

// True if every scope required by an API route is present among the scopes a
// token was actually granted.
export function isScopeSubset(required: string[], granted: string[]): boolean {
  return required.every(s => granted.includes(s));
}

// PKCE (RFC 7636), S256 only — required for all clients in this implementation.
export function verifyPkce(codeVerifier: string, codeChallenge: string): boolean {
  const computed = createHash('sha256').update(codeVerifier).digest('base64url');
  return computed === codeChallenge;
}

// Revoke every access/refresh token issued for a client — used when an
// authorization code is replayed (signal of a leaked code), a client secret is
// regenerated, or an admin kills a client's active sessions.
export async function revokeAllTokensForClient(clientDbId: number): Promise<void> {
  const now = new Date();
  await db.update(oauthAccessTokens).set({ revokedAt: now })
    .where(and(eq(oauthAccessTokens.clientId, clientDbId), isNull(oauthAccessTokens.revokedAt)));
  await db.update(oauthRefreshTokens).set({ revokedAt: now })
    .where(and(eq(oauthRefreshTokens.clientId, clientDbId), isNull(oauthRefreshTokens.revokedAt)));
}
