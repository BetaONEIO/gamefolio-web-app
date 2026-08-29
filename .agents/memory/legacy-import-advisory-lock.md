---
name: Legacy import advisory lock
description: Session advisory locks must use one reserved postgres-js connection for acquisition, work, and release.
---

Session-level PostgreSQL advisory locks are connection-scoped. When using a postgres-js pool, separate `unsafe()` calls can land on different connections, so acquire and release the lock through one `reserve()`d connection.

**Why:** A pooled release call may otherwise fail to unlock the connection that acquired the lock, causing later admin retries to report that an import is still running.

**How to apply:** Use a reserved connection for the entire serialized operation and always release it in `finally`.