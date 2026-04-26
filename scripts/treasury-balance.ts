import 'dotenv/config';
import { createPublicClient, http, formatUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { SKALE_BASE_MAINNET, GF_TOKEN_ADDRESS, GF_TOKEN_ABI } from '../shared/contracts';

async function main() {
  const pk = process.env.TREASURY_PRIVATE_KEY;
  if (!pk) throw new Error('TREASURY_PRIVATE_KEY missing');
  const formatted = (pk.startsWith('0x') ? pk : '0x' + pk) as `0x${string}`;
  const account = privateKeyToAccount(formatted);

  const client = createPublicClient({
    chain: SKALE_BASE_MAINNET,
    transport: http(SKALE_BASE_MAINNET.rpcUrls.default.http[0]),
  });

  const [gft, sfuel] = await Promise.all([
    client.readContract({
      address: GF_TOKEN_ADDRESS as `0x${string}`,
      abi: GF_TOKEN_ABI,
      functionName: 'balanceOf',
      args: [account.address],
    }) as Promise<bigint>,
    client.getBalance({ address: account.address }),
  ]);

  console.log(JSON.stringify({
    treasuryAddress: account.address,
    gft: formatUnits(gft, 18),
    sfuel: formatUnits(sfuel, 18),
  }, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
