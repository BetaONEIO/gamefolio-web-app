---
name: Manual campaign key capacity
description: Capacity safety when creating a manually reviewed campaign with game keys.
---

Manual campaign places must be based on unique available keys actually attached to that campaign, not the developer's general automatic-campaign vault. For keyless access, use an explicit participant limit instead.

**Why:** The admin approval check counts only instance-attached keys; available vault keys remain unassigned during manual creation. Counting them in setup can advertise more places than approval can support.

**How to apply:** When adding another manually created key-backed campaign, either upload keys directly for that campaign and verify its resulting inventory, or implement an explicit atomic vault assignment before counting vault keys as places. Do not borrow vault totals implicitly.