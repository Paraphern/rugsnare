# figma-developer-mcp - contract drift record

Community Figma Dev Mode MCP server (widely used as the Figma bridge for coding agents). Package: [figma-developer-mcp](https://www.npmjs.com/package/figma-developer-mcp), ~91k installs/week.

**Registry identity:** `io.github.GLips/Figma-Context-MCP` (community). This is **not** the official Figma MCP server (`com.figma.mcp/mcp`, hosted remote) - a row labeled "figma" can describe two different servers depending on where you look.

**Window:** 0.7.0 -> 0.13.2 (17 releases). **Findings: 2 (both NOTATION).**

```
  [DRIFT] get_figma_data (NOTATION) f532797fc198a10f -> fc22456bc32bf9cd
  [DRIFT] download_figma_images (NOTATION) 95f6ca53524d50dc -> cccbafb95bbaffef
```

Small surface (2 tools), and the drift is notation-level only - serialization/prose churn, no input constraints changed. 15 releases of schema-relevant code with zero caller-facing constraint changes is itself a data point: high release frequency does not imply contract instability.

**Repro** (boot wants `FIGMA_API_KEY`; dummy value is enough for contract capture):

```bash
mkdir fg && cd fg && npm init -y
# mcp.json: {"mcpServers":{"figma":{"command":"node","args":["node_modules/figma-developer-mcp/dist/bin.js","--stdio"],"env":{"FIGMA_API_KEY":"dummy_for_scan"}}}}
npm i figma-developer-mcp@0.7.0 && npx rugsnare@1.3.0 scan --config mcp.json --timeout 60000
npm i figma-developer-mcp@0.13.2 && npx rugsnare@1.3.0 diff --config mcp.json --timeout 60000   # 2 NOTATION, exit 1
```

Baseline captured 2026-10-12 (rugsnare 1.3.0). Part of the [drift watch](../../audits/drift-watch/2026-10-12.md).
