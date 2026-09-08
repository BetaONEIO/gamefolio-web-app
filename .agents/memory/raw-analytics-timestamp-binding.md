---
name: Raw analytics timestamp binding
description: Timestamp parameter requirement for raw Drizzle queries using the project's postgres-js driver.
---

Raw tagged-SQL queries executed through `db.execute` must bind timestamps as ISO strings rather than JavaScript `Date` instances.

**Why:** This project's postgres-js prepared-query path attempts to encode raw `Date` parameters as strings and throws `ERR_INVALID_ARG_TYPE`, causing an immediate HTTP 500.

**How to apply:** Keep `Date` objects for application calculations if useful, but interpolate `.toISOString()` values into raw tagged SQL filters. Typed Drizzle query-builder operations may continue using schema-supported `Date` values.