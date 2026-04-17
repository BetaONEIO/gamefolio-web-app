import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../db';
import { gfOrders, users } from '@shared/schema';
import { transferGfTokens, getTreasuryAddress } from '../gf-token-service';
import { getOnChainGfBalance } from '../wallet-service';
import { formatUnits } from 'viem';

const MOD_TOM_USER_ID = 3;
const OLD_WALLET = '0x637b57c8c54913ed7ccf673c3517aa1163510470';
const NOTE_PREFIX = 'Manual reissue from treasury (stranded on old wallet';

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  const [user] = await db
    .select({ id: users.id, username: users.username, walletAddress: users.walletAddress })
    .from(users)
    .where(eq(users.id, MOD_TOM_USER_ID));

  if (!user) throw new Error(`User ${MOD_TOM_USER_ID} not found`);
  if (user.username !== 'mod_tom') {
    throw new Error(`Expected user 3 to be mod_tom, found ${user.username}; aborting.`);
  }
  if (!user.walletAddress) {
    throw new Error('mod_tom has no current primary wallet; cannot reissue.');
  }

  const credited = await db
    .select()
    .from(gfOrders)
    .where(
      and(
        eq(gfOrders.userId, MOD_TOM_USER_ID),
        eq(gfOrders.status, 'credited'),
        eq(gfOrders.walletAddress, OLD_WALLET),
      ),
    );

  const totalGft = credited.reduce((s, o) => s + o.gfAmount, 0);

  console.log(`[reissue] mod_tom current wallet: ${user.walletAddress}`);
  console.log(`[reissue] credited-but-undelivered orders on ${OLD_WALLET}: ${credited.length}`);
  console.log(`[reissue] total stranded GFT to reissue: ${totalGft}`);

  if (credited.length === 0 || totalGft <= 0) {
    console.log('[reissue] Nothing to do; no credited orders for the old wallet.');
    return;
  }

  // Defensive sanity check: do not reissue if the old wallet still holds the
  // tokens on-chain (would mean we should sweep instead of reissue).
  const oldOnChain = await getOnChainGfBalance(OLD_WALLET);
  if (oldOnChain > 0n) {
    console.warn(
      `[reissue] WARNING: old wallet still holds ${formatUnits(oldOnChain, 18)} GFT on-chain. ` +
        'Refusing to reissue from treasury — sweep those funds first.',
    );
    return;
  }

  if (dryRun) {
    console.log('[reissue] --dry-run set; no transfer or DB writes performed.');
    return;
  }

  const treasury = await getTreasuryAddress();
  console.log(`[reissue] Sending ${totalGft} GFT from treasury (${treasury}) -> ${user.walletAddress}`);

  const result = await transferGfTokens(user.walletAddress, totalGft);
  if (!result.success || !result.txHash) {
    throw new Error(`Treasury transfer failed: ${result.error || 'unknown error'}`);
  }

  console.log(`[reissue] Treasury transfer confirmed. tx=${result.txHash}`);

  const note = `${NOTE_PREFIX} ${OLD_WALLET}); reissued ${totalGft} GFT to ${user.walletAddress} via tx ${result.txHash}`;

  await db
    .update(gfOrders)
    .set({
      status: 'delivered',
      txHash: result.txHash,
      errorReason: note,
      updatedAt: new Date(),
    })
    .where(
      inArray(
        gfOrders.id,
        credited.map((o) => o.id),
      ),
    );

  console.log(`[reissue] Marked ${credited.length} orders delivered with audit note.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('[reissue] FAILED:', e);
    process.exit(1);
  });
