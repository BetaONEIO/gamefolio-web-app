---
name: Gamefolio dev DB schema drift
description: The dev Supabase database can be missing columns that shared/schema.ts already defines, breaking every query that touches that table.
---

## The Rule

Gamefolio's dev database is an external Supabase Postgres instance, not Replit's managed Postgres. `shared/schema.ts` (Drizzle) can drift ahead of the actual DB — a column can exist in the schema file but not in the live table, causing every `select`/`insert...returning` on that table to fail with `column "x" does not exist`, even for completely unrelated features.

**Why:** Someone added a field to `shared/schema.ts` without ever running a push/migration against this particular Supabase database. Since it's an external DB (not Replit-managed), Replit's Publish-time schema diff/sync does not apply to it — there's no automatic reconciliation.

## How to apply

- If you see `column "..." does not exist` in server logs for a table you didn't just change, suspect drift rather than a bug in your new code.
- Diagnose with a quick information_schema diff: compare `getTableColumns(table)` (Drizzle) against `information_schema.columns` for that table name, via a throwaway `tsx` script that imports `db` from `server/db.ts` (don't hand-roll a raw `postgres()` connection — direct connections from the shell can fail TLS handshake where the app's own configured client succeeds).
- If only a handful of columns are missing, the pragmatic fix is a direct additive `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` via a one-off script — safe because it's purely additive and this is the dev DB itself, not a separate prod replica.
- Delete throwaway diagnostic/fix scripts from the repo root after running them.
