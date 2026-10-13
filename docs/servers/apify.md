# @apify/actors-mcp-server (Apify)

Window 0.16.0 -> 0.17.4. Release velocity: 170 versions, ~46 releases/month.

**Finding: 1 BREAKING.** `call-actor` changed its contract between 0.16.0 and 0.17.4 (parameter-level change; decomposition in the issue). Reported with a one-line-per-contract-change release-notes suggestion in [issue #1514](https://github.com/apify/apify-mcp-server/issues/1514).

**Repro** (boot wants a token present; dummy value is enough for contract capture)

```bash
mkdir ap && cd ap && npm init -y
# mcp.json: {"mcpServers":{"apify":{"command":"node","args":["node_modules/@apify/actors-mcp-server/dist/stdio.js"],"env":{"APIFY_TOKEN":"dummy_for_scan"}}}}
npm i @apify/actors-mcp-server@0.16.0 && npx rugsnare@1.3.0 scan --config mcp.json --timeout 60000
npm i @apify/actors-mcp-server@0.17.4 && npx rugsnare@1.3.0 diff --config mcp.json --timeout 60000   # call-actor BREAKING, exit 1
```

Last verified 2026-10-13 (re-graded on rugsnare 1.3.0, package name corrected to `@apify/actors-mcp-server`; issue #1514 open, no vendor response).
