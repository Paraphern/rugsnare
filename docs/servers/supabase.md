# @supabase/mcp-server-supabase (Supabase) - contract drift record

Supabase database/platform server. Package: [@supabase/mcp-server-supabase](https://www.npmjs.com/package/@supabase/mcp-server-supabase), ~67k installs/week. One of the most stable servers in the corpus (see [supabase/mcp#464](https://github.com/supabase/mcp/issues/464) for the community measurement).

**Window:** 0.8.3 -> 0.13.0. **Findings: 3 (1 NEW + 2 COSMETIC) + 1 infra-level break.** Corrected 2026-10-17 after a clean-stand re-scan; the earlier `GONE get_logs` reading was an artifact of a dirty pin store and has been removed.

```
  [NEW ] query_logs 6a5c9fd2e5c0f8e9
  [DRIFT] apply_migration (COSMETIC) 77a3cb2a898fd84a -> d087d4d40f90e7e7
  [DRIFT] execute_sql (COSMETIC) 484e76b19864c259 -> bfbdd20d473fa10e
```

Findings:

1. **New tool:** `query_logs` appeared in 0.13.0 (absent in 0.8.3). Per the community correction in [#464](https://github.com/supabase/mcp/issues/464): `get_logs` is still present in both versions with identical hashes; its visibility is host-dependent (hidden when the host supplies a `queryLogs` implementation). This is a host-conditional addition, not a removal.
2. **Description edits:** `execute_sql` and `apply_migration` gained safety language (COSMETIC in our grading).
3. **Launch-config break (outside the tool contract):** the stdio entry point **moved** from `dist/transports/stdio.js` to `dist/cli.js`. A pinned mcp.json with the old path fails to boot the server at all ("Cannot find module"). Hash-pinning tools does not catch this - it is a packaging-level drift, which is why the drift watch records entry paths per version too.

Clean pin data: 0.8.3 = 29 tools, 0.13.0 = 30 tools, 27 unchanged, 2 COSMETIC, 1 NEW, 0 GONE. Verified against the per-version pin snapshots ([0.8.3](../../audits/drift-watch/pins/supabase@0.8.3.json) | [0.13.0](../../audits/drift-watch/pins/supabase@0.13.0.json)).

**Repro** (boot requires `SUPABASE_ACCESS_TOKEN`; dummy value is enough):

```bash
mkdir sb && cd sb && npm init -y
# mcp.json: {"mcpServers":{"supabase":{"command":"node","args":["node_modules/@supabase/mcp-server-supabase/dist/transports/stdio.js"],"env":{"SUPABASE_ACCESS_TOKEN":"dummy_for_scan"}}}}
npm i @supabase/mcp-server-supabase@0.8.3 && npx rugsnare@1.4.3 scan --config mcp.json --timeout 60000
npm i @supabase/mcp-server-supabase@0.13.0
# entry moved: change args to node_modules/@supabase/mcp-server-supabase/dist/cli.js, then
npx rugsnare@1.4.3 diff --config mcp.json --timeout 60000   # 3 findings, exit 1
```

Last verified 2026-10-17 (rugsnare 1.4.3, clean stand; corrected from the original 2026-10-12 scan). Part of the [drift watch](../../audits/drift-watch/2026-10-17.md).
