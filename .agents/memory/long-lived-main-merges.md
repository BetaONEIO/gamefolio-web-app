---
name: Long-lived main merges
description: Verification requirements when syncing heavily diverged feature branches with main.
---

When merging `main` into a long-lived feature branch, a conflict preference such as `-X theirs` only resolves directly overlapping hunks. Git can still retain semantically duplicated declarations or retain consumers while dropping nearby derived state from the other side.

**Why:** A large Streamer Partner sync merged without unresolved conflict markers but initially produced duplicate schema/UI declarations and later browser-only reference errors that the production bundle did not reject.

**How to apply:** Create a safety branch before merging. Afterward, run conflict-marker and diff checks, the production build, startup import tests, a focused TypeScript scan of merged files, and an actual browser preview. Do not treat a clean merge commit or passing bundle as sufficient.