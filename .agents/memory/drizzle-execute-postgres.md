---
name: Drizzle ORM execute() on postgres-js
description: How db.execute(sql`...`) behaves differently between pg and postgres-js drivers.
---

## The Rule

With `drizzle-orm/postgres-js`, `db.execute(sql`...`)` returns a **plain array** directly — not `{ rows: [...] }`. The `rows` property does not exist.

**Why:** The postgres-js driver (unlike `pg`) returns query results as an array directly. Drizzle does not wrap it in a `.rows` object.

## How to apply

- Always use `result[0]`, **never** `result.rows[0]`
- Always use `result.length`, **never** `result.rows.length`
- This applies to all `db.execute(sql`...`)` calls in the Gamefolio codebase

## Error signature

- `Cannot read properties of undefined (reading 'length')` — means you used `.rows.length` on an array
- `Cannot convert undefined or null to object` — can also be triggered by passing a non-existent column reference to Drizzle's `.select()` builder

## Related gotcha: Non-existent columns in .select()

If you reference a column that doesn't exist in the schema (e.g., `games.slug` when the `games` table has no `slug` column), Drizzle throws `Cannot convert undefined or null to object` from `orderSelectedFields`. Always verify column names exist in `shared/schema.ts` before using them in `.select()` queries.
