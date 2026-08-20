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

// Any local test account may be reset. QAOnboard* are throwaway accounts for
// walking the flow repeatedly; the two named ones are the fixed per-path ones.
const TARGETS = [
  'IndieDevOnboarding', 'StreamerOnboarding',
  'QAOnboard1', 'QAOnboard2', 'QAOnboard3', 'QAOnboard4', 'QAOnboard5', 'QAOnboard6',
];

const sql = postgres('postgresql://postgres:password@localhost/heliumdb?sslmode=disable', { max: 2 });

for (const username of TARGETS) {
  const rows = await sql`
    UPDATE users
       SET user_type = NULL,
           bio = ${'TEST ACCOUNT — forced onboarding'},
           display_name = ${username},
           -- streamer step (migration 0021) writes these; clear them too so a
           -- reset is a genuine fresh start rather than a half-completed one.
           stream_platform = NULL, stream_channel_name = NULL,
           stream_main_game = NULL, stream_frequency = NULL,
           twitch_channel_name = NULL, kick_channel_name = NULL, vpzone_channel_name = NULL
     WHERE username ILIKE ${username}
    RETURNING id, username
  `;
  // Indie step writes a game profile; drop it so the flow starts clean.
  if (rows.length > 0) {
    await sql`DELETE FROM indie_game_profiles WHERE user_id = ${rows[0].id}`;
  }
  if (rows.length === 0) console.log(`MISSING ${username}`);
  else console.log(`RESET   ${rows[0].username} (id ${rows[0].id}) — will onboard on next sign-in`);
}

await sql.end();
