---
name: "@assets alias requires public copy"
description: Why @assets imports fail to resolve even though the file appears attached/uploaded.
---

The Vite alias `@assets` resolves to `client/public/attached_assets` (see `vite.config.ts`), not the top-level `attached_assets/` directory.

**Why:** Files a user attaches in chat sometimes land only in the root `attached_assets/` folder and are not automatically synced into `client/public/attached_assets/`. An `import x from "@assets/foo.png"` will fail to resolve (or silently 404 at runtime) until the file physically exists at the public path.

**How to apply:** Before wiring up a new `@assets` import, verify the file exists under `client/public/attached_assets/`. If it's only in the root `attached_assets/` directory, copy it over first.
