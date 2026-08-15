#!/usr/bin/env bash
# Fail the build early if any git conflict markers are present in source files.
# Patterns checked: <<<<<<< (start), >>>>>>> (end), ======= (separator line).
# Only the separator is checked as a whole line to avoid false positives in
# code that legitimately contains the string "=======".
#
# Scanned locations:
#   server/        — Express/Node backend
#   client/src/    — React frontend
#   shared/        — TypeScript modules consumed by both sides
#   *.config.ts/js — root-level build configs (vite, tailwind, drizzle, etc.)

set -uo pipefail

# POSIX ERE (grep -E), not PCRE (-P): BSD/macOS grep has no -P support at all
# and errors out on it, so a naive `-P ... || true` silently swallows that
# error and reports "clean" even with real markers present. -E works the same
# on GNU and BSD grep, so there's no environment-dependent way to fail silent.
PATTERN='^(<<<<<<<|>>>>>>>|=======)( |$)'

found=0

# Directories with recursive scan
SEARCH_DIRS=(server client/src shared)
for dir in "${SEARCH_DIRS[@]}"; do
  if [ ! -d "$dir" ]; then
    continue
  fi
  matches=$(grep -rn --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' \
    -E "$PATTERN" "$dir")
  grep_status=$?
  if [ "$grep_status" -gt 1 ]; then
    echo "❌ grep failed while scanning $dir (exit $grep_status) — treating as a check failure."
    found=1
  elif [ -n "$matches" ]; then
    echo "❌ Git conflict markers found:"
    echo "$matches"
    found=1
  fi
done

# Root-level build/config files (non-recursive, one level only).
# nullglob so a pattern with zero matches (e.g. no *.config.mjs in this repo)
# expands to nothing instead of being passed to grep as a literal filename.
shopt -s nullglob
root_config_files=(*.config.ts *.config.js *.config.mjs)
shopt -u nullglob

if [ "${#root_config_files[@]}" -gt 0 ]; then
  root_matches=$(grep -n -E "$PATTERN" "${root_config_files[@]}")
  root_status=$?
  if [ "$root_status" -gt 1 ]; then
    echo "❌ grep failed while scanning root config files (exit $root_status) — treating as a check failure."
    found=1
  elif [ -n "$root_matches" ]; then
    echo "❌ Git conflict markers found in root config files:"
    echo "$root_matches"
    found=1
  fi
fi

if [ "$found" -ne 0 ]; then
  echo ""
  echo "Build aborted: resolve all conflict markers before building."
  exit 1
fi

echo "✅ No git conflict markers found."
