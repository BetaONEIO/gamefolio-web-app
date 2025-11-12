import { createPublicClient, createWalletClient, http, parseUnits, formatUnits, Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { GF_TOKEN_ADDRESS, GF_TOKEN_ABI, SKALE_NEBULA_TESTNET } from '../shared/contracts';

const publicClient = createPublicClient({
  chain: SKALE_NEBULA_TESTNET,
  transport: http(),
});

export async function getTokenBalance(walletAddress: string): Promise<string> {
  try {
    const balance = await publicClient.readContract({
      address: GF_TOKEN_ADDRESS,
      abi: GF_TOKEN_ABI,
      functionName: 'balanceOf',
      args: [walletAddress as Address],
    });

    return formatUnits(balance as bigint, 18);
  } catch (error) {
    console.error('Error fetching token balance:', error);
    throw error;
  }
}

export async function getTokenInfo() {
  try {
    const [name, symbol, decimals, totalSupply] = await Promise.all([
      publicClient.readContract({
        address: GF_TOKEN_ADDRESS,
        abi: GF_TOKEN_ABI,
        functionName: 'name',
      }),
      publicClient.readContract({
        address: GF_TOKEN_ADDRESS,
        abi: GF_TOKEN_ABI,
        functionName: 'symbol',
      }),
      publicClient.readContract({
        address: GF_TOKEN_ADDRESS,
        abi: GF_TOKEN_ABI,
        functionName: 'decimals',
      }),
      publicClient.readContract({
        address: GF_TOKEN_ADDRESS,
        abi: GF_TOKEN_ABI,
        functionName: 'totalSupply',
      }),
    ]);

    return {
      name: name as string,
      symbol: symbol as string,
      decimals: decimals as number,
      totalSupply: formatUnits(totalSupply as bigint, decimals as number),
      contractAddress: GF_TOKEN_ADDRESS,
    };
  } catch (error) {
    console.error('Error fetching token info:', error);
    throw error;
  }
}

export async function mintTokens(toAddress: string, amount: string, adminPrivateKey: string): Promise<string> {
  try {
    const account = privateKeyToAccount(adminPrivateKey as `0x${string}`);
    
    const walletClient = createWalletClient({
      account,
      chain: SKALE_NEBULA_TESTNET,
      transport: http(),
    });

    const amountInWei = parseUnits(amount, 18);

    const hash = await walletClient.writeContract({
      address: GF_TOKEN_ADDRESS,
      abi: GF_TOKEN_ABI,
      functionName: 'mint',
      args: [toAddress as Address, amountInWei],
    });

    await publicClient.waitForTransactionReceipt({ hash });
    
    return hash;
  } catch (error) {
    console.error('Error minting tokens:', error);
    throw error;
  }
}

export async function transferTokens(
  fromPrivateKey: string,
  toAddress: string,
  amount: string
): Promise<string> {
  try {
    const account = privateKeyToAccount(fromPrivateKey as `0x${string}`);
    
    const walletClient = createWalletClient({
      account,
      chain: SKALE_NEBULA_TESTNET,
      transport: http(),
    });

    const amountInWei = parseUnits(amount, 18);

    const hash = await walletClient.writeContract({
      address: GF_TOKEN_ADDRESS,
      abi: GF_TOKEN_ABI,
      functionName: 'transfer',
      args: [toAddress as Address, amountInWei],
    });

    await publicClient.waitForTransactionReceipt({ hash });
    
    return hash;
  } catch (error) {
    console.error('Error transferring tokens:', error);
    throw error;
  }
}
