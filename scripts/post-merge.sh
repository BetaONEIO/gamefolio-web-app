#!/bin/bash
set -e

# Fast install: bun is the package manager for this repo (bun.lock).
# If bun.lock didn't change since the last install, this is effectively
# a no-op.
# Allow up to 90s for installs that pull fresh packages (e.g. after
# security-bump tasks that change many deps).
if timeout 90 bun install --silent; then
  echo "[post-merge] bun install completed."
else
  echo "[post-merge] bun install needs human review." >&2
fi

# `drizzle-kit push` is interactive when adding constraints to populated
# tables or renaming columns. Post-merge has no TTY and a tight budget,
# so:
#   1. Pipe `yes ""` to auto-accept the highlighted (safe) default for any
#      prompt that does sneak through.
#   2. Pass `--force` to bypass drizzle's confirm-on-data-change prompts.
#   3. Cap with `timeout 15` so a genuinely-stuck push fails fast.
#   4. Treat a non-zero exit as a soft failure so the merge still
#      completes; the schema mismatch will be visible in the next push.
echo "[post-merge] Running drizzle-kit push (non-interactive)..."
if timeout 15 bash -c 'yes "" | bun run db:push -- --force' >/dev/null 2>&1 ; then
  echo "[post-merge] db:push completed."
else
  echo "[post-merge] db:push needs human review (skipped)." >&2
fi
