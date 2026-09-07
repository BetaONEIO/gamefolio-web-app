---
name: Default profile palette migration
description: How global profile-theme refreshes should handle persisted legacy defaults without changing custom themes.
---

When the global default profile palette changes, resolve known legacy default colour combinations to the current defaults at render time as well as updating defaults used for new accounts and resets. Do not broadly replace individual colours because named and user-created themes may reuse one of them.

**Why:** Existing accounts can have old default colours persisted in the database, so changing null fallbacks or schema defaults alone does not update their visible profiles. Matching the complete known default palette distinguishes those accounts from most intentional custom themes.

**How to apply:** Keep the recognised legacy palettes and current defaults in one shared resolver. Bypass migration when a profile has custom background media or a custom gradient, and preserve arbitrary colour combinations.