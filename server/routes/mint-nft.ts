import { Router, Request, Response } from 'express';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { createPublicClient, http, maxUint256, type Address, decodeEventLog, parseUnits } from 'viem';
import {
  GF_TOKEN_ADDRESS,
  GF_TOKEN_ABI,
  MINT_SALE_ADDRESS,
  MINT_SALE_ABI,
  MINT_CONFIG,
  NFT_ABI,
  NFT_CONTRACT_ADDRESS,
  SKALE_NEBULA_TESTNET,
} from '../../shared/contracts';
import { decryptPrivateKey, getUserWalletClient, encryptPrivateKey } from '../wallet-crypto';

const router = Router();

const publicClient = createPublicClient({
  chain: SKALE_NEBULA_TESTNET,
  transport: http(SKALE_NEBULA_TESTNET.rpcUrls.default.http[0]),
});

router.post('/api/mint/approve', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.encryptedPrivateKey) {
      return res.status(400).json({
        error: 'No signing key available',
        code: 'MISSING_PRIVATE_KEY',
        message: 'Your wallet does not have a signing key. Please regenerate your wallet.',
      });
    }

    const walletClient = getUserWalletClient(user.encryptedPrivateKey);

    const hash = await walletClient.writeContract({
      address: GF_TOKEN_ADDRESS as Address,
      abi: GF_TOKEN_ABI,
      functionName: 'approve',
      args: [MINT_SALE_ADDRESS as Address, maxUint256],
    });

    const receipt = await publicClient.waitForTransactionReceipt({
      hash,
      timeout: 60_000,
    });

    if (receipt.status !== 'success') {
      return res.status(400).json({ error: 'Approval transaction reverted', txHash: hash });
    }

    return res.json({ success: true, txHash: hash });
  } catch (error: any) {
    console.error('Server-side approve error:', error);
    return res.status(500).json({ error: error.message || 'Approval failed' });
  }
});

router.post('/api/mint/mint', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { quantity } = req.body;
    if (!quantity || quantity < 1 || quantity > MINT_CONFIG.maxPerTx) {
      return res.status(400).json({
        error: `Quantity must be between 1 and ${MINT_CONFIG.maxPerTx}`,
      });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.encryptedPrivateKey) {
      return res.status(400).json({
        error: 'No signing key available',
        code: 'MISSING_PRIVATE_KEY',
        message: 'Your wallet does not have a signing key. Please regenerate your wallet.',
      });
    }

    const walletClient = getUserWalletClient(user.encryptedPrivateKey);

    const hash = await walletClient.writeContract({
      address: MINT_SALE_ADDRESS as Address,
      abi: MINT_SALE_ABI,
      functionName: 'mint',
      args: [BigInt(quantity)],
    });

    const receipt = await publicClient.waitForTransactionReceipt({
      hash,
      timeout: 60_000,
    });

    if (receipt.status !== 'success') {
      return res.status(400).json({ error: 'Mint transaction reverted', txHash: hash });
    }

    const tokenIds: number[] = [];
    for (const log of receipt.logs) {
      try {
        if (log.address.toLowerCase() !== NFT_CONTRACT_ADDRESS.toLowerCase()) continue;
        const decoded = decodeEventLog({
          abi: [
            {
              anonymous: false,
              inputs: [
                { indexed: true, name: 'from', type: 'address' },
                { indexed: true, name: 'to', type: 'address' },
                { indexed: true, name: 'tokenId', type: 'uint256' },
              ],
              name: 'Transfer',
              type: 'event',
            },
          ],
          data: log.data,
          topics: log.topics,
        });
        if (decoded.eventName === 'Transfer') {
          tokenIds.push(Number((decoded.args as any).tokenId));
        }
      } catch {
        continue;
      }
    }

    return res.json({ success: true, txHash: hash, tokenIds });
  } catch (error: any) {
    console.error('Server-side mint error:', error);
    return res.status(500).json({ error: error.message || 'Mint failed' });
  }
});

router.post('/api/mint/regenerate-wallet', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { ethers } = await import('ethers');
    const wallet = ethers.Wallet.createRandom();
    const newAddress = wallet.address.toLowerCase();

    await db
      .update(users)
      .set({
        walletAddress: newAddress,
        walletChain: 'skale-nebula-testnet',
        walletCreatedAt: new Date(),
        encryptedPrivateKey: encryptPrivateKey(wallet.privateKey),
      })
      .where(eq(users.id, userId));

    console.log(`Wallet regenerated for user ${userId}: ${newAddress}`);

    return res.json({
      success: true,
      address: newAddress,
      message: 'Wallet regenerated successfully',
    });
  } catch (error: any) {
    console.error('Wallet regeneration error:', error);
    return res.status(500).json({ error: error.message || 'Wallet regeneration failed' });
  }
});

export default router;
