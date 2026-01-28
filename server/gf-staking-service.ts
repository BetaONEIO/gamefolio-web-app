import { createPublicClient, createWalletClient, http, formatUnits, parseUnits, type Address, type WalletClient, type PublicClient } from 'viem';
import { GF_STAKING_ADDRESS, GF_STAKING_ABI, GF_TOKEN_ADDRESS, GF_TOKEN_ABI, SKALE_NEBULA_TESTNET } from '@shared/contracts';

const GF_DECIMALS = 18;

export class StakingError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'StakingError';
  }
}

function getPublicClient(): PublicClient {
  return createPublicClient({
    chain: SKALE_NEBULA_TESTNET as any,
    transport: http(SKALE_NEBULA_TESTNET.rpcUrls.default.http[0]),
  });
}

export interface StakePosition {
  staked: string;
  earned: string;
  stakedRaw: bigint;
  earnedRaw: bigint;
}

export async function getStakePosition(address: string): Promise<StakePosition> {
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new StakingError('Invalid wallet address format', 'INVALID_ADDRESS');
  }

  const client = getPublicClient();
  const userAddress = address as Address;

  try {
    const [stakedRaw, earnedRaw] = await Promise.all([
      client.readContract({
        address: GF_STAKING_ADDRESS,
        abi: GF_STAKING_ABI,
        functionName: 'stakeOf',
        args: [userAddress],
      }) as Promise<bigint>,
      client.readContract({
        address: GF_STAKING_ADDRESS,
        abi: GF_STAKING_ABI,
        functionName: 'earned',
        args: [userAddress],
      }) as Promise<bigint>,
    ]);

    return {
      staked: formatUnits(stakedRaw, GF_DECIMALS),
      earned: formatUnits(earnedRaw, GF_DECIMALS),
      stakedRaw,
      earnedRaw,
    };
  } catch (error: any) {
    if (error.message?.includes('execution reverted')) {
      throw new StakingError('Staking contract call failed - contract may not be deployed', 'CONTRACT_ERROR');
    }
    throw new StakingError(`Failed to get stake position: ${error.message}`, 'READ_ERROR');
  }
}

export async function stake(
  walletClient: WalletClient,
  amount: string
): Promise<{ txHash: string; amount: string }> {
  if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
    throw new StakingError('Amount must be a positive number', 'INVALID_AMOUNT');
  }

  const account = walletClient.account;
  if (!account) {
    throw new StakingError('Wallet account not available', 'NO_ACCOUNT');
  }

  const amountRaw = parseUnits(amount, GF_DECIMALS);
  const publicClient = getPublicClient();

  try {
    const balance = await publicClient.readContract({
      address: GF_TOKEN_ADDRESS,
      abi: GF_TOKEN_ABI,
      functionName: 'balanceOf',
      args: [account.address],
    }) as bigint;

    if (balance < amountRaw) {
      throw new StakingError(
        `Insufficient GF balance. Have: ${formatUnits(balance, GF_DECIMALS)}, Need: ${amount}`,
        'INSUFFICIENT_BALANCE'
      );
    }

    const allowance = await publicClient.readContract({
      address: GF_TOKEN_ADDRESS,
      abi: GF_TOKEN_ABI,
      functionName: 'allowance',
      args: [account.address, GF_STAKING_ADDRESS],
    }) as bigint;

    if (allowance < amountRaw) {
      const approveHash = await walletClient.writeContract({
        address: GF_TOKEN_ADDRESS,
        abi: GF_TOKEN_ABI,
        functionName: 'approve',
        args: [GF_STAKING_ADDRESS, amountRaw],
        chain: SKALE_NEBULA_TESTNET as any,
        account,
      });

      await publicClient.waitForTransactionReceipt({ hash: approveHash, confirmations: 1 });
    }

    const txHash = await walletClient.writeContract({
      address: GF_STAKING_ADDRESS,
      abi: GF_STAKING_ABI,
      functionName: 'stake',
      args: [amountRaw],
      chain: SKALE_NEBULA_TESTNET as any,
      account,
    });

    await publicClient.waitForTransactionReceipt({ hash: txHash, confirmations: 1 });

    return { txHash, amount };
  } catch (error: any) {
    if (error instanceof StakingError) throw error;
    if (error.message?.includes('user rejected')) {
      throw new StakingError('Transaction was rejected by user', 'USER_REJECTED');
    }
    if (error.message?.includes('insufficient funds')) {
      throw new StakingError('Insufficient sFUEL for gas', 'INSUFFICIENT_GAS');
    }
    throw new StakingError(`Stake failed: ${error.message}`, 'STAKE_ERROR');
  }
}

export async function claim(
  walletClient: WalletClient
): Promise<{ txHash: string }> {
  const account = walletClient.account;
  if (!account) {
    throw new StakingError('Wallet account not available', 'NO_ACCOUNT');
  }

  const publicClient = getPublicClient();

  try {
    const earned = await publicClient.readContract({
      address: GF_STAKING_ADDRESS,
      abi: GF_STAKING_ABI,
      functionName: 'earned',
      args: [account.address],
    }) as bigint;

    if (earned === 0n) {
      throw new StakingError('No rewards available to claim', 'NO_REWARDS');
    }

    const txHash = await walletClient.writeContract({
      address: GF_STAKING_ADDRESS,
      abi: GF_STAKING_ABI,
      functionName: 'claim',
      args: [],
      chain: SKALE_NEBULA_TESTNET as any,
      account,
    });

    await publicClient.waitForTransactionReceipt({ hash: txHash, confirmations: 1 });

    return { txHash };
  } catch (error: any) {
    if (error instanceof StakingError) throw error;
    if (error.message?.includes('user rejected')) {
      throw new StakingError('Transaction was rejected by user', 'USER_REJECTED');
    }
    throw new StakingError(`Claim failed: ${error.message}`, 'CLAIM_ERROR');
  }
}

export async function unstake(
  walletClient: WalletClient,
  amount: string
): Promise<{ txHash: string; amount: string }> {
  if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
    throw new StakingError('Amount must be a positive number', 'INVALID_AMOUNT');
  }

  const account = walletClient.account;
  if (!account) {
    throw new StakingError('Wallet account not available', 'NO_ACCOUNT');
  }

  const amountRaw = parseUnits(amount, GF_DECIMALS);
  const publicClient = getPublicClient();

  try {
    const staked = await publicClient.readContract({
      address: GF_STAKING_ADDRESS,
      abi: GF_STAKING_ABI,
      functionName: 'stakeOf',
      args: [account.address],
    }) as bigint;

    if (staked < amountRaw) {
      throw new StakingError(
        `Cannot unstake more than staked. Staked: ${formatUnits(staked, GF_DECIMALS)}, Requested: ${amount}`,
        'INSUFFICIENT_STAKE'
      );
    }

    const txHash = await walletClient.writeContract({
      address: GF_STAKING_ADDRESS,
      abi: GF_STAKING_ABI,
      functionName: 'unstake',
      args: [amountRaw],
      chain: SKALE_NEBULA_TESTNET as any,
      account,
    });

    await publicClient.waitForTransactionReceipt({ hash: txHash, confirmations: 1 });

    return { txHash, amount };
  } catch (error: any) {
    if (error instanceof StakingError) throw error;
    if (error.message?.includes('user rejected')) {
      throw new StakingError('Transaction was rejected by user', 'USER_REJECTED');
    }
    throw new StakingError(`Unstake failed: ${error.message}`, 'UNSTAKE_ERROR');
  }
}

export async function getStakingStats(): Promise<{
  totalStaked: string;
  rewardRate: string;
}> {
  const client = getPublicClient();

  try {
    const [totalStakedRaw, rewardRateRaw] = await Promise.all([
      client.readContract({
        address: GF_STAKING_ADDRESS,
        abi: GF_STAKING_ABI,
        functionName: 'totalStaked',
        args: [],
      }) as Promise<bigint>,
      client.readContract({
        address: GF_STAKING_ADDRESS,
        abi: GF_STAKING_ABI,
        functionName: 'rewardRate',
        args: [],
      }) as Promise<bigint>,
    ]);

    return {
      totalStaked: formatUnits(totalStakedRaw, GF_DECIMALS),
      rewardRate: formatUnits(rewardRateRaw, GF_DECIMALS),
    };
  } catch (error: any) {
    throw new StakingError(`Failed to get staking stats: ${error.message}`, 'STATS_ERROR');
  }
}
