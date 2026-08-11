const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  await pool.query(`ALTER TABLE campaign_templates ADD COLUMN IF NOT EXISTS xp_tier TEXT DEFAULT 'standard'`);
  await pool.query(`ALTER TABLE campaign_instances ADD COLUMN IF NOT EXISTS xp_event_multiplier NUMERIC DEFAULT 1.0`);
  await pool.query(`ALTER TABLE campaign_participants ADD COLUMN IF NOT EXISTS xp_earned INTEGER DEFAULT 0`);
  await pool.query(`ALTER TABLE bounty_submissions ADD COLUMN IF NOT EXISTS xp_awarded INTEGER DEFAULT 0`);

  // Assign xp_tier based on duration
  const { rows: templates } = await pool.query(`SELECT id, slug, duration FROM campaign_templates`);
  for (const t of templates) {
    let tier = 'standard';
    if (t.duration <= 10) tier = 'quick';
    else if (t.duration <= 14) tier = 'standard';
    else if (t.duration <= 30) tier = 'premium';
    else tier = 'featured';
    if (t.slug.startsWith('gf-')) tier = 'premium';
    await pool.query(`UPDATE campaign_templates SET xp_tier = $1 WHERE id = $2`, [tier, t.id]);
    console.log(`  ${t.slug} → ${tier}`);
  }
  console.log('Done');
  await pool.end();
}
run().catch(e => { console.error(e); pool.end(); });
