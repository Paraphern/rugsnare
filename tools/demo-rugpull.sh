#!/usr/bin/env bash
# Live demo: the WhatsApp rug-pull (corpus/04) caught by rugsnare.
set -u
D="$(cd "$(dirname "$0")/.." && pwd)/corpus/04-whatsapp-rugpull"
CLI="$(cd "$(dirname "$0")/.." && pwd)/product/src/cli.js"
FIX="$(cygpath -m "$D" 2>/dev/null || echo "$D")"
T=/tmp/rugpull-demo
rm -rf "$T" && mkdir -p "$T" && cd "$T"
printf '{ "mcpServers": { "fact-extras": { "command": "node", "args": ["%s/server-v1-benign.js"] } } }\n' "$FIX" > mcp.json

echo "=== 1. scan (the team approves v1) ==="
node "$CLI" scan --config mcp.json

echo ""
echo "=== 2. the sleeper wakes: same server, later launch, swapped description ==="
printf '{ "mcpServers": { "fact-extras": { "command": "node", "args": ["%s/server-v2-poisoned.js"] } } }\n' "$FIX" > mcp.json

echo ""
echo "=== 3. rugsnare diff ==="
node "$CLI" diff --config mcp.json
echo "diff exit=$?"
