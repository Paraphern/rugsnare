# @supabase/mcp-server-supabase (Supabase) - contract drift record

Supabase database/platform server. Package: [@supabase/mcp-server-supabase](https://www.npmjs.com/package/@supabase/mcp-server-supabase), ~67k installs/week.

**Window:** 0.8.3 -> 0.13.0. **Findings: 4 (1 NEW + 1 GONE + 2 COSMETIC) + 1 infra-level break.**

```
  [GONE] get_logs
  [NEW ] query_logs 6a5c9fd2e5c0f8e9
  [DRIFT] apply_migration (COSMETIC) 77a3cb2a898fd84a -> d087d4d40f90e7e7
  [DRIFT] execute_sql (COSMETIC) 484e76b19864c259 -> bfbdd20d473fa10e
```

Two separate breaks in one window:

1. **Tool replacement:** `get_logs` was removed and `query_logs` appeared. Same job, different name and contract - callers pinned to `get_logs` break.
2. **Launch-config break (outside the tool contract):** the stdio entry point **moved** from `dist/transports/stdio.js` to `dist/cli.js`. A pinned mcp.json with the old path fails to boot the server at all ("Cannot find module"). Hash-pinning tools would not catch this - it is a packaging-level drift, which is why the drift watch records entry paths per version too.

**Repro** (boot requires `SUPABASE_ACCESS_TOKEN`; dummy value is enough):

```bash
mkdir sb && cd sb && npm init -y
# mcp.json: {"mcpServers":{"supabase":{"command":"node","args":["node_modules/@supabase/mcp-server-supabase/dist/transports/stdio.js"],"env":{"SUPABASE_ACCESS_TOKEN":"dummy_for_scan"}}}}
npm i @supabase/mcp-server-supabase@0.8.3 && npx rugsnare@1.3.0 scan --config mcp.json --timeout 60000
npm i @supabase/mcp-server-supabase@0.13.0
# entry moved: change args to node_modules/@supabase/mcp-server-supabase/dist/cli.js, then
npx rugsnare@1.3.0 diff --config mcp.json --timeout 60000   # 4 findings, exit 1
```

Baseline captured 2026-10-12 (rugsnare 1.3.0). Part of the [drift watch](../../audits/drift-watch/2026-10-12.md).
