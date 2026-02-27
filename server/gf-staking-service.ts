import { createPublicClient, http, formatUnits, type Address, type PublicClient } from 'viem';
import { GF_STAKING_ADDRESS, GF_STAKING_ABI, SKALE_NEBULA_TESTNET } from '@shared/contracts';

const GF_DECIMALS = 18;
const APY_RATE = 0.125;
const SECONDS_PER_YEAR = 31_536_000;

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

export function calculateEarnedAt12_5Apy(stakedFloat: number, lastClaimTimestamp: number): number {
  if (stakedFloat <= 0 || lastClaimTimestamp <= 0) return 0;
  const nowSec = Math.floor(Date.now() / 1000);
  const elapsedSec = Math.max(0, nowSec - lastClaimTimestamp);
  return stakedFloat * (elapsedSec / SECONDS_PER_YEAR) * APY_RATE;
}

export async function getStakePosition(address: string): Promise<StakePosition> {
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new StakingError('Invalid wallet address format', 'INVALID_ADDRESS');
  }

  const client = getPublicClient();
  const userAddress = address as Address;

  try {
    const stakesResult = await client.readContract({
      address: GF_STAKING_ADDRESS,
      abi: GF_STAKING_ABI,
      functionName: 'stakes',
      args: [userAddress],
    }) as readonly [bigint, bigint, bigint];

    const stakedRaw = stakesResult[0];
    const lastClaimTimestamp = Number(stakesResult[2]);
    const stakedFloat = parseFloat(formatUnits(stakedRaw, GF_DECIMALS));

    const earned = calculateEarnedAt12_5Apy(stakedFloat, lastClaimTimestamp);
    const earnedRaw = BigInt(Math.floor(earned * 1e6)) * BigInt(1e12);

    return {
      staked: formatUnits(stakedRaw, GF_DECIMALS),
      earned: earned.toFixed(6),
      stakedRaw,
      earnedRaw,
    };
  } catch (error: any) {
    throw new StakingError(`Failed to get stake position: ${error.message}`, 'READ_ERROR');
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
