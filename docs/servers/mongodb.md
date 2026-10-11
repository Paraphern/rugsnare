# mongodb-mcp-server (MongoDB)

npm 98,382 installs/week. Verified window 2.1.2 -> 3.0.5.

**3.0.0 (major)** changed the inputSchema of all 20 tools at once. Canonicalized decomposition (descriptions, dialect, and anyOf/oneOf abstracted):

**13/20 pure notation** - `$schema` draft-07 -> 2020-12 on every tool; parameter description enrichment; `items.anyOf` -> `items.oneOf` in `explain.method` and `export.exportTarget`.

**7/20 real input tightenings**:

- `aggregate-db.pipeline` gained `minItems: 1` - an empty pipeline was valid in 2.1.2, invalid now
- `$vectorSearch.limit` / `numCandidates`: `number` -> `integer`, plus `exclusiveMinimum: 0` and `maximum: Number.MAX_SAFE_INTEGER` (in `aggregate`, `explain`, `export`)
- `mongodb-logs.limit`: `integer`, `minimum: 1`, `maximum: 1024`
- `search-knowledge.limit`: `minimum: 1`, `maximum: 100` - a new cap
- `atlas-local-connect-deployment.deploymentName`: printable-ASCII `pattern`

A schema-valid 2.1.2 caller (`search-knowledge` with `limit: 150`, or an aggregate with an empty pipeline) is invalid in 3.0.0. None of it is documented at the package level: GitHub release bodies for the whole 3.0.x line are empty, the repo has no CHANGELOG.md, and [#1047](https://github.com/mongodb-js/mongodb-mcp-server/issues/1047) announced breaking changes for library usage only.

**Repro**

```bash
mkdir mm && cd mm && npm init -y
# mcp.json: {"mcpServers":{"mongodb":{"command":"node","args":["node_modules/mongodb-mcp-server/dist/esm/index.js","--readOnly"],"env":{"MDB_MCP_CONNECTION_STRING":"mongodb://x:27017"}}}}
npm i mongodb-mcp-server@2.1.2 && npx rugsnare scan --config mcp.json
npm i mongodb-mcp-server@3.0.0 && npx rugsnare diff --config mcp.json   # 20 DRIFT, exit 1
```

Last verified 2026-10-11.
