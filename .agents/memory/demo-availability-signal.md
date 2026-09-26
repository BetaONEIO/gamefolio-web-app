---
name: Demo availability signal
description: When a campaign can offer demo keys rather than full-game keys.
---

Only offer demo-key access when the selected game profile explicitly advertises a demo. A storefront link, release status, or generic game media is not evidence that players can obtain a demo.

**Why:** Gamefolio's game profile currently has no authoritative demo-availability field; guessing from Steam, Epic, or itch links could offer unavailable access and strand creators. The safe default is full-game access.

**How to apply:** If adding a verified demo field to the game profile later, use that signal consistently in campaign selection and server validation; do not infer availability from unrelated links.