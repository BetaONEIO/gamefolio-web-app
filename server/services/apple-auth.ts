import { createPublicKey, type JsonWebKey as NodeJsonWebKey } from 'node:crypto';
import jwt, { type JwtPayload, type VerifyOptions } from 'jsonwebtoken';

const APPLE_JWKS_URL = 'https://appleid.apple.com/auth/keys';
const APPLE_ISSUER = 'https://appleid.apple.com';
const DEFAULT_BUNDLE_ID = 'com.gamefolio.app';

interface AppleJwk {
  kty: string;
  kid: string;
  use: string;
  alg: string;
  n: string;
  e: string;
}

const KEYS_TTL_MS = 60 * 60 * 1000;
let cachedKeys: { keys: AppleJwk[]; fetchedAt: number } | null = null;

async function fetchAppleKeys(forceRefresh = false): Promise<AppleJwk[]> {
  if (!forceRefresh && cachedKeys && Date.now() - cachedKeys.fetchedAt < KEYS_TTL_MS) {
    return cachedKeys.keys;
  }
  const res = await fetch(APPLE_JWKS_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch Apple JWKS: ${res.status}`);
  }
  const body = (await res.json()) as { keys: AppleJwk[] };
  cachedKeys = { keys: body.keys, fetchedAt: Date.now() };
  return body.keys;
}

function jwkToPem(jwk: AppleJwk): string {
  // node's createPublicKey accepts a JWK directly when format is 'jwk'.
  // We narrow AppleJwk -> node's JsonWebKey shape (same RSA fields) instead
  // of using `any` so a future change to AppleJwk can't silently drift.
  const nodeJwk: NodeJsonWebKey = {
    kty: jwk.kty,
    n: jwk.n,
    e: jwk.e,
    alg: jwk.alg,
    use: jwk.use,
  };
  const key = createPublicKey({ key: nodeJwk, format: 'jwk' });
  return key.export({ type: 'spki', format: 'pem' }) as string;
}

export interface AppleIdentityClaims extends JwtPayload {
  sub: string;
  email?: string;
  email_verified?: boolean | string;
  is_private_email?: boolean | string;
  aud: string;
  iss: string;
}

/**
 * Verify an Apple identity token (JWT) returned by Sign in with Apple.
 *
 * Security guarantees:
 * - Algorithm is HARD-PINNED to RS256. We never trust the token header's `alg`
 *   value — passing the header alg into jsonwebtoken would allow algorithm
 *   confusion attacks. We only allow RS256 because that is the algorithm
 *   Apple actually uses.
 * - The matching JWK from Apple's JWKS must declare `kty='RSA'`, `alg='RS256'`,
 *   and `use='sig'`; anything else is rejected.
 * - `iss` must be https://appleid.apple.com.
 * - `aud` must equal the iOS bundle id (APPLE_BUNDLE_ID env, defaults to
 *   `com.gamefolio.app`).
 * - Apple's JWKS is fetched fresh once per hour, with a forced refresh on a
 *   `kid` cache miss to handle key rotation.
 *
 * Throws on any invalid, expired, mis-signed, or mis-typed token.
 */
export async function verifyAppleIdentityToken(
  identityToken: string,
): Promise<AppleIdentityClaims> {
  const decoded = jwt.decode(identityToken, { complete: true });
  if (!decoded || typeof decoded === 'string') {
    throw new Error('Invalid Apple identity token format');
  }
  const kid = decoded.header.kid;
  if (!kid) {
    throw new Error('Apple identity token missing kid');
  }
  // Hard-pin the algorithm BEFORE verification — never trust the header.
  if (decoded.header.alg !== 'RS256') {
    throw new Error('Apple identity token must be signed with RS256');
  }

  let keys = await fetchAppleKeys();
  let jwk = keys.find((k) => k.kid === kid);
  if (!jwk) {
    keys = await fetchAppleKeys(true);
    jwk = keys.find((k) => k.kid === kid);
    if (!jwk) {
      throw new Error('Apple identity token signed by unknown key');
    }
  }

  // Defence-in-depth: the JWK itself must claim to be an RSA signing key.
  if (jwk.kty !== 'RSA' || jwk.alg !== 'RS256' || jwk.use !== 'sig') {
    throw new Error('Apple JWK is not a valid RS256 signing key');
  }

  const pem = jwkToPem(jwk);
  const expectedAudience = process.env.APPLE_BUNDLE_ID || DEFAULT_BUNDLE_ID;
  const verifyOptions: VerifyOptions = {
    algorithms: ['RS256'],
    audience: expectedAudience,
    issuer: APPLE_ISSUER,
  };

  const payload = jwt.verify(identityToken, pem, verifyOptions) as JwtPayload;
  if (!payload.sub) {
    throw new Error('Apple identity token missing sub claim');
  }
  return payload as AppleIdentityClaims;
}
