# @hubspot/mcp-server (HubSpot) - contract drift record

**Channel-divergence case: the npm package ships releases while the linked GitHub repository is dead** - there is no issues/releases channel where these changes are announced. Package: [@hubspot/mcp-server](https://www.npmjs.com/package/@hubspot/mcp-server), ~31k installs/week.

**Window:** 0.2.0 -> 0.4.0. **Findings: 6 (1 EXPANDED + 3 NEW + 1 COSMETIC + 1 GONE).**

```
  [DRIFT] hubspot-search-objects (EXPANDED) 47da3e6b399a1cff -> fb13fc5502d8aa5b
      added optional parameter 'filterGroups[].filters[].values' (array) [expand]
      added optional parameter 'filterGroups[].filters[].highValue' (unknown) [expand]
  [NEW ] hubspot-batch-create-associations 766d11081a6e38cd
  [NEW ] hubspot-list-workflows 3c41e5fa46f478ae
  [NEW ] hubspot-get-workflow 88d3150c06f8cae0
  [DRIFT] hubspot-batch-update-objects (COSMETIC) ...   (description prose churn)
  [GONE] hubspot-create-association
```

Notes:
- `hubspot-create-association` was **removed** and a batch variant (`hubspot-batch-create-associations`) appeared - callers invoking the old tool name now get a protocol error. Nowhere to read about it: the repo is inactive.
- Grading flag (RESOLVED, R33): rugsnare 1.3.0 graded `hubspot-search-objects` BREAKING, but both operations are optional-parameter additions (`[expand]`) - by our rubric EXPANDED. Root cause was not the typeless param (`highValue` without `type`): the tool-level grader lumped pure-expand into BREAKING, making the documented EXPANDED label unreachable (P5 shipped the label but not the path to it). Fixed in the 1.4.0 draft: pure expand grades EXPANDED, mixes with tighten/loosen stay BREAKING, and `--schema-only` now blocks on EXPANDED too. Reproduced and verified on this exact pair - the tool now grades `(EXPANDED)`.

**Repro** (boot requires `PRIVATE_APP_ACCESS_TOKEN`; dummy value is enough):

```bash
mkdir hs && cd hs && npm init -y
# mcp.json: {"mcpServers":{"hubspot":{"command":"node","args":["node_modules/@hubspot/mcp-server/dist/index.js"],"env":{"PRIVATE_APP_ACCESS_TOKEN":"dummy_for_scan"}}}}
npm i @hubspot/mcp-server@0.2.0 && npx rugsnare@1.4.0 scan --config mcp.json --timeout 60000
npm i @hubspot/mcp-server@0.4.0 && npx rugsnare@1.4.0 diff --config mcp.json --timeout 60000   # 6 findings, exit 1
```

Baseline captured 2026-10-12 (rugsnare 1.3.0); re-verified 2026-10-13 on rugsnare 1.4.0 (clean stand: 6 findings, `search-objects` EXPANDED, identity block in pin). Part of the [drift watch](../../audits/drift-watch/2026-10-12.md).
