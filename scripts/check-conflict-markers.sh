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

set -euo pipefail

PATTERN='^(<<<<<<<|>>>>>>>|=======)( |$)'

found=0

# Directories with recursive scan
SEARCH_DIRS=(server client/src shared)
for dir in "${SEARCH_DIRS[@]}"; do
  if [ ! -d "$dir" ]; then
    continue
  fi
  matches=$(grep -rn --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' \
    -P "$PATTERN" "$dir" 2>/dev/null || true)
  if [ -n "$matches" ]; then
    echo "❌ Git conflict markers found:"
    echo "$matches"
    found=1
  fi
done

# Root-level build/config files (non-recursive, one level only)
root_matches=$(grep -n --include='*.config.ts' --include='*.config.js' --include='*.config.mjs' \
  -P "$PATTERN" *.config.ts *.config.js *.config.mjs 2>/dev/null || true)
if [ -n "$root_matches" ]; then
  echo "❌ Git conflict markers found in root config files:"
  echo "$root_matches"
  found=1
fi

if [ "$found" -ne 0 ]; then
  echo ""
  echo "Build aborted: resolve all conflict markers before building."
  exit 1
fi

echo "✅ No git conflict markers found."
