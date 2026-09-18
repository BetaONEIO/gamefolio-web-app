---
name: Towerdog theme entitlement
description: Towerdog Pixel Surge is gated by the original signup referral, not mutable referral history.
---

The Towerdog Pixel Surge theme is unlocked only when the original signup referral matches Towerdog's referral code after trimming and case normalization. Post-registration referral entry must never grant the entitlement, and unlocking must not auto-equip the theme.

**Why:** The existing referredBy field is mutable and can be populated after signup, so using it would let users bypass the exclusive referral requirement.

**How to apply:** Keep the signup referral source write-once, enforce the same normalized comparison server-side, and represent the unlock as a collection item without changing the selected profile theme.