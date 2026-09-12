import { storage } from '../storage';

// ---------------------------------------------------------------------------
// Ambassador referral codes — shared validation.
//
// An ambassador code is just an ordinary user's `referralCode` where that user
// also has `isAmbassador` set. It is entered manually at checkout and is
// SEPARATE from the `referredBy` an account may already carry from signup
// (signup referral only awards XP — see the register handler in routes.ts).
//
// Every purchase surface validates through here so the rules stay identical:
//   - web / Stripe        → a percent-off-first-payment coupon
//                           (AMBASSADOR_DISCOUNT_PERCENT in shared/ambassador.ts)
//   - Android / Play      → a developer-determined discounted subscription offer
//   - iOS / StoreKit      → no store discount is possible for a first-time
//                           subscriber, so the buyer is granted bonus XP instead
//                           (see /api/pro/activate)
// ---------------------------------------------------------------------------

// Deliberately identical for "no such code" and "not an ambassador" so the
// endpoint can't be used to enumerate which referral codes exist.
const INVALID_MESSAGE = 'Invalid ambassador code';

export type AmbassadorCodeResult =
  | { valid: true; code: string; ambassadorUserId: number; username: string; displayName: string | null; avatarUrl: string | null }
  | { valid: false; error: string };

export function normalizeAmbassadorCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim().toUpperCase();
  return trimmed === '' ? null : trimmed;
}

/**
 * Resolve an ambassador code for a specific buyer.
 *
 * @param raw         The code as typed by the buyer (any case / whitespace).
 * @param buyerUserId The purchasing user — used to reject self-referral.
 */
export async function validateAmbassadorCode(
  raw: unknown,
  buyerUserId: number,
): Promise<AmbassadorCodeResult> {
  const code = normalizeAmbassadorCode(raw);
  if (!code) return { valid: false, error: INVALID_MESSAGE };

  const owner = await storage.getUserByReferralCode(code);
  if (!owner || !owner.isAmbassador || owner.id === buyerUserId) {
    return { valid: false, error: INVALID_MESSAGE };
  }

  return {
    valid: true,
    code,
    ambassadorUserId: owner.id,
    username: owner.username,
    displayName: owner.displayName ?? null,
    avatarUrl: owner.avatarUrl ?? null,
  };
}
