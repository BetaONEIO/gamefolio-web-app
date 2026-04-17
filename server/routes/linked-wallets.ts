import { Router, Request, Response } from 'express';
import { randomBytes } from 'crypto';
import { type Address } from 'viem';
import { db } from '../db';
import { linkedWallets } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { publicClient } from '../skale-pow';

const router = Router();

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const NONCE_TTL_MS = 5 * 60 * 1000;

interface NonceEntry {
  nonce: string;
  userId: number;
  address: string;
  issuedAt: string;
  expiresAt: number;
}

const nonceStore = new Map<string, NonceEntry>();

function pruneNonces() {
  const now = Date.now();
  for (const [key, entry] of nonceStore.entries()) {
    if (entry.expiresAt < now) nonceStore.delete(key);
  }
}

function nonceKey(userId: number, address: string): string {
  return `${userId}:${address.toLowerCase()}`;
}

export function buildLinkMessage(opts: { address: string; nonce: string; issuedAt: string }): string {
  return [
    'Gamefolio: verify wallet ownership',
    '',
    `Address: ${opts.address}`,
    `Nonce: ${opts.nonce}`,
    `Issued At: ${opts.issuedAt}`,
    '',
    'Signing this message proves you control this wallet so it can be linked to your Gamefolio account. It does not authorize any transaction or transfer.',
  ].join('\n');
}

router.get('/api/wallet/linked', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const rows = await db
      .select({ walletAddress: linkedWallets.walletAddress, verifiedAt: linkedWallets.verifiedAt })
      .from(linkedWallets)
      .where(eq(linkedWallets.userId, userId));

    return res.json({ wallets: rows });
  } catch (err: any) {
    console.error('linked-wallets list error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to load linked wallets' });
  }
});

router.post('/api/wallet/link/nonce', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const rawAddress = (req.body?.address || '').toString();
    if (!ADDRESS_RE.test(rawAddress)) {
      return res.status(400).json({ error: 'Valid wallet address required' });
    }
    const address = rawAddress.toLowerCase();

    pruneNonces();
    const nonce = randomBytes(16).toString('hex');
    const issuedAt = new Date().toISOString();
    const expiresAt = Date.now() + NONCE_TTL_MS;

    nonceStore.set(nonceKey(userId, address), { nonce, userId, address, issuedAt, expiresAt });

    const message = buildLinkMessage({ address, nonce, issuedAt });
    // Message is returned for the wallet to display, but the server reconstructs
    // and verifies against its own canonical version on /verify — never trust the
    // client to echo back a different message.
    return res.json({ nonce, message, issuedAt, expiresInSeconds: Math.floor(NONCE_TTL_MS / 1000) });
  } catch (err: any) {
    console.error('linked-wallets nonce error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to issue nonce' });
  }
});

router.post('/api/wallet/link/verify', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const rawAddress = (req.body?.address || '').toString();
    const signature = (req.body?.signature || '').toString();
    const chainId = typeof req.body?.chainId === 'number' ? req.body.chainId : null;

    if (!ADDRESS_RE.test(rawAddress)) {
      return res.status(400).json({ error: 'Valid wallet address required' });
    }
    if (!signature || !signature.startsWith('0x')) {
      return res.status(400).json({ error: 'Signature required' });
    }

    const address = rawAddress.toLowerCase();

    pruneNonces();
    const key = nonceKey(userId, address);
    const entry = nonceStore.get(key);
    if (!entry || entry.expiresAt < Date.now()) {
      return res.status(400).json({ error: 'Verification expired. Please request a new signature.', code: 'NONCE_EXPIRED' });
    }

    // Reconstruct the canonical challenge message server-side from stored
    // nonce/issuedAt — never trust a client-supplied message, even if echoed
    // back. This eliminates ambiguity around message format and prevents an
    // attacker from sneaking in alternate payloads alongside a valid signature.
    const expectedMessage = buildLinkMessage({ address, nonce: entry.nonce, issuedAt: entry.issuedAt });

    let valid = false;
    try {
      // publicClient.verifyMessage handles both EOA signatures and EIP-1271
      // smart-contract wallets (it falls back to an on-chain isValidSignature
      // call when the address has bytecode). Standalone viem verifyMessage
      // would only cover EOAs.
      valid = await publicClient.verifyMessage({
        address: address as Address,
        message: expectedMessage,
        signature: signature as `0x${string}`,
      });
    } catch (verifyErr) {
      console.error('verifyMessage error:', verifyErr);
      valid = false;
    }
    if (!valid) {
      return res.status(400).json({ error: 'Signature did not verify for the provided address.', code: 'BAD_SIGNATURE' });
    }

    // Single-use nonce.
    nonceStore.delete(key);

    await db
      .insert(linkedWallets)
      .values({ userId, walletAddress: address, chainId: chainId ?? null })
      .onConflictDoNothing();

    return res.json({ success: true, walletAddress: address });
  } catch (err: any) {
    console.error('linked-wallets verify error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to verify wallet' });
  }
});

export async function isWalletLinkedToUser(userId: number, address: string): Promise<boolean> {
  const lower = address.toLowerCase();
  const rows = await db
    .select({ id: linkedWallets.id })
    .from(linkedWallets)
    .where(and(eq(linkedWallets.userId, userId), sql`lower(${linkedWallets.walletAddress}) = ${lower}`))
    .limit(1);
  return rows.length > 0;
}

export default router;
