---
name: Manual campaign key capacity
description: Capacity safety when creating a manually reviewed campaign with game keys.
---

For the simplified manual presets, capacity is a deliberate creator count within the canonical preset range. Key-backed campaigns reserve that many unique available keys from the selected game's inventory when submitted, in the same transaction as submission. Keyless campaigns keep an explicit creator limit without reserving keys. The general developer-wide automatic-campaign vault is not game inventory: older unassigned keys with no proven game identity require an explicit owner choice before they can be associated with a game. Other campaign modes may still stage campaign-bound keys, but staging must be reconciled atomically before treating them as capacity.

**Why:** The earlier upload-only flow hid reusable game keys, while counting developer-wide keys without a verified game could grant a creator access to the wrong game or advertise more places than can be filled. Explicit association protects legacy inventory; transactional reservation prevents two campaigns from taking the same key.

**How to apply:** Inventory screens must scope keys to a verified owned game and the chosen key type; moving a capacity slider is read-only. At submission recheck stock and reserve exactly the chosen capacity. Revealed keys remain consumed, while unused reservations are released when campaigns end or are cancelled. Never silently assign an untagged historical vault key to a game from developer ownership alone.