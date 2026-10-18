---
name: Towerdog milestone rewards
description: Durable eligibility and payout rules for the TOWER signup and first-Pro reward program.
---

Only accounts whose immutable original signup referral is `TOWER` receive the two milestone bonuses: signup and first-ever Pro activation. Each milestone decides from the wallet present at that event: wallet means 500 GFT plus 500 XP; no wallet means 750 XP. A later wallet change must never alter that decision.

**Why:** Subscription confirmation and webhooks can race, and on-chain calls can be interrupted after signing or broadcasting. Inferring eligibility or wallet state later can award the wrong branch, while retrying without a durable signed transaction can duplicate or strand real-token payouts.

**How to apply:** Claim the first-Pro transition conditionally inside the same database transaction that creates its reward decision. Keep XP updates transactional and idempotent. For GFT, persist the signed transaction and expected hash before broadcast, reconcile with status/hash compare-and-swap checks, and rebroadcast the same bytes rather than creating a new transfer.