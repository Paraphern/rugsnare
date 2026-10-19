# @iterable/mcp (Iterable)

npm 1,091 installs/week, 25 stable versions. Verified window 1.0.0 -> 1.9.0 (15 tool/prompt findings + 43 unchanged; 4 BREAKING). Graded with rugsnare 1.4.3, 2026-10-18. Tools 26 -> 31.

The interesting part is the semver: **4 BREAKING schema changes inside the 1.x line** (no major bump at any point).

**BREAKING** - `get_campaign_metrics`, `get_catalog_item` and two more: schema tightened inside 1.x. A caller written against 1.0.0 has no version signal telling it to re-read the contract.

**EXPANDED** - `get_campaigns`: new optional input appeared.

**Experiments suite NEW** - `list_experiments`, `get_experiment`, `get_experiment_variants`, `get_experiment_metrics`, `get_experiment_totals`, `get_experiment_trends`: an entire A/B-testing capability attached to the agent surface without a contract event.

**4 prompt drifts** - `get-campaigns`, `get-campaign-metrics`, `get-templates`, `get-snippet` prompt bodies changed; pinned and caught under PIN-SPEC prompt hashing.

**Repro**

```bash
mkdir it && cd it && npm init -y
# mcp.json: {"mcpServers":{"iterable":{"command":"node","args":["node_modules/@iterable/mcp/dist/index.js"],"env":{"ITERABLE_API_KEY":"dummy_for_scan"}}}}
npm i @iterable/mcp@1.0.0 && npx rugsnare scan --config mcp.json
rm -rf node_modules package-lock.json
npm i @iterable/mcp@1.9.0 && npx rugsnare diff --config mcp.json   # exit 1
```

Last verified 2026-10-18 (rugsnare 1.4.3).
