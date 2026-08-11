import { createPublicClient, http, parseEther, type Address, type Abi } from 'viem';
import { ethers } from 'ethers';
import { SKALE_BASE_MAINNET } from '../shared/contracts';
import { decryptPrivateKey } from './wallet-crypto';

const RPC_URL = SKALE_BASE_MAINNET.rpcUrls.default.http[0];

const SFUEL_THRESHOLD = parseEther('0.01');
const SFUEL_DISTRIBUTION_AMOUNT = parseEther('0.1');

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

async function ensureSFuel(address: string): Promise<void> {
  const balance = await publicClient.getBalance({ address: address as Address });
  if (balance >= SFUEL_THRESHOLD) return;

  console.log(`[sFUEL] Wallet ${address} has ${balance} sFUEL — distributing from treasury...`);
  const treasurer = getTreasurySigner();
  const tx = await treasurer.sendTransaction({
    to: address,
    value: SFUEL_DISTRIBUTION_AMOUNT,
  });
  await tx.wait();
  console.log(`[sFUEL] Distributed to ${address}. TX: ${tx.hash}`);
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

  await ensureSFuel(wallet.address);

  const contract = new ethers.Contract(contractAddress, abi as ethers.InterfaceAbi, wallet);
  const tx = await contract[functionName](...args);
  const receipt = await tx.wait();

  if (!receipt) {
    throw new Error(`Transaction sent but no receipt received (hash: ${tx.hash})`);
  }

  return receipt.hash as `0x${string}`;
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

  await ensureSFuel(wallet.address);

  const contract = new ethers.Contract(contractAddress, abi as ethers.InterfaceAbi, wallet);
  const tx = await contract[functionName](...args);
  const receipt = await tx.wait();

  if (!receipt) {
    throw new Error(`Transaction sent but no receipt received (hash: ${tx.hash})`);
  }

  return receipt.hash as `0x${string}`;
}
