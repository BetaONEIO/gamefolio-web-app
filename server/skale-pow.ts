import { createPublicClient, createWalletClient, http, encodeFunctionData, getAddress, type Address, type Abi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { SKALE_BASE_MAINNET } from '../shared/contracts';

const RPC_URL = SKALE_BASE_MAINNET.rpcUrls.default.http[0];

const publicClient = createPublicClient({
  chain: SKALE_BASE_MAINNET,
  transport: http(RPC_URL),
});

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
