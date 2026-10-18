import { and, asc, eq, gte, isNull, lte, or, sql } from 'drizzle-orm';
import { db } from '../db';
import { towerdogRewardPayouts, userXPHistory, users, type TowerdogRewardPayout } from '@shared/schema';
import { XPService } from '../xp-service';
import { getGfTransferReceiptStatus, rebroadcastSignedGfTransfer, transferGfTokens } from '../gf-token-service';
import { TOWERDOG_REFERRAL_CODE } from '@shared/profile-theme';

export type TowerdogRewardEvent = 'signup' | 'pro_purchase';

const GFT_AMOUNT = 500;
const WALLET_XP_AMOUNT = 500;
const NO_WALLET_XP_AMOUNT = 750;
const RETRY_DELAY_MS = 6 * 60 * 60 * 1000;
const STALE_PREPARATION_MS = 10 * 60 * 1000;
const PROGRAM_START = new Date('2026-09-17T00:00:00.000Z');
const WALLET_ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

export interface TowerdogRewardRuntime {
  db: typeof db;
  transferGfTokens: typeof transferGfTokens;
  getGfTransferReceiptStatus: typeof getGfTransferReceiptStatus;
  rebroadcastSignedGfTransfer: typeof rebroadcastSignedGfTransfer;
  updateUserLevel: typeof XPService.updateUserLevel;
}

const productionRuntime: TowerdogRewardRuntime = {
  db,
  transferGfTokens,
  getGfTransferReceiptStatus,
  rebroadcastSignedGfTransfer,
  updateUserLevel: XPService.updateUserLevel.bind(XPService),
};

function eventLabel(eventType: TowerdogRewardEvent): string {
  return eventType === 'signup' ? 'signing up' : 'purchasing Pro';
}

export function shouldCreateTowerdogProReward(
  originalSignupReferralCode: string | null | undefined,
  isSandbox = false,
): boolean {
  return !isSandbox && originalSignupReferralCode === TOWERDOG_REFERRAL_CODE;
}

// Both Stripe provisioning and RevenueCat activation/webhooks use this
// compare-and-set transition. Keeping it shared makes the first-Pro boundary
// auditable: only the transaction that changes isPro=false to true can create
// the milestone decision.
export async function claimFirstProTransition(
  userId: number,
  updates: Record<string, unknown>,
  executor: any = db,
): Promise<{
  walletAddress: string | null;
  originalSignupReferralCode: string | null;
} | null> {
  const [firstPro] = await executor
    .update(users)
    .set(updates)
    .where(and(
      eq(users.id, userId),
      eq(users.isPro, false),
      isNull(users.proSubscriptionStartDate),
    ))
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
  const decision = getTowerdogRewardDecision(walletAddress);
  const [created] = await executor
    .insert(towerdogRewardPayouts)
    .values({
      userId,
      eventType,
      ...decision,
    })
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

async function reconcileSubmittedReward(
  payout: TowerdogRewardPayout,
  runtime: TowerdogRewardRuntime,
): Promise<void> {
  if (!payout.txHash) return;
  const receiptStatus = await runtime.getGfTransferReceiptStatus(payout.txHash);
  if (receiptStatus === 'pending') {
    if (payout.signedTransaction) {
      try {
        await runtime.rebroadcastSignedGfTransfer(payout.signedTransaction);
      } catch (error: any) {
        const message = String(error?.shortMessage || error?.message || '');
        if (!message.toLowerCase().includes('already known')) throw error;
      }
    }
    return;
  }

  await runtime.db
    .update(towerdogRewardPayouts)
    .set(receiptStatus === 'success'
      ? {
          status: 'paid',
          errorMessage: null,
          retryable: false,
          nextRetryAt: null,
          paidAt: new Date(),
        }
      : {
          status: 'failed',
          txHash: null,
          signedTransaction: null,
          errorMessage: 'Transaction reverted',
          retryable: true,
          nextRetryAt: new Date(),
        })
    .where(and(
      eq(towerdogRewardPayouts.id, payout.id),
      eq(towerdogRewardPayouts.status, 'submitted'),
      eq(towerdogRewardPayouts.txHash, payout.txHash),
    ));
}

export async function processTowerdogWalletReward(
  payout: TowerdogRewardPayout,
  runtime: TowerdogRewardRuntime = productionRuntime,
): Promise<void> {
  if (process.env.NODE_ENV !== 'production' || payout.rewardMode !== 'wallet' || !payout.walletAddress) {
    return;
  }
  if (payout.status === 'paid' || payout.status === 'xp_only') return;
  if (payout.status === 'submitted') {
    await reconcileSubmittedReward(payout, runtime);
    return;
  }

  const now = new Date();
  const [claimed] = await runtime.db
    .update(towerdogRewardPayouts)
    .set({
      status: 'sending',
      attempts: sql`${towerdogRewardPayouts.attempts} + 1`,
      lastAttemptAt: now,
      nextRetryAt: null,
    })
    .where(and(
      eq(towerdogRewardPayouts.id, payout.id),
      isNull(towerdogRewardPayouts.txHash),
      or(
        and(eq(towerdogRewardPayouts.status, 'pending'), eq(towerdogRewardPayouts.attempts, 0)),
        and(
          eq(towerdogRewardPayouts.status, 'failed'),
          eq(towerdogRewardPayouts.retryable, true),
          or(isNull(towerdogRewardPayouts.nextRetryAt), lte(towerdogRewardPayouts.nextRetryAt, now)),
        ),
        and(
          eq(towerdogRewardPayouts.status, 'sending'),
          lte(towerdogRewardPayouts.lastAttemptAt, new Date(now.getTime() - STALE_PREPARATION_MS)),
        ),
      ),
    ))
    .returning();
  if (!claimed) return;

  const transfer = await runtime.transferGfTokens(claimed.walletAddress!, claimed.gftAmount, {
    onPrepared: async (txHash, signedTransaction) => {
      const [prepared] = await runtime.db
        .update(towerdogRewardPayouts)
        .set({ status: 'submitted', txHash, signedTransaction, retryable: false, errorMessage: null })
        .where(and(
          eq(towerdogRewardPayouts.id, claimed.id),
          eq(towerdogRewardPayouts.status, 'sending'),
          isNull(towerdogRewardPayouts.txHash),
        ))
        .returning({ id: towerdogRewardPayouts.id });
      if (!prepared) throw new Error('Towerdog payout state changed before transaction preparation');
    },
  });

  const expectedHash = transfer.txHash ?? null;
  await runtime.db
    .update(towerdogRewardPayouts)
    .set(transfer.success
      ? {
          status: 'paid',
          txHash: transfer.txHash ?? claimed.txHash,
          errorMessage: null,
          retryable: false,
          nextRetryAt: null,
          paidAt: new Date(),
        }
      : transfer.txHash
        ? {
            status: 'submitted',
            txHash: transfer.txHash,
            signedTransaction: transfer.signedTransaction ?? null,
            errorMessage: transfer.error ?? null,
            retryable: false,
          }
        : {
            status: 'failed',
            errorMessage: transfer.error ?? 'GFT transfer failed',
            retryable: Boolean(transfer.retryable),
            nextRetryAt: transfer.retryable ? new Date(now.getTime() + RETRY_DELAY_MS) : null,
          })
    .where(and(
      eq(towerdogRewardPayouts.id, claimed.id),
      expectedHash
        ? and(
            eq(towerdogRewardPayouts.status, 'submitted'),
            eq(towerdogRewardPayouts.txHash, expectedHash),
          )
        : and(
            eq(towerdogRewardPayouts.status, 'sending'),
            isNull(towerdogRewardPayouts.txHash),
          ),
    ));
}

export async function grantTowerdogMilestoneReward(
  userId: number,
  eventType: TowerdogRewardEvent,
  runtime: TowerdogRewardRuntime = productionRuntime,
): Promise<void> {
  const [payout] = await runtime.db
    .select()
    .from(towerdogRewardPayouts)
    .where(and(
      eq(towerdogRewardPayouts.userId, userId),
      eq(towerdogRewardPayouts.eventType, eventType),
    ))
    .limit(1);
  if (!payout) return;

  if (!payout.xpAwarded) {
    const inserted = await runtime.db.transaction(async (tx) => {
      const [history] = await tx
        .insert(userXPHistory)
        .values({
          userId,
          xpAmount: payout.xpAmount,
          source: 'referral_bonus',
          description: `Earned ${payout.xpAmount} XP for ${eventLabel(eventType)} with the TOWER referral reward`,
          dedupeKey: `towerdog_milestone:${eventType}:${userId}`,
        })
        .onConflictDoNothing()
        .returning({ id: userXPHistory.id });
      if (history) {
        await tx
          .update(users)
          .set({ totalXP: sql`coalesce(${users.totalXP}, 0) + ${payout.xpAmount}` })
          .where(eq(users.id, userId));
      }
      await tx
        .update(towerdogRewardPayouts)
        .set({ xpAwarded: true })
        .where(eq(towerdogRewardPayouts.id, payout.id));
      return Boolean(history);
    });
    if (inserted) await runtime.updateUserLevel(userId);
  }
  await processTowerdogWalletReward(payout, runtime);
}

export async function backfillTowerdogMilestoneRewards(): Promise<void> {
  if (process.env.NODE_ENV !== 'production') return;
  const eligibleUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(and(
      eq(users.originalSignupReferralCode, TOWERDOG_REFERRAL_CODE),
      gte(users.createdAt, PROGRAM_START),
    ));
  for (const user of eligibleUsers) {
    // Registration happens before wallet setup, so a repaired signup event must
    // preserve the event-time no-wallet decision rather than inspect today’s wallet.
    await createTowerdogRewardDecision(user.id, 'signup', null);
    await grantTowerdogMilestoneReward(user.id, 'signup');
  }
}

export async function processDueTowerdogRewardPayouts(
  limit = 25,
  runtime: TowerdogRewardRuntime = productionRuntime,
): Promise<void> {
  if (process.env.NODE_ENV !== 'production') return;
  const now = new Date();
  const submitted = await runtime.db
    .select()
    .from(towerdogRewardPayouts)
    .where(eq(towerdogRewardPayouts.status, 'submitted'))
    .orderBy(asc(towerdogRewardPayouts.lastAttemptAt))
    .limit(limit);
  const actionable = await runtime.db
    .select()
    .from(towerdogRewardPayouts)
    .where(or(
      eq(towerdogRewardPayouts.xpAwarded, false),
      and(eq(towerdogRewardPayouts.status, 'pending'), eq(towerdogRewardPayouts.attempts, 0)),
      and(
        eq(towerdogRewardPayouts.status, 'sending'),
        isNull(towerdogRewardPayouts.txHash),
        lte(towerdogRewardPayouts.lastAttemptAt, new Date(now.getTime() - STALE_PREPARATION_MS)),
      ),
      and(
        eq(towerdogRewardPayouts.status, 'failed'),
        eq(towerdogRewardPayouts.retryable, true),
        or(isNull(towerdogRewardPayouts.nextRetryAt), lte(towerdogRewardPayouts.nextRetryAt, now)),
      ),
    ))
    .orderBy(asc(towerdogRewardPayouts.createdAt))
    .limit(limit);

  const payouts = new Map(
    [...submitted, ...actionable].map((payout) => [payout.id, payout]),
  );
  for (const payout of Array.from(payouts.values())) {
    try {
      await grantTowerdogMilestoneReward(
        payout.userId,
        payout.eventType as TowerdogRewardEvent,
        runtime,
      );
    } catch (error) {
      console.error(`[Towerdog Rewards] Failed to process payout ${payout.id}:`, error);
    }
  }
}