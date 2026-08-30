---
name: Authoritative creator XP
description: Product rules and implementation constraints for the creator XP leaderboard.
---

The creator leaderboard's authoritative ledger is `user_xp_history`. The current product rules are 250 XP per clip/reel upload, 100 XP per screenshot upload, 1 XP per valid rate-limited view, 50 XP to the content creator for each unique fire reaction, 500 XP to a referral giver, 100 XP to the referred user, and lootbox rewards of 1000/500/250/100/50 XP.

**Why:** Legacy `user_points_history` values and temporary upload backfills caused leaderboard totals to diverge from the intended XP system, and reaction removal/re-addition could otherwise create repeat rewards.

**How to apply:** New implementations for these events must write through `XPService`; fire awards need a durable content/reactor dedupe key, and changes to historical XP must recalculate `users.totalXP` and cached levels from the authoritative ledger.