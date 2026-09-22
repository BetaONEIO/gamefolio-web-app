---
name: Towerdog PostgreSQL integration isolation
description: Towerdog database tests must apply the real migration inside a disposable schema and use separate pooled connections.
---

Towerdog recovery tests can use a disposable schema inside an explicitly supplied PostgreSQL test database. Apply the migration unchanged after creating only its real prerequisites, set `search_path` on every test connection, and drop the schema in teardown.

**Why:** This verifies PostgreSQL indexes, checks, foreign keys, transaction isolation, and compare-and-set behavior without mutating the application schema or depending on a full production fixture.

**How to apply:** Keep integration tests opt-in with a dedicated database URL, use at least two connections for race/recovery assertions, and leave unit tests runnable when the URL is absent.