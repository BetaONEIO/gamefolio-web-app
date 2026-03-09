import { createPublicClient, createWalletClient, http, parseEther, type Address, type Abi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { SKALE_BASE_MAINNET } from '../shared/contracts';

const RPC_URL = SKALE_BASE_MAINNET.rpcUrls.default.http[0];

const SFUEL_THRESHOLD = parseEther('0.01');
const SFUEL_DISTRIBUTION_AMOUNT = parseEther('0.1');

const publicClient = createPublicClient({
  chain: SKALE_BASE_MAINNET,
  transport: http(RPC_URL),
});

function getTreasuryWalletClient() {
  const privateKey = process.env.TREASURY_PRIVATE_KEY;
  if (!privateKey) throw new Error('TREASURY_PRIVATE_KEY not configured');
  const formattedKey = privateKey.startsWith('0x') ? privateKey as `0x${string}` : `0x${privateKey}` as `0x${string}`;
  const account = privateKeyToAccount(formattedKey);
  return createWalletClient({
    account,
    chain: SKALE_BASE_MAINNET,
    transport: http(RPC_URL),
  });
}

async function ensureSFuel(address: Address): Promise<void> {
  const balance = await publicClient.getBalance({ address });
  if (balance >= SFUEL_THRESHOLD) return;

  console.log(`[sFUEL] Wallet ${address} has ${balance} sFUEL — distributing from treasury...`);
  const treasuryClient = getTreasuryWalletClient();
  const gasPrice = await publicClient.getGasPrice();
  const hash = await treasuryClient.sendTransaction({
    to: address,
    value: SFUEL_DISTRIBUTION_AMOUNT,
    gasPrice,
  });
  await publicClient.waitForTransactionReceipt({ hash, timeout: 30_000 });
  console.log(`[sFUEL] Distributed to ${address}. TX: ${hash}`);
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
  const { decryptPrivateKey } = await import('./wallet-crypto');

  const privateKey = decryptPrivateKey(encryptedPrivateKey);
  const formattedKey = privateKey.startsWith('0x')
    ? (privateKey as `0x${string}`)
    : (`0x${privateKey}` as `0x${string}`);
  const account = privateKeyToAccount(formattedKey);

  await ensureSFuel(account.address);

  const walletClient = createWalletClient({
    account,
    chain: SKALE_BASE_MAINNET,
    transport: http(RPC_URL),
  });

  const gasPrice = await publicClient.getGasPrice();

  const hash = await walletClient.writeContract({
    address: contractAddress,
    abi: abi as Abi,
    functionName,
    args: args as unknown[],
    gasPrice,
  });

  return hash;
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
  const formattedKey = privateKeyRaw.startsWith('0x')
    ? (privateKeyRaw as `0x${string}`)
    : (`0x${privateKeyRaw}` as `0x${string}`);
  const account = privateKeyToAccount(formattedKey);

  await ensureSFuel(account.address);

  const walletClient = createWalletClient({
    account,
    chain: SKALE_BASE_MAINNET,
    transport: http(RPC_URL),
  });

  const gasPrice = await publicClient.getGasPrice();

  const hash = await walletClient.writeContract({
    address: contractAddress,
    abi: abi as Abi,
    functionName,
    args: args as unknown[],
    gasPrice,
  });

  return hash;
}

export { publicClient };
