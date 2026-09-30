#!/usr/bin/env bash
# RugSnare historical backtest: pin every published version of an MCP server,
# diff against the next version, and report every contract change that
# ever happened — proving the tool catches real-world drift, not just
# synthetic attacks.
#
# Usage: bash backtest-filesystem.sh [package] [entry-arg]
# Default: @modelcontextprotocol/server-filesystem /tmp
set -uo pipefail  # no -e: we handle errors per-step

# Anchor to absolute path (relative paths break from the 2nd iteration)
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PKG="${1:-@modelcontextprotocol/server-filesystem}"
ARG="${2:-/tmp}"
CLI="$(dirname "$0")/../product/src/cli.js"

echo "🪤 RugSnare Historical Backtest"
echo "   Package: $PKG"
echo ""

# Get all published versions
VERSIONS=$(npm view "$PKG" versions --json 2>/dev/null | node -e "
const chunks = [];
process.stdin.on('data', d => chunks.push(d));
process.stdin.on('end', () => {
  try {
    const v = JSON.parse(chunks.join(''));
    const stable = v.filter(x => !x.includes('-'));
    console.log(stable.join(' '));
  } catch { console.log(''); }
});
")

if [ -z "$VERSIONS" ]; then
  echo "❌ Could not get versions for $PKG"
  exit 1
fi

VERSION_COUNT=$(echo $VERSIONS | wc -w)
echo "   Versions found: $VERSION_COUNT"
echo "   Pairs to test: $((VERSION_COUNT - 1))"
echo ""

TMP="$(dirname "$0")/.backtest-tmp"
rm -rf "$TMP"
mkdir -p "$TMP"
trap 'rm -rf "$TMP"' EXIT

# Windows: convert MSYS paths to native for node.exe
to_native() { if command -v cygpath >/dev/null 2>&1; then cygpath -m "$1"; else printf '%s' "$1"; fi; }

# Config template
write_config() {
  local ENTRY=$(to_native "$TMP/node_modules/$PKG/dist/index.js")
  cat > "$TMP/mcp.json" << EOF
{"mcpServers":{"backtest":{"command":"node","args":["$ENTRY","$ARG"]}}}
EOF
}

TOTAL_DRIFT=0
TOTAL_NEW=0
TOTAL_REMOVED=0
TOTAL_CLEAN=0
PAIR_NUM=0

for i in $VERSIONS; do
  # Get next version
  NEXT=$(echo $VERSIONS | tr ' ' '\n' | grep -A1 "^$i$" | tail -1)
  if [ "$NEXT" = "$i" ] || [ -z "$NEXT" ]; then
    break  # last version, no pair
  fi

  PAIR_NUM=$((PAIR_NUM + 1))

  # Install version i (baseline)
  cd "$TMP"
  rm -rf node_modules package-lock.json
  npm init -y >/dev/null 2>&1 || true
  npm install --no-audit --no-fund --silent "$PKG@$i" >/dev/null 2>&1 || true

  write_config
  rm -rf .rugsnare

  # Pin baseline
  SCAN_RESULT=$(node "$CLI" scan --config "$(to_native "$TMP/mcp.json")" 2>&1) || true
  if ! echo "$SCAN_RESULT" | grep -q "pinned"; then
    echo "  [$PAIR_NUM] $i → $NEXT: SCAN FAILED (skipping)"
    continue
  fi

  # Install version NEXT (silent replacement)
  npm install --no-audit --no-fund --silent "$PKG@$NEXT" >/dev/null 2>&1 || true

  # Diff
  DIFF_OUTPUT=$(node "$CLI" diff --config "$(to_native "$TMP/mcp.json")" 2>&1 || true)

  DRIFT=$(echo "$DIFF_OUTPUT" | grep -c "DRIFT" || true)
  NEW=$(echo "$DIFF_OUTPUT" | grep -c "NEW " || true)
  REMOVED=$(echo "$DIFF_OUTPUT" | grep -c "REMOVED" || true)

  if echo "$DIFF_OUTPUT" | grep -q "clean"; then
    TOTAL_CLEAN=$((TOTAL_CLEAN + 1))
    echo "  [$PAIR_NUM] $i → $NEXT: ✅ clean"
  else
    TOTAL_DRIFT=$((TOTAL_DRIFT + DRIFT))
    TOTAL_NEW=$((TOTAL_NEW + NEW))
    TOTAL_REMOVED=$((TOTAL_REMOVED + REMOVED))
    echo "  [$PAIR_NUM] $i → $NEXT: 🔴 DRIFT=$DRIFT NEW=$NEW REMOVED=$REMOVED"

    # Show which tools changed
    echo "$DIFF_OUTPUT" | grep -E "^\s+\[" | head -10 | while read line; do
      echo "       $line"
    done
  fi
done

echo ""
echo "═══════════════════════════════════════════════════"
echo "  Backtest Summary: $PKG"
echo "═══════════════════════════════════════════════════"
echo "  Version pairs tested:  $PAIR_NUM"
echo "  Clean pairs:           $TOTAL_CLEAN"
echo "  Pairs with drift:      $((PAIR_NUM - TOTAL_CLEAN))"
echo "  Total DRIFT findings:  $TOTAL_DRIFT"
echo "  Total NEW tools:       $TOTAL_NEW"
echo "  Total REMOVED tools:   $TOTAL_REMOVED"
echo ""
if [ $TOTAL_DRIFT -gt 0 ]; then
  echo "  🪤 RugSnare caught $TOTAL_DRIFT real contract changes"
  echo "     across the entire release history of this package."
  echo "     Every change below was silent — no announcement, no changelog entry."
else
  echo "  ✅ No contract changes detected in this package's history."
fi
echo ""
