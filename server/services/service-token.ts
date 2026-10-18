import { timingSafeEqual } from 'node:crypto';

export function hasBearerToken(authorization: string | undefined, configured: string | undefined): boolean {
  const supplied = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!configured || !supplied) return false;
  const expected = Buffer.from(configured);
  const actual = Buffer.from(supplied);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

