/**
 * Resets the local onboarding test accounts so they hit the onboarding flow again.
 *
 * Onboarding is triggered purely by users.user_type being NULL
 * (see client/src/components/auth/onboarding-guard.tsx: `!user.userType`),
 * and completing it writes user_type + bio + displayName. This clears them.
 *
 * Hardcoded to localhost — it can never run against production.
 *   bun run scripts/reset-test-onboarding.ts
 */
import postgres from 'postgres';

const TARGETS = ['IndieDevOnboarding', 'StreamerOnboarding'];

const sql = postgres('postgresql://postgres:password@localhost/heliumdb?sslmode=disable', { max: 2 });

for (const username of TARGETS) {
  const rows = await sql`
    UPDATE users
       SET user_type = NULL,
           bio = ${'TEST ACCOUNT — forced onboarding'},
           display_name = ${username}
     WHERE username ILIKE ${username}
    RETURNING id, username
  `;
  if (rows.length === 0) console.log(`MISSING ${username}`);
  else console.log(`RESET   ${rows[0].username} (id ${rows[0].id}) — will onboard on next sign-in`);
}

await sql.end();
