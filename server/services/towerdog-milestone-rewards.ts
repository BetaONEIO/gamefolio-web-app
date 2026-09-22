import { and, asc, eq, gte, isNull, lte, or, sql } from 'drizzle-orm';
import { db } from '../db';
import { towerdogRewardPayouts, userXPHistory, users, type TowerdogRewardPayout } from '@shared/schema';
import { XPService } from '../xp-service';
import { transferGfTokens } from '../gf-token-service';
import { TOWERDOG_REFERRAL_CODE } from '@shared/profile-theme';

export type TowerdogRewardEvent = 'signup' | 'pro_purchase';

const GFT_AMOUNT = 500;
const WALLET_XP_AMOUNT = 500;
const NO_WALLET_XP_AMOUNT = 750;
const RETRY_DELAY_MS = 6 * 60 * 60 * 1000;
const STALE_PREPARATION_MS = 10 * 60 * 1000;
const PROGRAM_START = new Date('2026-09-17T00:00:00.000Z');
const WALLET_ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

function eventLabel(eventType: TowerdogRewardEvent): string {
  return eventType === 'signup' ? 'signing up' : 'purchasing Pro';
}

export function shouldCreateTowerdogProReward(
  originalSignupReferralCode: string | null | undefined,
  isSandbox = false,
): boolean {
  return !isSandbox && originalSignupReferralCode === TOWERDOG_REFERRAL_CODE;
}

export function canClaimFirstProTransition(
  state: { isPro: boolean; proSubscriptionStartDate: Date | null; proSubscriptionSandbox: boolean },
  isSandbox: boolean,
): boolean {
  const firstActivation = !state.isPro && state.proSubscriptionStartDate === null;
  return isSandbox
    ? firstActivation
    : firstActivation || (state.isPro && state.proSubscriptionSandbox);
}

/**
 * Atomically records a Pro activation and returns the transition winner.
 *
 * A sandbox activation is real access for testing, but it is not a live
 * first-Pro transition. Keeping that fact on the user row lets the later live
 * activation win the same compare-and-set without allowing repeated sandbox
 * events to create a reward.
 */
export async function claimFirstProTransition(
  userId: number,
  updates: Record<string, unknown>,
  isSandboxOrExecutor: boolean | any = false,
  executorArg: any = db,
): Promise<{
  walletAddress: string | null;
  originalSignupReferralCode: string | null;
} | null> {
  // Preserve the original three-argument form for callers that do not need
  // sandbox handling: claimFirstProTransition(id, updates, tx).
  const isSandbox = typeof isSandboxOrExecutor === 'boolean' ? isSandboxOrExecutor : false;
  const executor = typeof isSandboxOrExecutor === 'boolean' ? executorArg : isSandboxOrExecutor;
  const firstLiveTransition = and(eq(users.isPro, false), isNull(users.proSubscriptionStartDate));
  const sandboxToLiveTransition = and(eq(users.isPro, true), eq(users.proSubscriptionSandbox, true));
  const eligibleTransition = isSandbox ? firstLiveTransition : or(firstLiveTransition, sandboxToLiveTransition);

  const [firstPro] = await executor
    .update(users)
    .set(updates)
    .where(and(eq(users.id, userId), eligibleTransition))
    .returning({
      walletAddress: users.walletAddress,
      originalSignupReferralCode: users.originalSignupReferralCode,
    });
  return firstPro ?? null;
}

export function getTowerdogRewardDecision(walletAddress: string | null): {
  rewardMode: 'wallet' | 'xp_only';
  xpAmount: number;
  gftAmount: number;
  walletAddress: string | null;
  status: 'pending' | 'xp_only';
} {
  const normalizedWallet = walletAddress?.trim().toLowerCase() || null;
  const hasWallet = normalizedWallet !== null && WALLET_ADDRESS_PATTERN.test(normalizedWallet);
  return {
    rewardMode: hasWallet ? 'wallet' : 'xp_only',
    xpAmount: hasWallet ? WALLET_XP_AMOUNT : NO_WALLET_XP_AMOUNT,
    gftAmount: hasWallet ? GFT_AMOUNT : 0,
    walletAddress: hasWallet ? normalizedWallet : null,
    status: hasWallet ? 'pending' : 'xp_only',
  };
}

export async function createTowerdogRewardDecision(
  userId: number,
  eventType: TowerdogRewardEvent,
  walletAddress: string | null,
  executor: any = db,
): Promise<TowerdogRewardPayout | null> {
  const [created] = await executor
    .insert(towerdogRewardPayouts)
    .values({ userId, eventType, ...getTowerdogRewardDecision(walletAddress) })
    .onConflictDoNothing({
      target: [towerdogRewardPayouts.userId, towerdogRewardPayouts.eventType],
    })
    .returning();

  if (created) return created;
  const [existing] = await executor
    .select()
    .from(towerdogRewardPayouts)
    .where(and(
      eq(towerdogRewardPayouts.userId, userId),
      eq(towerdogRewardPayouts.eventType, eventType),
    ))
    .limit(1);
  return existing ?? null;
}

async function processTowerdogWalletReward(payout: TowerdogRewardPayout): Promise<void> {
  if (process.env.NODE_ENV !== 'production' || payout.rewardMode !== 'wallet' || !payout.walletAddress) return;
  const now = new Date();
  const [claimed] = await db
    .update(towerdogRewardPayouts)
    .set({
      status: 'sending',
      attempts: sql`${towerdogRewardPayouts.attempts} + 1`,
      lastAttemptAt: now,
      nextRetryAt: null,
    })
    .where(and(
      eq(towerdogRewardPayouts.id, payout.id),
      or(
        and(eq(towerdogRewardPayouts.status, 'pending'), eq(towerdogRewardPayouts.attempts, 0)),
        and(
          eq(towerdogRewardPayouts.status, 'failed'),
          eq(towerdogRewardPayouts.retryable, true),
          or(isNull(towerdogRewardPayouts.nextRetryAt), lte(towerdogRewardPayouts.nextRetryAt, now)),
        ),
      ),
    ))
    .returning();
  if (!claimed) return;

  const transfer = await transferGfTokens(claimed.walletAddress!, claimed.gftAmount);
  await db.update(towerdogRewardPayouts)
    .set(transfer.success
      ? { status: 'paid', txHash: transfer.txHash ?? null, retryable: false, errorMessage: null, paidAt: new Date() }
      : {
          status: 'failed',
          txHash: transfer.txHash ?? null,
          errorMessage: transfer.error ?? 'GFT transfer failed',
          retryable: Boolean(transfer.retryable),
          nextRetryAt: transfer.retryable ? new Date(now.getTime() + RETRY_DELAY_MS) : null,
        })
    .where(and(eq(towerdogRewardPayouts.id, claimed.id), eq(towerdogRewardPayouts.status, 'sending')));
}

export async function grantTowerdogMilestoneReward(
  userId: number,
  eventType: TowerdogRewardEvent,
): Promise<void> {
  const [payout] = await db
    .select()
    .from(towerdogRewardPayouts)
    .where(and(eq(towerdogRewardPayouts.userId, userId), eq(towerdogRewardPayouts.eventType, eventType)))
    .limit(1);
  if (!payout) return;

  if (!payout.xpAwarded) {
    const inserted = await db.transaction(async (tx) => {
      const [history] = await tx.insert(userXPHistory).values({
        userId,
        xpAmount: payout.xpAmount,
        source: 'referral_bonus',
        description: `Earned ${payout.xpAmount} XP for ${eventLabel(eventType)} with the TOWER referral reward`,
        dedupeKey: `towerdog_milestone:${eventType}:${userId}`,
      }).onConflictDoNothing().returning({ id: userXPHistory.id });
      if (history) {
        await tx.update(users)
          .set({ totalXP: sql`coalesce(${users.totalXP}, 0) + ${payout.xpAmount}` })
          .where(eq(users.id, userId));
      }
      await tx.update(towerdogRewardPayouts)
        .set({ xpAwarded: true })
        .where(eq(towerdogRewardPayouts.id, payout.id));
      return Boolean(history);
    });
    if (inserted) await XPService.updateUserLevel(userId);
  }
  await processTowerdogWalletReward(payout);
}

export async function backfillTowerdogMilestoneRewards(): Promise<void> {
  if (process.env.NODE_ENV !== 'production') return;
  const eligibleUsers = await db.select({ id: users.id })
    .from(users)
    .where(and(eq(users.originalSignupReferralCode, TOWERDOG_REFERRAL_CODE), gte(users.createdAt, PROGRAM_START)));
  for (const user of eligibleUsers) {
    await createTowerdogRewardDecision(user.id, 'signup', null);
    await grantTowerdogMilestoneReward(user.id, 'signup');
  }
}

export async function processDueTowerdogRewardPayouts(limit = 25): Promise<void> {
  if (process.env.NODE_ENV !== 'production') return;
  const now = new Date();
  const payouts = await db.select().from(towerdogRewardPayouts)
    .where(or(
      eq(towerdogRewardPayouts.xpAwarded, false),
      and(eq(towerdogRewardPayouts.status, 'pending'), eq(towerdogRewardPayouts.attempts, 0)),
      and(eq(towerdogRewardPayouts.status, 'sending'), isNull(towerdogRewardPayouts.txHash),
        lte(towerdogRewardPayouts.lastAttemptAt, new Date(now.getTime() - STALE_PREPARATION_MS))),
      and(eq(towerdogRewardPayouts.status, 'failed'), eq(towerdogRewardPayouts.retryable, true),
        or(isNull(towerdogRewardPayouts.nextRetryAt), lte(towerdogRewardPayouts.nextRetryAt, now))),
    ))
    .orderBy(asc(towerdogRewardPayouts.createdAt))
    .limit(limit);
  for (const payout of payouts) {
    try {
      await grantTowerdogMilestoneReward(payout.userId, payout.eventType as TowerdogRewardEvent);
    } catch (error) {
      console.error(`[Towerdog Rewards] Failed to process payout ${payout.id}:`, error);
    }
  }
}