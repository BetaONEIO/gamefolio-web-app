---
name: Bun override compatibility
description: Dependency override constraints when Bun is the authoritative package manager.
---

This project’s committed Bun dependency graph cannot rely on nested npm override objects. Security fixes must use a patched version that is compatible across every parent dependency, or update the relevant direct parents.

**Why:** Bun warns that nested overrides are unsupported and can leave vulnerable transitive versions in `bun.lock` even when an npm-generated lockfile audits cleanly.

**How to apply:** After dependency changes, regenerate `bun.lock` with Bun and run `bun audit`. Treat an npm audit of a temporary npm lockfile as insufficient for the root project.