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

**Re-run with rugsnare 1.3.0 (2026-10-12) - the claim survives, and two new findings:**

1. **Like-for-like repro confirms the tightenings.** Fresh installs of both sides today still diff BREAKING, and the recursive grader now spells out full paths: `pipeline[][0].$vectorSearch[0].numCandidates` number -> integer + `exclusiveMinimum: 0` + `maximum: 9007199254740991`, same for `limit`, at depth 5 through `pipeline.items.anyOf` - previously a summary line, now mechanical evidence.
2. **The anyOf -> oneOf swaps in `explain.method` / `export.exportTarget` now grade NOTATION.** They are keyword swaps with identical const branches; the pre-1.3.0 grader counted them as LOOSENED ("constraints removed") - a grading bug this re-run caught and 1.3.0 fixes.
3. **Dependency drift can rewrite this server's contract with no server release.** 2.1.2 declares `zod: ^4.4.3` (floating range). The SAME 2.1.2 tarball, installed and run today, served `numCandidates` as `integer` with `maximum: 9007199254740991` - the schema attributed above to 3.0.0 - because a newer in-range zod minor serializes `.int()` numbers with bounds. A like-for-like install (both sides resolved the same way) still shows the real 3.0.0 code changes; but a whole-history scan that re-resolves floating deps per version can under-report: with today's zod, 2.1.2 and 3.0.5 contracts nearly coincide and the pair diff collapses to notation. Floating schema-affecting dependencies are a contract-integrity vector of their own - the tool contract is a function of (server version, resolved zod), not server version alone. Tracked as R32 (contract provenance: record resolved dep versions per captured contract).

**Repro**

```bash
mkdir mm && cd mm && npm init -y
# mcp.json: {"mcpServers":{"mongodb":{"command":"node","args":["node_modules/mongodb-mcp-server/dist/esm/index.js","--readOnly"],"env":{"MDB_MCP_CONNECTION_STRING":"mongodb://x:27017"}}}}
npm i mongodb-mcp-server@2.1.2 && npx rugsnare scan --config mcp.json
npm i mongodb-mcp-server@3.0.0 && npx rugsnare diff --config mcp.json   # 20 DRIFT, exit 1
```

Last verified 2026-10-12 (1.3.0 re-run; 3.0.0 -> 3.0.5 patch line contract-stable).
