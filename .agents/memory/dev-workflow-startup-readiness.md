---
name: Dev workflow startup readiness
description: Distinguishes a transient startup 503 from a failed Gamefolio preview.
---

A successful workflow restart acknowledgement can arrive before the application finishes booting. During this window the dev preview may return 503 even though startup is progressing; the workspace becomes usable after the server logs `startup_ready`.

**Why:** On 2026-09-28, the restart returned before bootstrap completed. An early probe returned 503, then the same forwarded development URL returned 200 after readiness.

**How to apply:** After restarting the application workflow, wait for `startup_ready`, confirm port 5000 is open, and probe the Replit development URL for HTTP 200 before diagnosing forwarding as broken.