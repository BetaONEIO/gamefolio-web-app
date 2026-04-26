import { Router, Request, Response } from 'express';
import { db } from '../db';
import { users } from '@shared/schema';
import { isNotNull } from 'drizzle-orm';
import { adminMiddleware } from '../middleware/admin';
import { getAddressFromEncryptedKey } from '../wallet-crypto';

const router = Router();

router.get('/api/admin/wallet-integrity-audit', adminMiddleware, async (_req: Request, res: Response) => {
  try {
    const rows = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        walletAddress: users.walletAddress,
        encryptedPrivateKey: users.encryptedPrivateKey,
      })
      .from(users)
      .where(isNotNull(users.encryptedPrivateKey));

    const mismatches: Array<{
      id: number;
      username: string | null;
      email: string | null;
      storedWalletAddress: string | null;
      derivedAddress: string | null;
      reason: string;
    }> = [];

    let checked = 0;
    let matched = 0;
    let decryptFailed = 0;

    for (const r of rows) {
      checked++;
      if (!r.encryptedPrivateKey || !r.walletAddress) {
        mismatches.push({
          id: r.id,
          username: r.username,
          email: r.email,
          storedWalletAddress: r.walletAddress,
          derivedAddress: null,
          reason: 'MISSING_FIELD',
        });
        continue;
      }
      try {
        const derived = getAddressFromEncryptedKey(r.encryptedPrivateKey);
        if (derived.toLowerCase() === r.walletAddress.toLowerCase()) {
          matched++;
        } else {
          mismatches.push({
            id: r.id,
            username: r.username,
            email: r.email,
            storedWalletAddress: r.walletAddress,
            derivedAddress: derived,
            reason: 'KEY_WALLET_MISMATCH',
          });
        }
      } catch (err: any) {
        decryptFailed++;
        mismatches.push({
          id: r.id,
          username: r.username,
          email: r.email,
          storedWalletAddress: r.walletAddress,
          derivedAddress: null,
          reason: `DECRYPT_FAILED: ${err?.message || 'unknown'}`,
        });
      }
    }

    return res.json({
      summary: {
        totalWithKey: checked,
        matched,
        mismatched: mismatches.length,
        decryptFailed,
      },
      mismatches,
    });
  } catch (error: any) {
    console.error('[WalletAudit] Audit error:', error);
    return res.status(500).json({ error: error.message || 'Audit failed' });
  }
});

export default router;
