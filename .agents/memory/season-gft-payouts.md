---
name: Season GFT payout safety
description: The safety and retry rules for automated on-chain leaderboard rewards.
---

Season leaderboard GFT payouts run only in production at season close. Each season/rank has one ledger row, and a configured wallet is required before a transfer is attempted.

**Why:** The development preview shares treasury-related environment configuration, so allowing the close job to run there could send live tokens during ordinary verification. A transaction hash may exist even when receipt confirmation fails, so retrying it automatically could double-pay.

**How to apply:** Retry only failures known to be safe before submission (for example, insufficient balance or a reverted transaction). Any failure after a hash is submitted must remain held for manual chain reconciliation.