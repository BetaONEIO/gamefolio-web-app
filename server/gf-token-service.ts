import { createPublicClient, createWalletClient, encodeFunctionData, http, keccak256, parseUnits, formatUnits, type Address, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { GF_TOKEN_ADDRESS, GF_TOKEN_ABI, SKALE_BASE_MAINNET } from '../shared/contracts';

const GF_TOKEN_DECIMALS = 18;

const publicClient = createPublicClient({
  chain: SKALE_BASE_MAINNET,
  transport: http(SKALE_BASE_MAINNET.rpcUrls.default.http[0]),
});

function getTreasuryPrivateKey(): string {
  const privateKey = process.env.TREASURY_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('TREASURY_PRIVATE_KEY not configured');
  }
  return privateKey;
}

function getTreasuryAccount() {
  const privateKey = getTreasuryPrivateKey();
  const formattedKey = privateKey.startsWith('0x') ? privateKey as `0x${string}` : `0x${privateKey}` as `0x${string}`;
  return privateKeyToAccount(formattedKey);
}

export async function getTreasuryAddress(): Promise<string> {
  const account = getTreasuryAccount();
  return account.address;
}

export async function getTreasuryBalance(): Promise<string> {
  const account = getTreasuryAccount();
  const balance = await publicClient.readContract({
    address: GF_TOKEN_ADDRESS,
    abi: GF_TOKEN_ABI,
    functionName: 'balanceOf',
    args: [account.address],
  }) as bigint;
  return formatUnits(balance, GF_TOKEN_DECIMALS);
}

export interface TransferResult {
  success: boolean;
  txHash?: string;
  signedTransaction?: string;
  error?: string;
  retryable?: boolean;
}

let transferQueue: Promise<void> = Promise.resolve();

async function executeGfTokenTransfer(
  toAddress: string,
  amount: number,
  options?: { onPrepared?: (txHash: string, signedTransaction: string) => Promise<void> },
): Promise<TransferResult> {
  let submittedHash: string | undefined;
  let signedTransaction: Hex | undefined;
  try {
    if (!toAddress || !toAddress.startsWith('0x')) {
      return { success: false, error: 'Invalid recipient wallet address', retryable: false };
    }

    const amountInWei = parseUnits(amount.toString(), GF_TOKEN_DECIMALS);
    const account = getTreasuryAccount();

    const treasuryBalance = await publicClient.readContract({
      address: GF_TOKEN_ADDRESS,
      abi: GF_TOKEN_ABI,
      functionName: 'balanceOf',
      args: [account.address],
    }) as bigint;

    if (treasuryBalance < amountInWei) {
      return {
        success: false,
        error: `Insufficient treasury balance. Required: ${amount}, Available: ${formatUnits(treasuryBalance, GF_TOKEN_DECIMALS)}`,
        retryable: true,
      };
    }

    console.log(`[Treasury] Sending ${amount} GFT to ${toAddress} on SKALE Base Mainnet...`);

    const walletClient = createWalletClient({
      account,
      chain: SKALE_BASE_MAINNET,
      transport: http(SKALE_BASE_MAINNET.rpcUrls.default.http[0]),
    });

    const gasPrice = await publicClient.getGasPrice();

    const data = encodeFunctionData({
      abi: GF_TOKEN_ABI,
      functionName: 'transfer',
      args: [toAddress as Address, amountInWei],
    });
    const request = await walletClient.prepareTransactionRequest({
      account,
      to: GF_TOKEN_ADDRESS as Address,
      data,
      gasPrice,
    });
    signedTransaction = await walletClient.signTransaction(request);
    submittedHash = keccak256(signedTransaction);
    await options?.onPrepared?.(submittedHash, signedTransaction);
    const hash = await walletClient.sendRawTransaction({ serializedTransaction: signedTransaction });

    const receipt = await publicClient.waitForTransactionReceipt({
      hash,
      timeout: 60_000,
    });

    if (receipt.status === 'success') {
      console.log(`[Treasury] Transfer confirmed. TX: ${hash}`);
      return { success: true, txHash: hash, signedTransaction };
    } else {
      return { success: false, txHash: hash, signedTransaction, error: 'Transaction reverted', retryable: true };
    }
  } catch (error: any) {
    console.error('[Treasury] GF Token transfer error:', error);
    return {
      success: false,
      txHash: submittedHash,
      signedTransaction,
      error: error.message || 'Unknown transfer error',
      // Once a hash exists, the transfer may still have landed even if
      // confirmation timed out, so it must be manually reconciled.
      retryable: !submittedHash,
    };
  }
}

export function transferGfTokens(
  toAddress: string,
  amount: number,
  options?: { onPrepared?: (txHash: string, signedTransaction: string) => Promise<void> },
): Promise<TransferResult> {
  const result = transferQueue.then(() => executeGfTokenTransfer(toAddress, amount, options));
  transferQueue = result.then(() => undefined, () => undefined);
  return result;
}

export async function rebroadcastSignedGfTransfer(signedTransaction: string): Promise<string> {
  return publicClient.sendRawTransaction({ serializedTransaction: signedTransaction as Hex });
}

export async function getGfTransferReceiptStatus(
  txHash: string,
): Promise<'success' | 'reverted' | 'pending'> {
  try {
    const receipt = await publicClient.getTransactionReceipt({
      hash: txHash as `0x${string}`,
    });
    return receipt.status === 'success' ? 'success' : 'reverted';
  } catch (error: any) {
    const message = String(error?.shortMessage || error?.message || '');
    if (message.includes('could not be found') || message.includes('not found')) {
      return 'pending';
    }
    throw error;
  }
}
