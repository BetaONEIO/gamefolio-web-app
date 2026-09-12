---
name: Campaign key encryption
description: Durable security rules for encrypting, rotating, and revealing campaign access and reward keys.
---

Campaign keys must be encrypted with a resolvable key version and keyring identifier. New campaign-specific versions use version-specific environment keys; legacy compatibility encryption may use the stable wallet key only when tagged as `wallet-v1`.

**Why:** Untagged ciphertext becomes undecryptable after key rotation, while falling back to session secrets risks permanent data loss. Plaintext compatibility paths also risk exposing bearer credentials outside an authorized reveal.

**How to apply:** Encrypt before persistence, clear legacy plaintext after backfill, record the key version, and decrypt only in authorized reveal/claim handlers. Never return unrevealed keys through list or progress APIs, logs, analytics, or errors.