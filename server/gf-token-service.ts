import { createPublicClient, createWalletClient, http, parseUnits, formatUnits, type Address } from 'viem';
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
  error?: string;
}

export async function transferGfTokens(
  toAddress: string,
  amount: number
): Promise<TransferResult> {
  try {
    if (!toAddress || !toAddress.startsWith('0x')) {
      return { success: false, error: 'Invalid recipient wallet address' };
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
      };
    }

    console.log(`[Treasury] Sending ${amount} GFT to ${toAddress} on SKALE Base Mainnet...`);

    const walletClient = createWalletClient({
      account,
      chain: SKALE_BASE_MAINNET,
      transport: http(SKALE_BASE_MAINNET.rpcUrls.default.http[0]),
    });

    const gasPrice = await publicClient.getGasPrice();

    const hash = await walletClient.writeContract({
      address: GF_TOKEN_ADDRESS as Address,
      abi: GF_TOKEN_ABI,
      functionName: 'transfer',
      args: [toAddress as Address, amountInWei],
      gasPrice,
    });

    const receipt = await publicClient.waitForTransactionReceipt({
      hash,
      timeout: 60_000,
    });

    if (receipt.status === 'success') {
      console.log(`[Treasury] Transfer confirmed. TX: ${hash}`);
      return { success: true, txHash: hash };
    } else {
      return { success: false, txHash: hash, error: 'Transaction reverted' };
    }
  } catch (error: any) {
    console.error('[Treasury] GF Token transfer error:', error);
    return {
      success: false,
      error: error.message || 'Unknown transfer error',
    };
  }
}
