import assert from 'node:assert/strict';
import test from 'node:test';
import { parseEther } from 'viem';
import {
  DEFAULT_STAKING_WALLET_LOW_BALANCE_SFUEL,
  STAKING_FUNDING_CODES,
  STAKING_SFUEL_DISTRIBUTION_WEI,
  STAKING_WALLET_ALERT_COOLDOWN_MS,
  STAKING_WALLET_LOW_BALANCE_ENV,
  STAKING_WALLET_LOW_BALANCE_EVENT,
  createStakingWalletAlertGate,
  friendlyStakingFailure,
  fundingFailureForSend,
  isInsufficientNativeBalanceError,
  readStakingWalletLowBalanceWei,
  shouldEmitStakingWalletLowBalance,
  stakingFundingResponse,
} from '../shared/staking-funding';

const CHAIN_REJECTION = {
  code: 'UNKNOWN_ERROR',
  shortMessage: 'could not coalesce error',
  message:
    'could not coalesce error (error={ "code": -32004, "message": "Account balance is too low (balance < value + gas * gas price)." }, payload={ "method": "eth_sendRawTransaction", "params": ["payload-sentinel"] })',
  info: {
    error: {
      code: -32004,
      message: 'Account balance is too low (balance < value + gas * gas price).',
    },
    payload: { method: 'eth_sendRawTransaction', params: ['payload-sentinel'] },
  },
};

test('classifies a chain gas rejection as the user wallet or the treasury', () => {
  assert.equal(isInsufficientNativeBalanceError(CHAIN_REJECTION), true);
  assert.equal(isInsufficientNativeBalanceError({ code: 'INSUFFICIENT_FUNDS', message: 'insufficient funds for gas' }), true);
  assert.equal(isInsufficientNativeBalanceError(new Error('ERC20: transfer amount exceeds balance')), false);

  const user = fundingFailureForSend(CHAIN_REJECTION, 'user_transaction');
  assert.ok(user);
  assert.equal(user.code, STAKING_FUNDING_CODES.INSUFFICIENT_SFUEL);
  assert.equal(user.status, 400);
  assert.equal(user.payer, 'user');
  assert.equal(user.message.includes('payload-sentinel'), false);
  assert.equal(user.message.includes('could not coalesce'), false);

  const platform = fundingFailureForSend(CHAIN_REJECTION, 'treasury_topup');
  assert.ok(platform);
  assert.equal(platform.code, STAKING_FUNDING_CODES.PLATFORM_WALLET_UNDERFUNDED);
  assert.equal(platform.status, 503);
  assert.equal(platform.payer, 'platform');
  assert.equal(fundingFailureForSend(platform, 'user_transaction'), platform);

  const userHttp = stakingFundingResponse(user.code, 'stake');
  assert.equal(userHttp.status, 400);
  assert.equal(userHttp.body.code, 'INSUFFICIENT_SFUEL');
  assert.equal(userHttp.body.payer, 'user');
  assert.equal(JSON.stringify(userHttp.body).includes('payload-sentinel'), false);
  assert.equal(JSON.stringify(userHttp.body).includes('0x'), false);

  const platformHttp = stakingFundingResponse(platform.code, 'unstake');
  assert.equal(platformHttp.status, 503);
  assert.equal(platformHttp.body.code, 'PLATFORM_WALLET_UNDERFUNDED');
  assert.equal(platformHttp.body.payer, 'platform');
  assert.match(platformHttp.body.error, /unstake is temporarily unavailable/);
  assert.match(platformHttp.body.error, /gas wallet is low on sFUEL/);
});

test('shows a friendly stake message instead of the chain payload', () => {
  const wrapped = new Error(`500: ${JSON.stringify({ error: CHAIN_REJECTION.message })}`);
  const friendly = friendlyStakingFailure(wrapped, 'Stake');
  assert.ok(friendly);
  assert.equal(friendly.title, 'Not enough sFUEL for gas');
  assert.match(friendly.description, /enough sFUEL to cover the network fee/);
  assert.equal(friendly.description.includes('payload-sentinel'), false);
  assert.equal(friendly.description.includes('could not coalesce'), false);

  const platform = new Error(
    `503: ${JSON.stringify(stakingFundingResponse('PLATFORM_WALLET_UNDERFUNDED', 'stake').body)}`,
  );
  const shown = friendlyStakingFailure(platform, 'Stake');
  assert.ok(shown);
  assert.equal(shown.title, 'Stake unavailable');
  assert.match(shown.description, /gas wallet is low on sFUEL/);
  assert.equal(shown.description.includes('payload-sentinel'), false);

  assert.equal(friendlyStakingFailure(new Error('User rejected the request'), 'Stake'), null);
});

test('reads the treasury alert threshold from the env var and falls back to 1 sFUEL', () => {
  const previous = process.env[STAKING_WALLET_LOW_BALANCE_ENV];
  delete process.env[STAKING_WALLET_LOW_BALANCE_ENV];
  try {
    assert.equal(DEFAULT_STAKING_WALLET_LOW_BALANCE_SFUEL, '1');
    assert.equal(readStakingWalletLowBalanceWei(), parseEther('1'));
    assert.equal(readStakingWalletLowBalanceWei(''), parseEther('1'));
    assert.equal(readStakingWalletLowBalanceWei('not-a-number'), parseEther('1'));
    assert.equal(readStakingWalletLowBalanceWei('-5'), parseEther('1'));
    assert.equal(readStakingWalletLowBalanceWei('2.5'), parseEther('2.5'));
    assert.equal(readStakingWalletLowBalanceWei('0'), 0n);
  } finally {
    if (previous === undefined) delete process.env[STAKING_WALLET_LOW_BALANCE_ENV];
    else process.env[STAKING_WALLET_LOW_BALANCE_ENV] = previous;
  }
});

test('emits staking.wallet_balance_low once per cooldown, with balance and threshold tags', () => {
  const gate = createStakingWalletAlertGate(STAKING_WALLET_ALERT_COOLDOWN_MS);
  const distributionWei = STAKING_SFUEL_DISTRIBUTION_WEI;
  const thresholdWei = parseEther('1');
  const startedAt = 1_700_000_000_000;

  const low = shouldEmitStakingWalletLowBalance({
    balanceWei: parseEther('0.4'),
    thresholdWei,
    distributionWei,
    now: startedAt,
    gate,
  });
  assert.ok(low);
  assert.equal(low.message, STAKING_WALLET_LOW_BALANCE_EVENT);
  assert.equal(low.level, 'error');
  assert.deepEqual(low.fingerprint, [STAKING_WALLET_LOW_BALANCE_EVENT]);
  assert.equal(low.tags.balance, '0.4');
  assert.equal(low.tags.threshold, '1');
  assert.equal(low.tags.wallet_role, 'treasury');
  assert.equal(JSON.stringify(low).includes('0x'), false);
  assert.equal(JSON.stringify(low).includes('payload-sentinel'), false);

  assert.equal(
    shouldEmitStakingWalletLowBalance({
      balanceWei: 0n,
      thresholdWei,
      distributionWei,
      now: startedAt + 1_000,
      gate,
    }),
    null,
  );

  const afterCooldown = shouldEmitStakingWalletLowBalance({
    balanceWei: parseEther('0.05'),
    thresholdWei,
    distributionWei,
    now: startedAt + STAKING_WALLET_ALERT_COOLDOWN_MS,
    gate,
  });
  assert.ok(afterCooldown);
  assert.equal(afterCooldown.level, 'fatal');
  assert.equal(afterCooldown.tags.balance, '0.05');

  const healthyGate = createStakingWalletAlertGate(STAKING_WALLET_ALERT_COOLDOWN_MS);
  assert.equal(
    shouldEmitStakingWalletLowBalance({
      balanceWei: thresholdWei,
      thresholdWei,
      distributionWei,
      now: startedAt,
      gate: healthyGate,
    }),
    null,
  );
  assert.equal(
    shouldEmitStakingWalletLowBalance({
      balanceWei: 0n,
      thresholdWei: 0n,
      distributionWei,
      now: startedAt,
      gate: healthyGate,
    }),
    null,
  );
});
