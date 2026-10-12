# @ui5/mcp-server (SAP UI5) - contract drift record

SAP UI5 tooling server (guidelines, linter, app scaffolding). Package: [@ui5/mcp-server](https://www.npmjs.com/package/@ui5/mcp-server), ~96k installs/week.

**Window:** 0.2.12 -> 0.3.2 (12 releases, crossing the 0.2 -> 0.3 minor). **Findings: 0 - clean control.**

```
  pinned ui5: 10 tool(s) -> get_guidelines, run_ui5_linter, get_api_reference, get_project_info,
      create_ui5_app, get_version_info, get_integration_cards_guidelines, create_integration_card,
      run_manifest_validation, get_typescript_conversion_guidelines
  ... 0 drift findings across the window
```

All 10 tool contracts held stable across a minor bump. Kept in the corpus as a **control group**: the drift watch is not a false-positive machine - servers that do not drift are reported as not drifting.

**Repro:**

```bash
mkdir u5 && cd u5 && npm init -y
# mcp.json: {"mcpServers":{"ui5":{"command":"node","args":["node_modules/@ui5/mcp-server/bin/ui5mcp.js"]}}}
npm i @ui5/mcp-server@0.2.12 && npx rugsnare@1.3.0 scan --config mcp.json --timeout 60000
npm i @ui5/mcp-server@0.3.2 && npx rugsnare@1.3.0 diff --config mcp.json --timeout 60000   # 0 findings, exit 0
```

Baseline captured 2026-10-12 (rugsnare 1.3.0). Part of the [drift watch](../../audits/drift-watch/2026-10-12.md).
