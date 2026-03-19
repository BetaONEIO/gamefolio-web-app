import { Pool } from "pg";

async function migrate() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log("Adding is_approved column to games table...");

    await pool.query(`
      ALTER TABLE games
      ADD COLUMN IF NOT EXISTS is_approved BOOLEAN NOT NULL DEFAULT true
    `);

    await pool.query(`
      UPDATE games SET is_approved = true WHERE is_approved IS NULL
    `);

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

migrate().catch(console.error);
