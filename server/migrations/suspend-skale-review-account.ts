import { Pool } from "pg";

async function migrate() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log("Suspending skale_review internal account (id: 170)...");

    const result = await pool.query(`
      UPDATE users
      SET status = 'suspended', updated_at = NOW()
      WHERE id = 170
        AND email = 'review@skale.gamefolio.app'
        AND status != 'suspended'
    `);

    if (result.rowCount && result.rowCount > 0) {
      console.log("Migration completed: skale_review account suspended.");
    } else {
      console.log("Migration skipped: account already suspended or not found.");
    }
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

migrate().catch(console.error);
