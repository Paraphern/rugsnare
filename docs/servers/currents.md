# @currents/mcp (Currents)

npm 102,850 installs/week - window 2.3.3 -> 2.6.1 (minor releases).

**Findings: 45** - 37 drifts, 7 new tools, 1 gone. Re-graded on rugsnare 1.2.0 (2026-10-12): **32 BREAKING + 1 NOTATION + 4 other**. The breaking wave is a single pattern: `minLength=1` added to `projectId` / `actionId` / `signature` across the currents-*-action family, plus an `expiresAfter` type tightening and description rewrites - empty-string arguments that were valid in 2.3.3 are invalid in 2.6.1. The v2.6.0 changelog marks one change as Breaking - a tool rename, correctly - while the 32 quiet input tightenings across the same window carry no mention: loud breaking documented, quiet breaking unmarked.

Example drift set: `currents-list-actions`, `currents-create-action`, `currents-get-action`, `currents-update-action`, `currents-delete-action`, `currents-enable-action`, `currents-disable-action`, `currents-list-affected-tests`, `currents-get-projects`, `currents-get-project` - plus NEW `currents-get-action-executions`.

**Repro**

```bash
npm i @currents/mcp@2.3.3 && npx rugsnare scan --config mcp.json
npm i @currents/mcp@2.6.1 && npx rugsnare diff --config mcp.json   # 45 findings, exit 1
```

Watched weekly (baseline 2.3.3). Last verified 2026-10-12 (fresh graded run: 32 BREAKING confirmed).

**Corrected 2026-10-26** - the pins-dir snapshots for 2.6.1 and 2.7.0 (automation re-pin of 2026-10-24) carried `currents-get-affected-executions`, whose 2.3.3-era entry does not occur anywhere in those tarballs: stale-tool artifact of a dirty stand, caught by the HISTOR field-level cross-check ([modelcontextprotocol#3431](https://github.com/modelcontextprotocol/modelcontextprotocol/issues/3431#issuecomment-6416860082)). Re-pinned from clean stands: 2.6.1 = **39 tools**, 2.7.0 = **43 tools**, the phantom tool absent from both. Clean 2.3.3 -> 2.7.0 diff (rugsnare 1.4.3): **51 findings**, including a new quiet-BREAKING wave - `minLength=1` on `projectId` (`create-webhook`) and a UUID `pattern` on `hookId` (`get`/`update`/`delete-webhook`) - plus GONE `currents-get-affected-executions`, NEW `currents-create-share-link`, and 3 NEW prompts + 4 NEW skill resources (`browser-evidence`, `collect-evidence`, `fix-failing-tests`).
