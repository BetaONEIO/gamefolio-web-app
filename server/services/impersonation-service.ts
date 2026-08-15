import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

// Deliberately a separate secret/type space from server/services/jwt-service.ts's
// access/refresh tokens, so an impersonation token can never be confused with (or
// forged from) a real native auth token, and vice versa.
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const IMPERSONATION_TOKEN_EXPIRY = '45m';

export interface ImpersonationTokenPayload {
  type: 'impersonation';
  tokenId: string;
  adminId: number;
  adminUsername: string;
  targetUserId: number;
}

export function generateImpersonationToken(
  admin: { id: number; username: string },
  targetUser: { id: number },
): { token: string; tokenId: string } {
  const tokenId = randomUUID();
  const payload: ImpersonationTokenPayload = {
    type: 'impersonation',
    tokenId,
    adminId: admin.id,
    adminUsername: admin.username,
    targetUserId: targetUser.id,
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: IMPERSONATION_TOKEN_EXPIRY });
  return { token, tokenId };
}

/**
 * Verify an impersonation token and return its payload.
 * Throws if the token is invalid, expired, or not an impersonation token.
 */
export function verifyImpersonationToken(token: string): ImpersonationTokenPayload {
  const payload = jwt.verify(token, JWT_SECRET) as ImpersonationTokenPayload;
  if (payload.type !== 'impersonation') {
    throw new Error('Not an impersonation token');
  }
  return payload;
}
