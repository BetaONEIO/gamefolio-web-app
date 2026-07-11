const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  await pool.query(`ALTER TABLE campaign_templates ADD COLUMN IF NOT EXISTS xp_tier TEXT DEFAULT 'standard'`);
  await pool.query(`ALTER TABLE campaign_instances ADD COLUMN IF NOT EXISTS xp_event_multiplier NUMERIC DEFAULT 1.0`);
  await pool.query(`ALTER TABLE campaign_participants ADD COLUMN IF NOT EXISTS xp_earned INTEGER DEFAULT 0`);
  await pool.query(`ALTER TABLE bounty_submissions ADD COLUMN IF NOT EXISTS xp_awarded INTEGER DEFAULT 0`);
  console.log('XP columns added');
  await pool.end();
}
run().catch(e => { console.error(e); pool.end(); });
