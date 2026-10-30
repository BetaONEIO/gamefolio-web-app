import { createPublicClient, http, formatEther, type Address, type Abi } from 'viem';
import { ethers } from 'ethers';
import { SKALE_BASE_MAINNET } from '../shared/contracts';
import {
  STAKING_FUNDING_CODES,
  STAKING_SFUEL_DISTRIBUTION_WEI,
  StakingFundingError,
  fundingFailureForSend,
  requiredStakingGasBalanceWei,
  stakingTopUpAmountWei,
} from '../shared/staking-funding';
import { captureStakingWalletBalanceLow } from './sentry';
import { decryptPrivateKey } from './wallet-crypto';
import { createKeyedSerialExecutor } from './keyed-serial-executor';

const RPC_URL = SKALE_BASE_MAINNET.rpcUrls.default.http[0];

const SFUEL_DISTRIBUTION_AMOUNT = STAKING_SFUEL_DISTRIBUTION_WEI;
const runWalletTransaction = createKeyedSerialExecutor();
const runTreasuryTransaction = createKeyedSerialExecutor();
const TREASURY_LOCK_KEY = 'staking-sfuel-treasury';

export const publicClient = createPublicClient({
  chain: SKALE_BASE_MAINNET,
  transport: http(RPC_URL),
});

function getEthersProvider(): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(RPC_URL);
}

function getTreasurySigner(): ethers.Wallet {
  const privateKey = process.env.TREASURY_PRIVATE_KEY;
  if (!privateKey) throw new Error('TREASURY_PRIVATE_KEY not configured');
  const trimmed = privateKey.trim();
  const formatted = trimmed.startsWith('0x') ? trimmed : `0x${trimmed}`;
  return new ethers.Wallet(formatted, getEthersProvider());
}

async function observeTreasuryBalance(): Promise<bigint | null> {
  if (!process.env.TREASURY_PRIVATE_KEY?.trim()) return null;
  try {
    const treasurer = getTreasurySigner();
    const balance = await publicClient.getBalance({ address: treasurer.address as Address });
    captureStakingWalletBalanceLow(balance);
    return balance;
  } catch {
    console.error('[sFUEL] Treasury balance check failed');
    return null;
  }
}

/** Periodic and on-demand check of the treasury wallet that tops up sFUEL. */
export async function checkStakingTreasuryBalance(): Promise<void> {
  await observeTreasuryBalance();
}

async function ensureSFuel(address: string, requiredBalance: bigint): Promise<void> {
  const balance = await publicClient.getBalance({ address: address as Address });
  if (balance >= requiredBalance) return;

  await runTreasuryTransaction(TREASURY_LOCK_KEY, async () => {
    // Another request may have funded this wallet while this request waited.
    const currentBalance = await publicClient.getBalance({ address: address as Address });
    const topUpAmount = stakingTopUpAmountWei(currentBalance, requiredBalance);
    if (topUpAmount === 0n) return;

    let treasurer: ethers.Wallet;
    try {
      treasurer = getTreasurySigner();
    } catch {
      throw new StakingFundingError(STAKING_FUNDING_CODES.PLATFORM_WALLET_UNDERFUNDED);
    }

    const treasuryBalance = await publicClient.getBalance({ address: treasurer.address as Address });
    captureStakingWalletBalanceLow(treasuryBalance);
    if (treasuryBalance < topUpAmount) {
      throw new StakingFundingError(STAKING_FUNDING_CODES.PLATFORM_WALLET_UNDERFUNDED);
    }

    console.log(
      `[sFUEL] Wallet ${address} has ${formatEther(currentBalance)} sFUEL; ` +
      `${formatEther(requiredBalance)} required — distributing ${formatEther(topUpAmount)} from treasury...`,
    );
    try {
      const tx = await treasurer.sendTransaction({ to: address, value: topUpAmount });
      const receipt = await tx.wait();
      if (!receipt || receipt.status !== 1) {
        throw new Error(`Treasury top-up did not confirm successfully (hash: ${tx.hash})`);
      }
      console.log(`[sFUEL] Distributed to ${address}. TX: ${tx.hash}`);
    } catch (error) {
      const funding = fundingFailureForSend(error, 'treasury_topup');
      if (funding) {
        await observeTreasuryBalance();
        throw funding;
      }
      throw error;
    }
  });
}

async function sendSignedContract({
  wallet,
  contractAddress,
  abi,
  functionName,
  args,
}: {
  wallet: ethers.Wallet;
  contractAddress: Address;
  abi: Abi | readonly unknown[];
  functionName: string;
  args: readonly unknown[];
}): Promise<`0x${string}`> {
  return runWalletTransaction(wallet.address, async () => {
    const contract = new ethers.Contract(contractAddress, abi as ethers.InterfaceAbi, wallet);
    try {
      const [estimatedGas, feeData] = await Promise.all([
        contract[functionName].estimateGas(...args),
        wallet.provider!.getFeeData(),
      ]);
      const gasPrice = feeData.maxFeePerGas ?? feeData.gasPrice;
      if (gasPrice === null) throw new Error('RPC did not return a gas price');

      const requiredBalance = requiredStakingGasBalanceWei(estimatedGas, gasPrice);
      await ensureSFuel(wallet.address, requiredBalance);

      const tx = await contract[functionName](...args);
      const receipt = await tx.wait();

      if (!receipt || receipt.status !== 1) {
        throw new Error(`Transaction did not confirm successfully (hash: ${tx.hash})`);
      }

      return receipt.hash as `0x${string}`;
    } catch (error) {
      const funding = fundingFailureForSend(error, 'user_transaction');
      if (funding) {
        await observeTreasuryBalance();
        throw funding;
      }
      throw error;
    }
  });
}

export async function writeContractWithPoW({
  encryptedPrivateKey,
  contractAddress,
  abi,
  functionName,
  args,
}: {
  encryptedPrivateKey: string;
  contractAddress: Address;
  abi: Abi | readonly unknown[];
  functionName: string;
  args: readonly unknown[];
}): Promise<`0x${string}`> {
  const rawKey = decryptPrivateKey(encryptedPrivateKey);
  const formatted = rawKey.startsWith('0x') ? rawKey : `0x${rawKey}`;

  const provider = getEthersProvider();
  const wallet = new ethers.Wallet(formatted, provider);
  return sendSignedContract({ wallet, contractAddress, abi, functionName, args });
}

export async function writeContractWithPoWFromRawKey({
  privateKeyRaw,
  contractAddress,
  abi,
  functionName,
  args,
}: {
  privateKeyRaw: string;
  contractAddress: Address;
  abi: Abi | readonly unknown[];
  functionName: string;
  args: readonly unknown[];
}): Promise<`0x${string}`> {
  const trimmed = privateKeyRaw.trim();
  const formatted = trimmed.startsWith('0x') ? trimmed : `0x${trimmed}`;

  const provider = getEthersProvider();
  const wallet = new ethers.Wallet(formatted, provider);
  return sendSignedContract({ wallet, contractAddress, abi, functionName, args });
}
