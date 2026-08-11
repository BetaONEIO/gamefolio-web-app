const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  await pool.query(`ALTER TABLE campaign_instances ADD COLUMN IF NOT EXISTS demo_keys_remaining INTEGER DEFAULT 0`);
  await pool.query(`ALTER TABLE campaign_instances ADD COLUMN IF NOT EXISTS full_keys_remaining INTEGER DEFAULT 0`);
  await pool.query(`ALTER TABLE campaign_instances ADD COLUMN IF NOT EXISTS participant_count INTEGER DEFAULT 0`);
  console.log('Columns added');
  await pool.end();
}
run().catch(e => { console.error(e); pool.end(); });
