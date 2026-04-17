import { db } from './db';
import { users, userWallets } from '@shared/schema';
import { and, eq } from 'drizzle-orm';
import { decryptPrivateKey } from './wallet-crypto';
import { writeContractWithPoW, publicClient as skalePublicClient } from './skale-pow';
import {
  createPublicClient,
  http,
  formatUnits,
  type Address,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import {
  GF_TOKEN_ADDRESS,
  GF_TOKEN_ABI,
  SKALE_BASE_MAINNET,
} from '@shared/contracts';

const GF_DECIMALS = 18;
const DEFAULT_CHAIN = 'skale-nebula-testnet';

const publicClient = createPublicClient({
  chain: SKALE_BASE_MAINNET,
  transport: http(),
});

// Throws on RPC failure. Use getOnChainGfBalanceSafe when a fallback to 0 is acceptable.
export async function getOnChainGfBalance(address: string): Promise<bigint> {
  const raw = await publicClient.readContract({
    address: GF_TOKEN_ADDRESS,
    abi: GF_TOKEN_ABI,
    functionName: 'balanceOf',
    args: [address as Address],
  });
  return raw as bigint;
}

export async function getOnChainGfBalanceSafe(address: string): Promise<bigint> {
  try {
    return await getOnChainGfBalance(address);
  } catch (e) {
    console.error('[WalletService] balanceOf failed for', address, e);
    return 0n;
  }
}

export async function ensureWalletBackfilled(userId: number): Promise<void> {
  const existing = await db
    .select({ id: userWallets.id })
    .from(userWallets)
    .where(eq(userWallets.userId, userId))
    .limit(1);
  if (existing.length > 0) return;

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user || !user.walletAddress) return;

  await db
    .insert(userWallets)
    .values({
      userId,
      address: user.walletAddress.toLowerCase(),
      chain: user.walletChain || DEFAULT_CHAIN,
      isPrimary: true,
      isCustodial: !!user.encryptedPrivateKey,
      encryptedPrivateKey: user.encryptedPrivateKey ?? null,
      createdAt: user.walletCreatedAt ?? new Date(),
    })
    .onConflictDoNothing();
}

export interface AggregatedBalance {
  total: string;
  totalRaw: string;
  primaryAddress: string | null;
  perWallet: Array<{
    address: string;
    balance: string;
    isPrimary: boolean;
    isRetired: boolean;
    isCustodial: boolean;
  }>;
}

export async function getAggregatedGfBalance(
  userId: number,
): Promise<AggregatedBalance> {
  await ensureWalletBackfilled(userId);
  const wallets = await db
    .select()
    .from(userWallets)
    .where(eq(userWallets.userId, userId));

  if (wallets.length === 0) {
    return { total: '0', totalRaw: '0', primaryAddress: null, perWallet: [] };
  }

  const balances = await Promise.all(
    wallets.map(async (w) => {
      const raw = await getOnChainGfBalanceSafe(w.address);
      return { wallet: w, raw };
    }),
  );

  const totalRaw = balances.reduce((s, b) => s + b.raw, 0n);
  const primary = wallets.find((w) => w.isPrimary);

  return {
    total: formatUnits(totalRaw, GF_DECIMALS),
    totalRaw: totalRaw.toString(),
    primaryAddress: primary?.address ?? null,
    perWallet: balances.map((b) => ({
      address: b.wallet.address,
      balance: formatUnits(b.raw, GF_DECIMALS),
      isPrimary: b.wallet.isPrimary,
      isRetired: !!b.wallet.retiredAt,
      isCustodial: b.wallet.isCustodial,
    })),
  };
}

export interface SetPrimaryWalletInput {
  userId: number;
  newAddress: string;
  isCustodial: boolean;
  newEncryptedPrivateKey?: string | null;
  chain?: string;
}

export interface SetPrimaryWalletResult {
  success: boolean;
  walletAddress?: string;
  isExisting?: boolean;
  sweepTxHash?: string;
  sweepAmount?: string;
  error?: string;
  needsManualMove?: boolean;
  oldWalletAddress?: string;
  oldWalletBalance?: string;
}

async function sweepCustodialBalance(
  fromEncryptedKey: string,
  fromAddress: string,
  toAddress: string,
  amount: bigint,
): Promise<string> {
  // Verify the stored key actually controls the wallet we're sweeping from.
  const privateKey = decryptPrivateKey(fromEncryptedKey);
  const formattedKey = (privateKey.startsWith('0x')
    ? privateKey
    : `0x${privateKey}`) as `0x${string}`;
  const account = privateKeyToAccount(formattedKey);
  if (account.address.toLowerCase() !== fromAddress.toLowerCase()) {
    throw new Error(
      'Stored private key does not match wallet address; refusing to sweep.',
    );
  }

  // writeContractWithPoW handles sFUEL gas top-up from treasury before
  // submitting the transfer.
  const hash = await writeContractWithPoW({
    encryptedPrivateKey: fromEncryptedKey,
    contractAddress: GF_TOKEN_ADDRESS as Address,
    abi: GF_TOKEN_ABI,
    functionName: 'transfer',
    args: [toAddress as Address, amount],
  });

  const receipt = await skalePublicClient.waitForTransactionReceipt({
    hash,
    timeout: 90_000,
  });
  if (receipt.status !== 'success') {
    throw new Error('Sweep transaction reverted on-chain');
  }
  return hash;
}

export async function setPrimaryWallet(
  input: SetPrimaryWalletInput,
): Promise<SetPrimaryWalletResult> {
  const {
    userId,
    isCustodial,
    newEncryptedPrivateKey,
    chain = DEFAULT_CHAIN,
  } = input;
  const newAddress = input.newAddress.toLowerCase();

  await ensureWalletBackfilled(userId);

  const [existingPrimary] = await db
    .select()
    .from(userWallets)
    .where(
      and(eq(userWallets.userId, userId), eq(userWallets.isPrimary, true)),
    );

  if (
    existingPrimary &&
    existingPrimary.address.toLowerCase() === newAddress
  ) {
    return {
      success: true,
      walletAddress: newAddress,
      isExisting: true,
    };
  }

  let sweepTxHash: string | undefined;
  let sweepAmount: string | undefined;

  if (existingPrimary) {
    let oldBalance: bigint;
    try {
      // Fail closed: if we can't read the balance, do NOT switch — otherwise
      // we could leave funds stranded on a wallet we believed was empty.
      oldBalance = await getOnChainGfBalance(existingPrimary.address);
    } catch (e: any) {
      console.error('[WalletService] Could not read old wallet balance:', e);
      return {
        success: false,
        error: 'Could not verify the balance on your current wallet right now. Please try again in a moment.',
        oldWalletAddress: existingPrimary.address,
      };
    }

    if (oldBalance > 0n) {
      if (existingPrimary.isCustodial && existingPrimary.encryptedPrivateKey) {
        try {
          sweepTxHash = await sweepCustodialBalance(
            existingPrimary.encryptedPrivateKey,
            existingPrimary.address,
            newAddress,
            oldBalance,
          );
          sweepAmount = formatUnits(oldBalance, GF_DECIMALS);
          console.log(
            `[WalletService] Swept ${sweepAmount} GFT from ${existingPrimary.address} -> ${newAddress} (tx ${sweepTxHash})`,
          );
        } catch (e: any) {
          console.error('[WalletService] Auto-sweep failed:', e);
          return {
            success: false,
            error: `Could not move existing GFT from your old wallet: ${e.message || 'unknown error'}. Wallet was not switched.`,
            oldWalletAddress: existingPrimary.address,
            oldWalletBalance: formatUnits(oldBalance, GF_DECIMALS),
          };
        }
      } else {
        return {
          success: false,
          needsManualMove: true,
          oldWalletAddress: existingPrimary.address,
          oldWalletBalance: formatUnits(oldBalance, GF_DECIMALS),
          error: `Your currently linked wallet still holds ${formatUnits(
            oldBalance,
            GF_DECIMALS,
          )} GFT. Send those tokens to ${newAddress} from your wallet first, then try linking again.`,
        };
      }
    }
  }

  await db.transaction(async (tx) => {
    if (existingPrimary) {
      await tx
        .update(userWallets)
        .set({
          isPrimary: false,
          retiredAt: new Date(),
          retiredSweepTxHash: sweepTxHash ?? null,
        })
        .where(eq(userWallets.id, existingPrimary.id));
    }

    const [existingForAddress] = await tx
      .select()
      .from(userWallets)
      .where(
        and(
          eq(userWallets.userId, userId),
          eq(userWallets.address, newAddress),
        ),
      );

    if (existingForAddress) {
      await tx
        .update(userWallets)
        .set({
          isPrimary: true,
          retiredAt: null,
          retiredSweepTxHash: null,
          isCustodial,
          encryptedPrivateKey:
            newEncryptedPrivateKey ?? existingForAddress.encryptedPrivateKey,
          chain,
        })
        .where(eq(userWallets.id, existingForAddress.id));
    } else {
      await tx.insert(userWallets).values({
        userId,
        address: newAddress,
        chain,
        isPrimary: true,
        isCustodial,
        encryptedPrivateKey: newEncryptedPrivateKey ?? null,
      });
    }

    const userUpdate: Record<string, unknown> = {
      walletAddress: newAddress,
      walletChain: chain,
    };
    if (isCustodial) {
      if (newEncryptedPrivateKey) {
        userUpdate.encryptedPrivateKey = newEncryptedPrivateKey;
      }
    } else {
      userUpdate.encryptedPrivateKey = null;
    }
    if (!existingPrimary) {
      userUpdate.walletCreatedAt = new Date();
    }

    await tx.update(users).set(userUpdate).where(eq(users.id, userId));
  });

  return {
    success: true,
    walletAddress: newAddress,
    sweepTxHash,
    sweepAmount,
    oldWalletAddress: existingPrimary?.address,
  };
}

export async function listUserWallets(userId: number) {
  await ensureWalletBackfilled(userId);
  return db
    .select()
    .from(userWallets)
    .where(eq(userWallets.userId, userId));
}
