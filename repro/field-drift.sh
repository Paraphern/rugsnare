#!/usr/bin/env bash
# Reproduces the "Field-tested" claim from the README:
#
#   1. install the official @modelcontextprotocol/server-filesystem at
#      version 2026.8.31 and pin its tool descriptions (rugsnare scan)
#   2. silently serve version 2026.1.14 instead (a benign "rug pull" —
#      same package, older release)
#   3. rugsnare diff must flag exactly the tools whose descriptions
#      genuinely changed between those two releases (read_media_file at
#      the time of writing) and leave the rest untouched
#
# Self-verifying: exits 0 only if drift was detected. Requires node + npm
# and network access to the npm registry. Runs anywhere bash runs (~1 min).
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

NEW_DIR="$TMP/new"; OLD_DIR="$TMP/old"; WS="$TMP/workspace"
mkdir -p "$NEW_DIR" "$OLD_DIR" "$WS"

# bash-side paths must be converted for Windows node.exe (git-bash /tmp/... is an MSYS path)
to_native() { if command -v cygpath >/dev/null 2>&1; then cygpath -m "$1"; else printf '%s' "$1"; fi; }

echo "[1/5] installing @modelcontextprotocol/server-filesystem@2026.8.31 ..."
( cd "$NEW_DIR" && npm init -y >/dev/null 2>&1 \
  && npm install --no-audit --no-fund --silent @modelcontextprotocol/server-filesystem@2026.8.31 >/dev/null )

echo "[2/5] installing @modelcontextprotocol/server-filesystem@2026.1.14 ..."
( cd "$OLD_DIR" && npm init -y >/dev/null 2>&1 \
  && npm install --no-audit --no-fund --silent @modelcontextprotocol/server-filesystem@2026.1.14 >/dev/null )

write_config() {
  # $1 = output file, $2 = package dir
  printf '{\n  "mcpServers": {\n    "filesystem": {\n      "command": "node",\n      "args": ["%s", "%s"]\n    }\n  }\n}\n' \
    "$(to_native "$2/node_modules/@modelcontextprotocol/server-filesystem/dist/index.js")" "$(to_native "$WS")" > "$1"
}
write_config "$TMP/new.json" "$NEW_DIR"
write_config "$TMP/old.json" "$OLD_DIR"

cd "$TMP"
echo "[3/5] rugsnare scan — baseline pins from 2026.8.31 ..."
node "$ROOT/product/src/cli.js" scan --config new.json

echo "[4/5] rugsnare diff — server silently swapped to 2026.1.14 ..."
set +e
node "$ROOT/product/src/cli.js" diff --config old.json | tee "$TMP/result.txt"
set -e

echo "[5/5] verdict ..."
if grep -q "DRIFT" "$TMP/result.txt"; then
  echo ""
  echo "REPRODUCED: real drift between two official releases detected."
  echo "Every tool NOT listed above kept its contract unchanged —"
  echo "that is the no-crying-wolf precision claim, verified on your machine."
  exit 0
else
  echo "UNEXPECTED: no drift found — upstream descriptions may have converged" >&2
  echo "between these versions. Pin another version pair and re-run." >&2
  exit 1
fi
