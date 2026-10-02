#!/usr/bin/env bash
# Silent-changes backtest driver: the ENTIRE stable release history of the four
# official MCP servers we track in the drift-feed. Results (JSONL) become the
# launch-post data story. Usage: bash repro/backtest-multi.sh
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export RUGSNARE_BACKTEST_TMP="$ROOT/repro/.backtest-tmp-$(date +%H%M%S)-$$"   # unique per invocation: a killed previous run's locks cannot poison this one
RESULTS="$ROOT/repro/.silent-changes.jsonl"
rm -f "$RESULTS"

run() { # pkg arg label
  echo ""
  echo "════════ $3 ════════"
  bash "$ROOT/repro/backtest-filesystem.sh" "$1" "$2" 0 "$RESULTS" 2>&1
}

run @modelcontextprotocol/server-filesystem /tmp "filesystem"
run @modelcontextprotocol/server-memory /tmp "memory"
run @modelcontextprotocol/server-everything /tmp "everything"
run @modelcontextprotocol/server-sequential-thinking /tmp "sequential-thinking"

echo ""
echo "════════ ALL DONE — results in $RESULTS ════════"
wc -l "$RESULTS"
