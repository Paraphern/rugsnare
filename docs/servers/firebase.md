# firebase-mcp (Google) - contract drift record

Firebase MCP server (wraps firebase-tools). Package: [firebase-mcp](https://www.npmjs.com/package/firebase-mcp), low npm traction (~74 installs/week - the official distribution channel for Firebase MCP is elsewhere; kept for Google-front coverage and as a control).

**Window:** 0.2.0 -> 0.4.4 (12 releases, crossing 0.2 -> 0.3 -> 0.4). **Findings: 0 - clean control.**

Two minors of releases, zero tool-contract changes detected. Note: first boot writes a config skeleton to `~/AppData/Roaming/firebase-mcp/firebase-mcp.json` (or OS equivalent) and logs a config warning - harmless for contract capture; the server still serves `tools/list` on stdio.

**Repro:**

```bash
mkdir fb && cd fb && npm init -y
# mcp.json: {"mcpServers":{"firebase":{"command":"node","args":["node_modules/firebase-mcp/dist/cli/index.js"],"env":{"FIREBASE_TOKEN":"dummy_for_scan"}}}}
npm i firebase-mcp@0.2.0 && npx rugsnare@1.3.0 scan --config mcp.json --timeout 60000
npm i firebase-mcp@0.4.4 && npx rugsnare@1.3.0 diff --config mcp.json --timeout 60000   # 0 findings, exit 0
```

Baseline captured 2026-10-12 (rugsnare 1.3.0). Part of the [drift watch](../../audits/drift-watch/2026-10-12.md).
