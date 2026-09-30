---
name: Wallet context in Vite previews
description: Why Sequence wallet packages need consistent Vite prebundling
---

Keep Sequence Connect and direct wagmi imports in one stable, deduplicated Vite dependency graph when changing wallet dependencies or preview configuration. If `useConfig` reports that `WagmiProvider` is missing despite the provider visibly wrapping the wallet, inspect the optimized chunks before changing the wallet feature gate or introducing a second provider.

**Why:** A browser crash after a preview restart referenced an older Vite-optimized wagmi chunk, while the current dependency graph bundled Sequence's provider and the app's hook from the same newer chunk. Package installation showed one deduplicated wagmi version, so a transient optimized-module mismatch is more plausible than a missing provider in the JSX tree.

**How to apply:** Prebundle the related wallet dependencies together and dedupe React/wagmi in Vite; verify the optimized imports share a wagmi chunk after restarting the preview. Avoid nested independent Wagmi providers, which can split wallet state.