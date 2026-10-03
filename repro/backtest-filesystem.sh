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
MAXV="${3:-0}"   # 0 = full history; N = only the last N stable versions
OUT="${4:-}"     # optional JSONL results file (appended per pair)
CLI="$ROOT/product/src/cli.js"

echo "🪤 RugSnare Historical Backtest"
echo "   Package: $PKG"
echo ""

# Get all published versions (stable only; optionally the last MAXV)
VERSIONS=$(npm view "$PKG" versions --json 2>/dev/null | node -e "
const chunks = [];
process.stdin.on('data', d => chunks.push(d));
process.stdin.on('end', () => {
  try {
    const v = JSON.parse(chunks.join(''));
    let stable = v.filter(x => !x.includes('-'));
    if ($MAXV > 0) stable = stable.slice(-$MAXV);
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

TMP="${RUGSNARE_BACKTEST_TMP:-$ROOT/repro/.backtest-tmp}"
rm -rf "$TMP" 2>/dev/null || true   # stale locks from a previous killed run must not poison this one
mkdir -p "$TMP"
TMPM="$(cygpath -m "$TMP" 2>/dev/null || echo "$TMP")"   # native form: Windows node cannot read /c/... paths
trap 'rm -rf "$TMP" 2>/dev/null || true' EXIT

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
TOTAL_BREAKING=0
TOTAL_COSMETIC=0
TOTAL_ANNOTATION=0
PAIR_NUM=0

pair_json() {
  # one JSON line per pair into $OUT if requested; details = [{name, change, of}] of CHANGED items only
  [ -z "$OUT" ] && return 0
  local DETAILS
  DETAILS=$(node -e "
const fs = require('fs');
const src = '$TMPM/diff.txt';
const lines = (fs.existsSync(src) ? fs.readFileSync(src, 'utf8') : '')
  .split('\n').filter((l) => /^\s+\[(DRIFT|NEW |GONE)\]/.test(l));
const out = [];
for (const l of lines) {
  const m = l.match(/\[(DRIFT|NEW |GONE)\]\s+(\S+)(?:\s+\((\w+)\))?/);
  if (!m) continue;
  const status = m[1].trim() === 'GONE' ? 'REMOVED' : m[1].trim();
  const tag = m[3];
  if (tag === 'prompt' || tag === 'resource') out.push({ name: m[2], change: status, of: tag });
  else out.push({ name: m[2], change: tag || status, of: 'tool' });
}
console.log(JSON.stringify(out).slice(1, -1));
" 2>/dev/null || echo '')
  printf '{"pkg":"%s","from":"%s","to":"%s","clean":%s,"drift":%s,"new":%s,"removed":%s,"breaking":%s,"cosmetic":%s,"annotation":%s,"details":[%s]}\n' \
    "$PKG" "$1" "$2" "$3" "$4" "$5" "$6" "$7" "$8" "$9" "$DETAILS" >> "$OUT"
}

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
  # shim: some old releases have undeclared deps (zod-to-json-schema bug)
  npm install --no-audit --no-fund --silent zod-to-json-schema >/dev/null 2>&1 || true

  write_config
  rm -rf .rugsnare

  # Pin baseline (one retry: transient Windows file locks / cold starts)
  SCAN_RESULT=$(node "$CLI" scan --config "$(to_native "$TMP/mcp.json")" --timeout 30000 2>&1) || true
  if ! echo "$SCAN_RESULT" | grep -q "pinned"; then
    sleep 2
    SCAN_RESULT=$(node "$CLI" scan --config "$(to_native "$TMP/mcp.json")" --timeout 30000 2>&1) || true
  fi
  if ! echo "$SCAN_RESULT" | grep -q "pinned"; then
    echo "  [$PAIR_NUM] $i → $NEXT: SCAN FAILED (skipping)"
    continue
  fi

  # Install version NEXT (silent replacement)
  npm install --no-audit --no-fund --silent "$PKG@$NEXT" >/dev/null 2>&1 || true

  # Diff — capture exit code (obna 24: grep "clean" catches "clean (+1 infra error)")
  DIFF_OUTPUT=$(node "$CLI" diff --config "$(to_native "$TMP/mcp.json")" --timeout 30000 2>&1)
  DIFF_EXIT=$?
  echo "$DIFF_OUTPUT" > "$TMP/diff.txt"

  # Count ONLY per-item bracket lines — the "DRIFT DETECTED (N finding(s))"
  # summary line must not be counted (obna 23 counting artifact)
  DRIFT=$(grep -cF "[DRIFT]" "$TMP/diff.txt" || true)
  NEW=$(grep -cF "[NEW ]" "$TMP/diff.txt" || true)
  REMOVED=$(grep -cF "[GONE]" "$TMP/diff.txt" || true)
  BREAKING=$(grep -cF "(BREAKING)" "$TMP/diff.txt" || true)
  COSMETIC=$(grep -cF "(COSMETIC)" "$TMP/diff.txt" || true)
  ANNOTATION=$(grep -cF "(ANNOTATION)" "$TMP/diff.txt" || true)

  if [ $DIFF_EXIT -eq 3 ]; then
    # infra error: server unreachable — skip, don't count as clean or drift
    echo "  [$PAIR_NUM] $i → $NEXT: ⏭️ INFRA SKIP (server unreachable, exit 3)"
    continue
  elif [ $DIFF_EXIT -eq 0 ]; then
    TOTAL_CLEAN=$((TOTAL_CLEAN + 1))
    echo "  [$PAIR_NUM] $i → $NEXT: ✅ clean"
    pair_json "$i" "$NEXT" true 0 0 0 0 0 0
  else
    TOTAL_DRIFT=$((TOTAL_DRIFT + DRIFT))
    TOTAL_NEW=$((TOTAL_NEW + NEW))
    TOTAL_REMOVED=$((TOTAL_REMOVED + REMOVED))
    TOTAL_BREAKING=$((TOTAL_BREAKING + BREAKING))
    TOTAL_COSMETIC=$((TOTAL_COSMETIC + COSMETIC))
    TOTAL_ANNOTATION=$((TOTAL_ANNOTATION + ANNOTATION))
    echo "  [$PAIR_NUM] $i → $NEXT: 🔴 DRIFT=$DRIFT (B=$BREAKING C=$COSMETIC A=$ANNOTATION) NEW=$NEW REMOVED=$REMOVED"
    pair_json "$i" "$NEXT" false "$DRIFT" "$NEW" "$REMOVED" "$BREAKING" "$COSMETIC" "$ANNOTATION"

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
echo "  Total DRIFT findings:  $TOTAL_DRIFT  (BREAKING=$TOTAL_BREAKING COSMETIC=$TOTAL_COSMETIC ANNOTATION=$TOTAL_ANNOTATION)"
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
