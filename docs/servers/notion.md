# @notionhq/notion-mcp-server (Notion)

npm 195k+ installs/week. Two verified windows, graded with rugsnare 1.4.3, 2026-10-18:

**Recent window 2.4.1 -> 2.5.2: 0 findings.** Zero contract drift across three months of minor releases. A fast-moving, heavily installed official server whose tool contracts stayed byte-stable - evidence that disciplined publishing exists, and the yardstick "silent drift" is measured against. (The 2026-10-13 pin with all 24 tools: [pins/notion@2.4.1.json](../../audits/drift-watch/pins/notion@2.4.1.json).)

**Full-history window 1.0.0 -> 2.5.2: 27 findings.** Tools 19 -> 24. Even the disciplined vendor drifted over the long arc:

- **1 BREAKING** - `API-patch-page`
- **4 LOOSENED** - `API-post-search`, `API-update-a-block`, `API-post-page`, +1
- **11 NOTATION** - schema-notation waves across the API-* surface
- **8 NEW** - including `API-query-data-source`, `API-retrieve-page-markdown`, `API-update-page-markdown`, `API-move-page`
- **3 GONE** - `API-create-a-database`, `API-update-a-database`, `API-post-database-query`: the old database-query endpoints were retired from the tool surface

The two windows together are the pitch: pinning catches the long-arc drift (27 findings) while confirming recent discipline (0 findings) - same vendor, same grader, different window.

**Boot note (1.x only):** versions <=1.x ship a bin guard (`process.argv[1].endsWith('notion-mcp-server')`) that only passes when invoked through the Unix `.bin` symlink name; spawning `node .../bin/cli.mjs` directly makes the module load and exit 0 without starting the server. 2.x boots fine directly. Scanning 1.0.0 requires a one-line shim that rewrites `process.argv[1]` before import.

**Repro** (2.4.1 -> 2.5.2, the control window)

```bash
mkdir nt && cd nt && npm init -y
# mcp.json: {"mcpServers":{"notion":{"command":"node","args":["node_modules/@notionhq/notion-mcp-server/bin/cli.mjs"],"env":{"OPENAPI_MCP_HEADERS":"{\"Authorization\":\"Bearer dummy\",\"Notion-Version\":\"2022-06-28\"}"}}}}
npm i @notionhq/notion-mcp-server@2.4.1 && npx rugsnare scan --config mcp.json
rm -rf node_modules package-lock.json
npm i @notionhq/notion-mcp-server@2.5.2 && npx rugsnare diff --config mcp.json
```

Last verified 2026-10-20 (rugsnare 1.5.0): all 24 tool contracts unchanged; the single finding is (identity) - the version bump itself (PIN-SPEC identity block; rugsnare 1.5.0 pins server identity). Zero contract findings; exit 1 on identity only, by design - an upgrade IS an identity change.
