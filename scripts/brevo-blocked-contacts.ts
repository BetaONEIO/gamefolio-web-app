/**
 * One-off ops script for Brevo transactional "blocked contacts".
 *
 * Brevo auto-blocks a recipient after a hard bounce / spam complaint /
 * unsubscribe so it stops emailing dead or hostile addresses. This script
 * lists those blocked contacts, and can unblock them.
 *
 * Requires BREVO_API_KEY in the environment.
 *
 *   # List everything, grouped by reason (read-only, default):
 *   BREVO_API_KEY=xxx npx tsx scripts/brevo-blocked-contacts.ts
 *
 *   # Unblock specific addresses:
 *   BREVO_API_KEY=xxx npx tsx scripts/brevo-blocked-contacts.ts --unblock a@x.com b@y.com
 *
 *   # Unblock every contact blocked for a given reason:
 *   BREVO_API_KEY=xxx npx tsx scripts/brevo-blocked-contacts.ts --unblock-reason adminBlocked
 *
 * NOTE: unblocking a hardBounce address is rarely a good idea — it will just
 * bounce again and erode sender reputation. Prefer unblocking adminBlocked or
 * contactFlagged (spam) addresses once the underlying issue is resolved.
 */

const API_KEY = process.env.BREVO_API_KEY;
if (!API_KEY) {
  console.error("BREVO_API_KEY is not set. Run with: BREVO_API_KEY=xxx npx tsx scripts/brevo-blocked-contacts.ts");
  process.exit(1);
}

const BASE = "https://api.brevo.com/v3/smtp/blockedContacts";
const headers = { "api-key": API_KEY, accept: "application/json" };

interface BlockedContact {
  email: string;
  reason?: { code?: string; message?: string };
  blockedAt?: string;
  senderEmail?: string;
}

/** Page through every blocked contact (Brevo caps `limit` at 100). */
async function fetchAllBlocked(): Promise<BlockedContact[]> {
  const all: BlockedContact[] = [];
  const limit = 100;
  for (let offset = 0; ; offset += limit) {
    const res = await fetch(`${BASE}?limit=${limit}&offset=${offset}`, { headers });
    if (!res.ok) {
      throw new Error(`List failed (${res.status}): ${await res.text()}`);
    }
    const data = (await res.json()) as { contacts?: BlockedContact[]; count?: number };
    const batch = data.contacts ?? [];
    all.push(...batch);
    if (batch.length < limit) return all;
  }
}

async function unblock(email: string): Promise<boolean> {
  const res = await fetch(`${BASE}/${encodeURIComponent(email)}`, { method: "DELETE", headers });
  if (res.status === 204) return true;
  console.error(`  ✗ ${email} — failed (${res.status}): ${await res.text()}`);
  return false;
}

function reasonOf(c: BlockedContact): string {
  return c.reason?.code ?? "unknown";
}

async function main() {
  const args = process.argv.slice(2);
  const unblockIdx = args.indexOf("--unblock");
  const reasonIdx = args.indexOf("--unblock-reason");

  // --- Unblock specific addresses ---------------------------------------
  if (unblockIdx !== -1) {
    const emails = args.slice(unblockIdx + 1).filter((a) => !a.startsWith("--"));
    if (emails.length === 0) {
      console.error("--unblock needs at least one email address.");
      process.exit(1);
    }
    console.log(`Unblocking ${emails.length} address(es)...`);
    let ok = 0;
    for (const email of emails) {
      if (await unblock(email)) {
        ok++;
        console.log(`  ✓ ${email}`);
      }
    }
    console.log(`\nDone: ${ok}/${emails.length} unblocked.`);
    return;
  }

  const blocked = await fetchAllBlocked();

  // --- Unblock everything matching a reason -----------------------------
  if (reasonIdx !== -1) {
    const reason = args[reasonIdx + 1];
    if (!reason) {
      console.error("--unblock-reason needs a reason code (e.g. adminBlocked, hardBounce, contactFlagged).");
      process.exit(1);
    }
    const matches = blocked.filter((c) => reasonOf(c) === reason);
    if (matches.length === 0) {
      console.log(`No blocked contacts with reason "${reason}".`);
      return;
    }
    console.log(`Unblocking ${matches.length} contact(s) with reason "${reason}"...`);
    let ok = 0;
    for (const c of matches) {
      if (await unblock(c.email)) {
        ok++;
        console.log(`  ✓ ${c.email}`);
      }
    }
    console.log(`\nDone: ${ok}/${matches.length} unblocked.`);
    return;
  }

  // --- Default: read-only listing ---------------------------------------
  console.log(`\n${blocked.length} blocked transactional contact(s).\n`);
  if (blocked.length === 0) return;

  const byReason = new Map<string, BlockedContact[]>();
  for (const c of blocked) {
    const r = reasonOf(c);
    (byReason.get(r) ?? byReason.set(r, []).get(r)!).push(c);
  }

  console.log("Summary by reason:");
  for (const [reason, list] of [...byReason].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${reason.padEnd(20)} ${list.length}`);
  }

  console.log("\nDetail:");
  for (const [reason, list] of byReason) {
    console.log(`\n[${reason}]`);
    for (const c of list) {
      const when = c.blockedAt ? ` — blocked ${c.blockedAt}` : "";
      console.log(`  ${c.email}${when}`);
    }
  }

  console.log(
    "\nReason codes: hardBounce (address invalid — do NOT unblock), " +
      "contactFlagged (marked spam), unsubscribedViaMA (unsubscribed), " +
      "adminBlocked (manually blocked).",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
