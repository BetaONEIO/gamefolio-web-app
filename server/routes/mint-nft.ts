import { Router, Request, Response } from 'express';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { maxUint256, type Address, decodeEventLog } from 'viem';
import {
  GF_TOKEN_ADDRESS,
  GF_TOKEN_ABI,
  MINT_SALE_ADDRESS,
  MINT_SALE_ABI,
  MINT_CONFIG,
  NFT_ABI,
  NFT_CONTRACT_ADDRESS,
} from '../../shared/contracts';
import { encryptPrivateKey } from '../wallet-crypto';
import { writeContractWithPoW, publicClient } from '../skale-pow';

const router = Router();

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

    const hash = await writeContractWithPoW({
      encryptedPrivateKey: user.encryptedPrivateKey,
      contractAddress: GF_TOKEN_ADDRESS as Address,
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

    const hash = await writeContractWithPoW({
      encryptedPrivateKey: user.encryptedPrivateKey,
      contractAddress: MINT_SALE_ADDRESS as Address,
      abi: MINT_SALE_ABI,
      functionName: 'buy',
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

const IPFS_GATEWAYS = [
  'https://nftstorage.link/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://ipfs.io/ipfs/',
];

function ipfsToHttp(ipfsUri: string, gatewayIndex = 0): string {
  if (!ipfsUri.startsWith('ipfs://')) return ipfsUri;
  const path = ipfsUri.replace('ipfs://', '');
  return `${IPFS_GATEWAYS[gatewayIndex % IPFS_GATEWAYS.length]}${path}`;
}

router.get('/api/nft/metadata/:tokenId', async (req: Request, res: Response) => {
  try {
    const tokenId = parseInt(req.params.tokenId);
    if (isNaN(tokenId) || tokenId < 0) {
      return res.status(400).json({ error: 'Invalid token ID' });
    }

    const tokenURI = await publicClient.readContract({
      address: NFT_CONTRACT_ADDRESS as `0x${string}`,
      abi: NFT_ABI,
      functionName: 'tokenURI',
      args: [BigInt(tokenId)],
    });

    const metadataUrl = ipfsToHttp(tokenURI as string) + '.json';

    let metadata: any = null;
    for (let i = 0; i < IPFS_GATEWAYS.length; i++) {
      try {
        const url = ipfsToHttp(tokenURI as string, i) + '.json';
        const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (response.ok) {
          metadata = await response.json();
          break;
        }
      } catch {
        continue;
      }
    }

    if (!metadata) {
      return res.status(502).json({ error: 'Failed to fetch metadata from IPFS' });
    }

    if (metadata.image) {
      metadata.image = ipfsToHttp(metadata.image);
    }

    return res.json({
      tokenId,
      tokenURI,
      ...metadata,
    });
  } catch (error: any) {
    console.error('NFT metadata fetch error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch metadata' });
  }
});

router.post('/api/nft/metadata/batch', async (req: Request, res: Response) => {
  try {
    const { tokenIds } = req.body;
    if (!Array.isArray(tokenIds) || tokenIds.length === 0 || tokenIds.length > 20) {
      return res.status(400).json({ error: 'Provide 1-20 token IDs' });
    }

    const results = await Promise.allSettled(
      tokenIds.map(async (tokenId: number) => {
        const tokenURI = await publicClient.readContract({
          address: NFT_CONTRACT_ADDRESS as `0x${string}`,
          abi: NFT_ABI,
          functionName: 'tokenURI',
          args: [BigInt(tokenId)],
        });

        for (let i = 0; i < IPFS_GATEWAYS.length; i++) {
          try {
            const url = ipfsToHttp(tokenURI as string, i) + '.json';
            const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
            if (response.ok) {
              const metadata = await response.json();
              if (metadata.image) {
                metadata.image = ipfsToHttp(metadata.image);
              }
              return { tokenId, ...metadata };
            }
          } catch {
            continue;
          }
        }
        return { tokenId, name: `Gamefolio Genesis #${tokenId}`, image: null };
      })
    );

    const nfts = results.map((r) =>
      r.status === 'fulfilled' ? r.value : { tokenId: null, error: 'Failed' }
    );

    return res.json({ nfts });
  } catch (error: any) {
    console.error('Batch metadata fetch error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch metadata' });
  }
});

router.get('/api/nfts/owned', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const walletAddress = user.walletAddress;
    if (!walletAddress) {
      return res.json({ nfts: [], count: 0 });
    }

    const totalSupply = await publicClient.readContract({
      address: NFT_CONTRACT_ADDRESS as `0x${string}`,
      abi: NFT_ABI,
      functionName: 'totalSupply',
    });

    const total = Number(totalSupply);
    if (total === 0) {
      return res.json({ nfts: [], count: 0 });
    }

    const ownedTokenIds: number[] = [];
    const batchSize = 50;
    for (let start = 1; start <= total; start += batchSize) {
      const end = Math.min(start + batchSize - 1, total);
      const calls = [];
      for (let tokenId = start; tokenId <= end; tokenId++) {
        calls.push(
          publicClient.readContract({
            address: NFT_CONTRACT_ADDRESS as `0x${string}`,
            abi: NFT_ABI,
            functionName: 'ownerOf',
            args: [BigInt(tokenId)],
          }).then((owner) => ({ tokenId, owner: (owner as string).toLowerCase() }))
            .catch(() => ({ tokenId, owner: '' }))
        );
      }
      const results = await Promise.all(calls);
      for (const r of results) {
        if (r.owner === walletAddress.toLowerCase()) {
          ownedTokenIds.push(r.tokenId);
        }
      }
    }

    if (ownedTokenIds.length === 0) {
      return res.json({ nfts: [], count: 0 });
    }

    const metadataResults = await Promise.allSettled(
      ownedTokenIds.slice(0, 50).map(async (tokenId) => {
        const tokenURI = await publicClient.readContract({
          address: NFT_CONTRACT_ADDRESS as `0x${string}`,
          abi: NFT_ABI,
          functionName: 'tokenURI',
          args: [BigInt(tokenId)],
        });

        for (let i = 0; i < IPFS_GATEWAYS.length; i++) {
          try {
            const url = ipfsToHttp(tokenURI as string, i) + '.json';
            const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
            if (response.ok) {
              const metadata = await response.json();
              if (metadata.image) {
                metadata.image = ipfsToHttp(metadata.image);
              }
              return { tokenId, ...metadata };
            }
          } catch {
            continue;
          }
        }
        return { tokenId, name: `Gamefolio Genesis #${tokenId}`, image: null };
      })
    );

    const nfts = metadataResults
      .filter((r) => r.status === 'fulfilled')
      .map((r) => (r as PromiseFulfilledResult<any>).value);

    return res.json({ nfts, count: ownedTokenIds.length });
  } catch (error: any) {
    console.error('Owned NFTs fetch error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch owned NFTs' });
  }
});

export default router;
