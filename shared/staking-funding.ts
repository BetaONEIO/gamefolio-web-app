import { formatEther, parseEther } from 'viem';

// Gas for server-signed staking transactions is paid in sFUEL by the user's
// custodial wallet. The treasury wallet (TREASURY_PRIVATE_KEY) only pays when
// it tops that wallet up. These helpers turn a chain "balance too low for
// value + gas" rejection into a stable API error, and describe when the
// treasury itself should raise staking.wallet_balance_low.

export const STAKING_WALLET_LOW_BALANCE_EVENT = 'staking.wallet_balance_low';

/** sFUEL. Balances below this raise the treasury alert unless overridden. */
export const DEFAULT_STAKING_WALLET_LOW_BALANCE_SFUEL = '1';

export const STAKING_WALLET_LOW_BALANCE_ENV = 'STAKING_WALLET_LOW_BALANCE_SFUEL';

/** Minimum automatic sFUEL top-up; larger gas deficits are funded in full. */
export const STAKING_SFUEL_DISTRIBUTION_WEI = parseEther('0.1');

/** Extra headroom over the node's estimate for fee movement and estimate drift. */
export const STAKING_GAS_RESERVE_PERCENT = 25n;

export function requiredStakingGasBalanceWei(
  estimatedGas: bigint,
  gasPriceWei: bigint,
  reservePercent = STAKING_GAS_RESERVE_PERCENT,
): bigint {
  const estimatedCost = estimatedGas * gasPriceWei;
  return (estimatedCost * (100n + reservePercent) + 99n) / 100n;
}

export function stakingTopUpAmountWei(
  balanceWei: bigint,
  requiredBalanceWei: bigint,
  distributionWei = STAKING_SFUEL_DISTRIBUTION_WEI,
): bigint {
  if (balanceWei >= requiredBalanceWei) return 0n;
  const deficit = requiredBalanceWei - balanceWei;
  return deficit > distributionWei ? deficit : distributionWei;
}

export const STAKING_WALLET_ALERT_COOLDOWN_MS = 30 * 60 * 1000;

export const STAKING_FUNDING_CODES = {
  INSUFFICIENT_SFUEL: 'INSUFFICIENT_SFUEL',
  PLATFORM_WALLET_UNDERFUNDED: 'PLATFORM_WALLET_UNDERFUNDED',
} as const;

export type StakingFundingCode = (typeof STAKING_FUNDING_CODES)[keyof typeof STAKING_FUNDING_CODES];

export type StakingAction = 'stake' | 'unstake' | 'claim';

export type StakingFundingPayer = 'user' | 'platform';

const INSUFFICIENT_NATIVE_BALANCE =
  /account balance is too low|insufficient funds(?: for gas| for intrinsic transaction cost)?/i;

const FUNDING_CODE_IN_TEXT = /"code"\s*:\s*"(INSUFFICIENT_SFUEL|PLATFORM_WALLET_UNDERFUNDED)"/;

const ACTION_LABEL: Record<StakingAction, { title: string; sentence: string }> = {
  stake: { title: 'Stake', sentence: 'stake' },
  unstake: { title: 'Unstake', sentence: 'unstake' },
  claim: { title: 'Claim', sentence: 'claim' },
};

export function normalizeStakingAction(action: string): StakingAction {
  const lower = action.toLowerCase();
  if (lower === 'unstake' || lower === 'claim') return lower;
  return 'stake';
}

export function presentStakingFunding(code: StakingFundingCode, action: StakingAction = 'stake'): {
  status: 400 | 503;
  payer: StakingFundingPayer;
  title: string;
  description: string;
} {
  if (code === STAKING_FUNDING_CODES.PLATFORM_WALLET_UNDERFUNDED) {
    const label = ACTION_LABEL[action];
    return {
      status: 503,
      payer: 'platform',
      title: `${label.title} unavailable`,
      description:
        `This ${label.sentence} is temporarily unavailable because the network gas wallet is low on sFUEL. ` +
        'Your GFT balance was not changed. Please try again later.',
    };
  }

  return {
    status: 400,
    payer: 'user',
    title: 'Not enough sFUEL for gas',
    description:
      'Your wallet does not have enough sFUEL to cover the network fee. Your GFT balance was not changed.',
  };
}

export class StakingFundingError extends Error {
  readonly code: StakingFundingCode;
  readonly status: 400 | 503;
  readonly payer: StakingFundingPayer;

  constructor(code: StakingFundingCode) {
    const presentation = presentStakingFunding(code);
    super(
      code === STAKING_FUNDING_CODES.PLATFORM_WALLET_UNDERFUNDED
        ? 'The network gas wallet is low on sFUEL, so this transaction could not be sent. Please try again later.'
        : 'Your wallet does not have enough sFUEL to cover the network fee.',
    );
    this.name = 'StakingFundingError';
    this.code = code;
    this.status = presentation.status;
    this.payer = presentation.payer;
  }
}

function collectErrorText(error: unknown, depth = 0): string[] {
  if (depth > 4 || error == null) return [];
  if (typeof error === 'string') return [error];
  if (typeof error !== 'object') return [];

  const record = error as Record<string, unknown>;
  const parts: string[] = [];
  for (const key of ['message', 'shortMessage', 'reason', 'details']) {
    if (typeof record[key] === 'string') parts.push(record[key] as string);
  }

  const info = record.info;
  if (info && typeof info === 'object') {
    const nested = (info as { error?: unknown }).error;
    if (nested) parts.push(...collectErrorText(nested, depth + 1));
  }
  if (record.error) parts.push(...collectErrorText(record.error, depth + 1));
  if (record.cause) parts.push(...collectErrorText(record.cause, depth + 1));
  return parts;
}

function hasInsufficientFundsCode(error: unknown, depth = 0): boolean {
  if (depth > 4 || !error || typeof error !== 'object') return false;
  if ((error as { code?: unknown }).code === 'INSUFFICIENT_FUNDS') return true;
  const record = error as { cause?: unknown; error?: unknown; info?: { error?: unknown } };
  return (
    hasInsufficientFundsCode(record.cause, depth + 1) ||
    hasInsufficientFundsCode(record.error, depth + 1) ||
    hasInsufficientFundsCode(record.info?.error, depth + 1)
  );
}

export function isInsufficientNativeBalanceError(error: unknown): boolean {
  if (hasInsufficientFundsCode(error)) return true;
  return collectErrorText(error).some((text) => INSUFFICIENT_NATIVE_BALANCE.test(text));
}

export function readStakingErrorCode(error: unknown): StakingFundingCode | null {
  for (const text of collectErrorText(error)) {
    const match = text.match(FUNDING_CODE_IN_TEXT);
    if (match) return match[1] as StakingFundingCode;
  }
  return null;
}

export function fundingFailureForSend(
  error: unknown,
  phase: 'treasury_topup' | 'user_transaction',
): StakingFundingError | null {
  if (error instanceof StakingFundingError) return error;
  if (!isInsufficientNativeBalanceError(error)) return null;
  return new StakingFundingError(
    phase === 'treasury_topup'
      ? STAKING_FUNDING_CODES.PLATFORM_WALLET_UNDERFUNDED
      : STAKING_FUNDING_CODES.INSUFFICIENT_SFUEL,
  );
}

export function stakingFundingResponse(code: StakingFundingCode, action: StakingAction) {
  const presentation = presentStakingFunding(code, action);
  return {
    status: presentation.status,
    body: {
      error: presentation.description,
      code,
      payer: presentation.payer,
    },
  };
}

export function friendlyStakingFailure(
  error: unknown,
  action: string,
): { title: string; description: string } | null {
  const normalized = normalizeStakingAction(action);
  const code = readStakingErrorCode(error);
  if (code === STAKING_FUNDING_CODES.PLATFORM_WALLET_UNDERFUNDED || code === STAKING_FUNDING_CODES.INSUFFICIENT_SFUEL) {
    const presentation = presentStakingFunding(code, normalized);
    return { title: presentation.title, description: presentation.description };
  }
  if (isInsufficientNativeBalanceError(error)) {
    const presentation = presentStakingFunding(STAKING_FUNDING_CODES.INSUFFICIENT_SFUEL, normalized);
    return { title: presentation.title, description: presentation.description };
  }
  return null;
}

export function readStakingWalletLowBalanceWei(
  raw: string | undefined = process.env[STAKING_WALLET_LOW_BALANCE_ENV],
): bigint {
  const trimmed = raw?.trim() ?? '';
  if (!trimmed) return parseEther(DEFAULT_STAKING_WALLET_LOW_BALANCE_SFUEL);
  if (trimmed.startsWith('-')) return parseEther(DEFAULT_STAKING_WALLET_LOW_BALANCE_SFUEL);
  try {
    return parseEther(trimmed);
  } catch {
    return parseEther(DEFAULT_STAKING_WALLET_LOW_BALANCE_SFUEL);
  }
}

export type StakingWalletAlertLevel = 'error' | 'fatal';

export interface StakingWalletLowBalanceReport {
  message: typeof STAKING_WALLET_LOW_BALANCE_EVENT;
  level: StakingWalletAlertLevel;
  fingerprint: [typeof STAKING_WALLET_LOW_BALANCE_EVENT];
  tags: {
    balance: string;
    threshold: string;
    wallet_role: 'treasury';
  };
}

export function planStakingWalletLowBalanceReport(
  balanceWei: bigint,
  thresholdWei: bigint,
  distributionWei: bigint,
): StakingWalletLowBalanceReport | null {
  if (balanceWei >= thresholdWei) return null;
  const level: StakingWalletAlertLevel = balanceWei < distributionWei ? 'fatal' : 'error';
  return {
    message: STAKING_WALLET_LOW_BALANCE_EVENT,
    level,
    fingerprint: [STAKING_WALLET_LOW_BALANCE_EVENT],
    tags: {
      balance: formatEther(balanceWei),
      threshold: formatEther(thresholdWei),
      wallet_role: 'treasury',
    },
  };
}

export interface StakingWalletAlertGate {
  tryAcquire(now: number): boolean;
}

export function createStakingWalletAlertGate(cooldownMs: number): StakingWalletAlertGate {
  let nextAllowedAt = 0;
  return {
    tryAcquire(now: number) {
      if (now < nextAllowedAt) return false;
      nextAllowedAt = now + cooldownMs;
      return true;
    },
  };
}

export function shouldEmitStakingWalletLowBalance(input: {
  balanceWei: bigint;
  thresholdWei: bigint;
  distributionWei: bigint;
  now: number;
  gate: StakingWalletAlertGate;
}): StakingWalletLowBalanceReport | null {
  const report = planStakingWalletLowBalanceReport(
    input.balanceWei,
    input.thresholdWei,
    input.distributionWei,
  );
  if (!report) return null;
  if (!input.gate.tryAcquire(input.now)) return null;
  return report;
}
