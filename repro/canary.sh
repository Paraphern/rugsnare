#!/usr/bin/env bash
# RugSnare canary — self-verifying reproduction (Phase A acceptance).
#
# Records a real corpus through the live proxy against fixture v1,
# then replays it against the SAME version (must be SAFE, exit 0)
# and against v2 — a rug upgrade: required param appears in the schema,
# a call flips from ok to error, a description is reworded (must be
# DO NOT UPGRADE, exit 1). No false positives allowed on identical versions.
#
# Usage: bash repro/canary.sh   (from anywhere; paths resolved from repo root)
set -u
cd "$(dirname "$0")/.."   # repo root
ROOT="$(pwd)"
# Git Bash: pwd -W yields the Windows form (C:/...); plain pwd elsewhere
ROOTW="$(pwd -W 2>/dev/null || pwd)"
PRODUCT="$ROOT/product"
FIX="$PRODUCT/test/fixtures"
FIXW="$ROOTW/product/test/fixtures"
CLI="node $PRODUCT/src/cli.js"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

# 1. baseline: init + scan pins fixture v1
cat > "$TMP/.mcp.json" <<EOF
{ "mcpServers": { "cal": { "command": "node", "args": ["$FIXW/canary-v1.cjs"] } } }
EOF
( cd "$TMP" && $CLI init > /dev/null && $CLI scan --config .mcp.json > /dev/null ) || fail "scan did not pin v1"
( cd "$TMP" && node -e "
  const p = JSON.parse(require('fs').readFileSync('.rugsnare/pins.json','utf8'));
  const n = Object.keys(p.servers.cal.tools).length;
  if (n !== 2) { console.error('expected 2 pinned tools, got', n); process.exit(1); }
" ) || fail "pin store sanity"
pass "v1 pinned (2 tools)"

# 2. record a corpus through the live proxy (client = a piped script)
CLIENT='{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"repro","version":"1"}}}
{"jsonrpc":"2.0","method":"notifications/initialized"}
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"search_events","arguments":{"q":"ev"}}}
{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get_event","arguments":{"id":"1"}}}'
( cd "$TMP" && echo "$CLIENT" | timeout 8 $CLI canary record --name cal -- node "$FIXW/canary-v1.cjs" > /dev/null 2>&1 ) || true  # timeout kill is expected
( cd "$TMP" && node -e "
  const lines = require('fs').readFileSync('.rugsnare/canary/calls.jsonl','utf8').trim().split('\n').map(JSON.parse);
  const calls = lines.filter(l => l.kind === 'call-trace');
  const info = lines.filter(l => l.kind === 'server-info');
  if (calls.length !== 2 || info.length !== 1) { console.error('corpus:', calls.length, 'calls,', info.length, 'server-info'); process.exit(1); }
  if (calls.some(c => !c.ok)) { console.error('recorded call not ok'); process.exit(1); }
" ) || fail "corpus not recorded (2 calls + server-info)"
pass "corpus recorded through the live proxy (2 calls, v1.0.0)"

# 3. replay against the SAME version -> must be SAFE, exit 0
( cd "$TMP" && $CLI canary replay --name cal -- node "$FIXW/canary-v1.cjs" > replay-same.log 2>&1 )
code=$?
[ $code -eq 0 ] || { cat "$TMP/replay-same.log"; fail "same version must exit 0 (got $code) — false positive"; }
grep -q "verdict: SAFE" "$TMP/replay-same.log" || fail "same version must be SAFE"
pass "replay vs SAME version: SAFE, exit 0, no false positives"

# 4. replay against v2 (rug upgrade) -> must be DO NOT UPGRADE, exit 1
( cd "$TMP" && $CLI canary replay --name cal -- node "$FIXW/canary-v2.cjs" > replay-v2.log 2>&1 )
code=$?
[ $code -eq 1 ] || { cat "$TMP/replay-v2.log"; fail "rug version must exit 1 (got $code)"; }
grep -q "DO NOT UPGRADE" "$TMP/replay-v2.log" || fail "rug version must say DO NOT UPGRADE"
grep -q "schema changed" "$TMP/replay-v2.log" || fail "must flag the schema change"
grep -q "was ok, now error" "$TMP/replay-v2.log" || fail "must flag the ok->error flip"
grep -q "description changed only" "$TMP/replay-v2.log" || fail "must flag the cosmetic rewording"
pass "replay vs RUG version: DO NOT UPGRADE, exit 1, all three changes flagged"

echo ""
echo "CANARY REPRO: ALL PASS — pinning catches the contract, the canary catches the behavior."
