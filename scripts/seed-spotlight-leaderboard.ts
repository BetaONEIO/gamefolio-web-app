// Seeds the Spotlight leaderboard POC with plausible claims so the three
// boards aren't empty when you open /spotlight on a fresh database.
//
//   bun run db:seed:spotlight            # seed (refuses if claims exist)
//   bun run db:seed:spotlight --reset    # wipe spotlight_claims first
//
// Subjects are addressed by username / game name rather than id, because the
// ids differ between the prod, beta and local databases. Anything that can't
// be resolved is skipped with a warning instead of failing the whole run.
//
// NOTE: this does NOT debit anyone's gf_token_balance — the GFT figures are
// cosmetic. Only real claims made through the route spend tokens.
import 'dotenv/config';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });

type Seed = {
  board: 'gamers' | 'streamers' | 'games';
  category: string;
  /** Games board: the game to spotlight. Its owner becomes the claiming user. */
  game?: string;
  /** Gamers / streamers boards: the member being spotlighted. */
  username?: string;
  gft: number;
  /** false = an earlier holder who has since been outbid. */
  active: boolean;
  /** Backdates created_at so the recent-activity feed isn't one flat block. */
  hoursAgo: number;
};

const SEEDS: Seed[] = [
  // Gamers — a winner plus the people they outbid.
  { board: 'gamers', category: 'overall',     username: 'Rhys100',          gft: 4200, active: true,  hoursAgo: 3 },
  { board: 'gamers', category: 'overall',     username: 'Leumas',           gft: 3100, active: false, hoursAgo: 19 },
  { board: 'gamers', category: 'overall',     username: 'Player1',          gft: 1500, active: false, hoursAgo: 52 },
  { board: 'gamers', category: 'competitive', username: 'JawaTheGathering', gft: 2750, active: true,  hoursAgo: 8 },
  { board: 'gamers', category: 'competitive', username: '2by4',             gft: 1200, active: false, hoursAgo: 40 },
  { board: 'gamers', category: 'retro',       username: 'Lord_Lurk87',      gft:  900, active: true,  hoursAgo: 14 },
  { board: 'gamers', category: 'retro',       username: 'Player2',          gft:  400, active: false, hoursAgo: 61 },
  { board: 'gamers', category: 'speedrunner', username: 'Zaki',             gft: 1850, active: true,  hoursAgo: 5 },
  { board: 'gamers', category: 'rpg',         username: 'ellie98',          gft:  650, active: true,  hoursAgo: 27 },
  { board: 'gamers', category: 'casual',      username: 'ryan',             gft:  300, active: true,  hoursAgo: 33 },

  // Streamers — every subject here must pass the route's streamer check.
  { board: 'streamers', category: 'overall', username: 'tomwatts',         gft: 5000, active: true,  hoursAgo: 2 },
  { board: 'streamers', category: 'overall', username: 'busyguy',          gft: 3600, active: false, hoursAgo: 11 },
  { board: 'streamers', category: 'overall', username: 'Rhys100',          gft: 2200, active: false, hoursAgo: 36 },
  { board: 'streamers', category: 'variety', username: 'JawaTheGathering', gft: 2400, active: true,  hoursAgo: 6 },
  { board: 'streamers', category: 'variety', username: 'dawnsvk',          gft: 1100, active: false, hoursAgo: 44 },
  { board: 'streamers', category: 'esports', username: 'mod_tom',          gft: 1750, active: true,  hoursAgo: 16 },
  { board: 'streamers', category: 'horror',  username: 'Mediaburn',        gft:  820, active: true,  hoursAgo: 22 },
  { board: 'streamers', category: 'irl',     username: 'TvSmallwar123',    gft:  500, active: true,  hoursAgo: 48 },

  // Games — the claiming user is resolved from the game's owner.
  { board: 'games', category: 'overall',    game: 'Neon Horizon',    gft: 6100, active: true,  hoursAgo: 1 },
  { board: 'games', category: 'overall',    game: 'Skyfall Raiders', gft: 4400, active: false, hoursAgo: 13 },
  { board: 'games', category: 'overall',    game: 'Skybound Drift',  gft: 2000, active: false, hoursAgo: 58 },
  { board: 'games', category: 'action',     game: 'Skyfall Raiders', gft: 2900, active: true,  hoursAgo: 9 },
  { board: 'games', category: 'adventure',  game: 'Skybound Drift',  gft: 1600, active: true,  hoursAgo: 25 },
  { board: 'games', category: 'platformer', game: 'tom testing',     gft:  750, active: true,  hoursAgo: 30 },
];

// Mirrors eligibilityFor() in server/routes/spotlight-leaderboard.ts, so the
// seeded streamers board only holds subjects that could really have claimed.
function isStreamer(u: any): boolean {
  const types = String(u.user_type ?? '').split(',').map((t: string) => t.trim());
  return Boolean(
    u.is_streamer
    || u.twitch_verified || u.kick_verified
    || u.youtube_verified || u.rumble_verified || u.vpzone_verified
    || types.includes('streamer'),
  );
}

async function main() {
  const reset = process.argv.includes('--reset');
  console.log(`Database: ${new URL(process.env.DATABASE_URL!).host}`);

  const [{ n: existing }] = await sql<{ n: number }[]>`
    select count(*)::int as n from spotlight_claims`;
  if (existing > 0) {
    if (!reset) {
      console.error(
        `spotlight_claims already holds ${existing} row(s). Re-run with --reset to replace them.`,
      );
      process.exit(1);
    }
    await sql`delete from spotlight_claims`;
    console.log(`Cleared ${existing} existing claim(s).`);
  }

  const userRows = await sql`
    select id, username, user_type, is_streamer,
           twitch_verified, kick_verified, youtube_verified, rumble_verified, vpzone_verified
    from users`;
  const usersByName = new Map(userRows.map((u: any) => [u.username, u]));

  const gameRows = await sql`
    select id, game_name, user_id from indie_game_profiles where game_name is not null`;
  const gamesByName = new Map(gameRows.map((g: any) => [g.game_name, g]));

  let inserted = 0;
  const skipped: string[] = [];

  for (const seed of SEEDS) {
    let userId: number;
    let gameId: number | null = null;

    if (seed.board === 'games') {
      const game = gamesByName.get(seed.game!);
      if (!game) { skipped.push(`${seed.board}/${seed.category}: no game "${seed.game}"`); continue; }
      gameId = game.id;
      userId = game.user_id;   // the games board claims on behalf of the owner
    } else {
      const user = usersByName.get(seed.username!);
      if (!user) { skipped.push(`${seed.board}/${seed.category}: no user "${seed.username}"`); continue; }
      if (seed.board === 'streamers' && !isStreamer(user)) {
        skipped.push(`streamers/${seed.category}: "${seed.username}" is not streamer-eligible`);
        continue;
      }
      userId = user.id;
    }

    await sql`
      insert into spotlight_claims (board, category, game_id, user_id, gft_amount, is_active, created_at)
      values (${seed.board}, ${seed.category}, ${gameId}, ${userId},
              ${seed.gft}, ${seed.active}, now() - ${seed.hoursAgo + ' hours'}::interval)`;
    inserted++;
  }

  for (const reason of skipped) console.warn(`  skipped — ${reason}`);
  console.log(`Inserted ${inserted} claim(s), skipped ${skipped.length}.`);

  const summary = await sql`
    select board, count(*)::int as claims, count(*) filter (where is_active)::int as active
    from spotlight_claims group by board order by board`;
  console.table(summary);
}

main()
  .then(() => sql.end())
  .catch(async (err) => { console.error(err); await sql.end(); process.exit(1); });
