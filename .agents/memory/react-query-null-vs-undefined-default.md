---
name: React Query destructure defaults don't catch null
description: A query function that returns null (e.g. on 401) silently defeats a `= []` destructure default, letting `.length`/`.map` throw downstream.
---

Destructuring a default value (`const { data: x = [] } = useQuery(...)`) only applies when `data` is `undefined`. If the query function can resolve to `null` (a common pattern for `getQueryFn({ on401: "returnNull" })`), `x` becomes `null` and any array method call on it throws, crashing the component tree that reads it.

**Why:** This surfaced while investigating a notification "Clear All" bug in Gamefolio — the query for `/api/notifications` used `on401: "returnNull"`, so a transient/expired session made `notifications` become `null` instead of `[]`, and `notifications.length`/`.slice()` calls would throw and break the whole dropdown, not just the button.

**How to apply:** When a query can return `null` by design (401 handling, "not found" treated as empty, etc.), don't rely on a destructure default. Instead do `const { data } = useQuery<T | null>(...); const value = data ?? [];` (or equivalent) so both `undefined` and `null` are normalized before use.
