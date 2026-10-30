import { createPublicClient, http, parseEther, formatEther, type Address, type Abi } from 'viem';
import { ethers } from 'ethers';
import { SKALE_BASE_MAINNET } from '../shared/contracts';
import {
  STAKING_FUNDING_CODES,
  STAKING_SFUEL_DISTRIBUTION_WEI,
  StakingFundingError,
  fundingFailureForSend,
} from '../shared/staking-funding';
import { captureStakingWalletBalanceLow } from './sentry';
import { decryptPrivateKey } from './wallet-crypto';

const RPC_URL = SKALE_BASE_MAINNET.rpcUrls.default.http[0];

// User custodial wallets pay sFUEL gas on stake/unstake/claim. The treasury
// only sends sFUEL when a wallet is under this balance. Do not change it as
// part of error-reporting work — stake limits live elsewhere.
const SFUEL_THRESHOLD = parseEther('0.01');
const SFUEL_DISTRIBUTION_AMOUNT = STAKING_SFUEL_DISTRIBUTION_WEI;

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

async function ensureSFuel(address: string): Promise<void> {
  const balance = await publicClient.getBalance({ address: address as Address });
  const treasuryBalance = await observeTreasuryBalance();
  if (balance >= SFUEL_THRESHOLD) return;

  if (treasuryBalance !== null && treasuryBalance < SFUEL_DISTRIBUTION_AMOUNT) {
    throw new StakingFundingError(STAKING_FUNDING_CODES.PLATFORM_WALLET_UNDERFUNDED);
  }

  console.log(`[sFUEL] Wallet ${address} has ${formatEther(balance)} sFUEL — distributing from treasury...`);
  const treasurer = getTreasurySigner();
  try {
    const tx = await treasurer.sendTransaction({
      to: address,
      value: SFUEL_DISTRIBUTION_AMOUNT,
    });
    await tx.wait();
    console.log(`[sFUEL] Distributed to ${address}. TX: ${tx.hash}`);
  } catch (error) {
    const funding = fundingFailureForSend(error, 'treasury_topup');
    if (funding) {
      await observeTreasuryBalance();
      throw funding;
    }
    throw error;
  }
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
  await ensureSFuel(wallet.address);

  const contract = new ethers.Contract(contractAddress, abi as ethers.InterfaceAbi, wallet);
  try {
    const tx = await contract[functionName](...args);
    const receipt = await tx.wait();

    if (!receipt) {
      throw new Error(`Transaction sent but no receipt received (hash: ${tx.hash})`);
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
