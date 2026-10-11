# apify-mcp-server (Apify)

Window 0.16.0 -> 0.17.4. Release velocity: 170 versions, ~46 releases/month.

**Finding: 1 BREAKING.** `call-actor` changed its contract between 0.16.0 and 0.17.4 (parameter-level change; decomposition in the issue). Reported with a one-line-per-contract-change release-notes suggestion in [issue #1514](https://github.com/apify/apify-mcp-server/issues/1514).

**Repro**

```bash
npm i @apify/mcp-server@0.16.0 && npx rugsnare scan --config mcp.json
npm i @apify/mcp-server@0.17.4 && npx rugsnare diff --config mcp.json   # call-actor BREAKING, exit 1
```

Last verified 2026-10-10 (issue open, no vendor response).
