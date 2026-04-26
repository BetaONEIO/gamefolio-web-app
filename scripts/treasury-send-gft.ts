import 'dotenv/config';
import { createPublicClient, http, parseUnits, formatUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { writeContractWithPoWFromRawKey } from '../server/skale-pow';
import { SKALE_BASE_MAINNET, GF_TOKEN_ADDRESS, GF_TOKEN_ABI } from '../shared/contracts';

async function main() {
  const TO = process.argv[2];
  const AMOUNT = process.argv[3];
  if (!TO || !AMOUNT) {
    console.error('Usage: npx tsx scripts/treasury-send-gft.ts <to> <amountInGft>');
    process.exit(1);
  }

  const pk = process.env.TREASURY_PRIVATE_KEY;
  if (!pk) throw new Error('TREASURY_PRIVATE_KEY missing');
  const formatted = (pk.startsWith('0x') ? pk : '0x' + pk) as `0x${string}`;
  const treasury = privateKeyToAccount(formatted);

  const client = createPublicClient({
    chain: SKALE_BASE_MAINNET,
    transport: http(SKALE_BASE_MAINNET.rpcUrls.default.http[0]),
  });

  const amountRaw = parseUnits(AMOUNT, 18);

  const balBefore = (await client.readContract({
    address: GF_TOKEN_ADDRESS as `0x${string}`,
    abi: GF_TOKEN_ABI,
    functionName: 'balanceOf',
    args: [TO as `0x${string}`],
  })) as bigint;

  console.log(`Treasury: ${treasury.address}`);
  console.log(`Recipient: ${TO}`);
  console.log(`Recipient GFT before: ${formatUnits(balBefore, 18)}`);
  console.log(`Sending: ${AMOUNT} GFT (${amountRaw} wei)`);

  const hash = await writeContractWithPoWFromRawKey({
    privateKeyRaw: formatted,
    contractAddress: GF_TOKEN_ADDRESS as `0x${string}`,
    abi: GF_TOKEN_ABI,
    functionName: 'transfer',
    args: [TO as `0x${string}`, amountRaw],
  });

  console.log(`TX broadcast: ${hash}`);

  const receipt = await client.waitForTransactionReceipt({ hash, timeout: 120_000 });
  console.log(`TX status: ${receipt.status}`);

  const balAfter = (await client.readContract({
    address: GF_TOKEN_ADDRESS as `0x${string}`,
    abi: GF_TOKEN_ABI,
    functionName: 'balanceOf',
    args: [TO as `0x${string}`],
  })) as bigint;

  console.log(`Recipient GFT after: ${formatUnits(balAfter, 18)}`);
  console.log(`Delta: +${formatUnits(balAfter - balBefore, 18)} GFT`);
}

main().catch((e) => { console.error(e); process.exit(1); });
