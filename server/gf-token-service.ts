import { createPublicClient, createWalletClient, http, parseUnits, Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { GF_TOKEN_ADDRESS, GF_TOKEN_ABI, SKALE_NEBULA_TESTNET } from '../shared/contracts';

const GF_TOKEN_DECIMALS = 18;

const publicClient = createPublicClient({
  chain: SKALE_NEBULA_TESTNET,
  transport: http(),
});

function getTreasuryAccount() {
  const privateKey = process.env.TREASURY_WALLET_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('TREASURY_WALLET_PRIVATE_KEY not configured');
  }
  const formattedKey = privateKey.startsWith('0x') ? privateKey as `0x${string}` : `0x${privateKey}` as `0x${string}`;
  return privateKeyToAccount(formattedKey);
}

function getWalletClient() {
  const account = getTreasuryAccount();
  return createWalletClient({
    account,
    chain: SKALE_NEBULA_TESTNET,
    transport: http(),
  });
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
  });
  return (Number(balance) / Math.pow(10, GF_TOKEN_DECIMALS)).toString();
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
    
    const walletClient = getWalletClient();
    const account = getTreasuryAccount();

    const treasuryBalance = await publicClient.readContract({
      address: GF_TOKEN_ADDRESS,
      abi: GF_TOKEN_ABI,
      functionName: 'balanceOf',
      args: [account.address],
    });

    if ((treasuryBalance as bigint) < amountInWei) {
      return { 
        success: false, 
        error: `Insufficient treasury balance. Required: ${amount}, Available: ${Number(treasuryBalance) / Math.pow(10, GF_TOKEN_DECIMALS)}` 
      };
    }

    const hash = await walletClient.writeContract({
      address: GF_TOKEN_ADDRESS,
      abi: GF_TOKEN_ABI,
      functionName: 'transfer',
      args: [toAddress as Address, amountInWei],
      type: 'legacy' as any,
    });

    const receipt = await publicClient.waitForTransactionReceipt({ 
      hash,
      timeout: 60_000,
    });

    if (receipt.status === 'success') {
      return { success: true, txHash: hash };
    } else {
      return { success: false, txHash: hash, error: 'Transaction reverted' };
    }
  } catch (error: any) {
    console.error('GF Token transfer error:', error);
    return { 
      success: false, 
      error: error.message || 'Unknown transfer error' 
    };
  }
}
