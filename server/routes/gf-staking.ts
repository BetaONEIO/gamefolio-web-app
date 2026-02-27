import { Router, Request, Response } from 'express';
import { getStakePosition, getStakingStats, StakingError } from '../gf-staking-service';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { parseUnits, maxUint256, type Address } from 'viem';
import { writeContractWithPoW, publicClient } from '../skale-pow';
import { GF_STAKING_ADDRESS, GF_STAKING_ABI, GF_TOKEN_ADDRESS, GF_TOKEN_ABI } from '../../shared/contracts';

const router = Router();

const GF_DECIMALS = 18;

router.get('/api/staking/position/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const position = await getStakePosition(address);
    
    return res.json({
      staked: position.staked,
      earned: position.earned,
    });
  } catch (error: any) {
    if (error instanceof StakingError) {
      return res.status(400).json({ error: error.message, code: error.code });
    }
    console.error('Get stake position error:', error);
    return res.status(500).json({ error: 'Failed to get stake position' });
  }
});

router.get('/api/staking/stats', async (req: Request, res: Response) => {
  try {
    const stats = await getStakingStats();
    return res.json(stats);
  } catch (error: any) {
    if (error instanceof StakingError) {
      return res.status(400).json({ error: error.message, code: error.code });
    }
    console.error('Get staking stats error:', error);
    return res.status(500).json({ error: 'Failed to get staking stats' });
  }
});

router.post('/api/staking/stake', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { amount } = req.body;
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.walletAddress || !user.encryptedPrivateKey) {
      return res.status(400).json({ error: 'No server-side wallet available', code: 'NO_WALLET' });
    }

    const userAddress = user.walletAddress as Address;
    const amountRaw = parseUnits(String(amount), GF_DECIMALS);

    const onChainBalance = await publicClient.readContract({
      address: GF_TOKEN_ADDRESS as Address,
      abi: GF_TOKEN_ABI,
      functionName: 'balanceOf',
      args: [userAddress],
    }) as bigint;

    if (onChainBalance < amountRaw) {
      const { formatUnits } = await import('viem');
      return res.status(400).json({
        error: `Insufficient on-chain GFT balance. Have: ${formatUnits(onChainBalance, GF_DECIMALS)} GFT, Need: ${amount} GFT`,
        code: 'INSUFFICIENT_BALANCE',
      });
    }

    const allowance = await publicClient.readContract({
      address: GF_TOKEN_ADDRESS as Address,
      abi: GF_TOKEN_ABI,
      functionName: 'allowance',
      args: [userAddress, GF_STAKING_ADDRESS as Address],
    }) as bigint;

    if (allowance < amountRaw) {
      console.log(`[Staking] Approving staking contract for user ${userId}`);
      const approveHash = await writeContractWithPoW({
        encryptedPrivateKey: user.encryptedPrivateKey,
        contractAddress: GF_TOKEN_ADDRESS as Address,
        abi: GF_TOKEN_ABI,
        functionName: 'approve',
        args: [GF_STAKING_ADDRESS as Address, maxUint256],
      });
      const approveReceipt = await publicClient.waitForTransactionReceipt({ hash: approveHash, timeout: 60_000 });
      if (approveReceipt.status !== 'success') {
        return res.status(400).json({ error: 'Token approval failed', txHash: approveHash });
      }
      console.log(`[Staking] Approved. TX: ${approveHash}`);
    }

    console.log(`[Staking] Staking ${amount} GFT for user ${userId}`);
    const stakeHash = await writeContractWithPoW({
      encryptedPrivateKey: user.encryptedPrivateKey,
      contractAddress: GF_STAKING_ADDRESS as Address,
      abi: GF_STAKING_ABI,
      functionName: 'stake',
      args: [amountRaw],
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash: stakeHash, timeout: 60_000 });
    if (receipt.status !== 'success') {
      return res.status(400).json({ error: 'Stake transaction reverted', txHash: stakeHash });
    }

    console.log(`[Staking] Staked ${amount} GFT for user ${userId}. TX: ${stakeHash}`);
    return res.json({ success: true, txHash: stakeHash, amount });
  } catch (error: any) {
    console.error('[Staking] Stake error:', error);
    return res.status(500).json({ error: error.message || 'Stake failed' });
  }
});

router.post('/api/staking/unstake', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { amount } = req.body;
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.walletAddress || !user.encryptedPrivateKey) {
      return res.status(400).json({ error: 'No server-side wallet available', code: 'NO_WALLET' });
    }

    const amountRaw = parseUnits(String(amount), GF_DECIMALS);

    console.log(`[Staking] Unstaking ${amount} GFT for user ${userId}`);
    const txHash = await writeContractWithPoW({
      encryptedPrivateKey: user.encryptedPrivateKey,
      contractAddress: GF_STAKING_ADDRESS as Address,
      abi: GF_STAKING_ABI,
      functionName: 'unstake',
      args: [amountRaw],
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 60_000 });
    if (receipt.status !== 'success') {
      return res.status(400).json({ error: 'Unstake transaction reverted', txHash });
    }

    console.log(`[Staking] Unstaked ${amount} GFT for user ${userId}. TX: ${txHash}`);
    return res.json({ success: true, txHash, amount });
  } catch (error: any) {
    console.error('[Staking] Unstake error:', error);
    return res.status(500).json({ error: error.message || 'Unstake failed' });
  }
});

router.post('/api/staking/claim', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.walletAddress || !user.encryptedPrivateKey) {
      return res.status(400).json({ error: 'No server-side wallet available', code: 'NO_WALLET' });
    }

    console.log(`[Staking] Claiming rewards for user ${userId}`);
    const txHash = await writeContractWithPoW({
      encryptedPrivateKey: user.encryptedPrivateKey,
      contractAddress: GF_STAKING_ADDRESS as Address,
      abi: GF_STAKING_ABI,
      functionName: 'claim',
      args: [],
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 60_000 });
    if (receipt.status !== 'success') {
      return res.status(400).json({ error: 'Claim transaction reverted', txHash });
    }

    console.log(`[Staking] Claimed rewards for user ${userId}. TX: ${txHash}`);
    return res.json({ success: true, txHash });
  } catch (error: any) {
    console.error('[Staking] Claim error:', error);
    return res.status(500).json({ error: error.message || 'Claim failed' });
  }
});

export default router;
